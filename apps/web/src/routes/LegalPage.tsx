import { Link, useParams } from 'react-router-dom'
import { ButtonLink } from '@/components/ui'
import { ScrollReveal, SplitReveal } from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'
import { useSeo } from '@/lib/seo'

function readableDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

export function LegalPage() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const params = useParams()
  const slug = params.slug ?? ''
  const document = content.legal.find((entry) => entry.slug === slug && entry.published)
  const sections = content.pageSections.legal
  useSeo({
    path: document ? `/legal/${document.slug}` : '/legal',
    title: document?.title,
    description: document?.summary,
  })

  if (!document) {
    return (
      <section className="section shell">
        <span className="annot">Legal</span>
        <h1 className="t-display mt-6 max-w-[16ch] text-fg">This policy is not published.</h1>
        <p className="t-lead mt-5 max-w-[54ch]">
          The page may have been renamed or withdrawn. Start from the legal index or contact the
          works and we will send the current document.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/contact" size="lg" icon="arrow-right">
            Contact the works
          </ButtonLink>
          <ButtonLink to="/" variant="secondary" size="lg">
            Return home
          </ButtonLink>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="border-b border-line">
        <div className="shell grid gap-10 pb-12 pt-10 md:grid-cols-12 lg:pt-16">
          <div className="md:col-span-8">
            <span className="annot">Legal · CV-LEG</span>
            <SplitReveal
              key={document.title}
              as="h1"
              className="t-display mt-7 max-w-[15ch] text-fg"
              stagger={0.04}
            >
              {document.title}
            </SplitReveal>
            <p className="t-lead mt-6 max-w-[60ch]">{document.summary}</p>
            <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              Last updated · {readableDate(document.updatedAt)}
            </p>
          </div>

          <aside className="md:col-span-3 md:col-start-10">
            <div className="border border-line bg-panel/40 p-5">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                On this page
              </span>
              <ol className="mt-3 flex flex-col">
                {document.sections.map((section, index) => (
                  <li key={section.heading} className="border-t border-line/60 first:border-t-0">
                    <a
                      href={`#section-${index + 1}`}
                      className="flex gap-3 py-2 text-[11px] leading-snug text-fg-dim hover:text-cold"
                    >
                      <span className="t-num text-[9px] text-cold">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </section>

      <section className="section border-b border-line">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-3">
            <div className="sticky top-[calc(var(--header-h)+24px)] border border-line bg-panel/40 p-5">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                {sections.questions.title}
              </span>
              <p className="mt-2 text-[12px] leading-relaxed text-fg-dim">
                {sections.questions.body}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-fg-dim">
                Write to{' '}
                <a href={`mailto:${brand.contact.email}`} className="text-cold hover:text-fg">
                  {brand.contact.email}
                </a>{' '}
                or call {brand.contact.phoneDisplay}.
              </p>
              <Link
                to="/contact"
                className="mt-4 inline-flex font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:text-fg"
              >
                Contact the works →
              </Link>
              <p className="mt-4 border-t border-line/60 pt-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.08em] text-fg-faint">
                {sections.note}
              </p>
            </div>
          </div>

          <div className="md:col-span-8 md:col-start-5">
            {document.sections.map((section, index) => (
              <ScrollReveal
                key={section.heading}
                as="article"
                id={`section-${index + 1}`}
                className="scroll-mt-[calc(var(--header-h)+24px)] border-t border-line py-7 first:border-t-0 first:pt-0"
              >
                <div className="flex items-baseline gap-4">
                  <span className="t-num text-[10px] text-cold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h2 className="t-h3 text-fg">{section.heading}</h2>
                </div>
                <div className="mt-4 flex flex-col gap-4 pl-8">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="max-w-[68ch] text-[14px] leading-relaxed text-fg-dim">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </ScrollReveal>
            ))}

            <div className="mt-8 border border-line bg-panel/30 p-5 font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-fg-faint">
              {brand.legalName} · {brand.address.line1}, {brand.address.line2},{' '}
              {brand.address.locality} {brand.address.postalCode} · EIN {brand.gstin}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}