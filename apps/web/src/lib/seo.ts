import { useEffect, useMemo } from 'react'
import type { SiteContent } from '@hvac/shared'
import { useBrand } from '@/brand/BrandProvider'
import { useSiteContent } from '@/content/SiteContentProvider'
import type { BrandConfig } from '@/brand/brand.config'

/**
 * SEO is built once per route in a pure payload, then applied to the DOM on the
 * client or captured by the SSR entry and injected into the first HTML response.
 * Crawlers therefore see the same title, description, canonical and JSON-LD as
 * a visitor after hydration.
 */

export interface SeoServiceInput {
  name: string
  description: string
  category: string
}
export interface SeoOptions {
  path: string
  title?: string
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

export interface SeoPayload {
  documentTitle: string
  description: string
  keywords: string
  robots: string
  canonical: string
  image: string
  type: 'website' | 'article'
  siteName: string
  locale: string
  author: string
  jsonLd: Record<string, unknown>
}

const META_ATTR = 'data-hvac-seo'
let captured: SeoPayload | null = null

export function beginSeoCapture(): void {
  captured = null
}

export function takeSeoCapture(): SeoPayload | null {
  return captured
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

export function buildSeoPayload(
  options: SeoOptions,
  content: SiteContent,
  brand: BrandConfig,
): SeoPayload {
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
  const seo = content.seo
  const page = seo.pages.find((entry) => entry.path === path) ?? null
  const base = seo.canonicalBase.replace(/\/+$/, '')
  const resolvedTitle = title ?? page?.title ?? ''
  const documentTitle = resolvedTitle
    ? applyTemplate(seo.titleTemplate, resolvedTitle, brand.name)
    : `${brand.name} — ${brand.tagline}`
  const resolvedDescription = description ?? page?.description ?? seo.defaultDescription
  const canonical = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const image = absoluteUrl(
    base,
    seo.ogImage || brand.socialImage || brand.logo?.wordmark || brand.logo?.mark || '',
  )
  const robots = noindex ? 'noindex, nofollow' : seo.robots

  const trail = breadcrumbs
    ? breadcrumbs
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
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl(base, brand.logo?.mark || brand.logo?.wordmark || image),
      },
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

  if (faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    })
  }
  if (service) {
    graph.push({
      '@type': 'Service',
      '@id': `${canonical}#service`,
      name: service.name,
      description: service.description,
      serviceType: service.category,
      url: canonical,
      provider: { '@id': `${base}/#organization` },
      areaServed: brand.serviceAreas.map((area) => ({ '@type': 'City', name: area.city })),
    })
  }
  if (article) {
    graph.push({
      '@type': 'Article',
      '@id': `${canonical}#article`,
      headline: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      articleSection: article.category,
      keywords: article.tags.join(', '),
      inLanguage: 'en-US',
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      author: {
        '@type': 'Person',
        name: article.authorName,
        jobTitle: article.authorRole,
      },
      publisher: { '@id': `${base}/#organization` },
      image,
    })
  }
  if (itemList?.length) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${canonical}#items`,
      name: resolvedTitle || brand.name,
      numberOfItems: itemList.length,
      itemListElement: itemList.map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: entry.name,
        url: `${base}${entry.path.startsWith('/') ? entry.path : `/${entry.path}`}`,
        ...(entry.description ? { description: entry.description } : {}),
      })),
    })
  }

  return {
    documentTitle,
    description: resolvedDescription,
    keywords: seo.keywords.join(', '),
    robots,
    canonical,
    image,
    type,
    siteName: brand.name,
    locale: 'en_US',
    author: brand.legalName,
    jsonLd: { '@context': 'https://schema.org', '@graph': graph },
  }
}

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

function applySeo(payload: SeoPayload): void {
  document.title = payload.documentTitle
  upsertMeta('name', 'description', payload.description)
  upsertMeta('name', 'keywords', payload.keywords)
  upsertMeta('name', 'robots', payload.robots)
  upsertMeta('name', 'author', payload.author)
  upsertCanonical(payload.canonical)

  upsertMeta('property', 'og:type', payload.type)
  upsertMeta('property', 'og:site_name', payload.siteName)
  upsertMeta('property', 'og:title', payload.documentTitle)
  upsertMeta('property', 'og:description', payload.description)
  upsertMeta('property', 'og:url', payload.canonical)
  upsertMeta('property', 'og:image', payload.image)
  upsertMeta(
    'property',
    'og:image:alt',
    `${payload.siteName} — ${payload.description.slice(0, 120)}`,
  )
  upsertMeta('property', 'og:locale', payload.locale)

  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', payload.documentTitle)
  upsertMeta('name', 'twitter:description', payload.description)
  upsertMeta('name', 'twitter:image', payload.image)

  let script = document.getElementById('hvac-jsonld') as HTMLScriptElement | null
  if (!script) {
    script = document.createElement('script')
    script.id = 'hvac-jsonld'
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(payload.jsonLd)
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

  const faqsKey = faqs && faqs.length ? JSON.stringify(faqs) : ''
  const serviceKey = service ? JSON.stringify(service) : ''
  const articleKey = article ? JSON.stringify(article) : ''
  const breadcrumbsKey = breadcrumbs ? JSON.stringify(breadcrumbs) : ''
  const itemListKey = itemList ? JSON.stringify(itemList) : ''

  const payload = useMemo(
    () =>
      buildSeoPayload(
        { path, title, description, noindex, type, faqs, service, article, breadcrumbs, itemList },
        content,
        brand,
      ),
    // Stable primitives keep this cheap while still rebuilding on content edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
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
    ],
  )

  if (typeof window === 'undefined') capture(payload)
  useEffect(() => {
    applySeo(payload)
  }, [payload])
}

function capture(payload: SeoPayload): void {
  captured = payload
}
