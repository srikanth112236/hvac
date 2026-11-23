import { Icon } from '@/components/icons'
import { ParallaxDrift } from '@/motion'
import { cn } from '@/lib/cn'
import { categoryLabels, type CatalogueService } from '@/content/services'
import type { ServiceDetail } from '@/content/serviceDetails'

interface ServiceDiagramProps {
  service: ServiceDetail & { catalogue: CatalogueService }
}

const maintenanceNodes: [label: string, spec: string][] = [
  ['Asset register', 'Make · model · serial'],
  ['Visit scope', 'Written checklist'],
  ['Measurement', 'Approach · delta-T'],
  ['Report', 'Within 24 hours'],
]

/**
 * The service schematic: four labelled nodes on a measured rail, with the
 * key specs drawn from the service record. It is a diagram, not an image, so
 * it re-colours with the theme and stays readable at 320 px.
 */
export function ServiceDiagram({ service }: ServiceDiagramProps) {
  const { catalogue, specs } = service
  const isMaintenance = catalogue.category === 'maintenance'

  const nodes: [label: string, spec: string][] = isMaintenance
    ? maintenanceNodes
    : [
        ['Source', specs[0]?.[1] ?? catalogue.capacity],
        ['Distribution', specs[1]?.[1] ?? catalogue.specification],
        ['Terminal', specs[2]?.[1] ?? catalogue.timeline],
        ['Control', specs[3]?.[1] ?? 'Commissioned to design'],
      ]

  return (
    <div className="marks relative overflow-hidden border border-line bg-panel/50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgb(var(--line)/0.75) 0 1px, transparent 1px 44px), repeating-linear-gradient(90deg, rgb(var(--line)/0.75) 0 1px, transparent 1px 44px)',
        }}
      />

      <div className="relative flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <span className="t-label">System · CV-{catalogue.index}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
          {categoryLabels[catalogue.category]}
        </span>
      </div>

      <div className="relative px-5 py-6">
        <ParallaxDrift className="pointer-events-none absolute inset-0" strength={8}>
          <Icon
            name={catalogue.icon}
            size={260}
            className="absolute -right-12 top-1/2 -translate-y-1/2 text-fg/[0.05]"
          />
        </ParallaxDrift>

        <ol className="relative flex flex-col">
          {nodes.map(([label, spec], index) => (
            <li
              key={label}
              className={cn(
                'grid grid-cols-[28px_1fr] items-center gap-3 py-3',
                index !== nodes.length - 1 && 'border-b border-line-strong/70',
              )}
            >
              <span className="t-num text-[10px] text-cold">{String(index + 1).padStart(2, '0')}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg">
                  {label}
                  {index < nodes.length - 1 ? (
                    <span aria-hidden className="h-px flex-1 bg-cold/40" />
                  ) : null}
                </span>
                <span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                  {spec}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="relative grid grid-cols-2 border-t border-line">
        <div className="border-r border-line px-5 py-3">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
            Capacity
          </span>
          <p className="t-num mt-1 text-[11px] text-fg">{catalogue.capacity}</p>
        </div>
        <div className="px-5 py-3">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
            Lead time
          </span>
          <p className="t-num mt-1 text-[11px] text-fg">{catalogue.timeline}</p>
        </div>
      </div>
    </div>
  )
}
