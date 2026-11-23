import type { Response } from 'express'
import PDFDocument from 'pdfkit'
import type { InvoiceWithTotals, QuotationRecord, QuotationTotals } from '@hvac/shared'

interface PdfBrand {
  name: string
  legalName: string
  contact: { phone: string; email: string }
  address: { line1: string; line2: string; locality: string; region: string; postalCode: string; country: string }
  billing: { bankName: string; accountName: string; accountNumber: string; ifsc: string; upiId: string; invoiceTerms: string }
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const PAGE_LEFT = 48
const PAGE_RIGHT = 547
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_LEFT

function addHeader(doc: PDFKit.PDFDocument, brand: PdfBrand, title: string, reference: string, date: string) {
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#12161a').text(brand.name, PAGE_LEFT, 44)
  doc.font('Helvetica').fontSize(9).fillColor('#5d6873').text(brand.legalName, PAGE_LEFT, 70)
  doc
    .fontSize(8)
    .text(
      [brand.address.line1, brand.address.line2, `${brand.address.locality}, ${brand.address.region} ${brand.address.postalCode}`]
        .filter(Boolean)
        .join(' · '),
      PAGE_LEFT,
      84,
      { width: 300 },
    )
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#12161a').text(title.toUpperCase(), 360, 44, {
    width: 187,
    align: 'right',
  })
  doc.font('Helvetica').fontSize(9).text(reference, 360, 72, { width: 187, align: 'right' })
  doc.text(date, 360, 86, { width: 187, align: 'right' })
  doc.moveTo(PAGE_LEFT, 116).lineTo(PAGE_RIGHT, 116).strokeColor('#d8d3c8').stroke()
}

function addParties(
  doc: PDFKit.PDFDocument,
  brand: PdfBrand,
  customer: { name: string; phone?: string; email?: string; address?: string; gstin?: string },
) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7480').text('PREPARED FOR', PAGE_LEFT, 132)
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#12161a').text(customer.name, PAGE_LEFT, 146, { width: 230 })
  doc.font('Helvetica').fontSize(9).fillColor('#3b4652')
  let y = 162
  for (const line of [customer.address, customer.phone, customer.email, customer.gstin ? `Tax ID ${customer.gstin}` : '']) {
    if (!line) continue
    doc.text(String(line), PAGE_LEFT, y, { width: 230 })
    y += 12
  }
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7480').text('FROM', 330, 132)
  doc.font('Helvetica').fontSize(9).fillColor('#3b4652').text(brand.name, 330, 146, { width: 217 })
  doc.text(brand.contact.phone, 330, 160, { width: 217 })
  doc.text(brand.contact.email, 330, 172, { width: 217 })
}

function addTable(
  doc: PDFKit.PDFDocument,
  lines: { description: string; quantity: number; unitPrice: number; taxPercent: number }[],
  startY: number,
) {
  let y = startY
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7480')
  doc.text('DESCRIPTION', PAGE_LEFT, y)
  doc.text('QTY', 340, y, { width: 45, align: 'right' })
  doc.text('RATE', 395, y, { width: 65, align: 'right' })
  doc.text('AMOUNT', 465, y, { width: 82, align: 'right' })
  y += 14
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).strokeColor('#d8d3c8').stroke()
  y += 8
  doc.font('Helvetica').fontSize(9).fillColor('#12161a')
  for (const line of lines) {
    const height = Math.max(16, doc.heightOfString(line.description, { width: 270 }))
    if (y + height > 700) {
      doc.addPage()
      y = 48
    }
    doc.text(line.description, PAGE_LEFT, y, { width: 270 })
    doc.text(String(line.quantity), 340, y, { width: 45, align: 'right' })
    doc.text(money.format(line.unitPrice), 395, y, { width: 65, align: 'right' })
    doc.text(money.format(line.quantity * line.unitPrice), 465, y, { width: 82, align: 'right' })
    y += height + 8
    doc.moveTo(PAGE_LEFT, y - 4).lineTo(PAGE_RIGHT, y - 4).strokeColor('#eeeae0').stroke()
  }
  return y
}

function addTotals(
  doc: PDFKit.PDFDocument,
  totals: { subtotal: number; discount: number; taxTotal: number; total: number; paid?: number; balance?: number },
  y: number,
) {
  const rows: [string, string][] = [
    ['Subtotal', money.format(totals.subtotal)],
    ['Discount', `-${money.format(totals.discount)}`],
    ['Tax', money.format(totals.taxTotal)],
    ['Total', money.format(totals.total)],
  ]
  if (typeof totals.paid === 'number') rows.push(['Paid', money.format(totals.paid)])
  if (typeof totals.balance === 'number') rows.push(['Balance due', money.format(totals.balance)])
  const start = Math.max(y + 8, 620)
  for (const [index, [label, value]] of rows.entries()) {
    const rowY = start + index * 16
    doc.font(index === rows.length - 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#12161a')
    doc.text(label, 360, rowY, { width: 100, align: 'right' })
    doc.text(value, 465, rowY, { width: 82, align: 'right' })
  }
  return start + rows.length * 16
}

function addFooter(doc: PDFKit.PDFDocument, brand: PdfBrand, notes: string, terms: string) {
  doc.font('Helvetica').fontSize(7.5).fillColor('#6b7480')
  const content = [notes, terms, brand.billing.invoiceTerms].filter(Boolean).join('  ')
  doc.text(content, PAGE_LEFT, 760, { width: CONTENT_WIDTH, align: 'left' })
  doc.text(`${brand.name} · ${brand.contact.email} · ${brand.contact.phone}`, PAGE_LEFT, 800, {
    width: CONTENT_WIDTH,
    align: 'center',
  })
}

function stream(res: Response, filename: string, build: (doc: PDFKit.PDFDocument) => void): void {
  const doc = new PDFDocument({ size: 'A4', margin: 48, autoFirstPage: true })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'private, no-store')
  doc.pipe(res)
  build(doc)
  doc.end()
}

export function streamInvoicePdf(res: Response, invoice: InvoiceWithTotals, brand: PdfBrand): void {
  stream(res, `${invoice.ref}.pdf`, (doc) => {
    addHeader(doc, brand, 'Invoice', invoice.ref, invoice.issueDate)
    addParties(doc, brand, {
      name: invoice.customerName,
      phone: invoice.customerPhone,
      email: invoice.customerEmail,
      address: invoice.customerAddress,
      gstin: invoice.customerGstin,
    })
    const y = addTable(doc, invoice.lines, 230)
    addTotals(
      doc,
      {
        subtotal: invoice.totals.subtotal,
        discount: invoice.totals.discount,
        taxTotal: invoice.totals.taxTotal,
        total: invoice.totals.total,
        paid: invoice.totals.paid,
        balance: invoice.totals.balance,
      },
      y,
    )
    addFooter(doc, brand, invoice.notes, invoice.terms)
  })
}

export function streamQuotationPdf(
  res: Response,
  quotation: QuotationRecord & { totals: QuotationTotals },
  brand: PdfBrand,
  customer: { name: string; phone?: string; email?: string; address?: string },
): void {
  stream(res, `${quotation.ref}.pdf`, (doc) => {
    addHeader(doc, brand, 'Quotation', quotation.ref, quotation.createdAt.slice(0, 10))
    addParties(doc, brand, customer)
    const y = addTable(doc, quotation.lines, 230)
    addTotals(doc, quotation.totals, y)
    if (quotation.validUntil) {
      doc.font('Helvetica').fontSize(8).fillColor('#6b7480').text(`Valid until ${quotation.validUntil}`, PAGE_LEFT, 650)
    }
    addFooter(doc, brand, quotation.notes, quotation.terms)
  })
}
