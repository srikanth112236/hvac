import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge, ButtonAnchor, ButtonLink, SectionHeader, Tabs } from '@/components/ui'
import { EditorialPlate } from '@/components/content/EditorialPlate'
import { MagneticButton, ScrollReveal, SplitReveal, TiltCard } from '@/motion'
import { useSiteContent } from '@/content/SiteContentProvider'
import { useSeo } from '@/lib/seo'
import { PageBackdrop } from '@/components/site/PageBackdrop'
import { formatEditorialDate, readingMinutes, sortByPublished } from '@/lib/editorial'

const categoryTone = (category: string) =>
  category === 'Maintenance' || category === 'Refrigerants' ? 'heat' : 'cold'

export function Blog() {
  const { content } = useSiteContent()
  const copy = content.pages.blog
  const sections = content.pageSections.blog
  const [category, setCategory] = useState('All')

  const posts = useMemo(
    () => sortByPublished(content.posts.filter((post) => post.published)),
    [content.posts],
  )
  const categories = ['All', ...Array.from(new Set(posts.map((post) => post.category)))]
  const filtered = category === 'All' ? posts : posts.filter((post) => post.category === category)
  const featured = filtered.find((post) => post.featured) ?? filtered[0]

  const itemList = useMemo(
    () =>
      posts.map((post) => ({
        name: post.title,
        path: `/blog/${post.slug}`,
        description: post.excerpt,
      })),
    [posts],
  )

  useSeo({
    path: '/blog',
    title: 'HVAC journal',
    description: copy.lead,
    breadcrumbs: [{ name: 'Journal', path: '/blog' }],
    itemList,
  })

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <PageBackdrop src={copy.image} alt={copy.imageAlt} />
        <div className="shell grid gap-x-8 gap-y-12 pb-14 pt-12 md:grid-cols-12 lg:pt-16">
          <div className="md:col-span-7">
            <span className="annot">Journal · CV-JRN-01</span>
            <SplitReveal
              key={copy.headline}
              as="h1"
              className="t-display mt-7 max-w-[15ch] text-fg"
              stagger={0.045}
            >
              {copy.headline}
            </SplitReveal>
            <p className="t-lead mt-7 max-w-[58ch]">{copy.lead}</p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <MagneticButton>
                <ButtonLink to="/contact" size="lg" icon="arrow-up-right">
                  Ask the engineering desk
                </ButtonLink>
              </MagneticButton>
              <ButtonAnchor href="#journal" variant="secondary" size="lg">
                Read the notes
              </ButtonAnchor>
            </div>
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <div className="marks border border-line bg-panel/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="t-label">Editorial register</span>
                <span className="t-num text-[9px] text-fg-faint">CV/JRN</span>
              </div>
              <div className="rule-ticks mt-4" />
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                    Published
                  </dt>
                  <dd className="t-num mt-1 text-[20px] text-fg">
                    {String(posts.length).padStart(2, '0')}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                    Topics
                  </dt>
                  <dd className="t-num mt-1 text-[20px] text-fg">
                    {String(Math.max(0, categories.length - 1)).padStart(2, '0')}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                    Standard
                  </dt>
                  <dd className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-fg-dim">
                    Answer first
                    <br />
                    Assumptions stated
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                    Desk
                  </dt>
                  <dd className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-fg-dim">
                    Engineers, not
                    <br />
                    copywriters
                  </dd>
                </div>
              </dl>
              <div className="thread mt-4" />
              <p className="mt-3 text-[11px] leading-relaxed text-fg-faint">
                Every guide states the measurement, the standard or manufacturer reference, and the
                assumption that would change the answer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="border-b border-line bg-panel/20">
          <div className="shell py-[var(--section-y)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="annot">Featured file · {featured.category}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Updated {formatEditorialDate(featured.updatedAt || featured.publishedAt)}
              </span>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-stretch">
              <div className="lg:col-span-5">
                <EditorialPlate
                  label={featured.heroPlate}
                  code={`CV-JRN-${featured.publishedAt.slice(0, 7)}`}
                  tone={categoryTone(featured.category)}
                  className="min-h-[280px]"
                />
              </div>
              <div className="flex flex-col lg:col-span-7">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="cold">{featured.category}</Badge>
                  <span className="t-num text-[9px] text-fg-faint">
                    {readingMinutes(featured.body, featured.readingMinutes)} min read
                  </span>
                </div>
                <h2 className="t-h1 mt-4 max-w-[20ch] text-fg">{featured.title}</h2>
                <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-fg-dim">
                  {featured.excerpt}
                </p>

                <div className="mt-6 border-l-2 border-cold bg-cold/5 px-5 py-4">
                  <span className="t-label text-cold">Direct answer</span>
                  <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-fg-dim">
                    {featured.answer}
                  </p>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg">
                      {featured.authorName}
                    </p>
                    <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
                      {featured.authorRole || 'Technical desk'}
                    </p>
                  </div>
                  <Link
                    to={`/blog/${featured.slug}`}
                    className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
                  >
                    Read the file
                    <Icon name="arrow-right" size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section id="journal" className="scroll-mt-[var(--header-h)] border-b border-line">
        <div className="shell pb-2 pt-[var(--section-y)]">
          <SectionHeader
            index="02"
            label="Technical notes"
            title={sections.articles.title}
            description={sections.articles.body}
            action={
              <Badge tone="cold" dot>
                {posts.length} published
              </Badge>
            }
          />
        </div>

        <div className="sticky top-[60px] z-[var(--z-raised)] mt-8 border-y border-line bg-base/95 backdrop-blur-md">
          <div className="shell flex flex-col gap-1 py-3 md:flex-row md:items-end md:justify-between">
            <div className="no-scrollbar -mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)]">
              <Tabs
                tabs={categories.map((entry) => ({
                  id: entry,
                  label: entry,
                  count:
                    entry === 'All'
                      ? posts.length
                      : posts.filter((post) => post.category === entry).length,
                }))}
                value={category}
                onChange={setCategory}
                ariaLabel="Filter journal entries by topic"
                className="min-w-max border-b-0"
              />
            </div>
            <p
              aria-live="polite"
              className="shrink-0 pb-1 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint"
            >
              {filtered.length} of {posts.length} files
            </p>
          </div>
        </div>

        <div className="shell pb-16 pt-10">
          {filtered.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((post, index) => (
                <ScrollReveal key={post.id} delay={index * 0.035}>
                  <TiltCard max={4}>
                    <article className="marks flex h-full flex-col border border-line bg-panel/60">
                      <div className="p-4 pb-0">
                        {post.coverImage ? (
                          <div className="min-h-[150px] overflow-hidden border border-line bg-panel">
                            <img
                              src={post.coverImage}
                              alt={post.coverAlt || post.title}
                              loading="lazy"
                              className="h-full min-h-[150px] w-full object-cover"
                            />
                          </div>
                        ) : (
                          <EditorialPlate
                            label={post.heroPlate}
                            code={`CV-JRN-${String(index + 1).padStart(2, '0')}`}
                            tone={categoryTone(post.category)}
                            className="min-h-[150px]"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold">
                            {post.category}
                          </span>
                          <span className="t-num text-[9px] text-fg-faint">
                            {readingMinutes(post.body, post.readingMinutes)} min
                          </span>
                        </div>
                        <h3 className="t-h3 mt-3 text-fg">{post.title}</h3>
                        <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-fg-dim">
                          {post.excerpt}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
                          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                            {formatEditorialDate(post.publishedAt)}
                          </span>
                          <Link
                            to={`/blog/${post.slug}`}
                            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:text-cold"
                          >
                            Open note
                            <Icon name="arrow-up-right" size={12} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  </TiltCard>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <p className="border border-dashed border-line px-6 py-14 text-center text-sm text-fg-faint">
              No files in this topic yet.
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-line bg-panel/20">
        <div className="shell grid gap-8 py-[var(--section-y)] md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <span className="annot">03 · Next</span>
            <h2 className="t-h2 mt-4 max-w-[20ch] text-fg">{sections.next.title}</h2>
            <p className="mt-4 max-w-[54ch] text-sm leading-relaxed text-fg-dim">
              {sections.next.body}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:col-span-4 md:col-start-9 md:justify-end">
            <ButtonLink to="/contact" size="lg" icon="arrow-up-right">
              Ask an engineer
            </ButtonLink>
            <ButtonLink to="/products" variant="secondary" size="lg">
              Browse systems
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  )
}
