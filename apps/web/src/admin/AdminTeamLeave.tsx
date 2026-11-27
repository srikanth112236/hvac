import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Table,
  TableActionButton,
  TableActions,
  Textarea,
  useToast,
  type Column,
} from '@/components/ui'
import {
  leaveTypeLabel,
  LEAVE_TYPES,
  type LeaveRequest,
  type LeaveType,
  type SalaryAdvance,
  type TeamMember,
} from '@hvac/shared'
import { adminApi } from '@/admin/api'
import {
  AdminLoading,
  InlineError,
  MetricCard,
  formatDate,
  formatMoneyExact,
} from '@/admin/ui'
import { ROLE_LABELS } from '@/admin/invoice-ui'

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function leaveDays(leave: Pick<LeaveRequest, 'from' | 'to'>): number {
  const from = Date.parse(`${leave.from}T00:00:00Z`)
  const to = Date.parse(`${leave.to}T00:00:00Z`)
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0
  return Math.floor((to - from) / 86_400_000) + 1
}

export function AdminTeamLeave() {
  const { toast } = useToast()
  const [period, setPeriod] = useState(currentPeriod())
  const [team, setTeam] = useState<TeamMember[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [advances, setAdvances] = useState<SalaryAdvance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [advanceOpen, setAdvanceOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [leaveRows, advanceRows, teamPayload] = await Promise.all([
        adminApi.leaves(period),
        adminApi.advances(),
        adminApi.team(),
      ])
      setLeaves(leaveRows)
      setAdvances(advanceRows)
      setTeam(teamPayload.data)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load leave and advances.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const memberById = useMemo(() => new Map(team.map((member) => [member.id, member])), [team])
  const outstanding = advances.reduce(
    (sum, advance) => sum + Math.max(0, advance.amount - (advance.recoveredAmount ?? 0)),
    0,
  )

  const decide = async (leave: LeaveRequest, status: 'approved' | 'rejected') => {
    try {
      await adminApi.patchLeave(leave.id, { status })
      toast({ title: `Leave ${status}`, tone: 'success' })
      await load()
    } catch (caught) {
      toast({
        title: 'Leave not updated',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const removeLeave = async (leave: LeaveRequest) => {
    if (!window.confirm('Delete this leave request?')) return
    try {
      await adminApi.deleteLeave(leave.id)
      toast({ title: 'Leave deleted', tone: 'success' })
      await load()
    } catch (caught) {
      toast({
        title: 'Leave not deleted',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const removeAdvance = async (advance: SalaryAdvance) => {
    if (!window.confirm('Delete this advance? Recovered amounts stay on past payslips.')) return
    try {
      await adminApi.deleteAdvance(advance.id)
      toast({ title: 'Advance deleted', tone: 'success' })
      await load()
    } catch (caught) {
      toast({
        title: 'Advance not deleted',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const leaveColumns: Column<LeaveRequest>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (row) => {
        const member = memberById.get(row.memberId)
        return (
          <div>
            <p className="text-[12px] text-fg">{member?.name ?? 'Removed member'}</p>
            <p className="text-[10px] text-fg-faint">
              {member ? (ROLE_LABELS[member.role] ?? member.role) : '—'}
            </p>
          </div>
        )
      },
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="font-mono text-[9px] uppercase text-fg-dim">
          {leaveTypeLabel[row.type]}
        </span>
      ),
    },
    {
      key: 'range',
      header: 'Dates',
      render: (row) => (
        <span className="font-mono text-[10px] text-fg-dim">
          {formatDate(row.from)} → {formatDate(row.to)}
        </span>
      ),
    },
    {
      key: 'days',
      header: 'Days',
      align: 'right',
      render: (row) => <span className="t-num text-[12px] text-fg">{leaveDays(row)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge
          tone={
            row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warn'
          }
          dot
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <TableActions>
          {row.status !== 'approved' ? (
            <TableActionButton
              label="Approve leave"
              icon="check"
              tone="success"
              onClick={() => void decide(row, 'approved')}
            />
          ) : null}
          {row.status !== 'rejected' ? (
            <TableActionButton
              label="Reject leave"
              icon="close"
              tone="danger"
              onClick={() => void decide(row, 'rejected')}
            />
          ) : null}
          <TableActionButton
            label="Delete leave"
            icon="close"
            tone="danger"
            onClick={() => void removeLeave(row)}
          />
        </TableActions>
      ),
    },
  ]

  const advanceColumns: Column<SalaryAdvance>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (row) => (
        <span className="text-[12px] text-fg">
          {memberById.get(row.memberId)?.name ?? 'Removed member'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Taken',
      render: (row) => (
        <span className="font-mono text-[10px] text-fg-dim">{formatDate(row.date)}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Advance',
      align: 'right',
      render: (row) => (
        <span className="t-num text-[12px] text-fg">{formatMoneyExact(row.amount)}</span>
      ),
    },
    {
      key: 'recovered',
      header: 'Recovered',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-[11px] text-success">
          {formatMoneyExact(row.recoveredAmount ?? 0)}
        </span>
      ),
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-[11px] text-fg">
          {formatMoneyExact(Math.max(0, row.amount - (row.recoveredAmount ?? 0)))}
        </span>
      ),
    },
    {
      key: 'recover',
      header: 'Recovery',
      render: (row) => (
        <span className="font-mono text-[9px] uppercase text-fg-faint">
          {row.recoveredPeriod
            ? `Recovered ${row.recoveredPeriod}`
            : row.recoverInPeriod
              ? `Deduct ${row.recoverInPeriod}`
              : 'Next payslip'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <TableActions>
          <TableActionButton
            label="Delete advance"
            icon="close"
            tone="danger"
            onClick={() => void removeAdvance(row)}
          />
        </TableActions>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-h4 text-fg">Leave & salary advances</h2>
          <p className="mt-1 text-[13px] text-fg-dim">
            Approved unpaid leave reduces the next payslip. Advances are recovered from the salary
            run and tracked until fully recovered.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label="Leave month"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value || currentPeriod())}
            className="h-9 border border-line bg-panel px-2 font-mono text-[10px] uppercase text-fg-dim outline-none focus:border-cold"
          />
          <Button variant="secondary" icon="plus" onClick={() => setAdvanceOpen(true)}>
            Salary advance
          </Button>
          <Button icon="plus" onClick={() => setLeaveOpen(true)}>
            Leave request
          </Button>
        </div>
      </div>

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Leave requests" value={leaves.length} accent="cold" />
        <MetricCard
          label="Awaiting approval"
          value={leaves.filter((leave) => leave.status === 'pending').length}
          accent="heat"
        />
        <MetricCard
          label="Unpaid days this month"
          value={leaves
            .filter((leave) => leave.type === 'unpaid' && leave.status === 'approved')
            .reduce((sum, leave) => sum + leaveDays(leave), 0)}
        />
        <MetricCard
          label="Advance outstanding"
          value={formatMoneyExact(outstanding)}
          accent="success"
        />
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="t-h4 text-fg">Leave</h3>
        {loading ? (
          <AdminLoading rows={3} />
        ) : leaves.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No leave in this month."
            description="Record paid, sick or unpaid leave. Approved unpaid days are deducted automatically."
            action={<Button onClick={() => setLeaveOpen(true)}>Add leave</Button>}
          />
        ) : (
          <Table columns={leaveColumns} rows={leaves} caption="Leave requests" />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="t-h4 text-fg">Salary advances</h3>
        {loading ? (
          <AdminLoading rows={3} />
        ) : advances.length === 0 ? (
          <EmptyState
            icon="tag"
            title="No advances recorded."
            description="An advance is recovered from the next payroll run, or in the month you choose."
            action={<Button onClick={() => setAdvanceOpen(true)}>Record advance</Button>}
          />
        ) : (
          <Table columns={advanceColumns} rows={advances} caption="Salary advances" />
        )}
      </section>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Leave request"
        description="Approved paid or sick leave keeps the salary whole. Approved unpaid leave is deducted by the day."
        size="md"
      >
        <LeaveForm
          team={team}
          onCancel={() => setLeaveOpen(false)}
          onSaved={async () => {
            setLeaveOpen(false)
            toast({ title: 'Leave saved', tone: 'success' })
            await load()
          }}
        />
      </Modal>

      <Modal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        title="Record salary advance"
        description="The outstanding amount is recovered automatically from the next calculated payslip, capped at the net payable."
        size="md"
      >
        <AdvanceForm
          team={team}
          onCancel={() => setAdvanceOpen(false)}
          onSaved={async () => {
            setAdvanceOpen(false)
            toast({ title: 'Advance recorded', tone: 'success' })
            await load()
          }}
        />
      </Modal>
    </div>
  )
}

function LeaveForm({
  team,
  onCancel,
  onSaved,
}: {
  team: TeamMember[]
  onCancel: () => void
  onSaved: () => Promise<void>
}) {
  const [memberId, setMemberId] = useState(team.find((member) => member.status === 'active')?.id ?? '')
  const [type, setType] = useState<LeaveType>('paid')
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('approved')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!memberId) {
      setError('Select a team member.')
      return
    }
    if (to < from) {
      setError('The end date must be on or after the start date.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await adminApi.createLeave({ memberId, type, from, to, status, note: note.trim() })
      await onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Leave not saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {error ? (
        <p role="alert" className="border border-danger/40 bg-danger/[0.06] px-3 py-2 text-[12px]">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Team member"
          value={memberId}
          options={team.map((member) => ({
            value: member.id,
            label: `${member.name} · ${ROLE_LABELS[member.role] ?? member.role}`,
          }))}
          onChange={(event) => setMemberId(event.target.value)}
        />
        <Select
          label="Leave type"
          value={type}
          options={LEAVE_TYPES.map((value) => ({ value, label: leaveTypeLabel[value] }))}
          onChange={(event) => setType(event.target.value as LeaveType)}
        />
        <Input
          label="From"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <Input label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <Select
          label="Status"
          value={status}
          options={[
            { value: 'approved', label: 'Approved' },
            { value: 'pending', label: 'Pending' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        />
        <div className="flex items-end pb-2 font-mono text-[10px] uppercase text-fg-faint">
          {leaveDays({ from, to })} day(s)
        </div>
      </div>
      <Textarea
        label="Note"
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Reason, cover arranged…"
      />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" icon="check" loading={busy}>
          Save leave
        </Button>
      </div>
    </form>
  )
}

function AdvanceForm({
  team,
  onCancel,
  onSaved,
}: {
  team: TeamMember[]
  onCancel: () => void
  onSaved: () => Promise<void>
}) {
  const [memberId, setMemberId] = useState(team.find((member) => member.status === 'active')?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [recoverInPeriod, setRecoverInPeriod] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!memberId) {
      setError('Select a team member.')
      return
    }
    if (!(Number(amount) > 0)) {
      setError('Enter the advance amount.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await adminApi.createAdvance({
        memberId,
        date,
        amount: Number(amount),
        note: note.trim(),
        recoverInPeriod,
      })
      await onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Advance not saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {error ? (
        <p role="alert" className="border border-danger/40 bg-danger/[0.06] px-3 py-2 text-[12px]">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Team member"
          value={memberId}
          options={team.map((member) => ({
            value: member.id,
            label: `${member.name} · ${ROLE_LABELS[member.role] ?? member.role}`,
          }))}
          onChange={(event) => setMemberId(event.target.value)}
        />
        <Input
          label="Date taken"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Input
          label="Amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Input
          label="Recover in month"
          type="month"
          value={recoverInPeriod}
          onChange={(event) => setRecoverInPeriod(event.target.value)}
          hint="Leave blank to recover from the next payslip"
        />
      </div>
      <Textarea
        label="Note"
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Festival advance, medical…"
      />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" icon="check" loading={busy}>
          Record advance
        </Button>
      </div>
    </form>
  )
}
