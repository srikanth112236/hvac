import { useEffect, useState } from 'react'
import { Button, Input, Textarea, useToast } from '@/components/ui'
import { DEFAULT_PAYROLL_SETTINGS, type PayrollSettings } from '@hvac/shared'
import { adminApi } from '@/admin/api'
import { AdminLoading, InlineError, formatMoneyExact } from '@/admin/ui'

export function AdminPayrollSettings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<PayrollSettings>({
    ...DEFAULT_PAYROLL_SETTINGS,
    updatedAt: new Date().toISOString(),
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .payrollSettings()
      .then(setSettings)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : 'Could not load payroll settings.'),
      )
      .finally(() => setLoading(false))
  }, [])

  const update = <K extends keyof PayrollSettings>(key: K, value: PayrollSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const save = async () => {
    setBusy(true)
    try {
      const saved = await adminApi.savePayrollSettings({
        payDay: settings.payDay,
        autoCalculateDays: settings.autoCalculateDays,
        workDaysPerMonth: settings.workDaysPerMonth,
        hoursPerDay: settings.hoursPerDay,
        overtimeMultiplier: settings.overtimeMultiplier,
        lateGraceMinutes: settings.lateGraceMinutes,
        payslipPrefix: settings.payslipPrefix,
        emailSubject: settings.emailSubject,
        emailNote: settings.emailNote,
        reminderDays: settings.reminderDays,
      })
      setSettings(saved)
      toast({
        title: 'Payroll settings saved',
        description: 'New payslip calculations use these values immediately.',
        tone: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Settings not saved',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <AdminLoading rows={4} />

  const sampleGross = 3000
  const samplePerDay = sampleGross / settings.workDaysPerMonth
  const sampleHourly = samplePerDay / settings.hoursPerDay

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-h4 text-fg">Payroll settings</h2>
          <p className="mt-1 text-[13px] text-fg-dim">
            Payday timing, working days, overtime, attendance deductions and payslip delivery.
            These drive every calculation on the payroll, attendance and payslip pages.
          </p>
        </div>
        <Button icon="check" loading={busy} onClick={() => void save()}>
          Save settings
        </Button>
      </div>

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-5">
          <section className="border border-line p-4">
            <h3 className="text-[13px] text-fg">Pay cycle</h3>
            <p className="mt-1 text-[11px] text-fg-faint">
              Payslips auto-calculate inside this window and reminders start once the balance is
              still open.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                label="Payday (day of month)"
                type="number"
                min="1"
                max="28"
                value={String(settings.payDay)}
                onChange={(event) => update('payDay', Number(event.target.value) || 1)}
                hint="Capped at the last day of shorter months"
              />
              <Input
                label="Auto-calculate days before payday"
                type="number"
                min="0"
                max="15"
                value={String(settings.autoCalculateDays)}
                onChange={(event) => update('autoCalculateDays', Number(event.target.value) || 0)}
                hint={`Payslips prep when ${settings.autoCalculateDays} days remain`}
              />
              <Input
                label="Reminder window (days)"
                type="number"
                min="0"
                max="14"
                value={String(settings.reminderDays)}
                onChange={(event) => update('reminderDays', Number(event.target.value) || 0)}
                hint="Attention list starts this many days before payday"
              />
              <Input
                label="Payslip number prefix"
                value={settings.payslipPrefix}
                onChange={(event) => update('payslipPrefix', event.target.value.toUpperCase())}
                hint={`Example ${settings.payslipPrefix}-202611-0001`}
              />
            </div>
          </section>

          <section className="border border-line p-4">
            <h3 className="text-[13px] text-fg">Attendance & overtime</h3>
            <p className="mt-1 text-[11px] text-fg-faint">
              Used to convert an absence, half day or overtime hour into money. A half day counts as
              0.5 unpaid days.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                label="Working days per month"
                type="number"
                min="1"
                max="31"
                value={String(settings.workDaysPerMonth)}
                onChange={(event) => update('workDaysPerMonth', Number(event.target.value) || 1)}
              />
              <Input
                label="Hours per working day"
                type="number"
                min="1"
                max="24"
                value={String(settings.hoursPerDay)}
                onChange={(event) => update('hoursPerDay', Number(event.target.value) || 1)}
              />
              <Input
                label="Overtime multiplier"
                type="number"
                min="1"
                max="5"
                step="0.05"
                value={String(settings.overtimeMultiplier)}
                onChange={(event) =>
                  update('overtimeMultiplier', Number(event.target.value) || 1)
                }
                hint={`Overtime pays ${settings.overtimeMultiplier}× the hourly rate`}
              />
              <Input
                label="Late grace (minutes)"
                type="number"
                min="0"
                max="180"
                value={String(settings.lateGraceMinutes)}
                onChange={(event) => update('lateGraceMinutes', Number(event.target.value) || 0)}
                hint="Reference for attendance notes"
              />
            </div>
          </section>

          <section className="border border-line p-4">
            <h3 className="text-[13px] text-fg">Payslip email</h3>
            <p className="mt-1 text-[11px] text-fg-faint">
              Sent to the team member's email with the PDF attached. Use {'{period}'} in the
              subject.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <Input
                label="Subject"
                value={settings.emailSubject}
                onChange={(event) => update('emailSubject', event.target.value)}
              />
              <Textarea
                label="Message"
                rows={3}
                value={settings.emailNote}
                onChange={(event) => update('emailNote', event.target.value)}
              />
            </div>
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-3 border border-line bg-panel-2/30 p-4 xl:sticky xl:top-4">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
            Worked example
          </p>
          <p className="text-[11px] text-fg-dim">
            A {formatMoneyExact(sampleGross)} monthly gross works out to:
          </p>
          <div className="flex flex-col gap-1 font-mono text-[10px] uppercase text-fg-faint">
            <div className="flex justify-between">
              <span>Per day</span>
              <span className="text-fg">{formatMoneyExact(samplePerDay)}</span>
            </div>
            <div className="flex justify-between">
              <span>Per hour</span>
              <span className="text-fg">{formatMoneyExact(sampleHourly)}</span>
            </div>
            <div className="flex justify-between">
              <span>Overtime hour</span>
              <span className="text-fg">
                {formatMoneyExact(sampleHourly * settings.overtimeMultiplier)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Half day</span>
              <span className="text-fg">{formatMoneyExact(samplePerDay / 2)}</span>
            </div>
          </div>
          <div className="border-t border-line pt-3 text-[11px] leading-relaxed text-fg-dim">
            Payslips calculate {settings.autoCalculateDays} days before day {settings.payDay}.
            Anything unpaid after the reminder window appears on the payroll page and in the admin
            notification inbox.
          </div>
        </aside>
      </div>
    </div>
  )
}
