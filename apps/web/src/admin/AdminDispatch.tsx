import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  appointmentStatusLabel,
  APPOINTMENT_STATUSES,
  serviceWindowLabel,
  type AmcContract,
  type AppointmentRecord,
  type AppointmentStatus,
  type TeamMember,
} from '@hvac/shared'
import { Badge, Button, EmptyState, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import { adminApi } from '@/admin/api'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { AdminLoading, AdminPageHeader, InlineError, formatDateTime } from '@/admin/ui'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AdminDispatch() {
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [contracts, setContracts] = useState<AmcContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [day, setDay] = useState<'today' | 'upcoming' | 'all'>('today')
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    serviceName: 'HVAC service',
    address: '',
    scheduledAt: today(),
    window: 'morning' as AppointmentRecord['window'],
    technician: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setError('')
    try {
      const [visits, members, amc] = await Promise.all([
        adminApi.appointments(),
        adminApi.team(),
        adminApi.amcContracts(),
      ])
      setAppointments(visits)
      setTeam(members.data)
      setContracts(amc)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load dispatch.')
    } finally {
      setLoading(false)
    }
  }, [])
  useLiveRefresh(load)

  const visible = useMemo(() => {
    const start = Date.parse(`${today()}T00:00:00`)
    const end = start + 86_400_000
    return appointments
      .filter((appointment) => {
        if (day === 'all') return true
        const at = Date.parse(appointment.scheduledAt)
        if (day === 'today') return at >= start && at < end
        return at >= end
      })
      .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
  }, [appointments, day])

  const counts = useMemo(
    () => ({
      today: appointments.filter((appointment) => {
        const at = Date.parse(appointment.scheduledAt)
        const start = Date.parse(`${today()}T00:00:00`)
        return at >= start && at < start + 86_400_000
      }).length,
      open: appointments.filter(
        (appointment) => appointment.status === 'requested' || appointment.status === 'scheduled',
      ).length,
      emergency: appointments.filter(
        (appointment) => appointment.window === 'emergency' && appointment.status !== 'completed',
      ).length,
    }),
    [appointments],
  )

  const patch = async (
    appointment: AppointmentRecord,
    patch: { status?: AppointmentStatus; technician?: string; amcContractId?: string | null },
  ) => {
    try {
      const updated = await adminApi.patchAppointment(appointment.id, patch)
      setAppointments((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      )
      toast({ title: 'Dispatch updated', description: `${appointment.ref} saved.`, tone: 'success' })
    } catch (caught) {
      toast({
        title: 'Could not update dispatch',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const createAppointment = async () => {
    setSaving(true)
    try {
      const created = await adminApi.createAppointment(form)
      setAppointments((current) => [created, ...current])
      setCreateOpen(false)
      setForm((current) => ({
        ...current,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        address: '',
        notes: '',
      }))
      toast({ title: 'Visit scheduled', description: `${created.ref} added to dispatch.`, tone: 'success' })
      await load()
    } catch (caught) {
      toast({ title: 'Could not schedule visit', description: caught instanceof Error ? caught.message : 'Check the details.', tone: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AdminLoading rows={7} />

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Dispatch · CV-BOARD"
        title="Today at the works."
        description="Appointments by day, engineer and status. Changes are visible in the customer portal immediately."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={day === 'today' ? 'primary' : 'secondary'}
              onClick={() => setDay('today')}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant={day === 'upcoming' ? 'primary' : 'secondary'}
              onClick={() => setDay('upcoming')}
            >
              Upcoming
            </Button>
            <Button
              size="sm"
              variant={day === 'all' ? 'primary' : 'secondary'}
              onClick={() => setDay('all')}
            >
              All
            </Button>
            <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>
              Schedule visit
            </Button>
          </div>
        }
      />

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Visits today', counts.today],
          ['Open visits', counts.open],
          ['Emergency open', counts.emergency],
        ].map(([label, value]) => (
          <div key={label} className="border border-line bg-panel/30 p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">{label}</span>
            <p className="mt-2 font-display text-2xl text-fg">{value}</p>
          </div>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No visits in this view"
          description="Portal bookings and admin-scheduled visits appear here."
        />
      ) : (
        <div className="divide-y divide-line border border-line bg-panel/20">
          {visible.map((appointment) => (
            <article key={appointment.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_150px_170px_190px] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] text-cold">{appointment.ref}</span>
                  <Badge
                    tone={
                      appointment.status === 'cancelled'
                        ? 'danger'
                        : appointment.status === 'completed'
                          ? 'success'
                          : appointment.window === 'emergency'
                            ? 'heat'
                            : 'cold'
                    }
                  >
                    {appointmentStatusLabel[appointment.status]}
                  </Badge>
                  {appointment.window === 'emergency' ? <Badge tone="heat">Emergency</Badge> : null}
                  {appointment.customerId ? (
                    <Link
                      to={`/admin/customers/${appointment.customerId}`}
                      className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint hover:text-cold"
                    >
                      Customer file
                    </Link>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-fg">
                  {appointment.customerName} · {appointment.serviceName}
                </p>
                <p className="text-[11px] text-fg-dim">
                  {formatDateTime(appointment.scheduledAt)} · {serviceWindowLabel(appointment.window)}
                </p>
                <p className="mt-1 text-[11px] text-fg-faint">
                  {appointment.address || 'Address to confirm'}
                  {appointment.customerPhone ? ` · ${appointment.customerPhone}` : ''}
                </p>
              </div>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Status</span>
                <Select
                  aria-label={`Status for ${appointment.ref}`}
                  value={appointment.status}
                  onChange={(event) =>
                    void patch(appointment, { status: event.target.value as AppointmentStatus })
                  }
                  options={APPOINTMENT_STATUSES.map((status) => ({
                    value: status,
                    label: appointmentStatusLabel[status],
                  }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Engineer</span>
                <Select
                  aria-label={`Engineer for ${appointment.ref}`}
                  value={appointment.technician}
                  onChange={(event) => void patch(appointment, { technician: event.target.value })}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...team
                      .filter((member) => member.status === 'active')
                      .map((member) => ({ value: member.name, label: `${member.name} · ${member.role}` })),
                  ]}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">AMC contract</span>
                <Select
                  aria-label={`AMC contract for ${appointment.ref}`}
                  value={appointment.amcContractId ?? ''}
                  onChange={(event) =>
                    void patch(appointment, { amcContractId: event.target.value || null })
                  }
                  options={[
                    { value: '', label: 'Not linked' },
                    ...contracts
                      .filter((contract) => contract.customerId === appointment.customerId)
                      .map((contract) => ({
                        value: contract.id,
                        label: `${contract.ref} · ${contract.plan}`,
                      })),
                  ]}
                />
              </label>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Schedule a service visit"
        description="Adds a diary appointment and its linked job. Link a portal customer by email, or enter the visit manually."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={() => void createAppointment()} icon="plus">Schedule visit</Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Customer name" required value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
          <Input label="Mobile number" type="tel" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} />
          <Input label="Email" type="email" value={form.customerEmail} onChange={(event) => setForm({ ...form, customerEmail: event.target.value })} />
          <Input label="Service" value={form.serviceName} onChange={(event) => setForm({ ...form, serviceName: event.target.value })} />
          <Input label="Visit date" type="date" min={today()} value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} />
          <Select label="Window" value={form.window} onChange={(event) => setForm({ ...form, window: event.target.value as AppointmentRecord['window'] })} options={(['morning', 'afternoon', 'evening', 'emergency'] as const).map((entry) => ({ value: entry, label: serviceWindowLabel(entry) }))} />
          <Input label="Technician" value={form.technician} onChange={(event) => setForm({ ...form, technician: event.target.value })} />
          <div className="sm:col-span-2"><Textarea label="Service address" rows={2} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div>
          <div className="sm:col-span-2"><Textarea label="Notes" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
        </div>
      </Modal>
    </div>
  )
}
