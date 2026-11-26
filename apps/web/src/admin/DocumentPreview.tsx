import type { ReactNode } from 'react'
import type {
  InvoiceRecord,
  InvoiceTotals,
  QuotationRecord,
  QuotationTotals,
} from '@hvac/shared'
import { useSiteContent } from '@/content/SiteContentProvider'
import { formatDate, formatMoney } from '@/admin/ui'

function useDocumentChrome() {
  const { content } = useSiteContent()
  const docs = content.brand.documents
  return {
    brand: content.brand,
    accent: docs?.accent || '94 200 229',
    footerNote: docs?.footerNote ?? '',
    signatureName: docs?.signatureName || 'Authorised signatory',
    showSignature: docs?.showSignature !== false,
    paymentInstructions: docs?.paymentInstructions ?? '',
    showBankDetails: docs?.showBankDetails !== false,
  }
}

function Paper({
  docTitle,
  reference,
  children,
}: {
  docTitle: string
  reference: string
  children: ReactNode
}) {
  const { brand, accent, footerNote, signatureName, showSignature } = useDocumentChrome()
  return (
    <div className="invoice-document border border-line bg-white p-4 text-[#161616] shadow-[0_18px_40px_-32px_rgba(0,0,0,0.5)]">
      <div className="h-[3px] w-full" style={{ backgroundColor: `rgb(${accent})` }} />
      <header className="mt-3 flex items-start justify-between gap-4 border-b-2 border-[#161616] pb-3">
        <div className="min-w-0">
          <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-[#555]">{docTitle}</p>
          <p className="mt-1 truncate text-[12px] font-semibold leading-tight">
            {brand.legalName || brand.name}
          </p>
          <p className="mt-1 max-w-[34ch] text-[7.5px] leading-relaxed text-[#555]">
            {brand.address.line1}
            {brand.address.line2 ? `, ${brand.address.line2}` : ''}
            <br />
            {brand.address.locality}, {brand.address.region} {brand.address.postalCode}
            <br />
            {brand.contact.phoneDisplay} · {brand.contact.email}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#555]">
            {docTitle === 'Tax invoice' ? 'Invoice' : docTitle}
          </p>
          <p className="mt-0.5 font-mono text-[12px] font-semibold">{reference}</p>
        </div>
      </header>
      {children}
      <footer className="mt-4 flex items-end justify-between gap-4 border-t border-[#161616] pt-3 text-[7px] text-[#555]">
        <p className="max-w-[46ch] leading-relaxed">
          {footerNote || `${brand.legalName || brand.name} · ${brand.contact.email}`}
        </p>
        {showSignature ? (
          <div className="text-right">
            <p>For {brand.legalName || brand.name}</p>
            <div className="mt-4 border-t border-[#161616] pt-1 font-mono text-[6.5px] uppercase tracking-[0.08em]">
              {signatureName}
            </div>
          </div>
        ) : null}
      </footer>
    </div>
  )
}

function Party({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[6.5px] uppercase tracking-[0.14em] text-[#777]">{title}</p>
      <div className="mt-1 text-[8px] leading-relaxed text-[#333]">{children}</div>
    </div>
  )
}

function LineTable({
  lines,
  subtotal,
  taxable,
  taxLabel = 'Tax',
}: {
  lines: { id: string; description: string; quantity: number; unitPrice: number; taxPercent: number }[]
  subtotal: number
  taxable: number
  taxLabel?: string
}) {
  const ratio = subtotal > 0 ? taxable / subtotal : 0
  return (
    <table className="mt-3 w-full border-collapse text-[7.5px]">
      <thead>
        <tr className="border-b border-[#bbb] text-left font-mono text-[6.5px] uppercase tracking-[0.06em] text-[#666]">
          <th className="py-1 pr-1 font-normal">Description</th>
          <th className="py-1 pr-1 text-right font-normal">Qty</th>
          <th className="py-1 pr-1 text-right font-normal">Rate</th>
          <th className="py-1 pr-1 text-right font-normal">{taxLabel}</th>
          <th className="py-1 text-right font-normal">Amount</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => {
          const net = line.quantity * line.unitPrice * ratio
          const tax = net * (line.taxPercent / 100)
          return (
            <tr key={line.id} className="border-b border-[#eee] align-top">
              <td className="py-1.5 pr-1">{line.description || '—'}</td>
              <td className="py-1.5 pr-1 text-right tabular-nums">{line.quantity}</td>
              <td className="py-1.5 pr-1 text-right tabular-nums">{formatMoney(line.unitPrice)}</td>
              <td className="py-1.5 pr-1 text-right tabular-nums">{line.taxPercent}%</td>
              <td className="py-1.5 text-right tabular-nums">{formatMoney(net + tax)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={
        strong
          ? 'flex justify-between gap-3 border-t-2 border-[#161616] pt-1.5 text-[8.5px] font-semibold'
          : 'flex justify-between gap-3'
      }
    >
      <span className={strong ? '' : 'text-[#666]'}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

/** What the customer receives, rendered from the exact same totals the API stores. */
export function InvoicePreview({
  record,
  totals,
}: {
  record: InvoiceRecord
  totals: InvoiceTotals
}) {
  const { showBankDetails, paymentInstructions, brand } = useDocumentChrome()
  const billing = brand.billing
  const bankLine = showBankDetails
    ? [
        billing.bankName,
        billing.accountName ? `A/c ${billing.accountName}` : '',
        billing.accountNumber,
        billing.ifsc ? `Routing ${billing.ifsc}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : ''
  return (
    <Paper docTitle="Tax invoice" reference={record.ref || 'DRAFT'}>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Party title="Billed to">
          <p className="font-semibold">{record.customerName || 'Customer name'}</p>
          {record.customerAddress ? <p>{record.customerAddress}</p> : null}
          <p>{[record.customerPhone, record.customerEmail].filter(Boolean).join(' · ')}</p>
          {record.customerGstin ? <p>Tax ID {record.customerGstin}</p> : null}
        </Party>
        <div className="grid gap-1 text-right text-[8px] text-[#444] sm:justify-self-end">
          <p>
            <span className="text-[#666]">Issued </span>
            {record.issueDate ? formatDate(record.issueDate) : '—'}
          </p>
          <p>
            <span className="text-[#666]">Due </span>
            {record.dueDate ? formatDate(record.dueDate) : '—'}
          </p>
          <p className="capitalize">{record.status}</p>
        </div>
      </div>

      <LineTable
        lines={record.lines}
        subtotal={totals.subtotal}
        taxable={totals.taxable}
        taxLabel={record.taxMode === 'intra' ? 'Tax' : 'Tax'}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
        <div className="flex flex-col gap-2 text-[7.5px] leading-relaxed text-[#444]">
          {record.notes ? (
            <div>
              <p className="font-mono text-[6.5px] uppercase tracking-[0.12em] text-[#777]">Notes</p>
              <p className="whitespace-pre-line">{record.notes}</p>
            </div>
          ) : null}
          {bankLine || paymentInstructions ? (
            <div>
              <p className="font-mono text-[6.5px] uppercase tracking-[0.12em] text-[#777]">
                Payment details
              </p>
              {bankLine ? <p>{bankLine}</p> : null}
              {paymentInstructions ? (
                <p className="mt-0.5 text-[#666]">{paymentInstructions}</p>
              ) : null}
            </div>
          ) : null}
          {record.terms ? (
            <div>
              <p className="font-mono text-[6.5px] uppercase tracking-[0.12em] text-[#777]">Terms</p>
              <p className="whitespace-pre-line">{record.terms}</p>
            </div>
          ) : null}
        </div>
        <dl className="flex flex-col gap-1 text-[8px]">
          <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
          <Row label="Discount" value={`−${formatMoney(totals.discount)}`} />
          <Row label="Taxable" value={formatMoney(totals.taxable)} />
          {record.taxMode === 'intra' ? (
            <>
              <Row label="State tax" value={formatMoney(totals.cgst)} />
              <Row label="Local tax" value={formatMoney(totals.sgst)} />
            </>
          ) : (
            <Row label="Sales tax" value={formatMoney(totals.igst)} />
          )}
          <Row label="Total" value={formatMoney(totals.total)} strong />
          {totals.paid > 0 || totals.credited > 0 ? (
            <>
              <Row label="Paid" value={formatMoney(totals.paid)} />
              <Row label="Credited" value={formatMoney(totals.credited)} />
              <Row label="Balance due" value={formatMoney(totals.balance)} />
            </>
          ) : null}
        </dl>
      </div>
    </Paper>
  )
}

export function QuotationPreview({
  record,
  totals,
  customerName,
}: {
  record: QuotationRecord
  totals: QuotationTotals
  customerName: string
}) {
  return (
    <Paper docTitle="Quotation" reference={record.ref || 'DRAFT'}>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Party title="Prepared for">
          <p className="font-semibold">{customerName || 'Choose a customer'}</p>
        </Party>
        <div className="grid gap-1 text-right text-[8px] text-[#444] sm:justify-self-end">
          <p>
            <span className="text-[#666]">Valid until </span>
            {record.validUntil ? formatDate(record.validUntil) : '—'}
          </p>
          <p className="capitalize">{record.status.replace(/-/g, ' ')}</p>
        </div>
      </div>

      <p className="mt-3 text-[9px] font-semibold">{record.title || 'Quotation title'}</p>
      {record.service ? <p className="text-[7.5px] text-[#555]">{record.service}</p> : null}

      <LineTable lines={record.lines} subtotal={totals.subtotal} taxable={totals.taxable} />

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
        <div className="flex flex-col gap-2 text-[7.5px] leading-relaxed text-[#444]">
          {record.notes ? (
            <div>
              <p className="font-mono text-[6.5px] uppercase tracking-[0.12em] text-[#777]">Notes</p>
              <p className="whitespace-pre-line">{record.notes}</p>
            </div>
          ) : null}
          {record.terms ? (
            <div>
              <p className="font-mono text-[6.5px] uppercase tracking-[0.12em] text-[#777]">Terms</p>
              <p className="whitespace-pre-line">{record.terms}</p>
            </div>
          ) : null}
        </div>
        <dl className="flex flex-col gap-1 text-[8px]">
          <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
          <Row label="Discount" value={`−${formatMoney(totals.discount)}`} />
          <Row label="Taxable value" value={formatMoney(totals.taxable)} />
          <Row label="Tax" value={formatMoney(totals.taxTotal)} />
          <Row label="Total" value={formatMoney(totals.total)} strong />
        </dl>
      </div>
    </Paper>
  )
}

/** Small header above either sheet. */
export function LivePreviewBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cold" />
        Live preview
      </span>
      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">{label}</span>
    </div>
  )
}
