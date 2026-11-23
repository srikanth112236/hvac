import { useRef } from 'react'
import { cn } from '@/lib/cn'
import { gsap, prefersReducedMotion, useIsomorphicLayoutEffect } from './core'

interface ParallaxImageProps {
  src?: string
  alt: string
  className?: string
  imgClassName?: string
  caption?: string
  callout?: string
  strength?: number
}

/**
 * Image fills a fixed-ratio frame and drifts within it as you scroll.
 * With no `src` it renders a drawn plate so the system works without assets.
 */
export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
  caption,
  callout,
  strength = 8,
}: ParallaxImageProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useIsomorphicLayoutEffect(() => {
    const frame = frameRef.current
    const image = imageRef.current
    if (!frame || !image || prefersReducedMotion()) return

    const context = gsap.context(() => {
      gsap.fromTo(
        image,
        { yPercent: -strength },
        {
          yPercent: strength,
          ease: 'none',
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

  return (
    <figure className={cn('group relative', className)}>
      <div
        ref={frameRef}
        className="relative aspect-[4/3] w-full overflow-hidden border border-line bg-panel-2"
      >
        {src ? (
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={cn('h-[118%] w-full -translate-y-[8%] object-cover', imgClassName)}
          />
        ) : (
          <PlaceholderPlate label={alt} />
        )}

        {callout ? (
          <span className="absolute bottom-4 left-4 flex items-center gap-2 border border-line bg-base/70 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim backdrop-blur-sm">
            <span className="h-1 w-1 bg-cold" />
            {callout}
          </span>
        ) : null}
        <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-line-strong/70" />
      </div>
      {caption ? (
        <figcaption className="mt-3 flex items-start gap-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
          <span className="mt-1.5 h-px w-5 shrink-0 bg-line-strong" />
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

export function PlaceholderPlate({ label }: { label: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-panel-2">
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgb(var(--cold)/0.10), transparent 45%), linear-gradient(315deg, rgb(var(--heat)/0.10), transparent 50%), repeating-linear-gradient(0deg, rgb(var(--line)/0.55) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgb(var(--line)/0.55) 0 1px, transparent 1px 22px)',
        }}
      />
      <div className="absolute inset-0 flex flex-col justify-between p-5">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-faint">
          Image plate · 4:3
        </span>
        <span className="max-w-[16ch] font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-fg-dim">
          {label}
        </span>
      </div>
    </div>
  )
}
