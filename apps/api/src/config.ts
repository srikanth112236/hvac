/**
 * Runtime configuration shared by the API.
 *
 * Everything an operator must set for a real deployment is read here, once,
 * and validated. Development keeps working with local defaults, but production
 * refuses to boot with development secrets or without an explicit origin list.
 */
export const IS_PROD = process.env.NODE_ENV === 'production'

const DEV_ORIGINS = [
  'http://127.0.0.1:5175',
  'http://localhost:5175',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
]

function splitList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

/** Origins that may call the API and pass the admin/customer mutation header. */
export const allowedOrigins = new Set<string>([
  ...splitList(process.env.ALLOWED_ORIGINS),
  ...(IS_PROD ? [] : DEV_ORIGINS),
])

export function originAllowed(origin: string | undefined): boolean {
  // Same-origin requests may omit Origin (GET/navigation). Browser-initiated
  // cross-origin writes always send it, so an absent header is not a bypass
  // for the mutation guard, which additionally requires a custom header.
  if (!origin) return true
  return allowedOrigins.has(origin.replace(/\/+$/, ''))
}

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'admin@coolvane.example').toLowerCase()
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Coolvane!2026'

export function assertProductionConfig(): void {
  if (!IS_PROD) return
  const problems: string[] = []
  if (!process.env.ADMIN_EMAIL) problems.push('ADMIN_EMAIL')
  if (!process.env.ADMIN_PASSWORD) problems.push('ADMIN_PASSWORD')
  if (allowedOrigins.size === 0) problems.push('ALLOWED_ORIGINS')
  if (!process.env.DATA_ENCRYPTION_KEY) problems.push('DATA_ENCRYPTION_KEY')
  if (problems.length) {
    throw new Error(
      `Refusing to start in production without ${problems.join(', ')}. ` +
        'Set them in the API environment (for example via the hosting secret store).',
    )
  }
  if ((process.env.ADMIN_PASSWORD ?? '').length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters in production.')
  }
  if ((process.env.DATA_ENCRYPTION_KEY ?? '').length < 32) {
    throw new Error(
      'DATA_ENCRYPTION_KEY must be at least 32 characters in production. Keep a copy in the secret store: losing it makes the encrypted data unreadable.',
    )
  }
}

/* -------------------------------------------------------------------------- */
/*  Email                                                                      */
/* -------------------------------------------------------------------------- */

/** Provider is configured when either Resend or a generic webhook is set. */
export function mailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.MAIL_WEBHOOK_URL)
}

export const MAIL_FROM = process.env.MAIL_FROM ?? 'Coolvane HVAC <works@coolvane.example>'
export const ADMIN_NOTIFY_EMAIL =
  process.env.ADMIN_NOTIFY_EMAIL ?? process.env.ADMIN_EMAIL ?? 'works@coolvane.example'
export const EXPENSE_REPORT_EMAIL = process.env.EXPENSE_REPORT_EMAIL ?? ADMIN_NOTIFY_EMAIL

/**
 * Absolute origin used in emailed links (password reset, receipts). Production
 * should set it; development falls back to the Vite port.
 */
export const PUBLIC_SITE_URL =
  process.env.PUBLIC_SITE_URL ?? (IS_PROD ? '' : 'http://127.0.0.1:5175')

/** City time used for date-only bookings, digests and contract reminders. */
export const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE ?? 'America/Chicago'

/** Retention windows for operational logs (business records are not pruned). */
export const AUDIT_RETENTION_DAYS = Number.parseInt(process.env.AUDIT_RETENTION_DAYS ?? '365', 10)
export const EMAIL_LOG_RETENTION_DAYS = Number.parseInt(
  process.env.EMAIL_LOG_RETENTION_DAYS ?? '180',
  10,
)
