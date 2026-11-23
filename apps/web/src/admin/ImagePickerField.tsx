import { useState } from 'react'
import type { SiteMediaAsset } from '@hvac/shared'
import { Icon } from '@/components/icons'
import { Button, Input } from '@/components/ui'
import { MediaPicker } from '@/admin/MediaPicker'

/** Reusable CMS image control backed by the shared folder media library. */
export function ImagePickerField({
  label,
  value,
  alt,
  folder,
  onChange,
  hint,
}: {
  label: string
  value?: string
  alt?: string
  folder: string
  onChange: (patch: { image?: string; imageAlt?: string }) => void
  hint?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-3 border border-line bg-base/30 p-3 md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
            {label}
          </span>
          {hint ? <p className="mt-1 text-[10px] leading-relaxed text-fg-faint">{hint}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon="image" onClick={() => setOpen(true)}>
            {value ? 'Replace' : 'Choose image'}
          </Button>
          {value ? (
            <Button
              variant="quiet"
              size="sm"
              onClick={() => onChange({ image: '', imageAlt: '' })}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:items-start">
        <div className="aspect-[4/3] overflow-hidden border border-line bg-panel">
          {value ? (
            <img src={value} alt={alt || 'Selected CMS image'} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-fg-faint">
              <Icon name="image" size={20} />
              <span className="font-mono text-[8px] uppercase tracking-[0.1em]">Not set</span>
            </div>
          )}
        </div>
        <Input
          aria-label={`${label} alt text`}
          placeholder="Alt text for screen readers"
          value={alt ?? ''}
          onChange={(event) => onChange({ imageAlt: event.target.value })}
        />
      </div>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        defaultFolder={folder}
        title={`Choose image · ${label}`}
        onSelect={(asset: SiteMediaAsset) => {
          onChange({ image: asset.url, imageAlt: alt || asset.alt })
          setOpen(false)
        }}
      />
    </div>
  )
}