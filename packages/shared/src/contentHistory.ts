import type { SiteContent, SiteContentPayload } from './site'

/** A publishable content document, without the live version metadata. */
export type ContentSnapshot = SiteContentPayload

export interface ContentPageRef {
  id: string
  label: string
}

export interface ContentRevisionChange {
  /** Stable dotted path into the content document, e.g. `home.heroTitle`. */
  path: string
  /** Human-readable field name, e.g. `Hero title`. */
  field: string
  pageId: string
  pageLabel: string
  sectionKey: string
  sectionLabel: string
  kind: 'added' | 'removed' | 'changed'
  before: string
  after: string
}

export interface ContentRevisionStats {
  totalChanges: number
  pages: (ContentPageRef & { count: number })[]
  sections: { key: string; label: string; count: number }[]
}

export interface ContentRevisionMeta {
  id: string
  /** The content version created by this revision. */
  version: number
  /** The version this snapshot replaced when it was published. */
  previousVersion: number | null
  createdAt: string
  author: string
  note: string
  stats: ContentRevisionStats
  changes: ContentRevisionChange[]
}

export interface ContentRevision extends ContentRevisionMeta {
  /** Complete old document. Every revision is a full restore point. */
  content: SiteContent
}

export interface ContentRevisionList {
  revisions: ContentRevisionMeta[]
  pages: (ContentPageRef & { count: number })[]
  total: number
  currentVersion: number
}

const PAGE_LABELS = {
  home: 'Home',
  about: 'About',
  services: 'Services',
  process: 'Process',
  work: 'Work',
  amc: 'AMC',
  contact: 'Contact',
  blog: 'Journal',
  products: 'Systems',
  legal: 'Legal pages',
  brand: 'Brand & contact',
  voices: 'Voices & brands',
  seo: 'SEO & social',
  site: 'Shared FAQs',
} as const

const SECTION_LABELS: Record<string, string> = {
  brand: 'Brand & contact',
  home: 'Home',
  about: 'About',
  workCases: 'Work cases',
  processStages: 'Process stages',
  processExtras: 'Process extras',
  aboutSections: 'About sections',
  amcDetails: 'AMC details',
  testimonials: 'Testimonials',
  equipmentBrands: 'Equipment brands',
  posts: 'Journal',
  products: 'Systems',
  legal: 'Legal pages',
  pages: 'Page heroes',
  pageSections: 'Page sections',
  services: 'Services',
  plans: 'AMC plans',
  faqs: 'Shared FAQs',
  seo: 'SEO & social',
}

const PAGE_KEYS = new Set(['home', 'about', 'services', 'process', 'work', 'amc', 'contact', 'blog', 'products'])
const SECTION_PAGE_ROOTS = new Set(['pages', 'pageSections'])

const ROOT_PAGE: Record<string, string> = {
  brand: 'brand',
  home: 'home',
  about: 'about',
  aboutSections: 'about',
  workCases: 'work',
  processStages: 'process',
  processExtras: 'process',
  amcDetails: 'amc',
  plans: 'amc',
  testimonials: 'voices',
  equipmentBrands: 'voices',
  posts: 'blog',
  products: 'products',
  services: 'services',
  faqs: 'site',
  seo: 'seo',
}

function pageRef(id: string, label?: string): ContentPageRef {
  return {
    id,
    label: label ?? PAGE_LABELS[id as keyof typeof PAGE_LABELS] ?? 'Content',
  }
}

export function contentPageLabel(id: string): string {
  if (id.startsWith('legal:')) return id.slice('legal:'.length) || 'Legal document'
  return PAGE_LABELS[id as keyof typeof PAGE_LABELS] ?? 'Content'
}

function pageForPath(
  path: string,
  before: ContentSnapshot,
  after: ContentSnapshot,
): ContentPageRef {
  const [root = '', second = ''] = path.split('.')

  if (SECTION_PAGE_ROOTS.has(root)) {
    if (second === 'legal') return pageRef('legal')
    if (PAGE_KEYS.has(second)) return pageRef(second)
  }

  if (root === 'legal') {
    const index = Number.parseInt(second, 10)
    const document = after.legal[index] ?? before.legal[index]
    if (document) {
      return { id: `legal:${document.slug}`, label: document.title || 'Legal document' }
    }
    return pageRef('legal')
  }

  const mapped = ROOT_PAGE[root]
  if (mapped) return pageRef(mapped)

  if (root === 'pages' || root === 'pageSections') return pageRef(root)
  return pageRef('site')
}

const ACRONYMS = new Map([
  ['seo', 'SEO'],
  ['faq', 'FAQ'],
  ['faqs', 'FAQs'],
  ['url', 'URL'],
  ['id', 'ID'],
  ['cta', 'CTA'],
  ['amc', 'AMC'],
  ['hvac', 'HVAC'],
  ['vrf', 'VRF'],
  ['api', 'API'],
])

function humanize(segment: string): string {
  const words = segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return segment
  const titled = words.map((word) => {
    const acronym = ACRONYMS.get(word.toLowerCase())
    if (acronym) return acronym
    return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
  })
  return titled.join(' ')
}

function fieldLabel(path: string): string {
  const parts = path.split('.')
  const leaf = parts.at(-1) ?? path
  if (/^\d+$/.test(leaf)) {
    const parent = parts.at(-2) ?? 'item'
    return `${humanize(parent.replace(/s$/, ''))} ${Number(leaf) + 1}`
  }
  return humanize(leaf)
}

function primitiveValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  if (typeof value === 'string') return value
  return String(value)
}

function stableArrayKey(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') return null
  const id = (entry as { id?: unknown }).id
  return typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id) ? id : null
}

function flatten(
  value: unknown,
  path: string,
  leaves: Map<string, string>,
): void {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      leaves.set(path, '[]')
      return
    }
    value.forEach((entry, index) => {
      // Content collections carry stable ids. Keying by id means adding,
      // removing or reordering articles does not falsely change every field
      // after the moved item.
      const key = stableArrayKey(entry) ?? String(index)
      flatten(entry, path ? `${path}.${key}` : key, leaves)
    })
    return
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      leaves.set(path, '{}')
      return
    }
    for (const [key, entry] of entries) {
      if (!path && (key === 'version' || key === 'updatedAt')) continue
      flatten(entry, path ? `${path}.${key}` : key, leaves)
    }
    return
  }

  leaves.set(path, primitiveValue(value))
}

function snapshotLeaves(content: ContentSnapshot): Map<string, string> {
  const leaves = new Map<string, string>()
  flatten(content, '', leaves)
  return leaves
}

function summarize(changes: ContentRevisionChange[]): ContentRevisionStats {
  const pages = new Map<string, ContentPageRef & { count: number }>()
  const sections = new Map<string, { key: string; label: string; count: number }>()

  for (const change of changes) {
    const page = pages.get(change.pageId)
    if (page) page.count += 1
    else pages.set(change.pageId, { id: change.pageId, label: change.pageLabel, count: 1 })

    const section = sections.get(change.sectionKey)
    if (section) section.count += 1
    else {
      sections.set(change.sectionKey, {
        key: change.sectionKey,
        label: change.sectionLabel,
        count: 1,
      })
    }
  }

  return {
    totalChanges: changes.length,
    pages: [...pages.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    sections: [...sections.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  }
}

/**
 * Field-level comparison of two complete content documents. Ordered arrays are
 * compared by position, so reordering journal articles or systems is visible
 * in the revision ledger instead of silently matching.
 */
export function diffContent(
  before: ContentSnapshot,
  after: ContentSnapshot,
): ContentRevisionChange[] {
  const previous = snapshotLeaves(before)
  const next = snapshotLeaves(after)
  const paths = new Set([...previous.keys(), ...next.keys()])
  const changes: ContentRevisionChange[] = []

  for (const path of paths) {
    const had = previous.has(path)
    const has = next.has(path)
    const beforeValue = previous.get(path) ?? ''
    const afterValue = next.get(path) ?? ''
    if (had && has && beforeValue === afterValue) continue

    const [root = ''] = path.split('.')
    const page = pageForPath(path, before, after)
    changes.push({
      path,
      field: fieldLabel(path),
      pageId: page.id,
      pageLabel: page.label,
      sectionKey: root || 'site',
      sectionLabel: SECTION_LABELS[root] ?? 'Other content',
      kind: !had ? 'added' : !has ? 'removed' : 'changed',
      before: beforeValue,
      after: afterValue,
    })
  }

  return changes.sort((a, b) => a.pageLabel.localeCompare(b.pageLabel) || a.path.localeCompare(b.path))
}

export function summarizeContentChanges(changes: ContentRevisionChange[]): ContentRevisionStats {
  return summarize(changes)
}

export function revisionMatchesPage(revision: ContentRevisionMeta, pageId: string): boolean {
  return revision.stats.pages.some((page) => page.id === pageId)
}
