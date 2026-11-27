import type { Response } from 'express'
import PDFDocument from 'pdfkit'
import type { PayrollRecord, TeamMember } from '@hvac/shared'
import type { PdfBrand } from './pdf.js'

const INK = '#161616'
const MUTED = '#666666'
const SOFT = '#e6e6e6'
const SANS = 'Helvetica'
const SANS_BOLD = 'Helvetica-Bold'
const MONO = 'Courier'
const PAGE_LEFT = 42
const PAGE_RIGHT = 570
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_LEFT

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function accent(brand: PdfBrand): string {
  const parts = (brand.documents?.accent ?? '').trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return '#1c1c1c'
  return `#${parts
    .map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, '0'))
    .join('')}`
}

function periodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function rule(doc: PDFKit.PDFDocument, y: number, color = SOFT): void {
  doc
    .moveTo(PAGE_LEFT, y)
    .lineTo(PAGE_RIGHT, y)
    .lineWidth(0.6)
    .strokeColor(color)
    .stroke()
}

function header(doc: PDFKit.PDFDocument, brand: PdfBrand, record: PayrollRecord): number {
  const tone = accent(brand)
  doc.rect(0, 0, doc.page.width, 12).fill(tone)
  doc.fillColor(INK).font(SANS_BOLD).fontSize(16).text(brand.name, PAGE_LEFT, 40)
  doc
    .font(SANS)
    .fontSize(7.5)
    .fillColor(MUTED)
    .text(
      [
        brand.address.line1,
        [brand.address.locality, brand.address.region, brand.address.postalCode]
          .filter(Boolean)
          .join(', '),
        [brand.contact.phoneDisplay || brand.contact.phone, brand.contact.email]
          .filter(Boolean)
          .join(' · '),
      ]
        .filter(Boolean)
        .join('\n'),
      PAGE_LEFT,
      62,
      { width: 300, lineGap: 1 },
    )

  doc
    .font(SANS_BOLD)
    .fontSize(22)
    .fillColor(INK)
    .text('PAYSLIP', PAGE_LEFT, 40, { width: CONTENT_WIDTH, align: 'right' })
  doc
    .font(MONO)
    .fontSize(8)
    .fillColor(MUTED)
    .text(record.number || 'DRAFT', PAGE_LEFT, 68, { width: CONTENT_WIDTH, align: 'right' })
  doc
    .font(SANS)
    .fontSize(8)
    .fillColor(INK)
    .text(periodLabel(record.period), PAGE_LEFT, 82, { width: CONTENT_WIDTH, align: 'right' })

  const y = 112
  rule(doc, y, tone)
  return y + 14
}

function details(
  doc: PDFKit.PDFDocument,
  record: PayrollRecord,
  member: TeamMember,
  y: number,
): number {
  const label = (text: string, x: number, top: number) =>
    doc.font(MONO).fontSize(6.5).fillColor(MUTED).text(text.toUpperCase(), x, top, { width: 240 })
  const value = (text: string, x: number, top: number, bold = false) =>
    doc
      .font(bold ? SANS_BOLD : SANS)
      .fontSize(9)
      .fillColor(INK)
      .text(text, x, top, { width: 240 })

  label('Employee', PAGE_LEFT, y)
  value(member.name, PAGE_LEFT, y + 10, true)
  doc
    .font(SANS)
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      [
        member.email,
        member.phone,
        member.joinedAt ? `Joined ${dateLabel(member.joinedAt)}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      PAGE_LEFT,
      y + 24,
      { width: 250 },
    )

  const right = PAGE_LEFT + 300
  label('Statement', right, y)
  const paid = record.paidAmount ?? (record.status === 'paid' ? record.amount : 0)
  const balance = record.balance ?? Math.max(0, record.amount - paid)
  const rows: [string, string][] = [
    ['Pay date', dateLabel(record.paidAt)],
    ['Method', record.method.replace(/-/g, ' ')],
    ['Paid', money.format(paid)],
    ['Balance', money.format(balance)],
  ]
  let line = y + 10
  for (const [key, text] of rows) {
    doc.font(SANS).fontSize(8).fillColor(MUTED).text(key, right, line, { width: 90 })
    doc
      .font(SANS)
      .fontSize(8)
      .fillColor(INK)
      .text(text, right + 95, line, { width: 140, align: 'right' })
    line += 12
  }

  return y + 60
}

function table(
  doc: PDFKit.PDFDocument,
  title: string,
  rows: { label: string; amount: number }[],
  total: number,
  x: number,
  y: number,
  width: number,
): number {
  doc.font(MONO).fontSize(6.5).fillColor(MUTED).text(title.toUpperCase(), x, y)
  let cursor = y + 12
  doc.rect(x, cursor, width, 14).fill('#f2f2f2')
  doc.font(SANS_BOLD).fontSize(7.5).fillColor(INK).text('ITEM', x + 6, cursor + 4)
  doc.text('AMOUNT', x, cursor + 4, { width: width - 6, align: 'right' })
  cursor += 18
  for (const row of rows) {
    doc.font(SANS).fontSize(8.5).fillColor(INK).text(row.label, x + 6, cursor, { width: width - 90 })
    doc.text(money.format(row.amount), x, cursor, { width: width - 6, align: 'right' })
    cursor += 14
  }
  if (!rows.length) {
    doc.font(SANS).fontSize(8.5).fillColor(MUTED).text('None', x + 6, cursor)
    cursor += 14
  }
  rule(doc, cursor + 2)
  doc.font(SANS_BOLD).fontSize(8.5).fillColor(INK).text('Total', x + 6, cursor + 7)
  doc.text(money.format(total), x, cursor + 7, { width: width - 6, align: 'right' })
  return cursor + 22
}

function body(
  doc: PDFKit.PDFDocument,
  record: PayrollRecord,
  member: TeamMember,
  brand: PdfBrand,
): void {
  const tone = accent(brand)
  let y = header(doc, brand, record)
  y = details(doc, record, member, y)

  const earnings =
    record.earnings ??
    [
      { label: 'Base salary', amount: record.baseAmount },
      ...(record.bonus ? [{ label: 'Bonus', amount: record.bonus }] : []),
    ]
  const deductions =
    record.deductionLines ??
    (record.deductions ? [{ label: 'Deductions', amount: record.deductions }] : [])

  const columnWidth = 252
  const leftEnd = table(doc, 'Earnings', earnings, record.gross ?? record.baseAmount, PAGE_LEFT, y, columnWidth)
  const rightEnd = table(
    doc,
    'Deductions',
    deductions,
    record.deductionLines?.reduce((sum, line) => sum + line.amount, 0) ?? record.deductions,
    PAGE_LEFT + 288,
    y,
    columnWidth,
  )
  y = Math.max(leftEnd, rightEnd)

  const attendance = record.attendance
  if (attendance) {
    doc
      .font(SANS)
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `Attendance: ${attendance.presentDays} present · ${attendance.paidLeaveDays} paid leave · ` +
          `${attendance.unpaidDays} unpaid · ${attendance.overtimeHours}h overtime`,
        PAGE_LEFT,
        y,
        { width: CONTENT_WIDTH },
      )
    y += 20
  }

  const net = record.amount
  const paid =
    record.paidAmount ??
    record.payments?.reduce((sum, payment) => sum + payment.amount, 0) ??
    0
  doc.rect(PAGE_LEFT, y, CONTENT_WIDTH, 42).fill(tone)
  doc.font(MONO).fontSize(7).fillColor('#ffffff').text('NET PAY', PAGE_LEFT + 12, y + 9)
  doc
    .font(SANS_BOLD)
    .fontSize(18)
    .fillColor('#ffffff')
    .text(money.format(net), PAGE_LEFT + 12, y + 18)
  doc
    .font(SANS)
    .fontSize(7.5)
    .fillColor('#ffffff')
    .text(
      record.status === 'paid'
        ? 'Settled in full'
        : paid > 0
          ? 'Part paid — balance remains due'
          : 'Payment pending',
      PAGE_LEFT,
      y + 17,
      { width: CONTENT_WIDTH - 12, align: 'right' },
    )
  y += 58

  if (record.notes) {
    doc.font(MONO).fontSize(6.5).fillColor(MUTED).text('NOTES', PAGE_LEFT, y)
    doc
      .font(SANS)
      .fontSize(8)
      .fillColor(INK)
      .text(record.notes, PAGE_LEFT, y + 10, { width: CONTENT_WIDTH })
    y += 28
  }

  const footerY = Math.min(doc.page.height - 70, y + 12)
  rule(doc, footerY)
  doc
    .font(SANS)
    .fontSize(7)
    .fillColor(MUTED)
    .text(
      [brand.legalName, brand.address.line1, brand.documents?.footerNote]
        .filter(Boolean)
        .join(' · '),
      PAGE_LEFT,
      footerY + 8,
      { width: CONTENT_WIDTH },
    )
  doc.text(
    `Generated ${new Date().toLocaleString('en-US')} · ${record.number ?? record.id}`,
    PAGE_LEFT,
    footerY + 22,
    { width: CONTENT_WIDTH },
  )
}

function newDoc(brand: PdfBrand): PDFKit.PDFDocument {
  return new PDFDocument({
    size: brand.documents?.paper ?? 'A4',
    margin: PAGE_LEFT,
    autoFirstPage: true,
    info: { Title: 'Payslip', Author: brand.legalName },
  })
}

export function streamPayslipPdf(
  res: Response,
  record: PayrollRecord,
  member: TeamMember,
  brand: PdfBrand,
): void {
  const doc = newDoc(brand)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${(record.number || `payslip-${record.period}`).replace(/[^a-z0-9-_.]/gi, '-')}.pdf"`,
  )
  res.setHeader('Cache-Control', 'private, no-store')
  doc.pipe(res)
  body(doc, record, member, brand)
  doc.end()
}

export function buildPayslipPdf(
  record: PayrollRecord,
  member: TeamMember,
  brand: PdfBrand,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = newDoc(brand)
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    body(doc, record, member, brand)
    doc.end()
  })
}
