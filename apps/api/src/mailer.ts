import { randomUUID } from 'node:crypto'
import { ADMIN_NOTIFY_EMAIL, MAIL_FROM, mailerConfigured } from './config.js'
import { createStore } from './store.js'

/**
 * One mail seam for every event. Resend is used when RESEND_API_KEY is set,
 * otherwise a generic JSON webhook (MAIL_WEBHOOK_URL) is posted to. With
 * neither configured every attempt is logged as `skipped` and callers are told
 * the truth — no feature may report "sent" when nothing left the building.
 */
export type MailStatus = 'sent' | 'skipped' | 'failed'

export interface MailAttachment {
  filename: string
  content: Buffer | string
}

export interface MailInput {
  to: string
  subject: string
  html: string
  kind: string
  replyTo?: string
  attachments?: MailAttachment[]
}

export interface MailResult {
  ok: boolean
  status: MailStatus
  error?: string
}

export interface EmailLogEntry {
  id: string
  at: string
  to: string
  subject: string
  kind: string
  status: MailStatus
  provider: 'resend' | 'webhook' | 'none'
  error: string | null
}

const logStore = createStore<EmailLogEntry[]>('email-log.json', () => [])
const MAX_LOG = 500

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function record(entry: EmailLogEntry): Promise<void> {
  try {
    await logStore.mutate((current) => [entry, ...current].slice(0, MAX_LOG))
  } catch (error) {
    console.error('[hvac-api] could not write the email log', error)
  }
}

export async function sendMail(input: MailInput): Promise<MailResult> {
  const provider = process.env.RESEND_API_KEY
    ? 'resend'
    : process.env.MAIL_WEBHOOK_URL
      ? 'webhook'
      : 'none'
  const base: Omit<EmailLogEntry, 'status' | 'error'> = {
    id: randomUUID(),
    at: new Date().toISOString(),
    to: input.to,
    subject: input.subject,
    kind: input.kind,
    provider,
  }

  if (provider === 'none') {
    await record({ ...base, status: 'skipped', error: 'No email provider configured.' })
    return { ok: false, status: 'skipped', error: 'No email provider configured.' }
  }

  try {
    if (provider === 'resend') {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: MAIL_FROM,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          ...(input.replyTo ? { reply_to: input.replyTo } : {}),
          ...(input.attachments?.length
            ? {
                attachments: input.attachments.map((attachment) => ({
                  filename: attachment.filename,
                  content: Buffer.from(attachment.content).toString('base64'),
                })),
              }
            : {}),
        }),
      })
      if (!response.ok) {
        throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 300)}`)
      }
    } else {
      const response = await fetch(process.env.MAIL_WEBHOOK_URL as string, {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.MAIL_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${process.env.MAIL_WEBHOOK_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          from: MAIL_FROM,
          to: input.to,
          subject: input.subject,
          html: input.html,
          kind: input.kind,
          replyTo: input.replyTo ?? null,
          ...(input.attachments?.length
            ? {
                attachments: input.attachments.map((attachment) => ({
                  filename: attachment.filename,
                  content: Buffer.from(attachment.content).toString('base64'),
                })),
              }
            : {}),
        }),
      })
      if (!response.ok) {
        throw new Error(`Webhook ${response.status}: ${(await response.text()).slice(0, 300)}`)
      }
    }
    await record({ ...base, status: 'sent', error: null })
    return { ok: true, status: 'sent' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The email provider rejected the send.'
    await record({ ...base, status: 'failed', error: message })
    return { ok: false, status: 'failed', error: message }
  }
}

export function mailerStatus(): { configured: boolean; from: string; notify: string } {
  return { configured: mailerConfigured(), from: MAIL_FROM, notify: ADMIN_NOTIFY_EMAIL }
}

export async function readEmailLog(limit = 500): Promise<EmailLogEntry[]> {
  const entries = await logStore.read()
  return entries.slice(0, Math.max(1, Math.min(1000, limit)))
}

export async function pruneEmailLog(days: number): Promise<number> {
  const cutoff = Date.now() - Math.max(1, days) * 86_400_000
  const entries = await logStore.read()
  const next = entries.filter((entry) => Date.parse(entry.at) >= cutoff)
  if (next.length === entries.length) return 0
  await logStore.write(next)
  return entries.length - next.length
}

/* -------------------------------------------------------------------------- */
/*  Templates                                                                  */
/* -------------------------------------------------------------------------- */

const SHELL = (title: string, body: string, footer: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#14181c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 16px">
<tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fffdf8;border:1px solid #e2dccf">
<tr><td style="padding:20px 28px;border-bottom:1px solid #e2dccf;font:600 12px/1.2 Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase">${escapeHtml(footer)}</td></tr>
<tr><td style="padding:30px 28px;font-size:15px;line-height:1.65">${body}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e2dccf;font-size:11px;line-height:1.7;color:#6b7480">${escapeHtml(footer)} · this message was sent because you contacted the works desk.</td></tr>
</table></td></tr></table></body></html>`

export function leadAcknowledgement(input: {
  name: string
  reference: string
  serviceName: string | null
  brand: string
}): { subject: string; html: string } {
  const service = input.serviceName ?? 'your enquiry'
  return {
    subject: `We have your brief · ${input.reference}`,
    html: SHELL(
      `Enquiry ${input.reference}`,
      `<p style="margin:0 0 14px">Hello ${escapeHtml(input.name)},</p>
<p style="margin:0 0 14px">Your brief for <strong>${escapeHtml(service)}</strong> is logged as <strong>${escapeHtml(input.reference)}</strong>. The works desk will reply within one working hour.</p>
<p style="margin:0 0 14px">If this is an emergency, call the dispatch line as well — the form does not replace it.</p>
<p style="margin:0">— ${escapeHtml(input.brand)}</p>`,
      input.brand,
    ),
  }
}

export function leadNotification(input: {
  name: string
  reference: string
  serviceName: string | null
  phone: string
  email: string
  city: string | null
  urgency: string
  message: string
}): { subject: string; html: string } {
  return {
    subject: `New enquiry · ${input.reference}${input.urgency === 'emergency' ? ' · EMERGENCY' : ''}`,
    html: SHELL(
      `New enquiry ${input.reference}`,
      `<p style="margin:0 0 10px"><strong>${escapeHtml(input.name)}</strong> · ${escapeHtml(input.phone)} · ${escapeHtml(input.email)}</p>
<p style="margin:0 0 10px">Service: ${escapeHtml(input.serviceName ?? 'Unallocated')}<br>City: ${escapeHtml(input.city ?? 'Not given')}<br>Urgency: ${escapeHtml(input.urgency)}</p>
<p style="margin:0;white-space:pre-wrap">${escapeHtml(input.message)}</p>`,
      'Works desk',
    ),
  }
}

export function appointmentConfirmation(input: {
  name: string
  reference: string
  serviceName: string
  scheduledAt: string
  window: string
  address: string
  brand: string
}): { subject: string; html: string } {
  return {
    subject: `Visit requested · ${input.reference}`,
    html: SHELL(
      `Visit ${input.reference}`,
      `<p style="margin:0 0 14px">Hello ${escapeHtml(input.name)},</p>
<p style="margin:0 0 14px">Your visit for <strong>${escapeHtml(input.serviceName)}</strong> is requested for <strong>${escapeHtml(input.scheduledAt)}</strong> (${escapeHtml(input.window)} window).</p>
<p style="margin:0 0 14px">Site: ${escapeHtml(input.address)}</p>
<p style="margin:0">The dispatch desk will confirm the engineer. — ${escapeHtml(input.brand)}</p>`,
      input.brand,
    ),
  }
}

export function invoiceIssuedEmail(input: {
  name: string
  reference: string
  total: string
  balance: string
  dueDate: string
  brand: string
  portalUrl: string
}): { subject: string; html: string } {
  return {
    subject: `Invoice ${input.reference} · ${input.brand}`,
    html: SHELL(
      `Invoice ${input.reference}`,
      `<p style="margin:0 0 14px">Hello ${escapeHtml(input.name)},</p>
<p style="margin:0 0 14px">Invoice <strong>${escapeHtml(input.reference)}</strong> has been issued for <strong>${escapeHtml(input.total)}</strong>. The balance is ${escapeHtml(input.balance)} and the due date is ${escapeHtml(input.dueDate)}.</p>
<p style="margin:0 0 14px">Payment is by cash, cheque, bank transfer or card on site. The invoice and its payment status are in the customer portal.</p>
<p style="margin:0"><a href="${escapeHtml(input.portalUrl)}" style="color:#0b5f82">Open the customer portal</a></p>`,
      input.brand,
    ),
  }
}

export function invoiceReminderEmail(input: {
  name: string
  reference: string
  balance: string
  dueDate: string
  brand: string
}): { subject: string; html: string } {
  return {
    subject: `Payment reminder · ${input.reference}`,
    html: SHELL(
      `Invoice ${input.reference}`,
      `<p style="margin:0 0 14px">Hello ${escapeHtml(input.name)},</p>
<p style="margin:0 0 14px">Invoice <strong>${escapeHtml(input.reference)}</strong> has an open balance of <strong>${escapeHtml(input.balance)}</strong>. The due date is ${escapeHtml(input.dueDate)}.</p>
<p style="margin:0">If payment is already on its way, reply with the reference and we will reconcile it. — ${escapeHtml(input.brand)}</p>`,
      input.brand,
    ),
  }
}

export function passwordResetEmail(input: {
  name: string
  resetUrl: string
  brand: string
  expiresMinutes: number
}): { subject: string; html: string } {
  return {
    subject: `Reset your portal password · ${input.brand}`,
    html: SHELL(
      'Password reset',
      `<p style="margin:0 0 14px">Hello ${escapeHtml(input.name)},</p>
<p style="margin:0 0 14px">Use the link below to choose a new portal password. It expires in ${input.expiresMinutes} minutes and can be used once.</p>
<p style="margin:0 0 18px"><a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#12161a;color:#fffdf8;padding:12px 18px;text-decoration:none;font:600 12px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase">Choose a new password</a></p>
<p style="margin:0 0 14px;font-size:12px;color:#6b7480">If you did not request this, no change was made. Your existing sessions stay active until the link is used.</p>
<p style="margin:0">— ${escapeHtml(input.brand)}</p>`,
      input.brand,
    ),
  }
}

export function emailVerificationEmail(input: {
  name: string
  verifyUrl: string
  brand: string
  expiresHours: number
}): { subject: string; html: string } {
  return {
    subject: `Verify your portal email · ${input.brand}`,
    html: SHELL(
      'Verify your email',
      `<p style="margin:0 0 14px">Hello ${escapeHtml(input.name)},</p>
<p style="margin:0 0 14px">Confirm this email address before the works desk approves portal access. The link expires in ${input.expiresHours} hours and can be used once.</p>
<p style="margin:0 0 18px"><a href="${escapeHtml(input.verifyUrl)}" style="display:inline-block;background:#12161a;color:#fffdf8;padding:12px 18px;text-decoration:none;font:600 12px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase">Verify email</a></p>
<p style="margin:0 0 14px;font-size:12px;color:#6b7480">If you did not create a portal account, ignore this message; the account stays unverified and cannot sign in.</p>
<p style="margin:0">— ${escapeHtml(input.brand)}</p>`,
      input.brand,
    ),
  }
}

export function adminPortalNotice(input: { name: string; email: string; phone: string }): {
  subject: string
  html: string
} {
  return {
    subject: 'Portal account awaiting approval',
    html: SHELL(
      'Portal approval',
      `<p style="margin:0 0 10px"><strong>${escapeHtml(input.name)}</strong> requested portal access.</p>
<p style="margin:0 0 10px">${escapeHtml(input.email)} · ${escapeHtml(input.phone)}</p>
<p style="margin:0">Approve or suspend the account in Admin → Customers before it can see invoices.</p>`,
      'Works desk',
    ),
  }
}

export function quotationIssuedEmail(input: {
  name: string
  reference: string
  title: string
  total: string
  validUntil: string
  brand: string
  portalUrl: string
}): { subject: string; html: string } {
  return {
    subject: `Quotation ${input.reference} · ${input.brand}`,
    html: SHELL(
      `Quotation ${input.reference}`,
      `<p style="margin:0 0 14px">Hello ${escapeHtml(input.name)},</p>
<p style="margin:0 0 14px">Quotation <strong>${escapeHtml(input.reference)}</strong> for <strong>${escapeHtml(input.title)}</strong> is ready. The total is <strong>${escapeHtml(input.total)}</strong>${
        input.validUntil ? ` and it is valid until ${escapeHtml(input.validUntil)}` : ''
      }.</p>
<p style="margin:0 0 14px">Open the customer portal to review the lines, accept it or request a change. Acceptance is recorded against your account and the works desk is notified.</p>
<p style="margin:0"><a href="${escapeHtml(input.portalUrl)}" style="color:#0b5f82">Review the quotation</a></p>`,
      input.brand,
    ),
  }
}

export function supportTicketAcknowledgementEmail(input: {
  name: string
  reference: string
  subject: string
  body: string
  brand: string
  portalUrl: string
}): { subject: string; html: string } {
  return {
    subject: `Request ${input.reference} received · ${input.brand}`,
    html: SHELL(
      `Request ${input.reference}`,
      `<p style="margin:0 0 14px">Hello ${escapeHtml(input.name)},</p>
<p style="margin:0 0 14px">Your request <strong>${escapeHtml(input.subject)}</strong> is logged as <strong>${escapeHtml(input.reference)}</strong>. The works desk will reply in the portal.</p>
<p style="margin:0 0 14px;white-space:pre-wrap;color:#3b4652">${escapeHtml(input.body)}</p>
<p style="margin:0"><a href="${escapeHtml(input.portalUrl)}" style="color:#0b5f82">Open the request</a></p>`,
      input.brand,
    ),
  }
}

export function supportTicketReplyEmail(input: {
  name: string
  reference: string
  subject: string
  body: string
  brand: string
  portalUrl: string
}): { subject: string; html: string } {
  return {
    subject: `Works desk replied · ${input.reference}`,
    html: SHELL(
      `Update on ${input.reference}`,
      `<p style="margin:0 0 14px">Hello ${escapeHtml(input.name)},</p>
<p style="margin:0 0 14px">The works desk replied to <strong>${escapeHtml(input.subject)}</strong>.</p>
<p style="margin:0 0 14px;white-space:pre-wrap;border-left:2px solid #0b5f82;padding-left:12px;color:#3b4652">${escapeHtml(input.body)}</p>
<p style="margin:0"><a href="${escapeHtml(input.portalUrl)}" style="color:#0b5f82">Continue the thread</a></p>`,
      input.brand,
    ),
  }
}

export function amcRenewalAcknowledgementEmail(input: {
  name: string
  contractRef: string
  ticketRef: string
  brand: string
  portalUrl: string
}): { subject: string; html: string } {
  return {
    subject: `AMC renewal requested · ${input.contractRef}`,
    html: SHELL(
      'AMC renewal requested',
      `<p style="margin:0 0 14px">Hello ${escapeHtml(input.name)},</p>
<p style="margin:0 0 14px">The renewal request for <strong>${escapeHtml(input.contractRef)}</strong> is logged as <strong>${escapeHtml(input.ticketRef)}</strong>. The works desk will send the renewal quotation to the portal.</p>
<p style="margin:0"><a href="${escapeHtml(input.portalUrl)}" style="color:#0b5f82">Open the portal</a></p>`,
      input.brand,
    ),
  }
}

export function expenseReportEmail(input: {
  month: string
  total: string
  count: number
  brand: string
}): { subject: string; html: string } {
  return {
    subject: `Monthly expense report · ${input.month} · ${input.brand}`,
    html: SHELL(
      `Expenses · ${input.month}`,
      `<p style="margin:0 0 14px">The attached PDF is the complete expense ledger for <strong>${escapeHtml(input.month)}</strong>.</p>
<p style="margin:0 0 14px">Total recorded: <strong>${escapeHtml(input.total)}</strong> across ${input.count} entries. The PDF includes dates, vendors, descriptions, categories, payment methods and amounts.</p>
<p style="margin:0;font-size:12px;color:#6b7480">Generated automatically on the 2nd of the month.</p>`,
      input.brand,
    ),
  }
}

export function twoFactorCodeEmail(input: {
  code: string
  purpose: 'login' | 'enable' | 'disable'
  expiresMinutes: number
  brand: string
}): { subject: string; html: string } {
  const action =
    input.purpose === 'login'
      ? 'sign in to the control room'
      : input.purpose === 'enable'
        ? 'turn on email two-factor authentication'
        : 'turn off email two-factor authentication'
  return {
    subject: `Your verification code · ${input.brand}`,
    html: SHELL(
      'Verification code',
      `<p style="margin:0 0 14px">Use this code to ${escapeHtml(action)}. It expires in ${input.expiresMinutes} minutes and can be used once.</p>
<p style="margin:0 0 18px;font:600 30px/1.2 'Courier New',monospace;letter-spacing:.22em;color:#12161a">${escapeHtml(input.code)}</p>
<p style="margin:0 0 14px;font-size:12px;color:#6b7480">If you did not request this, do not share the code. Change your password and review the audit log. We never send codes by SMS.</p>
<p style="margin:0">— ${escapeHtml(input.brand)}</p>`,
      input.brand,
    ),
  }
}

export function worksDeskNotice(input: {
  subject: string
  heading: string
  body: string
  reference?: string
}): { subject: string; html: string } {
  return {
    subject: input.subject,
    html: SHELL(
      input.heading,
      `<p style="margin:0 0 10px"><strong>${escapeHtml(input.heading)}</strong>${
        input.reference ? ` · ${escapeHtml(input.reference)}` : ''
      }</p>
<p style="margin:0;white-space:pre-wrap">${escapeHtml(input.body)}</p>
<p style="margin:14px 0 0;font-size:12px;color:#6b7480">Open the customer file in Admin → Customers to action it.</p>`,
      'Works desk',
    ),
  }
}
