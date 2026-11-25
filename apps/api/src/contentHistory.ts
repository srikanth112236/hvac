import { randomUUID } from 'node:crypto'
import {
  contentPageLabel,
  diffContent,
  siteContentPayloadSchema,
  summarizeContentChanges,
  type ContentRevision,
  type ContentRevisionChange,
  type ContentRevisionList,
  type ContentRevisionMeta,
  type SiteContent,
  type SiteContentPayload,
  type SitePageSections,
  type SitePages,
} from '@hvac/shared'
import { contentStore, readSiteContent } from './content.js'
import { createStore } from './store.js'

const revisionStore = createStore<ContentRevision[]>('content-revisions.json', () => [])
const MAX_REVISIONS = 500

function appendRevision(records: ContentRevision[], revision: ContentRevision): ContentRevision[] {
  const next = [...records, revision].sort((a, b) => a.version - b.version)
  return next.length > MAX_REVISIONS ? next.slice(next.length - MAX_REVISIONS) : next
}

let queue: Promise<void> = Promise.resolve()

function serialise<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function nowIso(): string {
  return new Date().toISOString()
}

function toPayload(content: SiteContent): SiteContentPayload {
  return {
    brand: content.brand,
    home: content.home,
    about: content.about,
    workCases: content.workCases,
    processStages: content.processStages,
    processExtras: content.processExtras,
    aboutSections: content.aboutSections,
    amcDetails: content.amcDetails,
    testimonials: content.testimonials,
    equipmentBrands: content.equipmentBrands,
    posts: content.posts,
    products: content.products,
    legal: content.legal,
    pages: content.pages,
    pageSections: content.pageSections,
    services: content.services,
    plans: content.plans,
    faqs: content.faqs,
    seo: content.seo,
  }
}

function revisionMeta(revision: ContentRevision): ContentRevisionMeta {
  return {
    id: revision.id,
    version: revision.version,
    previousVersion: revision.previousVersion,
    createdAt: revision.createdAt,
    author: revision.author,
    note: revision.note,
    stats: revision.stats,
    changes: revision.changes,
  }
}

function buildRevision(
  content: SiteContent,
  previous: SiteContent | null,
  changes: ContentRevisionChange[],
  author: string,
  note: string,
): ContentRevision {
  return {
    id: randomUUID(),
    version: content.version,
    previousVersion: previous?.version ?? null,
    createdAt: content.updatedAt,
    author,
    note,
    stats: summarizeContentChanges(changes),
    changes,
    content,
  }
}

/**
 * Make sure the live version is represented in the ledger. The first call after
 * this feature ships creates a baseline from `content.json`; later calls repair
 * the ledger if content was ever written outside the normal save route.
 */
async function ensureBaseline(
  current: SiteContent,
  records: ContentRevision[],
): Promise<ContentRevision[]> {
  if (records.some((record) => record.version === current.version)) return records

  const prior = [...records]
    .filter((record) => record.version < current.version)
    .sort((a, b) => b.version - a.version)[0]
  const changes = prior ? diffContent(prior.content, current) : []
  const baseline = buildRevision(
    current,
    prior?.content ?? null,
    changes,
    'System',
    prior
      ? 'Recovered snapshot for the live content version'
      : 'Revision history began with this version',
  )
  const next = [...records, baseline].sort((a, b) => a.version - b.version)
  await revisionStore.write(next)
  return next
}

function withPageCopy<K extends keyof SitePages>(
  base: SitePages,
  target: SitePages,
  key: K,
): SitePages {
  return { ...base, [key]: target[key] }
}

function withSectionCopy<K extends keyof SitePageSections>(
  base: SitePageSections,
  target: SitePageSections,
  key: K,
): SitePageSections {
  return { ...base, [key]: target[key] }
}

function upsertRecord<T extends { id: string }>(current: T[], record: T): T[] {
  const exists = current.some((entry) => entry.id === record.id)
  return exists
    ? current.map((entry) => (entry.id === record.id ? record : entry))
    : [...current, record]
}

/** Restore one collection record without replacing its sibling records. */
export function restoreRecordPayload(
  base: SiteContentPayload,
  old: SiteContentPayload,
  pageId: string,
): SiteContentPayload | null {
  const prefixes = {
    'service:': 'services',
    'work-case:': 'workCases',
    'product:': 'products',
    'plan:': 'plans',
    'post:': 'posts',
  } as const
  for (const [prefix, root] of Object.entries(prefixes)) {
    if (!pageId.startsWith(prefix)) continue
    const id = pageId.slice(prefix.length)
    if (!id) return null
    const target = (old[root] as { id: string }[]).find((entry) => entry.id === id)
    if (!target) return null
    if (root === 'services') {
      return {
        ...base,
        services: upsertRecord(base.services, target as SiteContentPayload['services'][number]),
      }
    }
    if (root === 'workCases') {
      return {
        ...base,
        workCases: upsertRecord(base.workCases, target as SiteContentPayload['workCases'][number]),
      }
    }
    if (root === 'products') {
      return {
        ...base,
        products: upsertRecord(base.products, target as SiteContentPayload['products'][number]),
      }
    }
    if (root === 'plans') {
      return {
        ...base,
        plans: upsertRecord(base.plans, target as SiteContentPayload['plans'][number]),
      }
    }
    return {
      ...base,
      posts: upsertRecord(base.posts, target as SiteContentPayload['posts'][number]),
    }
  }
  return null
}

function recordPageLabel(pageId: string, content: SiteContent): string | null {
  const prefixes = [
    ['service:', 'services', 'name'],
    ['work-case:', 'workCases', 'name'],
    ['product:', 'products', 'name'],
    ['plan:', 'plans', 'name'],
    ['post:', 'posts', 'title'],
  ] as const
  for (const [prefix, root, labelKey] of prefixes) {
    if (!pageId.startsWith(prefix)) continue
    const id = pageId.slice(prefix.length)
    const record = (content[root] as unknown as Record<string, unknown>[]).find(
      (entry) => entry.id === id,
    )
    return typeof record?.[labelKey] === 'string' ? String(record[labelKey]) : null
  }
  return null
}

/** Replace only the content owned by one page, leaving every other page live. */
function restorePagePayload(
  current: SiteContent,
  target: SiteContent,
  pageId: string,
): SiteContentPayload | null {
  const base = toPayload(current)
  const old = toPayload(target)
  const record = restoreRecordPayload(base, old, pageId)
  if (record) return record

  switch (pageId) {
    case 'home':
      return { ...base, home: old.home }
    case 'about':
      return {
        ...base,
        about: old.about,
        aboutSections: old.aboutSections,
        pageSections: withSectionCopy(base.pageSections, old.pageSections, 'about'),
      }
    case 'services':
      return {
        ...base,
        services: old.services,
        pages: withPageCopy(base.pages, old.pages, 'services'),
        pageSections: withSectionCopy(base.pageSections, old.pageSections, 'services'),
      }
    case 'process':
      return {
        ...base,
        processStages: old.processStages,
        processExtras: old.processExtras,
        pages: withPageCopy(base.pages, old.pages, 'process'),
        pageSections: withSectionCopy(base.pageSections, old.pageSections, 'process'),
      }
    case 'work':
      return {
        ...base,
        workCases: old.workCases,
        pages: withPageCopy(base.pages, old.pages, 'work'),
        pageSections: withSectionCopy(base.pageSections, old.pageSections, 'work'),
      }
    case 'amc':
      return {
        ...base,
        amcDetails: old.amcDetails,
        plans: old.plans,
        pages: withPageCopy(base.pages, old.pages, 'amc'),
        pageSections: withSectionCopy(base.pageSections, old.pageSections, 'amc'),
      }
    case 'contact':
      return {
        ...base,
        pages: withPageCopy(base.pages, old.pages, 'contact'),
        pageSections: withSectionCopy(base.pageSections, old.pageSections, 'contact'),
      }
    case 'blog':
      return {
        ...base,
        posts: old.posts,
        pages: withPageCopy(base.pages, old.pages, 'blog'),
        pageSections: withSectionCopy(base.pageSections, old.pageSections, 'blog'),
      }
    case 'products':
      return {
        ...base,
        products: old.products,
        pages: withPageCopy(base.pages, old.pages, 'products'),
        pageSections: withSectionCopy(base.pageSections, old.pageSections, 'products'),
      }
    case 'brand':
      return { ...base, brand: old.brand }
    case 'voices':
      return {
        ...base,
        testimonials: old.testimonials,
        equipmentBrands: old.equipmentBrands,
      }
    case 'site':
      return { ...base, faqs: old.faqs }
    case 'legal':
      return {
        ...base,
        pageSections: withSectionCopy(base.pageSections, old.pageSections, 'legal'),
      }
    case 'seo':
      return { ...base, seo: old.seo }
    default: {
      if (!pageId.startsWith('legal:')) return null
      const slug = pageId.slice('legal:'.length)
      const document = old.legal.find((entry) => entry.slug === slug)
      if (!document) return null
      const exists = base.legal.some((entry) => entry.slug === slug)
      return {
        ...base,
        legal: exists
          ? base.legal.map((entry) => (entry.slug === slug ? document : entry))
          : [...base.legal, document],
      }
    }
  }
}

function stableArrayIndex(array: unknown[], segment: string): number {
  if (/^\d+$/.test(segment)) {
    const index = Number(segment)
    return index >= 0 && index < array.length ? index : -1
  }
  return array.findIndex((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const record = entry as { id?: unknown; slug?: unknown }
    return String(record.id ?? '') === segment || String(record.slug ?? '') === segment
  })
}

function valueAtPath(root: unknown, segments: string[]): { found: boolean; value?: unknown } {
  let current: unknown = root
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = stableArrayIndex(current, segment)
      if (index < 0) return { found: false }
      current = current[index]
      continue
    }
    if (!current || typeof current !== 'object') return { found: false }
    const record = current as Record<string, unknown>
    if (!(segment in record)) return { found: false }
    current = record[segment]
  }
  return { found: true, value: current }
}

function setExistingPath(root: unknown, segments: string[], value: unknown): boolean {
  if (!segments.length) return false
  let current: unknown = root
  for (const segment of segments.slice(0, -1)) {
    if (Array.isArray(current)) {
      const index = stableArrayIndex(current, segment)
      if (index < 0) return false
      current = current[index]
      continue
    }
    if (!current || typeof current !== 'object') return false
    const record = current as Record<string, unknown>
    if (!(segment in record)) return false
    current = record[segment]
  }

  const leaf = segments.at(-1)
  if (!leaf) return false
  if (Array.isArray(current)) {
    const index = stableArrayIndex(current, leaf)
    if (index < 0) return false
    current[index] = structuredClone(value)
    return true
  }
  if (current && typeof current === 'object') {
    ;(current as Record<string, unknown>)[leaf] = structuredClone(value)
    return true
  }
  return false
}

/**
 * Restore only leaf fields that still have a parent in the live document.
 * Added/removed records are deliberately rejected here: restoring one leaf of
 * a record that no longer exists would create invalid content. Those cases use
 * page or full-version restore so the record is restored atomically.
 */
export function restoreSelectedChanges(
  current: SiteContent,
  revision: ContentRevision,
  paths: string[],
): SiteContentPayload {
  const payload = structuredClone(toPayload(current)) as SiteContentPayload
  for (const path of paths) {
    const change = revision.changes.find((entry) => entry.path === path)
    if (!change) {
      throw new ContentRevisionError('One of the selected fields is not in this revision.', 400)
    }
    if (change.kind !== 'changed') {
      throw new ContentRevisionError(
        'Added or removed records must be restored as a whole page or complete version.',
        400,
      )
    }
    const segments = path.split('.')
    const targetValue = valueAtPath(revision.content, segments)
    if (!targetValue.found) {
      throw new ContentRevisionError('A selected field is missing from the revision snapshot.', 400)
    }
    if (!setExistingPath(payload, segments, targetValue.value)) {
      throw new ContentRevisionError(
        'A selected field no longer exists in the live content. Restore the page or complete version instead.',
        409,
      )
    }
  }

  const validation = siteContentPayloadSchema.safeParse(payload)
  if (!validation.success) {
    throw new ContentRevisionError(
      'Those fields cannot be restored on their own because the result would be invalid. Restore the page instead.',
      400,
    )
  }
  return validation.data
}

export class ContentRevisionError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ContentRevisionError'
    this.status = status
  }
}

export interface ContentWriteResult {
  content: SiteContent
  revision: ContentRevisionMeta | null
  changed: boolean
}

export async function listContentRevisions(): Promise<ContentRevisionList> {
  return serialise(async () => {
    const current = await readSiteContent()
    const records = await ensureBaseline(current, await revisionStore.read())
    const sorted = [...records].sort((a, b) => b.version - a.version)
    const pageCounts = new Map<string, { id: string; label: string; count: number }>()

    for (const revision of sorted) {
      for (const page of revision.stats.pages) {
        const existing = pageCounts.get(page.id)
        if (existing) existing.count += page.count
        else pageCounts.set(page.id, { ...page })
      }
    }

    return {
      revisions: sorted.map(revisionMeta),
      pages: [...pageCounts.values()].sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label),
      ),
      total: sorted.length,
      currentVersion: current.version,
    }
  })
}

export async function saveContentWithRevision(
  payload: SiteContentPayload,
  author: string,
  expectedVersion?: number,
): Promise<ContentWriteResult> {
  return serialise(async () => {
    const current = await readSiteContent()
    if (
      expectedVersion !== undefined &&
      Number.isInteger(expectedVersion) &&
      expectedVersion !== current.version
    ) {
      throw new ContentRevisionError(
        `This draft is based on v${expectedVersion}, but the live content is v${current.version}. Reload the content studio before publishing.`,
        409,
      )
    }
    const next: SiteContent = {
      ...payload,
      version: current.version + 1,
      updatedAt: nowIso(),
    }
    const records = await ensureBaseline(current, await revisionStore.read())
    const changes = diffContent(current, next)

    if (changes.length === 0) {
      return { content: current, revision: null, changed: false }
    }

    const revision = buildRevision(next, current, changes, author, 'Published content update')
    await contentStore.write(next)
    await revisionStore.write(appendRevision(records, revision))
    return { content: next, revision: revisionMeta(revision), changed: true }
  })
}

export async function restoreContentRevision(
  version: number,
  author: string,
  pageId?: string,
  paths?: string[],
): Promise<ContentWriteResult> {
  return serialise(async () => {
    const current = await readSiteContent()
    const records = await ensureBaseline(current, await revisionStore.read())
    const target = records.find((record) => record.version === version)
    if (!target) {
      throw new ContentRevisionError(`Version ${version} is not in the revision ledger.`, 404)
    }

    const selected = paths?.filter((path) => path.trim()).map((path) => path.trim()) ?? []
    if (selected.length) {
      const allowed = new Set(
        target.changes
          .filter((change) => !pageId || change.pageId === pageId)
          .filter((change) => change.kind === 'changed')
          .map((change) => change.path),
      )
      const rejected = selected.filter((path) => !allowed.has(path))
      if (rejected.length) {
        throw new ContentRevisionError(
          'One or more selected fields cannot be restored on their own. Restore the page instead.',
          400,
        )
      }
    }

    const payload = selected.length
      ? restoreSelectedChanges(current, target, selected)
      : pageId
        ? restorePagePayload(current, target.content, pageId)
        : toPayload(target.content)
    if (!payload) {
      throw new ContentRevisionError('That page cannot be restored from this revision.', 400)
    }

    const next: SiteContent = {
      ...payload,
      version: current.version + 1,
      updatedAt: nowIso(),
    }
    const changes = diffContent(current, next)
    if (changes.length === 0) {
      return { content: current, revision: null, changed: false }
    }

    const pageLabel =
      pageId &&
      (target.changes.find((change) => change.pageId === pageId)?.pageLabel ??
        recordPageLabel(pageId, target.content) ??
        contentPageLabel(pageId))
    const note = selected.length
      ? `Restored ${selected.length} field${selected.length === 1 ? '' : 's'}${
          pageLabel ? ` on ${pageLabel}` : ''
        } from v${version}`
      : pageId
        ? `Restored ${pageLabel} from v${version}`
        : `Restored the complete site from v${version}`
    const revision = buildRevision(next, current, changes, author, note)
    await contentStore.write(next)
    await revisionStore.write(appendRevision(records, revision))
    return { content: next, revision: revisionMeta(revision), changed: true }
  })
}
