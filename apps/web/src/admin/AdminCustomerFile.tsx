import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import {
  quotationStatusLabel,
  ticketStatusLabel,
  type AmcStatus,
  type AmcContract,
  type CustomerAccount,
  type CustomerPortalFile,
  type CustomerSite,
  type EquipmentRecord,
  type QuotationRecord,
  type QuotationStatus,
  type SupportTicket,
  type TicketStatus,
} from '@hvac/shared'
import {
  Badge,
  Button,
  ButtonAnchor,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { adminApi } from '@/admin/api'
import { Icon } from '@/components/icons'
import { AdminLoading, AdminPageHeader, InlineError, formatDate, formatDateTime, formatMoney } from '@/admin/ui'

type Tab = 'sites' | 'equipment' | 'quotations' | 'amc' | 'reports' | 'tickets' | 'preferences'

const tabs: { id: Tab; label: string }[] = [
  { id: 'sites', label: 'Sites' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'amc', label: 'AMC cover' },
  { id: 'reports', label: 'Job reports' },
  { id: 'tickets', label: 'Support' },
  { id: 'preferences', label: 'Preferences' },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseQuotationLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [description, qty, rate, tax] = line.split('|').map((part) => part.trim())
      return {
        description: description ?? '',
        quantity: Number.parseFloat(qty ?? '1') || 1,
        unitPrice: Number.parseFloat(rate ?? '0') || 0,
        taxPercent: Number.parseFloat(tax ?? '0') || 0,
      }
    })
    .filter((line) => line.description.length > 0)
}

export function AdminCustomerFile() {
  const { customerId = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [data, setData] = useState<{ customer: CustomerAccount; file: CustomerPortalFile } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('sites')
  const [busy, setBusy] = useState(false)

  const [siteOpen, setSiteOpen] = useState(false)
  const [siteEditing, setSiteEditing] = useState<CustomerSite | null>(null)
  const [siteForm, setSiteForm] = useState({
    label: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    isPrimary: false,
  })

  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const [equipmentEditing, setEquipmentEditing] = useState<EquipmentRecord | null>(null)
  const [equipmentForm, setEquipmentForm] = useState({
    name: '',
    brand: '',
    model: '',
    serial: '',
    capacity: '',
    siteId: '',
    installedAt: '',
    warrantyUntil: '',
    notes: '',
  })

  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteEditing, setQuoteEditing] = useState<QuotationRecord | null>(null)
  const [quoteForm, setQuoteForm] = useState({
    title: '',
    service: '',
    validUntil: '',
    status: 'draft' as QuotationStatus,
    lines: '',
    notes: '',
  })

  const [amcOpen, setAmcOpen] = useState(false)
  const [amcEditing, setAmcEditing] = useState<AmcContract | null>(null)
  const [amcForm, setAmcForm] = useState({
    plan: 'Comprehensive',
    startDate: today(),
    endDate: '',
    visitsPerYear: '4',
    price: '0',
    status: 'active' as AmcStatus,
    notes: '',
    equipmentIds: [] as string[],
  })

  const [reportOpen, setReportOpen] = useState(false)
  const [reportUploading, setReportUploading] = useState(false)
  const [reportForm, setReportForm] = useState({
    title: '',
    appointmentId: '',
    equipmentId: '',
    technician: '',
    completedAt: today(),
    summary: '',
    checklist: '',
    photos: '',
    findings: '',
    recommendations: '',
  })

  const [ticketOpen, setTicketOpen] = useState<SupportTicket | null>(null)
  const [reply, setReply] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const result = await adminApi.customerFile(customerId)
      setData(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the customer file.')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useLiveRefresh(load)

  const file = data?.file
  const customer = data?.customer

  const counts = useMemo(
    () => ({
      sites: file?.sites.length ?? 0,
      equipment: file?.equipment.length ?? 0,
      quotations: file?.quotations.length ?? 0,
      amc: file?.amc.length ?? 0,
      reports: file?.reports.length ?? 0,
      tickets: file?.tickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'in-progress').length ?? 0,
    }),
    [file],
  )

  const run = async (task: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try {
      await task()
      toast({ title: success, tone: 'success' })
      await load()
    } catch (caught) {
      toast({
        title: 'Could not save',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const openSite = (site?: CustomerSite) => {
    setSiteEditing(site ?? null)
    setSiteForm({
      label: site?.label ?? '',
      address: site?.address ?? '',
      city: site?.city ?? '',
      region: site?.region ?? '',
      postalCode: site?.postalCode ?? '',
      isPrimary: site?.isPrimary ?? false,
    })
    setSiteOpen(true)
  }

  const saveSite = async (event: FormEvent) => {
    event.preventDefault()
    await run(async () => {
      if (siteEditing) await adminApi.patchCustomerSite(customerId, siteEditing.id, siteForm)
      else await adminApi.createCustomerSite(customerId, siteForm)
      setSiteOpen(false)
      setSiteEditing(null)
    }, 'Site saved')
  }

  const saveEquipment = async (event: FormEvent) => {
    event.preventDefault()
    await run(async () => {
      const payload = {
        ...equipmentForm,
        siteId: equipmentForm.siteId || null,
      }
      if (equipmentEditing) {
        await adminApi.patchEquipment(
          customerId,
          equipmentEditing.id,
          payload,
          equipmentEditing.updatedAt,
        )
      } else {
        await adminApi.createEquipment(customerId, payload)
      }
      setEquipmentOpen(false)
      setEquipmentEditing(null)
      setEquipmentForm({ name: '', brand: '', model: '', serial: '', capacity: '', siteId: '', installedAt: '', warrantyUntil: '', notes: '' })
    }, equipmentEditing ? 'Equipment updated' : 'Equipment added')
  }

  const editEquipment = (item: EquipmentRecord) => {
    setEquipmentEditing(item)
    setEquipmentForm({
      name: item.name,
      brand: item.brand,
      model: item.model,
      serial: item.serial,
      capacity: item.capacity,
      siteId: item.siteId ?? '',
      installedAt: item.installedAt,
      warrantyUntil: item.warrantyUntil,
      notes: item.notes,
    })
    setEquipmentOpen(true)
  }

  const saveQuotation = async (event: FormEvent) => {
    event.preventDefault()
    const lines = parseQuotationLines(quoteForm.lines)
    if (!lines.length) {
      toast({ title: 'Add at least one line', description: 'Use description | qty | rate | tax.', tone: 'warn' })
      return
    }
    await run(async () => {
      if (quoteEditing) {
        await adminApi.patchQuotation(
          customerId,
          quoteEditing.id,
          {
            title: quoteForm.title,
            service: quoteForm.service,
            status: quoteForm.status,
            validUntil: quoteForm.validUntil,
            lines,
            notes: quoteForm.notes,
          },
          quoteEditing.updatedAt,
        )
      } else {
        await adminApi.createQuotation(customerId, {
          title: quoteForm.title,
          service: quoteForm.service,
          status: quoteForm.status,
          validUntil: quoteForm.validUntil,
          lines,
          discount: 0,
          notes: quoteForm.notes,
          terms: '',
        })
      }
      setQuoteOpen(false)
      setQuoteEditing(null)
      setQuoteForm({ title: '', service: '', validUntil: '', status: 'draft', lines: '', notes: '' })
    }, quoteEditing ? 'Quotation updated' : 'Quotation created')
  }

  const editQuotation = (quote: QuotationRecord) => {
    setQuoteEditing(quote)
    setQuoteForm({
      title: quote.title,
      service: quote.service,
      validUntil: quote.validUntil,
      status: quote.status,
      lines: quote.lines
        .map(
          (line) =>
            `${line.description} | ${line.quantity} | ${line.unitPrice} | ${line.taxPercent}`,
        )
        .join('\n'),
      notes: quote.notes,
    })
    setQuoteOpen(true)
  }

  const saveAmc = async (event: FormEvent) => {
    event.preventDefault()
    await run(async () => {
      const payload = {
        plan: amcForm.plan,
        startDate: amcForm.startDate,
        endDate: amcForm.endDate,
        visitsPerYear: Number.parseInt(amcForm.visitsPerYear, 10) || 0,
        price: Number.parseFloat(amcForm.price) || 0,
        status: amcForm.status,
        notes: amcForm.notes,
        equipmentIds: amcForm.equipmentIds,
      }
      if (amcEditing) {
        await adminApi.patchAmc(customerId, amcEditing.id, payload, amcEditing.updatedAt)
      } else {
        await adminApi.createAmc(customerId, payload)
      }
      setAmcOpen(false)
      setAmcEditing(null)
    }, amcEditing ? 'Contract updated' : 'Contract created')
  }

  const editAmc = (contract: AmcContract) => {
    setAmcEditing(contract)
    setAmcForm({
      plan: contract.plan,
      startDate: contract.startDate,
      endDate: contract.endDate,
      visitsPerYear: String(contract.visitsPerYear),
      price: String(contract.price),
      status: contract.status,
      notes: contract.notes,
      equipmentIds: contract.equipmentIds,
    })
    setAmcOpen(true)
  }

  const uploadReportPhotos = async (files: File[], input?: HTMLInputElement) => {
    if (!files.length) return
    setReportUploading(true)
    try {
      const payload = await adminApi.uploadMedia(files, 'reports', 'Job report photo')
      const urls = payload.data.map((asset) => `${asset.url} | ${asset.alt}`).join('\n')
      setReportForm((current) => ({
        ...current,
        photos: [current.photos, urls].filter(Boolean).join('\n'),
      }))
      toast({
        title: 'Photos uploaded',
        description: `${payload.data.length} image${payload.data.length === 1 ? '' : 's'} added to the report.`,
        tone: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Photo upload failed',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setReportUploading(false)
      if (input) input.value = ''
    }
  }

  const removeReportPhoto = (url: string) => {
    setReportForm((current) => ({
      ...current,
      photos: current.photos
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith(url))
        .join('\n'),
    }))
  }

  const saveReport = async (event: FormEvent) => {
    event.preventDefault()
    const checklist = reportForm.checklist
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        label: line.replace(/^\[[xX]?\]\s*/, ''),
        done: /^\[[xX]\]/.test(line),
        note: '',
      }))
    const photos = reportForm.photos
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [url, ...alt] = line.split('|').map((part) => part.trim())
        return { url: url ?? '', alt: alt.join(' | ') }
      })
      .filter((photo) => photo.url)
    await run(async () => {
      await adminApi.createJobReport(customerId, {
        title: reportForm.title,
        appointmentId: reportForm.appointmentId || null,
        equipmentId: reportForm.equipmentId || null,
        technician: reportForm.technician,
        completedAt: reportForm.completedAt,
        summary: reportForm.summary,
        checklist,
        photos,
        findings: reportForm.findings,
        recommendations: reportForm.recommendations,
      })
      setReportOpen(false)
    }, 'Report filed')
  }

  const toggleAmcEquipment = (id: string, checked: boolean) => {
    setAmcForm((current) => ({
      ...current,
      equipmentIds: checked
        ? [...current.equipmentIds, id]
        : current.equipmentIds.filter((entry) => entry !== id),
    }))
  }

  const replyTicket = async (event: FormEvent) => {
    event.preventDefault()
    if (!ticketOpen) return
    await run(async () => {
      const updated = await adminApi.replySupportTicket(ticketOpen.id, reply)
      setTicketOpen(updated)
      setReply('')
    }, 'Reply sent')
  }

  const setQuotationStatus = async (quote: QuotationRecord, status: QuotationStatus) => {
    await run(() => adminApi.patchQuotation(customerId, quote.id, { status }), 'Quotation updated')
  }

  const eraseCustomer = async () => {
    const answer = window.prompt(
      'This removes the portal identity, sites, equipment, quotes, contracts, reports and tickets, and anonymises invoices and visits. Type ERASE to continue.',
    )
    if (answer !== 'ERASE') return
    setBusy(true)
    try {
      await adminApi.eraseCustomer(customerId)
      toast({ title: 'Customer data erased', tone: 'success' })
      navigate('/admin/customers')
    } catch (caught) {
      toast({
        title: 'Could not erase',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <AdminLoading rows={8} />
  if (error || !data || !file || !customer) {
    return <InlineError message={error || 'Customer file could not be loaded.'} />
  }

  const reportPhotoUrls = reportForm.photos
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|')[0]?.trim() ?? '')
    .filter(Boolean)

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Customer file · CV-FILE"
        title={customer.name}
        description={`${customer.email} · ${customer.phone || 'No phone'} · ${customer.status === 'active' ? 'portal access active' : customer.status === 'pending' ? 'awaiting portal approval' : 'portal access suspended'}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/customers"
              className="flex h-9 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
            >
              Back to customers
            </Link>
            <button
              type="button"
              onClick={() => void eraseCustomer()}
              disabled={busy}
              className="flex h-9 items-center border border-danger/40 px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-danger hover:bg-danger/10 disabled:opacity-50"
            >
              Erase data
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Sites', counts.sites],
          ['Equipment', counts.equipment],
          ['Quotations', counts.quotations],
          ['AMC', counts.amc],
          ['Reports', counts.reports],
          ['Open tickets', counts.tickets],
        ].map(([label, value]) => (
          <div key={label} className="border border-line bg-panel/30 p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">{label}</span>
            <p className="mt-2 font-display text-2xl text-fg">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={`border-b-2 px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] ${
              tab === entry.id ? 'border-cold text-cold' : 'border-transparent text-fg-faint hover:text-fg'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'sites' ? (
        <section className="border border-line bg-panel/20">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">Sites</h2>
            <Button size="sm" icon="plus" onClick={() => openSite()}>Add site</Button>
          </div>
          {file.sites.length === 0 ? (
            <div className="p-4"><EmptyState title="No sites" description="Add the first service address for this customer." /></div>
          ) : (
            <div className="divide-y divide-line">
              {file.sites.map((site) => (
                <article key={site.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                  <div>
                    <p className="text-sm text-fg">{site.label} {site.isPrimary ? <Badge tone="cold">Primary</Badge> : null}</p>
                    <p className="mt-1 text-[11px] text-fg-dim">{site.address}</p>
                    <p className="text-[10px] text-fg-faint">{[site.city, site.region, site.postalCode].filter(Boolean).join(', ')}</p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => openSite(site)} className="font-mono text-[9px] uppercase text-cold hover:text-fg">Edit</button>
                    <button type="button" onClick={() => void run(() => adminApi.deleteCustomerSite(customerId, site.id), 'Site removed')} className="font-mono text-[9px] uppercase text-fg-faint hover:text-danger">Remove</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === 'equipment' ? (
        <section className="border border-line bg-panel/20">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">Equipment</h2>
            <Button
              size="sm"
              icon="plus"
              onClick={() => {
                setEquipmentEditing(null)
                setEquipmentOpen(true)
              }}
            >
              Add equipment
            </Button>
          </div>
          {file.equipment.length === 0 ? (
            <div className="p-4"><EmptyState title="No equipment" description="Register each installed unit so the portal shows its history." /></div>
          ) : (
            <div className="divide-y divide-line">
              {file.equipment.map((item) => (
                <article key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                  <div>
                    <p className="text-sm text-fg">{item.name}</p>
                    <p className="text-[11px] text-fg-dim">{[item.brand, item.model, item.serial].filter(Boolean).join(' · ') || 'No model data'}</p>
                    <p className="text-[10px] text-fg-faint">{[item.capacity, item.installedAt ? `installed ${formatDate(item.installedAt)}` : '', item.warrantyUntil ? `warranty to ${formatDate(item.warrantyUntil)}` : ''].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => editEquipment(item)} className="font-mono text-[9px] uppercase text-cold hover:text-fg">Edit</button>
                    <button type="button" onClick={() => void run(() => adminApi.deleteEquipment(customerId, item.id), 'Equipment removed')} className="font-mono text-[9px] uppercase text-fg-faint hover:text-danger">Remove</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === 'quotations' ? (
        <section className="border border-line bg-panel/20">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">Quotations</h2>
            <Button
              size="sm"
              icon="plus"
              onClick={() => {
                setQuoteEditing(null)
                setQuoteOpen(true)
              }}
            >
              New quotation
            </Button>
          </div>
          {file.quotations.length === 0 ? (
            <div className="p-4"><EmptyState title="No quotations" description="Create a quotation to send into the customer portal." /></div>
          ) : (
            <div className="divide-y divide-line">
              {file.quotations.map((quote) => (
                <article key={quote.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto_170px_auto] md:items-center">
                  <div>
                    <p className="font-mono text-[9px] text-cold">{quote.ref}</p>
                    <p className="text-sm text-fg">{quote.title}</p>
                    <p className="text-[10px] text-fg-faint">{quote.lines.length} lines · created {formatDate(quote.createdAt)}</p>
                  </div>
                  <span className="font-display text-lg text-fg">{formatMoney(quote.totals.total)}</span>
                  <Select
                    aria-label={`Status for ${quote.ref}`}
                    value={quote.status}
                    onChange={(event) => void setQuotationStatus(quote, event.target.value as QuotationStatus)}
                    options={(Object.keys(quotationStatusLabel) as QuotationStatus[]).map((status) => ({ value: status, label: quotationStatusLabel[status] }))}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => editQuotation(quote)} className="font-mono text-[9px] uppercase text-cold hover:text-fg">Edit lines</button>
                    <ButtonAnchor
                      href={`/api/v1/admin/customers/${customerId}/quotations/${quote.id}/pdf`}
                      download
                      variant="quiet"
                      size="sm"
                    >
                      PDF
                    </ButtonAnchor>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === 'amc' ? (
        <section className="border border-line bg-panel/20">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">AMC cover</h2>
            <Button size="sm" icon="plus" onClick={() => { setAmcEditing(null); setAmcOpen(true) }}>New contract</Button>
          </div>
          {file.amc.length === 0 ? (
            <div className="p-4"><EmptyState title="No contract" description="Create the first maintenance contract for this customer." /></div>
          ) : (
            <div className="divide-y divide-line">
              {file.amc.map((contract) => (
                <article key={contract.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                  <div>
                    <p className="font-mono text-[9px] text-cold">{contract.ref}</p>
                    <p className="text-sm text-fg">{contract.plan} · {formatMoney(contract.price)} / year</p>
                    <p className="text-[10px] text-fg-faint">{formatDate(contract.startDate)} → {formatDate(contract.endDate)} · {contract.visitsPerYear} visits</p>
                    {contract.renewalRequestedAt ? <Badge tone="warn">Renewal requested</Badge> : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => editAmc(contract)} className="font-mono text-[9px] uppercase text-cold hover:text-fg">Edit</button>
                    <button type="button" onClick={() => void run(() => adminApi.deleteAmc(customerId, contract.id), 'Contract removed')} className="font-mono text-[9px] uppercase text-fg-faint hover:text-danger">Remove</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === 'reports' ? (
        <section className="border border-line bg-panel/20">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">Job reports</h2>
            <Button size="sm" icon="plus" onClick={() => setReportOpen(true)}>File report</Button>
          </div>
          {file.reports.length === 0 ? (
            <div className="p-4"><EmptyState title="No reports" description="File the checklist and photos after a visit; the customer sees them immediately." /></div>
          ) : (
            <div className="divide-y divide-line">
              {file.reports.map((report) => (
                <article key={report.id} className="px-4 py-4">
                  <p className="font-mono text-[9px] text-cold">{report.ref}</p>
                  <p className="text-sm text-fg">{report.title}</p>
                  <p className="text-[10px] text-fg-faint">{formatDate(report.completedAt)} · {report.technician || 'engineer not named'} · {report.checklist.length} checks · {report.photos.length} photos</p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === 'tickets' ? (
        <section className="border border-line bg-panel/20">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">Support tickets</h2>
            <Badge tone="neutral">{file.tickets.length}</Badge>
          </div>
          {file.tickets.length === 0 ? (
            <div className="p-4"><EmptyState title="No requests" description="Customer complaints, billing questions and AMC renewals appear here." /></div>
          ) : (
            <div className="divide-y divide-line">
              {file.tickets.map((ticket) => (
                <article key={ticket.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                  <div>
                    <p className="font-mono text-[9px] text-cold">{ticket.ref} · {ticket.category}</p>
                    <p className="text-sm text-fg">{ticket.subject}</p>
                    <p className="text-[10px] text-fg-faint">{ticket.messages.length} messages · updated {formatDateTime(ticket.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={ticket.status === 'open' ? 'warn' : ticket.status === 'in-progress' ? 'cold' : 'success'}>{ticketStatusLabel[ticket.status]}</Badge>
                    <Button size="sm" variant="secondary" onClick={() => { setTicketOpen(ticket); setReply('') }}>Open</Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === 'preferences' ? (
        <section className="border border-line bg-panel/20 p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">Notification preferences</h2>
          <dl className="mt-4 grid gap-3 text-[12px] sm:grid-cols-2">
            {[
              ['Service updates', file.preferences.emailService],
              ['Invoices and receipts', file.preferences.emailBilling],
              ['AMC and renewals', file.preferences.emailAmc],
              ['Seasonal notes', file.preferences.emailMarketing],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3 border border-line px-3 py-2">
                <dt className="text-fg-dim">{label}</dt>
                <dd><Badge tone={value ? 'success' : 'neutral'}>{value ? 'On' : 'Off'}</Badge></dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[11px] text-fg-faint">The customer controls these switches from the portal.</p>
        </section>
      ) : null}

      {/* Modals */}
      <Modal
        open={siteOpen}
        onClose={() => { setSiteOpen(false); setSiteEditing(null) }}
        title={siteEditing ? 'Edit site' : 'Add site'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setSiteOpen(false)}>Cancel</Button><Button type="submit" form="admin-site-form" loading={busy}>Save</Button></div>}
      >
        <form id="admin-site-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void saveSite(event)}>
          <Input label="Site name" required value={siteForm.label} onChange={(event) => setSiteForm({ ...siteForm, label: event.target.value })} />
          <Input label="City" value={siteForm.city} onChange={(event) => setSiteForm({ ...siteForm, city: event.target.value })} />
          <div className="sm:col-span-2"><Textarea label="Address" rows={2} required value={siteForm.address} onChange={(event) => setSiteForm({ ...siteForm, address: event.target.value })} /></div>
          <Input label="Region" value={siteForm.region} onChange={(event) => setSiteForm({ ...siteForm, region: event.target.value })} />
          <Input label="Postal code" value={siteForm.postalCode} onChange={(event) => setSiteForm({ ...siteForm, postalCode: event.target.value })} />
          <div className="sm:col-span-2"><Checkbox label="Primary site" checked={siteForm.isPrimary} onChange={(event) => setSiteForm({ ...siteForm, isPrimary: event.target.checked })} /></div>
        </form>
      </Modal>

      <Modal open={equipmentOpen} onClose={() => setEquipmentOpen(false)} title={equipmentEditing ? 'Edit equipment' : 'Add equipment'} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEquipmentOpen(false)}>Cancel</Button><Button type="submit" form="admin-equipment-form" loading={busy}>{equipmentEditing ? 'Save changes' : 'Save'}</Button></div>}>
        <form id="admin-equipment-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void saveEquipment(event)}>
          <Input label="Name" required value={equipmentForm.name} onChange={(event) => setEquipmentForm({ ...equipmentForm, name: event.target.value })} />
          <Input label="Capacity" value={equipmentForm.capacity} onChange={(event) => setEquipmentForm({ ...equipmentForm, capacity: event.target.value })} />
          <Input label="Brand" value={equipmentForm.brand} onChange={(event) => setEquipmentForm({ ...equipmentForm, brand: event.target.value })} />
          <Input label="Model" value={equipmentForm.model} onChange={(event) => setEquipmentForm({ ...equipmentForm, model: event.target.value })} />
          <Input label="Serial" value={equipmentForm.serial} onChange={(event) => setEquipmentForm({ ...equipmentForm, serial: event.target.value })} />
          <Select label="Site" value={equipmentForm.siteId} onChange={(event) => setEquipmentForm({ ...equipmentForm, siteId: event.target.value })} options={[{ value: '', label: 'Primary site' }, ...file.sites.map((site) => ({ value: site.id, label: site.label }))]} />
          <Input label="Installed" type="date" value={equipmentForm.installedAt} onChange={(event) => setEquipmentForm({ ...equipmentForm, installedAt: event.target.value })} />
          <Input label="Warranty until" type="date" value={equipmentForm.warrantyUntil} onChange={(event) => setEquipmentForm({ ...equipmentForm, warrantyUntil: event.target.value })} />
          <div className="sm:col-span-2"><Textarea label="Notes" rows={2} value={equipmentForm.notes} onChange={(event) => setEquipmentForm({ ...equipmentForm, notes: event.target.value })} /></div>
        </form>
      </Modal>

      <Modal open={quoteOpen} onClose={() => setQuoteOpen(false)} title={quoteEditing ? 'Edit quotation' : 'New quotation'} size="lg" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setQuoteOpen(false)}>Cancel</Button><Button type="submit" form="admin-quote-form" loading={busy}>{quoteEditing ? 'Save lines' : 'Create'}</Button></div>}>
        <form id="admin-quote-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void saveQuotation(event)}>
          <Input label="Title" required value={quoteForm.title} onChange={(event) => setQuoteForm({ ...quoteForm, title: event.target.value })} />
          <Input label="Service" value={quoteForm.service} onChange={(event) => setQuoteForm({ ...quoteForm, service: event.target.value })} />
          <Input label="Valid until" type="date" value={quoteForm.validUntil} onChange={(event) => setQuoteForm({ ...quoteForm, validUntil: event.target.value })} />
          <Select label="Status" value={quoteForm.status} onChange={(event) => setQuoteForm({ ...quoteForm, status: event.target.value as QuotationStatus })} options={(Object.keys(quotationStatusLabel) as QuotationStatus[]).map((status) => ({ value: status, label: quotationStatusLabel[status] }))} />
          <div className="sm:col-span-2">
            <Textarea label="Lines — description | qty | rate | tax %" rows={5} value={quoteForm.lines} onChange={(event) => setQuoteForm({ ...quoteForm, lines: event.target.value })} placeholder={'Two 5.5 TR cassettes | 2 | 2400 | 8.25\nCrane and access | 1 | 350 | 0'} />
          </div>
          <div className="sm:col-span-2"><Textarea label="Notes" rows={2} value={quoteForm.notes} onChange={(event) => setQuoteForm({ ...quoteForm, notes: event.target.value })} /></div>
        </form>
      </Modal>

      <Modal open={amcOpen} onClose={() => setAmcOpen(false)} title={amcEditing ? 'Edit AMC contract' : 'New AMC contract'} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAmcOpen(false)}>Cancel</Button><Button type="submit" form="admin-amc-form" loading={busy}>{amcEditing ? 'Save changes' : 'Create'}</Button></div>}>
        <form id="admin-amc-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void saveAmc(event)}>
          <Input label="Plan" required value={amcForm.plan} onChange={(event) => setAmcForm({ ...amcForm, plan: event.target.value })} />
          <Select label="Status" value={amcForm.status} onChange={(event) => setAmcForm({ ...amcForm, status: event.target.value as AmcStatus })} options={['pending', 'active', 'expired', 'cancelled'].map((status) => ({ value: status, label: status }))} />
          <Input label="Start" type="date" required value={amcForm.startDate} onChange={(event) => setAmcForm({ ...amcForm, startDate: event.target.value })} />
          <Input label="End" type="date" required value={amcForm.endDate} onChange={(event) => setAmcForm({ ...amcForm, endDate: event.target.value })} />
          <Input label="Visits / year" type="number" min="0" max="52" value={amcForm.visitsPerYear} onChange={(event) => setAmcForm({ ...amcForm, visitsPerYear: event.target.value })} />
          <Input label="Annual price" type="number" min="0" step="0.01" value={amcForm.price} onChange={(event) => setAmcForm({ ...amcForm, price: event.target.value })} />
          <div className="sm:col-span-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim">Equipment covered</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {file.equipment.length === 0 ? <p className="text-[11px] text-fg-faint">No equipment on file.</p> : file.equipment.map((item) => (
                <Checkbox key={item.id} label={item.name} checked={amcForm.equipmentIds.includes(item.id)} onChange={(event) => toggleAmcEquipment(item.id, event.target.checked)} />
              ))}
            </div>
          </div>
          <div className="sm:col-span-2"><Textarea label="Notes" rows={2} value={amcForm.notes} onChange={(event) => setAmcForm({ ...amcForm, notes: event.target.value })} /></div>
        </form>
      </Modal>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="File job report" size="lg" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setReportOpen(false)}>Cancel</Button><Button type="submit" form="admin-report-form" loading={busy}>Publish report</Button></div>}>
        <form id="admin-report-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void saveReport(event)}>
          <Input label="Title" required value={reportForm.title} onChange={(event) => setReportForm({ ...reportForm, title: event.target.value })} />
          <Input label="Technician" value={reportForm.technician} onChange={(event) => setReportForm({ ...reportForm, technician: event.target.value })} />
          <Select label="Equipment" value={reportForm.equipmentId} onChange={(event) => setReportForm({ ...reportForm, equipmentId: event.target.value })} options={[{ value: '', label: 'Not linked' }, ...file.equipment.map((item) => ({ value: item.id, label: item.name }))]} />
          <Input label="Completed" type="date" value={reportForm.completedAt} onChange={(event) => setReportForm({ ...reportForm, completedAt: event.target.value })} />
          <div className="sm:col-span-2"><Textarea label="Summary" rows={2} value={reportForm.summary} onChange={(event) => setReportForm({ ...reportForm, summary: event.target.value })} /></div>
          <div className="sm:col-span-2"><Textarea label="Checklist — one per line, prefix [x] for done" rows={4} value={reportForm.checklist} onChange={(event) => setReportForm({ ...reportForm, checklist: event.target.value })} placeholder={'[x] Coil cleaned\n[x] Drain tested\n[ ] Filter replaced'} /></div>
          <div className="sm:col-span-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim">
              Report photos
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.08em] text-cold hover:border-cold/60">
                <Icon name="upload" size={13} />
                {reportUploading ? 'Uploading…' : 'Upload photos'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  multiple
                  className="sr-only"
                  disabled={reportUploading}
                  onChange={(event) =>
                    void uploadReportPhotos(
                      Array.from(event.currentTarget.files ?? []),
                      event.currentTarget,
                    )
                  }
                />
              </label>
              <span className="text-[10px] text-fg-faint">
                Stored in the media library and attached to this report.
              </span>
            </div>
            {reportPhotoUrls.length ? (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {reportPhotoUrls.map((url) => (
                  <div key={url} className="group relative border border-line bg-base">
                    <img src={url} alt="" className="h-20 w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove report photo"
                      onClick={() => removeReportPhoto(url)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-base/90 text-fg-faint hover:text-danger"
                    >
                      <Icon name="close" size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <details className="mt-3">
              <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                Attached URLs
              </summary>
              <Textarea
                className="mt-2"
                label="Photo URLs - one per line"
                rows={2}
                value={reportForm.photos}
                onChange={(event) => setReportForm({ ...reportForm, photos: event.target.value })}
              />
            </details>
          </div>
          <div className="sm:col-span-2"><Textarea label="Findings" rows={2} value={reportForm.findings} onChange={(event) => setReportForm({ ...reportForm, findings: event.target.value })} /></div>
          <div className="sm:col-span-2"><Textarea label="Recommendations" rows={2} value={reportForm.recommendations} onChange={(event) => setReportForm({ ...reportForm, recommendations: event.target.value })} /></div>
        </form>
      </Modal>

      <Modal
        open={Boolean(ticketOpen)}
        onClose={() => { setTicketOpen(null); setReply('') }}
        title={ticketOpen ? `${ticketOpen.ref} · ${ticketOpen.subject}` : 'Ticket'}
        size="lg"
        footer={<div className="flex justify-between gap-2"><Button variant="secondary" onClick={() => setTicketOpen(null)}>Close</Button><Button type="submit" form="admin-ticket-reply" loading={busy}>Send reply</Button></div>}
      >
        {ticketOpen ? (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
              {ticketOpen.messages.map((message) => (
                <li key={message.id} className={message.authorRole === 'admin' ? 'ml-auto max-w-[85%] border border-cold/30 bg-cold/[0.06] p-3' : 'mr-auto max-w-[85%] border border-line bg-panel/40 p-3'}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">{message.authorName} · {formatDateTime(message.at)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[12px] text-fg-dim">{message.body}</p>
                </li>
              ))}
            </ul>
            <Select label="Status" value={ticketOpen.status} onChange={(event) => void run(async () => { const updated = await adminApi.patchSupportTicket(ticketOpen.id, event.target.value as TicketStatus); setTicketOpen(updated) }, 'Status updated')} options={(['open', 'in-progress', 'resolved', 'closed'] as const).map((status) => ({ value: status, label: ticketStatusLabel[status] }))} />
            <form id="admin-ticket-reply" onSubmit={(event) => void replyTicket(event)}>
              <Textarea label="Reply" rows={3} value={reply} onChange={(event) => setReply(event.target.value)} />
            </form>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
