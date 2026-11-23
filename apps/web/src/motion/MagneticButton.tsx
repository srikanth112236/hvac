import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { gsap, prefersReducedMotion } from './core'

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  strength?: number
}

/** Pointer-following offset, capped so the control never detaches visually. */
export function MagneticButton({ children, className, strength = 0.22 }: MagneticButtonProps) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)

  const onPointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    const wrap = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner || prefersReducedMotion() || event.pointerType !== 'mouse') return
    const rect = wrap.getBoundingClientRect()
    const x = (event.clientX - (rect.left + rect.width / 2)) * strength
    const y = (event.clientY - (rect.top + rect.height / 2)) * strength
    gsap.to(inner, { x, y, duration: 0.5, ease: 'power3.out' })
  }

  const reset = () => {
    if (innerRef.current) {
      gsap.to(innerRef.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' })
    }
  }

  return (
    <span
      ref={wrapRef}
      className={cn('inline-flex', className)}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
    >
      <span ref={innerRef} className="inline-flex will-change-transform">
        {children}
      </span>
    </span>
  )
}
