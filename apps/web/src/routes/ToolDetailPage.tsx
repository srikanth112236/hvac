import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { useSeo } from '@/lib/seo'
import { toolBySlug, tools } from '@/content/tools'
import { EnquiryForm } from '@/routes/contact/EnquiryForm'
import { NotFound } from '@/routes/NotFound'
import { ServiceCalculator } from '@/routes/services/ServiceCalculator'

export function ToolDetailPage() {
  const { slug } = useParams()
  const tool = toolBySlug(slug)
  const [prefill, setPrefill] = useState('')

  useSeo({
    path: tool ? `/tools/${tool.slug}` : `/tools/${slug ?? ''}`,
    title: tool ? `${tool.label} calculator` : 'Calculator not found',
    description: tool?.description,
    noindex: !tool,
    breadcrumbs: tool
      ? [
          { name: 'Tools', path: '/tools' },
          { name: tool.label, path: `/tools/${tool.slug}` },
        ]
      : undefined,
  })

  if (!tool) return <NotFound />

  const sendToDesk = (message: string) => {
    setPrefill(message)
    document.getElementById('tool-enquire')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="border-b border-line">
      <div className="shell pb-16 pt-10 lg:pt-14">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
          <Link to="/tools" className="text-cold hover:text-fg">
            Tools
          </Link>
          <span aria-hidden>/</span>
          <span>{tool.label}</span>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="annot">Standalone calculator · {tool.label}</span>
            <h1 className="t-display mt-5 max-w-[13ch] text-fg">{tool.service}</h1>
            <p className="mt-5 max-w-prose text-sm leading-relaxed text-fg-dim">
              {tool.description}
            </p>
            <p className="mt-4 max-w-prose text-[11px] leading-relaxed text-fg-faint">
              Indicative only. The works desk checks the assumptions against a measured survey
              before issuing a fixed quotation.
            </p>
            <div className="mt-7">
              <ServiceCalculator
                key={tool.slug}
                kind={tool.kind}
                serviceName={tool.service}
                onSend={sendToDesk}
              />
            </div>
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <div className="flex flex-col gap-4 border border-line bg-panel/30 p-5">
              <span className="t-label">Other calculators</span>
              <ul className="flex flex-col divide-y divide-line/70">
                {tools
                  .filter((entry) => entry.slug !== tool.slug)
                  .map((entry) => (
                    <li key={entry.slug}>
                      <Link
                        to={`/tools/${entry.slug}`}
                        className="flex items-center justify-between gap-3 py-3 text-[12px] text-fg-dim transition-colors duration-2 hover:text-cold"
                      >
                        {entry.label}
                        <Icon name="arrow-up-right" size={12} />
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="mt-4 border border-line p-5">
              <span className="t-label">Need a measured answer?</span>
              <p className="mt-3 text-[11px] leading-relaxed text-fg-dim">
                Send the figures with your brief, or book a survey. The calculator is the start of
                the conversation, not the quotation.
              </p>
              <Link
                to="/book"
                className="mt-4 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:text-fg"
              >
                Book a survey
                <Icon name="arrow-right" size={11} />
              </Link>
            </div>
          </div>
        </div>

        <div
          id="tool-enquire"
          className="mt-12 scroll-mt-[calc(var(--header-h)+24px)] border-t border-line pt-12"
        >
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <EnquiryForm
                key={tool.slug}
                prefillMessage={prefill}
                context={`${tool.label} calculator · standalone`}
                source="calculator"
              />
            </div>
            <aside className="md:col-span-4 md:col-start-9">
              <span className="annot">What happens next</span>
              <ol className="mt-4 flex flex-col">
                {[
                  ['01', 'Lead logged', `Routed to the works desk with the ${tool.label} figures.`],
                  ['02', 'Engineer check', 'Assumptions reviewed within one working hour.'],
                  ['03', 'Survey', 'Measured load, access and equipment selection.'],
                  ['04', 'Fixed quote', 'Itemised, with exclusions and tax shown.'],
                ].map(([index, title, body]) => (
                  <li
                    key={index}
                    className="flex gap-3 border-t border-line/70 py-3 first:border-t-0 first:pt-0"
                  >
                    <span className="t-num text-[9px] text-cold">{index}</span>
                    <span>
                      <span className="block text-[12px] text-fg">{title}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-fg-faint">
                        {body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </div>
      </div>
    </section>
  )
}
