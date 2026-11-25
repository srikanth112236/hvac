import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { Icon } from '@/components/icons'
import { Badge, RecordDrawer, Table, type Column } from '@/components/ui'
import { adminApi, type AdminMetrics } from '@/admin/api'
import { InvoiceStateBadge } from '@/admin/invoice-ui'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  MetricCard,
  Panel,
  StatusPill,
  formatDate,
  formatMoney,
  formatMoneyExact,
} from '@/admin/ui'

type LeadRow = AdminMetrics['recentLeads'][number] & { id: string }

export function AdminOverview() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [error, setError] = useState('')
  const [viewingLead, setViewingLead] = useState<LeadRow | null>(null)

  const load = useCallback(() => {
    adminApi
      .metrics()
      .then((data) => {
        setMetrics(data)
        setError('')
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Could not load metrics.')
      })
  }, [])
  useLiveRefresh(load)

  const columns: Column<LeadRow>[] = [
    {
      key: 'name',
      header: 'Lead',
      render: (row) => (
        <div>
          <p className="text-[13px] text-fg">{row.name}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">{row.ref}</p>
        </div>
      ),
    },
    {
      key: 'serviceName',
      header: 'Service',
      render: (row) => (
        <span className="text-[12px] text-fg-dim">{row.serviceName ?? 'Unallocated'}</span>
      ),
    },
    { key: 'city', header: 'City', render: (row) => row.city ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      mono: true,
      render: (row) => (row.value ? formatMoney(row.value) : '—'),
    },
    {
      key: 'createdAt',
      header: 'Received',
      align: 'right',
      mono: true,
      render: (row) => formatDate(row.createdAt),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Overview"
        title="Today at the works."
        description="Inbox, pipeline and collections in one view. Every figure is read live from the API — no sample numbers."
        actions={
          <>
            <Link
              to="/admin/leads"
              className="flex h-9 items-center gap-2 border border-line px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Open pipeline
              <Icon name="arrow-right" size={12} />
            </Link>
            <Link
              to="/admin/content"
              className="flex h-9 items-center gap-2 border border-cold/40 bg-cold/[0.06] px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-cold"
            >
              Publish content
              <Icon name="arrow-up-right" size={12} />
            </Link>
          </>
        }
      />

      {error ? <InlineError message={error} /> : null}

      {!metrics ? (
        <AdminLoading rows={5} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Open pipeline"
              value={formatMoney(metrics.leads.pipelineValue)}
              note={`${metrics.leads.total} leads · ${metrics.leads.newThisWeek} this week`}
            />
            <MetricCard
              label="Collected"
              value={formatMoney(metrics.payments.collected)}
              accent="success"
              note={`${metrics.payments.count} invoices recorded`}
            />
            <MetricCard
              label="Awaiting payment"
              value={formatMoney(metrics.payments.pending)}
              accent="heat"
              note={`${metrics.payments.overdue} overdue invoice${metrics.payments.overdue === 1 ? '' : 's'}`}
            />
            <MetricCard
              label="Attention"
              value={metrics.leads.overdueFollowUps + metrics.reminders.overdue}
              accent="warn"
              note={`${metrics.leads.overdueFollowUps} overdue follow-ups · ${metrics.reminders.dueToday} reminders due today`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Collected this month"
              value={formatMoney(metrics.invoices.collectedThisMonth)}
              accent="success"
              note={`${formatMoney(metrics.invoices.outstanding)} still outstanding`}
            />
            <MetricCard
              label="Expenses this month"
              value={formatMoney(metrics.finance.expensesThisMonth)}
              accent="heat"
              note={`${formatMoney(metrics.finance.expenses)} lifetime`}
            />
            <MetricCard
              label="Payroll paid this month"
              value={formatMoney(metrics.finance.payrollPaidThisMonth)}
              note={`${metrics.finance.activeTeam} active team · ${formatMoney(metrics.finance.payrollCommitment)} commitment`}
            />
            <MetricCard
              label="Net this month"
              value={formatMoney(metrics.finance.netThisMonth)}
              accent={metrics.finance.netThisMonth >= 0 ? 'success' : 'warn'}
              note={`${formatMoney(metrics.finance.netLifetime)} net lifetime`}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {([
              ['Invoices', '/admin/invoices', 'Issue, split and print'],
              ['Expenses', '/admin/expenses', 'Materials and overheads'],
              ['Team & payroll', '/admin/team', 'Crew and monthly salaries'],
              ['Website content', '/admin/content', 'Every public section'],
            ] as const).map(([label, to, note]) => (
              <Link
                key={to}
                to={to}
                className="group border border-line bg-panel/30 p-4 hover:border-cold/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim group-hover:text-cold">
                    {label}
                  </span>
                  <Icon name="arrow-up-right" size={12} className="text-fg-faint group-hover:text-cold" />
                </div>
                <p className="mt-1.5 text-[11px] text-fg-faint">{note}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            <Panel
              title="Pipeline by stage"
              className="xl:col-span-7"
              action={<Badge tone="cold" dot>Live</Badge>}
            >
              <div className="flex flex-col gap-3">
                {([
                  ['new', 'New'],
                  ['contacted', 'Contacted'],
                  ['site-visit', 'Site visit'],
                  ['quoted', 'Quoted'],
                  ['won', 'Won'],
                  ['lost', 'Lost'],
                ] as const).map(([key, label]) => {
                  const count = metrics.leads.byStatus[key] ?? 0
                  const max = Math.max(1, ...Object.values(metrics.leads.byStatus))
                  return (
                    <div key={key} className="grid grid-cols-[90px_1fr_36px] items-center gap-3">
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                        {label}
                      </span>
                      <div className="h-2 bg-panel-2">
                        <div
                          className={key === 'won' ? 'h-2 bg-success' : key === 'lost' ? 'h-2 bg-danger/60' : 'h-2 bg-cold/70'}
                          style={{ width: `${Math.max(count ? 6 : 0, (count / max) * 100)}%` }}
                        />
                      </div>
                      <span className="t-num text-right text-[11px] text-fg-dim">{count}</span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-px border border-line bg-line">
                <div className="bg-base p-4">
                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                    Won value
                  </span>
                  <p className="t-num mt-1 text-[16px] text-fg">{formatMoney(metrics.leads.wonValue)}</p>
                </div>
                <div className="bg-base p-4">
                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                    Open reminders
                  </span>
                  <p className="t-num mt-1 text-[16px] text-fg">{metrics.reminders.open}</p>
                </div>
              </div>
            </Panel>

            <Panel title="Collected vs outflow · last six months" className="xl:col-span-5">
              <div className="flex h-[180px] items-end gap-2" role="img" aria-label="Monthly collected, expenses and payroll">
                {metrics.financeTrend.map((month) => {
                  const max = Math.max(
                    1,
                    ...metrics.financeTrend.flatMap((entry) => [entry.collected, entry.expenses, entry.payroll]),
                  )
                  const bar = (value: number, tone: string) => (
                    <div
                      className={value ? tone : 'bg-line'}
                      style={{ height: `${value ? Math.max(4, (value / max) * 100) : 2}%` }}
                      title={`${formatMoney(value)}`}
                    />
                  )
                  return (
                    <div key={month.month} className="flex h-full flex-1 flex-col justify-end gap-2">
                      <div className="flex h-full items-end gap-[3px]">
                        {bar(month.collected, 'flex-1 bg-success/70')}
                        {bar(month.expenses, 'flex-1 bg-heat/60')}
                        {bar(month.payroll, 'flex-1 bg-cold/50')}
                      </div>
                      <span className="text-center font-mono text-[8px] uppercase tracking-[0.04em] text-fg-faint">
                        {month.month.slice(5)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 bg-success/70" /> Collected</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 bg-heat/60" /> Expenses</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 bg-cold/50" /> Payroll</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                  Method mix
                </span>
                <span className="font-mono text-[9px] uppercase text-fg-dim">
                  {Object.keys(metrics.payments.byMethod).length
                    ? Object.keys(metrics.payments.byMethod).join(' · ')
                    : 'No settled invoices'}
                </span>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            <Panel
              title="Latest enquiries"
              className="xl:col-span-8"
              bodyClassName="p-0"
              action={
                <Link
                  to="/admin/leads"
                  className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:text-fg"
                >
                  All leads →
                </Link>
              }
            >
              <Table
                columns={columns}
                rows={metrics.recentLeads.map((lead) => ({ ...lead, id: lead.ref }))}
                dense
                className="border-0"
                onRowView={setViewingLead}
                viewLabel={(row) => row.name}
              />
            </Panel>

            <Panel title="Service demand" className="xl:col-span-4">
              {metrics.serviceDemand.length ? (
                <ol className="flex flex-col">
                  {metrics.serviceDemand.map((entry, index) => (
                    <li
                      key={entry.service}
                      className="flex items-center justify-between gap-3 border-t border-line/70 py-2.5 first:border-t-0 first:pt-0"
                    >
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="t-num text-[9px] text-cold">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="truncate text-[12px] text-fg-dim">{entry.service}</span>
                      </span>
                      <span className="t-num text-[11px] text-fg">{entry.count}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[12px] text-fg-faint">No leads yet.</p>
              )}
              <div className="mt-5 border-t border-line pt-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  Published content
                </span>
                <p className="mt-1 text-[12px] text-fg-dim">
                  Version {metrics.content.version} · {formatDate(metrics.content.updatedAt)}
                </p>
              </div>
            </Panel>
          </div>

          <Panel
            title="Recent invoices"
            bodyClassName="p-0"
            action={
              <Link
                to="/admin/invoices"
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:text-fg"
              >
                All invoices →
              </Link>
            }
          >
            {metrics.recentInvoices.length ? (
              <div className="divide-y divide-line">
                {metrics.recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/admin/invoices/${invoice.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 hover:bg-panel-2/40 sm:grid-cols-[110px_1fr_120px_120px_auto]"
                  >
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-cold">{invoice.ref}</span>
                    <span className="min-w-0 truncate text-[12px] text-fg">{invoice.customerName}</span>
                    <span className="hidden font-mono text-[9px] uppercase tracking-[0.06em] text-fg-faint sm:block">{formatDate(invoice.issueDate)}</span>
                    <span className="t-num text-right text-[12px] text-fg">{formatMoneyExact(invoice.totals.total)}</span>
                    <span className="justify-self-end"><InvoiceStateBadge state={invoice.totals.state} /></span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-4 py-6 text-[12px] text-fg-faint">No invoices yet. Issue the first one from Invoices.</p>
            )}
          </Panel>
        </>
      )}

      <RecordDrawer
        open={Boolean(viewingLead)}
        onClose={() => setViewingLead(null)}
        title={viewingLead?.name ?? 'Lead'}
        subtitle={viewingLead?.ref}
        record={viewingLead as unknown as Record<string, unknown> | null}
        exclude={['id']}
        actions={
          viewingLead ? (
            <Link
              to="/admin/leads"
              className="flex h-9 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Open lead board
            </Link>
          ) : undefined
        }
      />
    </div>
  )
}
