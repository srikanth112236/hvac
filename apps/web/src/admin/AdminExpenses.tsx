import { useMemo, useState, type FormEvent } from 'react'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { Icon } from '@/components/icons'
import {
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
import type { ExpenseInput, ExpenseRecord } from '@hvac/shared'
import { adminApi, type ExpenseSummary } from '@/admin/api'
import { EXPENSE_CATEGORY_LABELS, METHOD_LABELS } from '@/admin/invoice-ui'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  MetricCard,
  formatDate,
  formatMoney,
} from '@/admin/ui'

const categories = Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AdminExpenses() {
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    try {
      const payload = await adminApi.expenses()
      setExpenses(payload.data)
      setSummary(payload.summary)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load expenses.')
    } finally {
      setLoading(false)
    }
  }

  useLiveRefresh(load)

  const filtered = useMemo(
    () => (filter === 'all' ? expenses : expenses.filter((expense) => expense.category === filter)),
    [expenses, filter],
  )

  const save = async (input: ExpenseInput) => {
    setBusy(true)
    try {
      if (editing) {
        await adminApi.patchExpense(editing.id, input)
        toast({ title: 'Expense updated', tone: 'success' })
      } else {
        await adminApi.createExpense(input)
        toast({ title: 'Expense recorded', description: formatMoney(input.amount), tone: 'success' })
      }
      setOpen(false)
      setEditing(null)
      await load()
    } catch (caught) {
      toast({
        title: 'Expense not saved',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (expense: ExpenseRecord) => {
    if (!window.confirm(`Delete ${expense.description}?`)) return
    try {
      await adminApi.deleteExpense(expense.id)
      toast({ title: 'Expense deleted', tone: 'success' })
      await load()
    } catch (caught) {
      toast({
        title: 'Expense not deleted',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const topCategory = summary
    ? Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])[0]
    : null

  const columns: Column<ExpenseRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => <span className="font-mono text-[10px] text-fg-dim">{formatDate(row.date)}</span>,
    },
    {
      key: 'description',
      header: 'Expense',
      render: (row) => (
        <div>
          <p className="text-[12px] text-fg">{row.description}</p>
          <p className="text-[10px] text-fg-faint">{row.vendor || 'No vendor'}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-fg-dim">
          {EXPENSE_CATEGORY_LABELS[row.category] ?? row.category}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Paid by',
      render: (row) => (
        <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-fg-faint">
          {METHOD_LABELS[row.method] ?? row.method}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => <span className="t-num text-[12px] text-heat">{formatMoney(row.amount)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => {
              setEditing(row)
              setOpen(true)
            }}
            className="flex h-7 items-center border border-line px-2 font-mono text-[8px] uppercase tracking-[0.06em] text-fg-dim hover:border-cold/40 hover:text-cold"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void remove(row)}
            aria-label={`Delete ${row.description}`}
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
        eyebrow="Costs"
        title="Expenses and job costs."
        description="Materials, equipment, transport, subcontractors and overheads in one ledger, with tax and payment method recorded for reconciliation."
        actions={
          <>
            <Select
              aria-label="Filter expenses"
              value={filter}
              options={[{ value: 'all', label: 'All categories' }, ...categories]}
              onChange={(event) => setFilter(event.target.value)}
              className="min-w-[150px]"
            />
            <Button
              icon="plus"
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              Record expense
            </Button>
          </>
        }
      />

      {error ? <InlineError message={error} /> : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Expenses this month" value={formatMoney(summary.thisMonth)} accent="heat" />
          <MetricCard label="Lifetime expenses" value={formatMoney(summary.total)} />
          <MetricCard
            label="Largest category"
            value={topCategory ? EXPENSE_CATEGORY_LABELS[topCategory[0]] ?? topCategory[0] : '—'}
            note={topCategory ? formatMoney(topCategory[1]) : 'No expenses yet'}
          />
          <MetricCard label="Entries" value={summary.count} />
        </div>
      ) : null}

      {summary && Object.keys(summary.byCategory).length ? (
        <div className="border border-line bg-panel/30 p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">Category mix</p>
          <div className="mt-3 flex flex-col gap-2">
            {Object.entries(summary.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => (
                <div key={category} className="grid grid-cols-[110px_1fr_90px] items-center gap-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-fg-dim">
                    {EXPENSE_CATEGORY_LABELS[category] ?? category}
                  </span>
                  <div className="h-1.5 bg-panel-2">
                    <div className="h-1.5 bg-heat/70" style={{ width: `${Math.max(2, (amount / summary.total) * 100)}%` }} />
                  </div>
                  <span className="t-num text-right text-[10px] text-fg-dim">{formatMoney(amount)}</span>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <AdminLoading rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="refrigerant"
          title="No expenses in this view."
          description="Record a purchase, subcontractor bill or fuel cost to keep job profitability honest."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              Record an expense
            </Button>
          }
        />
      ) : (
        <Table columns={columns} rows={filtered} caption="Expenses" />
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Edit expense' : 'Record expense'}
        description="Amounts are stored in dollars. Sales tax is tracked separately for filing and reconciliation."
        size="lg"
      >
        <ExpenseForm
          initial={editing}
          busy={busy}
          onSubmit={save}
          onCancel={() => {
            setOpen(false)
            setEditing(null)
          }}
        />
      </Modal>
    </div>
  )
}

function ExpenseForm({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: ExpenseRecord | null
  busy: boolean
  onSubmit: (input: ExpenseInput) => void
  onCancel: () => void
}) {
  const [date, setDate] = useState(initial ? initial.date.slice(0, 10) : today())
  const [category, setCategory] = useState<ExpenseInput['category']>(initial?.category ?? 'materials')
  const [vendor, setVendor] = useState(initial?.vendor ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(String(initial?.amount ?? ''))
  const [taxAmount, setTaxAmount] = useState(String(initial?.taxAmount ?? 0))
  const [method, setMethod] = useState<ExpenseInput['method']>(initial?.method ?? 'bank-transfer')
  const [reference, setReference] = useState(initial?.reference ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (description.trim().length < 2 || !(Number(amount) > 0)) {
      setError('Enter a description and an amount above zero.')
      return
    }
    setError('')
    onSubmit({
      date,
      category,
      vendor: vendor.trim(),
      description: description.trim(),
      amount: Number(amount),
      taxAmount: Number(taxAmount) || 0,
      method,
      reference: reference.trim(),
      notes: notes.trim(),
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="border border-danger/40 bg-danger/[0.06] px-3 py-2 text-[12px] text-fg-dim">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
        <Select label="Category" value={category} options={categories} onChange={(event) => setCategory(event.target.value as ExpenseInput['category'])} />
        <Select
          label="Paid by"
          value={method}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'cheque', label: 'Cheque' },
            { value: 'bank-transfer', label: 'Bank transfer' },
            { value: 'card-on-site', label: 'Card on site' },
          ]}
          onChange={(event) => setMethod(event.target.value as ExpenseInput['method'])}
        />
      </div>
      <Input label="Description" required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Copper pipe 1/2 inch · 3 rolls" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Vendor" value={vendor} onChange={(event) => setVendor(event.target.value)} placeholder="Supplier or subcontractor" />
        <Input label="Amount" type="number" min="0" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} />
        <Input label="Tax included" type="number" min="0" step="0.01" value={taxAmount} onChange={(event) => setTaxAmount(event.target.value)} hint="Sales tax portion, if any" />
      </div>
      <Input label="Reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Bill no. / UTR" />
      <Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Job, site or approval note" />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" icon="check" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save expense' : 'Record expense'}</Button>
      </div>
    </form>
  )
}