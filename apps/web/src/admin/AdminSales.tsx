import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  LeadStatus,
  SalesRepSummary,
  SalesWorkspace,
  TeamMember,
} from '@hvac/shared'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
} from '@/components/ui'
import { adminApi } from '@/admin/api'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  MetricCard,
  Panel,
} from '@/admin/ui'
import {
  EmptyLine,
  Progress,
  QuoteBadge,
  SALES_STAGES,
  TrendBars,
  daysUntil,
  money,
  moneyExact,
  monthLabel,
  shortDate,
  shortDateTime,
  stageMeta,
} from '@/sales/shared'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export function AdminSales() {
  const [month, setMonth] = useState(currentMonth)
  const [repFilter, setRepFilter] = useState('all')
  const [workspace, setWorkspace] = useState<SalesWorkspace | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [selectedRefs, setSelectedRefs] = useState<string[]>([])
  const [assignOwner, setAssignOwner] = useState('')
  const [assignBusy, setAssignBusy] = useState(false)
  const [targetRep, setTargetRep] = useState<SalesRepSummary | null>(null)
  const [compRep, setCompRep] = useState<SalesRepSummary | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [next, teamPayload] = await Promise.all([
        adminApi.salesWorkspace(month, repFilter === 'all' ? undefined : repFilter),
        adminApi.team(),
      ])
      setWorkspace(next)
      setTeam(teamPayload.data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The sales desk could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, repFilter])

  const reps = workspace?.reps ?? []
  const filteredLeads = useMemo(() => {
    if (!workspace) return []
    const text = query.trim().toLowerCase()
    return workspace.leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false
      if (ownerFilter === 'unassigned' && lead.owner) return false
      if (ownerFilter !== 'all' && ownerFilter !== 'unassigned' && lead.owner !== ownerFilter)
        return false
      if (!text) return true
      return [lead.ref, lead.name, lead.email, lead.phone, lead.city, lead.serviceName, lead.owner]
        .join(' ')
        .toLowerCase()
        .includes(text)
    })
  }, [ownerFilter, query, statusFilter, workspace])

  const unassigned = workspace?.leads.filter((lead) => !lead.owner) ?? []
  const openFollowUps = workspace?.followUps.filter((entry) => entry.status === 'open') ?? []
  const overdue = openFollowUps.filter((entry) => entry.overdue)
  const activeJobs =
    workspace?.jobs.filter((job) => !['completed', 'cancelled'].includes(job.status)) ?? []

  const assign = async (refs: string[], owner: string | null) => {
    if (!refs.length) return
    setAssignBusy(true)
    setError('')
    try {
      await adminApi.salesAssignLeads(refs, owner)
      setSelectedRefs([])
      setAssignOwner('')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The leads could not be assigned.')
    } finally {
      setAssignBusy(false)
    }
  }

  if (loading && !workspace) {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          eyebrow="Sales · Command center"
          title="Sales command center."
          description="Loading the floor…"
        />
        <AdminLoading rows={6} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow={`Sales command center · ${monthLabel(month)}`}
        title="Sales command center."
        description="Assign the book, set monthly targets, watch every rep and reconcile commission against payroll. Sales accounts only see their own slice in the sales portal."
        actions={
          <>
            <Link
              to="/admin/settings"
              className="inline-flex h-9 items-center border border-line px-4 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Sales users
            </Link>
            <Link
              to="/admin/leads"
              className="inline-flex h-9 items-center border border-cold/50 bg-cold/[0.07] px-4 font-mono text-[9px] uppercase tracking-[0.1em] text-cold"
            >
              Lead desk
            </Link>
          </>
        }
      />

      {error ? <InlineError message={error} /> : null}

      <div className="flex flex-wrap items-end gap-3 border border-line bg-panel/40 p-3">
        <Input
          label="Month"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value || currentMonth())}
          className="w-[170px]"
        />
        <Select
          label="Scope"
          value={repFilter}
          onChange={(event) => setRepFilter(event.target.value)}
          options={[
            { value: 'all', label: 'All sales' },
            ...reps.map((rep) => ({
              value: rep.profile.email,
              label: rep.profile.name,
            })),
          ]}
          className="min-w-[200px]"
        />
        <Button variant="secondary" size="sm" icon="refresh" onClick={() => void load()}>
          Refresh
        </Button>
        {workspace?.scope.mode === 'own' ? (
          <Badge tone="cold">Viewing {workspace.scope.label}</Badge>
        ) : null}
      </div>

      <div className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Open pipeline" value={money(workspace?.metrics.pipelineValue)} note={`${workspace?.metrics.openLeads ?? 0} open leads`} />
        <MetricCard label="Won this month" value={money(workspace?.metrics.wonValue)} note={`${workspace?.metrics.wonDeals ?? 0} closed deals`} accent="success" />
        <MetricCard label="Target attainment" value={`${Math.round(workspace?.metrics.attainment ?? 0)}%`} note={`${money(workspace?.metrics.targetValue)} team target`} />
        <MetricCard label="Commission earned" value={money(workspace?.metrics.commission)} note="Won value × rep rate" accent="heat" />
        <MetricCard label="Unassigned leads" value={unassigned.length} note={`${overdue.length} overdue follow-ups`} accent={unassigned.length ? 'warn' : 'success'} />
      </div>

      <Panel
        title="Sales floor"
        description="Targets, book size and estimated pay for every active sales account."
        action={<Badge tone={reps.length ? 'cold' : 'warn'}>{reps.length} reps</Badge>}
        bodyClassName="p-0"
      >
        {reps.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon="shield"
              title="No sales accounts yet"
              description="Create a staff account with the Sales role in Settings, then come back to assign leads and set a target."
              action={
                <Link
                  to="/admin/settings"
                  className="inline-flex h-9 items-center border border-cold/50 bg-cold/[0.07] px-4 font-mono text-[9px] uppercase tracking-[0.1em] text-cold"
                >
                  Create a sales user
                </Link>
              }
            />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  {['Rep', 'Book', 'Won this month', 'Target', 'Pay', 'Payroll', ''].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-2.5 font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reps.map((rep) => (
                  <tr key={rep.profile.email} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-[12px] text-fg">{rep.profile.name}</p>
                      <p className="font-mono text-[9px] text-fg-faint">{rep.profile.email}</p>
                      {!rep.profile.active ? (
                        <Badge tone="warn" className="mt-1">Inactive</Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="t-num text-[12px] text-fg">{rep.metrics.assignedLeads} leads</p>
                      <p className="text-[9px] text-fg-faint">{rep.metrics.openLeads} open</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="t-num text-[12px] text-success">{money(rep.metrics.wonValue)}</p>
                      <p className="text-[9px] text-fg-faint">{rep.metrics.wonDeals} deals</p>
                    </td>
                    <td className="w-[170px] px-4 py-3">
                      <p className="text-[10px] text-fg-dim">
                        {money(rep.metrics.wonValue)} / {money(rep.target?.revenueTarget ?? 0)}
                      </p>
                      <div className="mt-1.5">
                        <Progress value={rep.metrics.attainment} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="t-num text-[11px] text-fg">{money(rep.estimatedPay)}</p>
                      <p className="text-[9px] text-fg-faint">
                        base {money(rep.profile.baseSalary)} + {money(rep.metrics.commission)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          rep.payroll.status === 'paid'
                            ? 'success'
                            : rep.payroll.status === 'pending'
                              ? 'warn'
                              : 'neutral'
                        }
                      >
                        {rep.payroll.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="quiet" size="sm" onClick={() => setTargetRep(rep)}>
                          Target
                        </Button>
                        <Button variant="quiet" size="sm" onClick={() => setCompRep(rep)}>
                          Pay
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <Panel
          title="Lead assignment"
          description="Select leads to bulk assign, or change one owner directly in the row."
          action={
            <Badge tone={unassigned.length ? 'warn' : 'success'}>
              {unassigned.length} unassigned
            </Badge>
          }
          bodyClassName="p-0"
        >
          <div className="grid gap-2 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Search"
              placeholder="Name, ref, city…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select
              label="Stage"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as LeadStatus | 'all')}
              options={[
                { value: 'all', label: 'All stages' },
                ...SALES_STAGES.map((stage) => ({ value: stage.key, label: stage.label })),
              ]}
            />
            <Select
              label="Owner"
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
              options={[
                { value: 'all', label: 'All owners' },
                { value: 'unassigned', label: 'Unassigned' },
                ...reps.map((rep) => ({
                  value: rep.profile.email,
                  label: rep.profile.name,
                })),
              ]}
            />
            <div className="flex flex-col justify-end">
              <p className="text-[10px] text-fg-faint">
                {filteredLeads.length} leads · {selectedRefs.length} selected
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 border-b border-line bg-base/40 px-4 py-3">
            <Select
              aria-label="Bulk assign owner"
              value={assignOwner}
              onChange={(event) => setAssignOwner(event.target.value)}
              options={[
                { value: '', label: 'Choose sales owner' },
                ...reps.map((rep) => ({
                  value: rep.profile.email,
                  label: `Assign to ${rep.profile.name}`,
                })),
              ]}
              className="min-w-[210px]"
            />
            <Button
              size="sm"
              disabled={!selectedRefs.length || !assignOwner || assignBusy}
              loading={assignBusy}
              onClick={() => void assign(selectedRefs, assignOwner)}
            >
              Assign selected
            </Button>
            <Button
              variant="quiet"
              size="sm"
              disabled={!selectedRefs.length || assignBusy}
              onClick={() => void assign(selectedRefs, null)}
            >
              Return to queue
            </Button>
            {selectedRefs.length ? (
              <button
                type="button"
                onClick={() => setSelectedRefs([])}
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint hover:text-fg"
              >
                Clear
              </button>
            ) : null}
          </div>

          {filteredLeads.length === 0 ? (
            <EmptyLine>No leads match this filter.</EmptyLine>
          ) : (
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-panel">
                  <tr className="border-b border-line">
                    <th className="w-8 px-3 py-2" />
                    {['Lead', 'Stage', 'Value', 'Owner', 'Quote', 'Updated'].map((label) => (
                      <th
                        key={label}
                        className="px-3 py-2 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.ref} className="border-b border-line/60 last:border-0">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Select ${lead.ref}`}
                          checked={selectedRefs.includes(lead.ref)}
                          onChange={(event) =>
                            setSelectedRefs((current) =>
                              event.target.checked
                                ? [...current, lead.ref]
                                : current.filter((ref) => ref !== lead.ref),
                            )
                          }
                          className="accent-cold"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <p className="max-w-[200px] truncate text-[11px] text-fg">{lead.name}</p>
                        <p className="font-mono text-[9px] text-fg-faint">
                          {lead.ref} · {lead.city ?? '—'}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={stageMeta(lead.status).tone}>
                          {stageMeta(lead.status).label}
                        </Badge>
                      </td>
                      <td className="t-num px-3 py-2 text-[11px] text-fg">{money(lead.value)}</td>
                      <td className="px-3 py-2">
                        <select
                          aria-label={`Owner for ${lead.ref}`}
                          value={lead.owner ?? ''}
                          disabled={assignBusy || !reps.length}
                          onChange={(event) =>
                            void assign([lead.ref], event.target.value || null)
                          }
                          className="h-8 max-w-[180px] border border-line bg-transparent px-2 text-[10px] text-fg-dim outline-none focus:border-cold"
                        >
                          <option value="">Unassigned</option>
                          {lead.owner && !reps.some((rep) => rep.profile.email === lead.owner) ? (
                            <option value={lead.owner}>{lead.owner}</option>
                          ) : null}
                          {reps.map((rep) => (
                            <option key={rep.profile.email} value={rep.profile.email}>
                              {rep.profile.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-fg-faint">
                        {lead.quoteCount ? `${lead.quoteCount} · ${money(lead.quoteValue)}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-fg-faint">
                        {shortDate(lead.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="Unassigned queue" description="Fresh enquiries waiting for an owner." bodyClassName="p-0">
            {unassigned.length === 0 ? (
              <EmptyLine>Every lead has an owner.</EmptyLine>
            ) : (
              <ul className="divide-y divide-line/70">
                {unassigned.slice(0, 8).map((lead) => (
                  <li key={lead.ref} className="flex items-center gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-fg">{lead.name}</p>
                      <p className="truncate text-[9px] text-fg-faint">
                        {lead.ref} · {lead.serviceName ?? 'Service'} · {money(lead.value)}
                      </p>
                    </div>
                    <select
                      aria-label={`Assign ${lead.ref}`}
                      value=""
                      disabled={!reps.length || assignBusy}
                      onChange={(event) =>
                        void assign([lead.ref], event.target.value || null)
                      }
                      className="h-7 max-w-[110px] border border-line bg-transparent px-1 text-[9px] text-fg-dim outline-none"
                    >
                      <option value="">Assign</option>
                      {reps.map((rep) => (
                        <option key={rep.profile.email} value={rep.profile.email}>
                          {rep.profile.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Follow-up risk" description="Open reminders across the floor." bodyClassName="p-0">
            {openFollowUps.length === 0 ? (
              <EmptyLine>No open follow-ups.</EmptyLine>
            ) : (
              <ul className="divide-y divide-line/70">
                {openFollowUps.slice(0, 6).map((entry) => (
                  <li key={entry.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] text-fg">{entry.title}</p>
                      <Badge tone={entry.overdue ? 'danger' : 'cold'}>
                        {entry.overdue ? 'Overdue' : `${daysUntil(entry.dueAt) ?? 0}d`}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[9px] text-fg-faint">
                      {entry.leadName} · {entry.owner ?? 'Unassigned'} ·{' '}
                      {shortDateTime(entry.dueAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <Panel
          title="Pipeline and run rate"
          description="Won revenue against target for the last six months."
        >
          <TrendBars trend={workspace?.trend ?? []} />
          <div className="mt-4">
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
              By stage
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SALES_STAGES.map((stage) => {
                const rows = workspace?.leads.filter((lead) => lead.status === stage.key) ?? []
                return (
                  <span
                    key={stage.key}
                    className="inline-flex items-center gap-2 border border-line px-2.5 py-1.5 text-[10px] text-fg-dim"
                  >
                    {stage.label}
                    <span className="t-num text-fg">{rows.length}</span>
                  </span>
                )
              })}
            </div>
          </div>
        </Panel>

        <Panel
          title="Jobs in motion"
          description={
            workspace?.scope.mode === 'team'
              ? 'Active customer jobs across the whole floor.'
              : 'Customer jobs linked to this book.'
          }
          bodyClassName="p-0"
        >
          {activeJobs.length === 0 ? (
            <EmptyLine>
              {workspace?.scope.mode === 'team'
                ? 'No active jobs right now.'
                : 'No active jobs linked to this book.'}
            </EmptyLine>
          ) : (
            <ul className="divide-y divide-line/70">
              {activeJobs.slice(0, 6).map((job) => (
                <li key={job.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] text-fg">{job.title}</p>
                    <p className="truncate text-[9px] text-fg-faint">
                      {job.customerName} · {job.technician || 'Unassigned'}
                    </p>
                  </div>
                  <Badge tone="cold">{job.status.replace('-', ' ')}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Quotes across the book"
        description="Every quotation linked to a lead, with its sales owner."
        action={<Badge tone="cold">{workspace?.quotations.length ?? 0}</Badge>}
        bodyClassName="p-0"
      >
        {!workspace?.quotations.length ? (
          <EmptyLine>No quotations yet.</EmptyLine>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  {['Quote', 'Lead / customer', 'Owner', 'Value', 'Status', 'Updated'].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-2.5 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workspace.quotations.slice(0, 12).map((quotation) => (
                  <tr key={quotation.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="text-[11px] text-fg">{quotation.title}</p>
                      <p className="font-mono text-[9px] text-fg-faint">{quotation.ref}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-fg-dim">
                      {quotation.leadName ?? quotation.customerName}
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-fg-dim">
                      {quotation.owner ?? 'Unassigned'}
                    </td>
                    <td className="t-num px-4 py-2.5 text-[11px] text-fg">
                      {moneyExact(quotation.totals.total)}
                    </td>
                    <td className="px-4 py-2.5">
                      <QuoteBadge status={quotation.status} />
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-fg-faint">
                      {shortDate(quotation.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <TargetModal
        key={`${targetRep?.profile.email ?? 'none'}-${month}`}
        rep={targetRep}
        month={month}
        onClose={() => setTargetRep(null)}
        onSaved={() => {
          setTargetRep(null)
          void load()
        }}
      />
      <CompensationModal
        key={compRep?.profile.email ?? 'none'}
        rep={compRep}
        team={team}
        onClose={() => setCompRep(null)}
        onSaved={() => {
          setCompRep(null)
          void load()
        }}
      />
    </div>
  )
}

function TargetModal({
  rep,
  month,
  onClose,
  onSaved,
}: {
  rep: SalesRepSummary | null
  month: string
  onClose: () => void
  onSaved: () => void
}) {
  const target = rep?.target ?? null
  const [revenueTarget, setRevenueTarget] = useState(String(target?.revenueTarget ?? 0))
  const [dealsTarget, setDealsTarget] = useState(String(target?.dealsTarget ?? 0))
  const [quotesTarget, setQuotesTarget] = useState(String(target?.quotesTarget ?? 0))
  const [commissionRate, setCommissionRate] = useState(String(target?.commissionRate ?? 5))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!rep) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={`Target · ${rep.profile.name}`}
      description={`${monthLabel(month)} · this is the number the sales portal scores against.`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="quiet" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await adminApi.salesSaveTarget(rep.profile.email, {
                  month,
                  revenueTarget: Number(revenueTarget) || 0,
                  dealsTarget: Number(dealsTarget) || 0,
                  quotesTarget: Number(quotesTarget) || 0,
                  commissionRate: Number(commissionRate) || 0,
                })
                onSaved()
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : 'Target could not be saved.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Save target
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <InlineError message={error} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Revenue target"
            type="number"
            min="0"
            value={revenueTarget}
            onChange={(event) => setRevenueTarget(event.target.value)}
          />
          <Input
            label="Commission rate %"
            type="number"
            min="0"
            max="50"
            step="0.1"
            value={commissionRate}
            onChange={(event) => setCommissionRate(event.target.value)}
          />
          <Input
            label="Deals target"
            type="number"
            min="0"
            value={dealsTarget}
            onChange={(event) => setDealsTarget(event.target.value)}
          />
          <Input
            label="Quotes target"
            type="number"
            min="0"
            value={quotesTarget}
            onChange={(event) => setQuotesTarget(event.target.value)}
          />
        </div>
        <p className="text-[10px] leading-relaxed text-fg-faint">
          Commission is calculated on won lead value for the selected month. Targets are per rep and
          per month, so changing the month never rewrites history.
        </p>
      </div>
    </Modal>
  )
}

function CompensationModal({
  rep,
  team,
  onClose,
  onSaved,
}: {
  rep: SalesRepSummary | null
  team: TeamMember[]
  onClose: () => void
  onSaved: () => void
}) {
  const [baseSalary, setBaseSalary] = useState(String(rep?.profile.baseSalary ?? 0))
  const [teamMemberId, setTeamMemberId] = useState(rep?.profile.teamMemberId ?? '')
  const [active, setActive] = useState(rep?.profile.active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!rep) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={`Pay settings · ${rep.profile.name}`}
      description="Link the staff account to a team member so payroll and commission land on one payslip."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="quiet" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await adminApi.salesUpdateRep(rep.profile.email, {
                  baseSalary: Number(baseSalary) || 0,
                  teamMemberId: teamMemberId || null,
                  active,
                })
                onSaved()
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : 'Pay settings were not saved.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Save pay settings
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <InlineError message={error} /> : null}
        <Input
          label="Base salary (monthly)"
          type="number"
          min="0"
          value={baseSalary}
          onChange={(event) => setBaseSalary(event.target.value)}
          hint="Leave 0 if this rep is commission-only."
        />
        <Select
          label="Linked team member"
          value={teamMemberId}
          onChange={(event) => {
            const next = event.target.value
            setTeamMemberId(next)
            const member = team.find((entry) => entry.id === next)
            if (member && Number(baseSalary) === 0) setBaseSalary(String(member.monthlySalary))
          }}
          options={[
            { value: '', label: 'No linked team member' },
            ...team.map((member) => ({
              value: member.id,
              label: `${member.name} · ${member.role} · ${money(member.monthlySalary)}`,
            })),
          ]}
        />
        <label className="flex items-center gap-2 text-[11px] text-fg-dim">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="accent-cold"
          />
          Active on the sales floor
        </label>
        <p className="text-[10px] leading-relaxed text-fg-faint">
          Payroll for {monthLabel(rep.payroll.period)}: {rep.payroll.status}. Base{' '}
          {money(rep.profile.baseSalary)} · commission {money(rep.metrics.commission)} · estimated{' '}
          {money(rep.estimatedPay)}.
        </p>
      </div>
    </Modal>
  )
}
