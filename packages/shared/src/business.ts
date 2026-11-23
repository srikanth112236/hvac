import { z } from 'zod'

/* -------------------------------------------------------------------------- */
/*  Invoices, expenses, team and payroll                                      */
/* -------------------------------------------------------------------------- */

export const INVOICE_PAYMENT_METHODS = ['cash', 'bank-transfer', 'cheque', 'card-on-site'] as const
export const INVOICE_RECORD_STATUSES = ['draft', 'issued', 'cancelled'] as const
export const INVOICE_STATES = ['draft', 'unpaid', 'partial', 'paid', 'overdue', 'cancelled'] as const
export type InvoicePaymentMethod = (typeof INVOICE_PAYMENT_METHODS)[number]
export type InvoiceRecordStatus = (typeof INVOICE_RECORD_STATUSES)[number]
export type InvoiceState = (typeof INVOICE_STATES)[number]

export interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxPercent: number
}

export interface InvoicePayment {
  id: string
  amount: number
  method: InvoicePaymentMethod
  reference: string
  notes: string
  receivedAt: string
  recordedAt: string
  recordedBy: string
}

export interface InvoiceRecord {
  id: string
  ref: string
  customerName: string
  customerPhone: string
  customerEmail: string
  customerAddress: string
  customerGstin: string
  service: string
  leadRef: string | null
  issueDate: string
  dueDate: string
  status: InvoiceRecordStatus
  lines: InvoiceLine[]
  discount: number
  taxMode: 'intra' | 'inter'
  notes: string
  terms: string
  payments: InvoicePayment[]
  reminderDates: string[]
  lastReminderAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InvoiceTotals {
  subtotal: number
  discount: number
  taxable: number
  taxTotal: number
  cgst: number
  sgst: number
  igst: number
  total: number
  paid: number
  balance: number
  state: InvoiceState
  daysOverdue: number
}

export type InvoiceWithTotals = InvoiceRecord & { totals: InvoiceTotals }

export interface InvoiceSummary {
  invoiced: number
  collected: number
  outstanding: number
  overdueAmount: number
  paidCount: number
  partialCount: number
  overdueCount: number
  draftCount: number
  count: number
  collectedThisMonth: number
  invoicedThisMonth: number
}

export const invoiceLineSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(300),
  quantity: z.number().min(0.01).max(100_000),
  unitPrice: z.number().min(0).max(100_000_000),
  taxPercent: z.number().min(0).max(100).default(18),
})

export const invoiceInputSchema = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerPhone: z.string().trim().max(30).default(''),
  customerEmail: z.string().trim().email().or(z.literal('')).default(''),
  customerAddress: z.string().trim().max(500).default(''),
  customerGstin: z.string().trim().max(40).default(''),
  service: z.string().trim().max(200).default(''),
  leadRef: z.string().trim().max(40).nullable().optional(),
  issueDate: z.string().trim().min(4).max(40),
  dueDate: z.string().trim().min(4).max(40),
  status: z.enum(INVOICE_RECORD_STATUSES).default('issued'),
  lines: z.array(invoiceLineSchema).min(1).max(50),
  discount: z.number().min(0).max(100_000_000).default(0),
  taxMode: z.enum(['intra', 'inter']).default('intra'),
  notes: z.string().trim().max(1500).default(''),
  terms: z.string().trim().max(2000).default(''),
})

export const invoicePatchSchema = invoiceInputSchema.partial()
export type InvoiceInput = z.infer<typeof invoiceInputSchema>
export type InvoicePatch = z.infer<typeof invoicePatchSchema>

export const invoicePaymentInputSchema = z.object({
  amount: z.number().positive().max(100_000_000),
  method: z.enum(INVOICE_PAYMENT_METHODS),
  reference: z.string().trim().max(120).default(''),
  notes: z.string().trim().max(500).default(''),
  receivedAt: z.string().trim().min(4).max(40),
})
export type InvoicePaymentInput = z.infer<typeof invoicePaymentInputSchema>

export const EXPENSE_CATEGORIES = [
  'materials',
  'equipment',
  'transport',
  'subcontractor',
  'office',
  'utilities',
  'marketing',
  'travel',
  'other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface ExpenseRecord {
  id: string
  date: string
  category: ExpenseCategory
  vendor: string
  description: string
  amount: number
  taxAmount: number
  method: InvoicePaymentMethod
  reference: string
  notes: string
  createdAt: string
  updatedAt: string
}

export const expenseInputSchema = z.object({
  date: z.string().trim().min(4).max(40),
  category: z.enum(EXPENSE_CATEGORIES).default('other'),
  vendor: z.string().trim().max(160).default(''),
  description: z.string().trim().min(2).max(300),
  amount: z.number().min(0).max(100_000_000),
  taxAmount: z.number().min(0).max(100_000_000).default(0),
  method: z.enum(INVOICE_PAYMENT_METHODS).default('bank-transfer'),
  reference: z.string().trim().max(120).default(''),
  notes: z.string().trim().max(1000).default(''),
})

export const expensePatchSchema = expenseInputSchema.partial()
export type ExpenseInput = z.infer<typeof expenseInputSchema>
export type ExpensePatch = z.infer<typeof expensePatchSchema>

export const TEAM_ROLES = [
  'technician',
  'senior-technician',
  'engineer',
  'project-manager',
  'sales',
  'accounts',
  'helper',
  'admin',
] as const
export type TeamRole = (typeof TEAM_ROLES)[number]

export interface TeamMember {
  id: string
  name: string
  role: TeamRole
  phone: string
  email: string
  skills: string[]
  certifications: string[]
  monthlySalary: number
  payCycle: 'monthly' | 'daily' | 'contract'
  joinedAt: string
  status: 'active' | 'inactive'
  notes: string
  createdAt: string
  updatedAt: string
}

export const teamMemberInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  role: z.enum(TEAM_ROLES).default('technician'),
  phone: z.string().trim().max(30).default(''),
  email: z.string().trim().email().or(z.literal('')).default(''),
  skills: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  certifications: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  monthlySalary: z.number().min(0).max(100_000_000).default(0),
  payCycle: z.enum(['monthly', 'daily', 'contract']).default('monthly'),
  joinedAt: z.string().trim().max(40).default(''),
  status: z.enum(['active', 'inactive']).default('active'),
  notes: z.string().trim().max(1000).default(''),
})

export const teamMemberPatchSchema = teamMemberInputSchema.partial()
export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>
export type TeamMemberPatch = z.infer<typeof teamMemberPatchSchema>

export interface PayrollRecord {
  id: string
  memberId: string
  period: string
  baseAmount: number
  bonus: number
  deductions: number
  amount: number
  status: 'pending' | 'paid'
  paidAt: string | null
  method: InvoicePaymentMethod
  reference: string
  notes: string
  createdAt: string
  updatedAt: string
}

export const payrollInputSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  baseAmount: z.number().min(0).max(100_000_000),
  bonus: z.number().min(0).max(100_000_000).default(0),
  deductions: z.number().min(0).max(100_000_000).default(0),
  status: z.enum(['pending', 'paid']).default('pending'),
  paidAt: z.string().trim().max(40).nullable().optional(),
  method: z.enum(INVOICE_PAYMENT_METHODS).default('bank-transfer'),
  reference: z.string().trim().max(120).default(''),
  notes: z.string().trim().max(1000).default(''),
})

export const payrollPatchSchema = payrollInputSchema.partial()
export type PayrollInput = z.infer<typeof payrollInputSchema>
export type PayrollPatch = z.infer<typeof payrollPatchSchema>

export function invoiceTotals(invoice: InvoiceRecord, now = Date.now()): InvoiceTotals {
  const subtotal = invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const discount = Math.min(invoice.discount, subtotal)
  const taxable = Math.max(0, subtotal - discount)
  let taxTotal = 0
  for (const line of invoice.lines) {
    const lineGross = line.quantity * line.unitPrice
    const lineNet = subtotal > 0 ? lineGross * (taxable / subtotal) : 0
    taxTotal += lineNet * (line.taxPercent / 100)
  }
  const total = Math.round((taxable + taxTotal) * 100) / 100
  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
  const balance = Math.max(0, Math.round((total - paid) * 100) / 100)
  const due = new Date(invoice.dueDate).getTime()
  const daysOverdue =
    invoice.status === 'issued' && balance > 0 && Number.isFinite(due)
      ? Math.max(0, Math.floor((now - due) / 86_400_000))
      : 0
  let state: InvoiceState = 'unpaid'
  if (invoice.status === 'draft') state = 'draft'
  else if (invoice.status === 'cancelled') state = 'cancelled'
  else if (balance <= 0) state = 'paid'
  else if (daysOverdue > 0) state = 'overdue'
  else if (paid > 0) state = 'partial'
  return {
    subtotal,
    discount,
    taxable,
    taxTotal: Math.round(taxTotal * 100) / 100,
    cgst: invoice.taxMode === 'intra' ? Math.round((taxTotal / 2) * 100) / 100 : 0,
    sgst: invoice.taxMode === 'intra' ? Math.round((taxTotal / 2) * 100) / 100 : 0,
    igst: invoice.taxMode === 'inter' ? Math.round(taxTotal * 100) / 100 : 0,
    total,
    paid,
    balance,
    state,
    daysOverdue,
  }
}

export function invoiceStateLabel(state: InvoiceState): string {
  return (
    {
      draft: 'Draft',
      unpaid: 'Unpaid',
      partial: 'Part paid',
      paid: 'Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled',
    }[state] ?? state
  )
}