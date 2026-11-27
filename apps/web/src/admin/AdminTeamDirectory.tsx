import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { useRecordDeepLink } from '@/admin/useDeepLink'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  RecordDrawer,
  Select,
  Table,
  TableActionButton,
  TableActions,
  Textarea,
  useToast,
  type Column,
} from '@/components/ui'
import type { TeamMember, TeamMemberInput } from '@hvac/shared'
import { adminApi, type PayrollSummary } from '@/admin/api'
import { ROLE_LABELS } from '@/admin/invoice-ui'
import {
  AdminLoading,
  InlineError,
  MetricCard,
  formatMoney,
} from '@/admin/ui'

const roles = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function AdminTeamDirectory() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [summary, setSummary] = useState<PayrollSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [memberOpen, setMemberOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [busy, setBusy] = useState(false)
  const [roleFilter, setRoleFilter] = useState('all')
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null)

  const load = async () => {
    try {
      const payload = await adminApi.team()
      setTeam(payload.data)
      setSummary(payload.summary)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the team register.')
    } finally {
      setLoading(false)
    }
  }

  useLiveRefresh(load)

  const filteredTeam = useMemo(
    () => (roleFilter === 'all' ? team : team.filter((member) => member.role === roleFilter)),
    [team, roleFilter],
  )

  useRecordDeepLink({
    param: 'member',
    records: team,
    resolve: (value) => team.find((member) => member.id === value),
    onOpen: setViewingMember,
  })

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
    if (!window.confirm(`Remove ${member.name} from the team? Payroll history is kept.`)) return
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

  const columns: Column<TeamMember>[] = [
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
        <div className="flex max-w-[240px] flex-wrap gap-1">
          {row.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="border border-line px-1.5 py-0.5 font-mono text-[8px] uppercase text-fg-faint"
            >
              {skill}
            </span>
          ))}
          {row.skills.length > 3 ? (
            <span className="text-[9px] text-fg-faint">+{row.skills.length - 3}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'cycle',
      header: 'Cycle',
      render: (row) => (
        <span className="font-mono text-[9px] uppercase text-fg-faint">{row.payCycle}</span>
      ),
    },
    {
      key: 'monthlySalary',
      header: 'Monthly gross',
      align: 'right',
      render: (row) => (
        <span className="t-num text-[11px] text-fg">{formatMoney(row.monthlySalary)}</span>
      ),
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
        <TableActions>
          <TableActionButton
            label={`Edit ${row.name}`}
            icon="edit"
            tone="cold"
            onClick={() => {
              setEditingMember(row)
              setMemberOpen(true)
            }}
          />
          <TableActionButton
            label={`Salary structure for ${row.name}`}
            icon="tag"
            tone="cold"
            onClick={() => {
              navigate(`/admin/team/salary?member=${encodeURIComponent(row.id)}`)
            }}
          />
          <TableActionButton
            label={`Remove ${row.name}`}
            icon="close"
            tone="danger"
            onClick={() => void removeMember(row)}
          />
        </TableActions>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="t-h4 text-fg">Team register</h2>
          <p className="mt-1 text-[13px] text-fg-dim">
            {team.filter((member) => member.status === 'active').length} active ·{' '}
            {formatMoney(summary?.monthlyPayrollCommitment ?? 0)} monthly commitment
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Filter by role"
            value={roleFilter}
            options={[{ value: 'all', label: 'All roles' }, ...roles]}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="min-w-[150px]"
          />
          <Button
            icon="plus"
            onClick={() => {
              setEditingMember(null)
              setMemberOpen(true)
            }}
          >
            Add team member
          </Button>
        </div>
      </div>

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active team" value={summary?.activeTeam ?? 0} accent="cold" />
        <MetricCard
          label="Monthly commitment"
          value={formatMoney(summary?.monthlyPayrollCommitment ?? 0)}
          note="Gross structures at full month"
        />
        <MetricCard
          label="Salary ledger"
          value={summary?.count ?? 0}
          accent="heat"
          note="Payslips and legacy entries"
        />
        <MetricCard
          label="Paid all time"
          value={formatMoney(summary?.totalPaid ?? 0)}
          accent="success"
        />
      </div>

      {loading ? (
        <AdminLoading rows={5} />
      ) : filteredTeam.length === 0 ? (
        <EmptyState
          icon="wrench"
          title="No team members yet."
          description="Add technicians, engineers and office staff to build salary structures, track attendance and run payroll."
          action={<Button onClick={() => setMemberOpen(true)}>Add the first member</Button>}
        />
      ) : (
        <Table
          columns={columns}
          rows={filteredTeam}
          caption="Team register"
          onRowView={setViewingMember}
          viewLabel={(row) => row.name}
        />
      )}

      <div className="border border-line bg-panel-2/30 px-4 py-3 text-[12px] text-fg-dim">
        Next step: give each member a{' '}
        <Link to="/admin/team/salary" className="text-cold hover:underline">
          salary structure
        </Link>
        , log{' '}
        <Link to="/admin/team/attendance" className="text-cold hover:underline">
          attendance
        </Link>{' '}
        and run{' '}
        <Link to="/admin/team/payroll" className="text-cold hover:underline">
          payroll
        </Link>
        .
      </div>

      <Modal
        open={memberOpen}
        onClose={() => {
          setMemberOpen(false)
          setEditingMember(null)
        }}
        title={editingMember ? 'Edit team member' : 'Add team member'}
        description="Skills and certifications appear on job sheets. The monthly figure is the gross used by the salary structure and payroll."
        size="lg"
      >
        <MemberForm
          initial={editingMember}
          busy={busy}
          onSubmit={saveMember}
          onCancel={() => {
            setMemberOpen(false)
            setEditingMember(null)
          }}
        />
      </Modal>

      <RecordDrawer
        open={Boolean(viewingMember)}
        onClose={() => setViewingMember(null)}
        title={viewingMember?.name ?? 'Team member'}
        subtitle={
          viewingMember ? (ROLE_LABELS[viewingMember.role] ?? viewingMember.role) : undefined
        }
        record={viewingMember as unknown as Record<string, unknown> | null}
        exclude={['id']}
        actions={
          viewingMember ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  navigate(`/admin/team/salary?member=${encodeURIComponent(viewingMember.id)}`)
                }}
              >
                Salary structure
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingMember(viewingMember)
                  setViewingMember(null)
                  setMemberOpen(true)
                }}
              >
                Edit member
              </Button>
            </>
          ) : undefined
        }
      />
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
  const [payCycle, setPayCycle] = useState<TeamMemberInput['payCycle']>(
    initial?.payCycle ?? 'monthly',
  )
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
      {error ? (
        <p
          role="alert"
          className="border border-danger/40 bg-danger/[0.06] px-3 py-2 text-[12px] text-fg-dim"
        >
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Select
          label="Role"
          value={role}
          options={roles}
          onChange={(event) => setRole(event.target.value as TeamMemberInput['role'])}
        />
        <Input
          label="Phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="(214) 555-0100"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          hint="Payslips are emailed here"
        />
        <Input
          label="Monthly gross"
          type="number"
          min="0"
          step="0.01"
          value={monthlySalary}
          onChange={(event) => setMonthlySalary(event.target.value)}
        />
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
        <Input
          label="Joined on"
          type="date"
          value={joinedAt}
          onChange={(event) => setJoinedAt(event.target.value)}
        />
        <Select
          label="Status"
          value={status}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          onChange={(event) => setStatus(event.target.value as TeamMemberInput['status'])}
        />
      </div>
      <Input
        label="Skills"
        value={skills}
        onChange={(event) => setSkills(event.target.value)}
        placeholder="VRF commissioning, brazing, electrical"
        hint="Comma-separated"
      />
      <Input
        label="Certifications"
        value={certifications}
        onChange={(event) => setCertifications(event.target.value)}
        placeholder="ITI refrigeration, R32 handling"
        hint="Comma-separated"
      />
      <Textarea
        label="Notes"
        rows={2}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Availability, vehicle, site restrictions…"
      />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? 'Saving…' : initial ? 'Save member' : 'Add member'}
        </Button>
      </div>
    </form>
  )
}
