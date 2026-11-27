import { randomUUID } from 'node:crypto'
import {
  DEFAULT_REPORT_SETTINGS,
  buildProfitLoss,
  reportSettingsSchema,
  shiftMonth,
  type ProfitLossHistoryEntry,
  type ProfitLossReport,
  type ReportDelivery,
  type ReportSettings,
} from '@hvac/shared'
import { ADMIN_NOTIFY_EMAIL, BUSINESS_TIMEZONE, mailerConfigured } from './config.js'
import { readSiteContent } from './content.js'
import { expenseStore, invoiceStore, payrollStore } from './business.js'
import { profitLossEmail, sendMail } from './mailer.js'
import { buildProfitLossPdf } from './profitLossPdf.js'
import { createStore } from './store.js'
import { todayInZone } from './time.js'

const nowIso = () => new Date().toISOString()
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const settingsStore = createStore<ReportSettings>('report-settings.json', () => ({
  ...DEFAULT_REPORT_SETTINGS,
  updatedAt: nowIso(),
  lastAutoSentMonth: null,
}))
const deliveryStore = createStore<ReportDelivery[]>('report-deliveries.json', () => [])

export async function readReportSettings(): Promise<ReportSettings> {
  const stored = await settingsStore.read()
  const parsed = reportSettingsSchema.safeParse(stored)
  return {
    ...DEFAULT_REPORT_SETTINGS,
    ...(parsed.success ? parsed.data : {}),
    updatedAt: stored?.updatedAt ?? nowIso(),
    lastAutoSentMonth: stored?.lastAutoSentMonth ?? null,
  }
}

export async function saveReportSettings(
  input: ReportSettings,
): Promise<ReportSettings> {
  await settingsStore.write(input)
  return input
}

export function currentPeriod(): string {
  return todayInZone(BUSINESS_TIMEZONE).slice(0, 7)
}

export function validMonth(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) ? value : currentPeriod()
}

export async function buildMonthReport(month: string): Promise<ProfitLossReport> {
  const [invoices, expenses, payroll] = await Promise.all([
    invoiceStore.read(),
    expenseStore.read(),
    payrollStore.read(),
  ])
  return buildProfitLoss({ month, invoices, expenses, payroll })
}

export async function reportHistory(months = 12): Promise<ProfitLossHistoryEntry[]> {
  const [invoices, expenses, payroll, deliveries] = await Promise.all([
    invoiceStore.read(),
    expenseStore.read(),
    payrollStore.read(),
    deliveryStore.read(),
  ])
  const entries: ProfitLossHistoryEntry[] = []
  for (let offset = 0; offset < months; offset += 1) {
    const month = shiftMonth(currentPeriod(), -offset)
    const report = buildProfitLoss({ month, invoices, expenses, payroll })
    const lastDelivery =
      deliveries
        .filter((entry) => entry.month === month)
        .sort((a, b) => b.at.localeCompare(a.at))[0] ?? null
    entries.push({
      month,
      label: report.label,
      revenue: report.revenue.billed,
      expenses: report.expenses.total,
      payroll: report.payroll.total,
      net: report.net.accrual,
      margin: report.net.margin,
      lastDelivery,
    })
  }
  return entries
}

export async function deliveriesFor(month: string): Promise<ReportDelivery[]> {
  return (await deliveryStore.read())
    .filter((entry) => entry.month === month)
    .sort((a, b) => b.at.localeCompare(a.at))
}

export interface DeliveryResult {
  status: 'sent' | 'skipped' | 'failed'
  sent: number
  skipped: number
  failed: number
  recipients: string[]
  deliveries: ReportDelivery[]
}

function provider(): string {
  if (process.env.RESEND_API_KEY) return 'resend'
  if (process.env.MAIL_WEBHOOK_URL) return 'webhook'
  return 'none'
}

export async function deliverReport(
  month: string,
  recipients: string[],
  by: string,
): Promise<DeliveryResult> {
  const report = await buildMonthReport(month)
  const content = await readSiteContent()
  const pdf = await buildProfitLossPdf(report, content.brand)
  const template = profitLossEmail({
    month: report.label,
    revenue: money.format(report.revenue.billed),
    costs: money.format(report.expenses.total + report.payroll.total),
    net: money.format(report.net.accrual),
    margin: `${report.net.margin.toFixed(1)}%`,
    note: (await readReportSettings()).note,
    brand: content.brand.name,
  })
  const deliveries: ReportDelivery[] = []
  let sent = 0
  let skipped = 0
  let failed = 0
  for (const recipient of recipients) {
    const result = await sendMail({
      to: recipient,
      subject: template.subject,
      html: template.html,
      kind: 'profit-loss-report',
      replyTo: content.brand.contact.email,
      attachments: [
        {
          filename: `${(content.brand.name || 'company').replace(/[^a-z0-9]+/gi, '-')}-profit-loss-${month}.pdf`,
          content: pdf,
        },
      ],
    })
    if (result.status === 'sent') sent += 1
    else if (result.status === 'skipped') skipped += 1
    else failed += 1
    deliveries.push({
      id: randomUUID(),
      month,
      at: nowIso(),
      recipients: [recipient],
      status: result.status,
      provider: provider(),
      error: result.error ?? null,
      by,
    })
  }
  if (deliveries.length) {
    await deliveryStore.mutate((current) => [...deliveries, ...current].slice(0, 300))
  }
  return {
    status: sent > 0 ? 'sent' : failed > 0 ? 'failed' : 'skipped',
    sent,
    skipped,
    failed,
    recipients,
    deliveries,
  }
}

/** Runs from the background job on the configured day (1st by default). */
export async function autoSendProfitLossReport(now = Date.now()): Promise<void> {
  if (!mailerConfigured()) return
  const settings = await readReportSettings()
  if (!settings.autoSend) return
  const today = todayInZone(BUSINESS_TIMEZONE, now)
  if (Number(today.slice(8, 10)) !== settings.sendDay) return
  const month = shiftMonth(today.slice(0, 7), -1)
  if (settings.lastAutoSentMonth === month) return
  const recipients = settings.recipients.length ? settings.recipients : [ADMIN_NOTIFY_EMAIL]
  const result = await deliverReport(month, recipients, 'scheduler')
  if (result.status !== 'sent') {
    console.error(
      '[hvac-api] monthly profit & loss was not sent',
      result.status,
      result.deliveries[0]?.error ?? '',
    )
    return
  }
  await settingsStore.mutate((current) => ({
    ...(current ?? settings),
    ...settings,
    lastAutoSentMonth: month,
    updatedAt: nowIso(),
  }))
  console.log(`[hvac-api] sent profit & loss for ${month} to ${recipients.join(', ')}`)
}

export { settingsStore as reportSettingsStore, deliveryStore as reportDeliveryStore }
