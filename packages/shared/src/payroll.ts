import { z } from 'zod'
import type { TeamMember } from './business'

/* -------------------------------------------------------------------------- */
/*  Salary structures                                                          */
/* -------------------------------------------------------------------------- */

export const SALARY_COMPONENT_KINDS = ['earning', 'deduction'] as const
export type SalaryComponentKind = (typeof SALARY_COMPONENT_KINDS)[number]

export const SALARY_COMPONENT_MODES = ['fixed', 'percent'] as const
export type SalaryComponentMode = (typeof SALARY_COMPONENT_MODES)[number]

export const salaryComponentSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  kind: z.enum(SALARY_COMPONENT_KINDS).default('earning'),
  mode: z.enum(SALARY_COMPONENT_MODES).default('fixed'),
  value: z.number().min(0).max(100_000_000).default(0),
  base: z.enum(['gross', 'basic']).default('gross'),
  taxable: z.boolean().default(true),
})
export type SalaryComponent = z.infer<typeof salaryComponentSchema>

export const salaryStructureSchema = z.object({
  components: z.array(salaryComponentSchema).max(40).default([]),
})
export type SalaryStructureInput = z.infer<typeof salaryStructureSchema>

export interface SalaryStructure extends SalaryStructureInput {
  memberId: string
  updatedAt: string
}

/** A brand-new structure starts at exactly the member's monthly salary. */
export function defaultSalaryStructure(member: Pick<TeamMember, 'id' | 'monthlySalary'>): SalaryStructure {
  return {
    memberId: member.id,
    components: [
      {
        id: 'basic',
        name: 'Basic salary',
        kind: 'earning',
        mode: 'fixed',
        value: member.monthlySalary,
        base: 'gross',
        taxable: true,
      },
    ],
    updatedAt: new Date().toISOString(),
  }
}

/* -------------------------------------------------------------------------- */
/*  Settings                                                                   */
/* -------------------------------------------------------------------------- */

export const payrollSettingsSchema = z.object({
  payDay: z.number().int().min(1).max(28).default(28),
  autoCalculateDays: z.number().int().min(0).max(15).default(3),
  workDaysPerMonth: z.number().min(1).max(31).default(22),
  hoursPerDay: z.number().min(1).max(24).default(8),
  overtimeMultiplier: z.number().min(1).max(5).default(1.5),
  lateGraceMinutes: z.number().int().min(0).max(180).default(10),
  payslipPrefix: z.string().trim().min(1).max(12).default('PS'),
  emailSubject: z.string().trim().min(3).max(140).default('Your payslip for {period}'),
  emailNote: z
    .string()
    .trim()
    .max(1200)
    .default('Your payslip is attached. Reply to this email if anything looks wrong.'),
  reminderDays: z.number().int().min(0).max(14).default(3),
})
export type PayrollSettingsInput = z.infer<typeof payrollSettingsSchema>

export interface PayrollSettings extends PayrollSettingsInput {
  updatedAt: string
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettingsInput = {
  payDay: 28,
  autoCalculateDays: 3,
  workDaysPerMonth: 22,
  hoursPerDay: 8,
  overtimeMultiplier: 1.5,
  lateGraceMinutes: 10,
  payslipPrefix: 'PS',
  emailSubject: 'Your payslip for {period}',
  emailNote: 'Your payslip is attached. Reply to this email if anything looks wrong.',
  reminderDays: 3,
}

/* -------------------------------------------------------------------------- */
/*  Attendance, leave and advances                                             */
/* -------------------------------------------------------------------------- */

export const ATTENDANCE_STATUSES = [
  'present',
  'remote',
  'half-day',
  'paid-leave',
  'unpaid-leave',
  'absent',
  'holiday',
] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const attendanceStatusLabel: Record<AttendanceStatus, string> = {
  present: 'Present',
  remote: 'Remote',
  'half-day': 'Half day',
  'paid-leave': 'Paid leave',
  'unpaid-leave': 'Unpaid leave',
  absent: 'Absent',
  holiday: 'Holiday',
}

export const attendanceInputSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES),
  hours: z.number().min(0).max(24).default(8),
  overtimeHours: z.number().min(0).max(12).default(0),
  note: z.string().trim().max(400).default(''),
})

export interface AttendanceRecord extends z.infer<typeof attendanceInputSchema> {
  id: string
  memberId: string
  date: string
  createdAt: string
  updatedAt: string
}

export type AttendanceInput = z.infer<typeof attendanceInputSchema>

export const LEAVE_TYPES = ['paid', 'sick', 'unpaid'] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]
export const leaveTypeLabel: Record<LeaveType, string> = {
  paid: 'Paid leave',
  sick: 'Sick leave',
  unpaid: 'Unpaid leave',
}

export const leaveBaseSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
  type: z.enum(LEAVE_TYPES).default('paid'),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(500).default(''),
  status: z.enum(['pending', 'approved', 'rejected']).default('approved'),
})

export const leaveInputSchema = leaveBaseSchema.refine(
  (value) => value.to >= value.from,
  { message: 'Leave end date must be on or after the start date.', path: ['to'] },
)
export const leavePatchSchema = leaveBaseSchema.partial()
export type LeaveInput = z.infer<typeof leaveInputSchema>

export interface LeaveRequest extends LeaveInput {
  id: string
  createdAt: string
  updatedAt: string
}

export const advanceInputSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive().max(100_000_000),
  note: z.string().trim().max(400).default(''),
  recoverInPeriod: z.string().regex(/^\d{4}-\d{2}$/).or(z.literal('')).default(''),
})
export type AdvanceInput = z.infer<typeof advanceInputSchema>

export interface SalaryAdvance extends AdvanceInput {
  id: string
  /** Set once a payroll run has recovered this advance. */
  recoveredPeriod?: string
  recoveredAmount?: number
  createdAt: string
  updatedAt: string
}

/* -------------------------------------------------------------------------- */
/*  Calculation                                                                */
/* -------------------------------------------------------------------------- */

export interface PayslipLine {
  label: string
  amount: number
}

export interface AttendanceSummary {
  presentDays: number
  paidLeaveDays: number
  unpaidDays: number
  halfDays: number
  overtimeHours: number
  workedHours: number
  recordedDays: number
}

export interface PayrollCalculation {
  gross: number
  earnings: PayslipLine[]
  deductionLines: PayslipLine[]
  totalDeductions: number
  net: number
  basic: number
  perDay: number
  hourlyRate: number
  attendance: AttendanceSummary
  unpaidLeaveDeduction: number
  overtimePay: number
  advanceRecovery: number
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

export function summarizeAttendance(records: AttendanceRecord[]): AttendanceSummary {
  const summary: AttendanceSummary = {
    presentDays: 0,
    paidLeaveDays: 0,
    unpaidDays: 0,
    halfDays: 0,
    overtimeHours: 0,
    workedHours: 0,
    recordedDays: 0,
  }
  for (const record of records) {
    summary.recordedDays += 1
    summary.overtimeHours += record.overtimeHours || 0
    summary.workedHours += record.hours || 0
    switch (record.status) {
      case 'present':
      case 'remote':
        summary.presentDays += 1
        break
      case 'half-day':
        summary.halfDays += 1
        summary.presentDays += 0.5
        summary.unpaidDays += 0.5
        break
      case 'paid-leave':
        summary.paidLeaveDays += 1
        break
      case 'unpaid-leave':
        summary.unpaidDays += 1
        break
      case 'absent':
        summary.unpaidDays += 1
        break
      default:
        break
    }
  }
  return summary
}

/** Approved unpaid leave days that have no attendance row for the same day. */
export function unpaidLeaveDaysOutsideAttendance(
  leaves: LeaveRequest[],
  attendance: AttendanceRecord[],
  period: string,
): number {
  const recorded = new Set(attendance.map((entry) => entry.date))
  let days = 0
  for (const leave of leaves) {
    if (leave.status !== 'approved' || leave.type !== 'unpaid') continue
    const from = Date.parse(`${leave.from}T00:00:00Z`)
    const to = Date.parse(`${leave.to}T00:00:00Z`)
    if (!Number.isFinite(from) || !Number.isFinite(to)) continue
    for (let time = from; time <= to; time += 86_400_000) {
      const date = new Date(time).toISOString().slice(0, 10)
      if (!date.startsWith(period)) continue
      const weekday = new Date(time).getUTCDay()
      if (weekday === 0 || weekday === 6) continue
      if (!recorded.has(date)) days += 1
    }
  }
  return days
}

export interface CalculatePayrollInput {
  member: Pick<TeamMember, 'monthlySalary' | 'name'>
  structure: Pick<SalaryStructure, 'components'>
  settings: PayrollSettingsInput
  attendance: AttendanceRecord[]
  leaves: LeaveRequest[]
  period: string
  /** Outstanding advance balance to recover this run. */
  advanceBalance?: number
  /** Manual extra additions and deductions for this payslip. */
  extraBonus?: number
  extraDeductions?: number
}

export function calculatePayroll(input: CalculatePayrollInput): PayrollCalculation {
  const baseSalary = Math.max(0, input.member.monthlySalary)
  const components = input.structure.components.filter((component) => component.name.trim())
  const fixedBasic = components
    .filter(
      (component) =>
        component.kind === 'earning' &&
        component.mode === 'fixed' &&
        component.name.trim().toLowerCase() === 'basic salary',
    )
    .reduce((sum, component) => sum + component.value, 0)
  const basic =
    fixedBasic > 0
      ? fixedBasic
      : components
            .filter((component) => component.kind === 'earning' && component.mode === 'fixed')
            .reduce((sum, component) => sum + component.value, 0) || baseSalary

  const earnings: PayslipLine[] = []
  const deductionLines: PayslipLine[] = []
  let gross = 0

  for (const component of components) {
    const amount =
      component.mode === 'fixed'
        ? component.value
        : round2((component.base === 'basic' ? basic : baseSalary) * (component.value / 100))
    if (!Number.isFinite(amount) || amount === 0) continue
    if (component.kind === 'earning') {
      earnings.push({ label: component.name.trim(), amount: round2(amount) })
      gross += amount
    } else {
      deductionLines.push({ label: component.name.trim(), amount: round2(amount) })
    }
  }

  const attendance = summarizeAttendance(input.attendance)
  const unpaidLeaveDays = unpaidLeaveDaysOutsideAttendance(
    input.leaves,
    input.attendance,
    input.period,
  )
  const unpaidDays = attendance.unpaidDays + unpaidLeaveDays
  const perDay = input.settings.workDaysPerMonth > 0 ? baseSalary / input.settings.workDaysPerMonth : 0
  const hourlyRate =
    input.settings.workDaysPerMonth > 0 && input.settings.hoursPerDay > 0
      ? perDay / input.settings.hoursPerDay
      : 0
  const unpaidLeaveDeduction = round2(perDay * unpaidDays)
  const overtimePay = round2(
    hourlyRate * input.settings.overtimeMultiplier * attendance.overtimeHours,
  )

  if (unpaidLeaveDeduction > 0) {
    deductionLines.push({
      label: `Unpaid days (${unpaidDays.toFixed(unpaidDays % 1 ? 1 : 0)})`,
      amount: unpaidLeaveDeduction,
    })
  }
  if (overtimePay > 0) {
    earnings.push({
      label: `Overtime (${attendance.overtimeHours}h × ${input.settings.overtimeMultiplier})`,
      amount: overtimePay,
    })
  }
  if (input.extraBonus && input.extraBonus > 0) {
    earnings.push({ label: 'Bonus / adjustment', amount: round2(input.extraBonus) })
  }
  if (input.extraDeductions && input.extraDeductions > 0) {
    deductionLines.push({ label: 'Other deductions', amount: round2(input.extraDeductions) })
  }

  gross = round2(gross + overtimePay + (input.extraBonus ?? 0))
  let advanceRecovery = 0
  if (input.advanceBalance && input.advanceBalance > 0) {
    const beforeAdvance =
      gross - deductionLines.reduce((sum, line) => sum + line.amount, 0)
    advanceRecovery = round2(Math.min(input.advanceBalance, Math.max(0, beforeAdvance)))
    if (advanceRecovery > 0) {
      deductionLines.push({ label: 'Salary advance recovery', amount: advanceRecovery })
    }
  }

  const totalDeductions = round2(deductionLines.reduce((sum, line) => sum + line.amount, 0))
  const net = round2(Math.max(0, gross - totalDeductions))

  return {
    gross,
    earnings,
    deductionLines,
    totalDeductions,
    net,
    basic: round2(basic),
    perDay: round2(perDay),
    hourlyRate: round2(hourlyRate),
    attendance: { ...attendance, unpaidDays },
    unpaidLeaveDeduction,
    overtimePay,
    advanceRecovery,
  }
}

/** Days between today and this month's payday; negative means payday has passed. */
export function daysUntilPayday(settings: PayrollSettingsInput, today = new Date()): number {
  const year = today.getFullYear()
  const month = today.getMonth()
  const payday = new Date(year, month, settings.payDay)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((payday.getTime() - start.getTime()) / 86_400_000)
}

export function isPayrollCalculationWindow(
  settings: PayrollSettingsInput,
  today = new Date(),
): boolean {
  const days = daysUntilPayday(settings, today)
  return days >= 0 && days <= settings.autoCalculateDays
}
