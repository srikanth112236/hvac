import { z } from 'zod'

/* -------------------------------------------------------------------------- */
/*  Newsletters                                                               */
/* -------------------------------------------------------------------------- */

export const NEWSLETTER_STATUSES = ['draft', 'scheduled', 'sending', 'paused', 'sent'] as const
export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number]

export const NEWSLETTER_AUDIENCES = [
  'all',
  'portal',
  'open-balance',
  'prospects',
  'selected',
] as const
export type NewsletterAudience = (typeof NEWSLETTER_AUDIENCES)[number]

export const NEWSLETTER_RECURRENCE_KINDS = ['daily', 'weekly', 'monthly'] as const
export type NewsletterRecurrenceKind = (typeof NEWSLETTER_RECURRENCE_KINDS)[number]
export const NEWSLETTER_MONTHLY_MODES = ['day-of-month', 'nth-weekday'] as const
export type NewsletterMonthlyMode = (typeof NEWSLETTER_MONTHLY_MODES)[number]

export interface NewsletterRecurrence {
  kind: NewsletterRecurrenceKind
  /** Every N days, weeks or months. */
  interval: number
  /** 0 Sunday through 6 Saturday, used by weekly schedules. */
  weekdays: number[]
  monthlyMode: NewsletterMonthlyMode
  dayOfMonth?: number | null
  /** 0 Sunday through 6 Saturday, used by nth-weekday monthly schedules. */
  weekday?: number | null
  /** 1-4, or -1 for the last occurrence in the month. */
  weekOfMonth?: number | null
  endAt?: string | null
}

export interface NewsletterSuppression {
  email: string
  name: string
  reason: string
  source: 'signup' | 'preference'
}

export const newsletterAudienceLabel: Record<NewsletterAudience, string> = {
  all: 'Everyone reachable',
  portal: 'Portal accounts',
  'open-balance': 'Customers with an open balance',
  prospects: 'Prospects & enquiries',
  selected: 'Selected customers',
}

export interface NewsletterRecord {
  id: string
  subject: string
  preheader: string
  fromName: string
  replyTo: string
  /** Sanitised-by-author rich text, stored as HTML from the composer. */
  html: string
  audience: NewsletterAudience
  /** Recipient snapshot resolved when the campaign is scheduled or sent. */
  recipients: string[]
  /** Delivery throttle: recipients per minute. */
  perMinute: number
  /** Optional rolling caps. Missing values are treated as unlimited. */
  perHour?: number
  perDay?: number
  hourSent?: number
  daySent?: number
  hourWindowAt?: string | null
  dayWindowAt?: string | null
  /** Manual override for unsubscribed addresses. */
  overrideSuppression?: boolean
  suppressedCount?: number
  /** Recurring series metadata. One-shot campaigns omit this. */
  recurrence?: NewsletterRecurrence | null
  seriesId?: string | null
  parentId?: string | null
  runNumber?: number
  runCount?: number
  lastRunAt?: string | null
  status: NewsletterStatus
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  lastTickAt: string | null
  sentCount: number
  failedCount: number
  createdAt: string
  updatedAt: string
}

export interface NewsletterSummary {
  draft: number
  scheduled: number
  sending: number
  sent: number
  reach: number
  delivered: number
  count: number
}

export interface NewsletterAudienceFeed {
  counts: Record<string, number>
  customers: { name: string; email: string; suppressed?: boolean; reason?: string }[]
  suppressed: NewsletterSuppression[]
  suppressedCount: number
}

export const newsletterStatusLabel: Record<NewsletterStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  paused: 'Paused',
  sent: 'Sent',
}

export const newsletterRecurrenceSchema = z.object({
  kind: z.enum(NEWSLETTER_RECURRENCE_KINDS),
  interval: z.number().int().min(1).max(12).default(1),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  monthlyMode: z.enum(NEWSLETTER_MONTHLY_MODES).default('day-of-month'),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  weekOfMonth: z
    .number()
    .int()
    .refine((value) => value === -1 || (value >= 1 && value <= 4), 'Choose week 1-4 or last')
    .nullable()
    .optional(),
  endAt: z.string().trim().max(40).nullable().optional(),
})

export const newsletterInputSchema = z.object({
  subject: z.string().trim().min(3, 'Give the campaign a subject').max(160),
  preheader: z.string().trim().max(220).default(''),
  fromName: z.string().trim().max(120).default('Coolvane HVAC'),
  replyTo: z.string().trim().email().or(z.literal('')).default(''),
  html: z
    .string()
    .min(1, 'The campaign body is empty')
    .max(200_000, 'Keep the body under 200,000 characters'),
  audience: z.enum(NEWSLETTER_AUDIENCES).default('all'),
  recipients: z.array(z.string().trim().email()).max(5000).default([]),
  perMinute: z.number().int().min(1).max(600).default(60),
  perHour: z.number().int().min(1).max(50_000).default(1800),
  perDay: z.number().int().min(1).max(200_000).default(20_000),
  overrideSuppression: z.boolean().default(false),
  recurrence: newsletterRecurrenceSchema.nullable().optional(),
  scheduledAt: z.string().trim().max(40).nullable().optional(),
})
export const newsletterPatchSchema = newsletterInputSchema.partial()
export type NewsletterInput = z.infer<typeof newsletterInputSchema>
export type NewsletterPatch = z.infer<typeof newsletterPatchSchema>

export const newsletterScheduleSchema = z.object({
  scheduledAt: z.string().trim().min(4).max(40),
})
export type NewsletterScheduleInput = z.infer<typeof newsletterScheduleSchema>

/** Full, inline-styled HTML document for preview, download and delivery. */
export function newsletterEmailDocument(record: {
  subject: string
  preheader: string
  fromName: string
  html: string
  preferencesUrl?: string
}): string {
  const preheader = record.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(record.preheader)}</div>`
    : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(record.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif;color:#12161a">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:28px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fffdf8;border:1px solid #e2dccf">
<tr><td style="padding:22px 30px;border-bottom:1px solid #e2dccf">
<span style="font:600 12px/1.2 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#12161a">${escapeHtml(record.fromName || 'Coolvane HVAC')}</span>
<span style="float:right;font:400 11px/1.2 Arial,sans-serif;letter-spacing:.08em;color:#6b7480">Dallas · Fort Worth · Plano</span>
</td></tr>
<tr><td style="padding:32px 30px;font-size:16px;line-height:1.65">${record.html}</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #e2dccf;font:400 11px/1.7 Arial,sans-serif;color:#6b7480">
You are receiving this because you are a Coolvane customer. ${
    record.preferencesUrl
      ? `<a href="${escapeHtml(record.preferencesUrl)}" style="color:#12161a">Update email preferences or unsubscribe</a>.`
      : 'Reply to this email to update your preferences.'
  }
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/* -------------------------------------------------------------------------- */
/*  Newsletter signups                                                        */
/* -------------------------------------------------------------------------- */

export interface NewsletterSignup {
  id: string
  email: string
  source: string
  status: 'subscribed' | 'unsubscribed'
  createdAt: string
  updatedAt: string
}

export const newsletterSignupSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(160),
  source: z.string().trim().max(60).default('footer'),
  honeypot: z.string().max(200).optional(),
})
export type NewsletterSignupInput = z.infer<typeof newsletterSignupSchema>

/* -------------------------------------------------------------------------- */
/*  Coupons                                                                   */
/* -------------------------------------------------------------------------- */

export const COUPON_KINDS = ['percent', 'fixed'] as const
export type CouponKind = (typeof COUPON_KINDS)[number]

export const COUPON_STATUSES = ['active', 'scheduled', 'paused', 'expired', 'exhausted'] as const
export type CouponStatus = (typeof COUPON_STATUSES)[number]

export const couponStatusLabel: Record<CouponStatus, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  paused: 'Paused',
  expired: 'Expired',
  exhausted: 'Fully redeemed',
}

export interface CouponRedemption {
  id: string
  email: string
  invoiceRef: string
  amount: number
  at: string
}

export interface CouponRecord {
  id: string
  code: string
  description: string
  kind: CouponKind
  value: number
  minSubtotal: number
  /** 0 means unlimited. */
  maxRedemptions: number
  perCustomerLimit: number
  startsAt: string | null
  expiresAt: string | null
  /** Service id, or "all" for every service line. */
  appliesTo: string
  active: boolean
  redemptions: CouponRedemption[]
  createdAt: string
  updatedAt: string
}

export interface CouponWithStats extends CouponRecord {
  status: CouponStatus
  usageCount: number
  remaining: number | null
  savedTotal: number
}

export interface CouponSummary {
  total: number
  active: number
  scheduled: number
  expired: number
  redemptions: number
  savedTotal: number
}

export const couponInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Use at least 3 characters')
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, hyphen and underscore only'),
  description: z.string().trim().max(200).default(''),
  kind: z.enum(COUPON_KINDS).default('percent'),
  value: z.number().min(0.01).max(100_000),
  minSubtotal: z.number().min(0).max(100_000_000).default(0),
  maxRedemptions: z.number().int().min(0).max(100_000).default(0),
  perCustomerLimit: z.number().int().min(1).max(100).default(1),
  startsAt: z.string().trim().max(40).nullable().optional(),
  expiresAt: z.string().trim().max(40).nullable().optional(),
  appliesTo: z.string().trim().max(80).default('all'),
  active: z.boolean().default(true),
})
export const couponPatchSchema = couponInputSchema.partial()
export type CouponInput = z.infer<typeof couponInputSchema>
export type CouponPatch = z.infer<typeof couponPatchSchema>

export function couponStatus(coupon: CouponRecord, now = Date.now()): CouponStatus {
  if (!coupon.active) return 'paused'
  const start = coupon.startsAt ? Date.parse(coupon.startsAt) : NaN
  if (Number.isFinite(start) && start > now) return 'scheduled'
  const end = coupon.expiresAt ? Date.parse(coupon.expiresAt) : NaN
  if (Number.isFinite(end) && end < now) return 'expired'
  if (coupon.maxRedemptions > 0 && coupon.redemptions.length >= coupon.maxRedemptions) {
    return 'exhausted'
  }
  return 'active'
}

export function couponDiscount(coupon: CouponRecord, subtotal: number): number {
  if (subtotal <= 0) return 0
  if (coupon.kind === 'percent') {
    const capped = Math.min(100, Math.max(0, coupon.value))
    return Math.round(subtotal * (capped / 100) * 100) / 100
  }
  return Math.round(Math.min(subtotal, Math.max(0, coupon.value)) * 100) / 100
}

export function couponValueLabel(coupon: Pick<CouponRecord, 'kind' | 'value'>): string {
  return coupon.kind === 'percent'
    ? `${Math.round(coupon.value * 100) / 100}% off`
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(coupon.value) + ' off'
}
