import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { gsap, prefersReducedMotion, useIsomorphicLayoutEffect } from './core'

interface ParallaxDriftProps {
  children: ReactNode
  className?: string
  /** Percentage of the element height travelled across the viewport pass. */
  strength?: number
}

/**
 * Decorative parallax for schematic plates and background layers. The frame is
 * clipped; the child is oversized by the drift so no edge is exposed. Skipped
 * entirely for reduced motion and coarse pointers.
 */
export function ParallaxDrift({ children, className, strength = 6 }: ParallaxDriftProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    const frame = frameRef.current
    const inner = innerRef.current
    if (!frame || !inner) return
    if (prefersReducedMotion()) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const context = gsap.context(() => {
      gsap.fromTo(
        inner,
        { yPercent: -strength },
        {
          yPercent: strength,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: frame,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      )
    }, frame)

    return () => context.revert()
  }, [strength])

  /**
   * `relative` is only a fallback. Callers that pass `absolute` / `fixed` must
   * win: without this guard both classes are emitted and the stylesheet order
   * makes `relative` win, collapsing the frame to zero height and hiding the
   * decorative plate.
   */
  const hasOwnPosition = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className ?? '')

  return (
    <div ref={frameRef} className={cn(hasOwnPosition ? 'overflow-hidden' : 'relative overflow-hidden', className)}>
      <div ref={innerRef} className="h-full w-full will-change-transform">
        {children}
      </div>
    </div>
  )
}
