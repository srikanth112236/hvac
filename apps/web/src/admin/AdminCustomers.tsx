import { useCallback, useMemo, useState } from 'react'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { Link } from 'react-router-dom'
import {
  appointmentStatusLabel,
  APPOINTMENT_STATUSES,
  customerStatusLabel,
  serviceWindowLabel,
  type AppointmentRecord,
  type AppointmentStatus,
  type CustomerAccountWithStats,
  type CustomerStatus,
} from '@hvac/shared'
import { Badge, Button, EmptyState, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import { adminApi } from '@/admin/api'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  formatDate,
  formatDateTime,
  formatMoney,
} from '@/admin/ui'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AdminCustomers() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<CustomerAccountWithStats[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
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
      const [accounts, visits] = await Promise.all([
        adminApi.customers(),
        adminApi.appointments(),
      ])
      setCustomers(accounts)
      setAppointments(visits)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load customers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useLiveRefresh(load)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone, customer.address]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [customers, query])

  const totals = useMemo(
    () => ({
      accounts: customers.length,
      pending: customers.filter(
        (customer) => customer.status === 'pending' || customer.status === 'unverified',
      ).length,
      outstanding: customers.reduce((sum, customer) => sum + customer.openBalance, 0),
      upcoming: appointments.filter(
        (appointment) =>
          appointment.status !== 'cancelled' && appointment.status !== 'completed',
      ).length,
      completed: appointments.filter((appointment) => appointment.status === 'completed').length,
    }),
    [appointments, customers],
  )

  const updateCustomerStatus = async (
    customer: CustomerAccountWithStats,
    status: CustomerStatus,
  ) => {
    try {
      const updated = await adminApi.patchCustomer(customer.id, status)
      setCustomers((current) =>
        current.map((entry) =>
          entry.id === updated.id ? { ...entry, status: updated.status } : entry,
        ),
      )
      toast({
        title: 'Portal access updated',
        description: `${customer.name} is now ${customerStatusLabel[status].toLowerCase()}.`,
        tone: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Could not update access',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const updateStatus = async (appointment: AppointmentRecord, status: AppointmentStatus) => {
    try {
      const updated = await adminApi.patchAppointment(appointment.id, { status })
      setAppointments((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      )
      toast({ title: 'Visit updated', description: `${appointment.ref} is now ${appointmentStatusLabel[status]}.`, tone: 'success' })
    } catch (caught) {
      toast({ title: 'Could not update visit', description: caught instanceof Error ? caught.message : 'Try again.', tone: 'danger' })
    }
  }

  const createAppointment = async () => {
    setSaving(true)
    try {
      const created = await adminApi.createAppointment(form)
      setAppointments((current) => [created, ...current])
      setCreateOpen(false)
      setForm((current) => ({ ...current, customerName: '', customerEmail: '', customerPhone: '', address: '', notes: '' }))
      toast({ title: 'Visit scheduled', description: `${created.ref} was added to the dispatch board.`, tone: 'success' })
      void load()
    } catch (caught) {
      toast({ title: 'Could not schedule visit', description: caught instanceof Error ? caught.message : 'Check the details.', tone: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AdminLoading rows={6} />

  return (
    <>
      <AdminPageHeader
        eyebrow="People · CV-CRM"
        title="Customers & dispatch"
        description="Portal accounts, invoice balances and every service visit on one board. Changes here appear in the customer portal immediately."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon="refresh" onClick={() => void load()}>
              Refresh
            </Button>
            <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>
              Schedule visit
            </Button>
          </div>
        }
      />

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Portal accounts', String(totals.accounts), 'Registered customers'],
          ['Awaiting approval', String(totals.pending), 'Verification or approval'],
          ['Open balance', formatMoney(totals.outstanding), 'Across all invoices'],
          ['Active visits', String(totals.upcoming), 'Requested or scheduled'],
          ['Completed', String(totals.completed), 'Closed service visits'],
        ].map(([label, value, note]) => (
          <div key={label} className="border border-line bg-panel/30 p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">{label}</span>
            <p className="mt-2 font-display text-2xl text-fg">{value}</p>
            <p className="mt-1 text-[10px] text-fg-faint">{note}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 border border-line bg-panel/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">Customer accounts</h2>
          <Input
            aria-label="Search customers"
            placeholder="Search name, email or phone"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-[280px]"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No portal accounts yet"
              description="Customers appear here after they register at /portal. Invoices already addressed to their email show up automatically."
            />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((customer) => (
              <article key={customer.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,0.55fr))_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm text-fg">{customer.name}</p>
                    <Badge
                      tone={
                        customer.status === 'active'
                          ? 'success'
                          : customer.status === 'pending'
                            ? 'warn'
                            : 'heat'
                      }
                    >
                      {customerStatusLabel[customer.status]}
                    </Badge>
                  </div>
                  <p className="truncate text-[11px] text-fg-dim">{customer.email}</p>
                  <p className="text-[10px] text-fg-faint">{customer.phone || 'No phone'} · joined {formatDate(customer.createdAt)}</p>
                </div>
                <div>
                  <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Invoices</span>
                  <span className="text-sm text-fg">{customer.invoiceCount}</span>
                </div>
                <div>
                  <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Open balance</span>
                  <span className={customer.openBalance > 0 ? 'text-sm text-heat' : 'text-sm text-fg'}>{formatMoney(customer.openBalance)}</span>
                </div>
                <div>
                  <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Next visit</span>
                  <span className="text-[11px] text-fg-dim">{customer.nextAppointmentAt ? formatDateTime(customer.nextAppointmentAt) : 'None booked'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-self-end">
                  <Link
                    to={`/admin/customers/${customer.id}`}
                    className="flex h-8 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
                  >
                    File
                  </Link>
                  {customer.status === 'active' ? (
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => void updateCustomerStatus(customer, 'suspended')}
                    >
                      Suspend
                    </Button>
                  ) : customer.status === 'unverified' ? (
                    <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                      Email unverified
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => void updateCustomerStatus(customer, 'active')}
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 border border-line bg-panel/20">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">Dispatch board</h2>
          <Badge tone="cold">{appointments.length} visits</Badge>
        </div>
        {appointments.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No visits booked" description="Schedule a visit here or wait for a customer portal booking. Each portal request also creates a lead." />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {appointments.map((appointment) => (
              <article key={appointment.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[9px] text-cold">{appointment.ref}</span>
                    <Badge tone={appointment.status === 'cancelled' ? 'heat' : 'neutral'}>{appointmentStatusLabel[appointment.status]}</Badge>
                    {appointment.rebookOf ? <Badge tone="cold">Rebook</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-fg">{appointment.customerName} · {appointment.serviceName}</p>
                  <p className="text-[11px] text-fg-dim">{formatDateTime(appointment.scheduledAt)} · {serviceWindowLabel(appointment.window)}</p>
                  <p className="mt-1 text-[11px] text-fg-faint">{appointment.address || 'Address to confirm'}</p>
                  <p className="mt-1 text-[10px] text-fg-faint">{appointment.customerEmail}{appointment.customerPhone ? ` · ${appointment.customerPhone}` : ''}{appointment.leadRef ? ` · lead ${appointment.leadRef}` : ''}</p>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Status</span>
                  <Select
                    aria-label={`Status for ${appointment.ref}`}
                    value={appointment.status}
                    onChange={(event) => void updateStatus(appointment, event.target.value as AppointmentStatus)}
                    options={APPOINTMENT_STATUSES.map((status) => ({ value: status, label: appointmentStatusLabel[status] }))}
                  />
                </label>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Schedule a service visit"
        description="Adds a visit to the dispatch board. Link a portal customer by using their email address."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={() => void createAppointment()}>Schedule visit</Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Customer name" required value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
          <Input label="Email" type="email" value={form.customerEmail} onChange={(event) => setForm({ ...form, customerEmail: event.target.value })} />
          <Input label="Phone" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} />
          <Input label="Service" value={form.serviceName} onChange={(event) => setForm({ ...form, serviceName: event.target.value })} />
          <Input label="Visit date" type="date" min={today()} value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} />
          <Select
            label="Window"
            value={form.window}
            onChange={(event) => setForm({ ...form, window: event.target.value as AppointmentRecord['window'] })}
            options={(['morning', 'afternoon', 'evening', 'emergency'] as const).map((entry) => ({ value: entry, label: serviceWindowLabel(entry) }))}
          />
          <Input label="Technician" value={form.technician} onChange={(event) => setForm({ ...form, technician: event.target.value })} />
          <div className="sm:col-span-2">
            <Textarea label="Service address" rows={2} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Notes" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
        </div>
      </Modal>
    </>
  )
}