import type { ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Button } from './Button'
import { Badge } from './Data'
import { Drawer } from './Overlay'

const BLOCKED_KEYS = /(password|secret|token|authorization|cookie|session|hash|salt|credential)/i

function humanize(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?/.test(value)
}

function isMoneyKey(key: string): boolean {
  return /(amount|total|subtotal|balance|price|unitprice|salary|payroll|cost|saved|discount|taxable|cgst|sgst|igst|^paid$|outstanding)/i.test(
    key,
  )
}

function isPercentKey(key: string): boolean {
  return /percent|percentage/i.test(key)
}

function isDateKey(key: string): boolean {
  return /(at|date|due|start|end|expires|created|updated|scheduled|published|joined|received)/i.test(
    key,
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const hasTime = /T\d{2}:\d{2}/.test(value)
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(hasTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

function formatValue(key: string, value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-fg-faint">—</span>
  }
  if (typeof value === 'boolean') {
    return <Badge tone={value ? 'success' : 'neutral'}>{value ? 'Yes' : 'No'}</Badge>
  }
  if (typeof value === 'number') {
    if (isPercentKey(key)) return `${value}%`
    if (isMoneyKey(key)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(value)
    }
    return String(value)
  }
  if (typeof value === 'string') {
    if (isDateKey(key) || isIsoDate(value)) {
      const formatted = formatDate(value)
      if (formatted !== value) return formatted
    }
    return value
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-fg-faint">None</span>
    if (value.every((entry) => typeof entry === 'string' || typeof entry === 'number')) {
      return (
        <span className="flex flex-wrap gap-1">
          {value.map((entry, index) => (
            <span
              key={`${String(entry)}:${index}`}
              className="border border-line px-1.5 py-0.5 font-mono text-[9px] text-fg-dim"
            >
              {String(entry)}
            </span>
          ))}
        </span>
      )
    }
    return (
      <div className="flex flex-col gap-2">
        {value.map((entry, index) => (
          <NestedRecord
            key={index}
            title={`Item ${index + 1}`}
            record={entry as Record<string, unknown>}
          />
        ))}
      </div>
    )
  }
  if (typeof value === 'object') {
    return <NestedRecord title={humanize(key)} record={value as Record<string, unknown>} />
  }
  return String(value)
}

function NestedRecord({ title, record }: { title: string; record: Record<string, unknown> }) {
  if (!record || typeof record !== 'object') return null
  const entries = Object.entries(record).filter(([key]) => !BLOCKED_KEYS.test(key) && key !== 'id')
  const label =
    (typeof record.ref === 'string' && record.ref) ||
    (typeof record.name === 'string' && record.name) ||
    (typeof record.title === 'string' && record.title) ||
    title
  return (
    <div className="border border-line bg-panel/40 p-3">
      <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">{label}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="min-w-0">
            <span className="block font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
              {humanize(key)}
            </span>
            <div className="mt-0.5 break-words text-[11px] leading-relaxed text-fg-dim">
              {formatValue(key, value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecordViewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${label}`}
      title={`View ${label}`}
      className="flex h-7 w-7 items-center justify-center border border-line text-fg-faint transition-colors duration-2 hover:border-cold/50 hover:text-cold"
    >
      <Icon name="eye" size={11} />
    </button>
  )
}

/**
 * One drawer shape for every record table: scan-friendly key/value details,
 * nested records rendered as compact cards and no hidden internals or secrets.
 */
export function RecordDrawer({
  open,
  onClose,
  onBack,
  title,
  subtitle,
  record,
  badge,
  actions,
  exclude = [],
}: {
  open: boolean
  onClose: () => void
  onBack?: () => void
  title: string
  subtitle?: string
  record: Record<string, unknown> | null
  badge?: ReactNode
  actions?: ReactNode
  exclude?: string[]
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const entries = Object.entries(record ?? {}).filter(
    ([key]) => key !== 'id' && !BLOCKED_KEYS.test(key) && !exclude.includes(key),
  )
  const scalarEntries = entries.filter(([, value]) => value === null || typeof value !== 'object')
  const nestedEntries = entries.filter(([, value]) => value !== null && typeof value === 'object')

  const cancel = () => {
    const next = new URLSearchParams(searchParams)
    for (const key of ['open', 'lead', 'version', 'user', 'member', 'payroll', 'from']) {
      next.delete(key)
    }
    if (next.toString() !== searchParams.toString()) {
      navigate({ pathname: location.pathname, search: next.toString() }, { replace: true })
    }
    onClose()
  }

  const back = () => {
    if (onBack) {
      onBack()
      return
    }
    if (searchParams.get('from') === 'notifications') {
      navigate('/admin/notifications')
      return
    }
    if (window.history.length > 1 && [...searchParams.keys()].length) {
      navigate(-1)
      return
    }
    cancel()
  }

  return (
    <Drawer
      open={open}
      onClose={cancel}
      onBack={back}
      backLabel="Back"
      title={title}
      description={subtitle}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
            Full record
          </span>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {actions}
            <Button variant="secondary" onClick={back} icon="chevron-left">
              Back
            </Button>
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      }
    >
      {!record ? (
        <p className="text-[12px] text-fg-faint">No record selected.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {badge ? <div>{badge}</div> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {scalarEntries.map(([key, value]) => (
              <div key={key} className="min-w-0 border-b border-line/60 pb-2">
                <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  {humanize(key)}
                </span>
                <div className="mt-1 break-words text-[12px] leading-relaxed text-fg">
                  {formatValue(key, value)}
                </div>
              </div>
            ))}
          </div>
          {nestedEntries.map(([key, value]) => (
            <section key={key}>
              <h3 className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim">
                {humanize(key)}
              </h3>
              <div className="text-[12px]">{formatValue(key, value)}</div>
            </section>
          ))}
        </div>
      )}
    </Drawer>
  )
}
