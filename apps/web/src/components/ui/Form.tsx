import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/icons'
import { DateValueField } from './Picker'

/* -------------------------------------------------------------------------- */
/*  Shared field chrome                                                       */
/* -------------------------------------------------------------------------- */

interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  required?: boolean
  className?: string
  labelAction?: ReactNode
  children: ReactNode
  htmlFor?: string
}

export function Field({ label, hint, error, required, className, labelAction, children, htmlFor }: FieldProps) {
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
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

/* -------------------------------------------------------------------------- */
/*  Text inputs                                                               */
/* -------------------------------------------------------------------------- */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  labelAction?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, labelAction, className, id, required, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  if (rest.type === 'date' || rest.type === 'datetime-local' || rest.type === 'time') {
    const { type, value, defaultValue, ...pickerProps } = rest
    return (
      <DateValueField
        {...pickerProps}
        type={type as 'date' | 'datetime-local' | 'time'}
        label={label}
        hint={hint}
        error={error}
        labelAction={labelAction}
        required={required}
        id={inputId}
        className={className}
        value={typeof value === 'string' ? value : undefined}
        defaultValue={typeof defaultValue === 'string' ? defaultValue : undefined}
      />
    )
  }
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      labelAction={labelAction}
      htmlFor={inputId}
    >
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(controlBase, stateClasses(error), 'h-[var(--btn-h-md)]', className)}
        {...rest}
      />
    </Field>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, required, rows = 4, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        data-lenis-prevent
        aria-invalid={error ? true : undefined}
        className={cn(
          controlBase,
          stateClasses(error),
          'min-h-[112px] resize-y py-3 leading-relaxed [scrollbar-gutter:stable]',
          className,
        )}
        {...rest}
      />
    </Field>
  )
})

export interface TimeSlot {
  value: string
  label: string
  disabled?: boolean
}

interface TimeSlotPickerProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  slots: TimeSlot[]
  value?: string
  onChange?: (value: string) => void
  columns?: 3 | 4
  className?: string
}

export function TimeSlotPicker({
  label,
  hint,
  error,
  slots,
  value,
  onChange,
  columns = 4,
  className,
}: TimeSlotPickerProps) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <div
        role="radiogroup"
        aria-label={typeof label === 'string' ? label : undefined}
        className={cn('grid gap-2', columns === 4 ? 'grid-cols-2 xs:grid-cols-4' : 'grid-cols-3')}
      >
        {slots.map((slot) => {
          const selected = value === slot.value
          return (
            <button
              key={slot.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={slot.disabled}
              onClick={() => onChange?.(slot.value)}
              className={cn(
                'h-10 rounded-[var(--radius-control)] border font-mono text-[11px] tabular-nums tracking-[0.06em] transition-colors duration-2 ease-mech disabled:cursor-not-allowed disabled:border-line/60 disabled:text-fg-faint/40 disabled:line-through',
                selected
                  ? 'border-cold bg-cold/10 text-cold'
                  : 'border-line bg-panel-2 text-fg-dim hover:border-line-strong hover:text-fg',
              )}
            >
              {slot.label}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

/* -------------------------------------------------------------------------- */
/*  Choice controls                                                           */
/* -------------------------------------------------------------------------- */

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  description?: ReactNode
}

export function Checkbox({ label, description, className, id, ...rest }: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <label htmlFor={inputId} className={cn('group flex cursor-pointer items-start gap-3', className)}>
      <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[2px] border border-line bg-panel-2 transition-colors duration-2 has-[:checked]:border-cold has-[:checked]:bg-cold has-[:focus-visible]:shadow-[0_0_0_3px_rgb(var(--cold)/0.18)] has-[:disabled]:opacity-40">
        <input
          id={inputId}
          type="checkbox"
          className="peer absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <Icon
          name="check"
          size={11}
          strokeWidth={2.4}
          className="text-cold-ink opacity-0 transition-opacity duration-2 peer-checked:opacity-100"
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm leading-snug text-fg">{label}</span>
        {description ? (
          <span className="text-[11px] leading-snug text-fg-faint">{description}</span>
        ) : null}
      </span>
    </label>
  )
}

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  description?: ReactNode
}

export function Radio({ label, description, className, id, ...rest }: RadioProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <label htmlFor={inputId} className={cn('group flex cursor-pointer items-start gap-3', className)}>
      <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-line bg-panel-2 transition-colors duration-2 has-[:checked]:border-cold has-[:focus-visible]:shadow-[0_0_0_3px_rgb(var(--cold)/0.18)] has-[:disabled]:opacity-40">
        <input
          id={inputId}
          type="radio"
          className="peer absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <span className="h-[7px] w-[7px] rounded-full bg-cold opacity-0 transition-opacity duration-2 peer-checked:opacity-100" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm leading-snug text-fg">{label}</span>
        {description ? (
          <span className="text-[11px] leading-snug text-fg-faint">{description}</span>
        ) : null}
      </span>
    </label>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}

export function Toggle({ checked, onChange, label, description, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'group flex w-full items-center justify-between gap-4 text-left disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm leading-snug text-fg">{label}</span>
        {description ? (
          <span className="text-[11px] leading-snug text-fg-faint">{description}</span>
        ) : null}
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-3 ease-mech',
          checked ? 'border-cold bg-cold/25' : 'border-line bg-panel-2 group-hover:border-line-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all duration-3 ease-mech',
            checked ? 'left-[22px] bg-cold' : 'left-[3px] bg-fg-faint',
          )}
        />
      </span>
    </button>
  )
}
