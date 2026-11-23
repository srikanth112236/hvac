import { Icon } from '@/components/icons'
import { Badge, ButtonAnchor } from '@/components/ui'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'
import { cn } from '@/lib/cn'

/**
 * Reviews are sample copy and labelled as such — invented testimonials must
 * never read as real. Real records replace them from the moderated Reviews
 * collection, with the rating aggregate derived from them.
 */
export function Voices() {
  const brand = useBrand()
  const { content } = useSiteContent()
  const sampleReviews = content.testimonials.filter((review) => review.published)
  const emergencyDisplay = brand.contact.emergencyPhone.replace(
    /^\+1(\d{3})(\d{3})(\d{4})$/,
    '($1) $2-$3',
  )

  return (
    <>
      <section className="section border-b border-line">
        <div className="shell flex flex-col gap-12">
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <span className="annot">From the site file</span>
              <h2 className="t-h2 mt-5 max-w-[18ch] text-fg">
                {content.home.voicesTitle ?? 'Written by the people who signed the handover.'}
              </h2>
            </div>
            <p className="max-w-[34ch] font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint md:col-span-4 md:col-start-9">
              {content.home.voicesDescription ??
                'Sample copy. Moderated reviews from completed jobs replace these in the CMS — no invented names, no aggregate rating until real ones exist.'}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-12">
            {sampleReviews.map((review, index) => (
              <figure
                key={review.context}
                className={cn(
                  'flex flex-col justify-between gap-6 border-t border-line pt-6',
                  index === 0 && 'md:col-span-5',
                  index === 1 && 'md:col-span-4 md:col-start-7 md:pt-14',
                  index === 2 && 'md:col-span-3 md:col-start-10 md:pt-7',
                )}
              >
                <blockquote
                  className={cn(
                    index === 0
                      ? 't-h3 text-fg'
                      : 'text-[14px] leading-relaxed text-fg-dim',
                  )}
                >
                  “{review.quote}”
                </blockquote>
                <figcaption className="flex flex-col items-start gap-2">
                  <Badge tone="neutral">Sample</Badge>
                  <span className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
                    {review.context}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <div className="border-b border-heat/30 bg-heat/[0.05]">
        <div className="shell flex flex-col gap-6 py-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-heat/40 text-heat">
              <Icon name="bolt" size={17} />
            </span>
            <div>
              <p className="t-h4 text-fg">A breakdown at 02:00 is an emergency, not a ticket.</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
                24 × 7 dispatch · {brand.stats.emergencyResponseHours} h response inside city limits
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href={`tel:${brand.contact.emergencyPhone}`}
              className="t-num text-h3 text-heat transition-colors duration-2 hover:text-fg"
            >
              {emergencyDisplay}
            </a>
            <ButtonAnchor
              href={`tel:${brand.contact.emergencyPhone}`}
              variant="secondary"
              size="sm"
              icon="phone"
            >
              Call dispatch
            </ButtonAnchor>
          </div>
        </div>
      </div>
    </>
  )
}
