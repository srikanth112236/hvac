import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { gsap, prefersReducedMotion } from './core'

interface TiltCardProps {
  children: ReactNode
  className?: string
  max?: number
  glare?: boolean
}

/** Perspective tilt with a light sheen that tracks the pointer. */
export function TiltCard({ children, className, max = 6, glare = true }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const sheenRef = useRef<HTMLSpanElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current
    const inner = innerRef.current
    if (!card || !inner || prefersReducedMotion() || event.pointerType !== 'mouse') return

    const rect = card.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height

    gsap.to(inner, {
      rotateY: (px - 0.5) * max * 2,
      rotateX: -(py - 0.5) * max * 2,
      duration: 0.5,
      ease: 'power2.out',
      transformPerspective: 900,
    })
    if (sheenRef.current) {
      sheenRef.current.style.background = `radial-gradient(320px circle at ${px * 100}% ${py * 100}%, rgb(var(--cold) / 0.12), transparent 65%)`
      sheenRef.current.style.opacity = '1'
    }
  }

  const reset = () => {
    if (innerRef.current) {
      gsap.to(innerRef.current, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'power3.out' })
    }
    if (sheenRef.current) sheenRef.current.style.opacity = '0'
  }

  return (
    <div ref={cardRef} onPointerMove={onPointerMove} onPointerLeave={reset} className={cn('[perspective:900px]', className)}>
      <div ref={innerRef} className="relative will-change-transform [transform-style:preserve-3d]">
        {children}
        {glare ? (
          <span
            ref={sheenRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-3"
          />
        ) : null}
      </div>
    </div>
  )
}
