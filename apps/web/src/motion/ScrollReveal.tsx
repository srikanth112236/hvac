import { useRef, type ElementType, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { gsap, prefersReducedMotion, themeEase, useIsomorphicLayoutEffect } from './core'

interface ScrollRevealProps {
  children: ReactNode
  as?: ElementType
  className?: string
  delay?: number
  distance?: number
  once?: boolean
  id?: string
}

/**
 * Block-level enter animation. Uses gsap.from with immediateRender disabled so
 * a reader without motion, or a background tab that never ticks, still sees the
 * content rather than an invisible section.
 */
export function ScrollReveal({
  children,
  as: Tag = 'div',
  className,
  delay = 0,
  distance = 26,
  once = true,
  id,
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null)

  useIsomorphicLayoutEffect(() => {
    const node = ref.current
    if (!node || prefersReducedMotion()) return

    const context = gsap.context(() => {
      gsap.from(node, {
        y: distance,
        opacity: 0,
        duration: 0.9,
        ease: themeEase(),
        delay,
        immediateRender: false,
        scrollTrigger: { trigger: node, start: 'top 88%', once },
      })
    }, node)

    return () => context.revert()
  }, [delay, distance, once])

  return (
    <Tag ref={ref} id={id} className={cn(className)}>
      {children}
    </Tag>
  )
}
