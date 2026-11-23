import type { Request } from 'express'

/**
 * Record-level optimistic concurrency. The record's `updatedAt` timestamp is
 * the version token. If-Match is optional for backwards compatibility, but when
 * supplied a stale version is rejected instead of silently overwriting a newer
 * edit.
 */
export function recordVersion(updatedAt: string): string {
  return `"${updatedAt}"`
}

export function ifMatchSatisfied(req: Request, updatedAt: string): boolean {
  const header = req.get('if-match')
  if (!header) return true
  const supplied = header
    .split(',')
    .map((value) => value.trim().replace(/^W\//, '').replace(/^"|"$/g, ''))
  return supplied.includes(updatedAt) || supplied.includes('*')
}
