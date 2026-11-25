import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  type NotificationCategory,
  type NotificationFeed,
  type NotificationServerMessage,
  type NotificationView,
} from '@hvac/shared'
import { type IconName } from '@/components/icons'
import { useToast } from '@/components/ui'
import { adminApi } from '@/admin/api'

export const notificationCategoryIcon: Record<NotificationCategory, IconName> = {
  leads: 'airflow',
  customers: 'thermostat',
  invoices: 'coil',
  quotations: 'tag',
  jobs: 'wrench',
  expenses: 'refrigerant',
  reminders: 'calendar',
  marketing: 'mail',
  content: 'thermostat',
  support: 'shield',
  team: 'wrench',
  system: 'alert',
}

/** Preserve the original notification link while marking the source for Back. */
export function notificationDestination(link: string): string {
  const url = new URL(link, window.location.origin)
  url.searchParams.set('from', 'notifications')
  return `${url.pathname}${url.search}${url.hash}`
}

export const notificationCategoryTone: Record<
  NotificationCategory,
  'cold' | 'heat' | 'success' | 'warn' | 'danger' | 'neutral'
> = {
  leads: 'cold',
  customers: 'neutral',
  invoices: 'heat',
  quotations: 'cold',
  jobs: 'warn',
  expenses: 'heat',
  reminders: 'warn',
  marketing: 'cold',
  content: 'success',
  support: 'danger',
  team: 'neutral',
  system: 'neutral',
}

interface NotificationContextValue {
  feed: NotificationFeed | null
  notifications: NotificationView[]
  unread: number
  connected: boolean
  loading: boolean
  error: string
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

function emptyFeed(): NotificationFeed {
  return {
    data: [],
    unread: 0,
    byCategory: {
      leads: 0,
      customers: 0,
      invoices: 0,
      quotations: 0,
      jobs: 0,
      expenses: 0,
      reminders: 0,
      marketing: 0,
      content: 0,
      support: 0,
      team: 0,
      system: 0,
    },
    total: 0,
  }
}

function websocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/v1/notifications/socket`
}

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [feed, setFeed] = useState<NotificationFeed | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const socketRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<number | null>(null)
  const retryDelay = useRef(1000)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const next = await adminApi.notifications({ limit: 200 })
      if (!mountedRef.current) return
      setFeed(next)
      setError('')
    } catch (caught) {
      if (!mountedRef.current) return
      setError(caught instanceof Error ? caught.message : 'Could not load notifications.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const markRead = useCallback(async (id: string) => {
    setFeed((current) => {
      if (!current) return current
      const data = current.data.map((entry) => (entry.id === id ? { ...entry, read: true } : entry))
      return {
        ...current,
        data,
        unread: Math.max(
          0,
          current.unread - (current.data.some((entry) => entry.id === id && !entry.read) ? 1 : 0),
        ),
      }
    })
    try {
      await adminApi.markNotificationRead(id)
    } catch {
      // The socket/refresh will reconcile if the API rejected the read marker.
    }
  }, [])

  const markAllRead = useCallback(async () => {
    setFeed((current) => {
      if (!current) return current
      return {
        ...current,
        data: current.data.map((entry) => ({ ...entry, read: true })),
        unread: 0,
      }
    })
    try {
      const next = await adminApi.markAllNotificationsRead()
      setFeed(next)
    } catch {
      // Keep the optimistic state; a later refresh will correct it.
    }
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (!('WebSocket' in window)) {
      setConnected(false)
      return
    }
    socketRef.current?.close()
    const socket = new WebSocket(websocketUrl())
    socketRef.current = socket
    socket.onopen = () => {
      if (!mountedRef.current || socketRef.current !== socket) return
      retryDelay.current = 1000
      setConnected(true)
      setError('')
    }
    socket.onmessage = (event) => {
      if (!mountedRef.current || socketRef.current !== socket) return
      let message: NotificationServerMessage
      try {
        message = JSON.parse(event.data) as NotificationServerMessage
      } catch {
        return
      }
      if (message.type === 'notification:init') {
        setFeed(message.data)
        setLoading(false)
        return
      }
      if (message.type === 'notification:new') {
        const incoming = message.data
        setFeed((current) => {
          const base = current ?? emptyFeed()
          const exists = base.data.some((entry) => entry.id === incoming.id)
          return {
            ...base,
            data: exists
              ? base.data.map((entry) => (entry.id === incoming.id ? incoming : entry))
              : [incoming, ...base.data].slice(0, 200),
            unread: message.unread,
            total: base.total + (exists ? 0 : 1),
            byCategory: {
              ...base.byCategory,
              [incoming.category]: (base.byCategory[incoming.category] ?? 0) + (exists ? 0 : 1),
            },
          }
        })
        if (incoming.priority === 'urgent' || incoming.priority === 'high') {
          toast({
            title: incoming.title,
            description: incoming.message || 'Open the notification feed for details.',
            tone: incoming.priority === 'urgent' ? 'danger' : 'info',
          })
        }
        return
      }
      if (message.type === 'notification:update') {
        setFeed((current) => {
          if (!current) return current
          return {
            ...current,
            data: current.data.map((entry) =>
              entry.id === message.data.id ? { ...entry, read: message.data.read } : entry,
            ),
            unread: message.data.unread,
          }
        })
        return
      }
      if (message.type === 'notification:read-all') {
        setFeed((current) =>
          current
            ? {
                ...current,
                unread: message.data.unread,
                data: current.data.map((entry) => ({ ...entry, read: true })),
              }
            : current,
        )
      }
    }
    socket.onclose = () => {
      if (!mountedRef.current || socketRef.current !== socket) return
      setConnected(false)
      retryRef.current = window.setTimeout(() => {
        retryDelay.current = Math.min(20_000, retryDelay.current * 1.7)
        connect()
      }, retryDelay.current)
    }
    socket.onerror = () => {
      if (socketRef.current === socket) setConnected(false)
    }
  }, [toast])

  useEffect(() => {
    mountedRef.current = true
    void refresh()
    connect()
    const poll = window.setInterval(() => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        void refresh()
      }
    }, 30_000)
    const onVisible = () => {
      if (
        document.visibilityState === 'visible' &&
        socketRef.current?.readyState !== WebSocket.OPEN
      ) {
        void refresh()
        connect()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      mountedRef.current = false
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(poll)
      if (retryRef.current) window.clearTimeout(retryRef.current)
      socketRef.current?.close()
    }
  }, [connect, refresh])

  const value = useMemo<NotificationContextValue>(
    () => ({
      feed,
      notifications: feed?.data ?? [],
      unread: feed?.unread ?? 0,
      connected,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
    }),
    [connected, error, feed, loading, markAllRead, markRead, refresh],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useAdminNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useAdminNotifications must be used inside AdminNotificationProvider')
  }
  return context
}
