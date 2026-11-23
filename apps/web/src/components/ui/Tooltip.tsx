import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface TooltipProps {
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

export function Tooltip({ label, children, side = 'top', className }: TooltipProps) {
  const id = useId()
  const [open, setOpen] = useState(false)

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'pointer-events-none absolute left-1/2 z-[var(--z-nav)] w-max max-w-[240px] -translate-x-1/2 border border-line bg-panel-2 px-2.5 py-1.5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-fg-dim shadow-pop',
            side === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]',
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  )
}
