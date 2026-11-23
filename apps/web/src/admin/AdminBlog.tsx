import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  siteContentPayloadSchema,
  type SiteContent,
  type SiteContentPayload,
  type SitePost,
} from '@hvac/shared'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  Textarea,
  Toggle,
  useToast,
} from '@/components/ui'
import { Icon } from '@/components/icons'
import { adminApi, ApiError } from '@/admin/api'
import {
  AdminLoading,
  AdminPageHeader,
  InlineError,
  MetricCard,
  Panel,
  formatDate,
  formatDateTime,
} from '@/admin/ui'
import { ImagePickerField } from '@/admin/ImagePickerField'
import { RichTextEditor } from '@/admin/RichTextEditor'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

function emptyPost(): SitePost {
  const stamp = Date.now().toString(36)
  return {
    id: `post-${stamp}`,
    slug: `field-note-${stamp}`,
    title: '',
    excerpt: '',
    answer: '',
    category: 'Field notes',
    tags: [],
    authorName: 'Coolvane engineering desk',
    authorRole: 'Service and projects',
    publishedAt: today(),
    updatedAt: today(),
    readingMinutes: 5,
    heroPlate: 'CV-JRN',
    featured: false,
    published: false,
    body: '',
    bodyHtml: '',
    takeaways: [],
    faqs: [],
    relatedServices: [],
    seoTitle: '',
    seoDescription: '',
  }
}

function inlineMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return escaped
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

/**
 * Existing posts are Markdown. This converts the documented Markdown subset
 * into the HTML surface once, so old articles open in the rich editor without
 * a destructive migration. Saving writes sanitised `bodyHtml`.
 */
function markdownToHtml(markdown: string): string {
  const blocks = markdown.trim().split(/\n\s*\n/)
  return blocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      if (!lines.length) return ''
      const heading = /^(#{1,4})\s+(.+)$/.exec(lines[0] ?? '')
      if (heading && lines.length === 1) {
        return `<h${heading[1]?.length ?? 2}>${inlineMarkdown(heading[2] ?? '')}</h${heading[1]?.length ?? 2}>`
      }
      if (lines.every((line) => line.startsWith('> '))) {
        return `<blockquote>${inlineMarkdown(lines.map((line) => line.slice(2)).join(' '))}</blockquote>`
      }
      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`
      }
      if (lines.every((line) => /^\d+\.\s+/.test(line))) {
        return `<ol>${lines.map((line) => `<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`
      }
      return `<p>${inlineMarkdown(lines.join(' '))}</p>`
    })
    .join('')
}

function htmlToText(html: string): string {
  const node = document.createElement('div')
  node.innerHTML = html
  return (node.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function payloadFor(content: SiteContent): SiteContentPayload {
  return {
    brand: content.brand,
    theme: content.theme,
    home: content.home,
    about: content.about,
    workCases: content.workCases,
    processStages: content.processStages,
    processExtras: content.processExtras,
    aboutSections: content.aboutSections,
    amcDetails: content.amcDetails,
    testimonials: content.testimonials,
    equipmentBrands: content.equipmentBrands,
    posts: content.posts,
    products: content.products,
    legal: content.legal,
    pages: content.pages,
    pageSections: content.pageSections,
    services: content.services,
    plans: content.plans,
    faqs: content.faqs,
    seo: content.seo,
  }
}

function readingTime(text: string, fallback: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return words ? Math.max(1, Math.round(words / 220)) : fallback
}

export function AdminBlog() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [content, setContent] = useState<SiteContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([])
  const [draft, setDraft] = useState<SitePost | null>(null)
  const [bodyHtml, setBodyHtml] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const initializedFor = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    adminApi
      .content()
      .then((payload) => {
        if (active) setContent(payload)
      })
      .catch((caught) => {
        if (active)
          setError(caught instanceof Error ? caught.message : 'Could not load the journal.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!content || !postId) {
      setDraft(null)
      initializedFor.current = null
      return
    }
    if (initializedFor.current === postId) return
    initializedFor.current = postId
    if (postId === 'new') {
      setDraft(emptyPost())
      setBodyHtml('')
      return
    }
    const found = content.posts.find((post) => post.id === postId || post.slug === postId)
    if (!found) {
      setDraft(null)
      setError('That article could not be found. It may have been deleted.')
      return
    }
    setDraft(found)
    setBodyHtml(found.bodyHtml || markdownToHtml(found.body))
  }, [content, postId])

  const categories = useMemo(
    () => [...new Set(content?.posts.map((post) => post.category).filter(Boolean) ?? [])].sort(),
    [content],
  )

  const filteredPosts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...(content?.posts ?? [])]
      .filter((post) => {
        if (statusFilter === 'published' && !post.published) return false
        if (statusFilter === 'draft' && post.published) return false
        if (categoryFilter !== 'all' && post.category !== categoryFilter) return false
        if (!needle) return true
        return [post.title, post.slug, post.category, post.authorName, ...post.tags]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [content, query, statusFilter, categoryFilter])

  const metrics = useMemo(() => {
    const posts = content?.posts ?? []
    return {
      total: posts.length,
      published: posts.filter((post) => post.published).length,
      drafts: posts.filter((post) => !post.published).length,
      featured: posts.filter((post) => post.featured).length,
    }
  }, [content])

  const patch = (change: Partial<SitePost>) => {
    setDraft((current) => (current ? { ...current, ...change } : current))
    setIssues([])
    setError('')
  }

  const save = async (publish: boolean) => {
    if (!content || !draft) return
    const plainText = htmlToText(bodyHtml)
    if (draft.title.trim().length < 2) {
      toast({ title: 'Add a title', description: 'The article needs a headline.', tone: 'danger' })
      return
    }
    if (!draft.slug || !/^[a-z0-9-]+$/.test(draft.slug)) {
      toast({
        title: 'Check the slug',
        description: 'Use lowercase letters, numbers and hyphens.',
        tone: 'danger',
      })
      return
    }
    if (!plainText && !draft.body.trim()) {
      toast({ title: 'Write the article', description: 'The body is empty.', tone: 'danger' })
      return
    }
    const nextPost: SitePost = {
      ...draft,
      title: draft.title.trim(),
      slug: draft.slug.trim(),
      body: plainText || draft.body,
      bodyHtml,
      readingMinutes: readingTime(plainText || draft.body, draft.readingMinutes),
      published: publish,
      publishedAt: publish && !draft.publishedAt ? today() : draft.publishedAt,
      updatedAt: today(),
    }
    const nextPosts = content.posts.some((post) => post.id === nextPost.id)
      ? content.posts.map((post) => (post.id === nextPost.id ? nextPost : post))
      : [nextPost, ...content.posts]
    const payload = { ...payloadFor(content), posts: nextPosts }
    const validation = siteContentPayloadSchema.safeParse(payload)
    if (!validation.success) {
      setIssues(
        validation.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      )
      setError('Fix the article fields before saving.')
      return
    }
    setSaving(true)
    setError('')
    setIssues([])
    try {
      const result = await adminApi.saveContent(validation.data, content.version)
      setContent(result.data)
      setDraft(nextPost)
      setBodyHtml(bodyHtml)
      initializedFor.current = nextPost.id
      window.dispatchEvent(new Event('hvac-content-updated'))
      toast({
        title: publish ? 'Article published' : 'Draft saved',
        description: publish ? `${nextPost.title} is live.` : `${nextPost.title} saved as a draft.`,
        tone: 'success',
      })
      if (postId === 'new') {
        navigate(`/admin/blog/${nextPost.id}`, { replace: true })
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the article.')
      if (caught instanceof ApiError && caught.issues) {
        setIssues(caught.issues.map((issue) => ({ path: issue.path, message: issue.message })))
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!content || !draft) return
    if (!window.confirm(`Delete “${draft.title || 'this article'}”?`)) return
    setSaving(true)
    try {
      const payload = {
        ...payloadFor(content),
        posts: content.posts.filter((post) => post.id !== draft.id),
      }
      const result = await adminApi.saveContent(payload, content.version)
      setContent(result.data)
      window.dispatchEvent(new Event('hvac-content-updated'))
      toast({ title: 'Article deleted', tone: 'success' })
      navigate('/admin/blog', { replace: true })
    } catch (caught) {
      toast({
        title: 'Could not delete article',
        description: caught instanceof Error ? caught.message : 'Try again.',
        tone: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <AdminPageHeader eyebrow="Journal" title="Journal articles" />
        <AdminLoading rows={7} />
      </div>
    )
  }

  if (error && !draft && !content) {
    return <InlineError message={error} />
  }

  if (!content) {
    return <InlineError message={error || 'The journal could not be loaded.'} />
  }

  if (!postId) {
    return (
      <div className="flex flex-col gap-6 pb-16">
        <AdminPageHeader
          eyebrow="Journal · CV-EDITORIAL"
          title="The journal."
          description="Write and publish field notes from a dedicated editorial workspace. Add and edit happen on their own pages, with the article index kept clean."
          actions={
            <Link
              to="/admin/blog/new"
              className="flex h-9 items-center gap-2 border border-cold/60 bg-cold/[0.08] px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:bg-cold/15"
            >
              <Icon name="plus" size={12} /> New article
            </Link>
          }
        />

        {error ? <InlineError message={error} /> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Articles" value={metrics.total} note="All journal records" />
          <MetricCard
            label="Published"
            value={metrics.published}
            note="Live on the public journal"
            accent="success"
          />
          <MetricCard
            label="Drafts"
            value={metrics.drafts}
            note="Waiting on editorial review"
            accent="warn"
          />
          <MetricCard
            label="Featured"
            value={metrics.featured}
            note="Pinned in the journal hero"
            accent="cold"
          />
        </div>

        <div className="flex flex-col gap-3 border border-line bg-panel/25 p-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_170px_190px]">
            <Input
              label="Search articles"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, slug, category, author or tag"
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | 'published' | 'draft')
              }
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Drafts' },
              ]}
            />
            <Select
              label="Category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              options={[
                { value: 'all', label: 'All categories' },
                ...categories.map((category) => ({ value: category, label: category })),
              ]}
            />
          </div>
          <Badge tone="neutral">{filteredPosts.length} matching</Badge>
        </div>

        {filteredPosts.length === 0 ? (
          <EmptyState
            icon="filter"
            title="No articles in this view."
            description="Clear the filters or start a new article."
            action={
              <Link
                to="/admin/blog/new"
                className="flex h-9 items-center gap-2 border border-cold/60 bg-cold/[0.08] px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:bg-cold/15"
              >
                <Icon name="plus" size={12} /> New article
              </Link>
            }
          />
        ) : (
          <section className="overflow-x-auto border border-line bg-panel/20">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-base/40 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                  <th className="px-3 py-2.5 font-normal">Article</th>
                  <th className="px-3 py-2.5 font-normal">Status</th>
                  <th className="px-3 py-2.5 font-normal">Category</th>
                  <th className="px-3 py-2.5 font-normal">Author</th>
                  <th className="px-3 py-2.5 font-normal">Published</th>
                  <th className="px-3 py-2.5 font-normal">Updated</th>
                  <th className="px-3 py-2.5 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="align-top hover:bg-cold/[0.02]">
                    <td className="max-w-[360px] px-3 py-3">
                      <Link
                        to={`/admin/blog/${post.id}`}
                        title={post.title}
                        className="block max-w-[330px] truncate text-[12px] text-fg hover:text-cold"
                      >
                        {post.title}
                      </Link>
                      <span className="mt-1 block font-mono text-[8px] text-fg-faint">
                        /blog/{post.slug}
                      </span>
                      {post.featured ? (
                        <span className="mt-1 inline-block font-mono text-[8px] uppercase tracking-[0.08em] text-cold">
                          Featured
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={post.published ? 'success' : 'neutral'} dot>
                        {post.published ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-[10px] text-fg-dim">{post.category}</td>
                    <td className="px-3 py-3 text-[10px] text-fg-dim">
                      {post.authorName}
                      {post.authorRole ? (
                        <span className="mt-0.5 block text-[9px] text-fg-faint">
                          {post.authorRole}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-[10px] text-fg-faint">
                      {formatDate(post.publishedAt)}
                    </td>
                    <td className="px-3 py-3 text-[10px] text-fg-faint">
                      {formatDateTime(post.updatedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Link
                          to={`/admin/blog/${post.id}`}
                          className="flex h-8 items-center border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim hover:border-cold/50 hover:text-cold"
                        >
                          Edit
                        </Link>
                        {post.published ? (
                          <Link
                            to={`/blog/${post.slug}`}
                            target="_blank"
                            className="flex h-8 items-center border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-dim hover:border-cold/50 hover:text-cold"
                          >
                            View <Icon name="external" size={10} />
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          to="/admin/blog"
          className="flex w-fit items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint hover:text-cold"
        >
          <Icon name="arrow-right" size={11} className="rotate-180" /> All articles
        </Link>
        <InlineError message={error || 'Article not found.'} />
      </div>
    )
  }

  const isNew = postId === 'new'
  const tagsText = draft.tags.join(', ')
  const takeawaysText = draft.takeaways.join('\n')
  const relatedServicesText = draft.relatedServices.join(', ')

  return (
    <div className="flex flex-col gap-6 pb-16">
      <AdminPageHeader
        eyebrow={
          isNew ? 'Journal · New article' : `Journal · ${draft.published ? 'Published' : 'Draft'}`
        }
        title={isNew ? 'New field note.' : draft.title || 'Untitled article'}
        description={
          isNew
            ? 'Create the article on its own page, then publish it to the public journal.'
            : `Editing /blog/${draft.slug} · ${draft.published ? 'Live' : 'Draft'}`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/blog"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              <Icon name="arrow-right" size={12} className="rotate-180" /> All articles
            </Link>
            {draft.published ? (
              <Link
                to={`/blog/${draft.slug}`}
                target="_blank"
                className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
              >
                <Icon name="external" size={12} /> View live
              </Link>
            ) : null}
            <Button variant="secondary" loading={saving} onClick={() => void save(false)}>
              Save draft
            </Button>
            <Button
              loading={saving}
              onClick={() => void save(true)}
              icon={draft.published ? 'check' : 'plus'}
            >
              {draft.published ? 'Update article' : 'Publish article'}
            </Button>
          </div>
        }
      />

      {error ? <InlineError message={error} /> : null}
      {issues.length ? (
        <div className="border border-danger/40 bg-danger/[0.05] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-danger">
            Save blocked
          </p>
          <ul className="mt-2 max-h-32 overflow-auto text-[11px] leading-relaxed text-fg-dim">
            {issues.slice(0, 16).map((issue) => (
              <li key={`${issue.path}:${issue.message}`}>
                {issue.path || 'article'} — {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="flex flex-col gap-5">
          <Panel title="Article">
            <div className="grid gap-4">
              <Input
                label="Headline"
                required
                value={draft.title}
                placeholder="What changed, what we measured, what it means"
                onChange={(event) => patch({ title: event.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Input
                  label="Slug"
                  required
                  value={draft.slug}
                  hint="Used at /blog/your-slug. Lowercase letters, numbers and hyphens."
                  onChange={(event) => patch({ slug: slugify(event.target.value) })}
                />
                <Button variant="secondary" onClick={() => patch({ slug: slugify(draft.title) })}>
                  Generate from title
                </Button>
              </div>
              <Textarea
                label="Excerpt"
                rows={3}
                value={draft.excerpt}
                placeholder="The card and search-result summary."
                onChange={(event) => patch({ excerpt: event.target.value })}
              />
              <Textarea
                label="Direct answer"
                rows={4}
                value={draft.answer}
                placeholder="A concise answer for readers and structured data."
                onChange={(event) => patch({ answer: event.target.value })}
              />
            </div>
          </Panel>

          <Panel
            title="Article body"
            description="Format headings, lists, quotes, links, images, colour and emphasis. The rendered journal keeps the same typography."
            action={
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
                Rich text · stored safely
              </span>
            }
          >
            <RichTextEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Start with the question, the reading or the visit. Use H2 for sections, lists for checks, and links for references."
              minHeight={460}
            />
          </Panel>

          <Panel title="Reader notes">
            <div className="grid gap-4">
              <Textarea
                label="Key takeaways — one per line"
                rows={4}
                value={takeawaysText}
                placeholder="A 20% pressure drop costs the fan more than the filter."
                onChange={(event) =>
                  patch({
                    takeaways: event.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Textarea
                label="Related service ids — comma separated"
                rows={2}
                value={relatedServicesText}
                placeholder="ac-repair, ac-servicing"
                onChange={(event) =>
                  patch({
                    relatedServices: event.target.value
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
              />
              <div className="flex flex-col gap-3 border border-line bg-base/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                    Article questions
                  </span>
                  <Button
                    variant="quiet"
                    size="sm"
                    icon="plus"
                    onClick={() => patch({ faqs: [...draft.faqs, { question: '', answer: '' }] })}
                  >
                    Add question
                  </Button>
                </div>
                {draft.faqs.length === 0 ? (
                  <p className="text-[10px] text-fg-faint">
                    Optional FAQ entries feed the article structured data.
                  </p>
                ) : null}
                {draft.faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="grid gap-2 border border-line/70 p-2 sm:grid-cols-[1fr_1.5fr_auto]"
                  >
                    <Input
                      aria-label={`Article question ${index + 1}`}
                      placeholder="Question"
                      value={faq.question}
                      onChange={(event) =>
                        patch({
                          faqs: draft.faqs.map((entry, position) =>
                            position === index ? { ...entry, question: event.target.value } : entry,
                          ),
                        })
                      }
                    />
                    <Input
                      aria-label={`Article answer ${index + 1}`}
                      placeholder="Answer"
                      value={faq.answer}
                      onChange={(event) =>
                        patch({
                          faqs: draft.faqs.map((entry, position) =>
                            position === index ? { ...entry, answer: event.target.value } : entry,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label={`Remove question ${index + 1}`}
                      onClick={() =>
                        patch({ faqs: draft.faqs.filter((_, position) => position !== index) })
                      }
                      className="flex h-[38px] w-8 items-center justify-center border border-line text-fg-faint hover:border-danger/40 hover:text-danger"
                    >
                      <Icon name="close" size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
          <Panel title="Publication">
            <div className="grid gap-4">
              <div className="flex flex-col gap-3 border border-line bg-base/20 p-3">
                <Toggle
                  checked={draft.published}
                  onChange={(checked) =>
                    patch({
                      published: checked,
                      publishedAt: checked && !draft.publishedAt ? today() : draft.publishedAt,
                    })
                  }
                  label="Published"
                  description="Visible on the public journal."
                />
                <Toggle
                  checked={draft.featured}
                  onChange={(checked) => patch({ featured: checked })}
                  label="Featured"
                  description="Pinned in the journal hero."
                />
              </div>
              <Select
                label="Category"
                value={draft.category}
                onChange={(event) => patch({ category: event.target.value })}
                options={[
                  ...categories.map((category) => ({ value: category, label: category })),
                  ...(categories.includes(draft.category)
                    ? []
                    : [{ value: draft.category, label: draft.category }]),
                ]}
              />
              <Input
                label="Author"
                value={draft.authorName}
                onChange={(event) => patch({ authorName: event.target.value })}
              />
              <Input
                label="Author role"
                value={draft.authorRole}
                onChange={(event) => patch({ authorRole: event.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Published date"
                  type="date"
                  value={draft.publishedAt}
                  onChange={(event) => patch({ publishedAt: event.target.value })}
                />
                <Input
                  label="Reading minutes"
                  type="number"
                  min={1}
                  max={120}
                  value={draft.readingMinutes}
                  onChange={(event) => patch({ readingMinutes: Number(event.target.value) || 1 })}
                />
              </div>
              <Input
                label="Tags — comma separated"
                value={tagsText}
                onChange={(event) =>
                  patch({
                    tags: event.target.value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Input
                label="Hero plate code"
                value={draft.heroPlate}
                onChange={(event) => patch({ heroPlate: event.target.value })}
              />
            </div>
          </Panel>

          <Panel title="Cover image">
            <ImagePickerField
              label="Article cover"
              folder="blog"
              value={draft.coverImage}
              alt={draft.coverAlt}
              onChange={(change) => patch({ coverImage: change.image, coverAlt: change.imageAlt })}
              hint="Shown on the journal card and at the top of the article. Leave empty to keep the generated plate."
            />
          </Panel>

          <Panel title="SEO & social">
            <div className="grid gap-4">
              <Input
                label="SEO title"
                value={draft.seoTitle}
                hint={`${draft.seoTitle.length}/180`}
                onChange={(event) => patch({ seoTitle: event.target.value })}
              />
              <Textarea
                label="SEO description"
                rows={3}
                value={draft.seoDescription}
                hint={`${draft.seoDescription.length}/400`}
                onChange={(event) => patch({ seoDescription: event.target.value })}
              />
            </div>
          </Panel>

          {!isNew ? (
            <Panel title="Danger zone">
              <div className="flex flex-col gap-3">
                <p className="text-[11px] leading-relaxed text-fg-faint">
                  Deleting removes the article from the journal and publishes a new content version.
                </p>
                <Button variant="danger" size="sm" loading={saving} onClick={() => void remove()}>
                  Delete article
                </Button>
              </div>
            </Panel>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
