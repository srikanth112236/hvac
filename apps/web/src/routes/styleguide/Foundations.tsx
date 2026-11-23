import { useEffect, useState } from 'react'
import { SectionHeader } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'
import { cn } from '@/lib/cn'

/* -------------------------------------------------------------------------- */
/*  Token read-out                                                            */
/* -------------------------------------------------------------------------- */

function useTokenValue(token: string): string {
  const { theme } = useTheme()
  const [value, setValue] = useState('')

  useEffect(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim()
    setValue(raw ? `rgb(${raw})` : '')
  }, [token, theme])

  return value
}

function Swatch({
  token,
  label,
  kind = 'fill',
}: {
  token: string
  label: string
  kind?: 'fill' | 'text'
}) {
  const value = useTokenValue(token)

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        className={cn(
          'flex h-[72px] items-center justify-center border border-line',
          kind === 'text' && 'bg-base',
        )}
        style={kind === 'fill' ? { background: `rgb(var(--${token}))` } : undefined}
      >
        {kind === 'text' ? (
          <span className="text-h3" style={{ color: `rgb(var(--${token}))` }}>
            Aa
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-fg">
          {label}
        </span>
        <span className="shrink-0 font-mono text-[9px] text-fg-faint">--{token}</span>
      </div>
      <span className="truncate font-mono text-[9px] text-fg-faint">{value || '—'}</span>
    </div>
  )
}

const tokenGroups = [
  {
    title: 'Surfaces & hairlines',
    tokens: [
      ['base', 'Canvas'],
      ['panel', 'Panel'],
      ['panel-2', 'Panel raised'],
      ['panel-3', 'Panel active'],
      ['line', 'Hairline'],
      ['line-strong', 'Hairline strong'],
      ['ink-block', 'Ink block'],
    ] as const,
  },
  {
    title: 'Text',
    tokens: [
      ['fg', 'Primary'],
      ['fg-dim', 'Secondary'],
      ['fg-faint', 'Tertiary'],
      ['on-ink', 'On ink block'],
    ] as const,
  },
  {
    title: 'Accents & signals',
    tokens: [
      ['cold', 'Cold / primary'],
      ['heat', 'Heat / emergency'],
      ['success', 'Success'],
      ['warn', 'Warning'],
      ['danger', 'Danger'],
      ['focus', 'Focus ring'],
    ] as const,
  },
]

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

export function Foundations() {
  const { theme } = useTheme()

  return (
    <>
      <section id="foundations" className="flex flex-col gap-10 scroll-mt-28">
        <SectionHeader
          index="01"
          label="Foundations"
          title="Three layers, one contract."
          description="Primitives hold raw values. The variant file assigns them to semantic roles. Components only ever consume roles — which is why the variant switch is a token swap, not a redesign."
        />

        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              index: 'L1',
              title: 'Primitives',
              body: 'Raw palette, 8px spacing, radii, easings and fluid type steps. Brand-neutral.',
              items: ['--raw-ink-950', '--space-4', '--radius-xs', '--ease-mech'],
            },
            {
              index: 'L2',
              title: 'Semantic',
              body: 'Roles shared by both variants: shell width, section rhythm, hairlines, focus geometry.',
              items: ['--shell-max', '--section-y', '--hairline', '--focus-width'],
            },
            {
              index: 'L3',
              title: 'Variant',
              body: `${theme === 'foundry' ? 'Foundry' : 'Atelier'} assigns colour, typeface, leading and geometry to those roles.`,
              items: ['--base', '--cold', '--font-display', '--lh-h1'],
            },
          ].map((layer) => (
            <div key={layer.index} className="marks flex flex-col gap-3 border border-line bg-panel/50 p-5">
              <div className="flex items-center justify-between">
                <span className="t-num text-[10px] text-cold">{layer.index}</span>
                <span className="t-label">{layer.title}</span>
              </div>
              <p className="text-[12px] leading-relaxed text-fg-dim">{layer.body}</p>
              <div className="mt-2 flex flex-col gap-1 border-t border-line/70 pt-3">
                {layer.items.map((item) => (
                  <span key={item} className="font-mono text-[10px] text-fg-faint">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {tokenGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="t-label">{group.title}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                {group.tokens.length} tokens
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {group.tokens.map(([token, label]) => (
                <Swatch
                  key={token}
                  token={token}
                  label={label}
                  kind={group.title === 'Text' ? 'text' : 'fill'}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-4">
          <span className="t-label">Drawn details</span>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="marks border border-line bg-panel/50 p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-faint">
                Heat / cold thread
              </span>
              <div className="thread mt-6" />
              <div className="rule-ticks mt-8" />
              <p className="mt-6 text-[12px] leading-relaxed text-fg-dim">
                One signature gradient rule. It appears in the hero, between major sections, and
                under active navigation — never as a decorative gradient fill.
              </p>
            </div>

            <div className="marks border border-line bg-panel/50 p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-faint">
                Annotation label
              </span>
              <div className="mt-6 flex flex-col gap-3">
                <span className="annot">Condenser · 320 TR</span>
                <span className="annot">Refrigerant R-32</span>
                <span className="annot">Static pressure 42 Pa</span>
              </div>
              <p className="mt-6 text-[12px] leading-relaxed text-fg-dim">
                Mono, uppercase, leader line. Used to label equipment in photography and to mark
                drawing coordinates. Tokens: <span className="font-mono">--text-micro</span>,{' '}
                <span className="font-mono">--cold</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['Radius control', '--radius-control'],
            ['Radius panel', '--radius-panel'],
            ['Focus ring', '--focus-width'],
          ].map(([label, token]) => (
            <div key={label} className="flex items-center justify-between border border-line px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim">
                {label}
              </span>
              <span className="font-mono text-[10px] text-fg-faint">{token}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section id="typography" className="flex flex-col gap-8 scroll-mt-28">
        <SectionHeader
          index="02"
          label="Typography"
          title="Engineered copy, drawn type."
          description="Each step has its own leading and tracking token, so a single class carries the variant's voice. Numbers are always mono and tabular."
        />

        <div className="flex flex-col">
          {[
            {
              token: '--text-display',
              cls: 't-display',
              sample: 'Chilled water, 6.5 °C.',
              note: 'Hero statement · one per page',
            },
            {
              token: '--text-h1',
              cls: 't-h1',
              sample: 'VRF design for a fourteen-floor office.',
              note: 'Page title',
            },
            {
              token: '--text-h2',
              cls: 't-h2',
              sample: 'Ductwork that fits the ceiling void.',
              note: 'Section title',
            },
            {
              token: '--text-h3',
              cls: 't-h3',
              sample: 'Refrigerant recovery and brazing.',
              note: 'Block title',
            },
            {
              token: '--text-h4',
              cls: 't-h4',
              sample: 'What is not included',
              note: 'Card / panel title',
            },
            {
              token: '--text-lead',
              cls: 't-lead',
              sample:
                'We publish tonnage, static pressure and commissioning figures. If a number is missing, ask for it before signing.',
              note: 'Intro paragraph · 62ch measure',
            },
            {
              token: '--text-body',
              cls: 't-body max-w-prose',
              sample:
                'A 3.5 TR inverter split holds setpoint at 24 °C with 55% RH in a 420 sq ft west-facing room. The unit is selected on sensible load, not floor area alone, because glazing and occupancy move the number by 30%.',
              note: 'Body copy',
            },
          ].map((row) => (
            <div key={row.token} className="grid gap-4 border-t border-line py-7 md:grid-cols-12">
              <div className="md:col-span-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg">
                  {row.token}
                </span>
                <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-fg-faint">{row.note}</p>
              </div>
              <div className="md:col-span-9">
                <p className={cn(row.cls, 'text-fg')}>{row.sample}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-line bg-panel/50 p-5">
            <span className="t-label">Utility roles</span>
            <div className="mt-4 flex flex-col gap-4">
              <span className="t-label">LABEL · MONO · 0.14EM</span>
              <span className="t-small">
                Small print sits at 13px with 1.55 leading, secondary ink.
              </span>
              <span className="t-num text-h3 text-fg">18,600 TR</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-faint">
                SERIAL · CV-AMC-2026-0041
              </span>
            </div>
          </div>
          <div className="marks border border-line bg-panel/50 p-5">
            <span className="t-label">Faces</span>
            <div className="mt-4 flex flex-col gap-3">
              {[
                ['Display', 'var(--font-display)', 'var(--display-weight)'],
                ['Body', 'var(--font-body)', '400 / 500 / 700'],
                ['Data', 'var(--font-mono)', '400 / 500'],
              ].map(([role, family, weight]) => (
                <div key={role} className="border-t border-line/70 pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim">
                      {role}
                    </span>
                    <span className="font-mono text-[9px] text-fg-faint">{weight}</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-fg-faint">{family}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section id="spacing" className="flex flex-col gap-8 scroll-mt-28">
        <SectionHeader
          index="02b"
          label="Space, radii, motion"
          title="An 8px grid with half-steps."
          description="Spacing is a fixed scale, not arbitrary values. Section rhythm is deliberately uneven: 72 / 128 / 192 by weight."
        />

        <div className="flex flex-col gap-3">
          {[4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192].map((size) => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-14 shrink-0 font-mono text-[10px] tabular-nums text-fg-faint">
                {size}
              </span>
              <span
                className="h-2 bg-cold/70"
                style={{ width: `${Math.min(size, 192)}px` }}
                aria-hidden
              />
              <span className="font-mono text-[9px] text-fg-faint">
                {size % 8 === 0 ? '--space-' + size / 4 : '--space-' + (size / 4).toFixed(0)}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['2px', '--radius-xs'],
            ['3px', '--radius-sm'],
            ['4px', '--radius-md'],
            ['6px', '--radius-lg'],
          ].map(([value, token]) => (
            <div key={token} className="flex flex-col gap-2">
              <div
                className="h-16 border border-line bg-panel-2"
                style={{ borderRadius: `var(${token})` }}
              />
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] text-fg-dim">{value}</span>
                <span className="font-mono text-[9px] text-fg-faint">{token}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            ['--ease-mech', 'Mechanical · expo.out', 'cubic-bezier(0.16, 1, 0.3, 1)'],
            ['--ease-mech-inout', 'Mechanical · power4.inOut', 'cubic-bezier(0.87, 0, 0.13, 1)'],
            ['--ease-soft', 'Calm · power3.out', 'cubic-bezier(0.33, 1, 0.68, 1)'],
          ].map(([token, label, curve]) => (
            <div key={token} className="group border border-line bg-panel/50 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim">
                  {label}
                </span>
                <span className="font-mono text-[9px] text-fg-faint">{token}</span>
              </div>
              <div className="relative mt-5 h-2 bg-line/50">
                <span
                  className="absolute left-0 top-1/2 block h-3 w-3 -translate-y-1/2 rounded-full bg-cold transition-transform duration-6 group-hover:translate-x-[calc(100%-12px)]"
                  style={{ transitionTimingFunction: `var(${token})` }}
                />
              </div>
              <span className="mt-3 block font-mono text-[9px] text-fg-faint">{curve}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
