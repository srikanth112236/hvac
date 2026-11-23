import { z } from 'zod'

/* -------------------------------------------------------------------------- */
/*  Domain vocabulary shared by web, API and admin                            */
/* -------------------------------------------------------------------------- */

export const ROLES = [
  'superadmin',
  'admin',
  'manager',
  'sales',
  'dispatcher',
  'technician',
  'accountant',
  'customer',
] as const
export type Role = (typeof ROLES)[number]

/** Roles for the single-workspace admin panel. */
export const ADMIN_ROLES = ['owner', 'admin', 'manager', 'accountant', 'viewer'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]
export const adminRoleLabel: Record<AdminRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  accountant: 'Accountant',
  viewer: 'Viewer',
}

/* -------------------------------------------------------------------------- */
/*  Admin permissions                                                          */
/* -------------------------------------------------------------------------- */

export const ADMIN_PERMISSIONS = [
  {
    key: 'data.read',
    label: 'Read operational data',
    description: 'Leads, customers, invoices, content and portal records.',
  },
  {
    key: 'leads.write',
    label: 'Leads & reminders',
    description: 'Create and update leads, follow-ups and reminders.',
  },
  {
    key: 'content.write',
    label: 'Content & media',
    description: 'Edit site copy, journal posts, products and uploads.',
  },
  {
    key: 'customers.write',
    label: 'Customers & portal access',
    description: 'Edit customer files, approve or suspend portal accounts.',
  },
  {
    key: 'portal.write',
    label: 'Quotes, AMC & support',
    description: 'Issue quotations and AMC contracts, file job reports, reply to tickets.',
  },
  {
    key: 'billing.write',
    label: 'Invoices, payroll & expenses',
    description: 'Issue invoices, record payments, manage payroll and expenses.',
  },
  {
    key: 'marketing.write',
    label: 'Newsletters & coupons',
    description: 'Send campaigns and manage discount codes.',
  },
  {
    key: 'data.export',
    label: 'Audit, export & data health',
    description: 'Read the audit log, export backups and run data-health checks.',
  },
  {
    key: 'users.manage',
    label: 'Users & roles',
    description: 'Create staff accounts, change roles and reset passwords.',
  },
] as const

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]['key']

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  owner: ADMIN_PERMISSIONS.map((permission) => permission.key),
  admin: [
    'data.read',
    'leads.write',
    'content.write',
    'customers.write',
    'portal.write',
    'billing.write',
    'marketing.write',
    'data.export',
  ],
  manager: ['data.read', 'leads.write', 'content.write', 'customers.write', 'portal.write'],
  accountant: ['data.read', 'billing.write'],
  viewer: ['data.read'],
}

export function roleCan(role: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function rolesForPermission(permission: AdminPermission): AdminRole[] {
  return ADMIN_ROLES.filter((role) => roleCan(role, permission))
}

export const adminUserInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(120),
  email: z.string().trim().email('Enter a valid email').max(160),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
  role: z.enum(ADMIN_ROLES).default('viewer'),
})
export type AdminUserInput = z.infer<typeof adminUserInputSchema>

export const adminUserPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  password: z.string().min(8).max(200).optional(),
})
export type AdminUserPatch = z.infer<typeof adminUserPatchSchema>

export const SERVICE_CATEGORIES = [
  'residential',
  'commercial',
  'industrial',
  'maintenance',
] as const
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export const LEAD_STATUSES = ['new', 'contacted', 'site-visit', 'quoted', 'won', 'lost'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const URGENCY = ['normal', 'emergency'] as const
export type Urgency = (typeof URGENCY)[number]

/** Cash / on-site settlement only — no payment gateway in this template. */
export const PAYMENT_METHODS = ['cash', 'bank-transfer', 'cheque', 'card-on-site'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const CONTACT_CHANNELS = ['phone', 'email', 'form', 'chat'] as const
export type ContactChannel = (typeof CONTACT_CHANNELS)[number]

/* -------------------------------------------------------------------------- */
/*  Validation contracts (used by client forms and API handlers alike)        */
/* -------------------------------------------------------------------------- */

export const contactEnquirySchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a reachable phone number')
    .max(20)
    .regex(/^[+0-9()\s-]+$/, 'Digits, spaces and + only'),
  message: z.string().trim().min(12, 'Tell us the system and the symptom').max(2000),
  serviceSlug: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  urgency: z.enum(URGENCY).default('normal'),
})
export type ContactEnquiry = z.infer<typeof contactEnquirySchema>

export const callbackRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+0-9()\s-]+$/, 'Digits, spaces and + only'),
  window: z.enum(['morning', 'afternoon', 'evening']),
})
export type CallbackRequest = z.infer<typeof callbackRequestSchema>

/* -------------------------------------------------------------------------- */
/*  Leads                                                                      */
/* -------------------------------------------------------------------------- */

export const LEAD_SOURCES = [
  'contact-page',
  'service-page',
  'amc-page',
  'calculator',
  'customer-portal',
] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

/** Contact/service enquiry as submitted to POST /api/v1/leads. */
export const leadSubmissionSchema = contactEnquirySchema.extend({
  source: z.enum(LEAD_SOURCES).default('contact-page'),
  serviceName: z.string().trim().max(120).optional(),
  context: z.string().trim().max(1200).optional(),
  plan: z.string().trim().max(60).optional(),
  /** Hidden field; real visitors never fill it. */
  honeypot: z.string().max(200).optional(),
})
export type LeadSubmission = z.infer<typeof leadSubmissionSchema>

/** Hero callback as submitted to POST /api/v1/leads/callback. */
export const callbackLeadSchema = callbackRequestSchema.extend({
  scope: z.string().trim().max(60).optional(),
  honeypot: z.string().max(200).optional(),
})
export type CallbackLead = z.infer<typeof callbackLeadSchema>

/** Stored lead. Phase 6 replaces the JSON store with the Lead collection. */
export interface LeadRecord {
  ref: string
  createdAt: string
  status: LeadStatus
  source: LeadSource | 'callback'
  name: string
  email: string
  phone: string
  message: string
  serviceSlug: string | null
  serviceName: string | null
  city: string | null
  urgency: Urgency
  plan: string | null
  context: string | null
}

/** ENQ-2026-0001, numbered per calendar year. */
export function leadReference(year: number, sequence: number): string {
  return `ENQ-${year}-${String(sequence).padStart(4, '0')}`
}

/* -------------------------------------------------------------------------- */
/*  Formatting helpers                                                        */
/* -------------------------------------------------------------------------- */

/** QT-2026-0001 / INV-2026-0001 / AMC-2026-0001, numbered per financial year. */
export function documentNumber(
  prefix: 'QT' | 'INV' | 'AMC',
  year: number,
  sequence: number,
): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`
}

export function formatTonnage(tr: number): string {
  return `${tr % 1 === 0 ? tr.toFixed(0) : tr.toFixed(1)} TR`
}

export const SITE_URL_PLACEHOLDER = 'https://coolvane.example'

export * from './site'
export * from './contentHistory'
export * from './business'
export * from './seed'
export * from './editorial'
export * from './media'
export * from './portal'
export * from './portalModules'
export * from './jobs'
export * from './marketing'
