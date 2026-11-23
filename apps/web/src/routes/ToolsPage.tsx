import { Link } from 'react-router-dom'
import { useSeo } from '@/lib/seo'
import { tools } from '@/content/tools'
import { Icon } from '@/components/icons'

export function ToolsPage() {
  useSeo({
    path: '/tools',
    title: 'HVAC calculators',
    description:
      'Standalone HVAC sizing tools: room tonnage, VRF zones, duct sizing, cold room load, chiller capacity and AMC plan comparison. Each tool has its own page and enquiry hand-off.',
    itemList: tools.map((tool) => ({
      name: tool.label,
      path: `/tools/${tool.slug}`,
      description: tool.note,
    })),
  })

  return (
    <section className="border-b border-line">
      <div className="shell pb-16 pt-12 lg:pt-16">
        <span className="annot">Tools · CV-TOOLS</span>
        <h1 className="t-display mt-6 max-w-[15ch] text-fg">A first number, not a quote.</h1>
        <p className="mt-6 max-w-prose text-sm leading-relaxed text-fg-dim">
          Six standalone calculators. Each one states its inputs, gives an indicative result and
          hands the assumptions to the works desk. A measured survey and a room-by-room load
          calculation still decide the equipment.
        </p>

        <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool, index) => (
            <Link
              key={tool.slug}
              to={`/tools/${tool.slug}`}
              className="group flex min-h-56 flex-col bg-base p-6 transition-colors duration-2 hover:bg-panel/60"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-cold">
                  {String(index + 1).padStart(2, '0')} · {tool.label}
                </span>
                <Icon
                  name="arrow-up-right"
                  size={15}
                  className="text-fg-faint transition-colors duration-2 group-hover:text-cold"
                />
              </div>
              <h2 className="t-h3 mt-8 max-w-[14ch] text-fg">{tool.service}</h2>
              <p className="mt-3 text-[12px] leading-relaxed text-fg-dim">{tool.note}</p>
              <span className="mt-auto flex items-center gap-2 border-t border-line pt-4 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint group-hover:text-cold">
                Open calculator
                <Icon name="arrow-right" size={11} />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-line bg-panel/30 p-4">
          <p className="max-w-prose text-[11px] leading-relaxed text-fg-dim">
            The calculators are indicative. They do not replace a measured load, a site survey or a
            fixed quotation. Every result can be attached to an enquiry.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:text-fg"
          >
            Ask an engineer
            <Icon name="arrow-right" size={11} />
          </Link>
        </div>
      </div>
    </section>
  )
}
