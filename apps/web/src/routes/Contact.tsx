import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { ButtonLink } from '@/components/ui'
import { SplitReveal } from '@/motion'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent, useSiteServices } from '@/content/SiteContentProvider'
import { useSeo } from '@/lib/seo'
import { PageBackdrop } from '@/components/site/PageBackdrop'
import { CoveragePlate } from '@/routes/contact/CoveragePlate'
import { EnquiryForm } from '@/routes/contact/EnquiryForm'

/** Contact: the form is the slow path, the phone is the emergency path. */
export function Contact() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const services = useSiteServices()
  const copy = content.pages.contact
  const sections = content.pageSections.contact
  const mapQuery = [
    brand.name,
    brand.address.line1,
    brand.address.line2,
    brand.address.locality,
    brand.address.region,
    brand.address.postalCode,
    brand.address.country,
  ]
    .filter(Boolean)
    .join(', ')
  const mapUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(mapQuery)}`
  useSeo({ path: '/contact' })

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <PageBackdrop src={copy.image} alt={copy.imageAlt} />
        <div className="shell grid gap-x-8 gap-y-12 pb-14 pt-12 md:grid-cols-12 lg:pt-16">
          <div className="md:col-span-7">
            <span className="annot">Contact · CV-WORKS</span>

            <SplitReveal
              key={copy.headline}
              as="h1"
              className="t-display mt-7 max-w-[12ch] text-fg"
              stagger={0.05}
            >
              {copy.headline}
            </SplitReveal>

            <p className="t-lead mt-7 max-w-[56ch]">{copy.lead}</p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href={`tel:${brand.contact.phone}`}
                className="t-num text-h4 text-fg transition-colors duration-2 hover:text-cold"
              >
                {brand.contact.phoneDisplay}
              </a>
              <span aria-hidden className="h-4 w-px bg-line" />
              <a
                href={`mailto:${brand.contact.email}`}
                className="font-mono text-[11px] text-fg-dim transition-colors duration-2 hover:text-cold"
              >
                {brand.contact.email}
              </a>
            </div>
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-6 border-t border-line pt-5">
              {[
                ['Reply', '1 working hour'],
                ['Dispatch', `${brand.stats.emergencyResponseHours} h`],
                ['Hours', '24 × 7'],
                ['Coverage', `${brand.serviceAreas.length} cities`],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                    {label}
                  </dt>
                  <dd className="t-num text-[12px] text-fg">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="thread mt-6" />
            <p className="mt-4 max-w-[34ch] text-[11px] leading-relaxed text-fg-faint">
              Emergency calls are answered by dispatch before the enquiry inbox is checked. If the
              plant is down, call.
            </p>
          </div>
        </div>
      </section>

      <section className="section-lg border-b border-line">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <EnquiryForm />
          </div>

          <aside className="md:col-span-4 md:col-start-9">
            <div className="flex flex-col gap-6 md:sticky md:top-[calc(var(--header-h)+24px)]">
              <div className="marks border border-line bg-panel/60 p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="t-label">Direct</span>
                  <span className="t-num text-[10px] text-fg-faint">CV/01</span>
                </div>
                <div className="rule-ticks mt-4" />

                <div className="mt-4 flex flex-col gap-4">
                  <a
                    href={`tel:${brand.contact.phone}`}
                    className="flex items-start gap-3 text-fg transition-colors duration-2 hover:text-cold"
                  >
                    <Icon name="phone" size={15} className="mt-0.5 text-fg-faint" />
                    <span className="flex flex-col gap-0.5">
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
                    <span className="flex flex-col gap-0.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                        Dispatch · 24 × 7
                      </span>
                      <span className="t-num text-[13px]">{brand.contact.emergencyPhone}</span>
                    </span>
                  </a>

                  <a
                    href={`mailto:${brand.contact.email}`}
                    className="flex items-start gap-3 text-fg-dim transition-colors duration-2 hover:text-cold"
                  >
                    <Icon name="mail" size={15} className="mt-0.5 text-fg-faint" />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                        Works
                      </span>
                      <span className="font-mono text-[11px]">{brand.contact.email}</span>
                    </span>
                  </a>

                  <a
                    href={`mailto:${brand.contact.salesEmail}`}
                    className="flex items-start gap-3 text-fg-dim transition-colors duration-2 hover:text-cold"
                  >
                    <Icon name="external" size={15} className="mt-0.5 text-fg-faint" />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                        Projects
                      </span>
                      <span className="font-mono text-[11px]">{brand.contact.salesEmail}</span>
                    </span>
                  </a>
                </div>

                <div className="thread mt-5" />
                <dl className="mt-4 flex flex-col gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em]">
                  {[
                    ['Mon – Fri', brand.hours.weekdays, 'text-fg-dim'],
                    ['Saturday', brand.hours.saturday, 'text-fg-dim'],
                    ['Sunday', brand.hours.sunday, 'text-fg-dim'],
                    ['Dispatch', brand.hours.emergency, 'text-heat'],
                  ].map(([label, value, tone]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-fg-faint">{label}</dt>
                      <dd className={tone}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="border border-line p-6">
                <span className="t-label">Works address</span>
                <p className="mt-4 text-[13px] leading-relaxed text-fg-dim">
                  {brand.address.line1}
                  <br />
                  {brand.address.line2}
                  <br />
                  {brand.address.locality} {brand.address.postalCode}, {brand.address.region}
                </p>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
                >
                  Open in Maps
                  <Icon name="external" size={12} />
                </a>
                <p className="mt-4 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
                  Site visits by appointment · lift, terrace and NOC access arranged by us
                </p>
              </div>

              <Link
                to="/services"
                className="flex items-center justify-between gap-3 border border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:border-cold/60 hover:text-cold"
              >
                All {services.length} services
                <Icon name="arrow-right" size={12} />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="section-lg border-b border-line">
        <div className="shell grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <CoveragePlate />
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <span className="annot">Coverage</span>
            <h2 className="t-h3 mt-4 text-fg">{sections.coverage.title}</h2>
            <p className="mt-4 text-sm leading-relaxed text-fg-dim">{sections.coverage.body}</p>

            <ul className="mt-6 border-t border-line">
              {brand.serviceAreas.map((area) => (
                <li
                  key={area.slug}
                  className="flex items-baseline justify-between gap-4 border-b border-line/70 py-3"
                >
                  <span className="flex flex-col">
                    <span className="text-[13px] text-fg">{area.city}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                      {area.region}
                    </span>
                  </span>
                  <span className="t-num text-[11px] text-fg-dim">{area.radiusKm} km</span>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <ButtonLink to="/services" variant="secondary" size="sm" icon="arrow-right">
                Compare services
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
