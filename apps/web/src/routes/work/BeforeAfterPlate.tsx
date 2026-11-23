import { useId, useState } from 'react'
import { PlaceholderPlate } from '@/motion'

interface BeforeAfterPlateProps {
  beforeLabel: string
  afterLabel: string
  caption?: string
}

/**
 * Drawn before/after comparison. There is no stock photography in this build,
 * so the two states are schematic plates; the slider still demonstrates the
 * change without pretending to be a site photograph.
 */
export function BeforeAfterPlate({ beforeLabel, afterLabel, caption }: BeforeAfterPlateProps) {
  const id = useId()
  const [value, setValue] = useState(56)

  return (
    <figure>
      <div className="marks relative aspect-[16/10] overflow-hidden border border-line bg-panel-2">
        <div className="absolute inset-0">
          <PlaceholderPlate label={beforeLabel} />
        </div>
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 0 0 ${value}%)` }}
          aria-hidden
        >
          <PlaceholderPlate label={afterLabel} />
        </div>

        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-cold shadow-[0_0_0_1px_rgb(var(--base)/0.5)]"
          style={{ left: `${value}%` }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cold bg-base text-cold"
          style={{ left: `${value}%` }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />
          </svg>
        </span>

        <span className="absolute left-3 top-3 border border-line bg-base/80 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-fg-dim backdrop-blur-sm">
          As found
        </span>
        <span className="absolute right-3 top-3 border border-cold/40 bg-base/80 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-cold backdrop-blur-sm">
          As commissioned
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label
          htmlFor={id}
          className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint"
        >
          Compare
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          aria-valuetext={`${value}% commissioned`}
          className="h-1 min-w-[140px] flex-1 cursor-ew-resize appearance-none rounded-full bg-line accent-[rgb(var(--cold))]"
        />
        <span className="t-num text-[10px] text-fg-dim">{value}%</span>
      </div>

      {caption ? (
        <figcaption className="mt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
