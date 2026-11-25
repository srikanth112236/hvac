import { z } from 'zod'

/**
 * Local enum mirrors keep this module free of a runtime import cycle with the
 * package index; the string values are the shared vocabulary.
 */
const SERVICE_CATEGORY_VALUES = ['residential', 'commercial', 'industrial', 'maintenance'] as const
type ServiceCategory = (typeof SERVICE_CATEGORY_VALUES)[number]
const LEAD_STATUS_VALUES = ['new', 'contacted', 'site-visit', 'quoted', 'won', 'lost'] as const
type LeadStatus = (typeof LEAD_STATUS_VALUES)[number]
type Urgency = 'normal' | 'emergency'

/* -------------------------------------------------------------------------- */
/*  Editable public content                                                    */
/* -------------------------------------------------------------------------- */

export const SERVICE_CALCULATOR_VALUES = [
  'tonnage',
  'vrf',
  'chiller',
  'duct',
  'cold-room',
  'amc',
] as const
export type ServiceCalculatorKind = (typeof SERVICE_CALCULATOR_VALUES)[number]

export interface SiteServiceOverride {
  id: string
  index: string
  name: string
  category: ServiceCategory
  capacity: string
  timeline: string
  specification: string
  scope: string
  headline: string
  intro: string
  startingFrom: string
  warranty: string
  published: boolean
  icon?: string
  calculator?: ServiceCalculatorKind
  /** Detail-page overrides. Omitted values fall back to the compiled page. */
  priceBasis?: string
  includes?: string[]
  excludes?: string[]
  site?: string[]
  priceFactors?: string[]
  standards?: string[]
  /** Service ids shown in the Nearby block. */
  related?: string[]
  /** Work-case id shown beside the Nearby block. */
  projectId?: string
  specs?: Array<{ label: string; value: string }>
  selection?: Array<{ title: string; body: string }>
  steps?: Array<{ title: string; body: string }>
  faqs?: Array<{ question: string; answer: string }>
}

export interface SitePlanOverride {
  id: string
  name: string
  price: string
  priceNote: string
  visits: string
  summary: string
  includes: string[]
  excluded: string
  featured: boolean
}

export interface SiteFaq {
  id: string
  question: string
  answer: string
  published: boolean
}

export interface SiteBrand {
  name: string
  shortName: string
  legalName: string
  tagline: string
  description: string
  monogram: string
  logo?: { mark: string | null; wordmark: string | null }
  favicon?: string
  socialImage?: string
  contact: {
    phone: string
    phoneDisplay: string
    emergencyPhone: string
    email: string
    salesEmail: string
  }
  address: {
    line1: string
    line2: string
    locality: string
    region: string
    postalCode: string
    country: string
  }
  hours: {
    weekdays: string
    saturday: string
    sunday: string
    emergency: string
  }
  serviceAreas: { city: string; region: string; slug: string; radiusKm: number }[]
  stats: {
    yearsOperating: number
    systemsInstalled: number
    tonnageCommissioned: number
    emergencyResponseHours: number
  }
  credentials: string[]
  foundedYear: number
  gstin: string
  billing: {
    bankName: string
    accountName: string
    accountNumber: string
    ifsc: string
    upiId: string
    invoicePrefix: string
    invoiceTerms: string
    invoiceNotes: string
  }
}

export interface SiteHome {
  heroEyebrow: string
  heroTitle: string
  heroLead: string
  heroImage?: string
  heroImageAlt?: string
  airflowTitle?: string
  airflowDescription?: string
  segmentsTitle?: string
  segmentsDescription?: string
  voicesTitle?: string
  voicesDescription?: string
  servicesTitle: string
  servicesDescription: string
  performanceTitle: string
  performanceDescription: string
  performanceAnswer: string
  assuranceTitle: string
  assuranceDescription: string
  assuranceAnswer: string
  coverageTitle: string
  coverageDescription: string
  coverageAnswer: string
  productsTitle: string
  productsDescription: string
  productsAnswer: string
  insightsTitle: string
  insightsDescription: string
  insightsAnswer: string
  processTitle: string
  processDescription: string
  workTitle: string
  workDescription: string
  plansTitle: string
  plansDescription: string
  faqTitle: string
  faqDescription: string
  finalCtaTitle: string
  finalCtaLead: string
  setpointTitle: string
  setpointDescription: string
  sequenceTitle: string
  sequenceDescription: string
  sequenceHandoverTitle: string
  sequenceHandoverBody: string
  measuredTitle: string
  measuredDescription: string
  mapTitle: string
  mapDescription: string
  dispatchTitle: string
  dispatchDescription: string
}

export interface SiteAbout {
  headline: string
  lead: string
  story: string[]
  image?: string
  imageAlt?: string
}

export interface SiteWorkCase {
  id: string
  category: string
  name: string
  location: string
  plate: string
  spec: string
  detail: string
  year: string
  challenge: string
  solution: string
  result: string
  system: string
  metrics: { label: string; value: string }[]
  scope: string[]
  image?: string
  imageAlt?: string
}

export interface SiteProcessStage {
  index: string
  name: string
  duration: string
  body: string
  deliverable: string
  gate: string
  evidence: string
  client: string
}

export interface SiteAboutSections {
  milestones: { year: string; title: string; body: string }[]
  principles: { index: string; title: string; body: string; proof: string }[]
  leadership: { initials: string; name: string; role: string; focus: string; years: string }[]
  certifications: { code: string; label: string; body: string }[]
  safety: { icon: string; title: string; body: string }[]
  qualityGates: { index: string; gate: string; evidence: string; owner: string }[]
}

export interface SiteProcessExtras {
  inputs: string[]
  file: string[]
  faqs: { question: string; answer: string }[]
}

export interface SiteAmcDetails {
  terms: {
    id: string
    response: string
    parts: string
    reporting: string
    bestFor: string
    commitment: string
  }[]
  schedule: { period: string; essential: string; comprehensive: string; precision: string }[]
  sla: { metric: string; standard: string; note: string }[]
  includes: string[]
  excludes: string[]
  faqs: { question: string; answer: string }[]
}

export interface SiteTestimonial {
  id: string
  quote: string
  context: string
  published: boolean
}

export interface SitePostFaq {
  question: string
  answer: string
}

export interface SitePost {
  id: string
  slug: string
  title: string
  excerpt: string
  answer: string
  category: string
  tags: string[]
  authorName: string
  authorRole: string
  publishedAt: string
  updatedAt: string
  readingMinutes: number
  heroPlate: string
  featured: boolean
  published: boolean
  body: string
  /** Sanitised rich-text body from the journal editor. Markdown `body` remains the fallback. */
  bodyHtml?: string
  takeaways: string[]
  faqs: SitePostFaq[]
  relatedServices: string[]
  seoTitle: string
  seoDescription: string
  coverImage?: string
  coverAlt?: string
}

export interface SiteProduct {
  id: string
  slug: string
  name: string
  category: string
  brand: string
  capacity: string
  priceFrom: string
  priceNote: string
  summary: string
  description: string
  features: string[]
  specs: { label: string; value: string }[]
  applications: string[]
  tags: string[]
  plate: string
  featured: boolean
  published: boolean
  image?: string
  imageAlt?: string
}

export interface SiteLegalSection {
  heading: string
  body: string[]
}

export interface SiteLegalDocument {
  slug: string
  title: string
  summary: string
  updatedAt: string
  sections: SiteLegalSection[]
  published: boolean
}

export interface SitePageCopy {
  headline: string
  lead: string
  image?: string
  imageAlt?: string
}

export interface SiteSectionCopy {
  title: string
  body: string
}

export interface SiteSelectionNote {
  index: string
  title: string
  body: string
}

/**
 * Body copy for the sections between each page hero and its collection. The
 * page studio exposes every one of these fields, so no public section heading
 * is hard-coded outside the CMS.
 */
export interface SitePageSections {
  about: {
    story: SiteSectionCopy
    milestones: SiteSectionCopy
    principles: SiteSectionCopy
    people: SiteSectionCopy
    safety: SiteSectionCopy
    certifications: SiteSectionCopy
    next: SiteSectionCopy
  }
  services: {
    index: SiteSectionCopy
    selection: SiteSectionCopy
    next: SiteSectionCopy
    selectionNotes: SiteSelectionNote[]
  }
  process: {
    stages: SiteSectionCopy
    handover: SiteSectionCopy
    before: SiteSectionCopy
    questions: SiteSectionCopy
    next: SiteSectionCopy
  }
  work: {
    cases: SiteSectionCopy
    beforeAfter: SiteSectionCopy
    next: SiteSectionCopy
    beforeLabel: string
    afterLabel: string
    caption: string
  }
  amc: {
    plans: SiteSectionCopy
    schedule: SiteSectionCopy
    serviceLevels: SiteSectionCopy
    questions: SiteSectionCopy
    next: SiteSectionCopy
  }
  contact: {
    form: SiteSectionCopy
    coverage: SiteSectionCopy
  }
  blog: {
    articles: SiteSectionCopy
    next: SiteSectionCopy
  }
  products: {
    featured: SiteSectionCopy
    catalogue: SiteSectionCopy
    next: SiteSectionCopy
  }
  legal: {
    questions: SiteSectionCopy
    note: string
  }
}

/** Per-page hero copy for the pages that are not driven by a collection. */
export interface SitePages {
  services: SitePageCopy
  process: SitePageCopy
  work: SitePageCopy
  amc: SitePageCopy
  contact: SitePageCopy
  blog: SitePageCopy
  products: SitePageCopy
}

export interface SeoPage {
  path: string
  title: string
  description: string
}

export interface SiteSeo {
  titleTemplate: string
  defaultDescription: string
  keywords: string[]
  canonicalBase: string
  ogImage: string
  robots: string
  pages: SeoPage[]
}

export interface SiteTheme {
  defaultVariant: 'foundry' | 'atelier'
  palette: {
    base: string
    panel: string
    panel2: string
    text: string
    muted: string
    faint: string
    line: string
    lineStrong: string
    cold: string
    coldInk: string
    heat: string
    success: string
    warn: string
    danger: string
    accent: string
  }
  buttons: {
    primaryBg: string
    primaryText: string
    secondaryBorder: string
    radius: string
  }
}

export interface SiteContentPayload {
  brand: SiteBrand
  theme?: SiteTheme
  home: SiteHome
  about: SiteAbout
  workCases: SiteWorkCase[]
  processStages: SiteProcessStage[]
  processExtras: SiteProcessExtras
  aboutSections: SiteAboutSections
  amcDetails: SiteAmcDetails
  testimonials: SiteTestimonial[]
  equipmentBrands: string[]
  posts: SitePost[]
  products: SiteProduct[]
  legal: SiteLegalDocument[]
  pages: SitePages
  pageSections: SitePageSections
  services: SiteServiceOverride[]
  plans: SitePlanOverride[]
  faqs: SiteFaq[]
  seo: SiteSeo
}

export interface SiteContent extends SiteContentPayload {
  version: number
  updatedAt: string
}

/* -------------------------------------------------------------------------- */
/*  Validation                                                                 */
/* -------------------------------------------------------------------------- */

const trimmed = (max: number) => z.string().trim().max(max)

const serviceSchema = z.object({
  id: z.string().trim().min(1).max(80),
  index: z.string().trim().min(1).max(4),
  name: trimmed(120).min(1),
  category: z.enum(SERVICE_CATEGORY_VALUES),
  capacity: trimmed(80),
  timeline: trimmed(80),
  specification: trimmed(160),
  scope: trimmed(500),
  headline: trimmed(160),
  intro: trimmed(900),
  startingFrom: trimmed(40),
  warranty: trimmed(160),
  published: z.boolean(),
  icon: trimmed(40).optional(),
  calculator: z.enum(SERVICE_CALCULATOR_VALUES).optional(),
  priceBasis: trimmed(160).optional(),
  includes: z.array(trimmed(300)).max(40).optional(),
  excludes: z.array(trimmed(300)).max(40).optional(),
  site: z.array(trimmed(300)).max(30).optional(),
  priceFactors: z.array(trimmed(300)).max(30).optional(),
  standards: z.array(trimmed(120)).max(20).optional(),
  related: z.array(trimmed(80)).max(30).optional(),
  projectId: trimmed(80).optional(),
  specs: z
    .array(z.object({ label: trimmed(80), value: trimmed(240) }))
    .max(30)
    .optional(),
  selection: z
    .array(z.object({ title: trimmed(120), body: trimmed(800) }))
    .max(20)
    .optional(),
  steps: z
    .array(z.object({ title: trimmed(120), body: trimmed(800) }))
    .max(20)
    .optional(),
  faqs: z
    .array(z.object({ question: trimmed(240), answer: trimmed(1200) }))
    .max(20)
    .optional(),
})

const planSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: trimmed(60),
  price: trimmed(60),
  priceNote: trimmed(120),
  visits: trimmed(80),
  summary: trimmed(500),
  includes: z.array(trimmed(200)).max(20),
  excluded: trimmed(600),
  featured: z.boolean(),
})

const faqSchema = z.object({
  id: z.string().trim().min(1).max(80),
  question: trimmed(300),
  answer: trimmed(3000),
  published: z.boolean(),
})

const workCaseSchema = z.object({
  id: z.string().trim().min(1).max(80),
  category: trimmed(60),
  name: trimmed(120),
  location: trimmed(120),
  plate: trimmed(160),
  spec: trimmed(160),
  detail: trimmed(600),
  year: trimmed(8),
  challenge: trimmed(2000),
  solution: trimmed(2000),
  result: trimmed(1200),
  system: trimmed(160),
  metrics: z.array(z.object({ label: trimmed(40), value: trimmed(60) })).max(8),
  scope: z.array(trimmed(120)).max(20),
  image: trimmed(500).optional(),
  imageAlt: trimmed(180).optional(),
})

const postSchema = z.object({
  id: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(90)
    .regex(/^[a-z0-9-]+$/),
  title: trimmed(180).min(1),
  excerpt: trimmed(500).min(1),
  answer: trimmed(1200).min(1),
  category: trimmed(60).min(1),
  tags: z.array(trimmed(40)).max(20),
  authorName: trimmed(120).min(1),
  authorRole: trimmed(120),
  publishedAt: trimmed(20),
  updatedAt: trimmed(20),
  readingMinutes: z.number().min(1).max(120),
  heroPlate: trimmed(160),
  featured: z.boolean(),
  published: z.boolean(),
  body: trimmed(40_000).min(1),
  bodyHtml: trimmed(120_000).optional(),
  takeaways: z.array(trimmed(400)).max(12),
  faqs: z.array(z.object({ question: trimmed(300), answer: trimmed(3000) })).max(12),
  relatedServices: z.array(trimmed(80)).max(12),
  seoTitle: trimmed(180),
  seoDescription: trimmed(400),
  coverImage: trimmed(500).optional(),
  coverAlt: trimmed(180).optional(),
})

const productSchema = z.object({
  id: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(90)
    .regex(/^[a-z0-9-]+$/),
  name: trimmed(160).min(1),
  category: trimmed(60).min(1),
  brand: trimmed(80),
  capacity: trimmed(80),
  priceFrom: trimmed(60),
  priceNote: trimmed(160),
  summary: trimmed(600).min(1),
  description: trimmed(3000),
  features: z.array(trimmed(300)).max(20),
  specs: z.array(z.object({ label: trimmed(80), value: trimmed(240) })).max(20),
  applications: z.array(trimmed(160)).max(20),
  tags: z.array(trimmed(40)).max(20),
  plate: trimmed(160),
  featured: z.boolean(),
  published: z.boolean(),
  image: trimmed(500).optional(),
  imageAlt: trimmed(180).optional(),
})

const processStageSchema = z.object({
  index: trimmed(4),
  name: trimmed(80),
  duration: trimmed(60),
  body: trimmed(2000),
  deliverable: trimmed(200),
  gate: trimmed(300),
  evidence: trimmed(500),
  client: trimmed(300),
})

const legalDocumentSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  title: trimmed(160).min(1),
  summary: trimmed(600),
  updatedAt: trimmed(40),
  sections: z
    .array(
      z.object({
        heading: trimmed(160).min(1),
        body: z.array(trimmed(4000)).max(20),
      }),
    )
    .max(40),
  published: z.boolean(),
})

const pageCopySchema = z.object({
  headline: trimmed(160),
  lead: trimmed(900),
  image: trimmed(500).optional(),
  imageAlt: trimmed(180).optional(),
})

const sectionCopySchema = z.object({
  title: trimmed(200),
  body: trimmed(3000),
})

const selectionNoteSchema = z.object({
  index: trimmed(8),
  title: trimmed(160),
  body: trimmed(2000),
})

const pageSectionsSchema = z.object({
  about: z.object({
    story: sectionCopySchema,
    milestones: sectionCopySchema,
    principles: sectionCopySchema,
    people: sectionCopySchema,
    safety: sectionCopySchema,
    certifications: sectionCopySchema,
    next: sectionCopySchema,
  }),
  services: z.object({
    index: sectionCopySchema,
    selection: sectionCopySchema,
    next: sectionCopySchema,
    selectionNotes: z.array(selectionNoteSchema).max(12),
  }),
  process: z.object({
    stages: sectionCopySchema,
    handover: sectionCopySchema,
    before: sectionCopySchema,
    questions: sectionCopySchema,
    next: sectionCopySchema,
  }),
  work: z.object({
    cases: sectionCopySchema,
    beforeAfter: sectionCopySchema,
    next: sectionCopySchema,
    beforeLabel: trimmed(300),
    afterLabel: trimmed(300),
    caption: trimmed(300),
  }),
  amc: z.object({
    plans: sectionCopySchema,
    schedule: sectionCopySchema,
    serviceLevels: sectionCopySchema,
    questions: sectionCopySchema,
    next: sectionCopySchema,
  }),
  contact: z.object({
    form: sectionCopySchema,
    coverage: sectionCopySchema,
  }),
  blog: z.object({
    articles: sectionCopySchema,
    next: sectionCopySchema,
  }),
  products: z.object({
    featured: sectionCopySchema,
    catalogue: sectionCopySchema,
    next: sectionCopySchema,
  }),
  legal: z.object({
    questions: sectionCopySchema,
    note: trimmed(600),
  }),
})

export const siteContentPayloadSchema: z.ZodType<SiteContentPayload> = z.object({
  brand: z.object({
    name: trimmed(80),
    shortName: trimmed(60),
    legalName: trimmed(120),
    tagline: trimmed(200),
    description: trimmed(600),
    monogram: trimmed(4),
    logo: z
      .object({
        mark: z.string().trim().max(500).nullable(),
        wordmark: z.string().trim().max(500).nullable(),
      })
      .optional(),
    favicon: trimmed(500).optional(),
    socialImage: trimmed(500).optional(),
    contact: z.object({
      phone: trimmed(40),
      phoneDisplay: trimmed(40),
      emergencyPhone: trimmed(40),
      email: z.string().trim().email(),
      salesEmail: z.string().trim().email(),
    }),
    address: z.object({
      line1: trimmed(120),
      line2: trimmed(120),
      locality: trimmed(80),
      region: trimmed(80),
      postalCode: trimmed(20),
      country: trimmed(4),
    }),
    hours: z.object({
      weekdays: trimmed(60),
      saturday: trimmed(60),
      sunday: trimmed(60),
      emergency: trimmed(60),
    }),
    serviceAreas: z
      .array(
        z.object({
          city: trimmed(80),
          region: trimmed(80),
          slug: trimmed(80),
          radiusKm: z.number().min(0).max(500),
        }),
      )
      .max(20),
    stats: z.object({
      yearsOperating: z.number().min(0).max(200),
      systemsInstalled: z.number().min(0),
      tonnageCommissioned: z.number().min(0),
      emergencyResponseHours: z.number().min(0).max(72),
    }),
    credentials: z.array(trimmed(120)).max(20),
    foundedYear: z.number().min(1900).max(2100),
    gstin: trimmed(40),
    billing: z.object({
      bankName: trimmed(120),
      accountName: trimmed(120),
      accountNumber: trimmed(40),
      ifsc: trimmed(20),
      upiId: trimmed(120),
      invoicePrefix: trimmed(12),
      invoiceTerms: trimmed(2000),
      invoiceNotes: trimmed(1000),
    }),
  }),
  theme: z
    .object({
      defaultVariant: z.enum(['foundry', 'atelier']),
      palette: z.object({
        base: z.string().trim().min(1).max(40),
        panel: z.string().trim().min(1).max(40),
        panel2: z.string().trim().min(1).max(40),
        text: z.string().trim().min(1).max(40),
        muted: z.string().trim().min(1).max(40),
        faint: z.string().trim().min(1).max(40),
        line: z.string().trim().min(1).max(40),
        lineStrong: z.string().trim().min(1).max(40),
        cold: z.string().trim().min(1).max(40),
        coldInk: z.string().trim().min(1).max(40),
        heat: z.string().trim().min(1).max(40),
        success: z.string().trim().min(1).max(40),
        warn: z.string().trim().min(1).max(40),
        danger: z.string().trim().min(1).max(40),
        accent: z.string().trim().min(1).max(40),
      }),
      buttons: z.object({
        primaryBg: z.string().trim().min(1).max(40),
        primaryText: z.string().trim().min(1).max(40),
        secondaryBorder: z.string().trim().min(1).max(40),
        radius: z.string().trim().min(1).max(40),
      }),
    })
    .optional(),
  home: z.object({
    heroEyebrow: trimmed(160),
    heroTitle: trimmed(160),
    heroLead: trimmed(900),
    heroImage: trimmed(500).optional(),
    heroImageAlt: trimmed(180).optional(),
    airflowTitle: trimmed(160).optional(),
    airflowDescription: trimmed(600).optional(),
    segmentsTitle: trimmed(160).optional(),
    segmentsDescription: trimmed(600).optional(),
    voicesTitle: trimmed(160).optional(),
    voicesDescription: trimmed(600).optional(),
    servicesTitle: trimmed(160),
    servicesDescription: trimmed(600),
    performanceTitle: trimmed(160),
    performanceDescription: trimmed(600),
    performanceAnswer: trimmed(1200),
    assuranceTitle: trimmed(160),
    assuranceDescription: trimmed(600),
    assuranceAnswer: trimmed(1200),
    coverageTitle: trimmed(160),
    coverageDescription: trimmed(600),
    coverageAnswer: trimmed(1200),
    productsTitle: trimmed(160),
    productsDescription: trimmed(600),
    productsAnswer: trimmed(1200),
    insightsTitle: trimmed(160),
    insightsDescription: trimmed(600),
    insightsAnswer: trimmed(1200),
    processTitle: trimmed(160),
    processDescription: trimmed(600),
    workTitle: trimmed(160),
    workDescription: trimmed(600),
    plansTitle: trimmed(160),
    plansDescription: trimmed(600),
    faqTitle: trimmed(160),
    faqDescription: trimmed(600),
    finalCtaTitle: trimmed(160),
    finalCtaLead: trimmed(600),
    setpointTitle: trimmed(200),
    setpointDescription: trimmed(900),
    sequenceTitle: trimmed(200),
    sequenceDescription: trimmed(900),
    sequenceHandoverTitle: trimmed(200),
    sequenceHandoverBody: trimmed(1200),
    measuredTitle: trimmed(200),
    measuredDescription: trimmed(900),
    mapTitle: trimmed(200),
    mapDescription: trimmed(900),
    dispatchTitle: trimmed(200),
    dispatchDescription: trimmed(900),
  }),
  about: z.object({
    headline: trimmed(160),
    lead: trimmed(600),
    story: z.array(trimmed(2000)).max(12),
    image: trimmed(500).optional(),
    imageAlt: trimmed(180).optional(),
  }),
  workCases: z.array(workCaseSchema).max(40),
  processStages: z.array(processStageSchema).max(20),
  processExtras: z.object({
    inputs: z.array(trimmed(300)).max(20),
    file: z.array(trimmed(300)).max(30),
    faqs: z.array(z.object({ question: trimmed(300), answer: trimmed(3000) })).max(30),
  }),
  aboutSections: z.object({
    milestones: z
      .array(z.object({ year: trimmed(8), title: trimmed(160), body: trimmed(1000) }))
      .max(40),
    principles: z
      .array(
        z.object({
          index: trimmed(4),
          title: trimmed(160),
          body: trimmed(2000),
          proof: trimmed(300),
        }),
      )
      .max(20),
    leadership: z
      .array(
        z.object({
          initials: trimmed(4),
          name: trimmed(120),
          role: trimmed(160),
          focus: trimmed(1000),
          years: trimmed(40),
        }),
      )
      .max(20),
    certifications: z
      .array(z.object({ code: trimmed(80), label: trimmed(160), body: trimmed(1200) }))
      .max(20),
    safety: z
      .array(z.object({ icon: trimmed(40), title: trimmed(160), body: trimmed(1200) }))
      .max(20),
    qualityGates: z
      .array(
        z.object({
          index: trimmed(8),
          gate: trimmed(160),
          evidence: trimmed(1200),
          owner: trimmed(120),
        }),
      )
      .max(20),
  }),
  amcDetails: z.object({
    terms: z
      .array(
        z.object({
          id: trimmed(40),
          response: trimmed(120),
          parts: trimmed(160),
          reporting: trimmed(200),
          bestFor: trimmed(200),
          commitment: trimmed(200),
        }),
      )
      .max(12),
    schedule: z
      .array(
        z.object({
          period: trimmed(80),
          essential: trimmed(200),
          comprehensive: trimmed(200),
          precision: trimmed(200),
        }),
      )
      .max(30),
    sla: z
      .array(z.object({ metric: trimmed(120), standard: trimmed(200), note: trimmed(300) }))
      .max(20),
    includes: z.array(trimmed(300)).max(30),
    excludes: z.array(trimmed(300)).max(30),
    faqs: z.array(z.object({ question: trimmed(300), answer: trimmed(3000) })).max(30),
  }),
  testimonials: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        quote: trimmed(1200),
        context: trimmed(200),
        published: z.boolean(),
      }),
    )
    .max(20),
  equipmentBrands: z.array(trimmed(80)).max(30),
  posts: z.array(postSchema).max(80),
  products: z.array(productSchema).max(80),
  legal: z.array(legalDocumentSchema).max(20),
  pages: z.object({
    services: pageCopySchema,
    process: pageCopySchema,
    work: pageCopySchema,
    amc: pageCopySchema,
    contact: pageCopySchema,
    blog: pageCopySchema,
    products: pageCopySchema,
  }),
  pageSections: pageSectionsSchema,
  services: z.array(serviceSchema).max(100),
  plans: z.array(planSchema).max(12),
  faqs: z.array(faqSchema).max(50),
  seo: z.object({
    titleTemplate: trimmed(200),
    defaultDescription: trimmed(400),
    keywords: z.array(trimmed(80)).max(40),
    canonicalBase: z.string().trim().url(),
    ogImage: z.string().trim().max(300),
    robots: trimmed(120),
    pages: z
      .array(
        z.object({
          path: trimmed(120),
          title: trimmed(160),
          description: trimmed(400),
        }),
      )
      .max(60),
  }),
})

/* -------------------------------------------------------------------------- */
/*  CRM records                                                                */
/* -------------------------------------------------------------------------- */

export interface LeadNote {
  id: string
  at: string
  author: string
  body: string
}

export interface LeadAttachment {
  name: string
  url: string
  mimeType: string
  size: number
}

/** LeadRecord is extended by the admin pipeline without changing public posts. */
export interface AdminLead extends Record<string, unknown> {
  ref: string
  createdAt: string
  updatedAt: string
  status: LeadStatus
  source: string
  name: string
  email: string
  phone: string
  message: string
  serviceSlug: string | null
  serviceName: string | null
  city: string | null
  urgency: Urgency
  plan: string | null
  context: string | null
  owner: string | null
  value: number | null
  followUpAt: string | null
  notes: LeadNote[]
  attachments?: LeadAttachment[]
}

export const leadPatchSchema = z.object({
  status: z.enum(LEAD_STATUS_VALUES).optional(),
  owner: z.string().trim().max(80).nullable().optional(),
  value: z.number().min(0).max(100_000_000).nullable().optional(),
  followUpAt: z.string().trim().max(40).nullable().optional(),
  note: z.string().trim().min(1).max(2000).optional(),
})

export const adminLeadCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().or(z.literal('')),
  city: z.string().trim().max(80).optional(),
  serviceSlug: z.string().trim().max(80).optional(),
  message: z.string().trim().max(2000).optional(),
  status: z.enum(LEAD_STATUS_VALUES).default('new'),
  value: z.number().min(0).max(100_000_000).optional(),
})

export type ReminderStatus = 'open' | 'done'

export const REMINDER_PRIORITY_VALUES = ['low', 'normal', 'high', 'urgent'] as const
export type ReminderPriority = (typeof REMINDER_PRIORITY_VALUES)[number]
export const reminderPriorityLabel: Record<ReminderPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

export const REMINDER_CATEGORY_VALUES = [
  'follow-up',
  'payment',
  'maintenance',
  'quotation',
  'site-visit',
  'parts',
  'renewal',
  'other',
] as const
export type ReminderCategory = (typeof REMINDER_CATEGORY_VALUES)[number]
export const reminderCategoryLabel: Record<ReminderCategory, string> = {
  'follow-up': 'Follow-up',
  payment: 'Payment',
  maintenance: 'Maintenance',
  quotation: 'Quotation',
  'site-visit': 'Site visit',
  parts: 'Parts',
  renewal: 'Renewal',
  other: 'General',
}

export interface ReminderRecord {
  id: string
  title: string
  body: string
  dueAt: string
  status: ReminderStatus
  priority?: ReminderPriority
  category?: ReminderCategory
  leadRef: string | null
  invoiceRef?: string | null
  createdAt: string
  completedAt: string | null
}

export const reminderInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().max(1000).default(''),
  dueAt: z.string().trim().min(4).max(40),
  leadRef: z.string().trim().max(40).nullable().optional(),
  priority: z.enum(REMINDER_PRIORITY_VALUES).optional(),
  category: z.enum(REMINDER_CATEGORY_VALUES).optional(),
})

export const reminderPatchSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  body: z.string().trim().max(1000).optional(),
  dueAt: z.string().trim().min(4).max(40).optional(),
  priority: z.enum(REMINDER_PRIORITY_VALUES).optional(),
  category: z.enum(REMINDER_CATEGORY_VALUES).optional(),
  leadRef: z.string().trim().max(40).nullable().optional(),
  status: z.enum(['open', 'done']).optional(),
})
