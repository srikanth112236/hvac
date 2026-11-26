import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge } from '@/components/ui'
import { notificationCategoryLabel, notificationPriorityLabel } from '@hvac/shared'
import {
  notificationCategoryIcon,
  notificationCategoryTone,
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

export function NotificationBell() {
  const navigate = useNavigate()
  const { notifications, unread, connected, loading, markRead } = useAdminNotifications()
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{
    left: number
    top?: number
    bottom?: number
    width: number
  } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const recent = notifications.slice(0, 6)

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const update = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(400, window.innerWidth - 16)
      const below = window.innerHeight - rect.bottom
      const above = below < 360 && rect.top > 380
      setPosition({
        left: Math.min(Math.max(8, rect.left), window.innerWidth - width - 8),
        ...(above ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        width,
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openNotification = (id: string) => {
    setOpen(false)
    void markRead(id)
    navigate(`/admin/notifications/${id}`)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className="relative flex w-full items-center gap-2 border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/40 hover:text-cold"
      >
        <Icon name="bell" size={13} />
        Notifications
        {unread ? (
          <span className="ml-auto flex min-w-5 items-center justify-center bg-heat px-1.5 py-0.5 font-mono text-[8px] text-[color:rgb(var(--base))]">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : (
          <span className="ml-auto h-1.5 w-1.5 bg-success" title={connected ? 'Live' : 'Polling'} />
        )}
      </button>

      {open && position
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: 'fixed',
                left: position.left,
                top: position.top,
                bottom: position.bottom,
                width: position.width,
                zIndex: 96,
              }}
              className="flex max-h-[min(620px,calc(100vh-24px))] flex-col overflow-hidden rounded-[var(--radius-control)] border border-line bg-panel shadow-pop"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-panel-2/70 px-4 py-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-dim">
                    Notifications
                  </p>
                  <p className="mt-0.5 text-[10px] text-fg-faint">
                    {unread ? `${unread} unread` : 'Everything is read'} ·{' '}
                    {connected ? 'Live socket' : 'Polling'}
                  </p>
                </div>
                <span
                  className={`h-2 w-2 rounded-full ${connected ? 'bg-success' : 'bg-warn'}`}
                  title={connected ? 'Real-time socket connected' : 'Reconnecting'}
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto" data-lenis-prevent>
                {loading && !notifications.length ? (
                  <p className="px-4 py-6 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                    Loading notifications
                  </p>
                ) : recent.length ? (
                  <ul className="divide-y divide-line/70">
                    {recent.map((notification) => (
                      <li key={notification.id}>
                        <button
                          type="button"
                          onClick={() => openNotification(notification.id)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-cold/[0.05] ${
                            notification.read ? '' : 'bg-cold/[0.025]'
                          }`}
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-base/40 text-fg-faint">
                            <Icon
                              name={notificationCategoryIcon[notification.category]}
                              size={13}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start gap-2">
                              <span className="min-w-0 flex-1 text-[12px] leading-snug text-fg">
                                {notification.title}
                              </span>
                              {notification.read ? null : (
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-heat" />
                              )}
                            </span>
                            {notification.message ? (
                              <span className="mt-1 line-clamp-2 block text-[10px] leading-relaxed text-fg-faint">
                                {notification.message}
                              </span>
                            ) : null}
                            <span className="mt-1.5 flex flex-wrap items-center gap-2">
                              <Badge tone={notificationCategoryTone[notification.category]}>
                                {notificationCategoryLabel[notification.category]}
                              </Badge>
                              <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
                                {relativeTime(notification.createdAt)}
                              </span>
                              {notification.priority === 'urgent' ||
                              notification.priority === 'high' ? (
                                <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-heat">
                                  {notificationPriorityLabel[notification.priority]}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-8">
                    <p className="text-[12px] text-fg-dim">No notifications yet.</p>
                    <p className="mt-1 text-[10px] text-fg-faint">
                      New leads, payments, support replies and content changes will appear here.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-base/40 px-4 py-3">
                <Link
                  to="/admin/notifications"
                  onClick={() => setOpen(false)}
                  className="font-mono text-[8px] uppercase tracking-[0.1em] text-cold hover:text-fg"
                >
                  View all notifications
                </Link>
                <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                  {notifications.length} recent
                </span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
