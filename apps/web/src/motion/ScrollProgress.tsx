import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

interface ScrollProgressProps {
  className?: string
  withLabel?: boolean
}

/** Hairline read-out of page progress. One rAF, no layout thrash. */
export function ScrollProgress({ className, withLabel }: ScrollProgressProps) {
  const barRef = useRef<HTMLSpanElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`
      if (labelRef.current) {
        labelRef.current.textContent = `${String(Math.round(progress * 100)).padStart(2, '0')}%`
      }
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className={cn('pointer-events-none fixed inset-x-0 top-0 z-[var(--z-nav)]', className)}>
      <span ref={barRef} className="block h-px origin-left bg-cold" style={{ transform: 'scaleX(0)' }} />
      {withLabel ? (
        <span
          ref={labelRef}
          className="absolute right-4 top-2 font-mono text-[9px] tracking-[0.16em] text-fg-faint"
        >
          00%
        </span>
      ) : null}
    </div>
  )
}
