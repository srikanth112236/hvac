import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useRecordDeepLink } from '@/admin/useDeepLink'
import {
  appointmentStatusLabel,
  APPOINTMENT_STATUSES,
  customerStatusLabel,
  serviceWindowLabel,
  type AmcContract,
  type AppointmentRecord,
  type AppointmentStatus,
  type CustomerAccountWithStats,
  type TeamMember,
} from '@hvac/shared'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  RecordDrawer,
  RecordViewButton,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { adminApi } from '@/admin/api'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { AdminLoading, AdminPageHeader, InlineError, formatDateTime, formatMoney } from '@/admin/ui'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function CustomerPicker({
  customers,
  selected,
  onSelect,
  onClear,
}: {
  customers: CustomerAccountWithStats[]
  selected: CustomerAccountWithStats | null
  onSelect: (customer: CustomerAccountWithStats) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    const list = term
      ? customers.filter((customer) =>
          [customer.name, customer.email, customer.phone, customer.address, customer.status]
            .join(' ')
            .toLowerCase()
            .includes(term),
        )
      : customers
    return list.slice(0, 8)
  }, [customers, query])
  const show = open && query.trim().length >= 2

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => listRef.current?.scrollIntoView({ block: 'nearest' }))
    return () => cancelAnimationFrame(frame)
  }, [open, results.length])

  const choose = (customer: CustomerAccountWithStats) => {
    onSelect(customer)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((current) => Math.min(current + 1, Math.max(0, results.length - 1)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => Math.max(0, current - 1))
    } else if (event.key === 'Enter' && show && results[active]) {
      event.preventDefault()
      choose(results[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  if (selected) {
    return (
      <div className="border border-cold/30 bg-cold/[0.04] p-3 sm:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-cold">
              Linked portal customer
            </span>
            <p className="mt-1 text-[13px] text-fg">{selected.name}</p>
            <p className="mt-0.5 text-[11px] text-fg-dim">
              {selected.email}
              {selected.phone ? ` · ${selected.phone}` : ' · No phone'}
            </p>
            <p className="mt-1 text-[11px] text-fg-faint">
              {selected.address || 'No address on file'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="flex h-8 items-center border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim hover:border-cold/50 hover:text-cold"
          >
            Change customer
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-2">
          <Badge tone={selected.status === 'active' ? 'success' : 'warn'}>
            {customerStatusLabel[selected.status]}
          </Badge>
          <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
            {selected.invoiceCount} invoices · {formatMoney(selected.openBalance)} open
          </span>
          {selected.nextAppointmentAt ? (
            <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
              Next visit {formatDateTime(selected.nextAppointmentAt)}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5 sm:col-span-2">
      <Input
        label="Find customer"
        value={query}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={show ? 'dispatch-customer-options' : undefined}
        placeholder="Search name, email, phone or address"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        hint={
          customers.length
            ? `Type 2+ characters to search all ${customers.length} customer records, then pick one to fill the visit.`
            : 'No customer records loaded yet.'
        }
        labelAction={
          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
            {customers.length} total
          </span>
        }
      />
      {show ? (
        <div
          id="dispatch-customer-options"
          ref={listRef}
          role="listbox"
          aria-label="Customer suggestions"
          className="max-h-64 overflow-auto border border-line bg-base/80"
        >
          {results.length ? (
            results.map((customer, index) => (
              <button
                key={customer.id}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(customer)}
                className={`flex w-full items-start justify-between gap-3 border-b border-line/60 px-3 py-2.5 text-left last:border-0 ${
                  index === active ? 'bg-cold/[0.08]' : 'hover:bg-panel/70'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12px] text-fg">{customer.name}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-fg-dim">
                    {customer.email}
                    {customer.phone ? ` · ${customer.phone}` : ''}
                  </span>
                  <span className="mt-0.5 block truncate text-[9px] text-fg-faint">
                    {customer.address || 'No address on file'}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
                    {customerStatusLabel[customer.status]}
                  </span>
                  {customer.nextAppointmentAt ? (
                    <span className="mt-1 block text-[9px] text-cold">Booked</span>
                  ) : null}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-[11px] text-fg-faint">
              No customer matches “{query}”. You can still enter the visit manually below.
            </p>
          )}
          {customers.length > results.length ? (
            <p className="border-t border-line/60 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
              Showing {results.length} of {customers.length} · type to narrow
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function TechnicianPicker({
  team,
  value,
  onChange,
}: {
  team: TeamMember[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const activeTeam = useMemo(() => team.filter((member) => member.status === 'active'), [team])
  const results = useMemo(() => {
    const term = value.trim().toLowerCase()
    const list = term
      ? activeTeam.filter((member) =>
          [member.name, member.role, member.phone, member.email, ...member.skills]
            .join(' ')
            .toLowerCase()
            .includes(term),
        )
      : activeTeam
    return list.slice(0, 6)
  }, [activeTeam, value])
  const show = open && value.trim().length >= 2

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => listRef.current?.scrollIntoView({ block: 'nearest' }))
    return () => cancelAnimationFrame(frame)
  }, [open, results.length])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [value])

  const choose = (member: TeamMember) => {
    onChange(member.name)
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((current) => Math.min(current + 1, Math.max(0, results.length - 1)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => Math.max(0, current - 1))
    } else if (event.key === 'Enter' && show && results[active]) {
      event.preventDefault()
      choose(results[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const selectedMember = activeTeam.find((member) => member.name === value) ?? null

  return (
    <div ref={rootRef} className="relative">
      <Input
        label="Technician"
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={show ? 'dispatch-technician-options' : undefined}
        placeholder="Search active technicians or type a name"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        hint={
          selectedMember
            ? `${selectedMember.role} · ${selectedMember.skills.join(', ') || 'No skills listed'}`
            : 'Type 2+ characters to search the active team, or type a custom engineer.'
        }
        labelAction={
          value ? (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(true)
              }}
              className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint hover:text-cold"
            >
              Clear
            </button>
          ) : null
        }
      />
      {show ? (
        <div
          id="dispatch-technician-options"
          ref={listRef}
          role="listbox"
          aria-label="Technician suggestions"
          className="mt-1 max-h-56 overflow-auto border border-line bg-base/80"
        >
          {results.length ? (
            results.map((member, index) => (
              <button
                key={member.id}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(member)}
                className={`flex w-full items-start justify-between gap-3 border-b border-line/60 px-3 py-2 text-left last:border-0 ${
                  index === active ? 'bg-cold/[0.08]' : 'hover:bg-panel/70'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12px] text-fg">{member.name}</span>
                  <span className="mt-0.5 block text-[10px] text-fg-dim">
                    {member.role}
                    {member.skills.length ? ` · ${member.skills.join(', ')}` : ''}
                  </span>
                </span>
                {member.phone ? (
                  <span className="shrink-0 font-mono text-[8px] text-fg-faint">
                    {member.phone}
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-[11px] text-fg-faint">
              No active technician matches. You can still use this as a custom name.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function AdminDispatch() {
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [contracts, setContracts] = useState<AmcContract[]>([])
  const [customers, setCustomers] = useState<CustomerAccountWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [day, setDay] = useState<'today' | 'upcoming' | 'all'>('today')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewing, setViewing] = useState<AppointmentRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customerId: '',
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
      const [visits, members, amc, customerList] = await Promise.all([
        adminApi.appointments(),
        adminApi.team(),
        adminApi.amcContracts(),
        adminApi.customers(),
      ])
      setAppointments(visits)
      setTeam(members.data)
      setContracts(amc)
      setCustomers(customerList)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load dispatch.')
    } finally {
      setLoading(false)
    }
  }, [])
  useLiveRefresh(load)

  useRecordDeepLink({
    param: 'open',
    records: appointments,
    resolve: (value) =>
      appointments.find(
        (appointment) => appointment.id === value || appointment.ref === value,
      ),
    onOpen: setViewing,
  })

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
      toast({
        title: 'Dispatch updated',
        description: `${appointment.ref} saved.`,
        tone: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Could not update dispatch',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customerId) ?? null,
    [customers, form.customerId],
  )

  const selectCustomer = (customer: CustomerAccountWithStats) => {
    setForm((current) => ({
      ...current,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      address: customer.address,
    }))
    void adminApi
      .customerFile(customer.id)
      .then(({ file }) => {
        const primary = file.sites.find((site) => site.isPrimary) ?? file.sites[0]
        if (!primary?.address) return
        setForm((current) =>
          current.customerId === customer.id ? { ...current, address: primary.address } : current,
        )
      })
      .catch(() => {
        // The account address is enough when the site file cannot be read.
      })
  }

  const clearCustomer = () => {
    setForm((current) => ({ ...current, customerId: '' }))
  }

  const createAppointment = async () => {
    setSaving(true)
    try {
      const created = await adminApi.createAppointment(form)
      setAppointments((current) => [created, ...current])
      setCreateOpen(false)
      setForm((current) => ({
        ...current,
        customerId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        address: '',
        technician: '',
        notes: '',
      }))
      toast({
        title: 'Visit scheduled',
        description: `${created.ref} added to dispatch.`,
        tone: 'success',
      })
      await load()
    } catch (caught) {
      toast({
        title: 'Could not schedule visit',
        description: caught instanceof Error ? caught.message : 'Check the details.',
        tone: 'danger',
      })
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
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              {label}
            </span>
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
            <article
              key={appointment.id}
              className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_150px_170px_190px] lg:items-center"
            >
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
                  <RecordViewButton
                    label={`visit ${appointment.ref}`}
                    onClick={() => setViewing(appointment)}
                  />
                </div>
                <p className="mt-1 text-sm text-fg">
                  {appointment.customerName} · {appointment.serviceName}
                </p>
                <p className="text-[11px] text-fg-dim">
                  {formatDateTime(appointment.scheduledAt)} ·{' '}
                  {serviceWindowLabel(appointment.window)}
                </p>
                <p className="mt-1 text-[11px] text-fg-faint">
                  {appointment.address || 'Address to confirm'}
                  {appointment.customerPhone ? ` · ${appointment.customerPhone}` : ''}
                </p>
              </div>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  Status
                </span>
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
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  Engineer
                </span>
                <Select
                  aria-label={`Engineer for ${appointment.ref}`}
                  value={appointment.technician}
                  onChange={(event) => void patch(appointment, { technician: event.target.value })}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...team
                      .filter((member) => member.status === 'active')
                      .map((member) => ({
                        value: member.name,
                        label: `${member.name} · ${member.role}`,
                      })),
                  ]}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  AMC contract
                </span>
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
        description="Search all customers to fill the visit, choose an active technician with suggestions, or enter the details manually."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void createAppointment()} icon="plus">
              Schedule visit
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CustomerPicker
            customers={customers}
            selected={selectedCustomer}
            onSelect={selectCustomer}
            onClear={clearCustomer}
          />
          <Input
            label="Customer name"
            required
            value={form.customerName}
            onChange={(event) => setForm({ ...form, customerName: event.target.value })}
          />
          <Input
            label="Mobile number"
            type="tel"
            value={form.customerPhone}
            onChange={(event) => setForm({ ...form, customerPhone: event.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.customerEmail}
            onChange={(event) => setForm({ ...form, customerEmail: event.target.value })}
          />
          <Input
            label="Service"
            value={form.serviceName}
            onChange={(event) => setForm({ ...form, serviceName: event.target.value })}
          />
          <Input
            label="Visit date"
            type="date"
            min={today()}
            value={form.scheduledAt}
            onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })}
          />
          <Select
            label="Window"
            value={form.window}
            onChange={(event) =>
              setForm({ ...form, window: event.target.value as AppointmentRecord['window'] })
            }
            options={(['morning', 'afternoon', 'evening', 'emergency'] as const).map((entry) => ({
              value: entry,
              label: serviceWindowLabel(entry),
            }))}
          />
          <TechnicianPicker
            team={team}
            value={form.technician}
            onChange={(technician) => setForm({ ...form, technician })}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Service address"
              rows={2}
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Notes"
              rows={3}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </div>
        </div>
      </Modal>

      <RecordDrawer
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.ref ?? 'Visit'}
        subtitle={viewing ? `${viewing.customerName} · ${viewing.serviceName}` : undefined}
        badge={
          viewing ? (
            <Badge
              tone={
                viewing.status === 'cancelled'
                  ? 'danger'
                  : viewing.status === 'completed'
                    ? 'success'
                    : viewing.window === 'emergency'
                      ? 'heat'
                      : 'cold'
              }
            >
              {appointmentStatusLabel[viewing.status]}
            </Badge>
          ) : undefined
        }
        record={
          viewing
            ? {
                reference: viewing.ref,
                customer: viewing.customerName,
                email: viewing.customerEmail,
                phone: viewing.customerPhone,
                service: viewing.serviceName,
                address: viewing.address,
                scheduledAt: viewing.scheduledAt,
                window: serviceWindowLabel(viewing.window),
                status: appointmentStatusLabel[viewing.status],
                technician: viewing.technician || 'Unassigned',
                lead: viewing.leadRef,
                amcContractId: viewing.amcContractId,
                notes: viewing.notes,
                createdAt: viewing.createdAt,
                updatedAt: viewing.updatedAt,
              }
            : null
        }
        actions={
          viewing?.customerId ? (
            <Link
              to={`/admin/customers/${viewing.customerId}`}
              className="flex h-9 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Open customer
            </Link>
          ) : undefined
        }
      />
    </div>
  )
}
