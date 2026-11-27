import { z } from 'zod'
import type { AdminLead, ReminderRecord } from './site'
import type { QuotationStatus, QuotationTotals } from './portalModules'

/* -------------------------------------------------------------------------- */
/*  Sales staff                                                                */
/* -------------------------------------------------------------------------- */

export interface SalesRepProfile {
  /** Admin user email. This is the canonical owner key for a sales lead. */
  email: string
  name: string
  userId: string | null
  teamMemberId: string | null
  baseSalary: number
  active: boolean
  updatedAt: string
}

export interface SalesTargetRecord {
  email: string
  month: string
  revenueTarget: number
  dealsTarget: number
  quotesTarget: number
  commissionRate: number
  updatedAt: string
  updatedBy: string
}

export interface SalesMetrics {
  assignedLeads: number
  openLeads: number
  wonDeals: number
  lostDeals: number
  wonValue: number
  pipelineValue: number
  conversionRate: number
  targetValue: number
  targetDeals: number
  attainment: number
  quotes: number
  quotesSent: number
  quotesAccepted: number
  quoteValue: number
  followUpsOpen: number
  followUpsOverdue: number
  commission: number
}

export interface SalesPayrollSummary {
  period: string
  status: 'paid' | 'pending' | 'missing'
  baseAmount: number
  amount: number
  paidAt: string | null
}

export interface SalesRepSummary {
  profile: SalesRepProfile
  target: SalesTargetRecord | null
  metrics: SalesMetrics
  payroll: SalesPayrollSummary
  estimatedPay: number
}

export interface SalesLeadRow extends AdminLead {
  quoteCount: number
  quoteValue: number
  ageDays: number
  stale: boolean
}

export interface SalesFollowUpRow extends ReminderRecord {
  leadName: string
  leadEmail: string
  owner: string | null
  overdue: boolean
}

export interface SalesQuoteRow {
  id: string
  ref: string
  leadRef: string | null
  title: string
  service: string
  status: QuotationStatus
  totals: QuotationTotals
  customerName: string
  leadName: string | null
  owner: string | null
  validUntil: string
  sentAt: string | null
  acceptedAt: string | null
  updatedAt: string
}

export interface SalesJobRow {
  id: string
  ref: string
  title: string
  customerName: string
  status: string
  technician: string
  scheduledAt: string | null
  completedAt: string | null
}

export interface SalesTrendPoint {
  month: string
  wonValue: number
  wonDeals: number
  targetValue: number
}

export interface SalesScope {
  mode: 'own' | 'team'
  email: string | null
  label: string
}

export interface SalesWorkspace {
  month: string
  scope: SalesScope
  viewer: { email: string; name: string; role: string }
  metrics: SalesMetrics
  target: SalesTargetRecord | null
  profile: SalesRepProfile | null
  payroll: SalesPayrollSummary | null
  leads: SalesLeadRow[]
  followUps: SalesFollowUpRow[]
  quotations: SalesQuoteRow[]
  jobs: SalesJobRow[]
  reps: SalesRepSummary[]
  trend: SalesTrendPoint[]
  generatedAt: string
}

/* -------------------------------------------------------------------------- */
/*  Inputs                                                                     */
/* -------------------------------------------------------------------------- */

export const salesMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use a YYYY-MM month.')

export const salesTargetSaveSchema = z.object({
  month: salesMonthSchema,
  revenueTarget: z.number().min(0).max(1_000_000_000),
  dealsTarget: z.number().int().min(0).max(100_000),
  quotesTarget: z.number().int().min(0).max(100_000),
  commissionRate: z.number().min(0).max(50),
})
export type SalesTargetSave = z.infer<typeof salesTargetSaveSchema>

export const salesRepPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  teamMemberId: z.string().trim().max(80).nullable().optional(),
  baseSalary: z.number().min(0).max(100_000_000).optional(),
  active: z.boolean().optional(),
})
export type SalesRepPatch = z.infer<typeof salesRepPatchSchema>

export const salesAssignSchema = z.object({
  refs: z.array(z.string().trim().min(3).max(40)).min(1).max(200),
  owner: z.string().trim().email().nullable(),
})
export type SalesAssign = z.infer<typeof salesAssignSchema>

export const salesLeadPatchSchema = z.object({
  status: z.enum(['new', 'contacted', 'site-visit', 'quoted', 'won', 'lost']).optional(),
  value: z.number().min(0).max(100_000_000).nullable().optional(),
  followUpAt: z.string().trim().max(40).nullable().optional(),
  note: z.string().trim().min(1).max(2000).optional(),
  owner: z.string().trim().email().nullable().optional(),
})
export type SalesLeadPatch = z.infer<typeof salesLeadPatchSchema>

export const salesFollowUpCreateSchema = z.object({
  leadRef: z.string().trim().min(3).max(40),
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().max(1000).default(''),
  dueAt: z.string().trim().min(4).max(40),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})
export type SalesFollowUpCreate = z.infer<typeof salesFollowUpCreateSchema>

export const salesFollowUpPatchSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  body: z.string().trim().max(1000).optional(),
  dueAt: z.string().trim().min(4).max(40).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(['open', 'done']).optional(),
})
export type SalesFollowUpPatch = z.infer<typeof salesFollowUpPatchSchema>

export const salesQuoteStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'declined', 'changes-requested', 'expired']),
})
export type SalesQuoteStatus = z.infer<typeof salesQuoteStatusSchema>
