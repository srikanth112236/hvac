import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import {
  Accordion,
  Badge,
  ButtonAnchor,
  ButtonLink,
  SectionHeader,
} from '@/components/ui'
import {
  MagneticButton,
  ScrollReveal,
  SplitReveal,
} from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent, useSitePlans } from '@/content/SiteContentProvider'
import { useSeo } from '@/lib/seo'
import { EnquiryForm } from '@/routes/contact/EnquiryForm'
import { cn } from '@/lib/cn'
import { PageBackdrop } from '@/components/site/PageBackdrop'

export function AmcPage() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const plans = useSitePlans()
  const copy = content.pages.amc
  const sections = content.pageSections.amc
  const planTerms = content.amcDetails.terms
  const visitSchedule = content.amcDetails.schedule
  const amcSla = content.amcDetails.sla.map(
    (entry) => [entry.metric, entry.standard, entry.note] as [string, string, string],
  )
  const amcIncludes = content.amcDetails.includes
  const amcExcludes = content.amcDetails.excludes
  const amcFaqs = content.amcDetails.faqs
  useSeo({ path: '/amc' })
  const [selectedPlan, setSelectedPlan] = useState<string>('')

  const prefillMessage = selectedPlan
    ? `AMC enquiry for the ${selectedPlan} plan.\n\nInstalled equipment: \nSites / cities: \nCurrent maintenance arrangement: `
    : ''

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <PageBackdrop src={copy.image} alt={copy.imageAlt} />
        <div className="shell grid gap-10 pb-14 pt-10 md:grid-cols-12 lg:pt-16">
          <div className="md:col-span-7">
            <span className="annot">Maintenance · CV-AMC</span>

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
                <ButtonAnchor href="#plans" size="lg" icon="arrow-right">
                  Compare plans
                </ButtonAnchor>
              </MagneticButton>
              <ButtonAnchor href={`tel:${brand.contact.emergencyPhone}`} variant="secondary" size="lg" icon="bolt">
                Dispatch · {brand.contact.emergencyPhone}
              </ButtonAnchor>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-5">
              {[
                ['Visits', '2 – 26 / year'],
                ['Response', `${brand.stats.emergencyResponseHours} h`],
                ['Term', '12 months'],
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
            <div className="marks border border-heat/30 bg-heat/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="t-label !text-heat">Response clock</span>
                <Icon name="clock" size={16} className="text-heat" />
              </div>
              <p className="mt-4 max-w-[30ch] text-[12px] leading-relaxed text-fg-dim">
                The clock starts at the logged call, not at the first available appointment.
              </p>
              <ol className="mt-4 border-t border-heat/20">
                {[
                  ['Call answered', '3 rings'],
                  ['Remote diagnosis', '30 min'],
                  ['Engineer on site', '4 h'],
                  ['Visit report', '24 h'],
                ].map(([label, value], index) => (
                  <li
                    key={label}
                    className="flex items-baseline justify-between gap-3 border-b border-heat/15 py-2.5"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="t-num text-[9px] text-heat/70">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[12px] text-fg-dim">{label}</span>
                    </span>
                    <span className="t-num text-[11px] text-fg">{value}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.12em] text-fg-faint">
                Inside Dallas · Fort Worth · Plano city limits
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="plans" className="scroll-mt-[var(--header-h)] border-b border-line">
        <div className="shell pb-2 pt-[var(--section-y)]">
          <SectionHeader
            index="01"
            label="Plans"
            title={sections.plans.title}
            description={sections.plans.body}
            action={<Badge tone="heat" dot>24 × 7 dispatch</Badge>}
          />
        </div>

        <div className="shell pb-14">
          <div className="mt-10 grid items-start gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const terms = planTerms.find((entry) => entry.id === plan.id)
              const selected = selectedPlan === plan.name
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative flex h-full flex-col gap-5 border p-6',
                    plan.featured ? 'border-cold/40 bg-panel-2 md:-translate-y-4' : 'border-line bg-panel/60',
                    selected && 'ring-1 ring-cold/50',
                  )}
                >
                  {plan.featured ? <span aria-hidden className="thread absolute inset-x-0 top-0" /> : null}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="t-h4 text-fg">{plan.name}</h3>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                        {plan.visits}
                      </p>
                    </div>
                    {plan.featured ? <Badge tone="cold">Most specified</Badge> : null}
                  </div>

                  <div>
                    <p className="t-num text-h2 text-fg">{plan.price}</p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                      {plan.priceNote} · plus sales tax
                    </p>
                  </div>

                  <p className="text-[12px] leading-relaxed text-fg-dim">{plan.summary}</p>

                  <dl className="flex flex-col border-t border-line">
                    {[
                      ['Response', terms?.response ?? '—'],
                      ['Parts', terms?.parts ?? '—'],
                      ['Reporting', terms?.reporting ?? '—'],
                      ['Best for', terms?.bestFor ?? '—'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2"
                      >
                        <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                          {label}
                        </dt>
                        <dd className="max-w-[60%] text-right font-mono text-[10px] leading-snug text-fg-dim">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <ul className="flex flex-col border-t border-line">
                    {plan.includes.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 border-b border-line/60 py-2.5 text-[12px] leading-snug text-fg-dim"
                      >
                        <Icon name="check" size={13} className="mt-0.5 shrink-0 text-cold" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p className="text-[11px] leading-relaxed text-fg-faint">
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
                      Excluded ·
                    </span>{' '}
                    {plan.excluded}
                  </p>

                  <div className="mt-auto">
                    <ButtonAnchor
                      href="#enquire"
                      variant={plan.featured ? 'primary' : 'secondary'}
                      size="sm"
                      full
                      icon="arrow-right"
                      onClick={() => setSelectedPlan(plan.name)}
                    >
                      {selected ? `${plan.name} selected` : `Select ${plan.name}`}
                    </ButtonAnchor>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <p className="max-w-[62ch] font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
              Cash, cheque, bank transfer or card on site · no auto-renewal without written approval
            </p>
            <Link
              to="/services/amc"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
            >
              Full AMC scope
              <Icon name="arrow-right" size={13} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section border-b border-line bg-panel/20">
        <div className="shell">
          <SectionHeader
            index="02"
            label="Visit schedule"
            title={sections.schedule.title}
            description={sections.schedule.body}
            action={<Badge tone="neutral">12-month term</Badge>}
          />

          <div className="mt-8 overflow-x-auto border border-line bg-base/40">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <caption className="sr-only">AMC visit schedule by plan</caption>
              <thead>
                <tr className="border-b border-line">
                  {['Period', 'Essential', 'Comprehensive', 'Precision'].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-fg-faint"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visitSchedule.map((row) => (
                  <tr key={row.period} className="border-b border-line/60 last:border-b-0">
                    <th
                      scope="row"
                      className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-dim"
                    >
                      {row.period}
                    </th>
                    <td className="px-4 py-3 text-[12px] text-fg-dim">{row.essential}</td>
                    <td className="px-4 py-3 text-[12px] text-fg-dim">{row.comprehensive}</td>
                    <td className="px-4 py-3 text-[12px] text-fg-dim">{row.precision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <span className="t-label">In every plan</span>
              <ul className="mt-3 flex flex-col">
                {amcIncludes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 border-t border-line py-2.5 text-[12px] leading-snug text-fg-dim"
                  >
                    <Icon name="check" size={13} className="mt-0.5 shrink-0 text-cold" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="t-label">Excluded · quoted separately</span>
              <ul className="mt-3 flex flex-col">
                {amcExcludes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 border-t border-line py-2.5 text-[12px] leading-snug text-fg-faint"
                  >
                    <Icon name="minus" size={13} className="mt-0.5 shrink-0 text-fg-faint" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section border-b border-line">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <span className="annot">03 · Service levels</span>
            <h2 className="t-h2 mt-5 max-w-[12ch] text-fg">{sections.serviceLevels.title}</h2>
            <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-fg-dim">
              {sections.serviceLevels.body}
            </p>
            <div className="mt-6 border border-line bg-panel/50 p-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Dispatch
              </span>
              <a
                href={`tel:${brand.contact.emergencyPhone}`}
                className="t-num mt-1 block text-[13px] text-heat transition-colors duration-2 hover:text-fg"
              >
                {brand.contact.emergencyPhone}
              </a>
            </div>
          </div>

          <div className="md:col-span-8">
            <dl className="border-t border-line">
              {amcSla.map(([metric, standard, note]) => (
                <ScrollReveal
                  key={metric}
                  className="grid gap-1 border-b border-line py-4 sm:grid-cols-12 sm:items-baseline sm:gap-3"
                >
                  <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint sm:col-span-3">
                    {metric}
                  </dt>
                  <dd className="t-num text-[12px] text-fg sm:col-span-4">{standard}</dd>
                  <dd className="text-[11px] leading-snug text-fg-faint sm:col-span-5">{note}</dd>
                </ScrollReveal>
              ))}
            </dl>
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
              <ButtonLink to="/contact?service=amc" variant="secondary" size="sm" icon="arrow-right">
                Ask about cover
              </ButtonLink>
            </div>
          </div>
          <div className="md:col-span-8 md:col-start-5">
            <Accordion
              allowMultiple
              defaultOpen="amc-0"
              items={amcFaqs.map((faq, index) => ({
                id: `amc-${index}`,
                title: faq.question,
                content: faq.answer,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="section-lg border-b border-line">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <EnquiryForm
              lockedServiceId="amc"
              source="amc-page"
              plan={selectedPlan || undefined}
              prefillMessage={prefillMessage}
              context={selectedPlan ? `AMC plan · ${selectedPlan}` : 'AMC page'}
            />
          </div>

          <aside className="md:col-span-4 md:col-start-9">
            <div className="flex flex-col gap-6 md:sticky md:top-[calc(var(--header-h)+24px)]">
              <div className="marks border border-line bg-panel/60 p-6">
                <span className="t-label">Renewal window</span>
                <ol className="mt-4 flex flex-col">
                  {[
                    ['60 days', 'Condition report and renewal quote issued.'],
                    ['30 days', 'Price held; scope changes agreed in writing.'],
                    ['7 days', 'Final reminder; cover lapses without written renewal.'],
                  ].map(([when, what]) => (
                    <li key={when} className="border-t border-line/70 py-3 first:border-t-0 first:pt-0">
                      <span className="t-num text-[10px] text-cold">{when}</span>
                      <p className="mt-1 text-[11px] leading-snug text-fg-dim">{what}</p>
                    </li>
                  ))}
                </ol>
                <div className="thread mt-4" />
                <p className="mt-4 text-[11px] leading-relaxed text-fg-faint">
                  No auto-renewal. The contract runs on a written renewal, not a card on file.
                </p>
              </div>

              <div className="border border-line p-6">
                <span className="t-label">Already covered?</span>
                <p className="mt-3 text-[12px] leading-relaxed text-fg-dim">
                  For a breakdown on a contracted site, call dispatch first. The form is the slower
                  path and should not be used for a plant that is down.
                </p>
                <a
                  href={`tel:${brand.contact.emergencyPhone}`}
                  className="mt-4 flex items-center gap-2 font-mono text-[12px] text-heat transition-colors duration-2 hover:text-fg"
                >
                  <Icon name="bolt" size={14} />
                  {brand.contact.emergencyPhone}
                </a>
              </div>

              <Link
                to="/services/amc"
                className="flex items-center justify-between gap-3 border border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:border-cold/60 hover:text-cold"
              >
                AMC service file
                <Icon name="arrow-right" size={12} />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-line bg-panel/30">
        <div className="shell flex flex-col gap-8 py-10 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="annot">Next</span>
            <h2 className="t-h3 mt-4 max-w-[20ch] text-fg">{sections.next.title}</h2>
            <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-fg-dim">
              {sections.next.body}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink to="/contact?service=amc" size="lg" icon="arrow-up-right">
              Request an AMC survey
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
          <Link to="/services/chiller-maintenance" className="text-cold transition-colors duration-2 hover:text-fg">
            chiller &amp; tower service
          </Link>{' '}
          ·{' '}
          <Link to="/services/ac-servicing" className="text-cold transition-colors duration-2 hover:text-fg">
            deep cleaning
          </Link>{' '}
          ·{' '}
          <Link to="/process" className="text-cold transition-colors duration-2 hover:text-fg">
            the process
          </Link>
        </p>
      </div>
    </>
  )
}
