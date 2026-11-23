import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import {
  newsletterAudienceLabel,
  newsletterEmailDocument,
  newsletterStatusLabel,
  type NewsletterAudience,
  type NewsletterRecord,
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
  formatDateTime,
  fromLocalInput,
  toLocalInput,
} from '@/admin/ui'
import { RichTextEditor } from '@/admin/RichTextEditor'

interface Draft {
  subject: string
  preheader: string
  fromName: string
  replyTo: string
  html: string
  audience: NewsletterAudience
  recipients: string[]
  perMinute: number
}

interface AudienceFeed {
  counts: Record<string, number>
  customers: { name: string; email: string }[]
}

const STATUS_TONE: Record<NewsletterStatus, 'neutral' | 'cold' | 'warn' | 'heat' | 'success'> = {
  draft: 'neutral',
  scheduled: 'cold',
  sending: 'warn',
  paused: 'heat',
  sent: 'success',
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
  }
}

function bodyIsEmpty(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0 && !html.includes('<img')
}

export function AdminNewsletters() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<NewsletterRecord[]>([])
  const [summary, setSummary] = useState<NewsletterSummary | null>(null)
  const [audiences, setAudiences] = useState<AudienceFeed | null>(null)
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

  const load = useCallback(async () => {
    try {
      const [feed, audience] = await Promise.all([
        adminApi.newsletters(),
        adminApi.newsletterAudiences(),
      ])
      setCampaigns(feed.data)
      setSummary(feed.summary)
      setAudiences(audience)
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
    setDraft({
      subject: campaign.subject,
      preheader: campaign.preheader,
      fromName: campaign.fromName,
      replyTo: campaign.replyTo,
      html: campaign.html,
      audience: campaign.audience,
      recipients: campaign.recipients,
      perMinute: campaign.perMinute,
    })
    setEditingId(campaign.id)
    setScheduledAt(campaign.scheduledAt ? toLocalInput(campaign.scheduledAt) : '')
    setView('compose')
  }

  const persist = async (): Promise<string | null> => {
    if (draft.subject.trim().length < 3) {
      toast({ title: 'Add a subject', description: 'The subject line is the campaign name.', tone: 'danger' })
      return null
    }
    if (bodyIsEmpty(draft.html)) {
      toast({ title: 'Write the campaign', description: 'The body is empty.', tone: 'danger' })
      return null
    }
    if (draft.audience === 'selected' && draft.recipients.length === 0) {
      toast({ title: 'Choose recipients', description: 'Pick at least one customer, or change the audience.', tone: 'danger' })
      return null
    }
    setSaving(true)
    try {
      if (editingId === 'new' || !editingId) {
        const created = await adminApi.createNewsletter(draft)
        applyFeed(created)
        setEditingId(created.data.id)
        toast({ title: 'Draft saved', description: created.data.subject, tone: 'success' })
        return created.data.id
      }
      const updated = await adminApi.patchNewsletter(editingId, draft)
      applyFeed(updated)
      toast({ title: 'Draft saved', description: 'Recipients refreshed from the live customer list.', tone: 'success' })
      return updated.data.id
    } catch (caught) {
      toast({ title: 'Not saved', description: caught instanceof Error ? caught.message : 'Try again.', tone: 'danger' })
      return null
    } finally {
      setSaving(false)
    }
  }

  const sendNow = async () => {
    const estimate = audienceEstimate(draft, audiences)
    if (!window.confirm(`Send “${draft.subject}” to ${estimate} recipient${estimate === 1 ? '' : 's'} now?`)) return
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
      toast({ title: 'Could not queue', description: caught instanceof Error ? caught.message : 'Try again.', tone: 'danger' })
    } finally {
      setBusyId('')
    }
  }

  const scheduleSend = async () => {
    const iso = fromLocalInput(scheduledAt)
    if (!iso) {
      toast({ title: 'Pick a send time', description: 'Choose the date and time first.', tone: 'danger' })
      return
    }
    if (Date.parse(iso) <= Date.now()) {
      toast({ title: 'Time has passed', description: 'Pick a slot in the future.', tone: 'danger' })
      return
    }
    const id = await persist()
    if (!id) return
    setBusyId(id)
    try {
      const result = await adminApi.scheduleNewsletter(id, iso)
      applyFeed(result)
      toast({
        title: 'Scheduled',
        description: `${result.data.recipients.length} recipients · ${formatDateTime(result.data.scheduledAt)}`,
        tone: 'success',
      })
      setView('list')
    } catch (caught) {
      toast({ title: 'Could not schedule', description: caught instanceof Error ? caught.message : 'Try again.', tone: 'danger' })
    } finally {
      setBusyId('')
    }
  }

  const runAction = async (
    campaign: NewsletterRecord,
    action: 'pause' | 'resume' | 'duplicate' | 'delete',
  ) => {
    if (action === 'delete' && !window.confirm(`Delete “${campaign.subject}”? This cannot be undone.`)) return
    setBusyId(campaign.id)
    try {
      if (action === 'pause') {
        const result = await adminApi.pauseNewsletter(campaign.id)
        applyFeed(result)
        toast({ title: 'Campaign paused', description: `${result.data.sentCount} of ${result.data.recipients.length} delivered.`, tone: 'success' })
      } else if (action === 'resume') {
        const result = await adminApi.resumeNewsletter(campaign.id)
        applyFeed(result)
        toast({ title: 'Back in the queue', description: `${result.data.perMinute} recipients per minute.`, tone: 'success' })
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
      toast({ title: 'Action failed', description: caught instanceof Error ? caught.message : 'Try again.', tone: 'danger' })
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
        description="Write, preview and deliver campaigns to your customer list. Every send is throttled through a queue, so a large list never trips a provider rate limit."
        actions={
          view === 'compose' ? (
            <Button variant="secondary" size="sm" icon="chevron-down" onClick={() => setView('list')}>
              All campaigns
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
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
        <CampaignList
          campaigns={campaigns}
          summary={summary}
          busyId={busyId}
          onOpen={openCampaign}
          onAction={(campaign, action) => void runAction(campaign, action)}
        />
      )}

      <Modal
        open={audienceOpen}
        onClose={() => setAudienceOpen(false)}
        title="Choose recipients"
        description="Selected customers receive this campaign only. The list is saved with the draft."
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-faint">
              {draft.recipients.length} selected
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setAudienceOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        }
      >
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
                recipients: (audiences?.customers ?? []).map((customer) => customer.email),
              }))
            }
          >
            Select all
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
              return (
                <li key={customer.email} className="px-4 py-3">
                  <Checkbox
                    checked={checked}
                    label={customer.name}
                    description={customer.email}
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
    </>
  )
}

function audienceEstimate(draft: Draft, audiences: AudienceFeed | null): number {
  if (draft.audience === 'selected') return draft.recipients.length
  return audiences?.counts[draft.audience] ?? 0
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
  audiences: AudienceFeed | null
  campaigns: NewsletterRecord[]
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
  const estimate = audienceEstimate(draft, audiences)
  const previewHtml = draft.html || '<p style="color:#6b7480">The live preview appears here as you type.</p>'
  const previewDocument = newsletterEmailDocument({
    subject: draft.subject || 'Campaign preview',
    preheader: draft.preheader,
    fromName: draft.fromName,
    html: previewHtml,
  })

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
              onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
              hint={`${draft.subject.length}/160 · this is what appears in the inbox`}
            />
            <Textarea
              label="Preheader"
              rows={2}
              maxLength={220}
              value={draft.preheader}
              placeholder="The one line that shows beside the subject on phones."
              onChange={(event) => setDraft((current) => ({ ...current, preheader: event.target.value }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="From name"
                value={draft.fromName}
                onChange={(event) => setDraft((current) => ({ ...current, fromName: event.target.value }))}
              />
              <Input
                label="Reply-to"
                type="email"
                value={draft.replyTo}
                onChange={(event) => setDraft((current) => ({ ...current, replyTo: event.target.value }))}
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
              download={`${(draft.subject || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}.html`}
              className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-dim hover:text-cold"
            >
              Download HTML
            </a>
          </div>
        </Panel>

        <Panel title="Delivery">
          <div className="grid gap-4">
            <Select
              label="Audience"
              value={draft.audience}
              onChange={(event) => {
                const audience = event.target.value as NewsletterAudience
                setDraft((current) => ({ ...current, audience }))
              }}
              options={(['all', 'portal', 'open-balance', 'prospects', 'selected'] as const).map((entry) => ({
                value: entry,
                label: `${newsletterAudienceLabel[entry]}${
                  entry === 'selected' ? '' : ` · ${audiences?.counts[entry] ?? 0}`
                }`,
              }))}
              hint="Audiences are resolved from portal accounts and invoice addresses."
            />

            {draft.audience === 'selected' ? (
              <div className="flex items-center justify-between gap-3 border border-line bg-panel-2 px-3 py-2">
                <span className="text-[11px] text-fg-dim">
                  {draft.recipients.length} customer{draft.recipients.length === 1 ? '' : 's'} selected
                </span>
                <Button variant="secondary" size="sm" onClick={onOpenAudience}>
                  Choose
                </Button>
              </div>
            ) : null}

            <Input
              label="Send rate · recipients per minute"
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
              hint={
                estimate > 0
                  ? `${Math.max(1, Math.ceil(estimate / Math.max(1, draft.perMinute)))} min at this rate`
                  : 'Batch size per minute — 30–60 is a safe provider default.'
              }
            />

            <Input
              label="Schedule"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              hint="Leave blank to send manually."
            />

            <div className="flex flex-col gap-2">
              <Button icon="send" loading={busy} onClick={onSend} full>
                Send now
              </Button>
              <Button variant="secondary" icon="calendar" loading={saving} onClick={onSchedule} full>
                Schedule send
              </Button>
              <Button variant="quiet" loading={saving} onClick={onSave} full>
                Save draft
              </Button>
            </div>

            <p className="text-[10px] leading-relaxed text-fg-faint">
              The queue lives on the server: closing this tab does not stop delivery. Pause from the
              campaign list to hold a send mid-flight.
            </p>
            <p className="border-t border-line pt-3 text-[10px] leading-relaxed text-fg-faint">
              Delivery runs in simulator mode until an email provider is connected, so counts advance
              without mail leaving the building. Point the sender at your ESP to go live.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Queue + list                                                              */
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
        </span>
      </div>
      <div className="h-1.5 w-full bg-line/60">
        <div className="h-full bg-cold transition-[width] duration-3" style={{ width: `${percent}%` }} />
      </div>
      {record.status === 'sending' || record.status === 'scheduled' || record.status === 'paused' ? (
        <div className="flex gap-2">
          {record.status === 'paused' ? (
            <Button size="sm" onClick={() => onResume(record)}>
              Resume queue
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => onPause(record)}>
              Pause queue
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}

function CampaignList({
  campaigns,
  summary,
  busyId,
  onOpen,
  onAction,
}: {
  campaigns: NewsletterRecord[]
  summary: NewsletterSummary | null
  busyId: string
  onOpen: (campaign: NewsletterRecord) => void
  onAction: (
    campaign: NewsletterRecord,
    action: 'pause' | 'resume' | 'duplicate' | 'delete',
  ) => void
}) {
  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Drafts" value={summary?.draft ?? 0} note="Waiting on copy or a send window" />
        <MetricCard
          label="In the queue"
          value={(summary?.scheduled ?? 0) + (summary?.sending ?? 0)}
          note={summary ? `${summary.reach} recipients queued` : '—'}
          accent="warn"
        />
        <MetricCard label="Delivered" value={summary?.sent ?? 0} note="Campaigns sent to date" accent="success" />
        <MetricCard
          label="Emails delivered"
          value={summary?.delivered ?? 0}
          note="Across every completed campaign"
        />
      </div>

      <section className="mt-6 border border-line bg-panel/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
            Campaign ledger
          </h2>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
            {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'}
          </span>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No campaigns yet"
              description="Start with a service reminder or a seasonal maintenance note. The composer keeps a live preview beside your copy."
            />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {campaigns.map((campaign) => {
              const total = campaign.recipients.length
              const percent = total > 0 ? Math.min(100, Math.round((campaign.sentCount / total) * 100)) : 0
              const working = busyId === campaign.id
              return (
                <article key={campaign.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={STATUS_TONE[campaign.status]} dot>
                        {newsletterStatusLabel[campaign.status]}
                      </Badge>
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                        {newsletterAudienceLabel[campaign.audience]}
                        {total > 0 ? ` · ${total}` : ''} · {campaign.perMinute}/min
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-fg">{campaign.subject}</p>
                    <p className="truncate text-[11px] text-fg-dim">
                      {campaign.preheader || 'No preheader'}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                      {campaign.scheduledAt
                        ? `Scheduled ${formatDateTime(campaign.scheduledAt)}`
                        : campaign.completedAt
                          ? `Delivered ${formatDateTime(campaign.completedAt)}`
                          : `Updated ${formatDateTime(campaign.updatedAt)}`}
                    </p>
                    {total > 0 ? (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 w-full max-w-[220px] bg-line/60">
                          <div className="h-full bg-cold" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="font-mono text-[9px] text-fg-faint">
                          {campaign.sentCount}/{total}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    <Button variant="secondary" size="sm" onClick={() => onOpen(campaign)}>
                      Open
                    </Button>
                    {campaign.status === 'sending' || campaign.status === 'scheduled' ? (
                      <Button variant="quiet" size="sm" loading={working} onClick={() => onAction(campaign, 'pause')}>
                        Pause
                      </Button>
                    ) : null}
                    {campaign.status === 'paused' ? (
                      <Button variant="quiet" size="sm" loading={working} onClick={() => onAction(campaign, 'resume')}>
                        Resume
                      </Button>
                    ) : null}
                    <Button variant="quiet" size="sm" loading={working} onClick={() => onAction(campaign, 'duplicate')}>
                      Copy
                    </Button>
                    <button
                      type="button"
                      aria-label={`Delete ${campaign.subject}`}
                      disabled={working || campaign.status === 'sending'}
                      onClick={() => onAction(campaign, 'delete')}
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
    </>
  )
}
