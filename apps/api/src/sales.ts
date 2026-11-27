import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import {
  quotationTotals,
  salesAssignSchema,
  salesFollowUpCreateSchema,
  salesFollowUpPatchSchema,
  salesLeadPatchSchema,
  salesQuoteStatusSchema,
  salesRepPatchSchema,
  salesTargetSaveSchema,
  type AdminLead,
  type QuotationRecord,
  type ReminderRecord,
  type ReminderPriority,
  type SalesFollowUpRow,
  type SalesJobRow,
  type SalesLeadRow,
  type SalesMetrics,
  type SalesPayrollSummary,
  type SalesQuoteRow,
  type SalesRepProfile,
  type SalesRepSummary,
  type SalesTargetRecord,
  type SalesTrendPoint,
  type SalesWorkspace,
  type TeamMember,
} from '@hvac/shared'
import {
  requireAdmin,
  requireAdminMutation,
  requireSalesAccess,
  requireSalesManager,
  type AdminSession,
} from './auth.js'
import { readPublicAdminUsers, type PublicAdminUser } from './adminUsers.js'
import { payrollStore, teamStore } from './business.js'
import { jobStore } from './jobStore.js'
import { leadStore, readLeads } from './leads.js'
import { quotationStore } from './portalModules.js'
import { customerStore } from './portalAuth.js'
import { reminderStore } from './reminders.js'
import { createStore } from './store.js'

/**
 * Sales desk data. Leads remain the single source of truth: a sales account
 * owns leads through `AdminLead.owner`, which is the staff email. Quotes and
 * reminders ride on `leadRef`, so admin and sales always see the same records.
 */
const salesProfileStore = createStore<SalesRepProfile[]>('sales-profiles.json', () => [])
const salesTargetStore = createStore<SalesTargetRecord[]>('sales-targets.json', () => [])

interface RepContext {
  user: PublicAdminUser
  profile: SalesRepProfile
  team: TeamMember | null
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
function nowIso(): string {
  return new Date().toISOString()
}

function monthKey(value = new Date()): string {
  return value.toISOString().slice(0, 7)
}

function normalizeMonth(value: unknown): string {
  return typeof value === 'string' && MONTH_PATTERN.test(value) ? value : monthKey()
}

function monthStart(month: string): number {
  return Date.parse(`${month}-01T00:00:00.000Z`)
}

function inMonth(iso: string | null | undefined, month: string): boolean {
  if (!iso) return false
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return false
  const start = monthStart(month)
  const [year = 0, rawMonth = 1] = month.split('-').map(Number)
  const end = Date.UTC(year, rawMonth, 1)
  return at >= start && at < end
}

function previousMonths(month: string, count: number): string[] {
  const [year = 0, rawMonth = 1] = month.split('-').map(Number)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, rawMonth - 1 - (count - 1 - index), 1))
    return date.toISOString().slice(0, 7)
  })
}

function lower(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function aliases(rep: RepContext): Set<string> {
  return new Set(
    [
      rep.profile.email,
      rep.profile.name,
      rep.profile.userId,
      rep.team?.email,
      rep.team?.name,
    ]
      .map(lower)
      .filter(Boolean),
  )
}

function ownsLead(lead: AdminLead, rep: RepContext): boolean {
  return Boolean(lead.owner && aliases(rep).has(lower(lead.owner)))
}

function emptyMetrics(): SalesMetrics {
  return {
    assignedLeads: 0,
    openLeads: 0,
    wonDeals: 0,
    lostDeals: 0,
    wonValue: 0,
    pipelineValue: 0,
    conversionRate: 0,
    targetValue: 0,
    targetDeals: 0,
    attainment: 0,
    quotes: 0,
    quotesSent: 0,
    quotesAccepted: 0,
    quoteValue: 0,
    followUpsOpen: 0,
    followUpsOverdue: 0,
    commission: 0,
  }
}

function calculateMetrics(
  leads: AdminLead[],
  quotations: QuotationRecord[],
  reminders: ReminderRecord[],
  target: SalesTargetRecord | null,
  month: string,
): SalesMetrics {
  const metrics = emptyMetrics()
  const now = Date.now()
  const openStatuses = new Set(['new', 'contacted', 'site-visit', 'quoted'])
  const monthLeads = leads.filter((lead) => inMonth(lead.updatedAt, month))
  const won = monthLeads.filter((lead) => lead.status === 'won')
  const lost = monthLeads.filter((lead) => lead.status === 'lost')
  const open = leads.filter((lead) => openStatuses.has(lead.status))

  metrics.assignedLeads = leads.length
  metrics.openLeads = open.length
  metrics.wonDeals = won.length
  metrics.lostDeals = lost.length
  metrics.wonValue = won.reduce((sum, lead) => sum + (lead.value ?? 0), 0)
  metrics.pipelineValue = open.reduce((sum, lead) => sum + (lead.value ?? 0), 0)
  metrics.conversionRate =
    won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0
  metrics.targetValue = target?.revenueTarget ?? 0
  metrics.targetDeals = target?.dealsTarget ?? 0
  metrics.attainment =
    metrics.targetValue > 0 ? (metrics.wonValue / metrics.targetValue) * 100 : 0
  metrics.quotes = quotations.length
  metrics.quotesSent = quotations.filter((quotation) => quotation.status !== 'draft').length
  metrics.quotesAccepted = quotations.filter(
    (quotation) => quotation.status === 'accepted',
  ).length
  metrics.quoteValue = quotations.reduce(
    (sum, quotation) => sum + quotationTotals(quotation).total,
    0,
  )
  metrics.followUpsOpen = reminders.filter((reminder) => reminder.status === 'open').length
  metrics.followUpsOverdue = reminders.filter(
    (reminder) => reminder.status === 'open' && Date.parse(reminder.dueAt) < now,
  ).length
  metrics.commission =
    (metrics.wonValue * (target?.commissionRate ?? 0)) / 100
  return metrics
}

function payrollSummary(
  payroll: Awaited<ReturnType<typeof payrollStore.read>>,
  teamMemberId: string | null,
  month: string,
): SalesPayrollSummary {
  const records = teamMemberId
    ? payroll
        .filter((record) => record.memberId === teamMemberId && record.period === month)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    : []
  const record = records[0]
  return {
    period: month,
    status: record?.status ?? 'missing',
    baseAmount: record?.baseAmount ?? 0,
    amount: record?.amount ?? 0,
    paidAt: record?.paidAt ?? null,
  }
}

async function loadReps(): Promise<RepContext[]> {
  const [users, profiles, team] = await Promise.all([
    readPublicAdminUsers(),
    salesProfileStore.read(),
    teamStore.read(),
  ])
  return users
    .filter((user) => user.role === 'sales')
    .map((user) => {
      const stored = profiles.find((profile) => lower(profile.email) === lower(user.email))
      const member =
        team.find(
          (entry) =>
            (stored?.teamMemberId && entry.id === stored.teamMemberId) ||
            (entry.email && lower(entry.email) === lower(user.email)),
        ) ?? null
      const profile: SalesRepProfile = {
        email: user.email,
        name: stored?.name ?? user.name,
        userId: user.id,
        teamMemberId: stored?.teamMemberId ?? member?.id ?? null,
        baseSalary: stored?.baseSalary ?? member?.monthlySalary ?? 0,
        active: stored?.active ?? user.status === 'active',
        updatedAt: stored?.updatedAt ?? user.updatedAt,
      }
      return { user, profile, team: member }
    })
    .sort((a, b) => a.profile.name.localeCompare(b.profile.name))
}

function findRep(reps: RepContext[], email: string | null | undefined): RepContext | null {
  if (!email) return null
  return reps.find((rep) => lower(rep.profile.email) === lower(email)) ?? null
}

function sessionRep(reps: RepContext[], session: AdminSession): RepContext | null {
  return findRep(reps, session.email)
}

function accessibleLeads(
  session: AdminSession,
  rep: RepContext | null,
  allLeads: AdminLead[],
): AdminLead[] {
  if (session.role === 'sales') {
    return rep ? allLeads.filter((lead) => ownsLead(lead, rep)) : []
  }
  if (rep) return allLeads.filter((lead) => ownsLead(lead, rep))
  return allLeads
}

function accessibleQuotes(
  role: AdminSession['role'],
  rep: RepContext | null,
  leads: AdminLead[],
  quotations: QuotationRecord[],
): QuotationRecord[] {
  if (role !== 'sales' && !rep) return quotations
  const leadRefs = new Set(leads.map((lead) => lead.ref))
  return quotations.filter((quotation) =>
    Boolean(quotation.leadRef && leadRefs.has(quotation.leadRef)),
  )
}

function accessibleReminders(
  _rep: RepContext | null,
  leads: AdminLead[],
  reminders: ReminderRecord[],
): ReminderRecord[] {
  const refs = new Set(leads.map((lead) => lead.ref))
  return reminders.filter((reminder) => Boolean(reminder.leadRef && refs.has(reminder.leadRef)))
}

function leadRows(leads: AdminLead[], quotations: QuotationRecord[]): SalesLeadRow[] {
  const now = Date.now()
  const byRef = new Map<string, { count: number; value: number }>()
  for (const quotation of quotations) {
    if (!quotation.leadRef) continue
    const entry = byRef.get(quotation.leadRef) ?? { count: 0, value: 0 }
    entry.count += 1
    entry.value += quotationTotals(quotation).total
    byRef.set(quotation.leadRef, entry)
  }
  return [...leads]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((lead) => {
      const quote = byRef.get(lead.ref)
      const age = Math.max(0, Math.floor((now - Date.parse(lead.createdAt)) / 86_400_000))
      const open = !['won', 'lost'].includes(lead.status)
      return {
        ...lead,
        quoteCount: quote?.count ?? 0,
        quoteValue: quote?.value ?? 0,
        ageDays: Number.isFinite(age) ? age : 0,
        stale: open && now - Date.parse(lead.updatedAt) > 7 * 86_400_000,
      }
    })
}

function followUpRows(
  reminders: ReminderRecord[],
  leads: AdminLead[],
  ownerByRef: Map<string, string | null>,
): SalesFollowUpRow[] {
  const leadsByRef = new Map(leads.map((lead) => [lead.ref, lead]))
  const now = Date.now()
  return reminders
    .filter((reminder) => reminder.leadRef && leadsByRef.has(reminder.leadRef))
    .map((reminder) => {
      const lead = reminder.leadRef ? leadsByRef.get(reminder.leadRef) : null
      return {
        ...reminder,
        leadName: lead?.name ?? 'Lead',
        leadEmail: lead?.email ?? '',
        owner: reminder.leadRef ? ownerByRef.get(reminder.leadRef) ?? null : null,
        overdue: reminder.status === 'open' && Date.parse(reminder.dueAt) < now,
      }
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1
      return Date.parse(a.dueAt) - Date.parse(b.dueAt)
    })
}

function quoteRows(
  quotations: QuotationRecord[],
  leads: AdminLead[],
  customers: Awaited<ReturnType<typeof customerStore.read>>,
): SalesQuoteRow[] {
  const leadsByRef = new Map(leads.map((lead) => [lead.ref, lead]))
  const customersById = new Map(customers.map((customer) => [customer.id, customer]))
  return [...quotations]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((quotation) => {
      const lead = quotation.leadRef ? leadsByRef.get(quotation.leadRef) : null
      return {
        id: quotation.id,
        ref: quotation.ref,
        leadRef: quotation.leadRef,
        title: quotation.title,
        service: quotation.service,
        status: quotation.status,
        totals: quotationTotals(quotation),
        customerName: customersById.get(quotation.customerId)?.name ?? 'Customer',
        leadName: lead?.name ?? null,
        owner: lead?.owner ?? null,
        validUntil: quotation.validUntil,
        sentAt: quotation.sentAt,
        acceptedAt: quotation.acceptedAt,
        updatedAt: quotation.updatedAt,
      }
    })
}

function jobRows(
  jobs: Awaited<ReturnType<typeof jobStore.read>>,
  customerIds: Set<string>,
  all: boolean,
): SalesJobRow[] {
  return jobs
    .filter((job) => all || customerIds.has(job.customerId))
    .sort((a, b) => {
      const aAt = Date.parse(a.scheduledAt ?? a.createdAt)
      const bAt = Date.parse(b.scheduledAt ?? b.createdAt)
      return bAt - aAt
    })
    .slice(0, 60)
    .map((job) => ({
      id: job.id,
      ref: job.ref,
      title: job.title,
      customerName: job.customerName,
      status: job.status,
      technician: job.technician,
      scheduledAt: job.scheduledAt,
      completedAt: job.completedAt,
    }))
}

async function buildWorkspace(
  session: AdminSession,
  requestedMonth: string,
  requestedRep: string | null,
): Promise<SalesWorkspace> {
  const [allLeads, quotations, reminders, customers, jobs, payroll, reps] = await Promise.all([
    readLeads(),
    quotationStore.read(),
    reminderStore.read(),
    customerStore.read(),
    jobStore.read(),
    payrollStore.read(),
    loadReps(),
  ])
  const month = normalizeMonth(requestedMonth)
  let rep: RepContext | null = null
  if (session.role === 'sales') {
    rep = sessionRep(reps, session)
    if (!rep) {
      throw new SalesAccessError('Your sales profile is not linked to a staff account.')
    }
    if (!rep.profile.active) {
      throw new SalesAccessError('Your sales desk access has been deactivated.')
    }
  } else if (requestedRep) {
    rep = findRep(reps, requestedRep)
    if (!rep) throw new SalesAccessError('That sales representative was not found.', 404)
  }

  const leads = accessibleLeads(session, rep, allLeads)
  const quotes = accessibleQuotes(session.role, rep, leads, quotations)
  const scopedReminders = accessibleReminders(rep, leads, reminders)
  const targets = await salesTargetStore.read()
  const target =
    targets.find(
      (entry) =>
        entry.month === month && rep && lower(entry.email) === lower(rep.profile.email),
    ) ?? null
  const metrics = calculateMetrics(leads, quotes, scopedReminders, target, month)
  const allScope = session.role !== 'sales' && !rep

  const ownerByRef = new Map(leads.map((lead) => [lead.ref, lead.owner]))
  const customerIds = new Set(quotes.map((quotation) => quotation.customerId))
  const viewerName =
    reps.find((entry) => lower(entry.profile.email) === lower(session.email))?.profile.name ??
    session.email

  let repsOutput: SalesRepSummary[] = []
  if (session.role !== 'sales') {
    repsOutput = reps.map((entry) => {
      const repLeads = allLeads.filter((lead) => ownsLead(lead, entry))
      const repQuotes = accessibleQuotes('sales', entry, repLeads, quotations)
      const refs = new Set(repLeads.map((lead) => lead.ref))
      const repReminders = reminders.filter(
        (reminder) => Boolean(reminder.leadRef && refs.has(reminder.leadRef)),
      )
      const repTarget =
        targets.find(
          (item) => item.month === month && lower(item.email) === lower(entry.profile.email),
        ) ?? null
      const repMetrics = calculateMetrics(repLeads, repQuotes, repReminders, repTarget, month)
      const pay = payrollSummary(payroll, entry.profile.teamMemberId, month)
      return {
        profile: entry.profile,
        target: repTarget,
        metrics: repMetrics,
        payroll: pay,
        estimatedPay: entry.profile.baseSalary + repMetrics.commission,
      }
    })
  }

  if (allScope) {
    metrics.targetValue = repsOutput.reduce(
      (sum, entry) => sum + (entry.target?.revenueTarget ?? 0),
      0,
    )
    metrics.targetDeals = repsOutput.reduce(
      (sum, entry) => sum + (entry.target?.dealsTarget ?? 0),
      0,
    )
    metrics.attainment =
      metrics.targetValue > 0 ? (metrics.wonValue / metrics.targetValue) * 100 : 0
    metrics.commission = repsOutput.reduce((sum, entry) => sum + entry.metrics.commission, 0)
    metrics.assignedLeads = leads.length
  }

  const trend: SalesTrendPoint[] = previousMonths(month, 6).map((entryMonth) => {
    const monthLeads = leads.filter(
      (lead) => lead.status === 'won' && inMonth(lead.updatedAt, entryMonth),
    )
    const targetValue = allScope
      ? reps.reduce((sum, entry) => {
          const item = targets.find(
            (targetEntry) =>
              targetEntry.month === entryMonth &&
              lower(targetEntry.email) === lower(entry.profile.email),
          )
          return sum + (item?.revenueTarget ?? 0)
        }, 0)
      : (targets.find(
          (item) =>
            item.month === entryMonth && rep && lower(item.email) === lower(rep.profile.email),
        )?.revenueTarget ?? 0)
    return {
      month: entryMonth,
      wonValue: monthLeads.reduce((sum, lead) => sum + (lead.value ?? 0), 0),
      wonDeals: monthLeads.length,
      targetValue,
    }
  })

  return {
    month,
    scope: {
      mode: allScope ? 'team' : 'own',
      email: rep?.profile.email ?? null,
      label: rep?.profile.name ?? 'All sales',
    },
    viewer: { email: session.email, name: viewerName, role: session.role },
    metrics,
    target,
    profile: rep?.profile ?? null,
    payroll: rep ? payrollSummary(payroll, rep.profile.teamMemberId, month) : null,
    leads: leadRows(leads, quotes),
    followUps: followUpRows(scopedReminders, leads, ownerByRef),
    quotations: quoteRows(quotes, leads, customers),
    jobs: jobRows(jobs, customerIds, allScope),
    reps: repsOutput,
    trend,
    generatedAt: nowIso(),
  }
}

class SalesAccessError extends Error {
  status: number
  constructor(message: string, status = 403) {
    super(message)
    this.status = status
  }
}

async function leadAccess(
  session: AdminSession,
  ref: string,
): Promise<{ lead: AdminLead; reps: RepContext[]; rep: RepContext | null } | null> {
  const [leads, reps] = await Promise.all([readLeads(), loadReps()])
  const lead = leads.find((entry) => entry.ref === ref) ?? null
  if (!lead) return null
  const rep = session.role === 'sales' ? sessionRep(reps, session) : null
  if (session.role === 'sales' && (!rep || !ownsLead(lead, rep))) {
    throw new SalesAccessError('That lead is not assigned to you.')
  }
  return { lead, reps, rep }
}

async function validateOwner(reps: RepContext[], owner: string | null): Promise<string | null> {
  if (!owner) return null
  const rep = findRep(reps, owner)
  if (!rep || !rep.profile.active) {
    throw new SalesAccessError('Assign leads to an active sales account.', 400)
  }
  return rep.profile.email
}

function closeLeadReminders(reminders: ReminderRecord[], ref: string): ReminderRecord[] {
  return reminders.map((entry) =>
    entry.leadRef === ref && entry.status === 'open'
      ? { ...entry, status: 'done' as const, completedAt: nowIso() }
      : entry,
  )
}

function syncFollowUpReminder(
  reminders: ReminderRecord[],
  lead: AdminLead,
  dueAt: string,
): ReminderRecord[] {
  const id = `followup-${lead.ref}`
  const existing = reminders.find((entry) => entry.id === id)
  const reminder: ReminderRecord = {
    id,
    title: `Follow up · ${lead.name}`,
    body: `${lead.serviceName ?? 'Unallocated'} · ${lead.phone}`,
    dueAt,
    status: 'open',
    priority: (lead.urgency === 'emergency' ? 'urgent' : 'high') as ReminderPriority,
    category: 'follow-up',
    leadRef: lead.ref,
    createdAt: existing?.createdAt ?? nowIso(),
    completedAt: null,
  }
  return existing
    ? reminders.map((entry) => (entry.id === id ? reminder : entry))
    : [reminder, ...reminders]
}

export const salesRouter = Router()
salesRouter.use(requireAdmin, requireSalesAccess, requireAdminMutation)

salesRouter.get('/workspace', async (req, res, next) => {
  try {
    const session = res.locals.admin as AdminSession
    const month = typeof req.query.month === 'string' ? req.query.month : ''
    if (month && !MONTH_PATTERN.test(month)) {
      res.status(400).json({ error: { code: 'invalid_month', message: 'Use a YYYY-MM month.' } })
      return
    }
    const rep = typeof req.query.rep === 'string' ? req.query.rep.trim() : null
    const workspace = await buildWorkspace(session, month || monthKey(), rep)
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: workspace })
  } catch (error) {
    if (error instanceof SalesAccessError) {
      res.status(error.status).json({ error: { code: 'sales_access', message: error.message } })
      return
    }
    next(error)
  }
})

salesRouter.patch('/leads/:ref', async (req, res, next) => {
  try {
    const session = res.locals.admin as AdminSession
    const parsed = salesLeadPatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check the lead update.',
        },
      })
      return
    }
    const access = await leadAccess(session, req.params.ref)
    if (!access) {
      res.status(404).json({ error: { code: 'not_found', message: 'Lead not found.' } })
      return
    }
    const patch = parsed.data
    if (patch.owner !== undefined && session.role === 'sales') {
      res.status(403).json({
        error: { code: 'forbidden', message: 'Only a manager can reassign a lead.' },
      })
      return
    }
    let owner = access.lead.owner
    if (patch.owner !== undefined) owner = await validateOwner(access.reps, patch.owner)
    let updated: AdminLead | undefined
    await leadStore.mutate((leads) =>
      leads.map((current) => {
        if (current.ref !== req.params.ref) return current
        const record: AdminLead = {
          ...current,
          status: patch.status ?? current.status,
          owner,
          value: patch.value !== undefined ? patch.value : current.value,
          followUpAt:
            patch.followUpAt !== undefined ? patch.followUpAt : current.followUpAt,
          updatedAt: nowIso(),
          notes: patch.note
            ? [
                ...current.notes,
                {
                  id: randomUUID(),
                  at: nowIso(),
                  author: session.email,
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
      let next = reminders
      if (patch.followUpAt) next = syncFollowUpReminder(next, lead, patch.followUpAt)
      if (patch.status === 'won' || patch.status === 'lost' || patch.followUpAt === null) {
        next = closeLeadReminders(next, lead.ref)
      }
      return next
    })
    res.json({ data: lead })
  } catch (error) {
    if (error instanceof SalesAccessError) {
      res.status(error.status).json({ error: { code: 'sales_access', message: error.message } })
      return
    }
    next(error)
  }
})

salesRouter.post('/leads/assign', requireSalesManager, async (req, res, next) => {
  try {
    const parsed = salesAssignSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Choose leads and a sales owner.',
        },
      })
      return
    }
    const reps = await loadReps()
    const owner = await validateOwner(reps, parsed.data.owner)
    const refs = new Set(parsed.data.refs)
    let assigned = 0
    await leadStore.mutate((leads) =>
      leads.map((lead) => {
        if (!refs.has(lead.ref)) return lead
        assigned += 1
        return {
          ...lead,
          owner,
          updatedAt: nowIso(),
          notes: [
            ...lead.notes,
            {
              id: randomUUID(),
              at: nowIso(),
              author: 'Sales desk',
              body: owner ? `Assigned to ${owner}.` : 'Returned to the unassigned queue.',
            },
          ],
        }
      }),
    )
    res.json({ data: { assigned, owner } })
  } catch (error) {
    if (error instanceof SalesAccessError) {
      res.status(error.status).json({ error: { code: 'sales_access', message: error.message } })
      return
    }
    next(error)
  }
})

salesRouter.post('/follow-ups', async (req, res, next) => {
  try {
    const session = res.locals.admin as AdminSession
    const parsed = salesFollowUpCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check the follow-up.',
        },
      })
      return
    }
    const access = await leadAccess(session, parsed.data.leadRef)
    if (!access) {
      res.status(404).json({ error: { code: 'not_found', message: 'Lead not found.' } })
      return
    }
    const record: ReminderRecord = {
      id: `sales-${randomUUID()}`,
      title: parsed.data.title,
      body: parsed.data.body,
      dueAt: parsed.data.dueAt,
      status: 'open',
      priority: parsed.data.priority,
      category: 'follow-up',
      leadRef: access.lead.ref,
      createdAt: nowIso(),
      completedAt: null,
    }
    await reminderStore.mutate((reminders) => [record, ...reminders])
    await leadStore.mutate((leads) =>
      leads.map((lead) =>
        lead.ref === access.lead.ref
          ? { ...lead, followUpAt: parsed.data.dueAt, updatedAt: nowIso() }
          : lead,
      ),
    )
    res.status(201).json({ data: record })
  } catch (error) {
    if (error instanceof SalesAccessError) {
      res.status(error.status).json({ error: { code: 'sales_access', message: error.message } })
      return
    }
    next(error)
  }
})

salesRouter.patch('/follow-ups/:id', async (req, res, next) => {
  try {
    const session = res.locals.admin as AdminSession
    const parsed = salesFollowUpPatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'validation_error', message: 'Check the follow-up.' },
      })
      return
    }
    const reminders = await reminderStore.read()
    const reminder = reminders.find((entry) => entry.id === req.params.id)
    if (!reminder) {
      res.status(404).json({ error: { code: 'not_found', message: 'Follow-up not found.' } })
      return
    }
    if (session.role === 'sales') {
      if (!reminder.leadRef) {
        res.status(403).json({
          error: { code: 'forbidden', message: 'That follow-up is not linked to your leads.' },
        })
        return
      }
      const access = await leadAccess(session, reminder.leadRef)
      if (!access) {
        res.status(403).json({ error: { code: 'forbidden', message: 'Not your follow-up.' } })
        return
      }
    }
    const patch = parsed.data
    let saved: ReminderRecord | undefined
    await reminderStore.mutate((current) =>
      current.map((entry) => {
        if (entry.id !== req.params.id) return entry
        const record: ReminderRecord = {
          ...entry,
          title: patch.title ?? entry.title,
          body: patch.body ?? entry.body,
          dueAt: patch.dueAt ?? entry.dueAt,
          priority: patch.priority ?? entry.priority,
          status: patch.status ?? entry.status,
          completedAt:
            patch.status === 'done'
              ? entry.completedAt ?? nowIso()
              : patch.status === 'open'
                ? null
                : entry.completedAt,
        }
        saved = record
        return record
      }),
    )
    if (!saved) {
      res.status(404).json({ error: { code: 'not_found', message: 'Follow-up not found.' } })
      return
    }
    if (patch.dueAt && reminder.leadRef) {
      await leadStore.mutate((leads) =>
        leads.map((lead) =>
          lead.ref === reminder.leadRef
            ? { ...lead, followUpAt: patch.dueAt ?? lead.followUpAt, updatedAt: nowIso() }
            : lead,
        ),
      )
    }
    res.json({ data: saved })
  } catch (error) {
    if (error instanceof SalesAccessError) {
      res.status(error.status).json({ error: { code: 'sales_access', message: error.message } })
      return
    }
    next(error)
  }
})

salesRouter.patch('/quotations/:id/status', async (req, res, next) => {
  try {
    const session = res.locals.admin as AdminSession
    const parsed = salesQuoteStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'validation_error', message: 'Choose a status.' } })
      return
    }
    const [quotations, leads, reps] = await Promise.all([
      quotationStore.read(),
      readLeads(),
      loadReps(),
    ])
    const quotation = quotations.find((entry) => entry.id === req.params.id)
    if (!quotation) {
      res.status(404).json({ error: { code: 'not_found', message: 'Quotation not found.' } })
      return
    }
    const rep = session.role === 'sales' ? sessionRep(reps, session) : null
    const scopedLeads = accessibleLeads(session, rep, leads)
    const scopedQuotes = accessibleQuotes(session.role, rep, scopedLeads, [quotation])
    if (session.role === 'sales' && scopedQuotes.length === 0) {
      res.status(403).json({ error: { code: 'forbidden', message: 'That quotation is not yours.' } })
      return
    }
    const now = nowIso()
    let saved: QuotationRecord | undefined
    await quotationStore.mutate((current) =>
      current.map((entry) => {
        if (entry.id !== quotation.id) return entry
        const record: QuotationRecord = {
          ...entry,
          status: parsed.data.status,
          sentAt:
            parsed.data.status === 'sent'
              ? entry.sentAt ?? now
              : parsed.data.status === 'draft'
                ? null
                : entry.sentAt,
          acceptedAt:
            parsed.data.status === 'accepted'
              ? entry.acceptedAt ?? now
              : parsed.data.status === 'sent'
                ? null
                : entry.acceptedAt,
          updatedAt: now,
        }
        saved = record
        return record
      }),
    )
    if (!saved) {
      res.status(404).json({ error: { code: 'not_found', message: 'Quotation not found.' } })
      return
    }
    if (quotation.leadRef) {
      const nextLeadStatus =
        parsed.data.status === 'accepted'
          ? 'won'
          : parsed.data.status === 'declined'
            ? 'lost'
            : parsed.data.status === 'sent' || parsed.data.status === 'changes-requested'
              ? 'quoted'
              : null
      if (nextLeadStatus) {
        await leadStore.mutate((current) =>
          current.map((lead) => {
            if (lead.ref !== quotation.leadRef) return lead
            if (lead.status === 'won' && nextLeadStatus !== 'won') return lead
            return { ...lead, status: nextLeadStatus, updatedAt: now }
          }),
        )
        if (nextLeadStatus === 'won' || nextLeadStatus === 'lost') {
          await reminderStore.mutate((reminders) =>
            closeLeadReminders(reminders, quotation.leadRef as string),
          )
        }
      }
    }
    res.json({ data: { ...saved, totals: quotationTotals(saved) } })
  } catch (error) {
    if (error instanceof SalesAccessError) {
      res.status(error.status).json({ error: { code: 'sales_access', message: error.message } })
      return
    }
    next(error)
  }
})

salesRouter.put('/targets/:email', requireSalesManager, async (req, res, next) => {
  try {
    const parsed = salesTargetSaveSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check the target.',
        },
      })
      return
    }
    const reps = await loadReps()
    const rep = findRep(reps, String(req.params.email))
    if (!rep) {
      res.status(404).json({ error: { code: 'not_found', message: 'Sales rep not found.' } })
      return
    }
    const session = res.locals.admin as AdminSession
    let saved: SalesTargetRecord | undefined
    await salesTargetStore.mutate((targets) => {
      const existing = targets.find(
        (entry) =>
          entry.month === parsed.data.month &&
          lower(entry.email) === lower(rep.profile.email),
      )
      const record: SalesTargetRecord = {
        ...parsed.data,
        email: rep.profile.email,
        updatedAt: nowIso(),
        updatedBy: session.email,
      }
      saved = record
      return existing
        ? targets.map((entry) =>
            entry.month === parsed.data.month &&
            lower(entry.email) === lower(rep.profile.email)
              ? record
              : entry,
          )
        : [record, ...targets]
    })
    res.json({ data: saved })
  } catch (error) {
    if (error instanceof SalesAccessError) {
      res.status(error.status).json({ error: { code: 'sales_access', message: error.message } })
      return
    }
    next(error)
  }
})

salesRouter.patch('/reps/:email', requireSalesManager, async (req, res, next) => {
  try {
    const parsed = salesRepPatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check the rep settings.',
        },
      })
      return
    }
    const reps = await loadReps()
    const rep = findRep(reps, String(req.params.email))
    if (!rep) {
      res.status(404).json({ error: { code: 'not_found', message: 'Sales rep not found.' } })
      return
    }
    if (parsed.data.teamMemberId) {
      const team = await teamStore.read()
      if (!team.some((entry) => entry.id === parsed.data.teamMemberId)) {
        res.status(400).json({ error: { code: 'invalid_team', message: 'Team member not found.' } })
        return
      }
    }
    const nextProfile: SalesRepProfile = {
      ...rep.profile,
      ...parsed.data,
      email: rep.profile.email,
      userId: rep.user.id,
      updatedAt: nowIso(),
    }
    await salesProfileStore.mutate((profiles) => {
      const exists = profiles.some(
        (entry) => lower(entry.email) === lower(rep.profile.email),
      )
      return exists
        ? profiles.map((entry) =>
            lower(entry.email) === lower(rep.profile.email) ? nextProfile : entry,
          )
        : [nextProfile, ...profiles]
    })
    res.json({ data: nextProfile })
  } catch (error) {
    if (error instanceof SalesAccessError) {
      res.status(error.status).json({ error: { code: 'sales_access', message: error.message } })
      return
    }
    next(error)
  }
})
