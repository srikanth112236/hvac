import { CounterStat, HorizontalRail, ParallaxImage, PinnedStory, RailCard, SplitReveal, TiltCard } from '@/motion'
import { Badge, SectionHeader } from '@/components/ui'

export function MotionLab() {
  return (
    <section id="motion" className="flex flex-col gap-10 scroll-mt-28">
      <SectionHeader
        index="08"
        label="Motion"
        title="Scroll is the timeline."
        description="Nothing plays once on load. Entrances are scrubbed or triggered by position, and every primitive collapses to a static layout under prefers-reduced-motion."
        action={<Badge tone="cold" dot>GSAP · Lenis</Badge>}
      />

      <div className="flex flex-col gap-4">
        <span className="t-label">SplitReveal · word mask</span>
        <div className="border border-line bg-panel/40 px-6 py-10">
          <SplitReveal as="h3" className="t-h2 max-w-[22ch] text-fg" stagger={0.05}>
            Air does not move in a straight line through a building.
          </SplitReveal>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-dim">
            Scroll the styleguide again to replay it. Words are visible in the DOM before animation
            starts, so the copy is never a hidden screen-reader trap.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <span className="t-label">ParallaxImage · plate mode</span>
          <ParallaxImage
            alt="Rooftop condenser bank, copper lineset"
            caption="Rooftop plant · 4 × 80 TR condensers, 42 Pa static"
            callout="Condenser bank"
          />
        </div>

        <div className="flex flex-col gap-4">
          <span className="t-label">TiltCard · pointer perspective</span>
          <TiltCard className="h-full">
            <div className="marks flex h-full min-h-[260px] flex-col justify-between border border-line bg-panel p-6">
              <div className="flex items-center justify-between">
                <span className="t-num text-[10px] text-cold">01</span>
                <span className="t-label">VRF</span>
              </div>
              <div>
                <h4 className="t-h3 text-fg">Branch selector</h4>
                <p className="mt-2 max-w-[34ch] text-[12px] leading-relaxed text-fg-dim">
                  Per indoor unit: 2.2 / 2.8 / 3.6 kW. Diversity 92%, longest run 68 m, 12 m
                  vertical offset.
                </p>
              </div>
              <div className="thread mt-4" />
            </div>
          </TiltCard>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border border-line bg-panel/40 p-6">
        {[
          { value: 18600, suffix: ' TR', label: 'Commissioned' },
          { value: 4120, suffix: '', label: 'Systems' },
          { value: 4, suffix: ' h', label: 'Response' },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <span className="text-h3 text-fg">
              <CounterStat value={stat.value} suffix={stat.suffix} />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <span className="t-label">HorizontalRail · pinned, scroll-scrubbed</span>
        <div className="border-x border-t border-line">
          <HorizontalRail label="Selected projects" className="h-full">
            {[
              ['Cold room', 'Meridian Foods', '12 TR · 4 chambers · pharma'],
              ['VRF', 'Aster Offices', '84 TR · 14 floors · 62 indoor units'],
              ['Chiller', 'Northline Labs', '320 TR · 0.58 kW/TR at design'],
              ['Cleanroom', 'Helix Devices', 'ISO 7 · 22 Pa positive · 18 ACH'],
              ['Ducting', 'Civic Hall', 'GI · 2,400 m² · 640 Pa'],
              ['AMC', 'Harbour Mall', 'Comprehensive · 26 visits/yr'],
            ].map(([kind, name, spec]) => (
              <RailCard key={name}>
                <div className="flex items-center justify-between">
                  <span className="t-label">{kind}</span>
                  <span className="t-num text-[10px] text-fg-faint">→</span>
                </div>
                <div>
                  <h4 className="t-h3 text-fg">{name}</h4>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-dim">
                    {spec}
                  </p>
                </div>
              </RailCard>
            ))}
          </HorizontalRail>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <span className="t-label">PinnedStory · airflow sequence</span>
        <div className="border border-line">
          <PinnedStory
            eyebrow="How air moves"
            steps={[
              {
                index: '01',
                title: 'Outdoor unit',
                body: 'Heat leaves the refrigerant at the condenser. Ambient dry-bulb and coil face velocity decide how much.',
                meta: 'Condenser · 45 °C ambient',
              },
              {
                index: '02',
                title: 'Refrigerant line',
                body: 'Insulated copper carries the change of state inside. Length and vertical offset are pressure-drop, not plumbing.',
                meta: 'Lineset · 68 m equivalent',
              },
              {
                index: '03',
                title: 'Indoor coil',
                body: 'Air crosses the evaporator; sensible and latent load come off together. Bypass factor is the number nobody quotes.',
                meta: 'Evaporator · 6.5 °C',
              },
              {
                index: '04',
                title: 'Ductwork',
                body: 'Static pressure is spent on fittings. Every elbow you remove is fan energy you keep.',
                meta: 'Supply · 42 Pa',
              },
            ]}
          />
        </div>
      </div>
    </section>
  )
}
