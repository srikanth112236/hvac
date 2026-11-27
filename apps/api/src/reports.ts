import { Router } from 'express'
import { z } from 'zod'
import { reportSettingsSchema, type ReportSettings } from '@hvac/shared'
import { requireAdmin, requireAdminMutation, requirePermission } from './auth.js'
import { readSiteContent } from './content.js'
import {
  buildMonthReport,
  deliverReport,
  deliveriesFor,
  readReportSettings,
  reportHistory,
  saveReportSettings,
  validMonth,
} from './financeReports.js'
import { streamProfitLossPdf } from './profitLossPdf.js'
import {
  buildReportsAnalytics,
  findReport,
  reportToCsv,
} from './analyticsReports.js'
import { streamAnalyticsPdf } from './analyticsPdf.js'

export const reportsRouter = Router()
reportsRouter.use(requireAdmin, requirePermission('billing.write'), requireAdminMutation)

reportsRouter.get('/reports/profit-loss', async (req, res) => {
  const month = validMonth(req.query.month)
  const [report, settings] = await Promise.all([
    buildMonthReport(month),
    readReportSettings(),
  ])
  res.json({ data: report, meta: { settings } })
})

reportsRouter.get('/reports/profit-loss/history', async (req, res) => {
  const months = Math.min(24, Math.max(3, Number(req.query.months) || 12))
  res.json({ data: await reportHistory(months) })
})

reportsRouter.get('/reports/profit-loss/deliveries', async (req, res) => {
  res.json({ data: await deliveriesFor(validMonth(req.query.month)) })
})

reportsRouter.get('/reports/profit-loss.pdf', async (req, res) => {
  const month = validMonth(req.query.month)
  const [report, content] = await Promise.all([buildMonthReport(month), readSiteContent()])
  streamProfitLossPdf(res, report, content.brand)
})

reportsRouter.get('/reports/analytics', async (req, res) => {
  const months = Number(req.query.months) || 6
  res.json({ data: await buildReportsAnalytics(months) })
})

reportsRouter.get('/reports/analytics.csv', async (req, res) => {
  const analytics = await buildReportsAnalytics(Number(req.query.months) || 6)
  const report = findReport(analytics, String(req.query.key ?? ''))
  if (!report) {
    res.status(404).json({ error: { code: 'not_found', message: 'Report not found.' } })
    return
  }
  const csv = reportToCsv(report, analytics)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${report.key}-${analytics.period.months}m.csv"`,
  )
  res.setHeader('Cache-Control', 'private, no-store')
  res.send(`\ufeff${csv}`)
})

reportsRouter.get('/reports/analytics.pdf', async (req, res) => {
  const analytics = await buildReportsAnalytics(Number(req.query.months) || 6)
  const report = findReport(analytics, String(req.query.key ?? ''))
  if (!report) {
    res.status(404).json({ error: { code: 'not_found', message: 'Report not found.' } })
    return
  }
  const content = await readSiteContent()
  streamAnalyticsPdf(res, report, analytics, content.brand)
})

const sendSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  recipients: z.array(z.string().trim().email()).max(10).optional(),
})

reportsRouter.post('/reports/profit-loss/send', async (req, res) => {
  const parsed = sendSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid recipients.',
      },
    })
    return
  }
  const settings = await readReportSettings()
  const recipients = (parsed.data.recipients?.length ? parsed.data.recipients : settings.recipients)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
  if (!recipients.length) {
    res.status(400).json({
      error: {
        code: 'no_recipients',
        message: 'Add at least one recipient email before sending.',
      },
    })
    return
  }
  const admin = res.locals.admin as { email?: string } | undefined
  const result = await deliverReport(parsed.data.month, recipients, admin?.email ?? 'admin')
  const report = await buildMonthReport(parsed.data.month)
  res.json({
    data: {
      status: result.status,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      recipients: result.recipients,
      deliveries: result.deliveries,
    },
    report,
  })
})

reportsRouter.get('/reports/settings', async (_req, res) => {
  res.json({ data: await readReportSettings() })
})

reportsRouter.put('/reports/settings', async (req, res) => {
  const parsed = reportSettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid report settings.',
      },
    })
    return
  }
  const current = await readReportSettings()
  const saved: ReportSettings = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
    lastAutoSentMonth: current.lastAutoSentMonth,
  }
  res.json({ data: await saveReportSettings(saved) })
})
