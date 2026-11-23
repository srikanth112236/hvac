import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { Router, type NextFunction, type Request, type Response } from 'express'
import {
  customerForgotSchema,
  customerLoginSchema,
  customerProfileSchema,
  customerRegisterSchema,
  customerResendVerificationSchema,
  customerResetSchema,
  customerVerifySchema,
  type CustomerAccount,
  type CustomerStatus,
} from '@hvac/shared'
import {
  IS_PROD,
  originAllowed,
  ADMIN_NOTIFY_EMAIL,
  PUBLIC_SITE_URL,
  mailerConfigured,
} from './config.js'
import { adminPortalNotice, emailVerificationEmail, passwordResetEmail, sendMail } from './mailer.js'
import { rateLimit } from './rateLimit.js'
import { readSiteContent } from './content.js'
import { createStore } from './store.js'

const CUSTOMER_COOKIE = 'hvac_customer_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ATTEMPTS = 8
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const MAX_REGISTRATIONS_PER_HOUR = 6

interface StoredCustomer extends CustomerAccount {
  passwordSalt: string
  passwordHash: string
  emailVerifiedAt?: string | null
  verificationTokenHash?: string | null
  verificationExpiresAt?: number | null
}

interface CustomerSession {
  customerId: string
  expiresAt: number
}

export const customerStore = createStore<StoredCustomer[]>('customers.json', () => [])

const sessionStore = createStore<Record<string, CustomerSession>>('customer-sessions.json', () => ({}))
const resetStore = createStore<Record<string, { customerId: string; expiresAt: number }>>(
  'password-resets.json',
  () => ({}),
)
const attempts = new Map<string, { count: number; resetAt: number }>()
const accountAttempts = new Map<string, { count: number; resetAt: number }>()
const registrations = new Map<string, { count: number; resetAt: number }>()

function statusOf(customer: { status?: CustomerStatus }): CustomerStatus {
  return customer.status ?? 'active'
}

function encodePassword(password: string): { passwordSalt: string; passwordHash: string } {
  const passwordSalt = randomBytes(16).toString('hex')
  return {
    passwordSalt,
    passwordHash: scryptSync(password, passwordSalt, 64).toString('hex'),
  }
}

function passwordMatches(password: string, customer: StoredCustomer): boolean {
  try {
    return timingSafeEqual(
      scryptSync(password, customer.passwordSalt, 64),
      Buffer.from(customer.passwordHash, 'hex'),
    )
  } catch {
    return false
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

async function sendVerificationEmail(
  customer: { name: string; email: string },
  token: string,
): Promise<boolean> {
  const content = await readSiteContent()
  const base = (PUBLIC_SITE_URL || content.seo.canonicalBase).replace(/\/+$/, '')
  const message = emailVerificationEmail({
    name: customer.name,
    verifyUrl: `${base}/portal?verify=${token}`,
    brand: content.brand.shortName || content.brand.name,
    expiresHours: 24,
  })
  const result = await sendMail({
    to: customer.email,
    kind: 'email-verification',
    ...message,
  })
  return result.ok
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export function publicCustomer(customer: StoredCustomer): CustomerAccount {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    status: statusOf(customer),
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }
}

export async function findCustomerByEmail(email: string): Promise<StoredCustomer | null> {
  const normalized = email.trim().toLowerCase()
  const customers = await customerStore.read()
  return customers.find((customer) => customer.email === normalized) ?? null
}

export async function readPublicCustomers(): Promise<CustomerAccount[]> {
  const customers = await customerStore.read()
  return customers.map(publicCustomer)
}

async function sessionCustomer(req: Request): Promise<StoredCustomer | null> {
  const token = readCookie(req.headers.cookie, CUSTOMER_COOKIE)
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
  const customers = await customerStore.read()
  const customer = customers.find((entry) => entry.id === session.customerId) ?? null
  // A suspended customer loses portal access immediately, even with a cookie.
  if (!customer || statusOf(customer) !== 'active') return null
  return customer
}

export async function requireCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const customer = await sessionCustomer(req)
    if (!customer) {
      res.status(401).json({
        error: { code: 'unauthorised', message: 'Sign in to your customer portal.' },
      })
      return
    }
    res.locals.customer = customer
    next()
  } catch (error) {
    next(error)
  }
}

/** Remove every live session for a customer (suspension, password reset). */
export async function revokeCustomerSessions(customerId: string): Promise<void> {
  await sessionStore.mutate((current) => {
    const next: Record<string, CustomerSession> = {}
    for (const [token, session] of Object.entries(current)) {
      if (session.customerId !== customerId) next[token] = session
    }
    return next
  })
}

export function requireCustomerMutation(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin
  if (!originAllowed(origin)) {
    res.status(403).json({ error: { code: 'forbidden_origin', message: 'Origin not allowed.' } })
    return
  }
  if (req.get('x-customer-request') !== '1') {
    res.status(403).json({
      error: { code: 'missing_customer_header', message: 'Customer request header missing.' },
    })
    return
  }
  next()
}

export async function pruneCustomerSessions(): Promise<void> {
  const now = Date.now()
  await sessionStore.mutate((current) => {
    const next: Record<string, CustomerSession> = {}
    for (const [token, session] of Object.entries(current)) {
      if (session.expiresAt > now) next[token] = session
    }
    return next
  })
}

export const portalAuthRouter = Router()

portalAuthRouter.post('/portal/auth/register', async (req, res, next) => {
  const key = req.ip ?? 'local'
  const now = Date.now()
  const throttle = registrations.get(key)
  if (throttle && throttle.resetAt > now && throttle.count >= MAX_REGISTRATIONS_PER_HOUR) {
    res.status(429).json({
      error: {
        code: 'rate_limited',
        message: 'Too many account requests from this address. Try again later.',
      },
    })
    return
  }

  const parsed = customerRegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Check your details and try again.',
      },
    })
    return
  }
  const email = parsed.data.email.toLowerCase()
  if (await findCustomerByEmail(email)) {
    res.status(409).json({
      error: { code: 'email_in_use', message: 'An account with this email already exists. Sign in instead.' },
    })
    return
  }

  if (IS_PROD && !mailerConfigured()) {
    res.status(503).json({
      error: {
        code: 'registration_closed',
        message:
          'Portal registration is unavailable until email delivery is configured. Contact the works desk.',
      },
    })
    return
  }

  registrations.set(key, {
    count: throttle && throttle.resetAt > now ? throttle.count + 1 : 1,
    resetAt: throttle && throttle.resetAt > now ? throttle.resetAt : now + 60 * 60 * 1000,
  })

  const iso = new Date().toISOString()
  const verificationToken = IS_PROD ? randomBytes(32).toString('hex') : null
  const record: StoredCustomer = {
    id: randomUUID(),
    name: parsed.data.name,
    email,
    phone: parsed.data.phone,
    address: parsed.data.address,
    status: IS_PROD ? 'unverified' : 'pending',
    createdAt: iso,
    updatedAt: iso,
    emailVerifiedAt: IS_PROD ? null : iso,
    verificationTokenHash: verificationToken ? hashToken(verificationToken) : null,
    verificationExpiresAt: verificationToken ? now + 24 * 60 * 60 * 1000 : null,
    ...encodePassword(parsed.data.password),
  }
  try {
    await customerStore.mutate((customers) => [record, ...customers])
  } catch (error) {
    next(error)
    return
  }

  if (IS_PROD && verificationToken) {
    let delivered = false
    try {
      delivered = await sendVerificationEmail(record, verificationToken)
    } catch (error) {
      console.error('[hvac-api] verification email failed', error)
    }
    if (!delivered) {
      res.status(503).json({
        error: {
          code: 'verification_email_failed',
          message:
            'The account is held, but the verification email could not be sent. Use "Resend verification" or contact the works desk.',
        },
      })
      return
    }
    res.status(201).json({
      data: publicCustomer(record),
      meta: {
        verifyEmail: true,
        message:
          'Check your email to verify the address. After verification the works desk approves portal access.',
      },
    })
    return
  }

  // Development only: no mail provider is required, so the account starts
  // pending and the works desk approves it. Production always verifies email.
  void sendMail({
    to: ADMIN_NOTIFY_EMAIL,
    kind: 'portal-request',
    ...adminPortalNotice({
      name: record.name,
      email: record.email,
      phone: record.phone,
    }),
  }).catch((error) => console.error('[hvac-api] portal notice failed', error))

  res.status(201).json({
    data: publicCustomer(record),
    meta: {
      pending: true,
      message: 'Account created. The works desk will approve portal access before you can sign in.',
    },
  })
})

portalAuthRouter.post('/portal/auth/login', async (req, res, next) => {
  const key = req.ip ?? 'local'
  const now = Date.now()
  const record = attempts.get(key)
  if (record && record.resetAt > now && record.count >= MAX_ATTEMPTS) {
    res.status(429).json({
      error: { code: 'rate_limited', message: 'Too many attempts. Try again in 15 minutes.' },
    })
    return
  }
  const parsed = customerLoginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Email and password are required.' } })
    return
  }
  const customer = await findCustomerByEmail(parsed.data.email)
  const accountKey = `acct:${parsed.data.email.trim().toLowerCase()}`
  const accountRecord = accountAttempts.get(accountKey)
  if (accountRecord && accountRecord.resetAt > now && accountRecord.count >= MAX_ATTEMPTS) {
    res.status(429).json({
      error: { code: 'rate_limited', message: 'Too many attempts for this account. Try again in 15 minutes.' },
    })
    return
  }
  if (!customer || !passwordMatches(parsed.data.password, customer)) {
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
  const status = statusOf(customer)
  if (status !== 'active') {
    const code =
      status === 'unverified'
        ? 'email_unverified'
        : status === 'pending'
          ? 'pending_approval'
          : 'account_suspended'
    const message =
      status === 'unverified'
        ? 'Verify your email address before signing in. Use the link in the verification email.'
        : status === 'pending'
          ? 'Your portal account is waiting for approval from the works desk.'
          : 'This portal account is suspended. Contact the works desk.'
    res.status(403).json({ error: { code, message } })
    return
  }
  const token = randomBytes(32).toString('hex')
  try {
    await sessionStore.mutate((sessions) => ({
      ...sessions,
      [token]: { customerId: customer.id, expiresAt: now + SESSION_TTL_MS },
    }))
  } catch (error) {
    next(error)
    return
  }
  res.cookie(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: IS_PROD,
    path: '/',
    maxAge: SESSION_TTL_MS,
  })
  res.json({ data: publicCustomer(customer) })
})

portalAuthRouter.post(
  '/portal/auth/forgot',
  rateLimit({
    scope: 'portal-forgot',
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many reset requests from this address. Try again later.',
  }),
  async (req, res, next) => {
    const parsed = customerForgotSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Enter a valid email address.',
        },
      })
      return
    }

    try {
      const customer = await findCustomerByEmail(parsed.data.email)
      if (customer && statusOf(customer) === 'active') {
        const token = randomBytes(32).toString('hex')
        const hash = hashToken(token)
        const now = Date.now()
        await resetStore.mutate((current) => {
          const next: Record<string, { customerId: string; expiresAt: number }> = {}
          for (const [key, value] of Object.entries(current)) {
            if (value.expiresAt > now) next[key] = value
          }
          next[hash] = { customerId: customer.id, expiresAt: now + 60 * 60 * 1000 }
          return next
        })
        const content = await readSiteContent()
        const base = (PUBLIC_SITE_URL || content.seo.canonicalBase).replace(/\/+$/, '')
        const message = passwordResetEmail({
          name: customer.name,
          resetUrl: `${base}/portal?reset=${token}`,
          brand: content.brand.shortName || content.brand.name,
          expiresMinutes: 60,
        })
        void sendMail({
          to: customer.email,
          kind: 'password-reset',
          ...message,
        }).catch((error) => console.error('[hvac-api] password reset email failed', error))
      }
    } catch (error) {
      next(error)
      return
    }

    // Same response whether or not the address exists.
    res.status(202).json({ data: { requested: true } })
  },
)

portalAuthRouter.post(
  '/portal/auth/reset',
  rateLimit({
    scope: 'portal-reset',
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many reset attempts from this address. Request a new link later.',
  }),
  async (req, res, next) => {
    const parsed = customerResetSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check the new password.',
        },
      })
      return
    }

    const hash = hashToken(parsed.data.token)
    const record = (await resetStore.read())[hash]
    if (!record || record.expiresAt <= Date.now()) {
      res.status(400).json({
        error: { code: 'invalid_token', message: 'This reset link is invalid or has expired.' },
      })
      return
    }

    try {
      const customers = await customerStore.read()
      const customer = customers.find((entry) => entry.id === record.customerId)
      if (!customer || statusOf(customer) !== 'active') {
        res.status(400).json({
          error: { code: 'invalid_token', message: 'This reset link is no longer valid.' },
        })
        return
      }
      const encoded = encodePassword(parsed.data.password)
      await customerStore.mutate((current) =>
        current.map((entry) =>
          entry.id === customer.id
            ? { ...entry, ...encoded, updatedAt: new Date().toISOString() }
            : entry,
        ),
      )
      await resetStore.mutate((current) => {
        const next = { ...current }
        delete next[hash]
        return next
      })
      await revokeCustomerSessions(customer.id)
      res.json({ data: { reset: true } })
    } catch (error) {
      next(error)
    }
  },
)

portalAuthRouter.post(
  '/portal/auth/verify',
  rateLimit({
    scope: 'portal-verify',
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many verification attempts. Request a new link later.',
  }),
  async (req, res, next) => {
    const parsed = customerVerifySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'validation_error', message: 'This verification link is not valid.' },
      })
      return
    }
    const hash = hashToken(parsed.data.token)
    const now = Date.now()
    const iso = new Date(now).toISOString()
    let verified: StoredCustomer | undefined
    try {
      await customerStore.mutate((customers) =>
        customers.map((customer) => {
          if (
            customer.verificationTokenHash !== hash ||
            (customer.verificationExpiresAt ?? 0) <= now ||
            statusOf(customer) !== 'unverified'
          ) {
            return customer
          }
          verified = {
            ...customer,
            status: 'pending',
            emailVerifiedAt: iso,
            verificationTokenHash: null,
            verificationExpiresAt: null,
            updatedAt: iso,
          }
          return verified
        }),
      )
    } catch (error) {
      next(error)
      return
    }
    if (!verified) {
      res.status(400).json({
        error: {
          code: 'invalid_token',
          message: 'This verification link is invalid, expired or already used.',
        },
      })
      return
    }
    void sendMail({
      to: ADMIN_NOTIFY_EMAIL,
      kind: 'portal-request',
      ...adminPortalNotice({
        name: verified.name,
        email: verified.email,
        phone: verified.phone,
      }),
    }).catch((error) => console.error('[hvac-api] portal notice failed', error))
    res.json({
      data: { verified: true },
      meta: { message: 'Email verified. The works desk will approve portal access next.' },
    })
  },
)

portalAuthRouter.post(
  '/portal/auth/verify/resend',
  rateLimit({
    scope: 'portal-verify-resend',
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many verification emails. Try again later.',
  }),
  async (req, res, next) => {
    if (!mailerConfigured()) {
      res.status(503).json({
        error: {
          code: 'mail_unconfigured',
          message: 'Verification email is unavailable. Contact the works desk.',
        },
      })
      return
    }
    const parsed = customerResendVerificationSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'validation_error', message: 'Enter the email on the account.' },
      })
      return
    }
    try {
      const customer = await findCustomerByEmail(parsed.data.email)
      if (customer && statusOf(customer) === 'unverified') {
        const token = randomBytes(32).toString('hex')
        const now = Date.now()
        const hash = hashToken(token)
        await customerStore.mutate((customers) =>
          customers.map((entry) =>
            entry.id === customer.id
              ? {
                  ...entry,
                  verificationTokenHash: hash,
                  verificationExpiresAt: now + 24 * 60 * 60 * 1000,
                  updatedAt: new Date(now).toISOString(),
                }
              : entry,
          ),
        )
        const delivered = await sendVerificationEmail(customer, token)
        if (!delivered) {
          res.status(503).json({
            error: {
              code: 'verification_email_failed',
              message: 'The verification email could not be sent. Try again shortly.',
            },
          })
          return
        }
      }
    } catch (error) {
      next(error)
      return
    }
    // Same answer whether or not the address exists.
    res.status(202).json({ data: { requested: true } })
  },
)

portalAuthRouter.post('/portal/auth/logout', async (req, res, next) => {
  const token = readCookie(req.headers.cookie, CUSTOMER_COOKIE)
  if (token) {
    try {
      await sessionStore.mutate((sessions) => {
        if (!sessions[token]) return sessions
        const next = { ...sessions }
        delete next[token]
        return next
      })
    } catch (error) {
      next(error)
      return
    }
  }
  res.clearCookie(CUSTOMER_COOKIE, { path: '/' })
  res.json({ data: { signedOut: true } })
})

portalAuthRouter.get('/portal/auth/me', async (req, res, next) => {
  try {
    const customer = await sessionCustomer(req)
    if (!customer) {
      res.status(401).json({ error: { code: 'unauthorised', message: 'Not signed in.' } })
      return
    }
    res.set('Cache-Control', 'private, no-store')
    res.json({ data: publicCustomer(customer) })
  } catch (error) {
    next(error)
  }
})

portalAuthRouter.patch(
  '/portal/profile',
  requireCustomer,
  requireCustomerMutation,
  async (req, res, next) => {
    const parsed = customerProfileSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check your details and try again.',
        },
      })
      return
    }
    const current = res.locals.customer as StoredCustomer
    try {
      const updated = await customerStore.mutate((customers) => {
        const fresh = customers.find((customer) => customer.id === current.id) ?? current
        return customers.map((customer) =>
          customer.id === current.id
            ? { ...fresh, ...parsed.data, updatedAt: new Date().toISOString() }
            : customer,
        )
      })
      const currentRecord = updated.find((customer) => customer.id === current.id) ?? current
      res.json({ data: publicCustomer(currentRecord) })
    } catch (error) {
      next(error)
    }
  },
)
