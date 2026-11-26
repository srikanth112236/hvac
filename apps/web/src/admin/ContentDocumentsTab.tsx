import type { ReactNode } from 'react'
import type { SiteContent } from '@hvac/shared'
import { Input, Select, Textarea, Toggle } from '@/components/ui'
import type { ContentUpdate } from '@/admin/contentUpdate'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="border border-line bg-panel/20 p-4">
      <h3 className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim">{title}</h3>
      <p className="mt-1 max-w-[80ch] text-[11px] leading-relaxed text-fg-faint">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function rgbParts(value: string): [number, number, number] | null {
  const parts = value.trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null
  return [parts[0]!, parts[1]!, parts[2]!]
}

function toHex(value: string): string {
  const parts = rgbParts(value)
  if (!parts) return '#000000'
  return `#${parts.map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`
}

function fromHex(value: string): string {
  const clean = value.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(clean)) return '0 0 0'
  return [0, 2, 4].map((offset) => String(Number.parseInt(clean.slice(offset, offset + 2), 16))).join(' ')
}

/**
 * Every printed document — invoice sheet, invoice PDF, quotation PDF and the
 * expense report — reads these values, so the paper and the screen cannot drift.
 */
export function ContentDocumentsTab({
  draft,
  update,
}: {
  draft: SiteContent
  update: ContentUpdate
}) {
  const documents = draft.brand.documents ?? {
    accent: '94 200 229',
    paper: 'A4' as const,
    footerNote: '',
    paymentInstructions: '',
    signatureName: 'Authorised signatory',
    showBankDetails: true,
    showSignature: true,
  }

  const patch = (next: Partial<typeof documents>) => {
    update((current) => ({
      ...current,
      brand: { ...current.brand, documents: { ...documents, ...next } },
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Document identity"
        description="The accent rule, paper size and signature used on every invoice, quotation and expense report — in the browser and in the PDF."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
              Accent colour
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                aria-label="Document accent colour"
                value={toHex(documents.accent)}
                onChange={(event) => patch({ accent: fromHex(event.target.value) })}
                className="h-9 w-12 cursor-pointer border border-line bg-panel"
              />
              <Input
                aria-label="Accent RGB triplet"
                value={documents.accent}
                onChange={(event) => patch({ accent: event.target.value })}
              />
            </div>
            <span className="mt-1 block text-[9px] text-fg-faint">
              RGB triplet, e.g. 94 200 229. Printed as a hairline rule at the top of each page.
            </span>
          </div>
          <Select
            label="Paper size"
            value={documents.paper}
            options={[
              { value: 'A4', label: 'A4 · 210 × 297 mm' },
              { value: 'Letter', label: 'Letter · 8.5 × 11 in' },
            ]}
            onChange={(event) => patch({ paper: event.target.value === 'Letter' ? 'Letter' : 'A4' })}
          />
          <Input
            label="Signature label"
            hint="Printed under the signature line, e.g. Authorised signatory."
            value={documents.signatureName}
            onChange={(event) => patch({ signatureName: event.target.value })}
          />
          <Input
            label="Footer note"
            hint="Legal name, address or registration line printed at the foot of the sheet."
            value={documents.footerNote}
            onChange={(event) => patch({ footerNote: event.target.value })}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-6">
          <Toggle
            label="Show signature line"
            description="Adds the signature block to invoices and quotations."
            checked={documents.showSignature}
            onChange={(checked) => patch({ showSignature: checked })}
          />
          <Toggle
            label="Show bank details"
            description="Prints the remittance account on the invoice sheet."
            checked={documents.showBankDetails}
            onChange={(checked) => patch({ showBankDetails: checked })}
          />
        </div>
      </Section>

      <Section
        title="Payment instructions"
        description="Printed beneath the bank details. Keep it to how a customer should pay and what to quote."
      >
        <Textarea
          label="Instructions"
          rows={4}
          value={documents.paymentInstructions}
          onChange={(event) => patch({ paymentInstructions: event.target.value })}
        />
      </Section>

      <section className="border border-line bg-panel/20 p-4">
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Preview</p>
        <div className="mt-3 border border-line bg-white p-5 text-[#161616]">
          <div className="h-[3px] w-full" style={{ backgroundColor: `rgb(${documents.accent})` }} />
          <div className="mt-4 flex items-start justify-between">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#666]">
                Tax invoice
              </p>
              <p className="mt-1 text-[14px] font-semibold">{draft.brand.legalName}</p>
            </div>
            <p className="font-mono text-[11px]">INV-2026-0001</p>
          </div>
          <div className="mt-6 flex items-end justify-between border-t border-[#161616] pt-3 text-[8px] text-[#555]">
            <span>{documents.footerNote || 'Footer note appears here.'}</span>
            {documents.showSignature ? (
              <span className="font-mono uppercase tracking-[0.08em]">
                {documents.signatureName || 'Authorised signatory'}
              </span>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
