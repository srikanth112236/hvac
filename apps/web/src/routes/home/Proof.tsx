import { CounterStat } from '@/motion'
import { useBrand } from '@/brand/BrandProvider'

/**
 * Proof strip: four numbers, read from Brand Settings, counted when they enter
 * the viewport. The strip is deliberately tight — it is evidence, not a section.
 */
export function ProofStrip() {
  const brand = useBrand()
  const stats = [
    {
      label: 'Years operating',
      value: brand.stats.yearsOperating,
      suffix: '',
      note: `Since ${brand.foundedYear}`,
    },
    {
      label: 'Systems installed',
      value: brand.stats.systemsInstalled,
      suffix: '+',
      note: 'Residential to industrial',
    },
    {
      label: 'Tonnage commissioned',
      value: brand.stats.tonnageCommissioned,
      suffix: ' TR',
      note: 'Measured at handover',
    },
    {
      label: 'Emergency response',
      value: brand.stats.emergencyResponseHours,
      suffix: ' h',
      note: 'Inside city limits',
    },
  ]

  return (
    <section aria-label="Proof" className="border-b border-line bg-panel/20">
      <div className="shell">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/70 py-3">
          <span className="t-label">01 · Proof</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
            Maintained in Brand Settings
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 md:grid-cols-4 md:gap-x-0">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-2 border-t border-line py-6 md:border-l md:border-t-0 md:py-8 md:pl-7 md:first:border-l-0 md:first:pl-0"
            >
              <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
                {stat.label}
              </dt>
              <dd className="text-h2 text-fg">
                <CounterStat value={stat.value} suffix={stat.suffix} />
              </dd>
              <span className="text-[11px] leading-snug text-fg-faint">{stat.note}</span>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
