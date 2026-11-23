import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { useBrand } from '@/brand/BrandProvider'

/**
 * Mobile action bar and the desktop emergency tab. Both are permanent, not
 * scroll-triggered, because the emergency path should never depend on motion.
 */
export function StickyActions() {
  const brand = useBrand()
  const actionClass =
    'flex h-14 items-center justify-center gap-2 border-r border-line font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 last:border-r-0 hover:text-cold'

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] grid grid-cols-3 border-t border-line bg-base/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <a href={`tel:${brand.contact.phone}`} className={actionClass}>
          <Icon name="phone" size={15} />
          Call
        </a>
        <a href={`mailto:${brand.contact.email}`} className={actionClass}>
          <Icon name="mail" size={15} />
          Email
        </a>
        <Link to="/book" className={actionClass}>
          <Icon name="calendar" size={15} />
          Book
        </Link>
      </div>

      <a
        href={`tel:${brand.contact.emergencyPhone}`}
        className="group fixed bottom-6 right-6 z-[var(--z-sticky)] hidden items-center gap-3 border border-heat/40 bg-panel/95 px-4 py-3 shadow-pop backdrop-blur-md transition-colors duration-2 hover:border-heat md:flex"
      >
        <span className="flex h-8 w-8 items-center justify-center border border-heat/40 text-heat">
          <Icon name="bolt" size={15} />
        </span>
        <span className="flex flex-col leading-none">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
            Emergency 24 × 7
          </span>
          <span className="mt-1 font-mono text-[11px] text-heat transition-colors duration-2 group-hover:text-fg">
            {brand.contact.emergencyPhone}
          </span>
        </span>
      </a>
    </>
  )
}
