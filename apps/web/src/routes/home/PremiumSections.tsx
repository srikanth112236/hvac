import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge, ButtonAnchor, ButtonLink, SectionHeader } from '@/components/ui'
import { EditorialPlate } from '@/components/content/EditorialPlate'
import {
  DepthLayer,
  DepthScene,
  ScrollReveal,
  TiltCard,
} from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'
import { formatEditorialDate, readingMinutes, sortByPublished } from '@/lib/editorial'

function AnswerPanel({ children, label = 'Direct answer' }: { children: string; label?: string }) {
  return (
    <div className="mt-6 border-l-2 border-cold bg-cold/5 px-5 py-4">
      <span className="t-label text-cold">{label}</span>
      <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-fg-dim">{children}</p>
    </div>
  )
}

const commissioningChecks = [
  {
    code: '01',
    label: 'Capacity',
    target: '≥ 95%',
    note: 'of design at the design condition',
  },
  {
    code: '02',
    label: 'Air-side ΔT',
    target: '8–12 °C',
    note: 'split / cassette band; OEM data wins',
  },
  {
    code: '03',
    label: 'Static pressure',
    target: '≤ +10%',
    note: 'of design at every branch',
  },
  {
    code: '04',
    label: 'Part load',
    target: '40 / 60 / 80',
    note: '% load points logged',
  },
]

export function PerformanceSection() {
  const { content } = useSiteContent()
  const { home } = content

  return (
    <section id="commissioning" className="scroll-mt-[var(--header-h)] overflow-hidden border-b border-line bg-panel/20">
      <div className="shell pb-2 pt-[var(--section-y)]">
        <SectionHeader
          index="CV-MET"
          label="Measured handover"
          title={home.performanceTitle}
          description={home.performanceDescription}
          action={<Badge tone="cold" dot>Four readings</Badge>}
        />
      </div>

      <div className="shell grid gap-12 pb-[var(--section-y)] pt-10 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-6">
          <AnswerPanel>{home.performanceAnswer}</AnswerPanel>

          <div className="mt-8 border-t border-line">
            {commissioningChecks.map((check, index) => (
              <ScrollReveal key={check.code} delay={index * 0.04}>
                <div className="grid grid-cols-[42px_1fr_auto] items-baseline gap-4 border-b border-line py-4">
                  <span className="t-num text-[9px] text-cold">{check.code}</span>
                  <div>
                    <h3 className="text-[13px] font-medium text-fg">{check.label}</h3>
                    <p className="mt-0.5 text-[11px] leading-snug text-fg-faint">{check.note}</p>
                  </div>
                  <span className="t-num text-[14px] text-fg">{check.target}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[48ch] font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
              Targets are verified against the manufacturer data and project design basis. They
              describe the commissioning method, not a claimed result.
            </p>
            <Link
              to="/blog/what-belongs-in-an-hvac-commissioning-file"
              className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
            >
              Read the file guide
              <Icon name="arrow-right" size={12} />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <DepthScene className="mx-auto h-[420px] max-w-[460px]" travel={64}>
            <DepthLayer depth={0} className="absolute inset-x-3 inset-y-8">
              <div className="scene-grid h-full border border-line/70" />
            </DepthLayer>

            <DepthLayer depth={1} className="absolute left-0 top-8 w-[72%]">
              <div className="scene-plane p-4">
                <div className="flex items-center justify-between">
                  <span className="t-label">Commissioning sheet</span>
                  <span className="t-num text-[8px] text-fg-faint">CV / MET</span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                      System
                    </span>
                    <p className="t-num mt-1 text-[11px] text-fg">AHU-02 · office floor</p>
                  </div>
                  <span className="border border-cold/40 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-cold">
                    Verified
                  </span>
                </div>
                <div className="mt-4 h-14 border border-line/70 bg-base/50 p-2">
                  <div className="flex h-full items-end gap-1">
                    {[38, 54, 47, 66, 58, 72, 62, 81, 69, 76, 64, 84].map((height, index) => (
                      <span
                        key={index}
                        className="flex-1 bg-cold/45"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </DepthLayer>

            <DepthLayer depth={2.1} className="absolute right-0 top-[132px] w-[58%]">
              <div className="depth-float scene-plane p-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                  Return / supply
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="t-num text-[28px] text-fg">9.4</span>
                  <span className="font-mono text-[10px] text-cold">°C ΔT</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-success" />
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-dim">
                    Inside model band
                  </span>
                </div>
                <div className="mt-3 h-px bg-line" />
                <div className="mt-2 flex justify-between font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                  <span>24.1 °C return</span>
                  <span>14.7 °C supply</span>
                </div>
              </div>
            </DepthLayer>

            <DepthLayer depth={3.2} className="absolute bottom-4 right-[8%] w-[54%]">
              <div className="scene-plane p-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                  Part-load log
                </span>
                <div className="mt-3 flex flex-col gap-2">
                  {[
                    ['40%', '0.61 kW/TR'],
                    ['60%', '0.56 kW/TR'],
                    ['80%', '0.54 kW/TR'],
                  ].map(([load, value]) => (
                    <div key={load} className="flex items-center justify-between border-t border-line/70 pt-1.5">
                      <span className="t-num text-[9px] text-fg-dim">{load}</span>
                      <span className="t-num text-[9px] text-fg">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DepthLayer>

            <DepthLayer depth={1.6} className="absolute bottom-8 left-[4%] border border-heat/40 bg-base/90 px-3 py-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-heat">
                Measured · not assumed
              </span>
            </DepthLayer>
          </DepthScene>
        </div>
      </div>
    </section>
  )
}

const handoverFiles = [
  { code: '01', label: 'Load calculation', meta: 'Design basis + assumptions' },
  { code: '02', label: 'Equipment schedule', meta: 'Matched to nameplates' },
  { code: '03', label: 'As-built drawings', meta: 'Pipe, duct and access' },
  { code: '04', label: 'Test & balance', meta: 'Design vs measured' },
  { code: '05', label: 'Controls & alarms', meta: 'Points list + sequence' },
  { code: '06', label: 'O&M + refrigerant log', meta: 'Charge, warranty, contacts' },
]

export function AssuranceSection() {
  const { content } = useSiteContent()
  const { home } = content

  return (
    <section id="assurance" className="scroll-mt-[var(--header-h)] overflow-hidden border-b border-line">
      <div className="shell pb-2 pt-[var(--section-y)]">
        <SectionHeader
          index="CV-FILE"
          label="File assurance"
          title={home.assuranceTitle}
          description={home.assuranceDescription}
          action={<Badge tone="heat" dot>No file · no certificate</Badge>}
        />
      </div>

      <div className="shell grid gap-12 pb-[var(--section-y)] pt-10 lg:grid-cols-12 lg:items-center">
        <div className="order-2 lg:order-1 lg:col-span-5">
          <DepthScene className="mx-auto h-[440px] max-w-[420px]" travel={52}>
            <DepthLayer depth={0} className="absolute inset-x-4 bottom-6 top-6">
              <div className="h-full border border-line bg-panel/30" />
            </DepthLayer>
            {handoverFiles.map((file, index) => (
              <DepthLayer
                key={file.code}
                depth={0.55 + index * 0.42}
                className="absolute left-[6%] right-[6%]"
              >
                <div
                  className="scene-plane flex items-center justify-between gap-4 p-4"
                  style={{ marginTop: `${index * 56}px` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center border border-line font-mono text-[8px] text-cold">
                      {file.code}
                    </span>
                    <div>
                      <p className="text-[12px] font-medium leading-snug text-fg">{file.label}</p>
                      <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                        {file.meta}
                      </p>
                    </div>
                  </div>
                  <Icon name="check" size={12} className="shrink-0 text-success" />
                </div>
              </DepthLayer>
            ))}
            <DepthLayer depth={3.4} className="absolute -bottom-2 right-0 border border-cold/40 bg-base px-3 py-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-cold">
                Controlled issue · Rev A
              </span>
            </DepthLayer>
          </DepthScene>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-6 lg:col-start-7">
          <AnswerPanel>{home.assuranceAnswer}</AnswerPanel>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ['Access', 'Drawing and panel schedule matched to the installed route.'],
              ['Baseline', 'Design value beside measured value for every terminal.'],
              ['Warranty', 'Equipment, workmanship and service contacts in one register.'],
              ['Handover', 'Client walkthrough of isolation points and controls.'],
            ].map(([label, body]) => (
              <div key={label} className="border border-line bg-panel/50 p-4">
                <span className="t-label">{label}</span>
                <p className="mt-2 text-[11px] leading-relaxed text-fg-dim">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-line pt-5">
            <Link
              to="/blog/what-belongs-in-an-hvac-commissioning-file"
              className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
            >
              The six core records
              <Icon name="arrow-right" size={12} />
            </Link>
            <Link
              to="/process"
              className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:text-cold"
            >
              See the process
              <Icon name="arrow-up-right" size={12} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

const cityPositions = [
  { className: 'left-[4%] top-[18%]', ring: 'h-28 w-28' },
  { className: 'right-[3%] top-[32%]', ring: 'h-40 w-40' },
  { className: 'bottom-[8%] left-[24%]', ring: 'h-32 w-32' },
]

export function CoverageSection() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const { home } = content
  const areas = brand.serviceAreas.slice(0, 3)
  const maxRadius = brand.serviceAreas.length
    ? Math.max(...brand.serviceAreas.map((area) => area.radiusKm))
    : 0

  return (
    <section id="coverage" className="scroll-mt-[var(--header-h)] overflow-hidden border-b border-line bg-panel/20">
      <div className="shell pb-2 pt-[var(--section-y)]">
        <SectionHeader
          index="CV-COV"
          label="Coverage & response"
          title={home.coverageTitle}
          description={home.coverageDescription}
          action={<Badge tone="heat" dot>{brand.stats.emergencyResponseHours} h target</Badge>}
        />
      </div>

      <div className="shell grid gap-12 pb-[var(--section-y)] pt-10 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-6">
          <DepthScene className="relative h-[390px]" travel={46}>
            <DepthLayer depth={0} className="absolute inset-0">
              <div className="scene-grid h-full border border-line/60" />
            </DepthLayer>

            <DepthLayer depth={0.8} className="absolute inset-x-[10%] inset-y-[12%]">
              <div className="h-full rounded-full border border-dashed border-cold/20" />
              <div className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cold/15" />
            </DepthLayer>

            {areas.map((area, index) => {
              const position = cityPositions[index] ?? { className: '', ring: '' }
              return (
                <DepthLayer key={area.slug} depth={1.4 + index * 0.7} className={`absolute ${position.className}`}>
                  <div className="relative">
                    <div
                      aria-hidden
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cold/25 ${position.ring}`}
                    />
                    <div className="relative border border-line bg-base/95 px-3 py-3 shadow-pop">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse bg-heat" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg">
                          {area.city}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                        {area.region} · {area.radiusKm} km
                      </p>
                    </div>
                  </div>
                </DepthLayer>
              )
            })}

            <DepthLayer depth={3.2} className="absolute bottom-1 right-0">
              <div className="marks border border-line bg-base/90 p-3">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  Dispatch clock
                </span>
                <p className="t-num mt-1 text-[18px] text-fg">
                  {String(brand.stats.emergencyResponseHours).padStart(2, '0')}:00
                </p>
                <p className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.1em] text-fg-faint">
                  logged call → engineer on site
                </p>
              </div>
            </DepthLayer>
          </DepthScene>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <AnswerPanel>{home.coverageAnswer}</AnswerPanel>

          <div className="mt-8 grid grid-cols-3 gap-3 border-y border-line py-5">
            {[
              ['Cities', String(brand.serviceAreas.length).padStart(2, '0')],
              ['Radius', `${maxRadius} km`],
              ['Crews', 'Employed'],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  {label}
                </span>
                <p className="t-num mt-1 text-[14px] text-fg">{value}</p>
              </div>
            ))}
          </div>

          <ul className="mt-5 flex flex-col">
            {[
              'Contracted emergency calls: four-hour arrival target inside city limits.',
              'Outside the radius: travel, access and overnight stay quoted separately.',
              'After 19:00: dispatch desk answers; parts subject to stock.',
            ].map((line) => (
              <li key={line} className="flex items-start gap-3 border-b border-line/70 py-3 text-[12px] leading-relaxed text-fg-dim">
                <Icon name="check" size={13} className="mt-0.5 shrink-0 text-cold" />
                {line}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ButtonAnchor href={`tel:${brand.contact.emergencyPhone}`} size="sm" icon="phone">
              {brand.contact.emergencyPhone}
            </ButtonAnchor>
            <ButtonLink to="/contact" variant="secondary" size="sm">
              Check your site
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ProductPreviewSection() {
  const { content } = useSiteContent()
  const { home } = content
  const products = content.products.filter((product) => product.published)
  const featured = [...products].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 3)

  return (
    <section id="catalogue" className="scroll-mt-[var(--header-h)] border-b border-line">
      <div className="shell pb-2 pt-[var(--section-y)]">
        <SectionHeader
          index="CV-CAT"
          label="Systems catalogue"
          title={home.productsTitle}
          description={home.productsDescription}
          action={
            <Link
              to="/products"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
            >
              All {products.length} systems
              <Icon name="arrow-right" size={13} />
            </Link>
          }
        />
      </div>

      <div className="shell grid gap-8 pb-[var(--section-y)] pt-10 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <AnswerPanel label="Catalogue basis">{home.productsAnswer}</AnswerPanel>
          <div className="mt-5 border border-line bg-panel/40 p-4">
            <span className="t-label">No checkout</span>
            <p className="mt-2 text-[11px] leading-relaxed text-fg-dim">
              Capacity, installation and commissioning are quoted after a survey. The listed price is
              a starting point for a defined scope.
            </p>
            <Link
              to="/products"
              className="mt-3 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
            >
              Open the library
              <Icon name="arrow-right" size={11} />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:col-start-5 xl:grid-cols-3">
          {featured.map((product, index) => (
            <ScrollReveal key={product.id} delay={index * 0.05}>
              <TiltCard max={4}>
                <article className="marks flex h-full flex-col border border-line bg-panel/60 p-4">
                  <EditorialPlate
                    label={product.plate}
                    code={`CV-PRD-${String(index + 1).padStart(2, '0')}`}
                    tone={product.category === 'Industrial' ? 'heat' : 'cold'}
                    className="min-h-[130px]"
                  />
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-cold">
                      {product.category}
                    </span>
                    <span className="t-num text-[8px] text-fg-faint">{product.capacity}</span>
                  </div>
                  <h3 className="t-h4 mt-2 text-fg">{product.name}</h3>
                  <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-fg-dim">
                    {product.summary}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                    <span className="t-num text-[10px] text-fg">{product.priceFrom}</span>
                    <Link
                      to="/products"
                      className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-dim transition-colors duration-2 hover:text-cold"
                    >
                      Specs
                      <Icon name="arrow-up-right" size={10} />
                    </Link>
                  </div>
                </article>
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function InsightsSection() {
  const { content } = useSiteContent()
  const { home } = content
  const posts = sortByPublished(content.posts.filter((post) => post.published)).slice(0, 3)

  return (
    <section id="insights" className="scroll-mt-[var(--header-h)] overflow-hidden border-b border-line bg-panel/20">
      <div className="shell pb-2 pt-[var(--section-y)]">
        <SectionHeader
          index="CV-JRN"
          label="Journal"
          title={home.insightsTitle}
          description={home.insightsDescription}
          action={
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
            >
              All field notes
              <Icon name="arrow-right" size={13} />
            </Link>
          }
        />
      </div>

      <div className="shell grid gap-8 pb-[var(--section-y)] pt-10 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <AnswerPanel label="Editorial standard">{home.insightsAnswer}</AnswerPanel>
          <div className="mt-5 hidden border-t border-line pt-4 lg:block">
            <p className="font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
              Written by the engineering desk. Assumptions and manufacturer references stay in the
              file.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:col-span-8 lg:col-start-5">
          {posts.map((post, index) => (
            <ScrollReveal key={post.id} delay={index * 0.05}>
              <Link
                to={`/blog/${post.slug}`}
                className="marks group flex h-full flex-col border border-line bg-panel/60 p-5 transition-colors duration-2 hover:border-cold/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-cold">
                    {post.category}
                  </span>
                  <span className="t-num text-[8px] text-fg-faint">
                    {readingMinutes(post.body, post.readingMinutes)} min
                  </span>
                </div>
                <h3 className="t-h4 mt-3 text-fg transition-colors duration-2 group-hover:text-cold">
                  {post.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-fg-dim">
                  {post.excerpt}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                    {formatEditorialDate(post.publishedAt)}
                  </span>
                  <Icon name="arrow-up-right" size={11} className="text-fg-faint" />
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
