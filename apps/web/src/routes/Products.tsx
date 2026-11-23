import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge, ButtonAnchor, ButtonLink, SectionHeader, Tabs } from '@/components/ui'
import { EditorialPlate } from '@/components/content/EditorialPlate'
import { DepthLayer, DepthScene, MagneticButton, ScrollReveal, SplitReveal, TiltCard } from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'
import { useSeo } from '@/lib/seo'
import { PageBackdrop } from '@/components/site/PageBackdrop'

const serviceForCategory: Record<string, string> = {
  Residential: 'split-ac-installation',
  Commercial: 'vrf-systems',
  Industrial: 'precision-cooling',
}

const serviceForProduct: Record<string, string> = {
  'high-wall-inverter-split': 'split-ac-installation',
  'ceiling-cassette-system': 'split-ac-installation',
  'ducted-residential-system': 'ducted-residential',
  'vrf-heat-recovery-system': 'vrf-systems',
  'air-cooled-chiller-plant': 'chilled-water',
  'precision-cooling-unit': 'precision-cooling',
  'cold-room-package': 'cold-rooms',
  'commercial-kitchen-ventilation': 'kitchen-ventilation',
}

const selectionSteps = [
  {
    index: '01',
    title: 'Load and route',
    body: 'Room schedule, orientation, fresh air, pipe or duct route and plant access. The catalogue range narrows only after those inputs exist.',
  },
  {
    index: '02',
    title: 'Equipment and controls',
    body: 'Refrigerant, part-load performance, acoustic limit, BMS protocol and service network. We name the model and the assumption behind it.',
  },
  {
    index: '03',
    title: 'Scope and handover',
    body: 'Delivery, installation, electrical interface, commissioning, as-builts and the training visit. The quotation lists exclusions line by line.',
  },
]

export function Products() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const copy = content.pages.products
  const sections = content.pageSections.products
  const [category, setCategory] = useState('All')

  const products = useMemo(
    () => content.products.filter((product) => product.published),
    [content.products],
  )
  const featured = products.filter((product) => product.featured).slice(0, 3)
  const categories = ['All', ...Array.from(new Set(products.map((product) => product.category)))]
  const filtered = category === 'All' ? products : products.filter((product) => product.category === category)

  const itemList = useMemo(
    () =>
      products.map((product) => ({
        name: product.name,
        path: `/products#${product.slug}`,
        description: product.summary,
      })),
    [products],
  )

  useSeo({
    path: '/products',
    title: 'Systems catalogue',
    description: copy.lead,
    breadcrumbs: [{ name: 'Systems', path: '/products' }],
    itemList,
  })

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <PageBackdrop src={copy.image} alt={copy.imageAlt} />
        <div className="shell grid gap-x-8 gap-y-12 pb-14 pt-12 md:grid-cols-12 lg:pt-16">
          <div className="md:col-span-7">
            <span className="annot">Systems · CV-PRD-00</span>
            <SplitReveal
              key={copy.headline}
              as="h1"
              className="t-display mt-7 max-w-[16ch] text-fg"
              stagger={0.045}
            >
              {copy.headline}
            </SplitReveal>
            <p className="t-lead mt-7 max-w-[58ch]">{copy.lead}</p>

            <div className="mt-8 border-l-2 border-cold bg-cold/5 px-5 py-4">
              <span className="t-label text-cold">How this catalogue works</span>
              <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed text-fg-dim">
                {content.home.productsAnswer}
              </p>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <MagneticButton>
                <ButtonLink to="/contact" size="lg" icon="arrow-up-right">
                  Request a selection
                </ButtonLink>
              </MagneticButton>
              <ButtonAnchor href="#catalogue" variant="secondary" size="lg">
                Open the catalogue
              </ButtonAnchor>
            </div>
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <DepthScene className="h-[340px]">
              <DepthLayer depth={0} className="absolute inset-x-4 bottom-6 top-8 border border-line bg-panel/40">
                <div className="h-full w-full" />
              </DepthLayer>
              <DepthLayer depth={1.2} className="absolute inset-x-8 bottom-12 top-2 border border-line bg-panel/70 p-5">
                <div className="flex items-center justify-between">
                  <span className="t-label">Specification board</span>
                  <span className="t-num text-[9px] text-fg-faint">01 / 08</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    ['Family', 'Split → plant'],
                    ['Capacity', '1.5 – 1,200 TR'],
                    ['Refrigerant', 'R-32 / R-410A'],
                    ['Quote', 'After survey'],
                  ].map(([label, value]) => (
                    <div key={label} className="border-t border-line pt-2">
                      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                        {label}
                      </span>
                      <p className="t-num mt-1 text-[10px] text-fg">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="depth-ruler mt-5 h-6" />
              </DepthLayer>
              <DepthLayer depth={2.4} className="absolute inset-x-14 top-12 border border-cold/40 bg-base/90 p-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-cold">
                  Commissioning checks
                </span>
                <ul className="mt-2 flex flex-col gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-fg-dim">
                  <li>— Load vs measured capacity</li>
                  <li>— Static pressure at every branch</li>
                  <li>— Delta-T at design airflow</li>
                </ul>
              </DepthLayer>
              <DepthLayer depth={3.3} className="absolute bottom-14 right-0 w-[152px] border border-heat/40 bg-panel p-3 shadow-pop">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  Start point
                </span>
                <p className="t-num mt-1 text-[16px] text-fg">From $480</p>
                <p className="mt-1 text-[9px] leading-snug text-fg-faint">Defined installation scope · GST extra</p>
              </DepthLayer>
            </DepthScene>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-panel/20">
        <div className="shell grid gap-px bg-line md:grid-cols-3">
          {selectionSteps.map((step) => (
            <div key={step.index} className="bg-base px-6 py-7">
              <div className="flex items-center justify-between">
                <span className="t-num text-[10px] text-cold">{step.index}</span>
                <span className="h-1 w-1 bg-cold" />
              </div>
              <h2 className="t-h4 mt-4 text-fg">{step.title}</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-fg-dim">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {featured.length ? (
        <section className="border-b border-line">
          <div className="shell py-[var(--section-y)]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="annot">Featured specification</span>
                <h2 className="t-h2 mt-4 text-fg">{sections.featured.title}</h2>
              </div>
              <p className="max-w-[42ch] font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
                {sections.featured.body}
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {featured.map((product, index) => (
                <ScrollReveal key={product.id} delay={index * 0.05}>
                  <article className="marks flex h-full flex-col border border-line bg-panel/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone="cold">{product.category}</Badge>
                      <span className="t-num text-[9px] text-fg-faint">{product.capacity}</span>
                    </div>
                    <h3 className="t-h3 mt-4 text-fg">{product.name}</h3>
                    <p className="mt-3 text-[12px] leading-relaxed text-fg-dim">{product.summary}</p>
                    <a
                      href="#catalogue"
                      className="mt-auto inline-flex items-center gap-2 border-t border-line pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
                    >
                      Full specification
                      <Icon name="arrow-right" size={12} />
                    </a>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="catalogue" className="scroll-mt-[var(--header-h)] border-b border-line">
        <div className="shell pb-2 pt-[var(--section-y)]">
          <SectionHeader
            index="02"
            label="Systems catalogue"
            title={sections.catalogue.title}
            description={sections.catalogue.body}
            action={<Badge tone="cold" dot>{products.length} systems</Badge>}
          />
        </div>

        <div className="sticky top-[60px] z-[var(--z-raised)] mt-8 border-y border-line bg-base/95 backdrop-blur-md">
          <div className="shell flex flex-col gap-1 py-3 md:flex-row md:items-end md:justify-between">
            <div className="no-scrollbar -mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)]">
              <Tabs
                tabs={categories.map((entry) => ({
                  id: entry,
                  label: entry,
                  count:
                    entry === 'All'
                      ? products.length
                      : products.filter((product) => product.category === entry).length,
                }))}
                value={category}
                onChange={setCategory}
                ariaLabel="Filter systems by category"
                className="min-w-max border-b-0"
              />
            </div>
            <p aria-live="polite" className="shrink-0 pb-1 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              {filtered.length} of {products.length} systems
            </p>
          </div>
        </div>

        <div className="shell py-12">
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((product, index) => (
              <ScrollReveal key={product.id} delay={(index % 4) * 0.04}>
                <TiltCard max={3}>
                  <article
                    id={product.slug}
                    className="marks flex h-full flex-col border border-line bg-panel/60 p-5 md:p-6"
                  >
                    <div className="grid gap-5 sm:grid-cols-[170px_1fr]">
                      {product.image ? (
                        <div className="min-h-[150px] overflow-hidden border border-line bg-panel">
                          <img
                            src={product.image}
                            alt={product.imageAlt || product.name}
                            loading="lazy"
                            className="h-full min-h-[150px] w-full object-cover"
                          />
                        </div>
                      ) : (
                        <EditorialPlate
                          label={product.plate}
                          code={`CV-PRD-${String(index + 1).padStart(2, '0')}`}
                          tone={product.category === 'Industrial' ? 'heat' : 'cold'}
                          className="min-h-[150px]"
                        />
                      )}
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-cold">
                            {product.category}
                          </span>
                          {product.featured ? <Badge tone="heat">Featured</Badge> : null}
                        </div>
                        <h3 className="t-h3 mt-2 text-fg">{product.name}</h3>
                        <p className="mt-2 text-[12px] leading-relaxed text-fg-dim">{product.summary}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                          <span>{product.capacity}</span>
                          <span>{product.brand}</span>
                        </div>
                      </div>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-line py-4 sm:grid-cols-4">
                      {product.specs.slice(0, 4).map((spec) => (
                        <div key={spec.label} className="flex flex-col gap-0.5">
                          <dt className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                            {spec.label}
                          </dt>
                          <dd className="t-num text-[10px] leading-snug text-fg">{spec.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-4 grid flex-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                      <div>
                        <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                          {product.priceNote}
                        </span>
                        <p className="t-num mt-1 text-[16px] text-fg">{product.priceFrom}</p>
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {product.applications.slice(0, 4).map((application) => (
                            <li key={application}>
                              <Badge>{application}</Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <ButtonLink
                        to={`/contact?service=${serviceForProduct[product.slug] ?? serviceForCategory[product.category] ?? 'split-ac-installation'}`}
                        variant="secondary"
                        size="sm"
                        icon="arrow-up-right"
                      >
                        Request quote
                      </ButtonLink>
                    </div>
                  </article>
                </TiltCard>
              </ScrollReveal>
            ))}
          </div>

          {!filtered.length ? (
            <p className="border border-dashed border-line px-6 py-14 text-center text-sm text-fg-faint">
              No systems in this category.
            </p>
          ) : null}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <p className="max-w-[64ch] font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
              No online checkout. Every system is quoted after a survey, with equipment, installation,
              commissioning and exclusions stated line by line. Cash, cheque, bank transfer or card on site.
            </p>
            <a
              href={`tel:${brand.contact.phone}`}
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
            >
              <Icon name="phone" size={13} />
              {brand.contact.phoneDisplay}
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-panel/20">
        <div className="shell grid gap-8 py-[var(--section-y)] md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <span className="annot">03 · Next</span>
            <h2 className="t-h2 mt-4 max-w-[19ch] text-fg">{sections.next.title}</h2>
            <p className="mt-4 max-w-[54ch] text-sm leading-relaxed text-fg-dim">
              {sections.next.body}
            </p>
            <div className="mt-6 flex flex-wrap gap-5 font-mono text-[9px] uppercase tracking-[0.12em]">
              <Link to="/work" className="inline-flex items-center gap-2 text-cold transition-colors duration-2 hover:text-fg">
                Recent installations
                <Icon name="arrow-right" size={12} />
              </Link>
              <Link to="/blog" className="inline-flex items-center gap-2 text-cold transition-colors duration-2 hover:text-fg">
                Selection guides
                <Icon name="arrow-right" size={12} />
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:col-span-4 md:col-start-9 md:justify-end">
            <ButtonLink to="/contact" size="lg" icon="arrow-up-right">
              Request a selection
            </ButtonLink>
            <ButtonAnchor href={`tel:${brand.contact.phone}`} variant="secondary" size="lg" icon="phone">
              Call the works
            </ButtonAnchor>
          </div>
        </div>
      </section>
    </>
  )
}
