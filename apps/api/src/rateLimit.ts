import type { NextFunction, Request, Response } from 'express'
import { createStore } from './store.js'

/**
 * Small rate limiter for public endpoints. In a single-instance deployment the
 * counters live in memory. Set DATABASE_URL and the same counters are held in
 * the shared PostgreSQL JSON store, so every API instance enforces one budget.
 */
export interface RateLimitOptions {
  windowMs: number
  max: number
  scope: string
  message?: string
  skip?: (path: string) => boolean
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const sharedBuckets = process.env.DATABASE_URL
  ? createStore<Record<string, Bucket>>('rate-limits.json', () => ({}))
  : null
let lastPrune = Date.now()

function prune(now: number): void {
  if (now - lastPrune < 60_000) return
  lastPrune = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

function limited(res: Response, retryAfter: number, message?: string): void {
  res.set('Retry-After', String(retryAfter))
  res.status(429).json({
    error: {
      code: 'rate_limited',
      message: message ?? 'Too many requests from this address. Try again in a few minutes.',
    },
  })
}

export function rateLimit(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (options.skip?.(req.path)) {
      next()
      return
    }
    const now = Date.now()
    const key = `${options.scope}:${req.ip ?? 'local'}`

    if (sharedBuckets) {
      let bucket: Bucket
      try {
        const all = await sharedBuckets.mutate((current) => {
          const next: Record<string, Bucket> = {}
          for (const [entryKey, entry] of Object.entries(current)) {
            if (entry.resetAt > now) next[entryKey] = entry
          }
          const currentBucket = next[key]
          if (!currentBucket || currentBucket.resetAt <= now) {
            next[key] = { count: 1, resetAt: now + options.windowMs }
          } else {
            next[key] = { ...currentBucket, count: currentBucket.count + 1 }
          }
          return next
        })
        bucket = all[key] ?? { count: 1, resetAt: now + options.windowMs }
      } catch (error) {
        next(error)
        return
      }
      if (bucket.count > options.max) {
        limited(res, Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)), options.message)
        return
      }
      next()
      return
    }

    prune(now)
    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs })
      next()
      return
    }
    if (bucket.count >= options.max) {
      limited(res, Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)), options.message)
      return
    }
    bucket.count += 1
    next()
  }
}
