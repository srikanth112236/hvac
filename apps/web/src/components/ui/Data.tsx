import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '@/components/icons'

/* -------------------------------------------------------------------------- */
/*  Badge                                                                     */
/* -------------------------------------------------------------------------- */

export type BadgeTone = 'neutral' | 'cold' | 'heat' | 'success' | 'warn' | 'danger'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'border-line text-fg-dim',
  cold: 'border-cold/35 text-cold bg-cold/[0.06]',
  heat: 'border-heat/35 text-heat bg-heat/[0.06]',
  success: 'border-success/35 text-success bg-success/[0.06]',
  warn: 'border-warn/35 text-warn bg-warn/[0.06]',
  danger: 'border-danger/40 text-danger bg-danger/[0.06]',
}

const dotTones: Record<BadgeTone, string> = {
  neutral: 'bg-fg-faint',
  cold: 'bg-cold',
  heat: 'bg-heat',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
}

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  dot?: boolean
  className?: string
}

export function Badge({ children, tone = 'neutral', dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border px-2 py-1 font-mono text-[10px] uppercase leading-none tracking-[0.1em]',
        badgeTones[tone],
        className,
      )}
    >
      {dot ? <span className={cn('h-1 w-1 rounded-full', dotTones[tone])} /> : null}
      {children}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Stat                                                                      */
/* -------------------------------------------------------------------------- */

interface StatProps {
  label: string
  value: ReactNode
  unit?: string
  note?: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Stat({ label, value, unit, note, className, size = 'md' }: StatProps) {
  const valueSize = size === 'lg' ? 'text-h2' : size === 'sm' ? 'text-h4' : 'text-h3'
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-faint">
        {label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className={cn('t-num font-medium leading-none text-fg', valueSize)}>{value}</span>
        {unit ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-dim">
            {unit}
          </span>
        ) : null}
      </span>
      {note ? <span className="text-[11px] leading-snug text-fg-faint">{note}</span> : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Table                                                                     */
/* -------------------------------------------------------------------------- */

export interface Column<T> {
  key: string
  header: ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string
  render?: (row: T) => ReactNode
  mono?: boolean
}

export type TableActionTone = 'default' | 'cold' | 'heat' | 'success' | 'danger'

const actionTones: Record<TableActionTone, string> = {
  default: 'text-fg-faint hover:border-line-strong hover:text-fg',
  cold: 'text-fg-faint hover:border-cold/50 hover:text-cold',
  heat: 'text-fg-faint hover:border-heat/50 hover:text-heat',
  success: 'text-fg-faint hover:border-success/50 hover:text-success',
  danger: 'text-fg-faint hover:border-danger/50 hover:text-danger',
}

const actionButtonBase =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center border border-line transition-colors duration-2 disabled:cursor-not-allowed disabled:opacity-40'

export function TableActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-1">{children}</div>
}

export function TableActionButton({
  label,
  icon,
  onClick,
  tone = 'default',
  disabled,
}: {
  label: string
  icon: IconName
  onClick: () => void
  tone?: TableActionTone
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(actionButtonBase, actionTones[tone])}
    >
      <Icon name={icon} size={11} />
    </button>
  )
}

export function TableActionLink({
  to,
  label,
  icon,
  tone = 'default',
  external,
}: {
  to: string
  label: string
  icon: IconName
  tone?: TableActionTone
  external?: boolean
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={cn(actionButtonBase, actionTones[tone])}
    >
      <Icon name={icon} size={11} />
    </Link>
  )
}

interface TableProps<T extends { id: string }> {
  columns: Column<T>[]
  rows: T[]
  caption?: string
  dense?: boolean
  onRowClick?: (row: T) => void
  onRowView?: (row: T) => void
  viewLabel?: (row: T) => string
  className?: string
}

export function Table<T extends { id: string }>({
  columns,
  rows,
  caption,
  dense,
  onRowClick,
  onRowView,
  viewLabel,
  className,
}: TableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto border border-line bg-panel', className)}>
      <table className="w-full border-collapse text-left">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  'px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-fg-faint',
                  column.align === 'right' && 'text-right',
                  column.align === 'center' && 'text-center',
                )}
              >
                {column.header}
              </th>
            ))}
            {onRowView ? (
              <th
                scope="col"
                className="w-11 px-2 py-2.5 text-right font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-fg-faint"
              >
                <span className="sr-only">Details</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-line/70 transition-colors duration-1 last:border-0',
                onRowClick && 'cursor-pointer hover:bg-fg/[0.03]',
              )}
            >
              {columns.map((column) => {
                const raw = (row as Record<string, unknown>)[column.key]
                return (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 align-middle text-[12px] text-fg',
                      dense ? 'py-1.5' : 'py-2.5',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.mono && 't-num text-[12px] text-fg-dim',
                    )}
                  >
                    {column.render ? column.render(row) : (raw as ReactNode)}
                  </td>
                )
              })}
              {onRowView ? (
                <td className={cn('px-4 text-right align-middle', dense ? 'py-1.5' : 'py-2.5')}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onRowView(row)
                    }}
                    aria-label={`View ${viewLabel?.(row) ?? row.id}`}
                    title={`View ${viewLabel?.(row) ?? row.id}`}
                    className="inline-flex h-7 w-7 items-center justify-center border border-line text-fg-faint transition-colors duration-2 hover:border-cold/50 hover:text-cold"
                  >
                    <Icon name="eye" size={13} />
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onRowView ? 1 : 0)}
                className="px-4 py-10 text-center text-sm text-fg-faint"
              >
                No records.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Pagination                                                                */
/* -------------------------------------------------------------------------- */

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange?: (page: number) => void
  className?: string
}

function pageWindow(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages: (number | 'gap')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)
  if (start > 2) pages.push('gap')
  for (let i = start; i <= end; i += 1) pages.push(i)
  if (end < pageCount - 1) pages.push('gap')
  pages.push(pageCount)
  return pages
}

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const cell =
    'flex h-9 min-w-9 items-center justify-center border px-2 font-mono text-[11px] tabular-nums transition-colors duration-2'
  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
        className={cn(
          cell,
          'border-line text-fg-dim hover:border-line-strong hover:text-fg disabled:opacity-30',
        )}
      >
        <Icon name="chevron-left" size={14} />
      </button>
      {pageWindow(page, pageCount).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 font-mono text-[11px] text-fg-faint">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onPageChange?.(item)}
            className={cn(
              cell,
              item === page
                ? 'border-cold bg-cold/10 text-cold'
                : 'border-line text-fg-dim hover:border-line-strong hover:text-fg',
            )}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onPageChange?.(page + 1)}
        className={cn(
          cell,
          'border-line text-fg-dim hover:border-line-strong hover:text-fg disabled:opacity-30',
        )}
      >
        <Icon name="chevron-right" size={14} />
      </button>
    </nav>
  )
}

/* -------------------------------------------------------------------------- */
/*  Breadcrumbs                                                               */
/* -------------------------------------------------------------------------- */

interface BreadcrumbsProps {
  items: { label: string; href?: string }[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-faint">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span className="text-line-strong">/</span> : null}
              {item.href && !last ? (
                <a href={item.href} className="transition-colors duration-2 hover:text-cold">
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={last ? 'text-fg-dim' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* -------------------------------------------------------------------------- */
/*  Empty state + skeleton                                                    */
/* -------------------------------------------------------------------------- */

interface EmptyStateProps {
  icon?: IconName
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon = 'filter',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'marks flex flex-col items-center justify-center gap-4 border border-dashed border-line px-8 py-16 text-center',
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center border border-line text-fg-faint">
        <Icon name={icon} size={20} />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="t-h4 text-fg">{title}</p>
        {description ? (
          <p className="max-w-xs text-[13px] leading-relaxed text-fg-dim">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden className={cn('animate-pulse bg-panel-2', className)} />
}

export function SkeletonBlock({ lines = 3, className }: SkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-3', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}
