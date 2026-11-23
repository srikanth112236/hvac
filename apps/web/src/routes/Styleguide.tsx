import { Link } from 'react-router-dom'
import { useBrand } from '@/brand/BrandProvider'
import { Badge } from '@/components/ui'
import { useTheme, type Theme } from '@/theme/ThemeProvider'
import { useSeo } from '@/lib/seo'
import { cn } from '@/lib/cn'
import { Foundations } from './styleguide/Foundations'
import { Iconography } from './styleguide/Iconography'
import { Actions, Forms } from './styleguide/Components'
import { DataDisplay, Disclosure } from './styleguide/DataSections'
import { MotionLab } from './styleguide/MotionLab'
import { Guardrails } from './styleguide/Guardrails'

const sections = [
  { id: 'foundations', index: '01', label: 'Foundations' },
  { id: 'typography', index: '02', label: 'Typography' },
  { id: 'icons', index: '03', label: 'Iconography' },
  { id: 'actions', index: '04', label: 'Actions' },
  { id: 'forms', index: '05', label: 'Forms' },
  { id: 'data', index: '06', label: 'Data display' },
  { id: 'disclosure', index: '07', label: 'Disclosure' },
  { id: 'motion', index: '08', label: 'Motion' },
  { id: 'guardrails', index: '09', label: 'Guardrails' },
]

const variants: { id: Theme; label: string }[] = [
  { id: 'foundry', label: 'Foundry' },
  { id: 'atelier', label: 'Atelier' },
]

export function Styleguide() {
  useSeo({ path: '/__styleguide', title: 'Design system', noindex: true })
  const { theme, setTheme } = useTheme()
  const brand = useBrand()

  return (
    <div className="min-h-[100svh]">
      <header className="sticky top-0 z-[var(--z-nav)] border-b border-line bg-base/90 backdrop-blur-md">
        <div className="shell flex h-[var(--header-h)] items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center border border-line-strong/80 font-mono text-[11px] text-cold">
              {brand.monogram}
            </span>
            <span className="hidden flex-col sm:flex">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg">
                {brand.shortName} — Design system
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-faint">
                Phase 01 · internal
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center border border-line p-0.5">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setTheme(variant.id)}
                  aria-pressed={theme === variant.id}
                  className={cn(
                    'h-7 px-3 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-2',
                    theme === variant.id ? 'bg-cold text-cold-ink' : 'text-fg-dim hover:text-fg',
                  )}
                >
                  {variant.label}
                </button>
              ))}
            </div>
            <Badge tone="cold" dot className="hidden sm:inline-flex">
              {theme}
            </Badge>
          </div>
        </div>

        <nav className="no-scrollbar flex gap-5 overflow-x-auto border-t border-line/70 px-5 py-2.5 lg:hidden">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.12em] text-fg-faint"
            >
              {section.index} {section.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="shell grid gap-12 py-14 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-[calc(var(--header-h)+32px)] flex flex-col gap-8">
            <div>
              <p className="annot mb-4">Contents</p>
              <ol className="flex flex-col">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="group flex items-baseline justify-between gap-3 border-t border-line/70 py-2.5 transition-colors duration-2 hover:text-cold"
                    >
                      <span className="font-mono text-[10px] text-fg-faint">{section.index}</span>
                      <span className="flex-1 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-dim group-hover:text-cold">
                        {section.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>

            <div className="border border-line bg-panel/50 p-4">
              <span className="t-label">Contract</span>
              <p className="mt-2 text-[11px] leading-relaxed text-fg-faint">
                Components read semantic roles only. Variant files assign those roles from
                primitives — nothing else changes.
              </p>
              <div className="thread mt-4" />
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col gap-28 lg:col-span-8 lg:col-start-5">
          <div>
            <p className="annot mb-6">Design system · {theme}</p>
            <h1 className="t-display text-fg">The plate.</h1>
            <p className="t-lead mt-6">
              Every token, component and motion primitive in the Coolvane template. Switch variants
              in the header — nothing in this page changes except the token layer.
            </p>
            <div className="thread mt-8" />
          </div>

          <Foundations />
          <Iconography />
          <Actions />
          <Forms />
          <DataDisplay />
          <Disclosure />
          <MotionLab />
          <Guardrails />
        </main>
      </div>

      <footer className="border-t border-line">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-faint">
            {brand.name} · {brand.legalName}
          </span>
          <Link
            to="/"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-dim transition-colors duration-2 hover:text-cold"
          >
            ← Back to plate
          </Link>
        </div>
      </footer>
    </div>
  )
}
