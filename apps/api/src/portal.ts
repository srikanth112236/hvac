import { randomUUID } from 'node:crypto'
import { Router, type Response } from 'express'
import {
  appointmentCreateSchema,
  appointmentPatchSchema,
  customerBookingSchema,
  customerAppointmentActionSchema,
  customerStatusPatchSchema,
  invoiceTotals,
  serviceWindowLabel,
  type AdminLead,
  type AppointmentRecord,
  type CustomerAccountWithStats,
  type CustomerPortalOverview,
  type ServiceWindow,
} from '@hvac/shared'
import { invoiceStore, toInvoiceView } from './business.js'
import { readSiteContent } from './content.js'
import { appendLead, readLeads } from './leads.js'
import {
  customerStore,
  findCustomerByEmail,
  publicCustomer,
  readPublicCustomers,
  requireCustomer,
  requireCustomerMutation,
  revokeCustomerSessions,
} from './portalAuth.js'
import { requireAdmin, requireAdminMutation } from './auth.js'
import { BUSINESS_TIMEZONE } from './config.js'
import { createStore } from './store.js'
import { appointmentConfirmation, sendMail } from './mailer.js'
import { hourInZone, startOfTodayInZone, zonedTimeToUtc } from './time.js'

export const appointmentStore = createStore<AppointmentRecord[]>('appointments.json', () => [])

const WINDOW_HOUR: Record<Exclude<ServiceWindow, 'emergency'>, number> = {
  morning: 9,
  afternoon: 12,
  evening: 16,
}

function windowHour(window: ServiceWindow): number {
  if (window === 'emergency') {
    return Math.min(23, hourInZone(BUSINESS_TIMEZONE) + 2)
  }
  return WINDOW_HOUR[window]
}

function nowIso(): string {
  return new Date().toISOString()
}

function nextAppointmentReference(appointments: AppointmentRecord[]): string {
  const year = new Date().getFullYear()
  const head = `APT-${year}-`
  const highest = appointments.reduce((max, appointment) => {
    if (!appointment.ref.startsWith(head)) return max
    const value = Number.parseInt(appointment.ref.slice(head.length), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `${head}${String(highest + 1).padStart(4, '0')}`
}

function parseSchedule(value: string, window: ServiceWindow): Date | null {
  const raw = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    // Date-only input means a date at the business's local window hour.
    return zonedTimeToUtc(raw, windowHour(window), BUSINESS_TIMEZONE)
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function scheduleIsPast(date: Date): boolean {
  return date.getTime() < startOfTodayInZone(BUSINESS_TIMEZONE).getTime()
}

function validationError(res: Response, message: string): void {
  res.status(400).json({ error: { code: 'validation_error', message } })
}

async function resolveServiceName(slug: string | null | undefined): Promise<string> {
  if (!slug) return 'HVAC service'
  const content = await readSiteContent()
  return content.services.find((service) => service.id === slug)?.name ?? slug
}

async function notifyBooking(appointment: AppointmentRecord): Promise<void> {
  if (!appointment.customerEmail) return
  try {
    const content = await readSiteContent()
    const when = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(appointment.scheduledAt))
    const message = appointmentConfirmation({
      name: appointment.customerName,
      reference: appointment.ref,
      serviceName: appointment.serviceName,
      scheduledAt: when,
      window: serviceWindowLabel(appointment.window),
      address: appointment.address,
      brand: content.brand.shortName || content.brand.name,
    })
    await sendMail({
      to: appointment.customerEmail,
      kind: 'booking-confirmation',
      ...message,
    })
  } catch (error) {
    console.error('[hvac-api] booking confirmation failed', error)
  }
}

async function createLead(input: {
  name: string
  email: string
  phone: string
  serviceSlug: string | null
  serviceName: string
  address: string
  notes: string
  window: ServiceWindow
  appointmentRef: string
}): Promise<AdminLead> {
  const now = nowIso()
  return appendLead({
    ref: '',
    createdAt: now,
    updatedAt: now,
    status: 'new',
    source: 'customer-portal',
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: input.notes || `Service visit requested through the customer portal for ${input.serviceName}.`,
    serviceSlug: input.serviceSlug,
    serviceName: input.serviceName,
    city: input.address.split(',').map((part) => part.trim()).filter(Boolean).at(-1) ?? null,
    urgency: input.window === 'emergency' ? 'emergency' : 'normal',
    plan: null,
    context: input.appointmentRef
      ? `Customer portal booking · ${input.appointmentRef}`
      : 'Customer portal booking',
    owner: null,
    value: null,
    followUpAt: null,
    notes: [],
  })
}

function invoicesForEmail<T extends { customerEmail: string }>(invoices: T[], email: string): T[] {
  const normalized = email.trim().toLowerCase()
  return invoices.filter((invoice) => invoice.customerEmail.trim().toLowerCase() === normalized)
}

async function buildOverview(email: string): Promise<CustomerPortalOverview> {
  const customer = await findCustomerByEmail(email)
  if (!customer) throw new Error('Customer not found')
  const [invoiceRecords, appointmentRecords, leads] = await Promise.all([
    invoiceStore.read(),
    appointmentStore.read(),
    readLeads(),
  ])
  const ownInvoices = invoicesForEmail(invoiceRecords, customer.email).sort(
    (a, b) => Date.parse(b.issueDate) - Date.parse(a.issueDate),
  )
  const ownAppointments = appointmentRecords
    .filter(
      (appointment) =>
        appointment.customerId === customer.id ||
        appointment.customerEmail.trim().toLowerCase() === customer.email,
    )
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt))
  const ownRequests = leads.filter(
    (lead) => lead.email.trim().toLowerCase() === customer.email,
  )
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
    customer: publicCustomer(customer),
    invoices: ownInvoices.map((invoice) => toInvoiceView(invoice)),
    appointments: ownAppointments,
    requests: ownRequests,
    nextAppointment: upcoming[0] ?? null,
    summary: {
      outstanding,
      paidLifetime,
      invoiceCount: ownInvoices.length,
      openAppointments: ownAppointments.filter(
        (appointment) => appointment.status !== 'completed' && appointment.status !== 'cancelled',
      ).length,
      completedVisits: ownAppointments.filter((appointment) => appointment.status === 'completed').length,
    },
  }
}

export const portalRouter = Router()

portalRouter.get('/portal/overview', requireCustomer, async (_req, res) => {
  const customer = res.locals.customer as { email: string }
  const overview = await buildOverview(customer.email)
  res.set('Cache-Control', 'private, no-store')
  res.json({ data: overview })
})

portalRouter.get('/portal/invoices/:id', requireCustomer, async (req, res) => {
  const customer = res.locals.customer as { email: string }
  const invoices = await invoiceStore.read()
  const invoice = invoicesForEmail(invoices, customer.email).find(
    (entry) => entry.id === req.params.id || entry.ref === req.params.id,
  )
  if (!invoice) {
    res.status(404).json({ error: { code: 'not_found', message: 'Invoice not found.' } })
    return
  }
  res.set('Cache-Control', 'private, no-store')
  res.json({ data: toInvoiceView(invoice) })
})

portalRouter.post(
  '/portal/appointments',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const parsed = customerBookingSchema.safeParse(req.body)
    if (!parsed.success) {
      validationError(res, parsed.error.issues[0]?.message ?? 'Check the visit details.')
      return
    }
    const scheduled = parseSchedule(parsed.data.scheduledAt, parsed.data.window)
    if (!scheduled) {
      validationError(res, 'Choose a valid visit date.')
      return
    }
    if (scheduleIsPast(scheduled)) {
      validationError(res, 'Choose today or a future date for the visit.')
      return
    }
    const customer = res.locals.customer as {
      id: string
      name: string
      email: string
      phone: string
    }
    if (parsed.data.rebookOf) {
      const appointments = await appointmentStore.read()
      const previous = appointments.find(
        (appointment) =>
          (appointment.id === parsed.data.rebookOf || appointment.ref === parsed.data.rebookOf) &&
          (appointment.customerId === customer.id || appointment.customerEmail === customer.email),
      )
      if (!previous) {
        res.status(404).json({ error: { code: 'not_found', message: 'That appointment was not found.' } })
        return
      }
    }
    const serviceName = await resolveServiceName(parsed.data.serviceSlug)
    const lead = await createLead({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      serviceSlug: parsed.data.serviceSlug,
      serviceName,
      address: parsed.data.address,
      notes: parsed.data.notes,
      window: parsed.data.window,
      appointmentRef: '',
    })
    const now = nowIso()
    const base: Omit<AppointmentRecord, 'ref'> = {
      id: randomUUID(),
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      serviceSlug: parsed.data.serviceSlug,
      serviceName,
      address: parsed.data.address,
      scheduledAt: scheduled.toISOString(),
      window: parsed.data.window,
      status: 'requested',
      notes: parsed.data.notes,
      technician: '',
      leadRef: lead.ref,
      rebookOf: parsed.data.rebookOf ?? null,
      createdAt: now,
      updatedAt: now,
    }
    let saved: AppointmentRecord | undefined
    await appointmentStore.mutate((appointments) => {
      const record: AppointmentRecord = { ...base, ref: nextAppointmentReference(appointments) }
      saved = record
      return [record, ...appointments]
    })
    const appointment = saved
    if (!appointment) {
      res.status(500).json({ error: { code: 'server_error', message: 'The visit could not be saved.' } })
      return
    }
    res.status(201).json({ data: appointment, lead })
    void notifyBooking(appointment)
  },
)

portalRouter.patch(
  '/portal/appointments/:id',
  requireCustomer,
  requireCustomerMutation,
  async (req, res) => {
    const parsed = customerAppointmentActionSchema.safeParse(req.body)
    if (!parsed.success) {
      validationError(res, 'Choose a valid change for this visit.')
      return
    }
    const customer = res.locals.customer as { id: string; email: string }
    const appointments = await appointmentStore.read()
    const current = appointments.find(
      (appointment) =>
        (appointment.id === req.params.id || appointment.ref === req.params.id) &&
        (appointment.customerId === customer.id ||
          appointment.customerEmail.trim().toLowerCase() === customer.email),
    )
    if (!current) {
      res.status(404).json({ error: { code: 'not_found', message: 'That visit was not found.' } })
      return
    }
    if (current.status === 'completed' || current.status === 'cancelled') {
      res.status(400).json({
        error: { code: 'closed', message: 'A completed or cancelled visit cannot be changed.' },
      })
      return
    }

    let scheduledAt = current.scheduledAt
    let window = current.window
    if (parsed.data.action === 'reschedule') {
      if (!parsed.data.scheduledAt) {
        validationError(res, 'Choose the new visit date.')
        return
      }
      const parsedSchedule = parseSchedule(parsed.data.scheduledAt, parsed.data.window ?? current.window)
      if (!parsedSchedule || scheduleIsPast(parsedSchedule)) {
        validationError(res, 'Choose today or a future date for the visit.')
        return
      }
      scheduledAt = parsedSchedule.toISOString()
      window = parsed.data.window ?? current.window
    }

    let saved: AppointmentRecord | undefined
    await appointmentStore.mutate((list) =>
      list.map((appointment) => {
        if (appointment.id !== current.id) return appointment
        const updated: AppointmentRecord = {
          ...appointment,
          scheduledAt,
          window,
          status: parsed.data.action === 'cancel' ? 'cancelled' : appointment.status,
          notes:
            parsed.data.action === 'reschedule'
              ? appointment.notes
              : `${appointment.notes}${appointment.notes ? ' · ' : ''}Cancelled by customer`,
          updatedAt: nowIso(),
        }
        saved = updated
        return updated
      }),
    )
    if (!saved) {
      res.status(404).json({ error: { code: 'not_found', message: 'That visit was not found.' } })
      return
    }
    res.json({ data: saved })
  },
)

/* -------------------------------------------------------------------------- */
/*  Admin customers and appointments                                          */
/* -------------------------------------------------------------------------- */export const customersRouter = Router()
customersRouter.use(requireAdmin, requireAdminMutation)

customersRouter.get('/customers', async (_req, res) => {
  const [customers, invoices, appointments] = await Promise.all([
    readPublicCustomers(),
    invoiceStore.read(),
    appointmentStore.read(),
  ])
  const data: CustomerAccountWithStats[] = customers
    .map((customer) => {
      const ownInvoices = invoicesForEmail(invoices, customer.email)
      const ownAppointments = appointments.filter(
        (appointment) =>
          appointment.customerId === customer.id || appointment.customerEmail === customer.email,
      )
      const openBalance = ownInvoices.reduce((sum, invoice) => {
        const totals = invoiceTotals(invoice)
        if (totals.state === 'draft' || totals.state === 'cancelled') return sum
        return sum + totals.balance
      }, 0)
      const upcoming = ownAppointments
        .filter(
          (appointment) =>
            appointment.status !== 'cancelled' &&
            appointment.status !== 'completed' &&
            Date.parse(appointment.scheduledAt) >= Date.now() - 86_400_000,
        )
        .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0]
      return {
        ...customer,
        invoiceCount: ownInvoices.length,
        openBalance,
        appointmentCount: ownAppointments.length,
        nextAppointmentAt: upcoming?.scheduledAt ?? null,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  res.json({ data })
})

customersRouter.patch('/customers/:id', async (req, res) => {
  const parsed = customerStatusPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, 'Choose a valid account status.')
    return
  }
  const existing = (await customerStore.read()).find((entry) => entry.id === req.params.id)
  if (existing && parsed.data.status === 'active' && (existing.status ?? 'active') === 'unverified') {
    res.status(400).json({
      error: {
        code: 'email_unverified',
        message: 'The customer must verify the email address before portal access is approved.',
      },
    })
    return
  }
  const customers = await customerStore.mutate((current) =>
    current.map((customer) =>
      customer.id === req.params.id
        ? { ...customer, status: parsed.data.status, updatedAt: nowIso() }
        : customer,
    ),
  )
  const customer = customers.find((entry) => entry.id === req.params.id)
  if (!customer) {
    res.status(404).json({ error: { code: 'not_found', message: 'Customer not found.' } })
    return
  }
  if (parsed.data.status !== 'active') {
    await revokeCustomerSessions(customer.id)
  }
  res.json({ data: publicCustomer(customer) })
})

customersRouter.get('/appointments', async (_req, res) => {
  const appointments = await appointmentStore.read()
  res.json({ data: [...appointments].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)) })
})

customersRouter.post('/appointments', async (req, res) => {
  const parsed = appointmentCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues[0]?.message ?? 'Check the appointment details.')
    return
  }
  const scheduled = parseSchedule(parsed.data.scheduledAt, parsed.data.window)
  if (!scheduled) {
    validationError(res, 'Choose a valid visit date.')
    return
  }
  const account = parsed.data.customerEmail
    ? await findCustomerByEmail(parsed.data.customerEmail)
    : null
  const now = nowIso()
  const base: Omit<AppointmentRecord, 'ref'> = {
    id: randomUUID(),
    customerId: account?.id ?? parsed.data.customerId ?? null,
    customerName: parsed.data.customerName,
    customerEmail: account?.email ?? parsed.data.customerEmail,
    customerPhone: parsed.data.customerPhone || account?.phone || '',
    serviceSlug: parsed.data.serviceSlug ?? null,
    serviceName: parsed.data.serviceName,
    address: parsed.data.address,
    scheduledAt: scheduled.toISOString(),
    window: parsed.data.window,
    status: 'scheduled',
    notes: parsed.data.notes,
    technician: parsed.data.technician,
    leadRef: parsed.data.leadRef ?? null,
    rebookOf: parsed.data.rebookOf ?? null,
    createdAt: now,
    updatedAt: now,
  }
  let saved: AppointmentRecord | undefined
  await appointmentStore.mutate((appointments) => {
    const record: AppointmentRecord = { ...base, ref: nextAppointmentReference(appointments) }
    saved = record
    return [record, ...appointments]
  })
  if (!saved) {
    res.status(500).json({ error: { code: 'server_error', message: 'The visit could not be saved.' } })
    return
  }
  res.status(201).json({ data: saved })
})

customersRouter.patch('/appointments/:id', async (req, res) => {
  const parsed = appointmentPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues[0]?.message ?? 'Check the appointment details.')
    return
  }
  const current = (await appointmentStore.read()).find(
    (appointment) => appointment.id === req.params.id || appointment.ref === req.params.id,
  )
  if (!current) {
    res.status(404).json({ error: { code: 'not_found', message: 'Appointment not found.' } })
    return
  }
  if (parsed.data.scheduledAt) {
    const scheduled = parseSchedule(parsed.data.scheduledAt, parsed.data.window ?? current.window)
    if (!scheduled) {
      validationError(res, 'Choose a valid visit date.')
      return
    }
  }
  let saved: AppointmentRecord | undefined
  await appointmentStore.mutate((appointments) =>
    appointments.map((appointment) => {
      if (appointment.id !== req.params.id && appointment.ref !== req.params.id) return appointment
      let scheduledAt = appointment.scheduledAt
      if (parsed.data.scheduledAt) {
        const scheduled = parseSchedule(
          parsed.data.scheduledAt,
          parsed.data.window ?? appointment.window,
        )
        if (scheduled) scheduledAt = scheduled.toISOString()
      }
      const updated: AppointmentRecord = {
        ...appointment,
        ...parsed.data,
        scheduledAt,
        status: parsed.data.status ?? appointment.status,
        updatedAt: nowIso(),
      }
      saved = updated
      return updated
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Appointment not found.' } })
    return
  }
  res.json({ data: saved })
})
