import { Badge, SectionHeader } from '@/components/ui'
import { PinnedStory } from '@/motion'
import { airflowSteps } from '@/content/home'
import { useSiteContent } from '@/content/SiteContentProvider'
import { cn } from '@/lib/cn'

/**
 * Pinned airflow story. The layers are real stack members that separate in
 * Z-space as the scroll advances, driven by the active step the primitive
 * reports — not a decorative parallax on a flat illustration.
 */
export function AirflowStory() {
  const { content } = useSiteContent()
  return (
    <section id="airflow" className="scroll-mt-[var(--header-h)] border-b border-line bg-panel/20">
      <div className="shell pb-2 pt-[var(--section-y)]">
        <SectionHeader
          index="03"
          label="Pinned sequence"
          title={content.home.airflowTitle ?? 'How air moves through your building.'}
          description={
            content.home.airflowDescription ??
            'Six layers between the condenser fan and the diffuser. Each one adds pressure drop, heat gain or noise — and each one is a decision made on paper before it is made in copper.'
          }
          action={<Badge tone="cold" dot>Scroll-scrubbed</Badge>}
        />
      </div>

      <PinnedStory
        eyebrow="Airflow · CV-AIR-01"
        steps={airflowSteps}
        visual={(_step, index) => <AirflowScene active={index} />}
      />
    </section>
  )
}

function AirflowScene({ active }: { active: number }) {
  return (
    <div className="relative h-[320px] w-full [perspective:1200px]">
      {airflowSteps.map((step, index) => {
        const delta = index - active
        const isActive = delta === 0
        return (
          <div
            key={step.index}
            aria-hidden={!isActive}
            className={cn(
              'absolute inset-x-0 top-1/2 flex items-center justify-between gap-3 border px-4 py-3 transition-[transform,opacity,border-color,background-color] duration-5 ease-mech',
              isActive
                ? 'border-cold/60 bg-panel-2 text-fg'
                : 'border-line/70 bg-panel/90 text-fg-dim',
            )}
            style={{
              transform: `translateY(calc(-50% + ${delta * 40}px)) translateZ(${-Math.abs(delta) * 54}px) rotateX(4deg)`,
              opacity: Math.abs(delta) > 2 ? 0 : isActive ? 1 : 0.55,
              zIndex: 30 - Math.abs(delta),
            }}
          >
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  't-num text-[10px]',
                  isActive ? 'text-cold' : 'text-fg-faint',
                )}
              >
                {step.index}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em]">
                {step.title}
              </span>
            </span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint sm:block">
              {step.meta}
            </span>
          </div>
        )
      })}
    </div>
  )
}
