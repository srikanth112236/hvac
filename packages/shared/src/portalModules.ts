import { z } from 'zod'

/* -------------------------------------------------------------------------- */
/*  Sites                                                                      */
/* -------------------------------------------------------------------------- */

export interface CustomerSite {
  id: string
  customerId: string
  label: string
  address: string
  city: string
  region: string
  postalCode: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export const customerSiteInputSchema = z.object({
  label: z.string().trim().min(2, 'Give the site a name').max(60),
  address: z.string().trim().min(6, 'Enter the service address').max(500),
  city: z.string().trim().max(80).default(''),
  region: z.string().trim().max(80).default(''),
  postalCode: z.string().trim().max(20).default(''),
  isPrimary: z.boolean().default(false),
})
export type CustomerSiteInput = z.infer<typeof customerSiteInputSchema>
export const customerSitePatchSchema = customerSiteInputSchema.partial()

/* -------------------------------------------------------------------------- */
/*  Equipment                                                                  */
/* -------------------------------------------------------------------------- */

export interface EquipmentRecord {
  id: string
  customerId: string
  siteId: string | null
  name: string
  brand: string
  model: string
  serial: string
  capacity: string
  installedAt: string
  warrantyUntil: string
  notes: string
  createdAt: string
  updatedAt: string
}

export const equipmentInputSchema = z.object({
  siteId: z.string().trim().max(80).nullable().optional(),
  name: z.string().trim().min(2, 'Name the equipment').max(120),
  brand: z.string().trim().max(80).default(''),
  model: z.string().trim().max(80).default(''),
  serial: z.string().trim().max(80).default(''),
  capacity: z.string().trim().max(60).default(''),
  installedAt: z.string().trim().max(40).default(''),
  warrantyUntil: z.string().trim().max(40).default(''),
  notes: z.string().trim().max(1000).default(''),
})
export type EquipmentInput = z.infer<typeof equipmentInputSchema>
export const equipmentPatchSchema = z.object({
  siteId: z.string().trim().max(80).nullable().optional(),
  name: z.string().trim().min(2, 'Name the equipment').max(120).optional(),
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  serial: z.string().trim().max(80).optional(),
  capacity: z.string().trim().max(60).optional(),
  installedAt: z.string().trim().max(40).optional(),
  warrantyUntil: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
})

/* -------------------------------------------------------------------------- */
/*  Quotations                                                                 */
/* -------------------------------------------------------------------------- */

export const QUOTATION_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'declined',
  'changes-requested',
  'expired',
] as const
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number]

export const quotationStatusLabel: Record<QuotationStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  'changes-requested': 'Changes requested',
  expired: 'Expired',
}

export interface QuotationLine {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxPercent: number
}

export interface QuotationRecord {
  id: string
  ref: string
  customerId: string
  title: string
  service: string
  lines: QuotationLine[]
  discount: number
  notes: string
  terms: string
  status: QuotationStatus
  validUntil: string
  acceptedAt: string | null
  changeRequest: string | null
  createdAt: string
  updatedAt: string
}

export interface QuotationTotals {
  subtotal: number
  discount: number
  taxable: number
  taxTotal: number
  total: number
}

export const quotationLineSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(300),
  quantity: z.number().min(0.01).max(100_000),
  unitPrice: z.number().min(0).max(100_000_000),
  taxPercent: z.number().min(0).max(100).default(0),
})

export const quotationInputSchema = z.object({
  title: z.string().trim().min(3, 'Give the quotation a title').max(160),
  service: z.string().trim().max(200).default(''),
  lines: z.array(quotationLineSchema).min(1).max(50),
  discount: z.number().min(0).max(100_000_000).default(0),
  notes: z.string().trim().max(1500).default(''),
  terms: z.string().trim().max(2000).default(''),
  status: z.enum(QUOTATION_STATUSES).default('draft'),
  validUntil: z.string().trim().max(40).default(''),
})
export type QuotationInput = z.infer<typeof quotationInputSchema>
export const quotationPatchSchema = z.object({
  title: z.string().trim().min(3, 'Give the quotation a title').max(160).optional(),
  service: z.string().trim().max(200).optional(),
  lines: z.array(quotationLineSchema).min(1).max(50).optional(),
  discount: z.number().min(0).max(100_000_000).optional(),
  notes: z.string().trim().max(1500).optional(),
  terms: z.string().trim().max(2000).optional(),
  status: z.enum(QUOTATION_STATUSES).optional(),
  validUntil: z.string().trim().max(40).optional(),
})

export const quotationChangeRequestSchema = z.object({
  note: z.string().trim().min(5, 'Describe the change you need').max(1500),
})
export type QuotationChangeRequest = z.infer<typeof quotationChangeRequestSchema>

export function quotationTotals(quotation: QuotationRecord): QuotationTotals {
  const subtotal = quotation.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const discount = Math.min(quotation.discount, subtotal)
  const taxable = Math.max(0, subtotal - discount)
  let taxTotal = 0
  for (const line of quotation.lines) {
    const lineGross = line.quantity * line.unitPrice
    const lineNet = subtotal > 0 ? lineGross * (taxable / subtotal) : 0
    taxTotal += lineNet * (line.taxPercent / 100)
  }
  return {
    subtotal,
    discount,
    taxable,
    taxTotal: Math.round(taxTotal * 100) / 100,
    total: Math.round((taxable + taxTotal) * 100) / 100,
  }
}

/* -------------------------------------------------------------------------- */
/*  AMC contracts                                                              */
/* -------------------------------------------------------------------------- */

export const AMC_STATUSES = ['pending', 'active', 'expired', 'cancelled'] as const
export type AmcStatus = (typeof AMC_STATUSES)[number]

export interface AmcContract {
  id: string
  ref: string
  customerId: string
  plan: string
  equipmentIds: string[]
  startDate: string
  endDate: string
  visitsPerYear: number
  price: number
  status: AmcStatus
  notes: string
  renewalRequestedAt: string | null
  createdAt: string
  updatedAt: string
}

export const amcInputSchema = z.object({
  plan: z.string().trim().min(2, 'Name the plan').max(80),
  equipmentIds: z.array(z.string().trim().max(80)).max(50).default([]),
  startDate: z.string().trim().min(4).max(40),
  endDate: z.string().trim().min(4).max(40),
  visitsPerYear: z.number().int().min(0).max(52).default(2),
  price: z.number().min(0).max(100_000_000).default(0),
  status: z.enum(AMC_STATUSES).default('active'),
  notes: z.string().trim().max(1000).default(''),
})
export type AmcInput = z.infer<typeof amcInputSchema>
export const amcPatchSchema = z.object({
  plan: z.string().trim().min(2, 'Name the plan').max(80).optional(),
  equipmentIds: z.array(z.string().trim().max(80)).max(50).optional(),
  startDate: z.string().trim().min(4).max(40).optional(),
  endDate: z.string().trim().min(4).max(40).optional(),
  visitsPerYear: z.number().int().min(0).max(52).optional(),
  price: z.number().min(0).max(100_000_000).optional(),
  status: z.enum(AMC_STATUSES).optional(),
  notes: z.string().trim().max(1000).optional(),
})

/* -------------------------------------------------------------------------- */
/*  Job reports                                                                */
/* -------------------------------------------------------------------------- */

export interface JobChecklistItem {
  id: string
  label: string
  done: boolean
  note: string
}

export interface JobPhoto {
  id: string
  url: string
  alt: string
}

export interface JobReport {
  id: string
  ref: string
  customerId: string
  appointmentId: string | null
  equipmentId: string | null
  title: string
  summary: string
  checklist: JobChecklistItem[]
  photos: JobPhoto[]
  findings: string
  recommendations: string
  technician: string
  completedAt: string
  createdAt: string
  updatedAt: string
}

export const jobReportInputSchema = z.object({
  appointmentId: z.string().trim().max(80).nullable().optional(),
  equipmentId: z.string().trim().max(80).nullable().optional(),
  title: z.string().trim().min(3, 'Give the report a title').max(160),
  summary: z.string().trim().max(2000).default(''),
  checklist: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        done: z.boolean().default(false),
        note: z.string().trim().max(400).default(''),
      }),
    )
    .max(50)
    .default([]),
  photos: z
    .array(z.object({ url: z.string().trim().min(1).max(500), alt: z.string().trim().max(200).default('') }))
    .max(20)
    .default([]),
  findings: z.string().trim().max(2000).default(''),
  recommendations: z.string().trim().max(2000).default(''),
  technician: z.string().trim().max(120).default(''),
  completedAt: z.string().trim().max(40).default(''),
})
export type JobReportInput = z.infer<typeof jobReportInputSchema>
export const jobReportPatchSchema = jobReportInputSchema.partial()

/* -------------------------------------------------------------------------- */
/*  Support tickets                                                            */
/* -------------------------------------------------------------------------- */

export const TICKET_STATUSES = ['open', 'in-progress', 'resolved', 'closed'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_CATEGORIES = ['support', 'complaint', 'billing', 'amc', 'other'] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

export const ticketStatusLabel: Record<TicketStatus, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export interface SupportMessage {
  id: string
  at: string
  authorRole: 'customer' | 'admin'
  authorName: string
  body: string
}

export interface SupportTicket {
  id: string
  ref: string
  customerId: string
  subject: string
  category: TicketCategory
  status: TicketStatus
  messages: SupportMessage[]
  createdAt: string
  updatedAt: string
}

export const ticketInputSchema = z.object({
  subject: z.string().trim().min(3, 'Give the request a subject').max(160),
  category: z.enum(TICKET_CATEGORIES).default('support'),
  body: z.string().trim().min(10, 'Describe the request').max(2000),
})
export type TicketInput = z.infer<typeof ticketInputSchema>

export const ticketReplySchema = z.object({
  body: z.string().trim().min(1, 'Write a reply').max(2000),
})
export type TicketReply = z.infer<typeof ticketReplySchema>

export const ticketPatchSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
})
export type TicketPatch = z.infer<typeof ticketPatchSchema>

/* -------------------------------------------------------------------------- */
/*  Notification preferences                                                   */
/* -------------------------------------------------------------------------- */

export interface NotificationPreferences {
  customerId: string
  emailService: boolean
  emailBilling: boolean
  emailAmc: boolean
  emailMarketing: boolean
  updatedAt: string
}

export const notificationPreferencesPatchSchema = z.object({
  emailService: z.boolean().optional(),
  emailBilling: z.boolean().optional(),
  emailAmc: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
})
export type NotificationPreferencesPatch = z.infer<typeof notificationPreferencesPatchSchema>

export function defaultPreferences(customerId: string): NotificationPreferences {
  return {
    customerId,
    emailService: true,
    emailBilling: true,
    emailAmc: true,
    emailMarketing: false,
    updatedAt: new Date().toISOString(),
  }
}

/* -------------------------------------------------------------------------- */
/*  Aggregate                                                                  */
/* -------------------------------------------------------------------------- */

export interface CustomerPortalFile {
  customer: import('./portal').CustomerAccount
  sites: CustomerSite[]
  equipment: EquipmentRecord[]
  quotations: (QuotationRecord & { totals: QuotationTotals })[]
  amc: AmcContract[]
  reports: JobReport[]
  tickets: SupportTicket[]
  preferences: NotificationPreferences
  invoices: import('./business').InvoiceWithTotals[]
  appointments: import('./portal').AppointmentRecord[]
  requests: import('./site').AdminLead[]
  nextAppointment: import('./portal').AppointmentRecord | null
  summary: import('./portal').CustomerPortalOverview['summary']
}
