import { Link } from 'react-router-dom'
import { useSeo } from '@/lib/seo'
import { useSiteContent } from '@/content/SiteContentProvider'
import { EnquiryForm } from '@/routes/contact/EnquiryForm'
import { ButtonLink } from '@/components/ui'

/**
 * Public booking entry. Signed-in customers book through the portal (where the
 * appointment is tied to their account); visitors can request the same visit
 * through the lead pipeline. The slot-availability engine is still on the P1
 * list, so the copy does not promise a confirmed engineer.
 */
export function BookPage() {
  useSeo({
    path: '/book',
    title: 'Book a service visit',
    description:
      'Request a service visit from the works desk. Portal customers can book against their account; new customers can send the same request without an account.',
  })
  const { content } = useSiteContent()

  return (
    <section className="border-b border-line">
      <div className="shell grid gap-10 pb-16 pt-12 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-6">
          <span className="annot">Service visit · CV-BOOK</span>
          <h1 className="t-display mt-6 max-w-[13ch] text-fg">Put a visit in the diary.</h1>
          <p className="mt-6 max-w-prose text-sm leading-relaxed text-fg-dim">
            The dispatch desk confirms the engineer and the window. A portal booking is tied to your
            account and appears in your visit history; a request from this page creates the same
            lead for the works team.
          </p>

          <div className="mt-8 grid gap-3 border-t border-line pt-6">
            <div className="flex flex-col gap-2 border border-line bg-panel/30 p-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold">
                Existing customer
              </span>
              <p className="text-[12px] leading-relaxed text-fg-dim">
                Sign in to book, reschedule or cancel against your account. Your service address and
                invoice stay attached to the visit.
              </p>
              <ButtonLink to="/portal" size="sm" variant="secondary" className="mt-1 self-start">
                Open the portal
              </ButtonLink>
            </div>
            <div className="flex flex-col gap-2 border border-line bg-panel/30 p-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-heat">
                Emergency
              </span>
              <p className="text-[12px] leading-relaxed text-fg-dim">
                The form does not replace dispatch. For a live failure, call the 24 × 7 line.
              </p>
              <a
                href={`tel:${content.brand.contact.emergencyPhone}`}
                className="mt-1 font-mono text-[11px] text-heat hover:text-fg"
              >
                {content.brand.contact.emergencyPhone} · emergency
              </a>
            </div>
          </div>

          <p className="mt-6 text-[11px] leading-relaxed text-fg-faint">
            Normal hours: {content.brand.hours.weekdays} · Saturday {content.brand.hours.saturday} ·{' '}
            {content.brand.hours.sunday}. Cover:{' '}
            {content.brand.serviceAreas.map((area) => area.city).join(', ')}.
          </p>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <EnquiryForm source="booking-page" context="Booking request" />
          <p className="mt-3 text-[11px] leading-relaxed text-fg-faint">
            Need a formal quote first?{' '}
            <Link to="/quote" className="text-cold hover:text-fg">
              Send the brief through the quote route
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
