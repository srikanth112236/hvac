import { randomUUID } from 'node:crypto'
import type { Server as HttpServer } from 'node:http'
import type { Duplex } from 'node:stream'
import { Router } from 'express'
import { WebSocket, WebSocketServer } from 'ws'
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationClientMessage,
  type NotificationFeed,
  type NotificationPriority,
  type NotificationRecord,
  type NotificationServerMessage,
  type NotificationSource,
  type NotificationView,
} from '@hvac/shared'
import { allowedOrigins } from './config.js'
import {
  adminSessionFromCookie,
  requireAdmin,
  requireAdminMutation,
  type AdminSession,
} from './auth.js'
import { createStore } from './store.js'

const MAX_NOTIFICATIONS = 1000
const WS_PATH = '/api/v1/notifications/socket'
const notificationStore = createStore<NotificationRecord[]>('notifications.json', () => [])

interface NotificationInput {
  type: string
  category: NotificationCategory
  priority?: NotificationPriority
  title: string
  message: string
  link: string
  entityType?: string | null
  entityId?: string | null
  entityLabel?: string | null
  actor?: string | null
  source: NotificationSource
  metadata?: Record<string, string | number | boolean | null>
}

interface SocketClient {
  viewer: string
  email: string
  alive: boolean
}

const clients = new Map<WebSocket, SocketClient>()

function viewerKey(email: string): string {
  return email.trim().toLowerCase()
}

export function viewFor(notification: NotificationRecord, viewer: string): NotificationView {
  const { readBy, ...rest } = notification
  return { ...rest, read: readBy.includes(viewerKey(viewer)) }
}

function categoryCounts(records: NotificationRecord[]): Record<NotificationCategory, number> {
  const counts = Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((category) => [category, 0]),
  ) as Record<NotificationCategory, number>
  for (const record of records) counts[record.category] += 1
  return counts
}

export function feedFor(
  records: NotificationRecord[],
  viewer: string,
  options: {
    limit?: number
    category?: NotificationCategory | 'all'
    state?: 'all' | 'unread' | 'read'
    query?: string
  } = {},
): NotificationFeed {
  const key = viewerKey(viewer)
  const needle = options.query?.trim().toLowerCase() ?? ''
  const filtered = records.filter((record) => {
    if (options.category && options.category !== 'all' && record.category !== options.category)
      return false
    const read = record.readBy.includes(key)
    if (options.state === 'unread' && read) return false
    if (options.state === 'read' && !read) return false
    if (!needle) return true
    return `${record.title} ${record.message} ${record.entityLabel ?? ''} ${record.actor ?? ''}`
      .toLowerCase()
      .includes(needle)
  })
  return {
    data: filtered
      .slice(0, Math.max(1, Math.min(200, options.limit ?? 100)))
      .map((record) => viewFor(record, viewer)),
    unread: records.filter((record) => !record.readBy.includes(key)).length,
    total: records.length,
    byCategory: categoryCounts(records),
  }
}

export async function readAllNotifications(): Promise<NotificationRecord[]> {
  return notificationStore.read()
}

export async function readNotificationFeed(
  viewer: string,
  options: Parameters<typeof feedFor>[2] = {},
): Promise<NotificationFeed> {
  return feedFor(await notificationStore.read(), viewer, options)
}

function send(ws: WebSocket, message: NotificationServerMessage): void {
  if (ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify(message))
  } catch {
    // A dead socket is cleaned up by close/error or the heartbeat.
  }
}

async function sendInitialFeed(ws: WebSocket, viewer: string): Promise<void> {
  const feed = await readNotificationFeed(viewer, { limit: 200 })
  send(ws, { type: 'notification:init', data: feed })
}

async function broadcastNew(record: NotificationRecord): Promise<void> {
  if (!clients.size) return
  const records = await notificationStore.read()
  for (const [ws, client] of clients) {
    const unread = records.filter((entry) => !entry.readBy.includes(client.viewer)).length
    send(ws, { type: 'notification:new', data: viewFor(record, client.viewer), unread })
  }
}

async function broadcastRead(id: string): Promise<void> {
  if (!clients.size) return
  const records = await notificationStore.read()
  const record = records.find((entry) => entry.id === id)
  if (!record) return
  for (const [ws, client] of clients) {
    const unread = records.filter((entry) => !entry.readBy.includes(client.viewer)).length
    send(ws, {
      type: 'notification:update',
      data: { id, read: record.readBy.includes(client.viewer), unread },
    })
  }
}

async function broadcastReadAll(viewer: string): Promise<void> {
  const records = await notificationStore.read()
  for (const [ws, client] of clients) {
    if (client.viewer !== viewer) continue
    send(ws, { type: 'notification:read-all', data: { unread: 0 } })
  }
  // Keep the result used by callers explicit even when no socket is connected.
  void records
}

export async function createNotification(input: NotificationInput): Promise<NotificationRecord> {
  const record: NotificationRecord = {
    id: randomUUID(),
    type: input.type,
    category: input.category,
    priority: input.priority ?? 'normal',
    title: input.title,
    message: input.message,
    link: input.link,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    entityLabel: input.entityLabel ?? null,
    actor: input.actor ?? null,
    source: input.source,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
    readBy: [],
  }
  await notificationStore.mutate((records) => [record, ...records].slice(0, MAX_NOTIFICATIONS))
  await broadcastNew(record).catch((error) =>
    console.error('[hvac-api] notification broadcast failed', error),
  )
  return record
}

export async function markNotificationRead(
  id: string,
  viewer: string,
): Promise<NotificationView | null> {
  const key = viewerKey(viewer)
  let saved: NotificationRecord | null = null
  await notificationStore.mutate((records) =>
    records.map((record) => {
      if (record.id !== id) return record
      if (record.readBy.includes(key)) {
        saved = record
        return record
      }
      saved = { ...record, readBy: [...record.readBy, key] }
      return saved
    }),
  )
  if (!saved) return null
  await broadcastRead(id).catch(() => undefined)
  return viewFor(saved, viewer)
}

export async function markAllNotificationsRead(viewer: string): Promise<NotificationFeed> {
  const key = viewerKey(viewer)
  const records = await notificationStore.mutate((current) =>
    current.map((record) =>
      record.readBy.includes(key) ? record : { ...record, readBy: [...record.readBy, key] },
    ),
  )
  await broadcastReadAll(key).catch(() => undefined)
  return feedFor(records, viewer)
}

async function handleClientMessage(
  ws: WebSocket,
  client: SocketClient,
  raw: Buffer,
): Promise<void> {
  if (raw.byteLength > 10_000) {
    ws.close(1009, 'Message too large')
    return
  }
  try {
    const message = JSON.parse(raw.toString('utf8')) as NotificationClientMessage
    if (message.type === 'notification:read' && typeof message.id === 'string') {
      await markNotificationRead(message.id, client.viewer)
    } else if (message.type === 'notification:read-all') {
      await markAllNotificationsRead(client.viewer)
    } else if (message.type === 'notification:refresh') {
      const feed = await readNotificationFeed(client.viewer, { limit: 200 })
      send(ws, { type: 'notification:init', data: feed })
    } else if (message.type === 'notification:ping') {
      send(ws, { type: 'notification:pong', data: { at: new Date().toISOString() } })
    }
  } catch {
    send(ws, { type: 'notification:error', data: { message: 'Invalid notification message.' } })
  }
}

async function registerClient(ws: WebSocket, email: string): Promise<void> {
  const client: SocketClient = {
    viewer: viewerKey(email),
    email,
    alive: true,
  }
  clients.set(ws, client)
  ws.on('pong', () => {
    client.alive = true
  })
  ws.on('message', (data) => {
    const raw = Buffer.isBuffer(data) ? data : Buffer.from(String(data))
    void handleClientMessage(ws, client, raw)
  })
  ws.on('close', () => clients.delete(ws))
  ws.on('error', () => clients.delete(ws))
  await sendInitialFeed(ws, client.viewer)
}

export const notificationsRouter = Router()
notificationsRouter.use(requireAdmin, requireAdminMutation)

notificationsRouter.get('/notifications', async (req, res, next) => {
  try {
    const admin = res.locals.admin as AdminSession
    const category =
      typeof req.query.category === 'string' &&
      (NOTIFICATION_CATEGORIES as readonly string[]).includes(req.query.category)
        ? (req.query.category as NotificationCategory)
        : 'all'
    const rawState = typeof req.query.state === 'string' ? req.query.state : 'all'
    const state = rawState === 'unread' || rawState === 'read' ? rawState : 'all'
    const query = typeof req.query.q === 'string' ? req.query.q : ''
    const limit = Number.parseInt(String(req.query.limit ?? '100'), 10)
    res.set('Cache-Control', 'private, no-store')
    res.json({
      data: await readNotificationFeed(admin.email, {
        category,
        state,
        query,
        limit: Number.isFinite(limit) ? limit : 100,
      }),
    })
  } catch (error) {
    next(error)
  }
})

notificationsRouter.post('/notifications/read-all', async (_req, res, next) => {
  try {
    const admin = res.locals.admin as AdminSession
    res.json({ data: await markAllNotificationsRead(admin.email) })
  } catch (error) {
    next(error)
  }
})

notificationsRouter.post('/notifications/:id/read', async (req, res, next) => {
  try {
    const admin = res.locals.admin as AdminSession
    const updated = await markNotificationRead(req.params.id, admin.email)
    if (!updated) {
      res.status(404).json({ error: { code: 'not_found', message: 'Notification not found.' } })
      return
    }
    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

export function attachNotificationSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (request, socket: Duplex, head) => {
    let pathname = ''
    try {
      pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    } catch {
      socket.destroy()
      return
    }
    if (pathname !== WS_PATH) return

    const origin = request.headers.origin
    if (origin && !allowedOrigins.has(origin.replace(/\/+$/, ''))) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }

    void adminSessionFromCookie(request.headers.cookie)
      .then((session) => {
        if (!session) {
          socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
          socket.destroy()
          return
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          void registerClient(ws, session.email).catch((error) => {
            console.error('[hvac-api] notification socket failed', error)
            ws.close(1011, 'Notification feed unavailable')
          })
        })
      })
      .catch((error) => {
        console.error('[hvac-api] notification socket auth failed', error)
        socket.write('HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n')
        socket.destroy()
      })
  })

  const heartbeat = setInterval(() => {
    for (const [ws, client] of clients) {
      if (!client.alive) {
        ws.terminate()
        clients.delete(ws)
        continue
      }
      client.alive = false
      try {
        ws.ping()
      } catch {
        ws.terminate()
        clients.delete(ws)
      }
    }
  }, 30_000)
  heartbeat.unref()
}
