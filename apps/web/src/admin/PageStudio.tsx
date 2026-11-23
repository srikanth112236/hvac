import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type {
  SiteContent,
  SiteMediaAsset,
  SitePageCopy,
  SitePageSections,
  SiteSectionCopy,
} from '@hvac/shared'
import { Icon } from '@/components/icons'
import { Badge, Button, Input, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { ContentUpdate } from '@/admin/contentUpdate'
import { MediaPicker } from '@/admin/MediaPicker'

type ContentTab =
  | 'brand'
  | 'blog'
  | 'products'
  | 'about-sections'
  | 'work'
  | 'process'
  | 'amc'
  | 'voices'
  | 'services'
  | 'plans'
  | 'faqs'
  | 'legal'

type CopyField = { label: string; hint?: string } & (
  | {
      type?: 'text'
      value: string
      onChange: (value: string) => void
      multiline?: boolean
    }
  | {
      type: 'toggle'
      checked: boolean
      onChange: (value: boolean) => void
    }
)

interface ImageConfig {
  url: string
  alt: string
  folder: string
  onSelect: (asset: SiteMediaAsset) => void
  onAlt: (value: string) => void
  onClear: () => void
}

interface SectionConfig {
  id: string
  title: string
  summary: string
  fields?: CopyField[]
  image?: ImageConfig
  collection?: { label: string; count: number; tab?: ContentTab; href?: string }
}

interface PageConfig {
  id: string
  name: string
  code: string
  path: string
  sections: SectionConfig[]
}

function homeSection(
  draft: SiteContent,
  update: ContentUpdate,
): SectionConfig[] {
  const home = draft.home
  const set = (patch: Partial<SiteContent['home']>) =>
    update((current) => ({ ...current, home: { ...current.home, ...patch } }))
  return [
    {
      id: 'hero',
      title: '01 · Hero',
      summary: 'Eyebrow, headline, lead and the hero photograph',
      fields: [
        { label: 'Eyebrow', value: home.heroEyebrow, onChange: (value) => set({ heroEyebrow: value }) },
        { label: 'Headline', value: home.heroTitle, onChange: (value) => set({ heroTitle: value }) },
        {
          label: 'Lead paragraph',
          value: home.heroLead,
          multiline: true,
          onChange: (value) => set({ heroLead: value }),
        },
      ],
      image: {
        url: home.heroImage ?? '',
        alt: home.heroImageAlt ?? '',
        folder: 'home',
        onSelect: (asset) => set({ heroImage: asset.url, heroImageAlt: home.heroImageAlt || asset.alt }),
        onAlt: (value) => set({ heroImageAlt: value }),
        onClear: () => set({ heroImage: '', heroImageAlt: '' }),
      },
    },
    {
      id: 'proof',
      title: '02 · Proof strip',
      summary: 'Years, installed systems, tonnage and response metric',
      collection: { label: 'Edit brand statistics', count: 4, tab: 'brand' },
    },
    {
      id: 'services',
      title: '03 · Service stack',
      summary: 'Section heading, introduction and the service index',
      fields: [
        { label: 'Heading', value: home.servicesTitle, onChange: (value) => set({ servicesTitle: value }) },
        {
          label: 'Introduction',
          value: home.servicesDescription,
          multiline: true,
          onChange: (value) => set({ servicesDescription: value }),
        },
      ],
      collection: { label: 'Edit services', count: draft.services.length, tab: 'services' },
    },
    {
      id: 'setpoint',
      title: '04 · Setpoint standard',
      summary: 'Measured-standard heading, introduction and three decision rules',
      fields: [
        { label: 'Heading', value: home.setpointTitle, onChange: (value) => set({ setpointTitle: value }) },
        {
          label: 'Introduction',
          value: home.setpointDescription,
          multiline: true,
          onChange: (value) => set({ setpointDescription: value }),
        },
      ],
    },
    {
      id: 'airflow',
      title: '05 · Airflow story',
      summary: 'Pinned sequence heading and introduction',
      fields: [
        {
          label: 'Heading',
          value: home.airflowTitle ?? 'How air moves through your building.',
          onChange: (value) => set({ airflowTitle: value }),
        },
        {
          label: 'Introduction',
          value:
            home.airflowDescription ??
            'Six layers between the condenser fan and the diffuser. Each one adds pressure drop, heat gain or noise — and each one is a decision made on paper before it is made in copper.',
          multiline: true,
          onChange: (value) => set({ airflowDescription: value }),
        },
      ],
    },
    {
      id: 'performance',
      title: '06 · Performance',
      summary: 'Section heading and the measured-performance answer',
      fields: [
        { label: 'Heading', value: home.performanceTitle, onChange: (value) => set({ performanceTitle: value }) },
        {
          label: 'Introduction',
          value: home.performanceDescription,
          multiline: true,
          onChange: (value) => set({ performanceDescription: value }),
        },
        {
          label: 'Direct answer',
          value: home.performanceAnswer,
          multiline: true,
          onChange: (value) => set({ performanceAnswer: value }),
        },
      ],
    },
    {
      id: 'measured',
      title: '07 · Measured band',
      summary: 'Evidence band heading, introduction and the four measured statistics',
      fields: [
        { label: 'Heading', value: home.measuredTitle, onChange: (value) => set({ measuredTitle: value }) },
        {
          label: 'Introduction',
          value: home.measuredDescription,
          multiline: true,
          onChange: (value) => set({ measuredDescription: value }),
        },
      ],
      collection: { label: 'Edit brand statistics', count: 4, tab: 'brand' },
    },
    {
      id: 'segments',
      title: '08 · Two ways in',
      summary: 'Residential and commercial segment introduction',
      fields: [
        {
          label: 'Heading',
          value: home.segmentsTitle ?? 'One plant room. Two very different briefs.',
          onChange: (value) => set({ segmentsTitle: value }),
        },
        {
          label: 'Introduction',
          value:
            home.segmentsDescription ??
            'A three-bedroom flat and a fourteen-floor office do not share a design method. They share a standard: the number on the handover sheet has to be the number on the wall.',
          multiline: true,
          onChange: (value) => set({ segmentsDescription: value }),
        },
      ],
    },
    {
      id: 'assurance',
      title: '09 · Assurance',
      summary: 'Section heading and assurance answer',
      fields: [
        { label: 'Heading', value: home.assuranceTitle, onChange: (value) => set({ assuranceTitle: value }) },
        {
          label: 'Introduction',
          value: home.assuranceDescription,
          multiline: true,
          onChange: (value) => set({ assuranceDescription: value }),
        },
        {
          label: 'Direct answer',
          value: home.assuranceAnswer,
          multiline: true,
          onChange: (value) => set({ assuranceAnswer: value }),
        },
      ],
    },
    {
      id: 'process',
      title: '10 · Process',
      summary: 'Section heading and six-stage process',
      fields: [
        { label: 'Heading', value: home.processTitle, onChange: (value) => set({ processTitle: value }) },
        {
          label: 'Introduction',
          value: home.processDescription,
          multiline: true,
          onChange: (value) => set({ processDescription: value }),
        },
      ],
      collection: { label: 'Edit process stages', count: draft.processStages.length, tab: 'process' },
    },
    {
      id: 'sequence',
      title: '11 · Sequence rail',
      summary: 'Stage rail heading, introduction and the handover card',
      fields: [
        { label: 'Heading', value: home.sequenceTitle, onChange: (value) => set({ sequenceTitle: value }) },
        {
          label: 'Introduction',
          value: home.sequenceDescription,
          multiline: true,
          onChange: (value) => set({ sequenceDescription: value }),
        },
        {
          label: 'Handover card heading',
          value: home.sequenceHandoverTitle,
          onChange: (value) => set({ sequenceHandoverTitle: value }),
        },
        {
          label: 'Handover card body',
          value: home.sequenceHandoverBody,
          multiline: true,
          onChange: (value) => set({ sequenceHandoverBody: value }),
        },
      ],
      collection: { label: 'Edit process stages', count: draft.processStages.length, tab: 'process' },
    },
    {
      id: 'work',
      title: '12 · Work',
      summary: 'Section heading and selected case files',
      fields: [
        { label: 'Heading', value: home.workTitle, onChange: (value) => set({ workTitle: value }) },
        {
          label: 'Introduction',
          value: home.workDescription,
          multiline: true,
          onChange: (value) => set({ workDescription: value }),
        },
      ],
      collection: { label: 'Edit work cases', count: draft.workCases.length, tab: 'work' },
    },
    {
      id: 'system-map',
      title: '13 · System map',
      summary: 'Drawing-first section heading and introduction',
      fields: [
        { label: 'Heading', value: home.mapTitle, onChange: (value) => set({ mapTitle: value }) },
        {
          label: 'Introduction',
          value: home.mapDescription,
          multiline: true,
          onChange: (value) => set({ mapDescription: value }),
        },
      ],
    },
    {
      id: 'coverage',
      title: '14 · Coverage',
      summary: 'Service area heading, answer and city list',
      fields: [
        { label: 'Heading', value: home.coverageTitle, onChange: (value) => set({ coverageTitle: value }) },
        {
          label: 'Introduction',
          value: home.coverageDescription,
          multiline: true,
          onChange: (value) => set({ coverageDescription: value }),
        },
        {
          label: 'Direct answer',
          value: home.coverageAnswer,
          multiline: true,
          onChange: (value) => set({ coverageAnswer: value }),
        },
      ],
      collection: { label: 'Edit service areas', count: draft.brand.serviceAreas.length, tab: 'brand' },
    },
    {
      id: 'dispatch',
      title: '15 · Dispatch coverage',
      summary: 'Distance heading, introduction and the city dispatch cards',
      fields: [
        { label: 'Heading', value: home.dispatchTitle, onChange: (value) => set({ dispatchTitle: value }) },
        {
          label: 'Introduction',
          value: home.dispatchDescription,
          multiline: true,
          onChange: (value) => set({ dispatchDescription: value }),
        },
      ],
      collection: { label: 'Edit service areas', count: draft.brand.serviceAreas.length, tab: 'brand' },
    },
    {
      id: 'plans',
      title: '16 · AMC plans',
      summary: 'Plan section heading and pricing cards',
      fields: [
        { label: 'Heading', value: home.plansTitle, onChange: (value) => set({ plansTitle: value }) },
        {
          label: 'Introduction',
          value: home.plansDescription,
          multiline: true,
          onChange: (value) => set({ plansDescription: value }),
        },
      ],
      collection: { label: 'Edit plans', count: draft.plans.length, tab: 'plans' },
    },
    {
      id: 'products',
      title: '17 · Product preview',
      summary: 'Featured systems heading and direct answer',
      fields: [
        { label: 'Heading', value: home.productsTitle, onChange: (value) => set({ productsTitle: value }) },
        {
          label: 'Introduction',
          value: home.productsDescription,
          multiline: true,
          onChange: (value) => set({ productsDescription: value }),
        },
        {
          label: 'Direct answer',
          value: home.productsAnswer,
          multiline: true,
          onChange: (value) => set({ productsAnswer: value }),
        },
      ],
      collection: { label: 'Edit systems', count: draft.products.length, tab: 'products' },
    },
    {
      id: 'insights',
      title: '18 · Insights',
      summary: 'Journal preview heading and direct answer',
      fields: [
        { label: 'Heading', value: home.insightsTitle, onChange: (value) => set({ insightsTitle: value }) },
        {
          label: 'Introduction',
          value: home.insightsDescription,
          multiline: true,
          onChange: (value) => set({ insightsDescription: value }),
        },
        {
          label: 'Direct answer',
          value: home.insightsAnswer,
          multiline: true,
          onChange: (value) => set({ insightsAnswer: value }),
        },
      ],
      collection: { label: 'Open journal workspace', count: draft.posts.length, href: '/admin/blog' },
    },
    {
      id: 'voices',
      title: '19 · Voices',
      summary: 'Review section heading and moderated reviews',
      fields: [
        {
          label: 'Heading',
          value: home.voicesTitle ?? 'Written by the people who signed the handover.',
          onChange: (value) => set({ voicesTitle: value }),
        },
        {
          label: 'Introduction',
          value:
            home.voicesDescription ??
            'Sample copy. Moderated reviews from completed jobs replace these in the CMS — no invented names, no aggregate rating until real ones exist.',
          multiline: true,
          onChange: (value) => set({ voicesDescription: value }),
        },
      ],
      collection: { label: 'Edit reviews', count: draft.testimonials.length, tab: 'voices' },
    },
    {
      id: 'faq',
      title: '20 · FAQ',
      summary: 'FAQ section heading and published questions',
      fields: [
        { label: 'Heading', value: home.faqTitle, onChange: (value) => set({ faqTitle: value }) },
        {
          label: 'Introduction',
          value: home.faqDescription,
          multiline: true,
          onChange: (value) => set({ faqDescription: value }),
        },
      ],
      collection: { label: 'Edit FAQs', count: draft.faqs.length, tab: 'faqs' },
    },
    {
      id: 'final-cta',
      title: '21 · Final CTA',
      summary: 'Closing headline and lead',
      fields: [
        {
          label: 'Headline',
          value: home.finalCtaTitle,
          onChange: (value) => set({ finalCtaTitle: value }),
        },
        {
          label: 'Lead',
          value: home.finalCtaLead,
          multiline: true,
          onChange: (value) => set({ finalCtaLead: value }),
        },
      ],
    },
  ]
}

function pageCopyFields(
  page: SitePageCopy,
  set: (patch: Partial<SitePageCopy>) => void,
): CopyField[] {
  return [
    { label: 'Headline', value: page.headline, onChange: (value) => set({ headline: value }) },
    {
      label: 'Lead paragraph',
      value: page.lead,
      multiline: true,
      onChange: (value) => set({ lead: value }),
    },
  ]
}

function sectionCopyFields(
  section: SiteSectionCopy,
  set: (patch: Partial<SiteSectionCopy>) => void,
): CopyField[] {
  return [
    { label: 'Section heading', value: section.title, onChange: (value) => set({ title: value }) },
    {
      label: 'Section introduction',
      value: section.body,
      multiline: true,
      onChange: (value) => set({ body: value }),
    },
  ]
}

type SectionName = keyof SitePageSections

function isSectionCopy(value: unknown): value is SiteSectionCopy {
  return Boolean(value) && typeof value === 'object' && 'title' in (value as object) && 'body' in (value as object)
}

function pageCopyImage(
  page: SitePageCopy,
  set: (patch: Partial<SitePageCopy>) => void,
  folder: string,
): ImageConfig {
  return {
    url: page.image ?? '',
    alt: page.imageAlt ?? '',
    folder,
    onSelect: (asset) => set({ image: asset.url, imageAlt: page.imageAlt || asset.alt }),
    onAlt: (value) => set({ imageAlt: value }),
    onClear: () => set({ image: '', imageAlt: '' }),
  }
}

export function PageStudio({
  draft,
  update,
  onNavigate,
  onEditService,
  initialPage = 'home',
  initialView = 'grid',
  hideGrid = false,
}: {
  draft: SiteContent
  update: ContentUpdate
  onNavigate: (tab: ContentTab) => void
  onEditService: (serviceId: string) => void
  initialPage?: string
  initialView?: 'grid' | 'page' | 'services'
  hideGrid?: boolean
}) {
  const [view, setView] = useState<'grid' | 'page' | 'services'>(initialView)
  const [activePage, setActivePage] = useState(initialPage)
  const [picker, setPicker] = useState<{ folder: string; select: (asset: SiteMediaAsset) => void } | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const pageCopy = <K extends keyof SiteContent['pages']>(key: K) => {
    const page = draft.pages[key]
    const set = (patch: Partial<SitePageCopy>) =>
      update((current) => ({
        ...current,
        pages: { ...current.pages, [key]: { ...current.pages[key], ...patch } },
      }))
    return { page, set }
  }

  const sectionFields = (page: SectionName, key: string): CopyField[] => {
    const pageSections = draft.pageSections[page] as unknown as Record<string, unknown>
    const section = pageSections[key]
    if (!isSectionCopy(section)) return []
    const set = (patch: Partial<SiteSectionCopy>) =>
      update((current) => {
        const currentPage = current.pageSections[page] as unknown as Record<string, SiteSectionCopy>
        return {
          ...current,
          pageSections: {
            ...current.pageSections,
            [page]: {
              ...currentPage,
              [key]: { ...currentPage[key], ...patch },
            },
          } as SitePageSections,
        }
      })
    return sectionCopyFields(section, set)
  }

  const updateLegalDoc = (
    docIndex: number,
    patch: Partial<SiteContent['legal'][number]>,
  ) =>
    update((current) => ({
      ...current,
      legal: current.legal.map((document, index) =>
        index === docIndex ? { ...document, ...patch } : document,
      ),
    }))

  const updateLegalSection = (
    docIndex: number,
    sectionIndex: number,
    patch: Partial<SiteContent['legal'][number]['sections'][number]>,
  ) =>
    update((current) => ({
      ...current,
      legal: current.legal.map((document, index) =>
        index === docIndex
          ? {
              ...document,
              sections: document.sections.map((section, position) =>
                position === sectionIndex ? { ...section, ...patch } : section,
              ),
            }
          : document,
      ),
    }))

  const services = pageCopy('services')
  const process = pageCopy('process')
  const work = pageCopy('work')
  const amc = pageCopy('amc')
  const contact = pageCopy('contact')
  const blog = pageCopy('blog')
  const products = pageCopy('products')

  const pages: PageConfig[] = [
    { id: 'home', name: 'Home', code: 'CV-01', path: '/', sections: homeSection(draft, update) },
    {
      id: 'about',
      name: 'About',
      code: 'CV-02',
      path: '/about',
      sections: [
        {
          id: 'about-hero',
          title: '01 · About hero',
          summary: 'Headline, lead, story and photograph',
          fields: [
            {
              label: 'Headline',
              value: draft.about.headline,
              onChange: (value) =>
                update((current) => ({ ...current, about: { ...current.about, headline: value } })),
            },
            {
              label: 'Lead paragraph',
              value: draft.about.lead,
              multiline: true,
              onChange: (value) =>
                update((current) => ({ ...current, about: { ...current.about, lead: value } })),
            },
            ...draft.about.story.map((paragraph, index) => ({
              label: `Story paragraph ${index + 1}`,
              value: paragraph,
              multiline: true,
              onChange: (value: string) =>
                update((current) => {
                  const story = [...current.about.story]
                  story[index] = value
                  return { ...current, about: { ...current.about, story } }
                }),
            })),
          ],
          image: {
            url: draft.about.image ?? '',
            alt: draft.about.imageAlt ?? '',
            folder: 'about',
            onSelect: (asset) =>
              update((current) => ({
                ...current,
                about: {
                  ...current.about,
                  image: asset.url,
                  imageAlt: current.about.imageAlt || asset.alt,
                },
              })),
            onAlt: (value) =>
              update((current) => ({ ...current, about: { ...current.about, imageAlt: value } })),
            onClear: () =>
              update((current) => ({ ...current, about: { ...current.about, image: '', imageAlt: '' } })),
          },
        },
        {
          id: 'about-story',
          title: '02 · The story',
          summary: 'Story heading and introduction above the three story paragraphs',
          fields: sectionFields('about', 'story'),
        },
        {
          id: 'about-milestones',
          title: '03 · Milestones',
          summary: 'Milestones heading and introduction',
          fields: sectionFields('about', 'milestones'),
          collection: {
            label: 'Edit milestones',
            count: draft.aboutSections.milestones.length,
            tab: 'about-sections',
          },
        },
        {
          id: 'about-principles',
          title: '04 · Principles',
          summary: 'Principles heading and introduction',
          fields: sectionFields('about', 'principles'),
          collection: {
            label: 'Edit principles',
            count: draft.aboutSections.principles.length,
            tab: 'about-sections',
          },
        },
        {
          id: 'about-people',
          title: '05 · The people',
          summary: 'Leadership heading and introduction',
          fields: sectionFields('about', 'people'),
          collection: {
            label: 'Edit leadership',
            count: draft.aboutSections.leadership.length,
            tab: 'about-sections',
          },
        },
        {
          id: 'about-safety',
          title: '06 · Safety & quality',
          summary: 'Safety heading, introduction and quality gates',
          fields: sectionFields('about', 'safety'),
          collection: {
            label: 'Edit safety & gates',
            count:
              draft.aboutSections.safety.length + draft.aboutSections.qualityGates.length,
            tab: 'about-sections',
          },
        },
        {
          id: 'about-certifications',
          title: '07 · Certifications',
          summary: 'Certifications heading and introduction',
          fields: sectionFields('about', 'certifications'),
          collection: {
            label: 'Edit certifications',
            count: draft.aboutSections.certifications.length,
            tab: 'about-sections',
          },
        },
        {
          id: 'about-next',
          title: '08 · Next',
          summary: 'Closing heading and introduction',
          fields: sectionFields('about', 'next'),
        },
      ],
    },
    {
      id: 'services',
      name: 'Services',
      code: 'CV-03',
      path: '/services',
      sections: [
        {
          id: 'services-hero',
          title: '01 · Services hero',
          summary: 'Page headline, lead and photograph',
          fields: pageCopyFields(services.page, services.set),
          image: pageCopyImage(services.page, services.set, 'services'),
        },
        {
          id: 'services-index',
          title: '02 · Service index',
          summary: 'Index heading, introduction, filters and every service entry',
          fields: sectionFields('services', 'index'),
          collection: { label: 'Edit services', count: draft.services.length, tab: 'services' },
        },
        {
          id: 'services-selection',
          title: '03 · Selection checks',
          summary: 'Selection heading, introduction and the three checks that decide the number',
          fields: [
            ...sectionFields('services', 'selection'),
            ...draft.pageSections.services.selectionNotes.flatMap((note, index) => {
              const patch = (change: Partial<typeof note>) =>
                update((current) => ({
                  ...current,
                  pageSections: {
                    ...current.pageSections,
                    services: {
                      ...current.pageSections.services,
                      selectionNotes: current.pageSections.services.selectionNotes.map((entry, position) =>
                        position === index ? { ...entry, ...change } : entry,
                      ),
                    },
                  },
                }))
              return [
                {
                  label: `Check ${index + 1} title`,
                  value: note.title,
                  onChange: (value: string) => patch({ title: value }),
                },
                {
                  label: `Check ${index + 1} body`,
                  value: note.body,
                  multiline: true,
                  onChange: (value: string) => patch({ body: value }),
                },
              ]
            }),
          ],
        },
        {
          id: 'services-next',
          title: '04 · Next',
          summary: 'Closing heading and introduction',
          fields: sectionFields('services', 'next'),
        },
      ],
    },
    {
      id: 'process',
      name: 'Process',
      code: 'CV-04',
      path: '/process',
      sections: [
        {
          id: 'process-hero',
          title: '01 · Process hero',
          summary: 'Page headline, lead and photograph',
          fields: pageCopyFields(process.page, process.set),
          image: pageCopyImage(process.page, process.set, 'process'),
        },
        {
          id: 'process-stages',
          title: '02 · Stages',
          summary: 'Stage rail heading, introduction and every stage',
          fields: sectionFields('process', 'stages'),
          collection: { label: 'Edit process stages', count: draft.processStages.length, tab: 'process' },
        },
        {
          id: 'process-handover',
          title: '03 · Handover file',
          summary: 'Handover heading, introduction and the commissioning file list',
          fields: sectionFields('process', 'handover'),
          collection: { label: 'Edit commissioning file', count: draft.processExtras.file.length, tab: 'process' },
        },
        {
          id: 'process-before',
          title: '04 · Before we start',
          summary: 'Client-inputs heading, introduction and the required inputs',
          fields: sectionFields('process', 'before'),
          collection: { label: 'Edit client inputs', count: draft.processExtras.inputs.length, tab: 'process' },
        },
        {
          id: 'process-questions',
          title: '05 · Questions',
          summary: 'Process FAQ heading, introduction and answers',
          fields: sectionFields('process', 'questions'),
          collection: { label: 'Edit process questions', count: draft.processExtras.faqs.length, tab: 'process' },
        },
        {
          id: 'process-next',
          title: '06 · Next',
          summary: 'Closing heading and introduction',
          fields: sectionFields('process', 'next'),
        },
      ],
    },
    {
      id: 'work',
      name: 'Work',
      code: 'CV-05',
      path: '/work',
      sections: [
        {
          id: 'work-hero',
          title: '01 · Work hero',
          summary: 'Page headline, lead and photograph',
          fields: pageCopyFields(work.page, work.set),
          image: pageCopyImage(work.page, work.set, 'work'),
        },
        {
          id: 'work-cases',
          title: '02 · Case files',
          summary: 'Case-file heading, introduction and each project record',
          fields: sectionFields('work', 'cases'),
          collection: { label: 'Edit work cases', count: draft.workCases.length, tab: 'work' },
        },
        {
          id: 'work-before-after',
          title: '03 · Before / after',
          summary: 'Comparison heading, introduction, labels and caption',
          fields: [
            ...sectionFields('work', 'beforeAfter'),
            {
              label: 'Before label',
              value: draft.pageSections.work.beforeLabel,
              onChange: (value) =>
                update((current) => ({
                  ...current,
                  pageSections: {
                    ...current.pageSections,
                    work: { ...current.pageSections.work, beforeLabel: value },
                  },
                })),
            },
            {
              label: 'After label',
              value: draft.pageSections.work.afterLabel,
              onChange: (value) =>
                update((current) => ({
                  ...current,
                  pageSections: {
                    ...current.pageSections,
                    work: { ...current.pageSections.work, afterLabel: value },
                  },
                })),
            },
            {
              label: 'Caption',
              value: draft.pageSections.work.caption,
              multiline: true,
              onChange: (value) =>
                update((current) => ({
                  ...current,
                  pageSections: {
                    ...current.pageSections,
                    work: { ...current.pageSections.work, caption: value },
                  },
                })),
            },
          ],
        },
        {
          id: 'work-next',
          title: '04 · Next',
          summary: 'Closing heading and introduction',
          fields: sectionFields('work', 'next'),
        },
      ],
    },
    {
      id: 'amc',
      name: 'AMC',
      code: 'CV-06',
      path: '/amc',
      sections: [
        {
          id: 'amc-hero',
          title: '01 · AMC hero',
          summary: 'Page headline, lead and photograph',
          fields: pageCopyFields(amc.page, amc.set),
          image: pageCopyImage(amc.page, amc.set, 'amc'),
        },
        {
          id: 'amc-plans',
          title: '02 · Plans',
          summary: 'Plans heading, introduction and the three plan cards',
          fields: sectionFields('amc', 'plans'),
          collection: { label: 'Edit AMC plans', count: draft.plans.length, tab: 'plans' },
        },
        {
          id: 'amc-schedule',
          title: '03 · Visit schedule',
          summary: 'Schedule heading, introduction and the month-by-month table',
          fields: sectionFields('amc', 'schedule'),
          collection: { label: 'Edit visit schedule', count: draft.amcDetails.schedule.length, tab: 'amc' },
        },
        {
          id: 'amc-service-levels',
          title: '04 · Service levels',
          summary: 'SLA heading, introduction and the service-level table',
          fields: sectionFields('amc', 'serviceLevels'),
          collection: { label: 'Edit SLA table', count: draft.amcDetails.sla.length, tab: 'amc' },
        },
        {
          id: 'amc-questions',
          title: '05 · Questions',
          summary: 'AMC FAQ heading, introduction and answers',
          fields: sectionFields('amc', 'questions'),
          collection: { label: 'Edit AMC questions', count: draft.amcDetails.faqs.length, tab: 'amc' },
        },
        {
          id: 'amc-detail',
          title: '06 · Inclusions & exclusions',
          summary: 'Plan terms, included and excluded work',
          collection: { label: 'Edit AMC detail', count: draft.amcDetails.terms.length, tab: 'amc' },
        },
        {
          id: 'amc-next',
          title: '07 · Next',
          summary: 'Closing heading and introduction',
          fields: sectionFields('amc', 'next'),
        },
      ],
    },
    {
      id: 'contact',
      name: 'Contact',
      code: 'CV-07',
      path: '/contact',
      sections: [
        {
          id: 'contact-hero',
          title: '01 · Contact hero',
          summary: 'Page headline, lead and photograph',
          fields: pageCopyFields(contact.page, contact.set),
          image: pageCopyImage(contact.page, contact.set, 'contact'),
        },
        {
          id: 'contact-form',
          title: '02 · Enquiry form',
          summary: 'Form heading and introduction above the brief fields',
          fields: sectionFields('contact', 'form'),
        },
        {
          id: 'contact-details',
          title: '03 · Direct contact',
          summary: 'Phone, email, address, hours and service areas',
          collection: { label: 'Edit brand & contact', count: draft.brand.serviceAreas.length, tab: 'brand' },
        },
        {
          id: 'contact-coverage',
          title: '04 · Coverage',
          summary: 'Coverage heading, introduction and the service-area radii',
          fields: sectionFields('contact', 'coverage'),
          collection: { label: 'Edit service areas', count: draft.brand.serviceAreas.length, tab: 'brand' },
        },
      ],
    },
    {
      id: 'blog',
      name: 'Journal',
      code: 'CV-08',
      path: '/blog',
      sections: [
        {
          id: 'blog-hero',
          title: '01 · Journal hero',
          summary: 'Page headline, lead and photograph',
          fields: pageCopyFields(blog.page, blog.set),
          image: pageCopyImage(blog.page, blog.set, 'journal'),
        },
        {
          id: 'blog-articles',
          title: '02 · Articles',
          summary: 'Journal index heading, introduction and every article',
          fields: sectionFields('blog', 'articles'),
          collection: { label: 'Open journal workspace', count: draft.posts.length, href: '/admin/blog' },
        },
        {
          id: 'blog-next',
          title: '03 · Next',
          summary: 'Closing heading and introduction',
          fields: sectionFields('blog', 'next'),
        },
      ],
    },
    {
      id: 'products',
      name: 'Systems',
      code: 'CV-09',
      path: '/products',
      sections: [
        {
          id: 'products-hero',
          title: '01 · Systems hero',
          summary: 'Page headline, lead and photograph',
          fields: pageCopyFields(products.page, products.set),
          image: pageCopyImage(products.page, products.set, 'systems'),
        },
        {
          id: 'products-featured',
          title: '02 · Featured systems',
          summary: 'Featured heading, introduction and the three featured products',
          fields: sectionFields('products', 'featured'),
          collection: { label: 'Edit systems', count: draft.products.length, tab: 'products' },
        },
        {
          id: 'products-catalogue',
          title: '03 · Catalogue',
          summary: 'Catalogue heading, introduction and every system record',
          fields: sectionFields('products', 'catalogue'),
          collection: { label: 'Edit systems', count: draft.products.length, tab: 'products' },
        },
        {
          id: 'products-next',
          title: '04 · Next',
          summary: 'Closing heading and introduction',
          fields: sectionFields('products', 'next'),
        },
      ],
    },
    {
      id: 'legal',
      name: 'Legal index',
      code: 'CV-10',
      path: '/legal/privacy',
      sections: [
        {
          id: 'legal-index',
          title: '01 · Legal index',
          summary: 'Index heading, introduction, visit note and every document',
          fields: [
            ...sectionFields('legal', 'questions'),
            {
              label: 'Visit / appointment note',
              value: draft.pageSections.legal.note,
              multiline: true,
              onChange: (value) =>
                update((current) => ({
                  ...current,
                  pageSections: {
                    ...current.pageSections,
                    legal: { ...current.pageSections.legal, note: value },
                  },
                })),
            },
          ],
          collection: { label: 'Edit legal documents', count: draft.legal.length, tab: 'legal' },
        },
      ],
    },
    ...draft.legal.map((document: SiteContent['legal'][number], docIndex: number): PageConfig => ({
      id: `legal-${document.slug}`,
      name: document.title,
      code: `CV-L${String(docIndex + 1).padStart(2, '0')}`,
      path: `/legal/${document.slug}`,
      sections: [
        {
          id: 'legal-document',
          title: '01 · Document header',
          summary: 'Page title, summary, effective date, slug and publish state',
          fields: [
            {
              label: 'Document title',
              value: document.title,
              onChange: (value) => updateLegalDoc(docIndex, { title: value }),
            },
            {
              label: 'Summary',
              value: document.summary,
              multiline: true,
              onChange: (value) => updateLegalDoc(docIndex, { summary: value }),
            },
            {
              label: 'Effective date',
              value: document.updatedAt,
              onChange: (value) => updateLegalDoc(docIndex, { updatedAt: value }),
            },
            {
              label: 'URL slug',
              value: document.slug,
              onChange: (value) => updateLegalDoc(docIndex, { slug: value }),
            },
            {
              label: 'Published on the public site',
              type: 'toggle' as const,
              checked: document.published,
              onChange: (value: boolean) => updateLegalDoc(docIndex, { published: value }),
            },
          ],
        },
        ...document.sections.map((section, sectionIndex): SectionConfig => ({
          id: `legal-${document.slug}-section-${sectionIndex}`,
          title: `${String(sectionIndex + 2).padStart(2, '0')} · ${section.heading || 'Untitled section'}`,
          summary: 'Heading and body paragraphs for this section',
          fields: [
            {
              label: 'Section heading',
              value: section.heading,
              onChange: (value: string) =>
                updateLegalSection(docIndex, sectionIndex, { heading: value }),
            },
            {
              label: 'Body paragraphs (one blank line between paragraphs)',
              value: section.body.join('\n\n'),
              multiline: true,
              onChange: (value: string) =>
                updateLegalSection(docIndex, sectionIndex, {
                  body: value
                    .split(/\n{2,}/)
                    .map((paragraph) => paragraph.trim())
                    .filter(Boolean),
                }),
            },
          ],
        })),
      ],
    })),
  ]

  const corePages = pages.filter((page) => !page.id.startsWith('legal-'))
  const legalPages = pages.filter((page) => page.id.startsWith('legal-'))
  const servicesPage = pages.find((page) => page.id === 'services')
  const current = pages.find((page) => page.id === activePage) ?? pages[0]
  if (!current) return null

  const openPage = (id: string) => {
    setActivePage(id)
    setView('page')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openSection = (sectionId: string) => {
    const key = `${current.id}-${sectionId}`
    setOpenSections((previous) => ({ ...previous, [key]: true }))
    window.setTimeout(() => {
      document.getElementById(`studio-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }

  const setAllSections = (open: boolean) => {
    setOpenSections(
      Object.fromEntries(
        current.sections.map((section) => [`${current.id}-${section.id}`, open]),
      ),
    )
  }

  /* ---------------------------------------------------------------------- */
  /*  Landing grid                                                          */
  /* ---------------------------------------------------------------------- */

  if (view === 'grid' && !hideGrid) {
    return (
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-cold">
              Pages · {pages.length}
            </span>
            <h3 className="t-h3 mt-1.5 text-fg">Start with a page</h3>
            <p className="mt-1.5 max-w-[64ch] text-[12px] leading-relaxed text-fg-dim">
              Every public page in one grid. Open a page to walk its sections from the top of the
              screen to the footer, in order. Service detail pages live inside Services.
            </p>
          </div>
          <span className="font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
            Page → section → content
            <br />
            Every field writes to the live document
          </span>
        </header>

        <section>
          <div className="mb-3 flex items-center gap-3">
            <h4 className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-dim">
              Public pages
            </h4>
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
              {corePages.length} pages
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {corePages.map((page) => (
              <PageCard
                key={page.id}
                page={page}
                serviceCount={page.id === 'services' ? draft.services.length : 0}
                onOpen={() => (page.id === 'services' ? setView('services') : openPage(page.id))}
              />
            ))}
          </div>
        </section>

        {legalPages.length ? (
          <section>
            <div className="mb-3 flex items-center gap-3">
              <h4 className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-dim">
                Legal documents
              </h4>
              <span className="h-px flex-1 bg-line" />
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
                {legalPages.length} pages
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {legalPages.map((page) => (
                <PageCard key={page.id} page={page} onOpen={() => openPage(page.id)} />
              ))}
            </div>
          </section>
        ) : null}

        {servicesPage ? (
          <p className="border border-line bg-panel/20 px-4 py-3 text-[11px] leading-relaxed text-fg-faint">
            {draft.services.length} service detail pages sit behind the Services card. Each one is a
            full page with its own hero, inclusions, specification table and questions.
          </p>
        ) : null}
      </div>
    )
  }

  /* ---------------------------------------------------------------------- */
  /*  Service detail pages                                                  */
  /* ---------------------------------------------------------------------- */

  if (view === 'services') {
    return (
      <div className="flex flex-col gap-5">
        <StudioBreadcrumb
          items={[
            { label: 'All pages', onClick: () => setView('grid') },
            { label: 'Services' },
          ]}
        />

        <header className="flex flex-col gap-4 border-b border-line pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-cold">
              Dynamic pages · /services/&lt;service&gt;
            </span>
            <h3 className="t-h3 mt-1.5 text-fg">Service detail pages</h3>
            <p className="mt-1.5 max-w-[64ch] text-[12px] leading-relaxed text-fg-dim">
              {draft.services.length} pages, each composed from the service catalogue. Open one to
              edit its hero, price, inclusions, specification rows, process steps and questions.
            </p>
          </div>
          <Button variant="secondary" size="sm" icon="arrow-right" onClick={() => openPage('services')}>
            Edit the Services index
          </Button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {draft.services.map((service) => (
            <ServiceCard key={service.id} service={service} onOpen={() => onEditService(service.id)} />
          ))}
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------------- */
  /*  One page, section by section                                          */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="flex flex-col gap-5">
      {hideGrid ? null : (
        <StudioBreadcrumb
          items={[
            { label: 'All pages', onClick: () => setView('grid') },
            ...(current.id === 'home'
              ? []
              : [{ label: current.name }]),
          ]}
        />
      )}

      <header className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-cold">
            {current.code} · {current.path}
          </span>
          <h3 id="page-studio-heading" className="t-h3 mt-1.5 text-fg">
            {current.name}
          </h3>
          <p className="mt-1 text-[11px] text-fg-faint">
            {current.sections.length} sections, top to bottom. Open a section to edit its copy
            {current.sections.some((section) => section.image) ? ' or image' : ''}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="quiet" size="sm" onClick={() => setAllSections(true)}>
            Expand all
          </Button>
          <Button variant="quiet" size="sm" onClick={() => setAllSections(false)}>
            Collapse all
          </Button>
          <Link
            to={current.path}
            target="_blank"
            className="inline-flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/60 hover:text-cold"
          >
            <Icon name="external" size={12} />
            Preview page
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {current.sections.map((section) => (
          <button
            key={`jump-${section.id}`}
            type="button"
            onClick={() => openSection(section.id)}
            className="border border-line px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint transition-colors hover:border-cold/50 hover:text-cold"
          >
            {section.title}
          </button>
        ))}
      </div>

      <div className="border-t border-line">
        {current.sections.map((section, index) => {
          const key = `${current.id}-${section.id}`
          const fieldCount = section.fields?.length ?? 0
          return (
            <details
              key={key}
              id={`studio-${key}`}
              className="group scroll-mt-24 border-b border-line"
              open={openSections[key] ?? index === 0}
              onToggle={(event) => {
                const open = event.currentTarget.open
                setOpenSections((previous) => ({ ...previous, [key]: open }))
              }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cold [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block font-mono text-[11px] uppercase tracking-[0.08em] text-fg group-open:text-cold">
                    {section.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-fg-faint">
                    {section.summary}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {section.image?.url ? <Badge tone="cold">Image</Badge> : null}
                  {fieldCount ? (
                    <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
                      {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                    </span>
                  ) : null}
                  <Icon
                    name="plus"
                    size={14}
                    className="text-fg-faint transition-transform duration-3 group-open:rotate-45"
                  />
                </span>
              </summary>

              <div className="flex flex-col gap-4 pb-6">
                {section.fields?.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {section.fields.map((field) => (
                      <label
                        key={field.label}
                        className={cn(
                          'flex flex-col gap-1.5',
                          field.type === 'toggle'
                            ? 'justify-between md:col-span-2'
                            : field.multiline && 'md:col-span-2',
                        )}
                      >
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
                          {field.label}
                        </span>
                        {field.type === 'toggle' ? (
                          <span className="flex h-10 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.checked}
                              onChange={(event) => field.onChange(event.target.checked)}
                              className="h-4 w-4 accent-cold"
                            />
                            <span className="text-[12px] text-fg-dim">
                              {field.checked ? 'Visible to the public' : 'Hidden from the public'}
                            </span>
                          </span>
                        ) : field.multiline ? (
                          <Textarea
                            value={field.value}
                            rows={Math.min(6, Math.max(3, Math.ceil(field.value.length / 110)))}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        ) : (
                          <Input
                            value={field.value}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                ) : null}

                {section.image ? (
                  <ImageField
                    image={section.image}
                    onOpen={() =>
                      setPicker(
                        section.image
                          ? { folder: section.image.folder, select: section.image.onSelect }
                          : null,
                      )
                    }
                  />
                ) : null}

                {section.collection ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-base/40 px-4 py-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
                        Collection · {section.collection.count} records
                      </p>
                      <p className="mt-0.5 text-[11px] text-fg-faint">
                        Edits here flow to the matching public section after publishing.
                      </p>
                    </div>
                    {section.collection.href ? (
                      <Link
                        to={section.collection.href}
                        className="inline-flex h-9 items-center gap-2 border border-cold/40 bg-cold/[0.06] px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:bg-cold/10"
                      >
                        {section.collection.label}
                        <Icon name="arrow-right" size={12} />
                      </Link>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="arrow-right"
                        onClick={() => onNavigate(section.collection?.tab ?? 'brand')}
                      >
                        {section.collection.label}
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            </details>
          )
        })}
      </div>

      <MediaPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        defaultFolder={picker?.folder ?? 'general'}
        title={`Choose image · ${current.name}`}
        onSelect={(asset) => {
          picker?.select(asset)
          setPicker(null)
        }}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Studio cards                                                              */
/* -------------------------------------------------------------------------- */

function pagePreview(page: PageConfig): { title: string; lead: string; image: string } {
  const hero = page.sections[0]
  const values = (hero?.fields ?? [])
    .flatMap((field) => ('value' in field ? [field.value] : []))
    .filter((value) => value && value.trim().length > 0)
  return {
    title: values[1] ?? hero?.title ?? page.name,
    lead: values[2] ?? hero?.summary ?? '',
    image: page.sections.find((section) => section.image?.url)?.image?.url ?? '',
  }
}

function PageCard({
  page,
  serviceCount = 0,
  onOpen,
}: {
  page: PageConfig
  serviceCount?: number
  onOpen: () => void
}) {
  const preview = pagePreview(page)
  return (
    <article className="group flex flex-col border border-line bg-panel/20 transition-colors duration-2 hover:border-cold/45">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${page.name}`}
        className="relative block aspect-[4/3] w-full overflow-hidden border-b border-line bg-base text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cold"
      >
        {preview.image ? (
          <img
            src={preview.image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity duration-3 group-hover:opacity-30"
          />
        ) : null}
        <span
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgb(var(--line)/0.35) 0 1px, transparent 1px 26px)',
          }}
        />
        <div className="relative flex h-full flex-col p-4">
          <span className="flex items-center justify-between gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-cold">
            {page.code}
            <span className="text-fg-faint">{page.path}</span>
          </span>
          <p className="mt-3 overflow-hidden font-display text-[17px] leading-[1.15] text-fg [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {preview.title}
          </p>
          <p className="mt-1.5 overflow-hidden text-[10px] leading-relaxed text-fg-faint [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
            {preview.lead}
          </p>
          <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 font-mono text-[8px] uppercase tracking-[0.08em] text-fg-faint">
            {page.sections.length} sections
            {serviceCount > 0 ? <Badge tone="cold">{serviceCount} detail pages</Badge> : null}
          </span>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim">
          {page.name}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="flex shrink-0 items-center gap-1 font-mono text-[8px] uppercase tracking-[0.1em] text-cold hover:text-fg"
        >
          Open
          <Icon name="arrow-right" size={11} />
        </button>
      </div>
    </article>
  )
}

function ServiceCard({
  service,
  onOpen,
}: {
  service: SiteContent['services'][number]
  onOpen: () => void
}) {
  return (
    <article className="flex flex-col border border-line bg-panel/20 p-4 transition-colors duration-2 hover:border-cold/45">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-cold">
            /services/{service.id}
          </span>
          <p className="mt-1.5 truncate text-[14px] text-fg">{service.name}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-fg-faint">
            {service.category}
            {service.capacity ? ` · ${service.capacity}` : ''}
          </p>
        </div>
        <Badge tone={service.published ? 'success' : 'neutral'} dot>
          {service.published ? 'Public' : 'Hidden'}
        </Badge>
      </div>
      <p className="mt-3 overflow-hidden text-[11px] leading-relaxed text-fg-dim [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
        {service.headline || service.intro || service.scope || 'No page copy yet.'}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-3">
        <span className="font-mono text-[9px] text-fg-faint">
          {service.startingFrom || 'Quoted'}
        </span>
        <Button variant="secondary" size="sm" icon="arrow-right" onClick={onOpen}>
          Edit page
        </Button>
      </div>
    </article>
  )
}

function StudioBreadcrumb({
  items,
}: {
  items: { label: string; onClick?: () => void }[]
}) {
  return (
    <nav aria-label="Studio breadcrumb" className="flex items-center gap-2">
      <button
        type="button"
        onClick={items[0]?.onClick}
        className="flex h-8 items-center gap-1.5 border border-line px-2.5 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-dim transition-colors hover:border-cold/50 hover:text-cold"
      >
        <Icon name="arrow-right" size={11} className="rotate-180" />
        {items[0]?.label ?? 'All pages'}
      </button>
      {items.slice(1).map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <span aria-hidden className="font-mono text-[10px] text-fg-faint">
            /
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-fg-faint">
            {item.label}
          </span>
        </span>
      ))}
    </nav>
  )
}

function ImageField({
  image,
  onOpen,
}: {
  image: ImageConfig
  onOpen: () => void
}): ReactNode {
  return (
    <div className="flex flex-col gap-3 border border-line bg-base/30 p-3 sm:flex-row sm:items-start">
      <div className="aspect-[16/10] w-full overflow-hidden border border-line bg-panel sm:w-56">
        {image.url ? (
          <img src={image.url} alt={image.alt || 'Selected section image'} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-fg-faint">
            <Icon name="image" size={22} />
            <span className="font-mono text-[9px] uppercase tracking-[0.1em]">No image selected</span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
            Image alt text
          </span>
          <Input
            value={image.alt}
            onChange={(event) => image.onAlt(event.target.value)}
            placeholder="Describe the image for screen readers"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon="image" onClick={onOpen}>
            {image.url ? 'Replace image' : 'Choose or upload image'}
          </Button>
          {image.url ? (
            <Button variant="quiet" size="sm" onClick={image.onClear}>
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-[10px] leading-relaxed text-fg-faint">
          Uses the shared media library. Upload up to 40 images at once, 5 MB each.
        </p>
      </div>
    </div>
  )
}