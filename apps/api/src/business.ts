import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import {
  expenseInputSchema,
  expensePatchSchema,
  invoiceInputSchema,
  invoicePatchSchema,
  invoicePaymentInputSchema,
  invoiceTotals,
  payrollInputSchema,
  payrollPatchSchema,
  teamMemberInputSchema,
  teamMemberPatchSchema,
  type ExpenseRecord,
  type InvoicePayment,
  type InvoiceRecord,
  type InvoiceSummary,
  type InvoiceWithTotals,
  type PayrollRecord,
  type ReminderRecord,
  type TeamMember,
} from '@hvac/shared'
import { requireAdmin, requireAdminMutation, requirePermission } from './auth.js'
import { customerWantsEmail } from './customerPreferences.js'
import { readSiteContent } from './content.js'
import { findCustomerByEmail } from './portalAuth.js'
import { reminderStore } from './reminders.js'
import { createStore } from './store.js'
import { invoiceIssuedEmail, invoiceReminderEmail, sendMail } from './mailer.js'
import { streamInvoicePdf } from './pdf.js'
import { PUBLIC_SITE_URL } from './config.js'

export const invoiceStore = createStore<InvoiceRecord[]>('invoices.json', () => [])
export const expenseStore = createStore<ExpenseRecord[]>('expenses.json', () => [])
export const teamStore = createStore<TeamMember[]>('team.json', () => [])
export const payrollStore = createStore<PayrollRecord[]>('payroll.json', () => [])

function nowIso(): string {
  return new Date().toISOString()
}

function monthKey(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function currentMonth(): string {
  return monthKey(nowIso())
}

export function toInvoiceView(invoice: InvoiceRecord, now = Date.now()): InvoiceWithTotals {
  return { ...invoice, totals: invoiceTotals(invoice, now) }
}

export function summarizeInvoices(invoices: InvoiceRecord[], now = Date.now()): InvoiceSummary {
  const month = currentMonth()
  let invoiced = 0
  let collected = 0
  let outstanding = 0
  let overdueAmount = 0
  let paidCount = 0
  let partialCount = 0
  let overdueCount = 0
  let draftCount = 0
  let collectedThisMonth = 0
  let invoicedThisMonth = 0

  for (const invoice of invoices) {
    const totals = invoiceTotals(invoice, now)
    if (totals.state === 'draft') {
      draftCount += 1
      continue
    }
    if (totals.state === 'cancelled') continue
    invoiced += totals.total
    collected += totals.paid
    outstanding += totals.balance
    if (totals.state === 'paid') paidCount += 1
    if (totals.state === 'partial') partialCount += 1
    if (totals.state === 'overdue') {
      overdueCount += 1
      overdueAmount += totals.balance
    }
    if (monthKey(invoice.issueDate) === month) invoicedThisMonth += totals.total
    for (const payment of invoice.payments) {
      if (monthKey(payment.receivedAt) === month) collectedThisMonth += payment.amount
    }
  }

  return {
    invoiced,
    collected,
    outstanding,
    overdueAmount,
    paidCount,
    partialCount,
    overdueCount,
    draftCount,
    count: invoices.length,
    collectedThisMonth,
    invoicedThisMonth,
  }
}

function nextInvoiceReference(invoices: InvoiceRecord[], prefixValue: string): string {
  const prefix = (prefixValue || 'INV').toUpperCase()
  const year = new Date().getFullYear()
  const head = `${prefix}-${year}-`
  const highest = invoices.reduce((max, invoice) => {
    if (!invoice.ref.startsWith(head)) return max
    const value = Number.parseInt(invoice.ref.slice(head.length), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `${head}${String(highest + 1).padStart(4, '0')}`
}

function invoiceFromInput(
  input: ReturnType<typeof invoiceInputSchema.parse>,
  ref: string,
): InvoiceRecord {
  const now = nowIso()
  return {
    id: randomUUID(),
    ref,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    customerAddress: input.customerAddress,
    customerGstin: input.customerGstin,
    service: input.service,
    leadRef: input.leadRef ?? null,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    status: input.status,
    lines: input.lines.map((line) => ({ ...line, id: line.id ?? randomUUID() })),
    discount: input.discount,
    taxMode: input.taxMode,
    notes: input.notes,
    terms: input.terms,
    payments: [],
    reminderDates: [],
    lastReminderAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

export interface BusinessSnapshot {
  invoices: InvoiceRecord[]
  expenses: ExpenseRecord[]
  team: TeamMember[]
  payroll: PayrollRecord[]
}

export async function readBusinessSnapshot(): Promise<BusinessSnapshot> {
  const [invoices, expenses, team, payroll] = await Promise.all([
    invoiceStore.read(),
    expenseStore.read(),
    teamStore.read(),
    payrollStore.read(),
  ])
  return { invoices, expenses, team, payroll }
}

export function summarizeExpenses(expenses: ExpenseRecord[]) {
  const month = currentMonth()
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const thisMonth = expenses
    .filter((expense) => monthKey(expense.date) === month)
    .reduce((sum, expense) => sum + expense.amount, 0)
  const byCategory: Record<string, number> = {}
  for (const expense of expenses) {
    byCategory[expense.category] = (byCategory[expense.category] ?? 0) + expense.amount
  }
  return { total, thisMonth, byCategory, count: expenses.length }
}

export function summarizePayroll(payroll: PayrollRecord[], team: TeamMember[]) {
  const month = currentMonth()
  const paid = payroll.filter((entry) => entry.status === 'paid')
  const monthEntries = payroll.filter((entry) => entry.period === month)
  return {
    thisMonth: monthEntries.reduce((sum, entry) => sum + entry.amount, 0),
    thisMonthPaid: monthEntries
      .filter((entry) => entry.status === 'paid')
      .reduce((sum, entry) => sum + entry.amount, 0),
    thisMonthPending: monthEntries
      .filter((entry) => entry.status === 'pending')
      .reduce((sum, entry) => sum + entry.amount, 0),
    totalPaid: paid.reduce((sum, entry) => sum + entry.amount, 0),
    activeTeam: team.filter((member) => member.status === 'active').length,
    monthlyPayrollCommitment: team
      .filter((member) => member.status === 'active')
      .reduce((sum, member) => sum + member.monthlySalary, 0),
    count: payroll.length,
  }
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

async function notifyInvoiceIssued(
  invoice: InvoiceRecord,
  brand: string,
  canonicalBase: string,
): Promise<void> {
  if (!invoice.customerEmail) return
  const customer = await findCustomerByEmail(invoice.customerEmail)
  if (customer && !(await customerWantsEmail(customer.id, 'emailBilling'))) return
  const totals = invoiceTotals(invoice)
  const message = invoiceIssuedEmail({
    name: invoice.customerName,
    reference: invoice.ref,
    total: money(totals.total),
    balance: money(totals.balance),
    dueDate: invoice.dueDate,
    brand,
    portalUrl: `${(PUBLIC_SITE_URL || canonicalBase).replace(/\/+$/, '')}/portal`,
  })
  void sendMail({ to: invoice.customerEmail, kind: 'invoice-issued', ...message }).catch((error) =>
    console.error('[hvac-api] invoice issue email failed', error),
  )
}

export const businessRouter = Router()
businessRouter.use(requireAdmin, requirePermission('billing.write'), requireAdminMutation)

/* -------------------------------------------------------------------------- */
/*  Invoices                                                                   */
/* -------------------------------------------------------------------------- */

businessRouter.get('/invoices', async (_req, res) => {
  const invoices = await invoiceStore.read()
  const sorted = [...invoices].sort((a, b) => Date.parse(b.issueDate) - Date.parse(a.issueDate))
  res.json({
    data: sorted.map((invoice) => toInvoiceView(invoice)),
    summary: summarizeInvoices(invoices),
  })
})

businessRouter.get('/invoices/:id', async (req, res) => {
  const invoices = await invoiceStore.read()
  const invoice = invoices.find((entry) => entry.id === req.params.id || entry.ref === req.params.id)
  if (!invoice) {
    res.status(404).json({ error: { code: 'not_found', message: 'Invoice not found.' } })
    return
  }
  res.json({ data: toInvoiceView(invoice) })
})

businessRouter.get('/invoices/:id/pdf', async (req, res) => {
  const invoices = await invoiceStore.read()
  const invoice = invoices.find(
    (entry) => entry.id === req.params.id || entry.ref === req.params.id,
  )
  if (!invoice) {
    res.status(404).json({ error: { code: 'not_found', message: 'Invoice not found.' } })
    return
  }
  const content = await readSiteContent()
  streamInvoicePdf(res, toInvoiceView(invoice), content.brand)
})

businessRouter.post('/invoices', async (req, res) => {
  const parsed = invoiceInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid invoice.' },
    })
    return
  }
  const content = await readSiteContent()
  let saved: InvoiceRecord | undefined
  const next = await invoiceStore.mutate((current) => {
    const record = invoiceFromInput(
      parsed.data,
      nextInvoiceReference(current, content.brand.billing.invoicePrefix),
    )
    record.terms = record.terms || content.brand.billing.invoiceTerms
    record.notes = record.notes || content.brand.billing.invoiceNotes
    saved = record
    return [record, ...current]
  })
  if (!saved) {
    res.status(500).json({ error: { code: 'server_error', message: 'The invoice could not be saved.' } })
    return
  }
  if (saved.status === 'issued') {
    void notifyInvoiceIssued(
      saved,
      content.brand.shortName || content.brand.name,
      content.seo.canonicalBase,
    ).catch((error) => console.error('[hvac-api] invoice issue email failed', error))
  }
  res.status(201).json({ data: toInvoiceView(saved), summary: summarizeInvoices(next) })
})

businessRouter.patch('/invoices/:id', async (req, res) => {
  const parsed = invoicePatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid invoice.' },
    })
    return
  }
  const patch = parsed.data
  const content = await readSiteContent()
  let saved: InvoiceRecord | undefined
  let becameIssued = false
  const next = await invoiceStore.mutate((invoices) =>
    invoices.map((current) => {
      if (current.id !== req.params.id && current.ref !== req.params.id) return current
      const updated: InvoiceRecord = {
        ...current,
        ...patch,
        leadRef: patch.leadRef !== undefined ? patch.leadRef : current.leadRef,
        lines: patch.lines
          ? patch.lines.map((line) => ({ ...line, id: line.id ?? randomUUID() }))
          : current.lines,
        updatedAt: nowIso(),
      }
      if (updated.status === 'issued' && current.status !== 'issued') becameIssued = true
      saved = updated
      return updated
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Invoice not found.' } })
    return
  }
  if (becameIssued) {
    void notifyInvoiceIssued(
      saved,
      content.brand.shortName || content.brand.name,
      content.seo.canonicalBase,
    ).catch((error) => console.error('[hvac-api] invoice issue email failed', error))
  }
  res.json({ data: toInvoiceView(saved), summary: summarizeInvoices(next) })
})

businessRouter.delete('/invoices/:id', async (req, res) => {
  const next = await invoiceStore.mutate((invoices) =>
    invoices.filter((entry) => entry.id !== req.params.id && entry.ref !== req.params.id),
  )
  res.json({ data: { deleted: req.params.id }, summary: summarizeInvoices(next) })
})

businessRouter.post('/invoices/:id/payments', async (req, res) => {
  const parsed = invoicePaymentInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid payment.' },
    })
    return
  }
  let saved: InvoiceRecord | undefined
  let failure: { status: number; code: string; message: string } | null = null
  const next = await invoiceStore.mutate((invoices) =>
    invoices.map((current) => {
      if (current.id !== req.params.id && current.ref !== req.params.id) return current
      const totals = invoiceTotals(current)
      if (totals.state === 'cancelled') {
        failure = { status: 400, code: 'cancelled', message: 'A cancelled invoice cannot receive payments.' }
        return current
      }
      if (parsed.data.amount > totals.balance + 0.01) {
        failure = {
          status: 400,
          code: 'overpayment',
          message: `Payment exceeds the open balance of ${money(totals.balance)}.`,
        }
        return current
      }
      const payment: InvoicePayment = {
        id: randomUUID(),
        amount: parsed.data.amount,
        method: parsed.data.method,
        reference: parsed.data.reference,
        notes: parsed.data.notes,
        receivedAt: parsed.data.receivedAt,
        recordedAt: nowIso(),
        recordedBy: String(res.locals.admin.email),
      }
      const updated: InvoiceRecord = {
        ...current,
        payments: [...current.payments, payment],
        updatedAt: nowIso(),
      }
      saved = updated
      return updated
    }),
  )
  if (failure) {
    const known = failure as { status: number; code: string; message: string }
    res.status(known.status).json({ error: { code: known.code, message: known.message } })
    return
  }
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Invoice not found.' } })
    return
  }
  res.status(201).json({ data: toInvoiceView(saved), summary: summarizeInvoices(next) })
})

businessRouter.delete('/invoices/:id/payments/:paymentId', async (req, res) => {
  let saved: InvoiceRecord | undefined
  const next = await invoiceStore.mutate((invoices) =>
    invoices.map((current) => {
      if (current.id !== req.params.id && current.ref !== req.params.id) return current
      const updated: InvoiceRecord = {
        ...current,
        payments: current.payments.filter((payment) => payment.id !== req.params.paymentId),
        updatedAt: nowIso(),
      }
      saved = updated
      return updated
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Invoice not found.' } })
    return
  }
  res.json({ data: toInvoiceView(saved), summary: summarizeInvoices(next) })
})

businessRouter.post('/invoices/:id/remind', async (req, res) => {
  const invoices = await invoiceStore.read()
  const invoice = invoices.find(
    (entry) => entry.id === req.params.id || entry.ref === req.params.id,
  )
  if (!invoice) {
    res.status(404).json({ error: { code: 'not_found', message: 'Invoice not found.' } })
    return
  }
  const totals = invoiceTotals(invoice)
  if (totals.balance <= 0) {
    res.status(400).json({ error: { code: 'settled', message: 'This invoice has no open balance.' } })
    return
  }
  const now = new Date()
  const due = new Date(now.getTime() + 86_400_000)
  due.setHours(9, 0, 0, 0)
  const reminder: ReminderRecord = {
    id: randomUUID(),
    title: `Payment reminder · ${invoice.ref}`,
    body: `${invoice.customerName} · ${money(totals.balance)} due${totals.daysOverdue ? ` · ${totals.daysOverdue} days overdue` : ''}`,
    dueAt: due.toISOString(),
    status: 'open',
    leadRef: invoice.leadRef,
    invoiceRef: invoice.ref,
    createdAt: nowIso(),
    completedAt: null,
  }
  await reminderStore.mutate((reminders) => [reminder, ...reminders])
  let saved: InvoiceRecord | undefined
  const next = await invoiceStore.mutate((current) =>
    current.map((entry) => {
      if (entry.id !== invoice.id) return entry
      const updated: InvoiceRecord = {
        ...entry,
        reminderDates: [...entry.reminderDates, nowIso()],
        lastReminderAt: nowIso(),
        updatedAt: nowIso(),
      }
      saved = updated
      return updated
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Invoice not found.' } })
    return
  }
  res.status(201).json({ data: toInvoiceView(saved), reminder, summary: summarizeInvoices(next) })
  if (invoice.customerEmail) {
    void (async () => {
      try {
        const customer = await findCustomerByEmail(invoice.customerEmail)
        if (customer && !(await customerWantsEmail(customer.id, 'emailBilling'))) return
        const content = await readSiteContent()
        const message = invoiceReminderEmail({
          name: invoice.customerName,
          reference: invoice.ref,
          balance: money(totals.balance),
          dueDate: invoice.dueDate,
          brand: content.brand.shortName || content.brand.name,
        })
        await sendMail({ to: invoice.customerEmail, kind: 'invoice-reminder', ...message })
      } catch (error) {
        console.error('[hvac-api] invoice reminder email failed', error)
      }
    })()
  }
})

/* -------------------------------------------------------------------------- */
/*  Expenses                                                                   */
/* -------------------------------------------------------------------------- */

businessRouter.get('/expenses', async (_req, res) => {
  const expenses = await expenseStore.read()
  res.json({
    data: [...expenses].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    summary: summarizeExpenses(expenses),
  })
})

businessRouter.post('/expenses', async (req, res) => {
  const parsed = expenseInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid expense.' },
    })
    return
  }
  const now = nowIso()
  const record: ExpenseRecord = { id: randomUUID(), ...parsed.data, createdAt: now, updatedAt: now }
  const next = await expenseStore.mutate((expenses) => [record, ...expenses])
  res.status(201).json({ data: record, summary: summarizeExpenses(next) })
})

businessRouter.patch('/expenses/:id', async (req, res) => {
  const parsed = expensePatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid expense.' },
    })
    return
  }
  let updated: ExpenseRecord | undefined
  const next = await expenseStore.mutate((expenses) =>
    expenses.map((current) => {
      if (current.id !== req.params.id) return current
      const record: ExpenseRecord = { ...current, ...parsed.data, updatedAt: nowIso() }
      updated = record
      return record
    }),
  )
  if (!updated) {
    res.status(404).json({ error: { code: 'not_found', message: 'Expense not found.' } })
    return
  }
  res.json({ data: updated, summary: summarizeExpenses(next) })
})

businessRouter.delete('/expenses/:id', async (req, res) => {
  const next = await expenseStore.mutate((expenses) =>
    expenses.filter((entry) => entry.id !== req.params.id),
  )
  res.json({ data: { deleted: req.params.id }, summary: summarizeExpenses(next) })
})

/* -------------------------------------------------------------------------- */
/*  Team                                                                       */
/* -------------------------------------------------------------------------- */

businessRouter.get('/team', async (_req, res) => {
  const [team, payroll] = await Promise.all([teamStore.read(), payrollStore.read()])
  res.json({
    data: [...team].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      return a.name.localeCompare(b.name)
    }),
    summary: summarizePayroll(payroll, team),
  })
})

businessRouter.post('/team', async (req, res) => {
  const parsed = teamMemberInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid team member.' },
    })
    return
  }
  const payroll = await payrollStore.read()
  const now = nowIso()
  const record: TeamMember = { id: randomUUID(), ...parsed.data, createdAt: now, updatedAt: now }
  const next = await teamStore.mutate((team) => [record, ...team])
  res.status(201).json({ data: record, summary: summarizePayroll(payroll, next) })
})

businessRouter.patch('/team/:id', async (req, res) => {
  const parsed = teamMemberPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid team member.' },
    })
    return
  }
  const payroll = await payrollStore.read()
  let updated: TeamMember | undefined
  const next = await teamStore.mutate((team) =>
    team.map((current) => {
      if (current.id !== req.params.id) return current
      const record: TeamMember = { ...current, ...parsed.data, updatedAt: nowIso() }
      updated = record
      return record
    }),
  )
  if (!updated) {
    res.status(404).json({ error: { code: 'not_found', message: 'Team member not found.' } })
    return
  }
  res.json({ data: updated, summary: summarizePayroll(payroll, next) })
})

businessRouter.delete('/team/:id', async (req, res) => {
  const payroll = await payrollStore.read()
  const next = await teamStore.mutate((team) =>
    team.filter((entry) => entry.id !== req.params.id),
  )
  res.json({ data: { deleted: req.params.id }, summary: summarizePayroll(payroll, next) })
})

/* -------------------------------------------------------------------------- */
/*  Payroll                                                                    */
/* -------------------------------------------------------------------------- */

businessRouter.get('/payroll', async (_req, res) => {
  const [payroll, team] = await Promise.all([payrollStore.read(), teamStore.read()])
  res.json({
    data: [...payroll].sort((a, b) => {
      if (a.period !== b.period) return b.period.localeCompare(a.period)
      return Date.parse(b.createdAt) - Date.parse(a.createdAt)
    }),
    summary: summarizePayroll(payroll, team),
  })
})

businessRouter.post('/payroll', async (req, res) => {
  const parsed = payrollInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid salary entry.' },
    })
    return
  }
  const team = await teamStore.read()
  if (!team.some((member) => member.id === parsed.data.memberId)) {
    res.status(400).json({ error: { code: 'unknown_member', message: 'Select a team member.' } })
    return
  }
  const now = nowIso()
  const amount = Math.max(0, parsed.data.baseAmount + parsed.data.bonus - parsed.data.deductions)
  const record: PayrollRecord = {
    id: randomUUID(),
    ...parsed.data,
    amount,
    paidAt:
      parsed.data.status === 'paid' ? parsed.data.paidAt ?? now : null,
    createdAt: now,
    updatedAt: now,
  }
  const next = await payrollStore.mutate((payroll) => [record, ...payroll])
  res.status(201).json({ data: record, summary: summarizePayroll(next, team) })
})

/** Prepare a pending salary row for every active member that does not have one. */
businessRouter.post('/payroll/generate', async (req, res) => {
  const requested = typeof req.body?.period === 'string' ? req.body.period : ''
  const period = /^\d{4}-\d{2}$/.test(requested) ? requested : currentMonth()
  const team = await teamStore.read()
  const now = nowIso()
  const created: PayrollRecord[] = []
  const next = await payrollStore.mutate((payroll) => {
    const existing = new Set(
      payroll.filter((entry) => entry.period === period).map((entry) => entry.memberId),
    )
    const batch: PayrollRecord[] = team
      .filter((member) => member.status === 'active' && member.monthlySalary > 0 && !existing.has(member.id))
      .map((member) => ({
        id: randomUUID(),
        memberId: member.id,
        period,
        baseAmount: member.monthlySalary,
        bonus: 0,
        deductions: 0,
        amount: member.monthlySalary,
        status: 'pending',
        paidAt: null,
        method: 'bank-transfer',
        reference: '',
        notes: 'Prepared from the active team register.',
        createdAt: now,
        updatedAt: now,
      }))
    created.push(...batch)
    return batch.length ? [...batch, ...payroll] : payroll
  })
  res.json({
    data: { period, created: created.length, skipped: team.filter((member) => member.status === 'active').length - created.length },
    summary: summarizePayroll(next, team),
  })
})

businessRouter.patch('/payroll/:id', async (req, res) => {
  const parsed = payrollPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid salary entry.' },
    })
    return
  }
  const team = await teamStore.read()
  let updated: PayrollRecord | undefined
  const next = await payrollStore.mutate((payroll) =>
    payroll.map((current) => {
      if (current.id !== req.params.id) return current
      const baseAmount = parsed.data.baseAmount ?? current.baseAmount
      const bonus = parsed.data.bonus ?? current.bonus
      const deductions = parsed.data.deductions ?? current.deductions
      const status = parsed.data.status ?? current.status
      const record: PayrollRecord = {
        ...current,
        ...parsed.data,
        amount: Math.max(0, baseAmount + bonus - deductions),
        status,
        paidAt:
          parsed.data.paidAt !== undefined
            ? parsed.data.paidAt
            : status === 'paid'
              ? current.paidAt ?? nowIso()
              : null,
        updatedAt: nowIso(),
      }
      updated = record
      return record
    }),
  )
  if (!updated) {
    res.status(404).json({ error: { code: 'not_found', message: 'Salary entry not found.' } })
    return
  }
  res.json({ data: updated, summary: summarizePayroll(next, team) })
})

businessRouter.delete('/payroll/:id', async (req, res) => {
  const team = await teamStore.read()
  const next = await payrollStore.mutate((payroll) =>
    payroll.filter((entry) => entry.id !== req.params.id),
  )
  res.json({ data: { deleted: req.params.id }, summary: summarizePayroll(next, team) })
})