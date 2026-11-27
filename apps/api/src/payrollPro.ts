import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import {
  DEFAULT_PAYROLL_SETTINGS,
  advanceInputSchema,
  attendanceInputSchema,
  calculatePayroll,
  daysUntilPayday,
  defaultSalaryStructure,
  isPayrollCalculationWindow,
  leaveInputSchema,
  leavePatchSchema,
  payrollSettingsSchema,
  salaryStructureSchema,
  type AttendanceRecord,
  type LeaveRequest,
  type PayrollSettings,
  type SalaryAdvance,
  type SalaryStructure,
  type TeamMember,
} from '@hvac/shared'
import { INVOICE_PAYMENT_METHODS, type PayrollPayment, type PayrollRecord } from '@hvac/shared'
import { requireAdmin, requireAdminMutation, requirePermission } from './auth.js'
import { payrollStore, teamStore } from './business.js'
import { readSiteContent } from './content.js'
import { payslipEmail, sendMail } from './mailer.js'
import { createNotification } from './notifications.js'
import { buildPayslipPdf, streamPayslipPdf } from './payslipPdf.js'
import { createStore } from './store.js'

const nowIso = () => new Date().toISOString()
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

const structureStore = createStore<Record<string, SalaryStructure>>(
  'salary-structures.json',
  () => ({}),
)
const attendanceStore = createStore<AttendanceRecord[]>('attendance.json', () => [])
const leaveStore = createStore<LeaveRequest[]>('team-leaves.json', () => [])
const advanceStore = createStore<SalaryAdvance[]>('salary-advances.json', () => [])
const settingsStore = createStore<PayrollSettings>('payroll-settings.json', () => ({
  ...DEFAULT_PAYROLL_SETTINGS,
  updatedAt: nowIso(),
}))

export const payrollSettingsStore = settingsStore
export const attendanceRecordsStore = attendanceStore
export const leaveRequestsStore = leaveStore
export const salaryAdvanceStore = advanceStore

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function validPeriod(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) ? value : currentPeriod()
}

async function readSettings(): Promise<PayrollSettings> {
  const stored = await settingsStore.read()
  const parsed = payrollSettingsSchema.safeParse(stored)
  return {
    ...DEFAULT_PAYROLL_SETTINGS,
    ...(parsed.success ? parsed.data : {}),
    updatedAt: stored?.updatedAt ?? nowIso(),
  }
}

function periodDates(period: string): { from: string; to: string } {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0))
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}

function payDate(period: string, settings: PayrollSettingsInputLike): string {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const day = Math.min(settings.payDay, lastDay)
  return `${period}-${String(day).padStart(2, '0')}`
}

type PayrollSettingsInputLike = {
  payDay: number
  autoCalculateDays: number
  workDaysPerMonth: number
  hoursPerDay: number
  overtimeMultiplier: number
  lateGraceMinutes: number
  payslipPrefix: string
  emailSubject: string
  emailNote: string
  reminderDays: number
}

interface PayrollDataset {
  team: TeamMember[]
  structures: Record<string, SalaryStructure>
  attendance: AttendanceRecord[]
  leaves: LeaveRequest[]
  advances: SalaryAdvance[]
  settings: PayrollSettings
}

async function loadDataset(): Promise<PayrollDataset> {
  const [team, structures, attendance, leaves, advances, settings] = await Promise.all([
    teamStore.read(),
    structureStore.read(),
    attendanceStore.read(),
    leaveStore.read(),
    advanceStore.read(),
    readSettings(),
  ])
  return { team, structures, attendance, leaves, advances, settings }
}

function structureFor(member: TeamMember, dataset: PayrollDataset): SalaryStructure {
  return dataset.structures?.[member.id] ?? defaultSalaryStructure(member)
}

function outstandingAdvances(memberId: string, dataset: PayrollDataset): SalaryAdvance[] {
  return dataset.advances.filter(
    (advance) =>
      advance.memberId === memberId &&
      !advance.recoveredPeriod &&
      advance.amount - (advance.recoveredAmount ?? 0) > 0.004,
  )
}

function allocateAdvances(
  advances: SalaryAdvance[],
  recovery: number,
  period: string,
): { allocations: { advanceId: string; amount: number }[]; updates: SalaryAdvance[] } {
  let left = round2(recovery)
  const allocations: { advanceId: string; amount: number }[] = []
  const updates: SalaryAdvance[] = []
  for (const advance of advances) {
    if (left <= 0.004) break
    const outstanding = round2(advance.amount - (advance.recoveredAmount ?? 0))
    if (outstanding <= 0) continue
    const take = round2(Math.min(outstanding, left))
    left = round2(left - take)
    allocations.push({ advanceId: advance.id, amount: take })
    const recoveredAmount = round2((advance.recoveredAmount ?? 0) + take)
    updates.push({
      ...advance,
      recoveredAmount,
      recoveredPeriod:
        recoveredAmount >= advance.amount - 0.004 ? period : advance.recoveredPeriod,
      updatedAt: nowIso(),
    })
  }
  for (const advance of advances) {
    if (!updates.some((entry) => entry.id === advance.id)) updates.push(advance)
  }
  return { allocations, updates }
}

function calcFor(
  member: TeamMember,
  period: string,
  dataset: PayrollDataset,
  manualBonus: number,
  manualDeductions: number,
) {
  const structure = structureFor(member, dataset)
  const attendance = dataset.attendance.filter(
    (entry) => entry.memberId === member.id && entry.date.startsWith(period),
  )
  const leaves = dataset.leaves.filter((entry) => entry.memberId === member.id)
  const advances = outstandingAdvances(member.id, dataset)
  const advanceBalance = advances.reduce(
    (sum, entry) => sum + (entry.amount - (entry.recoveredAmount ?? 0)),
    0,
  )
  const calculation = calculatePayroll({
    member,
    structure,
    settings: dataset.settings,
    attendance,
    leaves,
    period,
    advanceBalance,
    extraBonus: manualBonus,
    extraDeductions: manualDeductions,
  })
  return { structure, attendance, calculation, advances }
}

function balanceOf(record: PayrollRecord): number {
  const paid = record.payments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0
  return round2(Math.max(0, record.amount - paid))
}

function summarizeRecords(records: PayrollRecord[]) {
  return {
    count: records.length,
    paid: records.filter((entry) => entry.status === 'paid').length,
    pending: records.filter((entry) => entry.status !== 'paid').length,
    total: round2(records.reduce((sum, entry) => sum + entry.amount, 0)),
    paidAmount: round2(
      records.reduce(
        (sum, entry) =>
          sum +
          (entry.payments?.reduce((inner, payment) => inner + payment.amount, 0) ??
            (entry.status === 'paid' ? entry.amount : 0)),
        0,
      ),
    ),
  }
}

interface AttentionItem {
  id: string
  kind: 'missing' | 'due' | 'partial' | 'overdue'
  title: string
  message: string
  amount: number
  memberId: string
  payrollId: string | null
}

function buildAttention(
  period: string,
  dataset: PayrollDataset,
  records: PayrollRecord[],
): AttentionItem[] {
  const items: AttentionItem[] = []
  const inPeriod = records.filter((entry) => entry.period === period)
  const byMember = new Map(inPeriod.map((entry) => [entry.memberId, entry]))
  const due = payDate(period, dataset.settings)
  const today = new Date().toISOString().slice(0, 10)
  const days = daysUntilPayday(dataset.settings)
  for (const member of dataset.team) {
    if (member.status !== 'active' || member.monthlySalary <= 0) continue
    const record = byMember.get(member.id)
    if (!record) {
      if (isPayrollCalculationWindow(dataset.settings)) {
        items.push({
          id: `missing-${member.id}`,
          kind: 'missing',
          title: `${member.name} has no payslip for ${period}`,
          message: `Payday is ${due}. Calculate the payslip before the run closes.`,
          amount: member.monthlySalary,
          memberId: member.id,
          payrollId: null,
        })
      }
      continue
    }
    const paid = record.payments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0
    const balance = balanceOf(record)
    if (record.status === 'paid' || balance <= 0.004) continue
    if (paid > 0) {
      items.push({
        id: `partial-${record.id}`,
        kind: 'partial',
        title: `${member.name} is part paid`,
        message: `Balance ${balance.toFixed(2)} of ${record.amount.toFixed(2)} is still due. Send a reminder or record the rest.`,
        amount: balance,
        memberId: member.id,
        payrollId: record.id,
      })
    } else if (today > due || days < 0) {
      items.push({
        id: `overdue-${record.id}`,
        kind: 'overdue',
        title: `${member.name}'s salary is past payday`,
        message: `Payday was ${due}. Record the full or part payment.`,
        amount: balance,
        memberId: member.id,
        payrollId: record.id,
      })
    } else if (days <= dataset.settings.reminderDays) {
      items.push({
        id: `due-${record.id}`,
        kind: 'due',
        title: `${member.name}'s salary is due ${due}`,
        message: `${record.number ?? 'Payslip'} is pending. Settle it on or before payday.`,
        amount: balance,
        memberId: member.id,
        payrollId: record.id,
      })
    }
  }
  return items
}

/* -------------------------------------------------------------------------- */
/*  Router                                                                     */
/* -------------------------------------------------------------------------- */

export const payrollRouter = Router()
payrollRouter.use(requireAdmin, requirePermission('billing.write'), requireAdminMutation)

payrollRouter.get('/payroll/settings', async (_req, res) => {
  res.json({ data: await readSettings() })
})

payrollRouter.put('/payroll/settings', async (req, res) => {
  const parsed = payrollSettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid payroll settings.',
      },
    })
    return
  }
  const record: PayrollSettings = { ...parsed.data, updatedAt: nowIso() }
  await settingsStore.write(record)
  res.json({ data: record })
})

payrollRouter.get('/payroll/structures', async (_req, res) => {
  res.json({ data: await structureStore.read() })
})

payrollRouter.put('/payroll/structures/:memberId', async (req, res) => {
  const parsed = salaryStructureSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid salary structure.',
      },
    })
    return
  }
  const team = await teamStore.read()
  const member = team.find((entry) => entry.id === req.params.memberId)
  if (!member) {
    res.status(404).json({ error: { code: 'not_found', message: 'Team member not found.' } })
    return
  }
  const record: SalaryStructure = {
    memberId: member.id,
    components: parsed.data.components,
    updatedAt: nowIso(),
  }
  await structureStore.mutate((current) => ({ ...current, [member.id]: record }))
  res.json({ data: record })
})

payrollRouter.get('/attendance', async (req, res) => {
  const period = validPeriod(req.query.period)
  const memberId = typeof req.query.memberId === 'string' ? req.query.memberId : ''
  const records = (await attendanceStore.read()).filter(
    (entry) => entry.date.startsWith(period) && (!memberId || entry.memberId === memberId),
  )
  records.sort((a, b) => a.date.localeCompare(b.date))
  res.json({ data: records, meta: { period } })
})

payrollRouter.put('/attendance/:memberId/:date', async (req, res) => {
  const parsed = attendanceInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid attendance entry.',
      },
    })
    return
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.params.date)) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Use YYYY-MM-DD.' } })
    return
  }
  const team = await teamStore.read()
  if (!team.some((member) => member.id === req.params.memberId)) {
    res.status(404).json({ error: { code: 'not_found', message: 'Team member not found.' } })
    return
  }
  const now = nowIso()
  let saved: AttendanceRecord | undefined
  await attendanceStore.mutate((current) => {
    const existing = current.find(
      (entry) => entry.memberId === req.params.memberId && entry.date === req.params.date,
    )
    if (existing) {
      saved = { ...existing, ...parsed.data, updatedAt: now }
      return current.map((entry) => (entry.id === existing.id ? (saved as AttendanceRecord) : entry))
    }
    saved = {
      id: randomUUID(),
      memberId: req.params.memberId,
      date: req.params.date,
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    }
    return [saved, ...current]
  })
  res.json({ data: saved })
})

payrollRouter.delete('/attendance/:memberId/:date', async (req, res) => {
  await attendanceStore.mutate((current) =>
    current.filter(
      (entry) => !(entry.memberId === req.params.memberId && entry.date === req.params.date),
    ),
  )
  res.json({ data: { deleted: `${req.params.memberId}:${req.params.date}` } })
})

payrollRouter.get('/leaves', async (req, res) => {
  const period = validPeriod(req.query.period)
  const { from, to } = periodDates(period)
  const records = (await leaveStore.read())
    .filter((entry) => entry.to >= from && entry.from <= to)
    .sort((a, b) => b.from.localeCompare(a.from))
  res.json({ data: records, meta: { period } })
})

payrollRouter.post('/leaves', async (req, res) => {
  const parsed = leaveInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid leave request.',
      },
    })
    return
  }
  const team = await teamStore.read()
  if (!team.some((member) => member.id === parsed.data.memberId)) {
    res.status(404).json({ error: { code: 'not_found', message: 'Team member not found.' } })
    return
  }
  const now = nowIso()
  const record: LeaveRequest = { id: randomUUID(), ...parsed.data, createdAt: now, updatedAt: now }
  await leaveStore.mutate((current) => [record, ...current])
  res.status(201).json({ data: record })
})

payrollRouter.patch('/leaves/:id', async (req, res) => {
  const parsed = leavePatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid leave request.',
      },
    })
    return
  }
  let updated: LeaveRequest | undefined
  await leaveStore.mutate((current) =>
    current.map((entry) => {
      if (entry.id !== req.params.id) return entry
      updated = { ...entry, ...parsed.data, updatedAt: nowIso() }
      return updated
    }),
  )
  if (!updated) {
    res.status(404).json({ error: { code: 'not_found', message: 'Leave request not found.' } })
    return
  }
  res.json({ data: updated })
})

payrollRouter.delete('/leaves/:id', async (req, res) => {
  await leaveStore.mutate((current) => current.filter((entry) => entry.id !== req.params.id))
  res.json({ data: { deleted: req.params.id } })
})

payrollRouter.get('/advances', async (req, res) => {
  const memberId = typeof req.query.memberId === 'string' ? req.query.memberId : ''
  const records = (await advanceStore.read())
    .filter((entry) => !memberId || entry.memberId === memberId)
    .sort((a, b) => b.date.localeCompare(a.date))
  res.json({ data: records })
})

payrollRouter.post('/advances', async (req, res) => {
  const parsed = advanceInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid salary advance.',
      },
    })
    return
  }
  const team = await teamStore.read()
  if (!team.some((member) => member.id === parsed.data.memberId)) {
    res.status(404).json({ error: { code: 'not_found', message: 'Team member not found.' } })
    return
  }
  const now = nowIso()
  const record: SalaryAdvance = {
    id: randomUUID(),
    ...parsed.data,
    recoveredAmount: 0,
    createdAt: now,
    updatedAt: now,
  }
  await advanceStore.mutate((current) => [record, ...current])
  res.status(201).json({ data: record })
})

payrollRouter.delete('/advances/:id', async (req, res) => {
  await advanceStore.mutate((current) => current.filter((entry) => entry.id !== req.params.id))
  res.json({ data: { deleted: req.params.id } })
})

/** Calculate or refresh every unpaid payslip in a period. */
async function preparePeriod(period: string) {
  const dataset = await loadDataset()
  const existing = (await payrollStore.read()).filter((entry) => entry.period === period)
  const existingByMember = new Map(existing.map((entry) => [entry.memberId, entry]))
  const prepared = new Map<
    string,
    { record: Omit<PayrollRecord, 'id' | 'createdAt' | 'updatedAt'>; advances: SalaryAdvance[] }
  >()
  let sequence = existing.length
  for (const member of dataset.team) {
    if (member.status !== 'active' || member.monthlySalary <= 0) continue
    const current = existingByMember.get(member.id)
    if (current?.status === 'paid') continue
    const manualBonus = current?.manualBonus ?? (current?.earnings ? 0 : (current?.bonus ?? 0))
    const manualDeductions =
      current?.manualDeductions ?? (current?.earnings ? 0 : (current?.deductions ?? 0))
    // An advance recovered by this same payslip is available again while recalculating it.
    const memberDataset: PayrollDataset = {
      ...dataset,
      advances: dataset.advances.map((advance) => {
        const used = (current?.advanceAllocations ?? [])
          .filter((entry) => entry.advanceId === advance.id)
          .reduce((sum, entry) => sum + entry.amount, 0)
        if (used <= 0) return advance
        const recoveredAmount = round2(Math.max(0, (advance.recoveredAmount ?? 0) - used))
        return {
          ...advance,
          recoveredAmount,
          recoveredPeriod:
            recoveredAmount >= advance.amount - 0.004 ? advance.recoveredPeriod : undefined,
        }
      }),
    }
    const { structure, calculation, advances } = calcFor(
      member,
      period,
      memberDataset,
      manualBonus,
      manualDeductions,
    )
    const allocation = allocateAdvances(advances, calculation.advanceRecovery, period)
    sequence += 1
    const number =
      current?.number ??
      `${dataset.settings.payslipPrefix}-${period.replace('-', '')}-${String(sequence).padStart(4, '0')}`
    prepared.set(member.id, {
      record: {
        memberId: member.id,
        period,
        baseAmount: round2(calculation.gross - manualBonus),
        bonus: round2(manualBonus),
        deductions: calculation.totalDeductions,
        amount: calculation.net,
        status: current?.status ?? 'pending',
        paidAt: current?.paidAt ?? null,
        method: current?.method ?? 'bank-transfer',
        reference: current?.reference ?? '',
        notes: current?.notes ?? '',
        number,
        gross: calculation.gross,
        earnings: calculation.earnings,
        deductionLines: calculation.deductionLines,
        attendance: calculation.attendance,
        advanceRecovery: calculation.advanceRecovery,
        structure: structure.components,
        payments: current?.payments ?? [],
        paidAmount:
          current?.payments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0,
        balance: 0,
        emailSentAt: current?.emailSentAt ?? null,
        manualBonus: round2(manualBonus),
        manualDeductions: round2(manualDeductions),
        advanceAllocations: allocation.allocations,
      },
      advances: allocation.updates,
    })
  }

  let created = 0
  let updated = 0
  await payrollStore.mutate((current) => {
    const byId = new Map(current.map((entry) => [entry.id, entry]))
    for (const [memberId, payload] of prepared) {
      const record = existingByMember.get(memberId)
      if (record) {
        const next: PayrollRecord = {
          ...(byId.get(record.id) ?? record),
          ...payload.record,
          id: record.id,
          createdAt: record.createdAt,
          updatedAt: nowIso(),
        }
        next.balance = balanceOf(next)
        next.status = next.balance <= 0.004 && next.amount > 0 ? 'paid' : next.status
        byId.set(next.id, next)
        updated += 1
      } else {
        const now = nowIso()
        const next: PayrollRecord = {
          ...payload.record,
          id: randomUUID(),
          createdAt: now,
          updatedAt: now,
        }
        next.balance = balanceOf(next)
        byId.set(next.id, next)
        created += 1
      }
    }
    return [...byId.values()]
  })

  const advanceUpdates = [...prepared.values()].flatMap((entry) => entry.advances)
  if (advanceUpdates.length) {
    const byId = new Map(advanceUpdates.map((entry) => [entry.id, entry]))
    await advanceStore.mutate((current) =>
      current.map((entry) => byId.get(entry.id) ?? entry),
    )
  }

  const records = (await payrollStore.read()).filter((entry) => entry.period === period)
  return {
    period,
    created,
    updated,
    skipped: Math.max(0, prepared.size - created - updated),
    records,
    attention: buildAttention(period, dataset, await payrollStore.read()),
    windowOpen: isPayrollCalculationWindow(dataset.settings),
    daysToPayday: daysUntilPayday(dataset.settings),
    settings: dataset.settings,
    advances: advanceUpdates,
  }
}

payrollRouter.post('/payroll/prepare', async (req, res) => {
  const period = validPeriod(req.body?.period)
  const result = await preparePeriod(period)
  res.json({ data: result, summary: summarizeRecords(result.records) })
})

payrollRouter.get('/payroll/overview', async (req, res) => {
  const period = validPeriod(req.query.period)
  const dataset = await loadDataset()
  const all = await payrollStore.read()
  const records = all
    .filter((entry) => entry.period === period)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json({
    data: {
      period,
      records,
      team: dataset.team,
      settings: dataset.settings,
      daysToPayday: daysUntilPayday(dataset.settings),
      windowOpen: isPayrollCalculationWindow(dataset.settings),
      payDate: payDate(period, dataset.settings),
      attention: buildAttention(period, dataset, all),
      summary: summarizeRecords(records),
    },
  })
})

const paymentSchema = z.object({
  amount: z.number().positive().max(100_000_000),
  method: z.enum(INVOICE_PAYMENT_METHODS).default('bank-transfer'),
  reference: z.string().trim().max(120).default(''),
  note: z.string().trim().max(400).default(''),
  paidAt: z.string().trim().max(40).optional(),
})

const adjustmentSchema = z.object({
  bonus: z.number().min(0).max(100_000_000).default(0),
  deductions: z.number().min(0).max(100_000_000).default(0),
})

payrollRouter.patch('/payroll/:id/adjustments', async (req, res) => {
  const parsed = adjustmentSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid adjustments.',
      },
    })
    return
  }
  const record = (await payrollStore.read()).find((entry) => entry.id === req.params.id)
  if (!record) {
    res.status(404).json({ error: { code: 'not_found', message: 'Payslip not found.' } })
    return
  }
  if (record.status === 'paid') {
    res.status(409).json({
      error: { code: 'already_paid', message: 'This payslip is already settled in full.' },
    })
    return
  }
  await payrollStore.mutate((current) =>
    current.map((entry) =>
      entry.id === record.id
        ? {
            ...entry,
            manualBonus: parsed.data.bonus,
            manualDeductions: parsed.data.deductions,
            updatedAt: nowIso(),
          }
        : entry,
    ),
  )
  await preparePeriod(record.period)
  const updated = (await payrollStore.read()).find((entry) => entry.id === record.id)
  res.json({ data: updated ?? record })
})

payrollRouter.post('/payroll/:id/payment', async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'Invalid salary payment.',
      },
    })
    return
  }
  const team = await teamStore.read()
  let updated: PayrollRecord | undefined
  let memberName = 'Team member'
  await payrollStore.mutate((current) =>
    current.map((entry) => {
      if (entry.id !== req.params.id) return entry
      const paidBefore =
        entry.payments?.reduce((sum, payment) => sum + payment.amount, 0) ??
        (entry.status === 'paid' ? entry.amount : 0)
      const balance = round2(Math.max(0, entry.amount - paidBefore))
      const amount = round2(Math.min(parsed.data.amount, balance))
      if (amount <= 0) {
        updated = entry
        return entry
      }
      const payment: PayrollPayment = {
        id: randomUUID(),
        amount,
        paidAt: parsed.data.paidAt ?? nowIso(),
        method: parsed.data.method,
        reference: parsed.data.reference,
        note: parsed.data.note,
      }
      const payments = [...(entry.payments ?? []), payment]
      const paidAmount = round2(payments.reduce((sum, item) => sum + item.amount, 0))
      const remaining = round2(Math.max(0, entry.amount - paidAmount))
      memberName = team.find((member) => member.id === entry.memberId)?.name ?? memberName
      updated = {
        ...entry,
        payments,
        paidAmount,
        balance: remaining,
        status: remaining <= 0.004 ? 'paid' : 'pending',
        paidAt: remaining <= 0.004 ? payment.paidAt : entry.paidAt,
        method: payment.method,
        reference: payment.reference,
        updatedAt: nowIso(),
      }
      return updated
    }),
  )
  if (!updated) {
    res.status(404).json({ error: { code: 'not_found', message: 'Payslip not found.' } })
    return
  }
  const record = updated as PayrollRecord
  if (record.balance && record.balance > 0) {
    void createNotification({
      type: 'payroll.partial-payment',
      category: 'team',
      priority: 'high',
      title: `Partial salary payment · ${memberName}`,
      message: `${record.number ?? record.period}: ${record.balance.toFixed(2)} still due. Send a reminder or settle the remainder.`,
      link: `/admin/team/payroll?period=${record.period}&payroll=${record.id}`,
      entityType: 'payroll',
      entityId: record.id,
      entityLabel: memberName,
      source: 'admin',
      metadata: { period: record.period, balance: record.balance },
    }).catch(() => undefined)
  } else {
    void createNotification({
      type: 'payroll.paid',
      category: 'team',
      priority: 'normal',
      title: `Salary paid · ${memberName}`,
      message: `${record.number ?? record.period} settled in full. The payslip has been updated.`,
      link: `/admin/team/payroll?period=${record.period}&payroll=${record.id}`,
      entityType: 'payroll',
      entityId: record.id,
      entityLabel: memberName,
      source: 'admin',
      metadata: { period: record.period },
    }).catch(() => undefined)
  }
  res.json({ data: record })
})

payrollRouter.post('/payroll/:id/remind', async (req, res) => {
  const record = (await payrollStore.read()).find((entry) => entry.id === req.params.id)
  if (!record) {
    res.status(404).json({ error: { code: 'not_found', message: 'Payslip not found.' } })
    return
  }
  const member = (await teamStore.read()).find((entry) => entry.id === record.memberId)
  const balance = record.balance ?? balanceOf(record)
  await createNotification({
    type: 'payroll.reminder',
    category: 'team',
    priority: balance > 0 ? 'high' : 'normal',
    title: `Salary reminder · ${member?.name ?? 'Team member'}`,
    message: `${record.number ?? record.period} has ${balance.toFixed(2)} outstanding. Payday ${payDate(record.period, await readSettings())}.`,
    link: `/admin/team/payroll?period=${record.period}&payroll=${record.id}`,
    entityType: 'payroll',
    entityId: record.id,
    entityLabel: member?.name ?? null,
    source: 'system',
    metadata: { period: record.period, balance },
  })
  res.json({ data: { reminded: true, id: record.id } })
})

/** One reminder that covers every missing, due or part-paid salary in a period. */
payrollRouter.post('/payroll/remind-period', async (req, res) => {
  const period = validPeriod(req.body?.period)
  const dataset = await loadDataset()
  const attention = buildAttention(period, dataset, await payrollStore.read())
  for (const item of attention) {
    await createNotification({
      type: 'payroll.period-reminder',
      category: 'team',
      priority: item.kind === 'overdue' || item.kind === 'partial' ? 'high' : 'normal',
      title: item.title,
      message: item.message,
      link: item.payrollId
        ? `/admin/team/payroll?period=${period}&payroll=${item.payrollId}`
        : `/admin/team/payroll?period=${period}`,
      entityType: 'payroll',
      entityId: item.payrollId,
      entityLabel: null,
      source: 'system',
      metadata: { period, kind: item.kind, amount: item.amount },
    })
  }
  res.json({ data: { period, count: attention.length } })
})

payrollRouter.get('/payroll/:id/payslip.pdf', async (req, res) => {
  const record = (await payrollStore.read()).find((entry) => entry.id === req.params.id)
  if (!record) {
    res.status(404).json({ error: { code: 'not_found', message: 'Payslip not found.' } })
    return
  }
  const member = (await teamStore.read()).find((entry) => entry.id === record.memberId)
  if (!member) {
    res.status(409).json({
      error: { code: 'member_missing', message: 'This payslip belongs to a removed team member.' },
    })
    return
  }
  const content = await readSiteContent()
  streamPayslipPdf(res, record, member, content.brand)
})

payrollRouter.post('/payroll/:id/email', async (req, res) => {
  const record = (await payrollStore.read()).find((entry) => entry.id === req.params.id)
  if (!record) {
    res.status(404).json({ error: { code: 'not_found', message: 'Payslip not found.' } })
    return
  }
  const member = (await teamStore.read()).find((entry) => entry.id === record.memberId)
  if (!member) {
    res.status(409).json({
      error: { code: 'member_missing', message: 'This payslip belongs to a removed team member.' },
      })
    return
  }
  if (!member.email) {
    res.status(400).json({
      error: { code: 'email_missing', message: 'Add an email address to this team member first.' },
    })
    return
  }
  const content = await readSiteContent()
  const settings = await readSettings()
  const attachment = await buildPayslipPdf(record, member, content.brand)
  const paid = record.payments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0
  const template = payslipEmail({
    name: member.name,
    period: record.period,
    net: record.amount.toFixed(2),
    paid: paid.toFixed(2),
    status: record.status === 'paid' ? 'paid' : paid > 0 ? 'part paid' : 'pending',
    balance: (record.balance ?? balanceOf(record)).toFixed(2),
    note: settings.emailNote,
    brand: content.brand.name,
  })
  const delivery = await sendMail({
    to: member.email,
    subject: settings.emailSubject.replace('{period}', record.period),
    html: template.html,
    kind: 'payslip',
    replyTo: content.brand.contact.email,
    attachments: [
      {
        filename: `${record.number ?? `payslip-${record.period}`}.pdf`,
        content: attachment,
      },
    ],
  })
  if (delivery.status === 'sent') {
    const next = await payrollStore.mutate((current) =>
      current.map((entry) =>
        entry.id === record.id ? { ...entry, emailSentAt: nowIso(), updatedAt: nowIso() } : entry,
      ),
    )
    const updated = next.find((entry) => entry.id === record.id) ?? record
    res.json({ data: updated, delivery })
    return
  }
  res.json({ data: record, delivery })
})
