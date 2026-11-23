import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge, SectionHeader } from '@/components/ui'
import { HorizontalRail, RailCard } from '@/motion'
import { processStages as processStageIcons } from '@/content/home'
import { useSiteContent } from '@/content/SiteContentProvider'

/**
 * Process: six stages on the existing pinned horizontal rail. The rail is
 * scroll-scrubbed on desktop and native horizontal scroll on touch.
 */
export function Process() {
  const { content } = useSiteContent()
  const { home } = content
  const processStages = content.processStages.map((stage) => ({
    ...stage,
    icon: processStageIcons.find((entry) => entry.index === stage.index)?.icon ?? 'airflow',
  }))

  return (
    <section id="process" className="scroll-mt-[var(--header-h)] border-b border-line">
      <div className="shell pb-2 pt-[var(--section-y)]">
        <SectionHeader
          index="05"
          label="Process"
          title={home.processTitle}
          description={home.processDescription}
          action={<Badge tone="neutral">Fixed scope · fixed dates</Badge>}
        />
      </div>

      <HorizontalRail label="Process · six stages">
        {processStages.map((stage) => (
          <RailCard key={stage.index}>
            <div className="flex items-center justify-between gap-4">
              <span className="t-num text-[11px] text-cold">{stage.index}</span>
              <Icon name={stage.icon} size={22} className="text-fg-dim" />
            </div>

            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                {stage.duration}
              </span>
              <h3 className="t-h3 mt-2 text-fg">{stage.name}</h3>
              <p className="mt-3 max-w-[34ch] text-[12px] leading-relaxed text-fg-dim">
                {stage.body}
              </p>
            </div>

            <div className="border-t border-line pt-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Deliverable
              </span>
              <p className="mt-1 font-mono text-[10px] uppercase leading-relaxed tracking-[0.06em] text-fg-dim">
                {stage.deliverable}
              </p>
            </div>
          </RailCard>
        ))}
      </HorizontalRail>

      <div className="shell pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <p className="max-w-[52ch] text-[12px] leading-relaxed text-fg-dim">
            Every stage ends with a deliverable you can hold — a signed survey, a reviewed design,
            a measured balance, a filed report.
          </p>
          <Link
            to="/process"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
          >
            Stage gates &amp; file
            <Icon name="arrow-right" size={13} />
          </Link>
        </div>
      </div>
    </section>
  )
}
