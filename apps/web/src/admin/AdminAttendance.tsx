import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, EmptyState, Select, useToast } from '@/components/ui'
import {
  ATTENDANCE_STATUSES,
  attendanceStatusLabel,
  summarizeAttendance,
  unpaidLeaveDaysOutsideAttendance,
  type AttendanceRecord,
  type AttendanceStatus,
  type LeaveRequest,
  type PayrollSettings,
  type TeamMember,
} from '@hvac/shared'
import { adminApi } from '@/admin/api'
import { AdminLoading, InlineError, MetricCard, formatMoneyExact } from '@/admin/ui'
import { ROLE_LABELS } from '@/admin/invoice-ui'

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function daysOfPeriod(period: string): { date: string; day: number; weekday: number }[] {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return Array.from({ length: total }, (_, index) => {
    const date = `${period}-${String(index + 1).padStart(2, '0')}`
    return {
      date,
      day: index + 1,
      weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
    }
  })
}

export function AdminAttendance() {
  const { toast } = useToast()
  const [period, setPeriod] = useState(currentPeriod())
  const [team, setTeam] = useState<TeamMember[]>([])
  const [settings, setSettings] = useState<PayrollSettings | null>(null)
  const [memberId, setMemberId] = useState('')
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .team()
      .then((payload) => {
        setTeam(payload.data)
        setMemberId((current) => current || payload.data.find((m) => m.status === 'active')?.id || payload.data[0]?.id || '')
      })
      .catch(() => setTeam([]))
    adminApi.payrollSettings().then(setSettings).catch(() => undefined)
  }, [])

  const load = useCallback(async () => {
    if (!memberId) {
      setRecords([])
      setLeaves([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [attendance, leaveRows] = await Promise.all([
        adminApi.attendance(period, memberId),
        adminApi.leaves(period),
      ])
      setRecords(attendance)
      setLeaves(leaveRows.filter((leave) => leave.memberId === memberId))
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load attendance.')
    } finally {
      setLoading(false)
    }
  }, [period, memberId])

  useEffect(() => {
    void load()
  }, [load])

  const member = team.find((entry) => entry.id === memberId) ?? null
  const days = useMemo(() => daysOfPeriod(period), [period])
  const byDate = useMemo(() => new Map(records.map((record) => [record.date, record])), [records])
  const summary = useMemo(() => summarizeAttendance(records), [records])
  const extraUnpaid = useMemo(
    () => unpaidLeaveDaysOutsideAttendance(leaves, records, period),
    [leaves, records, period],
  )

  const saveDay = async (date: string, status: AttendanceStatus | '', overtimeHours?: number) => {
    if (!memberId || !settings) return
    try {
      if (!status) {
        await adminApi.deleteAttendance(memberId, date)
      } else {
        await adminApi.saveAttendance(memberId, date, {
          status,
          hours: status === 'half-day' ? settings.hoursPerDay / 2 : settings.hoursPerDay,
          overtimeHours: overtimeHours ?? byDate.get(date)?.overtimeHours ?? 0,
          note: '',
        })
      }
      await load()
    } catch (caught) {
      toast({
        title: 'Attendance not saved',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const fillWeekdays = async () => {
    if (!memberId || !settings) return
    setBusy(true)
    try {
      let saved = 0
      for (const day of days) {
        if (day.weekday === 0 || day.weekday === 6) continue
        if (byDate.has(day.date)) continue
        await adminApi.saveAttendance(memberId, day.date, {
          status: 'present',
          hours: settings.hoursPerDay,
          overtimeHours: 0,
          note: '',
        })
        saved += 1
      }
      toast({
        title: saved ? `${saved} weekdays marked present` : 'Weekdays already recorded',
        tone: 'success',
      })
      await load()
    } catch (caught) {
      toast({
        title: 'Bulk marking stopped',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-h4 text-fg">Attendance</h2>
          <p className="mt-1 text-[13px] text-fg-dim">
            Log each day manually. Absences and half days deduct from pay; overtime pays at the
            multiplier in payroll settings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Team member"
            value={memberId}
            options={team.map((entry) => ({
              value: entry.id,
              label: `${entry.name} · ${ROLE_LABELS[entry.role] ?? entry.role}`,
            }))}
            onChange={(event) => setMemberId(event.target.value)}
            className="min-w-[230px]"
          />
          <input
            aria-label="Attendance month"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value || currentPeriod())}
            className="h-9 border border-line bg-panel px-2 font-mono text-[10px] uppercase text-fg-dim outline-none focus:border-cold"
          />
          <Button icon="calendar" variant="secondary" onClick={() => void fillWeekdays()} loading={busy}>
            Mark weekdays present
          </Button>
        </div>
      </div>

      {error ? <InlineError message={error} /> : null}

      {!member ? (
        <EmptyState
          icon="wrench"
          title="Add a team member first."
          description="Attendance is recorded against each team member."
        />
      ) : loading ? (
        <AdminLoading rows={4} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Present days" value={summary.presentDays} accent="success" />
            <MetricCard
              label="Unpaid days"
              value={summary.unpaidDays + extraUnpaid}
              note={`${extraUnpaid} from approved unpaid leave`}
              accent="heat"
            />
            <MetricCard label="Paid leave" value={summary.paidLeaveDays} accent="cold" />
            <MetricCard
              label="Overtime"
              value={`${summary.overtimeHours}h`}
              note={
                settings
                  ? `${formatMoneyExact(
                      ((member.monthlySalary / settings.workDaysPerMonth) / settings.hoursPerDay) *
                        settings.overtimeMultiplier,
                    )} per hour`
                  : undefined
              }
            />
          </div>

          <div className="border border-line">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel-2/40 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                {member.name} · {period}
              </p>
              <p className="font-mono text-[9px] uppercase text-fg-faint">
                {records.length} of {days.length} days logged
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4 lg:grid-cols-7">
              {days.map((day) => {
                const record = byDate.get(day.date)
                return (
                  <div
                    key={day.date}
                    className="flex flex-col gap-1 bg-panel p-2"
                    style={{ minHeight: 92 }}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-[9px] uppercase text-fg-faint">
                        {WEEKDAYS[day.weekday]}
                      </span>
                      <span className="text-[12px] text-fg">{day.day}</span>
                    </div>
                    <select
                      aria-label={`Attendance ${day.date}`}
                      value={record?.status ?? ''}
                      onChange={(event) =>
                        void saveDay(day.date, event.target.value as AttendanceStatus | '')
                      }
                      className="h-7 w-full border border-line bg-panel px-1 font-mono text-[8px] uppercase text-fg-dim outline-none focus:border-cold"
                    >
                      <option value="">Not logged</option>
                      {ATTENDANCE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {attendanceStatusLabel[status]}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[8px] uppercase text-fg-faint">OT</span>
                      <input
                        key={`${day.date}-${record?.overtimeHours ?? 'none'}`}
                        aria-label={`Overtime ${day.date}`}
                        type="number"
                        min="0"
                        max="12"
                        step="0.5"
                        defaultValue={record?.overtimeHours ?? 0}
                        onBlur={(event) => {
                          const value = Number(event.target.value) || 0
                          if (!record || value === record.overtimeHours) return
                          void saveDay(day.date, record.status, value)
                        }}
                        className="h-6 w-12 border border-line bg-panel px-1 text-right font-mono text-[9px] text-fg outline-none focus:border-cold"
                      />
                      <span className="font-mono text-[8px] text-fg-faint">h</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-fg-faint">
            Unpaid days cost {settings ? formatMoneyExact(member.monthlySalary / settings.workDaysPerMonth) : '—'} each
            (monthly gross ÷ {settings?.workDaysPerMonth ?? '—'} work days). Approved unpaid leave
            is counted once — a day already logged here is not deducted twice.
          </p>
        </>
      )}
    </div>
  )
}
