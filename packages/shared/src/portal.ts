import { z } from 'zod'
import type { InvoiceWithTotals } from './business'
import type { AdminLead } from './site'

export const APPOINTMENT_STATUSES = [
  'requested',
  'scheduled',
  'en-route',
  'completed',
  'cancelled',
] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const SERVICE_WINDOWS = ['morning', 'afternoon', 'evening', 'emergency'] as const
export type ServiceWindow = (typeof SERVICE_WINDOWS)[number]

export interface AppointmentRecord {
  id: string
  ref: string
  customerId: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceSlug: string | null
  serviceName: string
  address: string
  scheduledAt: string
  window: ServiceWindow
  status: AppointmentStatus
  notes: string
  technician: string
  leadRef: string | null
  rebookOf: string | null
  amcContractId: string | null
  createdAt: string
  updatedAt: string
}

export const CUSTOMER_STATUSES = ['unverified', 'pending', 'active', 'suspended'] as const
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]

export const customerStatusLabel: Record<CustomerStatus, string> = {
  unverified: 'Email not verified',
  pending: 'Awaiting approval',
  active: 'Active',
  suspended: 'Suspended',
}

export interface CustomerAccount {
  id: string
  name: string
  email: string
  phone: string
  address: string
  /** New accounts start pending until the works desk approves them. */
  status: CustomerStatus
  createdAt: string
  updatedAt: string
}

export const customerStatusPatchSchema = z.object({
  status: z.enum(CUSTOMER_STATUSES),
})
export type CustomerStatusPatch = z.infer<typeof customerStatusPatchSchema>

export interface CustomerAccountWithStats extends CustomerAccount {
  invoiceCount: number
  openBalance: number
  appointmentCount: number
  nextAppointmentAt: string | null
}

export interface CustomerPortalOverview {
  customer: CustomerAccount
  invoices: InvoiceWithTotals[]
  appointments: AppointmentRecord[]
  requests: AdminLead[]
  nextAppointment: AppointmentRecord | null
  summary: {
    outstanding: number
    paidLifetime: number
    invoiceCount: number
    openAppointments: number
    completedVisits: number
  }
}

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().trim().email('Enter a valid email address').max(160),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a reachable phone number')
    .max(20)
    .regex(/^[+0-9()\s-]+$/, 'Digits, spaces and + only'),
  address: z.string().trim().max(500).default(''),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
})
export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>

export const customerLoginSchema = z.object({
  email: z.string().trim().email('Enter your email address'),
  password: z.string().min(1, 'Enter your password').max(200),
})
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>

export const customerForgotSchema = z.object({
  email: z.string().trim().email('Enter your email address').max(160),
})
export type CustomerForgotInput = z.infer<typeof customerForgotSchema>

export const customerResetSchema = z.object({
  token: z.string().trim().min(20, 'This reset link is not valid').max(200),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
})
export type CustomerResetInput = z.infer<typeof customerResetSchema>

export const customerVerifySchema = z.object({
  token: z.string().trim().min(20, 'This verification link is not valid').max(200),
})
export type CustomerVerifyInput = z.infer<typeof customerVerifySchema>

export const customerResendVerificationSchema = z.object({
  email: z.string().trim().email('Enter your email address').max(160),
})
export type CustomerResendVerificationInput = z.infer<
  typeof customerResendVerificationSchema
>

export const customerProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+0-9()\s-]+$/),
  address: z.string().trim().max(500).default(''),
})
export type CustomerProfileInput = z.infer<typeof customerProfileSchema>

export const customerBookingSchema = z.object({
  serviceSlug: z.string().trim().min(1, 'Choose a service').max(80),
  scheduledAt: z.string().trim().min(4, 'Choose a visit date').max(40),
  window: z.enum(SERVICE_WINDOWS).default('morning'),
  address: z.string().trim().min(6, 'Enter the service address').max(500),
  notes: z.string().trim().max(1500).default(''),
  rebookOf: z.string().trim().max(80).nullable().optional(),
})
export type CustomerBookingInput = z.infer<typeof customerBookingSchema>

export const appointmentCreateSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().or(z.literal('')).default(''),
  customerPhone: z.string().trim().max(30).default(''),
  customerId: z.string().trim().max(80).nullable().optional(),
  serviceSlug: z.string().trim().max(80).nullable().optional(),
  serviceName: z.string().trim().max(160).default('HVAC service'),
  address: z.string().trim().max(500).default(''),
  scheduledAt: z.string().trim().min(4).max(40),
  window: z.enum(SERVICE_WINDOWS).default('morning'),
  notes: z.string().trim().max(1500).default(''),
  technician: z.string().trim().max(120).default(''),
  leadRef: z.string().trim().max(40).nullable().optional(),
  rebookOf: z.string().trim().max(80).nullable().optional(),
  amcContractId: z.string().trim().max(80).nullable().optional(),
})

export const appointmentPatchSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  scheduledAt: z.string().trim().min(4).max(40).optional(),
  window: z.enum(SERVICE_WINDOWS).optional(),
  technician: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1500).optional(),
  address: z.string().trim().max(500).optional(),
  amcContractId: z.string().trim().max(80).nullable().optional(),
})

export const customerAppointmentActionSchema = z.object({
  action: z.enum(['cancel', 'reschedule']),
  scheduledAt: z.string().trim().min(4).max(40).optional(),
  window: z.enum(SERVICE_WINDOWS).optional(),
})
export type CustomerAppointmentAction = z.infer<typeof customerAppointmentActionSchema>

export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  requested: 'Requested',
  scheduled: 'Scheduled',
  'en-route': 'Engineer en route',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function serviceWindowLabel(window: ServiceWindow): string {
  return {
    morning: 'Morning · 09:00–12:00',
    afternoon: 'Afternoon · 12:00–16:00',
    evening: 'Evening · 16:00–19:00',
    emergency: 'Emergency · next available',
  }[window]
}