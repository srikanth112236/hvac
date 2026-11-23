import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { createStore } from './store.js'

export interface AuditEntry {
  id: string
  at: string
  actor: string | null
  method: string
  path: string
  status: number
  ip: string
}

const auditStore = createStore<AuditEntry[]>('audit-log.json', () => [])
const MAX_ENTRIES = 1000

/**
 * Record every admin mutation after the response is sent. Bodies are never
 * stored (they can contain customer PII or invoice lines); the method, route,
 * status and actor are enough to reconstruct who changed what and when.
 */
export function auditAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD') {
    next()
    return
  }
  res.on('finish', () => {
    const admin = res.locals.admin as { email?: string } | undefined
    const entry: AuditEntry = {
      id: randomUUID(),
      at: new Date().toISOString(),
      actor: admin?.email ?? null,
      method: req.method,
      path: req.originalUrl.split('?')[0] ?? req.path,
      status: res.statusCode,
      ip: req.ip ?? 'unknown',
    }
    void auditStore
      .mutate((entries) => [entry, ...entries].slice(0, MAX_ENTRIES))
      .catch((error) => console.error('[hvac-api] audit write failed', error))
  })
  next()
}

export async function readAuditLog(limit = 200): Promise<AuditEntry[]> {
  const entries = await auditStore.read()
  return entries.slice(0, Math.max(1, Math.min(1000, limit)))
}

export async function pruneAuditLog(days: number): Promise<number> {
  const cutoff = Date.now() - Math.max(1, days) * 86_400_000
  const entries = await auditStore.read()
  const next = entries.filter((entry) => Date.parse(entry.at) >= cutoff)
  if (next.length === entries.length) return 0
  await auditStore.write(next)
  return entries.length - next.length
}
