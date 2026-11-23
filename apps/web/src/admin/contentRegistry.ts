export interface StudioPageEntry {
  id: string
  label: string
  route: string
  group: 'single' | 'collection'
  editor:
    | 'page'
    | 'services'
    | 'work'
    | 'products'
    | 'plans'
    | 'faqs'
    | 'legal'
    | 'voices'
    | 'about-sections'
    | 'blog'
    | 'amc'
    | 'process'
  description: string
}

/** Stable map between the public pages and the existing content editors. */
export const contentRegistry: StudioPageEntry[] = [
  {
    id: 'home',
    label: 'Home',
    route: '/',
    group: 'single',
    editor: 'page',
    description: 'Hero, proof, service stack, setpoint, performance and CTA.',
  },
  {
    id: 'services',
    label: 'Services index',
    route: '/services',
    group: 'single',
    editor: 'page',
    description: 'Service index hero, selection notes and CTA.',
  },
  {
    id: 'process',
    label: 'Process',
    route: '/process',
    group: 'single',
    editor: 'page',
    description: 'Process hero, stages and handover.',
  },
  {
    id: 'about',
    label: 'About',
    route: '/about',
    group: 'single',
    editor: 'page',
    description: 'Story, principles, people, safety and certifications.',
  },
  {
    id: 'work',
    label: 'Work index',
    route: '/work',
    group: 'single',
    editor: 'page',
    description: 'Work hero and case index copy.',
  },
  {
    id: 'amc',
    label: 'AMC',
    route: '/amc',
    group: 'single',
    editor: 'page',
    description: 'AMC hero, plan details and FAQs.',
  },
  {
    id: 'blog',
    label: 'Journal index',
    route: '/blog',
    group: 'single',
    editor: 'page',
    description: 'Journal hero and index copy.',
  },
  {
    id: 'products',
    label: 'Systems index',
    route: '/products',
    group: 'single',
    editor: 'page',
    description: 'Systems hero and catalogue introduction.',
  },
  {
    id: 'contact',
    label: 'Contact',
    route: '/contact',
    group: 'single',
    editor: 'page',
    description: 'Contact hero, callback section and direct details.',
  },
  {
    id: 'services-detail',
    label: 'Services',
    route: '/services/*',
    group: 'collection',
    editor: 'services',
    description: 'Service detail records, prices, scope and FAQs.',
  },
  {
    id: 'work-cases',
    label: 'Work cases',
    route: '/work',
    group: 'collection',
    editor: 'work',
    description: 'Project case studies and before/after evidence.',
  },
  {
    id: 'products-detail',
    label: 'System details',
    route: '/products',
    group: 'collection',
    editor: 'products',
    description: 'Product and system cards.',
  },
  {
    id: 'amc-plans',
    label: 'AMC plans',
    route: '/amc',
    group: 'collection',
    editor: 'plans',
    description: 'Maintenance plan names, prices and inclusions.',
  },
  {
    id: 'amc-details',
    label: 'AMC detail tables',
    route: '/amc',
    group: 'collection',
    editor: 'amc',
    description: 'Visit schedule, SLA table, questions and inclusions.',
  },
  {
    id: 'process-details',
    label: 'Process stages',
    route: '/process',
    group: 'collection',
    editor: 'process',
    description: 'Delivery stages, durations and handover evidence.',
  },
  {
    id: 'faqs',
    label: 'FAQs',
    route: '/faq',
    group: 'collection',
    editor: 'faqs',
    description: 'Reusable question and answer records.',
  },
  {
    id: 'legal',
    label: 'Legal pages',
    route: '/legal/*',
    group: 'collection',
    editor: 'legal',
    description: 'Privacy, terms, cookies and policy documents.',
  },
  {
    id: 'voices',
    label: 'Voices & brands',
    route: '/',
    group: 'collection',
    editor: 'voices',
    description: 'Testimonials and supported equipment brands.',
  },
  {
    id: 'about-sections',
    label: 'Shared sections',
    route: '/about',
    group: 'collection',
    editor: 'about-sections',
    description: 'Reusable about-page and global section copy.',
  },
]

export const singlePages = contentRegistry.filter((entry) => entry.group === 'single')
export const collectionPages = contentRegistry.filter((entry) => entry.group === 'collection')
