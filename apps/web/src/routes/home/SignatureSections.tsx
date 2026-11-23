import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge, ButtonLink, SectionHeader } from '@/components/ui'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'
import {
  CounterStat,
  HorizontalRail,
  ParallaxDrift,
  RailCard,
  ScrollReveal,
  gsap,
  prefersReducedMotion,
} from '@/motion'
import { useIsomorphicLayoutEffect } from '@/motion/core'

/* -------------------------------------------------------------------------- */
/*  01 — The standard                                                         */
/* -------------------------------------------------------------------------- */

const standards = [
  {
    code: '01',
    title: 'Load before kit',
    body: 'The room decides the tonnage. Glazing, occupancy and equipment are counted before a model number is proposed.',
  },
  {
    code: '02',
    title: 'Access before aesthetics',
    body: 'Service valves, drain slope and filter access are drawn into the layout, not discovered after the ceiling closes.',
  },
  {
    code: '03',
    title: 'Record before handover',
    body: 'The measured number is written beside the design number. A system without a baseline is not commissioned.',
  },
]

function SetpointDial() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const needleRef = useRef<SVGGElement>(null)
  const ticks = Array.from({ length: 37 }, (_, index) => -120 + (index * 240) / 36)

  useIsomorphicLayoutEffect(() => {
    const wrap = wrapRef.current
    const needle = needleRef.current
    if (!wrap || !needle) return

    needle.style.transformOrigin = '120px 120px'

    if (prefersReducedMotion()) {
      needle.style.transform = 'rotate(8deg)'
      return
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        needle,
        { rotation: -42 },
        {
          rotation: 24,
          ease: 'none',
          scrollTrigger: {
            trigger: wrap,
            start: 'top 88%',
            end: 'bottom 40%',
            scrub: 0.7,
          },
        },
      )
    }, wrap)

    return () => context.revert()
  }, [])

  return (
    <div ref={wrapRef} className="relative mx-auto w-full max-w-[280px]">
      <svg
        viewBox="0 0 240 240"
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Setpoint dial showing 24.1 degrees Celsius, inside the design band"
      >
        <circle cx="120" cy="120" r="106" fill="none" stroke="rgb(var(--line))" />
        <circle
          cx="120"
          cy="120"
          r="90"
          fill="none"
          stroke="rgb(var(--line-strong) / 0.7)"
          strokeDasharray="2 7"
        />
        {ticks.map((angle, index) => (
          <line
            key={angle}
            x1="120"
            y1={index % 9 === 0 ? 24 : 30}
            x2="120"
            y2="38"
            transform={`rotate(${angle} 120 120)`}
            stroke={index % 9 === 0 ? 'rgb(var(--cold))' : 'rgb(var(--line-strong))'}
            strokeWidth={index % 9 === 0 ? 1.4 : 0.8}
          />
        ))}
        <path d="M42 150 A 86 86 0 0 1 198 150" fill="none" stroke="rgb(var(--cold) / 0.3)" />
        <g ref={needleRef}>
          <line x1="120" y1="120" x2="120" y2="48" stroke="rgb(var(--cold))" strokeWidth="1.6" />
          <line x1="120" y1="120" x2="120" y2="58" stroke="rgb(var(--heat))" strokeWidth="0.8" />
        </g>
        <circle cx="120" cy="120" r="5.5" fill="rgb(var(--base))" stroke="rgb(var(--cold))" strokeWidth="1.4" />
        <circle cx="120" cy="120" r="1.7" fill="rgb(var(--cold))" />
      </svg>

      <div className="-mt-3 text-center">
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="t-num text-[clamp(2.6rem,5vw,4rem)] leading-none text-fg">24.1</span>
          <span className="font-mono text-[12px] text-cold">°C</span>
        </div>
        <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.16em] text-fg-faint">
          Return air · measured
        </p>
      </div>
    </div>
  )
}

export function SetpointSection() {
  const { content } = useSiteContent()
  const copy = content.home
  return (
    <section className="relative overflow-hidden border-b border-line bg-panel/20">
      <div className="shell grid gap-12 py-[var(--section-y)] lg:grid-cols-12 lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+48px)] lg:col-span-5 lg:self-start">
          <SectionHeader
            index="CV-STD"
            label="The standard"
            title={copy.setpointTitle}
            description={copy.setpointDescription}
            action={<Badge tone="cold" dot>Measured, not claimed</Badge>}
          />

          <div className="mt-10 border-t border-line">
            {standards.map((item) => (
              <ScrollReveal key={item.code}>
                <div className="grid grid-cols-[34px_1fr] gap-4 border-b border-line py-5">
                  <span className="t-num text-[9px] text-cold">{item.code}</span>
                  <div>
                    <h3 className="text-[13px] font-medium text-fg">{item.title}</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-fg-dim">{item.body}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <ButtonLink to="/process" variant="secondary" size="sm" icon="arrow-right">
              See the gates
            </ButtonLink>
            <Link
              to="/blog/what-belongs-in-an-hvac-commissioning-file"
              className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cold transition-colors hover:text-fg"
            >
              What goes in the file
              <Icon name="arrow-up-right" size={12} />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <ScrollReveal>
            <div className="marks relative overflow-hidden border border-line bg-panel">
              <ParallaxDrift
                className="pointer-events-none absolute -right-24 -top-24 h-[360px] w-[360px]"
                strength={5}
              >
                <Icon name="gauge" className="h-full w-full text-cold/[0.055]" />
              </ParallaxDrift>

              <div className="relative flex items-center justify-between gap-4 border-b border-line px-5 py-3">
                <span className="t-label">Room 03 · server hall</span>
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  CV / STD-01
                </span>
              </div>

              <div className="relative grid gap-7 px-5 py-7 sm:grid-cols-[1.1fr_1fr] sm:items-center">
                <SetpointDial />
                <div className="border-t border-line sm:border-l sm:border-t-0 sm:pl-6">
                  {[
                    ['Air-side ΔT', '9.4 °C', 'inside 8–12 °C band'],
                    ['External static', '42 Pa', 'design at every branch'],
                    ['Part load', '0.81 kW/TR', 'at 60% load'],
                  ].map(([label, value, note]) => (
                    <div key={label} className="border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0">
                      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                        {label}
                      </span>
                      <p className="t-num mt-1 text-[20px] text-fg">{value}</p>
                      <p className="mt-1 text-[10px] leading-snug text-fg-dim">{note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-line bg-base/45 px-5 py-3">
                <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-fg-dim">
                  <span className="h-1.5 w-1.5 bg-success" />
                  Within model band
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  Design 24.0 · measured 24.1
                </span>
              </div>
            </div>
          </ScrollReveal>

          <div className="mt-5 grid grid-cols-3 gap-px border border-line bg-line">
            {[
              ['Survey', 'Room by room'],
              ['Design', 'To the furthest run'],
              ['Sign-off', 'Measured + written'],
            ].map(([title, note]) => (
              <div key={title} className="bg-panel px-3 py-4">
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-cold">{title}</p>
                <p className="mt-1 text-[10px] leading-snug text-fg-dim">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  02 — The six gates, as a horizontal rail                                  */
/* -------------------------------------------------------------------------- */

const gateIcons = ['search', 'gauge', 'download', 'wrench', 'thermostat', 'shield'] as const

export function SequenceRail() {
  const { content } = useSiteContent()
  const copy = content.home
  const stages = content.processStages

  return (
    <section className="overflow-hidden border-b border-line bg-panel/20">
      <div className="shell pb-8 pt-[var(--section-y)]">
        <SectionHeader
          index="CV-SEQ"
          label="The sequence"
          title={copy.sequenceTitle}
          description={copy.sequenceDescription}
          action={<Badge tone="heat" dot>No gate skipped</Badge>}
        />
      </div>

      <HorizontalRail label="Delivery sequence · CV-PRG-01">
        {stages.map((stage, index) => (
          <RailCard key={stage.index} className="group">
            <div>
              <div className="flex items-start justify-between gap-4">
                <span className="t-num text-[11px] text-cold">{stage.index}</span>
                <span className="flex h-9 w-9 items-center justify-center border border-line text-cold transition-colors group-hover:border-cold/50">
                  <Icon name={gateIcons[index] ?? 'gauge'} size={17} />
                </span>
              </div>
              <h3 className="t-h3 mt-7 text-fg">{stage.name}</h3>
              <p className="mt-3 text-[12px] leading-relaxed text-fg-dim">{stage.body}</p>
            </div>

            <div className="border-t border-line pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  Gate {String(index + 1).padStart(2, '0')}
                </span>
                <span className="t-num text-[9px] text-fg-dim">{stage.duration}</span>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-fg">{stage.deliverable}</p>
            </div>
          </RailCard>
        ))}

        <RailCard className="!border-ink-block !bg-ink-block text-on-ink !w-[min(82vw,380px)]">
          <div>
            <span className="t-label !text-on-ink/55">The handover</span>
            <h3 className="t-h2 mt-5 text-on-ink">{copy.sequenceHandoverTitle}</h3>
            <p className="mt-4 max-w-[28ch] text-[12px] leading-relaxed text-on-ink/70">
              {copy.sequenceHandoverBody}
            </p>
          </div>
          <div className="border-t border-on-ink/15 pt-4">
            <Link
              to="/process"
              className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-on-ink transition-colors hover:text-heat"
            >
              Read the six stages
              <Icon name="arrow-right" size={13} />
            </Link>
          </div>
        </RailCard>
      </HorizontalRail>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  03 — Measured band                                                        */
/* -------------------------------------------------------------------------- */

export function MeasuredBand() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const copy = content.home
  const stats = [
    { value: brand.stats.yearsOperating, suffix: '', label: 'Years on the tools', note: 'Since 2009' },
    { value: brand.stats.systemsInstalled, suffix: '', label: 'Systems installed', note: 'Split to central plant' },
    { value: brand.stats.tonnageCommissioned, suffix: '', label: 'TR commissioned', note: 'Measured at handover' },
    { value: brand.stats.emergencyResponseHours, suffix: ' h', label: 'Emergency response', note: '24 × 7 dispatch' },
  ]

  return (
    <section className="relative overflow-hidden border-b border-line bg-ink-block text-on-ink">
      <ParallaxDrift
        className="pointer-events-none absolute -right-[16%] top-1/2 h-[80%] w-[64%] -translate-y-1/2"
        strength={10}
      >
        <Icon name="gauge" className="h-full w-full text-on-ink/[0.05]" />
      </ParallaxDrift>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgb(var(--on-ink)) 0 1px, transparent 1px 52px), repeating-linear-gradient(90deg, rgb(var(--on-ink)) 0 1px, transparent 1px 52px)',
        }}
      />

      <div className="shell relative py-[var(--section-y)]">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <span className="t-num text-[10px] text-heat">CV-MET</span>
              <span aria-hidden className="h-px w-7 bg-on-ink/35" />
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-on-ink/60">
                Numbers we can defend
              </span>
            </div>
            <h2 className="t-h2 mt-6 text-on-ink">{copy.measuredTitle}</h2>
            <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-on-ink/70">
              {copy.measuredDescription}
            </p>
            <Link
              to="/work"
              className="mt-7 inline-flex items-center gap-2 border-b border-on-ink/25 pb-1 font-mono text-[9px] uppercase tracking-[0.12em] text-on-ink transition-colors hover:border-heat hover:text-heat"
            >
              See the completed work
              <Icon name="arrow-up-right" size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-px border border-on-ink/15 bg-on-ink/15 lg:col-span-6 lg:col-start-7">
            {stats.map((stat, index) => (
              <ScrollReveal key={stat.label} delay={index * 0.06}>
                <div className="h-full bg-ink-block p-5 sm:p-6">
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-on-ink/45">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-6 text-on-ink">
                    <CounterStat
                      value={stat.value}
                      suffix={stat.suffix}
                      className="text-[clamp(1.9rem,4vw,3.2rem)] leading-none"
                    />
                  </p>
                  <p className="mt-3 text-[11px] leading-snug text-on-ink/75">{stat.label}</p>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-on-ink/40">
                    {stat.note}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  04 — The system map                                                       */
/* -------------------------------------------------------------------------- */

function SystemMap() {
  const figureRef = useRef<HTMLElement>(null)

  useIsomorphicLayoutEffect(() => {
    const figure = figureRef.current
    if (!figure) return
    const paths = Array.from(figure.querySelectorAll<SVGPathElement>('[data-draw]'))
    const nodes = Array.from(figure.querySelectorAll<SVGGElement>('[data-node]'))
    if (!paths.length) return

    if (prefersReducedMotion()) {
      paths.forEach((path) => {
        path.style.strokeDasharray = 'none'
        path.style.strokeDashoffset = '0'
      })
      return
    }

    const context = gsap.context(() => {
      paths.forEach((path) => {
        const length = path.getTotalLength()
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
      })

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: figure,
          start: 'top 78%',
          end: 'bottom 48%',
          scrub: 0.7,
        },
      })

      timeline.to(paths, { strokeDashoffset: 0, stagger: 0.08, ease: 'none' })
      timeline.fromTo(
        nodes,
        { opacity: 0.35 },
        { opacity: 1, stagger: 0.04, ease: 'none' },
        0,
      )
    }, figure)

    return () => context.revert()
  }, [])

  return (
    <figure ref={figureRef} className="relative">
      <div className="overflow-x-auto overscroll-x-contain">
        <div className="relative aspect-[16/10] min-w-[680px] overflow-hidden border border-line bg-panel sm:min-w-0">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgb(var(--line) / 0.7) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, rgb(var(--line) / 0.7) 0 1px, transparent 1px 34px)',
          }}
        />
        <ParallaxDrift
          className="pointer-events-none absolute -right-10 -top-16 h-[70%] w-[50%]"
          strength={4}
        >
          <Icon name="vrf" className="h-full w-full text-cold/[0.035]" />
        </ParallaxDrift>

        <svg
          viewBox="0 0 760 520"
          className="relative h-full w-full"
          role="img"
          aria-label="System map: outdoor unit to branch selector, four indoor terminals and a control link"
        >
          <g fill="none" stroke="rgb(var(--line-strong) / 0.65)" strokeWidth="1">
            <path d="M20 90H740M20 185H740M20 280H740M20 375H740M20 470H740" />
            <path d="M150 20V500M300 20V500M450 20V500M600 20V500" />
          </g>

          <g fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path data-draw d="M170 260H290" stroke="rgb(var(--cold))" />
            <path data-draw d="M430 260H500" stroke="rgb(var(--cold))" />
            <path data-draw d="M500 260V112H575" stroke="rgb(var(--cold))" />
            <path data-draw d="M500 260V222H575" stroke="rgb(var(--cold))" />
            <path data-draw d="M500 260V332H575" stroke="rgb(var(--cold))" />
            <path data-draw d="M500 260V442H575" stroke="rgb(var(--heat))" />
            <path
              data-draw
              d="M365 306V370H430"
              stroke="rgb(var(--fg-dim))"
              strokeDasharray="4 6"
              strokeWidth="1.2"
            />
            <path
              data-draw
              d="M430 402H520V112H575"
              stroke="rgb(var(--fg-dim))"
              strokeDasharray="4 6"
              strokeWidth="1.2"
            />
          </g>

          <g fontFamily="var(--font-mono)" fontSize="9" letterSpacing="1.2">
            <g data-node>
              <rect x="40" y="218" width="130" height="84" fill="rgb(var(--panel))" stroke="rgb(var(--line-strong))" />
              <text x="56" y="240" fill="rgb(var(--fg-faint))" fontSize="8">
                SOURCE
              </text>
              <text x="56" y="260" fill="rgb(var(--fg))" fontSize="10">
                OUTDOOR BANK
              </text>
              <text x="56" y="278" fill="rgb(var(--fg-dim))" fontSize="8">
                N+1 · rooftop
              </text>
              <text x="56" y="292" fill="rgb(var(--cold))" fontSize="8">
                CV-01
              </text>
            </g>

            <g data-node>
              <rect x="290" y="218" width="140" height="84" fill="rgb(var(--panel))" stroke="rgb(var(--cold) / 0.55)" />
              <text x="306" y="240" fill="rgb(var(--fg-faint))" fontSize="8">
                DISTRIBUTION
              </text>
              <text x="306" y="260" fill="rgb(var(--fg))" fontSize="10">
                BRANCH SELECTOR
              </text>
              <text x="306" y="278" fill="rgb(var(--fg-dim))" fontSize="8">
                68 m max run
              </text>
              <text x="306" y="292" fill="rgb(var(--cold))" fontSize="8">
                92% diversity
              </text>
            </g>

            <g data-node>
              <rect x="320" y="370" width="110" height="64" fill="rgb(var(--panel))" stroke="rgb(var(--line-strong))" />
              <text x="334" y="390" fill="rgb(var(--fg-faint))" fontSize="8">
                CONTROL
              </text>
              <text x="334" y="408" fill="rgb(var(--fg))" fontSize="10">
                BMS / ALARMS
              </text>
              <text x="334" y="424" fill="rgb(var(--fg-dim))" fontSize="8">
                points list
              </text>
            </g>

            {[
              ['IDU-01', 'Office · east', '112'],
              ['IDU-02', 'Meeting · north', '222'],
              ['IDU-03', 'Studio · west', '332'],
              ['IDU-04', 'Server hall', '442'],
            ].map(([code, room, y], index) => (
              <g key={code} data-node>
                <rect
                  x="575"
                  y={Number(y) - 32}
                  width="145"
                  height="64"
                  fill="rgb(var(--panel))"
                  stroke={index === 3 ? 'rgb(var(--heat) / 0.7)' : 'rgb(var(--line-strong))'}
                />
                <circle cx="590" cy={Number(y) - 15} r="3" fill={index === 3 ? 'rgb(var(--heat))' : 'rgb(var(--cold))'} />
                <text x="600" y={Number(y) - 11} fill="rgb(var(--fg))" fontSize="9">
                  {code}
                </text>
                <text x="590" y={Number(y) + 7} fill="rgb(var(--fg-dim))" fontSize="8">
                  {room}
                </text>
                <text x="590" y={Number(y) + 22} fill="rgb(var(--fg-faint))" fontSize="7">
                  DESIGN LOAD VERIFIED
                </text>
              </g>
            ))}

            <g data-node>
              <circle cx="170" cy="260" r="4" fill="rgb(var(--cold))" />
              <circle cx="500" cy="260" r="4" fill="rgb(var(--cold))" />
              <circle cx="575" cy="442" r="4" fill="rgb(var(--heat))" />
            </g>
          </g>
        </svg>

          <div className="absolute bottom-3 left-4 flex flex-wrap items-center gap-4 font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
            <span className="flex items-center gap-1.5">
              <span className="h-px w-5 bg-cold" /> Cooling circuit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-px w-5 bg-heat" /> Standby branch
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-px w-5 border-t border-dashed border-fg-dim" /> Control link
            </span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 flex items-start gap-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
        <span className="mt-1.5 h-px w-5 shrink-0 bg-line-strong" />
        One line schedule, one control narrative, one commissioning record. Schematic — not a
        site-specific layout.
      </figcaption>
    </figure>
  )
}

export function SystemMapSection() {
  const { content } = useSiteContent()
  const copy = content.home
  const mapNodes = [
    { icon: 'snowflake' as const, label: 'Source', value: 'Outdoor bank · N+1' },
    { icon: 'vrf' as const, label: 'Distribution', value: 'Branch selector · 68 m' },
    { icon: 'thermostat' as const, label: 'Terminal', value: 'Indoor units · room by room' },
    { icon: 'gauge' as const, label: 'Control', value: 'Sequence, alarms, BMS points' },
  ]

  return (
    <section className="overflow-hidden border-b border-line">
      <div className="shell py-[var(--section-y)]">
        <SectionHeader
          index="CV-MAP"
          label="The drawing"
          title={copy.mapTitle}
          description={copy.mapDescription}
          action={<Badge tone="cold" dot>Drawing first</Badge>}
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <div className="border-t border-line">
              {mapNodes.map((node, index) => (
                <ScrollReveal key={node.label} delay={index * 0.04}>
                  <div className="grid grid-cols-[38px_1fr] gap-4 border-b border-line py-5">
                    <span className="flex h-9 w-9 items-center justify-center border border-line text-cold">
                      <Icon name={node.icon} size={16} />
                    </span>
                    <div>
                      <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                        {String(index + 1).padStart(2, '0')} · {node.label}
                      </span>
                      <p className="mt-1 text-[13px] leading-snug text-fg">{node.value}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
            <ButtonLink to="/services" variant="secondary" size="sm" icon="arrow-right" className="mt-7">
              Open the service index
            </ButtonLink>
          </div>

          <div className="lg:col-span-7">
            <ScrollReveal distance={18}>
              <SystemMap />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  05 — Dispatch coverage                                                    */
/* -------------------------------------------------------------------------- */

export function DispatchCoverageSection() {
  const { content } = useSiteContent()
  const copy = content.home
  const brand = useBrand()
  const sectionRef = useRef<HTMLElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const cities = brand.serviceAreas

  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current
    const strip = stripRef.current
    if (!section || !strip || prefersReducedMotion()) return

    const context = gsap.context(() => {
      gsap.fromTo(
        strip,
        { xPercent: 3 },
        {
          xPercent: -16,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.8,
          },
        },
      )
    }, section)

    return () => context.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-hidden border-b border-line bg-panel/20">
      <ParallaxDrift
        className="pointer-events-none absolute -left-[10%] top-10 h-[520px] w-[520px]"
        strength={6}
      >
        <Icon name="pin" className="h-full w-full text-cold/[0.05]" />
      </ParallaxDrift>

      <div className="relative py-[var(--section-y)]">
        <div className="shell">
          <SectionHeader
            index="CV-DISPATCH"
            label="Dispatch"
            title={copy.dispatchTitle}
            description={copy.dispatchDescription}
            action={<Badge tone="heat" dot>24 × 7 dispatch</Badge>}
          />
        </div>

        <div className="relative mt-10 overflow-hidden border-y border-line bg-base/50 py-7">
          <div ref={stripRef} className="w-max whitespace-nowrap will-change-transform">
            {[0, 1].map((repeat) => (
              <span
                key={repeat}
                className="inline-flex items-baseline gap-7 pr-7 font-display text-[clamp(3.8rem,10vw,9rem)] leading-none tracking-[-0.03em] text-fg"
                aria-hidden={repeat === 1}
              >
                {cities.map((city) => (
                  <span key={`${repeat}-${city.slug}`} className="inline-flex items-baseline gap-7">
                    {city.city}
                    <span className="font-mono text-[0.18em] uppercase tracking-[0.14em] text-cold">
                      {city.radiusKm} km
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <div className="shell mt-10 grid gap-5 md:grid-cols-3">
          {cities.map((city, index) => (
            <ScrollReveal key={city.slug} delay={index * 0.06}>
              <article className="marks flex h-full flex-col justify-between border border-line bg-panel p-5">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="t-label">Area {String(index + 1).padStart(2, '0')}</span>
                    <Icon name="pin" size={16} className="text-cold" />
                  </div>
                  <h3 className="t-h3 mt-5 text-fg">{city.city}</h3>
                  <p className="mt-1 text-[11px] text-fg-dim">{city.region}</p>
                </div>
                <div className="mt-7 border-t border-line pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                      Service radius
                    </span>
                    <span className="t-num text-[11px] text-fg">{city.radiusKm} km</span>
                  </div>
                  <p className="mt-2 text-[10px] leading-snug text-fg-dim">
                    {index === 0 ? 'Same-day attendance · works base' : 'Scheduled routes · planned visits'}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>

        <div className="shell mt-8 flex flex-col items-start justify-between gap-4 border border-line bg-ink-block px-5 py-4 text-on-ink sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center border border-on-ink/20 text-heat">
              <Icon name="bolt" size={15} />
            </span>
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-on-ink/50">
                {brand.hours.emergency}
              </p>
              <p className="mt-0.5 text-[12px] text-on-ink">An engineer answers, not a call centre.</p>
            </div>
          </div>
          <a
            href={`tel:${brand.contact.emergencyPhone}`}
            className="t-num text-[15px] text-on-ink transition-colors hover:text-heat"
          >
            {brand.contact.emergencyPhone}
          </a>
        </div>
      </div>
    </section>
  )
}
