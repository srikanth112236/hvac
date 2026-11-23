import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import type { AdminRole } from '@hvac/shared'
import { mailerConfigured } from './config.js'
import { sendMail, twoFactorCodeEmail } from './mailer.js'
import { createStore } from './store.js'

/**
 * Email-delivered second factor. There is no SMS path anywhere in the product:
 * a six-digit code is sent to the account inbox, hashed in memory, and accepted
 * once inside a short window. Preferences survive restarts; live challenges do
 * not, which is deliberate — a stale code can never be replayed after a deploy.
 */
export type TwoFactorPurpose = 'login' | 'enable' | 'disable'

export interface TwoFactorIdentity {
  email: string
  role: AdminRole
  userId?: string
}

interface TwoFactorPreference {
  email: string
  enabled: boolean
  updatedAt: string
  enabledAt: string | null
}

interface Challenge {
  id: string
  email: string
  role: AdminRole
  userId?: string
  purpose: TwoFactorPurpose
  codeHash: string
  createdAt: number
  expiresAt: number
  attempts: number
  resends: number
}

export interface ChallengeSummary {
  challengeId: string
  expiresAt: number
  email: string
  maskedEmail: string
}

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_CODE_ATTEMPTS = 5
const MAX_RESENDS = 3

const preferenceStore = createStore<Record<string, TwoFactorPreference>>(
  'admin-2fa.json',
  () => ({}),
)

const challenges = new Map<string, Challenge>()

function normalize(email: string): string {
  return email.trim().toLowerCase()
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!name || !domain) return 'your inbox'
  const visible = name.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(1, Math.min(6, name.length - 2)))}@${domain}`
}

export function twoFactorMailReady(): boolean {
  return mailerConfigured()
}

export async function isTwoFactorEnabled(email: string): Promise<boolean> {
  const preferences = await preferenceStore.read()
  return Boolean(preferences[normalize(email)]?.enabled)
}

export async function readTwoFactorStatus(email: string): Promise<{
  enabled: boolean
  enabledAt: string | null
  mailConfigured: boolean
}> {
  const preferences = await preferenceStore.read()
  const record = preferences[normalize(email)]
  return {
    enabled: Boolean(record?.enabled),
    enabledAt: record?.enabledAt ?? null,
    mailConfigured: mailerConfigured(),
  }
}

export async function setTwoFactorEnabled(email: string, enabled: boolean): Promise<void> {
  const key = normalize(email)
  const now = new Date().toISOString()
  await preferenceStore.mutate((current) => ({
    ...current,
    [key]: {
      email: key,
      enabled,
      updatedAt: now,
      enabledAt: enabled ? now : null,
    },
  }))
}

function hashCode(challengeId: string, code: string): string {
  return createHmac('sha256', challengeId).update(code, 'utf8').digest('hex')
}

function codeMatches(challenge: Challenge, code: string): boolean {
  try {
    return timingSafeEqual(
      Buffer.from(hashCode(challenge.id, code), 'hex'),
      Buffer.from(challenge.codeHash, 'hex'),
    )
  } catch {
    return false
  }
}

function pruneChallenges(): void {
  const now = Date.now()
  for (const [id, challenge] of challenges) {
    if (challenge.expiresAt <= now) challenges.delete(id)
  }
}

async function deliver(
  identity: TwoFactorIdentity,
  purpose: TwoFactorPurpose,
): Promise<ChallengeSummary> {
  if (!mailerConfigured()) {
    throw new TwoFactorError(
      'mail_unconfigured',
      'Email delivery is not configured, so two-factor codes cannot be sent.',
      503,
    )
  }
  const id = randomBytes(32).toString('hex')
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
  const now = Date.now()
  for (const [existingId, existing] of challenges) {
    if (existing.email === normalize(identity.email) && existing.purpose === purpose) {
      challenges.delete(existingId)
    }
  }
  const challenge: Challenge = {
    id,
    email: normalize(identity.email),
    role: identity.role,
    userId: identity.userId,
    purpose,
    codeHash: hashCode(id, code),
    createdAt: now,
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    resends: 0,
  }
  challenges.set(id, challenge)
  const template = twoFactorCodeEmail({
    code,
    purpose,
    expiresMinutes: Math.round(CODE_TTL_MS / 60_000),
    brand: process.env.PUBLIC_BRAND_NAME ?? 'Coolvane HVAC',
  })
  const result = await sendMail({
    to: challenge.email,
    subject: template.subject,
    html: template.html,
    kind: `admin-2fa-${purpose}`,
  })
  if (!result.ok) {
    challenges.delete(id)
    throw new TwoFactorError(
      'mail_failed',
      'The verification email could not be sent. Try again or contact the owner.',
      503,
    )
  }
  return {
    challengeId: id,
    expiresAt: challenge.expiresAt,
    email: challenge.email,
    maskedEmail: maskEmail(challenge.email),
  }
}

export async function startLoginChallenge(identity: TwoFactorIdentity): Promise<ChallengeSummary> {
  pruneChallenges()
  return deliver(identity, 'login')
}

export async function startSetupChallenge(
  identity: TwoFactorIdentity,
  purpose: 'enable' | 'disable',
): Promise<ChallengeSummary> {
  pruneChallenges()
  return deliver(identity, purpose)
}

export async function resendChallenge(
  challengeId: string,
  purpose: TwoFactorPurpose,
): Promise<ChallengeSummary> {
  pruneChallenges()
  const existing = challenges.get(challengeId)
  if (!existing || existing.purpose !== purpose || existing.expiresAt <= Date.now()) {
    throw new TwoFactorError('challenge_expired', 'That code has expired. Start again.', 410)
  }
  if (existing.resends >= MAX_RESENDS) {
    throw new TwoFactorError('too_many_resends', 'Too many resend requests. Start again.', 429)
  }
  challenges.delete(challengeId)
  const identity: TwoFactorIdentity = {
    email: existing.email,
    role: existing.role,
    userId: existing.userId,
  }
  const next = await deliver(identity, purpose)
  const created = challenges.get(next.challengeId)
  if (created) created.resends = existing.resends + 1
  return next
}

export type TwoFactorVerifyResult =
  { status: 'ok'; identity: TwoFactorIdentity } | { status: 'invalid' | 'expired' | 'locked' }

export async function verifyChallenge(
  challengeId: string,
  code: string,
  purpose: TwoFactorPurpose,
): Promise<TwoFactorVerifyResult> {
  pruneChallenges()
  const challenge = challenges.get(challengeId)
  if (!challenge || challenge.purpose !== purpose) return { status: 'expired' }
  if (challenge.expiresAt <= Date.now()) {
    challenges.delete(challengeId)
    return { status: 'expired' }
  }
  if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
    challenges.delete(challengeId)
    return { status: 'locked' }
  }
  if (!codeMatches(challenge, code.trim())) {
    challenge.attempts += 1
    if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
      challenges.delete(challengeId)
      return { status: 'locked' }
    }
    return { status: 'invalid' }
  }
  challenges.delete(challengeId)
  return {
    status: 'ok',
    identity: { email: challenge.email, role: challenge.role, userId: challenge.userId },
  }
}

/** Owner preference is keyed by email so the environment recovery account is covered too. */
export async function consumeSetupChallenge(
  challengeId: string,
  code: string,
  sessionEmail: string,
  purpose: 'enable' | 'disable',
): Promise<void> {
  const result = await verifyChallenge(challengeId, code, purpose)
  if (result.status !== 'ok') {
    throw new TwoFactorError(
      result.status === 'expired' ? 'challenge_expired' : 'invalid_code',
      result.status === 'expired'
        ? 'That code has expired. Send a new one.'
        : result.status === 'locked'
          ? 'Too many incorrect codes. Start again.'
          : 'That code is not correct.',
      result.status === 'expired' ? 410 : 401,
    )
  }
  if (normalize(result.identity.email) !== normalize(sessionEmail)) {
    throw new TwoFactorError('challenge_mismatch', 'That code belongs to a different account.', 403)
  }
  await setTwoFactorEnabled(sessionEmail, purpose === 'enable')
}

export class TwoFactorError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}
