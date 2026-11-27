import type { ReactNode } from 'react'
import { Badge, type BadgeTone } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { LeadStatus, QuotationStatus, SalesMetrics } from '@hvac/shared'

export const SALES_STAGES: { key: LeadStatus; label: string; tone: BadgeTone }[] = [
  { key: 'new', label: 'New', tone: 'cold' },
  { key: 'contacted', label: 'Contacted', tone: 'neutral' },
  { key: 'site-visit', label: 'Site visit', tone: 'warn' },
  { key: 'quoted', label: 'Quoted', tone: 'heat' },
  { key: 'won', label: 'Won', tone: 'success' },
  { key: 'lost', label: 'Lost', tone: 'danger' },
]

export function stageMeta(status: LeadStatus): { key: LeadStatus; label: string; tone: BadgeTone } {
  return (
    SALES_STAGES.find((stage) => stage.key === status) ?? {
      key: 'new',
      label: 'New',
      tone: 'cold',
    }
  )
}

export function quoteTone(status: QuotationStatus): BadgeTone {
  if (status === 'accepted') return 'success'
  if (status === 'declined' || status === 'expired') return 'danger'
  if (status === 'changes-requested') return 'warn'
  if (status === 'sent') return 'cold'
  return 'neutral'
}

export function money(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

export function moneyExact(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value ?? 0)
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function shortDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function monthLabel(month: string): string {
  const parsed = new Date(`${month}-01T12:00:00`)
  return Number.isNaN(parsed.getTime())
    ? month
    : parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null
  const due = Date.parse(value)
  if (!Number.isFinite(due)) return null
  return Math.ceil((due - Date.now()) / 86_400_000)
}

export function Progress({
  value,
  tone = 'cold',
  label,
}: {
  value: number
  tone?: 'cold' | 'success' | 'warn' | 'heat'
  label?: string
}) {
  const width = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  const bar =
    tone === 'success'
      ? 'bg-success'
      : tone === 'warn'
        ? 'bg-warn'
        : tone === 'heat'
          ? 'bg-heat'
          : 'bg-cold'
  return (
    <div>
      <div
        className="h-1.5 w-full overflow-hidden bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        aria-label={label ?? 'Progress'}
      >
        <div className={cn('h-full transition-[width] duration-500', bar)} style={{ width: `${width}%` }} />
      </div>
      {label ? <p className="mt-1.5 font-mono text-[9px] text-fg-faint">{label}</p> : null}
    </div>
  )
}

export function MetricGrid({ metrics }: { metrics: SalesMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-line bg-line xl:grid-cols-4">
      {[
        ['Pipeline value', money(metrics.pipelineValue), `${metrics.openLeads} open leads`],
        ['Won this month', money(metrics.wonValue), `${metrics.wonDeals} closed deals`],
        ['Target attainment', `${Math.round(metrics.attainment)}%`, money(metrics.targetValue)],
        [
          'Open follow-ups',
          String(metrics.followUpsOpen),
          metrics.followUpsOverdue
            ? `${metrics.followUpsOverdue} overdue`
            : 'Nothing overdue',
        ],
      ].map(([label, value, note]) => (
        <div key={label} className="min-w-0 bg-base px-4 py-4">
          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">{label}</p>
          <p className="t-metric mt-2 text-fg">{value}</p>
          <p className="mt-1 text-[10px] text-fg-faint">{note}</p>
        </div>
      ))}
    </div>
  )
}

export function StageBars({
  leads,
  onSelect,
}: {
  leads: { status: LeadStatus; value: number | null }[]
  onSelect?: (status: LeadStatus) => void
}) {
  const totals = SALES_STAGES.map((stage) => {
    const rows = leads.filter((lead) => lead.status === stage.key)
    return {
      ...stage,
      count: rows.length,
      value: rows.reduce((sum, lead) => sum + (lead.value ?? 0), 0),
    }
  })
  const max = Math.max(1, ...totals.map((entry) => entry.value))

  return (
    <div className="flex flex-col gap-3">
      {totals.map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => onSelect?.(entry.key)}
          className="group grid min-w-0 grid-cols-[76px_minmax(0,1fr)_72px] items-center gap-3 text-left"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
            {entry.label}
          </span>
          <span className="h-2 overflow-hidden bg-line">
            <span
              className={cn(
                'block h-full',
                entry.key === 'won'
                  ? 'bg-success'
                  : entry.key === 'lost'
                    ? 'bg-danger'
                    : entry.key === 'quoted'
                      ? 'bg-heat'
                      : 'bg-cold',
              )}
              style={{ width: `${Math.max(entry.count ? 4 : 0, (entry.value / max) * 100)}%` }}
            />
          </span>
          <span className="t-num text-right text-[11px] text-fg-dim">
            {entry.count} · {money(entry.value)}
          </span>
        </button>
      ))}
    </div>
  )
}

export function TrendBars({
  trend,
}: {
  trend: { month: string; wonValue: number; wonDeals: number; targetValue: number }[]
}) {
  const max = Math.max(1, ...trend.flatMap((point) => [point.wonValue, point.targetValue]))
  return (
    <div className="grid h-44 grid-cols-6 items-end gap-3 border-b border-line pb-2">
      {trend.map((point) => (
        <div key={point.month} className="flex h-full min-w-0 flex-col justify-end gap-2">
          <div className="relative flex h-full items-end gap-1">
            <div
              className="w-full bg-cold/25"
              style={{ height: `${(point.targetValue / max) * 100}%` }}
              title={`Target ${money(point.targetValue)}`}
            />
            <div
              className="absolute inset-x-0 bottom-0 bg-cold"
              style={{ height: `${(point.wonValue / max) * 100}%` }}
              title={`Won ${money(point.wonValue)}`}
            />
          </div>
          <div className="text-center">
            <p className="font-mono text-[8px] uppercase text-fg-faint">
              {new Date(`${point.month}-01T12:00:00`).toLocaleDateString('en-US', {
                month: 'short',
              })}
            </p>
            <p className="t-num mt-0.5 text-[10px] text-fg-dim">{point.wonDeals}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="border border-dashed border-line px-4 py-8 text-center text-[12px] text-fg-faint">
      {children}
    </p>
  )
}

export function StatLine({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: ReactNode
  note?: string
  tone?: 'success' | 'warn' | 'danger' | 'cold'
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/60 py-2 last:border-0">
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">{label}</p>
        {note ? <p className="mt-0.5 text-[10px] text-fg-faint">{note}</p> : null}
      </div>
      <p
        className={cn(
          'shrink-0 text-right text-[12px]',
          tone === 'success'
            ? 'text-success'
            : tone === 'warn'
              ? 'text-warn'
              : tone === 'danger'
                ? 'text-danger'
                : tone === 'cold'
                  ? 'text-cold'
                  : 'text-fg',
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function QuoteBadge({ status }: { status: QuotationStatus }) {
  const labels: Record<QuotationStatus, string> = {
    draft: 'Draft',
    sent: 'Sent',
    accepted: 'Accepted',
    declined: 'Declined',
    'changes-requested': 'Changes requested',
    expired: 'Expired',
  }
  return <Badge tone={quoteTone(status)}>{labels[status]}</Badge>
}
