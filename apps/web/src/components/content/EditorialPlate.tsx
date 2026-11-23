import { cn } from '@/lib/cn'
import type { CSSProperties } from 'react'

interface EditorialPlateProps {
  label: string
  code: string
  tone?: 'cold' | 'heat' | 'neutral'
  className?: string
}

/** A schematic cover plate: no stock photography passed off as a real system. */
export function EditorialPlate({ label, code, tone = 'cold', className }: EditorialPlateProps) {
  const accent = tone === 'heat' ? '--heat' : tone === 'neutral' ? '--fg-dim' : '--cold'

  return (
    <div
      className={cn(
        'relative isolate flex h-full min-h-[150px] flex-col justify-between overflow-hidden border border-line bg-panel-2 p-4',
        className,
      )}
      style={{ '--plate-accent': `var(${accent})` } as CSSProperties}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(circle at 78% 24%, rgb(var(--plate-accent) / 0.22), transparent 42%),
            radial-gradient(circle at 16% 86%, rgb(var(--plate-accent) / 0.1), transparent 46%)`,
        }}
      />
      <div aria-hidden className="scene-grid absolute inset-0 opacity-50" />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ borderColor: 'rgb(var(--plate-accent) / 0.25)' }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed"
        style={{ borderColor: 'rgb(var(--plate-accent) / 0.2)' }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-px w-[78%] -translate-x-1/2"
        style={{ backgroundColor: 'rgb(var(--plate-accent) / 0.4)' }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[66%] w-px -translate-y-1/2"
        style={{ backgroundColor: 'rgb(var(--plate-accent) / 0.4)' }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-fg-faint">{code}</span>
        <span className="h-1.5 w-1.5" style={{ backgroundColor: 'rgb(var(--plate-accent))' }} />
      </div>

      <div className="relative">
        <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-fg-faint">Schematic</span>
        <p className="mt-1 max-w-[22ch] font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-fg">
          {label}
        </p>
      </div>
    </div>
  )
}
