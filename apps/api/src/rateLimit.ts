import type { NextFunction, Request, Response } from 'express'

/**
 * Small in-memory rate limiter for public endpoints. Keyed by client IP (the
 * proxy-aware `req.ip`) and a scope, so one noisy form cannot exhaust another.
 * The counters reset on the window boundary and are pruned opportunistically.
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
let lastPrune = Date.now()

function prune(now: number): void {
  if (now - lastPrune < 60_000) return
  lastPrune = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (options.skip?.(req.path)) {
      next()
      return
    }
    const now = Date.now()
    prune(now)
    const key = `${options.scope}:${req.ip ?? 'local'}`
    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs })
      next()
      return
    }
    if (bucket.count >= options.max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
      res.set('Retry-After', String(retryAfter))
      res.status(429).json({
        error: {
          code: 'rate_limited',
          message:
            options.message ?? 'Too many requests from this address. Try again in a few minutes.',
        },
      })
      return
    }
    bucket.count += 1
    next()
  }
}
