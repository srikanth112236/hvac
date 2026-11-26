import type { Request } from 'express'

/**
 * Opt-in pagination. A request without `page` or `pageSize` keeps the old
 * full-list response, so pickers and exports that need every row are untouched;
 * list screens ask for a page and get counts back in `meta`.
 */
export interface Paging {
  page: number
  pageSize: number
}

export interface PageMeta {
  count: number
  total: number
  page: number
  pageSize: number
  pages: number
}

export function readPaging(req: Request, fallbackSize = 20): Paging | null {
  if (req.query.page === undefined && req.query.pageSize === undefined) return null
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.pageSize ?? fallbackSize), 10) || fallbackSize),
  )
  return { page, pageSize }
}

export function pageMeta(count: number, total: number, paging: Paging): PageMeta {
  return {
    count,
    total,
    page: paging.page,
    pageSize: paging.pageSize,
    pages: Math.max(1, Math.ceil(count / paging.pageSize)),
  }
}

export function slicePage<T>(rows: T[], paging: Paging): T[] {
  const offset = (paging.page - 1) * paging.pageSize
  return rows.slice(offset, offset + paging.pageSize)
}

export function textParam(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
