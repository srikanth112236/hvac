import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { Router, type NextFunction, type Request, type Response } from 'express'
import { z } from 'zod'
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  IS_PROD,
  originAllowed,
} from './config.js'
import { createStore } from './store.js'

/**
 * Single-owner admin auth for the demo deployment.
 *
 * - Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD. Production refuses to
 *   start without them (see config.assertProductionConfig), so the development
 *   fallback can never protect a live site.
 * - Sessions are random 256-bit tokens held server-side and persisted, so a
 *   deploy or restart no longer signs the owner out on every request. They are
 *   delivered as an HttpOnly, SameSite=Strict cookie; no token reaches JS.
 * - Login attempts are rate-limited per IP; successful login resets the count.
 * - Admin mutations also require X-Admin-Request and an allowed Origin, which
 *   is CSRF defence in depth on top of SameSite.
 */
const COOKIE = 'hvac_admin_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000
const MAX_ATTEMPTS = 8
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000

if (!process.env.ADMIN_PASSWORD && !IS_PROD) {
  console.warn(
    '[hvac-api] Using development admin credentials. Set ADMIN_EMAIL and ADMIN_PASSWORD before deployment.',
  )
}

interface Session {
  email: string
  role: 'owner'
  expiresAt: number
}

const sessionStore = createStore<Record<string, Session>>('admin-sessions.json', () => ({}))
const attempts = new Map<string, { count: number; resetAt: number }>()
const accountAttempts = new Map<string, { count: number; resetAt: number }>()

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
})

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

function safeEqual(input: string, expected: string): boolean {
  return timingSafeEqual(digest(input), digest(expected))
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

async function sessionFor(req: Request): Promise<Session | null> {
  const token = readCookie(req.headers.cookie, COOKIE)
  if (!token) return null
  const sessions = await sessionStore.read()
  const session = sessions[token]
  if (!session) return null
  if (session.expiresAt <= Date.now()) {
    await sessionStore.mutate((current) => {
      if (!current[token]) return current
      const next = { ...current }
      delete next[token]
      return next
    })
    return null
  }
  return session
}

export async function pruneSessions(): Promise<void> {
  const now = Date.now()
  await sessionStore.mutate((current) => {
    const next: Record<string, Session> = {}
    for (const [token, session] of Object.entries(current)) {
      if (session.expiresAt > now) next[token] = session
    }
    return next
  })
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await sessionFor(req)
    if (!session) {
      res.status(401).json({ error: { code: 'unauthorised', message: 'Sign in to the admin panel.' } })
      return
    }
    res.locals.admin = session
    next()
  } catch (error) {
    next(error)
  }
}

/** Reject cross-site admin mutations and requests without the admin header. */
export function requireAdminMutation(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD') {
    next()
    return
  }
  const origin = req.headers.origin
  if (!originAllowed(origin)) {
    res.status(403).json({ error: { code: 'forbidden_origin', message: 'Origin not allowed.' } })
    return
  }
  if (req.get('x-admin-request') !== '1') {
    res.status(403).json({ error: { code: 'missing_admin_header', message: 'Admin request header missing.' } })
    return
  }
  next()
}

export const authRouter = Router()

authRouter.post('/auth/login', async (req, res, next) => {
  const key = req.ip ?? 'local'
  const now = Date.now()
  const record = attempts.get(key)
  if (record && record.resetAt > now && record.count >= MAX_ATTEMPTS) {
    res.status(429).json({
      error: { code: 'rate_limited', message: 'Too many attempts. Try again in 15 minutes.' },
    })
    return
  }

  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Email and password are required.' } })
    return
  }

  const emailMatches = safeEqual(parsed.data.email.toLowerCase(), ADMIN_EMAIL)
  const passwordMatches = safeEqual(parsed.data.password, ADMIN_PASSWORD)
  const accountKey = `acct:${parsed.data.email.trim().toLowerCase()}`
  const accountRecord = accountAttempts.get(accountKey)
  if (accountRecord && accountRecord.resetAt > now && accountRecord.count >= MAX_ATTEMPTS) {
    res.status(429).json({
      error: { code: 'rate_limited', message: 'Too many attempts for this account. Try again in 15 minutes.' },
    })
    return
  }

  if (!emailMatches || !passwordMatches) {
    const nextRecord =
      record && record.resetAt > now
        ? { count: record.count + 1, resetAt: record.resetAt }
        : { count: 1, resetAt: now + ATTEMPT_WINDOW_MS }
    attempts.set(key, nextRecord)
    accountAttempts.set(
      accountKey,
      accountRecord && accountRecord.resetAt > now
        ? { count: accountRecord.count + 1, resetAt: accountRecord.resetAt }
        : { count: 1, resetAt: now + ATTEMPT_WINDOW_MS },
    )
    res.status(401).json({ error: { code: 'invalid_credentials', message: 'Email or password is incorrect.' } })
    return
  }

  attempts.delete(key)
  accountAttempts.delete(accountKey)
  const token = randomBytes(32).toString('hex')
  const session: Session = { email: ADMIN_EMAIL, role: 'owner', expiresAt: now + SESSION_TTL_MS }
  try {
    await sessionStore.mutate((current) => {
      const next: Record<string, Session> = {}
      for (const [key, value] of Object.entries(current)) {
        if (value.expiresAt > now) next[key] = value
      }
      next[token] = session
      return next
    })
  } catch (error) {
    next(error)
    return
  }

  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: IS_PROD,
    path: '/',
    maxAge: SESSION_TTL_MS,
  })
  res.json({ data: { email: session.email, role: session.role, expiresAt: session.expiresAt } })
})

authRouter.post('/auth/logout', async (req, res, next) => {
  const token = readCookie(req.headers.cookie, COOKIE)
  if (token) {
    try {
      await sessionStore.mutate((current) => {
        if (!current[token]) return current
        const next = { ...current }
        delete next[token]
        return next
      })
    } catch (error) {
      next(error)
      return
    }
  }
  res.clearCookie(COOKIE, { path: '/' })
  res.json({ data: { signedOut: true } })
})

authRouter.get('/auth/me', async (req, res, next) => {
  try {
    const session = await sessionFor(req)
    if (!session) {
      res.status(401).json({ error: { code: 'unauthorised', message: 'Not signed in.' } })
      return
    }
    res.json({ data: { email: session.email, role: session.role, expiresAt: session.expiresAt } })
  } catch (error) {
    next(error)
  }
})

/** Only expose the dev credential hint outside production. */
authRouter.get('/auth/hint', (_req, res) => {
  if (IS_PROD) {
    res.json({ data: null })
    return
  }
  res.json({ data: { email: ADMIN_EMAIL } })
})
