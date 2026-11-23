import { Router } from 'express'
import { readSiteContent } from './content.js'

/**
 * Crawler files generated from the live content document. Paths and services
 * added in the admin appear in sitemap.xml on the next request, so the sitemap
 * can never drift from the published catalogue.
 */
export const seoRouter = Router()

function canonicalBase(value: string): string {
  return value.replace(/\/+$/, '')
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

seoRouter.get('/robots.txt', async (_req, res) => {
  const content = await readSiteContent()
  const base = canonicalBase(content.seo.canonicalBase)
  res
    .type('text/plain')
    .send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api/',
        '',
        `Sitemap: ${base}/sitemap.xml`,
        '',
      ].join('\n'),
    )
})

seoRouter.get('/sitemap.xml', async (_req, res) => {
  const content = await readSiteContent()
  const base = canonicalBase(content.seo.canonicalBase)
  const lastmod = content.updatedAt.slice(0, 10)

  const paths = new Map<string, { changefreq: string; priority: string; lastmod?: string }>()
  const staticPaths: [string, string, string][] = [
    ['/', 'weekly', '1.0'],
    ['/services', 'weekly', '0.9'],
    ['/products', 'weekly', '0.9'],
    ['/blog', 'weekly', '0.8'],
    ['/about', 'monthly', '0.7'],
    ['/process', 'monthly', '0.7'],
    ['/work', 'monthly', '0.8'],
    ['/amc', 'monthly', '0.8'],
    ['/contact', 'monthly', '0.7'],
    ['/book', 'monthly', '0.8'],
    ['/quote', 'monthly', '0.8'],
    ['/tools', 'monthly', '0.7'],
  ]
  for (const [path, changefreq, priority] of staticPaths) {
    paths.set(path, { changefreq, priority })
  }
  for (const page of content.seo.pages) {
    if (!page.path.startsWith('/') || page.path.startsWith('/admin')) continue
    if (!paths.has(page.path)) paths.set(page.path, { changefreq: 'monthly', priority: '0.6' })
  }
  for (const service of content.services) {
    if (!service.published) continue
    paths.set(`/services/${service.id}`, { changefreq: 'monthly', priority: '0.8' })
  }
  for (const post of content.posts) {
    if (!post.published) continue
    paths.set(`/blog/${post.slug}`, {
      changefreq: 'monthly',
      priority: post.featured ? '0.8' : '0.7',
      lastmod: post.updatedAt || post.publishedAt || lastmod,
    })
  }
  for (const document of content.legal) {
    if (!document.published) continue
    paths.set(`/legal/${document.slug}`, { changefreq: 'yearly', priority: '0.3' })
  }

  const urls = Array.from(paths.entries())
    .map(([path, meta]) => {
      const loc = `${base}${path === '/' ? '/' : path}`
      return [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${escapeXml(meta.lastmod ?? lastmod)}</lastmod>`,
        `    <changefreq>${meta.changefreq}</changefreq>`,
        `    <priority>${meta.priority}</priority>`,
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  res
    .type('application/xml')
    .send(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urls,
        '</urlset>',
        '',
      ].join('\n'),
    )
})

seoRouter.get('/llms.txt', async (_req, res) => {
  const content = await readSiteContent()
  const base = canonicalBase(content.seo.canonicalBase)
  const posts = content.posts.filter((post) => post.published).slice(0, 20)
  const products = content.products.filter((product) => product.published)
  const lines = [
    `# ${content.brand.name}`,
    '',
    `> ${content.brand.description}`,
    '',
    `Canonical: ${base}`,
    `Updated: ${content.updatedAt.slice(0, 10)}`,
    `Coverage: ${content.brand.serviceAreas.map((area) => `${area.city} (${area.radiusKm} km)`).join('; ')}`,
    `Emergency target: ${content.brand.stats.emergencyResponseHours} hours inside the contracted radius.`,
    `Contact: ${content.brand.contact.phoneDisplay} · ${content.brand.contact.email}`,
    '',
    '## Key pages',
    '',
    `- [Services](${base}/services): service catalogue with scope, exclusions and starting prices.`,
    `- [Systems](${base}/products): ${content.pages.products.lead}`,
    `- [Journal](${base}/blog): ${content.pages.blog.lead}`,
    `- [Process](${base}/process): survey, installation, commissioning and handover sequence.`,
    `- [Work](${base}/work): installed systems with capacity, location and scope.`,
    `- [Contact](${base}/contact): enquiry form and works desk details.`,
    '',
    '## Published systems',
    '',
    ...products.map(
      (product) =>
        `- [${product.name}](${base}/products#${product.slug}): ${product.summary} Capacity: ${product.capacity}. ${product.priceFrom} — ${product.priceNote}; final scope quoted after survey.`,
    ),
    '',
    '## Field notes',
    '',
    ...posts.map(
      (post) =>
        `- [${post.title}](${base}/blog/${post.slug}): ${post.excerpt} Published ${post.publishedAt}.`,
    ),
    '',
    '## Attribution',
    '',
    `Cite ${content.brand.name} with the canonical URL. Prices are starting points for a defined scope and are confirmed after a site survey.`,
    '',
  ]
  res.type('text/plain').send(lines.join('\n'))
})

seoRouter.get('/feed.xml', async (_req, res) => {
  const content = await readSiteContent()
  const base = canonicalBase(content.seo.canonicalBase)
  const posts = content.posts
    .filter((post) => post.published)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 30)
  const items = posts
    .map((post) => {
      const link = `${base}/blog/${post.slug}`
      const date = new Date(`${post.publishedAt}T00:00:00Z`)
      const pubDate = Number.isNaN(date.getTime()) ? '' : date.toUTCString()
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : '',
        `      <category>${escapeXml(post.category)}</category>`,
        `      <description>${escapeXml(post.excerpt)}</description>`,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  res
    .type('application/rss+xml')
    .send(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        '  <channel>',
        `    <title>${escapeXml(`${content.brand.name} · Field notes`)}</title>`,
        `    <link>${escapeXml(`${base}/blog`)}</link>`,
        `    <description>${escapeXml(content.pages.blog.lead)}</description>`,
        '    <language>en-in</language>',
        `    <atom:link href="${escapeXml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml" />`,
        `    <lastBuildDate>${new Date(content.updatedAt).toUTCString()}</lastBuildDate>`,
        items,
        '  </channel>',
        '</rss>',
        '',
      ].join('\n'),
    )
})
