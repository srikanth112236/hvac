import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Badge,
  Button,
  ButtonAnchor,
  EmptyState,
  Input,
  useToast,
} from '@/components/ui'
import { Icon, type IconName } from '@/components/icons'
import type {
  AnalyticsBreakdown,
  AnalyticsChart,
  AnalyticsFormat,
  AnalyticsReport,
  AnalyticsReportKey,
  ReportsAnalytics,
} from '@hvac/shared'
import { adminApi } from '@/admin/api'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  MetricCard,
  formatMoneyExact,
} from '@/admin/ui'

const PERIODS = [
  { value: 3, label: 'Last 3 months' },
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
  { value: 24, label: 'Last 24 months' },
]

const TYPE_FILTERS: { key: 'all' | AnalyticsReportKey; label: string }[] = [
  { key: 'all', label: 'All reports' },
  { key: 'financial', label: 'Financial' },
  { key: 'revenue', label: 'Receivables' },
  { key: 'expenses', label: 'Costs' },
  { key: 'payroll', label: 'People' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'operations', label: 'Operations' },
]

const toneStroke: Record<string, string> = {
  cold: 'rgb(var(--cold))',
  heat: 'rgb(var(--heat))',
  success: 'rgb(var(--success))',
  muted: 'rgb(var(--fg-faint))',
}

function formatValue(value: number, format: AnalyticsFormat): string {
  if (format === 'money') return formatMoneyExact(value)
  if (format === 'percent') return `${value.toFixed(1)}%`
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}

function formatCompact(value: number, format: AnalyticsFormat): string {
  const sign = value < 0 ? '-' : ''
  const magnitude = Math.abs(value)
  if (format === 'percent') return `${sign}${Math.round(magnitude)}%`
  if (format === 'number') {
    if (magnitude >= 1000) return `${sign}${(magnitude / 1000).toFixed(1)}k`
    return `${sign}${Math.round(magnitude)}`
  }
  if (magnitude >= 1000) return `${sign}$${(magnitude / 1000).toFixed(1)}k`
  return `${sign}$${Math.round(magnitude)}`
}

export function AdminReports() {
  const { toast } = useToast()
  const [months, setMonths] = useState(6)
  const [analytics, setAnalytics] = useState<ReportsAnalytics | null>(null)
  const [selected, setSelected] = useState<AnalyticsReportKey | null>(null)
  const [query, setQuery] = useState('')
  const [reportType, setReportType] = useState<'all' | AnalyticsReportKey>('all')
  const [tableQuery, setTableQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const detailRef = useRef<HTMLDivElement>(null)

  const load = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true)
      try {
        setAnalytics(await adminApi.analytics(months))
        setError('')
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not load reports.')
      } finally {
        setLoading(false)
      }
    },
    [months],
  )

  useEffect(() => {
    void load()
  }, [load])

  const reports = useMemo(
    () =>
      (analytics?.reports ?? []).filter(
        (report) =>
          report.hasData &&
          (reportType === 'all' || report.key === reportType) &&
          (!query.trim() ||
            `${report.title} ${report.eyebrow} ${report.description}`
              .toLowerCase()
              .includes(query.trim().toLowerCase())),
      ),
    [analytics, query, reportType],
  )

  const report = useMemo(
    () => analytics?.reports.find((entry) => entry.key === selected) ?? null,
    [analytics, selected],
  )
  const visualBreakdown = report && !report.charts[0] ? report.breakdowns[0] : null

  const openReport = (key: AnalyticsReportKey) => {
    setSelected(key)
    setTableQuery('')
    window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40)
  }

  const closeReport = () => {
    setSelected(null)
    setTableQuery('')
  }

  const refresh = async () => {
    await load(false)
    toast({ title: 'Reports refreshed from live records', tone: 'success' })
  }

  if (selected && report) {
    return (
      <div className="flex flex-col gap-6" ref={detailRef}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeReport}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim hover:text-cold"
          >
            <Icon name="chevron-left" size={13} />
            All reports
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success" dot>
              Live data
            </Badge>
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
              {analytics?.period.from} → {analytics?.period.to}
            </span>
          </div>
        </div>

        <AdminPageHeader
          eyebrow={`Reports · ${report.eyebrow}`}
          title={`${report.title}.`}
          description={report.description}
          actions={
            <>
              <Button variant="secondary" size="sm" icon="refresh" onClick={() => void refresh()}>
                Refresh
              </Button>
              <ButtonAnchor
                href={`/api/v1/admin/reports/analytics.csv?key=${report.key}&months=${months}`}
                download
                variant="secondary"
                size="sm"
                icon="download"
              >
                Export CSV
              </ButtonAnchor>
              <ButtonAnchor
                href={`/api/v1/admin/reports/analytics.pdf?key=${report.key}&months=${months}`}
                download
                size="sm"
                icon="download"
              >
                Export PDF
              </ButtonAnchor>
            </>
          }
        />

        <div className="grid gap-3 border border-line bg-panel/30 p-3 sm:grid-cols-[180px_minmax(0,1fr)]">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
              Period
            </span>
            <select
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              className="h-9 border border-line bg-panel px-2 font-mono text-[10px] text-fg outline-none focus:border-cold"
            >
              {PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Search in table"
            value={tableQuery}
            onChange={(event) => setTableQuery(event.target.value)}
            placeholder="Filter rows by name, status or value…"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {report.metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={formatValue(metric.value, metric.format)}
              note={metric.note}
              accent={
                metric.tone === 'positive' ? 'success' : metric.tone === 'warning' ? 'warn' : 'cold'
              }
            />
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {report.insights.map((insight) => (
            <div
              key={insight.title}
              className={
                insight.tone === 'attention'
                  ? 'border border-warn/35 bg-warn/[0.05] p-3'
                  : insight.tone === 'positive'
                    ? 'border border-success/30 bg-success/[0.04] p-3'
                    : 'border border-line bg-panel-2/30 p-3'
              }
            >
              <p className="text-[12px] text-fg">{insight.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">{insight.detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
          <section className="border border-line bg-panel/30 p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                  {report.charts[0]?.title ?? report.breakdowns[0]?.title ?? 'Visual'}
                </p>
                <p className="mt-1 text-[11px] text-fg-faint">
                  {report.charts[0]?.description ?? 'Live breakdown for the selected period.'}
                </p>
              </div>
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                {analytics?.period.label}
              </span>
            </div>
            {report.charts[0] ? (
              <LineChart chart={report.charts[0]} />
            ) : report.breakdowns[0] ? (
              <BreakdownBars breakdown={report.breakdowns[0]} />
            ) : (
              <p className="py-12 text-center text-[12px] text-fg-faint">
                No visual data for this report.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-4">
            {report.breakdowns
              .filter((breakdown) => breakdown !== visualBreakdown)
              .map((breakdown) => (
              <div key={breakdown.title} className="border border-line bg-panel/30 p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    {breakdown.title}
                  </p>
                  <span className="font-mono text-[8px] uppercase text-fg-faint">
                    {breakdown.items.length}
                  </span>
                </div>
                <BreakdownBars breakdown={breakdown} compact />
              </div>
              ))}
          </section>
        </div>

        {report.tables.map((table) => {
          const rows = table.rows.filter((row) =>
            !tableQuery.trim()
              ? true
              : row.join(' ').toLowerCase().includes(tableQuery.trim().toLowerCase()),
          )
          return (
            <section key={table.title} className="border border-line">
              <header className="flex items-center justify-between gap-2 border-b border-line bg-panel-2/40 px-4 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                  {table.title}
                </p>
                <span className="font-mono text-[8px] uppercase text-fg-faint">
                  {rows.length} rows
                </span>
              </header>
              {rows.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left">
                    <thead>
                      <tr className="border-b border-line font-mono text-[8px] uppercase text-fg-faint">
                        {table.columns.map((column) => (
                          <th
                            key={column}
                            className="whitespace-nowrap px-4 py-2"
                            scope="col"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rows.map((row, index) => (
                        <tr key={`${table.title}-${index}`} className="hover:bg-panel-2/30">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={`${table.title}-${index}-${cellIndex}`}
                              className={
                                table.align?.[cellIndex] === 'right'
                                  ? 'whitespace-nowrap px-4 py-2 text-right font-mono text-[10px] text-fg-dim'
                                  : 'px-4 py-2 text-[11px] text-fg-dim'
                              }
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-4 py-6 text-[11px] text-fg-faint">
                  No rows match the current filters.
                </p>
              )}
            </section>
          )
        })}

        <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-panel/30 p-3">
          <p className="text-[11px] text-fg-faint">
            Every figure is computed from live records. The PDF and CSV include the same filtered
            period.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonAnchor
              href={`/api/v1/admin/reports/analytics.csv?key=${report.key}&months=${months}`}
              download
              variant="secondary"
              size="sm"
              icon="download"
            >
              CSV
            </ButtonAnchor>
            <ButtonAnchor
              href={`/api/v1/admin/reports/analytics.pdf?key=${report.key}&months=${months}`}
              download
              variant="secondary"
              size="sm"
              icon="download"
            >
              PDF
            </ButtonAnchor>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Reports · analytics"
        title="Reports & analytics."
        description="Every operational and financial report in one place. Choose a report to explore live charts, breakdowns and detail rows, then export exactly what you see."
        actions={
          <>
            <Button variant="secondary" size="sm" icon="refresh" onClick={() => void refresh()}>
              Refresh data
            </Button>
            <Link
              to="/admin/reports/profit-loss"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              P&L statements
              <Icon name="arrow-up-right" size={12} />
            </Link>
          </>
        }
      />

      <div className="grid gap-3 border border-line bg-panel/30 p-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
            Reporting period
          </span>
          <select
            value={months}
            onChange={(event) => setMonths(Number(event.target.value))}
            className="h-9 border border-line bg-panel px-2 font-mono text-[10px] text-fg outline-none focus:border-cold"
          >
            {PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Find a report"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search revenue, payroll, pipeline…"
        />
        <div className="flex items-end gap-2 pb-1">
          <Badge tone="success" dot>
            Live
          </Badge>
          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
            {analytics?.period.label ?? 'Loading'}
          </span>
        </div>
      </div>

      {error ? <InlineError message={error} /> : null}

      <div className="flex flex-wrap gap-1" aria-label="Filter reports by type">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            aria-pressed={reportType === filter.key}
            onClick={() => setReportType(filter.key)}
            className={
              reportType === filter.key
                ? 'border border-cold/45 bg-cold/[0.08] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cold'
                : 'border border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/30 hover:text-fg'
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <AdminLoading rows={6} />
      ) : !analytics ? (
        <EmptyState
          icon="gauge"
          title="No analytics available."
          description="The report service did not return data. Refresh to try again."
        />
      ) : reports.length === 0 ? (
        <EmptyState
          icon="search"
          title="No reports match."
          description="Try a broader search or a different reporting period."
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((entry) => (
              <ReportCard key={entry.key} report={entry} onOpen={() => openReport(entry.key)} />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border border-line bg-panel/30 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-cold">
                <Icon name="coil" size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] text-fg">Monthly profit & loss statements</p>
                <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">
                  Full accrual and cash statement with expense categories, payroll, analysis and
                  scheduled email delivery.
                </p>
              </div>
            </div>
            <Link
              to="/admin/reports/profit-loss"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Open statements
              <Icon name="arrow-up-right" size={12} />
            </Link>
          </div>

          <p className="text-[11px] text-fg-faint">
            Generated {new Date(analytics.generatedAt).toLocaleString('en-US')} · {analytics.period.from} to{' '}
            {analytics.period.to} · {analytics.reports.filter((entry) => entry.hasData).length}{' '}
            reports with live data
          </p>
        </>
      )}
    </div>
  )
}

function ReportCard({ report, onOpen }: { report: AnalyticsReport; onOpen: () => void }) {
  const primary = report.metrics[0]
  const chart = report.charts[0]
  const sparkValues = chart?.series[0]?.values ?? report.breakdowns[0]?.items.map((item) => item.value) ?? []
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-h-[210px] flex-col justify-between border border-line bg-panel/40 p-5 text-left transition-colors hover:border-cold/45 focus-visible:border-cold"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border border-line text-cold">
            <Icon name={report.icon as IconName} size={14} />
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
            {report.eyebrow}
          </span>
        </div>
        <Icon
          name="arrow-up-right"
          size={14}
          className="text-fg-faint transition-colors group-hover:text-cold"
        />
      </div>
      <div className="mt-5 min-w-0">
        <p className="text-[15px] text-fg">{report.title}</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-fg-dim">
          {report.description}
        </p>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
            {primary?.label}
          </p>
          <p className="t-metric mt-1 truncate text-cold">
            {primary ? formatValue(primary.value, primary.format) : '—'}
          </p>
        </div>
        {sparkValues.length > 1 ? <MiniSpark values={sparkValues} /> : null}
      </div>
    </button>
  )
}

function MiniSpark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  const min = Math.min(0, ...values)
  const span = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 88
      const y = 30 - ((value - min) / span) * 26
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox="0 0 88 34" className="h-9 w-24 shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="rgb(var(--cold))"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function LineChart({ chart }: { chart: AnalyticsChart }) {
  const width = 720
  const height = 250
  const padding = { top: 20, right: 18, bottom: 34, left: 52 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const all = chart.series.flatMap((series) => series.values)
  const max = Math.max(1, ...all)
  const min = Math.min(0, ...all)
  const span = max - min || 1
  const xAt = (index: number) =>
    padding.left + (index / Math.max(1, chart.labels.length - 1)) * plotWidth
  const yAt = (value: number) => padding.top + (1 - (value - min) / span) * plotHeight
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        {chart.series.map((series) => (
          <span
            key={series.key}
            className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim"
          >
            <span
              className="h-1.5 w-4"
              style={{ background: toneStroke[series.tone] ?? 'rgb(var(--cold))' }}
            />
            {series.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-0"
        role="img"
        aria-label={`${chart.title}. ${chart.series.map((series) => series.label).join(', ')}`}
      >
        {ticks.map((tick) => {
          const value = max - (max - min) * tick
          const y = padding.top + plotHeight * tick
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="rgb(var(--line) / 0.8)"
                strokeWidth="0.7"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-current font-mono text-[8px] text-fg-faint"
                fill="rgb(var(--fg-faint))"
              >
                {formatCompact(value, chart.format)}
              </text>
            </g>
          )
        })}
        {min < 0 ? (
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={yAt(0)}
            y2={yAt(0)}
            stroke="rgb(var(--fg-faint))"
            strokeWidth="0.8"
            strokeDasharray="3 3"
          />
        ) : null}
        {chart.series.map((series) => {
          const points = series.values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(' ')
          return (
            <g key={series.key}>
              <polyline
                points={points}
                fill="none"
                stroke={toneStroke[series.tone] ?? 'rgb(var(--cold))'}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {series.values.map((value, index) => (
                <circle
                  key={`${series.key}-${index}`}
                  cx={xAt(index)}
                  cy={yAt(value)}
                  r="2.6"
                  fill="rgb(var(--base))"
                  stroke={toneStroke[series.tone] ?? 'rgb(var(--cold))'}
                  strokeWidth="1.5"
                >
                  <title>{`${series.label} · ${chart.labels[index]}: ${formatValue(value, chart.format)}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
        {chart.labels.map((label, index) => {
          const every = chart.labels.length > 8 ? 2 : 1
          if (index % every !== 0 && index !== chart.labels.length - 1) return null
          return (
            <text
              key={label}
              x={xAt(index)}
              y={height - 12}
              textAnchor="middle"
              fill="rgb(var(--fg-faint))"
              className="font-mono text-[8px]"
            >
              {label.replace(/ \d{4}$/, '')}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function BreakdownBars({
  breakdown,
  compact,
}: {
  breakdown: AnalyticsBreakdown
  compact?: boolean
}) {
  if (!breakdown.items.length) {
    return <p className="py-4 text-[11px] text-fg-faint">No data in this period.</p>
  }
  const max = Math.max(1, ...breakdown.items.map((item) => item.value))
  return (
    <ul className={compact ? 'flex flex-col gap-2' : 'flex flex-col gap-3'}>
      {breakdown.items.map((item) => (
        <li key={item.label} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[11px] text-fg-dim">{item.label}</span>
            <span className="shrink-0 font-mono text-[10px] text-fg">
              {formatValue(item.value, breakdown.format)}
            </span>
          </div>
          <div className={`mt-1.5 h-1.5 w-full bg-line ${compact ? '' : 'sm:h-2'}`}>
            <div
              className="h-full bg-cold"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
          {item.note || item.count !== undefined ? (
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
              {item.note ?? `${item.count ?? 0} records`}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
