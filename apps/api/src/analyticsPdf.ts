import type { Response } from 'express'
import PDFDocument from 'pdfkit'
import type { AnalyticsReport, ReportsAnalytics } from '@hvac/shared'
import type { PdfBrand } from './pdf.js'

const INK = '#171717'
const MUTED = '#666666'
const SOFT = '#e5e5e5'
const SANS = 'Helvetica'
const SANS_BOLD = 'Helvetica-Bold'
const MONO = 'Courier'
const LEFT = 42
const RIGHT = 570
const WIDTH = RIGHT - LEFT
const TONES = ['#1f6f78', '#c2683a', '#2f7d4f', '#8a8a8a']

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const moneyExact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

function format(value: number, kind: AnalyticsReport['metrics'][number]['format']): string {
  if (kind === 'money') return Math.abs(value) >= 1000 ? money.format(value) : moneyExact.format(value)
  if (kind === 'percent') return `${value.toFixed(1)}%`
  return number.format(value)
}

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

function pageHeader(
  doc: PDFKit.PDFDocument,
  brand: PdfBrand,
  report: AnalyticsReport,
  analytics: ReportsAnalytics,
): number {
  const tone = accent(brand)
  doc.rect(0, 0, doc.page.width, 12).fill(tone)
  doc.fillColor(INK).font(SANS_BOLD).fontSize(15).text(brand.name, LEFT, 38)
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
        brand.contact.email,
      ]
        .filter(Boolean)
        .join('  |  '),
      LEFT,
      58,
      { width: 320 },
    )
  doc
    .font(SANS_BOLD)
    .fontSize(19)
    .fillColor(INK)
    .text('ANALYTICS REPORT', LEFT, 38, { width: WIDTH, align: 'right' })
  doc
    .font(MONO)
    .fontSize(8)
    .fillColor(MUTED)
    .text(report.eyebrow.toUpperCase(), LEFT, 64, { width: WIDTH, align: 'right' })
  doc
    .font(SANS)
    .fontSize(7)
    .fillColor(MUTED)
    .text(analytics.period.label, LEFT, 78, { width: WIDTH, align: 'right' })
  doc
    .font(SANS)
    .fontSize(7)
    .fillColor(MUTED)
    .text(`Generated ${new Date(analytics.generatedAt).toLocaleString('en-US')}`, LEFT, 90, {
      width: WIDTH,
      align: 'right',
    })
  rule(doc, 108, tone)
  doc.font(SANS_BOLD).fontSize(16).fillColor(INK).text(report.title, LEFT, 122)
  doc
    .font(SANS)
    .fontSize(8)
    .fillColor(MUTED)
    .text(report.description, LEFT, 144, { width: WIDTH - 20, lineGap: 2 })
  return 182
}

function metrics(doc: PDFKit.PDFDocument, report: AnalyticsReport, y: number): number {
  const rows = report.metrics.slice(0, 5)
  const width = (WIDTH - (rows.length - 1) * 5) / Math.max(1, rows.length)
  rows.forEach((metric, index) => {
    const x = LEFT + index * (width + 5)
    doc.rect(x, y, width, 51).fillAndStroke('#f7f7f7', '#e2e2e2')
    doc.font(MONO).fontSize(5.8).fillColor(MUTED).text(metric.label.toUpperCase(), x + 7, y + 7, {
      width: width - 14,
    })
    doc
      .font(SANS_BOLD)
      .fontSize(12)
      .fillColor(metric.tone === 'warning' ? '#a05a10' : metric.tone === 'positive' ? '#1d6b3a' : INK)
      .text(format(metric.value, metric.format), x + 7, y + 20, { width: width - 14 })
    doc
      .font(SANS)
      .fontSize(5.8)
      .fillColor(MUTED)
      .text(metric.note ?? '', x + 7, y + 37, { width: width - 14 })
  })
  return y + 64
}

function chart(doc: PDFKit.PDFDocument, report: AnalyticsReport, y: number): number {
  const data = report.charts[0]
  if (!data || !data.labels.length) return y
  if (y > 600) {
    doc.addPage()
    y = 50
  }
  doc.font(MONO).fontSize(6.5).fillColor(MUTED).text(data.title.toUpperCase(), LEFT, y)
  y += 13
  const height = 138
  const chartTop = y
  const chartBottom = y + height - 18
  const allValues = data.series.flatMap((series) => series.values)
  const max = Math.max(1, ...allValues)
  const min = Math.min(0, ...allValues)
  const span = max - min || 1
  const stepX = WIDTH / Math.max(1, data.labels.length - 1)
  doc
    .moveTo(LEFT, chartBottom)
    .lineTo(RIGHT, chartBottom)
    .lineWidth(0.6)
    .strokeColor(SOFT)
    .stroke()
  for (let line = 0; line <= 3; line += 1) {
    const lineY = chartTop + (height - 18) * (line / 3)
    doc
      .moveTo(LEFT, lineY)
      .lineTo(RIGHT, lineY)
      .lineWidth(0.35)
      .strokeColor('#eeeeee')
      .stroke()
  }
  data.series.forEach((series, index) => {
    const color = TONES[index % TONES.length] ?? '#555555'
    doc.strokeColor(color).lineWidth(1.4)
    series.values.forEach((value, point) => {
      const x = LEFT + point * stepX
      const py = chartBottom - ((value - min) / span) * (height - 18)
      if (point === 0) doc.moveTo(x, py)
      else doc.lineTo(x, py)
    })
    doc.stroke()
    series.values.forEach((value, point) => {
      const x = LEFT + point * stepX
      const py = chartBottom - ((value - min) / span) * (height - 18)
      doc.circle(x, py, 1.8).fill(color)
    })
    const legendX = LEFT + index * 112
    doc.rect(legendX, chartBottom + 8, 7, 3).fill(color)
    doc
      .font(MONO)
      .fontSize(6)
      .fillColor(MUTED)
      .text(series.label.toUpperCase(), legendX + 10, chartBottom + 5, { width: 95 })
  })
  data.labels.forEach((label, index) => {
    if (data.labels.length > 8 && index % 2 !== 0) return
    const x = LEFT + index * stepX
    doc
      .font(MONO)
      .fontSize(5.5)
      .fillColor(MUTED)
      .text(label.replace(/ \d{4}$/, ''), x - 14, chartBottom + 17, { width: 45, align: 'center' })
  })
  return chartBottom + 35
}

function breakdown(
  doc: PDFKit.PDFDocument,
  report: AnalyticsReport,
  y: number,
): number {
  const data = report.breakdowns[0]
  if (!data || !data.items.length) return y
  if (y > 640) {
    doc.addPage()
    y = 50
  }
  doc.font(MONO).fontSize(6.5).fillColor(MUTED).text(data.title.toUpperCase(), LEFT, y)
  y += 14
  const max = Math.max(1, ...data.items.map((item) => item.value))
  data.items.slice(0, 7).forEach((item) => {
    doc.font(SANS).fontSize(7.5).fillColor(INK).text(item.label, LEFT, y, { width: 180 })
    doc
      .font(MONO)
      .fontSize(7.5)
      .fillColor(INK)
      .text(format(item.value, data.format), LEFT + 190, y, { width: 100, align: 'right' })
    const barX = LEFT + 305
    const barWidth = Math.max(3, (item.value / max) * 180)
    doc.rect(barX, y + 1, 180, 7).fill('#ededed')
    doc.rect(barX, y + 1, barWidth, 7).fill(TONES[0] ?? '#1f6f78')
    if (item.count !== undefined) {
      doc
        .font(MONO)
        .fontSize(5.8)
        .fillColor(MUTED)
        .text(String(item.count), LEFT + 495, y + 1, { width: 30, align: 'right' })
    }
    y += 15
  })
  return y + 8
}

function table(
  doc: PDFKit.PDFDocument,
  report: AnalyticsReport,
  y: number,
): number {
  const data = report.tables[0]
  if (!data) return y
  if (y > 600) {
    doc.addPage()
    y = 50
  }
  doc.font(MONO).fontSize(6.5).fillColor(MUTED).text(data.title.toUpperCase(), LEFT, y)
  y += 13
  const columnWidth = WIDTH / Math.max(1, data.columns.length)
  doc.font(SANS_BOLD).fontSize(6).fillColor(MUTED)
  data.columns.forEach((header, index) => {
    doc.text(header.toUpperCase(), LEFT + index * columnWidth, y, {
      width: columnWidth - 6,
      align: data.align?.[index] === 'right' ? 'right' : 'left',
    })
  })
  y += 11
  rule(doc, y)
  y += 5
  for (const row of data.rows.slice(0, 18)) {
    if (y > 748) {
      doc.addPage()
      y = 50
    }
    row.forEach((cell, index) => {
      doc
        .font(index === 0 ? SANS : MONO)
        .fontSize(6.8)
        .fillColor(INK)
        .text(String(cell), LEFT + index * columnWidth, y, {
          width: columnWidth - 6,
          align: data.align?.[index] === 'right' ? 'right' : 'left',
          lineBreak: false,
          ellipsis: true,
        })
    })
    y += 13
  }
  return y + 8
}

function insights(doc: PDFKit.PDFDocument, report: AnalyticsReport, y: number): number {
  if (y > 680) {
    doc.addPage()
    y = 50
  }
  doc.font(MONO).fontSize(6.5).fillColor(MUTED).text('ANALYSIS', LEFT, y)
  y += 14
  for (const insight of report.insights) {
    if (y > 738) {
      doc.addPage()
      y = 50
    }
    doc
      .font(SANS_BOLD)
      .fontSize(7.5)
      .fillColor(insight.tone === 'attention' ? '#a05a10' : insight.tone === 'positive' ? '#1d6b3a' : INK)
      .text(`${insight.title}.`, LEFT, y, { width: WIDTH, continued: true })
      .font(SANS)
      .fillColor(INK)
      .text(` ${insight.detail}`, { width: WIDTH })
    y = doc.y + 4
  }
  return y
}

function footer(
  doc: PDFKit.PDFDocument,
  brand: PdfBrand,
  report: AnalyticsReport,
  analytics: ReportsAnalytics,
): void {
  doc
    .font(SANS)
    .fontSize(6.2)
    .fillColor(MUTED)
    .text(
      `${brand.legalName} | ${report.title} | ${analytics.period.label} | Confidential management report`,
      LEFT,
      doc.page.height - 52,
      { width: WIDTH },
    )
}

function body(
  doc: PDFKit.PDFDocument,
  report: AnalyticsReport,
  analytics: ReportsAnalytics,
  brand: PdfBrand,
): void {
  let y = pageHeader(doc, brand, report, analytics)
  y = metrics(doc, report, y)
  y = insights(doc, report, y + 4)
  y = chart(doc, report, y + 10)
  y = breakdown(doc, report, y)
  table(doc, report, y)
  const range = doc.bufferedPageRange()
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index)
    footer(doc, brand, report, analytics)
  }
}

export function streamAnalyticsPdf(
  res: Response,
  report: AnalyticsReport,
  analytics: ReportsAnalytics,
  brand: PdfBrand,
): void {
  const doc = new PDFDocument({
    size: brand.documents?.paper ?? 'A4',
    margin: LEFT,
    autoFirstPage: true,
    bufferPages: true,
    info: { Title: `${report.title} report`, Author: brand.legalName },
  })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${(brand.name || 'company').replace(/[^a-z0-9]+/gi, '-')}-${report.key}-${analytics.period.months}m.pdf"`,
  )
  res.setHeader('Cache-Control', 'private, no-store')
  doc.pipe(res)
  body(doc, report, analytics, brand)
  doc.end()
}

