import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  notificationCategoryLabel,
  notificationPriorityLabel,
  type NotificationView,
} from '@hvac/shared'
import { Badge, Button } from '@/components/ui'
import { Icon } from '@/components/icons'
import { adminApi } from '@/admin/api'
import { AdminPageHeader, InlineError } from '@/admin/ui'
import {
  notificationCategoryIcon,
  notificationCategoryTone,
  notificationDestination,
  useAdminNotifications,
} from '@/admin/notifications'

const sourceLabel = {
  admin: 'Control room',
  portal: 'Customer portal',
  public: 'Public site',
  system: 'System',
} as const

/**
 * One notification, in full: what happened, who caused it, which record it
 * belongs to, and the raw metadata. The bell and the list both land here first,
 * then the record link takes you to the exact entity.
 */
export function AdminNotificationDetail() {
  const { notificationId = '' } = useParams()
  const navigate = useNavigate()
  const { notifications, markRead } = useAdminNotifications()
  const [record, setRecord] = useState<NotificationView | null>(null)
  const [error, setError] = useState('')
  const marked = useRef('')

  useEffect(() => {
    const local = notifications.find((entry) => entry.id === notificationId)
    if (local) {
      setRecord(local)
      setError('')
      return
    }
    let active = true
    adminApi
      .notification(notificationId)
      .then((next) => {
        if (active) setRecord(next)
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Notification not found.')
      })
    return () => {
      active = false
    }
  }, [notificationId, notifications])

  useEffect(() => {
    if (!notificationId || marked.current === notificationId) return
    marked.current = notificationId
    void markRead(notificationId)
  }, [markRead, notificationId])

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <AdminPageHeader eyebrow="Signal desk" title="Notification." />
        <InlineError message={error} />
        <Link
          to="/admin/notifications"
          className="inline-flex w-fit items-center gap-2 border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
        >
          <Icon name="arrow-right" size={12} className="rotate-180" /> All notifications
        </Link>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex flex-col gap-4">
        <AdminPageHeader eyebrow="Signal desk" title="Notification." />
        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">Loading record…</p>
      </div>
    )
  }

  const metadata = Object.entries(record.metadata ?? {})

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        eyebrow="Signal desk · detail"
        title={record.title}
        description={record.message || 'No message body was recorded for this event.'}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/notifications')}
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
            >
              <Icon name="arrow-right" size={12} className="rotate-180" /> All notifications
            </button>
            <Link
              to={notificationDestination(record.link)}
              className="flex h-9 items-center gap-2 border border-cold/50 bg-cold/[0.08] px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:bg-cold/[0.14]"
            >
              Open the record <Icon name="arrow-up-right" size={12} />
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="border border-line bg-panel/20">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center border border-line bg-base/40 text-fg-faint">
              <Icon name={notificationCategoryIcon[record.category]} size={15} />
            </span>
            <div className="min-w-0">
              <Badge tone={notificationCategoryTone[record.category]}>
                {notificationCategoryLabel[record.category]}
              </Badge>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                {record.type}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {record.priority === 'urgent' || record.priority === 'high' ? (
                <Badge tone="heat">{notificationPriorityLabel[record.priority]}</Badge>
              ) : null}
              <Badge tone={record.read ? 'neutral' : 'cold'}>{record.read ? 'Read' : 'Unread'}</Badge>
            </div>
          </div>

          <dl className="grid gap-0 sm:grid-cols-2">
            {[
              ['Occurred', new Date(record.createdAt).toLocaleString()],
              ['Source', sourceLabel[record.source] ?? record.source],
              ['Actor', record.actor || 'System'],
              ['Entity', record.entityLabel || record.entityType || '—'],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-line/60 px-4 py-3">
                <dt className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  {label}
                </dt>
                <dd className="mt-1 break-words text-[12px] text-fg-dim">{value}</dd>
              </div>
            ))}
          </dl>

          {record.message ? (
            <div className="px-4 py-4">
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Message</p>
              <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-fg">
                {record.message}
              </p>
            </div>
          ) : null}

          {metadata.length ? (
            <div className="border-t border-line px-4 py-4">
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                Record data
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <tbody>
                    {metadata.map(([key, value]) => (
                      <tr key={key} className="border-b border-line/40 last:border-b-0">
                        <td className="py-1.5 pr-4 font-mono text-[9px] uppercase tracking-[0.06em] text-fg-faint">
                          {key}
                        </td>
                        <td className="py-1.5 text-[11px] text-fg-dim">{String(value ?? '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="flex flex-col gap-3">
          <div className="border border-line bg-panel/20 p-4">
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
              Linked record
            </p>
            <p className="mt-1 text-[12px] text-fg">{record.entityLabel || 'No entity attached'}</p>
            <p className="mt-1 break-all font-mono text-[9px] text-fg-faint">{record.link}</p>
            <Link
              to={notificationDestination(record.link)}
              className="mt-3 flex items-center justify-between border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Open in admin <Icon name="arrow-up-right" size={11} />
            </Link>
          </div>
          <div className="border border-line bg-panel/20 p-4">
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
              Notification id
            </p>
            <p className="mt-1 break-all font-mono text-[9px] text-fg-dim">{record.id}</p>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon="check"
                disabled={record.read}
                onClick={() => {
                  void markRead(record.id)
                  setRecord({ ...record, read: true })
                }}
              >
                Mark read
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
