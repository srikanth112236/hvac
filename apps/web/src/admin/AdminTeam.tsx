import { useMemo, useState, type FormEvent } from 'react'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { Icon } from '@/components/icons'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Table,
  Textarea,
  useToast,
  type Column,
} from '@/components/ui'
import type {
  PayrollInput,
  PayrollRecord,
  TeamMember,
  TeamMemberInput,
} from '@hvac/shared'
import { adminApi, type PayrollSummary } from '@/admin/api'
import { ROLE_LABELS } from '@/admin/invoice-ui'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  MetricCard,
  formatDate,
  formatMoney,
} from '@/admin/ui'

const roles = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))

function thisMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function parseList(value: string): string[] {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean)
}

export function AdminTeam() {
  const { toast } = useToast()
  const [tab, setTab] = useState<'team' | 'payroll'>('team')
  const [team, setTeam] = useState<TeamMember[]>([])
  const [payroll, setPayroll] = useState<PayrollRecord[]>([])
  const [summary, setSummary] = useState<PayrollSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [memberOpen, setMemberOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [editingPay, setEditingPay] = useState<PayrollRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [roleFilter, setRoleFilter] = useState('all')

  const load = async () => {
    try {
      const [teamPayload, payrollPayload] = await Promise.all([adminApi.team(), adminApi.payroll()])
      setTeam(teamPayload.data)
      setPayroll(payrollPayload.data)
      setSummary(payrollPayload.summary)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the team ledger.')
    } finally {
      setLoading(false)
    }
  }

  useLiveRefresh(load)

  const memberById = useMemo(() => new Map(team.map((member) => [member.id, member])), [team])
  const filteredTeam = useMemo(
    () => (roleFilter === 'all' ? team : team.filter((member) => member.role === roleFilter)),
    [team, roleFilter],
  )

  const saveMember = async (input: TeamMemberInput) => {
    setBusy(true)
    try {
      if (editingMember) {
        await adminApi.patchTeamMember(editingMember.id, input)
        toast({ title: 'Team member updated', tone: 'success' })
      } else {
        await adminApi.createTeamMember(input)
        toast({ title: 'Team member added', description: input.name, tone: 'success' })
      }
      setMemberOpen(false)
      setEditingMember(null)
      await load()
    } catch (caught) {
      toast({
        title: 'Team member not saved',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const removeMember = async (member: TeamMember) => {
    if (!window.confirm(`Remove ${member.name} from the team? Salary history is kept.`)) return
    try {
      await adminApi.deleteTeamMember(member.id)
      toast({ title: 'Team member removed', tone: 'success' })
      await load()
    } catch (caught) {
      toast({
        title: 'Member not removed',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const savePayroll = async (input: PayrollInput) => {
    setBusy(true)
    try {
      if (editingPay) {
        await adminApi.patchPayroll(editingPay.id, input)
        toast({ title: 'Salary entry updated', tone: 'success' })
      } else {
        await adminApi.createPayroll(input)
        toast({ title: 'Salary entry recorded', tone: 'success' })
      }
      setPayOpen(false)
      setEditingPay(null)
      await load()
    } catch (caught) {
      toast({
        title: 'Salary entry not saved',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const togglePaid = async (entry: PayrollRecord) => {
    try {
      await adminApi.patchPayroll(entry.id, {
        status: entry.status === 'paid' ? 'pending' : 'paid',
      })
      toast({
        title: entry.status === 'paid' ? 'Marked pending' : 'Salary marked paid',
        description: `${formatMoney(entry.amount)} · ${entry.period}`,
        tone: 'success',
      })
      await load()
    } catch (caught) {
      toast({
        title: 'Salary not updated',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const removePayroll = async (entry: PayrollRecord) => {
    if (!window.confirm('Delete this salary entry?')) return
    try {
      await adminApi.deletePayroll(entry.id)
      toast({ title: 'Salary entry deleted', tone: 'success' })
      await load()
    } catch (caught) {
      toast({
        title: 'Salary entry not deleted',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const prepareMonth = async () => {
    setBusy(true)
    try {
      const result = await adminApi.generatePayroll(thisMonth())
      toast({
        title: result.data.created ? 'Monthly payroll prepared' : 'Payroll already prepared',
        description: result.data.created
          ? `${result.data.created} pending salary ${result.data.created === 1 ? 'entry' : 'entries'} created for ${result.data.period}.`
          : `Every active member already has a ${result.data.period} entry.`,
        tone: 'success',
      })
      await load()
      setTab('payroll')
    } catch (caught) {
      toast({
        title: 'Payroll not prepared',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const teamColumns: Column<TeamMember>[] = [
    {
      key: 'name',
      header: 'Team member',
      render: (row) => (
        <div>
          <p className="text-[12px] text-fg">{row.name}</p>
          <p className="text-[10px] text-fg-faint">{ROLE_LABELS[row.role] ?? row.role}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (row) => (
        <div>
          <p className="font-mono text-[10px] text-fg-dim">{row.phone || '—'}</p>
          <p className="text-[10px] text-fg-faint">{row.email || ''}</p>
        </div>
      ),
    },
    {
      key: 'skills',
      header: 'Skills',
      render: (row) => (
        <div className="flex max-w-[260px] flex-wrap gap-1">
          {row.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="border border-line px-1.5 py-0.5 font-mono text-[8px] uppercase text-fg-faint">
              {skill}
            </span>
          ))}
          {row.skills.length > 4 ? <span className="text-[9px] text-fg-faint">+{row.skills.length - 4}</span> : null}
        </div>
      ),
    },
    {
      key: 'monthlySalary',
      header: 'Monthly',
      align: 'right',
      render: (row) => <span className="t-num text-[11px] text-fg">{formatMoney(row.monthlySalary)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'active' ? 'success' : 'neutral'} dot>
          {row.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => {
              setEditingMember(row)
              setMemberOpen(true)
            }}
            className="flex h-7 items-center border border-line px-2 font-mono text-[8px] uppercase text-fg-dim hover:border-cold/40 hover:text-cold"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingPay(null)
              setPayOpen(true)
            }}
            className="flex h-7 items-center border border-line px-2 font-mono text-[8px] uppercase text-fg-dim hover:border-cold/40 hover:text-cold"
          >
            Salary
          </button>
          <button
            type="button"
            onClick={() => void removeMember(row)}
            aria-label={`Remove ${row.name}`}
            className="flex h-7 w-7 items-center justify-center border border-line text-fg-faint hover:border-danger/40 hover:text-danger"
          >
            <Icon name="close" size={10} />
          </button>
        </div>
      ),
    },
  ]

  const payrollColumns: Column<PayrollRecord>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (row) => {
        const member = memberById.get(row.memberId)
        return (
          <div>
            <p className="text-[12px] text-fg">{member?.name ?? 'Removed member'}</p>
            <p className="text-[10px] text-fg-faint">{member ? ROLE_LABELS[member.role] ?? member.role : '—'}</p>
          </div>
        )
      },
    },
    {
      key: 'period',
      header: 'Period',
      render: (row) => <span className="font-mono text-[10px] text-fg-dim">{row.period}</span>,
    },
    {
      key: 'breakdown',
      header: 'Base · bonus · deduction',
      render: (row) => (
        <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-fg-faint">
          {formatMoney(row.baseAmount)} · {formatMoney(row.bonus)} · −{formatMoney(row.deductions)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Net',
      align: 'right',
      render: (row) => <span className="t-num text-[12px] text-fg">{formatMoney(row.amount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'paid' ? 'success' : 'warn'} dot>
          {row.status === 'paid' ? `Paid ${formatDate(row.paidAt)}` : 'Pending'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => void togglePaid(row)}
            className="flex h-7 items-center gap-1 border border-line px-2 font-mono text-[8px] uppercase text-fg-dim hover:border-success/40 hover:text-success"
          >
            <Icon name={row.status === 'paid' ? 'minus' : 'check'} size={10} />
            {row.status === 'paid' ? 'Unpay' : 'Mark paid'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingPay(row)
              setPayOpen(true)
            }}
            className="flex h-7 items-center border border-line px-2 font-mono text-[8px] uppercase text-fg-dim hover:border-cold/40 hover:text-cold"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void removePayroll(row)}
            aria-label="Delete salary entry"
            className="flex h-7 w-7 items-center justify-center border border-line text-fg-faint hover:border-danger/40 hover:text-danger"
          >
            <Icon name="close" size={10} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="People"
        title="Team, technicians and salaries."
        description="Keep the crew, certifications and pay cycle in one register, then run monthly salary entries with bonus, deductions and settlement status."
        actions={
          <>
            <Button
              variant="secondary"
              icon="calendar"
              onClick={() => void prepareMonth()}
              disabled={busy || !team.some((member) => member.status === 'active' && member.monthlySalary > 0)}
            >
              Prepare {thisMonth()}
            </Button>
            <Button variant="secondary" icon="plus" onClick={() => { setEditingPay(null); setPayOpen(true) }}>
              Salary entry
            </Button>
            <Button icon="plus" onClick={() => { setEditingMember(null); setMemberOpen(true) }}>
              Add team member
            </Button>
          </>
        }
      />

      {error ? <InlineError message={error} /> : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active team" value={summary.activeTeam} accent="cold" />
          <MetricCard label="Monthly commitment" value={formatMoney(summary.monthlyPayrollCommitment)} note="Active salaries at full month" />
          <MetricCard label="Payroll this month" value={formatMoney(summary.thisMonth)} accent="heat" note={`${formatMoney(summary.thisMonthPending)} still pending`} />
          <MetricCard label="Paid this month" value={formatMoney(summary.thisMonthPaid)} accent="success" note={`${summary.count} salary entries in ledger`} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-b border-line">
        {(['team', 'payroll'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={
              tab === value
                ? 'border-b-2 border-cold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-cold'
                : 'border-b-2 border-transparent px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-faint hover:text-fg'
            }
          >
            {value === 'team' ? `Team register · ${team.length}` : `Salary ledger · ${payroll.length}`}
          </button>
        ))}
        {tab === 'team' ? (
          <Select
            aria-label="Filter by role"
            value={roleFilter}
            options={[{ value: 'all', label: 'All roles' }, ...roles]}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="ml-auto min-w-[150px]"
          />
        ) : null}
      </div>

      {loading ? (
        <AdminLoading rows={5} />
      ) : tab === 'team' ? (
        filteredTeam.length === 0 ? (
          <EmptyState
            icon="wrench"
            title="No team members yet."
            description="Add technicians, engineers and office staff to assign work and run payroll."
            action={<Button onClick={() => setMemberOpen(true)}>Add the first member</Button>}
          />
        ) : (
          <Table columns={teamColumns} rows={filteredTeam} caption="Team register" />
        )
      ) : payroll.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No salaries recorded."
          description="Create a monthly salary entry for each active member. Entries can stay pending until paid."
          action={<Button onClick={() => setPayOpen(true)}>Record salary</Button>}
        />
      ) : (
        <Table columns={payrollColumns} rows={payroll} caption="Salary ledger" />
      )}

      <Modal
        open={memberOpen}
        onClose={() => { setMemberOpen(false); setEditingMember(null) }}
        title={editingMember ? 'Edit team member' : 'Add team member'}
        description="Skills and certifications appear on job sheets and help assign the right technician."
        size="lg"
      >
        <MemberForm
          initial={editingMember}
          busy={busy}
          onSubmit={saveMember}
          onCancel={() => { setMemberOpen(false); setEditingMember(null) }}
        />
      </Modal>

      <Modal
        open={payOpen}
        onClose={() => { setPayOpen(false); setEditingPay(null) }}
        title={editingPay ? 'Edit salary entry' : 'Record salary entry'}
        description="Net pay is base plus bonus minus deductions. Marking it paid records the settlement date."
        size="lg"
      >
        <PayrollForm
          initial={editingPay}
          team={team}
          busy={busy}
          onSubmit={savePayroll}
          onCancel={() => { setPayOpen(false); setEditingPay(null) }}
        />
      </Modal>
    </div>
  )
}

function MemberForm({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: TeamMember | null
  busy: boolean
  onSubmit: (input: TeamMemberInput) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState<TeamMemberInput['role']>(initial?.role ?? 'technician')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [monthlySalary, setMonthlySalary] = useState(String(initial?.monthlySalary ?? ''))
  const [payCycle, setPayCycle] = useState<TeamMemberInput['payCycle']>(initial?.payCycle ?? 'monthly')
  const [joinedAt, setJoinedAt] = useState(initial?.joinedAt?.slice(0, 10) ?? '')
  const [status, setStatus] = useState<TeamMemberInput['status']>(initial?.status ?? 'active')
  const [skills, setSkills] = useState(initial?.skills.join(', ') ?? '')
  const [certifications, setCertifications] = useState(initial?.certifications.join(', ') ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim().length < 2) {
      setError('Enter the team member name.')
      return
    }
    setError('')
    onSubmit({
      name: name.trim(),
      role,
      phone: phone.trim(),
      email: email.trim(),
      skills: parseList(skills),
      certifications: parseList(certifications),
      monthlySalary: Number(monthlySalary) || 0,
      payCycle,
      joinedAt,
      status,
      notes: notes.trim(),
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error ? <p role="alert" className="border border-danger/40 bg-danger/[0.06] px-3 py-2 text-[12px] text-fg-dim">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} />
        <Select label="Role" value={role} options={roles} onChange={(event) => setRole(event.target.value as TeamMemberInput['role'])} />
        <Input label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(214) 555-0100" />
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <Input label="Monthly salary" type="number" min="0" step="0.01" value={monthlySalary} onChange={(event) => setMonthlySalary(event.target.value)} />
        <Select
          label="Pay cycle"
          value={payCycle}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'daily', label: 'Daily' },
            { value: 'contract', label: 'Contract' },
          ]}
          onChange={(event) => setPayCycle(event.target.value as TeamMemberInput['payCycle'])}
        />
        <Input label="Joined on" type="date" value={joinedAt} onChange={(event) => setJoinedAt(event.target.value)} />
        <Select
          label="Status"
          value={status}
          options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
          onChange={(event) => setStatus(event.target.value as TeamMemberInput['status'])}
        />
      </div>
      <Input label="Skills" value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="VRF commissioning, brazing, electrical" hint="Comma-separated" />
      <Input label="Certifications" value={certifications} onChange={(event) => setCertifications(event.target.value)} placeholder="ITI refrigeration, R32 handling" hint="Comma-separated" />
      <Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Availability, vehicle, site restrictions…" />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" icon="check" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save member' : 'Add member'}</Button>
      </div>
    </form>
  )
}

function PayrollForm({
  initial,
  team,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: PayrollRecord | null
  team: TeamMember[]
  busy: boolean
  onSubmit: (input: PayrollInput) => void
  onCancel: () => void
}) {
  const [memberId, setMemberId] = useState(initial?.memberId ?? team.find((member) => member.status === 'active')?.id ?? '')
  const [period, setPeriod] = useState(initial?.period ?? thisMonth())
  const [baseAmount, setBaseAmount] = useState(String(initial?.baseAmount ?? ''))
  const [bonus, setBonus] = useState(String(initial?.bonus ?? 0))
  const [deductions, setDeductions] = useState(String(initial?.deductions ?? 0))
  const [status, setStatus] = useState<PayrollInput['status']>(initial?.status ?? 'pending')
  const [method, setMethod] = useState<PayrollInput['method']>(initial?.method ?? 'bank-transfer')
  const [reference, setReference] = useState(initial?.reference ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')

  const net = Math.max(0, (Number(baseAmount) || 0) + (Number(bonus) || 0) - (Number(deductions) || 0))

  const pickMember = (id: string) => {
    setMemberId(id)
    const member = team.find((entry) => entry.id === id)
    if (member && !initial) setBaseAmount(String(member.monthlySalary))
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!memberId) {
      setError('Select a team member.')
      return
    }
    if (!/^\d{4}-\d{2}$/.test(period)) {
      setError('Choose the salary month.')
      return
    }
    setError('')
    onSubmit({
      memberId,
      period,
      baseAmount: Number(baseAmount) || 0,
      bonus: Number(bonus) || 0,
      deductions: Number(deductions) || 0,
      status,
      method,
      reference: reference.trim(),
      notes: notes.trim(),
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error ? <p role="alert" className="border border-danger/40 bg-danger/[0.06] px-3 py-2 text-[12px] text-fg-dim">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Team member"
          value={memberId}
          options={team.map((member) => ({ value: member.id, label: `${member.name} · ${ROLE_LABELS[member.role] ?? member.role}` }))}
          onChange={(event) => pickMember(event.target.value)}
          placeholder="Select member"
        />
        <Input label="Salary month" type="month" required value={period} onChange={(event) => setPeriod(event.target.value)} />
        <Input label="Base amount" type="number" min="0" step="0.01" value={baseAmount} onChange={(event) => setBaseAmount(event.target.value)} />
        <Input label="Bonus" type="number" min="0" step="0.01" value={bonus} onChange={(event) => setBonus(event.target.value)} />
        <Input label="Deductions" type="number" min="0" step="0.01" value={deductions} onChange={(event) => setDeductions(event.target.value)} />
        <Select
          label="Status"
          value={status}
          options={[{ value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }]}
          onChange={(event) => setStatus(event.target.value as PayrollInput['status'])}
        />
        <Select
          label="Paid by"
          value={method}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'cheque', label: 'Cheque' },
            { value: 'bank-transfer', label: 'Bank transfer' },
            { value: 'card-on-site', label: 'Card on site' },
          ]}
          onChange={(event) => setMethod(event.target.value as PayrollInput['method'])}
        />
        <Input label="Reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="UTR / voucher" />
      </div>
      <div className="flex items-center justify-between border border-line bg-panel-2/40 px-4 py-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">Net payable</span>
        <span className="t-num text-[18px] text-cold">{formatMoney(net)}</span>
      </div>
      <Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Leave adjustment, advance recovery or festival bonus…" />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" icon="check" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save entry' : 'Record salary'}</Button>
      </div>
    </form>
  )
}