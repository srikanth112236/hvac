import { useMemo, useState, type FormEvent } from 'react'
import { Icon } from '@/components/icons'
import { Button, Input, Select, Textarea } from '@/components/ui'
import {
  invoiceTotals,
  type InvoiceInput,
  type InvoiceRecord,
  type InvoiceWithTotals,
} from '@hvac/shared'
import { formatMoney } from '@/admin/ui'
import { InvoicePreview, LivePreviewBadge } from '@/admin/DocumentPreview'

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

function isoDay(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export interface InvoiceFormProps {
  initial?: InvoiceWithTotals
  submitLabel: string
  busy?: boolean
  onSubmit: (input: InvoiceInput) => Promise<void> | void
  onCancel?: () => void
}

export function InvoiceForm({ initial, submitLabel, busy, onSubmit, onCancel }: InvoiceFormProps) {
  const [customerName, setCustomerName] = useState(initial?.customerName ?? '')
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? '')
  const [customerEmail, setCustomerEmail] = useState(initial?.customerEmail ?? '')
  const [customerAddress, setCustomerAddress] = useState(initial?.customerAddress ?? '')
  const [customerGstin, setCustomerGstin] = useState(initial?.customerGstin ?? '')
  const [service, setService] = useState(initial?.service ?? '')
  const [leadRef, setLeadRef] = useState(initial?.leadRef ?? '')
  const [issueDate, setIssueDate] = useState(initial ? isoDay(initial.issueDate) : addDays(0))
  const [dueDate, setDueDate] = useState(initial ? isoDay(initial.dueDate) : addDays(14))
  const [status, setStatus] = useState<InvoiceInput['status']>(initial?.status ?? 'issued')
  const [taxMode, setTaxMode] = useState<InvoiceInput['taxMode']>(initial?.taxMode ?? 'intra')
  const [discount, setDiscount] = useState(String(initial?.discount ?? 0))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [terms, setTerms] = useState(initial?.terms ?? '')
  const [lines, setLines] = useState<LineDraft[]>(
    initial
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

  const record: InvoiceRecord = useMemo(
    () => ({
      id: initial?.id ?? 'preview',
      ref: initial?.ref ?? 'DRAFT',
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerGstin,
      service,
      leadRef: leadRef || null,
      issueDate,
      dueDate,
      status,
      lines: parsedLines,
      discount: Number(discount) || 0,
      taxMode,
      notes,
      terms,
      payments: initial?.payments ?? [],
      creditNotes: initial?.creditNotes ?? [],
      reminderDates: initial?.reminderDates ?? [],
      lastReminderAt: initial?.lastReminderAt ?? null,
      createdAt: initial?.createdAt ?? '',
      updatedAt: initial?.updatedAt ?? '',
    }),
    [
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerGstin,
      service,
      leadRef,
      issueDate,
      dueDate,
      status,
      parsedLines,
      discount,
      taxMode,
      notes,
      terms,
      initial,
    ],
  )

  const totals = useMemo(() => invoiceTotals(record), [record])
  const discountCapped = Number(discount) > totals.subtotal
  const datesReversed = Boolean(issueDate && dueDate && dueDate < issueDate)

  const issues = useMemo(() => {
    const found: string[] = []
    if (customerName.trim().length < 2) found.push('Customer or building name is required.')
    if (!parsedLines.length) found.push('Add at least one line with a description.')
    if (lines.some((line) => line.description.trim() && !(Number(line.unitPrice) >= 0))) {
      found.push('Unit price cannot be negative.')
    }
    if (lines.some((line) => Number(line.quantity) <= 0)) {
      found.push('Every line needs a quantity greater than zero.')
    }
    if (!issueDate || !dueDate) found.push('Set both the invoice and due dates.')
    else if (datesReversed) found.push('The due date cannot be before the invoice date.')
    return found
  }, [customerName, datesReversed, dueDate, issueDate, lines, parsedLines.length])

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
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      customerAddress: customerAddress.trim(),
      customerGstin: customerGstin.trim(),
      service: service.trim(),
      leadRef: leadRef.trim() || null,
      issueDate,
      dueDate,
      status,
      lines: parsedLines,
      discount: Number(discount) || 0,
      taxMode,
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
            <Input
              label="Customer / building"
              required
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Meridian Tower · Suite 210"
            />
            <Input
              label="Phone"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="(555) 555-0100"
            />
            <Input
              label="Email"
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="accounts@building.example"
            />
            <Input
              label="Service / job"
              value={service}
              onChange={(event) => setService(event.target.value)}
              placeholder="VRF cassette replacement · 3 floors"
            />
            <Input
              label="Billing address"
              value={customerAddress}
              onChange={(event) => setCustomerAddress(event.target.value)}
              placeholder="Street, city, state, ZIP"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Customer tax ID (EIN)"
                value={customerGstin}
                onChange={(event) => setCustomerGstin(event.target.value)}
                placeholder="12-3456789"
              />
              <Input
                label="Lead reference"
                value={leadRef}
                onChange={(event) => setLeadRef(event.target.value)}
                placeholder="CV-LEAD-0001"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Invoice date"
              type="date"
              value={issueDate}
              onChange={(event) => setIssueDate(event.target.value)}
            />
            <Input
              label="Due date"
              type="date"
              value={dueDate}
              error={datesReversed ? 'Due before invoice date' : undefined}
              onChange={(event) => setDueDate(event.target.value)}
            />
            <Select
              label="Record status"
              value={status}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'issued', label: 'Issued' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              onChange={(event) => setStatus(event.target.value as InvoiceInput['status'])}
            />
            <Select
              label="Sales tax"
              value={taxMode}
              options={[
                { value: 'intra', label: 'In-state · state + local tax' },
                { value: 'inter', label: 'Out-of-state · single sales tax' },
              ]}
              onChange={(event) => setTaxMode(event.target.value as InvoiceInput['taxMode'])}
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
                  (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0) +
                  (Number(line.quantity) || 0) *
                    (Number(line.unitPrice) || 0) *
                    ((Number(line.taxPercent) || 0) / 100)
                return (
                  <div
                    key={line.key}
                    className="grid gap-2 border border-line/70 bg-panel-2/40 p-2 sm:grid-cols-[minmax(0,1fr)_70px_100px_70px_32px]"
                  >
                    <Input
                      aria-label={`Line ${index + 1} description`}
                      placeholder="Description (e.g. Daikin FTKM50 cassette)"
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
                Totals use the same rounding as the API: subtotal, discount, per-line tax on the
                discounted value, then two-decimal rounding.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)]">
            <div className="border border-line bg-panel-2/40 p-3">
              <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Discount ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className="mt-2 h-9 w-full border border-line bg-panel px-2 text-[13px] text-fg focus:border-cold focus:outline-none"
                />
              </label>
              {discountCapped ? (
                <p className="mt-1 text-[9px] leading-snug text-warn">
                  Capped at the subtotal ({formatMoney(totals.subtotal)}) when calculated.
                </p>
              ) : null}
              <dl className="mt-4 flex flex-col gap-1.5 text-[11px] text-fg-dim">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Discount</dt>
                  <dd>−{formatMoney(totals.discount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Taxable</dt>
                  <dd>{formatMoney(totals.taxable)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{taxMode === 'intra' ? 'State + local tax' : 'Sales tax'}</dt>
                  <dd>{formatMoney(totals.taxTotal)}</dd>
                </div>
                <div className="mt-1 flex justify-between border-t border-line pt-2 font-mono text-[11px] uppercase text-fg">
                  <dt>Total</dt>
                  <dd>{formatMoney(totals.total)}</dd>
                </div>
              </dl>
            </div>
            <div className="grid gap-3">
              <Textarea
                label="Notes on the invoice"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Site access, warranty note, serial numbers…"
              />
              <Textarea
                label="Payment terms"
                rows={3}
                value={terms}
                onChange={(event) => setTerms(event.target.value)}
                placeholder="Leave blank to use the billing identity default terms."
              />
            </div>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-2 self-start xl:sticky xl:top-0">
          <LivePreviewBadge label={`${parsedLines.length} lines · ${taxMode === 'intra' ? 'state + local' : 'sales tax'}`} />
          <div data-lenis-prevent className="max-h-[70vh] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
            <InvoicePreview record={record} totals={totals} />
          </div>
          <p className="text-[10px] leading-snug text-fg-faint">
            Preview uses the stored document settings and the shared totals function, so the sheet,
            the PDF and this preview cannot disagree.
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
