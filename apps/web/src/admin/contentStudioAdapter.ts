import type { SiteContent } from '@hvac/shared'

/**
 * Content-studio migration adapter.
 *
 * The v2 studio deliberately reads the same `SiteContent` document as the
 * public site and the classic editor. This adapter is the only place that
 * fills optional fields introduced by the studio (logo slots, favicon and
 * share image), so old content.json files open in the new workspace without a
 * destructive rewrite. Saving the draft persists the normalised shape.
 */
export function normalizeStudioDraft(content: SiteContent): SiteContent {
  return {
    ...content,
    brand: {
      ...content.brand,
      logo: content.brand.logo
        ? {
            mark: content.brand.logo.mark ?? null,
            wordmark: content.brand.logo.wordmark ?? null,
          }
        : { mark: null, wordmark: null },
      favicon: content.brand.favicon ?? '',
      socialImage: content.brand.socialImage ?? '',
    },
  }
}

/**
 * Maps a legacy content tab to the v2 page-tree id. Kept as data so the
 * parity test can assert every old entry has an owning workspace.
 */
export const legacyTabToPageId: Record<string, string> = {
  'pages-studio': 'home',
  brand: 'brand',
  home: 'home',
  products: 'products-detail',
  about: 'about',
  work: 'work-cases',
  process: 'process-details',
  'about-sections': 'about-sections',
  amc: 'amc-details',
  voices: 'voices',
  pages: 'home',
  services: 'services-detail',
  plans: 'amc-plans',
  faqs: 'faqs',
  legal: 'legal',
  billing: 'billing',
  seo: 'seo',
  blog: 'blog',
}
