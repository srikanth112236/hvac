import { useEffect, useMemo, useState } from 'react'
import type {
  ContentRevisionChange,
  ContentRevisionList,
  ContentRevisionMeta,
  SiteContent,
} from '@hvac/shared'
import { Icon } from '@/components/icons'
import { Badge, Button, Modal, Select, useToast } from '@/components/ui'
import { adminApi } from '@/admin/api'
import { AdminLoading, InlineError, formatDateTime } from '@/admin/ui'
import { cn } from '@/lib/cn'

type DateFilter = 'all' | 'today' | '7d' | '30d'
type RestoreScope = 'page' | 'all'

function dateKey(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function dayLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function timeLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function groupChanges(changes: ContentRevisionChange[]) {
  const groups = new Map<string, { id: string; label: string; changes: ContentRevisionChange[] }>()
  for (const change of changes) {
    const existing = groups.get(change.pageId)
    if (existing) existing.changes.push(change)
    else groups.set(change.pageId, { id: change.pageId, label: change.pageLabel, changes: [change] })
  }
  return [...groups.values()]
}

function ChangeValue({ label, value, tone }: { label: string; value: string; tone: 'before' | 'after' }) {
  return (
    <div className="min-w-0">
      <span
        className={cn(
          'font-mono text-[8px] uppercase tracking-[0.12em]',
          tone === 'before' ? 'text-heat/80' : 'text-cold/85',
        )}
      >
        {label}
      </span>
      <div
        data-lenis-prevent
        className={cn(
          'mt-1 max-h-44 overflow-auto whitespace-pre-wrap break-words border-l-2 px-3 py-2 text-[12px] leading-relaxed [scrollbar-gutter:stable]',
          tone === 'before'
            ? 'border-heat/30 bg-heat/[0.03] text-fg-dim'
            : 'border-cold/35 bg-cold/[0.04] text-fg',
        )}
      >
        {value ? value : <span className="italic text-fg-faint">Empty</span>}
      </div>
    </div>
  )
}

function ChangeRows({
  changes,
  limit,
  expanded,
  onToggle,
}: {
  changes: ContentRevisionChange[]
  limit: number
  expanded: boolean
  onToggle: () => void
}) {
  const shown = expanded ? changes : changes.slice(0, limit)
  const groups = groupChanges(shown)

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.id} className="border border-line/80">
          <header className="flex items-center justify-between gap-3 border-b border-line/80 bg-panel/40 px-3 py-2">
            <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg">
              {group.label}
            </h4>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
              {group.changes.length} {group.changes.length === 1 ? 'field' : 'fields'}
            </span>
          </header>
          <div className="divide-y divide-line/70">
            {group.changes.map((change) => (
              <div
                key={change.path}
                className="grid gap-3 px-3 py-3 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)_minmax(0,1fr)]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-medium text-fg">{change.field}</span>
                    {change.kind !== 'changed' ? (
                      <Badge tone={change.kind === 'added' ? 'cold' : 'danger'}>
                        {change.kind}
                      </Badge>
                    ) : null}
                  </div>
                  <code className="mt-1 block break-all font-mono text-[8px] leading-relaxed text-fg-faint">
                    {change.path}
                  </code>
                </div>
                <ChangeValue label="Before" value={change.before} tone="before" />
                <ChangeValue label="After" value={change.after} tone="after" />
              </div>
            ))}
          </div>
        </section>
      ))}
      {changes.length > limit ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex h-9 items-center justify-center gap-2 border border-line bg-panel/30 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim transition-colors hover:border-cold/50 hover:text-cold"
        >
          {expanded ? 'Show first fields only' : `Show all ${changes.length} changed fields`}
          <Icon
            name="chevron-down"
            size={13}
            className={cn('transition-transform', expanded && 'rotate-180')}
          />
        </button>
      ) : null}
    </div>
  )
}

export function ContentHistory({
  currentVersion,
  dirty,
  onRestored,
}: {
  currentVersion: number
  dirty: boolean
  onRestored: (content: SiteContent) => void
}) {
  const { toast } = useToast()
  const [data, setData] = useState<ContentRevisionList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [page, setPage] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showAll, setShowAll] = useState<Set<number>>(new Set())
  const [restoreTarget, setRestoreTarget] = useState<ContentRevisionMeta | null>(null)
  const [previewTarget, setPreviewTarget] = useState<ContentRevisionMeta | null>(null)
  const [restoring, setRestoring] = useState<RestoreScope | null>(null)
  const [restoreError, setRestoreError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    adminApi
      .contentHistory()
      .then((history) => {
        if (!active) return
        setData(history)
        const newest = history.revisions.find((revision) => revision.stats.totalChanges > 0)
        if (newest) setExpanded((current) => (current.size ? current : new Set([newest.version])))
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load revisions.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reloadToken])

  const activePage = data?.pages.find((entry) => entry.id === page) ?? null
  const pageOptions = useMemo(
    () => [
      {
        value: 'all',
        label: `All pages${data && data.pages.length > 0 ? ` · ${data.pages.length}` : ''}`,
      },
      ...(data?.pages.map((entry) => ({
        value: entry.id,
        label: `${entry.label} · ${entry.count}`,
      })) ?? []),
    ],
    [data],
  )

  const revisions = useMemo(() => {
    if (!data) return []
    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const cutoff =
      dateFilter === 'today'
        ? startToday
        : dateFilter === '7d'
          ? now.getTime() - 7 * 86_400_000
          : dateFilter === '30d'
            ? now.getTime() - 30 * 86_400_000
            : null

    return data.revisions.filter((revision) => {
      if (page !== 'all' && !revision.stats.pages.some((entry) => entry.id === page)) return false
      if (cutoff !== null) {
        const created = new Date(revision.createdAt).getTime()
        if (Number.isNaN(created) || created < cutoff) return false
      }
      return true
    })
  }, [data, dateFilter, page])

  const groups = useMemo(() => {
    const result = new Map<string, { key: string; label: string; revisions: ContentRevisionMeta[] }>()
    for (const revision of revisions) {
      const key = dateKey(revision.createdAt)
      const existing = result.get(key)
      if (existing) existing.revisions.push(revision)
      else {
        result.set(key, {
          key,
          label: dayLabel(revision.createdAt),
          revisions: [revision],
        })
      }
    }
    return [...result.values()]
  }, [revisions])

  const toggleExpanded = (version: number) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(version)) next.delete(version)
      else next.add(version)
      return next
    })
  }

  const toggleShowAll = (version: number) => {
    setShowAll((current) => {
      const next = new Set(current)
      if (next.has(version)) next.delete(version)
      else next.add(version)
      return next
    })
  }

  const openRestore = (revision: ContentRevisionMeta) => {
    setRestoreError('')
    setRestoreTarget(revision)
  }

  const performRestore = async (scope: RestoreScope) => {
    if (!restoreTarget) return
    if (scope === 'page' && page === 'all') return
    setRestoring(scope)
    setRestoreError('')
    try {
      const result = await adminApi.restoreContentVersion(
        restoreTarget.version,
        scope === 'page' ? page : undefined,
      )
      onRestored(result.data)
      setRestoreTarget(null)
      setReloadToken((value) => value + 1)
      toast({
        title: result.meta.changed ? 'Revision restored' : 'Already up to date',
        description: result.meta.changed
          ? `Version ${result.data.version} is live. The older snapshot remains in history.`
          : 'This page in the selected revision already matches the live content.',
        tone: result.meta.changed ? 'success' : 'info',
      })
    } catch (caught) {
      setRestoreError(caught instanceof Error ? caught.message : 'Could not restore this revision.')
    } finally {
      setRestoring(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="border border-line bg-panel/30 px-5 py-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
            Opening revision ledger
          </p>
        </div>
        <AdminLoading rows={6} />
      </div>
    )
  }

  if (error || !data) {
    return <InlineError message={error || 'Revision history could not be loaded.'} />
  }

  const earliest = data.revisions.at(-1)?.version ?? currentVersion
  const changedRevisions = data.revisions.filter((revision) => revision.stats.totalChanges > 0)

  return (
    <div className="flex flex-col gap-5">
      <section className="border border-cold/25 bg-cold/[0.035]">
        <div className="flex flex-col gap-4 border-b border-line/80 px-4 py-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="clock" size={15} className="text-cold" />
              <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg">
                Revision ledger
              </h2>
            </div>
            <p className="mt-2 max-w-[72ch] text-[12px] leading-relaxed text-fg-dim">
              Every published change creates a complete restore point with its author, timestamp
              and field-level diff. Nothing is overwritten. Restoring publishes a new version, so the
              old snapshot stays in this ledger.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone="cold" dot>
              Live · v{data.currentVersion}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              icon="refresh"
              onClick={() => setReloadToken((value) => value + 1)}
            >
              Refresh
            </Button>
          </div>
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-3">
          <div className="bg-panel/50 px-4 py-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
              Restore points
            </span>
            <p className="mt-1 t-num text-[20px] text-fg">{data.total}</p>
          </div>
          <div className="bg-panel/50 px-4 py-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
              Published changes
            </span>
            <p className="mt-1 t-num text-[20px] text-fg">{changedRevisions.length}</p>
          </div>
          <div className="bg-panel/50 px-4 py-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
              Retained from
            </span>
            <p className="mt-1 t-num text-[20px] text-fg">v{earliest}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 border border-line bg-panel/25 p-4 md:grid-cols-[minmax(0,240px)_minmax(0,190px)_1fr] md:items-end">
        <Select
          label="Page"
          value={page}
          onChange={(event) => setPage(event.target.value)}
          options={pageOptions}
        />
        <Select
          label="Date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value as DateFilter)}
          options={[
            { value: 'all', label: 'All dates' },
            { value: 'today', label: 'Today' },
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: 'Last 30 days' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          {activePage ? (
            <>
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                Filtered to
              </span>
              <Badge tone="cold">{activePage.label}</Badge>
              <button
                type="button"
                onClick={() => setPage('all')}
                className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint underline decoration-line underline-offset-4 hover:text-cold"
              >
                Clear
              </button>
            </>
          ) : (
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
              Showing all pages · grouped by date
            </span>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="border border-line bg-panel/25 px-5 py-10 text-center">
          <Icon name="clock" size={20} className="mx-auto text-fg-faint" />
          <p className="mt-3 text-[13px] text-fg">No revisions match these filters.</p>
          <p className="mt-1 text-[11px] text-fg-faint">
            Try all dates or choose another page.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-dim">
                  {group.label}
                </h3>
                <span className="h-px flex-1 bg-line" />
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  {group.revisions.length} {group.revisions.length === 1 ? 'revision' : 'revisions'}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {group.revisions.map((revision) => {
                  const isCurrent = revision.version === data.currentVersion
                  const changes = page === 'all'
                    ? revision.changes
                    : revision.changes.filter((change) => change.pageId === page)
                  const isOpen = expanded.has(revision.version)
                  const limit = page === 'all' ? 6 : 10

                  return (
                    <article
                      key={revision.id}
                      className={cn(
                        'border bg-panel/20',
                        isCurrent ? 'border-cold/40' : 'border-line',
                      )}
                    >
                      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div
                            className={cn(
                              'flex h-12 w-14 shrink-0 flex-col items-center justify-center border font-mono',
                              isCurrent
                                ? 'border-cold/50 bg-cold/[0.06] text-cold'
                                : 'border-line bg-panel text-fg-dim',
                            )}
                          >
                            <span className="text-[8px] uppercase tracking-[0.1em] opacity-70">
                              version
                            </span>
                            <span className="text-[15px] leading-none">v{revision.version}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-[13px] font-medium text-fg">
                                {revision.stats.totalChanges === 0
                                  ? revision.note
                                  : page !== 'all'
                                    ? `${changes.length} ${
                                        changes.length === 1 ? 'field' : 'fields'
                                      } on ${activePage?.label ?? 'this page'}`
                                    : `${revision.stats.totalChanges} ${
                                        revision.stats.totalChanges === 1 ? 'field' : 'fields'
                                      } changed`}
                              </h4>
                              {isCurrent ? (
                                <Badge tone="success" dot>
                                  Current
                                </Badge>
                              ) : null}
                              {revision.previousVersion ? (
                                <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                                  from v{revision.previousVersion}
                                </span>
                              ) : null}
                              {page !== 'all' && revision.stats.totalChanges !== changes.length ? (
                                <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                                  {revision.stats.totalChanges}{' '}
                                  {revision.stats.totalChanges === 1 ? 'field' : 'fields'} across this
                                  revision
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-[11px] text-fg-faint">
                              {formatDateTime(revision.createdAt)}
                              <span className="mx-1.5 text-line-strong">/</span>
                              {revision.author}
                              <span className="mx-1.5 text-line-strong">/</span>
                              {revision.note}
                            </p>
                            {revision.stats.pages.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {revision.stats.pages.map((entry) => (
                                  <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => setPage(entry.id)}
                                    className={cn(
                                      'border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] transition-colors',
                                      page === entry.id
                                        ? 'border-cold/50 bg-cold/[0.07] text-cold'
                                        : 'border-line text-fg-faint hover:border-cold/40 hover:text-cold',
                                    )}
                                  >
                                    {entry.label} · {entry.count}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[72px] lg:pl-0">
                          {revision.stats.totalChanges > 0 ? (
                            <button
                              type="button"
                              onClick={() => setPreviewTarget(revision)}
                              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.08em] text-fg-dim transition-colors hover:border-cold/50 hover:text-cold"
                            >
                              Preview
                              <Icon name="image" size={12} />
                            </button>
                          ) : null}
                          {revision.stats.totalChanges > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(revision.version)}
                              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.08em] text-fg-dim transition-colors hover:border-cold/50 hover:text-cold"
                            >
                              {isOpen ? 'Hide diff' : 'Review diff'}
                              <Icon
                                name="chevron-down"
                                size={12}
                                className={cn('transition-transform', isOpen && 'rotate-180')}
                              />
                            </button>
                          ) : null}
                          {!isCurrent ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon="refresh"
                              onClick={() => openRestore(revision)}
                            >
                              Restore
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {revision.stats.totalChanges === 0 ? (
                        <div className="border-t border-line/80 px-4 py-3">
                          <p className="text-[11px] leading-relaxed text-fg-faint">
                            Baseline snapshot. Earlier versions were published before the revision
                            ledger was enabled; every save from here is recorded.
                          </p>
                        </div>
                      ) : isOpen ? (
                        <div className="border-t border-line/80 p-4">
                          {changes.length ? (
                            <ChangeRows
                              changes={changes}
                              limit={limit}
                              expanded={showAll.has(revision.version)}
                              onToggle={() => toggleShowAll(revision.version)}
                            />
                          ) : (
                            <p className="text-[11px] text-fg-faint">
                              No changes on {activePage?.label ?? 'this page'} in this revision.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={restoreTarget !== null}
        onClose={() => {
          if (restoring) return
          setRestoreTarget(null)
        }}
        title={`Restore v${restoreTarget?.version ?? ''}`}
        description="Restoring publishes a new version and keeps every snapshot in the ledger."
        size="md"
        footer={
          <>
            <Button
              variant="quiet"
              size="sm"
              onClick={() => setRestoreTarget(null)}
              disabled={Boolean(restoring)}
            >
              Cancel
            </Button>
            {page !== 'all' ? (
              <Button
                variant="secondary"
                size="sm"
                loading={restoring === 'page'}
                disabled={Boolean(restoring)}
                onClick={() => void performRestore('page')}
              >
                Restore {activePage?.label ?? 'this page'}
              </Button>
            ) : null}
            <Button
              variant={page === 'all' ? 'primary' : 'danger'}
              size="sm"
              loading={restoring === 'all'}
              disabled={Boolean(restoring)}
              onClick={() => void performRestore('all')}
            >
              Restore entire v{restoreTarget?.version ?? ''}
            </Button>
          </>
        }
      >
        {restoreTarget ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2 border border-line bg-panel/40 p-4 text-[12px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-fg-faint">Snapshot</span>
                <span className="font-mono text-fg">v{restoreTarget.version}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-fg-faint">Published</span>
                <span className="text-fg">
                  {dayLabel(restoreTarget.createdAt)} · {timeLabel(restoreTarget.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-fg-faint">Author</span>
                <span className="text-fg">{restoreTarget.author}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-fg-faint">Changed in this revision</span>
                <span className="text-fg">{restoreTarget.stats.totalChanges} fields</span>
              </div>
            </div>

            {page !== 'all' ? (
              <p className="text-[12px] leading-relaxed text-fg-dim">
                <strong className="text-fg">Restore {activePage?.label}</strong> only replaces that
                page&apos;s content. Every other page keeps its current live copy.
              </p>
            ) : null}

            <p className="text-[12px] leading-relaxed text-fg-dim">
              <strong className="text-fg">Restore entire v{restoreTarget.version}</strong> replaces
              the whole site, including page copy, legal documents and SEO. Either choice publishes
              as <span className="font-mono text-fg">v{data.currentVersion + 1}</span> and creates a
              new revision.
            </p>

            {dirty ? (
              <div className="border border-warn/40 bg-warn/[0.06] px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-warn">
                  Unpublished edits will be replaced
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">
                  Publish or discard the current draft before restoring if you need to keep it.
                </p>
              </div>
            ) : null}

            {restoreError ? <InlineError message={restoreError} /> : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={previewTarget !== null}
        onClose={() => setPreviewTarget(null)}
        title={`Preview v${previewTarget?.version ?? ''}`}
        description={
          previewTarget
            ? `${formatDateTime(previewTarget.createdAt)} · ${previewTarget.author} · ${previewTarget.note}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="quiet" size="sm" onClick={() => setPreviewTarget(null)}>
              Close
            </Button>
            {previewTarget && previewTarget.version !== data.currentVersion ? (
              <Button
                variant="secondary"
                size="sm"
                icon="refresh"
                onClick={() => {
                  openRestore(previewTarget)
                  setPreviewTarget(null)
                }}
              >
                Restore this version
              </Button>
            ) : null}
          </div>
        }
      >
        {previewTarget ? (
          <div className="flex flex-col gap-4">
            <p className="max-w-[70ch] text-[12px] leading-relaxed text-fg-dim">
              The copy this revision published. Values are the “after” side of the diff, grouped by
              page, so you can check a version before restoring it.
            </p>
            {groupChanges(previewTarget.changes).map((group) => (
              <section key={group.id} className="border border-line">
                <header className="flex items-center justify-between gap-3 border-b border-line bg-panel/40 px-3 py-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg">
                    {group.label}
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                    {group.changes.length} {group.changes.length === 1 ? 'field' : 'fields'}
                  </span>
                </header>
                <dl className="divide-y divide-line/70">
                  {group.changes.map((change) => (
                    <div key={change.path} className="px-3 py-2.5">
                      <dt className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                        {change.field}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-fg">
                        {change.after || <span className="italic text-fg-faint">Empty</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
