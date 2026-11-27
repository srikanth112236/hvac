import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Badge,
  Button,
  EmptyState,
  Select,
  useToast,
} from '@/components/ui'
import {
  calculatePayroll,
  defaultSalaryStructure,
  DEFAULT_PAYROLL_SETTINGS,
  type PayrollSettings,
  type SalaryComponent,
  type SalaryStructure,
  type TeamMember,
} from '@hvac/shared'
import { adminApi } from '@/admin/api'
import { AdminLoading, InlineError, formatMoney } from '@/admin/ui'
import { ROLE_LABELS } from '@/admin/invoice-ui'

const newId = () => `component-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const blankComponent = (kind: SalaryComponent['kind']): SalaryComponent => ({
  id: newId(),
  name: kind === 'earning' ? 'New allowance' : 'New deduction',
  kind,
  mode: 'fixed',
  value: 0,
  base: 'gross',
  taxable: true,
})

export function AdminSalaryStructures() {
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [structures, setStructures] = useState<Record<string, SalaryStructure>>({})
  const [settings, setSettings] = useState<PayrollSettings>({
    ...DEFAULT_PAYROLL_SETTINGS,
    updatedAt: new Date().toISOString(),
  })
  const [memberId, setMemberId] = useState('')
  const [components, setComponents] = useState<SalaryComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([adminApi.team(), adminApi.salaryStructures(), adminApi.payrollSettings()])
      .then(([teamPayload, structureMap, payrollSettings]) => {
        if (!active) return
        setTeam(teamPayload.data)
        setStructures(structureMap)
        setSettings(payrollSettings)
        const requested = params.get('member')
        const chosen =
          teamPayload.data.find((member) => member.id === requested) ??
          teamPayload.data.find((member) => member.status === 'active') ??
          teamPayload.data[0]
        setMemberId(chosen?.id ?? '')
        setError('')
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load salaries.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const member = useMemo(
    () => team.find((entry) => entry.id === memberId) ?? null,
    [team, memberId],
  )

  useEffect(() => {
    if (!member) {
      setComponents([])
      return
    }
    const stored = structures[member.id]
    setComponents(
      (stored?.components ?? defaultSalaryStructure(member).components).map((component) => ({
        ...component,
      })),
    )
    if (params.get('member') !== member.id) {
      const next = new URLSearchParams(params)
      next.set('member', member.id)
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.id, structures])

  const preview = useMemo(() => {
    if (!member) return null
    return calculatePayroll({
      member,
      structure: { components },
      settings: settings ?? DEFAULT_PAYROLL_SETTINGS,
      attendance: [],
      leaves: [],
      period: new Date().toISOString().slice(0, 7),
    })
  }, [member, components, settings])

  const update = (id: string, patch: Partial<SalaryComponent>) => {
    setComponents((current) =>
      current.map((component) => (component.id === id ? { ...component, ...patch } : component)),
    )
  }

  const save = async () => {
    if (!member) return
    if (!components.length) {
      toast({ title: 'Add at least one component', tone: 'warn' })
      return
    }
    setBusy(true)
    try {
      const saved = await adminApi.saveSalaryStructure(member.id, components)
      setStructures((current) => ({ ...current, [member.id]: saved }))
      toast({
        title: 'Salary structure saved',
        description: `${member.name} · ${formatMoney(preview?.net ?? 0)} net at full attendance`,
        tone: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Structure not saved',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <AdminLoading rows={5} />

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-h4 text-fg">Salary structures</h2>
          <p className="mt-1 text-[13px] text-fg-dim">
            Plug in earnings and deductions per person. Fixed amounts or percentages of gross/basic
            feed straight into every payslip.
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
            className="min-w-[240px]"
          />
          <Button icon="check" onClick={() => void save()} loading={busy} disabled={!member}>
            Save structure
          </Button>
        </div>
      </div>

      {error ? <InlineError message={error} /> : null}

      {!member ? (
        <EmptyState
          icon="wrench"
          title="No team members to configure."
          description="Add a team member first, then build their salary structure."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] text-fg">{member.name}</h3>
                <Badge tone={structures[member.id] ? 'cold' : 'neutral'}>
                  {structures[member.id] ? 'Custom structure' : 'Default structure'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  icon="plus"
                  onClick={() => setComponents((current) => [...current, blankComponent('earning')])}
                >
                  Add earning
                </Button>
                <Button
                  variant="secondary"
                  icon="minus"
                  onClick={() =>
                    setComponents((current) => [...current, blankComponent('deduction')])
                  }
                >
                  Add deduction
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[720px] text-left">
                <thead className="border-b border-line bg-panel-2/40">
                  <tr className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                    <th className="px-3 py-2">Component</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Mode</th>
                    <th className="px-3 py-2">Amount / %</th>
                    <th className="px-3 py-2">Percent of</th>
                    <th className="px-3 py-2 text-right">Monthly</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {components.map((component) => {
                    const amount =
                      component.mode === 'fixed'
                        ? component.value
                        : ((component.base === 'basic' ? preview?.basic : member.monthlySalary) ?? 0) *
                          (component.value / 100)
                    return (
                      <tr key={component.id} className="align-top">
                        <td className="px-3 py-2">
                          <input
                            aria-label={`Component name`}
                            value={component.name}
                            onChange={(event) => update(component.id, { name: event.target.value })}
                            className="h-8 w-full min-w-[150px] border border-line bg-panel px-2 text-[11px] text-fg outline-none focus:border-cold"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            aria-label={`Component type`}
                            value={component.kind}
                            onChange={(event) =>
                              update(component.id, {
                                kind: event.target.value as SalaryComponent['kind'],
                              })
                            }
                            className="h-8 border border-line bg-panel px-1 font-mono text-[9px] uppercase text-fg-dim"
                          >
                            <option value="earning">Earning</option>
                            <option value="deduction">Deduction</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            aria-label={`Component mode`}
                            value={component.mode}
                            onChange={(event) =>
                              update(component.id, {
                                mode: event.target.value as SalaryComponent['mode'],
                              })
                            }
                            className="h-8 border border-line bg-panel px-1 font-mono text-[9px] uppercase text-fg-dim"
                          >
                            <option value="fixed">Fixed</option>
                            <option value="percent">Percent</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            aria-label={`Component value`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={component.value}
                            onChange={(event) =>
                              update(component.id, { value: Number(event.target.value) || 0 })
                            }
                            className="h-8 w-24 border border-line bg-panel px-2 text-right text-[11px] text-fg outline-none focus:border-cold"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            aria-label={`Percent base`}
                            value={component.base}
                            disabled={component.mode !== 'percent'}
                            onChange={(event) =>
                              update(component.id, {
                                base: event.target.value as SalaryComponent['base'],
                              })
                            }
                            className="h-8 border border-line bg-panel px-1 font-mono text-[9px] uppercase text-fg-dim disabled:opacity-40"
                          >
                            <option value="gross">Gross</option>
                            <option value="basic">Basic</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[11px] text-fg">
                          {formatMoney(amount)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            aria-label={`Remove ${component.name}`}
                            onClick={() =>
                              setComponents((current) =>
                                current.filter((entry) => entry.id !== component.id),
                              )
                            }
                            className="border border-line px-2 py-1 font-mono text-[8px] uppercase text-fg-faint hover:border-danger/50 hover:text-danger"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {components.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-[12px] text-fg-dim">
                        Add earnings such as basic, HRA or transport, then deductions.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] leading-relaxed text-fg-faint">
              Percent components use the monthly gross or the basic amount shown on the right.
              Attendance, unpaid leave, overtime and advance recovery are applied on top when a
              payslip is calculated.
            </p>
          </div>

          <aside className="flex h-fit flex-col gap-3 border border-line bg-panel-2/30 p-4 xl:sticky xl:top-4">
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
              Gross structure preview
            </p>
            <div className="flex flex-col gap-1 text-[11px]">
              <Row label="Basic" value={formatMoney(preview?.basic ?? 0)} />
              <Row label="Gross earnings" value={formatMoney(preview?.gross ?? 0)} />
              <Row label="Deductions" value={`−${formatMoney(preview?.totalDeductions ?? 0)}`} />
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="font-mono text-[9px] uppercase text-fg-faint">Net / month</span>
              <span className="t-num text-[20px] text-cold">{formatMoney(preview?.net ?? 0)}</span>
            </div>
            <div className="flex flex-col gap-1 border-t border-line pt-3 font-mono text-[9px] uppercase text-fg-faint">
              <Row label="Per day" value={formatMoney(preview?.perDay ?? 0)} />
              <Row label="Per hour" value={formatMoney(preview?.hourlyRate ?? 0)} />
              <Row label="Work days" value={String(settings.workDaysPerMonth)} />
              <Row label="Hours / day" value={String(settings.hoursPerDay)} />
            </div>
            <p className="text-[10px] leading-relaxed text-fg-faint">
              Unpaid days deduct {formatMoney(preview?.perDay ?? 0)} each. Overtime pays{' '}
              {formatMoney((preview?.hourlyRate ?? 0) * settings.overtimeMultiplier)} per hour.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-faint">{label}</span>
      <span className="font-mono text-[11px] text-fg">{value}</span>
    </div>
  )
}
