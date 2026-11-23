import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  ROLE_PERMISSIONS,
  adminLeadCreateSchema,
  leadPatchSchema,
  reminderInputSchema,
  reminderPatchSchema,
  siteContentPayloadSchema,
  type AdminLead,
  type ReminderRecord,
} from '@hvac/shared'
import { requireAdmin, requireAdminMutation, requirePermissions, requireRole } from './auth.js'
import {
  expenseStore,
  invoiceStore,
  payrollStore,
  readBusinessSnapshot,
  summarizeExpenses,
  summarizeInvoices,
  summarizePayroll,
  teamStore,
  toInvoiceView,
} from './business.js'
import { contentStore, readSiteContent } from './content.js'
import {
  ContentRevisionError,
  listContentRevisions,
  restoreContentRevision,
  saveContentWithRevision,
} from './contentHistory.js'
import { appendLead, leadStore, readLeads } from './leads.js'
import { reminderStore } from './reminders.js'
import { mailerStatus, readEmailLog } from './mailer.js'
import { readAuditLog } from './audit.js'
import { DATA_VERSION } from './migrations.js'
import { runAmcVisitScheduling } from './jobs.js'
import { mediaStore } from './media.js'
import { couponStore, newsletterStore } from './marketing.js'
import { signupStore } from './newsletterSignups.js'
import { appointmentStore } from './portal.js'
import { customerStore } from './portalAuth.js'
import { preferenceStore } from './customerPreferences.js'
import { jobStore } from './jobStore.js'
import {
  amcStore,
  equipmentStore,
  quotationStore,
  reportStore,
  siteStore,
  ticketStore,
} from './portalModules.js'

export const adminRouter = Router()
adminRouter.use(
  requireAdmin,
  requirePermissions('leads.write', 'content.write'),
  requireAdminMutation,
)

adminRouter.get('/permissions', (_req, res) => {
  res.json({
    data: {
      roles: ADMIN_ROLES,
      permissions: ADMIN_PERMISSIONS,
      matrix: ROLE_PERMISSIONS,
      readOnly: true,
    },
  })
})

const LEAD_STATUS_VALUES = ['new', 'contacted', 'site-visit', 'quoted', 'won', 'lost'] as const

function nowIso(): string {
  return new Date().toISOString()
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function monthKey(value: string): string {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

adminRouter.get('/mail/status', (_req, res) => {
  res.json({ data: mailerStatus() })
})

adminRouter.get('/billing', async (_req, res) => {
  const content = await readSiteContent()
  res.json({ data: content.brand.billing })
})

adminRouter.post('/amc/auto-schedule', async (_req, res) => {
  const created = await runAmcVisitScheduling()
  res.json({ data: { created } })
})

adminRouter.get('/audit', requireRole('owner', 'admin'), async (req, res) => {
  const requested = Number.parseInt(String(req.query.limit ?? '50'), 10)
  const limit = Number.isFinite(requested) ? requested : 50
  res.json({ data: await readAuditLog(limit) })
})

adminRouter.get('/export', requireRole('owner', 'admin'), async (_req, res) => {
  const [
    content,
    leads,
    customers,
    appointments,
    invoices,
    expenses,
    team,
    payroll,
    reminders,
    media,
    newsletters,
    coupons,
    signups,
    sites,
    equipment,
    quotations,
    amc,
    reports,
    jobs,
    tickets,
    preferences,
    audit,
    emailLog,
  ] = await Promise.all([
    contentStore.read(),
    leadStore.read(),
    customerStore.read(),
    appointmentStore.read(),
    invoiceStore.read(),
    expenseStore.read(),
    teamStore.read(),
    payrollStore.read(),
    reminderStore.read(),
    mediaStore.read(),
    newsletterStore.read(),
    couponStore.read(),
    signupStore.read(),
    siteStore.read(),
    equipmentStore.read(),
    quotationStore.read(),
    amcStore.read(),
    reportStore.read(),
    jobStore.read(),
    ticketStore.read(),
    preferenceStore.read(),
    readAuditLog(1000),
    readEmailLog(1000),
  ])

  const stamp = new Date().toISOString().slice(0, 10)
  res.set('Content-Disposition', `attachment; filename="hvac-backup-${stamp}.json"`)
  res.json({
    generatedAt: new Date().toISOString(),
    dataVersion: DATA_VERSION,
    note: 'Contains customer PII and password hashes. Store encrypted and restrict access.',
    files: {
      'content.json': content,
      'leads.json': leads,
      'customers.json': customers,
      'appointments.json': appointments,
      'invoices.json': invoices,
      'expenses.json': expenses,
      'team.json': team,
      'payroll.json': payroll,
      'reminders.json': reminders,
      'media.json': media,
      'newsletters.json': newsletters,
      'coupons.json': coupons,
      'newsletter-signups.json': signups,
      'customer-sites.json': sites,
      'equipment.json': equipment,
      'quotations.json': quotations,
      'amc-contracts.json': amc,
      'job-reports.json': reports,
      'jobs.json': jobs,
      'support-tickets.json': tickets,
      'customer-preferences.json': preferences,
      'audit-log.json': audit,
      'email-log.json': emailLog,
    },
  })
})

adminRouter.get('/search', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : ''
  if (query.length < 2) {
    res.json({ data: { results: [] } })
    return
  }
  const [leads, customers, invoices, quotations, tickets, equipment] = await Promise.all([
    leadStore.read(),
    customerStore.read(),
    invoiceStore.read(),
    quotationStore.read(),
    ticketStore.read(),
    equipmentStore.read(),
  ])
  type Result = { type: string; id: string; title: string; subtitle: string; path: string }
  const results: Result[] = []
  const matches = (...values: Array<string | null | undefined>) =>
    values.some((value) => (value ?? '').toLowerCase().includes(query))

  for (const lead of leads) {
    if (matches(lead.ref, lead.name, lead.email, lead.phone, lead.serviceName)) {
      results.push({
        type: 'Lead',
        id: lead.ref,
        title: `${lead.ref} · ${lead.name}`,
        subtitle: `${lead.status} · ${lead.serviceName ?? 'Unallocated'}`,
        path: '/admin/leads',
      })
    }
  }
  for (const customer of customers) {
    if (matches(customer.name, customer.email, customer.phone)) {
      results.push({
        type: 'Customer',
        id: customer.id,
        title: customer.name,
        subtitle: `${customer.email} · ${customer.status}`,
        path: `/admin/customers/${customer.id}`,
      })
    }
  }
  for (const invoice of invoices) {
    if (matches(invoice.ref, invoice.customerName, invoice.customerEmail, invoice.service)) {
      results.push({
        type: 'Invoice',
        id: invoice.id,
        title: `${invoice.ref} · ${invoice.customerName}`,
        subtitle: `${invoice.status} · due ${invoice.dueDate}`,
        path: `/admin/invoices/${invoice.id}`,
      })
    }
  }
  for (const quotation of quotations) {
    if (matches(quotation.ref, quotation.title, quotation.service)) {
      results.push({
        type: 'Quotation',
        id: quotation.id,
        title: `${quotation.ref} · ${quotation.title}`,
        subtitle: `${quotation.status} · ${quotation.service || 'Defined scope'}`,
        path: `/admin/customers/${quotation.customerId}`,
      })
    }
  }
  for (const ticket of tickets) {
    if (matches(ticket.ref, ticket.subject, ticket.category)) {
      results.push({
        type: 'Ticket',
        id: ticket.id,
        title: `${ticket.ref} · ${ticket.subject}`,
        subtitle: `${ticket.status} · ${ticket.category}`,
        path: `/admin/customers/${ticket.customerId}`,
      })
    }
  }
  for (const item of equipment) {
    if (matches(item.name, item.brand, item.model, item.serial)) {
      results.push({
        type: 'Equipment',
        id: item.id,
        title: item.name,
        subtitle: [item.brand, item.model, item.serial].filter(Boolean).join(' · ') || 'Equipment',
        path: `/admin/customers/${item.customerId}`,
      })
    }
  }

  res.json({ data: { results: results.slice(0, 30) } })
})

function csvEscape(value: unknown): string {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
}

adminRouter.get('/csv/:type', async (req, res) => {
  const type = req.params.type
  let rows: unknown[][]
  if (type === 'leads') {
    const leads = await leadStore.read()
    rows = [
      [
        'ref',
        'createdAt',
        'updatedAt',
        'status',
        'source',
        'name',
        'email',
        'phone',
        'city',
        'serviceSlug',
        'serviceName',
        'urgency',
        'plan',
        'context',
        'value',
        'owner',
        'followUpAt',
        'message',
      ],
      ...leads.map((lead) => [
        lead.ref,
        lead.createdAt,
        lead.updatedAt,
        lead.status,
        lead.source,
        lead.name,
        lead.email,
        lead.phone,
        lead.city,
        lead.serviceSlug,
        lead.serviceName,
        lead.urgency,
        lead.plan,
        lead.context,
        lead.value,
        lead.owner,
        lead.followUpAt,
        lead.message,
      ]),
    ]
  } else if (type === 'invoices') {
    const invoices = await invoiceStore.read()
    rows = [
      ['ref', 'customer', 'email', 'issued', 'due', 'status', 'total', 'paid', 'balance'],
      ...invoices.map((invoice) => {
        const totals = toInvoiceView(invoice).totals
        return [
          invoice.ref,
          invoice.customerName,
          invoice.customerEmail,
          invoice.issueDate,
          invoice.dueDate,
          totals.state,
          totals.total,
          totals.paid,
          totals.balance,
        ]
      }),
    ]
  } else if (type === 'customers') {
    const customers = await customerStore.read()
    rows = [
      ['name', 'email', 'phone', 'address', 'status', 'createdAt'],
      ...customers.map((customer) => [
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        customer.status,
        customer.createdAt,
      ]),
    ]
  } else {
    res.status(404).json({ error: { code: 'not_found', message: 'Unknown CSV type.' } })
    return
  }
  res.set('Content-Type', 'text/csv; charset=utf-8')
  res.set(
    'Content-Disposition',
    `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
  )
  res.send(toCsv(rows))
})

adminRouter.get('/data-health', requireRole('owner', 'admin'), async (_req, res) => {
  const [
    customers,
    appointments,
    team,
    payroll,
    sites,
    equipment,
    quotations,
    amc,
    reports,
    jobs,
    tickets,
  ] = await Promise.all([
    customerStore.read(),
    appointmentStore.read(),
    teamStore.read(),
    payrollStore.read(),
    siteStore.read(),
    equipmentStore.read(),
    quotationStore.read(),
    amcStore.read(),
    reportStore.read(),
    jobStore.read(),
    ticketStore.read(),
  ])

  const customerIds = new Set(customers.map((entry) => entry.id))
  const teamIds = new Set(team.map((entry) => entry.id))
  const equipmentIds = new Set(equipment.map((entry) => entry.id))
  const issues: string[] = []

  for (const entry of payroll) {
    if (!teamIds.has(entry.memberId))
      issues.push(`Payroll ${entry.id} references a missing team member.`)
  }
  for (const entry of reports) {
    if (!customerIds.has(entry.customerId))
      issues.push(`Report ${entry.id} references a missing customer.`)
    if (entry.equipmentId && !equipmentIds.has(entry.equipmentId)) {
      issues.push(`Report ${entry.id} references missing equipment.`)
    }
  }
  for (const job of jobs) {
    if (!customerIds.has(job.customerId)) {
      issues.push(`Job ${job.ref} references a missing customer.`)
    }
    for (const equipmentId of job.equipmentIds) {
      if (!equipmentIds.has(equipmentId)) {
        issues.push(`Job ${job.ref} references missing equipment ${equipmentId}.`)
      }
    }
  }
  for (const entry of appointments) {
    if (entry.customerId && !customerIds.has(entry.customerId)) {
      issues.push(`Appointment ${entry.id} references a missing customer.`)
    }
  }
  for (const [label, rows] of [
    ['Site', sites],
    ['Equipment', equipment],
    ['Quotation', quotations],
    ['AMC contract', amc],
    ['Support ticket', tickets],
  ] as const) {
    for (const entry of rows) {
      if (!customerIds.has(entry.customerId)) {
        issues.push(`${label} ${entry.id} references a missing customer.`)
      }
    }
  }
  for (const contract of amc) {
    for (const equipmentId of contract.equipmentIds) {
      if (!equipmentIds.has(equipmentId)) {
        issues.push(`AMC ${contract.id} references missing equipment ${equipmentId}.`)
      }
    }
  }

  res.json({
    data: {
      generatedAt: new Date().toISOString(),
      dataVersion: DATA_VERSION,
      encrypted: Boolean(process.env.DATA_ENCRYPTION_KEY),
      counts: {
        customers: customers.length,
        appointments: appointments.length,
        team: team.length,
        payroll: payroll.length,
        sites: sites.length,
        equipment: equipment.length,
        quotations: quotations.length,
        amc: amc.length,
        reports: reports.length,
        jobs: jobs.length,
        tickets: tickets.length,
      },
      issues: issues.slice(0, 100),
    },
  })
})

/* -------------------------------------------------------------------------- */
/*  Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

adminRouter.get('/metrics', async (_req, res) => {
  const [leads, reminders, business, content] = await Promise.all([
    readLeads(),
    reminderStore.read(),
    readBusinessSnapshot(),
    readSiteContent(),
  ])

  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const todayEnd = startOfDay(new Date()) + 24 * 60 * 60 * 1000
  const byStatus = Object.fromEntries(LEAD_STATUS_VALUES.map((status) => [status, 0])) as Record<
    string,
    number
  >
  for (const lead of leads) byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1

  const pipelineValue = leads
    .filter((lead) => lead.status !== 'won' && lead.status !== 'lost')
    .reduce((sum, lead) => sum + (lead.value ?? 0), 0)
  const wonValue = leads
    .filter((lead) => lead.status === 'won')
    .reduce((sum, lead) => sum + (lead.value ?? 0), 0)

  const revenue: { month: string; amount: number }[] = []
  const financeTrend: {
    month: string
    collected: number
    expenses: number
    payroll: number
    net: number
  }[] = []
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date()
    date.setMonth(date.getMonth() - index)
    revenue.push({ month: monthKey(date.toISOString()), amount: 0 })
    financeTrend.push({
      month: monthKey(date.toISOString()),
      collected: 0,
      expenses: 0,
      payroll: 0,
      net: 0,
    })
  }

  const invoiceViews = business.invoices.map((invoice) => toInvoiceView(invoice))
  const invoiceSummary = summarizeInvoices(business.invoices)
  const expenseSummary = summarizeExpenses(business.expenses)
  const payrollSummary = summarizePayroll(business.payroll, business.team)
  const byMethod: Record<string, number> = {}
  for (const invoice of business.invoices) {
    for (const payment of invoice.payments) {
      byMethod[payment.method] = (byMethod[payment.method] ?? 0) + payment.amount
      const bucket = revenue.find((entry) => entry.month === monthKey(payment.receivedAt))
      if (bucket) bucket.amount += payment.amount
      const flow = financeTrend.find((entry) => entry.month === monthKey(payment.receivedAt))
      if (flow) flow.collected += payment.amount
    }
  }
  for (const expense of business.expenses) {
    const flow = financeTrend.find((entry) => entry.month === monthKey(expense.date))
    if (flow) flow.expenses += expense.amount
  }
  for (const entry of business.payroll) {
    if (entry.status !== 'paid') continue
    const flow = financeTrend.find(
      (month) => month.month === monthKey(entry.paidAt ?? entry.period),
    )
    if (flow) flow.payroll += entry.amount
  }
  for (const flow of financeTrend) {
    flow.net = flow.collected - flow.expenses - flow.payroll
  }

  const demand = new Map<string, number>()
  for (const lead of leads) {
    const key = lead.serviceName ?? 'Unallocated'
    demand.set(key, (demand.get(key) ?? 0) + 1)
  }

  const openReminders = reminders.filter((reminder) => reminder.status === 'open')

  res.json({
    data: {
      leads: {
        total: leads.length,
        byStatus,
        newThisWeek: leads.filter((lead) => new Date(lead.createdAt).getTime() >= weekAgo).length,
        overdueFollowUps: leads.filter(
          (lead) =>
            lead.followUpAt &&
            new Date(lead.followUpAt).getTime() < now &&
            lead.status !== 'won' &&
            lead.status !== 'lost',
        ).length,
        pipelineValue,
        wonValue,
      },
      payments: {
        collected: invoiceSummary.collected,
        pending: invoiceSummary.outstanding,
        overdue: invoiceSummary.overdueCount,
        count: invoiceSummary.count,
        byMethod,
      },
      invoices: invoiceSummary,
      finance: {
        invoiced: invoiceSummary.invoiced,
        collected: invoiceSummary.collected,
        outstanding: invoiceSummary.outstanding,
        overdueAmount: invoiceSummary.overdueAmount,
        expenses: expenseSummary.total,
        expensesThisMonth: expenseSummary.thisMonth,
        payrollThisMonth: payrollSummary.thisMonth,
        payrollPaidThisMonth: payrollSummary.thisMonthPaid,
        payrollCommitment: payrollSummary.monthlyPayrollCommitment,
        netThisMonth:
          invoiceSummary.collectedThisMonth -
          expenseSummary.thisMonth -
          payrollSummary.thisMonthPaid,
        netLifetime: invoiceSummary.collected - expenseSummary.total - payrollSummary.totalPaid,
        activeTeam: payrollSummary.activeTeam,
      },
      financeTrend,
      recentInvoices: invoiceViews.slice(0, 5),
      reminders: {
        open: openReminders.length,
        overdue: openReminders.filter((reminder) => new Date(reminder.dueAt).getTime() < now)
          .length,
        dueToday: openReminders.filter((reminder) => {
          const due = new Date(reminder.dueAt).getTime()
          return due >= startOfDay(new Date()) && due < todayEnd
        }).length,
      },
      revenue,
      serviceDemand: Array.from(demand.entries())
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      recentLeads: leads.slice(0, 6),
      content: {
        version: content.version,
        updatedAt: content.updatedAt,
      },
    },
  })
})

/* -------------------------------------------------------------------------- */
/*  Leads                                                                      */
/* -------------------------------------------------------------------------- */

adminRouter.get('/leads', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : null
  const service = typeof req.query.service === 'string' ? req.query.service : null
  const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : ''

  const leads = await readLeads()
  const filtered = leads.filter((lead) => {
    if (status && lead.status !== status) return false
    if (service && lead.serviceSlug !== service) return false
    if (query) {
      const haystack =
        `${lead.ref} ${lead.name} ${lead.phone} ${lead.email} ${lead.city ?? ''} ${lead.serviceName ?? ''}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.pageSize ?? '40'), 10) || 40),
  )
  const sorted = filtered.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))

  res.json({
    data: sorted.slice((page - 1) * pageSize, page * pageSize),
    meta: {
      count: filtered.length,
      total: leads.length,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    },
  })
})

adminRouter.get('/leads/export', async (_req, res) => {
  const [content, leads] = await Promise.all([readSiteContent(), readLeads()])
  res.set(
    'Content-Disposition',
    `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.json"`,
  )
  res.json({
    company: {
      name: content.brand.name,
      legalName: content.brand.legalName,
      monogram: content.brand.monogram,
      logo: null,
      contact: content.brand.contact,
    },
    exportedAt: new Date().toISOString(),
    leads,
  })
})

adminRouter.get('/leads/:ref', async (req, res) => {
  const leads = await readLeads()
  const lead = leads.find((entry) => entry.ref === req.params.ref)
  if (!lead) {
    res.status(404).json({ error: { code: 'not_found', message: 'Lead not found.' } })
    return
  }
  res.json({ data: lead })
})

adminRouter.post('/leads', async (req, res) => {
  const parsed = adminLeadCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid lead.',
      },
    })
    return
  }

  const content = await readSiteContent()
  const input = parsed.data
  const service = content.services.find((entry) => entry.id === input.serviceSlug)
  const now = nowIso()
  const record = await appendLead({
    ref: '',
    createdAt: now,
    updatedAt: now,
    status: input.status,
    source: 'admin',
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: input.message || 'Manual lead created in the admin panel.',
    serviceSlug: input.serviceSlug ?? null,
    serviceName: service?.name ?? null,
    city: input.city ?? null,
    urgency: 'normal',
    plan: null,
    context: 'Created by admin',
    owner: res.locals.admin.email as string,
    value: input.value ?? null,
    followUpAt: null,
    notes: [],
  })

  res.status(201).json({ data: record })
})

adminRouter.patch('/leads/:ref', async (req, res) => {
  const parsed = leadPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid patch.',
      },
    })
    return
  }

  const patch = parsed.data
  let updated: AdminLead | undefined
  await leadStore.mutate((leads) =>
    leads.map((current) => {
      if (current.ref !== req.params.ref) return current
      const record: AdminLead = {
        ...current,
        status: patch.status ?? current.status,
        owner: patch.owner !== undefined ? patch.owner : current.owner,
        value: patch.value !== undefined ? patch.value : current.value,
        followUpAt: patch.followUpAt !== undefined ? patch.followUpAt : current.followUpAt,
        updatedAt: nowIso(),
        notes: patch.note
          ? [
              ...current.notes,
              {
                id: randomUUID(),
                at: nowIso(),
                author: String(res.locals.admin.email),
                body: patch.note,
              },
            ]
          : current.notes,
      }
      updated = record
      return record
    }),
  )
  if (!updated) {
    res.status(404).json({ error: { code: 'not_found', message: 'Lead not found.' } })
    return
  }
  const lead = updated

  await reminderStore.mutate((reminders) => {
    let nextReminders = reminders
    if (patch.followUpAt) {
      const reminderId = `followup-${lead.ref}`
      const existing = reminders.find((reminder) => reminder.id === reminderId)
      const reminder: ReminderRecord = {
        id: reminderId,
        title: `Follow up · ${lead.name}`,
        body: `${lead.serviceName ?? 'Unallocated'} · ${lead.phone}`,
        dueAt: patch.followUpAt,
        status: 'open',
        priority: 'high',
        category: 'follow-up',
        leadRef: lead.ref,
        createdAt: existing?.createdAt ?? nowIso(),
        completedAt: null,
      }
      nextReminders = existing
        ? reminders.map((entry) => (entry.id === reminderId ? reminder : entry))
        : [reminder, ...reminders]
    }
    if (patch.status === 'won' || patch.status === 'lost' || patch.followUpAt === null) {
      nextReminders = nextReminders.map((entry) =>
        entry.leadRef === lead.ref && entry.status === 'open'
          ? { ...entry, status: 'done' as const, completedAt: nowIso() }
          : entry,
      )
    }
    return nextReminders
  })

  res.json({ data: lead })
})

/* -------------------------------------------------------------------------- */
/*  Reminders                                                                  */
/* -------------------------------------------------------------------------- */

adminRouter.get('/reminders', async (_req, res) => {
  const reminders = await reminderStore.read()
  const sorted = [...reminders].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1
    return Date.parse(a.dueAt) - Date.parse(b.dueAt)
  })
  res.json({
    data: sorted,
    meta: { open: reminders.filter((entry) => entry.status === 'open').length },
  })
})

adminRouter.post('/reminders', async (req, res) => {
  const parsed = reminderInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid reminder.',
      },
    })
    return
  }
  const record: ReminderRecord = {
    id: randomUUID(),
    title: parsed.data.title,
    body: parsed.data.body,
    dueAt: parsed.data.dueAt,
    status: 'open',
    priority: parsed.data.priority ?? 'normal',
    category: parsed.data.category ?? 'other',
    leadRef: parsed.data.leadRef ?? null,
    createdAt: nowIso(),
    completedAt: null,
  }
  await reminderStore.mutate((reminders) => [record, ...reminders])
  res.status(201).json({ data: record })
})

adminRouter.patch('/reminders/:id', async (req, res) => {
  const parsed = reminderPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid reminder.',
      },
    })
    return
  }
  let updated: ReminderRecord | undefined
  await reminderStore.mutate((reminders) =>
    reminders.map((current) => {
      if (current.id !== req.params.id) return current
      const status = parsed.data.status ?? current.status
      const record: ReminderRecord = {
        ...current,
        ...parsed.data,
        status,
        completedAt: status === 'done' ? (current.completedAt ?? nowIso()) : null,
      }
      updated = record
      return record
    }),
  )
  if (!updated) {
    res.status(404).json({ error: { code: 'not_found', message: 'Reminder not found.' } })
    return
  }
  res.json({ data: updated })
})

adminRouter.delete('/reminders/:id', async (req, res) => {
  await reminderStore.mutate((reminders) => reminders.filter((entry) => entry.id !== req.params.id))
  res.json({ data: { deleted: req.params.id } })
})

/* -------------------------------------------------------------------------- */
/*  Content                                                                    */
/* -------------------------------------------------------------------------- */

adminRouter.get('/content', async (_req, res) => {
  res.json({ data: await readSiteContent() })
})

adminRouter.get('/content/revisions', async (_req, res) => {
  res.json({ data: await listContentRevisions() })
})

adminRouter.post('/content/revisions/:version/restore', async (req, res) => {
  const version = Number.parseInt(String(req.params.version), 10)
  if (!Number.isInteger(version) || version < 1) {
    res.status(400).json({
      error: { code: 'invalid_version', message: 'Choose a valid content version.' },
    })
    return
  }

  const rawPage = (req.body as { pageId?: unknown } | null)?.pageId
  const pageId = typeof rawPage === 'string' && rawPage.trim() ? rawPage.trim() : undefined
  const rawPaths = (req.body as { paths?: unknown } | null)?.paths
  const paths = Array.isArray(rawPaths)
    ? rawPaths
        .filter((path): path is string => typeof path === 'string' && path.trim().length > 0)
        .map((path) => path.trim())
        .slice(0, 200)
    : undefined

  try {
    const result = await restoreContentRevision(
      version,
      String(res.locals.admin.email),
      pageId,
      paths,
    )
    res.json({
      data: result.content,
      meta: { changed: result.changed, revision: result.revision },
    })
  } catch (caught) {
    if (caught instanceof ContentRevisionError) {
      res.status(caught.status).json({
        error: { code: 'revision_error', message: caught.message },
      })
      return
    }
    throw caught
  }
})

adminRouter.put('/content', async (req, res) => {
  const parsed = siteContentPayloadSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Content did not pass validation.',
        issues: parsed.error.issues.slice(0, 8).map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    })
    return
  }

  const ids = parsed.data.services.map((service) => service.id)
  if (new Set(ids).size !== ids.length) {
    res.status(400).json({
      error: { code: 'duplicate_service', message: 'Service ids must be unique.' },
    })
    return
  }

  const rawVersion = Number.parseInt(String(req.get('if-match') ?? ''), 10)
  const expectedVersion = Number.isInteger(rawVersion) && rawVersion >= 0 ? rawVersion : undefined

  try {
    const result = await saveContentWithRevision(
      parsed.data,
      String(res.locals.admin.email),
      expectedVersion,
    )
    res.json({
      data: result.content,
      meta: { changed: result.changed, revision: result.revision },
    })
  } catch (caught) {
    if (caught instanceof ContentRevisionError) {
      res.status(caught.status).json({
        error: { code: 'revision_error', message: caught.message },
      })
      return
    }
    throw caught
  }
})
