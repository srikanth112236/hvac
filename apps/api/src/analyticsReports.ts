import {
  JOB_STATUSES,
  LEAD_STATUSES,
  invoiceTotals,
  type AdminLead,
  type AnalyticsBreakdown,
  type AnalyticsChart,
  type AnalyticsReport,
  type AnalyticsTable,
  type ExpenseRecord,
  type InvoiceRecord,
  type JobRecord,
  type PayrollRecord,
  type ReportsAnalytics,
  type TeamMember,
} from '@hvac/shared'
import { expenseStore, invoiceStore, payrollStore, teamStore } from './business.js'
import { jobStore } from './jobStore.js'
import { leadStore } from './leads.js'
import { customerStore } from './portalAuth.js'

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const moneyExact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const leadStatusLabel: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  'site-visit': 'Site visit',
  quoted: 'Quoted',
  won: 'Won',
  lost: 'Lost',
}

const roleLabel: Record<string, string> = {
  technician: 'Technician',
  'senior-technician': 'Senior technician',
  engineer: 'Engineer',
  'project-manager': 'Project manager',
  sales: 'Sales',
  accounts: 'Accounts',
  helper: 'Helper',
  admin: 'Admin',
}

const jobStatusLabel: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  'in-progress': 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

type SeriesTone = 'cold' | 'heat' | 'success' | 'muted'

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function pct(part: number, total: number): number {
  return total > 0 ? round((part / total) * 100) : 0
}

function monthOf(value: string | null | undefined): string {
  if (!value) return ''
  const direct = value.slice(0, 7)
  if (/^\d{4}-\d{2}$/.test(direct)) return direct
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function labelForMonth(month: string): string {
  const year = Number(month.slice(0, 4))
  const value = Number(month.slice(5, 7))
  return new Date(Date.UTC(year, value - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function periodFor(months: number) {
  const now = new Date()
  const keys: string[] = []
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  const first = keys[0] ?? ''
  const last = keys[keys.length - 1] ?? ''
  const lastYear = Number(last.slice(0, 4))
  const lastMonth = Number(last.slice(5, 7))
  const lastDay = new Date(Date.UTC(lastYear, lastMonth, 0)).toISOString().slice(0, 10)
  return {
    keys,
    labels: keys.map(labelForMonth),
    from: `${first}-01`,
    to: lastDay,
    label: `${months} months to ${labelForMonth(last)}`,
  }
}

function numberSeries(
  keys: string[],
  pairs: { key: string; label: string; tone: SeriesTone; values: number[] }[],
): AnalyticsChart['series'] {
  void keys
  return pairs.map((pair) => ({ ...pair, values: pair.values.map(round) }))
}

function invoiceRevenue(invoice: InvoiceRecord): number {
  return invoiceTotals(invoice).taxable
}

function isLiveInvoice(invoice: InvoiceRecord): boolean {
  return invoice.status !== 'draft' && invoice.status !== 'cancelled'
}

function buildFinancial(
  keys: string[],
  labels: string[],
  invoices: InvoiceRecord[],
  expenses: ExpenseRecord[],
  payroll: PayrollRecord[],
): AnalyticsReport {
  const billed = keys.map((month) =>
    invoices
      .filter(isLiveInvoice)
      .filter((invoice) => monthOf(invoice.issueDate) === month)
      .reduce((sum, invoice) => sum + invoiceRevenue(invoice), 0),
  )
  const collected = keys.map((month) =>
    invoices
      .filter(isLiveInvoice)
      .flatMap((invoice) => invoice.payments)
      .filter((payment) => !payment.reversedAt && monthOf(payment.receivedAt) === month)
      .reduce((sum, payment) => sum + payment.amount, 0),
  )
  const costs = keys.map((month) => {
    const operating = expenses
      .filter((expense) => monthOf(expense.date) === month)
      .reduce((sum, expense) => sum + expense.amount, 0)
    const wages = payroll
      .filter((entry) => entry.period === month)
      .reduce((sum, entry) => sum + entry.amount, 0)
    return operating + wages
  })
  const net = keys.map((_, index) => (billed[index] ?? 0) - (costs[index] ?? 0))
  const totalBilled = billed.reduce((sum, value) => sum + value, 0)
  const totalCollected = collected.reduce((sum, value) => sum + value, 0)
  const totalCosts = costs.reduce((sum, value) => sum + value, 0)
  const totalNet = round(totalBilled - totalCosts)
  const current = keys.length - 1
  const margin = pct(totalNet, totalBilled)
  const table: AnalyticsTable = {
    title: 'Monthly statement',
    columns: ['Month', 'Billed', 'Collected', 'Costs', 'Net', 'Margin'],
    rows: keys.map((month, index) => [
      labelForMonth(month),
      moneyExact.format(billed[index] ?? 0),
      moneyExact.format(collected[index] ?? 0),
      moneyExact.format(costs[index] ?? 0),
      moneyExact.format(net[index] ?? 0),
      `${pct(net[index] ?? 0, billed[index] ?? 0).toFixed(1)}%`,
    ]),
    align: ['left', 'right', 'right', 'right', 'right', 'right'],
  }

  return {
    key: 'financial',
    title: 'Financial performance',
    eyebrow: 'Finance',
    description:
      'Billed revenue, collections, operating costs and payroll in one monthly view, with accrual profit and margin.',
    icon: 'gauge',
    hasData: totalBilled > 0 || totalCosts > 0,
    metrics: [
      {
        label: 'Billed revenue',
        value: round(totalBilled),
        format: 'money',
        note: `${keys.length} months · net of tax`,
      },
      {
        label: 'Collected',
        value: round(totalCollected),
        format: 'money',
        note: 'payments received',
        tone: 'positive',
      },
      {
        label: 'Net profit',
        value: totalNet,
        format: 'money',
        note: `${margin.toFixed(1)}% margin`,
        tone: totalNet >= 0 ? 'positive' : 'warning',
      },
      {
        label: 'This month net',
        value: round(net[current] ?? 0),
        format: 'money',
        note: labelForMonth(keys[current] ?? ''),
        tone: (net[current] ?? 0) >= 0 ? 'positive' : 'warning',
      },
    ],
    charts: [
      {
        title: 'Revenue, collections and costs',
        description: 'Accrual billing against cash collected and total operating costs.',
        labels,
        series: numberSeries(keys, [
          { key: 'billed', label: 'Billed', tone: 'cold', values: billed },
          { key: 'collected', label: 'Collected', tone: 'success', values: collected },
          { key: 'costs', label: 'Costs', tone: 'heat', values: costs },
          { key: 'net', label: 'Net', tone: 'muted', values: net },
        ]),
        format: 'money',
      },
    ],
    breakdowns: [
      {
        title: 'Latest month cost mix',
        description: labelForMonth(keys[current] ?? ''),
        format: 'money',
        items: [
          {
            label: 'Operating expenses',
            value: round(
              expenses
                .filter((expense) => monthOf(expense.date) === keys[current])
                .reduce((sum, expense) => sum + expense.amount, 0),
            ),
            count: expenses.filter((expense) => monthOf(expense.date) === keys[current]).length,
          },
          {
            label: 'Payroll',
            value: round(
              payroll
                .filter((entry) => entry.period === keys[current])
                .reduce((sum, entry) => sum + entry.amount, 0),
            ),
            count: payroll.filter((entry) => entry.period === keys[current]).length,
          },
        ],
      },
    ],
    tables: [table],
    insights: [
      {
        title: totalNet >= 0 ? 'Profitable period' : 'Loss-making period',
        detail: `${money.format(Math.abs(totalNet))} ${totalNet >= 0 ? 'net profit' : 'net loss'} across ${keys.length} months, a ${margin.toFixed(1)}% margin on ${money.format(totalBilled)} billed.`,
        tone: totalNet >= 0 ? 'positive' : 'attention',
      },
      {
        title: 'Cash conversion',
        detail: `${money.format(totalCollected)} collected against ${money.format(totalBilled)} billed (${pct(totalCollected, totalBilled).toFixed(1)}%).`,
        tone: totalCollected >= totalBilled ? 'positive' : 'neutral',
      },
      {
        title: 'Cost base',
        detail: `${money.format(totalCosts)} of operating costs, ${pct(totalCosts, totalBilled).toFixed(1)}% of billed revenue.`,
        tone: pct(totalCosts, totalBilled) > 90 ? 'attention' : 'neutral',
      },
    ],
  }
}

function buildRevenue(invoices: InvoiceRecord[]): AnalyticsReport {
  const live = invoices.filter(isLiveInvoice)
  const views = live.map((invoice) => ({ invoice, totals: invoiceTotals(invoice) }))
  const outstanding = views.filter((view) => view.totals.balance > 0)
  const overdue = outstanding.filter((view) => view.totals.state === 'overdue')
  const collected = views.reduce((sum, view) => sum + view.totals.paid, 0)
  const invoiced = views.reduce((sum, view) => sum + view.totals.total, 0)
  const outstandingValue = views.reduce((sum, view) => sum + view.totals.balance, 0)
  const overdueValue = overdue.reduce((sum, view) => sum + view.totals.balance, 0)

  const aging = [
    { label: 'Current', test: (days: number) => days <= 0 },
    { label: '1–30 days', test: (days: number) => days > 0 && days <= 30 },
    { label: '31–60 days', test: (days: number) => days > 30 && days <= 60 },
    { label: '61–90 days', test: (days: number) => days > 60 && days <= 90 },
    { label: '90+ days', test: (days: number) => days > 90 },
  ].map((bucket) => {
    const rows = outstanding.filter((view) => {
      if (!view.invoice.dueDate) return bucket.label === 'Current'
      const days = Math.floor(
        (Date.now() - Date.parse(view.invoice.dueDate)) / (24 * 60 * 60 * 1000),
      )
      return bucket.test(days)
    })
    return {
      label: bucket.label,
      value: round(rows.reduce((sum, view) => sum + view.totals.balance, 0)),
      count: rows.length,
    }
  })

  const methods = new Map<string, { value: number; count: number }>()
  for (const view of views) {
    for (const payment of view.invoice.payments) {
      if (payment.reversedAt) continue
      const current = methods.get(payment.method) ?? { value: 0, count: 0 }
      methods.set(payment.method, {
        value: current.value + payment.amount,
        count: current.count + 1,
      })
    }
  }
  const methodLabels: Record<string, string> = {
    cash: 'Cash',
    'bank-transfer': 'Bank transfer',
    cheque: 'Cheque',
    'card-on-site': 'Card on site',
  }
  const byMethod: AnalyticsBreakdown = {
    title: 'Collections by method',
    format: 'money',
    items: Array.from(methods.entries())
      .map(([method, row]) => ({ label: methodLabels[method] ?? method, ...row }))
      .sort((a, b) => b.value - a.value),
  }

  return {
    key: 'revenue',
    title: 'Revenue & receivables',
    eyebrow: 'Billing',
    description:
      'What has been invoiced, what has actually been collected, and exactly where the outstanding balance sits.',
    icon: 'coil',
    hasData: views.length > 0,
    metrics: [
      {
        label: 'Invoiced',
        value: round(invoiced),
        format: 'money',
        note: `${views.length} issued invoices`,
      },
      {
        label: 'Collected',
        value: round(collected),
        format: 'money',
        note: `${pct(collected, invoiced).toFixed(1)}% of invoiced`,
        tone: 'positive',
      },
      {
        label: 'Outstanding',
        value: round(outstandingValue),
        format: 'money',
        note: `${outstanding.length} open invoices`,
        tone: 'warning',
      },
      {
        label: 'Overdue',
        value: round(overdueValue),
        format: 'money',
        note: `${overdue.length} past due`,
        tone: overdue.length ? 'warning' : 'positive',
      },
    ],
    charts: [],
    breakdowns: [
      { title: 'Receivables aging', format: 'money', items: aging },
      byMethod,
    ],
    tables: [
      {
        title: 'Largest outstanding balances',
        columns: ['Invoice', 'Customer', 'Due', 'Balance', 'State'],
        align: ['left', 'left', 'left', 'right', 'left'],
        rows: outstanding
          .sort((a, b) => b.totals.balance - a.totals.balance)
          .slice(0, 12)
          .map((view) => [
            view.invoice.ref,
            view.invoice.customerName,
            view.invoice.dueDate,
            moneyExact.format(view.totals.balance),
            view.totals.state,
          ]),
      },
    ],
    insights: [
      {
        title: 'Collection rate',
        detail: `${pct(collected, invoiced).toFixed(1)}% of issued value has been collected. ${money.format(outstandingValue)} remains open.`,
        tone: pct(collected, invoiced) >= 70 ? 'positive' : 'attention',
      },
      {
        title: 'Overdue exposure',
        detail: overdue.length
          ? `${money.format(overdueValue)} across ${overdue.length} invoices is past due. Concentrate follow-up on the 90+ bucket.`
          : 'No invoice is past its due date.',
        tone: overdue.length ? 'attention' : 'positive',
      },
      {
        title: 'Payment behaviour',
        detail: byMethod.items[0]
          ? `${byMethod.items[0].label} is the leading collection method with ${money.format(byMethod.items[0].value)}.`
          : 'No payments recorded yet.',
        tone: 'neutral',
      },
    ],
  }
}

function buildExpenses(
  keys: string[],
  labels: string[],
  expenses: ExpenseRecord[],
): AnalyticsReport {
  const monthTotals = keys.map((month) =>
    expenses
      .filter((expense) => monthOf(expense.date) === month)
      .reduce((sum, expense) => sum + expense.amount, 0),
  )
  const total = monthTotals.reduce((sum, value) => sum + value, 0)
  const current = keys.length - 1
  const categories = new Map<string, { value: number; count: number }>()
  const vendors = new Map<string, { value: number; count: number }>()
  for (const expense of expenses) {
    const category = categories.get(expense.category) ?? { value: 0, count: 0 }
    categories.set(expense.category, { value: category.value + expense.amount, count: category.count + 1 })
    const vendor = vendors.get(expense.vendor || 'Unrecorded') ?? { value: 0, count: 0 }
    vendors.set(expense.vendor || 'Unrecorded', { value: vendor.value + expense.amount, count: vendor.count + 1 })
  }
  const categoryLabels: Record<string, string> = {
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
  const categoryRows = Array.from(categories.entries())
    .map(([category, row]) => ({ label: categoryLabels[category] ?? category, ...row }))
    .sort((a, b) => b.value - a.value)
  const vendorRows = Array.from(vendors.entries())
    .map(([vendor, row]) => ({ label: vendor, ...row }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
  const top = categoryRows[0]

  return {
    key: 'expenses',
    title: 'Expense analysis',
    eyebrow: 'Costs',
    description:
      'Where the operating money goes: monthly spend, category concentration and the vendors carrying the largest share.',
    icon: 'refrigerant',
    hasData: expenses.length > 0,
    metrics: [
      { label: 'Total expenses', value: round(total), format: 'money', note: `${expenses.length} entries` },
      {
        label: 'This month',
        value: round(monthTotals[current] ?? 0),
        format: 'money',
        note: labelForMonth(keys[current] ?? ''),
      },
      {
        label: 'Monthly average',
        value: round(total / Math.max(1, keys.length)),
        format: 'money',
        note: `across ${keys.length} months`,
      },
      {
        label: 'Largest category',
        value: top?.value ?? 0,
        format: 'money',
        note: top?.label ?? 'No expenses',
        tone: 'warning',
      },
    ],
    charts: [
      {
        title: 'Monthly operating spend',
        labels,
        series: numberSeries(keys, [
          { key: 'expenses', label: 'Expenses', tone: 'heat', values: monthTotals },
        ]),
        format: 'money',
      },
    ],
    breakdowns: [
      {
        title: 'By category',
        format: 'money',
        items: categoryRows.map((row) => ({
          ...row,
          note: `${pct(row.value, total).toFixed(1)}% of spend`,
        })),
      },
      { title: 'Top vendors', format: 'money', items: vendorRows },
    ],
    tables: [
      {
        title: 'Recent expenses',
        columns: ['Date', 'Vendor', 'Category', 'Amount'],
        align: ['left', 'left', 'left', 'right'],
        rows: [...expenses]
          .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
          .slice(0, 15)
          .map((expense) => [
            expense.date.slice(0, 10),
            expense.vendor || '—',
            categoryLabels[expense.category] ?? expense.category,
            moneyExact.format(expense.amount),
          ]),
      },
    ],
    insights: [
      {
        title: top ? `${top.label} dominates spend` : 'No spend recorded',
        detail: top
          ? `${money.format(top.value)} across ${top.count} entries, ${pct(top.value, total).toFixed(1)}% of the period.`
          : 'There are no expenses in the ledger yet.',
        tone: top && pct(top.value, total) > 45 ? 'attention' : 'neutral',
      },
      {
        title: 'Monthly run rate',
        detail: `${money.format(total / Math.max(1, keys.length))} average monthly spend across ${keys.length} months.`,
        tone: 'neutral',
      },
      {
        title: 'Vendor concentration',
        detail: vendorRows[0]
          ? `${vendorRows[0].label} is the largest vendor at ${money.format(vendorRows[0].value)}.`
          : 'No vendor costs recorded.',
        tone: 'neutral',
      },
    ],
  }
}

function buildPayroll(
  keys: string[],
  labels: string[],
  payroll: PayrollRecord[],
  team: TeamMember[],
): AnalyticsReport {
  const accrued = keys.map((month) =>
    payroll.filter((entry) => entry.period === month).reduce((sum, entry) => sum + entry.amount, 0),
  )
  const paid = keys.map((month) =>
    payroll
      .filter((entry) => entry.period === month)
      .reduce(
        (sum, entry) =>
          sum +
          (entry.payments?.reduce((inner, payment) => inner + payment.amount, 0) ??
            (entry.status === 'paid' ? entry.amount : 0)),
        0,
      ),
  )
  const total = accrued.reduce((sum, value) => sum + value, 0)
  const totalPaid = paid.reduce((sum, value) => sum + value, 0)
  const roleByMember = new Map(team.map((member) => [member.id, member.role]))
  const roles = new Map<string, { value: number; count: number }>()
  for (const entry of payroll) {
    const role = roleByMember.get(entry.memberId) ?? 'other'
    const current = roles.get(role) ?? { value: 0, count: 0 }
    roles.set(role, { value: current.value + entry.amount, count: current.count + 1 })
  }

  return {
    key: 'payroll',
    title: 'Payroll & team cost',
    eyebrow: 'People',
    description:
      'Net payroll accrued, settled and still outstanding by month and role, drawn from the live payslip ledger.',
    icon: 'wrench',
    hasData: payroll.length > 0,
    metrics: [
      { label: 'Payroll accrued', value: round(total), format: 'money', note: `${payroll.length} payslips` },
      { label: 'Settled', value: round(totalPaid), format: 'money', note: `${pct(totalPaid, total).toFixed(1)}% paid`, tone: 'positive' },
      { label: 'Outstanding', value: round(total - totalPaid), format: 'money', note: 'still payable', tone: 'warning' },
      { label: 'Active team', value: team.filter((member) => member.status === 'active').length, format: 'number', note: `${team.length} people on record` },
    ],
    charts: [
      {
        title: 'Accrued vs settled payroll',
        labels,
        series: numberSeries(keys, [
          { key: 'accrued', label: 'Accrued', tone: 'cold', values: accrued },
          { key: 'paid', label: 'Settled', tone: 'success', values: paid },
        ]),
        format: 'money',
      },
    ],
    breakdowns: [
      {
        title: 'Payroll by role',
        format: 'money',
        items: Array.from(roles.entries())
          .map(([role, row]) => ({ label: roleLabel[role] ?? role, ...row }))
          .sort((a, b) => b.value - a.value),
      },
    ],
    tables: [
      {
        title: 'Payslip register',
        columns: ['Member', 'Role', 'Period', 'Net', 'Status'],
        align: ['left', 'left', 'left', 'right', 'left'],
        rows: [...payroll]
          .sort((a, b) => b.period.localeCompare(a.period))
          .slice(0, 15)
          .map((entry) => [
            team.find((member) => member.id === entry.memberId)?.name ?? entry.memberId,
            roleLabel[roleByMember.get(entry.memberId) ?? 'other'] ?? 'Team',
            entry.period,
            moneyExact.format(entry.amount),
            entry.status,
          ]),
      },
    ],
    insights: [
      {
        title: 'Settlement position',
        detail: `${money.format(totalPaid)} of ${money.format(total)} payroll has been settled; ${money.format(total - totalPaid)} remains payable.`,
        tone: total - totalPaid > 0 ? 'attention' : 'positive',
      },
      {
        title: 'Payroll share',
        detail: `${payroll.length} payslips across ${keys.length} months. Review the role breakdown for concentration.`,
        tone: 'neutral',
      },
    ],
  }
}

function buildPipeline(keys: string[], labels: string[], leads: AdminLead[]): AnalyticsReport {
  const newLeads = keys.map(
    (month) => leads.filter((lead) => monthOf(lead.createdAt) === month).length,
  )
  const byStatus = LEAD_STATUSES.map((status) => {
    const rows = leads.filter((lead) => lead.status === status)
    return {
      label: leadStatusLabel[status] ?? status,
      value: rows.reduce((sum, lead) => sum + (lead.value ?? 0), 0),
      count: rows.length,
    }
  })
  const open = leads.filter((lead) => lead.status !== 'won' && lead.status !== 'lost')
  const won = leads.filter((lead) => lead.status === 'won')
  const pipelineValue = open.reduce((sum, lead) => sum + (lead.value ?? 0), 0)
  const wonValue = won.reduce((sum, lead) => sum + (lead.value ?? 0), 0)
  const conversion = pct(won.length, leads.length)
  const sources = new Map<string, { value: number; count: number }>()
  for (const lead of leads) {
    const source = sources.get(lead.source) ?? { value: 0, count: 0 }
    sources.set(lead.source, {
      value: source.value + (lead.value ?? 0),
      count: source.count + 1,
    })
  }
  const services = new Map<string, number>()
  for (const lead of leads) {
    const service = lead.serviceName || 'Unallocated'
    services.set(service, (services.get(service) ?? 0) + 1)
  }
  const topService = Array.from(services.entries()).sort((a, b) => b[1] - a[1])[0]

  return {
    key: 'pipeline',
    title: 'Sales pipeline',
    eyebrow: 'Growth',
    description:
      'Lead volume, stage distribution, conversion and where the open pipeline value is concentrated.',
    icon: 'airflow',
    hasData: leads.length > 0,
    metrics: [
      { label: 'Total leads', value: leads.length, format: 'number', note: `${newLeads.reduce((sum, value) => sum + value, 0)} in period` },
      { label: 'Pipeline value', value: round(pipelineValue), format: 'money', note: `${open.length} open leads` },
      { label: 'Won value', value: round(wonValue), format: 'money', note: `${won.length} won`, tone: 'positive' },
      { label: 'Conversion', value: conversion, format: 'percent', note: 'won ÷ all leads', tone: conversion >= 25 ? 'positive' : 'warning' },
    ],
    charts: [
      {
        title: 'New leads by month',
        labels,
        series: numberSeries(keys, [
          { key: 'leads', label: 'New leads', tone: 'cold', values: newLeads },
        ]),
        format: 'number',
      },
    ],
    breakdowns: [
      { title: 'Leads by stage', format: 'money', items: byStatus },
      {
        title: 'Top lead sources',
        format: 'number',
        items: Array.from(sources.entries())
          .map(([source, row]) => ({ label: source, value: row.count, count: row.count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8),
      },
    ],
    tables: [
      {
        title: 'Pipeline by stage',
        columns: ['Stage', 'Leads', 'Value', 'Share'],
        align: ['left', 'right', 'right', 'right'],
        rows: byStatus.map((row) => [
          row.label,
          row.count,
          money.format(row.value),
          `${pct(row.count, leads.length).toFixed(1)}%`,
        ]),
      },
    ],
    insights: [
      {
        title: 'Pipeline coverage',
        detail: `${money.format(pipelineValue)} remains open across ${open.length} leads; ${money.format(wonValue)} has been won.`,
        tone: 'neutral',
      },
      {
        title: 'Conversion',
        detail: `${conversion.toFixed(1)}% of all leads convert. ${topService ? `${topService[0]} is the most requested service with ${topService[1]} enquiries.` : ''}`,
        tone: conversion >= 25 ? 'positive' : 'attention',
      },
      {
        title: 'Demand concentration',
        detail: byStatus[0]
          ? `The largest stage is ${byStatus[0].label.toLowerCase()} with ${byStatus[0].count} leads.`
          : 'No leads recorded.',
        tone: 'neutral',
      },
    ],
  }
}

function buildOperations(
  keys: string[],
  labels: string[],
  jobs: JobRecord[],
): AnalyticsReport {
  const created = keys.map((month) => jobs.filter((job) => monthOf(job.createdAt) === month).length)
  const completed = keys.map(
    (month) => jobs.filter((job) => monthOf(job.completedAt) === month).length,
  )
  const completedJobs = jobs.filter((job) => job.status === 'completed')
  const open = jobs.filter((job) => !['completed', 'cancelled'].includes(job.status))
  const completionRate = pct(completedJobs.length, jobs.length)
  const durationDays = completedJobs
    .map((job) => {
      if (!job.completedAt) return null
      const end = Date.parse(job.completedAt)
      const start = Date.parse(job.startedAt ?? job.createdAt)
      if (!Number.isFinite(end) || !Number.isFinite(start)) return null
      return Math.max(0, (end - start) / (24 * 60 * 60 * 1000))
    })
    .filter((value): value is number => value !== null)
  const averageDuration = durationDays.length
    ? round(durationDays.reduce((sum, value) => sum + value, 0) / durationDays.length)
    : 0
  const technicians = new Map<string, { total: number; completed: number }>()
  for (const job of jobs) {
    const name = job.technician || 'Unassigned'
    const current = technicians.get(name) ?? { total: 0, completed: 0 }
    technicians.set(name, {
      total: current.total + 1,
      completed: current.completed + (job.status === 'completed' ? 1 : 0),
    })
  }
  const statusRows = JOB_STATUSES.map((status) => ({
    label: jobStatusLabel[status] ?? status,
    value: jobs.filter((job) => job.status === status).length,
    count: jobs.filter((job) => job.status === status).length,
  }))

  return {
    key: 'operations',
    title: 'Service operations',
    eyebrow: 'Delivery',
    description:
      'Job throughput, open workload, completion quality and technician load from the live service board.',
    icon: 'wrench',
    hasData: jobs.length > 0,
    metrics: [
      { label: 'Jobs created', value: jobs.length, format: 'number', note: `${created.reduce((sum, value) => sum + value, 0)} in period` },
      { label: 'Completed', value: completedJobs.length, format: 'number', note: `${completionRate.toFixed(1)}% completion`, tone: 'positive' },
      { label: 'Open workload', value: open.length, format: 'number', note: 'scheduled or in progress', tone: open.length ? 'warning' : 'positive' },
      { label: 'Avg. completion', value: averageDuration, format: 'number', note: 'days from start to completion' },
    ],
    charts: [
      {
        title: 'Jobs created vs completed',
        labels,
        series: numberSeries(keys, [
          { key: 'created', label: 'Created', tone: 'cold', values: created },
          { key: 'completed', label: 'Completed', tone: 'success', values: completed },
        ]),
        format: 'number',
      },
    ],
    breakdowns: [
      { title: 'Jobs by status', format: 'number', items: statusRows },
      {
        title: 'Technician workload',
        format: 'number',
        items: Array.from(technicians.entries())
          .map(([name, row]) => ({ label: name, value: row.total, count: row.completed, note: `${row.completed} completed` }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10),
      },
    ],
    tables: [
      {
        title: 'Technician performance',
        columns: ['Technician', 'Jobs', 'Completed', 'Completion'],
        align: ['left', 'right', 'right', 'right'],
        rows: Array.from(technicians.entries())
          .map(([name, row]) => [
            name,
            row.total,
            row.completed,
            `${pct(row.completed, row.total).toFixed(1)}%`,
          ])
          .sort((a, b) => Number(b[1]) - Number(a[1])),
      },
    ],
    insights: [
      {
        title: 'Throughput',
        detail: `${completedJobs.length} of ${jobs.length} jobs completed (${completionRate.toFixed(1)}%), with ${open.length} still open.`,
        tone: completionRate >= 60 ? 'positive' : 'attention',
      },
      {
        title: 'Turnaround',
        detail: averageDuration
          ? `Completed jobs average ${averageDuration.toFixed(1)} days from start to finish.`
          : 'Not enough completed jobs to calculate turnaround.',
        tone: 'neutral',
      },
      {
        title: 'Workload balance',
        detail: technicians.size
          ? `${technicians.size} technicians carry the board. Review the workload chart for concentration.`
          : 'No technician assignments recorded.',
        tone: 'neutral',
      },
    ],
  }
}

export async function buildReportsAnalytics(monthsInput: number): Promise<ReportsAnalytics> {
  const months = Math.min(24, Math.max(3, Math.round(monthsInput) || 6))
  const period = periodFor(months)
  const [invoices, expenses, payroll, team, jobs, leads, customers] = await Promise.all([
    invoiceStore.read(),
    expenseStore.read(),
    payrollStore.read(),
    teamStore.read(),
    jobStore.read(),
    leadStore.read(),
    customerStore.read(),
  ])
  const reports = [
    buildFinancial(period.keys, period.labels, invoices, expenses, payroll),
    buildRevenue(invoices),
    buildExpenses(period.keys, period.labels, expenses),
    buildPayroll(period.keys, period.labels, payroll, team),
    buildPipeline(period.keys, period.labels, leads),
    buildOperations(period.keys, period.labels, jobs),
  ]
  // Customer count is a live business signal used in the header strip.
  const activeCustomers = customers.length
  const financial = reports[0]
  if (financial) {
    financial.metrics.push({
      label: 'Customers',
      value: activeCustomers,
      format: 'number',
      note: 'customer accounts',
    })
  }
  return {
    period: {
      months,
      from: period.from,
      to: period.to,
      label: period.label,
    },
    generatedAt: new Date().toISOString(),
    reports,
  }
}

export function findReport(
  analytics: ReportsAnalytics,
  key: string,
): AnalyticsReport | undefined {
  return analytics.reports.find((report) => report.key === key)
}

export function reportToCsv(report: AnalyticsReport, analytics: ReportsAnalytics): string {
  const rows: (string | number)[][] = [
    ['Report', report.title],
    ['Period', analytics.period.label],
    ['Generated', new Date(analytics.generatedAt).toISOString()],
    [],
    ['Metrics'],
    ['Label', 'Value', 'Note'],
    ...report.metrics.map((metric) => [metric.label, metric.value, metric.note ?? '']),
  ]
  for (const chart of report.charts) {
    rows.push([], [chart.title], ['Period', ...chart.series.map((series) => series.label)])
    chart.labels.forEach((label, index) => {
      rows.push([label, ...chart.series.map((series) => series.values[index] ?? 0)])
    })
  }
  for (const breakdown of report.breakdowns) {
    rows.push([], [breakdown.title], ['Label', 'Value', 'Count', 'Note'])
    for (const item of breakdown.items) {
      rows.push([item.label, item.value, item.count ?? '', item.note ?? ''])
    }
  }
  for (const table of report.tables) {
    rows.push([], [table.title], table.columns)
    rows.push(...table.rows)
  }
  rows.push([], ['Insights'], ['Title', 'Detail'])
  for (const insight of report.insights) rows.push([insight.title, insight.detail])
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '')
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
        })
        .join(','),
    )
    .join('\r\n')
}
