import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { Link, useNavigate } from 'react-router-dom'
import {
  Button,
  EmptyState,
  Modal,
  Pagination,
  RecordDrawer,
  SearchSuggest,
  Select,
  Table,
  TableActionButton,
  TableActionLink,
  TableActions,
  useToast,
  type Column,
} from '@/components/ui'
import type { InvoiceInput, InvoiceSummary, InvoiceWithTotals } from '@hvac/shared'
import { adminApi, type PageMeta } from '@/admin/api'
import { InvoiceForm } from '@/admin/InvoiceForm'
import { InvoiceStateBadge } from '@/admin/invoice-ui'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  MetricCard,
  formatDate,
  formatMoney,
} from '@/admin/ui'

export function AdminInvoices() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<InvoiceWithTotals[]>([])
  const [summary, setSummary] = useState<InvoiceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<InvoiceWithTotals | null>(null)
  const [amcBusy, setAmcBusy] = useState(false)

  const billAmcContracts = async () => {
    const period = window.prompt(
      'Bill active AMC contracts for which billing period? (YYYY-MM)',
      new Date().toISOString().slice(0, 7),
    )
    if (!period) return
    setAmcBusy(true)
    try {
      const result = await adminApi.runAmcInvoices(period)
      toast({
        title: 'AMC billing run finished',
        description: `${result.data.createdCount} invoice(s) raised for ${result.data.period} · ${result.data.skipped} already billed of ${result.data.eligible} active contracts.`,
        tone: 'success',
      })
      await load()
    } catch (caught) {
      toast({
        title: 'AMC billing failed',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setAmcBusy(false)
    }
  }

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (filter !== 'all') params.set('state', filter)
    if (searchTerm.trim()) params.set('q', searchTerm.trim())
    try {
      const payload = await adminApi.invoices(`?${params.toString()}`)
      setInvoices(payload.data)
      setSummary(payload.summary)
      setMeta(payload.meta ?? null)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load invoices.')
    } finally {
      setLoading(false)
    }
  }, [page, filter, searchTerm])

  useLiveRefresh(load)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(search)
      setPage(1)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [filter])

  const suggestions = useMemo(
    () =>
      invoices.map((invoice) => ({
        id: invoice.id,
        label: invoice.ref,
        value: invoice.ref,
        description: `${invoice.customerName} · ${invoice.service || 'Service invoice'}`,
        meta: invoice.totals.state,
        keywords: `${invoice.customerPhone} ${invoice.customerEmail} ${invoice.issueDate}`,
      })),
    [invoices],
  )

  const create = async (input: InvoiceInput) => {
    setCreating(true)
    try {
      const result = await adminApi.createInvoice(input)
      setCreateOpen(false)
      toast({ title: 'Invoice created', description: result.data.ref, tone: 'success' })
      navigate(`/admin/invoices/${result.data.id}`)
    } catch (caught) {
      toast({
        title: 'Invoice not created',
        description: caught instanceof Error ? caught.message : 'Check the line items.',
        tone: 'danger',
      })
    } finally {
      setCreating(false)
    }
  }

  const remind = async (invoice: InvoiceWithTotals) => {
    try {
      await adminApi.remindInvoice(invoice.id)
      toast({
        title: 'Reminder queued',
        description: `${invoice.ref} · due tomorrow 9am`,
        tone: 'success',
      })
      await load()
    } catch (caught) {
      toast({
        title: 'Reminder not created',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const columns: Column<InvoiceWithTotals>[] = [
    {
      key: 'ref',
      header: 'Invoice',
      render: (row) => (
        <Link to={`/admin/invoices/${row.id}`} className="group block">
          <span className="font-mono text-[10px] text-cold group-hover:text-fg">{row.ref}</span>
          <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
            {formatDate(row.issueDate)} · due {formatDate(row.dueDate)}
          </span>
        </Link>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => (
        <div>
          <p className="text-[12px] text-fg">{row.customerName}</p>
          <p className="text-[10px] text-fg-faint">
            {row.service || row.customerPhone || 'General works'}
          </p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => (
        <span className="t-num text-[12px] text-fg">{formatMoney(row.totals.total)}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (row) => (
        <div className="text-right">
          <p
            className={
              row.totals.balance > 0
                ? 't-num text-[12px] text-heat'
                : 't-num text-[12px] text-success'
            }
          >
            {formatMoney(row.totals.balance)}
          </p>
          {row.totals.paid > 0 ? (
            <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
              {formatMoney(row.totals.paid)} paid
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'state',
      header: 'Status',
      render: (row) => <InvoiceStateBadge state={row.totals.state} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <TableActions>
          {row.totals.balance > 0 &&
          row.totals.state !== 'draft' &&
          row.totals.state !== 'cancelled' ? (
            <TableActionButton
              label={`Remind ${row.ref}`}
              icon="mail"
              tone="heat"
              onClick={() => void remind(row)}
            />
          ) : null}
          <TableActionLink
            to={`/admin/invoices/${row.id}`}
            label={`Open invoice ${row.ref}`}
            icon="arrow-right"
            tone="cold"
          />
        </TableActions>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Revenue"
        title="Invoices and collections."
        description="Issue sales-tax invoices, record part payments as they arrive, print an A4 invoice and queue a payment reminder without leaving the ledger."
        actions={
          <>
            <Select
              aria-label="Filter invoices"
              value={filter}
              options={[
                { value: 'all', label: 'All states' },
                { value: 'draft', label: 'Draft' },
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'partial', label: 'Part paid' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'paid', label: 'Paid' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              onChange={(event) => setFilter(event.target.value)}
              className="min-w-[140px]"
            />
            <Button
              variant="secondary"
              icon="refresh"
              disabled={amcBusy}
              onClick={() => void billAmcContracts()}
            >
              {amcBusy ? 'Billing…' : 'Bill AMC'}
            </Button>
            <Button icon="plus" onClick={() => setCreateOpen(true)}>
              New invoice
            </Button>
            <a
              href="/api/v1/admin/csv/invoices"
              className="flex h-9 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Export CSV
            </a>
          </>
        }
      />

      {error ? <InlineError message={error} /> : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Collected" value={formatMoney(summary.collected)} accent="success" />
          <MetricCard label="Outstanding" value={formatMoney(summary.outstanding)} accent="heat" />
          <MetricCard
            label="Overdue"
            value={formatMoney(summary.overdueAmount)}
            accent="warn"
            note={`${summary.overdueCount} invoice${summary.overdueCount === 1 ? '' : 's'}`}
          />
          <MetricCard label="Invoiced this month" value={formatMoney(summary.invoicedThisMonth)} />
          <MetricCard
            label="Part paid"
            value={summary.partialCount}
            note={`${summary.paidCount} settled · ${summary.draftCount} draft`}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border border-line bg-panel/30 p-3">
        <SearchSuggest
          aria-label="Search invoices"
          placeholder="Search reference, customer, phone or job…"
          value={search}
          onChange={setSearch}
          suggestions={suggestions}
          onSelect={(suggestion) => {
            setSearch(suggestion.label)
            const invoice = invoices.find((entry) => entry.id === suggestion.id)
            if (invoice) setViewing(invoice)
          }}
          emptyMessage="No invoice matches that reference, customer or phone."
          className="max-w-md"
        />
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
          {meta
            ? `${meta.count} matching · ${meta.total} invoices`
            : `${invoices.length} invoices`}
        </span>
      </div>

      {loading ? (
        <AdminLoading rows={5} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon="coil"
          title="No invoices in this view."
          description="Raise the first invoice from a completed job. It can stay a draft until you are ready to issue it."
          action={<Button onClick={() => setCreateOpen(true)}>Create invoice</Button>}
        />
      ) : (
        <Table
          columns={columns}
          rows={invoices}
          caption="Invoices"
          onRowView={setViewing}
          viewLabel={(row) => row.ref}
        />
      )}

      {meta && meta.pages > 1 ? (
        <Pagination
          page={page}
          pageCount={meta.pages}
          onPageChange={setPage}
          className="justify-end"
        />
      ) : null}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New tax invoice"
        description="The reference is assigned on save. Part payments can be added from the invoice page."
        size="xl"
      >
        <InvoiceForm
          submitLabel="Create invoice"
          busy={creating}
          onSubmit={create}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
      <RecordDrawer
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.ref ?? 'Invoice'}
        subtitle={
          viewing ? `${viewing.customerName} · ${viewing.service || 'General works'}` : undefined
        }
        record={viewing as unknown as Record<string, unknown> | null}
        badge={viewing ? <InvoiceStateBadge state={viewing.totals.state} /> : undefined}
        actions={
          viewing ? (
            <Link
              to={`/admin/invoices/${viewing.id}`}
              className="flex h-9 items-center border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Open full invoice
            </Link>
          ) : undefined
        }
      />
    </div>
  )
}
