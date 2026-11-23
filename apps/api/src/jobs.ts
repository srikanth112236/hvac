import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pruneAuditLog } from './audit.js'
import { readBusinessSnapshot, summarizeInvoices } from './business.js'
import {
  ADMIN_NOTIFY_EMAIL,
  AUDIT_RETENTION_DAYS,
  BUSINESS_TIMEZONE,
  EMAIL_LOG_RETENTION_DAYS,
  mailerConfigured,
} from './config.js'
import { readLeads } from './leads.js'
import { pruneEmailLog, sendMail, worksDeskNotice } from './mailer.js'
import { appointmentStore } from './portal.js'
import { amcStore, ticketStore } from './portalModules.js'
import { reminderStore } from './reminders.js'
import { createStore, DATA_DIR } from './store.js'
import { hourInZone, startOfTodayInZone, todayInZone } from './time.js'

interface JobState {
  version: number
  reminderNotified: Record<string, string>
  amcNotified: Record<string, string>
  lastDigestDate: string | null
  lastBackupDate: string | null
}

const stateStore = createStore<JobState>('job-state.json', () => ({
  version: 1,
  reminderNotified: {},
  amcNotified: {},
  lastDigestDate: null,
  lastBackupDate: null,
}))

const DAY = 86_400_000
const BACKUP_ROOT = path.join(DATA_DIR, 'backups')
const SENSITIVE = new Set(['admin-sessions.json', 'customer-sessions.json', 'password-resets.json'])

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function capRecord(record: Record<string, string>, max = 2000): Record<string, string> {
  const keys = Object.keys(record)
  if (keys.length <= max) return record
  const next: Record<string, string> = {}
  for (const key of keys.slice(keys.length - max)) next[key] = record[key] ?? ''
  return next
}

async function notify(subject: string, heading: string, body: string): Promise<boolean> {
  if (!mailerConfigured()) return false
  const result = await sendMail({
    to: ADMIN_NOTIFY_EMAIL,
    kind: 'job',
    ...worksDeskNotice({ subject, heading, body }),
  })
  return result.ok
}

/* -------------------------------------------------------------------------- */
/*  Due reminders                                                             */
/* -------------------------------------------------------------------------- */

async function runReminderNotifications(now: number): Promise<void> {
  if (!mailerConfigured()) return
  const reminders = await reminderStore.read()
  const state = await stateStore.read()
  const due = reminders.filter(
    (reminder) =>
      reminder.status === 'open' &&
      Date.parse(reminder.dueAt) <= now &&
      !state.reminderNotified[`${reminder.id}:${reminder.dueAt}`],
  )
  if (!due.length) return

  const sent: Record<string, string> = {}
  for (const reminder of due) {
    const ok = await notify(
      `Reminder due · ${reminder.title}`,
      reminder.title,
      `${reminder.body}\nDue ${new Date(reminder.dueAt).toLocaleString('en-US', { timeZone: BUSINESS_TIMEZONE })}${
        reminder.leadRef ? `\nLead ${reminder.leadRef}` : ''
      }${reminder.invoiceRef ? `\nInvoice ${reminder.invoiceRef}` : ''}`,
    )
    if (ok) sent[`${reminder.id}:${reminder.dueAt}`] = new Date(now).toISOString()
  }

  if (Object.keys(sent).length) {
    await stateStore.mutate((current) => ({
      ...current,
      reminderNotified: capRecord({ ...current.reminderNotified, ...sent }),
    }))
  }
}

/* -------------------------------------------------------------------------- */
/*  AMC renewal windows                                                       */
/* -------------------------------------------------------------------------- */

async function runAmcReminders(now: number): Promise<void> {
  if (!mailerConfigured()) return
  const contracts = await amcStore.read()
  const state = await stateStore.read()
  const sent: Record<string, string> = {}

  for (const contract of contracts) {
    if (contract.status !== 'active') continue
    const end = Date.parse(contract.endDate)
    if (!Number.isFinite(end)) continue
    const days = Math.ceil((end - now) / DAY)
    const threshold = days <= 0 ? 'expired' : days <= 7 ? 7 : days <= 30 ? 30 : days <= 60 ? 60 : null
    if (threshold === null) continue
    const key = `${contract.id}:${threshold}:${contract.endDate}`
    if (state.amcNotified[key]) continue
    const ok = await notify(
      `AMC ${threshold === 'expired' ? 'expired' : `${threshold}-day renewal`} · ${contract.ref}`,
      `${contract.plan} · ${contract.ref}`,
      `Contract ends ${contract.endDate} (${days <= 0 ? 'expired' : `${days} days left`}).\nAnnual value ${money.format(contract.price)} · ${contract.visitsPerYear} visits/year.\nOpen the customer file to quote the renewal.`,
    )
    if (ok) sent[key] = new Date(now).toISOString()
  }

  if (Object.keys(sent).length) {
    await stateStore.mutate((current) => ({
      ...current,
      amcNotified: capRecord({ ...current.amcNotified, ...sent }),
    }))
  }
}

/* -------------------------------------------------------------------------- */
/*  Daily digest                                                              */
/* -------------------------------------------------------------------------- */

async function runDailyDigest(now: number): Promise<void> {
  if (!mailerConfigured()) return
  if (hourInZone(BUSINESS_TIMEZONE, now) < 8) return
  const date = todayInZone(BUSINESS_TIMEZONE, now)
  const state = await stateStore.read()
  if (state.lastDigestDate === date) return

  const [leads, reminders, business, appointments, tickets, contracts] = await Promise.all([
    readLeads(),
    reminderStore.read(),
    readBusinessSnapshot(),
    appointmentStore.read(),
    ticketStore.read(),
    amcStore.read(),
  ])
  const start = startOfTodayInZone(BUSINESS_TIMEZONE, now).getTime()
  const end = start + DAY
  const newLeads = leads.filter((lead) => Date.parse(lead.createdAt) >= start)
  const openReminders = reminders.filter((reminder) => reminder.status === 'open')
  const overdueReminders = openReminders.filter((reminder) => Date.parse(reminder.dueAt) < now)
  const invoiceSummary = summarizeInvoices(business.invoices, now)
  const todayVisits = appointments.filter((appointment) => {
    const at = Date.parse(appointment.scheduledAt)
    return at >= start && at < end && appointment.status !== 'cancelled'
  })
  const openTickets = tickets.filter(
    (ticket) => ticket.status === 'open' || ticket.status === 'in-progress',
  )
  const amcWindow = contracts.filter((contract) => {
    if (contract.status !== 'active') return false
    const remaining = Date.parse(contract.endDate) - now
    return remaining >= 0 && remaining <= 30 * DAY
  })

  const body = [
    `New leads today: ${newLeads.length}`,
    `Visits today: ${todayVisits.length}`,
    `Open reminders: ${openReminders.length} (${overdueReminders.length} overdue)`,
    `Invoices overdue: ${invoiceSummary.overdueCount} · ${money.format(invoiceSummary.overdueAmount)}`,
    `Open support requests: ${openTickets.length}`,
    `AMC renewals in 30 days: ${amcWindow.length}`,
    `Outstanding balance: ${money.format(invoiceSummary.outstanding)}`,
  ].join('\n')

  const ok = await notify(`Daily works digest · ${date}`, 'Daily works digest', body)
  if (ok) {
    await stateStore.mutate((current) => ({ ...current, lastDigestDate: date }))
  }
}

/* -------------------------------------------------------------------------- */
/*  Daily JSON backup                                                         */
/* -------------------------------------------------------------------------- */

async function runBackup(now: number): Promise<void> {
  const date = todayInZone(BUSINESS_TIMEZONE, now)
  const target = path.join(BACKUP_ROOT, date)
  try {
    const files = await readdir(DATA_DIR)
    const jsonFiles = files.filter((file) => file.endsWith('.json') && !SENSITIVE.has(file))
    if (!jsonFiles.length) return
    await mkdir(target, { recursive: true })
    for (const file of jsonFiles) {
      await copyFile(path.join(DATA_DIR, file), path.join(target, file))
    }
    const backups = (await readdir(BACKUP_ROOT))
      .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry))
      .sort()
    while (backups.length > 7) {
      const oldest = backups.shift()
      if (oldest) await rm(path.join(BACKUP_ROOT, oldest), { recursive: true, force: true })
    }
    const state = await stateStore.read()
    if (state.lastBackupDate !== date) {
      await stateStore.mutate((current) => ({ ...current, lastBackupDate: date }))
    }
  } catch (error) {
    console.error('[hvac-api] backup failed', error)
  }
}

/* -------------------------------------------------------------------------- */
/*  Log retention                                                             */
/* -------------------------------------------------------------------------- */

async function runRetention(): Promise<void> {
  const [auditRemoved, emailRemoved] = await Promise.all([
    pruneAuditLog(AUDIT_RETENTION_DAYS),
    pruneEmailLog(EMAIL_LOG_RETENTION_DAYS),
  ])
  if (auditRemoved || emailRemoved) {
    console.log(
      `[hvac-api] retention pruned audit=${auditRemoved} email=${emailRemoved} ` +
        `(audit ${AUDIT_RETENTION_DAYS}d, email ${EMAIL_LOG_RETENTION_DAYS}d)`,
    )
  }
}

/* -------------------------------------------------------------------------- */
/*  Runner                                                                    */
/* -------------------------------------------------------------------------- */

let running = false

async function tick(): Promise<void> {
  if (running) return
  running = true
  const now = Date.now()
  try {
    await runReminderNotifications(now)
    await runAmcReminders(now)
    await runDailyDigest(now)
    await runBackup(now)
    await runRetention()
  } catch (error) {
    console.error('[hvac-api] background job failed', error)
  } finally {
    running = false
  }
}

export function startJobs(): void {
  const first = setTimeout(() => void tick(), 5_000)
  first.unref()
  const timer = setInterval(() => void tick(), 5 * 60 * 1000)
  timer.unref()
  console.log('[hvac-api] background jobs started (reminders, AMC, digest, backup)')
}

export async function runJobsNow(): Promise<void> {
  await tick()
}
