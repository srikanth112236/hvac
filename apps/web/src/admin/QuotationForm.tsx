import { useMemo, useState, type FormEvent } from 'react'
import { Icon } from '@/components/icons'
import { Button, Input, Select, Textarea } from '@/components/ui'
import {
  quotationStatusLabel,
  quotationTotals,
  type AdminLead,
  type CustomerAccount,
  type QuotationInput,
  type QuotationRecord,
  type QuotationStatus,
} from '@hvac/shared'
import { catalogueServices } from '@/content/services'
import { formatMoney } from '@/admin/ui'
import { LivePreviewBadge, QuotationPreview } from '@/admin/DocumentPreview'

interface LineDraft {
  key: string
  description: string
  quantity: string
  unitPrice: string
  taxPercent: string
}

function lineDraft(description = '', quantity = '1', unitPrice = '', taxPercent = '0'): LineDraft {
  return { key: crypto.randomUUID(), description, quantity, unitPrice, taxPercent }
}

function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export interface QuotationFormProps {
  initial?: QuotationRecord
  customers: CustomerAccount[]
  leads: AdminLead[]
  busy?: boolean
  submitLabel: string
  onSubmit: (input: QuotationInput & { customerId: string }) => Promise<void> | void
  onCancel?: () => void
}

export function QuotationForm({
  initial,
  customers,
  leads,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: QuotationFormProps) {
  const [customerId, setCustomerId] = useState(initial?.customerId ?? '')
  const [leadRef, setLeadRef] = useState(initial?.leadRef ?? '')
  const [serviceSlug, setServiceSlug] = useState(initial?.serviceSlug ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [service, setService] = useState(initial?.service ?? '')
  const [validUntil, setValidUntil] = useState(
    initial?.validUntil ? initial.validUntil.slice(0, 10) : addDays(30),
  )
  const [status, setStatus] = useState<QuotationStatus>(initial?.status ?? 'draft')
  const [discount, setDiscount] = useState(String(initial?.discount ?? 0))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [terms, setTerms] = useState(initial?.terms ?? '')
  const [lines, setLines] = useState<LineDraft[]>(
    initial?.lines?.length
      ? initial.lines.map((line) => ({
          key: line.id,
          description: line.description,
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          taxPercent: String(line.taxPercent),
        }))
      : [lineDraft()],
  )
  const [error, setError] = useState('')

  const parsedLines = useMemo(
    () =>
      lines
        .filter((line) => line.description.trim())
        .map((line) => ({
          id: line.key,
          description: line.description.trim(),
          quantity: Number(line.quantity) || 0,
          unitPrice: Number(line.unitPrice) || 0,
          taxPercent: Number(line.taxPercent) || 0,
        })),
    [lines],
  )

  const record: QuotationRecord = useMemo(
    () => ({
      id: initial?.id ?? 'preview',
      ref: initial?.ref ?? 'DRAFT',
      customerId,
      leadRef: leadRef || null,
      serviceSlug: serviceSlug || null,
      title,
      service,
      lines: parsedLines,
      discount: Number(discount) || 0,
      notes,
      terms,
      status,
      validUntil,
      acceptedAt: initial?.acceptedAt ?? null,
      sentAt: initial?.sentAt ?? null,
      lastReminderAt: initial?.lastReminderAt ?? null,
      changeRequest: initial?.changeRequest ?? null,
      revisions: initial?.revisions,
      invoiceId: initial?.invoiceId ?? null,
      invoiceRef: initial?.invoiceRef ?? null,
      createdAt: initial?.createdAt ?? '',
      updatedAt: initial?.updatedAt ?? '',
    }),
    [
      customerId,
      discount,
      initial,
      leadRef,
      notes,
      parsedLines,
      service,
      serviceSlug,
      status,
      terms,
      title,
      validUntil,
    ],
  )

  const totals = useMemo(() => quotationTotals(record), [record])
  const customerName = customers.find((customer) => customer.id === customerId)?.name ?? ''

  const issues = useMemo(() => {
    const found: string[] = []
    if (!customerId) found.push('Choose the customer this quotation is for.')
    if (title.trim().length < 3) found.push('Give the quotation a title (at least 3 characters).')
    if (!parsedLines.length) found.push('Add at least one line with a description.')
    if (lines.some((line) => Number(line.quantity) <= 0)) {
      found.push('Every line needs a quantity greater than zero.')
    }
    if (lines.some((line) => Number(line.unitPrice) < 0)) {
      found.push('Unit price cannot be negative.')
    }
    if (!validUntil) found.push('Set the date this quotation is valid until.')
    return found
  }, [customerId, lines, parsedLines.length, title, validUntil])

  const updateLine = (key: string, patch: Partial<LineDraft>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (issues.length) {
      setError(issues[0]!)
      return
    }
    setError('')
    await onSubmit({
      customerId,
      leadRef: leadRef || null,
      serviceSlug: serviceSlug || null,
      title: title.trim(),
      service: service.trim(),
      validUntil,
      status,
      lines: parsedLines,
      discount: Number(discount) || 0,
      notes: notes.trim(),
      terms: terms.trim(),
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error ? (
        <p
          role="alert"
          className="border border-danger/40 bg-danger/[0.06] px-3 py-2 text-[12px] text-fg-dim"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Customer"
              required
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              options={[
                { value: '', label: 'Choose customer' },
                ...customers.map((customer) => ({
                  value: customer.id,
                  label: `${customer.name} · ${customer.email}`,
                })),
              ]}
            />
            <Select
              label="Lead (optional)"
              value={leadRef}
              onChange={(event) => setLeadRef(event.target.value)}
              options={[
                { value: '', label: 'No lead linked' },
                ...leads.map((lead) => ({ value: lead.ref, label: `${lead.ref} · ${lead.name}` })),
              ]}
            />
            <Input
              label="Quotation title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Cassette replacement · two rooms"
            />
            <Input
              label="Service scope"
              value={service}
              onChange={(event) => setService(event.target.value)}
              placeholder="Supply and install two 5.5 TR cassettes"
            />
            <Select
              label="Catalogue service (optional)"
              value={serviceSlug}
              onChange={(event) => {
                const slug = event.target.value
                const selected = catalogueServices.find((entry) => entry.id === slug)
                setServiceSlug(slug)
                if (selected) setService(selected.name)
              }}
              options={[
                { value: '', label: 'Define scope manually' },
                ...catalogueServices.map((entry) => ({ value: entry.id, label: entry.name })),
              ]}
            />
            <Input
              label="Valid until"
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as QuotationStatus)}
              options={Object.entries(quotationStatusLabel).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Input
              label="Discount ($)"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </div>

          <div className="border border-line">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-panel-2/60 px-3 py-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Line items · {parsedLines.length}
              </span>
              <button
                type="button"
                disabled={lines.length >= 50}
                onClick={() => setLines((current) => [...current, lineDraft()])}
                className="flex h-7 items-center gap-1 border border-line bg-panel px-2 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim hover:border-cold/40 hover:text-cold disabled:opacity-40"
              >
                <Icon name="plus" size={10} /> Add line
              </button>
            </div>
            <div className="flex flex-col gap-2 p-3">
              <div className="hidden gap-2 px-1 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint sm:grid sm:grid-cols-[minmax(0,1fr)_70px_100px_70px_32px]">
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit $</span>
                <span className="text-right">Tax %</span>
                <span />
              </div>
              {lines.map((line, index) => {
                const amount =
                  (Number(line.quantity) || 0) *
                  (Number(line.unitPrice) || 0) *
                  (1 + (Number(line.taxPercent) || 0) / 100)
                return (
                  <div
                    key={line.key}
                    className="grid gap-2 border border-line/70 bg-panel-2/40 p-2 sm:grid-cols-[minmax(0,1fr)_70px_100px_70px_32px]"
                  >
                    <Input
                      aria-label={`Line ${index + 1} description`}
                      placeholder="Description (e.g. Supply and install cassette)"
                      value={line.description}
                      onChange={(event) => updateLine(line.key, { description: event.target.value })}
                    />
                    <Input
                      aria-label={`Line ${index + 1} quantity`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.quantity}
                      onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                    />
                    <Input
                      aria-label={`Line ${index + 1} unit price`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit $"
                      value={line.unitPrice}
                      onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
                    />
                    <Input
                      aria-label={`Line ${index + 1} tax percent`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={line.taxPercent}
                      onChange={(event) => updateLine(line.key, { taxPercent: event.target.value })}
                    />
                    <button
                      type="button"
                      aria-label={`Remove line ${index + 1}`}
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((current) => current.filter((entry) => entry.key !== line.key))
                      }
                      className="flex h-[var(--btn-h-md)] items-center justify-center border border-line text-fg-faint hover:border-danger/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Icon name="close" size={12} />
                    </button>
                    <span className="col-span-full flex justify-between font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
                      <span>Line {index + 1} incl. tax</span>
                      <span className="text-fg-dim">{formatMoney(amount)}</span>
                    </span>
                  </div>
                )
              })}
              <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                Tax is applied per line on the discounted value with the same rounding as the API.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Textarea
              label="Notes shown on the quotation"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Access, lead time, exclusions…"
            />
            <Textarea
              label="Terms"
              rows={3}
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
              placeholder="Validity, payment schedule, warranty…"
            />
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-2 self-start xl:sticky xl:top-0">
          <LivePreviewBadge label={`${parsedLines.length} lines · ${status.replace(/-/g, ' ')}`} />
          <div
            data-lenis-prevent
            className="max-h-[70vh] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]"
          >
            <QuotationPreview record={record} totals={totals} customerName={customerName} />
          </div>
          <p className="text-[10px] leading-snug text-fg-faint">
            The preview reads the same totals function the API stores, including per-line tax and
            discount allocation.
          </p>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        {issues.length ? (
          <span className="mr-auto font-mono text-[9px] uppercase tracking-[0.08em] text-warn">
            {issues.length} thing{issues.length === 1 ? '' : 's'} to fix
          </span>
        ) : null}
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
