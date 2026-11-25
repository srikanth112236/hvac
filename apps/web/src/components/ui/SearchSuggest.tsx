import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '@/components/icons'
import { Input } from './Form'

export interface SearchSuggestion {
  id: string
  label: string
  value?: string
  description?: string
  meta?: string
  keywords?: string
  icon?: IconName
  disabled?: boolean
}

interface SearchSuggestProps {
  value: string
  onChange: (value: string) => void
  suggestions: SearchSuggestion[]
  onSelect?: (suggestion: SearchSuggestion) => void
  label?: ReactNode
  hint?: ReactNode
  placeholder?: string
  className?: string
  minChars?: number
  maxSuggestions?: number
  emptyMessage?: string
  id?: string
  name?: string
  autoFocus?: boolean
  disabled?: boolean
  required?: boolean
  'aria-label'?: string
}

interface PopoverPosition {
  left: number
  top?: number
  bottom?: number
  width: number
  maxHeight: number
}

function highlight(text: string, term: string): ReactNode {
  if (!term) return text
  const index = text.toLowerCase().indexOf(term.toLowerCase())
  if (index < 0) return text
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-cold/15 text-cold">{text.slice(index, index + term.length)}</mark>
      {text.slice(index + term.length)}
    </>
  )
}

function matches(suggestion: SearchSuggestion, term: string): boolean {
  return [
    suggestion.label,
    suggestion.value,
    suggestion.description,
    suggestion.meta,
    suggestion.keywords,
  ]
    .filter(Boolean)
    .some((entry) => String(entry).toLowerCase().includes(term))
}

/**
 * Text search with a live, keyboard-accessible suggestion panel.
 *
 * Suggestions start at two characters so short queries do not flash a panel,
 * and every row can be clicked or selected with the arrow keys and Enter.
 */
export function SearchSuggest({
  value,
  onChange,
  suggestions,
  onSelect,
  label,
  hint,
  placeholder = 'Search…',
  className,
  minChars = 2,
  maxSuggestions = 8,
  emptyMessage = 'No matching suggestions.',
  id,
  name,
  autoFocus,
  disabled,
  required,
  'aria-label': ariaLabel,
}: SearchSuggestProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listId = `${inputId}-suggestions`
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState<PopoverPosition | null>(null)
  const term = value.trim().toLowerCase()
  const ready = !disabled && term.length >= minChars
  const show = open && ready

  const filtered = useMemo(() => {
    if (!ready) return []
    const seen = new Set<string>()
    return suggestions
      .filter((suggestion) => {
        if (!matches(suggestion, term)) return false
        if (seen.has(suggestion.id)) return false
        seen.add(suggestion.id)
        return true
      })
      .slice(0, maxSuggestions)
  }, [maxSuggestions, ready, suggestions, term])

  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  useEffect(() => {
    if (show) activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [active, show])

  useLayoutEffect(() => {
    if (!show) {
      setPosition(null)
      return
    }
    const update = () => {
      const anchor = inputRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 16)
      const below = window.innerHeight - rect.bottom
      const above = below < 300 && rect.top > 320
      const maxHeight = Math.max(180, Math.min(360, above ? rect.top - 16 : below - 16))
      setPosition({
        left: Math.min(Math.max(8, rect.left), window.innerWidth - width - 8),
        ...(above ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        width,
        maxHeight,
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [show])

  useEffect(() => {
    if (!show) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (inputRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [show])

  const choose = (suggestion: SearchSuggestion) => {
    if (suggestion.disabled) return
    const nextValue = suggestion.value ?? suggestion.label
    setOpen(false)
    setActive(0)
    if (onSelect) onSelect(suggestion)
    else onChange(nextValue)
  }

  const move = (delta: number) => {
    if (!filtered.length) return
    setActive((current) => (current + delta + filtered.length) % filtered.length)
  }

  return (
    <>
      <Input
        ref={inputRef}
        id={inputId}
        name={name}
        label={label}
        hint={hint}
        value={value}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
        disabled={disabled}
        required={required}
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={show ? listId : undefined}
        aria-activedescendant={show && filtered[active] ? `${listId}-option-${active}` : undefined}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null
          if (next && panelRef.current?.contains(next)) return
          setOpen(false)
        }}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            move(1)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
            move(-1)
          } else if (event.key === 'Enter' && show && filtered[active]) {
            event.preventDefault()
            choose(filtered[active])
          } else if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
      />

      {show && position
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: 'fixed',
                left: position.left,
                top: position.top,
                bottom: position.bottom,
                width: position.width,
                maxHeight: position.maxHeight,
                zIndex: 96,
              }}
              className="flex flex-col overflow-hidden rounded-[var(--radius-control)] border border-line bg-panel shadow-pop"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-panel-2/70 px-3 py-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                  Suggestions
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                  {filtered.length} match{filtered.length === 1 ? '' : 'es'}
                </span>
              </div>

              <div
                id={listId}
                role="listbox"
                aria-label={ariaLabel ? `${ariaLabel} suggestions` : 'Search suggestions'}
                data-lenis-prevent
                className="min-h-0 flex-1 overflow-y-auto py-1 [scrollbar-gutter:stable]"
              >
                {filtered.length === 0 ? (
                  <div className="px-3 py-5">
                    <p className="text-[11px] text-fg-dim">{emptyMessage}</p>
                    <p className="mt-1 text-[10px] text-fg-faint">
                      Your text still filters the list. Try a different name, reference or number.
                    </p>
                  </div>
                ) : (
                  filtered.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      id={`${listId}-option-${index}`}
                      ref={index === active ? activeRef : undefined}
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      disabled={suggestion.disabled}
                      onMouseEnter={() => setActive(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(suggestion)}
                      className={cn(
                        'group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-1',
                        index === active && 'bg-cold/[0.07]',
                        suggestion.disabled && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-base/40 text-fg-faint',
                          index === active && 'border-cold/40 text-cold',
                        )}
                      >
                        <Icon name={suggestion.icon ?? 'search'} size={13} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[12px] text-fg">
                            {highlight(suggestion.label, value.trim())}
                          </span>
                          {suggestion.meta ? (
                            <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                              {suggestion.meta}
                            </span>
                          ) : null}
                        </span>
                        {suggestion.description ? (
                          <span className="mt-0.5 block truncate text-[10px] text-fg-faint">
                            {suggestion.description}
                          </span>
                        ) : null}
                      </span>
                      <Icon
                        name="arrow-right"
                        size={11}
                        className={cn(
                          'shrink-0 text-fg-faint opacity-0 transition-opacity',
                          index === active && 'opacity-100',
                        )}
                      />
                    </button>
                  ))
                )}
              </div>

              <div className="hidden shrink-0 items-center justify-between gap-3 border-t border-line bg-base/40 px-3 py-2 sm:flex">
                <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                  <kbd className="border border-line px-1.5 py-0.5">↑</kbd>
                  <kbd className="border border-line px-1.5 py-0.5">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                  <kbd className="border border-line px-1.5 py-0.5">↵</kbd>
                  Select
                </span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
