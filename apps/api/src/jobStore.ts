import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import {
  jobInputSchema,
  jobPatchSchema,
  JOB_STATUSES,
  type JobChecklist,
  type JobInput,
  type JobRecord,
} from '@hvac/shared'
import { requireAdmin, requireAdminMutation, requirePermission } from './auth.js'
import { ifMatchSatisfied } from './concurrency.js'
import { requireCustomer } from './portalAuth.js'
import { createStore } from './store.js'

/** Jobs are the operational unit; appointments are diary entries. */
export const jobStore = createStore<JobRecord[]>('jobs.json', () => [])

function nowIso(): string {
  return new Date().toISOString()
}

function nextJobReference(jobs: JobRecord[]): string {
  const year = new Date().getFullYear()
  const prefix = `JOB-${year}-`
  const highest = jobs.reduce((max, job) => {
    if (!job.ref.startsWith(prefix)) return max
    const value = Number.parseInt(job.ref.slice(prefix.length), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `${prefix}${String(highest + 1).padStart(4, '0')}`
}

export function defaultChecklist(service: string): JobChecklist[] {
  const common = [
    'Site access and safety check',
    'Confirm reported fault or scope',
    'Record readings before work',
    'Test after work',
    'Photograph completed work',
    'Customer handover',
  ]
  const labels = /amc|maintenance/i.test(service)
    ? [
        ...common.slice(0, 3),
        'Clean filters and coils',
        'Check refrigerant pressures',
        'Check drain and electrical connections',
        ...common.slice(3),
      ]
    : /cold room|chiller/i.test(service)
      ? [
          ...common.slice(0, 3),
          'Check compressor and controls',
          'Check refrigerant charge',
          'Check defrost / water treatment',
          ...common.slice(3),
        ]
      : common
  return labels.map((label) => ({ id: randomUUID(), label, done: false, note: '' }))
}

export async function createJob(input: JobInput): Promise<JobRecord> {
  const now = nowIso()
  const jobs = await jobStore.read()
  const record: JobRecord = {
    id: randomUUID(),
    ref: nextJobReference(jobs),
    customerId: input.customerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    address: input.address,
    appointmentId: input.appointmentId ?? null,
    amcContractId: input.amcContractId ?? null,
    equipmentIds: input.equipmentIds,
    title: input.title,
    service: input.service,
    status: input.status,
    technician: input.technician,
    scheduledAt: input.scheduledAt ?? null,
    startedAt: input.startedAt ?? null,
    completedAt: input.completedAt ?? null,
    checklist: input.checklist.length
      ? input.checklist.map((item) => ({ ...item, id: item.id ?? randomUUID() }))
      : defaultChecklist(input.service),
    parts: input.parts.map((part) => ({ ...part, id: part.id ?? randomUUID() })),
    photos: input.photos.map((photo) => ({ ...photo, id: photo.id ?? randomUUID() })),
    signature: input.signature ?? null,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  }
  await jobStore.mutate((current) => [record, ...current])
  return record
}

export const jobsRouter = Router()
jobsRouter.use('/admin/jobs', requireAdmin, requirePermission('portal.write'), requireAdminMutation)

jobsRouter.get('/admin/jobs', async (req, res) => {
  const jobs = await jobStore.read()
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.pageSize ?? '25'), 10) || 25),
  )
  const status = typeof req.query.status === 'string' ? req.query.status : ''
  const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : ''
  const filtered = [...jobs]
    .filter((job) => (status ? job.status === status : true))
    .filter((job) =>
      query
        ? [job.ref, job.customerName, job.customerEmail, job.title, job.service, job.technician]
            .join(' ')
            .toLowerCase()
            .includes(query)
        : true,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  const byStatus = Object.fromEntries(
    JOB_STATUSES.map((entry) => [entry, jobs.filter((job) => job.status === entry).length]),
  )
  res.json({
    data: filtered.slice((page - 1) * pageSize, page * pageSize),
    meta: {
      total: filtered.length,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      byStatus,
    },
  })
})

jobsRouter.get('/admin/jobs/:id', async (req, res) => {
  const jobs = await jobStore.read()
  const job = jobs.find((entry) => entry.id === req.params.id || entry.ref === req.params.id)
  if (!job) {
    res.status(404).json({ error: { code: 'not_found', message: 'Job not found.' } })
    return
  }
  res.json({ data: job })
})

jobsRouter.post('/admin/jobs', async (req, res) => {
  const parsed = jobInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Check the job.',
      },
    })
    return
  }
  const job = await createJob(parsed.data)
  res.status(201).json({ data: job })
})

jobsRouter.patch('/admin/jobs/:id', async (req, res) => {
  const parsed = jobPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Check the job.',
      },
    })
    return
  }
  const current = (await jobStore.read()).find((job) => job.id === req.params.id)
  if (!current) {
    res.status(404).json({ error: { code: 'not_found', message: 'Job not found.' } })
    return
  }
  if (!ifMatchSatisfied(req, current.updatedAt)) {
    res.status(412).json({
      error: {
        code: 'stale_record',
        message: 'This job changed in another session. Reload and apply your edit again.',
      },
    })
    return
  }
  let saved: JobRecord | undefined
  await jobStore.mutate((jobs) =>
    jobs.map((job) => {
      if (job.id !== req.params.id) return job
      saved = {
        ...job,
        ...parsed.data,
        checklist: parsed.data.checklist
          ? parsed.data.checklist.map((item) => ({ ...item, id: item.id ?? randomUUID() }))
          : job.checklist,
        parts: parsed.data.parts
          ? parsed.data.parts.map((item) => ({ ...item, id: item.id ?? randomUUID() }))
          : job.parts,
        photos: parsed.data.photos
          ? parsed.data.photos.map((item) => ({ ...item, id: item.id ?? randomUUID() }))
          : job.photos,
        updatedAt: nowIso(),
      }
      return saved
    }),
  )
  if (!saved) {
    res.status(404).json({ error: { code: 'not_found', message: 'Job not found.' } })
    return
  }
  res.json({ data: saved })
})

jobsRouter.delete('/admin/jobs/:id', async (req, res) => {
  await jobStore.mutate((jobs) => jobs.filter((job) => job.id !== req.params.id))
  res.json({ data: { deleted: req.params.id } })
})

jobsRouter.get('/portal/jobs', requireCustomer, async (_req, res) => {
  const customer = res.locals.customer as { id: string }
  const jobs = await jobStore.read()
  res.json({
    data: jobs
      .filter((job) => job.customerId === customer.id)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
  })
})
