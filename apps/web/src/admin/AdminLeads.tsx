import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { useDetailBack } from '@/admin/useDetailBack'
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
import type { AdminLead, CustomerAccount } from '@hvac/shared'
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

const columnTheme: Record<(typeof columns)[number], string> = {
  new: 'border-t-cold/70 from-cold/[0.08]',
  contacted: 'border-t-fg-dim/40 from-fg-dim/[0.04]',
  'site-visit': 'border-t-warn/60 from-warn/[0.06]',
  quoted: 'border-t-heat/60 from-heat/[0.05]',
  won: 'border-t-success/60 from-success/[0.07]',
  lost: 'border-t-danger/50 from-danger/[0.05]',
}

const cardTheme: Record<(typeof columns)[number], string> = {
  new: 'border-l-cold/70',
  contacted: 'border-l-fg-dim/40',
  'site-visit': 'border-l-warn/70',
  quoted: 'border-l-heat/70',
  won: 'border-l-success/70',
  lost: 'border-l-danger/60',
}

export function AdminLeads() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const leadDeepLink = searchParams.get('lead')
  const deepHandled = useRef('')
  const [leads, setLeads] = useState<AdminLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<{
    total: number
    pages: number
    count: number
    pageSize: number
  } | null>(null)
  const [selected, setSelected] = useState<AdminLead | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [suggestionResults, setSuggestionResults] = useState<AdminLead[]>([])
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const payload = await adminApi.leads(`?page=${page}&pageSize=40`)
      setLeads(payload.data)
      setMeta({
        total: payload.meta.total,
        pages: payload.meta.pages,
        count: payload.meta.count,
        pageSize: payload.meta.pageSize,
      })
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load leads.')
    } finally {
      setLoading(false)
    }
  }

  useLiveRefresh(load)

  useEffect(() => {
    void load()
    // Reload when the pagination page changes; the live refresh handles the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return leads
    return leads.filter((lead) =>
      `${lead.ref} ${lead.name} ${lead.phone} ${lead.email} ${lead.city ?? ''} ${lead.serviceName ?? ''}`
        .toLowerCase()
        .includes(needle),
    )
  }, [leads, query])

  const suggestions = suggestionResults

  useEffect(() => {
    const needle = query.trim()
    if (needle.length < 2) {
      setSuggestionResults([])
      return
    }
    const timer = window.setTimeout(() => {
      adminApi
        .leads(`?page=1&pageSize=6&q=${encodeURIComponent(needle)}`)
        .then((payload) => setSuggestionResults(payload.data))
        .catch(() => setSuggestionResults([]))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!leadDeepLink || deepHandled.current === leadDeepLink) return
    const current = [...leads, ...suggestionResults].find((lead) => lead.ref === leadDeepLink)
    if (current) {
      deepHandled.current = leadDeepLink
      setSelected(current)
      return
    }
    let active = true
    adminApi
      .lead(leadDeepLink)
      .then((lead) => {
        if (!active) return
        deepHandled.current = leadDeepLink
        setSelected(lead)
      })
      .catch(() => {
        if (active) deepHandled.current = leadDeepLink
      })
    return () => {
      active = false
    }
  }, [leadDeepLink, leads, suggestionResults])

  const parseCsv = (text: string): Record<string, string>[] => {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let quoted = false
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index]
      if (char === '"') {
        if (quoted && text[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = !quoted
        }
      } else if (char === ',' && !quoted) {
        row.push(cell)
        cell = ''
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && text[index + 1] === '\n') index += 1
        row.push(cell)
        if (row.some((value) => value.trim())) rows.push(row)
        row = []
        cell = ''
      } else {
        cell += char
      }
    }
    row.push(cell)
    if (row.some((value) => value.trim())) rows.push(row)
    const [header, ...body] = rows
    if (!header) return []
    return body.map((values) =>
      Object.fromEntries(
        header.map((key, index) => [key.trim().toLowerCase(), values[index]?.trim() ?? '']),
      ),
    )
  }

  const importLeads = async (file: File) => {
    setImporting(true)
    try {
      const records = parseCsv(await file.text())
      let created = 0
      for (const record of records) {
        if (!record.name || !record.phone) continue
        await adminApi.createLead({
          name: record.name,
          phone: record.phone,
          email: record.email || undefined,
          city: record.city || undefined,
          serviceSlug: record.serviceslug || record.service || undefined,
          message: record.message || record.brief || undefined,
          urgency: record.urgency || undefined,
          plan: record.plan || undefined,
          context: record.context || undefined,
          value: record.value ? Number(record.value) : undefined,
          status: record.status || 'new',
        })
        created += 1
      }
      toast({
        title: 'Leads imported',
        description: `${created} row${created === 1 ? '' : 's'} added to the pipeline.`,
        tone: created ? 'success' : 'warn',
      })
      await load()
    } catch (caught) {
      toast({
        title: 'Import failed',
        description: caught instanceof Error ? caught.message : 'Check the CSV columns.',
        tone: 'danger',
      })
    } finally {
      setImporting(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  const moveLead = async (ref: string, status: string) => {
    const previous = leads
    setLeads((current) =>
      current.map((lead) =>
        lead.ref === ref ? { ...lead, status: status as AdminLead['status'] } : lead,
      ),
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
            <div className="relative w-full min-w-[240px] sm:w-auto">
              <Input
                aria-label="Search leads"
                placeholder="Search leads, customer, service…"
                value={query}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 160)}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                  setSearchOpen(true)
                }}
              />
              {searchOpen && suggestions.length ? (
                <div className="absolute left-0 right-0 top-full z-[var(--z-overlay)] mt-1 border border-line bg-base shadow-pop">
                  <p className="border-b border-line px-3 py-2 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                    Matching leads
                  </p>
                  {suggestions.map((lead) => (
                    <button
                      key={lead.ref}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setQuery(lead.name)
                        setSelected(lead)
                        setSearchOpen(false)
                      }}
                      className="flex w-full items-start justify-between gap-3 border-b border-line/60 px-3 py-2.5 text-left last:border-0 hover:bg-cold/[0.06]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] text-fg">{lead.name}</span>
                        <span className="block truncate text-[10px] text-fg-faint">
                          {lead.ref} · {lead.serviceName ?? 'Unallocated'}
                        </span>
                      </span>
                      <StatusPill status={lead.status} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <Button icon="plus" onClick={() => setCreateOpen(true)}>
              New lead
            </Button>
            <input
              ref={importRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) void importLeads(file)
              }}
            />
            <Button
              variant="secondary"
              icon="upload"
              loading={importing}
              onClick={() => importRef.current?.click()}
            >
              Import CSV
            </Button>
            <a
              href="/api/v1/admin/csv/leads"
              className="flex h-9 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Export CSV
            </a>
            <a
              href="/api/v1/admin/leads/export"
              download
              className="flex h-9 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Export JSON
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
                  className={`flex min-h-[460px] flex-col border border-t-2 bg-gradient-to-b to-transparent ${columnTheme[status]}`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-2.5">
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
                          className={`group cursor-grab rounded-md border border-l-2 bg-gradient-to-br from-panel/70 to-base p-3 shadow-[0_1px_0_rgb(var(--line)/0.5)] transition-all duration-2 active:cursor-grabbing ${cardTheme[status]} ${
                            dragging === lead.ref
                              ? 'scale-[0.98] border-cold/60 opacity-60'
                              : 'hover:-translate-y-0.5 hover:border-cold/50 hover:shadow-pop'
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
                                  overdue
                                    ? 'border-heat/20 text-heat'
                                    : 'border-line/60 text-fg-faint'
                                }`}
                              >
                                <Icon name="calendar" size={10} />
                                {overdue ? 'Overdue · ' : 'Follow up · '}
                                {formatDate(lead.followUpAt)}
                              </div>
                            ) : null}
                          </button>

                          <div className="mt-2 flex flex-wrap gap-1 opacity-0 transition-opacity duration-2 group-hover:opacity-100 focus-within:opacity-100">
                            <button
                              type="button"
                              onClick={() => setSelected(lead)}
                              aria-label={`View ${lead.name}, ${lead.ref}`}
                              title={`View ${lead.name}`}
                              className="flex h-6 items-center gap-1 border border-line px-2 font-mono text-[8px] uppercase text-fg-faint hover:text-cold"
                            >
                              <Icon name="eye" size={10} /> View
                            </button>
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

      {meta && meta.pages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-line px-4 py-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
            Page {page} of {meta.pages} · {meta.count} matching · {meta.total} total
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= meta.pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

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
          toast({
            title: 'Lead created',
            description: `${lead.ref} · ${lead.name}`,
            tone: 'success',
          })
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
  const { back, cancel } = useDetailBack(onClose)
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
      onClose={cancel}
      onBack={back}
      title={lead ? `${lead.name} · ${lead.ref}` : 'Lead'}
      description={lead?.serviceName ?? 'Unallocated service'}
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" onClick={back} icon="chevron-left">
            Back
          </Button>
          <Button variant="secondary" onClick={cancel}>
            Cancel
          </Button>
        </div>
      }
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
              <a
                href={`tel:${lead.phone}`}
                className="mt-1 block font-mono text-[11px] text-fg hover:text-cold"
              >
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
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                City
              </span>
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

          <Button
            onClick={() => void save()}
            disabled={pending}
            full
            icon={pending ? 'clock' : 'check'}
          >
            {pending ? 'Saving…' : 'Save lead'}
          </Button>

          {lead.attachments?.length ? (
            <div>
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                  Attachments
                </span>
                <span className="t-num text-[10px] text-fg-faint">{lead.attachments.length}</span>
              </div>
              <ul className="mt-2 flex flex-col">
                {lead.attachments.map((attachment) => (
                  <li key={attachment.url} className="border-b border-line/60 py-2 last:border-0">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 text-[11px] text-cold hover:text-fg"
                    >
                      <span className="truncate">{attachment.name}</span>
                      <Icon name="external" size={11} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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

function CustomerCreateModal({
  open,
  onClose,
  form,
  setForm,
  error,
  busy,
  onSave,
}: {
  open: boolean
  onClose: () => void
  form: { name: string; email: string; phone: string; address: string }
  setForm: (value: { name: string; email: string; phone: string; address: string }) => void
  error: string
  busy: boolean
  onSave: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add as customer"
      description="Create the customer record now. The lead form will select it automatically."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={onSave} icon="plus">
            Add customer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Customer name"
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
        <Input
          label="Service address"
          value={form.address}
          onChange={(event) => setForm({ ...form, address: event.target.value })}
        />
      </div>
      {error ? (
        <div className="mt-4">
          <InlineError message={error} />
        </div>
      ) : null}
    </Modal>
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
  const [customers, setCustomers] = useState<CustomerAccount[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerOpen, setCustomerOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [customerError, setCustomerError] = useState('')
  const [customerBusy, setCustomerBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setCustomerQuery('')
    setSelectedCustomer(null)
    setCustomerOpen(false)
    adminApi
      .customers()
      .then(setCustomers)
      .catch(() => setCustomers([]))
  }, [open])

  const chooseCustomer = (customer: CustomerAccount) => {
    setSelectedCustomer(customer)
    setCustomerQuery(customer.name)
    setName(customer.name)
    setPhone(customer.phone)
    setEmail(customer.email)
    setCity(customer.address)
    setCustomerOpen(false)
  }

  const customerMatches = useMemo(() => {
    const needle = customerQuery.trim().toLowerCase()
    if (needle.length < 2) return []
    return customers
      .filter((customer) =>
        `${customer.name} ${customer.email} ${customer.phone} ${customer.address}`
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 6)
  }, [customerQuery, customers])

  const createCustomer = async () => {
    setCustomerError('')
    setCustomerBusy(true)
    try {
      const created = await adminApi.createCustomer(customerForm)
      setCustomers((current) => [created, ...current])
      chooseCustomer(created)
      setCustomerModalOpen(false)
      setCustomerForm({ name: '', email: '', phone: '', address: '' })
    } catch (caught) {
      setCustomerError(caught instanceof Error ? caught.message : 'Could not add the customer.')
    } finally {
      setCustomerBusy(false)
    }
  }

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
      setCustomerQuery('')
      setSelectedCustomer(null)
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
          <Button
            onClick={() => void submit()}
            disabled={pending}
            icon={pending ? 'clock' : 'plus'}
          >
            {pending ? 'Creating…' : 'Create lead'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Input
            label="Find or add customer"
            value={customerQuery}
            placeholder="Search name, email or phone…"
            autoComplete="off"
            onFocus={() => setCustomerOpen(true)}
            onBlur={() => window.setTimeout(() => setCustomerOpen(false), 160)}
            onChange={(event) => {
              setCustomerQuery(event.target.value)
              setCustomerOpen(true)
              setSelectedCustomer(null)
            }}
            hint="Select an existing customer, or add a new one below."
          />
          {customerOpen && customerQuery.trim().length >= 2 ? (
            <div className="absolute left-0 right-0 top-full z-[var(--z-overlay)] mt-1 border border-line bg-base shadow-pop">
              {customerMatches.length ? (
                customerMatches.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseCustomer(customer)}
                    className="flex w-full items-start justify-between gap-3 border-b border-line/60 px-3 py-2.5 text-left last:border-0 hover:bg-cold/[0.06]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] text-fg">{customer.name}</span>
                      <span className="block truncate text-[10px] text-fg-faint">
                        {customer.email || customer.phone}
                      </span>
                    </span>
                    <span className="font-mono text-[8px] uppercase text-cold">Select</span>
                  </button>
                ))
              ) : (
                <div className="p-3">
                  <p className="text-[11px] text-fg-dim">No customer matches “{customerQuery}”.</p>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setCustomerForm({
                        name: customerQuery.includes('@') ? '' : customerQuery,
                        email: customerQuery.includes('@') ? customerQuery : '',
                        phone: '',
                        address: '',
                      })
                      setCustomerError('')
                      setCustomerModalOpen(true)
                      setCustomerOpen(false)
                    }}
                    className="mt-2 flex w-full items-center justify-between gap-2 border border-cold/40 bg-cold/[0.05] px-3 py-2 text-left font-mono text-[9px] uppercase tracking-[0.08em] text-cold hover:bg-cold/[0.1]"
                  >
                    Add “{customerQuery}” as a customer
                    <Icon name="plus" size={12} />
                  </button>
                </div>
              )}
            </div>
          ) : null}
          {selectedCustomer ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 border border-success/30 bg-success/[0.05] px-3 py-2 text-[11px] text-fg-dim">
              <Icon name="check" size={12} className="text-success" />
              Selected customer: <strong className="text-fg">{selectedCustomer.name}</strong>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null)
                  setCustomerQuery('')
                }}
                className="ml-auto font-mono text-[8px] uppercase text-fg-faint hover:text-danger"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
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
        <CustomerCreateModal
          open={customerModalOpen}
          onClose={() => setCustomerModalOpen(false)}
          form={customerForm}
          setForm={setCustomerForm}
          error={customerError}
          busy={customerBusy}
          onSave={() => void createCustomer()}
        />
      </div>
    </Modal>
  )
}
