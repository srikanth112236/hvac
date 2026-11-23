import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Badge, Skeleton } from '@/components/ui'

export function formatMoney(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

/** Invoice-grade money: two decimal places for line rates and tax totals. */
export function formatMoneyExact(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    date,
  )
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function toLocalInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export const LEAD_STATUS_META: Record<
  string,
  { label: string; tone: 'neutral' | 'cold' | 'heat' | 'success' | 'warn' | 'danger' }
> = {
  new: { label: 'New', tone: 'cold' },
  contacted: { label: 'Contacted', tone: 'neutral' },
  'site-visit': { label: 'Site visit', tone: 'warn' },
  quoted: { label: 'Quoted', tone: 'heat' },
  won: { label: 'Won', tone: 'success' },
  lost: { label: 'Lost', tone: 'danger' },
}

export function StatusPill({ status }: { status: string }) {
  const meta = LEAD_STATUS_META[status] ?? { label: status, tone: 'neutral' as const }
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  )
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-cold">{eyebrow}</span>
        <h1 className="t-h2 mt-2 text-fg">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-fg-dim">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('border border-line bg-panel/50', className)}>
      {title || action ? (
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-dim">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function MetricCard({
  label,
  value,
  note,
  accent,
}: {
  label: string
  value: ReactNode
  note?: ReactNode
  accent?: 'cold' | 'heat' | 'success' | 'warn'
}) {
  const accentClass =
    accent === 'heat'
      ? 'text-heat'
      : accent === 'success'
        ? 'text-success'
        : accent === 'warn'
          ? 'text-warn'
          : 'text-cold'
  return (
    <div className="marks relative border border-line bg-panel/50 p-5">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">{label}</span>
      <p className={cn('t-num mt-4 text-h2 leading-none', accentClass)}>{value}</p>
      {note ? <div className="mt-3 text-[11px] leading-snug text-fg-faint">{note}</div> : null}
    </div>
  )
}

export function AdminLoading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading" role="status">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  )
}

export function InlineError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="border border-danger/40 bg-danger/[0.06] px-4 py-3 text-[12px] leading-relaxed text-fg-dim"
    >
      {message}
    </p>
  )
}

export function Unauthorised() {
  return (
    <div className="border border-line bg-panel/50 p-8 text-center">
      <p className="t-h4 text-fg">Session ended</p>
      <p className="mt-2 text-[13px] text-fg-dim">Sign in again to continue.</p>
    </div>
  )
}
