import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ScrollTrigger } from './core'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface StoryStep {
  index: string
  title: string
  body: string
  meta?: string
}

interface PinnedStoryProps {
  eyebrow?: string
  steps: StoryStep[]
  className?: string
  /** Optional scene renderer for the pinned panel; receives the active step. */
  visual?: (step: StoryStep, index: number) => ReactNode
}

/**
 * Sticky-scrubbed narrative: the panel holds while the reader scrolls through
 * the steps, and the progress rule is driven by scroll position.
 */
export function PinnedStory({ eyebrow, steps, className, visual }: PinnedStoryProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(0)
  const current = steps[active] ?? steps[0]

  useScrollSteps(wrapRef, barRef, steps.length, setActive)

  return (
    <>
      <div
        ref={wrapRef}
        className={cn('relative hidden md:block', className)}
        style={{ height: `${Math.max(2, steps.length) * 62}vh` }}
      >
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="shell grid w-full gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            {eyebrow ? <p className="t-label mb-6">{eyebrow}</p> : null}
            <div className="flex items-baseline gap-4">
              <span className="t-num text-[11px] text-cold">
                {steps[active]?.index ?? steps[0]?.index}
              </span>
              <span className="h-px flex-1 bg-line" />
              <span className="t-num text-[11px] text-fg-faint">
                {String(steps.length).padStart(2, '0')}
              </span>
            </div>

            <div className="relative mt-8 h-32 md:h-40">
              <AnimatePresence mode="wait">
                <motion.h3
                  key={active}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="t-h2 absolute inset-0 text-fg"
                >
                  {steps[active]?.title}
                </motion.h3>
              </AnimatePresence>
            </div>

            <div className="relative mt-2 h-24">
              <AnimatePresence mode="wait">
                <motion.p
                  key={active}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 max-w-sm text-sm leading-relaxed text-fg-dim"
                >
                  {steps[active]?.body}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="relative hidden h-[46vh] md:col-span-7 md:col-start-6 md:block">
            <div className="absolute inset-0 border border-line bg-panel/50">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgb(var(--line)/0.5) 0 1px, transparent 1px 44px), repeating-linear-gradient(90deg, rgb(var(--line)/0.5) 0 1px, transparent 1px 44px)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {visual ? (
                  <div className="w-full max-w-xl px-6">
                    {current ? visual(current, active) : null}
                  </div>
                ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, scale: 0.94, rotateX: -12 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                    exit={{ opacity: 0, scale: 0.97, rotateX: 8 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex w-full max-w-md flex-col gap-3 px-8"
                  >
                    {[0, 1, 2].map((layer) => (
                      <div
                        key={layer}
                        className="flex items-center justify-between border border-line/80 bg-panel-2/80 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim"
                        style={{
                          transform: `translateZ(${layer * 10}px) translateY(${layer * 4}px)`,
                          borderColor:
                            layer === active % 3
                              ? 'rgb(var(--cold) / 0.5)'
                              : undefined,
                        }}
                      >
                        <span>{steps[active]?.meta ?? 'Layered system'}</span>
                        <span className="t-num text-fg-faint">
                          {String(layer + 1).padStart(2, '0')}
                        </span>
                      </div>
                    ))}
                    <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-faint">
                      Scroll to advance the sequence
                    </p>
                  </motion.div>
                </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0">
          <span ref={barRef} className="block h-px origin-left bg-cold" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </div>

      <ol className="shell flex flex-col md:hidden">
        {steps.map((step) => (
          <li key={step.index} className="border-t border-line py-6 first:border-t-0">
            <div className="flex items-baseline gap-3">
              <span className="t-num text-[11px] text-cold">{step.index}</span>
              <span className="h-px flex-1 bg-line" />
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                {step.meta}
              </span>
            </div>
            <h3 className="t-h3 mt-3 text-fg">{step.title}</h3>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-dim">{step.body}</p>
          </li>
        ))}
      </ol>
    </>
  )
}

/** Kept separate so the ScrollTrigger lifecycle is obvious and disposable. */
function useScrollSteps(
  wrapRef: React.RefObject<HTMLDivElement>,
  barRef: React.RefObject<HTMLSpanElement>,
  stepCount: number,
  setActive: (index: number) => void,
) {
  const triggerRef = useRef<ScrollTrigger | null>(null)
  const activeRef = useRef(0)

  useEffect(() => {
    const wrap = wrapRef.current
    const bar = barRef.current
    if (!wrap || !bar) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(min-width: 768px)').matches) return

    triggerRef.current = ScrollTrigger.create({
      trigger: wrap,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const next = Math.min(stepCount - 1, Math.floor(self.progress * stepCount))
        if (next !== activeRef.current) {
          activeRef.current = next
          setActive(next)
        }
        bar.style.transform = `scaleX(${self.progress})`
      },
    })

    return () => {
      triggerRef.current?.kill()
      triggerRef.current = null
    }
  }, [wrapRef, barRef, stepCount, setActive])
}
