import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/icons'
import { useTheme } from '@/theme/ThemeProvider'

/* -------------------------------------------------------------------------- */
/*  Section header                                                            */
/* -------------------------------------------------------------------------- */

interface SectionHeaderProps {
  index?: string
  label?: string
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
  id?: string
}

export function SectionHeader({
  index,
  label,
  title,
  description,
  action,
  size = 'md',
  className,
  id,
}: SectionHeaderProps) {
  const { theme } = useTheme()
  const titleClass = size === 'lg' ? 't-h1' : size === 'sm' ? 't-h3' : 't-h2'

  return (
    <header id={id} className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {index ? (
            <>
              <span className="t-num text-[11px] text-cold">{index}</span>
              <span aria-hidden className="h-px w-7 bg-line-strong/70" />
            </>
          ) : null}
          {label ? <span className="t-label">{label}</span> : null}
        </div>
        {action}
      </div>

      <div className="rule-ticks" />

      <div
        className={cn(
          'grid gap-6',
          theme === 'foundry' ? 'md:grid-cols-12 md:items-end' : 'md:grid-cols-12 md:items-start',
        )}
      >
        <h2 className={cn(titleClass, theme === 'foundry' ? 'md:col-span-8' : 'md:col-span-7')}>
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              'max-w-prose text-sm leading-relaxed text-fg-dim',
              theme === 'foundry' ? 'md:col-span-4 md:col-start-9' : 'md:col-span-4 md:col-start-9 md:pt-2',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
    </header>
  )
}

/* -------------------------------------------------------------------------- */
/*  Tabs                                                                      */
/* -------------------------------------------------------------------------- */

export interface TabItem {
  id: string
  label: string
  disabled?: boolean
  count?: number
}

interface TabsProps {
  tabs: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
  ariaLabel?: string
}

export function Tabs({ tabs, value, onChange, className, ariaLabel }: TabsProps) {
  const layoutId = useId()
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex items-center gap-6 border-b border-line', className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative -mb-px flex items-center gap-2 pb-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors duration-2 disabled:cursor-not-allowed disabled:opacity-35',
              active ? 'text-fg' : 'text-fg-faint hover:text-fg-dim',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span className="t-num text-[10px] text-fg-faint">{tab.count}</span>
            ) : null}
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-0 bottom-0 h-px bg-cold"
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Accordion                                                                 */
/* -------------------------------------------------------------------------- */

export interface AccordionItem {
  id: string
  title: ReactNode
  content: ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  defaultOpen?: string | null
  className?: string
  allowMultiple?: boolean
}

export function Accordion({ items, defaultOpen = null, className, allowMultiple }: AccordionProps) {
  const [open, setOpen] = useState<string[]>(defaultOpen ? [defaultOpen] : [])

  const toggle = (id: string) => {
    setOpen((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      return allowMultiple ? [...current, id] : [id]
    })
  }

  return (
    <div className={cn('border-t border-line', className)}>
      {items.map((item) => {
        const expanded = open.includes(item.id)
        return (
          <div key={item.id} className="border-b border-line">
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`${item.id}-panel`}
                id={`${item.id}-trigger`}
                onClick={() => toggle(item.id)}
                className="group flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="t-h4 text-fg transition-colors duration-2 group-hover:text-cold">
                  {item.title}
                </span>
                <Icon
                  name="plus"
                  size={16}
                  className={cn(
                    'shrink-0 text-fg-faint transition-transform duration-3 ease-mech group-hover:text-cold',
                    expanded && 'rotate-45',
                  )}
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  id={`${item.id}-panel`}
                  role="region"
                  aria-labelledby={`${item.id}-trigger`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="max-w-prose pb-6 text-sm leading-relaxed text-fg-dim">
                    {item.content}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
