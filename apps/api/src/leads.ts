import { Router } from 'express'
import {
  callbackLeadSchema,
  leadReference,
  leadSubmissionSchema,
  type AdminLead,
  type LeadSource,
} from '@hvac/shared'
import { createStore } from './store.js'
import { ADMIN_NOTIFY_EMAIL } from './config.js'
import { readSiteContent } from './content.js'
import { leadAcknowledgement, leadNotification, sendMail } from './mailer.js'
import { rateLimit } from './rateLimit.js'

/**
 * Public lead intake and the shared lead store used by the admin pipeline.
 * There is deliberately no public GET: the inbox lives behind requireAdmin.
 */
export const leadStore = createStore<AdminLead[]>('leads.json', () => [])

function normalizeLead(raw: Partial<AdminLead> & { ref: string }): AdminLead {
  const createdAt = raw.createdAt ?? new Date().toISOString()
  return {
    ref: raw.ref,
    createdAt,
    updatedAt: raw.updatedAt ?? createdAt,
    status: raw.status ?? 'new',
    source: raw.source ?? 'contact-page',
    name: raw.name ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    message: raw.message ?? '',
    serviceSlug: raw.serviceSlug ?? null,
    serviceName: raw.serviceName ?? null,
    city: raw.city ?? null,
    urgency: raw.urgency ?? 'normal',
    plan: raw.plan ?? null,
    context: raw.context ?? null,
    owner: raw.owner ?? null,
    value: raw.value ?? null,
    followUpAt: raw.followUpAt ?? null,
    notes: Array.isArray(raw.notes) ? raw.notes : [],
  }
}

export async function readLeads(): Promise<AdminLead[]> {
  const stored = await leadStore.read()
  return stored.map(normalizeLead)
}

export function nextLeadReference(leads: AdminLead[]): string {
  const year = new Date().getFullYear()
  const prefix = `ENQ-${year}-`
  const highest = leads.reduce((max, lead) => {
    if (!lead.ref.startsWith(prefix)) return max
    const value = Number.parseInt(lead.ref.slice(prefix.length), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return leadReference(year, highest + 1)
}

/**
 * Append a lead under the store lock so two simultaneous submissions can never
 * receive the same reference or overwrite each other's row.
 */
export async function appendLead(base: AdminLead): Promise<AdminLead> {
  let saved: AdminLead | undefined
  await leadStore.mutate((leads) => {
    const record: AdminLead = { ...base, ref: nextLeadReference(leads) }
    saved = record
    return [record, ...leads]
  })
  if (!saved) throw new Error('The lead could not be saved.')
  return saved
}

export const leadsRouter = Router()

async function notifyLead(record: AdminLead): Promise<void> {
  try {
    const content = await readSiteContent()
    const brand = content.brand.shortName || content.brand.name
    const tasks = [
      sendMail({
        to: ADMIN_NOTIFY_EMAIL,
        kind: 'lead-admin',
        replyTo: record.email || undefined,
        ...leadNotification({
          name: record.name,
          reference: record.ref,
          serviceName: record.serviceName,
          phone: record.phone,
          email: record.email,
          city: record.city,
          urgency: record.urgency,
          message: record.message,
        }),
      }),
    ]
    if (record.email) {
      tasks.push(
        sendMail({
          to: record.email,
          kind: 'lead-ack',
          ...leadAcknowledgement({
            name: record.name,
            reference: record.ref,
            serviceName: record.serviceName,
            brand,
          }),
        }),
      )
    }
    await Promise.allSettled(tasks)
  } catch (error) {
    console.error('[hvac-api] lead notification failed', error)
  }
}

leadsRouter.post(
  '/leads',
  rateLimit({
    scope: 'lead-intake',
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: 'Too many enquiries from this address. Call the works desk or try again later.',
  }),
  async (req, res, next) => {
  const parsed = leadSubmissionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'The enquiry did not pass validation.',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    })
    return
  }

  const input = parsed.data
  if (input.honeypot?.trim()) {
    res.status(400).json({
      error: { code: 'spam_detected', message: 'The enquiry could not be processed.' },
    })
    return
  }
  const source = input.source as LeadSource
  const now = new Date().toISOString()
  try {
    const record = await appendLead({
      ref: '',
      createdAt: now,
      updatedAt: now,
      status: 'new',
      source,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      serviceSlug: input.serviceSlug ?? null,
      serviceName: input.serviceName ?? null,
      city: input.city ?? null,
      urgency: input.urgency,
      plan: input.plan ?? null,
      context: input.context ?? null,
      owner: null,
      value: null,
      followUpAt: null,
      notes: [],
    })
    res.status(201).json({ data: record })
    void notifyLead(record)
  } catch (error) {
    next(error)
  }
})

leadsRouter.post(
  '/leads/callback',
  rateLimit({
    scope: 'lead-callback',
    windowMs: 10 * 60 * 1000,
    max: 6,
  }),
  async (req, res, next) => {
  const parsed = callbackLeadSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'The callback request did not pass validation.',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    })
    return
  }

  const input = parsed.data
  if (input.honeypot?.trim()) {
    res.status(400).json({
      error: { code: 'spam_detected', message: 'The callback request could not be processed.' },
    })
    return
  }
  const now = new Date().toISOString()
  try {
    const record = await appendLead({
      ref: '',
      createdAt: now,
      updatedAt: now,
      status: 'new',
      source: 'callback',
      name: input.name,
      email: '',
      phone: input.phone,
      message: `Callback · ${input.window}${input.scope ? ` · ${input.scope}` : ''}`,
      serviceSlug: null,
      serviceName: null,
      city: null,
      urgency: 'normal',
      plan: null,
      context: input.scope ?? null,
      owner: null,
      value: null,
      followUpAt: null,
      notes: [],
    })
    res.status(201).json({ data: record })
    void notifyLead(record)
  } catch (error) {
    next(error)
  }
})
