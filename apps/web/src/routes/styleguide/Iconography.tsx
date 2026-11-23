import { SectionHeader } from '@/components/ui'
import { Icon, iconCount, iconNames } from '@/components/icons'

export function Iconography() {
  return (
    <section id="icons" className="flex flex-col gap-8 scroll-mt-28">
      <SectionHeader
        index="03"
        label="Iconography"
        title="One grid, one stroke."
        description={`${iconCount} glyphs drawn for this template on a 24px grid at 1.5px stroke. HVAC-specific shapes carry the technical vocabulary; nothing here comes from a mixed icon pack.`}
        action={
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-faint">
            24px · 1.5px · round
          </span>
        }
      />

      <div className="grid grid-cols-3 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4 md:grid-cols-6">
        {iconNames.map((name) => (
          <div
            key={name}
            className="group flex aspect-square flex-col items-center justify-center gap-3 bg-base transition-colors duration-2 hover:bg-panel-2"
          >
            <Icon
              name={name}
              size={22}
              className="text-fg-dim transition-colors duration-2 group-hover:text-cold"
            />
            <span className="px-1 text-center font-mono text-[8px] uppercase leading-tight tracking-[0.08em] text-fg-faint">
              {name}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[12px] leading-relaxed text-fg-faint">
        Usage rule: icons label, they do not decorate. Every icon ships as a name in the registry,
        so a missing glyph fails the build instead of falling back to a placeholder.
      </p>
    </section>
  )
}
