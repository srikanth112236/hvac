import { useState, type ReactNode } from 'react'
import { Icon } from '@/components/icons'
import { Badge, Button, Input, Textarea, Toggle } from '@/components/ui'
import type { SiteContent } from '@hvac/shared'
import { ImagePickerField } from '@/admin/ImagePickerField'

type Update = (recipe: (current: SiteContent) => SiteContent) => void

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function Section({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="border border-line bg-panel/30">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-dim">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-[80ch] text-[11px] leading-relaxed text-fg-faint">
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="flex flex-col gap-3 p-4">{children}</div>
    </section>
  )
}

function Entry({
  index,
  title,
  meta,
  children,
  onRemove,
}: {
  index: number
  title: string
  meta?: string
  children: ReactNode
  onRemove?: () => void
}) {
  const [open, setOpen] = useState(index === 0)
  return (
    <details
      className="group border border-line bg-panel/40"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-[9px] text-cold">{String(index + 1).padStart(2, '0')}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] text-fg">{title || 'Untitled'}</span>
          {meta ? (
            <span className="block truncate font-mono text-[8px] uppercase tracking-[0.06em] text-fg-faint">
              {meta}
            </span>
          ) : null}
        </span>
        {onRemove ? (
          <button
            type="button"
            aria-label={`Remove ${title || 'entry'}`}
            onClick={(event) => {
              event.preventDefault()
              onRemove()
            }}
            className="text-fg-faint hover:text-danger"
          >
            <Icon name="close" size={13} />
          </button>
        ) : null}
        <Icon
          name="chevron-down"
          size={13}
          className="text-fg-faint transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="grid gap-3 border-t border-line p-4 md:grid-cols-2">{children}</div>
    </details>
  )
}

function Full({ children }: { children: ReactNode }) {
  return <div className="md:col-span-2">{children}</div>
}

function CollectionPageCards({
  title,
  description,
  items,
  onOpen,
  onAdd,
  addLabel,
}: {
  title: string
  description: string
  items: {
    id: string
    title: string
    meta: string
    summary: string
    published?: boolean
  }[]
  onOpen: (id: string) => void
  onAdd: () => void
  addLabel: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-cold">
            Multi-page collection
          </span>
          <h2 className="t-h3 mt-1.5 text-fg">{title}</h2>
          <p className="mt-1.5 max-w-[65ch] text-[12px] leading-relaxed text-fg-dim">
            {description}
          </p>
        </div>
        <Button size="sm" icon="plus" onClick={onAdd}>
          {addLabel}
        </Button>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.id)}
            className="group flex min-h-32 flex-col border border-line bg-panel/20 p-4 text-left transition-colors duration-2 hover:border-cold/50 hover:bg-cold/[0.025]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                  {item.meta}
                </span>
                <p className="mt-2 truncate text-[14px] text-fg group-hover:text-cold">
                  {item.title}
                </p>
              </div>
              {item.published !== undefined ? (
                <Badge tone={item.published ? 'success' : 'neutral'} dot>
                  {item.published ? 'Public' : 'Draft'}
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 line-clamp-3 text-[11px] leading-relaxed text-fg-dim">
              {item.summary || 'Open to edit this page.'}
            </p>
            <span className="mt-auto flex items-center justify-end gap-1.5 border-t border-line/70 pt-3 font-mono text-[8px] uppercase tracking-[0.08em] text-cold">
              Edit page <Icon name="arrow-right" size={11} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Journal                                                                    */
/* -------------------------------------------------------------------------- */

export function BlogTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const patch = (index: number, change: Partial<SiteContent['posts'][number]>) =>
    update((current) => ({
      ...current,
      posts: current.posts.map((entry, position) =>
        position === index ? { ...entry, ...change } : entry,
      ),
    }))

  const add = () => {
    const stamp = Date.now().toString(36)
    update((current) => ({
      ...current,
      posts: [
        {
          id: `post-${stamp}`,
          slug: `new-field-note-${stamp}`,
          title: 'New field note',
          excerpt: 'A short summary for the journal index.',
          answer: 'The direct answer readers should get from this note.',
          category: 'Field notes',
          tags: [],
          authorName: 'Coolvane engineering desk',
          authorRole: 'Service and projects',
          publishedAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
          readingMinutes: 5,
          heroPlate: 'CV-JRN',
          featured: false,
          published: false,
          body: '## The question\n\nWrite the note here. Headings, lists and links are supported.',
          takeaways: [],
          faqs: [],
          relatedServices: [],
          seoTitle: '',
          seoDescription: '',
        },
        ...current.posts,
      ],
    }))
  }

  return (
    <Section
      title="Journal"
      description="Long-form field notes published at /blog and /blog/:slug. Markdown is supported. Every published article emits Article, FAQ and breadcrumb structured data."
      actions={
        <Button variant="secondary" size="sm" icon="plus" onClick={add}>
          Add article
        </Button>
      }
    >
      {draft.posts.map((post, index) => (
        <Entry
          key={post.id}
          index={index}
          title={post.title}
          meta={`${post.published ? 'Published' : 'Draft'} · ${post.category} · ${post.publishedAt}`}
          onRemove={() =>
            update((current) => ({
              ...current,
              posts: current.posts.filter((_, position) => position !== index),
            }))
          }
        >
          <Input
            label="Slug"
            hint="Lowercase letters, numbers and hyphens."
            value={post.slug}
            onChange={(event) =>
              patch(index, { slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
            }
          />
          <Input
            label="Category"
            value={post.category}
            onChange={(event) => patch(index, { category: event.target.value })}
          />
          <Input
            label="Title"
            value={post.title}
            onChange={(event) => patch(index, { title: event.target.value })}
          />
          <Input
            label="Hero plate code"
            value={post.heroPlate}
            onChange={(event) => patch(index, { heroPlate: event.target.value })}
          />
          <ImagePickerField
            label="Article cover"
            folder="blog"
            value={post.coverImage}
            alt={post.coverAlt}
            onChange={(change) =>
              patch(index, { coverImage: change.image, coverAlt: change.imageAlt })
            }
            hint="Shown on the journal card and at the top of the article. Leave empty to keep the generated plate."
          />
          <Input
            label="Author"
            value={post.authorName}
            onChange={(event) => patch(index, { authorName: event.target.value })}
          />
          <Input
            label="Author role"
            value={post.authorRole}
            onChange={(event) => patch(index, { authorRole: event.target.value })}
          />
          <Input
            label="Published date"
            hint="YYYY-MM-DD"
            value={post.publishedAt}
            onChange={(event) => patch(index, { publishedAt: event.target.value })}
          />
          <Input
            label="Updated date"
            hint="YYYY-MM-DD"
            value={post.updatedAt}
            onChange={(event) => patch(index, { updatedAt: event.target.value })}
          />
          <Input
            label="Reading minutes"
            type="number"
            value={post.readingMinutes}
            onChange={(event) => patch(index, { readingMinutes: Number(event.target.value) })}
          />
          <Input
            label="Tags · comma separated"
            value={post.tags.join(', ')}
            onChange={(event) =>
              patch(index, {
                tags: event.target.value
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              })
            }
          />
          <Full>
            <Textarea
              label="Excerpt"
              rows={3}
              value={post.excerpt}
              onChange={(event) => patch(index, { excerpt: event.target.value })}
            />
          </Full>
          <Full>
            <Textarea
              label="Direct answer"
              rows={3}
              value={post.answer}
              onChange={(event) => patch(index, { answer: event.target.value })}
            />
          </Full>
          <Full>
            <Textarea
              label="Body · Markdown"
              rows={18}
              value={post.body}
              onChange={(event) => patch(index, { body: event.target.value, bodyHtml: undefined })}
            />
          </Full>
          <Full>
            <Textarea
              label="Key takeaways · one per line"
              rows={4}
              value={post.takeaways.join('\n')}
              onChange={(event) => patch(index, { takeaways: splitLines(event.target.value) })}
            />
          </Full>
          <Full>
            <Textarea
              label="Related service ids · comma separated"
              value={post.relatedServices.join(', ')}
              onChange={(event) =>
                patch(index, {
                  relatedServices: event.target.value
                    .split(',')
                    .map((service) => service.trim())
                    .filter(Boolean),
                })
              }
            />
          </Full>
          <Input
            label="SEO title"
            value={post.seoTitle}
            onChange={(event) => patch(index, { seoTitle: event.target.value })}
          />
          <Input
            label="SEO description"
            value={post.seoDescription}
            onChange={(event) => patch(index, { seoDescription: event.target.value })}
          />
          <Full>
            <div className="flex flex-wrap items-center gap-6 border border-line/70 bg-base/30 p-3">
              <Toggle
                checked={post.published}
                onChange={(checked) => patch(index, { published: checked })}
                label="Published"
                description="Visible on the public journal."
              />
              <Toggle
                checked={post.featured}
                onChange={(checked) => patch(index, { featured: checked })}
                label="Featured"
                description="Pinned in the journal hero."
              />
            </div>
          </Full>
          <Full>
            <div className="border border-line/70 bg-panel-2/30 p-3">
              <div className="flex items-center justify-between border-b border-line/70 pb-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
                  Article questions
                </span>
                <Button
                  variant="quiet"
                  size="sm"
                  icon="plus"
                  onClick={() =>
                    patch(index, { faqs: [...post.faqs, { question: '', answer: '' }] })
                  }
                >
                  Add question
                </Button>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {post.faqs.map((faq, faqIndex) => (
                  <div
                    key={faqIndex}
                    className="grid gap-2 border border-line/60 p-2 sm:grid-cols-[1fr_1.5fr_auto]"
                  >
                    <Input
                      aria-label={`Question ${faqIndex + 1}`}
                      placeholder="Question"
                      value={faq.question}
                      onChange={(event) =>
                        patch(index, {
                          faqs: post.faqs.map((item, position) =>
                            position === faqIndex
                              ? { ...item, question: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                    <Input
                      aria-label={`Answer ${faqIndex + 1}`}
                      placeholder="Answer"
                      value={faq.answer}
                      onChange={(event) =>
                        patch(index, {
                          faqs: post.faqs.map((item, position) =>
                            position === faqIndex ? { ...item, answer: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label="Remove question"
                      onClick={() =>
                        patch(index, {
                          faqs: post.faqs.filter((_, position) => position !== faqIndex),
                        })
                      }
                      className="flex h-[38px] w-8 items-center justify-center border border-line text-fg-faint hover:text-danger"
                    >
                      <Icon name="close" size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Full>
        </Entry>
      ))}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Products                                                                   */
/* -------------------------------------------------------------------------- */

export function ProductsTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const [selectedId, setSelectedId] = useState('')
  const selected = draft.products.find((entry) => entry.id === selectedId) ?? null
  const patch = (index: number, change: Partial<SiteContent['products'][number]>) =>
    update((current) => ({
      ...current,
      products: current.products.map((entry, position) =>
        position === index ? { ...entry, ...change } : entry,
      ),
    }))

  const add = () => {
    const stamp = Date.now().toString(36)
    const id = `product-${stamp}`
    update((current) => ({
      ...current,
      products: [
        {
          id,
          slug: `new-system-${stamp}`,
          name: 'New system',
          category: 'Commercial',
          brand: 'Selected partner',
          capacity: '',
          priceFrom: 'On survey',
          priceNote: 'Starting point, quoted after survey',
          summary: 'A short specification summary for the catalogue.',
          description: '',
          features: [],
          specs: [{ label: 'Capacity', value: '' }],
          applications: [],
          tags: [],
          plate: 'CV-PRD',
          featured: false,
          published: false,
        },
        ...current.products,
      ],
    }))
    setSelectedId(id)
  }

  if (!selected) {
    return (
      <CollectionPageCards
        title="System detail pages"
        description={`${draft.products.length} system pages. Open a card to edit its specification, pricing, image, applications and publication state.`}
        items={draft.products.map((entry) => ({
          id: entry.id,
          title: entry.name,
          meta: `/products · ${entry.category} · ${entry.capacity || 'Capacity on survey'}`,
          summary: entry.summary || entry.description || 'No system copy yet.',
          published: entry.published,
        }))}
        onOpen={setSelectedId}
        onAdd={add}
        addLabel="Add system"
      />
    )
  }

  return (
    <Section
      title="Systems catalogue"
      description="Equipment and solution families published at /products. Quote-based: the price is a starting point and the specification is confirmed on survey."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" size="sm" icon="chevron-left" onClick={() => setSelectedId('')}>
            All system pages
          </Button>
          <Button variant="secondary" size="sm" icon="plus" onClick={add}>
            Add system
          </Button>
        </div>
      }
    >
      {draft.products
        .map((product, index) => ({ product, index }))
        .filter(({ product }) => product.id === selected.id)
        .map(({ product, index }) => (
          <Entry
            key={product.id}
            index={0}
            title={product.name}
            meta={`${product.published ? 'Published' : 'Draft'} · ${product.category} · ${product.capacity}`}
            onRemove={() =>
              update((current) => ({
                ...current,
                products: current.products.filter((_, position) => position !== index),
              }))
            }
          >
            <Input
              label="Slug"
              hint="Lowercase letters, numbers and hyphens. Used as the anchor id."
              value={product.slug}
              onChange={(event) =>
                patch(index, { slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
              }
            />
            <Input
              label="Name"
              value={product.name}
              onChange={(event) => patch(index, { name: event.target.value })}
            />
            <Input
              label="Category"
              value={product.category}
              onChange={(event) => patch(index, { category: event.target.value })}
            />
            <Input
              label="Brand / partner"
              value={product.brand}
              onChange={(event) => patch(index, { brand: event.target.value })}
            />
            <Input
              label="Capacity"
              value={product.capacity}
              onChange={(event) => patch(index, { capacity: event.target.value })}
            />
            <Input
              label="Price from"
              value={product.priceFrom}
              onChange={(event) => patch(index, { priceFrom: event.target.value })}
            />
            <Input
              label="Price note"
              value={product.priceNote}
              onChange={(event) => patch(index, { priceNote: event.target.value })}
            />
            <Input
              label="Plate code"
              value={product.plate}
              onChange={(event) => patch(index, { plate: event.target.value })}
            />
            <ImagePickerField
              label="System image"
              folder="systems"
              value={product.image}
              alt={product.imageAlt}
              onChange={(change) =>
                patch(index, { image: change.image, imageAlt: change.imageAlt })
              }
              hint="Shown on the systems catalogue card. Leave empty to keep the generated plate."
            />
            <Full>
              <Textarea
                label="Summary"
                rows={3}
                value={product.summary}
                onChange={(event) => patch(index, { summary: event.target.value })}
              />
            </Full>
            <Full>
              <Textarea
                label="Description"
                rows={5}
                value={product.description}
                onChange={(event) => patch(index, { description: event.target.value })}
              />
            </Full>
            <Full>
              <Textarea
                label="Features · one per line"
                rows={4}
                value={product.features.join('\n')}
                onChange={(event) => patch(index, { features: splitLines(event.target.value) })}
              />
            </Full>
            <Full>
              <Textarea
                label="Applications · comma separated"
                value={product.applications.join(', ')}
                onChange={(event) =>
                  patch(index, {
                    applications: event.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Full>
            <Full>
              <Textarea
                label="Tags · comma separated"
                value={product.tags.join(', ')}
                onChange={(event) =>
                  patch(index, {
                    tags: event.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Full>
            <Full>
              <div className="border border-line/70 bg-panel-2/30 p-3">
                <div className="flex items-center justify-between border-b border-line/70 pb-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
                    Specification rows
                  </span>
                  <Button
                    variant="quiet"
                    size="sm"
                    icon="plus"
                    onClick={() =>
                      patch(index, { specs: [...product.specs, { label: '', value: '' }] })
                    }
                  >
                    Add row
                  </Button>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {product.specs.map((spec, specIndex) => (
                    <div key={specIndex} className="grid gap-2 sm:grid-cols-[1fr_1fr_32px]">
                      <Input
                        aria-label={`Spec label ${specIndex + 1}`}
                        placeholder="Label"
                        value={spec.label}
                        onChange={(event) =>
                          patch(index, {
                            specs: product.specs.map((item, position) =>
                              position === specIndex
                                ? { ...item, label: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                      <Input
                        aria-label={`Spec value ${specIndex + 1}`}
                        placeholder="Value"
                        value={spec.value}
                        onChange={(event) =>
                          patch(index, {
                            specs: product.specs.map((item, position) =>
                              position === specIndex
                                ? { ...item, value: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        aria-label="Remove spec"
                        onClick={() =>
                          patch(index, {
                            specs: product.specs.filter((_, position) => position !== specIndex),
                          })
                        }
                        className="flex h-[38px] w-8 items-center justify-center border border-line text-fg-faint hover:text-danger"
                      >
                        <Icon name="close" size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Full>
            <Full>
              <div className="flex flex-wrap items-center gap-6 border border-line/70 bg-base/30 p-3">
                <Toggle
                  checked={product.published}
                  onChange={(checked) => patch(index, { published: checked })}
                  label="Published"
                  description="Visible in the public catalogue."
                />
                <Toggle
                  checked={product.featured}
                  onChange={(checked) => patch(index, { featured: checked })}
                  label="Featured"
                  description="Prioritised on the home page and catalogue."
                />
              </div>
            </Full>
          </Entry>
        ))}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Work                                                                       */
/* -------------------------------------------------------------------------- */

export function WorkTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const [selectedId, setSelectedId] = useState('')
  const selected = draft.workCases.find((entry) => entry.id === selectedId) ?? null
  const patch = (id: string, change: Partial<SiteContent['workCases'][number]>) =>
    update((current) => ({
      ...current,
      workCases: current.workCases.map((entry) =>
        entry.id === id ? { ...entry, ...change } : entry,
      ),
    }))
  const addCase = () => {
    const id = newId('case')
    update((current) => ({
      ...current,
      workCases: [
        ...current.workCases,
        {
          id,
          category: 'Commercial',
          name: 'New project',
          location: 'Dallas',
          plate: 'CV-WRK',
          spec: '',
          detail: '',
          year: String(new Date().getFullYear()),
          challenge: '',
          solution: '',
          result: '',
          system: '',
          metrics: [{ label: 'Capacity', value: '' }],
          scope: [],
        },
      ],
    }))
    setSelectedId(id)
  }

  if (!selected) {
    return (
      <CollectionPageCards
        title="Work case pages"
        description={`${draft.workCases.length} case files. Open a card to edit its story, evidence, photograph and measured result.`}
        items={draft.workCases.map((entry) => ({
          id: entry.id,
          title: entry.name,
          meta: `/work · ${entry.category} · ${entry.year}`,
          summary: entry.detail || entry.challenge || entry.solution || 'No case copy yet.',
        }))}
        onOpen={setSelectedId}
        onAdd={addCase}
        addLabel="Add case"
      />
    )
  }

  return (
    <Section
      title="Work cases"
      description="Each case feeds the home work rail and the /work case files. Keep the challenge, solution and measured result factual."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" size="sm" icon="chevron-left" onClick={() => setSelectedId('')}>
            All work case pages
          </Button>
          <Button variant="secondary" size="sm" icon="plus" onClick={addCase}>
            Add case
          </Button>
        </div>
      }
    >
      {draft.workCases
        .filter((entry) => entry.id === selected.id)
        .map((entry, index) => (
          <Entry
            key={index}
            index={index}
            title={entry.name}
            meta={`${entry.category} · ${entry.location} · ${entry.year}`}
            onRemove={() =>
              update((current) => ({
                ...current,
                workCases: current.workCases.filter((item) => item.id !== entry.id),
              }))
            }
          >
            <Input
              label="Slug / id"
              value={entry.id}
              onChange={(event) => patch(entry.id, { id: event.target.value })}
            />
            <Input
              label="Project name"
              value={entry.name}
              onChange={(event) => patch(entry.id, { name: event.target.value })}
            />
            <Input
              label="Category"
              value={entry.category}
              onChange={(event) => patch(entry.id, { category: event.target.value })}
            />
            <Input
              label="Location"
              value={entry.location}
              onChange={(event) => patch(entry.id, { location: event.target.value })}
            />
            <Input
              label="Plate code"
              value={entry.plate}
              onChange={(event) => patch(entry.id, { plate: event.target.value })}
            />
            <ImagePickerField
              label="Project photo"
              folder="projects"
              value={entry.image}
              alt={entry.imageAlt}
              onChange={(change) =>
                patch(entry.id, { image: change.image, imageAlt: change.imageAlt })
              }
              hint="Shown on the work case file. Leave empty to keep the generated plate."
            />
            <Input
              label="Year"
              value={entry.year}
              onChange={(event) => patch(entry.id, { year: event.target.value })}
            />
            <Input
              label="System summary"
              value={entry.spec}
              onChange={(event) => patch(entry.id, { spec: event.target.value })}
            />
            <Input
              label="Short detail"
              value={entry.detail}
              onChange={(event) => patch(entry.id, { detail: event.target.value })}
            />
            <Full>
              <Textarea
                label="Challenge"
                rows={3}
                value={entry.challenge}
                onChange={(event) => patch(entry.id, { challenge: event.target.value })}
              />
            </Full>
            <Full>
              <Textarea
                label="Solution"
                rows={3}
                value={entry.solution}
                onChange={(event) => patch(entry.id, { solution: event.target.value })}
              />
            </Full>
            <Full>
              <Textarea
                label="Result"
                rows={3}
                value={entry.result}
                onChange={(event) => patch(entry.id, { result: event.target.value })}
              />
            </Full>
            <Input
              label="System installed"
              value={entry.system}
              onChange={(event) => patch(entry.id, { system: event.target.value })}
            />
            <Input
              label="Scope · comma separated"
              value={entry.scope.join(', ')}
              onChange={(event) =>
                patch(entry.id, {
                  scope: event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
            <Full>
              <div className="flex flex-col gap-2 border border-line/70 bg-panel-2/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                    Metrics
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      patch(entry.id, { metrics: [...entry.metrics, { label: '', value: '' }] })
                    }
                    className="font-mono text-[8px] uppercase text-cold hover:text-fg"
                  >
                    + Add metric
                  </button>
                </div>
                {entry.metrics.map((metric, metricIndex) => (
                  <div key={metricIndex} className="grid gap-2 sm:grid-cols-[1fr_1fr_32px]">
                    <Input
                      aria-label="Metric label"
                      placeholder="Label"
                      value={metric.label}
                      onChange={(event) =>
                        patch(entry.id, {
                          metrics: entry.metrics.map((item, i) =>
                            i === metricIndex ? { ...item, label: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <Input
                      aria-label="Metric value"
                      placeholder="Value"
                      value={metric.value}
                      onChange={(event) =>
                        patch(entry.id, {
                          metrics: entry.metrics.map((item, i) =>
                            i === metricIndex ? { ...item, value: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label="Remove metric"
                      onClick={() =>
                        patch(entry.id, {
                          metrics: entry.metrics.filter((_, i) => i !== metricIndex),
                        })
                      }
                      className="flex h-[var(--btn-h-md)] items-center justify-center border border-line text-fg-faint hover:text-danger"
                    >
                      <Icon name="close" size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </Full>
          </Entry>
        ))}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Process                                                                    */
/* -------------------------------------------------------------------------- */

export function ProcessTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const patchStage = (index: number, change: Partial<SiteContent['processStages'][number]>) =>
    update((current) => ({
      ...current,
      processStages: current.processStages.map((stage, i) =>
        i === index ? { ...stage, ...change } : stage,
      ),
    }))

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Process stages"
        description="The stage rail on the home page and the full process page both read this list in order."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              update((current) => ({
                ...current,
                processStages: [
                  ...current.processStages,
                  {
                    index: String(current.processStages.length + 1).padStart(2, '0'),
                    name: 'New stage',
                    duration: '',
                    body: '',
                    deliverable: '',
                    gate: '',
                    evidence: '',
                    client: '',
                  },
                ],
              }))
            }
          >
            Add stage
          </Button>
        }
      >
        {draft.processStages.map((stage, index) => (
          <Entry
            key={index}
            index={index}
            title={`${stage.index} · ${stage.name}`}
            meta={stage.duration}
            onRemove={() =>
              update((current) => ({
                ...current,
                processStages: current.processStages.filter((_, i) => i !== index),
              }))
            }
          >
            <Input
              label="Index"
              value={stage.index}
              onChange={(event) => patchStage(index, { index: event.target.value })}
            />
            <Input
              label="Name"
              value={stage.name}
              onChange={(event) => patchStage(index, { name: event.target.value })}
            />
            <Input
              label="Duration"
              value={stage.duration}
              onChange={(event) => patchStage(index, { duration: event.target.value })}
            />
            <Input
              label="Deliverable"
              value={stage.deliverable}
              onChange={(event) => patchStage(index, { deliverable: event.target.value })}
            />
            <Full>
              <Textarea
                label="Body"
                rows={3}
                value={stage.body}
                onChange={(event) => patchStage(index, { body: event.target.value })}
              />
            </Full>
            <Input
              label="Gate"
              value={stage.gate}
              onChange={(event) => patchStage(index, { gate: event.target.value })}
            />
            <Input
              label="Evidence"
              value={stage.evidence}
              onChange={(event) => patchStage(index, { evidence: event.target.value })}
            />
            <Full>
              <Input
                label="Client role"
                value={stage.client}
                onChange={(event) => patchStage(index, { client: event.target.value })}
              />
            </Full>
          </Entry>
        ))}
      </Section>

      <Section
        title="Client inputs & commissioning file"
        description="Shown beside the stage timeline; one item per line."
      >
        <Full>
          <Textarea
            label="What we need from the client"
            rows={5}
            value={draft.processExtras.inputs.join('\n')}
            onChange={(event) =>
              update((current) => ({
                ...current,
                processExtras: { ...current.processExtras, inputs: splitLines(event.target.value) },
              }))
            }
          />
        </Full>
        <Full>
          <Textarea
            label="Commissioning file contents"
            rows={5}
            value={draft.processExtras.file.join('\n')}
            onChange={(event) =>
              update((current) => ({
                ...current,
                processExtras: { ...current.processExtras, file: splitLines(event.target.value) },
              }))
            }
          />
        </Full>
      </Section>

      <Section
        title="Process questions"
        description="Answers appear in the process page FAQ block."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              update((current) => ({
                ...current,
                processExtras: {
                  ...current.processExtras,
                  faqs: [...current.processExtras.faqs, { question: 'New question', answer: '' }],
                },
              }))
            }
          >
            Add question
          </Button>
        }
      >
        {draft.processExtras.faqs.map((faq, index) => (
          <div key={index} className="border border-line/70 bg-panel-2/30 p-3">
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  label={`Question ${index + 1}`}
                  value={faq.question}
                  onChange={(event) =>
                    update((current) => ({
                      ...current,
                      processExtras: {
                        ...current.processExtras,
                        faqs: current.processExtras.faqs.map((item, i) =>
                          i === index ? { ...item, question: event.target.value } : item,
                        ),
                      },
                    }))
                  }
                />
                <Textarea
                  label="Answer"
                  rows={2}
                  value={faq.answer}
                  onChange={(event) =>
                    update((current) => ({
                      ...current,
                      processExtras: {
                        ...current.processExtras,
                        faqs: current.processExtras.faqs.map((item, i) =>
                          i === index ? { ...item, answer: event.target.value } : item,
                        ),
                      },
                    }))
                  }
                />
              </div>
              <button
                type="button"
                aria-label="Remove question"
                onClick={() =>
                  update((current) => ({
                    ...current,
                    processExtras: {
                      ...current.processExtras,
                      faqs: current.processExtras.faqs.filter((_, i) => i !== index),
                    },
                  }))
                }
                className="mt-6 text-fg-faint hover:text-danger"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          </div>
        ))}
      </Section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  About sections                                                             */
/* -------------------------------------------------------------------------- */

export function AboutSectionsTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const sections = draft.aboutSections
  const patch = <K extends keyof typeof sections>(key: K, value: (typeof sections)[K]) =>
    update((current) => ({ ...current, aboutSections: { ...current.aboutSections, [key]: value } }))

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Milestones"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              patch('milestones', [...sections.milestones, { year: '', title: '', body: '' }])
            }
          >
            Add milestone
          </Button>
        }
      >
        {sections.milestones.map((entry, index) => (
          <Entry
            key={index}
            index={index}
            title={entry.title}
            meta={entry.year}
            onRemove={() =>
              patch(
                'milestones',
                sections.milestones.filter((_, i) => i !== index),
              )
            }
          >
            <Input
              label="Year"
              value={entry.year}
              onChange={(event) =>
                patch(
                  'milestones',
                  sections.milestones.map((item, i) =>
                    i === index ? { ...item, year: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              label="Title"
              value={entry.title}
              onChange={(event) =>
                patch(
                  'milestones',
                  sections.milestones.map((item, i) =>
                    i === index ? { ...item, title: event.target.value } : item,
                  ),
                )
              }
            />
            <Full>
              <Textarea
                label="Body"
                rows={2}
                value={entry.body}
                onChange={(event) =>
                  patch(
                    'milestones',
                    sections.milestones.map((item, i) =>
                      i === index ? { ...item, body: event.target.value } : item,
                    ),
                  )
                }
              />
            </Full>
          </Entry>
        ))}
      </Section>

      <Section
        title="Principles"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              patch('principles', [
                ...sections.principles,
                {
                  index: String(sections.principles.length + 1).padStart(2, '0'),
                  title: '',
                  body: '',
                  proof: '',
                },
              ])
            }
          >
            Add principle
          </Button>
        }
      >
        {sections.principles.map((entry, index) => (
          <Entry
            key={index}
            index={index}
            title={entry.title}
            meta={entry.index}
            onRemove={() =>
              patch(
                'principles',
                sections.principles.filter((_, i) => i !== index),
              )
            }
          >
            <Input
              label="Index"
              value={entry.index}
              onChange={(event) =>
                patch(
                  'principles',
                  sections.principles.map((item, i) =>
                    i === index ? { ...item, index: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              label="Title"
              value={entry.title}
              onChange={(event) =>
                patch(
                  'principles',
                  sections.principles.map((item, i) =>
                    i === index ? { ...item, title: event.target.value } : item,
                  ),
                )
              }
            />
            <Full>
              <Textarea
                label="Body"
                rows={2}
                value={entry.body}
                onChange={(event) =>
                  patch(
                    'principles',
                    sections.principles.map((item, i) =>
                      i === index ? { ...item, body: event.target.value } : item,
                    ),
                  )
                }
              />
            </Full>
            <Full>
              <Input
                label="Proof"
                value={entry.proof}
                onChange={(event) =>
                  patch(
                    'principles',
                    sections.principles.map((item, i) =>
                      i === index ? { ...item, proof: event.target.value } : item,
                    ),
                  )
                }
              />
            </Full>
          </Entry>
        ))}
      </Section>

      <Section
        title="Leadership"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              patch('leadership', [
                ...sections.leadership,
                { initials: '', name: '', role: '', focus: '', years: '' },
              ])
            }
          >
            Add leader
          </Button>
        }
      >
        {sections.leadership.map((entry, index) => (
          <Entry
            key={index}
            index={index}
            title={entry.name}
            meta={entry.role}
            onRemove={() =>
              patch(
                'leadership',
                sections.leadership.filter((_, i) => i !== index),
              )
            }
          >
            <Input
              label="Initials"
              value={entry.initials}
              onChange={(event) =>
                patch(
                  'leadership',
                  sections.leadership.map((item, i) =>
                    i === index ? { ...item, initials: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              label="Name"
              value={entry.name}
              onChange={(event) =>
                patch(
                  'leadership',
                  sections.leadership.map((item, i) =>
                    i === index ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              label="Role"
              value={entry.role}
              onChange={(event) =>
                patch(
                  'leadership',
                  sections.leadership.map((item, i) =>
                    i === index ? { ...item, role: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              label="Years"
              value={entry.years}
              onChange={(event) =>
                patch(
                  'leadership',
                  sections.leadership.map((item, i) =>
                    i === index ? { ...item, years: event.target.value } : item,
                  ),
                )
              }
            />
            <Full>
              <Textarea
                label="Focus"
                rows={2}
                value={entry.focus}
                onChange={(event) =>
                  patch(
                    'leadership',
                    sections.leadership.map((item, i) =>
                      i === index ? { ...item, focus: event.target.value } : item,
                    ),
                  )
                }
              />
            </Full>
          </Entry>
        ))}
      </Section>

      <Section
        title="Certifications"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              patch('certifications', [
                ...sections.certifications,
                { code: '', label: '', body: '' },
              ])
            }
          >
            Add certification
          </Button>
        }
      >
        {sections.certifications.map((entry, index) => (
          <Entry
            key={index}
            index={index}
            title={entry.label}
            meta={entry.code}
            onRemove={() =>
              patch(
                'certifications',
                sections.certifications.filter((_, i) => i !== index),
              )
            }
          >
            <Input
              label="Code"
              value={entry.code}
              onChange={(event) =>
                patch(
                  'certifications',
                  sections.certifications.map((item, i) =>
                    i === index ? { ...item, code: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              label="Label"
              value={entry.label}
              onChange={(event) =>
                patch(
                  'certifications',
                  sections.certifications.map((item, i) =>
                    i === index ? { ...item, label: event.target.value } : item,
                  ),
                )
              }
            />
            <Full>
              <Textarea
                label="Body"
                rows={2}
                value={entry.body}
                onChange={(event) =>
                  patch(
                    'certifications',
                    sections.certifications.map((item, i) =>
                      i === index ? { ...item, body: event.target.value } : item,
                    ),
                  )
                }
              />
            </Full>
          </Entry>
        ))}
      </Section>

      <Section
        title="Safety standards"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              patch('safety', [...sections.safety, { icon: 'shield', title: '', body: '' }])
            }
          >
            Add standard
          </Button>
        }
      >
        {sections.safety.map((entry, index) => (
          <Entry
            key={index}
            index={index}
            title={entry.title}
            meta={`icon: ${entry.icon}`}
            onRemove={() =>
              patch(
                'safety',
                sections.safety.filter((_, i) => i !== index),
              )
            }
          >
            <Input
              label="Icon name"
              value={entry.icon}
              onChange={(event) =>
                patch(
                  'safety',
                  sections.safety.map((item, i) =>
                    i === index ? { ...item, icon: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              label="Title"
              value={entry.title}
              onChange={(event) =>
                patch(
                  'safety',
                  sections.safety.map((item, i) =>
                    i === index ? { ...item, title: event.target.value } : item,
                  ),
                )
              }
            />
            <Full>
              <Textarea
                label="Body"
                rows={2}
                value={entry.body}
                onChange={(event) =>
                  patch(
                    'safety',
                    sections.safety.map((item, i) =>
                      i === index ? { ...item, body: event.target.value } : item,
                    ),
                  )
                }
              />
            </Full>
          </Entry>
        ))}
      </Section>

      <Section
        title="Quality gates"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              patch('qualityGates', [
                ...sections.qualityGates,
                { index: '', gate: '', evidence: '', owner: '' },
              ])
            }
          >
            Add gate
          </Button>
        }
      >
        {sections.qualityGates.map((entry, index) => (
          <Entry
            key={index}
            index={index}
            title={entry.gate}
            meta={entry.owner}
            onRemove={() =>
              patch(
                'qualityGates',
                sections.qualityGates.filter((_, i) => i !== index),
              )
            }
          >
            <Input
              label="Index"
              value={entry.index}
              onChange={(event) =>
                patch(
                  'qualityGates',
                  sections.qualityGates.map((item, i) =>
                    i === index ? { ...item, index: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              label="Gate"
              value={entry.gate}
              onChange={(event) =>
                patch(
                  'qualityGates',
                  sections.qualityGates.map((item, i) =>
                    i === index ? { ...item, gate: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              label="Evidence"
              value={entry.evidence}
              onChange={(event) =>
                patch(
                  'qualityGates',
                  sections.qualityGates.map((item, i) =>
                    i === index ? { ...item, evidence: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              label="Owner"
              value={entry.owner}
              onChange={(event) =>
                patch(
                  'qualityGates',
                  sections.qualityGates.map((item, i) =>
                    i === index ? { ...item, owner: event.target.value } : item,
                  ),
                )
              }
            />
          </Entry>
        ))}
      </Section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  AMC                                                                        */
/* -------------------------------------------------------------------------- */

export function AmcTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const details = draft.amcDetails
  const set = (patch: Partial<SiteContent['amcDetails']>) =>
    update((current) => ({ ...current, amcDetails: { ...current.amcDetails, ...patch } }))

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Plan terms"
        description="Response, parts and reporting commitments per plan."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              set({
                terms: [
                  ...details.terms,
                  {
                    id: `plan-${Date.now().toString(36)}`,
                    response: '',
                    parts: '',
                    reporting: '',
                    bestFor: '',
                    commitment: '',
                  },
                ],
              })
            }
          >
            Add term
          </Button>
        }
      >
        {details.terms.map((entry, index) => (
          <Entry
            key={index}
            index={index}
            title={entry.id}
            meta={entry.response}
            onRemove={() => set({ terms: details.terms.filter((_, i) => i !== index) })}
          >
            <Input
              label="Plan id"
              value={entry.id}
              onChange={(event) =>
                set({
                  terms: details.terms.map((item, i) =>
                    i === index ? { ...item, id: event.target.value } : item,
                  ),
                })
              }
            />
            <Input
              label="Response"
              value={entry.response}
              onChange={(event) =>
                set({
                  terms: details.terms.map((item, i) =>
                    i === index ? { ...item, response: event.target.value } : item,
                  ),
                })
              }
            />
            <Input
              label="Parts"
              value={entry.parts}
              onChange={(event) =>
                set({
                  terms: details.terms.map((item, i) =>
                    i === index ? { ...item, parts: event.target.value } : item,
                  ),
                })
              }
            />
            <Input
              label="Reporting"
              value={entry.reporting}
              onChange={(event) =>
                set({
                  terms: details.terms.map((item, i) =>
                    i === index ? { ...item, reporting: event.target.value } : item,
                  ),
                })
              }
            />
            <Input
              label="Best for"
              value={entry.bestFor}
              onChange={(event) =>
                set({
                  terms: details.terms.map((item, i) =>
                    i === index ? { ...item, bestFor: event.target.value } : item,
                  ),
                })
              }
            />
            <Input
              label="Commitment"
              value={entry.commitment}
              onChange={(event) =>
                set({
                  terms: details.terms.map((item, i) =>
                    i === index ? { ...item, commitment: event.target.value } : item,
                  ),
                })
              }
            />
          </Entry>
        ))}
      </Section>

      <Section
        title="Visit schedule"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              set({
                schedule: [
                  ...details.schedule,
                  { period: '', essential: '', comprehensive: '', precision: '' },
                ],
              })
            }
          >
            Add row
          </Button>
        }
      >
        {details.schedule.map((row, index) => (
          <div
            key={index}
            className="grid gap-2 border border-line/70 bg-panel-2/30 p-3 md:grid-cols-4"
          >
            <Input
              label="Period"
              value={row.period}
              onChange={(event) =>
                set({
                  schedule: details.schedule.map((item, i) =>
                    i === index ? { ...item, period: event.target.value } : item,
                  ),
                })
              }
            />
            <Input
              label="Essential"
              value={row.essential}
              onChange={(event) =>
                set({
                  schedule: details.schedule.map((item, i) =>
                    i === index ? { ...item, essential: event.target.value } : item,
                  ),
                })
              }
            />
            <Input
              label="Comprehensive"
              value={row.comprehensive}
              onChange={(event) =>
                set({
                  schedule: details.schedule.map((item, i) =>
                    i === index ? { ...item, comprehensive: event.target.value } : item,
                  ),
                })
              }
            />
            <div className="flex items-end gap-2">
              <Input
                label="Precision"
                value={row.precision}
                onChange={(event) =>
                  set({
                    schedule: details.schedule.map((item, i) =>
                      i === index ? { ...item, precision: event.target.value } : item,
                    ),
                  })
                }
              />
              <button
                type="button"
                aria-label="Remove row"
                onClick={() => set({ schedule: details.schedule.filter((_, i) => i !== index) })}
                className="mb-0 flex h-[var(--btn-h-md)] w-9 shrink-0 items-center justify-center border border-line text-fg-faint hover:text-danger"
              >
                <Icon name="close" size={11} />
              </button>
            </div>
          </div>
        ))}
      </Section>

      <Section
        title="SLA table"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() => set({ sla: [...details.sla, { metric: '', standard: '', note: '' }] })}
          >
            Add SLA
          </Button>
        }
      >
        {details.sla.map((row, index) => (
          <div
            key={index}
            className="grid gap-2 border border-line/70 bg-panel-2/30 p-3 md:grid-cols-[1fr_1fr_1.4fr_32px]"
          >
            <Input
              label="Metric"
              value={row.metric}
              onChange={(event) =>
                set({
                  sla: details.sla.map((item, i) =>
                    i === index ? { ...item, metric: event.target.value } : item,
                  ),
                })
              }
            />
            <Input
              label="Standard"
              value={row.standard}
              onChange={(event) =>
                set({
                  sla: details.sla.map((item, i) =>
                    i === index ? { ...item, standard: event.target.value } : item,
                  ),
                })
              }
            />
            <Input
              label="Note"
              value={row.note}
              onChange={(event) =>
                set({
                  sla: details.sla.map((item, i) =>
                    i === index ? { ...item, note: event.target.value } : item,
                  ),
                })
              }
            />
            <button
              type="button"
              aria-label="Remove SLA"
              onClick={() => set({ sla: details.sla.filter((_, i) => i !== index) })}
              className="mt-6 flex h-[var(--btn-h-md)] items-center justify-center border border-line text-fg-faint hover:text-danger"
            >
              <Icon name="close" size={11} />
            </button>
          </div>
        ))}
      </Section>

      <Section title="Included / excluded">
        <Full>
          <Textarea
            label="Included · one per line"
            rows={5}
            value={details.includes.join('\n')}
            onChange={(event) => set({ includes: splitLines(event.target.value) })}
          />
        </Full>
        <Full>
          <Textarea
            label="Excluded · one per line"
            rows={5}
            value={details.excludes.join('\n')}
            onChange={(event) => set({ excludes: splitLines(event.target.value) })}
          />
        </Full>
      </Section>

      <Section
        title="AMC questions"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              set({ faqs: [...details.faqs, { question: 'New question', answer: '' }] })
            }
          >
            Add question
          </Button>
        }
      >
        {details.faqs.map((faq, index) => (
          <div key={index} className="border border-line/70 bg-panel-2/30 p-3">
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  label={`Question ${index + 1}`}
                  value={faq.question}
                  onChange={(event) =>
                    set({
                      faqs: details.faqs.map((item, i) =>
                        i === index ? { ...item, question: event.target.value } : item,
                      ),
                    })
                  }
                />
                <Textarea
                  label="Answer"
                  rows={2}
                  value={faq.answer}
                  onChange={(event) =>
                    set({
                      faqs: details.faqs.map((item, i) =>
                        i === index ? { ...item, answer: event.target.value } : item,
                      ),
                    })
                  }
                />
              </div>
              <button
                type="button"
                aria-label="Remove question"
                onClick={() => set({ faqs: details.faqs.filter((_, i) => i !== index) })}
                className="mt-6 text-fg-faint hover:text-danger"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          </div>
        ))}
      </Section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Voices & brands                                                            */
/* -------------------------------------------------------------------------- */

export function VoicesTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const patch = (id: string, change: Partial<SiteContent['testimonials'][number]>) =>
    update((current) => ({
      ...current,
      testimonials: current.testimonials.map((entry) =>
        entry.id === id ? { ...entry, ...change } : entry,
      ),
    }))

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Testimonials"
        description="Published quotes appear in the home Voices section. Unpublished quotes stay hidden."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() =>
              update((current) => ({
                ...current,
                testimonials: [
                  ...current.testimonials,
                  { id: newId('voice'), quote: '', context: '', published: false },
                ],
              }))
            }
          >
            Add quote
          </Button>
        }
      >
        {draft.testimonials.map((entry, index) => (
          <div key={entry.id} className="border border-line bg-panel/40 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                Quote {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-4">
                <Toggle
                  checked={entry.published}
                  onChange={(checked) => patch(entry.id, { published: checked })}
                  label="Published"
                />
                <button
                  type="button"
                  aria-label="Delete quote"
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      testimonials: current.testimonials.filter((item) => item.id !== entry.id),
                    }))
                  }
                  className="text-fg-faint hover:text-danger"
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Full>
                <Textarea
                  label="Quote"
                  rows={3}
                  value={entry.quote}
                  onChange={(event) => patch(entry.id, { quote: event.target.value })}
                />
              </Full>
              <Full>
                <Input
                  label="Context"
                  value={entry.context}
                  onChange={(event) => patch(entry.id, { context: event.target.value })}
                />
              </Full>
            </div>
          </div>
        ))}
      </Section>

      <Section
        title="Equipment brands"
        description="The marquee under the work section, one brand per line."
      >
        <Full>
          <Textarea
            label="Brands"
            rows={8}
            value={draft.equipmentBrands.join('\n')}
            onChange={(event) =>
              update((current) => ({ ...current, equipmentBrands: splitLines(event.target.value) }))
            }
          />
        </Full>
      </Section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Legal                                                                      */
/* -------------------------------------------------------------------------- */

export function LegalTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const [selectedSlug, setSelectedSlug] = useState('')
  const selected = draft.legal.find((entry) => entry.slug === selectedSlug) ?? null
  const patch = (slug: string, change: Partial<SiteContent['legal'][number]>) =>
    update((current) => ({
      ...current,
      legal: current.legal.map((entry) => (entry.slug === slug ? { ...entry, ...change } : entry)),
    }))
  const addDocument = () => {
    const slug = newId('policy')
    update((current) => ({
      ...current,
      legal: [
        ...current.legal,
        {
          slug,
          title: 'New policy',
          summary: '',
          updatedAt: new Date().toISOString().slice(0, 10),
          sections: [{ heading: 'Overview', body: [''] }],
          published: false,
        },
      ],
    }))
    setSelectedSlug(slug)
  }

  if (!selected) {
    return (
      <CollectionPageCards
        title="Legal document pages"
        description={`${draft.legal.length} legal pages. Open a card to edit its summary, sections, publication state and route.`}
        items={draft.legal.map((entry) => ({
          id: entry.slug,
          title: entry.title,
          meta: `/legal/${entry.slug} · ${entry.sections.length} sections`,
          summary: entry.summary,
          published: entry.published,
        }))}
        onOpen={setSelectedSlug}
        onAdd={addDocument}
        addLabel="Add document"
      />
    )
  }

  return (
    <Section
      title="Legal documents"
      description="Each published document is served at /legal/<slug> and linked in the footer and sitemap. Body paragraphs are one per line."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" size="sm" icon="chevron-left" onClick={() => setSelectedSlug('')}>
            All legal pages
          </Button>
          <Button variant="secondary" size="sm" icon="plus" onClick={addDocument}>
            Add document
          </Button>
        </div>
      }
    >
      {draft.legal
        .filter((entry) => entry.slug === selected.slug)
        .map((document, index) => (
          <Entry
            key={index}
            index={index}
            title={document.title}
            meta={`/legal/${document.slug} · ${document.sections.length} sections`}
            onRemove={() =>
              update((current) => ({
                ...current,
                legal: current.legal.filter((entry) => entry.slug !== document.slug),
              }))
            }
          >
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border border-line/70 bg-panel-2/30 px-3 py-2">
              <Badge tone={document.published ? 'success' : 'neutral'} dot>
                {document.published ? 'Published' : 'Draft'}
              </Badge>
              <Toggle
                checked={document.published}
                onChange={(checked) => patch(document.slug, { published: checked })}
                label="Published"
              />
            </div>
            <Input
              label="Title"
              value={document.title}
              onChange={(event) => patch(document.slug, { title: event.target.value })}
            />
            <Input
              label="Slug"
              value={document.slug}
              onChange={(event) =>
                patch(document.slug, {
                  slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                })
              }
            />
            <Input
              label="Last updated"
              type="date"
              value={document.updatedAt}
              onChange={(event) => patch(document.slug, { updatedAt: event.target.value })}
            />
            <Input
              label="Summary"
              value={document.summary}
              onChange={(event) => patch(document.slug, { summary: event.target.value })}
            />
            <Full>
              <div className="flex flex-col gap-3 border border-line/70 bg-panel-2/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                    Sections
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      patch(document.slug, {
                        sections: [...document.sections, { heading: 'New section', body: [''] }],
                      })
                    }
                    className="font-mono text-[8px] uppercase text-cold hover:text-fg"
                  >
                    + Add section
                  </button>
                </div>
                {document.sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="border border-line bg-panel p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-1 flex-col gap-2">
                        <Input
                          label={`Heading ${sectionIndex + 1}`}
                          value={section.heading}
                          onChange={(event) =>
                            patch(document.slug, {
                              sections: document.sections.map((item, i) =>
                                i === sectionIndex
                                  ? { ...item, heading: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                        <Textarea
                          label="Body · one paragraph per line"
                          rows={4}
                          value={section.body.join('\n')}
                          onChange={(event) =>
                            patch(document.slug, {
                              sections: document.sections.map((item, i) =>
                                i === sectionIndex
                                  ? { ...item, body: splitLines(event.target.value) }
                                  : item,
                              ),
                            })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        aria-label="Remove section"
                        onClick={() =>
                          patch(document.slug, {
                            sections: document.sections.filter((_, i) => i !== sectionIndex),
                          })
                        }
                        className="mt-6 text-fg-faint hover:text-danger"
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Full>
          </Entry>
        ))}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Billing identity                                                           */
/* -------------------------------------------------------------------------- */

export function BillingTab({ draft, update }: { draft: SiteContent; update: Update }) {
  const billing = draft.brand.billing
  const patch = (change: Partial<typeof billing>) =>
    update((current) => ({
      ...current,
      brand: { ...current.brand, billing: { ...current.brand.billing, ...change } },
    }))

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Bank & payment identity"
        description="Printed in the invoice footer and on the payment block. The invoice prefix is used for new references."
      >
        <Input
          label="Bank name"
          value={billing.bankName}
          onChange={(event) => patch({ bankName: event.target.value })}
        />
        <Input
          label="Account name"
          value={billing.accountName}
          onChange={(event) => patch({ accountName: event.target.value })}
        />
        <Input
          label="Account number"
          value={billing.accountNumber}
          onChange={(event) => patch({ accountNumber: event.target.value })}
        />
        <Input
          label="Routing number"
          value={billing.ifsc}
          onChange={(event) => patch({ ifsc: event.target.value })}
        />
        <Input
          label="Payment link"
          value={billing.upiId}
          onChange={(event) => patch({ upiId: event.target.value })}
        />
        <Input
          label="Invoice prefix"
          value={billing.invoicePrefix}
          onChange={(event) => patch({ invoicePrefix: event.target.value.toUpperCase() })}
          placeholder="INV"
        />
        <Full>
          <Textarea
            label="Default invoice terms"
            rows={4}
            value={billing.invoiceTerms}
            onChange={(event) => patch({ invoiceTerms: event.target.value })}
          />
        </Full>
        <Full>
          <Textarea
            label="Default invoice notes"
            rows={3}
            value={billing.invoiceNotes}
            onChange={(event) => patch({ invoiceNotes: event.target.value })}
          />
        </Full>
      </Section>

      <div className="border border-line bg-panel/30 p-4 text-[11px] leading-relaxed text-fg-faint">
        These are default values. Existing invoices keep the terms and notes saved on the invoice
        itself; changing this identity only affects new invoices and printed payment details.
      </div>
    </div>
  )
}
