import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { SiteNavItem, SiteNavLink, SiteNavigation } from '@hvac/shared'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/icons'
import { useBrand } from '@/brand/BrandProvider'
import { ButtonLink } from '@/components/ui'
import { featuredServices } from '@/content/services'
import { useSiteContent } from '@/content/SiteContentProvider'

const externalPattern = /^(https?:|mailto:|tel:)/i

function isExternal(href: string) {
  return externalPattern.test(href)
}

function isActive(pathname: string, href: string) {
  if (!href || href.startsWith('#')) return false
  if (href === '/') return pathname === '/'
  const clean = href.split('#')[0] ?? href
  return pathname === clean || pathname.startsWith(`${clean}/`)
}

/** One CMS link: router link for site paths, plain anchor for tel/mail/http. */
function NavAnchor({
  link,
  className,
  onNavigate,
  children,
}: {
  link: Pick<SiteNavLink, 'href'>
  className?: string
  onNavigate?: () => void
  children: ReactNode
}) {
  if (isExternal(link.href)) {
    return (
      <a href={link.href} className={className} onClick={onNavigate}>
        {children}
      </a>
    )
  }
  return (
    <Link to={link.href} className={className} onClick={onNavigate}>
      {children}
    </Link>
  )
}

/** Shipped navigation, used only when an old content document has no menu. */
function legacyItems(): SiteNavItem[] {
  const live = featuredServices.slice(0, 6).map((entry) => ({
    label: entry.name,
    href: `/services/${entry.id}`,
  }))
  const half = Math.ceil(live.length / 2)
  return [
    {
      id: 'services',
      label: 'Services',
      href: '/services',
      kind: 'mega',
      published: true,
      eyebrow: 'Capability index',
      columns: [
        { title: 'Systems', links: live.slice(0, half) },
        { title: 'More systems', links: live.slice(half) },
      ],
      cta: { label: 'All services', href: '/services' },
    },
    { id: 'systems', label: 'Systems', href: '/products', kind: 'link', published: true, columns: [] },
    { id: 'about', label: 'About', href: '/about', kind: 'link', published: true, columns: [] },
    { id: 'process', label: 'Process', href: '/process', kind: 'link', published: true, columns: [] },
    { id: 'work', label: 'Work', href: '/work', kind: 'link', published: true, columns: [] },
    {
      id: 'maintenance',
      label: 'Maintenance',
      href: '/amc',
      kind: 'link',
      published: true,
      columns: [],
    },
    { id: 'journal', label: 'Journal', href: '/blog', kind: 'link', published: true, columns: [] },
    {
      id: 'portal',
      label: 'Client portal',
      href: '/portal',
      kind: 'link',
      published: true,
      columns: [],
    },
    { id: 'contact', label: 'Contact', href: '/contact', kind: 'link', published: true, columns: [] },
  ]
}

function MegaPanel({
  item,
  pathname,
  onNavigate,
}: {
  item: SiteNavItem
  pathname: string
  onNavigate: () => void
}) {
  const columns = item.columns.filter((column) => column.links.length > 0)
  return (
    <motion.div
      id={`nav-panel-${item.id}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="absolute left-0 right-0 top-full border border-t-0 border-line/80 bg-base/95 shadow-pop backdrop-blur-xl"
    >
      {item.eyebrow || item.description ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/70 px-6 py-3">
          <span className="t-label">{item.eyebrow || item.label}</span>
          {item.description ? (
            <p className="max-w-xl text-[11px] leading-relaxed text-fg-dim">{item.description}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-0 md:grid-cols-12">
        <div
          className={cn(
            'grid gap-0 md:col-span-8',
            columns.length > 1 ? 'sm:grid-cols-2' : 'sm:grid-cols-1',
          )}
        >
          {columns.map((column) => (
            <div key={column.title} className="border-b border-line/60 px-6 py-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                {column.title}
              </p>
              <ul className="mt-2 flex flex-col">
                {column.links.map((link) => {
                  const active = isActive(pathname, link.href)
                  return (
                    <li key={`${column.title}:${link.href}:${link.label}`}>
                      <NavAnchor
                        link={link}
                        onNavigate={onNavigate}
                        className={cn(
                          'group flex items-start justify-between gap-3 border-b border-line/40 py-2 text-[13px] leading-snug transition-colors duration-2 last:border-b-0',
                          active ? 'text-cold' : 'text-fg-dim hover:text-cold',
                        )}
                      >
                        <span className="flex flex-col gap-0.5">
                          <span className={active ? 'text-cold' : 'text-fg group-hover:text-cold'}>
                            {link.label}
                          </span>
                          {link.description ? (
                            <span className="text-[10.5px] leading-relaxed text-fg-faint">
                              {link.description}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex items-center gap-2">
                          {link.badge ? (
                            <span className="border border-line px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                              {link.badge}
                            </span>
                          ) : null}
                          <Icon
                            name="arrow-up-right"
                            size={11}
                            className="mt-0.5 shrink-0 text-fg-faint opacity-0 transition-opacity duration-2 group-hover:opacity-100"
                          />
                        </span>
                      </NavAnchor>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        {item.feature ? (
          <div className="marks flex flex-col justify-between gap-5 border-t border-line/80 bg-panel/40 p-5 md:col-span-4 md:border-l md:border-t-0">
            <div>
              {item.feature.image ? (
                <img
                  src={item.feature.image}
                  alt=""
                  className="mb-3 h-24 w-full border border-line/60 object-cover"
                />
              ) : null}
              {item.feature.eyebrow ? <span className="t-label">{item.feature.eyebrow}</span> : null}
              {item.feature.title ? (
                <p className="mt-2 text-[14px] font-medium leading-snug text-fg">
                  {item.feature.title}
                </p>
              ) : null}
              {item.feature.body ? (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-fg-dim">
                  {item.feature.body}
                </p>
              ) : null}
            </div>
            {item.feature.ctaLabel && item.feature.ctaHref ? (
              <ButtonLink
                to={item.feature.ctaHref}
                size="sm"
                full
                icon="arrow-up-right"
                onClick={onNavigate}
              >
                {item.feature.ctaLabel}
              </ButtonLink>
            ) : null}
          </div>
        ) : null}
      </div>

      {item.cta ? (
        <div className="flex items-center justify-between gap-4 border-t border-line/80 px-6 py-2.5">
          <NavAnchor
            link={item.cta}
            onNavigate={onNavigate}
            className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:text-cold"
          >
            {item.cta.label}
            <Icon name="arrow-right" size={11} />
          </NavAnchor>
          <Link
            to={item.href}
            onClick={onNavigate}
            className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint transition-colors duration-2 hover:text-cold"
          >
            Open {item.label}
          </Link>
        </div>
      ) : null}
    </motion.div>
  )
}

/**
 * Sticky site header driven by the CMS `navigation` document: the announcement
 * bar, every menu item, both mega panels and the header actions are editable in
 * Content Studio. Falls back to the shipped menu when an older content
 * document is served from cache.
 */
export function SiteHeader() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const { pathname } = useLocation()
  const [compact, setCompact] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [portalReady, setPortalReady] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const closeTimer = useRef<number | null>(null)

  const navigation = content.navigation as SiteNavigation | undefined
  const announcement = navigation?.announcement
  const actions = navigation?.actions
  const items = useMemo(() => {
    const published = (navigation?.items ?? []).filter((item) => item.published)
    return published.length ? published : legacyItems()
  }, [navigation])

  const openItem = openId ? items.find((item) => item.id === openId) ?? null : null

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
    setOpenId(null)
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!openId) return
    const onPointerDown = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpenId(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const previous = openId
      setOpenId(null)
      buttonRefs.current[previous]?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openId])

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

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    },
    [],
  )

  const hoverOpen = (id: string, pointerType: string) => {
    if (pointerType !== 'mouse') return
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setOpenId(id)
  }

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpenId(null), 140)
  }

  const keepOpen = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-modal)] focus:border focus:border-cold focus:bg-base focus:px-4 focus:py-2 focus:font-mono focus:text-[10px] focus:uppercase focus:tracking-[0.12em] focus:text-fg"
      >
        Skip to content
      </a>

      {!announcement || announcement.enabled ? (
        <div className="border-b border-line/60 bg-base/70">
          <div className="shell flex h-8 items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="h-1 w-1 shrink-0 bg-heat" />
              <span className="truncate text-fg-dim">
                {announcement?.text || '24 × 7 breakdown dispatch'}
              </span>
              <span aria-hidden className="hidden h-3 w-px shrink-0 bg-line sm:block" />
              <span className="hidden truncate sm:inline">
                {announcement?.secondary ||
                  brand.serviceAreas.map((area) => area.city).join(' · ')}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-4">
              {announcement?.linkLabel && announcement.linkHref ? (
                <NavAnchor
                  link={{ href: announcement.linkHref }}
                  className="hidden transition-colors duration-2 hover:text-cold md:inline"
                >
                  {announcement.linkLabel}
                </NavAnchor>
              ) : (
                <span className="hidden md:inline">Est. {brand.foundedYear}</span>
              )}
              <a
                href={`tel:${brand.contact.phone}`}
                className="transition-colors duration-2 hover:text-cold"
              >
                {brand.contact.phoneDisplay}
              </a>
            </span>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-[var(--z-nav)] border-b border-line/70 bg-base/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-base/65">
        <div
          ref={shellRef}
          onPointerLeave={scheduleClose}
          onPointerEnter={keepOpen}
          className={cn(
            'shell relative flex items-center justify-between gap-6 transition-[height] duration-3 ease-mech',
            compact ? 'h-[60px]' : 'h-[var(--header-h)]',
          )}
        >
          <Link to="/" className="group flex items-center gap-3" aria-label={`${brand.name} home`}>
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden border border-line-strong/90 font-mono text-[13px] font-semibold tracking-[0.04em] text-cold transition-colors duration-2 group-hover:border-cold">
              {brand.logo?.mark ? (
                <img src={brand.logo.mark} alt="" className="h-full w-full object-contain" />
              ) : (
                brand.name.split(' ')[0]
              )}
            </span>
            <span className="flex flex-col leading-tight">
              {brand.logo?.wordmark ? (
                <img
                  src={brand.logo.wordmark}
                  alt={brand.name}
                  className="h-6 w-auto max-w-[180px] object-contain object-left"
                />
              ) : (
                <span className="font-display text-[15px] font-semibold uppercase leading-none tracking-[0.02em] text-fg sm:text-[16px]">
                  {brand.name}
                </span>
              )}
              <span className="mt-0.5 hidden font-mono text-[9px] uppercase tracking-[0.16em] text-fg-faint lg:block">
                Thermal systems · {brand.address.locality}
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-0.5 xl:flex">
            {items.map((item) => {
              const active =
                item.kind === 'mega'
                  ? isActive(pathname, item.href) ||
                    item.columns.some((column) =>
                      column.links.some((link) => isActive(pathname, link.href)),
                    )
                  : isActive(pathname, item.href)
              const expanded = openId === item.id
              const itemClass = cn(
                'relative flex items-center gap-1.5 px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-2 after:absolute after:inset-x-2.5 after:-bottom-px after:h-px after:origin-left after:bg-cold after:transition-transform after:duration-3 after:ease-mech',
                active || expanded
                  ? 'text-cold after:scale-x-100'
                  : 'text-fg-dim after:scale-x-0 hover:text-fg hover:after:scale-x-100',
              )

              if (item.kind === 'link') {
                return (
                  <NavAnchor
                    key={item.id}
                    link={{ href: item.href }}
                    className={itemClass}
                    onNavigate={() => setOpenId(null)}
                  >
                    {item.label}
                  </NavAnchor>
                )
              }

              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    buttonRefs.current[item.id] = node
                  }}
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`nav-panel-${item.id}`}
                  aria-haspopup="true"
                  onPointerEnter={(event) => hoverOpen(item.id, event.pointerType)}
                  onClick={() => setOpenId(item.id)}
                  className={itemClass}
                >
                  {item.label}
                  <Icon
                    name="chevron-down"
                    size={12}
                    className={cn('transition-transform duration-3 ease-mech', expanded && 'rotate-180')}
                  />
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            {actions?.showPhone !== false ? (
              <a
                href={`tel:${brand.contact.phone}`}
                className="hidden items-center gap-2 border-l border-line/70 px-3 py-1.5 font-mono text-[10px] tracking-[0.06em] text-fg-dim transition-colors duration-2 hover:text-cold xl:flex"
              >
                <Icon name="phone" size={14} />
                {brand.contact.phoneDisplay}
              </a>
            ) : null}
            {actions?.secondaryLabel && actions.secondaryHref ? (
              <Link
                to={actions.secondaryHref}
                className="hidden items-center gap-1.5 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim transition-colors duration-2 hover:text-cold xl:flex"
              >
                {actions.secondaryLabel}
                <Icon name="arrow-up-right" size={11} />
              </Link>
            ) : null}
            <ButtonLink
              to={actions?.primaryHref || '/#callback'}
              size="sm"
              className="hidden sm:inline-flex"
              icon="arrow-up-right"
            >
              {actions?.primaryLabel || 'Request callback'}
            </ButtonLink>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center border border-line text-fg-dim transition-colors duration-2 hover:border-cold/60 hover:text-cold xl:hidden"
            >
              <Icon name="menu" size={18} />
            </button>
          </div>

          <AnimatePresence>
            {openItem ? (
              <MegaPanel
                key={openItem.id}
                item={openItem}
                pathname={pathname}
                onNavigate={() => setOpenId(null)}
              />
            ) : null}
          </AnimatePresence>
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
                  className="fixed inset-0 z-[var(--z-overlay)] flex flex-col bg-base xl:hidden"
                >
                  <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-line px-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-faint">
                      Index · {brand.monogram || 'CV'}-00
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
                      {items.map((item, index) => {
                        const expanded = expandedId === item.id
                        return (
                          <motion.li
                            key={item.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: 0.03 * index + 0.05,
                              duration: 0.35,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className="border-b border-line"
                          >
                            {item.kind === 'link' ? (
                              <NavAnchor
                                link={{ href: item.href }}
                                onNavigate={() => setMenuOpen(false)}
                                className="flex items-center justify-between gap-4 py-4 text-h4 text-fg"
                              >
                                {item.label}
                                <Icon name="arrow-right" size={14} className="text-fg-faint" />
                              </NavAnchor>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  aria-expanded={expanded}
                                  onClick={() => setExpandedId(expanded ? null : item.id)}
                                  className="flex w-full items-center justify-between gap-4 py-4 text-left text-h4 text-fg"
                                >
                                  {item.label}
                                  <Icon
                                    name="chevron-down"
                                    size={16}
                                    className={cn(
                                      'text-fg-faint transition-transform duration-3 ease-mech',
                                      expanded && 'rotate-180',
                                    )}
                                  />
                                </button>
                                <AnimatePresence initial={false}>
                                  {expanded ? (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                      className="overflow-hidden"
                                    >
                                      <div className="flex flex-col gap-4 pb-5">
                                        {item.columns.map((column) => (
                                          <div key={column.title}>
                                            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                                              {column.title}
                                            </p>
                                            <ul className="mt-1 flex flex-col">
                                              {column.links.map((link) => (
                                                <li key={`${link.href}:${link.label}`}>
                                                  <NavAnchor
                                                    link={link}
                                                    onNavigate={() => setMenuOpen(false)}
                                                    className="flex items-baseline justify-between gap-3 border-b border-line/40 py-2 text-[13px] text-fg-dim"
                                                  >
                                                    <span>{link.label}</span>
                                                    <Icon
                                                      name="arrow-up-right"
                                                      size={11}
                                                      className="text-fg-faint"
                                                    />
                                                  </NavAnchor>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        ))}
                                        {item.cta ? (
                                          <NavAnchor
                                            link={item.cta}
                                            onNavigate={() => setMenuOpen(false)}
                                            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold"
                                          >
                                            {item.cta.label}
                                            <Icon name="arrow-right" size={12} />
                                          </NavAnchor>
                                        ) : null}
                                      </div>
                                    </motion.div>
                                  ) : null}
                                </AnimatePresence>
                              </>
                            )}
                          </motion.li>
                        )
                      })}
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
                    <ButtonLink
                      to={actions?.primaryHref || '/#callback'}
                      full
                      onClick={() => setMenuOpen(false)}
                    >
                      {actions?.primaryLabel || 'Request a callback'}
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
