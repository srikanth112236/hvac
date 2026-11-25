import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { useBrand } from '@/brand/BrandProvider'
import { Button, Input, useToast } from '@/components/ui'
import { useSiteContent, useSiteServices } from '@/content/SiteContentProvider'
import { subscribeToNewsletter } from '@/lib/newsletter'

/**
 * Footer: service index, coverage, contact block and newsletter capture.
 * The footer is intentionally translucent over the page so content stays
 * visible behind it, while the brand lockup sits a little larger and heavier
 * so the name reads first.
 */
export function SiteFooter() {
  const brand = useBrand()
  const services = useSiteServices().slice(0, 6)
  const { content } = useSiteContent()
  const legal = content.legal.filter((document) => document.published)
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [honeypot, setHoneypot] = useState('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError('Enter a valid email address')
      return
    }
    setError('')
    setPending(true)
    try {
      await subscribeToNewsletter(value, 'footer', honeypot)
      setEmail('')
      setHoneypot('')
      toast({
        title: 'Thanks — you are on the list.',
        description:
          'Monthly notes on maintenance, coverage and the small decisions behind a comfortable building.',
        tone: 'success',
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The subscription could not be saved.')
    } finally {
      setPending(false)
    }
  }

  return (
    <footer className="relative overflow-hidden border-t border-line/60 bg-panel/25 backdrop-blur-xl">
      <div className="shell grid gap-10 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center border border-line-strong/80 font-mono text-[11px] font-semibold tracking-[0.04em] text-cold">
              {brand.name.split(' ')[0]}
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[clamp(1.55rem,2.6vw,2.15rem)] font-semibold uppercase leading-[0.95] tracking-[-0.01em] text-fg">
                {brand.name}
              </span>
              <span className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-cold">
                Thermal systems · {brand.address.locality}
              </span>
            </span>
          </div>
          <p className="mt-4 max-w-[34ch] text-[13px] leading-relaxed text-fg-dim">
            {brand.description}
          </p>
          <nav aria-label="Company" className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
            {(
              [
                ['About', '/about'],
                ['Process', '/process'],
                ['Work', '/work'],
                ['Systems', '/products'],
                ['Maintenance', '/amc'],
                ['Journal', '/blog'],
                ['Contact', '/contact'],
              ] as const
            ).map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:text-cold"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-1.5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-fg-faint">
            <span>{brand.address.line1}</span>
            <span>{brand.address.line2}</span>
            <span>
              {brand.address.locality} {brand.address.postalCode}
            </span>
            <span>{brand.address.region}</span>
          </div>
        </div>

        <div className="md:col-span-2">
          <span className="t-label">Services</span>
          <ul className="mt-4 flex flex-col gap-2.5">
            {services.map((service) => (
              <li key={service.id}>
                <Link
                  to={`/services/${service.id}`}
                  className="text-[12px] leading-snug text-fg-dim transition-colors duration-2 hover:text-cold"
                >
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/services"
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
          >
            Full index
            <Icon name="arrow-right" size={11} />
          </Link>
          <Link
            to="/tools"
            className="mt-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint transition-colors duration-2 hover:text-cold"
          >
            Calculators
            <Icon name="arrow-right" size={11} />
          </Link>
        </div>

        <div className="md:col-span-2">
          <span className="t-label">Coverage</span>
          <ul className="mt-4 flex flex-col gap-2.5">
            {brand.serviceAreas.map((area) => (
              <li key={area.slug} className="flex flex-col">
                <span className="text-[12px] leading-snug text-fg-dim">{area.city}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                  {area.region} · {Math.round(area.radiusKm / 1.60934)} mi
                </span>
              </li>
            ))}
          </ul>
          <span className="t-label mt-6 block">Credentials</span>
          <ul className="mt-3 flex flex-col gap-1.5">
            {brand.credentials.map((credential) => (
              <li
                key={credential}
                className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint"
              >
                {credential}
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3 md:col-start-10">
          <span className="t-label">Works &amp; dispatch</span>
          <ul className="mt-4 flex flex-col gap-2.5">
            <li>
              <a
                href={`tel:${brand.contact.phone}`}
                className="flex items-center gap-2 font-mono text-[12px] text-fg transition-colors duration-2 hover:text-cold"
              >
                <Icon name="phone" size={14} className="text-fg-faint" />
                {brand.contact.phoneDisplay}
              </a>
            </li>
            <li>
              <a
                href={`tel:${brand.contact.emergencyPhone}`}
                className="flex items-center gap-2 font-mono text-[12px] text-heat transition-colors duration-2 hover:text-fg"
              >
                <Icon name="bolt" size={14} />
                {brand.contact.emergencyPhone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${brand.contact.email}`}
                className="flex items-center gap-2 font-mono text-[12px] text-fg-dim transition-colors duration-2 hover:text-cold"
              >
                <Icon name="mail" size={14} className="text-fg-faint" />
                {brand.contact.email}
              </a>
            </li>
          </ul>

          <dl className="mt-5 flex flex-col gap-1.5 border-t border-line/70 pt-4 font-mono text-[9px] uppercase tracking-[0.08em]">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-faint">Mon – Fri</dt>
              <dd className="text-fg-dim">{brand.hours.weekdays}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-faint">Saturday</dt>
              <dd className="text-fg-dim">{brand.hours.saturday}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-faint">Dispatch</dt>
              <dd className="text-heat">{brand.hours.emergency}</dd>
            </div>
          </dl>

          <form onSubmit={onSubmit} className="mt-6 border-t border-line/70 pt-5" noValidate>
            <div
              aria-hidden="true"
              className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
            >
              <label htmlFor="footer-company-website">Company website</label>
              <input
                id="footer-company-website"
                name="company_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>
            <Input
              label="Monthly notes"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@building.example"
              value={email}
              error={error}
              onChange={(event) => {
                setEmail(event.target.value)
                if (error) setError('')
              }}
            />
            <div className="mt-3">
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                full
                icon="arrow-right"
                disabled={pending}
              >
                {pending ? 'Saving…' : 'Subscribe'}
              </Button>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-fg-faint">
              One email a month. No offers, no sharing.
            </p>
          </form>
        </div>
      </div>

      <div className="border-t border-line/70">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-5 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
          <span>
            © {new Date().getFullYear()} {brand.legalName}
          </span>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {legal.map((document) => (
              <Link
                key={document.slug}
                to={`/legal/${document.slug}`}
                className="transition-colors duration-2 hover:text-cold"
              >
                {document.title}
              </Link>
            ))}
          </nav>
          <span className="flex items-center gap-4">
            <span className="hidden sm:inline">Cash · cheque · card on site</span>
            {import.meta.env.DEV ? (
              <Link to="/__styleguide" className="transition-colors duration-2 hover:text-cold">
                Design system
              </Link>
            ) : null}
          </span>
        </div>
      </div>
    </footer>
  )
}
