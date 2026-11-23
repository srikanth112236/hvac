import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge, Marquee, SectionHeader } from '@/components/ui'
import { HorizontalRail, PlaceholderPlate, RailCard } from '@/motion'
import { useSiteContent } from '@/content/SiteContentProvider'

/**
 * Selected work on the horizontal rail, followed by the equipment marquee.
 * Project plates use the drawn placeholder so no stock photography is passed
 * off as a real installation; CMS media replaces them in Phase 6.
 */
export function Work() {
  const { content } = useSiteContent()
  const { home } = content
  const projects = content.workCases

  return (
    <section id="work" className="scroll-mt-[var(--header-h)] border-b border-line">
      <div className="shell pb-2 pt-[var(--section-y)]">
        <SectionHeader
          index="06"
          label="Selected work"
          title={home.workTitle}
          description={home.workDescription}
          action={<Badge tone="cold" dot>2021 – 2025</Badge>}
        />
      </div>

      <HorizontalRail label="Case files">
        {projects.map((project) => (
          <RailCard key={project.id}>
            <div>
              <div className="mb-4 h-[112px] border border-line">
                <PlaceholderPlate label={project.plate} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="t-label">{project.category}</span>
                <span className="t-num text-[9px] text-fg-faint">{project.year}</span>
              </div>
              <h3 className="t-h4 mt-2 text-fg">{project.name}</h3>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                {project.location}
              </p>
            </div>

            <div className="border-t border-line pt-3">
              <p className="t-num text-[11px] text-fg">{project.spec}</p>
              <p className="mt-2 text-[11px] leading-snug text-fg-faint">{project.detail}</p>
            </div>
          </RailCard>
        ))}
      </HorizontalRail>

      <div className="shell flex flex-wrap items-center justify-between gap-4 pb-10">
        <p className="max-w-[54ch] text-[12px] leading-relaxed text-fg-dim">
          Project plates are drawn schematics, not site photography. The full files carry the
          constraint, the change and the measured result.
        </p>
        <Link
          to="/work"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
        >
          All case files
          <Icon name="arrow-right" size={13} />
        </Link>
      </div>

      <div className="border-t border-line bg-panel/20">
        <div className="shell flex flex-wrap items-baseline justify-between gap-2 py-3">
          <span className="t-label">Equipment we commission</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
            Sample partner list · not an endorsement
          </span>
        </div>
        <div className="border-t border-line py-8">
          <Marquee duration={46} itemClassName="gap-14 pr-14">
            {content.equipmentBrands.map((brand) => (
              <span key={brand} className="flex items-center gap-14">
                <span className="font-display text-h3 text-fg-dim/80">{brand}</span>
                <span aria-hidden className="h-1 w-1 bg-cold/60" />
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  )
}
