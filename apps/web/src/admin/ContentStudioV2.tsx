import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  siteContentPayloadSchema,
  type SiteContent,
  type SiteContentPayload,
  type SiteServiceOverride,
} from '@hvac/shared'
import { Badge, Button, Input, Modal, Select, useToast } from '@/components/ui'
import { Icon } from '@/components/icons'
import { adminApi, ApiError } from '@/admin/api'
import { BrandTab, FaqsTab, PlansTab, SeoTab, ServicesTab } from '@/admin/AdminContent'
import {
  AboutSectionsTab,
  AmcTab,
  BillingTab,
  LegalTab,
  ProcessTab,
  ProductsTab,
  VoicesTab,
  WorkTab,
} from '@/admin/AdminContentCollections'
import { PageStudio } from '@/admin/PageStudio'
import { ContentThemeTab } from '@/admin/ContentThemeTab'
import { contentRegistry, collectionPages, singlePages } from '@/admin/contentRegistry'
import { normalizeStudioDraft } from '@/admin/contentStudioAdapter'
import { AdminLoading, AdminPageHeader, InlineError, formatDateTime } from '@/admin/ui'

type Workspace = 'pages' | 'brand' | 'billing' | 'seo'
type Update = (recipe: (current: SiteContent) => SiteContent) => void

const workspaces: { id: Workspace; label: string }[] = [
  { id: 'pages', label: 'Pages & sections' },
  { id: 'brand', label: 'Brand & contact' },
  { id: 'billing', label: 'Billing identity' },
  { id: 'seo', label: 'SEO & social' },
]

function payloadFor(draft: SiteContent): SiteContentPayload {
  return {
    brand: draft.brand,
    theme: draft.theme,
    home: draft.home,
    about: draft.about,
    workCases: draft.workCases,
    processStages: draft.processStages,
    processExtras: draft.processExtras,
    aboutSections: draft.aboutSections,
    amcDetails: draft.amcDetails,
    testimonials: draft.testimonials,
    equipmentBrands: draft.equipmentBrands,
    posts: draft.posts,
    products: draft.products,
    legal: draft.legal,
    pages: draft.pages,
    pageSections: draft.pageSections,
    services: draft.services,
    plans: draft.plans,
    faqs: draft.faqs,
    seo: draft.seo,
  }
}

const newService = (title: string, slug: string, index = '00'): SiteServiceOverride => ({
  id: slug,
  index,
  name: title,
  category: 'residential',
  capacity: '',
  timeline: '',
  specification: '',
  scope: '',
  headline: title,
  intro: '',
  startingFrom: '',
  warranty: '',
  published: false,
  includes: [],
  excludes: [],
  site: [],
  priceFactors: [],
  standards: [],
  specs: [],
  selection: [],
  steps: [],
  faqs: [],
})

function pageSlice(content: SiteContent, id: string): unknown {
  switch (id) {
    case 'home':
      return content.home
    case 'about':
      return [content.about, content.pageSections.about]
    case 'services':
      return [content.pages.services, content.pageSections.services]
    case 'process':
      return [content.pages.process, content.pageSections.process]
    case 'work':
      return [content.pages.work, content.pageSections.work]
    case 'amc':
      return [content.pages.amc, content.pageSections.amc]
    case 'blog':
      return [content.pages.blog, content.pageSections.blog]
    case 'products':
      return [content.pages.products, content.pageSections.products]
    case 'contact':
      return [content.pages.contact, content.pageSections.contact]
    case 'services-detail':
      return content.services
    case 'work-cases':
      return content.workCases
    case 'products-detail':
      return content.products
    case 'amc-plans':
      return content.plans
    case 'amc-details':
      return content.amcDetails
    case 'process-details':
      return [content.processStages, content.processExtras]
    case 'faqs':
      return content.faqs
    case 'legal':
      return content.legal
    case 'voices':
      return [content.testimonials, content.equipmentBrands]
    case 'about-sections':
      return content.aboutSections
    default:
      return null
  }
}

function pageHasDraft(content: SiteContent, published: SiteContent | null, id: string): boolean {
  if (!published) return false
  return JSON.stringify(pageSlice(content, id)) !== JSON.stringify(pageSlice(published, id))
}

export function ContentStudioV2() {
  const { toast } = useToast()
  const navigateTo = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedService = searchParams.get('service')?.trim() ?? ''
  const [draft, setDraft] = useState<SiteContent | null>(null)
  const [published, setPublished] = useState<SiteContent | null>(null)
  const [workspace, setWorkspace] = useState<Workspace>('pages')
  const [selectedId, setSelectedId] = useState(requestedService ? 'services-detail' : 'home')
  const [serviceId, setServiceId] = useState(requestedService)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<{ message: string; path: string }[]>([])
  const [conflict, setConflict] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizard, setWizard] = useState({ type: 'service', title: '', slug: '' })

  useEffect(() => {
    let active = true
    adminApi
      .content()
      .then((content) => {
        if (!active) return
        const normalized = normalizeStudioDraft(content)
        setDraft(normalized)
        setPublished(normalized)
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load content.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!requestedService) return
    setWorkspace('pages')
    setSelectedId('services-detail')
    setServiceId(requestedService)
  }, [requestedService])

  const update: Update = (recipe) => {
    setDraft((current) => (current ? recipe(current) : current))
    setDirty(true)
    setIssues([])
    setError('')
  }

  const save = async () => {
    if (!draft) return
    const payload = payloadFor(draft)
    const validation = siteContentPayloadSchema.safeParse(payload)
    if (!validation.success) {
      setIssues(
        validation.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path.join('.'),
        })),
      )
      setError('Fix the highlighted content before publishing.')
      return
    }
    setSaving(true)
    try {
      const result = await adminApi.saveContent(validation.data, draft.version)
      setDraft(result.data)
      setPublished(result.data)
      setDirty(false)
      window.dispatchEvent(new Event('hvac-content-updated'))
      toast({
        title: result.meta.changed ? 'Published' : 'No changes to publish',
        description: result.meta.changed
          ? `Version ${result.data.version} is live. Open public tabs refresh within 10 seconds.`
          : 'The live content already matches this draft.',
        tone: result.meta.changed ? 'success' : 'info',
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not publish content.')
      setConflict(caught instanceof ApiError && caught.status === 412)
      if (caught instanceof ApiError && caught.issues) setIssues(caught.issues)
    } finally {
      setSaving(false)
    }
  }

  const reloadLive = async () => {
    setLoading(true)
    try {
      const latest = await adminApi.content()
      const normalized = normalizeStudioDraft(latest)
      setDraft(normalized)
      setPublished(normalized)
      setDirty(false)
      setConflict(false)
      setIssues([])
      setError('')
      toast({
        title: 'Live content reloaded',
        description: 'Your unsaved changes were discarded.',
        tone: 'info',
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reload content.')
    } finally {
      setLoading(false)
    }
  }

  const selected = contentRegistry.find((entry) => entry.id === selectedId) ?? singlePages[0]!

  const navigate = (tab: string) => {
    if (tab === 'brand') {
      setWorkspace('brand')
      return
    }
    if (tab === 'blog') {
      navigateTo('/admin/blog')
      return
    }
    const target: Record<string, string> = {
      services: 'services-detail',
      work: 'work-cases',
      products: 'products-detail',
      plans: 'amc-plans',
      faqs: 'faqs',
      legal: 'legal',
      voices: 'voices',
      'about-sections': 'about-sections',
      amc: 'amc-details',
      process: 'process-details',
    }
    setSelectedId(target[tab] ?? 'home')
  }

  const addPage = () => {
    if (!draft) return
    const slug = wizard.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')
    if (!wizard.title.trim() || !slug) {
      toast({ title: 'Title and slug required', tone: 'warn' })
      return
    }
    const duplicate =
      (wizard.type === 'service' && draft.services.some((entry) => entry.id === slug)) ||
      (wizard.type === 'faq' && draft.faqs.some((entry) => entry.id === slug)) ||
      (wizard.type === 'legal' && draft.legal.some((entry) => entry.slug === slug)) ||
      (wizard.type === 'plan' && draft.plans.some((entry) => entry.id === slug)) ||
      (wizard.type === 'work' && draft.workCases.some((entry) => entry.id === slug)) ||
      (wizard.type === 'product' &&
        draft.products.some((entry) => entry.id === slug || entry.slug === slug))
    if (duplicate) {
      toast({
        title: 'Slug already exists',
        description: 'Choose a different slug so public URLs stay unique.',
        tone: 'warn',
      })
      return
    }
    if (wizard.type === 'service') {
      update((current) => ({
        ...current,
        services: [
          ...current.services,
          newService(wizard.title, slug, String(current.services.length + 1).padStart(2, '0')),
        ],
      }))
      setServiceId(slug)
      setSelectedId('services-detail')
    } else if (wizard.type === 'faq') {
      update((current) => ({
        ...current,
        faqs: [...current.faqs, { id: slug, question: wizard.title, answer: '', published: false }],
      }))
      setSelectedId('faqs')
    } else if (wizard.type === 'legal') {
      update((current) => ({
        ...current,
        legal: [
          ...current.legal,
          {
            slug,
            title: wizard.title,
            summary: '',
            updatedAt: new Date().toISOString().slice(0, 10),
            sections: [],
            published: false,
          },
        ],
      }))
      setSelectedId('legal')
    } else if (wizard.type === 'plan') {
      update((current) => ({
        ...current,
        plans: [
          ...current.plans,
          {
            id: slug,
            name: wizard.title,
            price: '',
            priceNote: '',
            visits: '',
            summary: '',
            includes: [],
            excluded: '',
            featured: false,
          },
        ],
      }))
      setSelectedId('amc-plans')
    } else if (wizard.type === 'work') {
      update((current) => ({
        ...current,
        workCases: [
          ...current.workCases,
          {
            id: slug,
            category: 'commercial',
            name: wizard.title,
            location: '',
            plate: '',
            spec: '',
            detail: '',
            year: String(new Date().getFullYear()),
            challenge: '',
            solution: '',
            result: '',
            system: '',
            metrics: [],
            scope: [],
          },
        ],
      }))
      setSelectedId('work-cases')
    } else if (wizard.type === 'product') {
      update((current) => ({
        ...current,
        products: [
          ...current.products,
          {
            id: slug,
            slug,
            name: wizard.title,
            category: '',
            brand: '',
            capacity: '',
            priceFrom: '',
            priceNote: '',
            summary: '',
            description: '',
            features: [],
            specs: [],
            applications: [],
            tags: [],
            plate: '',
            featured: false,
            published: false,
          },
        ],
      }))
      setSelectedId('products-detail')
    }
    setWizardOpen(false)
    setWizard({ type: 'service', title: '', slug: '' })
    toast({
      title: 'Page created in draft',
      description: 'Review the new record, then publish.',
      tone: 'success',
    })
  }

  if (loading)
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader eyebrow="Content" title="Content studio" />
        <AdminLoading rows={6} />
      </div>
    )
  if (!draft) return <InlineError message={error || 'Content could not be loaded.'} />

  return (
    <div className="flex flex-col gap-5 pb-20">
      <AdminPageHeader
        eyebrow="Content & SEO"
        title="Content studio."
        description="One versioned workspace for pages, collections, brand, theme, billing and SEO. Draft changes are safe until you publish."
        actions={
          <>
            <Badge tone="cold" dot>
              Live · v{draft.version}
            </Badge>
            <Link
              to="/"
              target="_blank"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
            >
              <Icon name="external" size={12} /> View site
            </Link>
            <Link
              to="/admin/content/classic"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
            >
              Classic editor
            </Link>
            <Link
              to="/admin/content/revisions"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
            >
              <Icon name="clock" size={12} /> Revisions
            </Link>
            <Button onClick={() => void save()} disabled={saving} icon={saving ? 'clock' : 'check'}>
              {saving ? 'Publishing…' : dirty ? 'Publish changes' : 'Published'}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-1 border-b border-line">
        {workspaces.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setWorkspace(entry.id)}
            className={`border-b-2 px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] ${workspace === entry.id ? 'border-cold text-cold' : 'border-transparent text-fg-faint hover:text-fg'}`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {error ? <InlineError message={error} /> : null}
      {conflict ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-warn/40 bg-warn/[0.05] px-4 py-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-warn">
              Publish conflict
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">
              Someone published a newer version while you were editing. Reload the live version to
              compare and re-apply your changes, or open the revision ledger.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void reloadLive()} icon="refresh">
              Reload live
            </Button>
            <Link
              to="/admin/content/revisions"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
            >
              <Icon name="clock" size={12} /> Revisions
            </Link>
          </div>
        </div>
      ) : null}
      {issues.length ? (
        <div className="border border-danger/40 bg-danger/[0.05] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-danger">
            Publish blocked
          </p>
          <ul className="mt-2 max-h-32 overflow-auto text-[11px] leading-relaxed text-fg-dim">
            {issues.slice(0, 20).map((issue) => (
              <li key={`${issue.path}:${issue.message}`}>
                {issue.path || 'content'} — {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {workspace === 'pages' ? (
        <div className="grid gap-5 xl:grid-cols-[255px_minmax(0,1fr)]">
          <aside className="border border-line bg-panel/20 p-3 xl:sticky xl:top-4 xl:self-start">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Page tree
              </span>
              <Button size="sm" variant="quiet" icon="plus" onClick={() => setWizardOpen(true)}>
                Add
              </Button>
            </div>
            <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
              Single pages
            </p>
            <div className="mt-1 flex flex-col">
              {singlePages.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  data-page-id={entry.id}
                  onClick={() => {
                    setSelectedId(entry.id)
                    setWorkspace('pages')
                  }}
                  className={`border-b border-line/60 px-2 py-2 text-left text-[11px] ${selectedId === entry.id ? 'bg-cold/[0.08] text-cold' : 'text-fg-dim hover:text-fg'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      {entry.label}
                      {pageHasDraft(draft, published, entry.id) ? (
                        <span
                          aria-label="Unpublished changes"
                          title="Unpublished changes"
                          className="h-1.5 w-1.5 rounded-full bg-heat"
                        />
                      ) : null}
                    </span>
                    <span className="font-mono text-[8px] text-fg-faint">{entry.route}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
              Collections
            </p>
            <div className="mt-1 flex flex-col">
              {collectionPages.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  data-page-id={entry.id}
                  onClick={() => {
                    setSelectedId(entry.id)
                    if (entry.id === 'services-detail') setServiceId('')
                    if (requestedService) navigateTo('/admin/content', { replace: true })
                  }}
                  className={`border-b border-line/60 px-2 py-2 text-left text-[11px] ${selectedId === entry.id ? 'bg-cold/[0.08] text-cold' : 'text-fg-dim hover:text-fg'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      {entry.label}
                      {pageHasDraft(draft, published, entry.id) ? (
                        <span
                          aria-label="Unpublished changes"
                          title="Unpublished changes"
                          className="h-1.5 w-1.5 rounded-full bg-heat"
                        />
                      ) : null}
                    </span>
                    <span className="font-mono text-[8px] text-fg-faint">{entry.group}</span>
                  </span>
                </button>
              ))}
            </div>
            <Link
              to="/admin/blog"
              className="mt-4 flex items-center justify-between border border-line/60 px-2 py-2 text-[11px] text-fg-dim hover:text-cold"
            >
              <span>Journal articles</span>
              <Icon name="arrow-right" size={11} />
            </Link>
          </aside>

          <div className="min-w-0">
            <div className="mb-4 border border-line bg-panel/20 px-4 py-3">
              <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                {selected.group === 'single' ? 'Single page' : 'Collection'}
              </p>
              <h2 data-page-id={selected.id} className="mt-1 t-h3 text-fg">
                {selected.label}
              </h2>
              <p className="mt-1 text-[11px] text-fg-faint">{selected.description}</p>
            </div>
            {selected.group === 'single' ? (
              <PageStudio
                key={selected.id}
                draft={draft}
                update={update}
                onNavigate={navigate}
                onEditService={(id) => {
                  setServiceId(id)
                  setSelectedId('services-detail')
                }}
                initialPage={selected.id}
                initialView="page"
                hideGrid
              />
            ) : selected.editor === 'services' ? (
              <ServicesTab
                draft={draft}
                update={update}
                selected={draft.services.find((entry) => entry.id === serviceId) ?? null}
                onSelect={(id) => {
                  setServiceId(id)
                  navigateTo(
                    id ? `/admin/content?service=${encodeURIComponent(id)}` : '/admin/content',
                    { replace: true },
                  )
                }}
              />
            ) : selected.editor === 'work' ? (
              <WorkTab draft={draft} update={update} />
            ) : selected.editor === 'products' ? (
              <ProductsTab draft={draft} update={update} />
            ) : selected.editor === 'plans' ? (
              <PlansTab draft={draft} update={update} />
            ) : selected.editor === 'faqs' ? (
              <FaqsTab draft={draft} update={update} />
            ) : selected.editor === 'legal' ? (
              <LegalTab draft={draft} update={update} />
            ) : selected.editor === 'voices' ? (
              <VoicesTab draft={draft} update={update} />
            ) : selected.editor === 'about-sections' ? (
              <AboutSectionsTab draft={draft} update={update} />
            ) : selected.editor === 'amc' ? (
              <AmcTab draft={draft} update={update} />
            ) : selected.editor === 'process' ? (
              <ProcessTab draft={draft} update={update} />
            ) : (
              <PageStudio
                key={selected.id}
                draft={draft}
                update={update}
                onNavigate={navigate}
                onEditService={() => undefined}
                initialPage={selected.id}
                initialView="page"
                hideGrid
              />
            )}
          </div>
        </div>
      ) : null}

      {workspace === 'brand' ? (
        <div className="flex flex-col gap-5">
          <BrandTab draft={draft} update={update} />
          <ContentThemeTab draft={draft} update={update} />
        </div>
      ) : null}
      {workspace === 'billing' ? <BillingTab draft={draft} update={update} /> : null}
      {workspace === 'seo' ? <SeoTab draft={draft} update={update} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-panel/20 px-4 py-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
          Last published {formatDateTime(draft.updatedAt)} · version {draft.version}
        </span>
        <span
          className={`font-mono text-[9px] uppercase tracking-[0.1em] ${dirty ? 'text-heat' : 'text-success'}`}
        >
          {dirty ? 'Unpublished changes' : 'In sync'}
        </span>
      </div>

      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Add page"
        description="Create a detail record in the selected collection."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setWizardOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addPage} icon="plus">
              Create draft
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Page type"
            value={wizard.type}
            onChange={(event) => setWizard({ ...wizard, type: event.target.value })}
            options={[
              { value: 'service', label: 'Service detail' },
              { value: 'work', label: 'Work case' },
              { value: 'product', label: 'System detail' },
              { value: 'legal', label: 'Legal page' },
              { value: 'faq', label: 'FAQ' },
              { value: 'plan', label: 'AMC plan' },
            ]}
          />
          <Input
            label="Title"
            value={wizard.title}
            onChange={(event) => setWizard({ ...wizard, title: event.target.value })}
          />
          <Input
            label="Slug"
            value={wizard.slug}
            onChange={(event) => setWizard({ ...wizard, slug: event.target.value })}
            placeholder="new-detail-page"
          />
        </div>
      </Modal>
    </div>
  )
}
