import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import {
  MEDIA_MAX_BYTES,
  MEDIA_MAX_FILES,
  mediaFolder,
  mediaPatchSchema,
  type SiteMediaAsset,
} from '@hvac/shared'
import { requireAdmin, requireAdminMutation, requirePermission } from './auth.js'
import { createStore } from './store.js'

/** One project-level media library shared by the site, CMS and admin tools. */
export const UPLOAD_ROOT = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : path.resolve(process.cwd(), '..', '..', 'uploads')

export const mediaStore = createStore<SiteMediaAsset[]>('media.json', () => [])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEDIA_MAX_BYTES, files: MEDIA_MAX_FILES },
})

/**
 * Trust the bytes, not the browser: the declared MIME and the original file
 * extension are both client-controlled. Only these five signatures are
 * accepted, and the stored extension comes from the signature.
 */
function detectImage(buffer: Buffer): { mime: string; extension: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', extension: '.jpg' }
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: 'image/png', extension: '.png' }
  }
  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString('ascii')
    if (header === 'GIF87a' || header === 'GIF89a') {
      return { mime: 'image/gif', extension: '.gif' }
    }
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', extension: '.webp' }
  }
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii')
    if (brand === 'avif' || brand === 'avis') {
      return { mime: 'image/avif', extension: '.avif' }
    }
  }
  return null
}

function safeOriginalName(name: string): string {
  return Array.from(name)
    .map((character) => {
      const code = character.charCodeAt(0)
      return code < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character
    })
    .join('')
    .slice(0, 180)
}

export const mediaRouter = Router()

mediaRouter.get('/admin/media', requireAdmin, async (req, res) => {
  const folder = typeof req.query.folder === 'string' ? mediaFolder(req.query.folder) : null
  const assets = await mediaStore.read()
  const filtered = folder ? assets.filter((asset) => asset.folder === folder) : assets
  res.json({
    data: [...filtered].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    folders: Array.from(new Set(assets.map((asset) => asset.folder))).sort(),
  })
})

mediaRouter.post(
  '/admin/media',
  requireAdmin,
  requirePermission('content.write'),
  requireAdminMutation,
  upload.array('files', MEDIA_MAX_FILES),
  async (req, res) => {
    const files = (req.files ?? []) as Express.Multer.File[]
    if (!files.length) {
      res.status(400).json({ error: { code: 'no_files', message: 'Choose at least one image.' } })
      return
    }
    if (files.length > MEDIA_MAX_FILES) {
      res.status(400).json({
        error: { code: 'too_many_files', message: `Upload up to ${MEDIA_MAX_FILES} images at a time.` },
      })
      return
    }

    const folder = mediaFolder(req.body?.folder)
    const alt = typeof req.body?.alt === 'string' ? req.body.alt.trim().slice(0, 240) : ''
    const directory = path.join(UPLOAD_ROOT, folder)

    // Validate every file before writing anything. One disguised file rejects
    // the batch instead of leaving half the upload on disk.
    const detected = files.map((file) => ({ file, image: detectImage(file.buffer) }))
    if (detected.some((entry) => !entry.image)) {
      res.status(400).json({
        error: {
          code: 'invalid_image',
          message: 'Only real JPEG, PNG, WebP, GIF or AVIF images are accepted.',
        },
      })
      return
    }
    await mkdir(directory, { recursive: true })

    const created: SiteMediaAsset[] = []
    for (const entry of detected) {
      const image = entry.image
      if (!image) continue
      const file = entry.file
      const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${image.extension}`
      await writeFile(path.join(directory, filename), file.buffer)
      const originalName = safeOriginalName(file.originalname)
      created.push({
        id: randomUUID(),
        folder,
        filename,
        originalName,
        url: `/uploads/${folder}/${filename}`,
        mimeType: image.mime,
        size: file.size,
        alt: alt || originalName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        createdAt: new Date().toISOString(),
      })
    }

    const next = await mediaStore.mutate((assets) => [...created, ...assets])
    res.status(201).json({
      data: created,
      folders: Array.from(new Set(next.map((asset) => asset.folder))).sort(),
    })
  },
)

mediaRouter.patch('/admin/media/:id', requireAdmin, requirePermission('content.write'), requireAdminMutation, async (req, res) => {
  const parsed = mediaPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Invalid media details.' } })
    return
  }
  const current = (await mediaStore.read()).find((asset) => asset.id === req.params.id)
  if (!current) {
    res.status(404).json({ error: { code: 'not_found', message: 'Image not found.' } })
    return
  }
  let updated: SiteMediaAsset | undefined
  await mediaStore.mutate((assets) =>
    assets.map((asset) => {
      if (asset.id !== req.params.id) return asset
      updated = { ...asset, alt: parsed.data.alt }
      return updated
    }),
  )
  if (!updated) {
    res.status(404).json({ error: { code: 'not_found', message: 'Image not found.' } })
    return
  }
  res.json({ data: updated })
})

mediaRouter.delete('/admin/media/:id', requireAdmin, requirePermission('content.write'), requireAdminMutation, async (req, res) => {
  const assets = await mediaStore.read()
  const asset = assets.find((entry) => entry.id === req.params.id)
  if (!asset) {
    res.status(404).json({ error: { code: 'not_found', message: 'Image not found.' } })
    return
  }
  const file = path.resolve(UPLOAD_ROOT, asset.folder, asset.filename)
  if (!file.startsWith(`${path.resolve(UPLOAD_ROOT)}${path.sep}`)) {
    res.status(400).json({ error: { code: 'invalid_path', message: 'Image path is invalid.' } })
    return
  }
  try {
    await unlink(file)
  } catch {
    // The record can still be removed if the file was already cleaned up.
  }
  await mediaStore.mutate((assets) =>
    assets.filter((entry) => entry.id !== asset.id),
  )
  res.json({ data: { deleted: asset.id } })
})