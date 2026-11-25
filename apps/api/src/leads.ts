import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
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
import { UPLOAD_ROOT, detectImage, safeOriginalName } from './media.js'

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
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
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

const leadUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 3 },
})

function detectLeadFile(buffer: Buffer): { mime: string; extension: string } | null {
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return { mime: 'application/pdf', extension: '.pdf' }
  }
  return detectImage(buffer)
}

leadsRouter.post(
  '/leads/attachments',
  rateLimit({
    scope: 'lead-attachments',
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: 'Too many attachment uploads. Try again later.',
  }),
  leadUpload.array('files', 3),
  async (req, res) => {
    const files = (req.files ?? []) as Express.Multer.File[]
    if (!files.length) {
      res.status(400).json({ error: { code: 'no_files', message: 'Choose at least one file.' } })
      return
    }
    const detected = files.map((file) => ({ file, asset: detectLeadFile(file.buffer) }))
    if (detected.some((entry) => !entry.asset)) {
      res.status(400).json({
        error: {
          code: 'invalid_file',
          message: 'Attach images or PDF files only.',
        },
      })
      return
    }
    const directory = path.join(UPLOAD_ROOT, 'leads')
    await mkdir(directory, { recursive: true })
    const attachments = []
    for (const entry of detected) {
      const asset = entry.asset
      if (!asset) continue
      const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${asset.extension}`
      await writeFile(path.join(directory, filename), entry.file.buffer)
      attachments.push({
        name: safeOriginalName(entry.file.originalname) || `attachment${asset.extension}`,
        url: `/uploads/leads/${filename}`,
        mimeType: asset.mime,
        size: entry.file.size,
      })
    }
    res.status(201).json({ data: attachments })
  },
)

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
        attachments: input.attachments ?? [],
      })
      res.status(201).json({ data: record })
      void notifyLead(record)
    } catch (error) {
      next(error)
    }
  },
)

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
  },
)
