import type { Response } from 'express'
import PDFDocument from 'pdfkit'
import type { InvoiceWithTotals, QuotationRecord, QuotationTotals } from '@hvac/shared'

export interface PdfBrand {
  name: string
  legalName: string
  contact: { phone: string; phoneDisplay?: string; email: string }
  gstin?: string
  address: {
    line1: string
    line2: string
    locality: string
    region: string
    postalCode: string
    country: string
  }
  billing: {
    bankName: string
    accountName: string
    accountNumber: string
    ifsc: string
    upiId: string
    invoiceTerms: string
  }
  documents?: {
    accent: string
    paper: 'A4' | 'Letter'
    footerNote: string
    paymentInstructions: string
    signatureName: string
    showBankDetails: boolean
    showSignature: boolean
  }
}

/** Documents settings store RGB triplets; PDFKit needs a hex string. */
function accentHex(brand: PdfBrand): string {
  const parts = (brand.documents?.accent ?? '').trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return INK
  return `#${parts
    .map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, '0'))
    .join('')}`
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const PAGE_LEFT = 36
const PAGE_RIGHT = 559
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_LEFT
const INK = '#161616'
const MUTED = '#666666'
const BODY = '#444444'
const RULE = '#bbbbbb'
const SOFT_RULE = '#dddddd'
const MONO = 'Courier'
const SANS = 'Helvetica'
const SANS_BOLD = 'Helvetica-Bold'

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
  return `${parts.join(' ')} dollars only`.replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function hairline(doc: PDFKit.PDFDocument, y: number, color = SOFT_RULE, width = 0.7): void {
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).lineWidth(width).strokeColor(color).stroke()
}

function smallLabel(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width?: number) {
  doc
    .font(MONO)
    .fontSize(6.5)
    .fillColor(MUTED)
    .text(text.toUpperCase(), x, y, { width, characterSpacing: 0.8 })
}

function documentHeader(
  doc: PDFKit.PDFDocument,
  brand: PdfBrand,
  options: {
    title: string
    reference: string
    subtitle?: string
    meta: [string, string][]
  },
): number {
  smallLabel(doc, options.title, PAGE_LEFT, 38)
  doc.rect(PAGE_LEFT, 26, CONTENT_WIDTH, 3).fill(accentHex(brand))
  doc
    .font(SANS_BOLD)
    .fontSize(17)
    .fillColor(INK)
    .text(brand.legalName || brand.name, PAGE_LEFT, 50, { width: 300 })
  doc.font(SANS).fontSize(8).fillColor(BODY)
  const addressLines = [
    [brand.address.line1, brand.address.line2].filter(Boolean).join(', '),
    `${brand.address.locality}, ${brand.address.region} ${brand.address.postalCode}`.trim(),
    [brand.contact.phoneDisplay ?? brand.contact.phone, brand.contact.email]
      .filter(Boolean)
      .join(' · '),
  ].filter(Boolean)
  let infoY = 74
  for (const line of addressLines) {
    const height = doc.heightOfString(line, { width: 300, lineGap: 1 })
    doc.text(line, PAGE_LEFT, infoY, {
      width: 300,
      lineGap: 1,
    })
    infoY += Math.max(11, height + 1)
  }
  if (brand.gstin) {
    doc.font(MONO).fontSize(6.5).fillColor(BODY).text(`EIN ${brand.gstin}`, PAGE_LEFT, infoY, {
      width: 300,
      characterSpacing: 0.5,
    })
  }

  doc
    .font(MONO)
    .fontSize(6.5)
    .fillColor(MUTED)
    .text(options.title === 'Tax invoice' ? 'INVOICE' : options.title.toUpperCase(), 430, 38, {
      width: 129,
      align: 'right',
      characterSpacing: 1.2,
    })
  doc
    .font(SANS_BOLD)
    .fontSize(15)
    .fillColor(INK)
    .text(options.reference, 400, 51, { width: 159, align: 'right' })
  let metaY = 76
  for (const [label, value] of options.meta) {
    doc.font(SANS).fontSize(8).fillColor(MUTED).text(label, 390, metaY, {
      width: 66,
      align: 'right',
    })
    doc.fillColor(INK).text(value, 458, metaY, { width: 101, align: 'right' })
    metaY += 11
  }
  doc.moveTo(PAGE_LEFT, 124).lineTo(PAGE_RIGHT, 124).lineWidth(1.6).strokeColor(INK).stroke()
  return 138
}

function parties(
  doc: PDFKit.PDFDocument,
  left: { label: string; name: string; lines?: (string | undefined | null)[]; tag?: string },
  right: { label: string; title: string; lines?: (string | undefined | null)[]; tag?: string },
): number {
  smallLabel(doc, left.label, PAGE_LEFT, 138, 250)
  doc.font(SANS_BOLD).fontSize(10).fillColor(INK).text(left.name, PAGE_LEFT, 152, { width: 250 })
  let leftY = 168
  for (const line of left.lines ?? []) {
    if (!line) continue
    doc.font(SANS).fontSize(8.3).fillColor(BODY).text(line, PAGE_LEFT, leftY, {
      width: 250,
      lineGap: 1,
    })
    leftY += doc.heightOfString(line, { width: 250 }) + 2
  }
  if (left.tag) {
    doc
      .font(MONO)
      .fontSize(7)
      .fillColor(BODY)
      .text(left.tag.toUpperCase(), PAGE_LEFT, leftY + 1, {
        width: 250,
        characterSpacing: 0.4,
      })
    leftY += 12
  }

  const rightX = 310
  const rightWidth = 249
  smallLabel(doc, right.label, rightX, 138, rightWidth)
  doc
    .font(SANS)
    .fontSize(9)
    .fillColor(INK)
    .text(right.title, rightX, 152, { width: rightWidth, align: 'right' })
  let rightY = 168
  for (const line of right.lines ?? []) {
    if (!line) continue
    doc.text(line, rightX, rightY, { width: rightWidth, align: 'right', lineGap: 1 })
    rightY += doc.heightOfString(line, { width: rightWidth }) + 2
  }
  if (right.tag) {
    doc
      .font(MONO)
      .fontSize(7)
      .fillColor(MUTED)
      .text(right.tag.toUpperCase(), rightX, rightY + 2, {
        width: rightWidth,
        align: 'right',
        characterSpacing: 0.4,
      })
    rightY += 13
  }
  const nextY = Math.max(leftY, rightY, 184)
  hairline(doc, nextY, RULE, 0.7)
  return nextY + 12
}

function invoiceTable(
  doc: PDFKit.PDFDocument,
  invoice: InvoiceWithTotals,
  startY: number,
  discountRatio: number,
): number {
  let y = startY
  const columns = [
    { key: 'index', label: '#', x: PAGE_LEFT, width: 20, align: 'left' as const },
    { key: 'description', label: 'Description', x: 58, width: 178, align: 'left' as const },
    { key: 'quantity', label: 'Qty', x: 238, width: 34, align: 'right' as const },
    { key: 'rate', label: 'Rate', x: 274, width: 55, align: 'right' as const },
    { key: 'taxable', label: 'Taxable', x: 331, width: 58, align: 'right' as const },
    { key: 'tax', label: 'Tax', x: 391, width: 34, align: 'right' as const },
    { key: 'amount', label: 'Amount', x: 427, width: 132, align: 'right' as const },
  ]
  const drawHead = () => {
    doc.font(MONO).fontSize(6.5).fillColor(MUTED)
    for (const column of columns) {
      doc.text(column.label.toUpperCase(), column.x, y, {
        width: column.width,
        align: column.align,
        characterSpacing: 0.5,
      })
    }
    y += 13
    hairline(doc, y, INK, 1)
    y += 7
  }
  drawHead()
  for (const [index, line] of invoice.lines.entries()) {
    const gross = line.quantity * line.unitPrice
    const net = gross * discountRatio
    const tax = net * (line.taxPercent / 100)
    const rowHeight = Math.max(
      18,
      doc.heightOfString(line.description, { width: 178, lineGap: 1 }) + 8,
    )
    if (y + rowHeight > 720) {
      doc.addPage()
      y = 42
      drawHead()
    }
    doc.font(SANS).fontSize(8.5).fillColor(INK)
    doc.text(String(index + 1).padStart(2, '0'), PAGE_LEFT, y, {
      width: 20,
      lineGap: 1,
    })
    doc.text(line.description, 58, y, { width: 178, lineGap: 1 })
    doc.text(String(line.quantity), 238, y, { width: 34, align: 'right' })
    doc.text(money.format(line.unitPrice), 274, y, { width: 55, align: 'right' })
    doc.text(money.format(net), 331, y, { width: 58, align: 'right' })
    doc.text(`${line.taxPercent}%`, 391, y, { width: 34, align: 'right' })
    doc.text(money.format(net + tax), 427, y, { width: 132, align: 'right' })
    y += rowHeight
    hairline(doc, y - 4, SOFT_RULE, 0.6)
  }
  return y + 10
}

function invoiceSummary(
  doc: PDFKit.PDFDocument,
  invoice: InvoiceWithTotals,
  brand: PdfBrand,
  startY: number,
): number {
  const totals = invoice.totals
  let y = startY
  const leftWidth = 270
  const rightX = 352
  const rightWidth = 207
  const wordsHeight = doc.heightOfString(amountInWords(totals.total), {
    width: leftWidth,
    lineGap: 1,
  })
  const notesHeight = invoice.notes
    ? doc.heightOfString(invoice.notes, { width: leftWidth, lineGap: 1 })
    : 0
  const paymentDetails = `${brand.billing.bankName} · A/c ${brand.billing.accountName} · ${brand.billing.accountNumber} · Routing ${brand.billing.ifsc}${brand.billing.upiId ? ` · Pay link ${brand.billing.upiId}` : ''}`
  const paymentHeight = doc.heightOfString(paymentDetails, { width: leftWidth, lineGap: 1 })
  const termsHeight = invoice.terms
    ? doc.heightOfString(invoice.terms, { width: leftWidth, lineGap: 1 })
    : 0
  const leftHeight =
    16 +
    wordsHeight +
    (invoice.notes ? 26 + notesHeight : 0) +
    26 +
    paymentHeight +
    (invoice.terms ? 26 + termsHeight : 0)
  const totalsRows = [
    ['Subtotal', money.format(totals.subtotal), false],
    ['Discount', `-${money.format(totals.discount)}`, false],
    ['Taxable value', money.format(totals.taxable), false],
    ...(invoice.taxMode === 'intra'
      ? [
          ['State tax', money.format(totals.cgst), false],
          ['Local tax', money.format(totals.sgst), false],
        ]
      : [['Sales tax', money.format(totals.igst), false]]),
    ['Total', money.format(totals.total), true],
    ['Paid', money.format(totals.paid), false],
    ['Balance due', money.format(totals.balance), true],
  ] as [string, string, boolean][]
  const totalsHeight = totalsRows.length * 14 + 10
  if (y + Math.max(leftHeight, totalsHeight) > 760) {
    doc.addPage()
    y = 42
  }
  const top = y

  smallLabel(doc, 'Amount in words', PAGE_LEFT, top, leftWidth)
  doc
    .font(SANS)
    .fontSize(8.3)
    .fillColor(INK)
    .text(amountInWords(totals.total), PAGE_LEFT, top + 11, {
      width: leftWidth,
      lineGap: 1,
    })
  let leftY = top + 13 + wordsHeight
  if (invoice.notes) {
    smallLabel(doc, 'Notes', PAGE_LEFT, leftY + 10, leftWidth)
    doc
      .font(SANS)
      .fontSize(8.1)
      .fillColor(BODY)
      .text(invoice.notes, PAGE_LEFT, leftY + 21, {
        width: leftWidth,
        lineGap: 1,
      })
    leftY += 23 + notesHeight
  }
  smallLabel(doc, 'Payment details', PAGE_LEFT, leftY + 10, leftWidth)
  doc
    .font(SANS)
    .fontSize(8.1)
    .fillColor(BODY)
    .text(paymentDetails, PAGE_LEFT, leftY + 21, {
      width: leftWidth,
      lineGap: 1,
    })
  leftY += 23 + paymentHeight
  if (invoice.terms) {
    smallLabel(doc, 'Terms', PAGE_LEFT, leftY + 10, leftWidth)
    doc
      .font(SANS)
      .fontSize(8.1)
      .fillColor(BODY)
      .text(invoice.terms, PAGE_LEFT, leftY + 21, {
        width: leftWidth,
        lineGap: 1,
      })
    leftY += 23 + termsHeight
  }

  let rowY = top
  for (const [label, value, strong] of totalsRows) {
    doc
      .font(strong ? SANS_BOLD : SANS)
      .fontSize(strong ? 9.2 : 8.3)
      .fillColor(INK)
    doc.text(label, rightX, rowY, { width: 105, align: 'right' })
    doc.text(value, rightX + 112, rowY, { width: rightWidth - 112, align: 'right' })
    rowY += strong ? 17 : 13
    if (label === 'Total') {
      doc
        .moveTo(rightX, rowY - 4)
        .lineTo(PAGE_RIGHT, rowY - 4)
        .lineWidth(1)
        .strokeColor(INK)
        .stroke()
      rowY += 3
    } else if (label !== 'Balance due') {
      hairline(doc, rowY - 4, SOFT_RULE, 0.5)
    }
  }
  return Math.max(leftY, rowY) + 10
}

function payments(doc: PDFKit.PDFDocument, invoice: InvoiceWithTotals, startY: number): number {
  if (!invoice.payments.length) return startY
  let y = startY
  if (y > 700) {
    doc.addPage()
    y = 42
  }
  hairline(doc, y, RULE, 0.7)
  y += 9
  smallLabel(doc, 'Payments received', PAGE_LEFT, y, CONTENT_WIDTH)
  y += 12
  doc.font(MONO).fontSize(6.5).fillColor(MUTED)
  doc.text('DATE', PAGE_LEFT, y, { width: 80 })
  doc.text('METHOD', 126, y, { width: 100 })
  doc.text('REFERENCE', 236, y, { width: 170 })
  doc.text('AMOUNT', 420, y, { width: 139, align: 'right' })
  y += 11
  hairline(doc, y, SOFT_RULE, 0.5)
  y += 7
  for (const payment of invoice.payments) {
    if (y > 760) {
      doc.addPage()
      y = 42
    }
    doc.font(SANS).fontSize(8).fillColor(INK)
    doc.text(formatDate(payment.receivedAt), PAGE_LEFT, y, { width: 80 })
    doc.text(payment.method, 126, y, { width: 100 })
    doc.text(payment.reference || '-', 236, y, { width: 170 })
    doc.text(money.format(payment.amount), 420, y, { width: 139, align: 'right' })
    y += 12
    hairline(doc, y - 3, '#eeeeee', 0.4)
  }
  return y + 9
}

function documentFooter(doc: PDFKit.PDFDocument, brand: PdfBrand, reference: string): void {
  let y = doc.y
  if (y > 760) {
    doc.addPage()
    y = 50
  }
  hairline(doc, y, INK, 0.8)
  y += 10
  doc.font(SANS_BOLD).fontSize(8).fillColor(INK).text('Declaration', PAGE_LEFT, y)
  doc
    .font(SANS)
    .fontSize(7.6)
    .fillColor(BODY)
    .text(
      'We declare that this invoice shows the actual price of the goods and services described and that all particulars are true and correct. Goods once installed are covered by the warranty stated on the work completion report.',
      PAGE_LEFT,
      y + 12,
      { width: 330, lineGap: 1.5 },
    )
  doc
    .font(MONO)
    .fontSize(6.5)
    .fillColor(MUTED)
    .text(`COMPUTER-GENERATED TAX INVOICE · ${reference}`, PAGE_LEFT, y + 40, {
      width: 330,
      characterSpacing: 0.4,
    })
  if (brand.documents?.footerNote) {
    doc
      .font(SANS)
      .fontSize(6.8)
      .fillColor(MUTED)
      .text(brand.documents.footerNote, PAGE_LEFT, y + 48, { width: 330 })
  }
  const signatureY = y + 8
  if (brand.documents?.showSignature !== false) {
    doc
      .font(SANS)
      .fontSize(8)
      .fillColor(BODY)
      .text(`For ${brand.legalName || brand.name}`, 390, signatureY, {
        width: 169,
        align: 'right',
      })
    doc
      .moveTo(394, signatureY + 26)
      .lineTo(547, signatureY + 26)
      .lineWidth(0.8)
      .strokeColor(INK)
      .stroke()
  }
  doc
    .font(MONO)
    .fontSize(6.5)
    .fillColor(MUTED)
    .text((brand.documents?.signatureName || 'Authorised signatory').toUpperCase(), 390, signatureY + 30, {
      width: 169,
      align: 'right',
      characterSpacing: 0.4,
    })
}

function quotationTable(
  doc: PDFKit.PDFDocument,
  quotation: QuotationRecord,
  startY: number,
): number {
  let y = startY
  const columns = [
    { label: 'Description', x: PAGE_LEFT, width: 258, align: 'left' as const },
    { label: 'Qty', x: 300, width: 36, align: 'right' as const },
    { label: 'Rate', x: 344, width: 62, align: 'right' as const },
    { label: 'Tax', x: 414, width: 40, align: 'right' as const },
    { label: 'Amount', x: 462, width: 97, align: 'right' as const },
  ]
  const drawHead = () => {
    doc.font(MONO).fontSize(6.5).fillColor(MUTED)
    for (const column of columns) {
      doc.text(column.label.toUpperCase(), column.x, y, {
        width: column.width,
        align: column.align,
        characterSpacing: 0.5,
      })
    }
    y += 13
    hairline(doc, y, RULE, 0.8)
    y += 7
  }
  drawHead()
  for (const line of quotation.lines) {
    const rowHeight = Math.max(
      18,
      doc.heightOfString(line.description, { width: 258, lineGap: 1 }) + 8,
    )
    if (y + rowHeight > 720) {
      doc.addPage()
      y = 42
      drawHead()
    }
    doc.font(SANS).fontSize(8.5).fillColor(INK)
    doc.text(line.description, PAGE_LEFT, y, { width: 258, lineGap: 1 })
    doc.text(String(line.quantity), 300, y, { width: 36, align: 'right' })
    doc.text(money.format(line.unitPrice), 344, y, { width: 62, align: 'right' })
    doc.text(`${line.taxPercent}%`, 414, y, { width: 40, align: 'right' })
    doc.text(money.format(line.quantity * line.unitPrice), 462, y, {
      width: 97,
      align: 'right',
    })
    y += rowHeight
    hairline(doc, y - 4, SOFT_RULE, 0.6)
  }
  return y + 12
}

function quotationTotals(
  doc: PDFKit.PDFDocument,
  quotation: QuotationRecord & { totals: QuotationTotals },
  startY: number,
): number {
  let y = startY
  if (y > 710) {
    doc.addPage()
    y = 42
  }
  const rows: [string, string, boolean][] = [
    ['Subtotal', money.format(quotation.totals.subtotal), false],
    ['Discount', `-${money.format(quotation.totals.discount)}`, false],
    ['Tax', money.format(quotation.totals.taxTotal), false],
    ['Total', money.format(quotation.totals.total), true],
  ]
  let rowY = y
  for (const [label, value, strong] of rows) {
    doc
      .font(strong ? SANS_BOLD : SANS)
      .fontSize(strong ? 10 : 8.3)
      .fillColor(INK)
    doc.text(label, 344, rowY, { width: 105, align: 'right' })
    doc.text(value, 450, rowY, { width: 109, align: 'right' })
    rowY += strong ? 17 : 14
    if (label === 'Total') {
      doc
        .moveTo(344, rowY - 4)
        .lineTo(PAGE_RIGHT, rowY - 4)
        .lineWidth(1)
        .strokeColor(INK)
        .stroke()
      rowY += 3
    } else {
      hairline(doc, rowY - 4, SOFT_RULE, 0.5)
    }
  }
  return rowY
}

function quotationFooter(
  doc: PDFKit.PDFDocument,
  brand: PdfBrand,
  quotation: QuotationRecord,
): void {
  let y = doc.y
  if (y > 740) {
    doc.addPage()
    y = 50
  }
  hairline(doc, y, INK, 0.8)
  y += 10
  smallLabel(doc, 'Notes and terms', PAGE_LEFT, y, CONTENT_WIDTH)
  const copy = [quotation.notes, quotation.terms].filter(Boolean).join('  ')
  doc
    .font(SANS)
    .fontSize(7.6)
    .fillColor(BODY)
    .text(copy || 'This quotation is valid until the date shown above.', PAGE_LEFT, y + 12, {
      width: 340,
      lineGap: 1.5,
    })
  doc
    .font(MONO)
    .fontSize(6.5)
    .fillColor(MUTED)
    .text(`COMPUTER-GENERATED QUOTATION · ${quotation.ref}`, PAGE_LEFT, y + 40, {
      width: 340,
      characterSpacing: 0.4,
    })
  doc
    .font(SANS)
    .fontSize(8)
    .fillColor(BODY)
    .text(`For ${brand.legalName || brand.name}`, 390, y + 8, {
      width: 169,
      align: 'right',
    })
  doc
    .moveTo(394, y + 34)
    .lineTo(547, y + 34)
    .lineWidth(0.8)
    .strokeColor(INK)
    .stroke()
  doc
    .font(MONO)
    .fontSize(6.5)
    .fillColor(MUTED)
    .text((brand.documents?.signatureName || 'Authorised signatory').toUpperCase(), 390, y + 38, {
      width: 169,
      align: 'right',
      characterSpacing: 0.4,
    })
}

function stream(
  res: Response,
  filename: string,
  build: (doc: PDFKit.PDFDocument) => void,
  paper: 'A4' | 'Letter' = 'A4',
): void {
  const doc = new PDFDocument({ size: paper, margin: PAGE_LEFT, autoFirstPage: true })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'private, no-store')
  doc.pipe(res)
  build(doc)
  doc.end()
}

export function streamInvoicePdf(res: Response, invoice: InvoiceWithTotals, brand: PdfBrand): void {
  stream(res, `${invoice.ref}.pdf`, (doc) => {
    let y = documentHeader(doc, brand, {
      title: 'Tax invoice',
      reference: invoice.ref,
      meta: [
        ['Issued', formatDate(invoice.issueDate)],
        ['Due', formatDate(invoice.dueDate)],
        ['Place of supply', brand.address.region],
      ],
    })
    y = parties(
      doc,
      {
        label: 'Billed to',
        name: invoice.customerName,
        lines: [
          invoice.customerAddress,
          [invoice.customerPhone, invoice.customerEmail].filter(Boolean).join(' · '),
        ],
        tag: invoice.customerGstin ? `Tax ID ${invoice.customerGstin}` : undefined,
      },
      {
        label: 'Against',
        title: invoice.service || 'HVAC service works',
        lines: [
          invoice.leadRef ? `Lead ${invoice.leadRef}` : undefined,
          invoice.taxMode === 'intra'
            ? 'In-state sale · state + local sales tax'
            : 'Out-of-state sale · sales tax exempt',
        ],
      },
    )
    const discountRatio =
      invoice.totals.subtotal > 0 ? invoice.totals.taxable / invoice.totals.subtotal : 0
    y = invoiceTable(doc, invoice, y, discountRatio)
    y = invoiceSummary(doc, invoice, brand, y)
    y = payments(doc, invoice, y)
    doc.y = y
    documentFooter(doc, brand, invoice.ref)
  }, brand.documents?.paper ?? 'A4')
}

export function streamQuotationPdf(
  res: Response,
  quotation: QuotationRecord & { totals: QuotationTotals },
  brand: PdfBrand,
  customer: { name: string; phone?: string; email?: string; address?: string },
): void {
  stream(res, `${quotation.ref}.pdf`, (doc) => {
    let y = documentHeader(doc, brand, {
      title: 'Quotation',
      reference: quotation.ref,
      meta: [
        ['Issued', formatDate(quotation.createdAt)],
        ['Valid until', formatDate(quotation.validUntil)],
        ['Status', quotation.status.replace(/-/g, ' ')],
      ],
    })
    y = parties(
      doc,
      {
        label: 'Prepared for',
        name: customer.name,
        lines: [customer.address, [customer.phone, customer.email].filter(Boolean).join(' · ')],
      },
      {
        label: 'Quotation',
        title: quotation.title,
        lines: [
          quotation.service || 'Defined scope',
          quotation.leadRef ? `Lead ${quotation.leadRef}` : undefined,
          `Total ${money.format(quotation.totals.total)}`,
        ],
      },
    )
    y = quotationTable(doc, quotation, y)
    y = quotationTotals(doc, quotation, y)
    doc.y = y + 6
    quotationFooter(doc, brand, quotation)
  }, brand.documents?.paper ?? 'A4')
}
