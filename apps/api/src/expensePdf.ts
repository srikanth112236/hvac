import PDFDocument from 'pdfkit'
import type { Response } from 'express'
import type { ExpenseRecord } from '@hvac/shared'

interface ExpenseBrand {
  name: string
  legalName: string
  contact: { phone: string; email: string }
  address: { line1: string; line2: string; locality: string; region: string; postalCode: string }
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function buildDoc(
  month: string,
  expenses: ExpenseRecord[],
  brand: ExpenseBrand,
): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 46 })
  const left = 46
  const right = 549
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#12161a').text(brand.name, left, 42)
  doc.font('Helvetica').fontSize(9).fillColor('#5d6873').text(brand.legalName, left, 68)
  doc
    .fontSize(8)
    .text(
      [
        brand.address.line1,
        brand.address.line2,
        `${brand.address.locality}, ${brand.address.region} ${brand.address.postalCode}`,
      ]
        .filter(Boolean)
        .join(' · '),
      left,
      82,
      { width: 300 },
    )
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#12161a')
    .text('MONTHLY EXPENSE REPORT', 330, 42, { width: 219, align: 'right' })
  doc.font('Helvetica').fontSize(11).text(month, 330, 68, { width: 219, align: 'right' })
  doc
    .fontSize(8)
    .text(`Generated ${new Date().toISOString().slice(0, 10)}`, 330, 84, {
      width: 219,
      align: 'right',
    })
  doc.moveTo(left, 116).lineTo(right, 116).strokeColor('#d8d3c8').stroke()

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#6b7480').text('PERIOD TOTAL', left, 132)
  doc.fontSize(22).fillColor('#12161a').text(money.format(total), left, 146)
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#6b7480')
    .text(`${expenses.length} recorded entries`, 300, 152)

  let y = 190
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#6b7480')
  doc.text('DATE', left, y)
  doc.text('DESCRIPTION / VENDOR', 92, y, { width: 180 })
  doc.text('CATEGORY', 280, y, { width: 80 })
  doc.text('METHOD', 365, y, { width: 75 })
  doc.text('AMOUNT', 445, y, { width: 100, align: 'right' })
  y += 14
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#d8d3c8').stroke()
  y += 8
  doc.font('Helvetica').fontSize(8).fillColor('#12161a')
  for (const expense of expenses) {
    if (y > 730) {
      doc.addPage()
      y = 46
    }
    const description = `${expense.description}${expense.vendor ? ` · ${expense.vendor}` : ''}`
    const height = Math.max(14, doc.heightOfString(description, { width: 180 }))
    doc.text(expense.date.slice(0, 10), left, y, { width: 42 })
    doc.text(description, 92, y, { width: 180 })
    doc.text(expense.category, 280, y, { width: 80 })
    doc.text(expense.method, 365, y, { width: 75 })
    doc.text(money.format(expense.amount), 445, y, { width: 100, align: 'right' })
    y += height + 7
    doc
      .moveTo(left, y - 3)
      .lineTo(right, y - 3)
      .strokeColor('#eeeae0')
      .stroke()
  }
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#6b7480')
    .text(`Internal cost report · ${brand.contact.email} · ${brand.contact.phone}`, left, 790, {
      width: right - left,
      align: 'center',
    })
  return doc
}

export async function buildExpenseReportPdf(
  month: string,
  expenses: ExpenseRecord[],
  brand: ExpenseBrand,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = buildDoc(month, expenses, brand)
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

export function streamExpenseReportPdf(
  res: Response,
  month: string,
  expenses: ExpenseRecord[],
  brand: ExpenseBrand,
): void {
  const doc = buildDoc(month, expenses, brand)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="expenses-${month}.pdf"`)
  res.setHeader('Cache-Control', 'private, no-store')
  doc.pipe(res)
  doc.end()
}
