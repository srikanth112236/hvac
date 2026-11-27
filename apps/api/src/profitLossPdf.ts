import type { Response } from 'express'
import PDFDocument from 'pdfkit'
import type { ProfitLossReport } from '@hvac/shared'
import type { PdfBrand } from './pdf.js'

const INK = '#161616'
const MUTED = '#666666'
const SOFT = '#e8e8e8'
const SANS = 'Helvetica'
const SANS_BOLD = 'Helvetica-Bold'
const MONO = 'Courier'
const LEFT = 42
const RIGHT = 570
const WIDTH = RIGHT - LEFT

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const money0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function accent(brand: PdfBrand): string {
  const parts = (brand.documents?.accent ?? '').trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return '#1c1c1c'
  return `#${parts
    .map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, '0'))
    .join('')}`
}

function rule(doc: PDFKit.PDFDocument, y: number, color = SOFT): void {
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.6).strokeColor(color).stroke()
}

function cost(value: number): string {
  return value <= 0 ? money.format(0) : `(${money.format(value)})`
}

function pageHeader(doc: PDFKit.PDFDocument, brand: PdfBrand, report: ProfitLossReport): number {
  const tone = accent(brand)
  doc.rect(0, 0, doc.page.width, 12).fill(tone)
  doc.fillColor(INK).font(SANS_BOLD).fontSize(15).text(brand.name, LEFT, 40)
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
          .join(' | '),
      ]
        .filter(Boolean)
        .join('\n'),
      LEFT,
      60,
      { width: 300, lineGap: 1 },
    )
  doc
    .font(SANS_BOLD)
    .fontSize(21)
    .fillColor(INK)
    .text('PROFIT & LOSS', LEFT, 40, { width: WIDTH, align: 'right' })
  doc
    .font(MONO)
    .fontSize(8)
    .fillColor(MUTED)
    .text(report.label.toUpperCase(), LEFT, 68, { width: WIDTH, align: 'right' })
  doc
    .font(SANS)
    .fontSize(7)
    .fillColor(MUTED)
    .text(`Generated ${new Date(report.generatedAt).toLocaleString('en-US')}`, LEFT, 82, {
      width: WIDTH,
      align: 'right',
    })
  const y = 104
  rule(doc, y, tone)
  return y + 16
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string, y: number): number {
  doc.font(MONO).fontSize(7).fillColor(MUTED).text(text.toUpperCase(), LEFT, y)
  return y + 13
}

function summary(doc: PDFKit.PDFDocument, report: ProfitLossReport, y: number): number {
  const boxes: [string, string, string][] = [
    ['Billed revenue', money0.format(report.revenue.billed), 'net of sales tax'],
    [
      'Operating costs',
      money0.format(report.expenses.total + report.payroll.total),
      `${report.expenses.count} expenses + payroll`,
    ],
    [
      report.net.accrual >= 0 ? 'Net profit' : 'Net loss',
      money0.format(Math.abs(report.net.accrual)),
      `${report.net.margin.toFixed(1)}% margin`,
    ],
    ['Cash collected', money0.format(report.revenue.collected), `${money0.format(report.revenue.outstanding)} receivable`],
  ]
  const boxWidth = (WIDTH - 18) / 4
  boxes.forEach(([label, value, note], index) => {
    const x = LEFT + index * (boxWidth + 6)
    doc.rect(x, y, boxWidth, 58).fillAndStroke('#f7f7f7', '#e2e2e2')
    doc.font(MONO).fontSize(6).fillColor(MUTED).text(label.toUpperCase(), x + 8, y + 8, {
      width: boxWidth - 16,
    })
    doc
      .font(SANS_BOLD)
      .fontSize(14)
      .fillColor(index === 2 && report.net.accrual < 0 ? '#a02020' : INK)
      .text(value, x + 8, y + 22, { width: boxWidth - 16 })
    doc
      .font(SANS)
      .fontSize(6.5)
      .fillColor(MUTED)
      .text(note, x + 8, y + 43, { width: boxWidth - 16 })
  })
  return y + 74
}

function statement(doc: PDFKit.PDFDocument, report: ProfitLossReport, y: number): number {
  y = sectionTitle(doc, 'Statement', y)
  const rows: [string, string, boolean][] = [
    ['Billed revenue (net of tax)', money.format(report.revenue.billed), false],
    [`Cost of operations | ${report.expenses.count} expenses`, cost(report.expenses.total), false],
    [`Payroll | ${report.payroll.count} payslips`, cost(report.payroll.total), false],
    ['Net profit / (loss) | accrual', report.net.accrual === 0 ? money.format(0) : money.format(report.net.accrual), true],
    ['Cash collected', money.format(report.revenue.collected), false],
    ['Cash paid out | expenses + settled payroll', cost(report.expenses.total + report.payroll.paid), false],
    ['Net cash movement', report.net.cash === 0 ? money.format(0) : money.format(report.net.cash), true],
  ]
  for (const [label, value, strong] of rows) {
    if (strong) {
      doc.rect(LEFT, y - 2, WIDTH, 19).fill('#f1f1f1')
    }
    doc
      .font(strong ? SANS_BOLD : SANS)
      .fontSize(8.5)
      .fillColor(INK)
      .text(label, LEFT + 6, y + 3, { width: WIDTH - 140 })
    doc
      .font(MONO)
      .fontSize(8.5)
      .fillColor(
        strong && label.includes('loss') ? '#a02020' : strong && label.includes('movement') && report.net.cash < 0 ? '#a02020' : INK,
      )
      .text(value, LEFT, y + 3, { width: WIDTH - 6, align: 'right' })
    y += strong ? 24 : 17
  }
  return y + 8
}

function revenueAndReceivables(doc: PDFKit.PDFDocument, report: ProfitLossReport, y: number): number {
  const start = y
  y = sectionTitle(doc, 'Revenue & receivables', y)
  const rows: [string, string][] = [
    ['Invoices issued', String(report.revenue.invoiceCount)],
    ['Average invoice', money.format(report.revenue.averageInvoice)],
    ['Cash collected in month', money.format(report.revenue.collected)],
    ['Outstanding receivables', money.format(report.revenue.outstanding)],
  ]
  for (const [label, value] of rows) {
    doc.font(SANS).fontSize(8).fillColor(MUTED).text(label, LEFT, y, { width: 220 })
    doc
      .font(MONO)
      .fontSize(8)
      .fillColor(INK)
      .text(value, LEFT + 220, y, { width: 120, align: 'right' })
    y += 14
  }
  y += 6
  y = sectionTitle(doc, 'Payroll position', y)
  const payrollRows: [string, string][] = [
    ['Payslips in month', String(report.payroll.count)],
    ['Accrued payroll', money.format(report.payroll.total)],
    ['Settled payroll', money.format(report.payroll.paid)],
    ['Still payable', money.format(report.payroll.pending)],
  ]
  for (const [label, value] of payrollRows) {
    doc.font(SANS).fontSize(8).fillColor(MUTED).text(label, LEFT, y, { width: 220 })
    doc
      .font(MONO)
      .fontSize(8)
      .fillColor(INK)
      .text(value, LEFT + 220, y, { width: 120, align: 'right' })
    y += 14
  }
  return Math.max(start + 150, y + 4)
}

function categoryTable(doc: PDFKit.PDFDocument, report: ProfitLossReport, y: number): number {
  y = sectionTitle(doc, 'Expense breakdown by category | net of tax', y)
  if (!report.expenses.byCategory.length) {
    doc.font(SANS).fontSize(8).fillColor(MUTED).text('No expenses recorded in this month.', LEFT, y)
    return y + 20
  }
  doc.font(SANS_BOLD).fontSize(7).fillColor(INK).text('CATEGORY', LEFT, y)
  doc.text('ENTRIES', LEFT + 230, y, { width: 55, align: 'right' })
  doc.text('AMOUNT', LEFT + 300, y, { width: 90, align: 'right' })
  doc.text('SHARE', LEFT + 410, y, { width: 60, align: 'right' })
  y += 11
  rule(doc, y)
  y += 5
  for (const row of report.expenses.byCategory) {
    doc.font(SANS).fontSize(8).fillColor(INK).text(row.label, LEFT, y, { width: 210 })
    doc.text(String(row.count), LEFT + 230, y, { width: 55, align: 'right' })
    doc.font(MONO).text(money.format(row.amount), LEFT + 300, y, { width: 90, align: 'right' })
    doc.text(`${row.share.toFixed(1)}%`, LEFT + 410, y, { width: 50, align: 'right' })
    const barWidth = Math.max(2, (row.share / 100) * 48)
    doc.rect(LEFT + 468, y + 1, barWidth, 7).fill('#d8d8d8')
    y += 14
  }
  y += 3
  rule(doc, y)
  doc.font(SANS_BOLD).fontSize(8).fillColor(INK).text('Total operating expenses', LEFT, y + 6)
  doc
    .font(MONO)
    .fontSize(8)
    .fillColor(INK)
    .text(money.format(report.expenses.total), LEFT + 300, y + 6, { width: 90, align: 'right' })
  return y + 24
}

function trendTable(doc: PDFKit.PDFDocument, report: ProfitLossReport, y: number): number {
  y = sectionTitle(doc, 'Six-month performance', y)
  const columns = [LEFT, LEFT + 70, LEFT + 190, LEFT + 270, LEFT + 370, LEFT + 470]
  const headers = ['MONTH', 'REVENUE', 'EXPENSES', 'PAYROLL', 'NET']
  doc.font(SANS_BOLD).fontSize(6.5).fillColor(MUTED)
  headers.forEach((header, index) => doc.text(header, columns[index], y, { width: 100 }))
  y += 11
  rule(doc, y)
  y += 4
  for (const point of report.trends) {
    const year = Number(point.month.slice(0, 4))
    const month = Number(point.month.slice(5, 7))
    const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
    doc.font(SANS).fontSize(7.5).fillColor(INK).text(label, columns[0], y, { width: 90 })
    doc.font(MONO).fontSize(7.5).text(money0.format(point.revenue), columns[1], y, { width: 95 })
    doc.text(money0.format(point.expenses), columns[2], y, { width: 75 })
    doc.text(money0.format(point.payroll), columns[3], y, { width: 76 })
    doc.fillColor(point.net < 0 ? '#a02020' : INK).text(money0.format(point.net), columns[4], y, {
      width: 90,
    })
    y += 13
  }
  return y + 5
}

function insights(doc: PDFKit.PDFDocument, report: ProfitLossReport, y: number): number {
  y = sectionTitle(doc, 'Analysis & commentary', y)
  for (const insight of report.insights) {
    if (y > 705) {
      doc.addPage()
      y = 48
    }
    doc
      .font(SANS_BOLD)
      .fontSize(8)
      .fillColor(insight.tone === 'attention' ? '#a05a10' : insight.tone === 'positive' ? '#1d6b3a' : INK)
      .text(`${insight.title}.`, LEFT, y, { width: WIDTH, continued: true })
      .font(SANS)
      .fillColor(INK)
      .text(` ${insight.detail}`, { width: WIDTH })
    y = doc.y + 5
  }
  return y
}

function footer(doc: PDFKit.PDFDocument, brand: PdfBrand, report: ProfitLossReport): void {
  const y = doc.page.height - 90
  rule(doc, y)
  doc
    .font(SANS)
    .fontSize(6.5)
    .fillColor(MUTED)
    .text(
      `${brand.legalName} | ${report.label} profit & loss | Confidential management report`,
      LEFT,
      y + 7,
      { width: WIDTH },
    )
  doc.text(
    `Generated ${new Date(report.generatedAt).toLocaleString('en-US')} | ${report.from} to ${report.to}`,
    LEFT,
    y + 18,
    { width: WIDTH },
  )
}

function footers(doc: PDFKit.PDFDocument, brand: PdfBrand, report: ProfitLossReport): void {
  const range = doc.bufferedPageRange()
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index)
    footer(doc, brand, report)
  }
}

function body(doc: PDFKit.PDFDocument, report: ProfitLossReport, brand: PdfBrand): void {
  let y = pageHeader(doc, brand, report)
  y = summary(doc, report, y)
  y = statement(doc, report, y)
  const leftStart = y
  const leftEnd = revenueAndReceivables(doc, report, leftStart)
  y = leftEnd + 12
  if (y > 560) {
    doc.addPage()
    y = 48
  }
  y = categoryTable(doc, report, y)
  if (y > 610) {
    doc.addPage()
    y = 48
  }
  y = trendTable(doc, report, y)
  if (y > 660) {
    doc.addPage()
    doc
      .font(SANS_BOLD)
      .fontSize(9)
      .fillColor(INK)
      .text(`${brand.name} | Profit & loss | ${report.label} (continued)`, LEFT, 48)
    rule(doc, 62, accent(brand))
    y = 74
  }
  y = insights(doc, report, y + 4)
  void y
  footers(doc, brand, report)
}

export function streamProfitLossPdf(
  res: Response,
  report: ProfitLossReport,
  brand: PdfBrand,
): void {
  const doc = new PDFDocument({
    size: brand.documents?.paper ?? 'A4',
    margin: LEFT,
    autoFirstPage: true,
    bufferPages: true,
    info: { Title: `${report.label} profit and loss`, Author: brand.legalName },
  })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${(brand.name || 'company').replace(/[^a-z0-9]+/gi, '-')}-profit-loss-${report.month}.pdf"`,
  )
  res.setHeader('Cache-Control', 'private, no-store')
  doc.pipe(res)
  body(doc, report, brand)
  doc.end()
}

export function buildProfitLossPdf(report: ProfitLossReport, brand: PdfBrand): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: brand.documents?.paper ?? 'A4',
      margin: LEFT,
      autoFirstPage: true,
      bufferPages: true,
      info: { Title: `${report.label} profit and loss`, Author: brand.legalName },
    })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    body(doc, report, brand)
    doc.end()
  })
}
