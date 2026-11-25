import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Button, ButtonAnchor, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import type {
  InvoiceInput,
  InvoicePaymentInput,
  InvoiceWithTotals,
  SiteContent,
} from '@hvac/shared'
import { adminApi } from '@/admin/api'
import { useBackTarget } from '@/admin/useBackTarget'
import { InvoiceForm } from '@/admin/InvoiceForm'
import { InvoiceStateBadge, METHOD_LABELS } from '@/admin/invoice-ui'
import { AdminLoading, InlineError, formatDate, formatDateTime, formatMoneyExact } from '@/admin/ui'
import { useSiteContent } from '@/content/SiteContentProvider'
import '@/admin/print.css'

const ones = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

function twoDigits(value: number): string {
  if (value < 20) return ones[value] ?? ''
  const unit = value % 10
  return `${tens[Math.floor(value / 10)]}${unit ? ` ${ones[unit]}` : ''}`
}

function threeDigits(value: number): string {
  const hundred = Math.floor(value / 100)
  const rest = value % 100
  return [hundred ? `${ones[hundred]} hundred` : '', rest ? twoDigits(rest) : '']
    .filter(Boolean)
    .join(' ')
}

function amountInWords(value: number): string {
  const rounded = Math.round(value)
  if (!rounded) return 'Zero dollars only'
  const million = Math.floor(rounded / 1_000_000)
  const thousand = Math.floor((rounded % 1_000_000) / 1_000)
  const rest = rounded % 1_000
  const parts = [
    million ? `${twoDigits(million)} million` : '',
    thousand ? `${threeDigits(thousand)} thousand` : '',
    rest ? threeDigits(rest) : '',
  ].filter(Boolean)
  return `${parts.join(' ')} dollars only`
}

export function AdminInvoiceDetail() {
  const { invoiceId = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { content } = useSiteContent()
  const back = useBackTarget('/admin/invoices', 'Back to invoices')
  // Bank details are not part of the public content feed. The invoice sheet
  // reads them from the authenticated admin endpoint instead.
  const [adminBilling, setAdminBilling] = useState<SiteContent['brand']['billing'] | null>(null)
  const billing = adminBilling ?? content.brand.billing
  const [invoice, setInvoice] = useState<InvoiceWithTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<InvoicePaymentInput['method']>('bank-transfer')
  const [reference, setReference] = useState('')
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10))
  const [paymentNotes, setPaymentNotes] = useState('')

  useEffect(() => {
    let active = true
    adminApi
      .billing()
      .then((data) => {
        if (active) setAdminBilling(data)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    adminApi
      .invoice(invoiceId)
      .then((data) => {
        if (!active) return
        setInvoice(data)
        setAmount(String(data.totals.balance || ''))
        setError('')
      })
      .catch((caught) => {
        if (active)
          setError(caught instanceof Error ? caught.message : 'Could not load this invoice.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [invoiceId])

  const recordPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) {
      toast({ title: 'Enter a payment amount', tone: 'danger' })
      return
    }
    setBusy(true)
    try {
      const result = await adminApi.addInvoicePayment(invoiceId, {
        amount: value,
        method,
        reference: reference.trim(),
        notes: paymentNotes.trim(),
        receivedAt,
      })
      setInvoice(result.data)
      setPayOpen(false)
      setReference('')
      setPaymentNotes('')
      toast({
        title: result.data.totals.balance <= 0 ? 'Invoice settled' : 'Part payment recorded',
        description: `${formatMoneyExact(value)} · ${METHOD_LABELS[method]}`,
        tone: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Payment not recorded',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const saveInvoice = async (input: InvoiceInput) => {
    setBusy(true)
    try {
      const result = await adminApi.patchInvoice(invoiceId, input)
      setInvoice(result.data)
      setEditOpen(false)
      toast({ title: 'Invoice updated', description: result.data.ref, tone: 'success' })
    } catch (caught) {
      toast({
        title: 'Invoice not updated',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const remind = async () => {
    try {
      const result = await adminApi.remindInvoice(invoiceId)
      setInvoice(result.data)
      toast({
        title: 'Payment reminder queued',
        description: 'Due tomorrow at 9am.',
        tone: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Reminder not created',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const deletePayment = async (paymentId: string) => {
    if (!window.confirm('Remove this payment from the ledger?')) return
    try {
      const result = await adminApi.deleteInvoicePayment(invoiceId, paymentId)
      setInvoice(result.data)
      toast({ title: 'Payment removed', tone: 'success' })
    } catch (caught) {
      toast({
        title: 'Payment not removed',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const removeInvoice = async () => {
    if (!invoice || !window.confirm(`Delete invoice ${invoice.ref} and its payment history?`))
      return
    try {
      await adminApi.deleteInvoice(invoice.id)
      navigate('/admin/invoices')
    } catch (caught) {
      toast({
        title: 'Invoice not deleted',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  if (loading) return <AdminLoading rows={6} />
  if (error || !invoice) return <InlineError message={error || 'Invoice not found.'} />

  const totals = invoice.totals
  const discountRatio = totals.subtotal > 0 ? totals.taxable / totals.subtotal : 0

  return (
    <div className="flex flex-col gap-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={back.to}
            className="flex h-8 items-center gap-1.5 border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint hover:border-cold/50 hover:text-cold"
            aria-label={back.label}
            title={back.label}
          >
            <Icon name="chevron-left" size={14} />
            Back
          </Link>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-cold">
              {invoice.ref}
            </p>
            <h1 className="t-h3 mt-0.5 text-fg">{invoice.customerName}</h1>
          </div>
          <InvoiceStateBadge state={totals.state} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totals.balance > 0 && totals.state !== 'draft' && totals.state !== 'cancelled' ? (
            <Button variant="secondary" icon="mail" onClick={() => void remind()}>
              Remind
            </Button>
          ) : null}
          {totals.balance > 0 && totals.state !== 'cancelled' ? (
            <Button icon="plus" onClick={() => setPayOpen(true)}>
              Record payment
            </Button>
          ) : null}
          <Button variant="secondary" icon="wrench" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>
            Print
          </Button>
          <ButtonAnchor
            href={`/api/v1/admin/invoices/${invoice.id}/pdf`}
            download
            variant="secondary"
            icon="download"
          >
            Download PDF
          </ButtonAnchor>
          <button
            type="button"
            onClick={() => void removeInvoice()}
            className="flex h-9 items-center justify-center border border-line px-3 text-fg-faint hover:border-danger/40 hover:text-danger"
            aria-label="Delete invoice"
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article
          id="invoice-sheet"
          className="invoice-document marks border border-line bg-white p-7 text-[#161616] sm:p-10"
        >
          <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-[#161616] pb-5">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#555]">
                Tax invoice
              </p>
              <h2 className="mt-2 text-[22px] font-semibold leading-tight">
                {content.brand.legalName}
              </h2>
              <p className="mt-2 max-w-[36ch] text-[10px] leading-relaxed text-[#444]">
                {content.brand.address.line1}, {content.brand.address.line2}
                <br />
                {content.brand.address.locality}, {content.brand.address.region}{' '}
                {content.brand.address.postalCode}
                <br />
                {content.brand.contact.phoneDisplay} · {content.brand.contact.email}
              </p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-[#444]">
                EIN {content.brand.gstin}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#555]">
                Invoice
              </p>
              <p className="mt-1 font-mono text-[18px] font-semibold">{invoice.ref}</p>
              <dl className="mt-4 flex flex-col gap-1 text-[10px]">
                <div className="flex justify-end gap-5">
                  <dt className="text-[#666]">Issued</dt>
                  <dd>{formatDate(invoice.issueDate)}</dd>
                </div>
                <div className="flex justify-end gap-5">
                  <dt className="text-[#666]">Due</dt>
                  <dd>{formatDate(invoice.dueDate)}</dd>
                </div>
                <div className="flex justify-end gap-5">
                  <dt className="text-[#666]">Place of supply</dt>
                  <dd>{content.brand.address.region}</dd>
                </div>
              </dl>
            </div>
          </header>

          <section className="grid gap-6 border-b border-[#bbb] py-5 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#666]">
                Billed to
              </p>
              <p className="mt-1.5 text-[13px] font-semibold">{invoice.customerName}</p>
              {invoice.customerAddress ? (
                <p className="mt-1 max-w-[36ch] text-[10px] leading-relaxed text-[#444]">
                  {invoice.customerAddress}
                </p>
              ) : null}
              <p className="mt-1 text-[10px] text-[#444]">
                {[invoice.customerPhone, invoice.customerEmail].filter(Boolean).join(' · ')}
              </p>
              {invoice.customerGstin ? (
                <p className="mt-1 font-mono text-[9px] uppercase text-[#444]">
                  Tax ID {invoice.customerGstin}
                </p>
              ) : null}
            </div>
            <div className="sm:text-right">
              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#666]">
                Against
              </p>
              <p className="mt-1.5 text-[12px]">{invoice.service || 'HVAC service works'}</p>
              {invoice.leadRef ? (
                <p className="mt-1 font-mono text-[9px] uppercase text-[#666]">
                  Lead {invoice.leadRef}
                </p>
              ) : null}
              <p className="mt-4 text-[10px] text-[#444]">
                {invoice.taxMode === 'intra'
                  ? 'In-state sale · state + local sales tax'
                  : 'Out-of-state sale · sales tax exempt'}
              </p>
            </div>
          </section>

          <table className="mt-5 w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-[#161616] text-left font-mono text-[8px] uppercase tracking-[0.08em] text-[#555]">
                <th className="py-2 pr-2 font-normal">#</th>
                <th className="py-2 pr-2 font-normal">Description</th>
                <th className="py-2 pr-2 text-right font-normal">Qty</th>
                <th className="py-2 pr-2 text-right font-normal">Rate</th>
                <th className="py-2 pr-2 text-right font-normal">Taxable</th>
                <th className="py-2 pr-2 text-right font-normal">Tax</th>
                <th className="py-2 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, index) => {
                const gross = line.quantity * line.unitPrice
                const net = gross * discountRatio
                const tax = net * (line.taxPercent / 100)
                return (
                  <tr key={line.id} className="border-b border-[#ddd] align-top">
                    <td className="py-2.5 pr-2 font-mono text-[9px] text-[#777]">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 pr-2">{line.description}</td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{line.quantity}</td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">
                      {formatMoneyExact(line.unitPrice)}
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{formatMoneyExact(net)}</td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{line.taxPercent}%</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {formatMoneyExact(net + tax)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <section className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,1fr)_250px]">
            <div className="flex flex-col gap-3 text-[9px] leading-relaxed text-[#444]">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#555]">
                  Amount in words
                </p>
                <p className="mt-1 text-[10px] capitalize">{amountInWords(totals.total)}</p>
              </div>
              {invoice.notes ? (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#555]">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-line">{invoice.notes}</p>
                </div>
              ) : null}
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#555]">
                  Payment details
                </p>
                <p className="mt-1">
                  {billing.bankName} · A/c {billing.accountName} · {billing.accountNumber} · Routing{' '}
                  {billing.ifsc}
                  {billing.upiId ? ` · Pay link ${billing.upiId}` : ''}
                </p>
              </div>
              {invoice.terms ? (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#555]">
                    Terms
                  </p>
                  <p className="mt-1 whitespace-pre-line">{invoice.terms}</p>
                </div>
              ) : null}
            </div>

            <dl className="flex flex-col gap-1.5 text-[10px]">
              <div className="flex justify-between gap-4 border-b border-[#ddd] pb-1.5">
                <dt className="text-[#666]">Subtotal</dt>
                <dd className="tabular-nums">{formatMoneyExact(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-[#ddd] pb-1.5">
                <dt className="text-[#666]">Discount</dt>
                <dd className="tabular-nums">−{formatMoneyExact(totals.discount)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-[#ddd] pb-1.5">
                <dt className="text-[#666]">Taxable value</dt>
                <dd className="tabular-nums">{formatMoneyExact(totals.taxable)}</dd>
              </div>
              {invoice.taxMode === 'intra' ? (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#666]">State tax</dt>
                    <dd className="tabular-nums">{formatMoneyExact(totals.cgst)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#ddd] pb-1.5">
                    <dt className="text-[#666]">Local tax</dt>
                    <dd className="tabular-nums">{formatMoneyExact(totals.sgst)}</dd>
                  </div>
                </>
              ) : (
                <div className="flex justify-between gap-4 border-b border-[#ddd] pb-1.5">
                  <dt className="text-[#666]">Sales tax</dt>
                  <dd className="tabular-nums">{formatMoneyExact(totals.igst)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-b-2 border-[#161616] py-2 text-[13px] font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoneyExact(totals.total)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666]">Paid</dt>
                <dd className="tabular-nums">{formatMoneyExact(totals.paid)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-[#ddd] pb-1.5 font-semibold">
                <dt>Balance due</dt>
                <dd className="tabular-nums">{formatMoneyExact(totals.balance)}</dd>
              </div>
            </dl>
          </section>

          {invoice.payments.length ? (
            <section className="mt-5 border-t border-[#bbb] pt-4">
              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#555]">
                Payments received
              </p>
              <table className="mt-2 w-full border-collapse text-[9px]">
                <thead>
                  <tr className="border-b border-[#ddd] text-left font-mono text-[8px] uppercase text-[#666]">
                    <th className="py-1.5 font-normal">Date</th>
                    <th className="py-1.5 font-normal">Method</th>
                    <th className="py-1.5 font-normal">Reference</th>
                    <th className="py-1.5 text-right font-normal">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-[#eee]">
                      <td className="py-1.5">{formatDate(payment.receivedAt)}</td>
                      <td className="py-1.5">{METHOD_LABELS[payment.method] ?? payment.method}</td>
                      <td className="py-1.5">{payment.reference || '—'}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatMoneyExact(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <footer className="mt-8 flex flex-wrap items-end justify-between gap-8 border-t border-[#161616] pt-5 text-[9px] text-[#444]">
            <div className="max-w-[48ch] leading-relaxed">
              <p className="font-semibold text-[#161616]">Declaration</p>
              <p className="mt-1">
                We declare that this invoice shows the actual price of the goods and services
                described and that all particulars are true and correct. Goods once installed are
                covered by the warranty stated on the work completion report.
              </p>
              <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.06em]">
                Computer-generated tax invoice · {invoice.ref}
              </p>
            </div>
            <div className="text-right">
              <p>For {content.brand.legalName}</p>
              <div className="mt-8 border-t border-[#161616] pt-2 font-mono text-[8px] uppercase tracking-[0.1em]">
                Authorised signatory
              </div>
            </div>
          </footer>
        </article>

        <aside className="no-print flex flex-col gap-4">
          <section className="border border-line bg-panel/50 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              Settlement
            </p>
            <p className="t-num mt-3 text-[28px] leading-none text-heat">
              {formatMoneyExact(totals.balance)}
            </p>
            <p className="mt-1 text-[11px] text-fg-faint">
              balance of {formatMoneyExact(totals.total)}
            </p>
            <div className="mt-4 flex h-1.5 bg-panel-2">
              <div
                className="h-1.5 bg-success"
                style={{
                  width: `${totals.total ? Math.min(100, (totals.paid / totals.total) * 100) : 0}%`,
                }}
              />
            </div>
            <dl className="mt-4 flex flex-col gap-1.5 text-[11px] text-fg-dim">
              <div className="flex justify-between">
                <dt className="text-fg-faint">Paid</dt>
                <dd>{formatMoneyExact(totals.paid)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-faint">Due</dt>
                <dd>{formatDate(invoice.dueDate)}</dd>
              </div>
              {totals.daysOverdue > 0 ? (
                <div className="flex justify-between text-danger">
                  <dt>Overdue</dt>
                  <dd>{totals.daysOverdue} days</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="border border-line bg-panel/50 p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Payment history
              </p>
              {totals.balance > 0 && totals.state !== 'cancelled' ? (
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  className="font-mono text-[8px] uppercase text-cold hover:text-fg"
                >
                  Add
                </button>
              ) : null}
            </div>
            {invoice.payments.length === 0 ? (
              <p className="mt-3 text-[11px] leading-snug text-fg-faint">
                No payments recorded yet.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col">
                {invoice.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-start justify-between gap-2 border-t border-line py-2 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <p className="text-[11px] text-fg">
                        {formatMoneyExact(payment.amount)} · {METHOD_LABELS[payment.method]}
                      </p>
                      <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
                        {formatDate(payment.receivedAt)} · {payment.reference || 'no reference'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deletePayment(payment.id)}
                      aria-label="Remove payment"
                      className="text-fg-faint hover:text-danger"
                    >
                      <Icon name="close" size={10} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border border-line bg-panel/50 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              Reminders
            </p>
            <p className="mt-2 text-[11px] leading-snug text-fg-dim">
              {invoice.lastReminderAt
                ? `Last reminder ${formatDateTime(invoice.lastReminderAt)}. ${invoice.reminderDates.length} sent in total.`
                : 'No reminder sent yet. Queue one to create a task for tomorrow at 9am.'}
            </p>
            {totals.balance > 0 && totals.state !== 'cancelled' ? (
              <Button
                variant="secondary"
                size="sm"
                icon="mail"
                full
                className="mt-3"
                onClick={() => void remind()}
              >
                Queue payment reminder
              </Button>
            ) : null}
          </section>

          <section className="border border-line bg-panel/50 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">Meta</p>
            <dl className="mt-2 flex flex-col gap-1.5 text-[10px] text-fg-dim">
              <div className="flex justify-between gap-2">
                <dt className="text-fg-faint">Created</dt>
                <dd>{formatDateTime(invoice.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-fg-faint">Updated</dt>
                <dd>{formatDateTime(invoice.updatedAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-fg-faint">Record</dt>
                <dd>{invoice.status}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={`Record payment · ${invoice.ref}`}
        description={`Open balance ${formatMoneyExact(totals.balance)}. A part payment leaves the invoice part paid.`}
      >
        <form onSubmit={recordPayment} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Amount received"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              hint={`Maximum ${formatMoneyExact(totals.balance)}`}
            />
            <Input
              label="Received on"
              type="date"
              required
              value={receivedAt}
              onChange={(event) => setReceivedAt(event.target.value)}
            />
            <Select
              label="Method"
              value={method}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'bank-transfer', label: 'Bank transfer' },
                { value: 'card-on-site', label: 'Card on site' },
              ]}
              onChange={(event) => setMethod(event.target.value as InvoicePaymentInput['method'])}
            />
            <Input
              label="Reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="UTR, cheque no. or receipt"
            />
          </div>
          <Textarea
            label="Notes"
            rows={2}
            value={paymentNotes}
            onChange={(event) => setPaymentNotes(event.target.value)}
            placeholder="Received by, site, or split instruction…"
          />
          <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAmount(String(totals.balance))}
            >
              Fill balance
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setPayOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" icon="check" disabled={busy}>
                {busy ? 'Recording…' : 'Record payment'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit invoice · ${invoice.ref}`}
        description="Payment history is preserved. Changing line items recalculates the balance."
        size="lg"
      >
        <InvoiceForm
          initial={invoice}
          submitLabel="Save changes"
          busy={busy}
          onSubmit={saveInvoice}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  )
}
