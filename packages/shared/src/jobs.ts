import { z } from 'zod'

/** Operational jobs are separate from diary appointments and customer reports. */
export const JOB_STATUSES = ['draft', 'scheduled', 'in-progress', 'completed', 'cancelled'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

export const jobStatusLabel: Record<JobStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  'in-progress': 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export interface JobChecklist {
  id: string
  label: string
  done: boolean
  note: string
}

export interface JobPart {
  id: string
  name: string
  quantity: number
  unitPrice: number
  note: string
}

export interface WorkJobPhoto {
  id: string
  url: string
  alt: string
}

export interface JobRecord {
  id: string
  ref: string
  customerId: string
  customerName: string
  customerEmail: string
  address: string
  appointmentId: string | null
  amcContractId: string | null
  equipmentIds: string[]
  title: string
  service: string
  status: JobStatus
  technician: string
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  checklist: JobChecklist[]
  parts: JobPart[]
  photos: WorkJobPhoto[]
  signature: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

export const jobInputSchema = z.object({
  customerId: z.string().trim().min(1).max(80),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().or(z.literal('')).default(''),
  address: z.string().trim().max(500).default(''),
  appointmentId: z.string().trim().max(80).nullable().optional(),
  amcContractId: z.string().trim().max(80).nullable().optional(),
  equipmentIds: z.array(z.string().trim().max(80)).max(50).default([]),
  title: z.string().trim().min(3).max(160),
  service: z.string().trim().max(200).default(''),
  status: z.enum(JOB_STATUSES).default('draft'),
  technician: z.string().trim().max(120).default(''),
  scheduledAt: z.string().trim().max(40).nullable().optional(),
  startedAt: z.string().trim().max(40).nullable().optional(),
  completedAt: z.string().trim().max(40).nullable().optional(),
  checklist: z
    .array(
      z.object({
        id: z.string().trim().max(80).optional(),
        label: z.string().trim().min(1).max(200),
        done: z.boolean().default(false),
        note: z.string().trim().max(400).default(''),
      }),
    )
    .max(100)
    .default([]),
  parts: z
    .array(
      z.object({
        id: z.string().trim().max(80).optional(),
        name: z.string().trim().min(1).max(160),
        quantity: z.number().min(0).max(10000).default(1),
        unitPrice: z.number().min(0).max(100_000_000).default(0),
        note: z.string().trim().max(400).default(''),
      }),
    )
    .max(100)
    .default([]),
  photos: z
    .array(
      z.object({
        id: z.string().trim().max(80).optional(),
        url: z.string().trim().min(1).max(500),
        alt: z.string().trim().max(200).default(''),
      }),
    )
    .max(40)
    .default([]),
  signature: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(2000).default(''),
})
export type JobInput = z.infer<typeof jobInputSchema>

/** Explicit patch schema without defaults: an edit cannot reset unrelated fields. */
export const jobPatchSchema = z.object({
  customerId: z.string().trim().min(1).max(80).optional(),
  customerName: z.string().trim().min(2).max(120).optional(),
  customerEmail: z.string().trim().email().or(z.literal('')).optional(),
  address: z.string().trim().max(500).optional(),
  appointmentId: z.string().trim().max(80).nullable().optional(),
  amcContractId: z.string().trim().max(80).nullable().optional(),
  equipmentIds: z.array(z.string().trim().max(80)).max(50).optional(),
  title: z.string().trim().min(3).max(160).optional(),
  service: z.string().trim().max(200).optional(),
  status: z.enum(JOB_STATUSES).optional(),
  technician: z.string().trim().max(120).optional(),
  scheduledAt: z.string().trim().max(40).nullable().optional(),
  startedAt: z.string().trim().max(40).nullable().optional(),
  completedAt: z.string().trim().max(40).nullable().optional(),
  checklist: z
    .array(
      z.object({
        id: z.string().trim().max(80).optional(),
        label: z.string().trim().min(1).max(200),
        done: z.boolean().default(false),
        note: z.string().trim().max(400).default(''),
      }),
    )
    .max(100)
    .optional(),
  parts: z
    .array(
      z.object({
        id: z.string().trim().max(80).optional(),
        name: z.string().trim().min(1).max(160),
        quantity: z.number().min(0).max(10000).default(1),
        unitPrice: z.number().min(0).max(100_000_000).default(0),
        note: z.string().trim().max(400).default(''),
      }),
    )
    .max(100)
    .optional(),
  photos: z
    .array(
      z.object({
        id: z.string().trim().max(80).optional(),
        url: z.string().trim().min(1).max(500),
        alt: z.string().trim().max(200).default(''),
      }),
    )
    .max(40)
    .optional(),
  signature: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
})
export type JobPatch = z.infer<typeof jobPatchSchema>
