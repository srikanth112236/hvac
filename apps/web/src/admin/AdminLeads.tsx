import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { Icon } from '@/components/icons'
import {
  Button,
  Drawer,
  EmptyState,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { catalogueServices } from '@/content/services'
import type { AdminLead } from '@hvac/shared'
import { adminApi } from '@/admin/api'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  LEAD_STATUS_META,
  StatusPill,
  formatDate,
  formatDateTime,
  formatMoney,
  fromLocalInput,
  toLocalInput,
} from '@/admin/ui'

const columns = ['new', 'contacted', 'site-visit', 'quoted', 'won', 'lost'] as const

export function AdminLeads() {
  const { toast } = useToast()
  const [leads, setLeads] = useState<AdminLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<AdminLead | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)

  const load = async () => {
    try {
      const payload = await adminApi.leads()
      setLeads(payload.data)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load leads.')
    } finally {
      setLoading(false)
    }
  }

  useLiveRefresh(load)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return leads
    return leads.filter((lead) =>
      `${lead.ref} ${lead.name} ${lead.phone} ${lead.email} ${lead.city ?? ''} ${lead.serviceName ?? ''}`
        .toLowerCase()
        .includes(needle),
    )
  }, [leads, query])

  const moveLead = async (ref: string, status: string) => {
    const previous = leads
    setLeads((current) =>
      current.map((lead) => (lead.ref === ref ? { ...lead, status: status as AdminLead['status'] } : lead)),
    )
    try {
      const updated = await adminApi.patchLead(ref, { status })
      setLeads((current) => current.map((lead) => (lead.ref === ref ? updated : lead)))
      setSelected((current) => (current?.ref === ref ? updated : current))
    } catch (caught) {
      setLeads(previous)
      toast({
        title: 'Status not saved',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>, status: string) => {
    event.preventDefault()
    const ref = event.dataTransfer.getData('text/plain') || dragging
    setDragging(null)
    if (!ref) return
    const lead = leads.find((entry) => entry.ref === ref)
    if (lead && lead.status !== status) void moveLead(ref, status)
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Pipeline"
        title="Leads, from first call to invoice."
        description="Drag a card between stages, or open it to assign an owner, value and follow-up. Follow-up dates create a reminder automatically."
        actions={
          <>
            <div className="w-full min-w-[200px] sm:w-auto">
              <Input
                aria-label="Search leads"
                placeholder="Search name, ref, service…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button icon="plus" onClick={() => setCreateOpen(true)}>
              New lead
            </Button>
            <a
              href="/api/v1/admin/csv/leads"
              className="flex h-9 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Export CSV
            </a>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 border border-line bg-panel/30 px-4 py-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
          {filtered.length} of {leads.length} leads
        </span>
        <span className="h-3 w-px bg-line" />
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
          Drag between stages · changes save immediately
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
        >
          <Icon name="airflow" size={12} />
          Refresh
        </button>
      </div>

      {error ? <InlineError message={error} /> : null}

      {loading ? (
        <AdminLoading rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="airflow"
          title="No leads in this view."
          description="New enquiries from the public site land here with their service, city and urgency attached."
          action={<Button onClick={() => setCreateOpen(true)}>Add the first lead</Button>}
        />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          <div className="grid min-w-[1620px] grid-cols-6 gap-3">
            {columns.map((status) => {
              const meta = LEAD_STATUS_META[status]
              const items = filtered.filter((lead) => lead.status === status)
              return (
                <div
                  key={status}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => onDrop(event, status)}
                  className="flex min-h-[460px] flex-col border border-line bg-panel/30"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
                    <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {meta?.label ?? status}
                    </span>
                    <span className="t-num text-[10px] text-fg-faint">{items.length}</span>
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-2">
                    {items.map((lead) => {
                      const overdue =
                        lead.followUpAt &&
                        new Date(lead.followUpAt).getTime() < Date.now() &&
                        lead.status !== 'won' &&
                        lead.status !== 'lost'
                      return (
                        <article
                          key={lead.ref}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/plain', lead.ref)
                            event.dataTransfer.effectAllowed = 'move'
                            setDragging(lead.ref)
                          }}
                          onDragEnd={() => setDragging(null)}
                          className={`group cursor-grab border bg-base p-3 transition-colors duration-2 active:cursor-grabbing ${
                            dragging === lead.ref
                              ? 'border-cold/60 opacity-60'
                              : 'border-line hover:border-cold/40'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelected(lead)}
                            className="w-full text-left"
                            aria-label={`Open ${lead.name}, ${lead.ref}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                                {lead.ref}
                              </span>
                              {lead.urgency === 'emergency' ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.06em] text-heat">
                                  <Icon name="bolt" size={10} />
                                  Emergency
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-[13px] font-medium leading-snug text-fg group-hover:text-cold">
                              {lead.name}
                            </p>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-fg-dim">
                              {lead.serviceName ?? 'Service to be allocated'}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
                                {lead.city ?? 'No city'}
                              </span>
                              {lead.value ? (
                                <>
                                  <span className="h-2 w-px bg-line" />
                                  <span className="t-num text-[9px] text-fg-dim">
                                    {formatMoney(lead.value)}
                                  </span>
                                </>
                              ) : null}
                            </div>

                            {lead.followUpAt ? (
                              <div
                                className={`mt-2 flex items-center gap-1.5 border-t pt-2 font-mono text-[8px] uppercase tracking-[0.06em] ${
                                  overdue ? 'border-heat/20 text-heat' : 'border-line/60 text-fg-faint'
                                }`}
                              >
                                <Icon name="calendar" size={10} />
                                {overdue ? 'Overdue · ' : 'Follow up · '}
                                {formatDate(lead.followUpAt)}
                              </div>
                            ) : null}
                          </button>

                          <div className="mt-2 flex flex-wrap gap-1 opacity-0 transition-opacity duration-2 group-hover:opacity-100 focus-within:opacity-100">
                            {lead.phone ? (
                              <a
                                href={`tel:${lead.phone}`}
                                className="flex h-6 items-center gap-1 border border-line px-2 font-mono text-[8px] uppercase text-fg-faint hover:text-cold"
                              >
                                <Icon name="phone" size={10} /> Call
                              </a>
                            ) : null}
                            {lead.email ? (
                              <a
                                href={`mailto:${lead.email}`}
                                className="flex h-6 items-center gap-1 border border-line px-2 font-mono text-[8px] uppercase text-fg-faint hover:text-cold"
                              >
                                <Icon name="mail" size={10} /> Mail
                              </a>
                            ) : null}
                          </div>
                        </article>
                      )
                    })}

                    {items.length === 0 ? (
                      <p className="px-2 py-4 font-mono text-[8px] uppercase leading-relaxed tracking-[0.08em] text-fg-faint">
                        Drop a card here
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <LeadDrawer
        lead={selected}
        onClose={() => setSelected(null)}
        onUpdated={(updated) => {
          setLeads((current) => current.map((lead) => (lead.ref === updated.ref ? updated : lead)))
          setSelected(updated)
        }}
        onMoved={(ref, status) => void moveLead(ref, status)}
      />

      <CreateLeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(lead) => {
          setLeads((current) => [lead, ...current])
          setCreateOpen(false)
          toast({ title: 'Lead created', description: `${lead.ref} · ${lead.name}`, tone: 'success' })
        }}
      />
    </div>
  )
}

function LeadDrawer({
  lead,
  onClose,
  onUpdated,
  onMoved,
}: {
  lead: AdminLead | null
  onClose: () => void
  onUpdated: (lead: AdminLead) => void
  onMoved: (ref: string, status: string) => void
}) {
  const { toast } = useToast()
  const [status, setStatus] = useState(lead?.status ?? 'new')
  const [owner, setOwner] = useState(lead?.owner ?? '')
  const [value, setValue] = useState(lead?.value ? String(lead.value) : '')
  const [followUp, setFollowUp] = useState(toLocalInput(lead?.followUpAt))
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setStatus(lead?.status ?? 'new')
    setOwner(lead?.owner ?? '')
    setValue(lead?.value ? String(lead.value) : '')
    setFollowUp(toLocalInput(lead?.followUpAt))
    setNote('')
    setError('')
  }, [lead])

  const save = async () => {
    if (!lead) return
    setPending(true)
    setError('')
    try {
      const updated = await adminApi.patchLead(lead.ref, {
        status,
        owner: owner.trim() || null,
        value: value.trim() ? Number(value) : null,
        followUpAt: fromLocalInput(followUp),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      setNote('')
      onUpdated(updated)
      toast({ title: 'Lead updated', description: updated.ref, tone: 'success' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the lead.')
    } finally {
      setPending(false)
    }
  }

  const quickMove = (next: string) => {
    if (!lead) return
    setStatus(next as AdminLead['status'])
    onMoved(lead.ref, next)
  }

  return (
    <Drawer
      open={Boolean(lead)}
      onClose={onClose}
      title={lead ? `${lead.name} · ${lead.ref}` : 'Lead'}
      description={lead?.serviceName ?? 'Unallocated service'}
    >
      {lead ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {(['contacted', 'site-visit', 'quoted', 'won', 'lost'] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => quickMove(entry)}
                className={`border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] ${
                  lead.status === entry
                    ? 'border-cold/50 bg-cold/[0.08] text-cold'
                    : 'border-line text-fg-faint hover:text-fg'
                }`}
              >
                {LEAD_STATUS_META[entry]?.label ?? entry}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 border border-line bg-panel/40 p-4">
            <div>
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                Phone
              </span>
              <a href={`tel:${lead.phone}`} className="mt-1 block font-mono text-[11px] text-fg hover:text-cold">
                {lead.phone}
              </a>
            </div>
            <div>
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                Email
              </span>
              <a
                href={`mailto:${lead.email || undefined}`}
                className="mt-1 block break-all font-mono text-[10px] text-fg hover:text-cold"
              >
                {lead.email || '—'}
              </a>
            </div>
            <div>
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">City</span>
              <p className="mt-1 text-[11px] text-fg-dim">{lead.city ?? '—'}</p>
            </div>
            <div>
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                Received
              </span>
              <p className="mt-1 text-[11px] text-fg-dim">{formatDateTime(lead.createdAt)}</p>
            </div>
          </div>

          {lead.message ? (
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Brief
              </span>
              <p className="mt-2 whitespace-pre-wrap border-l border-cold/40 pl-3 text-[12px] leading-relaxed text-fg-dim">
                {lead.message}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Stage"
              value={status}
              options={columns.map((entry) => ({
                value: entry,
                label: LEAD_STATUS_META[entry]?.label ?? entry,
              }))}
              onChange={(event) => setStatus(event.target.value as AdminLead['status'])}
            />
            <Input
              label="Owner"
              value={owner}
              placeholder="Engineer or desk"
              onChange={(event) => setOwner(event.target.value)}
            />
            <Input
              label="Value ($)"
              type="number"
              min={0}
              value={value}
              placeholder="0"
              onChange={(event) => setValue(event.target.value)}
            />
            <Input
              label="Follow up"
              type="datetime-local"
              value={followUp}
              hint="Adds or updates a reminder."
              onChange={(event) => setFollowUp(event.target.value)}
            />
          </div>

          <Textarea
            label="Add a note"
            rows={3}
            value={note}
            placeholder="Call outcome, site access, parts required…"
            onChange={(event) => setNote(event.target.value)}
          />

          {error ? <InlineError message={error} /> : null}

          <Button onClick={() => void save()} disabled={pending} full icon={pending ? 'clock' : 'check'}>
            {pending ? 'Saving…' : 'Save lead'}
          </Button>

          <div>
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Activity
              </span>
              <span className="t-num text-[10px] text-fg-faint">{lead.notes.length}</span>
            </div>
            {lead.notes.length ? (
              <ol className="mt-2 flex flex-col">
                {[...lead.notes].reverse().map((entry) => (
                  <li key={entry.id} className="border-b border-line/60 py-3 last:border-0">
                    <div className="flex items-center justify-between gap-2 font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
                      <span>{entry.author}</span>
                      <span>{formatDateTime(entry.at)}</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-snug text-fg-dim">{entry.body}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-[11px] text-fg-faint">No notes yet.</p>
            )}
          </div>

          <div className="border-t border-line pt-4">
            <StatusPill status={lead.status} />
          </div>
        </div>
      ) : null}
    </Drawer>
  )
}

function CreateLeadModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (lead: AdminLead) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [serviceSlug, setServiceSlug] = useState('')
  const [message, setMessage] = useState('')
  const [value, setValue] = useState('')
  const [status, setStatus] = useState('new')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    setPending(true)
    try {
      const lead = await adminApi.createLead({
        name,
        phone,
        email,
        city: city || undefined,
        serviceSlug: serviceSlug || undefined,
        message: message || undefined,
        value: value ? Number(value) : undefined,
        status,
      })
      onCreated(lead)
      setName('')
      setPhone('')
      setEmail('')
      setCity('')
      setServiceSlug('')
      setMessage('')
      setValue('')
      setStatus('new')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the lead.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New lead"
      description="For phone-in enquiries or a site visit booked offline."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={pending} icon={pending ? 'clock' : 'plus'}>
            {pending ? 'Creating…' : 'Create lead'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input label="City" value={city} onChange={(event) => setCity(event.target.value)} />
          <Select
            label="Service"
            value={serviceSlug}
            placeholder="Unallocated"
            options={catalogueServices.map((service) => ({
              value: service.id,
              label: service.name,
            }))}
            onChange={(event) => setServiceSlug(event.target.value)}
          />
          <Select
            label="Stage"
            value={status}
            options={columns.map((entry) => ({
              value: entry,
              label: LEAD_STATUS_META[entry]?.label ?? entry,
            }))}
            onChange={(event) => setStatus(event.target.value)}
          />
        </div>
        <Textarea
          label="Brief"
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Plant, symptom, access notes…"
        />
        <Input
          label="Estimated value ($)"
          type="number"
          min={0}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        {error ? <InlineError message={error} /> : null}
      </div>
    </Modal>
  )
}
