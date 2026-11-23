import { Icon } from '@/components/icons'
import { ButtonAnchor } from '@/components/ui'
import { MagneticButton, SplitReveal } from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'

/** Final CTA: one instruction, the real contact routes, no second headline. */
export function FinalCta() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const { home } = content

  return (
    <section id="contact" className="relative scroll-mt-[var(--header-h)] overflow-hidden border-b border-line bg-panel/30">
      <div className="shell grid gap-12 py-[var(--section-y-lg)] md:grid-cols-12">
        <div className="md:col-span-7">
          <span className="annot">Next step</span>
          <SplitReveal
            key={home.finalCtaTitle}
            as="h2"
            className="t-display mt-6 max-w-[12ch] text-fg"
            stagger={0.05}
          >
            {home.finalCtaTitle}
          </SplitReveal>
          <p className="t-lead mt-6 max-w-[48ch]">{home.finalCtaLead}</p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <MagneticButton>
              <ButtonAnchor href="#callback" size="lg" icon="arrow-up-right">
                Request a site survey
              </ButtonAnchor>
            </MagneticButton>
            <ButtonAnchor
              href={`tel:${brand.contact.phone}`}
              variant="secondary"
              size="lg"
              icon="phone"
            >
              {brand.contact.phoneDisplay}
            </ButtonAnchor>
          </div>

          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-5">
            {[
              ['Response', 'One working hour'],
              ['Site survey', '1 – 2 days'],
              ['Quotation', 'Within 7 days'],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                  {label}
                </span>
                <span className="text-[12px] text-fg-dim">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-4 md:col-start-9">
          <div className="marks border border-line bg-base/60 p-6">
            <span className="t-label">Works</span>
            <div className="mt-4 flex flex-col gap-4">
              <a
                href={`tel:${brand.contact.phone}`}
                className="flex items-start gap-3 text-fg transition-colors duration-2 hover:text-cold"
              >
                <Icon name="phone" size={15} className="mt-0.5 text-fg-faint" />
                <span className="flex flex-col">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Office
                  </span>
                  <span className="t-num text-[13px]">{brand.contact.phoneDisplay}</span>
                </span>
              </a>
              <a
                href={`tel:${brand.contact.emergencyPhone}`}
                className="flex items-start gap-3 text-heat transition-colors duration-2 hover:text-fg"
              >
                <Icon name="bolt" size={15} className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Dispatch · 24 × 7
                  </span>
                  <span className="t-num text-[13px]">{brand.contact.emergencyPhone}</span>
                </span>
              </a>
              <a
                href={`mailto:${brand.contact.salesEmail}`}
                className="flex items-start gap-3 text-fg-dim transition-colors duration-2 hover:text-cold"
              >
                <Icon name="mail" size={15} className="mt-0.5 text-fg-faint" />
                <span className="flex flex-col">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Projects
                  </span>
                  <span className="font-mono text-[11px]">{brand.contact.salesEmail}</span>
                </span>
              </a>
              <div className="flex items-start gap-3">
                <Icon name="pin" size={15} className="mt-0.5 text-fg-faint" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    Works address
                  </span>
                  <span className="text-[12px] leading-relaxed text-fg-dim">
                    {brand.address.line1}, {brand.address.line2}, {brand.address.locality}{' '}
                    {brand.address.postalCode}
                  </span>
                </span>
              </div>
            </div>

            <div className="thread mt-5" />

            <dl className="mt-4 flex flex-col gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em]">
              <div className="flex justify-between gap-3">
                <dt className="text-fg-faint">Mon – Fri</dt>
                <dd className="text-fg-dim">{brand.hours.weekdays}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-faint">Saturday</dt>
                <dd className="text-fg-dim">{brand.hours.saturday}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-faint">Sunday</dt>
                <dd className="text-fg-dim">{brand.hours.sunday}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
