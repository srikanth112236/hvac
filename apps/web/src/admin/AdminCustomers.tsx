import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { customerStatusLabel, type CustomerAccountWithStats, type CustomerStatus } from '@hvac/shared'
import { Icon } from '@/components/icons'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Pagination,
  SearchSuggest,
  Textarea,
  useToast,
} from '@/components/ui'
import { adminApi, type PageMeta } from '@/admin/api'
import { AdminLoading, AdminPageHeader, InlineError, formatDate, formatDateTime, formatMoney } from '@/admin/ui'
import { useLiveRefresh } from '@/admin/useLiveRefresh'

interface CustomerForm {
  name: string
  email: string
  phone: string
  address: string
}

const blankForm: CustomerForm = { name: '', email: '', phone: '', address: '' }

export function AdminCustomers() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<CustomerAccountWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [summary, setSummary] = useState<{
    accounts: number
    pending: number
    outstanding: number
    invoiced: number
  } | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerAccountWithStats | null>(null)
  const [form, setForm] = useState<CustomerForm>(blankForm)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    const params = new URLSearchParams({ page: String(page), pageSize: '25' })
    if (term.trim()) params.set('q', term.trim())
    try {
      const payload = await adminApi.customersPage(`?${params.toString()}`)
      setCustomers(payload.data)
      setMeta(payload.meta ?? null)
      if (payload.summary) setSummary(payload.summary)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load customers.')
    } finally {
      setLoading(false)
    }
  }, [page, term])
  useLiveRefresh(load)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(query)
      setPage(1)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query])

  const suggestions = useMemo(
    () =>
      customers.map((customer) => ({
        id: customer.id,
        label: customer.name,
        value: customer.name,
        description: `${customer.email} · ${customer.phone || 'No phone'}`,
        meta: customerStatusLabel[customer.status],
        keywords: `${customer.email} ${customer.phone} ${customer.address}`,
      })),
    [customers],
  )

  const totals = useMemo(
    () => ({
      accounts: summary?.accounts ?? meta?.total ?? customers.length,
      pending: summary?.pending ?? 0,
      outstanding: summary?.outstanding ?? 0,
      invoiced: summary?.invoiced ?? 0,
    }),
    [customers.length, meta?.total, summary],
  )

  const openCreate = () => {
    setEditing(null)
    setForm(blankForm)
    setOpen(true)
  }

  const openEdit = (customer: CustomerAccountWithStats) => {
    setEditing(customer)
    setForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    })
    setOpen(true)
  }

  const save = async () => {
    setBusy(true)
    try {
      if (editing) {
        await adminApi.patchCustomer(editing.id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
        })
        toast({ title: 'Customer updated', tone: 'success' })
      } else {
        await adminApi.createCustomer(form)
        toast({ title: 'Customer added', description: form.name, tone: 'success' })
      }
      setOpen(false)
      setEditing(null)
      setForm(blankForm)
      await load()
    } catch (caught) {
      toast({
        title: editing ? 'Customer not updated' : 'Customer not added',
        description: caught instanceof Error ? caught.message : 'Check the details.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const updateStatus = async (customer: CustomerAccountWithStats, status: CustomerStatus) => {
    try {
      const updated = await adminApi.patchCustomer(customer.id, status)
      setCustomers((current) =>
        current.map((entry) =>
          entry.id === customer.id ? { ...entry, status: updated.status } : entry,
        ),
      )
      toast({ title: 'Status updated', description: `${customer.name} is now ${customerStatusLabel[status].toLowerCase()}.`, tone: 'success' })
    } catch (caught) {
      toast({ title: 'Status not updated', description: caught instanceof Error ? caught.message : 'Try again.', tone: 'danger' })
    }
  }

  if (loading) return <AdminLoading rows={6} />

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Customers · CV-CRM"
        title="Customers and their complete file."
        description="Contact details, invoices, payments, sites, equipment, quotations, AMC cover and service history in one customer record."
        actions={
          <>
            <Button variant="secondary" size="sm" icon="refresh" onClick={() => void load()}>
              Refresh
            </Button>
            <Button size="sm" icon="plus" onClick={openCreate}>
              Add customer
            </Button>
            <a
              href="/api/v1/admin/csv/customers"
              className="flex h-9 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Export CSV
            </a>
          </>
        }
      />

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Customers', String(totals.accounts), 'Complete customer records'],
          ['Awaiting approval', String(totals.pending), 'Verification or approval'],
          ['Open balance', formatMoney(totals.outstanding), 'Across all invoices'],
          ['Invoices', String(totals.invoiced), 'Issued to these customers'],
        ].map(([label, value, note]) => (
          <div key={label} className="border border-line bg-panel/30 p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">{label}</span>
            <p className="mt-2 font-display text-2xl text-fg">{value}</p>
            <p className="mt-1 text-[10px] text-fg-faint">{note}</p>
          </div>
        ))}
      </div>

      <section className="border border-line bg-panel/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">Customer records</h2>
          <div className="w-full max-w-sm">
            <SearchSuggest
              aria-label="Search customers"
              placeholder="Search name, email, phone or address"
              value={query}
              onChange={setQuery}
              suggestions={suggestions}
              onSelect={(suggestion) => {
                setQuery(suggestion.label)
                navigate(`/admin/customers/${suggestion.id}`)
              }}
              emptyMessage="No customer matches that search."
            />
          </div>
        </div>
        {customers.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No customers in this view"
              description="Add a customer here, or let a portal registration or lead create one."
              action={<Button onClick={openCreate}>Add customer</Button>}
            />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {customers.map((customer) => (
              <article key={customer.id} className="grid gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.5fr))_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/admin/customers/${customer.id}`} className="truncate text-sm text-fg hover:text-cold">
                      {customer.name}
                    </Link>
                    <Badge tone={customer.status === 'active' ? 'success' : customer.status === 'pending' ? 'warn' : 'heat'}>
                      {customerStatusLabel[customer.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-fg-dim">{customer.email}</p>
                  <p className="text-[11px] text-fg-dim">{customer.phone || 'No mobile number'}</p>
                  <p className="mt-1 line-clamp-1 text-[10px] text-fg-faint">{customer.address || 'No address on file'} · joined {formatDate(customer.createdAt)}</p>
                </div>
                <div>
                  <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Invoices</span>
                  <span className="text-sm text-fg">{customer.invoiceCount}</span>
                  <span className="mt-1 block text-[10px] text-fg-faint">{formatMoney(customer.openBalance)} open</span>
                </div>
                <div>
                  <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Next visit</span>
                  <span className="text-[11px] text-fg-dim">{customer.nextAppointmentAt ? formatDateTime(customer.nextAppointmentAt) : 'None booked'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-self-end">
                  <Link
                    to={`/admin/customers/${customer.id}`}
                    aria-label={`View ${customer.name}`}
                    title={`View ${customer.name}`}
                    className="flex h-8 w-8 items-center justify-center border border-line text-fg-faint hover:border-cold/50 hover:text-cold"
                  >
                    <Icon name="eye" size={13} />
                  </Link>
                  <Link
                    to={`/admin/customers/${customer.id}`}
                    className="flex h-8 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:border-cold/50 hover:text-fg"
                  >
                    Open file
                  </Link>
                  <Button variant="quiet" size="sm" onClick={() => openEdit(customer)}>
                    Edit
                  </Button>
                  {customer.status === 'active' ? (
                    <Button variant="quiet" size="sm" onClick={() => void updateStatus(customer, 'suspended')}>
                      Suspend
                    </Button>
                  ) : customer.status === 'unverified' ? (
                    <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">Email unverified</span>
                  ) : (
                    <Button size="sm" onClick={() => void updateStatus(customer, 'active')}>
                      Approve
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {meta && meta.pages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
              {meta.count} matching · {meta.total} customers
            </span>
            <Pagination page={meta.page} pageCount={meta.pages} onPageChange={setPage} />
          </div>
        ) : null}
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add customer'}
        description="These details appear on invoices, service visits, emails and the customer portal."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={() => void save()} icon={editing ? 'check' : 'plus'}>
              {editing ? 'Save customer' : 'Add customer'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Customer name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Mobile number" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <Input label="Email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <div className="sm:col-span-2">
            <Textarea label="Service address" rows={2} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </div>
          {editing ? (
            <p className="sm:col-span-2 text-[11px] leading-relaxed text-fg-faint">
              Changing the email keeps invoice matching tied to the new address. Portal access status is managed separately.
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
