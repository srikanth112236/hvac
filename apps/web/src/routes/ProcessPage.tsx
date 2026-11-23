import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Accordion, Badge, ButtonAnchor, ButtonLink, SectionHeader } from '@/components/ui'
import {
  MagneticButton,
  ParallaxDrift,
  ScrollReveal,
  SplitReveal,
} from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'
import { useSeo } from '@/lib/seo'
import { PageBackdrop } from '@/components/site/PageBackdrop'

export function ProcessPage() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const copy = content.pages.process
  const sections = content.pageSections.process
  const processDetails = content.processStages
  const clientInputs = content.processExtras.inputs
  const commissioningFile = content.processExtras.file
  const processFaqs = content.processExtras.faqs
  useSeo({ path: '/process' })

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <PageBackdrop src={copy.image} alt={copy.imageAlt} />
        <div className="shell grid gap-10 pb-14 pt-10 md:grid-cols-12 lg:pt-16">
          <div className="md:col-span-7">
            <span className="annot">Process · CV-02</span>

            <SplitReveal
              key={copy.headline}
              as="h1"
              className="t-display mt-7 max-w-[12ch] text-fg"
              stagger={0.045}
            >
              {copy.headline}
            </SplitReveal>

            <p className="t-lead mt-7 max-w-[58ch]">{copy.lead}</p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <MagneticButton>
                <ButtonLink to="/contact" size="lg" icon="arrow-up-right">
                  Start with a survey
                </ButtonLink>
              </MagneticButton>
              <ButtonAnchor href="#stages" variant="secondary" size="lg">
                Read the six stages
              </ButtonAnchor>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-5">
              {[
                ['Programme', '4 – 10 weeks'],
                ['Stages', '6 gates'],
                ['Handover file', '5 working days'],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                    {label}
                  </dt>
                  <dd className="t-num text-[12px] text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <div className="marks border border-line bg-panel/60">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                <span className="t-label">Programme</span>
                <span className="t-num text-[9px] text-fg-faint">CV/PRG-01</span>
              </div>
              <ol className="px-5 py-3">
                {processDetails.map((stage) => (
                  <li key={stage.index} className="border-b border-line/60 last:border-b-0">
                    <a
                      href={`#stage-${stage.index}`}
                      className="group flex items-center justify-between gap-3 py-2.5"
                    >
                      <span className="flex items-center gap-3">
                        <span className="t-num text-[9px] text-cold">{stage.index}</span>
                        <span className="text-[12px] text-fg-dim transition-colors duration-2 group-hover:text-cold">
                          {stage.name}
                        </span>
                      </span>
                      <span className="t-num text-[10px] text-fg-faint">{stage.duration}</span>
                    </a>
                  </li>
                ))}
              </ol>
              <div className="thread" />
            </div>
            <p className="mt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
              Durations exclude equipment lead time and statutory approvals
            </p>
          </div>
        </div>
      </section>

      <section id="stages" className="scroll-mt-[var(--header-h)] border-b border-line">
        <div className="shell pb-2 pt-[var(--section-y)]">
          <SectionHeader
            index="01"
            label="Stages"
            title={sections.stages.title}
            description={sections.stages.body}
            action={<Badge tone="cold" dot>Fixed scope · fixed dates</Badge>}
          />
        </div>

        <div className="shell pb-16">
          {processDetails.map((stage, index) => (
            <ScrollReveal
              key={stage.index}
              as="article"
              id={`stage-${stage.index}`}
              className="grid scroll-mt-[calc(var(--header-h)+24px)] gap-5 border-t border-line py-8 last:border-b md:grid-cols-12 md:gap-6"
            >
              <div className="md:col-span-2">
                <div className="flex items-baseline gap-4 md:sticky md:top-[calc(var(--header-h)+32px)] md:flex-col md:items-start md:gap-2">
                  <span className="t-num text-h3 text-cold">{stage.index}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    {stage.duration}
                  </span>
                </div>
              </div>

              <div className="md:col-span-6">
                <h3 className="t-h2 max-w-[14ch] text-fg">{stage.name}</h3>
                <p className="mt-4 max-w-[56ch] text-sm leading-relaxed text-fg-dim">{stage.body}</p>

                <div className="mt-5 grid gap-4 border-t border-line/70 pt-4 sm:grid-cols-2">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                      Deliverable
                    </span>
                    <p className="mt-1 text-[12px] leading-snug text-fg">{stage.deliverable}</p>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                      Client input
                    </span>
                    <p className="mt-1 text-[12px] leading-snug text-fg-dim">{stage.client}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 md:col-start-10">
                <div className="border border-line bg-panel/50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-cold">
                      Gate
                    </span>
                    <Icon name="shield" size={13} className="text-cold" />
                  </div>
                  <p className="mt-2 text-[12px] leading-snug text-fg">{stage.gate}</p>
                  <div className="thread mt-3" />
                  <span className="mt-3 block font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                    Evidence
                  </span>
                  <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">{stage.evidence}</p>
                </div>
                {index === processDetails.length - 1 ? (
                  <p className="mt-3 flex items-start gap-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
                    <Icon name="check" size={11} className="mt-0.5 shrink-0 text-success" />
                    Renewal reviewed at 60 / 30 / 7 days
                  </p>
                ) : null}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="section border-b border-line bg-ink-block text-on-ink">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <span className="annot !text-on-ink/70">02 · Handover</span>
            <h2 className="t-h2 mt-5 max-w-[12ch]">{sections.handover.title}</h2>
            <p className="mt-5 max-w-[38ch] text-sm leading-relaxed text-on-ink/70">
              {sections.handover.body}
            </p>

            <ParallaxDrift
              className="mt-8 hidden h-[220px] border border-on-ink/15 md:block"
              strength={8}
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgb(var(--on-ink)/0.12) 0 1px, transparent 1px 30px), repeating-linear-gradient(90deg, rgb(var(--on-ink)/0.12) 0 1px, transparent 1px 30px)',
                }}
              />
              <Icon
                name="download"
                size={170}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-heat/50"
              />
              <span className="absolute bottom-3 left-3 font-mono text-[8px] uppercase tracking-[0.16em] text-on-ink/40">
                Commissioning file · CV-HO
              </span>
            </ParallaxDrift>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <ol className="border-t border-on-ink/15">
              {commissioningFile.map((item, index) => (
                <ScrollReveal
                  as="li"
                  key={item}
                  delay={index * 0.02}
                  className="flex items-start gap-4 border-b border-on-ink/10 py-3"
                >
                  <span className="t-num text-[9px] text-heat">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[12px] leading-relaxed text-on-ink/80">{item}</span>
                </ScrollReveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section border-b border-line">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <span className="annot">03 · Before we start</span>
            <h2 className="t-h2 mt-5 max-w-[12ch] text-fg">{sections.before.title}</h2>
            <p className="mt-5 max-w-[38ch] text-sm leading-relaxed text-fg-dim">
              {sections.before.body}
            </p>
            <div className="mt-7 border border-line bg-panel/50 p-5">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Typical programme
              </span>
              <p className="t-num mt-1 text-h3 text-fg">4 – 10 weeks</p>
              <p className="mt-2 text-[11px] leading-relaxed text-fg-dim">
                Residential installations sit at the short end; plant rooms with imported equipment
                at the long end.
              </p>
            </div>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <ul className="border-t border-line">
              {clientInputs.map((input) => (
                <ScrollReveal
                  as="li"
                  key={input}
                  className="flex items-start gap-3 border-b border-line py-4"
                >
                  <Icon name="check" size={14} className="mt-0.5 shrink-0 text-cold" />
                  <span className="text-[13px] leading-relaxed text-fg-dim">{input}</span>
                </ScrollReveal>
              ))}
            </ul>
            <p className="mt-5 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
              Missing drawings can be measured on the first visit · no charge for the survey on a
              project we quote
            </p>
          </div>
        </div>
      </section>

      <section className="section border-b border-line bg-panel/20">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <span className="annot">04 · Questions</span>
            <h2 className="t-h2 mt-5 max-w-[12ch] text-fg">{sections.questions.title}</h2>
            <p className="mt-5 max-w-[32ch] text-sm leading-relaxed text-fg-dim">
              {sections.questions.body}
            </p>
            <div className="mt-6">
              <ButtonLink to="/contact" variant="secondary" size="sm" icon="arrow-right">
                Ask a question
              </ButtonLink>
            </div>
          </div>

          <div className="md:col-span-8 md:col-start-5">
            <Accordion
              allowMultiple
              defaultOpen="process-0"
              items={processFaqs.map((faq, index) => ({
                id: `process-${index}`,
                title: faq.question,
                content: faq.answer,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="shell flex flex-col gap-8 py-[var(--section-y)] md:flex-row md:items-end md:justify-between">
          <div>
            <span className="annot">Next</span>
            <h2 className="t-h2 mt-4 max-w-[17ch] text-fg">{sections.next.title}</h2>
            <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-fg-dim">
              {sections.next.body}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink to="/contact" size="lg" icon="arrow-up-right">
              Request a survey
            </ButtonLink>
            <ButtonAnchor href={`tel:${brand.contact.phone}`} variant="secondary" size="lg" icon="phone">
              {brand.contact.phoneDisplay}
            </ButtonAnchor>
          </div>
        </div>
      </section>

      <div className="shell py-8">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
          Also read ·{' '}
          <Link to="/about" className="text-cold transition-colors duration-2 hover:text-fg">
            who signs the handover
          </Link>{' '}
          ·{' '}
          <Link to="/work" className="text-cold transition-colors duration-2 hover:text-fg">
            case files
          </Link>{' '}
          ·{' '}
          <Link to="/services" className="text-cold transition-colors duration-2 hover:text-fg">
            all services
          </Link>
        </p>
      </div>
    </>
  )
}
