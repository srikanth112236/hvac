import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { gsap, useIsomorphicLayoutEffect } from './core'

interface HorizontalRailProps {
  children: ReactNode
  className?: string
  label?: string
}

/**
 * Scroll-driven horizontal rail. The section pins for a measured distance and
 * the track translates with scroll; native horizontal scroll is the fallback
 * for reduced motion and narrow viewports.
 */
export function HorizontalRail({ children, className, label }: HorizontalRailProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)

  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return

    /**
     * matchMedia matters here: a desktop pin left in place after a resize to a
     * narrow viewport keeps its spacer width and causes horizontal overflow.
     * The small-screen branch reverts the pin and makes the track a real
     * scroller instead of an oversized flex row.
     */
    const media = gsap.matchMedia()

    media.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      track.style.width = ''
      track.style.overflowX = ''

      const context = gsap.context(() => {
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 96)

        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${distance() + window.innerHeight * 0.5}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`
            },
          },
        })
      }, section)

      return () => context.revert()
    })

    media.add('(max-width: 767px), (prefers-reduced-motion: reduce)', () => {
      track.style.width = '100%'
      track.style.overflowX = 'auto'
      return () => {
        track.style.width = ''
        track.style.overflowX = ''
      }
    })

    return () => media.revert()
  }, [])

  return (
    <div ref={sectionRef} className={cn('relative overflow-hidden', className)}>
      <div className="flex h-[100svh] flex-col justify-center">
        {label ? (
          <div className="shell mb-8 flex items-center justify-between">
            <span className="t-label">{label}</span>
            <span className="t-label">Drag · Scroll</span>
          </div>
        ) : null}
        <div ref={trackRef} className="flex w-max gap-5 px-[var(--gutter)] will-change-transform">
          {children}
        </div>
        <div className="shell mt-10">
          <span ref={barRef} className="block h-px origin-left bg-line-strong" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </div>
  )
}

interface RailCardProps {
  children: ReactNode
  className?: string
}

export function RailCard({ children, className }: RailCardProps) {
  return (
    <div
      className={cn(
        'marks relative flex h-[340px] w-[min(78vw,340px)] shrink-0 flex-col justify-between border border-line bg-panel p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}
