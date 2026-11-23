import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon, type IconName } from '@/components/icons'
import { Accordion, Badge, ButtonAnchor, ButtonLink, SectionHeader } from '@/components/ui'
import { MagneticButton, ParallaxDrift, ScrollReveal, SplitReveal } from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import type { SiteServiceOverride, SiteWorkCase } from '@hvac/shared'
import { categoryLabels, type CatalogueService } from '@/content/services'
import { getServiceDetail, type Pair, type ServiceDetail } from '@/content/serviceDetails'
import { useSiteContent, useSiteServices } from '@/content/SiteContentProvider'
import { useSeo } from '@/lib/seo'
import { NotFound } from '@/routes/NotFound'
import { EnquiryForm } from '@/routes/contact/EnquiryForm'
import { ServiceCalculator } from '@/routes/services/ServiceCalculator'
import { ServiceDiagram } from '@/routes/services/ServiceDiagram'

type FullService = ServiceDetail & { catalogue: CatalogueService }

const defaultStandards = [
  'ISHRAE comfort data',
  'ASHRAE fundamentals',
  'BIS practice',
  'ISO 9001:2015',
]

const projectByService: Record<string, string> = {
  'vrf-systems': 'VRF',
  'chilled-water': 'Chiller',
  'precision-cooling': 'Cleanroom',
  'cold-rooms': 'Cold room',
  amc: 'AMC',
  'chiller-maintenance': 'AMC',
}

/**
 * A service added from the admin has no compiled page file. This builds the
 * same template from the fields the editor owns, so a new catalogue row is a
 * working page rather than a dead link.
 */
function fallbackService(override: SiteServiceOverride): FullService {
  const name = override.name || 'Service'
  const catalogue: CatalogueService = {
    id: override.id,
    index: override.index || '—',
    name,
    category: override.category,
    icon: 'airflow' as const,

    capacity: override.capacity || 'On survey',
    timeline: override.timeline || 'Scheduled after survey',
    specification: override.specification || 'Written at survey',
    scope: override.scope || override.intro || '',
  }
  const specs: Pair[] = override.specs?.length
    ? override.specs.map((entry): Pair => [entry.label, entry.value])
    : [
        ['Capacity', catalogue.capacity],
        ['Lead time', catalogue.timeline],
        ['Specification', catalogue.specification],
      ]
  return {
    id: override.id,
    headline: override.headline || name,
    intro:
      override.intro ||
      override.scope ||
      `${name}, surveyed, installed and commissioned by our own crews. The scope below is the one written into the quotation.`,
    warranty: override.warranty || '12 months on workmanship',
    startingFrom: override.startingFrom || 'Quoted after survey',
    priceBasis: override.priceBasis || 'the surveyed scope',
    priceFactors: override.priceFactors?.length
      ? override.priceFactors
      : [
          'Capacity and equipment selection',
          'Access, containment and pipe route',
          'Lead time and site phasing',
        ],
    includes: override.includes?.length
      ? override.includes
      : [
          'Site survey and measured load',
          'Equipment supply and installation',
          'Commissioning record and handover file',
        ],
    excludes: override.excludes?.length
      ? override.excludes
      : [
          'Civil work and structural openings',
          'Electrical point to the unit',
          'Society NOC and lift charges',
        ],
    specs,
    selection: override.selection?.length
      ? override.selection.map((entry): Pair => [entry.title, entry.body])
      : [['Selection spec', catalogue.specification]],
    site: override.site ?? [],
    steps: (override.steps ?? []).map((entry): Pair => [entry.title, entry.body]),
    faqs: (override.faqs ?? []).map((entry): Pair => [entry.question, entry.answer]),
    standards: override.standards?.length ? override.standards : defaultStandards,
    related: [],
    catalogue,
  }
}

export function ServiceDetailPage() {
  const { id = '' } = useParams()
  const brand = useBrand()
  const { content } = useSiteContent()
  const liveServices = useSiteServices()
  const [prefill, setPrefill] = useState('')

  // Overrides win over the compiled file; an unpublished or removed service
  // leaves the index immediately instead of rendering a stale page.
  const service = useMemo<FullService | null>(() => {
    const override = content.services.find((entry) => entry.id === id)
    if (content.services.length && !override) return null
    if (override && !override.published) return null
    const base = getServiceDetail(id)
    if (!base) return override ? fallbackService(override) : null
    const catalogue: CatalogueService = {
      ...base.catalogue,
      name: override?.name || base.catalogue.name,
      index: override?.index || base.catalogue.index,
      category: override?.category ?? base.catalogue.category,
      capacity: override?.capacity || base.catalogue.capacity,
      timeline: override?.timeline || base.catalogue.timeline,
      specification: override?.specification || base.catalogue.specification,
      scope: override?.scope || base.catalogue.scope,
    }
    return {
      ...base,
      catalogue,
      headline: override?.headline || base.headline,
      intro: override?.intro || override?.scope || base.intro,
      startingFrom: override?.startingFrom || base.startingFrom,
      warranty: override?.warranty || base.warranty,
      priceBasis: override?.priceBasis || base.priceBasis,
      includes: override?.includes ?? base.includes,
      excludes: override?.excludes ?? base.excludes,
      site: override?.site ?? base.site,
      priceFactors: override?.priceFactors ?? base.priceFactors,
      standards: override?.standards ?? base.standards,
      specs: override?.specs?.length
        ? override.specs.map((entry): Pair => [entry.label, entry.value])
        : base.specs,
      selection: override?.selection?.length
        ? override.selection.map((entry): Pair => [entry.title, entry.body])
        : base.selection,
      steps: override?.steps?.length
        ? override.steps.map((entry): Pair => [entry.title, entry.body])
        : base.steps,
      faqs: override?.faqs?.length
        ? override.faqs.map((entry): Pair => [entry.question, entry.answer])
        : base.faqs,
    }
  }, [content.services, id])

  useSeo({
    path: `/services/${id}`,
    title: service?.catalogue.name,
    description: service?.intro,
    faqs: service?.faqs.map(([question, answer]) => ({ question, answer })),
    service: service
      ? {
          name: service.catalogue.name,
          description: service.intro,
          category: categoryLabels[service.catalogue.category],
        }
      : undefined,
  })

  if (!service) return <NotFound />

  const { catalogue } = service
  const liveById = new Map(liveServices.map((entry) => [entry.id, entry]))
  const related = getServiceDetail(service.id)
    ? getServiceDetail(service.id)!
        .related.map((relatedId) => getServiceDetail(relatedId))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .filter((entry) => liveById.has(entry.id))
        .map((entry) => {
          const live = liveById.get(entry.id)!
          return {
            ...entry,
            catalogue: {
              ...entry.catalogue,
              name: live.name,
              index: live.index,
              category: live.category,
              icon: (live.icon ?? ('airflow' as IconName)) as IconName,
              capacity: live.capacity,
              timeline: live.timeline,
              specification: live.specification,
              scope: live.scope,
            },
          }
        })
    : []
  const projectCategory = projectByService[service.id]
  const project = projectCategory
    ? content.workCases.find((entry) => entry.category === projectCategory)
    : undefined

  const blockMap: Record<string, ReactNode> = {
    scope: <ScopeBlock service={service} />,
    technical: <TechnicalBlock service={service} equipmentBrands={content.equipmentBrands} />,
    specs: <SpecsBlock service={service} />,
    calculator: service.calculator ? (
      <section className="section border-b border-line bg-panel/20">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <span className="annot">Sizing helper</span>
            <h2 className="t-h2 mt-5 max-w-[12ch] text-fg">Start with the load.</h2>
            <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-fg-dim">
              An indicative figure to frame the survey. Change the inputs, then send the numbers
              with your brief — the lead arrives with the service and the calculation attached.
            </p>
            <ul className="mt-6 flex flex-col gap-2 border-t border-line pt-4 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
              <li>· Not a substitute for a measured load</li>
              <li>· Output attached to the enquiry</li>
              <li>· Assumptions stated in the brief</li>
            </ul>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <ServiceCalculator
              kind={service.calculator}
              serviceName={catalogue.name}
              onSend={setPrefill}
            />
          </div>
        </div>
      </section>
    ) : null,
    process: <ProcessBlock service={service} />,
    pricing: <PricingBlock service={service} />,
    faq: <FaqBlock service={service} />,
    related: <RelatedBlock service={service} related={related} project={project} />,
    enquire: (
      <section className="section-lg border-b border-line">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <EnquiryForm
              lockedServiceId={service.id}
              source="service-page"
              prefillMessage={prefill}
              context={`Service page · ${catalogue.name} · ${catalogue.index}`}
            />
          </div>

          <aside className="md:col-span-4 md:col-start-9">
            <div className="flex flex-col gap-6 md:sticky md:top-[calc(var(--header-h)+24px)]">
              <div className="marks border border-line bg-panel/60 p-6">
                <span className="t-label">What happens next</span>
                <ol className="mt-4 flex flex-col">
                  {[
                    [
                      '01',
                      'Lead logged',
                      `Routed to the ${catalogue.name} desk with its service slug.`,
                    ],
                    ['02', 'Engineer call', 'Within one working hour, during business hours.'],
                    ['03', 'Survey', `Scheduled in ${catalogue.timeline} where access allows.`],
                    ['04', 'Fixed quote', 'Itemised, with exclusions and GST shown.'],
                  ].map(([index, title, body]) => (
                    <li
                      key={index}
                      className="flex gap-3 border-t border-line/70 py-3 first:border-t-0 first:pt-0"
                    >
                      <span className="t-num text-[9px] text-cold">{index}</span>
                      <span>
                        <span className="block text-[12px] text-fg">{title}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-fg-faint">
                          {body}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border border-line p-6">
                <span className="t-label">Direct</span>
                <div className="mt-4 flex flex-col gap-3">
                  <a
                    href={`tel:${brand.contact.phone}`}
                    className="flex items-center gap-2 font-mono text-[12px] text-fg transition-colors duration-2 hover:text-cold"
                  >
                    <Icon name="phone" size={14} className="text-fg-faint" />
                    {brand.contact.phoneDisplay}
                  </a>
                  <a
                    href={`tel:${brand.contact.emergencyPhone}`}
                    className="flex items-center gap-2 font-mono text-[12px] text-heat transition-colors duration-2 hover:text-fg"
                  >
                    <Icon name="bolt" size={14} />
                    {brand.contact.emergencyPhone}
                  </a>
                  <a
                    href={`mailto:${brand.contact.email}`}
                    className="flex items-center gap-2 font-mono text-[11px] text-fg-dim transition-colors duration-2 hover:text-cold"
                  >
                    <Icon name="mail" size={14} className="text-fg-faint" />
                    {brand.contact.email}
                  </a>
                </div>
                <div className="thread mt-5" />
                <p className="mt-4 text-[11px] leading-relaxed text-fg-faint">
                  Cash, cheque, bank transfer or card on site. No payment gateway, no processing
                  fee.
                </p>
              </div>

              <Link
                to="/services"
                className="flex items-center justify-between gap-3 border border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:border-cold/60 hover:text-cold"
              >
                All {liveServices.length} services
                <Icon name="arrow-right" size={12} />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    ),
  }

  const sectionOrder =
    catalogue.category === 'residential'
      ? [
          'scope',
          'calculator',
          'technical',
          'specs',
          'process',
          'pricing',
          'faq',
          'related',
          'enquire',
        ]
      : catalogue.category === 'commercial'
        ? [
            'technical',
            'specs',
            'scope',
            'calculator',
            'process',
            'pricing',
            'faq',
            'related',
            'enquire',
          ]
        : catalogue.category === 'industrial'
          ? [
              'specs',
              'technical',
              'scope',
              'calculator',
              'process',
              'pricing',
              'faq',
              'related',
              'enquire',
            ]
          : ['scope', 'process', 'specs', 'pricing', 'faq', 'related', 'enquire']

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="shell pb-14 pt-8 lg:pt-10">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint"
          >
            <Link to="/" className="transition-colors duration-2 hover:text-cold">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link to="/services" className="transition-colors duration-2 hover:text-cold">
              Services
            </Link>
            <span aria-hidden>/</span>
            <span>{categoryLabels[catalogue.category]}</span>
            <span aria-hidden>/</span>
            <span aria-current="page" className="text-fg-dim">
              {catalogue.name}
            </span>
          </nav>

          <div className="mt-10 grid gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="flex flex-wrap items-center gap-3">
                <span className="annot">Service · CV-SVC-{catalogue.index}</span>
                <Badge tone={catalogue.category === 'maintenance' ? 'heat' : 'cold'} dot>
                  {categoryLabels[catalogue.category]}
                </Badge>
              </div>

              <SplitReveal as="h1" className="t-display mt-7 max-w-[14ch] text-fg" stagger={0.04}>
                {service.headline}
              </SplitReveal>

              <p className="t-lead mt-7 max-w-[58ch]">{service.intro}</p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <MagneticButton>
                  <ButtonAnchor href="#enquire" size="lg" icon="arrow-up-right">
                    Get a quote for this service
                  </ButtonAnchor>
                </MagneticButton>
                <ButtonAnchor
                  href={`tel:${brand.contact.emergencyPhone}`}
                  variant="secondary"
                  size="lg"
                  icon="bolt"
                >
                  Emergency dispatch
                </ButtonAnchor>
              </div>

              <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-5 sm:grid-cols-4">
                {[
                  ['Capacity', catalogue.capacity],
                  ['Lead time', catalogue.timeline],
                  ['Warranty', service.warranty],
                  ['From', service.startingFrom],
                ].map(([label, value]) => (
                  <div key={label} className="flex min-w-0 flex-col gap-1">
                    <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                      {label}
                    </dt>
                    <dd className="break-words text-[11px] leading-snug text-fg-dim">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="md:col-span-4 md:col-start-9">
              <ServiceDiagram service={service} />
              <p className="mt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
                Drawn from the service record · not a site-specific layout
              </p>
            </div>
          </div>
        </div>
      </section>

      {sectionOrder.map((key) => (
        <div key={key}>{blockMap[key] ?? null}</div>
      ))}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Blocks                                                                      */
/* -------------------------------------------------------------------------- */

function ScopeBlock({ service }: { service: FullService }) {
  return (
    <section className="section border-b border-line">
      <div className="shell grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <span className="annot">01 · Scope</span>
          <h2 className="t-h2 mt-5 max-w-[12ch] text-fg">What this includes.</h2>
          <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-fg-dim">
            The scope is written to be checked line by line. What is not included is listed beside
            it, at the same size — not buried in a footnote.
          </p>
          <ScrollReveal className="mt-6 border border-line bg-panel/40 p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              Selection spec
            </span>
            <p className="mt-1.5 text-[12px] leading-relaxed text-fg-dim">
              {service.catalogue.specification}
            </p>
          </ScrollReveal>
        </div>

        <div className="grid gap-6 md:col-span-7 md:col-start-6">
          <ScrollReveal className="border border-line bg-panel/60 p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="t-label">Included</span>
              <span className="t-num text-[10px] text-fg-faint">
                {String(service.includes.length).padStart(2, '0')}
              </span>
            </div>
            <ul className="mt-4 flex flex-col">
              {service.includes.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 border-t border-line/70 py-2.5 text-[12px] leading-snug text-fg-dim first:border-t-0 first:pt-0"
                >
                  <Icon name="check" size={13} className="mt-0.5 shrink-0 text-cold" />
                  {item}
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal delay={0.06} className="border border-line/80 border-dashed bg-base/40 p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="t-label">Not included · priced separately</span>
              <span className="t-num text-[10px] text-fg-faint">
                {String(service.excludes.length).padStart(2, '0')}
              </span>
            </div>
            <ul className="mt-4 flex flex-col">
              {service.excludes.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 border-t border-line/60 py-2.5 text-[12px] leading-snug text-fg-faint first:border-t-0 first:pt-0"
                >
                  <Icon name="minus" size={13} className="mt-0.5 shrink-0 text-fg-faint" />
                  {item}
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

function TechnicalBlock({
  service,
  equipmentBrands,
}: {
  service: FullService
  equipmentBrands: string[]
}) {
  const standards = service.standards ?? defaultStandards
  return (
    <section className="section border-b border-line bg-panel/20">
      <div className="shell grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="md:sticky md:top-[calc(var(--header-h)+32px)]">
            <span className="annot">Technical</span>
            <h2 className="t-h2 mt-5 max-w-[13ch] text-fg">Selection is a sequence.</h2>
            <p className="mt-5 max-w-[36ch] text-sm leading-relaxed text-fg-dim">
              The specification only works if the decisions before it are right. These are the three
              checks that change the number on a {service.catalogue.name.toLowerCase()} job.
            </p>

            <ParallaxDrift
              className="mt-8 hidden h-[260px] border border-line bg-panel/50 md:block"
              strength={7}
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgb(var(--line)/0.5) 0 1px, transparent 1px 36px), repeating-linear-gradient(90deg, rgb(var(--line)/0.5) 0 1px, transparent 1px 36px)',
                }}
              />
              <Icon
                name={service.catalogue.icon}
                size={210}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-cold/25"
              />
              <span className="absolute bottom-3 left-3 font-mono text-[8px] uppercase tracking-[0.16em] text-fg-faint">
                CV-TEC · {service.catalogue.index}
              </span>
            </ParallaxDrift>
          </div>
        </div>

        <div className="md:col-span-7">
          {service.selection.map(([title, body], index) => (
            <ScrollReveal
              key={title}
              delay={index * 0.04}
              className="grid gap-3 border-t border-line py-6 last:border-b md:grid-cols-12 md:gap-4"
            >
              <span className="t-num text-[10px] text-cold md:col-span-1">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="t-h4 text-fg md:col-span-4">{title}</h3>
              <p className="text-sm leading-relaxed text-fg-dim md:col-span-7">{body}</p>
            </ScrollReveal>
          ))}

          <div className="mt-8 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Standards used
              </span>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {standards.map((standard) => (
                  <li key={standard}>
                    <Badge>{standard}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Equipment commissioned
              </span>
              <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-fg-dim">
                {equipmentBrands.slice(0, 5).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SpecsBlock({ service }: { service: FullService }) {
  const standards = service.standards ?? defaultStandards
  return (
    <section className="section border-b border-line">
      <div className="shell">
        <SectionHeader
          index="02"
          label="Specification"
          title="The numbers we hold."
          description="Capacity, refrigerant, test values and timing. These are the figures quoted and checked at handover — not a best-case range."
          action={
            <Badge tone="cold" dot>
              CV-{service.catalogue.index}
            </Badge>
          }
        />

        <div className="mt-10 grid gap-8 md:grid-cols-12">
          <ScrollReveal className="md:col-span-7">
            <dl className="border-t border-line">
              {service.specs.map(([label, value]) => (
                <div key={label} className="grid grid-cols-2 gap-4 border-b border-line/70 py-3.5">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    {label}
                  </dt>
                  <dd className="t-num text-right text-[11px] text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </ScrollReveal>

          <ScrollReveal delay={0.06} className="md:col-span-4 md:col-start-9">
            <div className="border border-line bg-panel/60 p-6">
              <span className="t-label">Warranty &amp; standards</span>
              <p className="mt-4 text-[13px] leading-relaxed text-fg-dim">{service.warranty}</p>
              <div className="thread mt-5" />
              <ul className="mt-4 flex flex-col gap-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
                {standards.map((standard) => (
                  <li key={standard} className="flex items-center gap-2">
                    <span aria-hidden className="h-1 w-1 bg-cold/60" />
                    {standard}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] leading-relaxed text-fg-faint">
                Specs are confirmed against the manufacturer’s datasheet for the selected model at
                quotation. Where a site limit is tighter, the site limit wins.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

function ProcessBlock({ service }: { service: FullService }) {
  return (
    <section className="section border-b border-line">
      <div className="shell">
        <SectionHeader
          index="03"
          label="Process"
          title={`${service.catalogue.name}, from survey to sign-off.`}
          description="Each step ends with a deliverable you can hold. The commissioning record is written during the job, not reconstructed after the first breakdown."
        />

        <div className="mt-10 grid gap-8 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="grid gap-3 sm:grid-cols-2">
              {service.steps.map(([title, body], index) => (
                <ScrollReveal
                  key={title}
                  delay={index * 0.04}
                  className="marks flex flex-col gap-3 border border-line bg-panel/50 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="t-num text-[10px] text-cold">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Icon
                      name={
                        index === 0
                          ? 'search'
                          : index === 1
                            ? 'gauge'
                            : index === 2
                              ? 'wrench'
                              : 'check'
                      }
                      size={16}
                      className="text-fg-faint"
                    />
                  </div>
                  <h3 className="t-h4 text-fg">{title}</h3>
                  <p className="text-[12px] leading-relaxed text-fg-dim">{body}</p>
                </ScrollReveal>
              ))}
            </div>
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <div className="border border-line bg-ink-block p-6 text-on-ink md:sticky md:top-[calc(var(--header-h)+24px)]">
              <span className="t-label !text-on-ink/60">Before we mobilise</span>
              <ul className="mt-4 flex flex-col">
                {service.site.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 border-t border-on-ink/10 py-3 text-[12px] leading-snug text-on-ink/80 first:border-t-0 first:pt-0"
                  >
                    <Icon name="check" size={13} className="mt-0.5 shrink-0 text-heat" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-on-ink/10 pt-4">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-on-ink/45">
                  Typical lead time
                </span>
                <p className="t-num mt-1 text-[13px] text-on-ink">{service.catalogue.timeline}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PricingBlock({ service }: { service: FullService }) {
  return (
    <section className="section border-b border-line bg-panel/30">
      <div className="shell grid gap-10 md:grid-cols-12">
        <div className="md:col-span-6">
          <span className="annot">04 · Pricing</span>
          <h2 className="t-h2 mt-5 max-w-[13ch] text-fg">What moves the price.</h2>
          <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-fg-dim">
            No lump sum without a schedule. The starting figure covers {service.priceBasis}; the
            quotation itemises every line beyond it.
          </p>

          <div className="mt-7 border-t border-line pt-5">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              Starting from
            </span>
            <p className="t-num mt-1 text-h2 text-fg">{service.startingFrom}</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
              {service.priceBasis} · tax extra
            </p>
          </div>
        </div>

        <div className="md:col-span-5 md:col-start-8">
          <div className="border border-line bg-base/40 p-6">
            <span className="t-label">Priced on</span>
            <ul className="mt-4 flex flex-col">
              {service.priceFactors.map((factor, index) => (
                <li
                  key={factor}
                  className="flex gap-3 border-t border-line/70 py-3 first:border-t-0 first:pt-0"
                >
                  <span className="t-num text-[9px] text-cold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[12px] leading-snug text-fg-dim">{factor}</span>
                </li>
              ))}
            </ul>
            <div className="thread mt-4" />
            <p className="mt-4 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
              Cash · cheque · bank transfer · card on site. No payment gateway.
            </p>
            <div className="mt-5">
              <ButtonLink
                to={`/contact?service=${service.id}`}
                variant="secondary"
                size="sm"
                full
                icon="arrow-right"
              >
                Send the brief
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FaqBlock({ service }: { service: FullService }) {
  return (
    <section className="section border-b border-line">
      <div className="shell grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <span className="annot">05 · Questions</span>
          <h2 className="t-h2 mt-5 max-w-[11ch] text-fg">Asked before the quote.</h2>
          <p className="mt-5 max-w-[32ch] text-sm leading-relaxed text-fg-dim">
            Answers for {service.catalogue.name.toLowerCase()}. If a quotation contradicts one of
            these, send it back.
          </p>
        </div>

        <div className="md:col-span-8 md:col-start-5">
          <Accordion
            allowMultiple
            defaultOpen={`${service.id}-faq-0`}
            items={service.faqs.map(([question, answer], index) => ({
              id: `${service.id}-faq-${index}`,
              title: question,
              content: answer,
            }))}
          />
        </div>
      </div>
    </section>
  )
}

interface RelatedBlockProps {
  service: FullService
  related: FullService[]
  project: SiteWorkCase | undefined
}

function RelatedBlock({ service, related, project }: RelatedBlockProps) {
  return (
    <section className="section border-b border-line bg-panel/20">
      <div className="shell grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <span className="annot">06 · Nearby</span>
          <h2 className="t-h2 mt-5 max-w-[12ch] text-fg">Often specified together.</h2>
          <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-fg-dim">
            Systems that share a riser, a plant room or a maintenance schedule with{' '}
            {service.catalogue.name.toLowerCase()}.
          </p>
          <div className="mt-6">
            <ButtonLink to="/services" variant="secondary" size="sm" icon="arrow-right">
              Full service index
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-3 md:col-span-8 md:grid-cols-2">
          {related.map((entry) => (
            <Link
              key={entry.id}
              to={`/services/${entry.id}`}
              className="wash group flex flex-col justify-between gap-5 border border-line bg-panel/60 p-5 transition-colors duration-2 hover:border-cold/40"
            >
              <div className="flex items-start justify-between gap-3">
                <Icon
                  name={entry.catalogue.icon}
                  size={24}
                  className="text-fg-dim transition-colors duration-2 group-hover:text-cold"
                />
                <span className="t-num text-[9px] text-fg-faint">{entry.catalogue.index}</span>
              </div>
              <div>
                <h3 className="text-[14px] font-medium leading-snug text-fg transition-colors duration-2 group-hover:text-cold">
                  {entry.catalogue.name}
                </h3>
                <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                  {entry.catalogue.capacity} · {entry.catalogue.timeline}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cold">
                Open file
                <Icon name="arrow-right" size={11} />
              </span>
            </Link>
          ))}

          {project ? (
            <Link
              to="/work"
              className="group flex flex-col justify-between gap-4 border border-line bg-base/40 p-5 transition-colors duration-2 hover:border-cold/40 md:col-span-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="t-label">Case file · {project.category}</span>
                <span className="t-num text-[9px] text-fg-faint">{project.year}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <h3 className="t-h4 text-fg transition-colors duration-2 group-hover:text-cold">
                    {project.name}
                  </h3>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                    {project.location} · {project.spec}
                  </p>
                  <p className="mt-2 max-w-[52ch] text-[12px] leading-snug text-fg-dim">
                    {project.detail}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cold">
                  Read case
                  <Icon name="arrow-right" size={11} />
                </span>
              </div>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}
