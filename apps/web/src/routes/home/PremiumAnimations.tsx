import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge, ButtonLink, SectionHeader } from '@/components/ui'
import {
  DepthLayer,
  DepthScene,
  HorizontalRail,
  MagneticButton,
  ParallaxDrift,
  RailCard,
  ScrollReveal,
  TiltCard,
  gsap,
  prefersReducedMotion,
} from '@/motion'
import { useIsomorphicLayoutEffect } from '@/motion/core'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'

/* -------------------------------------------------------------------------- */
/*  01 — Trust strip with magnetic counters                                  */
/* -------------------------------------------------------------------------- */

export function TrustStripSection() {
  const stripRef = useRef<HTMLDivElement>(null)
  const items = [
    { icon: 'shield' as const, label: 'Licensed & insured', value: 'State licensed', detail: 'Liability coverage active' },
    { icon: 'check' as const, label: 'Own crews', value: 'No subcontracting', detail: 'Commissioning in-house' },
    { icon: 'gauge' as const, label: 'Measured work', value: 'Written baseline', detail: 'Design vs measured' },
    { icon: 'clock' as const, label: 'Written response', value: '4-hour target', detail: 'Inside city limits' },
  ]

  useIsomorphicLayoutEffect(() => {
    const strip = stripRef.current
    if (!strip || prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.from(strip.children, {
        y: 24,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.08,
        scrollTrigger: { trigger: strip, start: 'top 88%', toggleActions: 'play none none reverse' },
      })
    }, strip)
    return () => context.revert()
  }, [])

  return (
    <section className="border-b border-line bg-panel/20">
      <div className="shell pb-6 pt-10 lg:py-[var(--section-y)]" ref={stripRef}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="annot">CV-ESA</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-faint">In operation</span>
          </div>
                      <div className="flex flex-wrap gap-3 text-[10px] font-mono uppercase tracking-[0.12em] text-fg-faint">
            {[
              ['EPA Section 608', 'Refrigerant handling'],
              ['NATE certified', 'Installer certification'],
              ['ASHRAE member', 'Professional standard'],
            ].map(([label]) => (
              <div key={label} className="flex items-center gap-2">
                <Icon name="check" size={12} className="text-cold" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {items.map((item, index) => (
            <ScrollReveal key={item.label} delay={index * 0.05}>
              <div className="bg-panel p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <Icon name={item.icon} size={18} className="text-cold" />
                  <span className="t-num text-[10px] text-fg-faint">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <p className="mt-4 text-[12px] font-medium text-fg">{item.label}</p>
                <p className="mt-1 text-[11px] text-fg-dim">{item.value}</p>
                <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">{item.detail}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  02 — Service grid with tilt + magnetic cards                            */
/* -------------------------------------------------------------------------- */

const serviceHighlights = [
  { id: 'vrf-systems', label: 'VRF & multi-split', icon: 'vrf' as const, capacity: '8–1,200 TR', detail: 'Heat recovery · 92% diversity' },
  { id: 'chilled-water', label: 'Chilled water', icon: 'chiller' as const, capacity: '60–2,000 TR', detail: '0.52 kW/TR at design' },
  { id: 'ducting', label: 'Ducting & ventilation', icon: 'duct' as const, capacity: '800–24,000 CFM', detail: 'GI · PIR · 640 Pa test' },
  { id: 'precision-cooling', label: 'Precision cooling', icon: 'thermostat' as const, capacity: '5–220 TR', detail: 'ISO 5–8 · ±0.5 °C' },
  { id: 'split-ac-installation', label: 'Split installation', icon: 'snowflake' as const, capacity: '1.5–8.5 TR', detail: 'R-32 inverter · 1–2 days' },
  { id: 'amc', label: 'Maintenance contracts', icon: 'shield' as const, capacity: 'All makes', detail: '4 h dispatch · written visits' },
]

export function ServiceGridSection() {
  const { content } = useSiteContent()
  const copy = content.home

  return (
    <section className="scroll-mt-[var(--header-h)] border-b border-line bg-panel/20">
      <div className="shell pb-2 pt-[var(--section-y)]">
        <SectionHeader
          index="CV-SVC"
          label="System grid"
          title={copy.servicesTitle}
          description={copy.servicesDescription}
          action={
            <Link to="/services" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg">
              All {content.services.filter((s) => s.published).length} services
              <Icon name="arrow-right" size={13} />
            </Link>
          }
        />
      </div>
      <div className="shell grid gap-8 pb-[var(--section-y)] pt-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <ScrollReveal>
            <div className="border border-line bg-panel/40 p-5">
              <span className="t-label">Selection basis</span>
              <p className="mt-3 text-[12px] leading-relaxed text-fg-dim">{copy.servicesDescription}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Capacity', 'Lead time', 'Specification', 'Commissioning'].map((item) => (
                  <span key={item} className="border border-line bg-base/50 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-dim">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div className="mt-5 border border-line bg-base/40 p-4">
              <span className="t-label">Commissioned in-house</span>
              <p className="mt-2 text-[11px] leading-relaxed text-fg-dim">
                No subcontracted commissioning. Every handover file is written by the crew that installed the system.
              </p>
            </div>
          </ScrollReveal>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:col-start-5 xl:grid-cols-3">
          {serviceHighlights.map((service, index) => (
            <ScrollReveal key={service.id} delay={index * 0.04}>
              <TiltCard max={5}>
                <Link
                  to={`/services/${service.id}`}
                  className="marks group flex h-full flex-col border border-line bg-panel/60 p-5 transition-colors duration-2 hover:border-cold/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Icon name={service.icon} size={20} className="text-fg-dim transition-colors duration-2 group-hover:text-cold" />
                    <span className="t-num text-[9px] text-fg-faint">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="t-h4 mt-4 text-fg transition-colors duration-2 group-hover:text-cold">{service.label}</h3>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">{service.capacity}</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-fg-dim line-clamp-2">{service.detail}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-cold">Service file</span>
                    <Icon name="arrow-up-right" size={12} className="text-fg-faint group-hover:text-cold" />
                  </div>
                </Link>
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  03 — Testimonial carousel horizontal rail                                */
/* -------------------------------------------------------------------------- */

const sampleTestimonials = [
  {
    quote: 'The commissioning file had delta-T across every coil, not just the plant average. That is the first time a contractor has handed us that without being asked twice.',
    context: 'Facility manager · 84 TR VRF · Downtown Dallas',
    initials: 'MR',
  },
  {
    quote: 'They traced 38 Pa of static going into a closed damper. Two visits later the fourth-floor south wing stopped running cold at 2 pm.',
    context: 'Building services lead · 320 TR chiller · Fort Worth',
    initials: 'BS',
  },
  {
    quote: 'The cold room held -18 °C through a fourteen-hour changeover, and the alarm reached the duty engineer before it reached us.',
    context: 'Operations head · 4 × 3 TR chambers · Plano',
    initials: 'OH',
  },
]

export function VoicesRailSection() {
  const { content } = useSiteContent()

  return (
    <section className="overflow-hidden border-b border-line">
      <div className="shell pb-10 pt-14 md:pt-16">
        <SectionHeader
          index="CV-VCE"
          label="Field notes"
          title="Written by the people who signed the handover."
          description={content.home.voicesDescription}
          action={<Badge tone="cold" dot>Moderated · sample</Badge>}
        />
      </div>
      <HorizontalRail label="Voices · CV-VCE-01">
        {sampleTestimonials.map((testimonial) => (
          <RailCard key={testimonial.initials} className="group">
            <div className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-panel text-cold font-mono text-[13px] font-semibold">
                {testimonial.initials}
              </span>
              <div>
                <p className="mt-4 text-[13px] leading-relaxed text-fg">&ldquo;{testimonial.quote}&rdquo;</p>
                <p className="mt-4 font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">{testimonial.context}</p>
              </div>
            </div>
          </RailCard>
        ))}
        <RailCard className="border-cold/20 bg-cold/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="t-label text-cold">Your project</span>
              <p className="mt-2 text-[12px] text-fg-dim">The next file on this page is yours.</p>
            </div>
            <ButtonLink to="/contact" variant="secondary" size="sm" icon="arrow-right">
              Start the brief
            </ButtonLink>
          </div>
        </RailCard>
      </HorizontalRail>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  04 — Process timeline with parallax depth                               */
/* -------------------------------------------------------------------------- */

const processSnapshots = [
  { index: '01', title: 'Survey', duration: '1–2 days', depth: 0.6, color: 'cold' },
  { index: '02', title: 'Design', duration: '4–7 days', depth: 1.4, color: 'cold' },
  { index: '03', title: 'Quote', duration: '2 days', depth: 2.2, color: 'cold' },
  { index: '04', title: 'Install', duration: '3–21 days', depth: 3.0, color: 'heat' },
  { index: '05', title: 'Commission', duration: '1 day', depth: 3.8, color: 'heat' },
  { index: '06', title: 'Maintain', duration: 'Quarterly+', depth: 4.6, color: 'cold' },
]

export function ProcessDepthSection() {
  const { content } = useSiteContent()
  const copy = content.home
  const stages = content.processStages

  return (
    <section className="scroll-mt-[var(--header-h)] overflow-hidden border-b border-line bg-panel/20">
      <div className="shell pb-2 pt-[var(--section-y)]">
        <SectionHeader
          index="CV-PRG"
          label="Process depth"
          title={copy.processTitle}
          description={copy.processDescription}
          action={<Badge tone="heat" dot>Six stages · no gate skipped</Badge>}
        />
      </div>
      <div className="shell grid gap-12 pb-[var(--section-y)] pt-10 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <DepthScene className="mx-auto h-[420px] max-w-[400px]" travel={56}>
            <DepthLayer depth={0} className="absolute inset-0">
              <div className="scene-grid h-full border border-line/60" />
            </DepthLayer>
            <DepthLayer depth={0.8} className="absolute inset-x-6 top-8">
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center">
                  <span className="t-num text-[9px] text-fg-faint">CV-PRG</span>
                  <div className="mt-3 border border-line bg-panel/60 px-4 py-2">
                    <p className="text-[10px] font-medium text-fg">Six gates</p>
                    <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">One file</p>
                  </div>
                </div>
              </div>
            </DepthLayer>
            {processSnapshots.map((snapshot, index) => (
              <DepthLayer key={snapshot.index} depth={snapshot.depth} className="absolute left-[6%] w-[88%]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`t-num text-[9px] ${snapshot.color === 'heat' ? 'text-heat' : 'text-cold'}`}>
                      {snapshot.index}
                    </span>
                    <div>
                      <p className="text-[12px] font-medium text-fg">{snapshot.title}</p>
                      <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">{snapshot.duration}</p>
                    </div>
                  </div>
                  {stages[index] && (
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                      {stages[index].deliverable}
                    </span>
                  )}
                </div>
              </DepthLayer>
            ))}
            <DepthLayer depth={5.4} className="absolute -bottom-2 right-2 border border-heat/40 bg-base/90 px-3 py-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-heat">Handover before invoice</span>
            </DepthLayer>
          </DepthScene>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="border-t border-line">
            {stages.map((stage, index) => (
              <ScrollReveal key={stage.index} delay={index * 0.04}>
                <div className="grid grid-cols-[40px_1fr] gap-4 border-b border-line py-5">
                  <span className="t-num text-[10px] text-cold">{stage.index}</span>
                  <div>
                    <h3 className="text-[13px] font-medium text-fg">{stage.name}</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-fg-dim">{stage.body}</p>
                    <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                      {stage.deliverable} · {stage.duration}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <ButtonLink to="/process" variant="secondary" size="sm" icon="arrow-right">
              Read the full process
            </ButtonLink>
            <Link
              to="/process"
              className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:text-cold"
            >
              Quality gates
              <Icon name="arrow-up-right" size={12} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  05 — Service flow rail (used on the Services page)                       */
/* -------------------------------------------------------------------------- */

export function ServiceFlowRailSection() {
  const { content } = useSiteContent()
  const live = content.services.filter((service) => service.published)

  return (
    <section className="overflow-hidden border-b border-line bg-panel/20">
      <div className="shell pb-8 pt-[var(--section-y)]">
        <SectionHeader
          index="CV-FLOW"
          label="Capability rail"
          title="Scroll the register."
          description="Every published system in one horizontal pass — capacity, lead time and the specification that decides the selection. The rail pins and moves with the scroll on desktop; it becomes a native scroller on small screens."
          action={<Badge tone="cold" dot>{live.length} systems</Badge>}
        />
      </div>

      <HorizontalRail label="Service register · CV-FLOW-01">
        {live.map((service) => (
          <RailCard key={service.id} className="group">
            <div>
              <div className="flex items-start justify-between gap-4">
                <span className="t-num text-[11px] text-cold">{service.index}</span>
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                  {service.category}
                </span>
              </div>
              <h3 className="t-h4 mt-6 max-w-[18ch] text-fg">{service.name}</h3>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
                {service.capacity} · {service.timeline}
              </p>
              <p className="mt-3 line-clamp-4 text-[12px] leading-relaxed text-fg-dim">
                {service.scope || service.specification}
              </p>
            </div>
            <div className="border-t border-line pt-3">
              <p className="font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
                {service.specification}
              </p>
              <Link
                to={`/services/${service.id}`}
                className="mt-3 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
              >
                Open file
                <Icon name="arrow-up-right" size={11} />
              </Link>
            </div>
          </RailCard>
        ))}
        <RailCard className="!border-ink-block !bg-ink-block text-on-ink">
          <div>
            <span className="t-label !text-on-ink/60">Selection help</span>
            <h3 className="t-h3 mt-5 max-w-[16ch] text-on-ink">Not sure which system fits?</h3>
            <p className="mt-3 max-w-[30ch] text-[12px] leading-relaxed text-on-ink/70">
              Send the room, the load or the failure. We reply with the tonnage we would design to and the
              equipment we would specify.
            </p>
          </div>
          <div className="border-t border-on-ink/15 pt-4">
            <ButtonLink to="/contact" variant="secondary" size="sm" icon="arrow-right" className="!border-on-ink/25 !bg-transparent !text-on-ink hover:!border-heat/60 hover:!text-heat">
              Send the brief
            </ButtonLink>
          </div>
        </RailCard>
      </HorizontalRail>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  06 — CTA band with parallax badge and magnetic button                  */
/* -------------------------------------------------------------------------- */

export function FinalCtaBandSection() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const copy = content.home
  const sectionRef = useRef<HTMLElement>(null)

  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current
    if (!section || prefersReducedMotion()) return
    const context = gsap.context(() => {
      gsap.from(section.querySelectorAll('[data-cta-reveal]'), {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        stagger: 0.1,
        scrollTrigger: { trigger: section, start: 'top 85%', toggleActions: 'play none none reverse' },
      })
    }, section)
    return () => context.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-hidden border-b border-line bg-ink-block text-on-ink">
      <ParallaxDrift className="pointer-events-none absolute -right-[12%] top-1/2 h-[60%] w-[50%] -translate-y-1/2" strength={8}>
        <Icon name="airflow" className="h-full w-full text-on-ink/[0.04]" />
      </ParallaxDrift>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgb(var(--on-ink)) 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, rgb(var(--on-ink)) 0 1px, transparent 1px 48px)' }} />
      <div className="shell relative py-[var(--section-y)]">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div data-cta-reveal className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <span className="t-num text-[10px] text-heat">CV-CTA</span>
              <span className="h-px w-6 bg-on-ink/35" />
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-on-ink/60">Tell us the setpoint</span>
            </div>
            <h2 className="t-h2 mt-6 text-on-ink">{copy.finalCtaTitle}</h2>
            <p className="mt-5 max-w-[44ch] text-sm leading-relaxed text-on-ink/70">{copy.finalCtaLead}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-on-ink/40">No commitment · written scope</span>
            </div>
          </div>
          <div data-cta-reveal className="lg:col-span-6 lg:col-start-7">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <MagneticButton>
                <ButtonLink to="/contact" size="lg" icon="arrow-up-right" className="text-on-ink border-on-ink/30 hover:border-heat hover:text-heat">
                  Send the brief
                </ButtonLink>
              </MagneticButton>
              <a href={`tel:${brand.contact.phone}`} className="t-num text-[16px] text-on-ink transition-colors hover:text-heat">
                {brand.contact.phoneDisplay}
              </a>
            </div>
            <div className="mt-5 flex flex-wrap gap-6 font-mono text-[9px] uppercase tracking-[0.1em] text-on-ink/50">
              <span>{brand.address.locality}, {brand.address.region} {brand.address.postalCode}</span>
              <span>{brand.hours.weekdays}</span>
              <span>{brand.hours.emergency}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
