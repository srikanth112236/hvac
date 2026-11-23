import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge, ButtonAnchor, ButtonLink, SectionHeader } from '@/components/ui'
import {
  CounterStat,
  MagneticButton,
  ParallaxDrift,
  ScrollReveal,
  SplitReveal,
} from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'
import { PageBackdrop } from '@/components/site/PageBackdrop'
import { useSeo } from '@/lib/seo'
import { aboutStory } from '@/content/company'

export function About() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const about = content.about
  const sections = content.pageSections.about
  const story = about.story.length ? about.story : aboutStory
  const { milestones, principles, leadership, certifications, safety, qualityGates } =
    content.aboutSections
  const safetyStandards = safety.map((standard) => ({
    ...standard,
    icon: standard.icon as ComponentProps<typeof Icon>['name'],
  }))
  useSeo({ path: '/about' })

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <PageBackdrop src={about.image} alt={about.imageAlt} />
        <div className="shell grid gap-10 pb-14 pt-10 md:grid-cols-12 lg:pt-16">
          <div className="md:col-span-7">
            <span className="annot">About · CV-01</span>

            <SplitReveal
              key={about.headline}
              as="h1"
              className="t-display mt-7 max-w-[13ch] text-fg"
              stagger={0.045}
            >
              {about.headline}
            </SplitReveal>

            <p className="t-lead mt-7 max-w-[58ch]">{about.lead}</p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <MagneticButton>
                <ButtonLink to="/contact" size="lg" icon="arrow-up-right">
                  Talk to the works
                </ButtonLink>
              </MagneticButton>
              <ButtonLink to="/process" variant="secondary" size="lg" icon="arrow-right">
                How a job runs
              </ButtonLink>
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line pt-5 sm:grid-cols-4">
              {[
                ['Founded', String(brand.foundedYear), ''],
                ['Years', brand.stats.yearsOperating, ''],
                ['Systems', brand.stats.systemsInstalled, '+'],
                ['Cities', brand.serviceAreas.length, ''],
              ].map(([label, value, suffix]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                    {label}
                  </dt>
                  <dd className="text-h3 text-fg">
                    <CounterStat value={Number(value)} suffix={String(suffix)} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <div className="marks relative border border-line bg-panel/50">
              <ParallaxDrift className="h-[340px]" strength={9}>
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-70"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgb(var(--line)/0.5) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, rgb(var(--line)/0.5) 0 1px, transparent 1px 40px)',
                  }}
                />
                <Icon
                  name="cooling-tower"
                  size={280}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-cold/20"
                />
                <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-faint">
                    Works plate · CV-EST
                  </span>
                  <span className="t-num text-[9px] text-fg-faint">{brand.foundedYear}</span>
                </div>
                <div className="absolute inset-x-4 bottom-4 border-t border-line pt-3">
                  <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-fg-dim">
                    {brand.address.locality} · {brand.credentials.join(' · ')}
                  </p>
                </div>
              </ParallaxDrift>
              <div className="grid grid-cols-2 border-t border-line">
                <div className="border-r border-line px-4 py-3">
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                    Commissioned
                  </span>
                  <p className="t-num mt-1 text-[11px] text-fg">
                    {brand.stats.tonnageCommissioned.toLocaleString('en-US')} TR
                  </p>
                </div>
                <div className="px-4 py-3">
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                    Response
                  </span>
                  <p className="t-num mt-1 text-[11px] text-heat">
                    {brand.stats.emergencyResponseHours} h
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section border-b border-line">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <span className="annot">01 · The story</span>
            <h2 className="t-h2 mt-5 max-w-[12ch] text-fg">{sections.story.title}</h2>
            <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-fg-dim">
              {sections.story.body}
            </p>
            <div className="mt-6 border border-line bg-panel/40 p-5">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                What we do
              </span>
              <p className="mt-2 text-[12px] leading-relaxed text-fg-dim">{brand.description}</p>
            </div>
          </div>

          <div className="md:col-span-8">
            {story.map((paragraph, index) => (
              <ScrollReveal
                key={paragraph}
                delay={index * 0.04}
                className="border-t border-line py-6 first:border-t-0 first:pt-0"
              >
                <p className="max-w-[62ch] text-[15px] leading-relaxed text-fg-dim">
                  <span className="t-num mr-3 text-[10px] text-cold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {paragraph}
                </p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section border-b border-line bg-panel/20">
        <div className="shell">
          <SectionHeader
            index="02"
            label="Milestones"
            title={sections.milestones.title}
            description={sections.milestones.body}
            action={<Badge tone="cold" dot>2009 – 2025</Badge>}
          />

          <ol className="mt-10 border-t border-line">
            {milestones.map((milestone, index) => (
              <ScrollReveal
                as="li"
                key={milestone.year}
                delay={index * 0.03}
                className="grid gap-3 border-b border-line py-6 md:grid-cols-12 md:items-baseline md:gap-4"
              >
                <span className="t-num text-[13px] text-cold md:col-span-2">{milestone.year}</span>
                <h3 className="t-h4 text-fg md:col-span-4">{milestone.title}</h3>
                <p className="text-sm leading-relaxed text-fg-dim md:col-span-6">
                  {milestone.body}
                </p>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section border-b border-line">
        <div className="shell">
          <SectionHeader
            index="03"
            label="Principles"
            title={sections.principles.title}
            description={sections.principles.body}
          />

          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {principles.map((principle, index) => (
              <ScrollReveal
                key={principle.index}
                delay={index * 0.04}
                className="marks flex flex-col justify-between gap-6 border border-line bg-panel/50 p-6"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="t-num text-[10px] text-cold">{principle.index}</span>
                    <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-fg-faint">
                      CV-PR
                    </span>
                  </div>
                  <h3 className="t-h3 mt-6 max-w-[16ch] text-fg">{principle.title}</h3>
                  <p className="mt-3 max-w-[44ch] text-[13px] leading-relaxed text-fg-dim">
                    {principle.body}
                  </p>
                </div>
                <div className="flex items-start gap-2 border-t border-line pt-4">
                  <Icon name="check" size={13} className="mt-0.5 shrink-0 text-cold" />
                  <span className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-dim">
                    {principle.proof}
                  </span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section border-b border-line">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <span className="annot">04 · The people</span>
            <h2 className="t-h2 mt-5 max-w-[11ch] text-fg">{sections.people.title}</h2>
            <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-fg-dim">
              {sections.people.body}
            </p>
          </div>

          <div className="grid gap-3 md:col-span-8 md:grid-cols-3">
            {leadership.map((leader, index) => (
              <ScrollReveal
                key={leader.initials}
                delay={index * 0.05}
                className="flex flex-col border border-line bg-panel/50"
              >
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <span className="flex h-11 w-11 items-center justify-center border border-line-strong font-mono text-[12px] text-cold">
                    {leader.initials}
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                    {leader.years}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div>
                    <h3 className="text-[15px] font-medium text-fg">{leader.name}</h3>
                    <p className="mt-1 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-cold">
                      {leader.role}
                    </p>
                  </div>
                  <p className="text-[12px] leading-relaxed text-fg-dim">{leader.focus}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section border-b border-line bg-ink-block text-on-ink">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <span className="annot !text-on-ink/70">05 · Safety &amp; quality</span>
            <h2 className="t-h2 mt-5 max-w-[12ch]">{sections.safety.title}</h2>
            <p className="mt-5 max-w-[38ch] text-sm leading-relaxed text-on-ink/70">
              {sections.safety.body}
            </p>

            <ul className="mt-8 flex flex-col">
              {safetyStandards.map((standard) => (
                <li
                  key={standard.title}
                  className="flex items-start gap-3 border-t border-on-ink/10 py-4 first:border-t-0 first:pt-0"
                >
                  <Icon name={standard.icon} size={17} className="mt-0.5 shrink-0 text-heat" />
                  <span>
                    <span className="block text-[13px] text-on-ink">{standard.title}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-on-ink/65">
                      {standard.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <div className="border border-on-ink/15">
              <div className="flex items-center justify-between gap-3 border-b border-on-ink/15 px-5 py-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-on-ink/60">
                  Quality gates
                </span>
                <span className="t-num text-[9px] text-on-ink/45">Q1 – Q5</span>
              </div>
              <ol>
                {qualityGates.map((gate) => (
                  <ScrollReveal
                    as="li"
                    key={gate.index}
                    className="grid gap-3 border-b border-on-ink/10 px-5 py-4 last:border-b-0 sm:grid-cols-[44px_1fr]"
                  >
                    <span className="t-num text-[10px] text-heat">{gate.index}</span>
                    <span>
                      <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-on-ink">
                        {gate.gate}
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-on-ink/65">
                        {gate.evidence}
                      </span>
                      <span className="mt-1.5 block font-mono text-[8px] uppercase tracking-[0.12em] text-on-ink/40">
                        Owner · {gate.owner}
                      </span>
                    </span>
                  </ScrollReveal>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-panel/30">
        <div className="shell grid gap-8 py-10 md:grid-cols-12 md:items-center">
          <div className="md:col-span-4">
            <span className="annot">Certifications</span>
            <h2 className="t-h3 mt-4 text-fg">{sections.certifications.title}</h2>
            <p className="mt-3 max-w-[34ch] text-[12px] leading-relaxed text-fg-dim">
              {sections.certifications.body}
            </p>
          </div>
          <div className="grid gap-3 md:col-span-8 md:grid-cols-2">
            {certifications.map((certification) => (
              <ScrollReveal
                key={certification.code}
                className="flex items-start gap-3 border border-line bg-base/40 p-4"
              >
                <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-cold" />
                <span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-fg">
                    {certification.code}
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-fg-dim">
                    {certification.body}
                  </span>
                </span>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-panel/30">
        <div className="shell flex flex-col gap-8 py-[var(--section-y)] md:flex-row md:items-end md:justify-between">
          <div>
            <span className="annot">Next</span>
            <h2 className="t-h2 mt-4 max-w-[17ch] text-fg">{sections.next.title}</h2>
            <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-fg-dim">
              {sections.next.body}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink to="/work" size="lg" icon="arrow-right">
              Selected work
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
          <Link to="/process" className="text-cold transition-colors duration-2 hover:text-fg">
            the process
          </Link>{' '}
          ·{' '}
          <Link to="/amc" className="text-cold transition-colors duration-2 hover:text-fg">
            maintenance plans
          </Link>{' '}
          ·{' '}
          <Link to="/contact" className="text-cold transition-colors duration-2 hover:text-fg">
            contact
          </Link>
        </p>
      </div>
    </>
  )
}
