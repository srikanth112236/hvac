import { useMemo, useState } from 'react'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { Icon } from '@/components/icons'
import { Button, EmptyState, Input, Select, Textarea, useToast } from '@/components/ui'
import type { AdminLead, ReminderRecord } from '@hvac/shared'
import { adminApi } from '@/admin/api'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  Panel,
  formatDateTime,
  fromLocalInput,
} from '@/admin/ui'

export function AdminReminders() {
  const { toast } = useToast()
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [leads, setLeads] = useState<AdminLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [leadRef, setLeadRef] = useState('')
  const [pending, setPending] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const load = async () => {
    try {
      const [reminderPayload, leadPayload] = await Promise.all([
        adminApi.reminders(),
        adminApi.leads(),
      ])
      setReminders(reminderPayload.data)
      setLeads(leadPayload.data)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load reminders.')
    } finally {
      setLoading(false)
    }
  }

  useLiveRefresh(load)

  const sorted = useMemo(() => {
    return [...reminders]
      .filter((reminder) => showDone || reminder.status === 'open')
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1
        return Date.parse(a.dueAt) - Date.parse(b.dueAt)
      })
  }, [reminders, showDone])

  const create = async () => {
    setPending(true)
    setError('')
    try {
      const reminder = await adminApi.createReminder({
        title,
        body,
        dueAt: fromLocalInput(dueAt) ?? dueAt,
        leadRef: leadRef || null,
      })
      setReminders((current) => [reminder, ...current])
      setTitle('')
      setBody('')
      setDueAt('')
      setLeadRef('')
      toast({ title: 'Reminder set', description: reminder.title, tone: 'success' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the reminder.')
    } finally {
      setPending(false)
    }
  }

  const setStatus = async (reminder: ReminderRecord, status: 'open' | 'done') => {
    try {
      const updated = await adminApi.patchReminder(reminder.id, { status })
      setReminders((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      )
    } catch (caught) {
      toast({
        title: 'Reminder not updated',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const remove = async (reminder: ReminderRecord) => {
    if (!window.confirm(`Delete “${reminder.title}”?`)) return
    try {
      await adminApi.deleteReminder(reminder.id)
      setReminders((current) => current.filter((entry) => entry.id !== reminder.id))
    } catch (caught) {
      toast({
        title: 'Reminder not deleted',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    }
  }

  const openCount = reminders.filter((reminder) => reminder.status === 'open').length

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Follow-ups"
        title="Nothing falls between calls."
        description={`${openCount} open reminder${openCount === 1 ? '' : 's'}. Setting a follow-up on a lead creates one of these automatically; add manual reminders for renewals, parts and site visits.`}
        actions={
          <Button variant="secondary" icon="airflow" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel title="Set a reminder" className="xl:col-span-4">
          <div className="flex flex-col gap-3">
            <Input
              label="Title"
              value={title}
              required
              placeholder="Call back about chiller quote"
              onChange={(event) => setTitle(event.target.value)}
            />
            <Input
              label="Due"
              type="datetime-local"
              value={dueAt}
              required
              onChange={(event) => setDueAt(event.target.value)}
            />
            <Select
              label="Linked lead"
              value={leadRef}
              placeholder="No lead"
              options={leads.map((lead) => ({
                value: lead.ref,
                label: `${lead.name} · ${lead.ref}`,
              }))}
              onChange={(event) => setLeadRef(event.target.value)}
            />
            <Textarea
              label="Notes"
              rows={3}
              value={body}
              placeholder="What needs to happen?"
              onChange={(event) => setBody(event.target.value)}
            />
            <Button
              onClick={() => void create()}
              disabled={pending || !title.trim() || !dueAt}
              full
              icon={pending ? 'clock' : 'plus'}
            >
              {pending ? 'Saving…' : 'Add reminder'}
            </Button>
          </div>
        </Panel>

        <div className="xl:col-span-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              {showDone ? 'All reminders' : 'Open reminders'}
            </span>
            <button
              type="button"
              onClick={() => setShowDone((value) => !value)}
              className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:text-fg"
            >
              {showDone ? 'Hide completed' : 'Show completed'}
            </button>
          </div>

          {loading ? (
            <AdminLoading rows={4} />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No reminders here."
              description="Set one against a lead or create a standalone maintenance follow-up."
            />
          ) : (
            <ol className="flex flex-col gap-2">
              {sorted.map((reminder) => {
                const overdue =
                  reminder.status === 'open' && new Date(reminder.dueAt).getTime() < Date.now()
                const lead = leads.find((entry) => entry.ref === reminder.leadRef)
                return (
                  <li
                    key={reminder.id}
                    className={`border bg-panel/40 p-4 ${
                      overdue ? 'border-heat/40' : 'border-line'
                    } ${reminder.status === 'done' ? 'opacity-55' : ''}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-mono text-[8px] uppercase tracking-[0.1em] ${
                              overdue ? 'text-heat' : 'text-fg-faint'
                            }`}
                          >
                            {overdue ? 'Overdue' : reminder.status === 'done' ? 'Done' : 'Due'} ·{' '}
                            {formatDateTime(reminder.dueAt)}
                          </span>
                          {lead ? (
                            <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-cold">
                              {lead.ref}
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={`mt-1.5 text-[13px] font-medium ${
                            reminder.status === 'done' ? 'text-fg-faint line-through' : 'text-fg'
                          }`}
                        >
                          {reminder.title}
                        </p>
                        {reminder.body ? (
                          <p className="mt-1 text-[11px] leading-snug text-fg-dim">{reminder.body}</p>
                        ) : null}
                        {lead ? (
                          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-fg-faint">
                            {lead.phone} · {lead.serviceName ?? 'Unallocated'}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {reminder.status === 'open' ? (
                          <button
                            type="button"
                            onClick={() => void setStatus(reminder, 'done')}
                            className="flex h-8 items-center gap-1.5 border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim hover:border-success/50 hover:text-success"
                          >
                            <Icon name="check" size={11} /> Done
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void setStatus(reminder, 'open')}
                            className="flex h-8 items-center gap-1.5 border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim hover:text-cold"
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void remove(reminder)}
                          aria-label={`Delete reminder ${reminder.title}`}
                          className="flex h-8 w-8 items-center justify-center border border-line text-fg-faint hover:border-danger/40 hover:text-danger"
                        >
                          <Icon name="close" size={11} />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
