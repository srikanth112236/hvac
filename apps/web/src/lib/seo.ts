import { useEffect } from 'react'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'

/** Runtime SEO for the client-rendered site. The admin owns the metadata
 * document; this hook resolves the current route against it and writes the
 * title, description, canonical, Open Graph, Twitter and JSON-LD records.
 *
 * Rendering happens in the browser, so crawlers that execute JavaScript (and
 * the Googlebot renderer) see the same tags as a visitor. The API also serves
 * sitemap.xml and robots.txt from the same content document.
 */

export interface SeoServiceInput {
  name: string
  description: string
  category: string
}
export interface SeoOptions {
  /** Exact public route, e.g. "/services/vrf-systems". */
  path: string
  /** Page-level title that overrides the metadata record. */
  title?: string
  /** Page-level description that overrides the metadata record. */
  description?: string
  noindex?: boolean
  type?: 'website' | 'article'
  faqs?: { question: string; answer: string }[]
  service?: SeoServiceInput
  article?: SeoArticleInput
  breadcrumbs?: { name: string; path: string }[]
  itemList?: { name: string; path: string; description?: string }[]
}
export interface SeoArticleInput {
  title: string
  description: string
  slug: string
  publishedAt: string
  updatedAt: string
  authorName: string
  authorRole: string
  category: string
  tags: string[]
}

const META_ATTR = 'data-hvac-seo'

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, key)
    element.setAttribute(META_ATTR, '1')
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    link.setAttribute(META_ATTR, '1')
    document.head.appendChild(link)
  }
  link.href = href
}

function absoluteUrl(base: string, value: string): string {
  if (!value) return base
  if (/^https?:\/\//i.test(value)) return value
  return `${base}${value.startsWith('/') ? '' : '/'}${value}`
}

function applyTemplate(template: string, page: string, brand: string): string {
  const source = template.trim() || '{page} · {brand}'
  const withPage = source.split('{page}').join(page)
  return withPage.split('{brand}').join(brand)
}

export function useSeo(options: SeoOptions): void {
  const { content } = useSiteContent()
  const brand = useBrand()
  const {
    path,
    title,
    description,
    noindex = false,
    type = 'website',
    faqs,
    service,
    article,
    breadcrumbs,
    itemList,
  } = options

  // Stable primitive dependencies so the effect does not re-run on unrelated renders.
  const faqsKey = faqs && faqs.length ? JSON.stringify(faqs) : ''
  const serviceKey = service ? JSON.stringify(service) : ''
  const articleKey = article ? JSON.stringify(article) : ''
  const breadcrumbsKey = breadcrumbs ? JSON.stringify(breadcrumbs) : ''
  const itemListKey = itemList ? JSON.stringify(itemList) : ''

  useEffect(() => {
    const seo = content.seo
    const page = seo.pages.find((entry) => entry.path === path) ?? null
    const base = seo.canonicalBase.replace(/\/+$/, '')
    const resolvedTitle = title ?? page?.title ?? ''
    const documentTitle = resolvedTitle
      ? applyTemplate(seo.titleTemplate, resolvedTitle, brand.name)
      : `${brand.name} — ${brand.tagline}`
    const resolvedDescription = description ?? page?.description ?? seo.defaultDescription
    const canonical = `${base}${path.startsWith('/') ? path : `/${path}`}`
    const image = absoluteUrl(base, seo.ogImage)
    const robots = noindex ? 'noindex, nofollow' : seo.robots

    document.title = documentTitle
    upsertMeta('name', 'description', resolvedDescription)
    upsertMeta('name', 'keywords', seo.keywords.join(', '))
    upsertMeta('name', 'robots', robots)
    upsertMeta('name', 'author', brand.legalName)
    upsertCanonical(canonical)

    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:site_name', brand.name)
    upsertMeta('property', 'og:title', documentTitle)
    upsertMeta('property', 'og:description', resolvedDescription)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:image', image)
    upsertMeta('property', 'og:image:alt', `${brand.name} — ${brand.tagline}`)
    upsertMeta('property', 'og:locale', 'en_US')

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', documentTitle)
    upsertMeta('name', 'twitter:description', resolvedDescription)
    upsertMeta('name', 'twitter:image', image)

    const trail = breadcrumbsKey
      ? (JSON.parse(breadcrumbsKey) as { name: string; path: string }[])
      : path === '/'
        ? []
        : [{ name: resolvedTitle || brand.name, path }]

    const graph: Record<string, unknown>[] = [
      {
        '@type': ['Organization', 'HVACBusiness'],
        '@id': `${base}/#organization`,
        name: brand.name,
        legalName: brand.legalName,
        url: base,
        description: brand.description,
        telephone: brand.contact.phone,
        email: brand.contact.email,
        image,
        logo: { '@type': 'ImageObject', url: image },
        address: {
          '@type': 'PostalAddress',
          streetAddress: [brand.address.line1, brand.address.line2].filter(Boolean).join(', '),
          addressLocality: brand.address.locality,
          addressRegion: brand.address.region,
          postalCode: brand.address.postalCode,
          addressCountry: brand.address.country,
        },
        areaServed: brand.serviceAreas.map((area) => ({
          '@type': 'City',
          name: area.city,
        })),
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            description: brand.hours.weekdays,
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: 'Saturday',
            description: brand.hours.saturday,
          },
        ],
        knowsAbout: seo.keywords,
        slogan: brand.tagline,
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: brand.name,
        description: seo.defaultDescription,
        inLanguage: 'en-US',
        publisher: { '@id': `${base}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${base}/`,
          },
          ...trail.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 2,
            name: crumb.name,
            item: `${base}${crumb.path.startsWith('/') ? crumb.path : `/${crumb.path}`}`,
          })),
        ],
      },
    ]

    if (faqsKey) {
      const parsed = JSON.parse(faqsKey) as { question: string; answer: string }[]
      graph.push({
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: parsed.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      })
    }

    if (serviceKey) {
      const parsed = JSON.parse(serviceKey) as SeoServiceInput
      graph.push({
        '@type': 'Service',
        '@id': `${canonical}#service`,
        name: parsed.name,
        description: parsed.description,
        serviceType: parsed.category,
        url: canonical,
        provider: { '@id': `${base}/#organization` },
        areaServed: brand.serviceAreas.map((area) => ({ '@type': 'City', name: area.city })),
      })
    }

    if (articleKey) {
      const parsed = JSON.parse(articleKey) as SeoArticleInput
      graph.push({
        '@type': 'Article',
        '@id': `${canonical}#article`,
        headline: parsed.title,
        description: parsed.description,
        datePublished: parsed.publishedAt,
        dateModified: parsed.updatedAt || parsed.publishedAt,
        articleSection: parsed.category,
        keywords: parsed.tags.join(', '),
        inLanguage: 'en-US',
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        author: {
          '@type': 'Person',
          name: parsed.authorName,
          jobTitle: parsed.authorRole,
        },
        publisher: { '@id': `${base}/#organization` },
        image,
      })
    }

    if (itemListKey) {
      const parsed = JSON.parse(itemListKey) as { name: string; path: string; description?: string }[]
      graph.push({
        '@type': 'ItemList',
        '@id': `${canonical}#items`,
        name: resolvedTitle || brand.name,
        numberOfItems: parsed.length,
        itemListElement: parsed.map((entry, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: entry.name,
          url: `${base}${entry.path.startsWith('/') ? entry.path : `/${entry.path}`}`,
          ...(entry.description ? { description: entry.description } : {}),
        })),
      })
    }

    let script = document.getElementById('hvac-jsonld') as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = 'hvac-jsonld'
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
  }, [
    content.seo,
    brand,
    path,
    title,
    description,
    noindex,
    type,
    faqsKey,
    serviceKey,
    articleKey,
    breadcrumbsKey,
    itemListKey,
  ])
}
