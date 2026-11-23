import { z } from 'zod'

export const MEDIA_MAX_FILES = 40
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024
export const MEDIA_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'] as const

export interface SiteMediaAsset {
  id: string
  folder: string
  filename: string
  originalName: string
  url: string
  mimeType: string
  size: number
  alt: string
  createdAt: string
}

export const mediaPatchSchema = z.object({
  alt: z.string().trim().max(240).default(''),
})

export function mediaFolder(value: unknown): string {
  const raw = typeof value === 'string' ? value : 'general'
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return normalized || 'general'
}

export function mediaBytesLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}