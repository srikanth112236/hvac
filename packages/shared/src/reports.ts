import { z } from 'zod'
import {
  EXPENSE_CATEGORIES,
  invoiceTotals,
  type ExpenseCategory,
  type ExpenseRecord,
  type InvoiceRecord,
  type PayrollRecord,
} from './business'

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  materials: 'Materials',
  equipment: 'Equipment',
  transport: 'Transport',
  subcontractor: 'Subcontractors',
  office: 'Office',
  utilities: 'Utilities',
  marketing: 'Marketing',
  travel: 'Travel',
  other: 'Other',
}

export interface ProfitLossCategory {
  category: ExpenseCategory
  label: string
  amount: number
  count: number
  share: number
}

export interface ProfitLossTrendPoint {
  month: string
  revenue: number
  expenses: number
  payroll: number
  net: number
}

export interface ProfitLossInsight {
  title: string
  detail: string
  tone: 'positive' | 'attention' | 'neutral'
}

export interface ProfitLossReport {
  month: string
  label: string
  from: string
  to: string
  generatedAt: string
  revenue: {
    billed: number
    collected: number
    outstanding: number
    invoiceCount: number
    averageInvoice: number
  }
  expenses: {
    total: number
    count: number
    byCategory: ProfitLossCategory[]
  }
  payroll: {
    total: number
    paid: number
    pending: number
    count: number
  }
  net: {
    accrual: number
    cash: number
    margin: number
    expenseRatio: number
    payrollRatio: number
  }
  trends: ProfitLossTrendPoint[]
  insights: ProfitLossInsight[]
}

function monthLabel(month: string): string {
  const year = Number(month.slice(0, 4))
  const value = Number(month.slice(5, 7))
  if (!year || !value) return month
  return new Date(Date.UTC(year, value - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function monthBounds(month: string): { from: string; to: string } {
  const year = Number(month.slice(0, 4))
  const value = Number(month.slice(5, 7))
  const start = new Date(Date.UTC(year, value - 1, 1))
  const end = new Date(Date.UTC(year, value, 0))
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}

export function shiftMonth(month: string, offset: number): string {
  const year = Number(month.slice(0, 4))
  const value = Number(month.slice(5, 7))
  const date = new Date(Date.UTC(year, value - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function reportableInvoice(invoice: InvoiceRecord): boolean {
  return invoice.status !== 'draft' && invoice.status !== 'cancelled'
}

function invoiceRevenue(invoice: InvoiceRecord): number {
  return invoiceTotals(invoice).taxable
}

function invoicesBilled(invoices: InvoiceRecord[], month: string): { amount: number; count: number } {
  const inMonth = invoices.filter(
    (invoice) => reportableInvoice(invoice) && invoice.issueDate.startsWith(month),
  )
  return {
    amount: round2(inMonth.reduce((sum, invoice) => sum + invoiceRevenue(invoice), 0)),
    count: inMonth.length,
  }
}

function cashCollected(invoices: InvoiceRecord[], month: string): number {
  let total = 0
  for (const invoice of invoices) {
    if (!reportableInvoice(invoice)) continue
    for (const payment of invoice.payments) {
      if (payment.reversedAt) continue
      const at = payment.receivedAt || payment.recordedAt
      if (at.startsWith(month)) total += payment.amount
    }
  }
  return round2(total)
}

function payrollFor(payroll: PayrollRecord[], month: string) {
  const inMonth = payroll.filter((entry) => entry.period === month)
  return {
    total: round2(inMonth.reduce((sum, entry) => sum + entry.amount, 0)),
    paid: round2(
      inMonth.reduce(
        (sum, entry) =>
          sum +
          (entry.payments?.reduce((inner, payment) => inner + payment.amount, 0) ??
            (entry.status === 'paid' ? entry.amount : 0)),
        0,
      ),
    ),
    count: inMonth.length,
  }
}

function expensesFor(expenses: ExpenseRecord[], month: string) {
  const inMonth = expenses.filter((expense) => expense.date.slice(0, 7) === month)
  const total = round2(inMonth.reduce((sum, expense) => sum + expense.amount, 0))
  const byCategory = EXPENSE_CATEGORIES.map((category) => {
    const rows = inMonth.filter((expense) => expense.category === category)
    const amount = round2(rows.reduce((sum, expense) => sum + expense.amount, 0))
    return {
      category,
      label: expenseCategoryLabel[category],
      amount,
      count: rows.length,
      share: total > 0 ? round2((amount / total) * 100) : 0,
    }
  })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.amount - a.amount)
  return { total, count: inMonth.length, byCategory }
}

export interface BuildProfitLossInput {
  month: string
  invoices: InvoiceRecord[]
  expenses: ExpenseRecord[]
  payroll: PayrollRecord[]
  now?: Date
}

export function buildProfitLoss(input: BuildProfitLossInput): ProfitLossReport {
  const { month } = input
  const { from, to } = monthBounds(month)
  const billed = invoicesBilled(input.invoices, month)
  const collected = cashCollected(input.invoices, month)
  const expenses = expensesFor(input.expenses, month)
  const payroll = payrollFor(input.payroll, month)
  const outstanding = round2(
    input.invoices
      .filter(reportableInvoice)
      .reduce((sum, invoice) => sum + invoiceTotals(invoice).balance, 0),
  )
  const netAccrual = round2(billed.amount - expenses.total - payroll.total)
  const netCash = round2(collected - expenses.total - payroll.paid)
  const margin = billed.amount > 0 ? round2((netAccrual / billed.amount) * 100) : 0
  const expenseRatio =
    billed.amount > 0 ? round2(((expenses.total + payroll.total) / billed.amount) * 100) : 0
  const payrollRatio = billed.amount > 0 ? round2((payroll.total / billed.amount) * 100) : 0

  const trends: ProfitLossTrendPoint[] = []
  for (let offset = -5; offset <= 0; offset += 1) {
    const trendMonth = shiftMonth(month, offset)
    const trendBilled = invoicesBilled(input.invoices, trendMonth)
    const trendExpenses = expensesFor(input.expenses, trendMonth)
    const trendPayroll = payrollFor(input.payroll, trendMonth)
    trends.push({
      month: trendMonth,
      revenue: trendBilled.amount,
      expenses: trendExpenses.total,
      payroll: trendPayroll.total,
      net: round2(trendBilled.amount - trendExpenses.total - trendPayroll.total),
    })
  }

  const previous = trends[trends.length - 2]
  const delta = previous ? round2(netAccrual - previous.net) : 0
  const topCategory = expenses.byCategory[0]
  const insights: ProfitLossInsight[] = [
    {
      title: netAccrual >= 0 ? 'Profitable month' : 'Loss-making month',
      detail: `${netAccrual >= 0 ? 'Net profit' : 'Net loss'} of ${money.format(Math.abs(netAccrual))} on ${money.format(billed.amount)} billed revenue (${margin.toFixed(1)}% margin).`,
      tone: netAccrual >= 0 ? 'positive' : 'attention',
    },
    {
      title: payroll.count === 0 ? 'Payroll not recorded' : 'Payroll recorded',
      detail:
        payroll.count === 0
          ? 'No payslips exist for this month, so net profit currently excludes payroll. Prepare payroll before circulating this report.'
          : `${payroll.count} payslip${payroll.count === 1 ? '' : 's'} totalling ${money.format(payroll.total)} are included in operating costs.`,
      tone: payroll.count === 0 ? 'attention' : 'neutral',
    },
    {
      title: 'Operating cost ratio',
      detail: `Expenses and payroll consumed ${expenseRatio.toFixed(1)}% of billed revenue. Payroll alone is ${payrollRatio.toFixed(1)}%.`,
      tone: expenseRatio > 90 ? 'attention' : 'neutral',
    },
    topCategory
      ? {
          title: `${topCategory.label} is the largest cost`,
          detail: `${money.format(topCategory.amount)} across ${topCategory.count} entr${topCategory.count === 1 ? 'y' : 'ies'}, ${topCategory.share.toFixed(1)}% of operating costs.`,
          tone: topCategory.share > 50 ? 'attention' : 'neutral',
        }
      : {
          title: 'No operating costs recorded',
          detail: 'No expenses were logged in this month.',
          tone: 'neutral',
        },
    previous
      ? {
          title: delta >= 0 ? 'Better than last month' : 'Below last month',
          detail: `Net ${delta >= 0 ? 'improved' : 'fell'} by ${money.format(Math.abs(delta))} against ${monthLabel(previous.month)}.`,
          tone: delta >= 0 ? 'positive' : 'attention',
        }
      : { title: 'First report in the trend', detail: 'Six months of history builds automatically.', tone: 'neutral' },
    {
      title: 'Receivables position',
      detail:
        outstanding > 0
          ? `${money.format(outstanding)} is still outstanding across issued invoices. Collection is ${collected >= billed.amount ? 'ahead of' : 'behind'} billing this month.`
          : 'Every issued invoice is settled — no receivables outstanding.',
      tone: outstanding > 0 ? 'attention' : 'positive',
    },
    {
      title: 'Cash view',
      detail: `${money.format(collected)} collected against ${money.format(expenses.total + payroll.paid)} paid out, a cash ${netCash >= 0 ? 'surplus' : 'shortfall'} of ${money.format(Math.abs(netCash))}.`,
      tone: netCash >= 0 ? 'positive' : 'attention',
    },
  ]

  return {
    month,
    label: monthLabel(month),
    from,
    to,
    generatedAt: (input.now ?? new Date()).toISOString(),
    revenue: {
      billed: billed.amount,
      collected,
      outstanding,
      invoiceCount: billed.count,
      averageInvoice: billed.count > 0 ? round2(billed.amount / billed.count) : 0,
    },
    expenses,
    payroll: { ...payroll, pending: round2(payroll.total - payroll.paid) },
    net: { accrual: netAccrual, cash: netCash, margin, expenseRatio, payrollRatio },
    trends,
    insights,
  }
}

/* -------------------------------------------------------------------------- */
/*  Delivery settings                                                          */
/* -------------------------------------------------------------------------- */

export const reportSettingsSchema = z.object({
  autoSend: z.boolean().default(true),
  sendDay: z.number().int().min(1).max(28).default(1),
  recipients: z.array(z.string().trim().email()).max(10).default([]),
  note: z.string().trim().max(1200).default(''),
})
export type ReportSettingsInput = z.infer<typeof reportSettingsSchema>

export interface ReportSettings extends ReportSettingsInput {
  updatedAt: string
  lastAutoSentMonth: string | null
}

export const DEFAULT_REPORT_SETTINGS: ReportSettingsInput = {
  autoSend: true,
  sendDay: 1,
  recipients: [],
  note: 'This profit & loss statement is generated from issued invoices, recorded payments, job expenses and payroll for the month.',
}

export interface ReportDelivery {
  id: string
  month: string
  at: string
  recipients: string[]
  status: 'sent' | 'skipped' | 'failed'
  provider: string
  error: string | null
  by: string
}

export interface ProfitLossHistoryEntry {
  month: string
  label: string
  revenue: number
  expenses: number
  payroll: number
  net: number
  margin: number
  lastDelivery: ReportDelivery | null
}
