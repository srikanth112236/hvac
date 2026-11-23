import { Accordion, SectionHeader } from '@/components/ui'
import { useSiteContent, useSiteFaqs } from '@/content/SiteContentProvider'

/** Answers written as specification, not marketing: numbers, exclusions, limits. */
export function Faq() {
  const { content } = useSiteContent()
  const faqs = useSiteFaqs()
  const { home } = content

  return (
    <section id="faq" className="section-lg scroll-mt-[var(--header-h)] border-b border-line">
      <div className="shell">
        <SectionHeader
          index="08"
          label="Questions"
          title={home.faqTitle}
          description={home.faqDescription}
        />

        <div className="mt-12 grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="md:sticky md:top-[calc(var(--header-h)+32px)] md:flex md:flex-col md:gap-5">
              <p className="max-w-[32ch] text-sm leading-relaxed text-fg-dim">
                Still unanswered? Send the room dimensions, the failure or the plant schedule and we
                will answer with a number.
              </p>
              <a
                href="#callback"
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
              >
                Ask the works
                <span aria-hidden>→</span>
              </a>
              <dl className="mt-2 flex flex-col gap-3 border-t border-line pt-5">
                {[
                  ['Standards', 'ISHRAE · ASHRAE · BIS'],
                  ['Refrigerants', 'R-32 · R-410A · R-134a'],
                  ['Payment', 'Cash · cheque · card on site'],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                      {label}
                    </dt>
                    <dd className="font-mono text-[10px] text-fg-dim">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="md:col-span-8 md:col-start-5">
            <Accordion
              allowMultiple
              defaultOpen={faqs[0]?.id ?? null}
              items={faqs.map((faq) => ({
                id: faq.id,
                title: faq.question,
                content: faq.answer,
              }))}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
