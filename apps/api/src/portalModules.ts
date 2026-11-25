import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import {
  amcInputSchema,
  amcPatchSchema,
  customerSiteInputSchema,
  customerSitePatchSchema,
  defaultPreferences,
  equipmentInputSchema,
  equipmentPatchSchema,
  invoiceTotals,
  jobReportInputSchema,
  jobReportPatchSchema,
  notificationPreferencesPatchSchema,
  quotationChangeRequestSchema,
  quotationInputSchema,
  quotationPatchSchema,
  quotationTotals,
  ticketInputSchema,
  ticketPatchSchema,
  ticketReplySchema,
  type AmcContract,
  type CustomerPortalFile,
  type CustomerSite,
  type EquipmentRecord,
  type JobReport,
  type QuotationRecord,
  type SupportTicket,
} from '@hvac/shared'
import { requireAdmin, requireAdminMutation, requirePermission } from './auth.js'
import { ADMIN_NOTIFY_EMAIL, PUBLIC_SITE_URL } from './config.js'
import { invoiceStore, toInvoiceView } from './business.js'
import { readSiteContent } from './content.js'
import { ifMatchSatisfied } from './concurrency.js'
import { customerWantsEmail, preferenceStore, preferencesFor } from './customerPreferences.js'
import { leadStore, readLeads } from './leads.js'
import {
  amcRenewalAcknowledgementEmail,
  quotationIssuedEmail,
  sendMail,
  supportTicketAcknowledgementEmail,
  supportTicketReplyEmail,
  worksDeskNotice,
} from './mailer.js'
import { removeNewsletterSignup } from './newsletterSignups.js'
import { streamQuotationPdf } from './pdf.js'
import { UPLOAD_ROOT, detectImage, safeOriginalName } from './media.js'
import { appointmentStore } from './portal.js'
import {
  customerStore,
  publicCustomer,
  requireCustomer,
  requireCustomerMutation,
  revokeCustomerSessions,
} from './portalAuth.js'
import { createStore } from './store.js'

function nowIso(): string {
  return new Date().toISOString()
}

const portalMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function formatPortalMoney(value: number): string {
  return portalMoney.format(value)
}

function notifyDesk(input: {
  subject: string
  heading: string
  body: string
  reference?: string
}): void {
  void sendMail({
    to: ADMIN_NOTIFY_EMAIL,
    kind: 'portal-event',
    ...worksDeskNotice(input),
  }).catch((error) => console.error('[hvac-api] desk notification failed', error))
}

export const siteStore = createStore<CustomerSite[]>('customer-sites.json', () => [])
export const equipmentStore = createStore<EquipmentRecord[]>('equipment.json', () => [])
export const quotationStore = createStore<QuotationRecord[]>('quotations.json', () => [])
export const amcStore = createStore<AmcContract[]>('amc-contracts.json', () => [])
export const reportStore = createStore<JobReport[]>('job-reports.json', () => [])
export const ticketStore = createStore<SupportTicket[]>('support-tickets.json', () => [])

function portalUrl(path: string): string {
  const base = PUBLIC_SITE_URL.replace(/\/+$/, '')
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

async function emailCustomer(input: {
  customerId: string
  field: 'emailService' | 'emailBilling' | 'emailAmc'
  to: string
  kind: string
  subject: string
  html: string
}): Promise<void> {
  if (!(await customerWantsEmail(input.customerId, input.field))) return
  const result = await sendMail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    kind: input.kind,
  })
  if (!result.ok) {
    console.warn('[hvac-api] customer email was not sent', input.kind, result.status)
  }
}

function nextReference(prefix: string, records: { ref: string }[]): string {
  const year = new Date().getFullYear()
  const head = `${prefix}-${year}-`
  const highest = records.reduce((max, record) => {
    if (!record.ref.startsWith(head)) return max
    const value = Number.parseInt(record.ref.slice(head.length), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `${head}${String(highest + 1).padStart(4, '0')}`
}

async function findCustomer(customerId: string) {
  const customers = await customerStore.read()
  return customers.find((customer) => customer.id === customerId) ?? null
}

function invoicesForEmail<T extends { customerEmail: string }>(invoices: T[], email: string): T[] {
  const normalized = email.trim().toLowerCase()
  return invoices.filter((invoice) => invoice.customerEmail.trim().toLowerCase() === normalized)
}

async function buildFile(
  customer: {
    id: string
    name: string
    email: string
    phone: string
    address: string
    status?: 'unverified' | 'pending' | 'active' | 'suspended'
    createdAt: string
    updatedAt: string
  },
  includeDrafts = false,
): Promise<CustomerPortalFile> {
  const [
    sites,
    equipment,
    quotations,
    amc,
    reports,
    tickets,
    preferences,
    invoices,
    appointments,
    leads,
  ] = await Promise.all([
    siteStore.read(),
    equipmentStore.read(),
    quotationStore.read(),
    amcStore.read(),
    reportStore.read(),
    ticketStore.read(),
    preferencesFor(customer.id),
    invoiceStore.read(),
    appointmentStore.read(),
    readLeads(),
  ])

  const ownInvoices = invoicesForEmail(invoices, customer.email).sort(
    (a, b) => Date.parse(b.issueDate) - Date.parse(a.issueDate),
  )
  const ownAppointments = appointments
    .filter(
      (appointment) =>
        appointment.customerId === customer.id ||
        appointment.customerEmail.trim().toLowerCase() === customer.email,
    )
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt))
  const upcoming = ownAppointments
    .filter(
      (appointment) =>
        appointment.status !== 'cancelled' &&
        appointment.status !== 'completed' &&
        Date.parse(appointment.scheduledAt) >= Date.now() - 86_400_000,
    )
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))

  let outstanding = 0
  let paidLifetime = 0
  for (const invoice of ownInvoices) {
    const totals = invoiceTotals(invoice)
    if (totals.state === 'draft' || totals.state === 'cancelled') continue
    outstanding += totals.balance
    paidLifetime += totals.paid
  }

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      status: customer.status ?? 'active',
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    },
    sites: sites
      .filter((site) => site.customerId === customer.id)
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.label.localeCompare(b.label)),
    equipment: equipment
      .filter((item) => item.customerId === customer.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
    quotations: quotations
      .filter(
        (quotation) =>
          quotation.customerId === customer.id && (includeDrafts || quotation.status !== 'draft'),
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((quotation) => ({ ...quotation, totals: quotationTotals(quotation) })),
    amc: amc
      .filter((contract) => contract.customerId === customer.id)
      .sort((a, b) => b.endDate.localeCompare(a.endDate)),
    reports: reports
      .filter((report) => report.customerId === customer.id)
      .sort(
        (a, b) =>
          Date.parse(b.completedAt || b.createdAt) - Date.parse(a.completedAt || a.createdAt),
      ),
    tickets: tickets
      .filter((ticket) => ticket.customerId === customer.id)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    preferences,
    invoices: ownInvoices.map((invoice) => toInvoiceView(invoice)),
    appointments: ownAppointments,
    requests: leads.filter(
      (lead) => lead.email.trim().toLowerCase() === customer.email.trim().toLowerCase(),
    ),
    nextAppointment: upcoming[0] ?? null,
    summary: {
      outstanding,
      paidLifetime,
      invoiceCount: ownInvoices.length,
      openAppointments: ownAppointments.filter(
        (appointment) => appointment.status !== 'completed' && appointment.status !== 'cancelled',
      ).length,
      completedVisits: ownAppointments.filter((appointment) => appointment.status === 'completed')
        .length,
    },
  }
}

function customerId(res: { locals: Record<string, unknown> }): string {
  const record = res.locals.customer as { id: string }
  return record.id
}

/* -------------------------------------------------------------------------- */
/*  Customer routes                                                            */
/* -------------------------------------------------------------------------- */

export const portalFileRouter = Router()

portalFileRouter.get('/portal/file', requireCustomer, async (_req, res, next) => {
  try {
    const record = res.locals.customer as {
      id: string
      name: string
      email: string
      phone: string
      address: string
      status?: 'unverified' | 'pending' | 'active' | 'suspended'
      createdAt: string
      updatedAt: string
    }
    res.set('Cache-Control', 'private, no-store')
    res.json({ data: await buildFile(record) })
  } catch (error) {
    next(error)
  }
})

/* Sites */
portalFileRouter.get('/portal/sites', requireCustomer, async (_req, res) => {
  const sites = await siteStore.read()
  res.json({ data: sites.filter((site) => site.customerId === customerId(res)) })
})

portalFileRouter.post(
  '/portal/sites',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const parsed = customerSiteInputSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check the site details.',
        },
      })
      return
    }
    const id = customerId(res)
    const now = nowIso()
    const record: CustomerSite = {
      id: randomUUID(),
      customerId: id,
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    }
    await siteStore.mutate((sites) => {
      const next = parsed.data.isPrimary
        ? sites.map((site) => (site.customerId === id ? { ...site, isPrimary: false } : site))
        : sites
      return [record, ...next]
    })
    res.status(201).json({ data: record })
  },
)

portalFileRouter.patch(
  '/portal/sites/:id',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const parsed = customerSitePatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check the site details.',
        },
      })
      return
    }
    const id = customerId(res)
    let saved: CustomerSite | undefined
    await siteStore.mutate((sites) =>
      sites
        .map((site) =>
          parsed.data.isPrimary && site.customerId === id ? { ...site, isPrimary: false } : site,
        )
        .map((site) => {
          if (site.id !== req.params.id || site.customerId !== id) return site
          saved = { ...site, ...parsed.data, updatedAt: nowIso() }
          return saved
        }),
    )
    if (!saved) {
      res.status(404).json({ error: { code: 'not_found', message: 'Site not found.' } })
      return
    }
    res.json({ data: saved })
  },
)

portalFileRouter.delete(
  '/portal/sites/:id',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const id = customerId(res)
    await siteStore.mutate((sites) =>
      sites.filter((site) => !(site.id === req.params.id && site.customerId === id)),
    )
    res.json({ data: { deleted: req.params.id } })
  },
)

/* Quotations */
portalFileRouter.get('/portal/quotations', requireCustomer, async (_req, res) => {
  const quotations = await quotationStore.read()
  const id = customerId(res)
  res.json({
    data: quotations
      .filter((quotation) => quotation.customerId === id && quotation.status !== 'draft')
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((quotation) => ({ ...quotation, totals: quotationTotals(quotation) })),
  })
})

portalFileRouter.get('/portal/quotations/:id/pdf', requireCustomer, async (req, res) => {
  const id = customerId(res)
  const quotations = await quotationStore.read()
  const quotation = quotations.find(
    (entry) => entry.id === req.params.id && entry.customerId === id && entry.status !== 'draft',
  )
  const customer = await findCustomer(id)
  if (!quotation || !customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Quotation not found.' } })
    return
  }
  const content = await readSiteContent()
  streamQuotationPdf(
    res,
    { ...quotation, totals: quotationTotals(quotation) },
    content.brand,
    customer,
  )
})

portalFileRouter.post(
  '/portal/quotations/:id/accept',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const id = customerId(res)
    let saved: QuotationRecord | undefined
    await quotationStore.mutate((quotations) =>
      quotations.map((quotation) => {
        if (quotation.id !== req.params.id || quotation.customerId !== id) return quotation
        if (quotation.status !== 'sent') return quotation
        saved = {
          ...quotation,
          status: 'accepted',
          acceptedAt: nowIso(),
          updatedAt: nowIso(),
        }
        return saved
      }),
    )
    if (!saved) {
      res.status(400).json({
        error: {
          code: 'not_acceptable',
          message: 'This quotation is not open for acceptance. Ask the works desk to reissue it.',
        },
      })
      return
    }
    res.json({ data: { ...saved, totals: quotationTotals(saved) } })
    notifyDesk({
      subject: `Quotation accepted · ${saved.ref}`,
      heading: 'Quotation accepted in the portal',
      reference: saved.ref,
      body: `${(res.locals.customer as { name: string }).name} accepted "${saved.title}" for ${formatPortalMoney(quotationTotals(saved).total)}. Schedule the work and raise the invoice.`,
    })
  },
)

portalFileRouter.post(
  '/portal/quotations/:id/changes',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const parsed = quotationChangeRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Describe the change you need.',
        },
      })
      return
    }
    const id = customerId(res)
    let saved: QuotationRecord | undefined
    await quotationStore.mutate((quotations) =>
      quotations.map((quotation) => {
        if (quotation.id !== req.params.id || quotation.customerId !== id) return quotation
        if (quotation.status !== 'sent' && quotation.status !== 'changes-requested')
          return quotation
        saved = {
          ...quotation,
          status: 'changes-requested',
          changeRequest: parsed.data.note,
          updatedAt: nowIso(),
        }
        return saved
      }),
    )
    if (!saved) {
      res.status(400).json({
        error: { code: 'not_open', message: 'This quotation cannot take a change request.' },
      })
      return
    }
    res.json({ data: { ...saved, totals: quotationTotals(saved) } })
    notifyDesk({
      subject: `Quotation change requested · ${saved.ref}`,
      heading: 'Change requested on a quotation',
      reference: saved.ref,
      body: `${(res.locals.customer as { name: string }).name} asked for a change on "${saved.title}":\n${parsed.data.note}`,
    })
  },
)

/* AMC */
portalFileRouter.get('/portal/amc', requireCustomer, async (_req, res) => {
  const contracts = await amcStore.read()
  res.json({ data: contracts.filter((contract) => contract.customerId === customerId(res)) })
})

portalFileRouter.post(
  '/portal/amc/:id/renew',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const id = customerId(res)
    const contracts = await amcStore.read()
    const contract = contracts.find(
      (entry) => entry.id === req.params.id && entry.customerId === id,
    )
    if (!contract) {
      res.status(404).json({ error: { code: 'not_found', message: 'Contract not found.' } })
      return
    }
    if (contract.renewalRequestedAt) {
      res.status(409).json({
        error: {
          code: 'renewal_exists',
          message: 'A renewal request for this contract is already open with the works desk.',
        },
      })
      return
    }
    const customer = res.locals.customer as { name: string; email: string }
    const now = nowIso()
    let ticket: SupportTicket | undefined
    await ticketStore.mutate((tickets) => {
      const record: SupportTicket = {
        id: randomUUID(),
        ref: nextReference('SUP', tickets),
        customerId: id,
        subject: `Renewal request · ${contract.ref}`,
        category: 'amc',
        status: 'open',
        messages: [
          {
            id: randomUUID(),
            at: now,
            authorRole: 'customer',
            authorName: customer.name,
            body: `Please quote a renewal for ${contract.plan} (${contract.ref}), currently ending ${contract.endDate}.`,
          },
        ],
        createdAt: now,
        updatedAt: now,
      }
      ticket = record
      return [record, ...tickets]
    })
    await amcStore.mutate((current) =>
      current.map((entry) =>
        entry.id === contract.id ? { ...entry, renewalRequestedAt: now, updatedAt: now } : entry,
      ),
    )
    res.status(201).json({ data: ticket })
    notifyDesk({
      subject: `AMC renewal request · ${contract.ref}`,
      heading: 'AMC renewal requested',
      reference: contract.ref,
      body: `${(res.locals.customer as { name: string }).name} requested a renewal for ${contract.plan}, ending ${contract.endDate}.`,
    })
    if (ticket) {
      const created = ticket
      void (async () => {
        const content = await readSiteContent()
        const email = amcRenewalAcknowledgementEmail({
          name: customer.name,
          contractRef: contract.ref,
          ticketRef: created.ref,
          brand: content.brand.name,
          portalUrl: portalUrl('/portal'),
        })
        await emailCustomer({
          customerId: id,
          field: 'emailAmc',
          to: customer.email,
          kind: 'amc-renewal-request',
          ...email,
        })
      })().catch((error) => console.error('[hvac-api] AMC renewal email failed', error))
    }
  },
)

/* Reports */
const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
})

portalFileRouter.post(
  '/portal/reports/:id/photos',
  requireCustomer,
  requireCustomerMutation,
  reportUpload.array('files', 6),
  async (req, res) => {
    const id = customerId(res)
    const reports = await reportStore.read()
    const report = reports.find(
      (entry) =>
        (entry.id === req.params.id || entry.ref === req.params.id) && entry.customerId === id,
    )
    if (!report) {
      res.status(404).json({ error: { code: 'not_found', message: 'Report not found.' } })
      return
    }
    const files = (req.files ?? []) as Express.Multer.File[]
    if (!files.length) {
      res.status(400).json({ error: { code: 'no_files', message: 'Choose at least one photo.' } })
      return
    }
    const detected = files.map((file) => ({ file, image: detectImage(file.buffer) }))
    if (detected.some((entry) => !entry.image)) {
      res.status(400).json({
        error: {
          code: 'invalid_image',
          message: 'Only JPEG, PNG, WebP, GIF or AVIF images are accepted.',
        },
      })
      return
    }
    const directory = path.join(UPLOAD_ROOT, 'reports')
    await mkdir(directory, { recursive: true })
    const photos: JobReport['photos'] = []
    for (const entry of detected) {
      const image = entry.image
      if (!image) continue
      const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${image.extension}`
      await writeFile(path.join(directory, filename), entry.file.buffer)
      photos.push({
        id: randomUUID(),
        url: `/uploads/reports/${filename}`,
        alt:
          safeOriginalName(entry.file.originalname)
            .replace(/\.[^.]+$/, '')
            .replace(/[-_]+/g, ' ') || 'Customer photo',
      })
    }
    let updated: JobReport | undefined
    await reportStore.mutate((current) =>
      current.map((entry) => {
        if (entry.id !== report.id) return entry
        updated = { ...entry, photos: [...entry.photos, ...photos], updatedAt: nowIso() }
        return updated
      }),
    )
    res.status(201).json({ data: updated })
  },
)

portalFileRouter.patch(
  '/portal/reports/:id/checklist',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const id = customerId(res)
    const updates = Array.isArray(req.body?.checklist) ? req.body.checklist : null
    if (!updates) {
      res
        .status(400)
        .json({ error: { code: 'validation_error', message: 'Checklist updates are required.' } })
      return
    }
    const report = (await reportStore.read()).find(
      (entry) =>
        (entry.id === req.params.id || entry.ref === req.params.id) && entry.customerId === id,
    )
    if (!report) {
      res.status(404).json({ error: { code: 'not_found', message: 'Report not found.' } })
      return
    }
    const byId = new Map<string, boolean>(
      updates
        .filter((entry: unknown): entry is { id: string; done: boolean } => {
          if (!entry || typeof entry !== 'object') return false
          const value = entry as { id?: unknown; done?: unknown }
          return typeof value.id === 'string' && typeof value.done === 'boolean'
        })
        .map((entry: { id: string; done: boolean }): [string, boolean] => [entry.id, entry.done]),
    )
    let updated: JobReport | undefined
    await reportStore.mutate((current) =>
      current.map((entry) => {
        if (entry.id !== report.id) return entry
        updated = {
          ...entry,
          checklist: entry.checklist.map((item) =>
            byId.has(item.id) ? { ...item, done: byId.get(item.id) ?? item.done } : item,
          ),
          updatedAt: nowIso(),
        }
        return updated
      }),
    )
    res.json({ data: updated })
  },
)

portalFileRouter.get('/portal/reports', requireCustomer, async (_req, res) => {
  const reports = await reportStore.read()
  res.json({
    data: reports
      .filter((report) => report.customerId === customerId(res))
      .sort(
        (a, b) =>
          Date.parse(b.completedAt || b.createdAt) - Date.parse(a.completedAt || a.createdAt),
      ),
  })
})

/* Tickets */
portalFileRouter.get('/portal/tickets', requireCustomer, async (_req, res) => {
  const tickets = await ticketStore.read()
  res.json({
    data: tickets
      .filter((ticket) => ticket.customerId === customerId(res))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
  })
})

portalFileRouter.post(
  '/portal/tickets',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const parsed = ticketInputSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check the request.',
        },
      })
      return
    }
    const customer = res.locals.customer as { id: string; name: string; email: string }
    const now = nowIso()
    let saved: SupportTicket | undefined
    await ticketStore.mutate((tickets) => {
      const record: SupportTicket = {
        id: randomUUID(),
        ref: nextReference('SUP', tickets),
        customerId: customer.id,
        subject: parsed.data.subject,
        category: parsed.data.category,
        status: 'open',
        messages: [
          {
            id: randomUUID(),
            at: now,
            authorRole: 'customer',
            authorName: customer.name,
            body: parsed.data.body,
          },
        ],
        createdAt: now,
        updatedAt: now,
      }
      saved = record
      return [record, ...tickets]
    })
    res.status(201).json({ data: saved })
    if (saved) {
      const created = saved
      notifyDesk({
        subject: `Portal request · ${created.ref}`,
        heading: 'New support request',
        reference: created.ref,
        body: `${customer.name} · ${parsed.data.category}\n${parsed.data.subject}\n\n${parsed.data.body}`,
      })
      void (async () => {
        const content = await readSiteContent()
        const email = supportTicketAcknowledgementEmail({
          name: customer.name,
          reference: created.ref,
          subject: created.subject,
          body: parsed.data.body,
          brand: content.brand.name,
          portalUrl: portalUrl('/portal'),
        })
        await emailCustomer({
          customerId: customer.id,
          field: 'emailService',
          to: customer.email,
          kind: 'support-ticket-created',
          ...email,
        })
      })().catch((error) => console.error('[hvac-api] support acknowledgement failed', error))
    }
  },
)

portalFileRouter.post(
  '/portal/tickets/:id/messages',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const parsed = ticketReplySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Write a reply.',
        },
      })
      return
    }
    const id = customerId(res)
    let saved: SupportTicket | undefined
    await ticketStore.mutate((tickets) =>
      tickets.map((ticket) => {
        if (ticket.id !== req.params.id || ticket.customerId !== id) return ticket
        if (ticket.status === 'closed') return ticket
        saved = {
          ...ticket,
          status: 'in-progress',
          messages: [
            ...ticket.messages,
            {
              id: randomUUID(),
              at: nowIso(),
              authorRole: 'customer',
              authorName: (res.locals.customer as { name: string }).name,
              body: parsed.data.body,
            },
          ],
          updatedAt: nowIso(),
        }
        return saved
      }),
    )
    if (!saved) {
      res.status(400).json({
        error: { code: 'closed', message: 'That request is closed. Raise a new one.' },
      })
      return
    }
    res.json({ data: saved })
    notifyDesk({
      subject: `Customer reply · ${saved.ref}`,
      heading: 'Customer replied to a support request',
      reference: saved.ref,
      body: `${(res.locals.customer as { name: string }).name}: ${parsed.data.body}`,
    })
  },
)

/* Preferences */
portalFileRouter.get('/portal/preferences', requireCustomer, async (_req, res) => {
  res.json({ data: await preferencesFor(customerId(res)) })
})

portalFileRouter.patch(
  '/portal/preferences',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const parsed = notificationPreferencesPatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'validation_error', message: 'Check the notification settings.' },
      })
      return
    }
    const id = customerId(res)
    const updated = await preferenceStore.mutate((all) => ({
      ...all,
      [id]: {
        ...(all[id] ?? defaultPreferences(id)),
        ...parsed.data,
        customerId: id,
        updatedAt: nowIso(),
      },
    }))
    res.json({ data: updated[id] })
  },
)

/* -------------------------------------------------------------------------- */
/*  Admin routes                                                              */
/* -------------------------------------------------------------------------- */

export const portalAdminRouter = Router()
portalAdminRouter.use(requireAdmin, requirePermission('portal.write'), requireAdminMutation)

portalAdminRouter.get('/customers/:id/file', async (req, res) => {
  const customer = await findCustomer(req.params.id)
  if (!customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Customer not found.' } })
    return
  }
  res.json({ data: { customer: publicCustomer(customer), file: await buildFile(customer, true) } })
})

portalAdminRouter.post('/customers/:id/erase', async (req, res) => {
  if (req.body?.confirm !== 'ERASE') {
    res.status(400).json({
      error: { code: 'confirmation_required', message: 'Type ERASE to confirm the erasure.' },
    })
    return
  }
  const customer = await findCustomer(req.params.id)
  if (!customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Customer not found.' } })
    return
  }
  const email = customer.email.trim().toLowerCase()
  const id = customer.id

  const [beforeSites, beforeEquipment, beforeQuotations, beforeAmc, beforeReports, beforeTickets] =
    await Promise.all([
      siteStore.read(),
      equipmentStore.read(),
      quotationStore.read(),
      amcStore.read(),
      reportStore.read(),
      ticketStore.read(),
    ])

  await revokeCustomerSessions(id)
  await Promise.all([
    siteStore.mutate((rows) => rows.filter((row) => row.customerId !== id)),
    equipmentStore.mutate((rows) => rows.filter((row) => row.customerId !== id)),
    quotationStore.mutate((rows) => rows.filter((row) => row.customerId !== id)),
    amcStore.mutate((rows) => rows.filter((row) => row.customerId !== id)),
    reportStore.mutate((rows) => rows.filter((row) => row.customerId !== id)),
    ticketStore.mutate((rows) => rows.filter((row) => row.customerId !== id)),
  ])
  await preferenceStore.mutate((all) => {
    const next = { ...all }
    delete next[id]
    return next
  })
  await customerStore.mutate((rows) => rows.filter((row) => row.id !== id))
  await removeNewsletterSignup(email)

  await appointmentStore.mutate((rows) =>
    rows.map((row) =>
      row.customerId === id || row.customerEmail.trim().toLowerCase() === email
        ? {
            ...row,
            customerName: 'Erased customer',
            customerEmail: '',
            customerPhone: '',
            address: 'Erased on request',
            notes: 'Erased on request',
            technician: '',
          }
        : row,
    ),
  )

  await leadStore.mutate((rows) =>
    rows.map((row) =>
      row.email.trim().toLowerCase() === email
        ? {
            ...row,
            name: 'Erased customer',
            email: '',
            phone: '',
            message: '[erased at customer request]',
            notes: [],
          }
        : row,
    ),
  )

  // Financial records are retained for tax and warranty periods, but the
  // identity attached to them is removed.
  await invoiceStore.mutate((rows) =>
    rows.map((row) =>
      row.customerEmail.trim().toLowerCase() === email
        ? {
            ...row,
            customerName: 'Erased customer',
            customerEmail: '',
            customerPhone: '',
            customerAddress: '',
            customerGstin: '',
          }
        : row,
    ),
  )

  res.json({
    data: {
      erased: true,
      customerId: id,
      removed: {
        sites: beforeSites.filter((row) => row.customerId === id).length,
        equipment: beforeEquipment.filter((row) => row.customerId === id).length,
        quotations: beforeQuotations.filter((row) => row.customerId === id).length,
        amc: beforeAmc.filter((row) => row.customerId === id).length,
        reports: beforeReports.filter((row) => row.customerId === id).length,
        tickets: beforeTickets.filter((row) => row.customerId === id).length,
      },
    },
  })
})

/* Sites */
portalAdminRouter.post('/customers/:id/sites', async (req, res) => {
  const parsed = customerSiteInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Check the site.',
      },
    })
    return
  }
  const customer = await findCustomer(req.params.id)
  if (!customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Customer not found.' } })
    return
  }
  const now = nowIso()
  const record: CustomerSite = {
    id: randomUUID(),
    customerId: customer.id,
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  }
  await siteStore.mutate((sites) => {
    const next = parsed.data.isPrimary
      ? sites.map((site) =>
          site.customerId === customer.id ? { ...site, isPrimary: false } : site,
        )
      : sites
    return [record, ...next]
  })
  res.status(201).json({ data: record })
})

portalAdminRouter.patch('/customers/:id/sites/:siteId', async (req, res) => {
  const parsed = customerSitePatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Check the site.' } })
    return
  }
  let saved: CustomerSite | undefined
  await siteStore.mutate((sites) =>
    sites.map((site) => {
      if (site.id !== req.params.siteId || site.customerId !== req.params.id) return site
      saved = { ...site, ...parsed.data, updatedAt: nowIso() }
      return saved
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Site not found.' } })
    return
  }
  res.json({ data: saved })
})

portalAdminRouter.delete('/customers/:id/sites/:siteId', async (req, res) => {
  await siteStore.mutate((sites) =>
    sites.filter((site) => !(site.id === req.params.siteId && site.customerId === req.params.id)),
  )
  res.json({ data: { deleted: req.params.siteId } })
})

/* Equipment */
portalAdminRouter.post('/customers/:id/equipment', async (req, res) => {
  const parsed = equipmentInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Check the equipment.' } })
    return
  }
  const customer = await findCustomer(req.params.id)
  if (!customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Customer not found.' } })
    return
  }
  const now = nowIso()
  const record: EquipmentRecord = {
    id: randomUUID(),
    customerId: customer.id,
    siteId: parsed.data.siteId ?? null,
    name: parsed.data.name,
    brand: parsed.data.brand,
    model: parsed.data.model,
    serial: parsed.data.serial,
    capacity: parsed.data.capacity,
    installedAt: parsed.data.installedAt,
    warrantyUntil: parsed.data.warrantyUntil,
    notes: parsed.data.notes,
    createdAt: now,
    updatedAt: now,
  }
  await equipmentStore.mutate((items) => [record, ...items])
  res.status(201).json({ data: record })
})

portalAdminRouter.patch('/customers/:id/equipment/:equipmentId', async (req, res) => {
  const parsed = equipmentPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Check the equipment.' } })
    return
  }
  const currentEquipment = (await equipmentStore.read()).find(
    (item) => item.id === req.params.equipmentId && item.customerId === req.params.id,
  )
  if (!currentEquipment) {
    res.status(404).json({ error: { code: 'not_found', message: 'Equipment not found.' } })
    return
  }
  if (!ifMatchSatisfied(req, currentEquipment.updatedAt)) {
    res.status(412).json({
      error: {
        code: 'stale_record',
        message: 'This equipment changed in another session. Reload and apply your edit again.',
      },
    })
    return
  }
  let saved: EquipmentRecord | undefined
  await equipmentStore.mutate((items) =>
    items.map((item) => {
      if (item.id !== req.params.equipmentId || item.customerId !== req.params.id) return item
      saved = { ...item, ...parsed.data, updatedAt: nowIso() }
      return saved
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Equipment not found.' } })
    return
  }
  res.json({ data: saved })
})

portalAdminRouter.delete('/customers/:id/equipment/:equipmentId', async (req, res) => {
  await equipmentStore.mutate((items) =>
    items.filter(
      (item) => !(item.id === req.params.equipmentId && item.customerId === req.params.id),
    ),
  )
  res.json({ data: { deleted: req.params.equipmentId } })
})

/* Quotations */
portalAdminRouter.get('/quotations', async (req, res) => {
  const [quotations, customers, leads] = await Promise.all([
    quotationStore.read(),
    customerStore.read(),
    leadStore.read(),
  ])
  const status = typeof req.query.status === 'string' ? req.query.status : ''
  const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : ''
  const customersById = new Map(customers.map((customer) => [customer.id, customer]))
  const data = quotations
    .filter((quotation) => (status ? quotation.status === status : true))
    .filter((quotation) => {
      if (!query) return true
      const customer = customersById.get(quotation.customerId)
      const lead = quotation.leadRef ? leads.find((entry) => entry.ref === quotation.leadRef) : null
      return [
        quotation.ref,
        quotation.title,
        quotation.service,
        customer?.name,
        customer?.email,
        lead?.name,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((quotation) => {
      const customer = customersById.get(quotation.customerId)
      const lead = quotation.leadRef ? leads.find((entry) => entry.ref === quotation.leadRef) : null
      return {
        ...quotation,
        totals: quotationTotals(quotation),
        customerName: customer?.name ?? 'Customer',
        customerEmail: customer?.email ?? '',
        leadName: lead?.name ?? null,
      }
    })
  res.json({
    data,
    meta: {
      count: data.length,
      totals: {
        counts: Object.fromEntries(
          ['draft', 'sent', 'accepted', 'declined', 'changes-requested', 'expired'].map((entry) => [
            entry,
            quotations.filter((quotation) => quotation.status === entry).length,
          ]),
        ),
        value: quotations.reduce((sum, quotation) => sum + quotationTotals(quotation).total, 0),
      },
    },
  })
})

portalAdminRouter.post('/quotations', async (req, res) => {
  const customerId = typeof req.body?.customerId === 'string' ? req.body.customerId : ''
  const parsed = quotationInputSchema.safeParse(req.body)
  if (!customerId || !parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error?.issues[0]?.message ?? 'Choose a customer.',
      },
    })
    return
  }
  const customer = await findCustomer(customerId)
  if (!customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Customer not found.' } })
    return
  }
  const content = await readSiteContent()
  const now = nowIso()
  let saved: QuotationRecord | undefined
  await quotationStore.mutate((quotations) => {
    const record: QuotationRecord = {
      id: randomUUID(),
      ref: nextReference('QT', quotations),
      customerId: customer.id,
      leadRef: parsed.data.leadRef ?? null,
      serviceSlug: parsed.data.serviceSlug ?? null,
      title: parsed.data.title,
      service: parsed.data.service,
      lines: parsed.data.lines.map((line) => ({ ...line, id: line.id ?? randomUUID() })),
      discount: parsed.data.discount,
      notes: parsed.data.notes || content.brand.billing.invoiceNotes,
      terms: parsed.data.terms || content.brand.billing.invoiceTerms,
      status: parsed.data.status,
      validUntil: parsed.data.validUntil,
      acceptedAt: null,
      sentAt: parsed.data.status === 'sent' ? now : null,
      lastReminderAt: null,
      changeRequest: null,
      createdAt: now,
      updatedAt: now,
    }
    saved = record
    return [record, ...quotations]
  })
  if (!saved) {
    res
      .status(500)
      .json({ error: { code: 'server_error', message: 'The quotation could not be saved.' } })
    return
  }
  const quotation = saved
  if (quotation.leadRef) {
    await leadStore.mutate((leads) =>
      leads.map((lead) =>
        lead.ref === quotation.leadRef && lead.status !== 'won' && lead.status !== 'lost'
          ? { ...lead, status: 'quoted', updatedAt: now }
          : lead,
      ),
    )
  }
  res.status(201).json({ data: { ...quotation, totals: quotationTotals(quotation) } })
  if (quotation.status !== 'draft') {
    const totals = quotationTotals(quotation)
    const email = quotationIssuedEmail({
      name: customer.name,
      reference: quotation.ref,
      title: quotation.title,
      total: formatPortalMoney(totals.total),
      validUntil: quotation.validUntil,
      brand: content.brand.name,
      portalUrl: portalUrl('/portal'),
    })
    void emailCustomer({
      customerId: customer.id,
      field: 'emailBilling',
      to: customer.email,
      kind: 'quotation-issued',
      ...email,
    }).catch((error) => console.error('[hvac-api] quotation email failed', error))
  }
})

portalAdminRouter.post('/customers/:id/quotations', async (req, res) => {
  const parsed = quotationInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Check the quotation.',
      },
    })
    return
  }
  const customer = await findCustomer(req.params.id)
  if (!customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Customer not found.' } })
    return
  }
  const content = await readSiteContent()
  const now = nowIso()
  let saved: QuotationRecord | undefined
  await quotationStore.mutate((quotations) => {
    const record: QuotationRecord = {
      id: randomUUID(),
      ref: nextReference('QT', quotations),
      customerId: customer.id,
      leadRef: parsed.data.leadRef ?? null,
      serviceSlug: parsed.data.serviceSlug ?? null,
      title: parsed.data.title,
      service: parsed.data.service,
      lines: parsed.data.lines.map((line) => ({ ...line, id: line.id ?? randomUUID() })),
      discount: parsed.data.discount,
      notes: parsed.data.notes || content.brand.billing.invoiceNotes,
      terms: parsed.data.terms || content.brand.billing.invoiceTerms,
      status: parsed.data.status,
      validUntil: parsed.data.validUntil,
      acceptedAt: null,
      sentAt: parsed.data.status === 'sent' ? now : null,
      lastReminderAt: null,
      changeRequest: null,
      createdAt: now,
      updatedAt: now,
    }
    saved = record
    return [record, ...quotations]
  })
  res.status(201).json({ data: saved && { ...saved, totals: quotationTotals(saved) } })
  if (saved?.leadRef) {
    await leadStore.mutate((leads) =>
      leads.map((lead) =>
        lead.ref === saved?.leadRef && lead.status !== 'won' && lead.status !== 'lost'
          ? { ...lead, status: 'quoted', updatedAt: nowIso() }
          : lead,
      ),
    )
  }
  if (saved && saved.status !== 'draft') {
    const quotation = saved
    const totals = quotationTotals(quotation)
    const email = quotationIssuedEmail({
      name: customer.name,
      reference: quotation.ref,
      title: quotation.title,
      total: formatPortalMoney(totals.total),
      validUntil: quotation.validUntil ?? '',
      brand: content.brand.name,
      portalUrl: portalUrl('/portal'),
    })
    void emailCustomer({
      customerId: customer.id,
      field: 'emailBilling',
      to: customer.email,
      kind: 'quotation-issued',
      ...email,
    }).catch((error) => console.error('[hvac-api] quotation email failed', error))
  }
})

portalAdminRouter.get('/customers/:id/quotations/:quotationId/pdf', async (req, res) => {
  const quotations = await quotationStore.read()
  const quotation = quotations.find(
    (entry) => entry.id === req.params.quotationId && entry.customerId === req.params.id,
  )
  const customer = await findCustomer(req.params.id)
  if (!quotation || !customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Quotation not found.' } })
    return
  }
  const content = await readSiteContent()
  streamQuotationPdf(
    res,
    { ...quotation, totals: quotationTotals(quotation) },
    content.brand,
    customer,
  )
})

portalAdminRouter.patch('/customers/:id/quotations/:quotationId', async (req, res) => {
  const parsed = quotationPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Check the quotation.' } })
    return
  }
  const currentQuotation = (await quotationStore.read()).find(
    (quotation) =>
      quotation.id === req.params.quotationId && quotation.customerId === req.params.id,
  )
  if (!currentQuotation) {
    res.status(404).json({ error: { code: 'not_found', message: 'Quotation not found.' } })
    return
  }
  if (!ifMatchSatisfied(req, currentQuotation.updatedAt)) {
    res.status(412).json({
      error: {
        code: 'stale_record',
        message: 'This quotation changed in another session. Reload and apply your edit again.',
      },
    })
    return
  }
  let saved: QuotationRecord | undefined
  let notifyCustomer: QuotationRecord | undefined
  await quotationStore.mutate((quotations) =>
    quotations.map((quotation) => {
      if (quotation.id !== req.params.quotationId || quotation.customerId !== req.params.id) {
        return quotation
      }
      saved = {
        ...quotation,
        ...parsed.data,
        lines: parsed.data.lines
          ? parsed.data.lines.map((line) => ({ ...line, id: line.id ?? randomUUID() }))
          : quotation.lines,
        sentAt:
          (parsed.data.status ?? quotation.status) === 'sent' && quotation.status !== 'sent'
            ? nowIso()
            : quotation.sentAt,
        acceptedAt:
          (parsed.data.status ?? quotation.status) === 'sent' ? null : quotation.acceptedAt,
        changeRequest:
          (parsed.data.status ?? quotation.status) === 'sent' ? null : quotation.changeRequest,
        updatedAt: nowIso(),
      }
      if (quotation.status !== 'sent' && saved.status === 'sent') notifyCustomer = saved
      return saved
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Quotation not found.' } })
    return
  }
  res.json({ data: { ...saved, totals: quotationTotals(saved) } })
  if (notifyCustomer) {
    const quotation = notifyCustomer
    const customer = await findCustomer(req.params.id)
    if (customer) {
      const content = await readSiteContent()
      const email = quotationIssuedEmail({
        name: customer.name,
        reference: quotation.ref,
        title: quotation.title,
        total: formatPortalMoney(quotationTotals(quotation).total),
        validUntil: quotation.validUntil ?? '',
        brand: content.brand.name,
        portalUrl: portalUrl('/portal'),
      })
      void emailCustomer({
        customerId: customer.id,
        field: 'emailBilling',
        to: customer.email,
        kind: 'quotation-issued',
        ...email,
      }).catch((error) => console.error('[hvac-api] quotation email failed', error))
    }
  }
})

portalAdminRouter.delete('/customers/:id/quotations/:quotationId', async (req, res) => {
  await quotationStore.mutate((quotations) =>
    quotations.filter(
      (quotation) =>
        !(quotation.id === req.params.quotationId && quotation.customerId === req.params.id),
    ),
  )
  res.json({ data: { deleted: req.params.quotationId } })
})

/* AMC */
portalAdminRouter.get('/amc-contracts', async (_req, res) => {
  res.json({ data: await amcStore.read() })
})

portalAdminRouter.post('/customers/:id/amc', async (req, res) => {
  const parsed = amcInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Check the contract.',
      },
    })
    return
  }
  const customer = await findCustomer(req.params.id)
  if (!customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Customer not found.' } })
    return
  }
  const now = nowIso()
  let saved: AmcContract | undefined
  await amcStore.mutate((contracts) => {
    const record: AmcContract = {
      id: randomUUID(),
      ref: nextReference('AMC', contracts),
      customerId: customer.id,
      ...parsed.data,
      renewalRequestedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    saved = record
    return [record, ...contracts]
  })
  res.status(201).json({ data: saved })
})

portalAdminRouter.patch('/customers/:id/amc/:contractId', async (req, res) => {
  const parsed = amcPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Check the contract.' } })
    return
  }
  const currentContract = (await amcStore.read()).find(
    (contract) => contract.id === req.params.contractId && contract.customerId === req.params.id,
  )
  if (!currentContract) {
    res.status(404).json({ error: { code: 'not_found', message: 'Contract not found.' } })
    return
  }
  if (!ifMatchSatisfied(req, currentContract.updatedAt)) {
    res.status(412).json({
      error: {
        code: 'stale_record',
        message: 'This contract changed in another session. Reload and apply your edit again.',
      },
    })
    return
  }
  let saved: AmcContract | undefined
  await amcStore.mutate((contracts) =>
    contracts.map((contract) => {
      if (contract.id !== req.params.contractId || contract.customerId !== req.params.id) {
        return contract
      }
      saved = { ...contract, ...parsed.data, updatedAt: nowIso() }
      return saved
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Contract not found.' } })
    return
  }
  res.json({ data: saved })
})

portalAdminRouter.delete('/customers/:id/amc/:contractId', async (req, res) => {
  await amcStore.mutate((contracts) =>
    contracts.filter(
      (contract) =>
        !(contract.id === req.params.contractId && contract.customerId === req.params.id),
    ),
  )
  res.json({ data: { deleted: req.params.contractId } })
})

/* Reports */
portalAdminRouter.post('/customers/:id/reports', async (req, res) => {
  const parsed = jobReportInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Check the report.',
      },
    })
    return
  }
  const customer = await findCustomer(req.params.id)
  if (!customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Customer not found.' } })
    return
  }
  const now = nowIso()
  let saved: JobReport | undefined
  await reportStore.mutate((reports) => {
    const record: JobReport = {
      id: randomUUID(),
      ref: nextReference('RPT', reports),
      customerId: customer.id,
      appointmentId: parsed.data.appointmentId ?? null,
      equipmentId: parsed.data.equipmentId ?? null,
      title: parsed.data.title,
      summary: parsed.data.summary,
      checklist: parsed.data.checklist.map((item) => ({ ...item, id: randomUUID() })),
      photos: parsed.data.photos.map((photo) => ({ ...photo, id: randomUUID() })),
      findings: parsed.data.findings,
      recommendations: parsed.data.recommendations,
      technician: parsed.data.technician,
      completedAt: parsed.data.completedAt || now,
      createdAt: now,
      updatedAt: now,
    }
    saved = record
    return [record, ...reports]
  })
  res.status(201).json({ data: saved })
})

portalAdminRouter.patch('/customers/:id/reports/:reportId', async (req, res) => {
  const parsed = jobReportPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Check the report.' } })
    return
  }
  let saved: JobReport | undefined
  await reportStore.mutate((reports) =>
    reports.map((report) => {
      if (report.id !== req.params.reportId || report.customerId !== req.params.id) return report
      saved = {
        ...report,
        ...parsed.data,
        checklist: parsed.data.checklist
          ? parsed.data.checklist.map((item) => ({ ...item, id: randomUUID() }))
          : report.checklist,
        photos: parsed.data.photos
          ? parsed.data.photos.map((photo) => ({ ...photo, id: randomUUID() }))
          : report.photos,
        updatedAt: nowIso(),
      }
      return saved
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Report not found.' } })
    return
  }
  res.json({ data: saved })
})

portalAdminRouter.delete('/customers/:id/reports/:reportId', async (req, res) => {
  await reportStore.mutate((reports) =>
    reports.filter(
      (report) => !(report.id === req.params.reportId && report.customerId === req.params.id),
    ),
  )
  res.json({ data: { deleted: req.params.reportId } })
})

/* Tickets */
portalAdminRouter.patch('/customers/:id/preferences', async (req, res) => {
  const parsed = notificationPreferencesPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: { code: 'validation_error', message: 'Check the preference values.' } })
    return
  }
  const customer = await findCustomer(req.params.id)
  if (!customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Customer not found.' } })
    return
  }
  let updated = null
  await preferenceStore.mutate((all) => {
    updated = {
      ...(all[customer.id] ?? defaultPreferences(customer.id)),
      ...parsed.data,
      customerId: customer.id,
      updatedAt: nowIso(),
    }
    return { ...all, [customer.id]: updated }
  })
  res.json({ data: updated })
})

portalAdminRouter.get('/support-tickets', async (_req, res) => {
  const tickets = await ticketStore.read()
  res.json({ data: [...tickets].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)) })
})

portalAdminRouter.post('/support-tickets/:id/messages', async (req, res) => {
  const parsed = ticketReplySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Write a reply.' } })
    return
  }
  let saved: SupportTicket | undefined
  await ticketStore.mutate((tickets) =>
    tickets.map((ticket) => {
      if (ticket.id !== req.params.id) return ticket
      saved = {
        ...ticket,
        status: ticket.status === 'closed' ? 'closed' : 'in-progress',
        messages: [
          ...ticket.messages,
          {
            id: randomUUID(),
            at: nowIso(),
            authorRole: 'admin',
            authorName: String((res.locals.admin as { email?: string }).email ?? 'Works desk'),
            body: parsed.data.body,
          },
        ],
        updatedAt: nowIso(),
      }
      return saved
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Request not found.' } })
    return
  }
  res.json({ data: saved })
  const reply = saved.messages.at(-1)
  if (reply && reply.authorRole === 'admin') {
    const ticket = saved
    const customer = await findCustomer(ticket.customerId)
    if (customer) {
      void (async () => {
        const content = await readSiteContent()
        const email = supportTicketReplyEmail({
          name: customer.name,
          reference: ticket.ref,
          subject: ticket.subject,
          body: reply.body,
          brand: content.brand.name,
          portalUrl: portalUrl('/portal'),
        })
        await emailCustomer({
          customerId: customer.id,
          field: 'emailService',
          to: customer.email,
          kind: 'support-ticket-reply',
          ...email,
        })
      })().catch((error) => console.error('[hvac-api] support reply email failed', error))
    }
  }
})

portalAdminRouter.patch('/support-tickets/:id', async (req, res) => {
  const parsed = ticketPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Choose a status.' } })
    return
  }
  let saved: SupportTicket | undefined
  await ticketStore.mutate((tickets) =>
    tickets.map((ticket) => {
      if (ticket.id !== req.params.id) return ticket
      saved = { ...ticket, status: parsed.data.status ?? ticket.status, updatedAt: nowIso() }
      return saved
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Request not found.' } })
    return
  }
  res.json({ data: saved })
})
