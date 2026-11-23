import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  appointmentStatusLabel,
  APPOINTMENT_STATUSES,
  serviceWindowLabel,
  type AppointmentRecord,
  type AppointmentStatus,
  type TeamMember,
} from '@hvac/shared'
import { Badge, Button, EmptyState, Select, useToast } from '@/components/ui'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [day, setDay] = useState<'today' | 'upcoming' | 'all'>('today')

  const load = useCallback(async () => {
    setError('')
    try {
      const [visits, members] = await Promise.all([adminApi.appointments(), adminApi.team()])
      setAppointments(visits)
      setTeam(members.data)
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
    patch: { status?: AppointmentStatus; technician?: string },
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
            <article key={appointment.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_170px_190px] lg:items-center">
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
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
