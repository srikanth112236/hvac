import { Link } from 'react-router-dom'
import { useSeo } from '@/lib/seo'
import { useSiteContent } from '@/content/SiteContentProvider'
import { EnquiryForm } from '@/routes/contact/EnquiryForm'

/**
 * Quote request. The full technical brief route: anonymous visitors can send
 * drawings, load data or a failure description and it lands in the same lead
 * pipeline as the contact form.
 */
export function QuotePage() {
  useSeo({
    path: '/quote',
    title: 'Request a quote',
    description:
      'Send the room, the load, the drawings or the failure. The works desk replies with the design basis, the equipment selection and a defined scope.',
  })
  const { content } = useSiteContent()

  return (
    <section className="border-b border-line">
      <div className="shell grid gap-10 pb-16 pt-12 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-6">
          <span className="annot">Quote request · CV-QUOTE</span>
          <h1 className="t-display mt-6 max-w-[14ch] text-fg">Tell us the load, not the brand.</h1>
          <p className="mt-6 max-w-prose text-sm leading-relaxed text-fg-dim">
            A quote starts with the room, the plant or the failure. Send the area, orientation and
            glazing, the existing equipment and the constraint that matters — access, noise, power or
            a deadline. We reply with a design basis and a scope that states its exclusions.
          </p>

          <ul className="mt-8 grid gap-3 border-t border-line pt-6 text-[12px] text-fg-dim">
            {[
              'Room schedule or floor plan, if you have one',
              'Existing equipment: make, model, capacity, age',
              'The constraint: price, lead time, noise, access or redundancy',
              'A photograph of the plant room or the failed unit',
            ].map((entry) => (
              <li key={entry} className="flex items-start gap-3">
                <span className="mt-1 h-1 w-1 shrink-0 bg-cold" />
                {entry}
              </li>
            ))}
          </ul>

          <div className="mt-8 border border-line bg-panel/30 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
              Already a customer?
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-fg-dim">
              Sign in to the portal to see the visit history and invoice the quote will attach to.
            </p>
            <Link
              to="/portal"
              className="mt-3 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:text-fg"
            >
              Open customer portal
            </Link>
          </div>

          <p className="mt-6 text-[11px] leading-relaxed text-fg-faint">
            Prefer to talk? Call{' '}
            <a href={`tel:${content.brand.contact.phone}`} className="text-cold hover:text-fg">
              {content.brand.contact.phoneDisplay}
            </a>{' '}
            or email{' '}
            <a href={`mailto:${content.brand.contact.email}`} className="text-cold hover:text-fg">
              {content.brand.contact.email}
            </a>
            .
          </p>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <EnquiryForm source="contact-page" context="Quote request" />
        </div>
      </div>
    </section>
  )
}
