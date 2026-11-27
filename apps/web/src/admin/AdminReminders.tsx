import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  REMINDER_CATEGORY_VALUES,
  REMINDER_PRIORITY_VALUES,
  reminderCategoryLabel,
  reminderPriorityLabel,
  type AdminLead,
  type ReminderCategory,
  type ReminderPriority,
  type ReminderRecord,
} from '@hvac/shared'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { useRecordDeepLink } from '@/admin/useDeepLink'
import { Icon, type IconName } from '@/components/icons'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  RecordDrawer,
  RecordViewButton,
  SearchSuggest,
  Select,
  Textarea,
  useToast,
  type BadgeTone,
} from '@/components/ui'
import { adminApi } from '@/admin/api'
import { AdminAgenda } from '@/admin/AdminAgenda'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  Panel,
  formatDateTime,
  fromLocalInput,
  toLocalInput,
} from '@/admin/ui'

type StatusFilter = 'all' | 'attention' | 'overdue' | 'today' | 'upcoming' | 'later' | 'done'
type SortMode = 'smart' | 'due' | 'priority' | 'created'
type DueBucket = 'overdue' | 'today' | 'next7' | 'later' | 'done'

interface EditDraft {
  title: string
  body: string
  dueAt: string
  leadRef: string
  priority: ReminderPriority
  category: ReminderCategory
}

const DAY = 86_400_000

const priorityMeta: Record<
  ReminderPriority,
  { label: string; tone: BadgeTone; rank: number; bar: string; value: string }
> = {
  urgent: {
    label: 'Urgent',
    tone: 'danger',
    rank: 0,
    bar: 'bg-danger',
    value: 'text-danger',
  },
  high: {
    label: 'High',
    tone: 'warn',
    rank: 1,
    bar: 'bg-warn',
    value: 'text-warn',
  },
  normal: {
    label: 'Normal',
    tone: 'cold',
    rank: 2,
    bar: 'bg-cold',
    value: 'text-cold',
  },
  low: {
    label: 'Low',
    tone: 'neutral',
    rank: 3,
    bar: 'bg-fg-faint',
    value: 'text-fg-dim',
  },
}

const statusTabs: {
  value: StatusFilter
  label: string
  tone: BadgeTone
  hint: string
}[] = [
  { value: 'all', label: 'All', tone: 'neutral', hint: 'Every reminder' },
  { value: 'attention', label: 'Needs attention', tone: 'danger', hint: 'Overdue or urgent' },
  { value: 'overdue', label: 'Overdue', tone: 'heat', hint: 'Past the due time' },
  { value: 'today', label: 'Due today', tone: 'warn', hint: 'Before midnight' },
  { value: 'upcoming', label: 'Upcoming', tone: 'cold', hint: 'Open and scheduled' },
  { value: 'later', label: 'Later', tone: 'neutral', hint: 'Beyond seven days' },
  { value: 'done', label: 'Completed', tone: 'success', hint: 'Locked audit records' },
]

const categoryMeta: Record<ReminderCategory, { icon: IconName; tone: BadgeTone; action: string }> =
  {
    'follow-up': { icon: 'phone', tone: 'cold', action: 'Call / follow up' },
    payment: { icon: 'coil', tone: 'heat', action: 'Collect payment' },
    maintenance: { icon: 'wrench', tone: 'cold', action: 'Service due' },
    quotation: { icon: 'tag', tone: 'cold', action: 'Chase quotation' },
    'site-visit': { icon: 'calendar', tone: 'warn', action: 'Attend site' },
    parts: { icon: 'compressor', tone: 'warn', action: 'Supply parts' },
    renewal: { icon: 'refresh', tone: 'success', action: 'Renew contract' },
    other: { icon: 'clock', tone: 'neutral', action: 'General task' },
  }

const categoryOptions = REMINDER_CATEGORY_VALUES.map((value) => ({
  value,
  label: reminderCategoryLabel[value],
}))

const sortOptions: { value: SortMode; label: string }[] = [
  { value: 'smart', label: 'Smart priority' },
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Newest created' },
]

function blankEditDraft(): EditDraft {
  return {
    title: '',
    body: '',
    dueAt: '',
    leadRef: '',
    priority: 'normal',
    category: 'other',
  }
}

function priorityOf(reminder: ReminderRecord): ReminderPriority {
  if (reminder.priority) return reminder.priority
  if (dueBucket(reminder) === 'overdue') return 'high'
  if (reminder.invoiceRef) return 'high'
  return 'normal'
}

function categoryOf(reminder: ReminderRecord): ReminderCategory {
  if (reminder.category) return reminder.category
  if (reminder.invoiceRef) return 'payment'
  if (reminder.leadRef) return 'follow-up'
  return 'other'
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dueBucket(reminder: ReminderRecord, now = Date.now()): DueBucket {
  if (reminder.status === 'done') return 'done'
  const due = Date.parse(reminder.dueAt)
  if (!Number.isFinite(due)) return 'later'
  if (due < now) return 'overdue'
  if (sameDay(new Date(due), new Date(now))) return 'today'
  if (due - now <= 7 * DAY) return 'next7'
  return 'later'
}

function isAttention(reminder: ReminderRecord): boolean {
  if (reminder.status !== 'open') return false
  return dueBucket(reminder) === 'overdue' || priorityOf(reminder) === 'urgent'
}

function shortDuration(milliseconds: number): string {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.ceil(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.ceil(hours / 24)
  return `${days}d`
}

function relativeDue(reminder: ReminderRecord): string {
  if (reminder.status === 'done') {
    return reminder.completedAt ? `Completed ${formatDateTime(reminder.completedAt)}` : 'Completed'
  }
  const due = Date.parse(reminder.dueAt)
  if (!Number.isFinite(due)) return 'No due date'
  const diff = due - Date.now()
  if (diff < 0) return `${shortDuration(-diff)} overdue`
  return `in ${shortDuration(diff)}`
}

function formatLocalPreset(date: Date): string {
  return toLocalInput(date.toISOString())
}

function presetTomorrow(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return formatLocalPreset(date)
}

function presetNextWeek(): string {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  date.setHours(9, 0, 0, 0)
  return formatLocalPreset(date)
}

function SummaryCard({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: number
  note: string
  tone: 'cold' | 'heat' | 'success' | 'warn' | 'danger'
}) {
  const toneClass =
    tone === 'heat'
      ? 'text-heat'
      : tone === 'success'
        ? 'text-success'
        : tone === 'warn'
          ? 'text-warn'
          : tone === 'danger'
            ? 'text-danger'
            : 'text-cold'
  return (
    <div className="relative overflow-hidden border border-line bg-panel/40 p-4">
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-px ${
          tone === 'heat'
            ? 'bg-heat/70'
            : tone === 'success'
              ? 'bg-success/70'
              : tone === 'warn'
                ? 'bg-warn/70'
                : tone === 'danger'
                  ? 'bg-danger/70'
                  : 'bg-cold/70'
        }`}
      />
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
        {label}
      </span>
      <p className={`t-metric mt-3 ${toneClass}`}>{value}</p>
      <p className="mt-2 text-[10px] leading-snug text-fg-faint">{note}</p>
    </div>
  )
}

function ReminderSection({
  title,
  note,
  tone,
  count,
  children,
}: {
  title: string
  note: string
  tone: 'danger' | 'heat' | 'warn' | 'cold' | 'neutral' | 'success'
  count: number
  children: ReactNode
}) {
  const line =
    tone === 'danger'
      ? 'bg-danger/50'
      : tone === 'heat'
        ? 'bg-heat/50'
        : tone === 'warn'
          ? 'bg-warn/40'
          : tone === 'cold'
            ? 'bg-cold/35'
            : tone === 'success'
              ? 'bg-success/35'
              : 'bg-line'
  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${line}`} />
          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-dim">
              {title}
            </h2>
            <p className="mt-0.5 text-[10px] text-fg-faint">{note}</p>
          </div>
        </div>
        <Badge tone={tone === 'neutral' ? 'neutral' : tone}>{count}</Badge>
      </header>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  )
}

export function AdminReminders() {
  const { toast } = useToast()
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [leads, setLeads] = useState<AdminLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [leadRef, setLeadRef] = useState('')
  const [priority, setPriority] = useState<ReminderPriority>('normal')
  const [category, setCategory] = useState<ReminderCategory>('other')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | ReminderPriority>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | ReminderCategory>('all')
  const [sort, setSort] = useState<SortMode>('smart')
  const [editing, setEditing] = useState<ReminderRecord | null>(null)
  const [viewing, setViewing] = useState<ReminderRecord | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft>(blankEditDraft)
  const [editingPending, setEditingPending] = useState(false)

  const load = async () => {
    try {
      const [reminderResult, leadResult] = await Promise.allSettled([
        adminApi.reminders(),
        adminApi.leads('?pageSize=100'),
      ])
      if (reminderResult.status === 'rejected') throw reminderResult.reason
      setReminders(reminderResult.value.data)
      if (leadResult.status === 'fulfilled') setLeads(leadResult.value.data)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load reminders.')
    } finally {
      setLoading(false)
    }
  }

  useLiveRefresh(load)

  const leadMap = useMemo(() => new Map(leads.map((lead) => [lead.ref, lead])), [leads])

  const counts = useMemo(() => {
    const open = reminders.filter((reminder) => reminder.status === 'open')
    return {
      all: reminders.length,
      open: open.length,
      attention: reminders.filter(isAttention).length,
      overdue: open.filter((reminder) => dueBucket(reminder) === 'overdue').length,
      today: open.filter((reminder) => dueBucket(reminder) === 'today').length,
      upcoming: open.filter((reminder) => dueBucket(reminder) === 'next7').length,
      later: open.filter((reminder) => dueBucket(reminder) === 'later').length,
      urgent: open.filter((reminder) => priorityOf(reminder) === 'urgent').length,
      high: open.filter((reminder) => priorityOf(reminder) === 'high').length,
      done: reminders.filter((reminder) => reminder.status === 'done').length,
    }
  }, [reminders])

  const statusCount = (value: StatusFilter): number => {
    if (value === 'all') return counts.all
    if (value === 'attention') return counts.attention
    if (value === 'overdue') return counts.overdue
    if (value === 'today') return counts.today
    if (value === 'upcoming') return counts.upcoming
    if (value === 'later') return counts.later
    return counts.done
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return reminders.filter((reminder) => {
      const bucket = dueBucket(reminder)
      const reminderPriority = priorityOf(reminder)
      const reminderCategory = categoryOf(reminder)
      if (statusFilter === 'attention' && !isAttention(reminder)) return false
      if (statusFilter === 'overdue' && bucket !== 'overdue') return false
      if (statusFilter === 'today' && bucket !== 'today') return false
      if (statusFilter === 'upcoming' && bucket !== 'next7') return false
      if (statusFilter === 'later' && bucket !== 'later') return false
      if (statusFilter === 'done' && bucket !== 'done') return false
      if (priorityFilter !== 'all' && reminderPriority !== priorityFilter) return false
      if (categoryFilter !== 'all' && reminderCategory !== categoryFilter) return false
      if (!needle) return true
      const lead = reminder.leadRef ? leadMap.get(reminder.leadRef) : null
      return [
        reminder.title,
        reminder.body,
        reminder.leadRef,
        reminder.invoiceRef,
        lead?.name,
        lead?.phone,
        lead?.email,
        lead?.serviceName,
        reminderPriorityLabel[reminderPriority],
        reminderCategoryLabel[reminderCategory],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [reminders, query, statusFilter, priorityFilter, categoryFilter, leadMap])

  const suggestions = useMemo(
    () =>
      reminders.map((reminder) => {
        const lead = reminder.leadRef ? leadMap.get(reminder.leadRef) : null
        return {
          id: reminder.id,
          label: reminder.title,
          value: reminder.title,
          description: [
            reminder.leadRef ? (lead?.name ?? reminder.leadRef) : null,
            reminder.invoiceRef,
            reminderCategoryLabel[categoryOf(reminder)],
          ]
            .filter(Boolean)
            .join(' · '),
          meta: priorityMeta[priorityOf(reminder)].label,
          keywords: `${reminder.body} ${lead?.phone ?? ''} ${lead?.email ?? ''}`,
        }
      }),
    [reminders, leadMap],
  )

  useRecordDeepLink({
    param: 'open',
    records: reminders,
    resolve: (value) => reminders.find((reminder) => reminder.id === value),
    onOpen: setViewing,
  })

  const sorted = useMemo(() => {
    const byDue = (a: ReminderRecord, b: ReminderRecord) =>
      Date.parse(a.dueAt) - Date.parse(b.dueAt)
    const byPriority = (a: ReminderRecord, b: ReminderRecord) =>
      priorityMeta[priorityOf(a)].rank - priorityMeta[priorityOf(b)].rank
    return [...filtered].sort((a, b) => {
      if (sort === 'created') return Date.parse(b.createdAt) - Date.parse(a.createdAt)
      if (sort === 'due') return byDue(a, b)
      if (sort === 'priority') return byPriority(a, b) || byDue(a, b)
      const done = Number(a.status === 'done') - Number(b.status === 'done')
      if (done !== 0) return done
      const overdue = Number(dueBucket(b) === 'overdue') - Number(dueBucket(a) === 'overdue')
      if (overdue !== 0) return overdue
      return byPriority(a, b) || byDue(a, b)
    })
  }, [filtered, sort])

  const groups = useMemo(() => {
    const done = sorted.filter((reminder) => reminder.status === 'done')
    const open = sorted.filter((reminder) => reminder.status === 'open')
    const attention: ReminderRecord[] = []
    const today: ReminderRecord[] = []
    const next7: ReminderRecord[] = []
    const later: ReminderRecord[] = []
    for (const reminder of open) {
      if (isAttention(reminder)) {
        attention.push(reminder)
        continue
      }
      const bucket = dueBucket(reminder)
      if (bucket === 'today') today.push(reminder)
      else if (bucket === 'next7') next7.push(reminder)
      else later.push(reminder)
    }
    return { attention, today, next7, later, done }
  }, [sorted])

  const hasActiveFilters =
    Boolean(query.trim()) ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    categoryFilter !== 'all'

  const resetFilters = () => {
    setQuery('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setCategoryFilter('all')
    setSort('smart')
  }

  const replace = (updated: ReminderRecord) => {
    setReminders((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)))
  }

  const create = async () => {
    if (title.trim().length < 2 || !dueAt) return
    setPending(true)
    setError('')
    try {
      const reminder = await adminApi.createReminder({
        title,
        body,
        dueAt: fromLocalInput(dueAt) ?? dueAt,
        leadRef: leadRef || null,
        priority,
        category,
      })
      setReminders((current) => [reminder, ...current])
      setTitle('')
      setBody('')
      setDueAt('')
      setLeadRef('')
      setPriority('normal')
      setCategory('other')
      toast({
        title: `${reminderPriorityLabel[priorityOf(reminder)]} reminder set`,
        description: reminder.title,
        tone: priorityOf(reminder) === 'urgent' ? 'warn' : 'success',
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the reminder.')
    } finally {
      setPending(false)
    }
  }

  const setStatus = async (reminder: ReminderRecord) => {
    if (reminder.status === 'done') return
    try {
      const updated = await adminApi.patchReminder(reminder.id, { status: 'done' })
      replace(updated)
      toast({
        title: 'Reminder completed and locked',
        description:
          'Completed reminders are read-only audit records. Create a new reminder for further follow-up.',
        tone: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Reminder not updated',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const snooze = async (reminder: ReminderRecord, minutes: number) => {
    if (reminder.status === 'done') return
    const base = Math.max(Date.now(), Date.parse(reminder.dueAt) || Date.now())
    try {
      const updated = await adminApi.patchReminder(reminder.id, {
        dueAt: new Date(base + minutes * 60_000).toISOString(),
        status: 'open',
      })
      replace(updated)
      toast({
        title: 'Reminder snoozed',
        description: `${reminder.title} is now due ${formatDateTime(updated.dueAt)}.`,
        tone: 'info',
      })
    } catch (caught) {
      toast({
        title: 'Reminder not snoozed',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const openEdit = (reminder: ReminderRecord) => {
    if (reminder.status === 'done') {
      toast({
        title: 'Completed reminders are locked',
        description: 'Create a new reminder if another follow-up is needed.',
        tone: 'warn',
      })
      return
    }
    setEditing(reminder)
    setEditDraft({
      title: reminder.title,
      body: reminder.body,
      dueAt: toLocalInput(reminder.dueAt),
      leadRef: reminder.leadRef ?? '',
      priority: priorityOf(reminder),
      category: categoryOf(reminder),
    })
  }

  const saveEdit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!editing || editDraft.title.trim().length < 2 || !editDraft.dueAt) return
    if (editing.status === 'done') {
      setEditing(null)
      return
    }
    setEditingPending(true)
    try {
      const updated = await adminApi.patchReminder(editing.id, {
        title: editDraft.title,
        body: editDraft.body,
        dueAt: fromLocalInput(editDraft.dueAt) ?? editDraft.dueAt,
        leadRef: editDraft.leadRef || null,
        priority: editDraft.priority,
        category: editDraft.category,
      })
      replace(updated)
      setEditing(null)
      toast({ title: 'Reminder updated', tone: 'success' })
    } catch (caught) {
      toast({
        title: 'Reminder not updated',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setEditingPending(false)
    }
  }

  const remove = async (reminder: ReminderRecord) => {
    if (reminder.status === 'done') {
      toast({
        title: 'Completed reminders cannot be deleted',
        description: 'They remain in the audit trail. Create a new reminder if needed.',
        tone: 'warn',
      })
      return
    }
    if (!window.confirm(`Delete "${reminder.title}"?`)) return
    try {
      await adminApi.deleteReminder(reminder.id)
      setReminders((current) => current.filter((entry) => entry.id !== reminder.id))
      toast({ title: 'Reminder deleted', tone: 'success' })
    } catch (caught) {
      toast({
        title: 'Reminder not deleted',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const renderReminder = (reminder: ReminderRecord) => {
    const reminderPriority = priorityOf(reminder)
    const meta = priorityMeta[reminderPriority]
    const reminderCategory = categoryOf(reminder)
    const lead = reminder.leadRef ? leadMap.get(reminder.leadRef) : null
    const bucket = dueBucket(reminder)
    const done = reminder.status === 'done'
    const attention = isAttention(reminder)
    const action = categoryMeta[reminderCategory]
    const statusTone = done
      ? 'success'
      : bucket === 'overdue'
        ? 'danger'
        : bucket === 'today'
          ? 'warn'
          : bucket === 'next7'
            ? 'cold'
            : 'neutral'
    const statusLabel = done
      ? 'Locked'
      : bucket === 'overdue'
        ? 'Overdue'
        : bucket === 'today'
          ? 'Due today'
          : bucket === 'next7'
            ? 'Next 7 days'
            : 'Scheduled'
    return (
      <li
        key={reminder.id}
        className={`relative overflow-hidden border bg-panel/40 transition-colors ${
          done
            ? 'border-success/25 bg-success/[0.02]'
            : attention
              ? 'border-heat/35 hover:border-heat/60'
              : 'border-line hover:border-line-strong'
        }`}
      >
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-[3px] ${done ? 'bg-success/50' : meta.bar}`}
        />
        <div className="flex flex-col gap-3 p-4 pl-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone} dot>
                  {done ? <Icon name="lock" size={9} className="mr-1 inline" /> : null}
                  {statusLabel}
                </Badge>
                <Badge tone={meta.tone}>{meta.label} priority</Badge>
                <span className="inline-flex items-center gap-1 border border-line px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim">
                  <Icon name={action.icon} size={10} />
                  {action.action}
                </span>
                {reminder.invoiceRef ? (
                  <span className="border border-line px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-cold">
                    {reminder.invoiceRef}
                  </span>
                ) : null}
                {reminder.leadRef ? (
                  <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                    Lead {reminder.leadRef}
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-2 text-[14px] font-medium leading-snug ${
                  done ? 'text-fg-faint line-through' : 'text-fg'
                }`}
              >
                {reminder.title}
              </p>
              {reminder.body ? (
                <p className="mt-1 max-w-[80ch] text-[11px] leading-relaxed text-fg-dim">
                  {reminder.body}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1 text-right">
              <span
                className={`font-mono text-[9px] uppercase tracking-[0.08em] ${
                  done
                    ? 'text-success'
                    : bucket === 'overdue'
                      ? 'text-heat'
                      : bucket === 'today'
                        ? 'text-warn'
                        : 'text-fg-dim'
                }`}
              >
                {done ? 'Completed' : 'Due'}
              </span>
              {done ? null : <span className="text-[11px] text-fg">{relativeDue(reminder)}</span>}
              {done ? (
                <span className="font-mono text-[9px] text-fg-faint">
                  {reminder.completedAt ? formatDateTime(reminder.completedAt) : 'Locked'}
                </span>
              ) : (
                <span className="font-mono text-[9px] text-fg-faint">
                  {formatDateTime(reminder.dueAt)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-fg-faint">
              {lead ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <Icon name="phone" size={10} />
                    {lead.phone}
                  </span>
                  <span className="truncate">{lead.name}</span>
                  {lead.serviceName ? <span className="truncate">{lead.serviceName}</span> : null}
                </>
              ) : reminder.leadRef ? (
                <span>Lead {reminder.leadRef}</span>
              ) : (
                <span>No lead linked</span>
              )}
              {reminder.invoiceRef ? <span>Payment reminder</span> : null}
              {done ? (
                <span className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.08em] text-success">
                  <Icon name="lock" size={10} /> Locked audit record · read-only
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {done ? (
                <>
                  <span className="inline-flex h-8 items-center gap-1.5 border border-success/30 bg-success/[0.05] px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-success">
                    <Icon name="lock" size={10} /> Read-only
                  </span>
                  <RecordViewButton
                    label={`reminder ${reminder.title}`}
                    onClick={() => setViewing(reminder)}
                  />
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void setStatus(reminder)}
                    className="flex h-8 items-center gap-1.5 border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim hover:border-success/50 hover:text-success"
                  >
                    <Icon name="check" size={11} /> Complete
                  </button>
                  <Select
                    aria-label={`Snooze ${reminder.title}`}
                    value=""
                    placeholder="Snooze"
                    containerClassName="w-24"
                    className="h-8 px-2 text-[8px]"
                    onChange={(event) => {
                      const minutes = Number(event.target.value)
                      if (minutes) void snooze(reminder, minutes)
                    }}
                    options={[
                      { value: '60', label: '1 hour' },
                      { value: '1440', label: '1 day' },
                      { value: '4320', label: '3 days' },
                      { value: '10080', label: '1 week' },
                    ]}
                  />
                  <button
                    type="button"
                    onClick={() => openEdit(reminder)}
                    className="flex h-8 items-center border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim hover:border-cold/50 hover:text-cold"
                  >
                    Edit
                  </button>
                  <RecordViewButton
                    label={`reminder ${reminder.title}`}
                    onClick={() => setViewing(reminder)}
                  />
                  <button
                    type="button"
                    onClick={() => void remove(reminder)}
                    aria-label={`Delete reminder ${reminder.title}`}
                    className="flex h-8 w-8 items-center justify-center border border-line text-fg-faint hover:border-danger/40 hover:text-danger"
                  >
                    <Icon name="close" size={11} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </li>
    )
  }

  const noResults = !loading && filtered.length === 0
  const totalVisible =
    groups.attention.length +
    groups.today.length +
    groups.next7.length +
    groups.later.length +
    groups.done.length

  return (
    <div className="flex flex-col gap-6 pb-16">
      <AdminPageHeader
        eyebrow="Follow-ups"
        title="Nothing falls between calls."
        description={`${counts.open} open reminder${counts.open === 1 ? '' : 's'} · ${counts.overdue} overdue · ${counts.urgent} urgent. The desk agenda above brings payments, leads, follow-ups, quotations and renewals into one queue; the task list below is the same record set with full controls.`}
        actions={
          <>
            <Button
              variant="secondary"
              icon="plus"
              onClick={() => document.getElementById('reminder-title')?.focus()}
            >
              New reminder
            </Button>
            <Button variant="secondary" icon="refresh" onClick={() => void load()}>
              Refresh
            </Button>
          </>
        }
      />

      <AdminAgenda />

      {error ? <InlineError message={error} /> : null}

      <div className="flex items-start gap-3 border border-warn/30 bg-warn/[0.04] p-3">
        <Icon name="lock" size={14} className="mt-0.5 shrink-0 text-warn" />
        <p className="text-[11px] leading-relaxed text-fg-dim">
          <strong className="text-fg">Completion is final.</strong> Once a reminder is completed it
          becomes a read-only audit record and cannot be edited, reopened, snoozed or deleted.
          Create a new reminder for any further follow-up.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <SummaryCard
          label="Open"
          value={counts.open}
          note="Leads, invoices and manual follow-ups"
          tone="cold"
        />
        <SummaryCard
          label="Overdue"
          value={counts.overdue}
          note="Past due and still open"
          tone="heat"
        />
        <SummaryCard
          label="Due today"
          value={counts.today}
          note="Before the day closes"
          tone="warn"
        />
        <SummaryCard
          label="Urgent"
          value={counts.urgent}
          note={`${counts.high} high priority beside them`}
          tone="danger"
        />
        <SummaryCard
          label="Completed"
          value={counts.done}
          note="Locked audit records"
          tone="success"
        />
      </div>

      <div
        role="tablist"
        aria-label="Reminder status"
        className="flex gap-1 overflow-x-auto border border-line bg-panel/30 p-1"
      >
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === tab.value}
            title={tab.hint}
            onClick={() => setStatusFilter(tab.value)}
            className={`flex shrink-0 items-center gap-2 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors ${
              statusFilter === tab.value
                ? 'bg-cold/[0.08] text-cold'
                : 'text-fg-faint hover:bg-panel/60 hover:text-fg'
            }`}
          >
            {tab.label}
            <span
              className={`min-w-5 border px-1 py-0.5 text-center text-[8px] ${
                statusFilter === tab.value
                  ? 'border-cold/30 text-cold'
                  : 'border-line text-fg-faint'
              }`}
            >
              {statusCount(tab.value)}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 border border-line bg-panel/30 p-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_170px]">
              <SearchSuggest
                label="Search"
                value={query}
                onChange={setQuery}
                suggestions={suggestions}
                onSelect={(suggestion) => {
                  setQuery(suggestion.label)
                  const reminder = reminders.find((entry) => entry.id === suggestion.id)
                  if (reminder) setViewing(reminder)
                }}
                placeholder="Title, note, lead, invoice, action"
                emptyMessage="No reminder matches that title or linked record."
              />
              <Select
                label="Priority"
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value as 'all' | ReminderPriority)
                }
                options={[
                  { value: 'all', label: 'All priorities' },
                  ...REMINDER_PRIORITY_VALUES.map((value) => ({
                    value,
                    label: reminderPriorityLabel[value],
                  })),
                ]}
              />
              <Select
                label="Action type"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as 'all' | ReminderCategory)
                }
                options={[{ value: 'all', label: 'All action types' }, ...categoryOptions]}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{filtered.length} matching</Badge>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="font-mono text-[9px] uppercase tracking-[0.08em] text-cold hover:text-fg"
                  >
                    Reset filters
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  Sort
                </span>
                <Select
                  aria-label="Sort reminders"
                  className="h-8 w-40"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  options={sortOptions}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-7">
            {loading ? (
              <AdminLoading rows={5} />
            ) : noResults ? (
              <EmptyState
                icon="filter"
                title="No reminders match this view."
                description={
                  hasActiveFilters
                    ? 'Clear the filters or search a different lead, invoice or category.'
                    : 'Set a follow-up on a lead or add a standalone reminder for a renewal, part or site visit.'
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="secondary" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                {groups.attention.length ? (
                  <ReminderSection
                    title="Overdue & urgent"
                    note="The calls that need a decision first"
                    tone="danger"
                    count={groups.attention.length}
                  >
                    {groups.attention.map(renderReminder)}
                  </ReminderSection>
                ) : null}
                {groups.today.length ? (
                  <ReminderSection
                    title="Due today"
                    note="Still open before midnight"
                    tone="warn"
                    count={groups.today.length}
                  >
                    {groups.today.map(renderReminder)}
                  </ReminderSection>
                ) : null}
                {groups.next7.length ? (
                  <ReminderSection
                    title="Next 7 days"
                    note="Planned follow-ups and renewals"
                    tone="cold"
                    count={groups.next7.length}
                  >
                    {groups.next7.map(renderReminder)}
                  </ReminderSection>
                ) : null}
                {groups.later.length ? (
                  <ReminderSection
                    title="Later"
                    note="Scheduled beyond the next week"
                    tone="neutral"
                    count={groups.later.length}
                  >
                    {groups.later.map(renderReminder)}
                  </ReminderSection>
                ) : null}
                {groups.done.length ? (
                  <ReminderSection
                    title="Completed"
                    note="Locked read-only audit records"
                    tone="success"
                    count={groups.done.length}
                  >
                    {groups.done.map(renderReminder)}
                  </ReminderSection>
                ) : null}
                {!totalVisible ? (
                  <EmptyState
                    icon="filter"
                    title="No reminders in this view."
                    description="Try another status or clear the filters."
                    action={
                      <Button variant="secondary" onClick={resetFilters}>
                        Clear filters
                      </Button>
                    }
                  />
                ) : null}
              </>
            )}
          </div>
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <Panel title="Create reminder">
            <div className="flex flex-col gap-3">
              <p className="-mt-1 text-[11px] leading-relaxed text-fg-faint">
                Link a lead for context, choose the urgency, then set the exact follow-up time.
              </p>
              <Input
                id="reminder-title"
                label="Title"
                value={title}
                required
                placeholder="Call back about chiller quote"
                onChange={(event) => setTitle(event.target.value)}
              />
              <Input
                label="Due"
                type="datetime-local"
                value={dueAt}
                required
                onChange={(event) => setDueAt(event.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setDueAt(formatLocalPreset(new Date(Date.now() + 3_600_000)))}
                  className="border border-line px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint hover:border-cold/50 hover:text-cold"
                >
                  In 1 hour
                </button>
                <button
                  type="button"
                  onClick={() => setDueAt(presetTomorrow())}
                  className="border border-line px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint hover:border-cold/50 hover:text-cold"
                >
                  Tomorrow 9am
                </button>
                <button
                  type="button"
                  onClick={() => setDueAt(presetNextWeek())}
                  className="border border-line px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint hover:border-cold/50 hover:text-cold"
                >
                  Next week
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as ReminderPriority)}
                  options={REMINDER_PRIORITY_VALUES.map((value) => ({
                    value,
                    label: reminderPriorityLabel[value],
                  }))}
                />
                <Select
                  label="Action type"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as ReminderCategory)}
                  options={categoryOptions}
                />
              </div>
              <Select
                label="Linked lead"
                value={leadRef}
                placeholder="No lead"
                options={leads.map((lead) => ({
                  value: lead.ref,
                  label: `${lead.name} · ${lead.ref}`,
                }))}
                onChange={(event) => setLeadRef(event.target.value)}
              />
              <Textarea
                label="Notes"
                rows={3}
                value={body}
                placeholder="What needs to happen?"
                onChange={(event) => setBody(event.target.value)}
              />
              <Button
                onClick={() => void create()}
                disabled={pending || title.trim().length < 2 || !dueAt}
                full
                icon={pending ? 'clock' : 'plus'}
              >
                {pending ? 'Saving…' : 'Add reminder'}
              </Button>
            </div>
          </Panel>
        </aside>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit reminder"
        description="Change the details, urgency or linked lead without losing the reminder history."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveEdit()}
              disabled={editingPending || editDraft.title.trim().length < 2 || !editDraft.dueAt}
              icon={editingPending ? 'clock' : 'check'}
            >
              {editingPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        }
      >
        {editing ? (
          <form onSubmit={(event) => void saveEdit(event)} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Title"
                value={editDraft.title}
                required
                onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })}
              />
            </div>
            <Input
              label="Due"
              type="datetime-local"
              value={editDraft.dueAt}
              required
              onChange={(event) => setEditDraft({ ...editDraft, dueAt: event.target.value })}
            />
            <Select
              label="Priority"
              value={editDraft.priority}
              onChange={(event) =>
                setEditDraft({ ...editDraft, priority: event.target.value as ReminderPriority })
              }
              options={REMINDER_PRIORITY_VALUES.map((value) => ({
                value,
                label: reminderPriorityLabel[value],
              }))}
            />
            <Select
              label="Action type"
              value={editDraft.category}
              onChange={(event) =>
                setEditDraft({ ...editDraft, category: event.target.value as ReminderCategory })
              }
              options={categoryOptions}
            />
            <Select
              label="Linked lead"
              value={editDraft.leadRef}
              placeholder="No lead"
              options={leads.map((lead) => ({
                value: lead.ref,
                label: `${lead.name} · ${lead.ref}`,
              }))}
              onChange={(event) => setEditDraft({ ...editDraft, leadRef: event.target.value })}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Notes"
                rows={3}
                value={editDraft.body}
                onChange={(event) => setEditDraft({ ...editDraft, body: event.target.value })}
              />
            </div>
          </form>
        ) : null}
      </Modal>

      <RecordDrawer
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? 'Reminder'}
        subtitle={viewing?.leadRef ? `Lead ${viewing.leadRef}` : 'Standalone reminder'}
        record={
          viewing
            ? {
                title: viewing.title,
                notes: viewing.body,
                due: formatDateTime(viewing.dueAt),
                status: viewing.status === 'done' ? 'Completed · locked' : 'Open',
                priority: reminderPriorityLabel[priorityOf(viewing)],
                actionType: reminderCategoryLabel[categoryOf(viewing)],
                linkedLead: viewing.leadRef,
                linkedInvoice: viewing.invoiceRef,
                createdAt: viewing.createdAt,
                completedAt: viewing.completedAt,
              }
            : null
        }
        badge={
          viewing ? (
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone={priorityMeta[viewing.priority ?? 'normal'].tone} dot>
                {priorityMeta[viewing.priority ?? 'normal'].label} priority
              </Badge>
              {viewing.status === 'done' ? (
                <Badge tone="success" dot>
                  Completed · locked
                </Badge>
              ) : null}
            </span>
          ) : undefined
        }
        actions={
          viewing && viewing.status !== 'done' ? (
            <Button
              variant="secondary"
              onClick={() => {
                openEdit(viewing)
                setViewing(null)
              }}
            >
              Edit reminder
            </Button>
          ) : viewing ? (
            <span className="inline-flex h-9 items-center gap-1.5 border border-success/30 bg-success/[0.05] px-3 font-mono text-[8px] uppercase tracking-[0.08em] text-success">
              <Icon name="lock" size={10} /> Locked
            </span>
          ) : undefined
        }
      />
    </div>
  )
}
