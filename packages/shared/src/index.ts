import { z } from 'zod'
import type { AdminLead, LeadAttachment } from './site'

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
export const ADMIN_ROLES = ['owner', 'admin', 'manager', 'sales', 'accountant', 'viewer'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]
export const adminRoleLabel: Record<AdminRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  sales: 'Sales',
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
  sales: ['data.read', 'leads.write', 'portal.write'],
  accountant: ['data.read', 'billing.write'],
  viewer: ['data.read'],
}

export function roleCan(role: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/* -------------------------------------------------------------------------- */
/*  Editable role matrix                                                       */
/* -------------------------------------------------------------------------- */

const PERMISSION_KEYS = ADMIN_PERMISSIONS.map(
  (permission) => permission.key,
) as unknown as [AdminPermission, ...AdminPermission[]]

export interface RoleMatrixRole {
  id: AdminRole
  label: string
  description: string
  permissions: AdminPermission[]
}

export interface RoleMatrix {
  version: number
  updatedAt: string
  updatedBy?: string
  roles: RoleMatrixRole[]
}

const ROLE_COPY: Record<AdminRole, { label: string; description: string }> = {
  owner: { label: 'Owner', description: 'Full access. The only role that can change this matrix.' },
  admin: { label: 'Admin', description: 'Runs the desk: leads, content, customers, billing and marketing.' },
  manager: { label: 'Manager', description: 'Leads, content, customers, quotes and portal work.' },
  sales: {
    label: 'Sales',
    description: 'Owns assigned leads, follow-ups and customer quotes in the sales portal.',
  },
  accountant: { label: 'Accountant', description: 'Reads everything, writes invoices, payments, payroll and expenses.' },
  viewer: { label: 'Viewer', description: 'Read-only access to operational data.' },
}

export function defaultRoleMatrix(): RoleMatrix {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    roles: ADMIN_ROLES.map((role) => ({
      id: role,
      label: ROLE_COPY[role].label,
      description: ROLE_COPY[role].description,
      permissions: [...ROLE_PERMISSIONS[role]],
    })),
  }
}

export const roleMatrixSaveSchema = z.object({
  expectedVersion: z.number().int().min(1),
  roles: z
    .array(
      z.object({
        id: z.enum(ADMIN_ROLES),
        label: z.string().trim().min(1).max(60),
        description: z.string().trim().max(240),
        permissions: z.array(z.enum(PERMISSION_KEYS)).max(PERMISSION_KEYS.length),
      }),
    )
    .min(1)
    .max(ADMIN_ROLES.length),
})
export type RoleMatrixSave = z.infer<typeof roleMatrixSaveSchema>

/* -------------------------------------------------------------------------- */
/*  Lead scoring                                                               */
/* -------------------------------------------------------------------------- */

export const LEAD_SCORE_FIELDS = [
  { key: 'source', label: 'Source', hint: 'Where the enquiry came from.' },
  { key: 'status', label: 'Stage', hint: 'Pipeline stage.' },
  { key: 'urgency', label: 'Urgency', hint: 'normal or emergency.' },
  { key: 'value', label: 'Value', hint: 'Estimated job value.' },
  { key: 'city', label: 'City', hint: 'Service city.' },
  { key: 'service', label: 'Service', hint: 'Requested service name.' },
  { key: 'owner', label: 'Owner', hint: 'Assigned team member.' },
  { key: 'message', label: 'Brief', hint: 'Enquiry message text.' },
  { key: 'ageDays', label: 'Days old', hint: 'Whole days since the lead arrived.' },
] as const
export type LeadScoreField = (typeof LEAD_SCORE_FIELDS)[number]['key']

export const LEAD_SCORE_OPERATORS = [
  { key: 'equals', label: 'equals' },
  { key: 'contains', label: 'contains' },
  { key: 'at-least', label: 'is at least' },
  { key: 'at-most', label: 'is at most' },
  { key: 'is-set', label: 'is set' },
  { key: 'is-empty', label: 'is empty' },
] as const
export type LeadScoreOperator = (typeof LEAD_SCORE_OPERATORS)[number]['key']

export interface LeadScoringRule {
  id: string
  label: string
  field: LeadScoreField
  operator: LeadScoreOperator
  value: string
  points: number
  enabled: boolean
}

export interface LeadScoringConfig {
  version: number
  updatedAt: string
  hotAt: number
  warmAt: number
  rules: LeadScoringRule[]
}

export const leadScoringRuleSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(80),
  field: z.enum(LEAD_SCORE_FIELDS.map((entry) => entry.key) as [LeadScoreField, ...LeadScoreField[]]),
  operator: z.enum(
    LEAD_SCORE_OPERATORS.map((entry) => entry.key) as [LeadScoreOperator, ...LeadScoreOperator[]],
  ),
  value: z.string().trim().max(120),
  points: z.number().int().min(-50).max(50),
  enabled: z.boolean(),
})

export const leadScoringConfigSchema = z.object({
  version: z.number().int().min(1),
  updatedAt: z.string().trim().max(40),
  hotAt: z.number().int().min(1).max(200),
  warmAt: z.number().int().min(0).max(200),
  rules: z.array(leadScoringRuleSchema).max(24),
})

export const LEAD_SCORING_SAVE_SCHEMA = z.object({
  expectedVersion: z.number().int().min(1),
  hotAt: z.number().int().min(1).max(200),
  warmAt: z.number().int().min(0).max(200),
  rules: z.array(leadScoringRuleSchema).max(24),
})
export type LeadScoringSave = z.infer<typeof LEAD_SCORING_SAVE_SCHEMA>

export function defaultLeadScoring(): LeadScoringConfig {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    hotAt: 60,
    warmAt: 30,
    rules: [
      { id: 'emergency', label: 'Emergency call-out', field: 'urgency', operator: 'equals', value: 'emergency', points: 40, enabled: true },
      { id: 'value-5k', label: 'Value at least 5,000', field: 'value', operator: 'at-least', value: '5000', points: 25, enabled: true },
      { id: 'referral', label: 'Came from a referral', field: 'source', operator: 'contains', value: 'referral', points: 20, enabled: true },
      { id: 'quoted', label: 'Quotation issued', field: 'status', operator: 'equals', value: 'quoted', points: 20, enabled: true },
      { id: 'site-visit', label: 'Site visit booked', field: 'status', operator: 'equals', value: 'site-visit', points: 10, enabled: true },
      { id: 'fresh', label: 'Arrived yesterday or today', field: 'ageDays', operator: 'at-most', value: '1', points: 10, enabled: true },
      { id: 'unassigned', label: 'No owner assigned', field: 'owner', operator: 'is-empty', value: '', points: -10, enabled: true },
    ],
  }
}

export interface LeadScoreResult {
  total: number
  band: 'hot' | 'warm' | 'cold'
  matched: { id: string; label: string; points: number }[]
}

function leadFieldValue(lead: AdminLead, field: LeadScoreField): string | number | null {
  switch (field) {
    case 'source':
      return lead.source
    case 'status':
      return lead.status
    case 'urgency':
      return lead.urgency
    case 'value':
      return lead.value ?? null
    case 'city':
      return lead.city ?? null
    case 'service':
      return lead.serviceName ?? null
    case 'owner':
      return lead.owner ?? null
    case 'message':
      return lead.message ?? null
    case 'ageDays': {
      const created = Date.parse(lead.createdAt)
      return Number.isFinite(created) ? Math.floor((Date.now() - created) / 86_400_000) : null
    }
    default:
      return null
  }
}

function ruleMatches(rule: LeadScoringRule, lead: AdminLead): boolean {
  const raw = leadFieldValue(lead, rule.field)
  const text = raw === null || raw === undefined ? '' : String(raw).trim().toLowerCase()
  const target = rule.value.trim().toLowerCase()
  switch (rule.operator) {
    case 'is-set':
      return text.length > 0
    case 'is-empty':
      return text.length === 0
    case 'equals':
      return text === target
    case 'contains':
      return target.length > 0 && text.includes(target)
    case 'at-least':
      return Number.isFinite(Number(text)) && Number(text) >= Number(target)
    case 'at-most':
      return Number.isFinite(Number(text)) && Number(text) <= Number(target)
    default:
      return false
  }
}

/** Pure evaluation so the API and the kanban agree on the same number. */
export function scoreLead(lead: AdminLead, config: LeadScoringConfig): LeadScoreResult {
  const matched: LeadScoreResult['matched'] = []
  let total = 0
  for (const rule of config.rules) {
    if (!rule.enabled || rule.points === 0) continue
    if (!ruleMatches(rule, lead)) continue
    total += rule.points
    matched.push({ id: rule.id, label: rule.label, points: rule.points })
  }
  const bounded = Math.max(0, Math.min(100, total))
  return {
    total: bounded,
    band: bounded >= config.hotAt ? 'hot' : bounded >= config.warmAt ? 'warm' : 'cold',
    matched,
  }
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
  'booking-page',
  'quote-page',
  'customer-portal',
] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

/** Contact/service enquiry as submitted to POST /api/v1/leads. */
export const leadSubmissionSchema = contactEnquirySchema.extend({
  source: z.enum(LEAD_SOURCES).default('contact-page'),
  serviceName: z.string().trim().max(120).optional(),
  context: z.string().trim().max(1200).optional(),
  plan: z.string().trim().max(60).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(180),
        url: z.string().trim().min(1).max(500),
        mimeType: z.string().trim().max(80),
        size: z
          .number()
          .int()
          .min(0)
          .max(12 * 1024 * 1024),
      }),
    )
    .max(3)
    .optional(),
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
  attachments?: LeadAttachment[]
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
export * from './sales'
export * from './contentHistory'
export * from './business'
export * from './payroll'
export * from './reports'
export * from './analytics'
export * from './seed'
export * from './editorial'
export * from './media'
export * from './portal'
export * from './portalModules'
export * from './jobs'
export * from './marketing'
export * from './notifications'
