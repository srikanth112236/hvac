import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, ButtonAnchor, ButtonLink, Marquee, SectionHeader, Tabs } from '@/components/ui'
import { MagneticButton, PlaceholderPlate, ScrollReveal, SplitReveal, TiltCard } from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import { type ProjectEntry } from '@/content/home'
import { type WorkCaseFile } from '@/content/company'
import { useSiteContent } from '@/content/SiteContentProvider'
import { useSeo } from '@/lib/seo'
import { PageBackdrop } from '@/components/site/PageBackdrop'
import { BeforeAfterPlate } from '@/routes/work/BeforeAfterPlate'

interface CaseEntry {
  project: ProjectEntry
  file: WorkCaseFile
}

export function WorkPage() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const copy = content.pages.work
  const sections = content.pageSections.work
  useSeo({ path: '/work' })
  const [filter, setFilter] = useState<string>('All')

  const caseEntries = useMemo<CaseEntry[]>(() => {
    return content.workCases.map((entry) => ({
      project: {
        id: entry.id,
        category: entry.category,
        name: entry.name,
        location: entry.location,
        plate: entry.plate,
        spec: entry.spec,
        detail: entry.detail,
        year: entry.year,
        image: entry.image,
        imageAlt: entry.imageAlt,
      },
      file: {
        id: entry.id,
        challenge: entry.challenge,
        solution: entry.solution,
        result: entry.result,
        metrics: entry.metrics.map((metric) => [metric.label, metric.value] as [string, string]),
        scope: entry.scope,
        system: entry.system,
      },
    }))
  }, [content.workCases])

  const filtered =
    filter === 'All'
      ? caseEntries
      : caseEntries.filter((entry) => entry.project.category === filter)

  const featured = filtered[0]
  const rest = filtered.slice(1)

  const filters = ['All', ...Array.from(new Set(content.workCases.map((entry) => entry.category)))]
  const tabs = filters.map((category) => ({
    id: category,
    label: category,
    count:
      category === 'All'
        ? caseEntries.length
        : caseEntries.filter((entry) => entry.project.category === category).length,
  }))

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <PageBackdrop src={copy.image} alt={copy.imageAlt} />
        <div className="shell grid gap-10 pb-14 pt-10 md:grid-cols-12 lg:pt-16">
          <div className="md:col-span-7">
            <span className="annot">Work · CV-04</span>

            <SplitReveal
              key={copy.headline}
              as="h1"
              className="t-display mt-7 max-w-[12ch] text-fg"
              stagger={0.045}
            >
              {copy.headline}
            </SplitReveal>

            <p className="t-lead mt-7 max-w-[58ch]">{copy.lead}</p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <MagneticButton>
                <ButtonLink to="/contact" size="lg" icon="arrow-up-right">
                  Discuss your site
                </ButtonLink>
              </MagneticButton>
              <ButtonAnchor href="#files" variant="secondary" size="lg">
                Open the files
              </ButtonAnchor>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-5">
              {[
                ['Files', String(caseEntries.length)],
                ['Plant', '1,356 TR'],
                ['Since', '2021'],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                    {label}
                  </dt>
                  <dd className="t-num text-[12px] text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <div className="marks border border-line bg-panel/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="t-label">File index</span>
                <span className="t-num text-[9px] text-fg-faint">CV/WRK</span>
              </div>
              <ol className="mt-3">
                {caseEntries.map(({ project }, index) => (
                  <li key={project.id} className="border-t border-line/60 first:border-t-0">
                    <a
                      href={`#case-${project.id}`}
                      onClick={() => setFilter('All')}
                      className="group flex items-baseline justify-between gap-3 py-2.5"
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="t-num text-[9px] text-cold">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="text-[12px] text-fg-dim transition-colors duration-2 group-hover:text-cold">
                          {project.name}
                        </span>
                      </span>
                      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                        {project.category}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
              <div className="thread mt-2" />
            </div>
          </div>
        </div>
      </section>

      <section id="files" className="scroll-mt-[var(--header-h)] border-b border-line">
        <div className="shell pb-2 pt-[var(--section-y)]">
          <SectionHeader
            index="01"
            label="Case files"
            title={sections.cases.title}
            description={sections.cases.body}
            action={
              <Badge tone="cold" dot>
                Filter by system
              </Badge>
            }
          />
        </div>

        <div className="sticky top-[60px] z-[var(--z-raised)] mt-8 border-y border-line bg-base/95 backdrop-blur-md">
          <div className="shell flex flex-col gap-1 py-3 md:flex-row md:items-end md:justify-between">
            <div className="no-scrollbar -mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)]">
              <Tabs
                tabs={tabs}
                value={filter}
                onChange={setFilter}
                ariaLabel="Filter case files by system"
                className="min-w-max border-b-0"
              />
            </div>
            <p
              aria-live="polite"
              className="shrink-0 pb-1 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint"
            >
              {filtered.length} of {caseEntries.length} files
            </p>
          </div>
        </div>

        <div className="shell pb-16">
          {featured ? (
            <article
              id={`case-${featured.project.id}`}
              className="mt-10 scroll-mt-[calc(var(--header-h)+24px)] grid gap-8 border-t border-line pt-8 lg:grid-cols-12"
            >
              <div className="lg:col-span-5">
                <div className="h-[260px] border border-line">
                  {featured.project.image ? (
                    <img
                      src={featured.project.image}
                      alt={featured.project.imageAlt || featured.project.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PlaceholderPlate label={featured.project.plate} />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="t-label">{featured.project.category}</span>
                  <span className="t-num text-[9px] text-fg-faint">{featured.project.year}</span>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="annot">Featured file · {featured.project.category}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    {featured.project.location}
                  </span>
                </div>
                <h3 className="t-h1 mt-4 text-fg">{featured.project.name}</h3>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold">
                  {featured.file.system} · {featured.project.spec}
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-3 border-y border-line py-5 sm:grid-cols-4">
                  {featured.file.metrics.map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-1">
                      <dt className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                        {label}
                      </dt>
                      <dd className="t-num text-[13px] text-fg">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 grid gap-5">
                  {[
                    ['Challenge', featured.file.challenge],
                    ['What changed', featured.file.solution],
                    ['Measured result', featured.file.result],
                  ].map(([label, body]) => (
                    <div key={label} className="grid gap-1 sm:grid-cols-[120px_1fr] sm:gap-4">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                        {label}
                      </span>
                      <p className="text-[13px] leading-relaxed text-fg-dim">{body}</p>
                    </div>
                  ))}
                </div>

                <ul className="mt-6 flex flex-wrap gap-1.5">
                  {featured.file.scope.map((item) => (
                    <li key={item}>
                      <Badge>{item}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ) : (
            <p className="mt-10 border border-dashed border-line px-6 py-14 text-center text-sm text-fg-faint">
              No case files in this filter.
            </p>
          )}

          {rest.length ? (
            <div className="mt-10 grid gap-4 border-t border-line pt-8 md:grid-cols-2">
              {rest.map(({ project, file }, index) => (
                <ScrollReveal key={project.id} delay={index * 0.04}>
                  <TiltCard max={4}>
                    <article
                      id={`case-${project.id}`}
                      className="marks flex h-full scroll-mt-[calc(var(--header-h)+24px)] flex-col gap-5 border border-line bg-panel/60 p-6"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="t-label">{project.category}</span>
                          <h3 className="t-h3 mt-2 text-fg">{project.name}</h3>
                          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                            {project.location} · {project.year}
                          </p>
                        </div>
                        <span className="t-num text-[10px] text-fg-faint">
                          {String(index + 2).padStart(2, '0')}
                        </span>
                      </div>

                      <div className="h-[120px] border border-line">
                        {project.image ? (
                          <img
                            src={project.image}
                            alt={project.imageAlt || project.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <PlaceholderPlate label={project.plate} />
                        )}
                      </div>

                      <p className="text-[12px] leading-relaxed text-fg-dim">{file.challenge}</p>

                      <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4">
                        {file.metrics.slice(0, 4).map(([label, value]) => (
                          <div key={label} className="flex flex-col gap-0.5">
                            <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                              {label}
                            </dt>
                            <dd className="t-num text-[11px] text-fg">{value}</dd>
                          </div>
                        ))}
                      </dl>

                      <div className="mt-auto border-t border-line pt-4">
                        <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-cold">
                          {file.result}
                        </p>
                      </div>
                    </article>
                  </TiltCard>
                </ScrollReveal>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section border-b border-line bg-panel/20">
        <div className="shell grid gap-10 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5">
            <span className="annot">02 · Before / after</span>
            <h2 className="t-h2 mt-5 max-w-[12ch] text-fg">{sections.beforeAfter.title}</h2>
            <p className="mt-5 max-w-[38ch] text-sm leading-relaxed text-fg-dim">
              {sections.beforeAfter.body}
            </p>
            <p className="mt-5 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
              Schematic · not a site photograph
            </p>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <BeforeAfterPlate
              beforeLabel={sections.beforeLabel}
              afterLabel={sections.afterLabel}
              caption={sections.caption}
            />
          </div>
        </div>
      </section>

      <div className="border-b border-line bg-panel/20">
        <div className="shell flex flex-wrap items-baseline justify-between gap-2 py-3">
          <span className="t-label">Equipment we commission</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
            Sample partner list · not an endorsement
          </span>
        </div>
        <div className="border-t border-line py-8">
          <Marquee duration={46} itemClassName="gap-14 pr-14">
            {content.equipmentBrands.map((equipmentBrand) => (
              <span key={equipmentBrand} className="flex items-center gap-14">
                <span className="font-display text-h3 text-fg-dim/80">{equipmentBrand}</span>
                <span aria-hidden className="h-1 w-1 bg-cold/60" />
              </span>
            ))}
          </Marquee>
        </div>
      </div>

      <section className="border-b border-line">
        <div className="shell flex flex-col gap-8 py-[var(--section-y)] md:flex-row md:items-end md:justify-between">
          <div>
            <span className="annot">Next</span>
            <h2 className="t-h2 mt-4 max-w-[17ch] text-fg">{sections.next.title}</h2>
            <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-fg-dim">
              {sections.next.body}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink to="/contact" size="lg" icon="arrow-up-right">
              Start a file
            </ButtonLink>
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

      <div className="shell py-8">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
          Also read ·{' '}
          <Link to="/about" className="text-cold transition-colors duration-2 hover:text-fg">
            the company
          </Link>{' '}
          ·{' '}
          <Link to="/process" className="text-cold transition-colors duration-2 hover:text-fg">
            the process
          </Link>{' '}
          ·{' '}
          <Link to="/amc" className="text-cold transition-colors duration-2 hover:text-fg">
            maintenance
          </Link>
        </p>
      </div>
    </>
  )
}
