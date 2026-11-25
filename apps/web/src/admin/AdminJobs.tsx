import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  JOB_STATUSES,
  jobStatusLabel,
  type JobChecklist,
  type JobPart,
  type JobRecord,
  type JobStatus,
} from '@hvac/shared'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  RecordDrawer,
  RecordViewButton,
  SearchSuggest,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { adminApi } from '@/admin/api'
import { AdminLoading, AdminPageHeader, InlineError, formatDateTime, formatMoney } from '@/admin/ui'

const PAGE_SIZE = 25

function parseChecklist(value: string): JobChecklist[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      id: crypto.randomUUID(),
      label: line.replace(/^\[[xX]?\]\s*/, ''),
      done: /^\[[xX]\]/.test(line),
      note: '',
    }))
}

function checklistText(items: JobChecklist[]): string {
  return items.map((item) => `${item.done ? '[x]' : '[ ]'} ${item.label}`).join('\n')
}

function parseParts(value: string): JobPart[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, qty, price, ...note] = line.split('|').map((part) => part.trim())
      return {
        id: crypto.randomUUID(),
        name: name ?? '',
        quantity: Number.parseFloat(qty ?? '1') || 1,
        unitPrice: Number.parseFloat(price ?? '0') || 0,
        note: note.join(' | '),
      }
    })
    .filter((part) => part.name)
}

function partsText(items: JobPart[]): string {
  return items
    .map((item) => `${item.name} | ${item.quantity} | ${item.unitPrice} | ${item.note}`)
    .join('\n')
}

function partsTotal(items: JobPart[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

interface JobDraft {
  customerId: string
  customerName: string
  customerEmail: string
  address: string
  appointmentId: string
  amcContractId: string
  title: string
  service: string
  status: JobStatus
  technician: string
  scheduledAt: string
  checklist: string
  parts: string
  signature: string
  notes: string
}

const blankDraft: JobDraft = {
  customerId: '',
  customerName: '',
  customerEmail: '',
  address: '',
  appointmentId: '',
  amcContractId: '',
  title: '',
  service: '',
  status: 'draft',
  technician: '',
  scheduledAt: '',
  checklist: '[ ] Site access and safety check\n[ ] Confirm scope\n[ ] Test after work',
  parts: '',
  signature: '',
  notes: '',
}

function draftFor(job: JobRecord): JobDraft {
  return {
    customerId: job.customerId,
    customerName: job.customerName,
    customerEmail: job.customerEmail,
    address: job.address,
    appointmentId: job.appointmentId ?? '',
    amcContractId: job.amcContractId ?? '',
    title: job.title,
    service: job.service,
    status: job.status,
    technician: job.technician,
    scheduledAt: job.scheduledAt?.slice(0, 16) ?? '',
    checklist: checklistText(job.checklist),
    parts: partsText(job.parts),
    signature: job.signature ?? '',
    notes: job.notes,
  }
}

export function AdminJobs() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const openDeepLink = searchParams.get('open')
  const deepHandled = useRef('')
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [meta, setMeta] = useState<{
    total: number
    page: number
    pages: number
    byStatus: Record<string, number>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<JobRecord | null>(null)
  const [viewing, setViewing] = useState<JobRecord | null>(null)
  const [draft, setDraft] = useState<JobDraft>(blankDraft)
  const [modalOpen, setModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (status) params.set('status', status)
      if (query.trim()) params.set('q', query.trim())
      const payload = await adminApi.jobs(`?${params}`)
      setJobs(payload.data)
      setMeta({
        total: payload.meta.total,
        page: payload.meta.page,
        pages: payload.meta.pages,
        byStatus: payload.meta.byStatus,
      })
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load jobs.')
    } finally {
      setLoading(false)
    }
  }, [page, query, status])
  useLiveRefresh(load, 20_000)

  const suggestions = useMemo(
    () =>
      jobs.map((job) => ({
        id: job.id,
        label: `${job.ref} · ${job.title}`,
        value: job.ref,
        description: `${job.customerName} · ${job.service || 'Service work'}`,
        meta: jobStatusLabel[job.status],
        keywords: `${job.technician} ${job.address} ${job.customerEmail}`,
      })),
    [jobs],
  )

  useEffect(() => {
    if (!openDeepLink || deepHandled.current === openDeepLink) return
    const current = jobs.find((job) => job.id === openDeepLink || job.ref === openDeepLink)
    if (current) {
      deepHandled.current = openDeepLink
      setViewing(current)
      return
    }
    let active = true
    adminApi
      .job(openDeepLink)
      .then((job) => {
        if (!active) return
        deepHandled.current = openDeepLink
        setViewing(job)
      })
      .catch(() => {
        if (active) deepHandled.current = openDeepLink
      })
    return () => {
      active = false
    }
  }, [jobs, openDeepLink])

  const openNew = () => {
    setSelected(null)
    setDraft(blankDraft)
    setModalOpen(true)
  }

  const openEdit = (job: JobRecord) => {
    setSelected(job)
    setDraft(draftFor(job))
    setModalOpen(true)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const payload = {
        customerId: draft.customerId,
        customerName: draft.customerName,
        customerEmail: draft.customerEmail,
        address: draft.address,
        appointmentId: draft.appointmentId || null,
        amcContractId: draft.amcContractId || null,
        equipmentIds: selected?.equipmentIds ?? [],
        title: draft.title,
        service: draft.service,
        status: draft.status,
        technician: draft.technician,
        scheduledAt: draft.scheduledAt ? new Date(draft.scheduledAt).toISOString() : null,
        checklist: parseChecklist(draft.checklist),
        parts: parseParts(draft.parts),
        photos: selected?.photos ?? [],
        signature: draft.signature || null,
        notes: draft.notes,
      }
      if (selected) await adminApi.patchJob(selected.id, payload, selected.updatedAt)
      else await adminApi.createJob(payload)
      setModalOpen(false)
      toast({ title: selected ? 'Job updated' : 'Job created', tone: 'success' })
      await load()
    } catch (caught) {
      toast({
        title: 'Job not saved',
        description: caught instanceof Error ? caught.message : 'Check the fields.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (job: JobRecord) => {
    if (!window.confirm(`Delete ${job.ref}?`)) return
    try {
      await adminApi.deleteJob(job.id)
      toast({ title: 'Job deleted', tone: 'warn' })
      await load()
    } catch (caught) {
      toast({
        title: 'Could not delete job',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const scheduleAmc = async () => {
    try {
      const result = await adminApi.runAmcSchedule()
      toast({
        title: 'AMC schedule checked',
        description: `${result.created} new visit${result.created === 1 ? '' : 's'} generated.`,
        tone: 'success',
      })
      await load()
    } catch (caught) {
      toast({
        title: 'AMC scheduling failed',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const parts = useMemo(() => parseParts(draft.parts), [draft.parts])

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Operations"
        title="Jobs, checklists and parts."
        description="A job is the work order: appointment link, checklist, parts, photos and signature. Dispatch remains the diary view."
        actions={
          <Button icon="plus" onClick={openNew}>
            New job
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-panel/30 px-4 py-3">
        <p className="max-w-prose text-[11px] leading-relaxed text-fg-dim">
          Auto-scheduling creates the next AMC visit and its job from each active contract. It is
          also run by the background worker.
        </p>
        <Button variant="secondary" size="sm" onClick={() => void scheduleAmc()}>
          Generate AMC visits
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 border border-line bg-panel/30 p-4">
        <div className="w-40">
          <Select
            label="Status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            options={[
              { value: '', label: 'All statuses' },
              ...JOB_STATUSES.map((entry) => ({ value: entry, label: jobStatusLabel[entry] })),
            ]}
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <SearchSuggest
            label="Search"
            value={query}
            onChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            suggestions={suggestions}
            onSelect={(suggestion) => {
              setQuery(suggestion.value ?? suggestion.label)
              const job = jobs.find((entry) => entry.id === suggestion.id)
              if (job) setViewing(job)
            }}
            placeholder="Job, customer, technician"
            emptyMessage="No job matches that reference or customer."
          />
        </div>
        <Badge tone="neutral">{meta?.total ?? 0} jobs</Badge>
      </div>

      {error ? <InlineError message={error} /> : null}
      {loading ? (
        <AdminLoading rows={6} />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No jobs in this view"
          description="Create a work order from an appointment or from scratch."
          action={<Button onClick={openNew}>Create job</Button>}
        />
      ) : (
        <div className="divide-y divide-line border border-line bg-panel/20">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] text-cold">{job.ref}</span>
                  <Badge
                    tone={
                      job.status === 'completed'
                        ? 'success'
                        : job.status === 'cancelled'
                          ? 'danger'
                          : job.status === 'in-progress'
                            ? 'warn'
                            : 'neutral'
                    }
                  >
                    {jobStatusLabel[job.status]}
                  </Badge>
                  {job.amcContractId ? <Badge tone="cold">AMC</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-fg">{job.title}</p>
                <p className="text-[11px] text-fg-dim">
                  {job.customerName} · {job.service || 'Service work'}
                </p>
                <p className="text-[10px] text-fg-faint">
                  {job.scheduledAt ? formatDateTime(job.scheduledAt) : 'Unscheduled'} ·{' '}
                  {job.technician || 'Unassigned'} · {job.checklist.length} checks ·{' '}
                  {job.parts.length} parts
                </p>
              </div>
              <span className="font-display text-lg text-fg">
                {formatMoney(partsTotal(job.parts))}
              </span>
              <div className="flex gap-3">
                <RecordViewButton label={`job ${job.ref}`} onClick={() => setViewing(job)} />
                <button
                  type="button"
                  onClick={() => openEdit(job)}
                  className="font-mono text-[9px] uppercase text-cold hover:text-fg"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => void remove(job)}
                  className="font-mono text-[9px] uppercase text-fg-faint hover:text-danger"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {meta && meta.pages > 1 ? (
        <div className="flex items-center justify-between border border-line px-4 py-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
            Page {meta.page} of {meta.pages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={meta.page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={meta.page >= meta.pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected ? `Edit ${selected.ref}` : 'New job'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="admin-job-form" loading={busy}>
              {selected ? 'Save job' : 'Create job'}
            </Button>
          </div>
        }
      >
        <form
          id="admin-job-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => void save(event)}
        >
          <Input
            label="Customer ID"
            required
            value={draft.customerId}
            onChange={(event) => setDraft({ ...draft, customerId: event.target.value })}
          />
          <Input
            label="Customer name"
            required
            value={draft.customerName}
            onChange={(event) => setDraft({ ...draft, customerName: event.target.value })}
          />
          <Input
            label="Customer email"
            type="email"
            value={draft.customerEmail}
            onChange={(event) => setDraft({ ...draft, customerEmail: event.target.value })}
          />
          <Input
            label="Service address"
            value={draft.address}
            onChange={(event) => setDraft({ ...draft, address: event.target.value })}
          />
          <Input
            label="Job title"
            required
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <Input
            label="Service"
            value={draft.service}
            onChange={(event) => setDraft({ ...draft, service: event.target.value })}
          />
          <Select
            label="Status"
            value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value as JobStatus })}
            options={JOB_STATUSES.map((entry) => ({ value: entry, label: jobStatusLabel[entry] }))}
          />
          <Input
            label="Technician"
            value={draft.technician}
            onChange={(event) => setDraft({ ...draft, technician: event.target.value })}
          />
          <Input
            label="Scheduled"
            type="datetime-local"
            value={draft.scheduledAt}
            onChange={(event) => setDraft({ ...draft, scheduledAt: event.target.value })}
          />
          <Input
            label="Appointment ID"
            value={draft.appointmentId}
            onChange={(event) => setDraft({ ...draft, appointmentId: event.target.value })}
          />
          <Input
            label="AMC contract ID"
            value={draft.amcContractId}
            onChange={(event) => setDraft({ ...draft, amcContractId: event.target.value })}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Checklist — one per line, [x] for done"
              rows={7}
              value={draft.checklist}
              onChange={(event) => setDraft({ ...draft, checklist: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Parts — name | qty | unit price | note"
              rows={5}
              value={draft.parts}
              onChange={(event) => setDraft({ ...draft, parts: event.target.value })}
              hint={`Indicative parts total ${formatMoney(partsTotal(parts))}`}
            />
          </div>
          <Input
            label="Customer signature name"
            value={draft.signature}
            onChange={(event) => setDraft({ ...draft, signature: event.target.value })}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Notes"
              rows={3}
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </div>
        </form>
      </Modal>

      <RecordDrawer
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing ? `${viewing.ref} · ${viewing.title}` : 'Job'}
        subtitle={viewing ? `${viewing.customerName} · ${viewing.service || 'Service work'}` : undefined}
        record={viewing as unknown as Record<string, unknown> | null}
        exclude={['id']}
        badge={
          viewing ? (
            <Badge
              tone={
                viewing.status === 'completed'
                  ? 'success'
                  : viewing.status === 'cancelled'
                    ? 'danger'
                    : viewing.status === 'in-progress'
                      ? 'warn'
                      : 'neutral'
              }
            >
              {jobStatusLabel[viewing.status]}
            </Badge>
          ) : undefined
        }
        actions={
          viewing ? (
            <Button
              variant="secondary"
              onClick={() => {
                openEdit(viewing)
                setViewing(null)
              }}
            >
              Edit job
            </Button>
          ) : undefined
        }
      />
    </div>
  )
}
