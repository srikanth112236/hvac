import { useRef } from 'react'
import { cn } from '@/lib/cn'
import { gsap, prefersReducedMotion, useIsomorphicLayoutEffect } from './core'

interface CounterStatProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  duration?: number
}

/** Counts up when the number enters the viewport. Instant under reduced motion. */
export function CounterStat({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  duration = 1.4,
}: CounterStatProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useIsomorphicLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    const format = (input: number) =>
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(input)

    if (prefersReducedMotion()) {
      node.textContent = `${prefix}${format(value)}${suffix}`
      return
    }

    const state = { current: 0 }
    const context = gsap.context(() => {
      gsap.to(state, {
        current: value,
        duration,
        ease: 'power2.out',
        // Do not paint 0 until the trigger actually fires — the rendered value
        // must stay correct for no-JS readers and before the number is reached.
        immediateRender: false,
        scrollTrigger: { trigger: node, start: 'top 92%', once: true },
        onUpdate: () => {
          node.textContent = `${prefix}${format(state.current)}${suffix}`
        },
      })
    }, node)

    return () => context.revert()
  }, [value, decimals, prefix, suffix, duration])

  return (
    <span ref={ref} className={cn('t-num tabular-nums', className)}>
      {prefix}
      {new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value)}
      {suffix}
    </span>
  )
}
