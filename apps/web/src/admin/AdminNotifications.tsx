import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  NOTIFICATION_CATEGORIES,
  notificationCategoryLabel,
  notificationPriorityLabel,
  type NotificationCategory,
} from '@hvac/shared'
import { Icon } from '@/components/icons'
import {
  Badge,
  Button,
  EmptyState,
  SearchSuggest,
  Select,
  type SearchSuggestion,
} from '@/components/ui'
import { AdminPageHeader, MetricCard, Panel } from '@/admin/ui'
import {
  notificationCategoryIcon,
  notificationCategoryTone,
  notificationDestination,
  useAdminNotifications,
} from '@/admin/notifications'

function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso)
  if (!Number.isFinite(diff)) return ''
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

const sourceLabel = {
  admin: 'Control room',
  portal: 'Customer portal',
  public: 'Public site',
  system: 'System',
} as const

export function AdminNotifications() {
  const navigate = useNavigate()
  const { feed, notifications, unread, connected, loading, error, refresh, markRead, markAllRead } =
    useAdminNotifications()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<NotificationCategory | 'all'>('all')
  const [state, setState] = useState<'all' | 'unread' | 'read'>('all')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return notifications.filter((notification) => {
      if (category !== 'all' && notification.category !== category) return false
      if (state === 'unread' && notification.read) return false
      if (state === 'read' && !notification.read) return false
      if (!needle) return true
      return `${notification.title} ${notification.message} ${notification.entityLabel ?? ''} ${notification.actor ?? ''}`
        .toLowerCase()
        .includes(needle)
    })
  }, [category, notifications, query, state])

  const suggestions: SearchSuggestion[] = useMemo(
    () =>
      notifications.map((notification) => ({
        id: notification.id,
        label: notification.title,
        value: notification.title,
        description: notification.message,
        meta: notificationCategoryLabel[notification.category],
        keywords: `${notification.entityLabel ?? ''} ${notification.actor ?? ''} ${notification.source}`,
        icon: notificationCategoryIcon[notification.category],
      })),
    [notifications],
  )

  const open = (id: string, link: string) => {
    void markRead(id)
    navigate(notificationDestination(link))
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Signal desk · realtime"
        title="Notifications."
        description="Every meaningful action across leads, customers, billing, jobs, content and the customer portal. Click any entry to open the exact record."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon="refresh" onClick={() => void refresh()}>
              Refresh
            </Button>
            <Button
              variant="secondary"
              icon="check"
              disabled={!unread}
              onClick={() => void markAllRead()}
            >
              Mark all read
            </Button>
          </div>
        }
      />

      {error ? (
        <p className="border border-danger/40 bg-danger/[0.06] px-4 py-3 text-[11px] text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Unread" value={unread} note="Needs attention" accent="heat" />
        <MetricCard
          label="All notifications"
          value={feed?.total ?? notifications.length}
          note="Retained feed"
        />
        <MetricCard
          label="Leads"
          value={notifications.filter((entry) => entry.category === 'leads').length}
          note="New and updated enquiries"
          accent="cold"
        />
        <MetricCard
          label="Connection"
          value={connected ? 'Live' : 'Polling'}
          note="Server push channel"
          accent={connected ? 'success' : 'warn'}
        />
      </div>

      <Panel
        title="All activity"
        action={
          <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-success' : 'bg-warn'}`} />
            {connected ? 'Socket connected' : 'Reconnecting · polling fallback'}
          </span>
        }
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_150px]">
          <SearchSuggest
            aria-label="Search notifications"
            placeholder="Title, message, actor or record"
            value={query}
            onChange={setQuery}
            suggestions={suggestions}
            onSelect={(suggestion) => {
              const notification = notifications.find((entry) => entry.id === suggestion.id)
              if (notification) open(notification.id, notification.link)
            }}
            emptyMessage="No notification matches that search."
          />
          <Select
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value as NotificationCategory | 'all')}
            options={[
              { value: 'all', label: 'All categories' },
              ...NOTIFICATION_CATEGORIES.map((value) => ({
                value,
                label: notificationCategoryLabel[value],
              })),
            ]}
          />
          <Select
            label="Read state"
            value={state}
            onChange={(event) => setState(event.target.value as 'all' | 'unread' | 'read')}
            options={[
              { value: 'all', label: 'All states' },
              { value: 'unread', label: 'Unread' },
              { value: 'read', label: 'Read' },
            ]}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <Badge tone="neutral">{filtered.length} matching</Badge>
          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
            Click a row to open the exact record
          </span>
        </div>
      </Panel>

      {loading && !notifications.length ? (
        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
          Loading notifications
        </p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="bell"
          title={notifications.length ? 'No notifications in this view' : 'No notifications yet'}
          description="New leads, payments, support messages and content changes will appear here in real time."
        />
      ) : (
        <section className="divide-y divide-line border border-line bg-panel/20">
          {filtered.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => open(notification.id, notification.link)}
              className={`group flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-cold/[0.05] ${
                notification.read ? '' : 'bg-cold/[0.025]'
              }`}
            >
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-base/40 text-fg-faint group-hover:border-cold/40 group-hover:text-cold">
                <Icon name={notificationCategoryIcon[notification.category]} size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    {notification.read ? null : (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-heat" />
                    )}
                    <span className="truncate text-[13px] text-fg">{notification.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {notification.priority === 'urgent' || notification.priority === 'high' ? (
                      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-heat">
                        {notificationPriorityLabel[notification.priority]}
                      </span>
                    ) : null}
                    <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                      {relativeTime(notification.createdAt)}
                    </span>
                  </span>
                </span>
                {notification.message ? (
                  <span className="mt-1 block text-[11px] leading-relaxed text-fg-dim">
                    {notification.message}
                  </span>
                ) : null}
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={notificationCategoryTone[notification.category]}>
                    {notificationCategoryLabel[notification.category]}
                  </Badge>
                  <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
                    {sourceLabel[notification.source]}
                  </span>
                  {notification.actor ? (
                    <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
                      {notification.actor}
                    </span>
                  ) : null}
                  {notification.entityLabel ? (
                    <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
                      {notification.entityLabel}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="mt-1 flex shrink-0 items-center gap-2 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint group-hover:text-cold">
                Open
                <Icon name="arrow-right" size={11} />
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  )
}
