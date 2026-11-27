import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  useToast,
  type Column,
} from '@/components/ui'
import type { PayrollRecord } from '@hvac/shared'
import { adminApi, type PayrollAttentionItem, type PayrollOverview } from '@/admin/api'
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

function paidOf(record: PayrollRecord): number {
  return (
    record.payments?.reduce((sum, payment) => sum + payment.amount, 0) ??
    (record.status === 'paid' ? record.amount : 0)
  )
}

function balanceOf(record: PayrollRecord): number {
  return record.balance ?? Math.max(0, record.amount - paidOf(record))
}

export function AdminPayroll() {
  const { toast } = useToast()
  const [params] = useSearchParams()
  const [period, setPeriod] = useState(params.get('period') ?? currentPeriod())
  const [overview, setOverview] = useState<PayrollOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState<PayrollRecord | null>(null)
  const [adjusting, setAdjusting] = useState<PayrollRecord | null>(null)
  const preparedFor = useRef('')

  const load = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true)
      try {
        const data = await adminApi.payrollOverview(period)
        setOverview(data)
        setError('')
        return data
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not load payroll.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [period],
  )

  useEffect(() => {
    let active = true
    void (async () => {
      const data = await load(true)
      if (!active || !data) return
      const missing = data.attention.some((item) => item.kind === 'missing')
      if (data.windowOpen && missing && preparedFor.current !== period) {
        preparedFor.current = period
        try {
          const result = await adminApi.preparePayroll(period)
          if (result.data.created > 0) {
            toast({
              title: 'Payslips calculated automatically',
              description: `${result.data.created} payslip${result.data.created === 1 ? '' : 's'} prepared ${data.daysToPayday} day${data.daysToPayday === 1 ? '' : 's'} before payday.`,
              tone: 'success',
            })
          }
          await load()
        } catch {
          // The manual Calculate button reports the error.
        }
      }
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const memberById = useMemo(
    () => new Map((overview?.team ?? []).map((member) => [member.id, member])),
    [overview?.team],
  )

  const calculate = async () => {
    setBusy(true)
    try {
      const result = await adminApi.preparePayroll(period)
      toast({
        title: result.data.created ? 'Payslips calculated' : 'Payslips refreshed',
        description: `${result.data.created} created · ${result.data.updated} recalculated from structure, attendance, leave and advances.`,
        tone: 'success',
      })
      await load()
    } catch (caught) {
      toast({
        title: 'Payroll not calculated',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const remind = async (id: string) => {
    try {
      await adminApi.remindPayroll(id)
      toast({ title: 'Reminder sent to the admin inbox', tone: 'success' })
    } catch (caught) {
      toast({
        title: 'Reminder not created',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const remindAll = async () => {
    try {
      const result = await adminApi.remindPayrollPeriod(period)
      toast({
        title: result.data.count
          ? `${result.data.count} salary reminders sent`
          : 'Nothing needs a reminder',
        description: result.data.count
          ? 'The admin inbox lists every missing, due or part-paid salary.'
          : 'Every payslip in this period is settled.',
        tone: 'success',
      })
    } catch (caught) {
      toast({
        title: 'Reminders not sent',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const emailPayslip = async (record: PayrollRecord) => {
    try {
      const result = await adminApi.emailPayslip(record.id)
      if (result.delivery.status === 'sent') {
        toast({ title: 'Payslip emailed', description: record.number, tone: 'success' })
      } else {
        toast({
          title: result.delivery.status === 'skipped' ? 'Email not configured' : 'Email failed',
          description:
            result.delivery.error ??
            'Set RESEND_API_KEY or MAIL_WEBHOOK_URL to deliver payslips.',
          tone: 'warn',
        })
      }
      await load()
    } catch (caught) {
      toast({
        title: 'Payslip not emailed',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const columns: Column<PayrollRecord>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (row) => {
        const member = memberById.get(row.memberId)
        return (
          <div>
            <p className="text-[12px] text-fg">{member?.name ?? 'Removed member'}</p>
            <p className="text-[10px] text-fg-faint">
              {row.number ?? row.period}
              {member ? ` · ${ROLE_LABELS[member.role] ?? member.role}` : ''}
            </p>
          </div>
        )
      },
    },
    {
      key: 'gross',
      header: 'Gross',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-[11px] text-fg-dim">
          {formatMoneyExact(row.gross ?? row.baseAmount)}
        </span>
      ),
    },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-[11px] text-fg-dim">
          −{formatMoneyExact(row.deductions)}
        </span>
      ),
    },
    {
      key: 'net',
      header: 'Net',
      align: 'right',
      render: (row) => (
        <span className="t-num text-[12px] text-fg">{formatMoneyExact(row.amount)}</span>
      ),
    },
    {
      key: 'paid',
      header: 'Paid / balance',
      align: 'right',
      render: (row) => (
        <div className="text-right">
          <p className="font-mono text-[11px] text-success">{formatMoneyExact(paidOf(row))}</p>
          <p className="font-mono text-[10px] text-fg-faint">
            {formatMoneyExact(balanceOf(row))} due
          </p>
        </div>
      ),
    },
    {
      key: 'attendance',
      header: 'Attendance',
      render: (row) =>
        row.attendance ? (
          <span className="font-mono text-[9px] uppercase text-fg-faint">
            {row.attendance.presentDays}p · {row.attendance.paidLeaveDays}l ·{' '}
            {row.attendance.unpaidDays}u · {row.attendance.overtimeHours}h OT
          </span>
        ) : (
          <span className="text-[10px] text-fg-faint">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const paid = paidOf(row)
        const balance = balanceOf(row)
        return balance <= 0.004 ? (
          <Badge tone="success" dot>
            Paid {formatDate(row.paidAt)}
          </Badge>
        ) : paid > 0 ? (
          <Badge tone="warn" dot>
            Part paid
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            Pending
          </Badge>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <TableActions>
          {balanceOf(row) > 0.004 ? (
            <TableActionButton
              label={`Record payment for ${row.number ?? row.period}`}
              icon="check"
              tone="success"
              onClick={() => setPaying(row)}
            />
          ) : null}
          <a
            aria-label={`Download payslip ${row.number ?? row.period}`}
            href={`/api/v1/admin/payroll/${encodeURIComponent(row.id)}/payslip.pdf`}
            className="inline-flex h-8 items-center gap-1 border border-line px-2 font-mono text-[8px] uppercase text-fg-faint hover:border-cold/50 hover:text-cold"
          >
            PDF
          </a>
          <TableActionButton
            label={`Email payslip ${row.number ?? row.period}`}
            icon="mail"
            tone="cold"
            onClick={() => void emailPayslip(row)}
          />
          <TableActionButton
            label={`Remind admin about ${row.number ?? row.period}`}
            icon="refresh"
            tone="cold"
            onClick={() => void remind(row.id)}
          />
          {balanceOf(row) > 0.004 ? (
            <TableActionButton
              label={`Adjust ${row.number ?? row.period}`}
              icon="edit"
              tone="cold"
              onClick={() => setAdjusting(row)}
            />
          ) : null}
        </TableActions>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-h4 text-fg">Payroll & payslips</h2>
          <p className="mt-1 text-[13px] text-fg-dim">
            {overview
              ? `Payday ${formatDate(overview.payDate)} · ${
                  overview.daysToPayday >= 0
                    ? `${overview.daysToPayday} day${overview.daysToPayday === 1 ? '' : 's'} to go`
                    : `${Math.abs(overview.daysToPayday)} day${Math.abs(overview.daysToPayday) === 1 ? '' : 's'} past`
                } · auto-calculates ${overview.settings.autoCalculateDays} days before payday`
              : 'Calculated from salary structure, attendance, leave and advances.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="Payroll month"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value || currentPeriod())}
            className="w-[150px]"
          />
          <Button icon="refresh" variant="secondary" onClick={() => void calculate()} loading={busy}>
            Calculate payslips
          </Button>
        </div>
      </div>

      {error ? <InlineError message={error} /> : null}

      {overview ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Net payroll"
            value={formatMoneyExact(overview.summary.total)}
            note={`${overview.summary.count} payslips`}
            accent="cold"
          />
          <MetricCard
            label="Paid"
            value={formatMoneyExact(overview.summary.paidAmount)}
            note={`${overview.summary.paid} settled`}
            accent="success"
          />
          <MetricCard
            label="Outstanding"
            value={formatMoneyExact(
              Math.max(0, overview.summary.total - overview.summary.paidAmount),
            )}
            note={`${overview.summary.pending} open`}
            accent="heat"
          />
          <MetricCard
            label="Payday"
            value={formatDate(overview.payDate)}
            note={overview.windowOpen ? 'Calculation window open' : 'Outside calculation window'}
          />
        </div>
      ) : null}

      {overview && overview.attention.length ? (
        <div className="flex flex-col gap-2 border border-warn/30 bg-warn/[0.04] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-warn">
              Salary reminders · {overview.attention.length}
            </p>
            <Button
              variant="secondary"
              icon="mail"
              onClick={() => void remindAll()}
            >
              Remind all
            </Button>
          </div>
          <ul className="grid gap-1.5">
            {overview.attention.map((item: PayrollAttentionItem) => (
              <li key={item.id} className="text-[12px] text-fg-dim">
                <span className="text-fg">{item.title}</span> — {item.message}{' '}
                {item.payrollId ? (
                  <button
                    type="button"
                    className="font-mono text-[9px] uppercase text-cold hover:underline"
                    onClick={() => void remind(item.payrollId as string)}
                  >
                    Remind
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <AdminLoading rows={5} />
      ) : !overview || overview.records.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No payslips for this month."
          description="Calculate payslips to pull each active member's structure, attendance, unpaid leave and advance recovery into a payslip."
          action={<Button onClick={() => void calculate()}>Calculate payslips</Button>}
        />
      ) : (
        <Table
          columns={columns}
          rows={[...overview.records].sort((a, b) => {
            const left = memberById.get(a.memberId)?.name ?? ''
            const right = memberById.get(b.memberId)?.name ?? ''
            return left.localeCompare(right)
          })}
          caption="Payslips for the period"
        />
      )}

      <Modal
        open={Boolean(paying)}
        onClose={() => setPaying(null)}
        title={paying ? `Record salary payment · ${paying.number ?? paying.period}` : 'Salary payment'}
        description="Part payments are allowed. The payslip balance updates immediately and the admin inbox gets a reminder while anything is still due."
        size="md"
      >
        {paying ? (
          <PaymentForm
            record={paying}
            memberName={memberById.get(paying.memberId)?.name ?? 'Team member'}
            onCancel={() => setPaying(null)}
            onSaved={async (message) => {
              setPaying(null)
              toast({ title: message, tone: 'success' })
              await load()
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(adjusting)}
        onClose={() => setAdjusting(null)}
        title={adjusting ? `Adjust ${adjusting.number ?? adjusting.period}` : 'Adjust payslip'}
        description="Bonus and other deductions are kept on the payslip and reused when it is recalculated."
        size="md"
      >
        {adjusting ? (
          <AdjustForm
            record={adjusting}
            onCancel={() => setAdjusting(null)}
            onSaved={async () => {
              setAdjusting(null)
              toast({ title: 'Payslip adjusted and recalculated', tone: 'success' })
              await load()
            }}
          />
        ) : null}
      </Modal>
    </div>
  )
}

function PaymentForm({
  record,
  memberName,
  onCancel,
  onSaved,
}: {
  record: PayrollRecord
  memberName: string
  onCancel: () => void
  onSaved: (message: string) => Promise<void>
}) {
  const balance = balanceOf(record)
  const [amount, setAmount] = useState(String(balance))
  const [method, setMethod] = useState<'cash' | 'bank-transfer' | 'cheque' | 'card-on-site'>(
    record.method ?? 'bank-transfer',
  )
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (value > balance + 0.004) {
      setError(`The outstanding balance is ${formatMoneyExact(balance)}.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const updated = await adminApi.payPayroll(record.id, {
        amount: value,
        method,
        reference: reference.trim(),
        note: note.trim(),
      })
      const remaining = balanceOf(updated)
      await onSaved(
        remaining <= 0.004
          ? `Salary settled · ${memberName}`
          : `Part payment recorded · ${formatMoneyExact(remaining)} still due`,
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Payment not recorded.')
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
      <div className="border border-line bg-panel-2/30 px-3 py-2 text-[12px] text-fg-dim">
        {memberName} · net {formatMoneyExact(record.amount)} · balance{' '}
        <span className="text-fg">{formatMoneyExact(balance)}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Select
          label="Method"
          value={method}
          options={[
            { value: 'bank-transfer', label: 'Bank transfer' },
            { value: 'cash', label: 'Cash' },
            { value: 'cheque', label: 'Cheque' },
            { value: 'card-on-site', label: 'Card on site' },
          ]}
          onChange={(event) => setMethod(event.target.value as typeof method)}
        />
        <Input
          label="Reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="UTR / voucher"
        />
        <Input
          label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Part payment"
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" icon="check" loading={busy}>
          Record payment
        </Button>
      </div>
    </form>
  )
}

function AdjustForm({
  record,
  onCancel,
  onSaved,
}: {
  record: PayrollRecord
  onCancel: () => void
  onSaved: () => Promise<void>
}) {
  const [bonus, setBonus] = useState(String(record.manualBonus ?? record.bonus ?? 0))
  const [deductions, setDeductions] = useState(
    String(record.manualDeductions ?? (record.earnings ? 0 : record.deductions) ?? 0),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setBusy(true)
    try {
      await adminApi.adjustPayroll(record.id, {
        bonus: Number(bonus) || 0,
        deductions: Number(deductions) || 0,
      })
      await onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Adjustments not saved.')
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
        <Input
          label="Bonus"
          type="number"
          min="0"
          step="0.01"
          value={bonus}
          onChange={(event) => setBonus(event.target.value)}
        />
        <Input
          label="Other deductions"
          type="number"
          min="0"
          step="0.01"
          value={deductions}
          onChange={(event) => setDeductions(event.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" icon="check" loading={busy}>
          Save & recalculate
        </Button>
      </div>
    </form>
  )
}
