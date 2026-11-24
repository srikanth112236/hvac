import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import {
  couponValueLabel,
  newsletterAudienceLabel,
  newsletterEmailDocument,
  newsletterStatusLabel,
  type CouponWithStats,
  type NewsletterAudience,
  type NewsletterAudienceFeed,
  type NewsletterMonthlyMode,
  type NewsletterRecord,
  type NewsletterRecurrence,
  type NewsletterRecurrenceKind,
  type NewsletterStatus,
  type NewsletterSummary,
} from '@hvac/shared'
import {
  Badge,
  Button,
  Checkbox,
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
  Panel,
  formatDate,
  formatDateTime,
  fromLocalInput,
  toLocalInput,
} from '@/admin/ui'
import { RichTextEditor } from '@/admin/RichTextEditor'

type RecurrenceChoice = 'none' | NewsletterRecurrenceKind

interface RecurrenceDraft {
  kind: RecurrenceChoice
  interval: string
  weekdays: number[]
  monthlyMode: NewsletterMonthlyMode
  dayOfMonth: string
  weekday: string
  weekOfMonth: string
  endAt: string
}

interface Draft {
  subject: string
  preheader: string
  fromName: string
  replyTo: string
  html: string
  audience: NewsletterAudience
  recipients: string[]
  perMinute: number
  perHour: number
  perDay: number
  overrideSuppression: boolean
  recurrence: RecurrenceDraft
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEK_OF_MONTH = [
  { value: '1', label: 'First' },
  { value: '2', label: 'Second' },
  { value: '3', label: 'Third' },
  { value: '4', label: 'Fourth' },
  { value: '-1', label: 'Last' },
]

const STATUS_TONE: Record<NewsletterStatus, 'neutral' | 'cold' | 'warn' | 'heat' | 'success'> = {
  draft: 'neutral',
  scheduled: 'cold',
  sending: 'warn',
  paused: 'heat',
  sent: 'success',
}

const STATUS_OPTIONS: { value: 'all' | NewsletterStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Drafts' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sending', label: 'Sending' },
  { value: 'paused', label: 'Paused' },
  { value: 'sent', label: 'Sent' },
]

function blankRecurrence(): RecurrenceDraft {
  return {
    kind: 'none',
    interval: '1',
    weekdays: [1],
    monthlyMode: 'day-of-month',
    dayOfMonth: '1',
    weekday: '1',
    weekOfMonth: '1',
    endAt: '',
  }
}

function blankDraft(): Draft {
  return {
    subject: '',
    preheader: '',
    fromName: 'Coolvane HVAC',
    replyTo: 'works@coolvane.example',
    html: '',
    audience: 'all',
    recipients: [],
    perMinute: 60,
    perHour: 1800,
    perDay: 20_000,
    overrideSuppression: false,
    recurrence: blankRecurrence(),
  }
}

function bodyIsEmpty(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length === 0 && !html.includes('<img')
  )
}

function scheduleLocked(campaign: NewsletterRecord): boolean {
  if (campaign.status !== 'scheduled' || !campaign.scheduledAt) return false
  const at = Date.parse(campaign.scheduledAt)
  return Number.isFinite(at) && at - Date.now() <= 5 * 60_000
}

function lockLabel(campaign: NewsletterRecord): string | null {
  if (!scheduleLocked(campaign) || !campaign.scheduledAt) return null
  return `Locked ${Math.max(0, Math.ceil((Date.parse(campaign.scheduledAt) - Date.now()) / 60_000))}m before send`
}

function recurrenceFromRecord(
  recurrence: NewsletterRecurrence | null | undefined,
): RecurrenceDraft {
  if (!recurrence) return blankRecurrence()
  return {
    kind: recurrence.kind,
    interval: String(recurrence.interval ?? 1),
    weekdays: recurrence.weekdays.length ? recurrence.weekdays : [1],
    monthlyMode: recurrence.monthlyMode ?? 'day-of-month',
    dayOfMonth: String(recurrence.dayOfMonth ?? 1),
    weekday: String(recurrence.weekday ?? 1),
    weekOfMonth: String(recurrence.weekOfMonth ?? 1),
    endAt: recurrence.endAt ? toLocalInput(recurrence.endAt).slice(0, 10) : '',
  }
}

function recurrenceFromDraft(draft: RecurrenceDraft): NewsletterRecurrence | null {
  if (draft.kind === 'none') return null
  return {
    kind: draft.kind,
    interval: Math.max(1, Math.min(12, Number(draft.interval) || 1)),
    weekdays: draft.weekdays.length ? draft.weekdays : [1],
    monthlyMode: draft.monthlyMode,
    dayOfMonth: Math.max(1, Math.min(31, Number(draft.dayOfMonth) || 1)),
    weekday: Math.max(0, Math.min(6, Number(draft.weekday) || 0)),
    weekOfMonth: Number(draft.weekOfMonth) || 1,
    endAt: draft.endAt ? new Date(`${draft.endAt}T23:59:59`).toISOString() : null,
  }
}

function recurrenceSummary(recurrence: NewsletterRecurrence | null | undefined): string | null {
  if (!recurrence) return null
  const interval = Math.max(1, recurrence.interval || 1)
  let summary = ''
  if (recurrence.kind === 'daily') {
    summary = interval === 1 ? 'Every day' : `Every ${interval} days`
  } else if (recurrence.kind === 'weekly') {
    const days = (recurrence.weekdays ?? [])
      .map((day) => WEEKDAYS[day] ?? '')
      .filter(Boolean)
      .join(', ')
    summary =
      interval === 1
        ? `Every week on ${days || 'a weekday'}`
        : `Every ${interval} weeks on ${days || 'a weekday'}`
  } else if (recurrence.monthlyMode === 'nth-weekday') {
    const week =
      WEEK_OF_MONTH.find((entry) => entry.value === String(recurrence.weekOfMonth))?.label ??
      'First'
    summary = `Every ${interval === 1 ? 'month' : `${interval} months`} on the ${week.toLowerCase()} ${
      WEEKDAYS[recurrence.weekday ?? 1]
    }`
  } else {
    summary = `Every ${interval === 1 ? 'month' : `${interval} months`} on day ${
      recurrence.dayOfMonth ?? 1
    }`
  }
  if (recurrence.endAt) summary += ` · until ${formatDate(recurrence.endAt)}`
  return summary
}

function draftSummary(draft: RecurrenceDraft): string | null {
  return recurrenceSummary(recurrenceFromDraft(draft))
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function couponBlock(coupon: CouponWithStats): string {
  const expires = coupon.expiresAt ? `Ends ${formatDate(coupon.expiresAt)}` : 'No expiry'
  return `<div style="margin:24px 0;border:1px solid #d8d1c4;background:#f7f3ea;padding:20px;text-align:center">
<p style="margin:0 0 6px;font:600 10px/1.2 Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6b7480">Client promotion</p>
<p style="margin:0 0 8px;font:700 26px/1.1 Arial,sans-serif;letter-spacing:.12em;color:#12161a">${escapeHtml(coupon.code)}</p>
<p style="margin:0 0 6px;font:600 15px/1.4 Arial,sans-serif;color:#12161a">${escapeHtml(couponValueLabel(coupon))}</p>
<p style="margin:0 0 8px;font:400 13px/1.5 Arial,sans-serif;color:#4d5862">${escapeHtml(coupon.description || 'Use this code on your next service.')}</p>
<p style="margin:0;font:400 11px/1.4 Arial,sans-serif;color:#6b7480">${escapeHtml(expires)}${coupon.minSubtotal > 0 ? ` · Minimum spend ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(coupon.minSubtotal)}` : ''}</p>
</div>`
}

function audienceEstimate(draft: Draft, audiences: NewsletterAudienceFeed | null): number {
  if (!audiences) return 0
  if (draft.audience === 'selected') {
    if (draft.overrideSuppression) return draft.recipients.length
    const blocked = new Set(audiences.suppressed.map((entry) => entry.email))
    return draft.recipients.filter((email) => !blocked.has(email)).length
  }
  const eligible = audiences.counts[draft.audience] ?? 0
  return draft.overrideSuppression ? eligible + audiences.suppressedCount : eligible
}

export function AdminNewsletters() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<NewsletterRecord[]>([])
  const [summary, setSummary] = useState<NewsletterSummary | null>(null)
  const [audiences, setAudiences] = useState<NewsletterAudienceFeed | null>(null)
  const [coupons, setCoupons] = useState<CouponWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'list' | 'compose'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(blankDraft)
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [audienceOpen, setAudienceOpen] = useState(false)
  const [audienceQuery, setAudienceQuery] = useState('')
  const [suppressionOpen, setSuppressionOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const [feed, audience, couponFeed] = await Promise.all([
        adminApi.newsletters(),
        adminApi.newsletterAudiences(),
        adminApi.coupons(),
      ])
      setCampaigns(feed.data)
      setSummary(feed.summary)
      setAudiences(audience)
      setCoupons(couponFeed.data)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load campaigns.')
    } finally {
      setLoading(false)
    }
  }, [])

  useLiveRefresh(load, 20_000)

  const queueActive = campaigns.some(
    (campaign) => campaign.status === 'sending' || campaign.status === 'scheduled',
  )

  useEffect(() => {
    if (!queueActive) return
    const timer = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(timer)
  }, [queueActive, load])

  const applyFeed = useCallback(
    (payload: { data: NewsletterRecord; summary: NewsletterSummary }) => {
      setCampaigns((current) => {
        const exists = current.some((entry) => entry.id === payload.data.id)
        return exists
          ? current.map((entry) => (entry.id === payload.data.id ? payload.data : entry))
          : [payload.data, ...current]
      })
      setSummary(payload.summary)
    },
    [],
  )

  const openNew = () => {
    setDraft(blankDraft())
    setEditingId('new')
    setScheduledAt('')
    setView('compose')
  }

  const openCampaign = (campaign: NewsletterRecord) => {
    if (campaign.status === 'sending' || campaign.status === 'sent') {
      toast({
        title: 'Campaign is locked',
        description: 'Copy it to make an editable draft.',
        tone: 'info',
      })
      return
    }
    if (scheduleLocked(campaign)) {
      toast({
        title: 'Five-minute send lock',
        description: 'This campaign is about to send and can no longer be edited.',
        tone: 'warn',
      })
      return
    }
    setDraft({
      subject: campaign.subject,
      preheader: campaign.preheader,
      fromName: campaign.fromName,
      replyTo: campaign.replyTo,
      html: campaign.html,
      audience: campaign.audience,
      recipients: campaign.recipients,
      perMinute: campaign.perMinute,
      perHour: campaign.perHour ?? 1800,
      perDay: campaign.perDay ?? 20_000,
      overrideSuppression: campaign.overrideSuppression ?? false,
      recurrence: recurrenceFromRecord(campaign.recurrence),
    })
    setEditingId(campaign.id)
    setScheduledAt(campaign.scheduledAt ? toLocalInput(campaign.scheduledAt) : '')
    setView('compose')
  }

  const persist = async (): Promise<string | null> => {
    if (draft.subject.trim().length < 3) {
      toast({
        title: 'Add a subject',
        description: 'The subject line is the campaign name.',
        tone: 'danger',
      })
      return null
    }
    if (bodyIsEmpty(draft.html)) {
      toast({ title: 'Write the campaign', description: 'The body is empty.', tone: 'danger' })
      return null
    }
    if (draft.audience === 'selected' && draft.recipients.length === 0) {
      toast({
        title: 'Choose recipients',
        description: 'Pick at least one customer, or change the audience.',
        tone: 'danger',
      })
      return null
    }
    const recurrence = recurrenceFromDraft(draft.recurrence)
    if (recurrence?.kind === 'weekly' && recurrence.weekdays.length === 0) {
      toast({
        title: 'Choose a weekday',
        description: 'Weekly schedules need at least one day.',
        tone: 'danger',
      })
      return null
    }
    setSaving(true)
    try {
      const payload = {
        subject: draft.subject,
        preheader: draft.preheader,
        fromName: draft.fromName,
        replyTo: draft.replyTo,
        html: draft.html,
        audience: draft.audience,
        recipients: draft.recipients,
        perMinute: draft.perMinute,
        perHour: draft.perHour,
        perDay: draft.perDay,
        overrideSuppression: draft.overrideSuppression,
        recurrence,
      }
      if (editingId === 'new' || !editingId) {
        const created = await adminApi.createNewsletter(payload)
        applyFeed(created)
        setEditingId(created.data.id)
        toast({ title: 'Draft saved', description: created.data.subject, tone: 'success' })
        return created.data.id
      }
      const updated = await adminApi.patchNewsletter(editingId, payload)
      applyFeed(updated)
      toast({
        title: 'Campaign saved',
        description: updated.data.scheduledAt
          ? `Schedule kept for ${formatDateTime(updated.data.scheduledAt)}.`
          : 'Recipients refreshed from the live customer list.',
        tone: 'success',
      })
      return updated.data.id
    } catch (caught) {
      toast({
        title: 'Not saved',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
      return null
    } finally {
      setSaving(false)
    }
  }

  const sendNow = async () => {
    const estimate = audienceEstimate(draft, audiences)
    const recurring = draft.recurrence.kind !== 'none'
    if (
      !window.confirm(
        `Send “${draft.subject}” to ${estimate} recipient${estimate === 1 ? '' : 's'} now?${
          recurring
            ? ' This sends one run only; the recurring schedule is created by Schedule.'
            : ''
        }`,
      )
    ) {
      return
    }
    const id = await persist()
    if (!id) return
    setBusyId(id)
    try {
      const result = await adminApi.sendNewsletter(id)
      applyFeed(result)
      toast({
        title: 'Campaign queued',
        description: `${result.data.recipients.length} recipients at ${result.data.perMinute}/min.`,
        tone: 'success',
      })
      setView('list')
    } catch (caught) {
      toast({
        title: 'Could not queue',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusyId('')
    }
  }

  const scheduleSend = async () => {
    const iso = fromLocalInput(scheduledAt)
    if (!iso) {
      toast({
        title: 'Pick a send time',
        description: 'Choose the date and time first.',
        tone: 'danger',
      })
      return
    }
    if (Date.parse(iso) <= Date.now()) {
      toast({ title: 'Time has passed', description: 'Pick a slot in the future.', tone: 'danger' })
      return
    }
    const recurrence = recurrenceFromDraft(draft.recurrence)
    if (recurrence?.kind === 'weekly' && recurrence.weekdays.length === 0) {
      toast({
        title: 'Choose a weekday',
        description: 'Weekly schedules need at least one day.',
        tone: 'danger',
      })
      return
    }
    if (recurrence?.endAt && Date.parse(recurrence.endAt) <= Date.parse(iso)) {
      toast({
        title: 'End date must be later',
        description: 'Choose an end date after the first send.',
        tone: 'danger',
      })
      return
    }
    const id = await persist()
    if (!id) return
    setBusyId(id)
    try {
      const result = await adminApi.scheduleNewsletter(id, iso)
      applyFeed(result)
      toast({
        title: 'Campaign scheduled',
        description: `${result.data.recipients.length} recipients · ${formatDateTime(result.data.scheduledAt ?? iso)}${
          result.data.recurrence ? ` · ${recurrenceSummary(result.data.recurrence)}` : ''
        }`,
        tone: 'success',
      })
      setView('list')
    } catch (caught) {
      toast({
        title: 'Could not schedule',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusyId('')
    }
  }

  const runAction = async (
    campaign: NewsletterRecord,
    action: 'pause' | 'resume' | 'duplicate' | 'delete',
  ) => {
    if ((action === 'delete' || action === 'pause') && scheduleLocked(campaign)) {
      toast({
        title: 'Five-minute send lock',
        description: 'This campaign is about to send and can no longer be changed.',
        tone: 'warn',
      })
      return
    }
    if (
      action === 'delete' &&
      !window.confirm(`Delete “${campaign.subject}”? This cannot be undone.`)
    )
      return
    setBusyId(campaign.id)
    try {
      if (action === 'pause') {
        const result = await adminApi.pauseNewsletter(campaign.id)
        applyFeed(result)
        toast({
          title: campaign.status === 'scheduled' ? 'Schedule cancelled' : 'Campaign paused',
          description: `${result.data.sentCount} of ${result.data.recipients.length} delivered.`,
          tone: 'success',
        })
      } else if (action === 'resume') {
        const result = await adminApi.resumeNewsletter(campaign.id)
        applyFeed(result)
        toast({
          title: 'Back in the queue',
          description: `${result.data.perMinute} recipients per minute.`,
          tone: 'success',
        })
      } else if (action === 'duplicate') {
        const result = await adminApi.duplicateNewsletter(campaign.id)
        applyFeed(result)
        toast({ title: 'Copied as a draft', description: result.data.subject, tone: 'success' })
      } else {
        const result = await adminApi.deleteNewsletter(campaign.id)
        setCampaigns((current) => current.filter((entry) => entry.id !== campaign.id))
        setSummary(result.summary)
        toast({ title: 'Campaign deleted', tone: 'success' })
      }
    } catch (caught) {
      toast({
        title: 'Action failed',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setBusyId('')
    }
  }

  const scheduleCampaign = async (
    campaign: NewsletterRecord,
    scheduledAtIso: string,
    recurrence: NewsletterRecurrence | null,
  ): Promise<string | null> => {
    setBusyId(campaign.id)
    try {
      const patched = await adminApi.patchNewsletter(campaign.id, { recurrence })
      applyFeed(patched)
      const result = await adminApi.scheduleNewsletter(campaign.id, scheduledAtIso)
      applyFeed(result)
      toast({
        title: 'Campaign scheduled',
        description: `${result.data.recipients.length} recipients · ${formatDateTime(
          result.data.scheduledAt ?? scheduledAtIso,
        )}${recurrence ? ` · ${recurrenceSummary(recurrence)}` : ''}`,
        tone: 'success',
      })
      return null
    } catch (caught) {
      return caught instanceof Error ? caught.message : 'Could not schedule this campaign.'
    } finally {
      setBusyId('')
    }
  }

  const filteredCustomers = useMemo(() => {
    const term = audienceQuery.trim().toLowerCase()
    const list = audiences?.customers ?? []
    if (!term) return list
    return list.filter((customer) =>
      `${customer.name} ${customer.email}`.toLowerCase().includes(term),
    )
  }, [audiences, audienceQuery])

  if (loading) return <AdminLoading rows={6} />

  return (
    <>
      <AdminPageHeader
        eyebrow="Marketing · CV-SEND"
        title="Newsletters"
        description="Create, schedule and deliver campaigns with suppression guards, recurring schedules, rate caps and coupon promotions. Every send is queued on the server."
        actions={
          view === 'compose' ? (
            <Button
              variant="secondary"
              size="sm"
              icon="chevron-down"
              onClick={() => setView('list')}
            >
              All campaigns
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon="shield"
                onClick={() => setSuppressionOpen(true)}
              >
                Suppression list ({audiences?.suppressedCount ?? 0})
              </Button>
              <Button variant="secondary" size="sm" icon="refresh" onClick={() => void load()}>
                Refresh
              </Button>
              <Button size="sm" icon="plus" onClick={openNew}>
                New campaign
              </Button>
            </div>
          )
        }
      />

      {error ? <InlineError message={error} /> : null}

      {view === 'compose' ? (
        <Composer
          draft={draft}
          setDraft={setDraft}
          editingId={editingId}
          scheduledAt={scheduledAt}
          setScheduledAt={setScheduledAt}
          audiences={audiences}
          campaigns={campaigns}
          coupons={coupons}
          saving={saving}
          busy={Boolean(busyId)}
          onSave={() => void persist()}
          onSend={() => void sendNow()}
          onSchedule={() => void scheduleSend()}
          onOpenAudience={() => setAudienceOpen(true)}
          onPause={(campaign) => void runAction(campaign, 'pause')}
          onResume={(campaign) => void runAction(campaign, 'resume')}
        />
      ) : (
        <CampaignTable
          campaigns={campaigns}
          summary={summary}
          busyId={busyId}
          onOpen={openCampaign}
          onAction={(campaign, action) => void runAction(campaign, action)}
          onSchedule={scheduleCampaign}
        />
      )}

      <Modal
        open={audienceOpen}
        onClose={() => setAudienceOpen(false)}
        title="Choose recipients"
        description="Suppressed addresses are excluded unless you explicitly override the guard for this campaign."
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-faint">
              {draft.recipients.length} selected · {audiences?.suppressedCount ?? 0} suppressed
            </span>
            <Button variant="secondary" onClick={() => setAudienceOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <div className="mb-3">
          <Toggle
            checked={draft.overrideSuppression}
            onChange={(value) =>
              setDraft((current) => ({ ...current, overrideSuppression: value }))
            }
            label="Include suppressed addresses"
            description="Manual override. Unsubscribed or marketing-disabled addresses will receive this campaign."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <Input
            aria-label="Search customers"
            placeholder="Search name or email"
            value={audienceQuery}
            onChange={(event) => setAudienceQuery(event.target.value)}
            className="max-w-[320px]"
          />
          <Button
            variant="quiet"
            size="sm"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                recipients: (audiences?.customers ?? [])
                  .filter((customer) => current.overrideSuppression || !customer.suppressed)
                  .map((customer) => customer.email),
              }))
            }
          >
            Select all eligible
          </Button>
          <Button
            variant="quiet"
            size="sm"
            onClick={() => setDraft((current) => ({ ...current, recipients: [] }))}
          >
            Clear
          </Button>
        </div>
        {filteredCustomers.length === 0 ? (
          <EmptyState
            title="No customers yet"
            description="Portal accounts appear here once customers register, or once an invoice carries their email."
          />
        ) : (
          <ul className="max-h-[46vh] divide-y divide-line overflow-y-auto border border-line">
            {filteredCustomers.map((customer) => {
              const checked = draft.recipients.includes(customer.email)
              const blocked = Boolean(customer.suppressed) && !draft.overrideSuppression
              return (
                <li key={customer.email} className="px-4 py-3">
                  <Checkbox
                    checked={checked}
                    disabled={blocked}
                    label={
                      <span className="flex flex-wrap items-center gap-2">
                        {customer.name}
                        {customer.suppressed ? <Badge tone="warn">Suppressed</Badge> : null}
                      </span>
                    }
                    description={
                      customer.suppressed
                        ? `${customer.email} · ${customer.reason ?? 'Suppressed'}${blocked ? ' · Enable override to include' : ''}`
                        : customer.email
                    }
                    onChange={() =>
                      setDraft((current) => ({
                        ...current,
                        recipients: checked
                          ? current.recipients.filter((email) => email !== customer.email)
                          : [...current.recipients, customer.email],
                      }))
                    }
                  />
                </li>
              )
            })}
          </ul>
        )}
      </Modal>

      <Modal
        open={suppressionOpen}
        onClose={() => setSuppressionOpen(false)}
        title="Suppression list"
        description="These addresses are tracked as unsubscribed or marketing-disabled. Campaigns exclude them unless an admin turns on the manual override."
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSuppressionOpen(false)}>
            Close
          </Button>
        }
      >
        {(audiences?.suppressed ?? []).length === 0 ? (
          <EmptyState
            icon="shield"
            title="No suppressions"
            description="Unsubscribed signups and customers with marketing email turned off will appear here."
          />
        ) : (
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-line bg-base/40 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  <th className="px-3 py-2 font-normal">Email</th>
                  <th className="px-3 py-2 font-normal">Name / source</th>
                  <th className="px-3 py-2 font-normal">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {(audiences?.suppressed ?? []).map((entry) => (
                  <tr key={`${entry.source}:${entry.email}`}>
                    <td className="px-3 py-2 font-mono text-[10px] text-fg">{entry.email}</td>
                    <td className="px-3 py-2 text-[11px] text-fg-dim">
                      {entry.name}
                      <span className="ml-2 font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
                        {entry.source}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-fg-dim">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Campaign table                                                             */
/* -------------------------------------------------------------------------- */

function CampaignTable({
  campaigns,
  summary,
  busyId,
  onOpen,
  onAction,
  onSchedule,
}: {
  campaigns: NewsletterRecord[]
  summary: NewsletterSummary | null
  busyId: string
  onOpen: (campaign: NewsletterRecord) => void
  onAction: (
    campaign: NewsletterRecord,
    action: 'pause' | 'resume' | 'duplicate' | 'delete',
  ) => void
  onSchedule: (
    campaign: NewsletterRecord,
    scheduledAtIso: string,
    recurrence: NewsletterRecurrence | null,
  ) => Promise<string | null>
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | NewsletterStatus>('all')
  const [audience, setAudience] = useState<'all' | NewsletterAudience>('all')
  const [scheduleTarget, setScheduleTarget] = useState<NewsletterRecord | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return campaigns.filter((campaign) => {
      if (status !== 'all' && campaign.status !== status) return false
      if (audience !== 'all' && campaign.audience !== audience) return false
      if (!needle) return true
      return [campaign.subject, campaign.preheader, campaign.fromName, ...campaign.recipients]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [campaigns, query, status, audience])

  const paused = campaigns.filter((campaign) => campaign.status === 'paused').length

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Drafts" value={summary?.draft ?? 0} note="Ready to schedule or send" />
        <MetricCard
          label="Scheduled & sending"
          value={(summary?.scheduled ?? 0) + (summary?.sending ?? 0)}
          note={summary ? `${summary.reach} recipients queued` : '-'}
          accent="warn"
        />
        <MetricCard label="Paused" value={paused} note="Held mid-flight" accent="heat" />
        <MetricCard
          label="Sent campaigns"
          value={summary?.sent ?? 0}
          note="Completed sends"
          accent="success"
        />
        <MetricCard
          label="Emails delivered"
          value={summary?.delivered ?? 0}
          note="Across completed campaigns"
        />
      </div>

      <div className="flex flex-col gap-3 border border-line bg-panel/25 p-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_170px_190px]">
          <Input
            label="Search campaigns"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Subject, preheader, sender or recipient"
          />
          <Select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value as 'all' | NewsletterStatus)}
            options={STATUS_OPTIONS}
          />
          <Select
            label="Audience"
            value={audience}
            onChange={(event) => setAudience(event.target.value as 'all' | NewsletterAudience)}
            options={[
              { value: 'all', label: 'All audiences' },
              ...(['all', 'portal', 'open-balance', 'prospects', 'selected'] as const).map(
                (entry) => ({ value: entry, label: newsletterAudienceLabel[entry] }),
              ),
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="neutral">{filtered.length} matching</Badge>
          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
            Drafts, scheduled, sending, paused and sent campaigns
          </span>
        </div>
      </div>

      <section className="overflow-x-auto border border-line bg-panel/20">
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon="filter"
              title="No campaigns in this view."
              description="Clear the filters or create a new newsletter."
            />
          </div>
        ) : (
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-base/40 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                <th className="px-3 py-2.5 font-normal">Campaign</th>
                <th className="px-3 py-2.5 font-normal">Status</th>
                <th className="px-3 py-2.5 font-normal">Audience</th>
                <th className="px-3 py-2.5 font-normal">Reach</th>
                <th className="px-3 py-2.5 font-normal">Delivery</th>
                <th className="px-3 py-2.5 font-normal">Schedule</th>
                <th className="px-3 py-2.5 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {filtered.map((campaign) => {
                const total = campaign.recipients.length
                const percent =
                  total > 0 ? Math.min(100, Math.round((campaign.sentCount / total) * 100)) : 0
                const locked = scheduleLocked(campaign)
                const lock = lockLabel(campaign)
                const working = busyId === campaign.id
                const canOpen =
                  campaign.status === 'draft' ||
                  campaign.status === 'scheduled' ||
                  campaign.status === 'paused'
                return (
                  <tr key={campaign.id} className="align-top hover:bg-cold/[0.02]">
                    <td className="max-w-[270px] px-3 py-3">
                      <p className="truncate text-[12px] text-fg">{campaign.subject}</p>
                      <p className="mt-0.5 truncate text-[10px] text-fg-dim">
                        {campaign.preheader || 'No preheader'}
                      </p>
                      <p className="mt-1 font-mono text-[8px] text-fg-faint">
                        Updated {formatDateTime(campaign.updatedAt)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {campaign.parentId ? (
                          <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-cold">
                            Series run {campaign.runNumber ?? 1}
                          </span>
                        ) : null}
                        {campaign.recurrence ? (
                          <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
                            {recurrenceSummary(campaign.recurrence)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={STATUS_TONE[campaign.status]} dot>
                          {newsletterStatusLabel[campaign.status]}
                        </Badge>
                        {lock ? <Badge tone="warn">{lock}</Badge> : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[10px] text-fg-dim">
                      {newsletterAudienceLabel[campaign.audience]}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-[10px] text-fg">{total}</span>
                      {campaign.suppressedCount ? (
                        <span className="mt-0.5 block text-[9px] text-warn">
                          {campaign.suppressedCount} suppressed
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-24 bg-line/60">
                          <div className="h-full bg-cold" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="font-mono text-[9px] text-fg-faint">
                          {campaign.sentCount}/{total}
                        </span>
                      </div>
                      {campaign.failedCount ? (
                        <span className="mt-1 block text-[9px] text-danger">
                          {campaign.failedCount} failed
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-[10px] text-fg-dim">
                      {campaign.scheduledAt ? (
                        <>
                          <span className="block">{formatDateTime(campaign.scheduledAt)}</span>
                          {campaign.recurrence ? (
                            <span className="mt-1 block text-[9px] text-fg-faint">
                              {recurrenceSummary(campaign.recurrence)}
                            </span>
                          ) : null}
                        </>
                      ) : campaign.completedAt ? (
                        <span>Delivered {formatDateTime(campaign.completedAt)}</span>
                      ) : (
                        <span>Not scheduled</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {canOpen ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={locked}
                            onClick={() => onOpen(campaign)}
                          >
                            Open
                          </Button>
                        ) : null}
                        {!locked && campaign.status !== 'sending' && campaign.status !== 'sent' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="border-cold/40 text-cold hover:border-cold"
                            disabled={working}
                            onClick={() => setScheduleTarget(campaign)}
                          >
                            {campaign.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
                          </Button>
                        ) : null}
                        {(campaign.status === 'sending' || campaign.status === 'scheduled') &&
                        !locked ? (
                          <Button
                            variant="quiet"
                            size="sm"
                            loading={working}
                            onClick={() => onAction(campaign, 'pause')}
                          >
                            {campaign.status === 'scheduled' ? 'Cancel schedule' : 'Pause'}
                          </Button>
                        ) : null}
                        {campaign.status === 'paused' ? (
                          <Button
                            variant="quiet"
                            size="sm"
                            loading={working}
                            onClick={() => onAction(campaign, 'resume')}
                          >
                            Resume
                          </Button>
                        ) : null}
                        <Button
                          variant="quiet"
                          size="sm"
                          loading={working}
                          onClick={() => onAction(campaign, 'duplicate')}
                        >
                          Copy
                        </Button>
                        <button
                          type="button"
                          aria-label={`Delete ${campaign.subject}`}
                          disabled={working || campaign.status === 'sending' || locked}
                          onClick={() => onAction(campaign, 'delete')}
                          className="flex h-8 w-8 items-center justify-center border border-line text-fg-faint transition-colors duration-2 hover:border-danger/50 hover:text-danger disabled:opacity-40"
                        >
                          <Icon name="close" size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <ScheduleCampaignModal
        campaign={scheduleTarget}
        onClose={() => setScheduleTarget(null)}
        onSchedule={onSchedule}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Schedule modal                                                            */
/* -------------------------------------------------------------------------- */

function ScheduleCampaignModal({
  campaign,
  onClose,
  onSchedule,
}: {
  campaign: NewsletterRecord | null
  onClose: () => void
  onSchedule: (
    campaign: NewsletterRecord,
    scheduledAtIso: string,
    recurrence: NewsletterRecurrence | null,
  ) => Promise<string | null>
}) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceDraft>(blankRecurrence)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!campaign) return
    setScheduledAt(campaign.scheduledAt ? toLocalInput(campaign.scheduledAt) : '')
    setRecurrence(recurrenceFromRecord(campaign.recurrence))
    setError('')
  }, [campaign])

  if (!campaign) return null

  const submit = async () => {
    const iso = fromLocalInput(scheduledAt)
    if (!iso) {
      setError('Choose the first send date and time.')
      return
    }
    if (Date.parse(iso) <= Date.now()) {
      setError('Choose a send time in the future.')
      return
    }
    const rule = recurrenceFromDraft(recurrence)
    if (rule?.kind === 'weekly' && rule.weekdays.length === 0) {
      setError('Choose at least one weekday for a weekly schedule.')
      return
    }
    if (rule?.endAt && Date.parse(rule.endAt) <= Date.parse(iso)) {
      setError('The end date must be after the first send.')
      return
    }
    setPending(true)
    setError('')
    const failure = await onSchedule(campaign, iso, rule)
    setPending(false)
    if (failure) {
      setError(failure)
      return
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={() => {
        if (!pending) onClose()
      }}
      title={campaign.status === 'scheduled' ? 'Reschedule campaign' : 'Schedule campaign'}
      description={campaign.subject}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={pending} icon="calendar">
            {campaign.status === 'scheduled' ? 'Save new schedule' : 'Schedule campaign'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-2 border border-line bg-panel/40 p-3 text-[11px] sm:grid-cols-3">
          <div>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
              Audience
            </span>
            <p className="mt-0.5 text-fg">{newsletterAudienceLabel[campaign.audience]}</p>
          </div>
          <div>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
              Recipients
            </span>
            <p className="mt-0.5 font-mono text-fg">{campaign.recipients.length}</p>
          </div>
          <div>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
              Suppressed
            </span>
            <p className="mt-0.5 font-mono text-warn">{campaign.suppressedCount ?? 0}</p>
          </div>
        </div>

        {campaign.scheduledAt ? (
          <p className="text-[11px] text-fg-faint">
            Current schedule: {formatDateTime(campaign.scheduledAt)}
            {campaign.recurrence ? ` · ${recurrenceSummary(campaign.recurrence)}` : ''}
          </p>
        ) : null}

        <SchedulePlanner
          scheduledAt={scheduledAt}
          setScheduledAt={setScheduledAt}
          recurrence={recurrence}
          setRecurrence={setRecurrence}
        />

        {error ? <InlineError message={error} /> : null}
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/*  Composer                                                                  */
/* -------------------------------------------------------------------------- */

function Composer({
  draft,
  setDraft,
  editingId,
  scheduledAt,
  setScheduledAt,
  audiences,
  campaigns,
  coupons,
  saving,
  busy,
  onSave,
  onSend,
  onSchedule,
  onOpenAudience,
  onPause,
  onResume,
}: {
  draft: Draft
  setDraft: (value: Draft | ((current: Draft) => Draft)) => void
  editingId: string | null
  scheduledAt: string
  setScheduledAt: (value: string) => void
  audiences: NewsletterAudienceFeed | null
  campaigns: NewsletterRecord[]
  coupons: CouponWithStats[]
  saving: boolean
  busy: boolean
  onSave: () => void
  onSend: () => void
  onSchedule: () => void
  onOpenAudience: () => void
  onPause: (campaign: NewsletterRecord) => void
  onResume: (campaign: NewsletterRecord) => void
}) {
  const record = campaigns.find((campaign) => campaign.id === editingId) ?? null
  const lock = record ? lockLabel(record) : null
  const estimate = audienceEstimate(draft, audiences)
  const previewHtml =
    draft.html || '<p style="color:#6b7480">The live preview appears here as you type.</p>'
  const previewDocument = newsletterEmailDocument({
    subject: draft.subject || 'Campaign preview',
    preheader: draft.preheader,
    fromName: draft.fromName,
    html: previewHtml,
  })
  const activeCoupons = useMemo(
    () => coupons.filter((coupon) => coupon.status === 'active' || coupon.status === 'scheduled'),
    [coupons],
  )
  const [couponCode, setCouponCode] = useState(activeCoupons[0]?.code ?? '')
  const [panel, setPanel] = useState<'delivery' | 'schedule' | 'coupon'>('delivery')

  useEffect(() => {
    if (!activeCoupons.some((coupon) => coupon.code === couponCode)) {
      setCouponCode(activeCoupons[0]?.code ?? '')
    }
  }, [activeCoupons, couponCode])

  const insertCoupon = () => {
    const coupon = activeCoupons.find((entry) => entry.code === couponCode)
    if (!coupon) return
    setDraft((current) => ({ ...current, html: `${current.html}${couponBlock(coupon)}` }))
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="flex flex-col gap-4">
        <Panel title={editingId === 'new' ? 'New campaign' : 'Edit campaign'}>
          <div className="grid gap-4">
            <Input
              label="Subject line"
              required
              value={draft.subject}
              maxLength={160}
              placeholder="Cold snap readiness: the 15-minute pre-check"
              onChange={(event) =>
                setDraft((current) => ({ ...current, subject: event.target.value }))
              }
              hint={`${draft.subject.length}/160 · this is what appears in the inbox`}
            />
            <Textarea
              label="Preheader"
              rows={2}
              maxLength={220}
              value={draft.preheader}
              placeholder="The one line that shows beside the subject on phones."
              onChange={(event) =>
                setDraft((current) => ({ ...current, preheader: event.target.value }))
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="From name"
                value={draft.fromName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, fromName: event.target.value }))
                }
              />
              <Input
                label="Reply-to"
                type="email"
                value={draft.replyTo}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, replyTo: event.target.value }))
                }
                hint="Replies land in this inbox."
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Body"
          action={
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
              Rich text or HTML
            </span>
          }
          bodyClassName="p-0"
        >
          <div className="p-4">
            <RichTextEditor
              value={draft.html}
              onChange={(html) => setDraft((current) => ({ ...current, html }))}
              placeholder="Write the campaign. Use H2 for section headings, lists for checklists, and Link for the booking page."
              minHeight={340}
            />
          </div>
        </Panel>

        {lock ? (
          <div className="border border-warn/40 bg-warn/[0.06] px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-warn">
              Schedule locked
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">
              This campaign sends within five minutes. Editing, pausing and deleting are disabled
              until the send completes.
            </p>
          </div>
        ) : null}

        {record && record.status !== 'draft' ? (
          <Panel title="This campaign">
            <QueueStatus record={record} onPause={onPause} onResume={onResume} />
          </Panel>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
        <Panel
          title="Live preview"
          action={
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-success">
              <span className="h-1.5 w-1.5 bg-success" />
              Updates as you type
            </span>
          }
          bodyClassName="p-0"
        >
          <div className="max-h-[430px] overflow-y-auto bg-[#f4f1ea] p-3">
            <div className="border border-[#e2dccf] bg-[#fffdf8]">
              <div className="flex items-center justify-between gap-3 border-b border-[#e2dccf] px-4 py-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#12161a]">
                  {draft.fromName || 'Coolvane HVAC'}
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#6b7480]">
                  Dallas · Fort Worth · Plano
                </span>
              </div>
              <div className="border-b border-[#e2dccf] px-4 py-3">
                <p className="text-[14px] font-semibold leading-snug text-[#12161a]">
                  {draft.subject || 'Your subject line'}
                </p>
                {draft.preheader ? (
                  <p className="mt-1 text-[11px] leading-snug text-[#6b7480]">{draft.preheader}</p>
                ) : null}
              </div>
              <iframe
                title="Campaign preview"
                sandbox=""
                srcDoc={previewDocument}
                className="h-[460px] w-full border-0 bg-white"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
              {estimate} recipient{estimate === 1 ? '' : 's'}
            </span>
            <a
              href={`data:text/html;charset=utf-8,${encodeURIComponent(
                newsletterEmailDocument({
                  subject: draft.subject || 'Untitled campaign',
                  preheader: draft.preheader,
                  fromName: draft.fromName,
                  html: draft.html,
                }),
              )}`}
              download={`${(draft.subject || 'campaign')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .slice(0, 60)}.html`}
              className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-dim hover:text-cold"
            >
              Download HTML
            </a>
          </div>
        </Panel>

        <Panel
          title="Campaign controls"
          description="Delivery, schedule and coupon tools are kept together behind one control strip."
        >
          <div className="flex flex-wrap gap-1 border-b border-line pb-3">
            {(
              [
                ['delivery', 'Delivery'],
                ['schedule', 'Schedule'],
                ['coupon', 'Coupon'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={panel === id}
                onClick={() => setPanel(id)}
                className={`border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors ${panel === id ? 'border-cold bg-cold/[0.08] text-cold' : 'border-line text-fg-faint hover:border-cold/40 hover:text-cold'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {panel === 'delivery' ? (
            <div className="grid gap-4 pt-3">
              <Select
                label="Audience"
                value={draft.audience}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    audience: event.target.value as NewsletterAudience,
                  }))
                }
                options={(['all', 'portal', 'open-balance', 'prospects', 'selected'] as const).map(
                  (entry) => ({
                    value: entry,
                    label: `${newsletterAudienceLabel[entry]}${entry === 'selected' ? '' : ` ? ${audiences?.counts[entry] ?? 0}`}`,
                  }),
                )}
                hint="Audience counts exclude suppressed addresses unless override is on."
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-panel-2 px-3 py-2">
                <span className="text-[11px] text-fg-dim">
                  {audiences?.suppressedCount ?? 0} suppressed email
                  {(audiences?.suppressedCount ?? 0) === 1 ? '' : 's'}
                </span>
                <Badge tone={draft.overrideSuppression ? 'warn' : 'success'}>
                  {draft.overrideSuppression ? 'Override on' : 'Suppression guard on'}
                </Badge>
              </div>

              <Toggle
                checked={draft.overrideSuppression}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, overrideSuppression: value }))
                }
                label="Override suppression"
                description="Allow this campaign to send to unsubscribed or marketing-disabled addresses."
              />

              {draft.audience === 'selected' ? (
                <div className="flex items-center justify-between gap-3 border border-line bg-panel-2 px-3 py-2">
                  <span className="text-[11px] text-fg-dim">
                    {draft.recipients.length} selected ? {estimate} sendable
                  </span>
                  <Button variant="secondary" size="sm" onClick={onOpenAudience}>
                    Choose
                  </Button>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="Per minute"
                  type="number"
                  min={1}
                  max={600}
                  value={draft.perMinute}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      perMinute: Math.max(1, Math.min(600, Number(event.target.value) || 1)),
                    }))
                  }
                />
                <Input
                  label="Per hour"
                  type="number"
                  min={1}
                  max={50_000}
                  value={draft.perHour}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      perHour: Math.max(1, Math.min(50_000, Number(event.target.value) || 1)),
                    }))
                  }
                />
                <Input
                  label="Per day"
                  type="number"
                  min={1}
                  max={200_000}
                  value={draft.perDay}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      perDay: Math.max(1, Math.min(200_000, Number(event.target.value) || 1)),
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button icon="send" loading={busy} disabled={Boolean(lock)} onClick={onSend} full>
                  Send now
                </Button>
                <Button
                  variant="quiet"
                  loading={saving}
                  disabled={Boolean(lock)}
                  onClick={onSave}
                  full
                >
                  {record && record.status !== 'draft' ? 'Save changes' : 'Save draft'}
                </Button>
              </div>

              <p className="text-[10px] leading-relaxed text-fg-faint">
                The queue lives on the server: closing this tab does not stop delivery. Open the
                Schedule control for a one-time or recurring send.
              </p>
            </div>
          ) : null}

          {panel === 'schedule' ? (
            <div className="grid gap-4 pt-3">
              <SchedulePlanner
                scheduledAt={scheduledAt}
                setScheduledAt={setScheduledAt}
                recurrence={draft.recurrence}
                setRecurrence={(recurrence) => setDraft((current) => ({ ...current, recurrence }))}
              />
              <Button
                variant="secondary"
                icon="calendar"
                loading={saving}
                disabled={Boolean(lock)}
                onClick={onSchedule}
                full
              >
                {draft.recurrence.kind === 'none' ? 'Schedule send' : 'Start schedule'}
              </Button>
              <p className="text-[10px] leading-relaxed text-fg-faint">
                Editing and deleting close five minutes before a scheduled send. Pause is also
                locked inside that window.
              </p>
            </div>
          ) : null}

          {panel === 'coupon' ? (
            <div className="pt-3">
              {activeCoupons.length === 0 ? (
                <p className="text-[11px] leading-relaxed text-fg-faint">
                  Create an active coupon first, then insert its code into this campaign for
                  individual or all-customer sends.
                </p>
              ) : (
                <div className="grid gap-3">
                  <Select
                    label="Coupon"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    options={activeCoupons.map((coupon) => ({
                      value: coupon.code,
                      label: `${coupon.code} ? ${couponValueLabel(coupon)}`,
                    }))}
                  />
                  <Button variant="secondary" size="sm" onClick={insertCoupon}>
                    Insert coupon block into body
                  </Button>
                  <p className="text-[10px] leading-relaxed text-fg-faint">
                    Appends a styled promotion card with the code, value, minimum spend and expiry.
                    Choose a selected audience to send it to specific customers.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Schedule planner                                                          */
/* -------------------------------------------------------------------------- */

function SchedulePlanner({
  scheduledAt,
  setScheduledAt,
  recurrence,
  setRecurrence,
}: {
  scheduledAt: string
  setScheduledAt: (value: string) => void
  recurrence: RecurrenceDraft
  setRecurrence: (value: RecurrenceDraft) => void
}) {
  const update = (patch: Partial<RecurrenceDraft>) => setRecurrence({ ...recurrence, ...patch })
  const unit =
    recurrence.kind === 'daily' ? 'day(s)' : recurrence.kind === 'weekly' ? 'week(s)' : 'month(s)'
  const summary = draftSummary(recurrence)

  const tomorrow = () => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(9, 0, 0, 0)
    setScheduledAt(toLocalInput(date.toISOString()))
  }

  return (
    <div className="flex flex-col gap-3 border border-line bg-panel-2/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
          Send schedule
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={tomorrow}
            className="border border-line px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint hover:border-cold/50 hover:text-cold"
          >
            Tomorrow 9am
          </button>
          <button
            type="button"
            onClick={() => {
              const date = new Date()
              date.setDate(date.getDate() + 7)
              date.setHours(9, 0, 0, 0)
              setScheduledAt(toLocalInput(date.toISOString()))
            }}
            className="border border-line px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint hover:border-cold/50 hover:text-cold"
          >
            Next week
          </button>
        </div>
      </div>

      <Input
        label="First send"
        type="datetime-local"
        value={scheduledAt}
        onChange={(event) => setScheduledAt(event.target.value)}
        hint="Required for scheduled and recurring campaigns."
      />

      <Select
        label="Repeat"
        value={recurrence.kind}
        onChange={(event) => update({ kind: event.target.value as RecurrenceChoice })}
        options={[
          { value: 'none', label: 'Once only' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
      />

      {recurrence.kind !== 'none' ? (
        <div className="flex flex-col gap-3 border border-line bg-base/20 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Every"
              type="number"
              min={1}
              max={12}
              value={recurrence.interval}
              onChange={(event) => update({ interval: event.target.value })}
            />
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                Unit
              </span>
              <div className="flex h-[var(--btn-h-md)] items-center border border-line bg-panel px-3 text-[12px] text-fg-dim">
                {unit}
              </div>
            </div>
          </div>

          {recurrence.kind === 'weekly' ? (
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                Days
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day, index) => {
                  const selected = recurrence.weekdays.includes(index)
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        update({
                          weekdays: selected
                            ? recurrence.weekdays.filter((entry) => entry !== index)
                            : [...recurrence.weekdays, index],
                        })
                      }
                      className={`border px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.06em] ${
                        selected
                          ? 'border-cold bg-cold/10 text-cold'
                          : 'border-line text-fg-faint hover:border-cold/40 hover:text-cold'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {recurrence.kind === 'monthly' ? (
            <div className="grid gap-3">
              <Select
                label="Monthly pattern"
                value={recurrence.monthlyMode}
                onChange={(event) =>
                  update({ monthlyMode: event.target.value as NewsletterMonthlyMode })
                }
                options={[
                  { value: 'day-of-month', label: 'Day of month' },
                  { value: 'nth-weekday', label: 'Nth weekday' },
                ]}
              />
              {recurrence.monthlyMode === 'day-of-month' ? (
                <Input
                  label="Day of month"
                  type="number"
                  min={1}
                  max={31}
                  value={recurrence.dayOfMonth}
                  onChange={(event) => update({ dayOfMonth: event.target.value })}
                  hint="Months without that day use their last day."
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Week"
                    value={recurrence.weekOfMonth}
                    onChange={(event) => update({ weekOfMonth: event.target.value })}
                    options={WEEK_OF_MONTH}
                  />
                  <Select
                    label="Weekday"
                    value={recurrence.weekday}
                    onChange={(event) => update({ weekday: event.target.value })}
                    options={WEEKDAYS.map((day, index) => ({ value: String(index), label: day }))}
                  />
                </div>
              )}
            </div>
          ) : null}

          <Input
            label="End date"
            type="date"
            value={recurrence.endAt}
            min={scheduledAt ? scheduledAt.slice(0, 10) : undefined}
            onChange={(event) => update({ endAt: event.target.value })}
            hint="Optional. Leave blank to keep the series running."
          />

          {summary ? (
            <p className="border-t border-line/60 pt-2 text-[10px] leading-relaxed text-cold">
              {summary}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Queue status                                                              */
/* -------------------------------------------------------------------------- */

function QueueStatus({
  record,
  onPause,
  onResume,
}: {
  record: NewsletterRecord
  onPause: (campaign: NewsletterRecord) => void
  onResume: (campaign: NewsletterRecord) => void
}) {
  const total = record.recipients.length
  const percent = total > 0 ? Math.min(100, Math.round((record.sentCount / total) * 100)) : 0
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[record.status]} dot>
          {newsletterStatusLabel[record.status]}
        </Badge>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-faint">
          {record.sentCount}/{total} delivered · {record.perMinute}/min
          {record.perHour ? ` · ${record.perHour}/hr` : ''}
          {record.perDay ? ` · ${record.perDay}/day` : ''}
        </span>
      </div>
      <div className="h-1.5 w-full bg-line/60">
        <div
          className="h-full bg-cold transition-[width] duration-3"
          style={{ width: `${percent}%` }}
        />
      </div>
      {record.status === 'sending' ||
      record.status === 'scheduled' ||
      record.status === 'paused' ? (
        <div className="flex gap-2">
          {record.status === 'paused' ? (
            <Button size="sm" onClick={() => onResume(record)}>
              Resume queue
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={scheduleLocked(record)}
              onClick={() => onPause(record)}
            >
              {record.status === 'scheduled' ? 'Cancel schedule' : 'Pause queue'}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
