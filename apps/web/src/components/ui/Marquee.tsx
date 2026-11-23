import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface MarqueeProps {
  children: ReactNode
  duration?: number
  reverse?: boolean
  className?: string
  itemClassName?: string
}

/**
 * Continuous rail. Pauses on hover; the global reduced-motion rule collapses
 * the duration so it renders as a static row.
 */
export function Marquee({ children, duration = 32, reverse, className, itemClassName }: MarqueeProps) {
  const trackStyle = {
    animationDuration: `${duration}s`,
    animationDirection: reverse ? ('reverse' as const) : ('normal' as const),
  }

  return (
    <div
      className={cn(
        'group relative flex overflow-hidden',
        className,
      )}
      style={{
        maskImage: 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)',
      }}
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]" style={trackStyle}>
        <div className={cn('flex shrink-0 items-center gap-12 pr-12', itemClassName)}>{children}</div>
        <div aria-hidden className={cn('flex shrink-0 items-center gap-12 pr-12', itemClassName)}>
          {children}
        </div>
      </div>
    </div>
  )
}
