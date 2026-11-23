import { Icon } from '@/components/icons'
import { ButtonAnchor } from '@/components/ui'
import { useSiteContent } from '@/content/SiteContentProvider'

const residential = {
  label: 'Residential',
  capacity: '1.5 – 8.5 TR',
  title: 'Homes, sized honestly.',
  body: 'One room at a time, on the sensible load. Drain slope, electrical point and service access are settled before a wall is opened, and the unit is selected for the noise it makes at 2 am — not for the badge on the brochure.',
  points: [
    'Wall, cassette and ducted splits',
    'Society NOC and lift coordination',
    'Drain and electrical point included in scope',
    'Three-year workmanship warranty',
  ],
  icon: 'heat-pump' as const,
}

const commercial = {
  label: 'Commercial & industrial',
  capacity: '60 – 2,000 TR',
  title: 'Plant rooms, commissioned to a number.',
  body: 'Loads calculated to ISHRAE comfort data, redundancy designed for the failure case, and a BMS handover that the next engineer can actually read. We publish the delta-T and static pressure we measured, per coil and per branch.',
  points: [
    'VRF, chilled water and precision cooling',
    'N+1 plant and headered changeover',
    'BMS points list and alarm schedule',
    'O&M file with as-built drawings',
  ],
  metrics: [
    ['Redundancy', 'N+1'],
    ['Handover', 'O&M file'],
    ['Dispatch', '4 h'],
  ],
}

const gridOverlay = {
  backgroundImage:
    'repeating-linear-gradient(0deg, rgb(var(--on-ink) / 0.06) 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, rgb(var(--on-ink) / 0.06) 0 1px, transparent 1px 48px)',
}

/** The two buying paths, given different treatments rather than two equal cards. */
export function Segments() {
  const { content } = useSiteContent()
  return (
    <section className="section-lg border-b border-line">
      <div className="shell flex flex-col gap-12">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-6">
            <span className="annot">04 · Two ways in</span>
            <h2 className="t-h2 mt-5 max-w-[16ch] text-fg">
              {content.home.segmentsTitle ?? 'One plant room. Two very different briefs.'}
            </h2>
          </div>
          <p className="max-w-prose text-sm leading-relaxed text-fg-dim md:col-span-4 md:col-start-9">
            {content.home.segmentsDescription ??
              'A three-bedroom flat and a fourteen-floor office do not share a design method. They share a standard: the number on the handover sheet has to be the number on the wall.'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          <article className="marks relative flex flex-col justify-between gap-8 overflow-hidden border border-line bg-panel p-7 md:col-span-5">
            <Icon
              name={residential.icon}
              size={190}
              className="pointer-events-none absolute -right-10 -top-10 text-fg/[0.04]"
            />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <span className="t-label">{residential.label}</span>
                <span className="t-num text-[11px] text-cold">{residential.capacity}</span>
              </div>
              <h3 className="t-h3 mt-6 max-w-[14ch] text-fg">{residential.title}</h3>
              <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-fg-dim">
                {residential.body}
              </p>
            </div>
            <ul className="relative flex flex-col border-t border-line">
              {residential.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 border-b border-line/70 py-2.5 text-[12px] leading-snug text-fg-dim last:border-b-0"
                >
                  <Icon name="check" size={13} className="mt-0.5 shrink-0 text-cold" />
                  {point}
                </li>
              ))}
            </ul>
          </article>

          <article className="relative flex flex-col justify-between gap-8 overflow-hidden border border-line bg-ink-block p-7 text-on-ink md:col-span-7 md:col-start-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={gridOverlay}
            />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <span className="t-label !text-on-ink/70">{commercial.label}</span>
                <span className="t-num text-[11px] text-heat">{commercial.capacity}</span>
              </div>
              <h3 className="t-h3 mt-6 max-w-[18ch]">{commercial.title}</h3>
              <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-on-ink/70">
                {commercial.body}
              </p>
            </div>

            <div className="relative grid gap-6 sm:grid-cols-2">
              <ul className="flex flex-col">
                {commercial.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 border-t border-on-ink/10 py-2.5 text-[12px] leading-snug text-on-ink/70 first:border-t-0 first:pt-0"
                  >
                    <Icon name="check" size={13} className="mt-0.5 shrink-0 text-heat" />
                    {point}
                  </li>
                ))}
              </ul>
              <dl className="flex flex-col justify-end gap-4">
                {commercial.metrics.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-3 border-b border-on-ink/10 pb-2"
                  >
                    <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-on-ink/45">
                      {label}
                    </dt>
                    <dd className="t-num text-[12px] text-on-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <ButtonAnchor
                href="#callback"
                variant="secondary"
                size="sm"
                icon="arrow-up-right"
                className="!border-on-ink/25 !bg-transparent !text-on-ink hover:!border-heat/60 hover:!text-heat"
              >
                Brief the plant room
              </ButtonAnchor>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
