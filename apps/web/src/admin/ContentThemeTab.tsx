import { useEffect, useState, type ReactNode } from 'react'
import type { SiteContent, SiteTheme } from '@hvac/shared'
import { Button, Input, Select } from '@/components/ui'
import { Icon } from '@/components/icons'
import { MediaPicker } from '@/admin/MediaPicker'
import type { ContentUpdate } from '@/admin/contentUpdate'
import { useSiteContent } from '@/content/SiteContentProvider'
import { applySiteTheme } from '@/theme/applySiteTheme'

const defaultTheme: SiteTheme = {
  defaultVariant: 'foundry',
  palette: {
    base: '10 13 16',
    panel: '17 22 27',
    panel2: '24 31 38',
    text: '232 237 241',
    muted: '142 154 166',
    faint: '107 119 131',
    line: '38 48 58',
    lineStrong: '51 64 76',
    cold: '94 200 229',
    coldInk: '10 13 16',
    heat: '232 134 58',
    success: '79 191 139',
    warn: '232 179 58',
    danger: '229 88 79',
    accent: '94 200 229',
  },
  buttons: {
    primaryBg: '94 200 229',
    primaryText: '10 13 16',
    secondaryBorder: '51 64 76',
    radius: '2px',
  },
}

const atelierTheme: SiteTheme = {
  defaultVariant: 'atelier',
  palette: {
    base: '245 242 236',
    panel: '255 255 255',
    panel2: '236 232 223',
    text: '18 22 26',
    muted: '84 95 106',
    faint: '104 114 124',
    line: '198 190 174',
    lineStrong: '140 131 116',
    cold: '15 92 102',
    coldInk: '245 242 236',
    heat: '181 86 43',
    success: '47 125 85',
    warn: '160 112 18',
    danger: '176 58 46',
    accent: '15 92 102',
  },
  buttons: {
    primaryBg: '15 92 102',
    primaryText: '245 242 236',
    secondaryBorder: '140 131 116',
    radius: '0px',
  },
}

const themePresets: Record<SiteTheme['defaultVariant'], SiteTheme> = {
  foundry: defaultTheme,
  atelier: atelierTheme,
}

const paletteFields: { key: keyof SiteTheme['palette']; label: string; hint: string }[] = [
  { key: 'base', label: 'Page canvas', hint: 'Page background' },
  { key: 'panel', label: 'Panel', hint: 'Cards and surfaces' },
  { key: 'panel2', label: 'Panel raised', hint: 'Inputs and nested cards' },
  { key: 'text', label: 'Primary text', hint: 'Headings and body' },
  { key: 'muted', label: 'Muted text', hint: 'Supporting copy' },
  { key: 'faint', label: 'Faint text', hint: 'Labels and metadata' },
  { key: 'line', label: 'Border', hint: 'Default rules' },
  { key: 'lineStrong', label: 'Border strong', hint: 'Hover and emphasis' },
  { key: 'cold', label: 'Cold accent', hint: 'Primary actions and links' },
  { key: 'coldInk', label: 'Cold ink', hint: 'Text on cold accent' },
  { key: 'heat', label: 'Heat accent', hint: 'Hover and alert accent' },
  { key: 'success', label: 'Success', hint: 'Confirmed states' },
  { key: 'warn', label: 'Warning', hint: 'Attention states' },
  { key: 'danger', label: 'Danger', hint: 'Errors and destructive actions' },
  { key: 'accent', label: 'Focus ring', hint: 'Keyboard focus outline' },
]

function rgbParts(value: string): [number, number, number] | null {
  const parts = value.trim().split(/\s+/).map(Number)
  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)
  ) {
    return null
  }
  return [Math.round(parts[0]!), Math.round(parts[1]!), Math.round(parts[2]!)]
}

function toHex(value: string): string {
  const parts = rgbParts(value)
  if (!parts) return '#000000'
  return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`
}

function fromHex(value: string): string {
  const clean = value.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(clean)) return '0 0 0'
  const parts = [clean.slice(0, 2), clean.slice(2, 4), clean.slice(4, 6)]
  return parts.map((part) => String(Number.parseInt(part, 16))).join(' ')
}

function Panel({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="border border-line bg-panel/30">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">{title}</h2>
          <p className="mt-1 max-w-[80ch] text-[11px] leading-relaxed text-fg-faint">
            {description}
          </p>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function BrandImageSlot({
  label,
  value,
  hint,
  folder,
  onChange,
  small,
}: {
  label: string
  value: string
  hint: string
  folder: string
  onChange: (value: string) => void
  small?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-3 border border-line bg-base/30 p-3">
      <div>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
          {label}
        </span>
        <p className="mt-1 text-[10px] leading-relaxed text-fg-faint">{hint}</p>
      </div>
      <div
        className={`${small ? 'h-20 w-20' : 'h-24 w-full'} overflow-hidden border border-line bg-panel`}
      >
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-fg-faint">
            <Icon name="image" size={16} />
            <span className="font-mono text-[8px] uppercase tracking-[0.1em]">Not set</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon="image" onClick={() => setOpen(true)}>
          {value ? 'Replace' : 'Choose image'}
        </Button>
        {value ? (
          <Button variant="quiet" size="sm" onClick={() => onChange('')}>
            Remove
          </Button>
        ) : null}
      </div>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        defaultFolder={folder}
        title={`Choose ${label.toLowerCase()}`}
        onSelect={(asset) => {
          onChange(asset.url)
          setOpen(false)
        }}
      />
    </div>
  )
}

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center gap-3 border border-line bg-base/20 p-2.5">
      <input
        type="color"
        aria-label={`${label} colour`}
        value={toHex(value)}
        onChange={(event) => onChange(fromHex(event.target.value))}
        className="h-9 w-9 shrink-0 cursor-pointer border border-line bg-transparent p-0"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
          {label}
        </span>
        <input
          aria-label={`${label} RGB token`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-0.5 block w-full bg-transparent font-mono text-[10px] text-fg outline-none"
        />
        <span className="block text-[9px] text-fg-faint">{hint}</span>
      </span>
    </label>
  )
}

export function ContentThemeTab({ draft, update }: { draft: SiteContent; update: ContentUpdate }) {
  const theme = draft.theme ?? defaultTheme
  const brand = draft.brand
  const logo = brand.logo ?? { mark: '', wordmark: '' }
  const savedTheme = useSiteContent().content.theme

  // Restyling the control room you are editing in is the point: every colour
  // change lands on :root immediately, and leaving the tab restores the
  // published palette until the draft is saved.
  useEffect(() => {
    applySiteTheme(theme)
    return () => applySiteTheme(savedTheme)
  }, [theme, savedTheme])

  const setTheme = (recipe: (current: SiteTheme) => SiteTheme) => {
    update((current) => ({ ...current, theme: recipe(current.theme ?? defaultTheme) }))
  }

  const setPalette = (key: keyof SiteTheme['palette'], value: string) => {
    setTheme((current) => ({ ...current, palette: { ...current.palette, [key]: value } }))
  }

  const setButton = (key: keyof SiteTheme['buttons'], value: string) => {
    setTheme((current) => ({ ...current, buttons: { ...current.buttons, [key]: value } }))
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Logo & favicon"
        description="Upload the production mark and wordmark. A transparent SVG or PNG works best; the fallback monogram stays in place until a logo is selected."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <BrandImageSlot
            label="Logo mark"
            value={logo.mark ?? ''}
            hint="Square or compact mark used in the header and footer."
            folder="brand"
            onChange={(value) =>
              update((current) => ({
                ...current,
                brand: {
                  ...current.brand,
                  logo: { mark: value || null, wordmark: current.brand.logo?.wordmark ?? null },
                },
              }))
            }
          />
          <BrandImageSlot
            label="Wordmark"
            value={logo.wordmark ?? ''}
            hint="Horizontal logo. Replaces the text brand name when set."
            folder="brand"
            onChange={(value) =>
              update((current) => ({
                ...current,
                brand: {
                  ...current.brand,
                  logo: { mark: current.brand.logo?.mark ?? null, wordmark: value || null },
                },
              }))
            }
          />
          <BrandImageSlot
            label="Favicon"
            value={brand.favicon ?? ''}
            hint="Square icon used by browser tabs and bookmarks. 512 × 512 PNG recommended."
            folder="brand"
            onChange={(value) =>
              update((current) => ({
                ...current,
                brand: { ...current.brand, favicon: value },
              }))
            }
            small
          />
          <BrandImageSlot
            label="Social share image"
            value={brand.socialImage ?? ''}
            hint="1200 × 630 image used when a page has no page-specific share image."
            folder="brand"
            onChange={(value) =>
              update((current) => ({
                ...current,
                brand: { ...current.brand, socialImage: value },
              }))
            }
          />
        </div>
      </Panel>

      <Panel
        title="Global theme"
        description="Colour tokens apply to the public site and control room. Values are RGB triplets because the design system renders them with opacity. Selecting a variant loads that palette; adjust the tokens afterwards."
        actions={
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
              Default
            </span>
            <Select
              aria-label="Default public theme"
              className="h-8 w-36"
              value={theme.defaultVariant}
              onChange={(event) => {
                const variant = event.target.value === 'atelier' ? 'atelier' : 'foundry'
                setTheme(() => themePresets[variant])
              }}
              options={[
                { value: 'foundry', label: 'Foundry' },
                { value: 'atelier', label: 'Atelier' },
              ]}
            />
          </div>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {paletteFields.map((field) => (
            <ColorField
              key={field.key}
              label={field.label}
              hint={field.hint}
              value={theme.palette[field.key]}
              onChange={(value) => setPalette(field.key, value)}
            />
          ))}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">Buttons</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ColorField
              label="Primary background"
              hint="Primary button fill"
              value={theme.buttons.primaryBg}
              onChange={(value) => setButton('primaryBg', value)}
            />
            <ColorField
              label="Primary text"
              hint="Label on primary button"
              value={theme.buttons.primaryText}
              onChange={(value) => setButton('primaryText', value)}
            />
            <ColorField
              label="Secondary border"
              hint="Outline button border"
              value={theme.buttons.secondaryBorder}
              onChange={(value) => setButton('secondaryBorder', value)}
            />
            <Input
              label="Corner radius"
              hint="Any CSS length, e.g. 0px or 4px"
              value={theme.buttons.radius}
              onChange={(event) => setButton('radius', event.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
            Preview
          </span>
          <span
            className="flex h-10 items-center px-5 font-mono text-[10px] uppercase tracking-[0.12em]"
            style={{
              background: `rgb(${theme.buttons.primaryBg})`,
              color: `rgb(${theme.buttons.primaryText})`,
              borderRadius: theme.buttons.radius,
            }}
          >
            Primary action
          </span>
          <span
            className="flex h-10 items-center border px-5 font-mono text-[10px] uppercase tracking-[0.12em]"
            style={{
              borderColor: `rgb(${theme.buttons.secondaryBorder})`,
              color: `rgb(${theme.palette.text})`,
              borderRadius: theme.buttons.radius,
            }}
          >
            Secondary
          </span>
          <span
            className="flex h-10 items-center px-5 font-mono text-[10px] uppercase tracking-[0.12em]"
            style={{
              background: `rgb(${theme.palette.heat})`,
              color: `rgb(${theme.palette.coldInk})`,
              borderRadius: theme.buttons.radius,
            }}
          >
            Heat accent
          </span>
        </div>
      </Panel>
    </div>
  )
}
