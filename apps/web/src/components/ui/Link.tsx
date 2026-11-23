import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/icons'

interface TextLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode
  /** Trailing arrow that shifts on hover. */
  arrow?: boolean
  tone?: 'default' | 'cold' | 'dim'
}

const tones = {
  default: 'text-fg',
  cold: 'text-cold',
  dim: 'text-fg-dim hover:text-fg',
}

const underline =
  'relative inline-flex items-center gap-2 transition-colors duration-2 ease-mech after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-4 after:ease-mech hover:after:origin-left hover:after:scale-x-100'

export function TextLink({ children, arrow, tone = 'default', className, ...rest }: TextLinkProps) {
  return (
    <a className={cn(underline, tones[tone], 'hover:text-cold', className)} {...rest}>
      {children}
      {arrow ? <Icon name="arrow-right" size={14} /> : null}
    </a>
  )
}

interface RouterTextLinkProps extends LinkProps {
  children: ReactNode
  arrow?: boolean
  tone?: 'default' | 'cold' | 'dim'
}

export function RouterTextLink({ children, arrow, tone = 'default', className, ...rest }: RouterTextLinkProps) {
  return (
    <Link className={cn(underline, tones[tone], 'hover:text-cold', className)} {...rest}>
      {children}
      {arrow ? <Icon name="arrow-right" size={14} /> : null}
    </Link>
  )
}

/** Mono utility link used in metadata rows and footers. */
export function MetaLink({ children, className, ...rest }: TextLinkProps) {
  return (
    <a
      className={cn(
        'inline-flex items-center gap-2 font-mono text-label uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:text-cold',
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  )
}
