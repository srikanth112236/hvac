import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  LeadStatus,
  QuotationStatus,
  SalesFollowUpRow,
  SalesLeadRow,
  SalesWorkspace,
} from '@hvac/shared'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Textarea,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { adminApi } from '@/admin/api'
import {
  AdminPageHeader,
  InlineError,
  Panel,
  fromLocalInput,
  toLocalInput,
} from '@/admin/ui'
import {
  EmptyLine,
  MetricGrid,
  Progress,
  QuoteBadge,
  SALES_STAGES,
  StageBars,
  StatLine,
  TrendBars,
  daysUntil,
  money,
  moneyExact,
  monthLabel,
  shortDate,
  shortDateTime,
  stageMeta,
} from '@/sales/shared'

interface SectionProps {
  workspace: SalesWorkspace
  onRefresh: () => void
}

function useMutation(onRefresh: () => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (operation: () => Promise<unknown>, after?: () => void) => {
    setBusy(true)
    setError('')
    try {
      await operation()
      after?.()
      onRefresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The update could not be saved.')
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}

export function SalesOverview({ workspace, onRefresh }: SectionProps) {
  const mine = workspace.followUps.filter((entry) => entry.status === 'open').slice(0, 4)
  const recent = workspace.leads.slice(0, 5)
  const quotes = workspace.quotations
    .filter((entry) => entry.status === 'sent' || entry.status === 'changes-requested')
    .slice(0, 4)
  const targetRate = workspace.target?.commissionRate ?? 0
  const { busy, error, run } = useMutation(onRefresh)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow={`Sales desk · ${monthLabel(workspace.month)}`}
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${workspace.viewer.name.split(' ')[0]}.`}
        description="Your assigned book, next actions and the numbers that matter this month."
        actions={
          <>
            <Link
              to="/sales/pipeline"
              className="inline-flex h-9 items-center justify-center border border-cold/50 bg-cold/[0.07] px-4 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:bg-cold/10"
            >
              Open pipeline
            </Link>
            <Link
              to="/sales/follow-ups"
              className="inline-flex h-9 items-center justify-center border border-line px-4 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Next actions
            </Link>
          </>
        }
      />

      {error ? <InlineError message={error} /> : null}
      <MetricGrid metrics={workspace.metrics} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <Panel
          title="This month's target"
          description={
            workspace.target
              ? `${monthLabel(workspace.month)} · set by management`
              : 'No target has been set for this month yet.'
          }
          action={<Badge tone={workspace.target ? 'cold' : 'neutral'}>{workspace.scope.label}</Badge>}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="t-metric text-fg">{money(workspace.metrics.wonValue)}</p>
              <p className="mt-1 text-[11px] text-fg-faint">
                of {money(workspace.metrics.targetValue)} revenue target
              </p>
            </div>
            <div className="text-right">
              <p className="t-num text-[26px] text-cold">
                {Math.round(workspace.metrics.attainment)}%
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                attained
              </p>
            </div>
          </div>
          <div className="mt-5">
            <Progress
              value={workspace.metrics.attainment}
              tone={
                workspace.metrics.attainment >= 100
                  ? 'success'
                  : workspace.metrics.attainment >= 60
                    ? 'cold'
                    : 'warn'
              }
              label={`${workspace.metrics.wonDeals} of ${workspace.metrics.targetDeals || '—'} deals · ${workspace.metrics.quotes} of ${workspace.target?.quotesTarget || '—'} quotes`}
            />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <StatLine label="Commission rate" value={`${targetRate}%`} />
            <StatLine
              label="Earned commission"
              value={money(workspace.metrics.commission)}
              tone="success"
            />
            <StatLine
              label="Open pipeline"
              value={money(workspace.metrics.pipelineValue)}
              tone="cold"
            />
          </div>
        </Panel>

        <Panel
          title="Next follow-ups"
          description="Synced to the admin reminder desk."
          action={
            <Link
              to="/sales/follow-ups"
              className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:underline"
            >
              View all
            </Link>
          }
          bodyClassName="p-0"
        >
          {mine.length === 0 ? (
            <EmptyLine>No open follow-ups. Add the next touch from a lead.</EmptyLine>
          ) : (
            <ul className="divide-y divide-line/70">
              {mine.map((entry) => {
                const days = daysUntil(entry.dueAt)
                return (
                  <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                    <span
                      className={cn(
                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        entry.overdue ? 'bg-danger' : 'bg-cold',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] text-fg">{entry.title}</p>
                      <p className="mt-0.5 truncate text-[10px] text-fg-faint">
                        {entry.leadName} · {shortDate(entry.dueAt)}
                        {days !== null
                          ? entry.overdue
                            ? ' · overdue'
                            : days === 0
                              ? ' · today'
                              : ` · in ${days}d`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          adminApi.salesUpdateFollowUp(entry.id, { status: 'done' }),
                        )
                      }
                      className="mt-0.5 border border-line px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint hover:border-success/50 hover:text-success"
                    >
                      Done
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Pipeline shape"
          description="Every assigned lead by stage."
          action={
            <Link
              to="/sales/pipeline"
              className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:underline"
            >
              Open board
            </Link>
          }
        >
          <StageBars leads={workspace.leads} />
        </Panel>

        <Panel title="Six-month run rate" description="Won revenue against target.">
          <TrendBars trend={workspace.trend} />
          <p className="mt-3 text-[10px] text-fg-faint">
            Solid bars are won revenue. Faint bars are the monthly target.
          </p>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Recently touched leads"
          action={
            <Link
              to="/sales/pipeline"
              className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:underline"
            >
              All leads
            </Link>
          }
          bodyClassName="p-0"
        >
          {recent.length === 0 ? (
            <EmptyLine>No leads have been assigned to you yet.</EmptyLine>
          ) : (
            <ul className="divide-y divide-line/70">
              {recent.map((lead) => (
                <li key={lead.ref} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-fg">{lead.name}</p>
                    <p className="truncate text-[10px] text-fg-faint">
                      {lead.ref} · {lead.serviceName ?? 'Service enquiry'} · {lead.city ?? '—'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={stageMeta(lead.status).tone}>{stageMeta(lead.status).label}</Badge>
                    <p className="t-num mt-1 text-[10px] text-fg-faint">{money(lead.value)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Quotes awaiting a result"
          action={
            <Link
              to="/sales/quotes"
              className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:underline"
            >
              All quotes
            </Link>
          }
          bodyClassName="p-0"
        >
          {quotes.length === 0 ? (
            <EmptyLine>No sent quotes are waiting on a decision.</EmptyLine>
          ) : (
            <ul className="divide-y divide-line/70">
              {quotes.map((quotation) => (
                <li key={quotation.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-fg">{quotation.title}</p>
                    <p className="truncate text-[10px] text-fg-faint">
                      {quotation.ref} · {quotation.customerName} · valid{' '}
                      {quotation.validUntil || '—'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="t-num text-[12px] text-fg">{moneyExact(quotation.totals.total)}</p>
                    <div className="mt-1">
                      <QuoteBadge status={quotation.status} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

export function SalesPipeline({ workspace, onRefresh }: SectionProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SalesLeadRow | null>(null)
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return workspace.leads
    return workspace.leads.filter((lead) =>
      [lead.ref, lead.name, lead.email, lead.phone, lead.city, lead.serviceName, lead.owner]
        .join(' ')
        .toLowerCase()
        .includes(text),
    )
  }, [query, workspace.leads])

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Sales desk · Pipeline"
        title="Your book."
        description="Only leads assigned to you appear here. Open a card to move stage, record value or set the next follow-up."
        actions={<Badge tone="cold">{filtered.length} leads</Badge>}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="Search your leads"
          placeholder="Name, reference, city, service…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="sm:max-w-sm"
        />
        <p className="pb-2 text-[10px] text-fg-faint">
          {workspace.metrics.openLeads} open · {money(workspace.metrics.pipelineValue)} pipeline
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="airflow"
          title="No leads in this view"
          description="When a manager assigns a lead to you, it lands here and on your overview."
        />
      ) : (
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="grid min-w-[1180px] grid-cols-6 gap-3 px-1">
            {SALES_STAGES.map((stage) => {
              const rows = filtered.filter((lead) => lead.status === stage.key)
              return (
                <section key={stage.key} className="min-w-0">
                  <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
                      {stage.label}
                    </span>
                    <span className="t-num text-[10px] text-fg-faint">{rows.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {rows.map((lead) => (
                      <button
                        key={lead.ref}
                        type="button"
                        onClick={() => setSelected(lead)}
                        className="border border-line bg-panel/60 p-3 text-left transition-colors hover:border-cold/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-[12px] text-fg">{lead.name}</p>
                          {lead.stale ? <Badge tone="warn">Stale</Badge> : null}
                        </div>
                        <p className="mt-1 font-mono text-[8px] text-fg-faint">{lead.ref}</p>
                        <p className="mt-2 text-[10px] text-fg-dim">
                          {lead.serviceName ?? 'Service'} · {lead.city ?? '—'}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="t-num text-[11px] text-fg">{money(lead.value)}</span>
                          <span className="font-mono text-[8px] text-fg-faint">{lead.ageDays}d</span>
                        </div>
                        {lead.followUpAt ? (
                          <p className="mt-2 truncate border-t border-line/70 pt-2 text-[9px] text-cold">
                            Follow up {shortDate(lead.followUpAt)}
                          </p>
                        ) : null}
                      </button>
                    ))}
                    {rows.length === 0 ? (
                      <p className="border border-dashed border-line px-2 py-5 text-center font-mono text-[8px] uppercase text-fg-faint">
                        Empty
                      </p>
                    ) : null}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}

      <LeadModal lead={selected} onClose={() => setSelected(null)} onSaved={onRefresh} />
    </div>
  )
}

function LeadModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: SalesLeadRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [status, setStatus] = useState<LeadStatus>('new')
  const [value, setValue] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [note, setNote] = useState('')
  const [hydratedFor, setHydratedFor] = useState<string | null>(null)
  const { busy, error, run } = useMutation(onSaved)

  useEffect(() => {
    if (!lead || hydratedFor === lead.ref) return
    setHydratedFor(lead.ref)
    setStatus(lead.status)
    setValue(lead.value == null ? '' : String(lead.value))
    setFollowUp(toLocalInput(lead.followUpAt))
    setNote('')
  }, [hydratedFor, lead])

  if (!lead) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={lead.name}
      description={`${lead.ref} · ${lead.source}${lead.city ? ` · ${lead.city}` : ''}`}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] text-fg-faint">
            {lead.phone} {lead.email ? `· ${lead.email}` : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="quiet" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              loading={busy}
              onClick={() =>
                void run(
                  () =>
                    adminApi.salesUpdateLead(lead.ref, {
                      status,
                      value: value.trim() === '' ? null : Number(value),
                      followUpAt: fromLocalInput(followUp),
                      ...(note.trim() ? { note: note.trim() } : {}),
                    }),
                  onClose,
                )
              }
            >
              Save lead
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <InlineError message={error} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Stage"
            value={status}
            onChange={(event) => setStatus(event.target.value as LeadStatus)}
            options={SALES_STAGES.map((stage) => ({ value: stage.key, label: stage.label }))}
          />
          <Input
            label="Deal value"
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            hint="Your own estimate. Visible to managers."
          />
          <Input
            label="Next follow-up"
            type="datetime-local"
            value={followUp}
            onChange={(event) => setFollowUp(event.target.value)}
          />
          <div className="flex flex-col justify-end">
            <p className="text-[10px] text-fg-faint">
              Quote count: {lead.quoteCount} · quoted {money(lead.quoteValue)}
            </p>
          </div>
        </div>
        <div className="border border-line bg-base/50 p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">Enquiry</p>
          <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-fg-dim">
            {lead.message || 'No message supplied.'}
          </p>
        </div>
        <Textarea
          label="Add an internal note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Site access, decision maker, next step…"
        />
        {lead.notes?.length ? (
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
              Latest notes
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {lead.notes.slice(-3).reverse().map((entry) => (
                <li key={entry.id} className="border-l border-line pl-3 text-[11px] text-fg-dim">
                  {entry.body}
                  <span className="mt-0.5 block font-mono text-[8px] text-fg-faint">
                    {entry.author} · {shortDateTime(entry.at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

export function SalesFollowUps({ workspace, onRefresh }: SectionProps) {
  const [state, setState] = useState<'open' | 'done' | 'all'>('open')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<SalesFollowUpRow | null>(null)
  const { busy, error, run } = useMutation(onRefresh)
  const rows = workspace.followUps.filter((entry) => state === 'all' || entry.status === state)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Sales desk · Follow-ups"
        title="Keep the next step moving."
        description="These are the same follow-ups the admin desk sees. Completing one here updates the lead and the reminder record."
        actions={<Button size="sm" icon="plus" onClick={() => setCreating(true)}>New follow-up</Button>}
      />
      {error ? <InlineError message={error} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        {(['open', 'done', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setState(tab)}
            className={cn(
              'border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em]',
              state === tab
                ? 'border-cold/50 bg-cold/[0.07] text-cold'
                : 'border-line text-fg-dim hover:border-cold/40',
            )}
          >
            {tab} · {workspace.followUps.filter((entry) => tab === 'all' || entry.status === tab).length}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyLine>No {state === 'all' ? '' : state} follow-ups.</EmptyLine>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                'flex flex-col gap-3 border bg-panel/50 p-4 sm:flex-row sm:items-center',
                entry.overdue ? 'border-danger/35' : 'border-line',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[12px] text-fg">{entry.title}</p>
                  {entry.overdue ? <Badge tone="danger">Overdue</Badge> : null}
                  {entry.priority === 'urgent' ? <Badge tone="warn">Urgent</Badge> : null}
                </div>
                <p className="mt-1 text-[10px] text-fg-faint">
                  {entry.leadName} · due {shortDateTime(entry.dueAt)}
                  {entry.leadEmail ? ` · ${entry.leadEmail}` : ''}
                </p>
                {entry.body ? <p className="mt-1 text-[11px] text-fg-dim">{entry.body}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="quiet" size="sm" onClick={() => setSelected(entry)}>
                  Reschedule
                </Button>
                <Button
                  variant={entry.status === 'open' ? 'secondary' : 'quiet'}
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      adminApi.salesUpdateFollowUp(entry.id, {
                        status: entry.status === 'open' ? 'done' : 'open',
                      }),
                    )
                  }
                >
                  {entry.status === 'open' ? 'Mark done' : 'Reopen'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New follow-up"
        description="Pick one of your leads and a time. The admin reminder desk receives it immediately."
      >
        <NewFollowUpForm
          workspace={workspace}
          onCreated={() => {
            setCreating(false)
            onRefresh()
          }}
        />
      </Modal>
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Reschedule follow-up"
        description={selected ? `${selected.title} · ${selected.leadName}` : undefined}
      >
        {selected ? (
          <RescheduleForm
            followUp={selected}
            onSaved={() => {
              setSelected(null)
              onRefresh()
            }}
          />
        ) : null}
      </Modal>
    </div>
  )
}

function NewFollowUpForm({
  workspace,
  onCreated,
}: {
  workspace: SalesWorkspace
  onCreated: () => void
}) {
  const leads = workspace.leads.filter((lead) => lead.status !== 'won' && lead.status !== 'lost')
  const [leadRef, setLeadRef] = useState(leads[0]?.ref ?? '')
  const [title, setTitle] = useState('Follow up on quote')
  const [dueAt, setDueAt] = useState(() => {
    const date = new Date(Date.now() + 86_400_000)
    date.setHours(10, 0, 0, 0)
    return toLocalInput(date.toISOString())
  })
  const [body, setBody] = useState('')
  const { busy, error, run } = useMutation(onCreated)

  return (
    <div className="flex flex-col gap-4">
      {error ? <InlineError message={error} /> : null}
      <Select
        label="Lead"
        value={leadRef}
        onChange={(event) => setLeadRef(event.target.value)}
        options={leads.map((lead) => ({
          value: lead.ref,
          label: `${lead.name} · ${lead.ref}`,
        }))}
        placeholder="Choose a lead"
      />
      <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <Input
        label="Due"
        type="datetime-local"
        value={dueAt}
        onChange={(event) => setDueAt(event.target.value)}
      />
      <Textarea
        label="Notes"
        rows={2}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <Button
        disabled={!leadRef || !title.trim() || !dueAt}
        loading={busy}
        onClick={() =>
          void run(() =>
            adminApi.salesCreateFollowUp({
              leadRef,
              title: title.trim(),
              body,
              dueAt: fromLocalInput(dueAt) ?? dueAt,
              priority: 'normal',
            }),
          )
        }
      >
        Add follow-up
      </Button>
    </div>
  )
}

function RescheduleForm({
  followUp,
  onSaved,
}: {
  followUp: SalesFollowUpRow
  onSaved: () => void
}) {
  const [dueAt, setDueAt] = useState(toLocalInput(followUp.dueAt))
  const { busy, error, run } = useMutation(onSaved)
  return (
    <div className="flex flex-col gap-4">
      {error ? <InlineError message={error} /> : null}
      <Input
        label="New due time"
        type="datetime-local"
        value={dueAt}
        onChange={(event) => setDueAt(event.target.value)}
      />
      <Button
        loading={busy}
        disabled={!dueAt}
        onClick={() =>
          void run(() =>
            adminApi.salesUpdateFollowUp(followUp.id, {
              dueAt: fromLocalInput(dueAt) ?? dueAt,
            }),
          )
        }
      >
        Save new time
      </Button>
    </div>
  )
}

export function SalesQuotes({ workspace, onRefresh }: SectionProps) {
  const [status, setStatus] = useState<QuotationStatus | 'all'>('all')
  const rows = workspace.quotations.filter(
    (quotation) => status === 'all' || quotation.status === status,
  )
  const { busy, error, run } = useMutation(onRefresh)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Sales desk · Quotes"
        title="Every quote on your book."
        description="Quotes linked to your leads appear here. Status changes stay in sync with the pipeline and the admin quotation desk."
        actions={<Badge tone="cold">{workspace.quotations.length} quotes</Badge>}
      />
      {error ? <InlineError message={error} /> : null}
      <div className="flex flex-wrap gap-2">
        {(['all', 'draft', 'sent', 'accepted', 'declined', 'changes-requested', 'expired'] as const).map(
          (entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setStatus(entry)}
              className={cn(
                'border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em]',
                status === entry
                  ? 'border-cold/50 bg-cold/[0.07] text-cold'
                  : 'border-line text-fg-dim',
              )}
            >
              {entry === 'all' ? 'All' : entry.replace('-', ' ')}
            </button>
          ),
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyLine>No quotes in this view yet.</EmptyLine>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {rows.map((quotation) => (
            <li key={quotation.id} className="flex flex-col border border-line bg-panel/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-fg">{quotation.title}</p>
                  <p className="mt-1 font-mono text-[9px] text-fg-faint">
                    {quotation.ref} · {quotation.customerName}
                  </p>
                  <p className="mt-1 text-[10px] text-fg-dim">
                    Lead: {quotation.leadName ?? 'Unlinked'} · Valid {shortDate(quotation.validUntil)}
                  </p>
                </div>
                <p className="t-num shrink-0 text-[16px] text-fg">
                  {moneyExact(quotation.totals.total)}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
                <QuoteBadge status={quotation.status} />
                <Select
                  aria-label={`Status for ${quotation.ref}`}
                  value={quotation.status}
                  disabled={busy}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'sent', label: 'Sent' },
                    { value: 'accepted', label: 'Accepted' },
                    { value: 'declined', label: 'Declined' },
                    { value: 'changes-requested', label: 'Changes requested' },
                    { value: 'expired', label: 'Expired' },
                  ]}
                  onChange={(event) =>
                    void run(() =>
                      adminApi.salesUpdateQuoteStatus(
                        quotation.id,
                        event.target.value as QuotationStatus,
                      ),
                    )
                  }
                  className="max-w-[180px]"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] leading-relaxed text-fg-faint">
        Changing a quote to accepted marks its lead won. Declined marks it lost. Sending is recorded
        here but a manager still sends the customer email from the admin quotation desk.
      </p>
    </div>
  )
}

export function SalesPerformance({ workspace }: SectionProps) {
  const metrics = workspace.metrics
  const avgDeal = metrics.wonDeals ? metrics.wonValue / metrics.wonDeals : 0
  const quotesWonRate = metrics.quotes
    ? (metrics.quotesAccepted / metrics.quotes) * 100
    : 0

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow={`Sales desk · ${monthLabel(workspace.month)}`}
        title="Performance."
        description="Live numbers from your assigned book, quotes and targets. No estimates hidden behind a dashboard."
      />
      <MetricGrid metrics={metrics} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <Panel title="Target progress" description="Won revenue this month.">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="t-metric text-fg">{Math.round(metrics.attainment)}%</p>
              <p className="mt-1 text-[11px] text-fg-faint">
                {money(metrics.wonValue)} of {money(metrics.targetValue)}
              </p>
            </div>
            <p className="text-right text-[11px] text-fg-dim">
              {metrics.wonDeals} won · {metrics.lostDeals} lost
              <br />
              {Math.round(metrics.conversionRate)}% win rate
            </p>
          </div>
          <div className="mt-5">
            <Progress value={metrics.attainment} tone="success" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <StatLine label="Average won deal" value={money(avgDeal)} />
            <StatLine label="Pipeline still open" value={money(metrics.pipelineValue)} tone="cold" />
            <StatLine label="Quote value" value={money(metrics.quoteValue)} />
            <StatLine label="Quotes accepted" value={`${Math.round(quotesWonRate)}%`} tone="success" />
          </div>
        </Panel>
        <Panel title="Six-month won revenue" description="Target bars behind won revenue.">
          <TrendBars trend={workspace.trend} />
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Pipeline by stage">
          <StageBars leads={workspace.leads} />
        </Panel>
        <Panel title="Activity and conversion">
          <StatLine label="Assigned leads" value={String(metrics.assignedLeads)} />
          <StatLine label="Open leads" value={String(metrics.openLeads)} tone="cold" />
          <StatLine label="Quotes created" value={String(metrics.quotes)} />
          <StatLine label="Quotes sent" value={String(metrics.quotesSent)} />
          <StatLine label="Quotes accepted" value={String(metrics.quotesAccepted)} tone="success" />
          <StatLine
            label="Overdue follow-ups"
            value={String(metrics.followUpsOverdue)}
            tone={metrics.followUpsOverdue ? 'danger' : 'success'}
          />
        </Panel>
      </div>
      <Panel title="Recent wins" bodyClassName="p-0">
        {workspace.leads.filter((lead) => lead.status === 'won').length === 0 ? (
          <EmptyLine>No won deals yet. Your first win will appear here.</EmptyLine>
        ) : (
          <ul className="divide-y divide-line/70">
            {workspace.leads
              .filter((lead) => lead.status === 'won')
              .slice(0, 8)
              .map((lead) => (
                <li key={lead.ref} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-fg">{lead.name}</p>
                    <p className="font-mono text-[9px] text-fg-faint">
                      {lead.ref} · {lead.serviceName ?? 'Service'}
                    </p>
                  </div>
                  <p className="t-num text-[12px] text-success">{money(lead.value)}</p>
                </li>
              ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

export function SalesJobs({ workspace }: SectionProps) {
  const teamScope = workspace.scope.mode === 'team'
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Sales desk · Customer jobs"
        title={teamScope ? 'Every customer in the field.' : 'Your customers in the field.'}
        description={
          teamScope
            ? 'Read-only visibility of customer jobs across the whole floor. Dispatch and technicians update these from the admin workspace.'
            : 'Read-only job visibility for customers linked to your quotes. Dispatch and technicians update these from the admin workspace.'
        }
        actions={<Badge tone="cold">{workspace.jobs.length} jobs</Badge>}
      />
      {workspace.jobs.length === 0 ? (
        <EmptyState
          icon="wrench"
          title={teamScope ? 'No jobs yet' : 'No linked jobs yet'}
          description={
            teamScope
              ? 'Jobs appear here as soon as dispatch schedules work.'
              : 'Once a quote becomes an invoice and dispatch creates a job for that customer, it appears here.'
          }
        />
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {workspace.jobs.map((job) => (
            <li key={job.id} className="border border-line bg-panel/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-fg">{job.title}</p>
                  <p className="mt-1 font-mono text-[9px] text-fg-faint">
                    {job.ref} · {job.customerName}
                  </p>
                </div>
                <Badge
                  tone={
                    job.status === 'completed'
                      ? 'success'
                      : job.status === 'cancelled'
                        ? 'danger'
                        : 'cold'
                  }
                >
                  {job.status.replace('-', ' ')}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3 text-[10px] text-fg-faint">
                <span>{job.technician || 'Unassigned technician'}</span>
                <span>{job.scheduledAt ? shortDateTime(job.scheduledAt) : 'Not scheduled'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function SalesSettings({ workspace }: SectionProps) {
  const target = workspace.target
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Sales desk · Targets & pay"
        title="Your targets and pay."
        description="Set by management. Base pay follows your linked team member and the monthly payroll record."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={`${monthLabel(workspace.month)} target`}>
          {target ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <p className="t-metric text-fg">{money(target.revenueTarget)}</p>
                <p className="text-right text-[11px] text-fg-faint">
                  {target.dealsTarget} deals
                  <br />
                  {target.quotesTarget} quotes
                </p>
              </div>
              <div className="mt-5">
                <Progress value={workspace.metrics.attainment} tone="success" />
              </div>
              <div className="mt-5">
                <StatLine label="Won this month" value={money(workspace.metrics.wonValue)} tone="success" />
                <StatLine label="Commission rate" value={`${target.commissionRate}%`} />
                <StatLine
                  label="Commission earned"
                  value={money(workspace.metrics.commission)}
                  tone="success"
                />
                <StatLine
                  label="Target set by"
                  value={target.updatedBy}
                  note={shortDateTime(target.updatedAt)}
                />
              </div>
            </>
          ) : (
            <EmptyLine>No target has been set for this month. Ask your manager to set one.</EmptyLine>
          )}
        </Panel>
        <Panel title="Payroll snapshot" description="Linked team member payroll for this month.">
          <StatLine
            label="Payroll status"
            value={workspace.payroll?.status ?? 'Not linked'}
            tone="cold"
          />
          <StatLine
            label="Payroll amount"
            value={
              workspace.payroll?.status === 'missing' || !workspace.payroll
                ? 'Not prepared'
                : money(workspace.payroll.amount)
            }
            note="Base pay and adjustments in the payroll run"
          />
          <StatLine label="Estimated commission" value={money(workspace.metrics.commission)} tone="success" />
          <StatLine
            label="Base salary"
            value={money(workspace.profile?.baseSalary ?? 0)}
            note="Managed in Team & payroll"
          />
          <p className="mt-4 text-[10px] leading-relaxed text-fg-faint">
            Commission is calculated from won deal value in {monthLabel(workspace.month)}. Final pay is
            approved in the admin payroll run.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/sales/performance"
              className="inline-flex h-8 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
            >
              View performance
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  )
}
