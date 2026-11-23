import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '@/components/icons'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface StyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
  className?: string
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-[var(--btn-h-sm)] px-4 text-[10px] gap-2',
  md: 'h-[var(--btn-h-md)] px-6 text-[11px] gap-2.5',
  lg: 'h-[var(--btn-h-lg)] px-8 text-[11px] gap-3',
}

const base =
  'group relative inline-flex select-none items-center justify-center overflow-hidden rounded-[var(--radius-control)] border font-mono font-medium uppercase tracking-[0.14em] transition-colors duration-2 ease-mech disabled:cursor-not-allowed disabled:opacity-40'

const variants: Record<ButtonVariant, string> = {
  primary: 'border-cold text-cold-ink',
  secondary:
    'border-line bg-panel text-fg hover:border-cold/70 hover:text-cold focus-visible:border-cold',
  ghost: 'border-transparent text-fg hover:text-cold',
  quiet: 'border-transparent text-fg-dim hover:text-fg',
  danger: 'border-danger/50 text-danger hover:border-danger hover:bg-danger/10',
}

export function buttonClasses({ variant = 'primary', size = 'md', full, className }: StyleOptions = {}) {
  return cn(base, sizeClasses[size], variants[variant], full && 'w-full', className)
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleOptions {
  icon?: IconName
  iconPosition?: 'left' | 'right'
  loading?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', full, icon, iconPosition = 'right', loading, className, children, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, full, className })}
      {...rest}
    >
      {variant === 'primary' ? <PrimaryFill /> : null}
      {loading ? (
        <span
          aria-hidden
          className="relative h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
        />
      ) : icon && iconPosition === 'left' ? (
        <Icon name={icon} size={size === 'lg' ? 16 : 14} />
      ) : null}
      <span className="relative">{children}</span>
      {!loading && icon && iconPosition === 'right' ? (
        <Icon
          name={icon}
          size={size === 'lg' ? 16 : 14}
          className="relative transition-transform duration-3 ease-mech group-hover:translate-x-0.5"
        />
      ) : null}
    </button>
  )
})

/** Two stacked fills: cold slides out, heat slides in on hover. */
function PrimaryFill() {
  return (
    <>
      <span
        aria-hidden
        className="absolute inset-0 bg-cold transition-transform duration-5 ease-mech group-hover:translate-y-full"
      />
      <span
        aria-hidden
        className="absolute inset-0 -translate-y-full bg-heat transition-transform duration-5 ease-mech group-hover:translate-y-0"
      />
    </>
  )
}

interface ButtonLinkProps extends LinkProps, StyleOptions {
  icon?: IconName
}

export function ButtonLink({
  to,
  variant = 'primary',
  size,
  full,
  icon,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link to={to} className={buttonClasses({ variant, size, full, className })} {...rest}>
      {variant === 'primary' ? <PrimaryFill /> : null}
      <span className="relative">{children}</span>
      {icon ? <Icon name={icon} size={14} className="relative" /> : null}
    </Link>
  )
}

interface ButtonAnchorProps extends React.AnchorHTMLAttributes<HTMLAnchorElement>, StyleOptions {
  icon?: IconName
}

export function ButtonAnchor({
  href,
  variant = 'primary',
  size,
  full,
  icon,
  className,
  children,
  ...rest
}: ButtonAnchorProps) {
  return (
    <a href={href} className={buttonClasses({ variant, size, full, className })} {...rest}>
      {variant === 'primary' ? <PrimaryFill /> : null}
      <span className="relative">{children}</span>
      {icon ? <Icon name={icon} size={14} className="relative" /> : null}
    </a>
  )
}
