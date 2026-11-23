import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge, ButtonLink } from '@/components/ui'
import { EditorialPlate } from '@/components/content/EditorialPlate'
import { MarkdownArticle, headingId } from '@/components/content/MarkdownArticle'
import { ScrollReveal } from '@/motion'
import { useSiteContent, useSiteServices } from '@/content/SiteContentProvider'
import { useSeo } from '@/lib/seo'
import { formatEditorialDate, readingMinutes, sortByPublished } from '@/lib/editorial'

export function BlogPost() {
  const { slug = '' } = useParams()
  const { content } = useSiteContent()
  const services = useSiteServices()
  const post = content.posts.find((entry) => entry.slug === slug && entry.published)

  const headings = useMemo(() => {
    if (!post) return []
    return post.body
      .split('\n')
      .map((line) => /^(#{2,3})\s+(.+)$/.exec(line.trim()))
      .filter((match): match is RegExpExecArray => Boolean(match))
      .flatMap((match) => {
        const hashes = match[1]
        const label = match[2]
        if (!hashes || !label) return []
        return [
          {
            level: hashes.length,
            label: label.replace(/\*\*/g, ''),
            id: headingId(label),
          },
        ]
      })
  }, [post])

  const related = useMemo(() => {
    if (!post) return []
    const published = sortByPublished(content.posts.filter((entry) => entry.published && entry.id !== post.id))
    const sameCategory = published.filter((entry) => entry.category === post.category)
    return [...sameCategory, ...published.filter((entry) => entry.category !== post.category)].slice(0, 3)
  }, [content.posts, post])

  useSeo({
    path: `/blog/${slug}`,
    title: post ? post.seoTitle || post.title : 'Article not found',
    description: post ? post.seoDescription || post.excerpt : 'This journal entry is not available.',
    noindex: !post,
    type: post ? 'article' : 'website',
    breadcrumbs: post
      ? [
          { name: 'Journal', path: '/blog' },
          { name: post.title, path: `/blog/${post.slug}` },
        ]
      : undefined,
    article: post
      ? {
          title: post.title,
          description: post.seoDescription || post.excerpt,
          slug: post.slug,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          authorName: post.authorName,
          authorRole: post.authorRole,
          category: post.category,
          tags: post.tags,
        }
      : undefined,
    faqs: post?.faqs,
  })

  if (!post) {
    return (
      <section className="shell flex min-h-[62vh] items-center py-24">
        <div>
          <span className="annot text-heat">Journal · file missing</span>
          <h1 className="t-display mt-6 max-w-[16ch] text-fg">This note is not in the register.</h1>
          <p className="t-lead mt-6 max-w-[52ch]">
            The article may have been unpublished or its slug changed. The journal index still has
            every current file.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/blog" icon="arrow-right">
              Return to the journal
            </ButtonLink>
            <ButtonLink to="/contact" variant="secondary">
              Ask the engineering desk
            </ButtonLink>
          </div>
        </div>
      </section>
    )
  }

  const relatedServices = post.relatedServices.flatMap((id) => {
    const service = services.find((entry) => entry.id === id)
    return service ? [service] : []
  })
  const minutes = readingMinutes(post.body, post.readingMinutes)

  return (
    <>
      <section className="border-b border-line">
        <div className="shell pb-12 pt-8 md:pb-16">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
            <Link to="/" className="transition-colors duration-2 hover:text-cold">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link to="/blog" className="transition-colors duration-2 hover:text-cold">
              Journal
            </Link>
            <span aria-hidden>/</span>
            <span className="text-fg-dim">{post.category}</span>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="cold">{post.category}</Badge>
                <span className="t-num text-[9px] text-fg-faint">{minutes} min read</span>
                {post.featured ? <Badge tone="heat">Featured file</Badge> : null}
              </div>

              <h1 className="t-display mt-5 max-w-[24ch] text-fg">{post.title}</h1>
              <p className="t-lead mt-6 max-w-[64ch]">{post.excerpt}</p>

              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-5">
                <div>
                  <dt className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                    Author
                  </dt>
                  <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fg">
                    {post.authorName}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                    Published
                  </dt>
                  <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fg">
                    {formatEditorialDate(post.publishedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                    Updated
                  </dt>
                  <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fg">
                    {formatEditorialDate(post.updatedAt || post.publishedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[8px] uppercase tracking-[0.14em] text-fg-faint">
                    Desk
                  </dt>
                  <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fg">
                    {post.authorRole || 'Engineering desk'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-4">
              {post.coverImage ? (
                <div className="min-h-[220px] overflow-hidden border border-line bg-panel">
                  <img
                    src={post.coverImage}
                    alt={post.coverAlt || post.title}
                    className="h-full min-h-[220px] w-full object-cover"
                  />
                </div>
              ) : (
                <EditorialPlate
                  label={post.heroPlate}
                  code={`CV-JRN-${post.publishedAt.slice(0, 7)}`}
                  tone={post.category === 'Maintenance' || post.category === 'Refrigerants' ? 'heat' : 'cold'}
                  className="min-h-[220px]"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="shell grid gap-12 py-[var(--section-y)] lg:grid-cols-12">
          <article className="lg:col-span-8">
            <div className="border-l-2 border-cold bg-cold/5 px-5 py-5">
              <span className="t-label text-cold">Direct answer</span>
              <p className="mt-2 text-[15px] leading-relaxed text-fg">{post.answer}</p>
            </div>

            {post.takeaways.length ? (
              <div className="mt-8 border border-line bg-panel/60 p-5">
                <span className="t-label">Key takeaways</span>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {post.takeaways.map((takeaway) => (
                    <li key={takeaway} className="flex items-start gap-3 text-[13px] leading-relaxed text-fg-dim">
                      <Icon name="check" size={14} className="mt-1 shrink-0 text-cold" />
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {post.bodyHtml ? (
              <div
                className="article-body mt-10"
                dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
              />
            ) : (
              <MarkdownArticle markdown={post.body} className="mt-10" />
            )}

            {post.faqs.length ? (
              <div className="mt-14 border-t border-line pt-8">
                <span className="annot">Questions from the desk</span>
                <h2 className="t-h2 mt-4 max-w-[16ch] text-fg">Short answers, in writing.</h2>
                <div className="mt-6 border-t border-line">
                  {post.faqs.map((faq) => (
                    <details key={faq.question} className="group border-b border-line">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
                        <span className="text-[14px] font-medium leading-snug text-fg">{faq.question}</span>
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-line text-fg-faint transition-colors duration-2 group-open:border-cold/50 group-open:text-cold">
                          <Icon name="plus" size={12} className="group-open:hidden" />
                          <Icon name="minus" size={12} className="hidden group-open:block" />
                        </span>
                      </summary>
                      <p className="max-w-[70ch] pb-5 text-[13px] leading-relaxed text-fg-dim">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-line pt-5">
              <span className="t-label mr-2">Filed under</span>
              {post.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </article>

          <aside className="lg:col-span-4">
            <div className="sticky top-[calc(var(--header-h)+24px)] flex flex-col gap-4">
              {headings.length ? (
                <nav aria-label="On this page" className="border border-line bg-panel/40 p-5">
                  <span className="t-label">On this page</span>
                  <ol className="mt-4 flex flex-col gap-2.5">
                    {headings.map((heading, index) => (
                      <li
                        key={`${heading.id}-${index}`}
                        className={heading.level === 3 ? 'pl-4' : undefined}
                      >
                        <a
                          href={`#${heading.id}`}
                          className="group flex items-start gap-2.5 text-[11px] leading-snug text-fg-dim transition-colors duration-2 hover:text-cold"
                        >
                          <span className="t-num pt-0.5 text-[8px] text-fg-faint">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          {heading.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}

              {relatedServices.length ? (
                <div className="border border-line bg-panel/40 p-5">
                  <span className="t-label">Related systems</span>
                  <ul className="mt-3">
                    {relatedServices.map((service) => (
                      <li key={service.id} className="border-t border-line/60 first:border-t-0">
                        <Link
                          to={`/services/${service.id}`}
                          className="group flex items-center justify-between gap-3 py-2.5"
                        >
                          <span className="text-[12px] leading-snug text-fg-dim transition-colors duration-2 group-hover:text-cold">
                            {service.name}
                          </span>
                          <Icon name="arrow-up-right" size={12} className="shrink-0 text-fg-faint" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="marks border border-cold/30 bg-cold/5 p-5">
                <span className="t-label text-cold">Engineering desk</span>
                <p className="mt-3 text-[12px] leading-relaxed text-fg-dim">
                  Send the model, the readings or the room schedule. We will tell you what to check
                  before you approve a repair or a replacement.
                </p>
                <ButtonLink to="/contact" size="sm" full icon="arrow-up-right" className="mt-4">
                  Ask a question
                </ButtonLink>
                <Link
                  to="/products"
                  className="mt-3 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:text-cold"
                >
                  Browse the catalogue
                  <Icon name="arrow-right" size={11} />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {related.length ? (
        <section className="border-b border-line bg-panel/20">
          <div className="shell py-[var(--section-y)]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="annot">Next files</span>
                <h2 className="t-h2 mt-4 text-fg">Keep reading the register.</h2>
              </div>
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cold transition-colors duration-2 hover:text-fg"
              >
                All journal entries
                <Icon name="arrow-right" size={13} />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {related.map((entry, index) => (
                <ScrollReveal key={entry.id} delay={index * 0.04}>
                  <Link
                    to={`/blog/${entry.slug}`}
                    className="marks group flex h-full flex-col border border-line bg-panel/60 p-5 transition-colors duration-2 hover:border-cold/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold">
                        {entry.category}
                      </span>
                      <span className="t-num text-[9px] text-fg-faint">
                        {readingMinutes(entry.body, entry.readingMinutes)} min
                      </span>
                    </div>
                    <h3 className="t-h4 mt-3 text-fg transition-colors duration-2 group-hover:text-cold">
                      {entry.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-fg-dim">
                      {entry.excerpt}
                    </p>
                    <span className="mt-auto flex items-center gap-2 border-t border-line pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                      Open file
                      <Icon name="arrow-up-right" size={11} />
                    </span>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
