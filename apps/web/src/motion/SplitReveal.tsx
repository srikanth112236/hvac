import { useRef, type ElementType } from 'react'
import { gsap, prefersReducedMotion, themeEase, useIsomorphicLayoutEffect } from './core'
import { cn } from '@/lib/cn'

interface SplitRevealProps {
  children: string
  as?: ElementType
  className?: string
  delay?: number
  stagger?: number
  once?: boolean
}

/**
 * Word-level mask reveal. Words are only hidden once JS confirms motion is
 * allowed, so the text is fully readable if animation never runs.
 */
export function SplitReveal({
  children,
  as: Tag = 'div',
  className,
  delay = 0,
  stagger = 0.045,
  once = true,
}: SplitRevealProps) {
  const rootRef = useRef<HTMLElement>(null)

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    if (!root || prefersReducedMotion()) return

    const words = root.querySelectorAll<HTMLElement>('[data-word]')
    if (!words.length) return

    const context = gsap.context(() => {
      gsap.fromTo(
        words,
        { yPercent: 112 },
        {
          yPercent: 0,
          duration: 0.95,
          ease: themeEase(),
          delay,
          stagger,
          scrollTrigger: {
            trigger: root,
            start: 'top 88%',
            once,
          },
        },
      )
    }, root)

    return () => context.revert()
  }, [delay, stagger, once])

  const words = children.trim().split(/\s+/)

  return (
    <Tag ref={rootRef} className={cn('text-balance', className)} aria-label={children}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          aria-hidden
          className="inline-block overflow-hidden pb-[0.08em] align-bottom"
        >
          <span data-word className="mr-[0.24em] inline-block will-change-transform">
            {word}
          </span>
        </span>
      ))}
    </Tag>
  )
}
