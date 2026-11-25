import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  ContentRevisionChange,
  ContentRevisionList,
  ContentRevisionMeta,
  SiteContent,
} from '@hvac/shared'
import { Icon } from '@/components/icons'
import {
  Badge,
  Button,
  EmptyState,
  Modal,
  Pagination,
  RecordViewButton,
  SearchSuggest,
  Select,
  TableActionButton,
  TableActions,
  useToast,
} from '@/components/ui'
import { adminApi } from '@/admin/api'
import { revisionPageCatalog } from '@/admin/contentRegistry'
import { useBackTarget } from '@/admin/useBackTarget'
import { useRecordDeepLink } from '@/admin/useDeepLink'
import { useLiveRefresh } from '@/admin/useLiveRefresh'
import { AdminLoading, AdminPageHeader, InlineError, formatDateTime } from '@/admin/ui'
import { cn } from '@/lib/cn'

type TabId = 'versions' | 'pages'
type DateRange = 'all' | 'today' | '7d' | '30d' | '90d'
type SortMode = 'newest' | 'oldest' | 'changes'
type RestoreMode = 'site' | 'page' | 'fields'

type PageKind = 'page' | 'collection' | 'detail' | 'global'

interface PageEntry {
  id: string
  revisionId: string
  label: string
  description: string
  route: string
  kind: PageKind
  revisions: number
  changes: number
  lastAt: string | null
  lastVersion: number | null
  /** For a detail record, the dotted path prefix owned by the record. */
  recordPrefix?: string
  /** For detail records whose diff owner is one page id, such as legal docs. */
  recordPageId?: string
  /** The page id used by the restore endpoint for this exact page. */
  restorePageId: string
}

interface RestoreRequest {
  mode: RestoreMode
  revision: ContentRevisionMeta
  pageId?: string
  pageLabel?: string
  pageCount?: number
  paths?: string[]
}

const PAGE_SIZE = 12

const dateOptions: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const sortOptions: { value: SortMode; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'changes', label: 'Most changes' },
]

function pageEntry(
  id: string,
  label: string,
  description: string,
  revisionId = id,
  options: Partial<
    Pick<PageEntry, 'route' | 'kind' | 'recordPrefix' | 'recordPageId' | 'restorePageId'>
  > = {},
): PageEntry {
  return {
    id,
    revisionId,
    label,
    description,
    route: options.route ?? '',
    kind: options.kind ?? 'page',
    revisions: 0,
    changes: 0,
    lastAt: null,
    lastVersion: null,
    recordPrefix: options.recordPrefix,
    recordPageId: options.recordPageId,
    restorePageId: options.restorePageId ?? revisionId,
  }
}

function changeMatchesEntry(change: ContentRevisionChange, entry: PageEntry): boolean {
  if (entry.recordPageId) return change.pageId === entry.recordPageId
  if (!entry.recordPrefix) return false
  const prefix = entry.recordPrefix.replace(/\.$/, '')
  return change.path === prefix || change.path.startsWith(entry.recordPrefix)
}

function revisionMatchesEntry(revision: ContentRevisionMeta, entry: PageEntry): boolean {
  if (entry.kind === 'detail')
    return revision.changes.some((change) => changeMatchesEntry(change, entry))
  return revision.stats.pages.some((page) => page.id === entry.revisionId)
}

function recordEntries(content: SiteContent): PageEntry[] {
  return [
    ...content.services.map((service) =>
      pageEntry(
        `service:${service.id}`,
        service.name || service.id,
        `Service detail · /services/${service.id} · ${service.category}`,
        'services',
        {
          route: `/services/${service.id}`,
          kind: 'detail',
          recordPrefix: `services.${service.id}.`,
          restorePageId: `service:${service.id}`,
        },
      ),
    ),
    ...content.workCases.map((entry) =>
      pageEntry(
        `work-case:${entry.id}`,
        entry.name || entry.id,
        `Work case · ${entry.category}`,
        'work',
        {
          route: '/work#files',
          kind: 'detail',
          recordPrefix: `workCases.${entry.id}.`,
          restorePageId: `work-case:${entry.id}`,
        },
      ),
    ),
    ...content.products.map((product) =>
      pageEntry(
        `product:${product.id}`,
        product.name || product.id,
        `System detail · ${product.category}`,
        'products',
        {
          route: `/products#${product.slug}`,
          kind: 'detail',
          recordPrefix: `products.${product.id}.`,
          restorePageId: `product:${product.id}`,
        },
      ),
    ),
    ...content.plans.map((plan) =>
      pageEntry(`plan:${plan.id}`, plan.name || plan.id, 'AMC plan detail', 'amc', {
        route: '/amc#plans',
        kind: 'detail',
        recordPrefix: `plans.${plan.id}.`,
        restorePageId: `plan:${plan.id}`,
      }),
    ),
    ...content.legal.map((document) =>
      pageEntry(
        `legal-doc:${document.slug}`,
        document.title || document.slug,
        `Legal document · /legal/${document.slug}`,
        `legal:${document.slug}`,
        {
          route: `/legal/${document.slug}`,
          kind: 'detail',
          recordPageId: `legal:${document.slug}`,
          restorePageId: `legal:${document.slug}`,
        },
      ),
    ),
    ...content.posts.map((post) =>
      pageEntry(
        `post:${post.id}`,
        post.title || post.slug,
        `Journal article · /blog/${post.slug}`,
        'blog',
        {
          route: `/blog/${post.slug}`,
          kind: 'detail',
          recordPrefix: `posts.${post.id}.`,
          restorePageId: `post:${post.id}`,
        },
      ),
    ),
  ]
}

function groupChanges(changes: ContentRevisionChange[]) {
  const groups = new Map<string, { id: string; label: string; changes: ContentRevisionChange[] }>()
  for (const change of changes) {
    const existing = groups.get(change.pageId)
    if (existing) existing.changes.push(change)
    else
      groups.set(change.pageId, { id: change.pageId, label: change.pageLabel, changes: [change] })
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function dateCutoff(range: DateRange): number | null {
  const now = new Date()
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  }
  if (range === '7d') return now.getTime() - 7 * 86_400_000
  if (range === '30d') return now.getTime() - 30 * 86_400_000
  if (range === '90d') return now.getTime() - 90 * 86_400_000
  return null
}

function changeTone(change: ContentRevisionChange): 'neutral' | 'cold' | 'danger' {
  return change.kind === 'added' ? 'cold' : change.kind === 'removed' ? 'danger' : 'neutral'
}

function ChangeValue({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'before' | 'after'
}) {
  return (
    <div className="min-w-0">
      <span
        className={cn(
          'font-mono text-[8px] uppercase tracking-[0.1em]',
          tone === 'before' ? 'text-heat/80' : 'text-cold/85',
        )}
      >
        {label}
      </span>
      <div
        data-lenis-prevent
        className={cn(
          'mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words border-l-2 px-3 py-2 text-[11px] leading-relaxed [scrollbar-gutter:stable]',
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

function PageCard({ entry, onOpen }: { entry: PageEntry; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex min-h-36 flex-col justify-between border bg-panel/25 p-4 text-left transition-colors',
        entry.revisions
          ? 'border-line hover:border-cold/50 hover:bg-cold/[0.025]'
          : 'border-line/70 hover:border-line-strong',
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
            {entry.revisions} {entry.revisions === 1 ? 'revision' : 'revisions'}
          </span>
          {entry.lastVersion ? (
            <span className="font-mono text-[8px] text-cold">v{entry.lastVersion}</span>
          ) : null}
        </div>
        <h3 className="mt-2 text-[16px] font-medium text-fg">{entry.label}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-fg-faint">
          {entry.description}
        </p>
        <span className="mt-2 block truncate font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint/80">
          {entry.route || 'Global content'}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-line/60 pt-3">
        <span className="text-[10px] text-fg-faint">
          {entry.changes
            ? `${entry.changes} field${entry.changes === 1 ? '' : 's'} changed`
            : 'No content changes yet'}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim group-hover:text-cold">
          Open timeline <Icon name="arrow-right" size={10} />
        </span>
      </div>
    </button>
  )
}

export function AdminRevisions() {
  const { toast } = useToast()
  const back = useBackTarget('/admin/content', 'Content studio')
  const [data, setData] = useState<ContentRevisionList | null>(null)
  const [content, setContent] = useState<SiteContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabId>('versions')
  const [query, setQuery] = useState('')
  const [pageFilter, setPageFilter] = useState('all')
  const [authorFilter, setAuthorFilter] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [sort, setSort] = useState<SortMode>('newest')
  const [versionPage, setVersionPage] = useState(1)
  const [pageQuery, setPageQuery] = useState('')
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null)
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [detailRevision, setDetailRevision] = useState<ContentRevisionMeta | null>(null)
  const [restore, setRestore] = useState<RestoreRequest | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState('')

  const load = async () => {
    try {
      const [history, site] = await Promise.all([adminApi.contentHistory(), adminApi.content()])
      setData(history)
      setContent(site)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the revision ledger.')
    } finally {
      setLoading(false)
    }
  }

  useLiveRefresh(load, 20_000)

  useEffect(() => {
    setVersionPage(1)
  }, [query, pageFilter, authorFilter, dateRange, sort])

  const authors = useMemo(
    () => [...new Set(data?.revisions.map((revision) => revision.author) ?? [])].sort(),
    [data],
  )

  const pageEntries = useMemo(() => {
    const entries = new Map<string, PageEntry>()
    for (const page of revisionPageCatalog) {
      entries.set(
        page.id,
        pageEntry(page.id, page.label, page.description, page.revisionId, {
          route: page.route,
          kind: page.route === 'Global scope' ? 'global' : 'page',
        }),
      )
    }
    if (content) {
      for (const entry of recordEntries(content)) entries.set(entry.id, entry)
    }
    for (const page of data?.pages ?? []) {
      const id = `revision:${page.id}`
      if ([...entries.values()].some((entry) => entry.revisionId === page.id)) continue
      if (page.id.startsWith('legal:')) {
        const slug = page.id.slice('legal:'.length)
        entries.set(
          id,
          pageEntry(id, page.label, `Historical legal document · /legal/${slug}`, page.id, {
            route: `/legal/${slug}`,
            kind: 'detail',
            recordPageId: page.id,
            restorePageId: page.id,
          }),
        )
      } else {
        entries.set(id, pageEntry(id, page.label, 'Historical CMS page', page.id))
      }
    }
    for (const revision of data?.revisions ?? []) {
      for (const page of revision.stats.pages) {
        let targets = [...entries.values()].filter(
          (entry) => entry.kind !== 'detail' && entry.revisionId === page.id,
        )
        if (!targets.length) {
          const hasRecordPage = [...entries.values()].some(
            (entry) => entry.kind === 'detail' && entry.revisionId === page.id,
          )
          if (hasRecordPage) continue
          const entry = pageEntry(page.id, page.label, 'Published content')
          entries.set(entry.id, entry)
          targets = [entry]
        }
        for (const existing of targets) {
          existing.revisions += 1
          existing.changes += page.count
          if (!existing.lastAt || Date.parse(revision.createdAt) > Date.parse(existing.lastAt)) {
            existing.lastAt = revision.createdAt
            existing.lastVersion = revision.version
          }
        }
      }
      for (const entry of entries.values()) {
        if (entry.kind !== 'detail') continue
        const matches = revision.changes.filter((change) => changeMatchesEntry(change, entry))
        if (!matches.length) continue
        entry.revisions += 1
        entry.changes += matches.length
        if (!entry.lastAt || Date.parse(revision.createdAt) > Date.parse(entry.lastAt)) {
          entry.lastAt = revision.createdAt
          entry.lastVersion = revision.version
        }
      }
    }
    return [...entries.values()].sort((a, b) => {
      const aTime = a.lastAt ? Date.parse(a.lastAt) : 0
      const bTime = b.lastAt ? Date.parse(b.lastAt) : 0
      return bTime - aTime || a.label.localeCompare(b.label) || a.route.localeCompare(b.route)
    })
  }, [content, data])

  const pageOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All pages' },
      ...pageEntries
        .filter((entry) => entry.revisions > 0)
        .map((entry) => ({
          value: entry.id,
          label: `${entry.label}${entry.route ? ` - ${entry.route}` : ''} (${entry.revisions})`,
        })),
    ]
  }, [pageEntries])

  const versions = useMemo(() => {
    if (!data) return []
    const cutoff = dateCutoff(dateRange)
    const needle = query.trim().toLowerCase()
    const filterEntry = pageEntries.find((entry) => entry.id === pageFilter) ?? null
    const filtered = data.revisions.filter((revision) => {
      if (filterEntry && !revisionMatchesEntry(revision, filterEntry)) {
        return false
      }
      if (authorFilter !== 'all' && revision.author !== authorFilter) return false
      if (cutoff !== null && Date.parse(revision.createdAt) < cutoff) return false
      if (!needle) return true
      return [
        `v${revision.version}`,
        revision.author,
        revision.note,
        ...revision.stats.pages.map((page) => page.label),
        ...revision.changes.flatMap((change) => [
          change.field,
          change.path,
          change.before,
          change.after,
          change.pageLabel,
        ]),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })

    return filtered.sort((a, b) => {
      if (sort === 'oldest') return Date.parse(a.createdAt) - Date.parse(b.createdAt)
      if (sort === 'changes') {
        return b.stats.totalChanges - a.stats.totalChanges || b.version - a.version
      }
      return Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.version - a.version
    })
  }, [data, pageEntries, dateRange, query, pageFilter, authorFilter, sort])

  const pageCount = Math.max(1, Math.ceil(versions.length / PAGE_SIZE))
  const safePage = Math.min(versionPage, pageCount)
  const pagedVersions = versions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const visiblePages = useMemo(() => {
    const needle = pageQuery.trim().toLowerCase()
    if (!needle) return pageEntries
    return pageEntries.filter((entry) =>
      `${entry.label} ${entry.id} ${entry.description} ${entry.route}`
        .toLowerCase()
        .includes(needle),
    )
  }, [pageEntries, pageQuery])

  const trackedPages = pageEntries.filter((entry) => entry.revisions > 0).length
  const changedRevisions =
    data?.revisions.filter((revision) => revision.stats.totalChanges > 0).length ?? 0
  const oldestVersion = data?.revisions.at(-1)?.version
  const activePage = pageEntries.find((entry) => entry.id === activePageId) ?? null
  const activePageRevisions = useMemo(() => {
    if (!data || !activePage) return []
    return data.revisions.flatMap((revision) => {
      if (!revisionMatchesEntry(revision, activePage)) return []
      const pageChanges =
        activePage.kind === 'detail'
          ? revision.changes.filter((change) => changeMatchesEntry(change, activePage))
          : revision.changes.filter((change) => change.pageId === activePage.revisionId)
      if (activePage.kind === 'detail' && !pageChanges.length) return []
      return [
        {
          revision,
          pageStat:
            activePage.kind === 'detail'
              ? null
              : (revision.stats.pages.find((page) => page.id === activePage.revisionId) ?? null),
          pageChanges,
        },
      ]
    })
  }, [data, activePage])

  useRecordDeepLink({
    param: 'version',
    records: data?.revisions ?? [],
    resolve: (value) =>
      (data?.revisions ?? []).find((revision) => String(revision.version) === value),
    onOpen: setDetailRevision,
  })

  const ledgerSuggestions = useMemo(
    () =>
      (data?.revisions ?? []).map((revision) => ({
        id: String(revision.version),
        label: `v${revision.version} · ${revision.note || 'Content update'}`,
        value: `v${revision.version}`,
        description: `${revision.author} · ${revision.stats.pages.map((page) => page.label).join(', ')}`,
        meta: `${revision.stats.totalChanges} changes`,
        keywords: revision.changes
          .flatMap((change) => [change.field, change.path, change.before, change.after])
          .join(' '),
        icon: 'refresh' as const,
      })),
    [data],
  )

  const pageSuggestions = useMemo(
    () =>
      pageEntries.map((entry) => ({
        id: entry.id,
        label: entry.label,
        value: entry.label,
        description: `${entry.description}${entry.route ? ` · ${entry.route}` : ''}`,
        meta: `${entry.revisions} revisions`,
        keywords: `${entry.id} ${entry.description} ${entry.route}`,
        icon: 'tag' as const,
      })),
    [pageEntries],
  )

  const resetFilters = () => {
    setQuery('')
    setPageFilter('all')
    setAuthorFilter('all')
    setDateRange('all')
    setSort('newest')
  }

  const openRestore = (request: RestoreRequest) => {
    setRestoreError('')
    setRestore(request)
  }

  const performRestore = async () => {
    if (!restore || !data) return
    setRestoring(true)
    setRestoreError('')
    try {
      const result = await adminApi.restoreContentVersion(
        restore.revision.version,
        restore.pageId,
        restore.paths,
      )
      setRestore(null)
      setDetailRevision(null)
      setExpandedVersion(null)
      setSelection(new Set())
      window.dispatchEvent(new Event('hvac-content-updated'))
      await load()
      toast({
        title: result.meta.changed ? 'Restore published' : 'Already up to date',
        description: result.meta.changed
          ? `v${result.data.version} is now live. The previous snapshot remains in history.`
          : 'The selected content already matches the live site.',
        tone: result.meta.changed ? 'success' : 'info',
      })
    } catch (caught) {
      setRestoreError(caught instanceof Error ? caught.message : 'Could not restore this content.')
    } finally {
      setRestoring(false)
    }
  }

  const openPage = (pageId: string) => {
    const entry =
      pageEntries.find((candidate) => candidate.id === pageId) ??
      pageEntries.find((candidate) => candidate.revisionId === pageId)
    setActivePageId(entry?.id ?? pageId)
    setExpandedVersion(null)
    setSelection(new Set())
  }

  const toggleExpanded = (version: number) => {
    setExpandedVersion((current) => (current === version ? null : version))
    setSelection(new Set())
  }

  const pageChangedPaths = (changes: ContentRevisionChange[]) =>
    changes.filter((change) => change.kind === 'changed').map((change) => change.path)

  const togglePath = (path: string) => {
    setSelection((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const detailGroups = detailRevision ? groupChanges(detailRevision.changes) : []

  return (
    <div className="flex flex-col gap-6 pb-16">
      <AdminPageHeader
        eyebrow="Content control · CV-HISTORY"
        title="Every change, reversible."
        description="One controlled ledger for every published page, field and SEO value. Inspect the exact before/after, move page by page, and restore a complete version, one page, or selected fields. Every restore publishes a new version and keeps the old snapshot."
        actions={
          <>
            <Link
              to={back.to}
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              <Icon name="arrow-right" size={12} className="rotate-180" />
              {back.label}
            </Link>
            <Link
              to="/"
              target="_blank"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              <Icon name="external" size={12} />
              View site
            </Link>
            <Button variant="secondary" icon="refresh" onClick={() => void load()}>
              Refresh ledger
            </Button>
          </>
        }
      />

      {error ? <InlineError message={error} /> : null}

      {loading || !data ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse border border-line bg-panel/30" />
            ))}
          </div>
          <AdminLoading rows={7} />
        </div>
      ) : (
        <>
          <section className="border border-cold/25 bg-cold/[0.03]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="cold" dot>
                  Live v{data.currentVersion}
                </Badge>
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  {data.total} immutable restore points · {trackedPages} tracked pages
                </span>
              </div>
              <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                <Icon name="shield" size={11} className="text-success" />
                Restores never delete history
              </span>
            </div>
            <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
              <div className="bg-panel/45 px-4 py-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  Current live
                </span>
                <p className="t-num mt-2 text-[26px] leading-none text-cold">
                  v{data.currentVersion}
                </p>
                <p className="mt-1 text-[10px] text-fg-faint">Public site + CMS content</p>
              </div>
              <div className="bg-panel/45 px-4 py-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  Restore points
                </span>
                <p className="t-num mt-2 text-[26px] leading-none text-fg">{data.total}</p>
                <p className="mt-1 text-[10px] text-fg-faint">Snapshots retained in the ledger</p>
              </div>
              <div className="bg-panel/45 px-4 py-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  Published changes
                </span>
                <p className="t-num mt-2 text-[26px] leading-none text-warn">{changedRevisions}</p>
                <p className="mt-1 text-[10px] text-fg-faint">Versions with field-level changes</p>
              </div>
              <div className="bg-panel/45 px-4 py-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  Retained from
                </span>
                <p className="t-num mt-2 text-[26px] leading-none text-fg">
                  {oldestVersion ? `v${oldestVersion}` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-fg-faint">Oldest available restore point</p>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTab('versions')}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em]',
                  tab === 'versions'
                    ? 'border-cold text-cold'
                    : 'border-transparent text-fg-faint hover:text-fg',
                )}
              >
                Versions
                <span className="border border-line px-1.5 py-0.5 text-[8px] text-fg-faint">
                  {data.revisions.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('pages')
                  setActivePageId(null)
                }}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em]',
                  tab === 'pages'
                    ? 'border-cold text-cold'
                    : 'border-transparent text-fg-faint hover:text-fg',
                )}
              >
                Page by page
                <span className="border border-line px-1.5 py-0.5 text-[8px] text-fg-faint">
                  {pageEntries.length}
                </span>
              </button>
            </div>
            <span className="pb-2 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
              {tab === 'versions'
                ? 'Complete ledger'
                : activePage
                  ? `Timeline · ${activePage.label}`
                  : 'Pick a page to inspect its timeline'}
            </span>
          </div>

          {tab === 'versions' ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 border border-line bg-panel/25 p-4">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_170px_150px_160px]">
                  <SearchSuggest
                    label="Search ledger"
                    value={query}
                    onChange={setQuery}
                    suggestions={ledgerSuggestions}
                    onSelect={(suggestion) => {
                      setQuery(suggestion.value ?? suggestion.label)
                      const revision = data?.revisions.find(
                        (entry) => String(entry.version) === suggestion.id,
                      )
                      if (revision) setDetailRevision(revision)
                    }}
                    placeholder="Version, author, page, field, before/after copy"
                    emptyMessage="No revision matches that version, author or field."
                  />
                  <Select
                    label="Page"
                    value={pageFilter}
                    onChange={(event) => setPageFilter(event.target.value)}
                    options={pageOptions}
                  />
                  <Select
                    label="Author"
                    value={authorFilter}
                    onChange={(event) => setAuthorFilter(event.target.value)}
                    options={[
                      { value: 'all', label: 'All authors' },
                      ...authors.map((author) => ({ value: author, label: author })),
                    ]}
                  />
                  <Select
                    label="Date"
                    value={dateRange}
                    onChange={(event) => setDateRange(event.target.value as DateRange)}
                    options={dateOptions}
                  />
                  <Select
                    label="Sort"
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortMode)}
                    options={sortOptions}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{versions.length} matching</Badge>
                    {query ||
                    pageFilter !== 'all' ||
                    authorFilter !== 'all' ||
                    dateRange !== 'all' ? (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="font-mono text-[9px] uppercase tracking-[0.08em] text-cold hover:text-fg"
                      >
                        Reset filters
                      </button>
                    ) : null}
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                    {versions.length
                      ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, versions.length)} of ${versions.length}`
                      : 'No results'}
                  </span>
                </div>
              </div>

              {versions.length === 0 ? (
                <EmptyState
                  icon="filter"
                  title="No revisions match these filters."
                  description="Try a broader date range, another page, or clear the search."
                  action={
                    <Button variant="secondary" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <>
                  <div className="overflow-x-auto border border-line bg-panel/20">
                    <table className="w-full min-w-[920px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-line bg-base/40 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                          <th className="px-3 py-2.5 font-normal">Version</th>
                          <th className="px-3 py-2.5 font-normal">Published</th>
                          <th className="px-3 py-2.5 font-normal">Author</th>
                          <th className="px-3 py-2.5 font-normal">Pages</th>
                          <th className="px-3 py-2.5 font-normal">Changes</th>
                          <th className="px-3 py-2.5 font-normal">Note</th>
                          <th className="px-3 py-2.5 text-right font-normal">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/70">
                        {pagedVersions.map((revision) => {
                          const current = revision.version === data.currentVersion
                          const baseline = revision.stats.totalChanges === 0
                          return (
                            <tr
                              key={revision.id}
                              className={cn(
                                'align-top transition-colors hover:bg-cold/[0.025]',
                                current && 'bg-cold/[0.035]',
                              )}
                            >
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'font-mono text-[12px]',
                                      current ? 'text-cold' : 'text-fg',
                                    )}
                                  >
                                    v{revision.version}
                                  </span>
                                  {current ? (
                                    <Badge tone="success" dot>
                                      Live
                                    </Badge>
                                  ) : null}
                                  {baseline ? <Badge tone="neutral">Baseline</Badge> : null}
                                </div>
                                {revision.previousVersion ? (
                                  <span className="mt-1 block font-mono text-[8px] text-fg-faint">
                                    from v{revision.previousVersion}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2.5 text-[10px] text-fg-dim">
                                {formatDateTime(revision.createdAt)}
                              </td>
                              <td className="max-w-[150px] truncate px-3 py-2.5 text-[10px] text-fg-dim">
                                {revision.author}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex max-w-[240px] flex-wrap gap-1">
                                  {revision.stats.pages.slice(0, 3).map((page) => (
                                    <button
                                      key={page.id}
                                      type="button"
                                      onClick={() => {
                                        setTab('pages')
                                        openPage(page.id)
                                      }}
                                      className="border border-line px-1.5 py-0.5 font-mono text-[8px] text-fg-dim hover:border-cold/40 hover:text-cold"
                                    >
                                      {page.label} · {page.count}
                                    </button>
                                  ))}
                                  {revision.stats.pages.length > 3 ? (
                                    <span className="px-1 py-0.5 font-mono text-[8px] text-fg-faint">
                                      +{revision.stats.pages.length - 3} pages
                                    </span>
                                  ) : null}
                                  {revision.stats.pages.length === 0 ? (
                                    <span className="text-[10px] text-fg-faint">No page scope</span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="font-mono text-[10px] text-fg">
                                  {revision.stats.totalChanges}
                                </span>
                                <span className="mt-1 block text-[9px] text-fg-faint">
                                  {revision.stats.sections.length} sections
                                </span>
                              </td>
                              <td className="max-w-[180px] px-3 py-2.5 text-[10px] leading-relaxed text-fg-dim">
                                <span className="line-clamp-2" title={revision.note}>
                                  {revision.note}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <TableActions>
                                  <RecordViewButton
                                    label={`version ${revision.version}`}
                                    onClick={() => setDetailRevision(revision)}
                                  />
                                  {!current && !baseline ? (
                                    <TableActionButton
                                      label={`Restore version ${revision.version}`}
                                      icon="refresh"
                                      tone="cold"
                                      onClick={() => openRestore({ mode: 'site', revision })}
                                    />
                                  ) : null}
                                </TableActions>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                      Snapshot table · every row is a complete restore point
                    </span>
                    <Pagination
                      page={safePage}
                      pageCount={pageCount}
                      onPageChange={setVersionPage}
                    />
                  </div>
                </>
              )}
            </div>
          ) : activePage ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3 border border-line bg-panel/25 p-4">
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePageId(null)
                        setExpandedVersion(null)
                        setSelection(new Set())
                      }}
                      className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint hover:text-cold"
                    >
                      <Icon name="arrow-right" size={10} className="rotate-180" />
                      All pages
                    </button>
                    <h2 className="mt-2 text-[20px] text-fg">{activePage.label}</h2>
                    <p className="mt-1 max-w-[70ch] text-[11px] leading-relaxed text-fg-faint">
                      {activePage.description}
                      {activePage.lastAt
                        ? ` · last changed ${formatDateTime(activePage.lastAt)}`
                        : ''}
                    </p>
                    {activePage.id.startsWith('service:') ? (
                      <Link
                        to={`/admin/content?service=${encodeURIComponent(activePage.id.slice('service:'.length))}`}
                        className="mt-2 inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-cold hover:text-fg"
                      >
                        Edit service in content studio <Icon name="arrow-right" size={10} />
                      </Link>
                    ) : null}
                  </div>
                  <Badge tone={activePage.revisions ? 'cold' : 'neutral'}>
                    {activePage.revisions} {activePage.revisions === 1 ? 'revision' : 'revisions'}
                  </Badge>
                </div>

                {activePageRevisions.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      icon="clock"
                      title="No changes for this page yet."
                      description="Publish a change in the content studio and its first restore point will appear here."
                    />
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-3">
                    {activePageRevisions.map(({ revision, pageStat, pageChanges }) => {
                      const current = revision.version === data.currentVersion
                      const expanded = expandedVersion === revision.version
                      const changedPaths = pageChangedPaths(pageChanges)
                      const selectedCount = selection.size
                      const allSelected =
                        changedPaths.length > 0 && selectedCount === changedPaths.length
                      return (
                        <article
                          key={revision.id}
                          className={cn(
                            'border bg-panel/20',
                            current ? 'border-cold/40' : 'border-line',
                          )}
                        >
                          <div className="flex flex-col gap-3 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex min-w-0 gap-3">
                                <div
                                  className={cn(
                                    'flex h-11 w-14 shrink-0 flex-col items-center justify-center border font-mono',
                                    current
                                      ? 'border-cold/50 bg-cold/[0.06] text-cold'
                                      : 'border-line bg-panel text-fg-dim',
                                  )}
                                >
                                  <span className="text-[8px] uppercase tracking-[0.08em] opacity-70">
                                    version
                                  </span>
                                  <span className="text-[14px] leading-none">
                                    v{revision.version}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-[13px] text-fg">
                                      {pageStat?.count ?? pageChanges.length}{' '}
                                      {(pageStat?.count ?? pageChanges.length) === 1
                                        ? 'field'
                                        : 'fields'}{' '}
                                      on {activePage.label}
                                    </h3>
                                    {current ? (
                                      <Badge tone="success" dot>
                                        Live
                                      </Badge>
                                    ) : null}
                                    {revision.previousVersion ? (
                                      <span className="font-mono text-[8px] text-fg-faint">
                                        from v{revision.previousVersion}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-[10px] text-fg-faint">
                                    {formatDateTime(revision.createdAt)} · {revision.author} ·{' '}
                                    {revision.note}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {pageChanges.length ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpanded(revision.version)}
                                    className="flex h-8 items-center gap-1.5 border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim hover:border-cold/50 hover:text-cold"
                                  >
                                    {expanded ? 'Hide fields' : 'Review fields'}
                                    <Icon
                                      name="chevron-down"
                                      size={11}
                                      className={cn(
                                        'transition-transform',
                                        expanded && 'rotate-180',
                                      )}
                                    />
                                  </button>
                                ) : null}
                                {!current ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openRestore({
                                          mode: 'page',
                                          revision,
                                          pageId: activePage.restorePageId,
                                          pageLabel: activePage.label,
                                          pageCount: pageChanges.length,
                                        })
                                      }
                                      className="flex h-8 items-center border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim hover:border-cold/50 hover:text-cold"
                                    >
                                      Restore page
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openRestore({ mode: 'site', revision })}
                                      className="flex h-8 items-center border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim hover:border-cold/50 hover:text-cold"
                                    >
                                      Restore all
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            {expanded && pageChanges.length ? (
                              <div className="border-t border-line/70 pt-3">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                                    {changedPaths.length} individually restorable fields
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelection(
                                          allSelected ? new Set() : new Set(changedPaths),
                                        )
                                      }
                                      className="font-mono text-[8px] uppercase tracking-[0.08em] text-cold hover:text-fg"
                                    >
                                      {allSelected ? 'Clear selection' : 'Select all changed'}
                                    </button>
                                    {selectedCount ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openRestore({
                                            mode: 'fields',
                                            revision,
                                            pageId: activePage.revisionId,
                                            pageLabel: activePage.label,
                                            paths: [...selection],
                                          })
                                        }
                                        className="flex h-7 items-center border border-cold/50 bg-cold/[0.06] px-2 font-mono text-[8px] uppercase tracking-[0.08em] text-cold hover:bg-cold/15"
                                      >
                                        Restore {selectedCount} selected
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="divide-y divide-line/70 border border-line">
                                  {pageChanges.map((change) => {
                                    const selectable = change.kind === 'changed'
                                    return (
                                      <div
                                        key={change.path}
                                        className="grid gap-2 px-3 py-2.5 lg:grid-cols-[24px_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]"
                                      >
                                        <input
                                          type="checkbox"
                                          aria-label={`Select ${change.field}`}
                                          disabled={!selectable}
                                          checked={selection.has(change.path)}
                                          onChange={() => togglePath(change.path)}
                                          className="mt-0.5 h-3.5 w-3.5 accent-[rgb(var(--cold))] disabled:opacity-30"
                                        />
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-[11px] text-fg">
                                              {change.field}
                                            </span>
                                            {change.kind !== 'changed' ? (
                                              <Badge tone={changeTone(change)}>{change.kind}</Badge>
                                            ) : null}
                                          </div>
                                          <code className="mt-1 block break-all font-mono text-[8px] text-fg-faint">
                                            {change.path}
                                          </code>
                                          {!selectable ? (
                                            <span className="mt-1 block text-[9px] text-fg-faint">
                                              Restore the page to add or remove records atomically.
                                            </span>
                                          ) : null}
                                        </div>
                                        <ChangeValue
                                          label="Before"
                                          value={change.before}
                                          tone="before"
                                        />
                                        <ChangeValue
                                          label="After"
                                          value={change.after}
                                          tone="after"
                                        />
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>

              <aside className="flex flex-col gap-3">
                <div className="border border-line bg-panel/30 p-4">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Page timeline
                  </span>
                  <dl className="mt-3 flex flex-col gap-2 text-[11px]">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-fg-faint">Revisions</dt>
                      <dd className="font-mono text-fg">{activePage.revisions}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-fg-faint">Fields changed</dt>
                      <dd className="font-mono text-fg">{activePage.changes}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-fg-faint">Last version</dt>
                      <dd className="font-mono text-cold">
                        {activePage.lastVersion ? `v${activePage.lastVersion}` : '—'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-fg-faint">Last changed</dt>
                      <dd className="text-right text-fg">
                        {activePage.lastAt ? formatDateTime(activePage.lastAt) : 'No changes'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="border border-line bg-panel/20 p-4">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Restore options
                  </span>
                  <div className="mt-3 flex flex-col gap-2 text-[10px] leading-relaxed text-fg-dim">
                    <p>
                      <strong className="text-fg">Restore page</strong> replaces only this page and
                      leaves every other page live.
                    </p>
                    <p>
                      <strong className="text-fg">Restore all</strong> replaces the complete site
                      with that version.
                    </p>
                    <p>
                      <strong className="text-fg">Selected fields</strong> restores only changed
                      fields that still exist on the live page. Added or removed records use page
                      restore so they stay valid.
                    </p>
                  </div>
                </div>
                <div className="border border-cold/25 bg-cold/[0.03] p-4">
                  <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cold">
                    <Icon name="shield" size={12} /> Safe by design
                  </span>
                  <p className="mt-2 text-[10px] leading-relaxed text-fg-dim">
                    Restores publish a new version. The old snapshot, author and diff remain in the
                    ledger, so a restore can itself be reviewed or undone.
                  </p>
                </div>
              </aside>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3 border border-line bg-panel/25 p-4">
                <div className="min-w-[240px] flex-1">
                  <SearchSuggest
                    label="Search pages"
                    value={pageQuery}
                    onChange={setPageQuery}
                    suggestions={pageSuggestions}
                    onSelect={(suggestion) => {
                      setPageQuery(suggestion.label)
                      setActivePageId(suggestion.id)
                    }}
                    placeholder="Page name, path or purpose"
                    emptyMessage="No page matches that name or purpose."
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pb-0.5">
                  <Badge tone="neutral">{visiblePages.length} pages</Badge>
                  <Badge tone="cold">{trackedPages} with history</Badge>
                </div>
              </div>

              {visiblePages.length === 0 ? (
                <EmptyState
                  icon="filter"
                  title="No pages match this search."
                  description="Try another page name or clear the search."
                  action={
                    <Button variant="secondary" onClick={() => setPageQuery('')}>
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visiblePages.map((entry) => (
                    <PageCard key={entry.id} entry={entry} onOpen={() => openPage(entry.id)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Modal
        open={detailRevision !== null}
        onClose={() => setDetailRevision(null)}
        title={detailRevision ? `Review v${detailRevision.version}` : 'Review revision'}
        description={
          detailRevision
            ? `${formatDateTime(detailRevision.createdAt)} · ${detailRevision.author} · ${detailRevision.note}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" icon="chevron-left" onClick={() => setDetailRevision(null)}>
              Back
            </Button>
            <Button variant="quiet" onClick={() => setDetailRevision(null)}>
              Cancel
            </Button>
            {detailRevision &&
            detailRevision.version !== data?.currentVersion &&
            detailRevision.stats.totalChanges > 0 ? (
              <Button
                variant="secondary"
                icon="refresh"
                onClick={() => {
                  openRestore({ mode: 'site', revision: detailRevision })
                  setDetailRevision(null)
                }}
              >
                Restore entire v{detailRevision.version}
              </Button>
            ) : null}
          </div>
        }
      >
        {detailRevision ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2 border border-line bg-panel/40 p-3 text-[11px] sm:grid-cols-3">
              <div>
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  Version
                </span>
                <p className="mt-0.5 font-mono text-fg">v{detailRevision.version}</p>
              </div>
              <div>
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  Changed fields
                </span>
                <p className="mt-0.5 font-mono text-fg">{detailRevision.stats.totalChanges}</p>
              </div>
              <div>
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  Pages touched
                </span>
                <p className="mt-0.5 font-mono text-fg">{detailRevision.stats.pages.length}</p>
              </div>
            </div>

            {detailRevision.stats.totalChanges === 0 ? (
              <p className="border border-line bg-panel/30 px-4 py-3 text-[11px] leading-relaxed text-fg-faint">
                Baseline snapshot. Earlier versions were published before the ledger began; every
                save from here is recorded with a field-level diff.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {detailGroups.map((group) => (
                  <section key={group.id} className="border border-line">
                    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel/40 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg">
                          {group.label}
                        </span>
                        <span className="font-mono text-[8px] text-fg-faint">
                          {group.changes.length} {group.changes.length === 1 ? 'field' : 'fields'}
                        </span>
                      </div>
                      {detailRevision.version !== data?.currentVersion ? (
                        <button
                          type="button"
                          onClick={() => {
                            openRestore({
                              mode: 'page',
                              revision: detailRevision,
                              pageId: group.id,
                              pageLabel: group.label,
                            })
                            setDetailRevision(null)
                          }}
                          className="font-mono text-[8px] uppercase tracking-[0.08em] text-cold hover:text-fg"
                        >
                          Restore this page
                        </button>
                      ) : null}
                    </header>
                    <div className="divide-y divide-line/70">
                      {group.changes.map((change) => (
                        <div
                          key={change.path}
                          className="grid gap-2 px-3 py-2.5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1fr)]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] text-fg">{change.field}</span>
                              {change.kind !== 'changed' ? (
                                <Badge tone={changeTone(change)}>{change.kind}</Badge>
                              ) : null}
                            </div>
                            <code className="mt-1 block break-all font-mono text-[8px] text-fg-faint">
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
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={restore !== null}
        onClose={() => {
          if (restoring) return
          setRestore(null)
        }}
        title={
          restore?.mode === 'site'
            ? `Restore complete v${restore.revision.version}`
            : restore?.mode === 'page'
              ? `Restore ${restore.pageLabel ?? 'page'}`
              : `Restore ${restore?.paths?.length ?? 0} selected fields`
        }
        description="Restoring publishes a new content version and keeps every snapshot in the ledger."
        size="md"
        footer={
          <>
            <Button variant="quiet" onClick={() => setRestore(null)} disabled={restoring}>
              Cancel
            </Button>
            <Button
              variant={restore?.mode === 'site' ? 'danger' : 'primary'}
              loading={restoring}
              onClick={() => void performRestore()}
              icon="refresh"
            >
              {restore?.mode === 'site'
                ? `Restore entire v${restore.revision.version}`
                : restore?.mode === 'page'
                  ? `Restore ${restore.pageLabel ?? 'page'}`
                  : `Restore ${restore?.paths?.length ?? 0} fields`}
            </Button>
          </>
        }
      >
        {restore ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2 border border-line bg-panel/40 p-4 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-fg-faint">Target snapshot</span>
                <span className="font-mono text-fg">v{restore.revision.version}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-fg-faint">Published</span>
                <span className="text-fg">{formatDateTime(restore.revision.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-fg-faint">Author</span>
                <span className="text-fg">{restore.revision.author}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-fg-faint">Scope</span>
                <span className="text-right text-fg">
                  {restore.mode === 'site'
                    ? `Complete site · ${restore.revision.stats.totalChanges} fields`
                    : restore.mode === 'page'
                      ? `${restore.pageLabel ?? 'Page'} · ${
                          restore.pageCount ??
                          restore.revision.stats.pages.find((page) => page.id === restore.pageId)
                            ?.count ??
                          0
                        } fields`
                      : `${restore.paths?.length ?? 0} selected fields on ${restore.pageLabel ?? 'page'}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-fg-faint">Will publish</span>
                <span className="font-mono text-cold">v{(data?.currentVersion ?? 0) + 1}</span>
              </div>
            </div>

            {restore.mode === 'site' ? (
              <div className="border border-warn/40 bg-warn/[0.06] px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-warn">
                  Complete site restore
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">
                  This replaces all live content — pages, collections, brand, legal and SEO — with v
                  {restore.revision.version}. Other modules such as invoices, quotations, CRM and
                  newsletters are not affected.
                </p>
              </div>
            ) : restore.mode === 'page' ? (
              <p className="text-[12px] leading-relaxed text-fg-dim">
                Only <strong className="text-fg">{restore.pageLabel}</strong> will be replaced.
                Every other page keeps its current live content.
              </p>
            ) : (
              <p className="text-[12px] leading-relaxed text-fg-dim">
                Only the selected changed fields will be restored. Added or removed records are not
                included; use page restore if those need to come back together.
              </p>
            )}

            <p className="text-[11px] leading-relaxed text-fg-faint">
              The live version becomes{' '}
              <span className="font-mono text-fg">v{(data?.currentVersion ?? 0) + 1}</span>. The
              previous version stays available in the ledger, and this restore is recorded as a new
              revision.
            </p>

            {restoreError ? <InlineError message={restoreError} /> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
