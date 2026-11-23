import { Link } from 'react-router-dom'
import { Icon, type IconName } from '@/components/icons'
import { Badge, SectionHeader } from '@/components/ui'
import { homeServices } from '@/content/home'
import { categoryLabels } from '@/content/services'
import { useSiteContent, useSiteServices } from '@/content/SiteContentProvider'

/**
 * Services index as a stacking card deck. Each card sticks a little lower than
 * the one before, so scrolling reorders the stack without pinning the viewport
 * or hijacking the scroll. Reduced motion collapses to the same static stack.
 */
export function ServiceStack() {
  const { content } = useSiteContent()
  const liveServices = useSiteServices()
  const { home } = content

  // Featured order is editorial; names, scope and specification come from the feed.
  const cards = homeServices.flatMap((base) => {
    const live = liveServices.find((entry) => entry.id === base.id)
    if (!live) return []
    const specs = live.specification
      .split('·')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 2)
    return [
      {
        id: base.id,
        index: live.index || base.index,
        name: live.name,
        icon: (live.icon ?? ('airflow' as IconName)) as IconName,
        category: categoryLabels[live.category],
        capacity: live.capacity,
        summary: live.scope || base.summary,
        specs: specs.length ? specs : base.specs,
      },
    ]
  })

  return (
    <section id="services" className="section-lg scroll-mt-[var(--header-h)] border-b border-line">
      <div className="shell">
        <SectionHeader
          index="02"
          label="Service index"
          title={home.servicesTitle}
          description={home.servicesDescription}
          action={<Badge tone="cold" dot>Residential → industrial</Badge>}
        />

        <div className="mt-14 flex flex-col gap-4 md:gap-0">
          {cards.map((service, index) => (
            <article
              key={service.id}
              id={service.id}
              className="scroll-mt-[calc(var(--header-h)+32px)] md:sticky"
              style={{ top: `calc(var(--header-h) + ${index * 14}px)` }}
            >
              <div className="marks grid gap-6 border border-line bg-panel p-6 md:grid-cols-12 md:items-start md:p-8">
                <div className="flex items-center justify-between gap-4 md:col-span-2 md:flex-col md:items-start md:gap-5">
                  <span className="t-num text-[11px] text-cold">{service.index}</span>
                  <Icon name={service.icon} size={34} className="text-fg-dim" />
                  <span className="t-label hidden md:block">{service.category}</span>
                </div>

                <div className="md:col-span-6">
                  <h3 className="t-h3 text-fg">{service.name}</h3>
                  <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-dim">
                    {service.summary}
                  </p>
                  <span className="t-label mt-4 block md:hidden">{service.category}</span>
                </div>

                <div className="flex flex-col gap-4 md:col-span-3 md:col-start-10">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                      Capacity
                    </span>
                    <p className="t-num mt-1 text-h4 text-fg">{service.capacity}</p>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {service.specs.map((spec) => (
                      <li key={spec}>
                        <Badge>{spec}</Badge>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <Link
                      to={`/services/${service.id}`}
                      className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
                    >
                      Service file
                      <Icon name="arrow-right" size={13} />
                    </Link>
                    <a
                      href="#callback"
                      className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:text-cold"
                    >
                      Talk to an engineer
                      <Icon name="arrow-up-right" size={13} />
                    </a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="max-w-[46ch] text-[13px] leading-relaxed text-fg-dim">
            Not seeing the system you need? Send the load calculation or the plant schedule and we
            will tell you what fits — including the parts we would not sell you.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
            >
              All {liveServices.length} services
              <Icon name="arrow-right" size={13} />
            </Link>
            <a
              href="#callback"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg transition-colors duration-2 hover:text-cold"
            >
              Send the brief
              <Icon name="arrow-right" size={13} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
