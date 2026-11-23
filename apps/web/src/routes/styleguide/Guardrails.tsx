import { SectionHeader } from '@/components/ui'
import { Icon } from '@/components/icons'

const banned = [
  'Purple / blue gradient hero blobs, mesh gradients, floating orbs',
  'Centred headline + two buttons + three icon cards',
  'Rows of identical rounded cards with emoji or generic icons',
  'Inter / Roboto / Poppins / Space Grotesk as the primary face',
  '"Cutting-edge", "seamless", "unlock", "elevate", "world-class"',
  'Fake testimonials or invented client logos',
  'Glassmorphism everywhere, shadow-heavy cards, rainbow gradients',
  'Identical spacing and structure repeated down a page',
  'Animation that plays once on load and then nothing',
]

const checklist = [
  ['npm run dev runs web + api together', 'done'],
  ['VITE_THEME flips the whole look without component edits', 'done'],
  ['Styleguide covers states: hover, focus, disabled, error', 'done'],
  ['Motion primitives working with reduced-motion fallbacks', 'done'],
  ['Lighthouse accessibility 95+ on the styleguide', 'not run'],
  ['Zero banned patterns from Section 0.4', 'reviewed'],
] as const

export function Guardrails() {
  return (
    <section id="guardrails" className="flex flex-col gap-8 scroll-mt-28">
      <SectionHeader
        index="09"
        label="Guardrails"
        title="The rules that keep it from drifting."
        description="Paste these back into any later session. The design system is only as good as what it refuses to render."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-line bg-panel/40 p-6">
          <span className="t-label">Banned patterns</span>
          <ul className="mt-4 flex flex-col gap-3">
            {banned.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[12px] leading-relaxed text-fg-dim">
                <Icon name="close" size={12} className="mt-1 shrink-0 text-danger" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-line bg-panel/40 p-6">
          <span className="t-label">Phase 1 acceptance</span>
          <ul className="mt-4 flex flex-col">
            {checklist.map(([item, status]) => (
              <li
                key={item}
                className="flex items-start justify-between gap-3 border-t border-line/70 py-2.5 first:border-t-0 first:pt-0"
              >
                <span className="text-[12px] leading-relaxed text-fg-dim">{item}</span>
                <span
                  className={
                    status === 'done'
                      ? 'shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-success'
                      : status === 'reviewed'
                        ? 'shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-cold'
                        : 'shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint'
                  }
                >
                  {status}
                </span>
              </li>
            ))}
          </ul>
          <div className="thread mt-5" />
          <p className="mt-4 text-[11px] leading-relaxed text-fg-faint">
            The accessibility audit is deliberately not claimed here until it has actually been run
            against the rendered page.
          </p>
        </div>
      </div>

      <div className="marks border border-line bg-panel/40 p-6">
        <span className="t-label">Token contract</span>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ['Do', 'Read semantic roles: --base, --cold, --lh-h1.'],
            ['Do', 'Add a service by data, never by a new component.'],
            ['Do not', 'Hardcode a hex, a font name, or a px radius.'],
          ].map(([heading, body], index) => (
            <div key={`${heading}-${index}`} className="border-t border-line/70 pt-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg">{heading}</span>
              <p className="mt-1.5 text-[11px] leading-relaxed text-fg-faint">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
