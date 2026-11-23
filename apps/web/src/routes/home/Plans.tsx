import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge, ButtonLink, SectionHeader } from '@/components/ui'
import { useSiteContent, useSitePlans } from '@/content/SiteContentProvider'
import { cn } from '@/lib/cn'

/** Three maintenance plans, priced on the basis the trade actually uses. */
export function Plans() {
  const { content } = useSiteContent()
  const plans = useSitePlans()
  const { home } = content

  return (
    <section id="plans" className="section-lg scroll-mt-[var(--header-h)] border-b border-line">
      <div className="shell flex flex-col gap-12">
        <SectionHeader
          index="07"
          label="Maintenance"
          title={home.plansTitle}
          description={home.plansDescription}
          action={<Badge tone="heat" dot>24 × 7 dispatch</Badge>}
        />

        <div className="grid items-start gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'relative flex h-full flex-col gap-6 border p-6',
                plan.featured
                  ? 'border-cold/40 bg-panel-2 md:-translate-y-4'
                  : 'border-line bg-panel/60',
              )}
            >
              {plan.featured ? (
                <span aria-hidden className="thread absolute inset-x-0 top-0" />
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="t-h4 text-fg">{plan.name}</h3>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                    {plan.visits}
                  </p>
                </div>
                {plan.featured ? <Badge tone="cold">Most specified</Badge> : null}
              </div>

              <div>
                <p className="t-num text-h2 text-fg">{plan.price}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                  {plan.priceNote} · GST extra
                </p>
              </div>

              <p className="text-[12px] leading-relaxed text-fg-dim">{plan.summary}</p>

              <ul className="flex flex-col border-t border-line">
                {plan.includes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 border-b border-line/70 py-2.5 text-[12px] leading-snug text-fg-dim"
                  >
                    <Icon name="check" size={13} className="mt-0.5 shrink-0 text-cold" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-auto border-t border-line pt-4 text-[11px] leading-relaxed text-fg-faint">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
                  Excluded ·
                </span>{' '}
                {plan.excluded}
              </p>

              <ButtonLink
                to="/amc"
                variant={plan.featured ? 'primary' : 'secondary'}
                size="sm"
                full
                icon="arrow-right"
              >
                {plan.featured ? 'Specify this plan' : 'Request this plan'}
              </ButtonLink>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <p className="max-w-[62ch] font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
            Plans exclude civil work, duct replacement and controls upgrades. Cash, cheque, bank
            transfer or card on site — no payment gateway.
          </p>
          <Link
            to="/amc"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg transition-colors duration-2 hover:text-cold"
          >
            Compare plans
            <Icon name="arrow-right" size={13} />
          </Link>
        </div>
      </div>
    </section>
  )
}
