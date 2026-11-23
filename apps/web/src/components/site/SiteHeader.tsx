import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/icons'
import { useBrand } from '@/brand/BrandProvider'
import { ButtonLink } from '@/components/ui'
import { featuredServices } from '@/content/services'
import { useSiteServices } from '@/content/SiteContentProvider'

const navItems = [
  { label: 'Systems', to: '/products' },
  { label: 'About', to: '/about' },
  { label: 'Process', to: '/process' },
  { label: 'Work', to: '/work' },
  { label: 'Maintenance', to: '/amc' },
  { label: 'Journal', to: '/blog' },
  { label: 'Client portal', to: '/portal' },
  { label: 'Contact', to: '/contact' },
]

/**
 * Sticky site header: announcement bar scrolls away, the bar itself compacts,
 * services open a mega panel, and the mobile menu is a full-screen index.
 * The overlay is portalled so the header's backdrop-filter cannot trap it.
 */
export function SiteHeader() {
  const brand = useBrand()
  const liveServices = useSiteServices()
  const featured = featuredServices.flatMap((entry) => {
    const live = liveServices.find((service) => service.id === entry.id)
    return live ? [live] : []
  })
  const { pathname } = useLocation()
  const [compact, setCompact] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const servicesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 32)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!megaOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!servicesRef.current?.contains(event.target as Node)) setMegaOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMegaOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [megaOpen])

  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-modal)] focus:border focus:border-cold focus:bg-base focus:px-4 focus:py-2 focus:font-mono focus:text-[10px] focus:uppercase focus:tracking-[0.12em] focus:text-fg"
      >
        Skip to content
      </a>

      <div className="border-b border-line/60 bg-base/70">
        <div className="shell flex h-8 items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-1 w-1 bg-heat" />
            <span className="text-fg-dim">24 × 7 breakdown dispatch</span>
            <span aria-hidden className="hidden h-3 w-px bg-line sm:block" />
            <span className="hidden sm:inline">
              {brand.serviceAreas.map((area) => area.city).join(' · ')}
            </span>
          </span>
          <span className="flex items-center gap-4">
            <span className="hidden md:inline">Est. {brand.foundedYear}</span>
            <a
              href={`tel:${brand.contact.phone}`}
              className="transition-colors duration-2 hover:text-cold"
            >
              {brand.contact.phoneDisplay}
            </a>
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-[var(--z-nav)] border-b border-line/70 bg-base/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-base/65">
        <div
          className={cn(
            'shell flex items-center justify-between gap-6 transition-[height] duration-3 ease-mech',
            compact ? 'h-[60px]' : 'h-[var(--header-h)]',
          )}
        >
          <Link to="/" className="group flex items-center gap-3" aria-label={`${brand.name} home`}>
            <span className="flex h-9 w-9 items-center justify-center border border-line-strong/90 font-mono text-[13px] font-semibold tracking-[0.04em] text-cold transition-colors duration-2 group-hover:border-cold">
              {brand.name.split(' ')[0]}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display text-[15px] font-semibold uppercase leading-none tracking-[0.02em] text-fg sm:text-[16px]">
                {brand.name}
              </span>
              <span className="mt-0.5 hidden font-mono text-[9px] uppercase tracking-[0.16em] text-fg-faint lg:block">
                Thermal systems · {brand.address.locality}
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            <div
              ref={servicesRef}
              className="relative"
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setMegaOpen(true)
              }}
            >
              <button
                type="button"
                aria-expanded={megaOpen}
                aria-controls="services-mega"
                onClick={() => setMegaOpen((open) => !open)}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors duration-2 after:absolute after:inset-x-3 after:-bottom-px after:h-px after:origin-left after:bg-cold after:transition-transform after:duration-3 after:ease-mech',
                  megaOpen || pathname.startsWith('/services')
                    ? 'text-cold after:scale-x-100'
                    : 'text-fg-dim after:scale-x-0 hover:text-fg hover:after:scale-x-100',
                )}
              >
                Services
                <Icon
                  name="chevron-down"
                  size={12}
                  className={cn(
                    'transition-transform duration-3 ease-mech',
                    megaOpen && 'rotate-180',
                  )}
                />
              </button>

              <AnimatePresence>
                {megaOpen ? (
                  <motion.div
                    id="services-mega"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-1/2 top-full w-[min(780px,calc(100vw-3rem))] -translate-x-1/2 border border-line/80 bg-base/95 shadow-pop backdrop-blur-xl"
                  >
                    <div className="grid gap-0 md:grid-cols-12">
                      <div className="grid gap-0 md:col-span-8 md:grid-cols-2">
                        {featured.map((service) => (
                          <Link
                            key={service.id}
                            to={`/services/${service.id}`}
                            onClick={() => setMegaOpen(false)}
                            className="wash group flex items-start justify-between gap-3 border-b border-line/70 px-5 py-4"
                          >
                            <span className="flex flex-col gap-1">
                              <span className="text-[14px] font-medium leading-snug text-fg transition-colors duration-2 group-hover:text-cold">
                                {service.name}
                              </span>
                              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                                {service.capacity}
                              </span>
                            </span>
                            <span className="t-num text-[9px] text-fg-faint">{service.index}</span>
                          </Link>
                        ))}
                      </div>

                      <div className="marks flex flex-col justify-between gap-5 border-t border-line/80 bg-panel/40 p-5 md:col-span-4 md:border-l md:border-t-0">
                        <div>
                          <span className="t-label">Dispatch</span>
                          <p className="mt-2 text-[12px] leading-relaxed text-fg-dim">
                            A failure at 02:00 gets an engineer, not a ticket. Four-hour response
                            inside city limits.
                          </p>
                        </div>
                        <div className="flex flex-col gap-3">
                          <Link
                            to="/services"
                            onClick={() => setMegaOpen(false)}
                            className="flex items-center justify-between gap-2 border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:border-cold/60 hover:text-cold"
                          >
                            All {liveServices.length} services
                            <Icon name="arrow-right" size={12} />
                          </Link>
                          <a
                            href={`tel:${brand.contact.emergencyPhone}`}
                            className="t-num text-[13px] text-heat transition-colors duration-2 hover:text-fg"
                          >
                            {brand.contact.emergencyPhone}
                          </a>
                          <ButtonLink
                            to="/#callback"
                            size="sm"
                            full
                            onClick={() => setMegaOpen(false)}
                          >
                            Request a callback
                          </ButtonLink>
                        </div>
                      </div>
                    </div>
                    <div className="thread" />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {navItems.map((item) => {
              const active =
                item.to === '/'
                  ? pathname === '/'
                  : pathname === item.to || pathname.startsWith(`${item.to}/`)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative px-2.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors duration-2 after:absolute after:inset-x-2.5 after:-bottom-px after:h-px after:origin-left after:bg-cold after:transition-transform after:duration-3 after:ease-mech',
                    active
                      ? 'text-cold after:scale-x-100'
                      : 'text-fg-dim after:scale-x-0 hover:text-fg hover:after:scale-x-100',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${brand.contact.phone}`}
              className="hidden items-center gap-2 border-l border-line/70 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-fg-dim transition-colors duration-2 hover:text-cold lg:flex"
            >
              <Icon name="phone" size={14} />
              {brand.contact.phoneDisplay}
            </a>
            <ButtonLink
              to="/#callback"
              size="sm"
              className="hidden sm:inline-flex"
              icon="arrow-up-right"
            >
              Request callback
            </ButtonLink>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center border border-line text-fg-dim transition-colors duration-2 hover:border-cold/60 hover:text-cold lg:hidden"
            >
              <Icon name="menu" size={18} />
            </button>
          </div>
        </div>
      </header>

      {portalReady
        ? createPortal(
            <AnimatePresence>
              {menuOpen ? (
                <motion.div
                  key="mobile-menu"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Site index"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[var(--z-overlay)] flex flex-col bg-base lg:hidden"
                >
                  <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-line px-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-faint">
                      Index · CV-00
                    </span>
                    <button
                      type="button"
                      autoFocus
                      aria-label="Close menu"
                      onClick={() => setMenuOpen(false)}
                      className="flex h-9 w-9 items-center justify-center border border-line text-fg"
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>

                  <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 pb-8">
                    <ul className="flex flex-col">
                      {featured.map((service, index) => (
                        <motion.li
                          key={service.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: 0.04 * index + 0.06,
                            duration: 0.4,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="border-b border-line"
                        >
                          <Link
                            to={`/services/${service.id}`}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center justify-between gap-4 py-4"
                          >
                            <span className="text-h4 text-fg">{service.name}</span>
                            <span className="t-num text-[10px] text-fg-faint">{service.index}</span>
                          </Link>
                        </motion.li>
                      ))}
                    </ul>

                    <Link
                      to="/services"
                      onClick={() => setMenuOpen(false)}
                      className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold"
                    >
                      All {liveServices.length} services
                      <Icon name="arrow-right" size={12} />
                    </Link>

                    <ul className="mt-6 grid grid-cols-2 gap-2">
                      {navItems.map((item) => (
                        <li key={item.to}>
                          <Link
                            to={item.to}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center justify-between border border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim"
                          >
                            {item.label}
                            <Icon name="arrow-right" size={13} />
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
                      <a
                        href={`tel:${brand.contact.emergencyPhone}`}
                        className="flex items-center justify-between text-fg"
                      >
                        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-heat">
                          <Icon name="bolt" size={14} /> Emergency
                        </span>
                        <span className="t-num text-[13px]">{brand.contact.emergencyPhone}</span>
                      </a>
                      <a
                        href={`mailto:${brand.contact.email}`}
                        className="flex items-center justify-between text-fg"
                      >
                        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">
                          <Icon name="mail" size={14} /> Works
                        </span>
                        <span className="font-mono text-[11px] text-fg-dim">
                          {brand.contact.email}
                        </span>
                      </a>
                      <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-fg-faint">
                        {brand.hours.weekdays} · {brand.hours.saturday}
                      </p>
                    </div>
                  </nav>

                  <div className="shrink-0 border-t border-line p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                    <ButtonLink to="/#callback" full onClick={() => setMenuOpen(false)}>
                      Request a callback
                    </ButtonLink>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  )
}
