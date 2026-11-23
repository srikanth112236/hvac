import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MEDIA_MAX_BYTES,
  MEDIA_MAX_FILES,
  mediaBytesLabel,
  mediaFolder,
  type SiteMediaAsset,
} from '@hvac/shared'
import { Icon } from '@/components/icons'
import { Button, Input, Modal, Select } from '@/components/ui'
import { cn } from '@/lib/cn'
import { adminApi, ApiError } from '@/admin/api'
import { InlineError } from '@/admin/ui'

interface MediaPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (asset: SiteMediaAsset) => void
  defaultFolder?: string
  title?: string
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  defaultFolder = 'general',
  title = 'Choose an image',
}: MediaPickerProps) {
  const [assets, setAssets] = useState<SiteMediaAsset[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [folder, setFolder] = useState(mediaFolder(defaultFolder))
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await adminApi.media(filter === 'all' ? '' : filter)
      setAssets(payload.data)
      setFolders(payload.folders)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the media library.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    if (!open) return
    setFolder(mediaFolder(defaultFolder))
    setFilter('all')
    setNotice('')
    setError('')
    setProgress(0)
  }, [defaultFolder, open])

  useEffect(() => {
    if (open) void load()
  }, [load, open])

  const uploadFiles = async (files: File[]) => {
    setError('')
    setNotice('')
    if (!files.length) return
    if (files.length > MEDIA_MAX_FILES) {
      setError(`Choose no more than ${MEDIA_MAX_FILES} images for one upload.`)
      return
    }
    const oversized = files.filter((file) => file.size > MEDIA_MAX_BYTES)
    if (oversized.length) {
      setError(
        `${oversized.map((file) => file.name).join(', ')} exceeds the 5 MB limit. Remove ${
          oversized.length > 1 ? 'those files' : 'that file'
        } and try again.`,
      )
      return
    }
    const unsupported = files.filter((file) => !file.type.startsWith('image/'))
    if (unsupported.length) {
      setError('Only image files can be uploaded.')
      return
    }
    setUploading(true)
    setProgress(1)
    try {
      const payload = await adminApi.uploadMedia(files, folder, '', setProgress)
      setAssets((current) => [...payload.data, ...current])
      setFolders(payload.folders)
      setNotice(
        `${payload.data.length} ${payload.data.length === 1 ? 'image' : 'images'} added to ${folder}.`,
      )
      setProgress(100)
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const visible = useMemo(
    () => (filter === 'all' ? assets : assets.filter((asset) => asset.folder === filter)),
    [assets, filter],
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Upload once, then reuse the image anywhere in the site or CMS. Batch limit: 40 images, 5 MB each."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              Upload folder
            </span>
            <Input
              value={folder}
              onChange={(event) => setFolder(mediaFolder(event.target.value))}
              placeholder="home, services, projects"
              aria-label="Upload folder"
              maxLength={60}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
              Browse library
            </span>
            <Select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter media by folder"
              options={[
                { value: 'all', label: `All folders · ${assets.length}` },
                ...folders.map((name) => ({ value: name, label: name })),
              ]}
            />
          </label>
          <Button
            variant="secondary"
            icon="upload"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            Choose images
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="sr-only"
          aria-label="Upload images"
          onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []))}
        />

        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            void uploadFiles(Array.from(event.dataTransfer.files))
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2 border border-dashed px-4 py-6 text-center transition-colors',
            dragging ? 'border-cold bg-cold/[0.06]' : 'border-line-strong bg-base/30',
          )}
        >
          <Icon name="upload" size={20} className="text-cold" />
          <p className="text-[12px] text-fg-dim">
            Drop images here, or{' '}
            <button
              type="button"
              className="text-cold underline underline-offset-2 hover:text-fg"
              onClick={() => inputRef.current?.click()}
            >
              browse files
            </button>
            .
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
            JPEG · PNG · WebP · GIF · AVIF · up to 40 files / 5 MB each
          </p>
        </div>

        <div aria-live="polite" className="min-h-[1px]">
          {uploading ? (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
                <span>Uploading to {folder}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden bg-line">
                <div
                  className="h-full bg-cold transition-[width] duration-2"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
          {notice ? <p className="text-[12px] text-success">{notice}</p> : null}
        </div>

        {error ? <InlineError message={error} /> : null}

        <div className="border-t border-line pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
              {filter === 'all' ? 'All images' : filter} · {visible.length}
            </h3>
            <span className="font-mono text-[9px] text-fg-faint">Select one to use it</span>
          </div>

          {loading ? (
            <p role="status" className="py-8 text-center text-[12px] text-fg-faint">
              Reading the media library…
            </p>
          ) : visible.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visible.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(asset)}
                    className="group flex w-full flex-col overflow-hidden border border-line bg-base text-left transition-colors hover:border-cold/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cold"
                  >
                    <span className="relative block aspect-[4/3] w-full overflow-hidden bg-panel">
                      <img
                        src={asset.url}
                        alt={asset.alt || asset.originalName}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-4 group-hover:scale-[1.03]"
                      />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5 border-t border-line px-2.5 py-2">
                      <span className="truncate text-[11px] text-fg">{asset.originalName}</span>
                      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                        {asset.folder} · {mediaBytesLabel(asset.size)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border border-line bg-base/40 px-4 py-10 text-center">
              <p className="text-[13px] text-fg">No images in this folder yet.</p>
              <p className="mt-1 text-[11px] text-fg-faint">
                Choose a folder and upload up to 40 images to start the library.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}