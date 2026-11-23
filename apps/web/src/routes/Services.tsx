import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon, type IconName } from '@/components/icons'
import { Badge, ButtonAnchor, ButtonLink, SectionHeader, Tabs } from '@/components/ui'
import { CounterStat, MagneticButton, SplitReveal } from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import {
  categoryLabels,
  serviceCategoryOrder,
  type CategoryFilter,
} from '@/content/services'
import { useSiteContent, useSiteServices } from '@/content/SiteContentProvider'
import { PageBackdrop } from '@/components/site/PageBackdrop'
import { ServiceFlowRailSection } from '@/routes/home/PremiumAnimations'
import { useSeo } from '@/lib/seo'

/** Full service index. Filters are client-side until the Service collection lands. */
export function Services() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const catalogue = useSiteServices()
  const copy = content.pages.services
  const sections = content.pageSections.services
  useSeo({ path: '/services' })

  const { hash } = useLocation()
  const [category, setCategory] = useState<CategoryFilter>('all')

  // A deep link such as /services#chilled-water must reveal its row even if a
  // filter was active when the link was followed.
  useEffect(() => {
    if (hash) setCategory('all')
  }, [hash])

  const filtered =
    category === 'all'
      ? catalogue
      : catalogue.filter((service) => service.category === category)

  const tabs = [
    { id: 'all', label: 'All', count: catalogue.length },
    ...serviceCategoryOrder.map((entry) => ({
      id: entry,
      label: categoryLabels[entry],
      count: catalogue.filter((service) => service.category === entry).length,
    })),
  ]

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <PageBackdrop src={copy.image} alt={copy.imageAlt} />
        <div className="shell grid gap-x-8 gap-y-12 pb-14 pt-12 md:grid-cols-12 lg:pt-16">
          <div className="md:col-span-7">
            <span className="annot">Services · CV-IDX-01</span>

            <SplitReveal
              key={copy.headline}
              as="h1"
              className="t-display mt-7 max-w-[12ch] text-fg"
              stagger={0.05}
            >
              {copy.headline}
            </SplitReveal>

            <p className="t-lead mt-7 max-w-[58ch]">{copy.lead}</p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <MagneticButton>
                <ButtonLink to="/contact" size="lg" icon="arrow-up-right">
                  Send a brief
                </ButtonLink>
              </MagneticButton>
              <ButtonAnchor href="#index" variant="secondary" size="lg">
                Open the index
              </ButtonAnchor>
            </div>
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <div className="marks border border-line bg-panel/70 p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="t-label">Register</span>
                <span className="t-num text-[10px] text-fg-faint">CV/IDX</span>
              </div>
              <div className="rule-ticks mt-5" />

              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
                <div className="flex flex-col gap-1">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Services
                  </dt>
                  <dd className="text-h2 text-fg">
                    <CounterStat value={catalogue.length} />
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Categories
                  </dt>
                  <dd className="text-h2 text-fg">
                    <CounterStat value={serviceCategoryOrder.length} />
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Capacity span
                  </dt>
                  <dd className="t-num text-[12px] text-fg-dim">1.5 – 2,000 TR</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Coverage
                  </dt>
                  <dd className="t-num text-[12px] text-fg-dim">
                    {brand.serviceAreas.length} cities
                  </dd>
                </div>
              </dl>

              <div className="thread mt-5" />
              <p className="mt-4 text-[11px] leading-relaxed text-fg-faint">
                Installed and commissioned by our own crews. No subcontracted commissioning, no
                handover by email.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="index" className="scroll-mt-[var(--header-h)] border-b border-line">
        <div className="shell pb-2 pt-[var(--section-y)]">
          <SectionHeader
            index="02"
            label="Comparison index"
            title={sections.index.title}
            description={sections.index.body}
            action={<Badge tone="cold" dot>{catalogue.length} entries</Badge>}
          />
        </div>

        <div className="sticky top-[60px] z-[var(--z-raised)] mt-10 border-y border-line bg-base/95 backdrop-blur-md">
          <div className="shell flex flex-col gap-1 py-3 md:flex-row md:items-end md:justify-between">
            <div className="no-scrollbar -mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)]">
              <Tabs
                tabs={tabs}
                value={category}
                onChange={(id) => setCategory(id as CategoryFilter)}
                ariaLabel="Filter services by category"
                className="min-w-max border-b-0"
              />
            </div>
            <p
              aria-live="polite"
              className="shrink-0 pb-1 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint"
            >
              {filtered.length} of {catalogue.length} services
            </p>
          </div>
        </div>

        <div className="shell pb-16">
          <div className="hidden border-b border-line py-3 md:grid md:grid-cols-12 md:gap-4">
            {[
              { label: 'Service', className: 'md:col-span-5' },
              { label: 'Category', className: 'md:col-span-2' },
              { label: 'Capacity', className: 'md:col-span-2' },
              { label: 'Lead time', className: 'md:col-span-1' },
              { label: 'Specification', className: 'md:col-span-2 md:text-right' },
            ].map((column) => (
              <span
                key={column.label}
                className={`font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint ${column.className}`}
              >
                {column.label}
              </span>
            ))}
          </div>

          <ul>
            {filtered.map((service) => (
              <li
                key={service.id}
                id={service.id}
                className="scroll-mt-[128px] border-b border-line/70"
              >
                <div className="group grid gap-3 py-5 md:grid-cols-12 md:items-start md:gap-4">
                  <div className="flex items-baseline gap-3 md:col-span-5">
                    <span className="t-num shrink-0 text-[10px] text-fg-faint">{service.index}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon
                          name={(service.icon ?? ('airflow' as IconName)) as IconName}
                          size={16}
                          className="text-fg-faint transition-colors duration-2 group-hover:text-cold"
                        />
                        <h3 className="text-[15px] font-medium leading-snug text-fg transition-colors duration-2 group-hover:text-cold">
                          <Link to={`/services/${service.id}`} className="transition-colors duration-2 hover:text-cold">
                            {service.name}
                          </Link>
                        </h3>
                      </div>
                      <p className="mt-1.5 max-w-[48ch] text-[12px] leading-relaxed text-fg-dim">
                        {service.scope}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line/60 pt-3 md:contents md:mt-0 md:border-0 md:pt-0">
                    <div className="md:col-span-2">
                      <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint md:hidden">
                        Category
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim">
                        {categoryLabels[service.category]}
                      </span>
                    </div>

                    <div className="md:col-span-2">
                      <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint md:hidden">
                        Capacity
                      </span>
                      <span className="t-num text-[11px] text-fg">{service.capacity}</span>
                    </div>

                    <div className="md:col-span-1">
                      <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint md:hidden">
                        Lead time
                      </span>
                      <span className="t-num text-[11px] text-fg-dim">{service.timeline}</span>
                    </div>

                    <div className="col-span-2 flex flex-col gap-2 md:col-span-2 md:items-end">
                      <span className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-fg-faint md:text-right">
                        {service.specification}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 md:justify-end">
                        <Link
                          to={`/services/${service.id}`}
                          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:text-cold"
                        >
                          Service file
                          <Icon name="arrow-up-right" size={12} />
                        </Link>
                        <Link
                          to={`/contact?service=${service.id}`}
                          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
                        >
                          Enquire
                          <Icon name="arrow-right" size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ServiceFlowRailSection />

      <section className="section-lg border-b border-line">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <span className="annot">03 · Selection</span>
            <h2 className="t-h2 mt-5 max-w-[12ch] text-fg">{sections.selection.title}</h2>
            <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-fg-dim">
              {sections.selection.body}
            </p>
          </div>

          <div className="md:col-span-8">
            {sections.selectionNotes.map((note) => (
              <div
                key={note.index}
                className="grid gap-3 border-t border-line py-6 md:grid-cols-12 md:items-baseline md:gap-4 last:border-b last:border-line"
              >
                <span className="t-num text-[10px] text-cold md:col-span-1">{note.index}</span>
                <h3 className="t-h4 md:col-span-3">{note.title}</h3>
                <p className="text-sm leading-relaxed text-fg-dim md:col-span-8">{note.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-panel/30">
        <div className="shell flex flex-col gap-8 py-[var(--section-y)] md:flex-row md:items-end md:justify-between">
          <div>
            <span className="annot">04 · Next</span>
            <h2 className="t-h2 mt-4 max-w-[18ch] text-fg">{sections.next.title}</h2>
            <p className="mt-4 max-w-[48ch] text-sm leading-relaxed text-fg-dim">
              {sections.next.body}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <MagneticButton>
              <ButtonLink to="/contact" size="lg" icon="arrow-up-right">
                Send the brief
              </ButtonLink>
            </MagneticButton>
            <ButtonAnchor
              href={`tel:${brand.contact.phone}`}
              variant="secondary"
              size="lg"
              icon="phone"
            >
              {brand.contact.phoneDisplay}
            </ButtonAnchor>
          </div>
        </div>
      </section>
    </>
  )
}
