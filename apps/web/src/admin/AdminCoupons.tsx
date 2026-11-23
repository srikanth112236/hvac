import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import {
  couponStatusLabel,
  couponValueLabel,
  type CouponKind,
  type CouponStatus,
  type CouponSummary,
  type CouponWithStats,
} from '@hvac/shared'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Textarea,
  Toggle,
  useToast,
} from '@/components/ui'
import { Icon } from '@/components/icons'
import { adminApi } from '@/admin/api'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  MetricCard,
  formatDate,
  formatDateTime,
  formatMoney,
} from '@/admin/ui'

const STATUS_TONE: Record<CouponStatus, 'neutral' | 'cold' | 'warn' | 'success' | 'danger'> = {
  active: 'success',
  scheduled: 'cold',
  paused: 'neutral',
  expired: 'neutral',
  exhausted: 'warn',
}

interface CouponForm {
  code: string
  description: string
  kind: CouponKind
  value: string
  minSubtotal: string
  maxRedemptions: string
  perCustomerLimit: string
  startsAt: string
  expiresAt: string
  appliesTo: string
  active: boolean
}

const BLANK: CouponForm = {
  code: '',
  description: '',
  kind: 'percent',
  value: '10',
  minSubtotal: '0',
  maxRedemptions: '0',
  perCustomerLimit: '1',
  startsAt: '',
  expiresAt: '',
  appliesTo: 'all',
  active: true,
}

function dateInput(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function endOfDayIso(value: string): string | null {
  if (!value) return null
  const date = new Date(`${value}T23:59:59`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function startOfDayIso(value: string): string | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function AdminCoupons() {
  const { toast } = useToast()
  const [coupons, setCoupons] = useState<CouponWithStats[]>([])
  const [summary, setSummary] = useState<CouponSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CouponWithStats | null>(null)
  const [form, setForm] = useState<CouponForm>(BLANK)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [services, setServices] = useState<{ id: string; name: string }[]>([])

  const load = useCallback(async () => {
    try {
      const feed = await adminApi.coupons()
      setCoupons(feed.data)
      setSummary(feed.summary)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load coupons.')
    } finally {
      setLoading(false)
    }
  }, [])

  useLiveRefresh(load)

  useEffect(() => {
    adminApi
      .content()
      .then((content) => setServices(content.services.map((service) => ({ id: service.id, name: service.name }))))
      .catch(() => setServices([]))
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return coupons
    return coupons.filter((coupon) =>
      `${coupon.code} ${coupon.description}`.toLowerCase().includes(term),
    )
  }, [coupons, query])

  const expiringSoon = useMemo(
    () =>
      coupons.filter((coupon) => {
        if (coupon.status !== 'active' || !coupon.expiresAt) return false
        const days = (Date.parse(coupon.expiresAt) - Date.now()) / 86_400_000
        return days >= 0 && days <= 30
      }).length,
    [coupons],
  )

  const openCreate = () => {
    setEditing(null)
    setForm(BLANK)
    setModalOpen(true)
  }

  const openEdit = (coupon: CouponWithStats) => {
    setEditing(coupon)
    setForm({
      code: coupon.code,
      description: coupon.description,
      kind: coupon.kind,
      value: String(coupon.value),
      minSubtotal: String(coupon.minSubtotal),
      maxRedemptions: String(coupon.maxRedemptions),
      perCustomerLimit: String(coupon.perCustomerLimit),
      startsAt: dateInput(coupon.startsAt),
      expiresAt: dateInput(coupon.expiresAt),
      appliesTo: coupon.appliesTo,
      active: coupon.active,
    })
    setModalOpen(true)
  }

  const save = async () => {
    const code = form.code.trim().toUpperCase()
    if (code.length < 3) {
      toast({ title: 'Code too short', description: 'Use at least three characters.', tone: 'danger' })
      return
    }
    const value = toNumber(form.value)
    if (value <= 0) {
      toast({ title: 'Set a value', description: 'A coupon needs a percentage or an amount.', tone: 'danger' })
      return
    }
    if (form.kind === 'percent' && value > 100) {
      toast({ title: 'Too much', description: 'A percentage cannot exceed 100%.', tone: 'danger' })
      return
    }
    if (form.startsAt && form.expiresAt && form.expiresAt < form.startsAt) {
      toast({ title: 'Check the dates', description: 'The expiry is before the start date.', tone: 'danger' })
      return
    }

    const payload = {
      code,
      description: form.description.trim(),
      kind: form.kind,
      value,
      minSubtotal: Math.max(0, toNumber(form.minSubtotal)),
      maxRedemptions: Math.max(0, Math.round(toNumber(form.maxRedemptions))),
      perCustomerLimit: Math.max(1, Math.round(toNumber(form.perCustomerLimit, 1))),
      startsAt: startOfDayIso(form.startsAt),
      expiresAt: endOfDayIso(form.expiresAt),
      appliesTo: form.appliesTo,
      active: form.active,
    }

    setSaving(true)
    try {
      if (editing) {
        const updated = await adminApi.patchCoupon(editing.id, payload)
        setCoupons((current) =>
          current.map((entry) => (entry.id === updated.data.id ? updated.data : entry)),
        )
        setSummary(updated.summary)
        toast({ title: 'Coupon updated', description: updated.data.code, tone: 'success' })
      } else {
        const created = await adminApi.createCoupon(payload)
        setCoupons((current) => [created.data, ...current])
        setSummary(created.summary)
        toast({ title: 'Coupon created', description: created.data.code, tone: 'success' })
      }
      setModalOpen(false)
    } catch (caught) {
      toast({ title: 'Not saved', description: caught instanceof Error ? caught.message : 'Try again.', tone: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (coupon: CouponWithStats) => {
    setBusyId(coupon.id)
    try {
      const updated = await adminApi.patchCoupon(coupon.id, { active: !coupon.active })
      setCoupons((current) =>
        current.map((entry) => (entry.id === updated.data.id ? updated.data : entry)),
      )
      setSummary(updated.summary)
      toast({
        title: updated.data.active ? 'Coupon live' : 'Coupon paused',
        description: updated.data.code,
        tone: 'success',
      })
    } catch (caught) {
      toast({ title: 'Not updated', description: caught instanceof Error ? caught.message : 'Try again.', tone: 'danger' })
    } finally {
      setBusyId('')
    }
  }

  const remove = async (coupon: CouponWithStats) => {
    if (!window.confirm(`Delete ${coupon.code}? Redemption history is removed with it.`)) return
    setBusyId(coupon.id)
    try {
      const result = await adminApi.deleteCoupon(coupon.id)
      setCoupons((current) => current.filter((entry) => entry.id !== coupon.id))
      setSummary(result.summary)
      toast({ title: 'Coupon deleted', description: coupon.code, tone: 'success' })
    } catch (caught) {
      toast({ title: 'Not deleted', description: caught instanceof Error ? caught.message : 'Try again.', tone: 'danger' })
    } finally {
      setBusyId('')
    }
  }

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast({ title: 'Code copied', description: code, tone: 'success' })
    } catch {
      toast({ title: 'Copy failed', description: 'Select the code and copy it manually.', tone: 'danger' })
    }
  }

  if (loading) return <AdminLoading rows={5} />

  return (
    <>
      <AdminPageHeader
        eyebrow="Marketing · CV-OFFERS"
        title="Coupons & discounts"
        description="Percentage or fixed-amount codes, with a spend threshold, redemption caps, per-customer limits and a live window. Pause a code without deleting its history."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon="refresh" onClick={() => void load()}>
              Refresh
            </Button>
            <Button size="sm" icon="plus" onClick={openCreate}>
              New coupon
            </Button>
          </div>
        }
      />

      {error ? <InlineError message={error} /> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Live codes" value={summary?.active ?? 0} note="Redeemable right now" accent="success" />
        <MetricCard label="Scheduled" value={summary?.scheduled ?? 0} note="Start date is in the future" accent="cold" />
        <MetricCard
          label="Redemptions"
          value={summary?.redemptions ?? 0}
          note="Recorded against invoices"
        />
        <MetricCard
          label="Customer savings"
          value={formatMoney(summary?.savedTotal ?? 0)}
          note={expiringSoon > 0 ? `${expiringSoon} expire within 30 days` : 'Total discount given'}
          accent="heat"
        />
      </div>

      <section className="mt-6 border border-line bg-panel/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
            Discount ledger
          </h2>
          <Input
            aria-label="Search coupons"
            placeholder="Search code or description"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-[280px]"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={coupons.length === 0 ? 'No coupons yet' : 'No match'}
              description="Create a code for a seasonal tune-up, a first visit or a maintenance renewal."
            />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((coupon) => {
              const working = busyId === coupon.id
              const lastUse = coupon.redemptions[coupon.redemptions.length - 1]
              return (
                <article
                  key={coupon.id}
                  className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void copy(coupon.code)}
                        title="Copy code"
                        className="group inline-flex items-center gap-2 border border-line bg-panel-2 px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] text-fg transition-colors hover:border-cold/60 hover:text-cold"
                      >
                        {coupon.code}
                        <Icon name="external" size={11} className="text-fg-faint group-hover:text-cold" />
                      </button>
                      <Badge tone={STATUS_TONE[coupon.status]} dot>
                        {couponStatusLabel[coupon.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-fg-dim">
                      {coupon.description || 'No description'}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                      {coupon.appliesTo === 'all'
                        ? 'All services'
                        : services.find((service) => service.id === coupon.appliesTo)?.name ?? coupon.appliesTo}
                      {coupon.minSubtotal > 0 ? ` · min ${formatMoney(coupon.minSubtotal)}` : ''}
                      {lastUse ? ` · last used ${formatDate(lastUse.at)}` : ''}
                    </p>
                  </div>

                  <div>
                    <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Offer</span>
                    <span className="text-sm text-fg">{couponValueLabel(coupon)}</span>
                  </div>

                  <div>
                    <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Used</span>
                    <span className="text-sm text-fg">
                      {coupon.usageCount}
                      <span className="text-fg-faint">
                        {coupon.maxRedemptions > 0 ? ` / ${coupon.maxRedemptions}` : ' / ∞'}
                      </span>
                    </span>
                    {coupon.remaining !== null ? (
                      <span className="block font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                        {coupon.remaining} left
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">Window</span>
                    <span className="text-[11px] leading-snug text-fg-dim">
                      {coupon.startsAt ? formatDate(coupon.startsAt) : 'Now'}
                      {' → '}
                      {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'No end'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(coupon)}>
                      Edit
                    </Button>
                    <Button
                      variant="quiet"
                      size="sm"
                      loading={working}
                      onClick={() => void toggleActive(coupon)}
                    >
                      {coupon.active ? 'Pause' : 'Activate'}
                    </Button>
                    <button
                      type="button"
                      aria-label={`Delete ${coupon.code}`}
                      disabled={working}
                      onClick={() => void remove(coupon)}
                      className="flex h-8 w-8 items-center justify-center border border-line text-fg-faint transition-colors duration-2 hover:border-danger/50 hover:text-danger disabled:opacity-40"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="border border-line bg-panel/20 p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
            Recent redemptions
          </h2>
          {coupons.every((coupon) => coupon.redemptions.length === 0) ? (
            <p className="mt-3 text-[12px] leading-relaxed text-fg-faint">
              No redemptions recorded yet. A code registers here the first time it is applied to an
              invoice; the ledger keeps the customer, invoice reference and discount given.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {coupons
                .flatMap((coupon) =>
                  coupon.redemptions.map((redemption) => ({ coupon, redemption })),
                )
                .sort((a, b) => Date.parse(b.redemption.at) - Date.parse(a.redemption.at))
                .slice(0, 8)
                .map(({ coupon, redemption }) => (
                  <li key={redemption.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-fg">
                        <span className="font-mono text-[10px] text-cold">{coupon.code}</span>{' '}
                        {redemption.email}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                        {redemption.invoiceRef || 'No invoice ref'} · {formatDateTime(redemption.at)}
                      </p>
                    </div>
                    <span className="text-[12px] text-heat">−{formatMoney(redemption.amount)}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="border border-line bg-panel/20 p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
            How the rules apply
          </h2>
          <ul className="mt-3 grid gap-2.5 text-[12px] leading-relaxed text-fg-dim">
            {[
              'Percentage codes cap at 100% of the subtotal; fixed codes never exceed the subtotal.',
              'A spend threshold is checked against the invoice subtotal before the discount is applied.',
              'A per-customer limit stops one account from reusing the same code.',
              'Redemption caps close the code automatically once the limit is reached.',
              'Pausing keeps the history and the code intact — reactivate when the offer returns.',
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 bg-cold" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.code}` : 'New coupon'}
        description="The code is what the customer quotes. Everything else controls when and how often it can be used."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              {editing ? 'Save changes' : 'Create coupon'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Code"
            required
            value={form.code}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                code: event.target.value.toUpperCase().replace(/\s+/g, ''),
              }))
            }
            placeholder="WINTER15"
            hint="Letters, numbers, hyphen and underscore."
          />
          <Select
            label="Discount type"
            value={form.kind}
            onChange={(event) =>
              setForm((current) => ({ ...current, kind: event.target.value as CouponKind }))
            }
            options={[
              { value: 'percent', label: 'Percentage off' },
              { value: 'fixed', label: 'Fixed amount off' },
            ]}
          />
          <Input
            label={form.kind === 'percent' ? 'Percentage' : 'Amount'}
            required
            type="number"
            min={0}
            max={form.kind === 'percent' ? 100 : 100000}
            step="0.01"
            value={form.value}
            onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            hint={form.kind === 'percent' ? '1 – 100' : 'Dollars off the subtotal'}
          />
          <Input
            label="Minimum subtotal"
            type="number"
            min={0}
            step="1"
            value={form.minSubtotal}
            onChange={(event) => setForm((current) => ({ ...current, minSubtotal: event.target.value }))}
            hint="0 means no threshold."
          />
          <Input
            label="Total redemptions allowed"
            type="number"
            min={0}
            step="1"
            value={form.maxRedemptions}
            onChange={(event) =>
              setForm((current) => ({ ...current, maxRedemptions: event.target.value }))
            }
            hint="0 means unlimited."
          />
          <Input
            label="Per-customer limit"
            type="number"
            min={1}
            step="1"
            value={form.perCustomerLimit}
            onChange={(event) =>
              setForm((current) => ({ ...current, perCustomerLimit: event.target.value }))
            }
          />
          <Input
            label="Starts"
            type="date"
            value={form.startsAt}
            onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
            hint="Blank starts immediately."
          />
          <Input
            label="Expires"
            type="date"
            value={form.expiresAt}
            onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
            hint="Runs to the end of this day."
          />
          <div className="sm:col-span-2">
            <Select
              label="Applies to"
              value={form.appliesTo}
              onChange={(event) => setForm((current) => ({ ...current, appliesTo: event.target.value }))}
              options={[
                { value: 'all', label: 'All services' },
                ...services.map((service) => ({ value: service.id, label: service.name })),
              ]}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Description"
              rows={2}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="15% off a winter tune-up, booked before the first freeze."
            />
          </div>
          <div className="sm:col-span-2">
            <Toggle
              checked={form.active}
              onChange={(checked) => setForm((current) => ({ ...current, active: checked }))}
              label="Redeemable"
              description="Paused codes keep their history but cannot be applied."
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
