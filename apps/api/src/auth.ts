import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { Router, type NextFunction, type Request, type Response } from 'express'
import { z } from 'zod'
import type { AdminRole } from '@hvac/shared'
import { ADMIN_ROLES, roleCan, rolesForPermission, type AdminPermission } from '@hvac/shared'
import { ADMIN_EMAIL, ADMIN_PASSWORD, IS_PROD, originAllowed } from './config.js'
import { adminPasswordMatches, findAdminUserByEmail, findAdminUserById } from './adminUsers.js'
import {
  TwoFactorError,
  isTwoFactorEnabled,
  maskEmail,
  readTwoFactorStatus,
  resendChallenge,
  startLoginChallenge,
  startSetupChallenge,
  consumeSetupChallenge,
  verifyChallenge,
} from './twoFactor.js'
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
  userId?: string
  email: string
  role: AdminRole
  expiresAt: number
}

const sessionStore = createStore<Record<string, Session>>('admin-sessions.json', () => ({}))
const attempts = new Map<string, { count: number; resetAt: number }>()
const accountAttempts = new Map<string, { count: number; resetAt: number }>()

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
})

const twoFactorCodeSchema = z.object({
  challengeId: z.string().trim().min(32).max(200),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the six-digit code.'),
})

const twoFactorSetupSchema = z.object({
  purpose: z.enum(['enable', 'disable']),
})

const twoFactorConfirmSchema = twoFactorCodeSchema.extend({
  purpose: z.enum(['enable', 'disable']),
})

const twoFactorResendSchema = z.object({
  challengeId: z.string().trim().min(32).max(200),
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

export async function revokeAdminSessionsForUser(userId: string): Promise<void> {
  await sessionStore.mutate((current) => {
    const next: Record<string, Session> = {}
    for (const [token, session] of Object.entries(current)) {
      if (session.userId !== userId) next[token] = session
    }
    return next
  })
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await sessionFor(req)
    if (!session) {
      res
        .status(401)
        .json({ error: { code: 'unauthorised', message: 'Sign in to the admin panel.' } })
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
    res
      .status(403)
      .json({ error: { code: 'missing_admin_header', message: 'Admin request header missing.' } })
    return
  }
  next()
}

/** Require one of the given roles for every request in this router. */
export function requireRole(...roles: AdminRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const admin = res.locals.admin as Session | undefined
    if (!admin) {
      res
        .status(401)
        .json({ error: { code: 'unauthorised', message: 'Sign in to the admin panel.' } })
      return
    }
    if (!roles.includes(admin.role)) {
      res.status(403).json({
        error: { code: 'forbidden_role', message: 'Your role cannot perform this action.' },
      })
      return
    }
    next()
  }
}

/** Read-only roles can still use GET/HEAD; writes are limited to the given roles. */
export function requireWriteRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      next()
      return
    }
    const admin = res.locals.admin as Session | undefined
    if (!admin || !roles.includes(admin.role)) {
      res.status(403).json({
        error: { code: 'forbidden_role', message: 'Your role cannot perform this action.' },
      })
      return
    }
    next()
  }
}

/**
 * Permission-based write guard. Reads stay available to every authenticated
 * role; the matrix in @hvac/shared is the single source of truth for writes.
 */
export function requirePermission(permission: AdminPermission) {
  return requireWriteRole(...rolesForPermission(permission))
}

/** Require every listed permission for a write (reads remain open). */
export function requirePermissions(...permissions: AdminPermission[]) {
  const allowed = ADMIN_ROLES.filter((role) =>
    permissions.every((permission) => roleCan(role, permission)),
  )
  return requireWriteRole(...allowed)
}

async function issueSession(
  res: Response,
  identity: { email: string; role: AdminRole; userId?: string },
): Promise<{ email: string; role: AdminRole; userId: string | null; expiresAt: number }> {
  const now = Date.now()
  const token = randomBytes(32).toString('hex')
  const session: Session = { ...identity, expiresAt: now + SESSION_TTL_MS }
  await sessionStore.mutate((current) => {
    const next: Record<string, Session> = {}
    for (const [key, value] of Object.entries(current)) {
      if (value.expiresAt > now) next[key] = value
    }
    next[token] = session
    return next
  })
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: IS_PROD,
    path: '/',
    maxAge: SESSION_TTL_MS,
  })
  return {
    email: session.email,
    role: session.role,
    userId: session.userId ?? null,
    expiresAt: session.expiresAt,
  }
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
    res
      .status(400)
      .json({ error: { code: 'validation_error', message: 'Email and password are required.' } })
    return
  }

  const email = parsed.data.email.trim().toLowerCase()
  const accountKey = `acct:${email}`
  const accountRecord = accountAttempts.get(accountKey)
  if (accountRecord && accountRecord.resetAt > now && accountRecord.count >= MAX_ATTEMPTS) {
    res.status(429).json({
      error: {
        code: 'rate_limited',
        message: 'Too many attempts for this account. Try again in 15 minutes.',
      },
    })
    return
  }

  const envOwner =
    safeEqual(email, ADMIN_EMAIL.trim().toLowerCase()) &&
    safeEqual(parsed.data.password, ADMIN_PASSWORD)
  let resolved: { email: string; role: AdminRole; userId?: string } | null = envOwner
    ? { email: ADMIN_EMAIL, role: 'owner' }
    : null

  if (!resolved) {
    const user = await findAdminUserByEmail(email)
    if (user && user.status === 'active' && adminPasswordMatches(parsed.data.password, user)) {
      resolved = { email: user.email, role: user.role, userId: user.id }
    }
  }

  if (!resolved) {
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
    res
      .status(401)
      .json({ error: { code: 'invalid_credentials', message: 'Email or password is incorrect.' } })
    return
  }

  attempts.delete(key)
  accountAttempts.delete(accountKey)

  if (await isTwoFactorEnabled(resolved.email)) {
    try {
      const challenge = await startLoginChallenge({
        email: resolved.email,
        role: resolved.role,
        userId: resolved.userId,
      })
      res.json({
        data: {
          requires2fa: true,
          challengeId: challenge.challengeId,
          maskedEmail: challenge.maskedEmail,
          expiresAt: challenge.expiresAt,
        },
      })
    } catch (error) {
      const twoFactor = error instanceof TwoFactorError ? error : null
      res.status(twoFactor?.status ?? 503).json({
        error: {
          code: twoFactor?.code ?? 'two_factor_unavailable',
          message:
            twoFactor?.message ??
            'A verification code could not be sent. Try again or contact the owner.',
        },
      })
    }
    return
  }

  try {
    const data = await issueSession(res, resolved)
    res.json({ data })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/auth/2fa/verify', async (req, res, next) => {
  const parsed = twoFactorCodeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Enter the code.',
      },
    })
    return
  }
  try {
    const result = await verifyChallenge(parsed.data.challengeId, parsed.data.code, 'login')
    if (result.status !== 'ok') {
      res.status(result.status === 'expired' ? 410 : result.status === 'locked' ? 429 : 401).json({
        error: {
          code: result.status === 'expired' ? 'code_expired' : 'invalid_code',
          message:
            result.status === 'expired'
              ? 'That code has expired. Sign in again.'
              : result.status === 'locked'
                ? 'Too many incorrect codes. Sign in again.'
                : 'That code is not correct.',
        },
      })
      return
    }

    let identity = result.identity
    if (identity.userId) {
      const user = await findAdminUserById(identity.userId)
      if (!user || user.status !== 'active') {
        res.status(401).json({
          error: { code: 'account_unavailable', message: 'This account is no longer active.' },
        })
        return
      }
      identity = { email: user.email, role: user.role, userId: user.id }
    } else if (!safeEqual(identity.email, ADMIN_EMAIL.trim().toLowerCase())) {
      res.status(401).json({
        error: { code: 'account_unavailable', message: 'This account is no longer active.' },
      })
      return
    }

    const data = await issueSession(res, identity)
    res.json({ data })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/auth/2fa/resend', async (req, res) => {
  const parsed = twoFactorResendSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Start sign-in again.' } })
    return
  }
  try {
    const challenge = await resendChallenge(parsed.data.challengeId, 'login')
    res.json({
      data: {
        requires2fa: true,
        challengeId: challenge.challengeId,
        maskedEmail: challenge.maskedEmail,
        expiresAt: challenge.expiresAt,
      },
    })
  } catch (error) {
    const twoFactor = error instanceof TwoFactorError ? error : null
    res.status(twoFactor?.status ?? 503).json({
      error: {
        code: twoFactor?.code ?? 'resend_failed',
        message: twoFactor?.message ?? 'A new code could not be sent.',
      },
    })
  }
})

authRouter.get('/auth/2fa', requireAdmin, async (_req, res, next) => {
  try {
    const admin = res.locals.admin as Session
    const status = await readTwoFactorStatus(admin.email)
    res.json({ data: { ...status, email: admin.email, maskedEmail: maskEmail(admin.email) } })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/auth/2fa/setup', requireAdmin, requireAdminMutation, async (req, res) => {
  const parsed = twoFactorSetupSchema.safeParse(req.body)
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: { code: 'validation_error', message: 'Choose enable or disable.' } })
    return
  }
  const admin = res.locals.admin as Session
  try {
    const enabled = await isTwoFactorEnabled(admin.email)
    if (parsed.data.purpose === 'enable' && enabled) {
      res
        .status(409)
        .json({ error: { code: 'already_enabled', message: 'Two-factor is already on.' } })
      return
    }
    if (parsed.data.purpose === 'disable' && !enabled) {
      res
        .status(409)
        .json({ error: { code: 'already_disabled', message: 'Two-factor is already off.' } })
      return
    }
    const challenge = await startSetupChallenge(
      { email: admin.email, role: admin.role, userId: admin.userId },
      parsed.data.purpose,
    )
    res.json({ data: { ...challenge, purpose: parsed.data.purpose } })
  } catch (error) {
    const twoFactor = error instanceof TwoFactorError ? error : null
    res.status(twoFactor?.status ?? 503).json({
      error: {
        code: twoFactor?.code ?? 'setup_failed',
        message: twoFactor?.message ?? 'A verification code could not be sent.',
      },
    })
  }
})

authRouter.post('/auth/2fa/confirm', requireAdmin, requireAdminMutation, async (req, res) => {
  const parsed = twoFactorConfirmSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Enter the code.',
      },
    })
    return
  }
  const admin = res.locals.admin as Session
  try {
    await consumeSetupChallenge(
      parsed.data.challengeId,
      parsed.data.code,
      admin.email,
      parsed.data.purpose,
    )
    const status = await readTwoFactorStatus(admin.email)
    res.json({ data: { ...status, email: admin.email, maskedEmail: maskEmail(admin.email) } })
  } catch (error) {
    const twoFactor = error instanceof TwoFactorError ? error : null
    res.status(twoFactor?.status ?? 500).json({
      error: {
        code: twoFactor?.code ?? 'confirm_failed',
        message: twoFactor?.message ?? 'Two-factor could not be updated.',
      },
    })
  }
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
