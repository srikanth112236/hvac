import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, EmptyState, useToast, type BadgeTone } from '@/components/ui'
import { adminApi, type AgendaItemDto, type AgendaKind, type AgendaMetaDto } from '@/admin/api'
import { Panel, formatDateTime, formatMoney } from '@/admin/ui'

/**
 * Desk-wide agenda. One queue for open tasks, unpaid invoices, lead follow-ups,
 * quotations waiting on the customer and renewals that are about to lapse.
 */
const kindMeta: Record<AgendaKind, { label: string; tone: BadgeTone }> = {
  task: { label: 'Task', tone: 'neutral' },
  payment: { label: 'Payment', tone: 'heat' },
  lead: { label: 'Lead', tone: 'cold' },
  quotation: { label: 'Quotation', tone: 'cold' },
  amc: { label: 'Renewal', tone: 'success' },
}

const filters: { value: 'all' | AgendaKind; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'payment', label: 'Payments' },
  { value: 'lead', label: 'Leads' },
  { value: 'task', label: 'Tasks' },
  { value: 'quotation', label: 'Quotations' },
  { value: 'amc', label: 'Renewals' },
]

const DAY = 86_400_000

function relative(dueAt: string | null): string {
  if (!dueAt) return 'No due date'
  const due = Date.parse(dueAt)
  if (!Number.isFinite(due)) return 'No due date'
  const diff = due - Date.now()
  if (diff < 0) {
    const days = Math.ceil(-diff / DAY)
    return days <= 1 ? 'Overdue' : `${days} days overdue`
  }
  const hours = Math.ceil(diff / 3_600_000)
  if (hours < 24) return `Due in ${hours}h`
  const days = Math.ceil(hours / 24)
  return days === 1 ? 'Due tomorrow' : `Due in ${days} days`
}

export function AdminAgenda() {
  const { toast } = useToast()
  const [items, setItems] = useState<AgendaItemDto[]>([])
  const [meta, setMeta] = useState<AgendaMetaDto | null>(null)
  const [filter, setFilter] = useState<'all' | AgendaKind>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const result = await adminApi.agenda()
      setItems(result.data)
      setMeta(result.meta)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The agenda could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  const visible = filter === 'all' ? items : items.filter((item) => item.kind === filter)
  const counts = meta?.counts

  return (
    <Panel
      title="Desk agenda"
      description="Payments, leads, follow-ups, quotations and renewals in one ordered queue."
      action={
        <Button
          variant="secondary"
          size="sm"
          icon="refresh"
          onClick={() => {
            void load()
            toast({ title: 'Agenda refreshed', tone: 'success' })
          }}
        >
          Refresh
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((entry) => {
          const count =
            entry.value === 'all'
              ? counts?.all
              : counts
                ? counts[entry.value as AgendaKind]
                : undefined
          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => setFilter(entry.value)}
              className={`flex h-8 items-center gap-2 border px-3 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors ${
                filter === entry.value
                  ? 'border-cold/60 bg-cold/10 text-cold'
                  : 'border-line text-fg-dim hover:border-cold/40 hover:text-fg'
              }`}
            >
              {entry.label}
              {typeof count === 'number' ? (
                <span className="text-fg-faint">{count}</span>
              ) : null}
            </button>
          )
        })}
        {counts && counts.overdue > 0 ? (
          <Badge tone="danger">{counts.overdue} overdue</Badge>
        ) : null}
        {counts && counts.today > 0 ? <Badge tone="warn">{counts.today} today</Badge> : null}
      </div>

      {error ? (
        <p className="mt-3 border border-danger/40 bg-danger/5 px-3 py-2 text-[11px] text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
          Loading the agenda…
        </p>
      ) : visible.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="Nothing waiting"
            description="No open payments, lead follow-ups, quotations or renewals in this filter."
          />
        </div>
      ) : (
        <ul className="mt-3 flex flex-col">
          {visible.map((item) => (
            <li key={item.id} className="border-t border-line first:border-t-0">
              <Link
                to={item.href}
                className="flex flex-wrap items-start justify-between gap-3 py-2.5 transition-colors hover:bg-panel-2/60"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 ${
                      item.overdue
                        ? 'bg-danger'
                        : item.priority === 'high'
                          ? 'bg-warn'
                          : 'bg-cold'
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-fg">{item.title}</p>
                    <p className="truncate text-[10px] text-fg-faint">{item.subtitle}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {item.amount !== null ? (
                    <span className="font-mono text-[10px] text-fg-dim">
                      {formatMoney(item.amount)}
                    </span>
                  ) : null}
                  <span
                    className={`font-mono text-[9px] uppercase tracking-[0.08em] ${
                      item.overdue ? 'text-danger' : 'text-fg-faint'
                    }`}
                    title={item.dueAt ? formatDateTime(item.dueAt) : undefined}
                  >
                    {relative(item.dueAt)}
                  </span>
                  <Badge tone={kindMeta[item.kind].tone}>{kindMeta[item.kind].label}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
