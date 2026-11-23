import { randomUUID } from 'node:crypto'
import { Router, type Response } from 'express'
import {
  couponInputSchema,
  couponPatchSchema,
  couponStatus,
  invoiceTotals,
  newsletterInputSchema,
  newsletterPatchSchema,
  newsletterScheduleSchema,
  newsletterEmailDocument,
  type CouponRecord,
  type CouponSummary,
  type CouponWithStats,
  type NewsletterRecurrence,
  type NewsletterRecord,
  type NewsletterSummary,
  type NewsletterSuppression,
} from '@hvac/shared'
import { requireAdmin, requireAdminMutation, requirePermission } from './auth.js'
import { invoiceStore } from './business.js'
import { leadStore } from './leads.js'
import { customerStore } from './portalAuth.js'
import { preferenceStore } from './customerPreferences.js'
import { createStore } from './store.js'
import { BUSINESS_TIMEZONE, mailerConfigured, PUBLIC_SITE_URL } from './config.js'
import { sendMail } from './mailer.js'
import { readNewsletterSignups, readSubscribedSignups } from './newsletterSignups.js'
import { sanitizeNewsletterHtml } from './sanitize.js'
import { zonedParts, zonedTimeToUtc } from './time.js'

/* -------------------------------------------------------------------------- */
/*  Demo seed                                                                 */
/* -------------------------------------------------------------------------- */

function seedNewsletters(): NewsletterRecord[] {
  const now = Date.now()
  const sentAt = new Date(now - 6 * 86_400_000).toISOString()
  const recipients = [
    'facilities@meridianoffices.example',
    'ops@northlinelabs.example',
    'admin@northparkgalleria.example',
  ]
  return [
    {
      id: randomUUID(),
      subject: 'Cold snap readiness: the 15-minute pre-check',
      preheader: 'Three checks before the first hard freeze of the season.',
      fromName: 'Coolvane HVAC',
      replyTo: 'works@coolvane.example',
      html: `<h2 style="margin:0 0 14px;font-size:22px;line-height:1.25">Before the first freeze</h2>
<p style="margin:0 0 14px">A hard freeze rarely breaks a system that was serviced in autumn. It breaks the one thing nobody looked at: a condensate line with no heat trace, a rooftop unit with a failed crankcase heater, or a filter loaded since July.</p>
<p style="margin:0 0 14px"><strong>Fifteen minutes, three checks:</strong></p>
<ul style="margin:0 0 16px;padding-left:20px">
<li style="margin-bottom:6px">Crankcase heater warm to the touch before the compressor starts.</li>
<li style="margin-bottom:6px">Condensate trap clear and heat trace energised.</li>
<li style="margin-bottom:6px">Filter pressure drop inside the housing schedule.</li>
</ul>
<p style="margin:0 0 18px">If any of the three is off, reply to this email and we will book a winter visit. Existing AMC customers are covered at no extra charge.</p>
<p style="margin:0"><strong>— The Coolvane service desk</strong><br><span style="color:#6b7480;font-size:13px">Dallas · Fort Worth · Plano · 24 × 7 dispatch</span></p>`,
      audience: 'portal',
      recipients,
      perMinute: 60,
      status: 'draft',
      scheduledAt: null,
      startedAt: null,
      completedAt: null,
      lastTickAt: null,
      sentCount: 0,
      failedCount: 0,
      createdAt: sentAt,
      updatedAt: sentAt,
    },
    {
      id: randomUUID(),
      subject: 'Spring coil cleaning: why the first hot week decides the summer',
      preheader: 'A dirty coil costs more than the clean.',
      fromName: 'Coolvane HVAC',
      replyTo: 'works@coolvane.example',
      html: `<h2 style="margin:0 0 14px;font-size:22px;line-height:1.25">The first hot week</h2>
<p style="margin:0 0 14px">Every year the same pattern: the first 100 °F week arrives, and half the callouts trace back to a coil that lost 15% of its capacity in March.</p>
<p style="margin:0">This draft is waiting on the spring schedule. Open it, finish the copy, and choose an audience.</p>`,
      audience: 'all',
      recipients: [],
      perMinute: 30,
      status: 'draft',
      scheduledAt: null,
      startedAt: null,
      completedAt: null,
      lastTickAt: null,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(now - 2 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 2 * 86_400_000).toISOString(),
    },
  ]
}

function seedCoupons(): CouponRecord[] {
  const now = Date.now()
  const created = new Date(now - 20 * 86_400_000).toISOString()
  return [
    {
      id: randomUUID(),
      code: 'WINTER15',
      description: '15% off a winter tune-up, booked before the first freeze.',
      kind: 'percent',
      value: 15,
      minSubtotal: 250,
      maxRedemptions: 200,
      perCustomerLimit: 1,
      startsAt: null,
      expiresAt: new Date(now + 45 * 86_400_000).toISOString(),
      appliesTo: 'all',
      active: true,
      redemptions: [
        {
          id: randomUUID(),
          email: 'facilities@meridianoffices.example',
          invoiceRef: 'INV-2026-0104',
          amount: 96,
          at: new Date(now - 4 * 86_400_000).toISOString(),
        },
      ],
      createdAt: created,
      updatedAt: created,
    },
    {
      id: randomUUID(),
      code: 'FIRSTVISIT',
      description: 'First diagnostic visit waived on a new service account.',
      kind: 'fixed',
      value: 89,
      minSubtotal: 0,
      maxRedemptions: 100,
      perCustomerLimit: 1,
      startsAt: null,
      expiresAt: null,
      appliesTo: 'all',
      active: true,
      redemptions: [],
      createdAt: created,
      updatedAt: created,
    },
    {
      id: randomUUID(),
      code: 'AMC2025',
      description: 'Legacy annual-plan credit, closed at the end of last year.',
      kind: 'fixed',
      value: 150,
      minSubtotal: 500,
      maxRedemptions: 50,
      perCustomerLimit: 1,
      startsAt: null,
      expiresAt: new Date(now - 30 * 86_400_000).toISOString(),
      appliesTo: 'all',
      active: true,
      redemptions: [],
      createdAt: created,
      updatedAt: created,
    },
  ]
}

/* -------------------------------------------------------------------------- */
/*  Stores                                                                    */
/* -------------------------------------------------------------------------- */

export const newsletterStore = createStore<NewsletterRecord[]>('newsletters.json', seedNewsletters)
export const couponStore = createStore<CouponRecord[]>('coupons.json', seedCoupons)
let queueChain: Promise<void> = Promise.resolve()

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function nowIso(): string {
  return new Date().toISOString()
}

function validationError(res: Response, message: string): void {
  res.status(400).json({ error: { code: 'validation_error', message } })
}

function normalizeEmails(values: string[]): string[] {
  const seen = new Set<string>()
  for (const value of values) {
    const email = value.trim().toLowerCase()
    if (email.includes('@')) seen.add(email)
  }
  return [...seen]
}

async function readSuppressionList(): Promise<NewsletterSuppression[]> {
  const [signups, customers, preferences] = await Promise.all([
    readNewsletterSignups(),
    customerStore.read(),
    preferenceStore.read(),
  ])
  const suppressed = new Map<string, NewsletterSuppression>()
  for (const signup of signups) {
    if (signup.status !== 'unsubscribed') continue
    suppressed.set(signup.email, {
      email: signup.email,
      name: signup.email,
      reason: 'Unsubscribed from the mailing list',
      source: 'signup',
    })
  }
  for (const customer of customers) {
    if (preferences[customer.id]?.emailMarketing !== false) continue
    const email = customer.email.trim().toLowerCase()
    const existing = suppressed.get(email)
    suppressed.set(email, {
      email,
      name: customer.name || email,
      reason: existing
        ? `${existing.reason}; marketing email disabled`
        : 'Marketing email disabled',
      source: existing?.source ?? 'preference',
    })
  }
  return [...suppressed.values()].sort((a, b) => a.email.localeCompare(b.email))
}

export function applySuppression(
  emails: string[],
  suppression: NewsletterSuppression[],
  override: boolean,
): { recipients: string[]; suppressedCount: number } {
  const blocked = new Set(suppression.map((entry) => entry.email))
  const suppressedCount = emails.filter((email) => blocked.has(email)).length
  return {
    recipients: override ? emails : emails.filter((email) => !blocked.has(email)),
    suppressedCount,
  }
}

async function resolveRecipients(
  audience: NewsletterRecord['audience'],
  selected: string[],
  override: boolean,
): Promise<{
  recipients: string[]
  suppressedCount: number
  suppression: NewsletterSuppression[]
}> {
  const suppression = await readSuppressionList()
  const raw = audience === 'selected' ? normalizeEmails(selected) : await audienceEmails(audience)
  const filtered = applySuppression(raw, suppression, override)
  return { ...filtered, suppression }
}

const DAY_MS = 86_400_000

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  nth: number,
): number | null {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  if (nth === -1) {
    const last = new Date(Date.UTC(year, month, lastDay))
    return lastDay - ((last.getUTCDay() - weekday + 7) % 7)
  }
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7
  return day <= lastDay ? day : null
}

/**
 * Next occurrence after `afterMs`, anchored to the original scheduled time so
 * a daily/monthly interval never drifts if the tick was delayed.
 */
export function nextRecurringOccurrence(
  recurrence: NewsletterRecurrence,
  anchorIso: string,
  afterMs: number,
): string | null {
  const anchor = Date.parse(anchorIso)
  if (!Number.isFinite(anchor)) return null
  const anchorParts = zonedParts(anchor, BUSINESS_TIMEZONE)
  const afterParts = zonedParts(afterMs, BUSINESS_TIMEZONE)
  const anchorDay = Date.UTC(anchorParts.year, anchorParts.month - 1, anchorParts.day)
  const anchorWeekday = new Date(anchorDay).getUTCDay()
  const anchorWeekStart = anchorDay - anchorWeekday * DAY_MS
  const afterDay = Date.UTC(afterParts.year, afterParts.month - 1, afterParts.day)
  const endAt = recurrence.endAt ? Date.parse(recurrence.endAt) : null
  const interval = Math.max(1, recurrence.interval || 1)
  let cursor = Math.max(anchorDay, afterDay)

  for (let index = 0; index < 7300; index += 1) {
    cursor += DAY_MS
    const date = new Date(cursor)
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const day = date.getUTCDate()
    const weekday = date.getUTCDay()

    if (recurrence.kind === 'daily') {
      const dayDiff = Math.round((cursor - anchorDay) / DAY_MS)
      if (dayDiff % interval !== 0) continue
    } else if (recurrence.kind === 'weekly') {
      if (!recurrence.weekdays.includes(weekday)) continue
      const weekDiff = Math.floor((cursor - anchorWeekStart) / (7 * DAY_MS))
      if (weekDiff % interval !== 0) continue
    } else {
      const monthDiff = (year - anchorParts.year) * 12 + (month - (anchorParts.month - 1))
      if (monthDiff <= 0 || monthDiff % interval !== 0) continue
      if (recurrence.monthlyMode === 'day-of-month') {
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
        const target = Math.min(lastDay, Math.max(1, recurrence.dayOfMonth ?? anchorParts.day))
        if (day !== target) continue
      } else {
        if (recurrence.weekday === null || recurrence.weekday === undefined) continue
        const target = nthWeekdayOfMonth(
          year,
          month,
          recurrence.weekday,
          recurrence.weekOfMonth ?? 1,
        )
        if (target === null || day !== target) continue
      }
    }

    const iso = zonedTimeToUtc(
      `${year}-${pad2(month + 1)}-${pad2(day)}`,
      anchorParts.hour,
      BUSINESS_TIMEZONE,
      anchorParts.minute,
    )?.toISOString()
    if (!iso || Date.parse(iso) <= afterMs) continue
    if (endAt !== null && Number.isFinite(endAt) && Date.parse(iso) > endAt) return null
    return iso
  }
  return null
}

const SCHEDULE_LOCK_MS = 5 * 60_000

function scheduleLocked(record: NewsletterRecord, now = Date.now()): boolean {
  if (record.status !== 'scheduled' || !record.scheduledAt) return false
  const at = Date.parse(record.scheduledAt)
  return Number.isFinite(at) && at - now <= SCHEDULE_LOCK_MS
}

async function audienceEmails(audience: NewsletterRecord['audience']): Promise<string[]> {
  const [customers, invoices, leads, signups] = await Promise.all([
    customerStore.read(),
    invoiceStore.read(),
    leadStore.read(),
    readSubscribedSignups(),
  ])
  const subscribers = signups.map((signup) => signup.email)
  if (audience === 'portal') return normalizeEmails(customers.map((customer) => customer.email))
  if (audience === 'prospects') {
    return normalizeEmails([...leads.map((lead) => lead.email), ...subscribers])
  }
  if (audience === 'open-balance') {
    return normalizeEmails(
      invoices
        .filter((invoice) => invoiceTotals(invoice).balance > 0)
        .map((invoice) => invoice.customerEmail),
    )
  }
  return normalizeEmails([
    ...customers.map((customer) => customer.email),
    ...invoices.map((invoice) => invoice.customerEmail),
    ...leads.map((lead) => lead.email),
    ...subscribers,
  ])
}

/**
 * The delivery queue is advanced lazily: each read moves a sending campaign
 * forward by however many recipients the throttle allows for the elapsed time.
 * No background timer is needed, and progress survives a server restart.
 * Every recipient is a real provider call; `sentCount`/`failedCount` reflect
 * what the provider accepted, never a guess.
 */
async function sendBatch(record: NewsletterRecord, now: number): Promise<NewsletterRecord> {
  const total = record.recipients.length
  const iso = new Date(now).toISOString()
  if (total === 0) {
    return { ...record, status: 'sent', completedAt: iso, lastTickAt: iso, updatedAt: iso }
  }
  const anchor = Date.parse(record.lastTickAt ?? record.startedAt ?? '')
  const elapsed = Number.isFinite(anchor) ? Math.max(0, now - anchor) : 0
  const minuteDue = Math.floor((elapsed / 60_000) * record.perMinute)
  const hourAnchor = record.hourWindowAt ? Date.parse(record.hourWindowAt) : NaN
  const dayAnchor = record.dayWindowAt ? Date.parse(record.dayWindowAt) : NaN
  const resetHour = !Number.isFinite(hourAnchor) || now - hourAnchor >= 3_600_000
  const resetDay = !Number.isFinite(dayAnchor) || now - dayAnchor >= DAY_MS
  const hourSent = resetHour ? 0 : (record.hourSent ?? 0)
  const daySent = resetDay ? 0 : (record.daySent ?? 0)
  const hourCap =
    record.perHour && record.perHour > 0 ? Math.max(0, record.perHour - hourSent) : Infinity
  const dayCap =
    record.perDay && record.perDay > 0 ? Math.max(0, record.perDay - daySent) : Infinity
  const due = Math.max(0, Math.min(minuteDue, hourCap, dayCap))
  if (due <= 0) return record
  // sentCount counts deliveries; failedCount counts attempts that failed.
  // The cursor is the sum, so a failure never causes the next batch to skip
  // recipients or send the same address twice.
  const cursor = record.sentCount + record.failedCount
  const batch = record.recipients.slice(cursor, cursor + due)
  if (batch.length === 0) {
    return { ...record, status: 'sent', completedAt: iso, lastTickAt: iso, updatedAt: iso }
  }

  const document = newsletterEmailDocument({
    ...record,
    html: sanitizeNewsletterHtml(record.html),
    preferencesUrl: PUBLIC_SITE_URL ? `${PUBLIC_SITE_URL.replace(/\/+$/, '')}/portal` : undefined,
  })
  let sent = 0
  let failed = 0
  for (const to of batch) {
    const result = await sendMail({
      to,
      subject: record.subject,
      html: document,
      kind: 'newsletter',
      replyTo: record.replyTo || undefined,
    })
    if (result.ok) sent += 1
    else failed += 1
  }

  const sentCount = record.sentCount + sent
  const failedCount = record.failedCount + failed
  const complete = sentCount + failedCount >= total
  return {
    ...record,
    sentCount,
    failedCount,
    hourSent: hourSent + sent + failed,
    daySent: daySent + sent + failed,
    hourWindowAt: resetHour ? iso : (record.hourWindowAt ?? iso),
    dayWindowAt: resetDay ? iso : (record.dayWindowAt ?? iso),
    lastTickAt: iso,
    status: complete ? 'sent' : 'sending',
    completedAt: complete ? iso : null,
    updatedAt: iso,
  }
}

async function advanceQueue(
  records: NewsletterRecord[],
  now: number,
): Promise<{ records: NewsletterRecord[]; changed: boolean }> {
  // Without a provider nothing may move: a campaign must never look delivered
  // when no email left the building.
  if (!mailerConfigured()) return { records, changed: false }
  let changed = false
  const next: NewsletterRecord[] = []
  for (const record of records) {
    if (record.status === 'scheduled' && record.scheduledAt) {
      const at = Date.parse(record.scheduledAt)
      if (!Number.isFinite(at) || at > now) {
        next.push(record)
        continue
      }
      changed = true
      const iso = new Date(now).toISOString()
      if (record.recurrence) {
        const nextAt = nextRecurringOccurrence(record.recurrence, record.scheduledAt, now)
        const runNumber = (record.runCount ?? 0) + 1
        const template: NewsletterRecord = {
          ...record,
          status: nextAt ? 'scheduled' : 'sent',
          scheduledAt: nextAt,
          runCount: runNumber,
          lastRunAt: iso,
          completedAt: nextAt ? null : iso,
          updatedAt: iso,
        }
        const run: NewsletterRecord = {
          ...record,
          id: randomUUID(),
          parentId: record.id,
          seriesId: record.seriesId ?? record.id,
          runNumber,
          recurrence: null,
          status: 'sending',
          scheduledAt: null,
          startedAt: iso,
          lastTickAt: iso,
          completedAt: null,
          sentCount: 0,
          failedCount: 0,
          hourSent: 0,
          daySent: 0,
          hourWindowAt: iso,
          dayWindowAt: iso,
          updatedAt: iso,
        }
        next.push(template, await sendBatch(run, now))
        continue
      }
      next.push(
        await sendBatch(
          {
            ...record,
            status: 'sending',
            startedAt: iso,
            lastTickAt: iso,
            sentCount: 0,
            failedCount: 0,
            hourSent: 0,
            daySent: 0,
            hourWindowAt: iso,
            dayWindowAt: iso,
            completedAt: null,
            updatedAt: iso,
          },
          now,
        ),
      )
      continue
    }
    if (record.status !== 'sending') {
      next.push(record)
      continue
    }
    const advanced = await sendBatch(record, now)
    if (advanced !== record) changed = true
    next.push(advanced)
  }
  return { records: next, changed }
}

function summarizeNewsletters(records: NewsletterRecord[]): NewsletterSummary {
  let draft = 0
  let scheduled = 0
  let sending = 0
  let sent = 0
  let reach = 0
  let delivered = 0
  for (const record of records) {
    if (record.status === 'draft') draft += 1
    if (record.status === 'scheduled') {
      scheduled += 1
      reach += record.recipients.length
    }
    if (record.status === 'sending') {
      sending += 1
      reach += record.recipients.length
    }
    if (record.status === 'sent') {
      sent += 1
      delivered += record.sentCount
    }
  }
  return { draft, scheduled, sending, sent, reach, delivered, count: records.length }
}

function couponView(coupon: CouponRecord, now = Date.now()): CouponWithStats {
  const usageCount = coupon.redemptions.length
  return {
    ...coupon,
    status: couponStatus(coupon, now),
    usageCount,
    remaining: coupon.maxRedemptions > 0 ? Math.max(0, coupon.maxRedemptions - usageCount) : null,
    savedTotal:
      Math.round(coupon.redemptions.reduce((sum, entry) => sum + entry.amount, 0) * 100) / 100,
  }
}

function summarizeCoupons(records: CouponRecord[], now = Date.now()): CouponSummary {
  const summary: CouponSummary = {
    total: records.length,
    active: 0,
    scheduled: 0,
    expired: 0,
    redemptions: 0,
    savedTotal: 0,
  }
  for (const record of records) {
    const status = couponStatus(record, now)
    if (status === 'active') summary.active += 1
    if (status === 'scheduled') summary.scheduled += 1
    if (status === 'expired' || status === 'exhausted') summary.expired += 1
    summary.redemptions += record.redemptions.length
    summary.savedTotal += record.redemptions.reduce((sum, entry) => sum + entry.amount, 0)
  }
  summary.savedTotal = Math.round(summary.savedTotal * 100) / 100
  return summary
}

export const marketingRouter = Router()

marketingRouter.use(requireAdmin, requirePermission('marketing.write'), requireAdminMutation)

/* -------------------------------------------------------------------------- */
/*  Newsletters                                                               */
/* -------------------------------------------------------------------------- */

async function readQueue(): Promise<NewsletterRecord[]> {
  // The queue sends real email. Serialise advancement so two open tabs (or the
  // five-second poll) can never send the same recipient twice.
  const task = async () => {
    const stored = await newsletterStore.read()
    const { records, changed } = await advanceQueue(stored, Date.now())
    if (changed) await newsletterStore.write(records)
    return records
  }
  const run = queueChain.then(task, task)
  queueChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/**
 * Background tick for scheduled campaigns and throttled sends. The lazy queue
 * still works during a request, but a scheduled campaign must start even when
 * no admin has the newsletters page open.
 */
export async function tickNewsletters(): Promise<void> {
  if (!mailerConfigured()) return
  try {
    await readQueue()
  } catch (error) {
    console.error('[hvac-api] newsletter queue tick failed', error)
  }
}

marketingRouter.get('/newsletters', async (_req, res) => {
  const records = await readQueue()
  res.json({
    data: [...records].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    summary: summarizeNewsletters(records),
  })
})

marketingRouter.get('/newsletters/audiences', async (_req, res) => {
  const [rawAll, rawPortal, rawOpenBalance, rawProspects, customers, leads, suppression] =
    await Promise.all([
      audienceEmails('all'),
      audienceEmails('portal'),
      audienceEmails('open-balance'),
      audienceEmails('prospects'),
      customerStore.read(),
      leadStore.read(),
      readSuppressionList(),
    ])
  const suppressionByEmail = new Map(suppression.map((entry) => [entry.email, entry]))
  const eligible = (emails: string[]) =>
    emails.filter((email) => !suppressionByEmail.has(email)).length
  res.json({
    data: {
      counts: {
        all: eligible(rawAll),
        portal: eligible(rawPortal),
        'open-balance': eligible(rawOpenBalance),
        prospects: eligible(rawProspects),
      },
      customers: [
        ...customers.map((customer) => {
          const email = customer.email.trim().toLowerCase()
          const blocked = suppressionByEmail.get(email)
          return {
            name: customer.name,
            email,
            suppressed: Boolean(blocked),
            reason: blocked?.reason,
          }
        }),
        ...leads
          .filter((lead) => lead.email)
          .map((lead) => {
            const email = lead.email.trim().toLowerCase()
            const blocked = suppressionByEmail.get(email)
            return {
              name: `${lead.name || 'Enquiry'} - prospect`,
              email,
              suppressed: Boolean(blocked),
              reason: blocked?.reason,
            }
          }),
      ].sort((a, b) => a.name.localeCompare(b.name)),
      suppressed: suppression,
      suppressedCount: suppression.length,
    },
  })
})

marketingRouter.post('/newsletters', async (req, res) => {
  const parsed = newsletterInputSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues[0]?.message ?? 'Check the campaign details.')
    return
  }
  const resolved = await resolveRecipients(
    parsed.data.audience,
    parsed.data.recipients,
    parsed.data.overrideSuppression,
  )
  const now = nowIso()
  const record: NewsletterRecord = {
    id: randomUUID(),
    subject: parsed.data.subject,
    preheader: parsed.data.preheader,
    fromName: parsed.data.fromName,
    replyTo: parsed.data.replyTo,
    html: sanitizeNewsletterHtml(parsed.data.html),
    audience: parsed.data.audience,
    recipients: resolved.recipients,
    perMinute: parsed.data.perMinute,
    perHour: parsed.data.perHour,
    perDay: parsed.data.perDay,
    overrideSuppression: parsed.data.overrideSuppression,
    suppressedCount: resolved.suppressedCount,
    recurrence: parsed.data.recurrence ?? null,
    seriesId: null,
    parentId: null,
    runNumber: 0,
    runCount: 0,
    lastRunAt: null,
    hourSent: 0,
    daySent: 0,
    hourWindowAt: null,
    dayWindowAt: null,
    status: 'draft',
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    lastTickAt: null,
    sentCount: 0,
    failedCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  const records = await readQueue()
  await newsletterStore.write([record, ...records])
  res.status(201).json({ data: record, summary: summarizeNewsletters([record, ...records]) })
})

marketingRouter.patch('/newsletters/:id', async (req, res) => {
  const parsed = newsletterPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues[0]?.message ?? 'Check the campaign details.')
    return
  }
  const records = await readQueue()
  const index = records.findIndex((record) => record.id === req.params.id)
  if (index < 0) {
    res.status(404).json({ error: { code: 'not_found', message: 'Campaign not found.' } })
    return
  }
  const current = records[index] as NewsletterRecord
  if (current.status === 'sending' || current.status === 'sent') {
    res.status(409).json({
      error: { code: 'locked', message: 'A campaign that is sending or sent cannot be edited.' },
    })
    return
  }
  if (scheduleLocked(current)) {
    res.status(409).json({
      error: {
        code: 'schedule_locked',
        message:
          'This campaign is inside the five-minute send lock. Pause or delete it before the lock window.',
      },
    })
    return
  }
  const audience = parsed.data.audience ?? current.audience
  const override = parsed.data.overrideSuppression ?? current.overrideSuppression ?? false
  const resolved = await resolveRecipients(
    audience,
    parsed.data.recipients ?? current.recipients,
    override,
  )
  const preserveSchedule = current.status === 'scheduled' && Boolean(current.scheduledAt)
  const updated: NewsletterRecord = {
    ...current,
    ...parsed.data,
    html: parsed.data.html ? sanitizeNewsletterHtml(parsed.data.html) : current.html,
    audience,
    recipients: resolved.recipients,
    overrideSuppression: override,
    suppressedCount: resolved.suppressedCount,
    recurrence:
      parsed.data.recurrence !== undefined ? parsed.data.recurrence : (current.recurrence ?? null),
    perHour: parsed.data.perHour ?? current.perHour,
    perDay: parsed.data.perDay ?? current.perDay,
    status: preserveSchedule ? 'scheduled' : 'draft',
    scheduledAt: preserveSchedule ? current.scheduledAt : null,
    updatedAt: nowIso(),
  }
  const next = [...records]
  next[index] = updated
  await newsletterStore.write(next)
  res.json({ data: updated, summary: summarizeNewsletters(next) })
})

marketingRouter.post('/newsletters/:id/send', async (req, res) => {
  if (!mailerConfigured()) {
    res.status(503).json({
      error: {
        code: 'mail_unconfigured',
        message:
          'No email provider is configured. Set RESEND_API_KEY or MAIL_WEBHOOK_URL before sending.',
      },
    })
    return
  }
  const records = await readQueue()
  const index = records.findIndex((record) => record.id === req.params.id)
  if (index < 0) {
    res.status(404).json({ error: { code: 'not_found', message: 'Campaign not found.' } })
    return
  }
  const current = records[index] as NewsletterRecord
  if (current.status === 'sending') {
    res.status(409).json({
      error: { code: 'already_sending', message: 'This campaign is already in the queue.' },
    })
    return
  }
  if (current.status === 'sent') {
    res
      .status(409)
      .json({ error: { code: 'already_sent', message: 'This campaign was already delivered.' } })
    return
  }
  const rawRecipients = current.recipients.length
    ? current.recipients
    : current.audience === 'selected'
      ? []
      : await audienceEmails(current.audience)
  const suppression = await readSuppressionList()
  const resolved = applySuppression(
    rawRecipients,
    suppression,
    current.overrideSuppression ?? false,
  )
  const recipients = resolved.recipients
  if (recipients.length === 0) {
    validationError(
      res,
      'This audience has no sendable email addresses. Choose another audience or review suppression.',
    )
    return
  }
  const iso = nowIso()
  const updated: NewsletterRecord = {
    ...current,
    recipients,
    suppressedCount: resolved.suppressedCount,
    status: 'sending',
    scheduledAt: null,
    recurrence: null,
    seriesId: null,
    runNumber: 0,
    runCount: 0,
    lastRunAt: null,
    startedAt: iso,
    lastTickAt: iso,
    hourSent: 0,
    daySent: 0,
    hourWindowAt: iso,
    dayWindowAt: iso,
    completedAt: null,
    sentCount: 0,
    failedCount: 0,
    updatedAt: iso,
  }
  const next = [...records]
  next[index] = updated
  await newsletterStore.write(next)
  res.json({ data: updated, summary: summarizeNewsletters(next) })
})

marketingRouter.post('/newsletters/:id/schedule', async (req, res) => {
  if (!mailerConfigured()) {
    res.status(503).json({
      error: {
        code: 'mail_unconfigured',
        message:
          'No email provider is configured. Set RESEND_API_KEY or MAIL_WEBHOOK_URL before scheduling.',
      },
    })
    return
  }
  const parsed = newsletterScheduleSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, 'Choose a valid send time.')
    return
  }
  const at = Date.parse(parsed.data.scheduledAt)
  if (!Number.isFinite(at)) {
    validationError(res, 'Choose a valid send time.')
    return
  }
  if (at <= Date.now()) {
    validationError(res, 'The scheduled time has already passed. Pick a later slot.')
    return
  }
  const records = await readQueue()
  const index = records.findIndex((record) => record.id === req.params.id)
  if (index < 0) {
    res.status(404).json({ error: { code: 'not_found', message: 'Campaign not found.' } })
    return
  }
  const current = records[index] as NewsletterRecord
  if (current.status === 'sending' || current.status === 'sent') {
    res.status(409).json({ error: { code: 'locked', message: 'This campaign is already moving.' } })
    return
  }
  if (scheduleLocked(current)) {
    res.status(409).json({
      error: {
        code: 'schedule_locked',
        message: 'This campaign is inside the five-minute send lock and cannot be rescheduled.',
      },
    })
    return
  }
  const recurrence = current.recurrence ?? null
  if (recurrence) {
    if (
      (recurrence.kind === 'weekly' && recurrence.weekdays.length === 0) ||
      (recurrence.kind === 'monthly' &&
        recurrence.monthlyMode === 'day-of-month' &&
        !recurrence.dayOfMonth) ||
      (recurrence.kind === 'monthly' &&
        recurrence.monthlyMode === 'nth-weekday' &&
        (recurrence.weekday === null ||
          recurrence.weekday === undefined ||
          !recurrence.weekOfMonth))
    ) {
      validationError(res, 'Choose the repeat day for this schedule.')
      return
    }
    if (recurrence.endAt) {
      const end = Date.parse(recurrence.endAt)
      if (!Number.isFinite(end) || end <= at) {
        validationError(res, 'The schedule end date must be after the first send.')
        return
      }
    }
  }
  const rawRecipients = current.recipients.length
    ? current.recipients
    : current.audience === 'selected'
      ? []
      : await audienceEmails(current.audience)
  const suppression = await readSuppressionList()
  const resolved = applySuppression(
    rawRecipients,
    suppression,
    current.overrideSuppression ?? false,
  )
  const recipients = resolved.recipients
  if (recipients.length === 0) {
    validationError(
      res,
      'This audience has no sendable email addresses. Review suppression or choose another audience.',
    )
    return
  }
  const updated: NewsletterRecord = {
    ...current,
    recipients,
    suppressedCount: resolved.suppressedCount,
    status: 'scheduled',
    scheduledAt: new Date(at).toISOString(),
    recurrence,
    seriesId: current.seriesId ?? current.id,
    runNumber: 0,
    runCount: 0,
    lastRunAt: null,
    startedAt: null,
    completedAt: null,
    lastTickAt: null,
    hourSent: 0,
    daySent: 0,
    hourWindowAt: null,
    dayWindowAt: null,
    sentCount: 0,
    failedCount: 0,
    updatedAt: nowIso(),
  }
  const next = [...records]
  next[index] = updated
  await newsletterStore.write(next)
  res.json({ data: updated, summary: summarizeNewsletters(next) })
})

marketingRouter.post('/newsletters/:id/pause', async (req, res) => {
  const records = await readQueue()
  const index = records.findIndex((record) => record.id === req.params.id)
  if (index < 0) {
    res.status(404).json({ error: { code: 'not_found', message: 'Campaign not found.' } })
    return
  }
  const current = records[index] as NewsletterRecord
  if (current.status !== 'sending' && current.status !== 'scheduled') {
    res
      .status(409)
      .json({ error: { code: 'not_running', message: 'Only a queued campaign can be paused.' } })
    return
  }
  if (scheduleLocked(current)) {
    res.status(409).json({
      error: {
        code: 'schedule_locked',
        message: 'This campaign is inside the five-minute send lock and cannot be paused.',
      },
    })
    return
  }
  const updated: NewsletterRecord = {
    ...current,
    status: 'paused',
    scheduledAt: null,
    updatedAt: nowIso(),
  }
  const next = [...records]
  next[index] = updated
  await newsletterStore.write(next)
  res.json({ data: updated, summary: summarizeNewsletters(next) })
})

marketingRouter.post('/newsletters/:id/resume', async (req, res) => {
  const records = await readQueue()
  const index = records.findIndex((record) => record.id === req.params.id)
  if (index < 0) {
    res.status(404).json({ error: { code: 'not_found', message: 'Campaign not found.' } })
    return
  }
  const current = records[index] as NewsletterRecord
  if (current.status !== 'paused') {
    res.status(409).json({ error: { code: 'not_paused', message: 'This campaign is not paused.' } })
    return
  }
  const iso = nowIso()
  const updated: NewsletterRecord = {
    ...current,
    status: 'sending',
    startedAt: current.startedAt ?? iso,
    lastTickAt: iso,
    completedAt: null,
    updatedAt: iso,
  }
  const next = [...records]
  next[index] = updated
  await newsletterStore.write(next)
  res.json({ data: updated, summary: summarizeNewsletters(next) })
})

marketingRouter.post('/newsletters/:id/duplicate', async (req, res) => {
  const records = await readQueue()
  const source = records.find((record) => record.id === req.params.id)
  if (!source) {
    res.status(404).json({ error: { code: 'not_found', message: 'Campaign not found.' } })
    return
  }
  const iso = nowIso()
  const copy: NewsletterRecord = {
    ...source,
    id: randomUUID(),
    subject: `${source.subject} (copy)`,
    status: 'draft',
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    lastTickAt: null,
    sentCount: 0,
    failedCount: 0,
    hourSent: 0,
    daySent: 0,
    hourWindowAt: null,
    dayWindowAt: null,
    seriesId: null,
    parentId: null,
    runNumber: 0,
    runCount: 0,
    lastRunAt: null,
    createdAt: iso,
    updatedAt: iso,
  }
  await newsletterStore.write([copy, ...records])
  res.status(201).json({ data: copy, summary: summarizeNewsletters([copy, ...records]) })
})

marketingRouter.delete('/newsletters/:id', async (req, res) => {
  const records = await readQueue()
  const target = records.find((record) => record.id === req.params.id)
  if (!target) {
    res.status(404).json({ error: { code: 'not_found', message: 'Campaign not found.' } })
    return
  }
  if (target.status === 'sending') {
    res.status(409).json({
      error: { code: 'sending', message: 'Pause the campaign before deleting it.' },
    })
    return
  }
  if (scheduleLocked(target)) {
    res.status(409).json({
      error: {
        code: 'schedule_locked',
        message: 'This campaign is inside the five-minute send lock and cannot be deleted.',
      },
    })
    return
  }
  const next = records.filter((record) => record.id !== req.params.id)
  await newsletterStore.write(next)
  res.json({ data: { deleted: req.params.id }, summary: summarizeNewsletters(next) })
})

/* -------------------------------------------------------------------------- */
/*  Coupons                                                                   */
/* -------------------------------------------------------------------------- */

marketingRouter.get('/coupons', async (_req, res) => {
  const records = await couponStore.read()
  res.json({
    data: [...records]
      .map((record) => couponView(record))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    summary: summarizeCoupons(records),
  })
})

marketingRouter.post('/coupons', async (req, res) => {
  const parsed = couponInputSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues[0]?.message ?? 'Check the coupon details.')
    return
  }
  const records = await couponStore.read()
  const code = parsed.data.code.toUpperCase()
  if (records.some((record) => record.code.toUpperCase() === code)) {
    res.status(409).json({ error: { code: 'duplicate_code', message: `${code} already exists.` } })
    return
  }
  if (parsed.data.kind === 'percent' && parsed.data.value > 100) {
    validationError(res, 'A percentage coupon cannot exceed 100%.')
    return
  }
  const now = nowIso()
  const record: CouponRecord = {
    id: randomUUID(),
    code,
    description: parsed.data.description,
    kind: parsed.data.kind,
    value: parsed.data.value,
    minSubtotal: parsed.data.minSubtotal,
    maxRedemptions: parsed.data.maxRedemptions,
    perCustomerLimit: parsed.data.perCustomerLimit,
    startsAt: parsed.data.startsAt ?? null,
    expiresAt: parsed.data.expiresAt ?? null,
    appliesTo: parsed.data.appliesTo,
    active: parsed.data.active,
    redemptions: [],
    createdAt: now,
    updatedAt: now,
  }
  const next = [record, ...records]
  await couponStore.write(next)
  res.status(201).json({ data: couponView(record), summary: summarizeCoupons(next) })
})

marketingRouter.patch('/coupons/:id', async (req, res) => {
  const parsed = couponPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues[0]?.message ?? 'Check the coupon details.')
    return
  }
  const records = await couponStore.read()
  const index = records.findIndex((record) => record.id === req.params.id)
  if (index < 0) {
    res.status(404).json({ error: { code: 'not_found', message: 'Coupon not found.' } })
    return
  }
  const current = records[index] as CouponRecord
  const code = (parsed.data.code ?? current.code).toUpperCase()
  if (records.some((record) => record.id !== current.id && record.code.toUpperCase() === code)) {
    res.status(409).json({ error: { code: 'duplicate_code', message: `${code} already exists.` } })
    return
  }
  const kind = parsed.data.kind ?? current.kind
  const value = parsed.data.value ?? current.value
  if (kind === 'percent' && value > 100) {
    validationError(res, 'A percentage coupon cannot exceed 100%.')
    return
  }
  const updated: CouponRecord = {
    ...current,
    ...parsed.data,
    code,
    startsAt: parsed.data.startsAt ?? current.startsAt,
    expiresAt: parsed.data.expiresAt ?? current.expiresAt,
    updatedAt: nowIso(),
  }
  const next = [...records]
  next[index] = updated
  await couponStore.write(next)
  res.json({ data: couponView(updated), summary: summarizeCoupons(next) })
})

marketingRouter.delete('/coupons/:id', async (req, res) => {
  const records = await couponStore.read()
  const next = records.filter((record) => record.id !== req.params.id)
  await couponStore.write(next)
  res.json({ data: { deleted: req.params.id }, summary: summarizeCoupons(next) })
})
