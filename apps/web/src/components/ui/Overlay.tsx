import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/icons'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  )
}

let openOverlays = 0

function useDismissable(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const previousPadding = document.body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    openOverlays += 1
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = focusableIn(panelRef.current)
      if (!focusable.length) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = focusable[0] as HTMLElement
      const last = focusable.at(-1) as HTMLElement
      const active = document.activeElement
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const preferred = panel.querySelector<HTMLElement>('[data-autofocus]')
      const target = preferred ?? focusableIn(panel)[0] ?? panel
      target.focus({ preventScroll: true })
    })

    return () => {
      window.cancelAnimationFrame(frame)
      openOverlays = Math.max(0, openOverlays - 1)
      if (openOverlays === 0) {
        document.body.style.overflow = previousOverflow
        document.body.style.paddingRight = previousPadding
      }
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  return panelRef
}

const ease = [0.16, 1, 0.3, 1] as const

interface OverlayShellProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: OverlayShellProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useDismissable(open, onClose)
  const width = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(var(--base)/0.74)] backdrop-blur-[6px]"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.3, ease }}
            className={cn(
              'marks relative flex w-full flex-col border border-line bg-panel shadow-pop outline-none',
              width,
              'max-h-[100dvh] overflow-hidden sm:max-h-[88dvh]',
              className,
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-6 border-b border-line px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-1.5">
                <h2 id={titleId} className="t-h4 text-fg">
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="text-[13px] leading-snug text-fg-dim">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-1 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center text-fg-faint transition-colors duration-2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cold"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div
              data-lenis-prevent
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 text-sm leading-relaxed text-fg-dim sm:px-6 [scrollbar-gutter:stable]"
              role="region"
              aria-label="Dialog content"
              tabIndex={0}
            >
              {children}
            </div>
            {footer ? (
              <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line bg-panel px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

interface DrawerProps extends OverlayShellProps {
  side?: 'left' | 'right'
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  className,
}: DrawerProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useDismissable(open, onClose)

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[var(--z-modal)]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(var(--base)/0.7)] backdrop-blur-[4px]"
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ duration: 0.38, ease }}
            className={cn(
              'absolute inset-y-0 flex w-full max-w-md flex-col overflow-hidden border-line bg-panel shadow-pop outline-none',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              className,
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-6 border-b border-line px-6 py-5">
              <div className="flex flex-col gap-1.5">
                <h2 id={titleId} className="t-h4 text-fg">
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="text-[13px] leading-snug text-fg-dim">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="-mr-1 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center text-fg-faint transition-colors duration-2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cold"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div
              data-lenis-prevent
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 text-sm leading-relaxed text-fg-dim [scrollbar-gutter:stable]"
              role="region"
              aria-label="Panel content"
              tabIndex={0}
            >
              {children}
            </div>
            {footer ? (
              <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line bg-panel px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
