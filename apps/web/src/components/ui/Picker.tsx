import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/icons'

/* -------------------------------------------------------------------------- */
/*  Shared field chrome                                                       */
/* -------------------------------------------------------------------------- */

interface FieldChromeProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  required?: boolean
  labelAction?: ReactNode
  children: ReactNode
  htmlFor?: string
  containerClassName?: string
}

function FieldChrome({
  label,
  hint,
  error,
  required,
  labelAction,
  children,
  htmlFor,
  containerClassName,
}: FieldChromeProps) {
  return (
    <div className={cn('flex w-full flex-col gap-2', containerClassName)}>
      {label || labelAction ? (
        <div className="flex items-baseline justify-between gap-3">
          {label ? (
            <label
              htmlFor={htmlFor}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-dim"
            >
              {label}
              {required ? <span className="ml-1.5 text-heat">*</span> : null}
            </label>
          ) : (
            <span />
          )}
          {labelAction}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-danger">
          <Icon name="alert" size={12} />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] leading-snug text-fg-faint">{hint}</p>
      ) : null}
    </div>
  )
}

const controlBase =
  'w-full rounded-[var(--radius-control)] border bg-panel-2 px-3.5 text-[var(--text-body)] text-fg placeholder:text-fg-faint/70 transition-[border-color,box-shadow] duration-2 ease-mech focus:outline-none focus-visible:outline-none focus:shadow-[0_0_0_3px_rgb(var(--cold)/0.10)]'

function stateClasses(error?: string) {
  return error
    ? 'border-danger/60 hover:border-danger/80 focus:border-danger'
    : 'border-line hover:border-line-strong focus:border-cold'
}

interface PopoverPosition {
  left: number
  top?: number
  bottom?: number
  width: number
  maxHeight: number
}

function usePopover(open: boolean, onClose: () => void) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<PopoverPosition | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const update = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16)
      const below = window.innerHeight - rect.bottom
      const above = below < 360 && rect.top > 340
      const maxHeight = Math.max(180, Math.min(380, above ? rect.top - 16 : below - 16))
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
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return { anchorRef, panelRef, position }
}

/* -------------------------------------------------------------------------- */
/*  Select                                                                    */
/* -------------------------------------------------------------------------- */

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  labelAction?: ReactNode
  options: SelectOption[]
  placeholder?: string
  value?: string | number
  defaultValue?: string | number
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
  className?: string
  containerClassName?: string
  id?: string
  name?: string
  disabled?: boolean
  required?: boolean
  autoFocus?: boolean
  searchable?: boolean
  'aria-label'?: string
  title?: string
  [key: string]: unknown
}

export function Select({
  label,
  hint,
  error,
  labelAction,
  options,
  placeholder = 'Select…',
  value,
  defaultValue,
  onChange,
  className,
  containerClassName,
  id,
  name,
  disabled,
  required,
  autoFocus,
  searchable,
  'aria-label': ariaLabel,
  title,
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const controlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue !== undefined ? String(defaultValue) : '')
  const current = controlled ? String(value ?? '') : internal
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const choose = (option: SelectOption) => {
    if (option.disabled) return
    if (!controlled) setInternal(option.value)
    onChange?.({
      target: { value: option.value, name: name ?? '' },
      currentTarget: { value: option.value, name: name ?? '' },
    } as ChangeEvent<HTMLSelectElement>)
    setOpen(false)
    setQuery('')
  }
  const close = () => {
    setOpen(false)
    setQuery('')
  }
  const { anchorRef, panelRef, position } = usePopover(open, close)
  const selected = options.find((option) => option.value === current)
  const showSearch = searchable ?? options.length > 5
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options
    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(term),
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const selectedIndex = Math.max(
      0,
      filtered.findIndex((option) => option.value === current),
    )
    setActive(selectedIndex)
  }, [open, current, filtered])

  const move = (delta: number) => {
    if (!filtered.length) return
    setActive((index) => {
      let next = index
      for (let step = 0; step < filtered.length; step += 1) {
        next = (next + delta + filtered.length) % filtered.length
        if (!filtered[next]?.disabled) return next
      }
      return index
    })
  }

  return (
    <FieldChrome
      label={label}
      hint={hint}
      error={error}
      required={required}
      labelAction={labelAction}
      htmlFor={selectId}
      containerClassName={containerClassName}
    >
      <input type="hidden" name={name} value={current} readOnly />
      <button
        ref={anchorRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        autoFocus={autoFocus}
        title={title}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (!open) setOpen(true)
            else if (filtered[active]) choose(filtered[active])
          } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            close()
          }
        }}
        className={cn(
          controlBase,
          stateClasses(error),
          'flex h-[var(--btn-h-md)] items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-45',
          className,
        )}
      >
        <span className={cn('min-w-0 truncate', !selected && 'text-fg-faint')}>
          {selected?.label ?? placeholder}
        </span>
        <Icon
          name="chevron-down"
          size={14}
          className={cn('shrink-0 text-fg-faint transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && position
        ? createPortal(
            <div
              ref={panelRef}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  close()
                }
              }}
              style={{
                position: 'fixed',
                left: position.left,
                top: position.top,
                bottom: position.bottom,
                width: position.width,
                maxHeight: position.maxHeight,
                zIndex: 96,
              }}
              className="flex flex-col overflow-hidden border border-line bg-panel shadow-pop"
            >
              {showSearch ? (
                <div className="flex items-center gap-2 border-b border-line px-2 py-2">
                  <Icon name="search" size={13} className="shrink-0 text-fg-faint" />
                  <input
                    autoFocus
                    value={query}
                    aria-label="Search options"
                    placeholder="Search…"
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setActive(0)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        move(1)
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        move(-1)
                      } else if (event.key === 'Enter' && filtered[active]) {
                        event.preventDefault()
                        choose(filtered[active])
                      } else if (event.key === 'Escape') {
                        close()
                      }
                    }}
                    className="h-7 min-w-0 flex-1 bg-transparent text-[11px] text-fg outline-none placeholder:text-fg-faint"
                  />
                </div>
              ) : null}
              <div
                role="listbox"
                aria-label={ariaLabel ?? (typeof label === 'string' ? label : 'Options')}
                data-lenis-prevent
                className="min-h-0 flex-1 overflow-y-auto py-1 [scrollbar-gutter:stable]"
              >
                {filtered.length === 0 ? (
                  <p className="px-3 py-4 text-[11px] text-fg-faint">No matching options.</p>
                ) : (
                  filtered.map((option, index) => (
                    <button
                      key={`${option.value}:${index}`}
                      type="button"
                      role="option"
                      aria-selected={option.value === current}
                      disabled={option.disabled}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(option)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[11px] text-fg-dim transition-colors',
                        index === active && 'bg-cold/[0.06] text-fg',
                        option.value === current && 'text-cold',
                        option.disabled && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {option.value === current ? <Icon name="check" size={12} /> : null}
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </FieldChrome>
  )
}

/* -------------------------------------------------------------------------- */
/*  Date, time and date-time picker                                            */
/* -------------------------------------------------------------------------- */

export type DatePickerMode = 'date' | 'datetime-local' | 'time'

interface DateValueFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange'
> {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  labelAction?: ReactNode
  containerClassName?: string
  type?: DatePickerMode
  value?: string
  defaultValue?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

interface DateParts {
  year: number
  month: number
  day: number
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function parseDateValue(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) }
}

function parseTimeValue(value: string): { hour: number; minute: number } | null {
  const match = /T?(\d{2}):(\d{2})/.exec(value) ?? /^(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

function dateKey(parts: DateParts): string {
  return `${parts.year}-${pad(parts.month + 1)}-${pad(parts.day)}`
}

function formatDateDisplay(parts: DateParts): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(parts.year, parts.month, parts.day))
}

function formatDateTimeDisplay(parts: DateParts, time: { hour: number; minute: number }): string {
  return `${formatDateDisplay(parts)} · ${pad(time.hour)}:${pad(time.minute)}`
}

function sameDate(a: Date, parts: DateParts): boolean {
  return a.getFullYear() === parts.year && a.getMonth() === parts.month && a.getDate() === parts.day
}

function compareDate(a: Date, b: Date): number {
  return (
    a.getFullYear() * 10_000 +
    (a.getMonth() + 1) * 100 +
    a.getDate() -
    (b.getFullYear() * 10_000 + (b.getMonth() + 1) * 100 + b.getDate())
  )
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const DateValueField = forwardRef<HTMLInputElement, DateValueFieldProps>(
  function DateValueField(
    {
      label,
      hint,
      error,
      labelAction,
      containerClassName,
      type = 'date',
      value,
      defaultValue,
      onChange,
      className,
      id,
      name,
      disabled,
      required,
      min,
      max,
      placeholder,
      'aria-label': ariaLabel,
    },
    _ref,
  ) {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    const mode = type === 'time' ? 'time' : type === 'datetime-local' ? 'datetime-local' : 'date'
    const raw = value ?? defaultValue ?? ''
    const parsedDate = parseDateValue(raw)
    const parsedTime = parseTimeValue(raw)
    const [open, setOpen] = useState(false)
    const [view, setView] = useState(() => {
      const initial = parsedDate ?? {
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        day: new Date().getDate(),
      }
      return new Date(initial.year, initial.month, 1)
    })
    const [selectedDate, setSelectedDate] = useState<DateParts | null>(parsedDate)
    const [hour, setHour] = useState(parsedTime?.hour ?? 9)
    const [minute, setMinute] = useState(parsedTime?.minute ?? 0)
    const { anchorRef, panelRef, position } = usePopover(open, () => setOpen(false))

    useEffect(() => {
      const nextDate = parseDateValue(raw)
      const nextTime = parseTimeValue(raw)
      if (nextDate) {
        setSelectedDate(nextDate)
        setView(new Date(nextDate.year, nextDate.month, 1))
      }
      if (nextTime) {
        setHour(nextTime.hour)
        setMinute(nextTime.minute)
      }
    }, [raw])

    const minDate = parseDateValue(String(min ?? ''))
    const maxDate = parseDateValue(String(max ?? ''))
    const disabledDate = (date: Date): boolean => {
      if (minDate) {
        const boundary = new Date(minDate.year, minDate.month, minDate.day)
        if (compareDate(date, boundary) < 0) return true
      }
      if (maxDate) {
        const boundary = new Date(maxDate.year, maxDate.month, maxDate.day)
        if (compareDate(date, boundary) > 0) return true
      }
      return false
    }

    const emit = (next: string) => {
      onChange?.({
        target: { value: next, name: name ?? '' },
        currentTarget: { value: next, name: name ?? '' },
      } as ChangeEvent<HTMLInputElement>)
    }

    const chooseDay = (date: Date) => {
      if (disabledDate(date)) return
      const parts = { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() }
      setSelectedDate(parts)
      if (mode === 'date') {
        emit(dateKey(parts))
        setOpen(false)
      }
    }

    const apply = () => {
      if (mode === 'time') {
        emit(`${pad(hour)}:${pad(minute)}`)
        setOpen(false)
        return
      }
      if (!selectedDate) return
      emit(
        mode === 'datetime-local'
          ? `${dateKey(selectedDate)}T${pad(hour)}:${pad(minute)}`
          : dateKey(selectedDate),
      )
      setOpen(false)
    }

    const clear = () => {
      setSelectedDate(null)
      emit('')
      setOpen(false)
    }

    const now = () => {
      const date = new Date()
      const parts = { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() }
      setSelectedDate(parts)
      setHour(date.getHours())
      setMinute(date.getMinutes())
      setView(new Date(parts.year, parts.month, 1))
      if (mode === 'date') {
        emit(dateKey(parts))
        setOpen(false)
      }
    }

    const firstOfMonth = new Date(view.getFullYear(), view.getMonth(), 1)
    const firstCell = new Date(
      view.getFullYear(),
      view.getMonth(),
      1 - ((firstOfMonth.getDay() + 6) % 7),
    )
    const cells = Array.from(
      { length: 42 },
      (_, index) =>
        new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index),
    )

    const display =
      mode === 'time'
        ? parsedTime
          ? `${pad(parsedTime.hour)}:${pad(parsedTime.minute)}`
          : ''
        : parsedDate
          ? mode === 'datetime-local'
            ? formatDateTimeDisplay(parsedDate, parsedTime ?? { hour: 9, minute: 0 })
            : formatDateDisplay(parsedDate)
          : ''

    const defaultPlaceholder =
      mode === 'time'
        ? 'Choose time'
        : mode === 'datetime-local'
          ? 'Choose date & time'
          : 'Choose date'

    return (
      <FieldChrome
        label={label}
        hint={hint}
        error={error}
        required={required}
        labelAction={labelAction}
        htmlFor={fieldId}
        containerClassName={containerClassName}
      >
        <input type="hidden" name={name} value={raw} readOnly />
        <button
          ref={anchorRef}
          id={fieldId}
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          onClick={() => {
            if (mode !== 'time' && !selectedDate) {
              const date = new Date()
              setSelectedDate({
                year: date.getFullYear(),
                month: date.getMonth(),
                day: date.getDate(),
              })
            }
            setOpen((current) => !current)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && open) {
              event.preventDefault()
              event.stopPropagation()
              setOpen(false)
            }
          }}
          className={cn(
            controlBase,
            stateClasses(error),
            'flex h-[var(--btn-h-md)] items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-45',
            className,
          )}
        >
          <span className={cn('min-w-0 truncate', !display && 'text-fg-faint')}>
            {display || placeholder || defaultPlaceholder}
          </span>
          <Icon
            name={mode === 'time' ? 'clock' : 'calendar'}
            size={14}
            className="shrink-0 text-fg-faint"
          />
        </button>

        {open && position
          ? createPortal(
              <div
                ref={panelRef}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    event.stopPropagation()
                    setOpen(false)
                  }
                }}
                style={{
                  position: 'fixed',
                  left: Math.min(
                    position.left,
                    window.innerWidth -
                      Math.min(
                        window.innerWidth - 16,
                        mode === 'datetime-local'
                          ? 480
                          : Math.max(position.width, mode === 'time' ? 260 : 342),
                      ) -
                      8,
                  ),
                  top: position.top,
                  bottom: position.bottom,
                  width: Math.min(
                    window.innerWidth - 16,
                    mode === 'datetime-local'
                      ? 480
                      : Math.max(position.width, mode === 'time' ? 260 : 342),
                  ),
                  maxHeight: position.maxHeight,
                  zIndex: 96,
                }}
                className="overflow-y-auto border border-line bg-panel p-3 shadow-pop [scrollbar-gutter:stable]"
              >
                <div
                  className={
                    mode === 'datetime-local' ? 'grid gap-3 sm:grid-cols-[minmax(0,1fr)_108px]' : ''
                  }
                >
                  {mode !== 'time' ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          aria-label="Previous year"
                          onClick={() =>
                            setView(new Date(view.getFullYear() - 1, view.getMonth(), 1))
                          }
                          className="flex h-7 w-7 items-center justify-center text-fg-faint hover:text-cold"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          aria-label="Previous month"
                          onClick={() =>
                            setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
                          }
                          className="flex h-7 w-7 items-center justify-center text-fg-faint hover:text-cold"
                        >
                          <Icon name="chevron-left" size={14} />
                        </button>
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg">
                          {MONTH_LABELS[view.getMonth()]} {view.getFullYear()}
                        </span>
                        <button
                          type="button"
                          aria-label="Next month"
                          onClick={() =>
                            setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
                          }
                          className="flex h-7 w-7 items-center justify-center text-fg-faint hover:text-cold"
                        >
                          <Icon name="chevron-right" size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Next year"
                          onClick={() =>
                            setView(new Date(view.getFullYear() + 1, view.getMonth(), 1))
                          }
                          className="flex h-7 w-7 items-center justify-center text-fg-faint hover:text-cold"
                        >
                          »
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {WEEKDAY_LABELS.map((day) => (
                          <span
                            key={day}
                            className="flex h-6 items-center justify-center font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint"
                          >
                            {day}
                          </span>
                        ))}
                        {cells.map((date) => {
                          const inMonth = date.getMonth() === view.getMonth()
                          const selected = selectedDate ? sameDate(date, selectedDate) : false
                          const today = sameDate(date, {
                            year: new Date().getFullYear(),
                            month: new Date().getMonth(),
                            day: new Date().getDate(),
                          })
                          return (
                            <button
                              key={date.toISOString()}
                              type="button"
                              aria-label={formatDateDisplay({
                                year: date.getFullYear(),
                                month: date.getMonth(),
                                day: date.getDate(),
                              })}
                              aria-pressed={selected}
                              disabled={disabledDate(date)}
                              onClick={() => chooseDay(date)}
                              className={cn(
                                'flex h-8 items-center justify-center rounded-[2px] font-mono text-[10px] transition-colors',
                                !inMonth && 'text-fg-faint/45',
                                inMonth &&
                                  !selected &&
                                  'text-fg-dim hover:bg-cold/[0.08] hover:text-cold',
                                today && !selected && 'border border-cold/35 text-cold',
                                selected && 'bg-cold text-[rgb(var(--cold-ink))]',
                                disabledDate(date) && 'cursor-not-allowed opacity-25',
                              )}
                            >
                              {date.getDate()}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {mode !== 'date' ? (
                    <div
                      className={cn(
                        'flex flex-col gap-2',
                        mode === 'datetime-local' && 'border-l border-line pl-3',
                        mode === 'time' && '',
                      )}
                    >
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                        Time
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="max-h-[168px] overflow-y-auto border border-line">
                          {Array.from({ length: 24 }, (_, index) => index).map((entry) => (
                            <button
                              key={entry}
                              type="button"
                              aria-label={`Hour ${pad(entry)}`}
                              onClick={() => setHour(entry)}
                              className={cn(
                                'flex h-7 w-full items-center justify-center font-mono text-[10px]',
                                entry === hour
                                  ? 'bg-cold text-[rgb(var(--cold-ink))]'
                                  : 'text-fg-dim hover:bg-cold/[0.08] hover:text-cold',
                              )}
                            >
                              {pad(entry)}
                            </button>
                          ))}
                        </div>
                        <div className="max-h-[168px] overflow-y-auto border border-line">
                          {Array.from({ length: 12 }, (_, index) => index * 5).map((entry) => (
                            <button
                              key={entry}
                              type="button"
                              aria-label={`Minute ${pad(entry)}`}
                              onClick={() => setMinute(entry)}
                              className={cn(
                                'flex h-7 w-full items-center justify-center font-mono text-[10px]',
                                entry === minute
                                  ? 'bg-cold text-[rgb(var(--cold-ink))]'
                                  : 'text-fg-dim hover:bg-cold/[0.08] hover:text-cold',
                              )}
                            >
                              {pad(entry)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={now}
                      className="border border-line px-2 py-1 font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint hover:border-cold/50 hover:text-cold"
                    >
                      Now
                    </button>
                    <button
                      type="button"
                      onClick={clear}
                      className="border border-line px-2 py-1 font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint hover:border-danger/40 hover:text-danger"
                    >
                      Clear
                    </button>
                  </div>
                  {mode !== 'date' ? (
                    <button
                      type="button"
                      onClick={apply}
                      className="border border-cold/50 bg-cold/[0.08] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.06em] text-cold hover:bg-cold/15"
                    >
                      Apply
                    </button>
                  ) : null}
                </div>
              </div>,
              document.body,
            )
          : null}
      </FieldChrome>
    )
  },
)

export function DatePicker(props: Omit<DateValueFieldProps, 'type'>) {
  return <DateValueField {...props} type="date" />
}

export function DateTimePicker(props: Omit<DateValueFieldProps, 'type'>) {
  return <DateValueField {...props} type="datetime-local" />
}
