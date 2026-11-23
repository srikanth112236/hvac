import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import {
  Badge,
  Button,
  Input,
  Select,
  Textarea,
  Toggle,
  useToast,
} from '@/components/ui'
import {
  SERVICE_CATEGORIES,
  type SiteContent,
  type SiteContentPayload,
  type SiteServiceOverride,
} from '@hvac/shared'
import { categoryLabels } from '@/content/services'
import { getServiceDetail } from '@/content/serviceDetails'
import { adminApi, ApiError } from '@/admin/api'
import {
  AboutSectionsTab,
  AmcTab,
  BillingTab,
  BlogTab,
  LegalTab,
  ProcessTab,
  ProductsTab,
  VoicesTab,
  WorkTab,
} from '@/admin/AdminContentCollections'
import { AdminLoading, AdminPageHeader, InlineError, formatDateTime } from '@/admin/ui'
import { PageStudio } from '@/admin/PageStudio'

const tabs = [
  { id: 'pages-studio', label: 'Pages & sections' },
  { id: 'brand', label: 'Brand & contact' },
  { id: 'home', label: 'Home' },
  { id: 'products', label: 'Systems' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work cases' },
  { id: 'process', label: 'Process' },
  { id: 'about-sections', label: 'About sections' },
  { id: 'amc', label: 'AMC detail' },
  { id: 'voices', label: 'Voices & brands' },
  { id: 'pages', label: 'Page copy' },
  { id: 'services', label: 'Services' },
  { id: 'plans', label: 'AMC plans' },
  { id: 'faqs', label: 'FAQs' },
  { id: 'legal', label: 'Legal pages' },
  { id: 'billing', label: 'Billing identity' },
  { id: 'seo', label: 'SEO & social' },
] as const

type TabId = (typeof tabs)[number]['id'] | 'blog'

export function AdminContent({
  initialTab = 'pages-studio',
  journalWorkspace = false,
}: {
  initialTab?: TabId
  /** Dedicated Journal route: one workspace, no content-studio tab strip. */
  journalWorkspace?: boolean
}) {
  const { toast } = useToast()
  const [draft, setDraft] = useState<SiteContent | null>(null)
  const [tab, setTab] = useState<TabId>(initialTab)
  const [selectedService, setSelectedService] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<{ message: string; path: string }[]>([])

  useEffect(() => {
    let active = true
    adminApi
      .content()
      .then((content) => {
        if (!active) return
        setDraft(content)
        setSelectedService(content.services[0]?.id ?? '')
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
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const service = useMemo(
    () => draft?.services.find((entry) => entry.id === selectedService) ?? null,
    [draft, selectedService],
  )

  const update = (recipe: (current: SiteContent) => SiteContent) => {
    setDraft((current) => (current ? recipe(current) : current))
    setDirty(true)
    setError('')
    setIssues([])
  }

  const save = async () => {
    if (!draft) return
    const payload: SiteContentPayload = {
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
    setSaving(true)
    setError('')
    setIssues([])
    try {
      const result = await adminApi.saveContent(payload, draft.version)
      setDraft(result.data)
      setDirty(false)
      window.dispatchEvent(new Event('hvac-content-updated'))
      try {
        const channel = new BroadcastChannel('hvac-content')
        channel.postMessage({ type: 'updated', version: result.data.version })
        channel.close()
      } catch {
        // Older browsers without BroadcastChannel still get the event above.
      }
      toast({
        title: result.meta.changed ? 'Published' : 'No changes to publish',
        description: result.meta.changed
          ? `Version ${result.data.version} is live and saved as a restore point. Open public tabs refresh within 10 seconds.`
          : 'The live content already matches this draft.',
        tone: result.meta.changed ? 'success' : 'info',
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not publish content.')
      if (caught instanceof ApiError && caught.issues) setIssues(caught.issues)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader eyebrow="Content" title="Everything the site says." />
        <AdminLoading rows={6} />
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader eyebrow="Content" title="Everything the site says." />
        <InlineError message={error || 'Content could not be loaded.'} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <AdminPageHeader
        eyebrow={journalWorkspace ? 'Journal workspace' : 'Content & SEO'}
        title={journalWorkspace ? 'The journal, end to end.' : 'Everything the site says.'}
        description={
          journalWorkspace
            ? 'Write, publish, feature, unpublish and delete articles in one place. Save publishes immediately; open public tabs refresh within 10 seconds.'
            : 'One versioned document feeds the public pages. Every publish becomes a restore point with its full diff, author and date. The last 500 revisions are retained. Open browsers poll every 10 seconds.'
        }
        actions={
          <>
            <Badge tone="cold" dot>
              Live · v{draft.version}
            </Badge>
            <Link
              to="/blog"
              target="_blank"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
            >
              <Icon name="external" size={12} />
              View journal
            </Link>
            <Link
              to="/"
              target="_blank"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
            >
              <Icon name="external" size={12} />
              View site
            </Link>
            {!journalWorkspace ? (
              <Link
                to="/admin/content"
                className="flex h-9 items-center gap-2 border border-cold/40 px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:border-cold"
              >
                New studio
              </Link>
            ) : null}
            <Link
              to="/admin/content/revisions"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:text-cold"
            >
              <Icon name="clock" size={12} />
              Revisions
            </Link>
            <Button onClick={() => void save()} disabled={saving || !dirty} icon={saving ? 'clock' : 'check'}>
              {saving ? 'Publishing…' : dirty ? 'Publish changes' : 'Published'}
            </Button>
          </>
        }
      />

      {journalWorkspace ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-cold/25 bg-cold/[0.05] px-4 py-3">
          <p className="max-w-[70ch] text-[12px] leading-relaxed text-fg-dim">
            This workspace only manages journal articles. Page headings and hero copy live in{' '}
            <Link to="/admin/content" className="text-cold hover:text-fg">
              Pages &amp; sections
            </Link>
            , so the article list stays clean.
          </p>
          <Link
            to="/admin/content"
            className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:text-fg"
          >
            Content studio →
          </Link>
        </div>
      ) : null}

      {!journalWorkspace ? (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-1 border-b border-line">
            {tabs.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={`border-b-2 px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors ${
                  tab === entry.id
                    ? 'border-cold text-cold'
                    : 'border-transparent text-fg-faint hover:text-fg'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="flex flex-col gap-2">
          <InlineError message={error} />
          {issues.length ? (
            <ul className="border border-danger/30 px-4 py-3 font-mono text-[10px] leading-relaxed text-fg-dim">
              {issues.map((issue) => (
                <li key={`${issue.path}-${issue.message}`}>
                  {issue.path ? `${issue.path}: ` : ''}
                  {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-panel/30 px-4 py-2.5">
        <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
          Last published {formatDateTime(draft.updatedAt)} · public poll 10 s
        </span>
        <span className={`font-mono text-[8px] uppercase tracking-[0.1em] ${dirty ? 'text-heat' : 'text-success'}`}>
          {dirty ? 'Unpublished changes' : 'In sync'}
        </span>
      </div>

      {tab === 'pages-studio' ? (
        <PageStudio
          draft={draft}
          update={update}
          onNavigate={(next) => setTab(next)}
          onEditService={(serviceId) => {
            setSelectedService(serviceId)
            setTab('services')
          }}
        />
      ) : null}
      {tab === 'brand' ? <BrandTab draft={draft} update={update} /> : null}
      {tab === 'home' ? <HomeTab draft={draft} update={update} /> : null}
      {tab === 'blog' ? <BlogTab draft={draft} update={update} /> : null}
      {tab === 'products' ? <ProductsTab draft={draft} update={update} /> : null}
      {tab === 'about' ? <AboutTab draft={draft} update={update} /> : null}
      {tab === 'work' ? <WorkTab draft={draft} update={update} /> : null}
      {tab === 'process' ? <ProcessTab draft={draft} update={update} /> : null}
      {tab === 'about-sections' ? <AboutSectionsTab draft={draft} update={update} /> : null}
      {tab === 'amc' ? <AmcTab draft={draft} update={update} /> : null}
      {tab === 'voices' ? <VoicesTab draft={draft} update={update} /> : null}
      {tab === 'pages' ? <PagesTab draft={draft} update={update} /> : null}
      {tab === 'services' ? (
        <ServicesTab
          draft={draft}
          update={update}
          selected={service}
          onSelect={setSelectedService}
        />
      ) : null}
      {tab === 'plans' ? <PlansTab draft={draft} update={update} /> : null}
      {tab === 'faqs' ? <FaqsTab draft={draft} update={update} /> : null}
      {tab === 'legal' ? <LegalTab draft={draft} update={update} /> : null}
      {tab === 'billing' ? <BillingTab draft={draft} update={update} /> : null}
      {tab === 'seo' ? <SeoTab draft={draft} update={update} /> : null}

      {dirty ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cold/30 bg-base/95 px-4 py-3 backdrop-blur md:left-[236px]">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-dim">
              Unpublished changes · public site still serving v{draft.version}
            </p>
            <Button size="sm" onClick={() => void save()} disabled={saving} icon={saving ? 'clock' : 'check'}>
              {saving ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Brand                                                                      */
/* -------------------------------------------------------------------------- */

type Update = (recipe: (current: SiteContent) => SiteContent) => void

function Section({
  title,
  description,
  children,
  columns = 2,
}: {
  title: string
  description?: string
  children: React.ReactNode
  columns?: 1 | 2 | 3
}) {
  return (
    <section className="border border-line bg-panel/30">
      <div className="border-b border-line px-5 py-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">{title}</h2>
        {description ? <p className="mt-1 text-[11px] leading-relaxed text-fg-faint">{description}</p> : null}
      </div>
      <div
        className={`grid gap-4 p-5 ${
          columns === 3 ? 'md:grid-cols-3' : columns === 2 ? 'md:grid-cols-2' : ''
        }`}
      >
        {children}
      </div>
    </section>
  )
}

function Wide({ children, span = 2 }: { children: React.ReactNode; span?: 2 | 3 }) {
  return <div className={span === 3 ? 'md:col-span-3' : 'md:col-span-2'}>{children}</div>
}

export function BrandTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const brand = draft.brand
  return (
    <div className="flex flex-col gap-4">
      <Section title="Identity" description="The name, mark and description used across the public site.">
        <Input label="Display name" value={brand.name} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, name: event.target.value } }))} />
        <Input label="Short name" value={brand.shortName} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, shortName: event.target.value } }))} />
        <Input label="Legal entity" value={brand.legalName} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, legalName: event.target.value } }))} />
        <Input label="Monogram" maxLength={4} value={brand.monogram} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, monogram: event.target.value } }))} />
        <Wide>
          <Input label="Tagline" value={brand.tagline} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, tagline: event.target.value } }))} />
        </Wide>
        <Wide>
          <Textarea label="Description" rows={4} value={brand.description} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, description: event.target.value } }))} />
        </Wide>
      </Section>

      <Section title="Contact & dispatch">
        <Input label="Phone (dial)" value={brand.contact.phone} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, contact: { ...current.brand.contact, phone: event.target.value } } }))} />
        <Input label="Phone (display)" value={brand.contact.phoneDisplay} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, contact: { ...current.brand.contact, phoneDisplay: event.target.value } } }))} />
        <Input label="Emergency dispatch" value={brand.contact.emergencyPhone} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, contact: { ...current.brand.contact, emergencyPhone: event.target.value } } }))} />
        <Input label="Works email" type="email" value={brand.contact.email} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, contact: { ...current.brand.contact, email: event.target.value } } }))} />
        <Input label="Projects email" type="email" value={brand.contact.salesEmail} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, contact: { ...current.brand.contact, salesEmail: event.target.value } } }))} />
        <Input label="EIN / Tax ID" value={brand.gstin} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, gstin: event.target.value } }))} />
      </Section>

      <Section title="Works address" columns={3}>
        <Input label="Line 1" value={brand.address.line1} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, address: { ...current.brand.address, line1: event.target.value } } }))} />
        <Input label="Line 2" value={brand.address.line2} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, address: { ...current.brand.address, line2: event.target.value } } }))} />
        <Input label="Locality" value={brand.address.locality} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, address: { ...current.brand.address, locality: event.target.value } } }))} />
        <Input label="Region" value={brand.address.region} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, address: { ...current.brand.address, region: event.target.value } } }))} />
        <Input label="Postal code" value={brand.address.postalCode} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, address: { ...current.brand.address, postalCode: event.target.value } } }))} />
        <Input label="Country code" maxLength={2} value={brand.address.country} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, address: { ...current.brand.address, country: event.target.value } } }))} />
      </Section>

      <Section title="Opening hours">
        <Input label="Monday – Friday" value={brand.hours.weekdays} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, hours: { ...current.brand.hours, weekdays: event.target.value } } }))} />
        <Input label="Saturday" value={brand.hours.saturday} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, hours: { ...current.brand.hours, saturday: event.target.value } } }))} />
        <Input label="Sunday" value={brand.hours.sunday} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, hours: { ...current.brand.hours, sunday: event.target.value } } }))} />
        <Input label="Emergency cover" value={brand.hours.emergency} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, hours: { ...current.brand.hours, emergency: event.target.value } } }))} />
      </Section>

      <Section title="Proof & coverage" description="Numbers and credentials shown in the hero, footer and about page.">
        <Input label="Years operating" type="number" value={brand.stats.yearsOperating} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, stats: { ...current.brand.stats, yearsOperating: Number(event.target.value) } } }))} />
        <Input label="Systems installed" type="number" value={brand.stats.systemsInstalled} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, stats: { ...current.brand.stats, systemsInstalled: Number(event.target.value) } } }))} />
        <Input label="Tonnage commissioned" type="number" value={brand.stats.tonnageCommissioned} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, stats: { ...current.brand.stats, tonnageCommissioned: Number(event.target.value) } } }))} />
        <Input label="Emergency response (hours)" type="number" value={brand.stats.emergencyResponseHours} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, stats: { ...current.brand.stats, emergencyResponseHours: Number(event.target.value) } } }))} />
        <Input label="Founded year" type="number" value={brand.foundedYear} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, foundedYear: Number(event.target.value) } }))} />
        <Wide>
          <Textarea
            label="Credentials · one per line"
            rows={3}
            value={brand.credentials.join('\n')}
            onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, credentials: event.target.value.split('\n').map((entry) => entry.trim()).filter(Boolean) } }))}
          />
        </Wide>
      </Section>

      <Section title="Service areas" description="City, region and dispatch radius." columns={1}>
        <div className="flex flex-col gap-2">
          {brand.serviceAreas.map((area, index) => (
            <div key={`${area.slug}-${index}`} className="grid gap-2 border border-line p-3 sm:grid-cols-[1fr_1fr_1fr_90px_auto]">
              <Input aria-label={`City ${index + 1}`} placeholder="City" value={area.city} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, serviceAreas: current.brand.serviceAreas.map((entry, i) => (i === index ? { ...entry, city: event.target.value } : entry)) } }))} />
              <Input aria-label={`Region ${index + 1}`} placeholder="Region" value={area.region} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, serviceAreas: current.brand.serviceAreas.map((entry, i) => (i === index ? { ...entry, region: event.target.value } : entry)) } }))} />
              <Input aria-label={`Slug ${index + 1}`} placeholder="slug" value={area.slug} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, serviceAreas: current.brand.serviceAreas.map((entry, i) => (i === index ? { ...entry, slug: event.target.value } : entry)) } }))} />
              <Input aria-label={`Radius ${index + 1}`} type="number" value={area.radiusKm} onChange={(event) => update((current) => ({ ...current, brand: { ...current.brand, serviceAreas: current.brand.serviceAreas.map((entry, i) => (i === index ? { ...entry, radiusKm: Number(event.target.value) } : entry)) } }))} />
              <button type="button" aria-label={`Remove ${area.city}`} onClick={() => update((current) => ({ ...current, brand: { ...current.brand, serviceAreas: current.brand.serviceAreas.filter((_, i) => i !== index) } }))} className="flex h-[var(--btn-h-md)] w-10 items-center justify-center border border-line text-fg-faint hover:border-danger/40 hover:text-danger">
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            className="self-start"
            onClick={() => update((current) => ({ ...current, brand: { ...current.brand, serviceAreas: [...current.brand.serviceAreas, { city: '', region: '', slug: '', radiusKm: 25 }] } }))}
          >
            Add service area
          </Button>
        </div>
      </Section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Home & About                                                               */
/* -------------------------------------------------------------------------- */

export function HomeTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const home = draft.home
  const fields: { key: keyof typeof home; label: string; long?: boolean }[] = [
    { key: 'heroEyebrow', label: 'Hero eyebrow' },
    { key: 'heroTitle', label: 'Hero headline' },
    { key: 'heroLead', label: 'Hero lead', long: true },
    { key: 'performanceTitle', label: 'Commissioning headline' },
    { key: 'performanceDescription', label: 'Commissioning description', long: true },
    { key: 'performanceAnswer', label: 'Commissioning direct answer', long: true },
    { key: 'assuranceTitle', label: 'Handover file headline' },
    { key: 'assuranceDescription', label: 'Handover file description', long: true },
    { key: 'assuranceAnswer', label: 'Handover file direct answer', long: true },
    { key: 'coverageTitle', label: 'Coverage headline' },
    { key: 'coverageDescription', label: 'Coverage description', long: true },
    { key: 'coverageAnswer', label: 'Coverage direct answer', long: true },
    { key: 'productsTitle', label: 'Catalogue headline' },
    { key: 'productsDescription', label: 'Catalogue description', long: true },
    { key: 'productsAnswer', label: 'Catalogue direct answer', long: true },
    { key: 'insightsTitle', label: 'Journal headline' },
    { key: 'insightsDescription', label: 'Journal description', long: true },
    { key: 'insightsAnswer', label: 'Journal direct answer', long: true },
    { key: 'servicesTitle', label: 'Services headline' },
    { key: 'servicesDescription', label: 'Services description', long: true },
    { key: 'processTitle', label: 'Process headline' },
    { key: 'processDescription', label: 'Process description', long: true },
    { key: 'workTitle', label: 'Work headline' },
    { key: 'workDescription', label: 'Work description', long: true },
    { key: 'plansTitle', label: 'Plans headline' },
    { key: 'plansDescription', label: 'Plans description', long: true },
    { key: 'faqTitle', label: 'FAQ headline' },
    { key: 'faqDescription', label: 'FAQ description', long: true },
    { key: 'finalCtaTitle', label: 'Final CTA headline' },
    { key: 'finalCtaLead', label: 'Final CTA lead', long: true },
  ]
  return (
    <Section title="Home page copy" description="Headlines and section descriptions rendered on the public home page.">
      {fields.map((field) =>
        field.long ? (
          <Wide key={field.key}>
            <Textarea
              label={field.label}
              rows={3}
              value={home[field.key]}
              onChange={(event) => update((current) => ({ ...current, home: { ...current.home, [field.key]: event.target.value } }))}
            />
          </Wide>
        ) : (
          <Input
            key={field.key}
            label={field.label}
            value={home[field.key]}
            onChange={(event) => update((current) => ({ ...current, home: { ...current.home, [field.key]: event.target.value } }))}
          />
        ),
      )}
    </Section>
  )
}

export function AboutTab({ draft, update }: { draft: SiteContent; update: Update }) {
  return (
    <Section title="About page" description="Headline, lead and story paragraphs. Separate paragraphs with a blank line." columns={1}>
      <Input label="Headline" value={draft.about.headline} onChange={(event) => update((current) => ({ ...current, about: { ...current.about, headline: event.target.value } }))} />
      <Textarea label="Lead" rows={3} value={draft.about.lead} onChange={(event) => update((current) => ({ ...current, about: { ...current.about, lead: event.target.value } }))} />
      <Textarea
        label="Story"
        rows={14}
        value={draft.about.story.join('\n\n')}
        onChange={(event) => update((current) => ({ ...current, about: { ...current.about, story: event.target.value.split(/\n\s*\n/).map((entry) => entry.trim()).filter(Boolean) } }))}
      />
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page copy                                                                  */
/* -------------------------------------------------------------------------- */

const pageFields: { key: keyof SiteContent['pages']; label: string; path: string }[] = [
  { key: 'services', label: 'Services index', path: '/services' },
  { key: 'process', label: 'Process', path: '/process' },
  { key: 'work', label: 'Work', path: '/work' },
  { key: 'amc', label: 'AMC', path: '/amc' },
  { key: 'contact', label: 'Contact', path: '/contact' },
  { key: 'blog', label: 'Journal', path: '/blog' },
  { key: 'products', label: 'Systems', path: '/products' },
]

export function PagesTab({ draft, update }: { draft: SiteContent; update: Update }) {
  return (
    <div className="flex flex-col gap-4">
      {pageFields.map((field) => {
        const page = draft.pages[field.key]
        const patch = (change: Partial<SiteContent['pages'][keyof SiteContent['pages']]>) =>
          update((current) => ({
            ...current,
            pages: { ...current.pages, [field.key]: { ...current.pages[field.key], ...change } },
          }))
        return (
          <section key={field.key} className="border border-line bg-panel/30">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <div>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
                  {field.label}
                </h2>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  {field.path}
                </p>
              </div>
              <Link
                to={field.path}
                target="_blank"
                className="flex h-8 items-center gap-1.5 border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint hover:text-cold"
              >
                <Icon name="external" size={11} />
                Open
              </Link>
            </div>
            <div className="grid gap-4 p-5">
              <Input label="Headline" value={page.headline} onChange={(event) => patch({ headline: event.target.value })} />
              <Textarea label="Lead" rows={3} value={page.lead} onChange={(event) => patch({ lead: event.target.value })} />
            </div>
          </section>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Services                                                                   */
/* -------------------------------------------------------------------------- */

export function ServicesTab({
  draft,
  update,
  selected,
  onSelect,
}: {
  draft: SiteContent
  update: Update
  selected: SiteContent['services'][number] | null
  onSelect: (id: string) => void
}) {
  const addService = () => {
    const id = `service-${Date.now().toString(36)}`
    update((current) => ({
      ...current,
      services: [
        ...current.services,
        {
          id,
          index: String(current.services.length + 1).padStart(2, '0'),
          name: 'New service',
          category: 'residential',
          capacity: '',
          timeline: '',
          specification: '',
          scope: '',
          headline: '',
          intro: '',
          startingFrom: '',
          warranty: '',
          published: false,
          priceBasis: 'the surveyed scope',
          includes: [
            'Site survey and measured load',
            'Equipment supply and installation',
            'Commissioning record and handover file',
          ],
          excludes: [
            'Civil work and structural openings',
            'Electrical point to the unit',
            'Society NOC and lift charges',
          ],
          site: [],
          priceFactors: [
            'Capacity and equipment selection',
            'Access, containment and pipe route',
            'Lead time and site phasing',
          ],
          standards: ['ISHRAE comfort data', 'ASHRAE fundamentals', 'BIS practice', 'ISO 9001:2015'],
          specs: [
            { label: 'Capacity', value: '' },
            { label: 'Lead time', value: '' },
            { label: 'Specification', value: '' },
          ],
          selection: [{ title: 'Selection spec', body: '' }],
          steps: [],
          faqs: [],
        },
      ],
    }))
    onSelect(id)
  }

  const patch = (change: Partial<SiteContent['services'][number]>) => {
    if (!selected) return
    update((current) => ({
      ...current,
      services: current.services.map((entry) => (entry.id === selected.id ? { ...entry, ...change } : entry)),
    }))
  }

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <section className="border border-line bg-panel/30 xl:col-span-4">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
            Service index · {draft.services.length}
          </span>
          <Button variant="quiet" size="sm" icon="plus" onClick={addService}>
            Add
          </Button>
        </div>
        <ul className="max-h-[70vh] overflow-y-auto">
          {draft.services.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                className={`flex w-full items-center justify-between gap-3 border-b border-line/60 px-4 py-2.5 text-left ${
                  selected?.id === entry.id ? 'bg-cold/[0.06]' : 'hover:bg-fg/[0.03]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="t-num text-[9px] text-fg-faint">{entry.index}</span>
                  <span className="truncate text-[12px] text-fg-dim">{entry.name}</span>
                </span>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${entry.published ? 'bg-success' : 'bg-fg-faint/40'}`} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-line bg-panel/30 xl:col-span-8">
        {selected ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                  {selected.id}
                </span>
                <p className="mt-0.5 text-[13px] text-fg">{selected.name}</p>
              </div>
              <Toggle
                checked={selected.published}
                onChange={(checked) => patch({ published: checked })}
                label="Published"
                description="Visible on the public index."
              />
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Input label="Name" value={selected.name} onChange={(event) => patch({ name: event.target.value })} />
              <Input label="Index" value={selected.index} onChange={(event) => patch({ index: event.target.value })} />
              <Select
                label="Category"
                value={selected.category}
                options={SERVICE_CATEGORIES.map((category) => ({ value: category, label: categoryLabels[category] }))}
                onChange={(event) => patch({ category: event.target.value as typeof selected.category })}
              />
              <Input label="Capacity" value={selected.capacity} onChange={(event) => patch({ capacity: event.target.value })} />
              <Input label="Lead time" value={selected.timeline} onChange={(event) => patch({ timeline: event.target.value })} />
              <Input label="Specification" value={selected.specification} onChange={(event) => patch({ specification: event.target.value })} />
              <Input label="Starting from" placeholder="$450" value={selected.startingFrom} onChange={(event) => patch({ startingFrom: event.target.value })} />
              <Input label="Warranty" value={selected.warranty} onChange={(event) => patch({ warranty: event.target.value })} />
              <div className="md:col-span-2">
                <Input label="Headline override" hint="Leave blank to use the page template headline." value={selected.headline} onChange={(event) => patch({ headline: event.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Textarea label="Intro override" rows={3} hint="Leave blank to use the compiled service file." value={selected.intro} onChange={(event) => patch({ intro: event.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Textarea label="Scope" rows={3} value={selected.scope} onChange={(event) => patch({ scope: event.target.value })} />
              </div>
              <div className="md:col-span-2 border-t border-line pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
                      Service page sections
                    </p>
                    <p className="mt-1 max-w-[70ch] text-[11px] leading-relaxed text-fg-faint">
                      These values feed the public detail page. Compiled defaults are shown until you edit them.
                    </p>
                  </div>
                  <Badge tone={selected.published ? 'success' : 'neutral'} dot>
                    {selected.published ? 'Public' : 'Hidden'}
                  </Badge>
                </div>
              </div>
              {selected ? <ServiceDetailFields selected={selected} patch={patch} /> : null}
              <div className="flex items-end md:col-span-2">
                <Button
                  variant="danger"
                  size="sm"
                  icon="close"
                  onClick={() => {
                    if (!window.confirm(`Remove ${selected.name} from the catalogue?`)) return
                    update((current) => ({
                      ...current,
                      services: current.services.filter((entry) => entry.id !== selected.id),
                    }))
                    onSelect(draft.services.find((entry) => entry.id !== selected.id)?.id ?? '')
                  }}
                >
                  Remove service
                </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="p-8 text-[12px] text-fg-faint">Select a service to edit.</p>
        )}
      </section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Plans & FAQs                                                               */
/* -------------------------------------------------------------------------- */

function ServiceDetailFields({
  selected,
  patch,
}: {
  selected: SiteServiceOverride
  patch: (change: Partial<SiteServiceOverride>) => void
}) {
  const detail = getServiceDetail(selected.id)
  const includes = selected.includes ?? detail?.includes ?? []
  const excludes = selected.excludes ?? detail?.excludes ?? []
  const site = selected.site ?? detail?.site ?? []
  const priceFactors = selected.priceFactors ?? detail?.priceFactors ?? []
  const standards = selected.standards ?? detail?.standards ?? []
  const specs = selected.specs ?? (detail?.specs ?? []).map(([label, value]) => ({ label, value }))
  const selection =
    selected.selection ?? (detail?.selection ?? []).map(([title, body]) => ({ title, body }))
  const steps = selected.steps ?? (detail?.steps ?? []).map(([title, body]) => ({ title, body }))
  const faqs =
    selected.faqs ?? (detail?.faqs ?? []).map(([question, answer]) => ({ question, answer }))

  return (
    <>
      <div className="md:col-span-2">
        <Input
          label="Price basis"
          hint="What the starting figure covers, e.g. the surveyed scope."
          value={selected.priceBasis ?? detail?.priceBasis ?? ''}
          onChange={(event) => patch({ priceBasis: event.target.value })}
        />
      </div>

      <StringListEditor
        label="Included in scope"
        hint="Each line becomes a check-marked item on the public page."
        items={includes}
        onChange={(next) => patch({ includes: next })}
        addLabel="Add inclusion"
      />
      <StringListEditor
        label="Not included"
        hint="Shown beside the included list at the same size, priced separately."
        items={excludes}
        onChange={(next) => patch({ excludes: next })}
        addLabel="Add exclusion"
      />
      <StringListEditor
        label="Before we mobilise"
        hint="Site, access and clearance checks shown in the process panel."
        items={site}
        onChange={(next) => patch({ site: next })}
        addLabel="Add requirement"
      />
      <StringListEditor
        label="What moves the price"
        hint="Pricing factors listed beside the starting figure."
        items={priceFactors}
        onChange={(next) => patch({ priceFactors: next })}
        addLabel="Add factor"
      />
      <StringListEditor
        label="Standards used"
        hint="Shown on technical and warranty panels."
        items={standards}
        onChange={(next) => patch({ standards: next })}
        addLabel="Add standard"
      />

      <PairListEditor
        label="Specification rows"
        hint="Label and value pairs in the specification table."
        rows={specs}
        onChange={(next) => patch({ specs: next })}
        blank={() => ({ label: '', value: '' })}
        primary="label"
        secondary="value"
        primaryLabel="Label"
        secondaryLabel="Value"
        addLabel="Add row"
      />
      <PairListEditor
        label="Selection checks"
        hint="The technical decision sequence shown on the page."
        rows={selection}
        onChange={(next) => patch({ selection: next })}
        blank={() => ({ title: '', body: '' })}
        primary="title"
        secondary="body"
        primaryLabel="Title"
        secondaryLabel="Body"
        secondaryRows={3}
        addLabel="Add check"
      />
      <PairListEditor
        label="Process steps"
        hint="Survey-to-sign-off steps, in order."
        rows={steps}
        onChange={(next) => patch({ steps: next })}
        blank={() => ({ title: '', body: '' })}
        primary="title"
        secondary="body"
        primaryLabel="Step"
        secondaryLabel="What happens and what is delivered"
        secondaryRows={3}
        addLabel="Add step"
      />
      <PairListEditor
        label="Service questions"
        hint="Questions shown on this service page and in its structured data."
        rows={faqs}
        onChange={(next) => patch({ faqs: next })}
        blank={() => ({ question: '', answer: '' })}
        primary="question"
        secondary="answer"
        primaryLabel="Question"
        secondaryLabel="Answer"
        secondaryRows={3}
        addLabel="Add question"
      />
    </>
  )
}

function StringListEditor({
  label,
  hint,
  items,
  onChange,
  addLabel,
}: {
  label: string
  hint: string
  items: string[]
  onChange: (items: string[]) => void
  addLabel: string
}) {
  return (
    <section className="border border-line bg-base/30 p-3">
      <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">{label}</p>
        <Button variant="quiet" size="sm" icon="plus" onClick={() => onChange([...items, ''])}>
          {addLabel}
        </Button>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {items.length ? (
          items.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  aria-label={`${label} ${index + 1}`}
                  value={item}
                  onChange={(event) =>
                    onChange(items.map((current, row) => (row === index ? event.target.value : current)))
                  }
                />
              </div>
              <button
                type="button"
                aria-label={`Remove ${label} ${index + 1}`}
                onClick={() => onChange(items.filter((_, row) => row !== index))}
                className="mt-0.5 flex h-[38px] w-8 shrink-0 items-center justify-center border border-line text-fg-faint hover:border-danger/40 hover:text-danger"
              >
                <Icon name="close" size={10} />
              </button>
            </div>
          ))
        ) : (
          <p className="py-2 text-[11px] text-fg-faint">No rows yet. Add one to override the compiled page.</p>
        )}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-fg-faint">{hint}</p>
    </section>
  )
}

function PairListEditor<T extends Record<string, string>>({
  label,
  hint,
  rows,
  onChange,
  blank,
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  secondaryRows,
  addLabel,
}: {
  label: string
  hint: string
  rows: T[]
  onChange: (rows: T[]) => void
  blank: () => T
  primary: keyof T & string
  secondary: keyof T & string
  primaryLabel: string
  secondaryLabel: string
  secondaryRows?: number
  addLabel: string
}) {
  return (
    <section className="border border-line bg-base/30 p-3 md:col-span-2">
      <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">{label}</p>
        <Button variant="quiet" size="sm" icon="plus" onClick={() => onChange([...rows, blank()])}>
          {addLabel}
        </Button>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {rows.length ? (
          rows.map((row, index) => (
            <div key={index} className="grid gap-2 border border-line/60 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
              <Input
                aria-label={`${label} ${index + 1} ${primaryLabel}`}
                label={primaryLabel}
                value={row[primary]}
                onChange={(event) =>
                  onChange(
                    rows.map((current, position) =>
                      position === index ? { ...current, [primary]: event.target.value } : current,
                    ),
                  )
                }
              />
              {secondaryRows ? (
                <Textarea
                  aria-label={`${label} ${index + 1} ${secondaryLabel}`}
                  label={secondaryLabel}
                  rows={secondaryRows}
                  value={row[secondary]}
                  onChange={(event) =>
                    onChange(
                      rows.map((current, position) =>
                        position === index ? { ...current, [secondary]: event.target.value } : current,
                      ),
                    )
                  }
                />
              ) : (
                <Input
                  aria-label={`${label} ${index + 1} ${secondaryLabel}`}
                  label={secondaryLabel}
                  value={row[secondary]}
                  onChange={(event) =>
                    onChange(
                      rows.map((current, position) =>
                        position === index ? { ...current, [secondary]: event.target.value } : current,
                      ),
                    )
                  }
                />
              )}
              <button
                type="button"
                aria-label={`Remove ${label} ${index + 1}`}
                onClick={() => onChange(rows.filter((_, position) => position !== index))}
                className="flex h-[38px] w-8 items-center justify-center self-start border border-line text-fg-faint hover:border-danger/40 hover:text-danger"
              >
                <Icon name="close" size={10} />
              </button>
            </div>
          ))
        ) : (
          <p className="py-2 text-[11px] text-fg-faint">No rows yet. Add one to publish a section.</p>
        )}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-fg-faint">{hint}</p>
    </section>
  )
}

export function PlansTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const patch = (id: string, change: Partial<SiteContent['plans'][number]>) =>
    update((current) => ({
      ...current,
      plans: current.plans.map((plan) => (plan.id === id ? { ...plan, ...change } : plan)),
    }))

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {draft.plans.map((plan) => (
        <section key={plan.id} className="border border-line bg-panel/30">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">{plan.id}</span>
            <Toggle checked={plan.featured} onChange={(checked) => patch(plan.id, { featured: checked })} label="Featured" />
          </div>
          <div className="flex flex-col gap-3 p-4">
            <Input label="Name" value={plan.name} onChange={(event) => patch(plan.id, { name: event.target.value })} />
            <Input label="Price" value={plan.price} onChange={(event) => patch(plan.id, { price: event.target.value })} />
            <Input label="Price note" value={plan.priceNote} onChange={(event) => patch(plan.id, { priceNote: event.target.value })} />
            <Input label="Visits" value={plan.visits} onChange={(event) => patch(plan.id, { visits: event.target.value })} />
            <Textarea label="Summary" rows={3} value={plan.summary} onChange={(event) => patch(plan.id, { summary: event.target.value })} />
            <Textarea label="Includes · one per line" rows={5} value={plan.includes.join('\n')} onChange={(event) => patch(plan.id, { includes: event.target.value.split('\n').map((entry) => entry.trim()).filter(Boolean) })} />
            <Textarea label="Excluded" rows={3} value={plan.excluded} onChange={(event) => patch(plan.id, { excluded: event.target.value })} />
            <Button
              variant="danger"
              size="sm"
              icon="close"
              onClick={() => update((current) => ({ ...current, plans: current.plans.filter((entry) => entry.id !== plan.id) }))}
            >
              Remove plan
            </Button>
          </div>
        </section>
      ))}
      <Button
        variant="secondary"
        icon="plus"
        onClick={() =>
          update((current) => ({
            ...current,
            plans: [
              ...current.plans,
              {
                id: `plan-${Date.now().toString(36)}`,
                name: 'New plan',
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
        }
      >
        Add plan
      </Button>
    </div>
  )
}

export function FaqsTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const patch = (id: string, change: Partial<SiteContent['faqs'][number]>) =>
    update((current) => ({
      ...current,
      faqs: current.faqs.map((faq) => (faq.id === id ? { ...faq, ...change } : faq)),
    }))

  return (
    <div className="flex flex-col gap-3">
      {draft.faqs.map((faq, index) => (
        <section key={faq.id} className="border border-line bg-panel/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
              Question {String(index + 1).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-4">
              <Toggle checked={faq.published} onChange={(checked) => patch(faq.id, { published: checked })} label="Published" />
              <button
                type="button"
                aria-label="Delete FAQ"
                onClick={() => update((current) => ({ ...current, faqs: current.faqs.filter((entry) => entry.id !== faq.id) }))}
                className="text-fg-faint hover:text-danger"
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <Input label="Question" value={faq.question} onChange={(event) => patch(faq.id, { question: event.target.value })} />
            <Textarea label="Answer" rows={3} value={faq.answer} onChange={(event) => patch(faq.id, { answer: event.target.value })} />
          </div>
        </section>
      ))}
      <Button
        variant="secondary"
        icon="plus"
        className="self-start"
        onClick={() =>
          update((current) => ({
            ...current,
            faqs: [
              ...current.faqs,
              { id: `faq-${Date.now().toString(36)}`, question: 'New question', answer: '', published: false },
            ],
          }))
        }
      >
        Add question
      </Button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  SEO                                                                        */
/* -------------------------------------------------------------------------- */

export function SeoTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const seo = draft.seo
  const patchPage = (index: number, change: Partial<SiteContent['seo']['pages'][number]>) =>
    update((current) => ({
      ...current,
      seo: {
        ...current.seo,
        pages: current.seo.pages.map((page, i) => (i === index ? { ...page, ...change } : page)),
      },
    }))

  return (
    <div className="flex flex-col gap-4">
      <Section title="Search defaults" description="Title template supports {page} and {brand}.">
        <Input label="Title template" value={seo.titleTemplate} onChange={(event) => update((current) => ({ ...current, seo: { ...current.seo, titleTemplate: event.target.value } }))} />
        <Input label="Canonical base" value={seo.canonicalBase} onChange={(event) => update((current) => ({ ...current, seo: { ...current.seo, canonicalBase: event.target.value } }))} />
        <Wide>
          <Textarea label="Default description" rows={3} value={seo.defaultDescription} onChange={(event) => update((current) => ({ ...current, seo: { ...current.seo, defaultDescription: event.target.value } }))} />
        </Wide>
        <Wide>
          <Textarea label="Keywords · one per line" rows={4} value={seo.keywords.join('\n')} onChange={(event) => update((current) => ({ ...current, seo: { ...current.seo, keywords: event.target.value.split('\n').map((entry) => entry.trim()).filter(Boolean) } }))} />
        </Wide>
        <Input label="Open Graph image" value={seo.ogImage} onChange={(event) => update((current) => ({ ...current, seo: { ...current.seo, ogImage: event.target.value } }))} />
        <Input label="Robots" value={seo.robots} onChange={(event) => update((current) => ({ ...current, seo: { ...current.seo, robots: event.target.value } }))} />
      </Section>

      <section className="border border-line bg-panel/30">
        <div className="border-b border-line px-5 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">Route metadata</h2>
          <p className="mt-1 text-[11px] text-fg-faint">
            Exact-path titles and descriptions. Service detail pages inherit the service name and this description.
          </p>
        </div>
        <div className="flex flex-col divide-y divide-line">
          {seo.pages.map((page, index) => (
            <div key={`${page.path}-${index}`} className="grid gap-2 p-3 md:grid-cols-[160px_1fr_1.4fr_auto]">
              <Input aria-label={`Path ${index + 1}`} placeholder="/path" value={page.path} onChange={(event) => patchPage(index, { path: event.target.value })} />
              <Input aria-label={`Title ${index + 1}`} placeholder="Page title" value={page.title} onChange={(event) => patchPage(index, { title: event.target.value })} />
              <Input aria-label={`Description ${index + 1}`} placeholder="Meta description" value={page.description} onChange={(event) => patchPage(index, { description: event.target.value })} />
              <button
                type="button"
                aria-label={`Delete metadata for ${page.path}`}
                onClick={() => update((current) => ({ ...current, seo: { ...current.seo, pages: current.seo.pages.filter((_, i) => i !== index) } }))}
                className="flex h-[var(--btn-h-md)] w-10 items-center justify-center border border-line text-fg-faint hover:border-danger/40 hover:text-danger"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-line p-4">
          <Button variant="secondary" size="sm" icon="plus" onClick={() => update((current) => ({ ...current, seo: { ...current.seo, pages: [...current.seo.pages, { path: '/', title: '', description: '' }] } }))}>
            Add route
          </Button>
        </div>
      </section>

      <div className="border border-line bg-panel/30 p-4 font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-fg-faint">
        JSON-LD (Organization, WebSite, Breadcrumb, Service, FAQ), canonical links, Open Graph and Twitter
        cards are generated from this record at runtime. /sitemap.xml and /robots.txt are generated by the API
        from the same document, so a published service or route appears in the sitemap immediately.
      </div>
    </div>
  )
}
