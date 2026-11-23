import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  aboutSections as aboutSectionSeed,
  amcDetails as amcDetailsSeed,
  blogPosts as blogPostSeed,
  equipmentBrands as equipmentBrandSeed,
  legalDocuments as legalSeed,
  pageSections as pageSectionsSeed,
  processExtras as processExtrasSeed,
  processStages as processStageSeed,
  products as productSeed,
  testimonials as testimonialSeed,
  workCases as workCaseSeed,
  type SiteContent,
} from '@hvac/shared'
import { brandConfig } from '@/brand/brand.config'
import { amcPlans, homeFaqs } from '@/content/home'
import { catalogueServices } from '@/content/services'

const fallbackContent: SiteContent = {
  version: 0,
  updatedAt: '',
  brand: {
    name: brandConfig.name,
    shortName: brandConfig.shortName,
    legalName: brandConfig.legalName,
    tagline: brandConfig.tagline,
    description: brandConfig.description,
    monogram: brandConfig.monogram,
    contact: brandConfig.contact,
    address: brandConfig.address,
    hours: brandConfig.hours,
    serviceAreas: brandConfig.serviceAreas.map((area) => ({
      ...area,
      radiusKm: area.radiusKm,
    })),
    stats: brandConfig.stats,
    credentials: brandConfig.credentials,
    foundedYear: brandConfig.foundedYear,
    gstin: brandConfig.gstin ?? '',
    billing: {
      bankName: 'Commerce Bank, Dallas Main',
      accountName: 'Coolvane Climate Systems LLC',
      accountNumber: '000123456789',
      ifsc: '111000025',
      upiId: 'coolvane.example/pay',
      invoicePrefix: 'INV',
      invoiceTerms:
        'Payment by cash, cheque, card on site or bank transfer. Cheques in favour of Coolvane Climate Systems LLC. Please quote the invoice reference with every transfer.',
      invoiceNotes:
        'Thank you for choosing Coolvane. This invoice is issued by Coolvane Climate Systems LLC, Dallas, TX.',
    },
  },
  home: {
    heroEyebrow: 'Dallas · Fort Worth · Plano',
    heroTitle: 'Air, held to a setpoint.',
    heroLead:
      'Split, VRF, chilled-water and precision cooling — designed, installed and commissioned by the people who answer the breakdown call. Every handover carries the tonnage, static pressure and delta-T we actually measured.',
    heroImage: '',
    heroImageAlt: '',
    airflowTitle: 'How air moves through your building.',
    airflowDescription:
      'Six layers between the condenser fan and the diffuser. Each one adds pressure drop, heat gain or noise — and each one is a decision made on paper before it is made in copper.',
    segmentsTitle: 'One plant room. Two very different briefs.',
    segmentsDescription:
      'A three-bedroom flat and a fourteen-floor office do not share a design method. They share a standard: the number on the handover sheet has to be the number on the wall.',
    voicesTitle: 'Written by the people who signed the handover.',
    voicesDescription:
      'Sample copy. Moderated reviews from completed jobs replace these in the CMS — no invented names, no aggregate rating until real ones exist.',
    servicesTitle: 'Six systems, one design intent.',
    servicesDescription:
      'Each service carries a capacity range and the two numbers we would hold the installer to. Open any system for its scope, exclusions, commissioning record and enquiry route.',
    performanceTitle: 'The handover is a measurement, not a folder.',
    performanceDescription:
      'Four readings decide whether a system is ready to be signed over. They are taken on site, at the design condition, and written into the commissioning file.',
    performanceAnswer:
      'Coolvane commissions against measured capacity, return-to-supply temperature difference, external static pressure and energy at part load. The design value and the measured value are recorded side by side for every system, so a future service visit has a baseline rather than an opinion.',
    assuranceTitle: 'What is in the file before final payment.',
    assuranceDescription:
      'A six-part handover pack that a new engineer can use without calling the installer. No file, no completion certificate.',
    assuranceAnswer:
      'Every project handover includes the approved load calculation, equipment schedule matched to nameplates, as-built drawings, test and balance records, controls points and alarms, and the O&M manual with refrigerant charge. The owner receives a controlled digital set at completion.',
    coverageTitle: 'Three cities, one dispatch clock.',
    coverageDescription:
      'Dallas, Fort Worth and Plano are covered by employed crews. The response clock starts when the call is logged, not when a technician is found.',
    coverageAnswer:
      'Coolvane operates from Dallas with employed service crews covering Dallas, Fort Worth and Plano. Contracted emergency calls target a four-hour arrival inside city limits, measured from call logging to engineer on site. Work outside the published radius is quoted with travel and access stated separately.',
    productsTitle: 'Systems specified like equipment, not like a cart.',
    productsDescription:
      'The catalogue is a specification library: capacity, refrigerant, installation route and the checks we commission. Every system is quoted after a survey.',
    productsAnswer:
      'Coolvane supplies and installs residential splits, cassettes, ducted systems, VRF heat recovery, air-cooled chillers, precision cooling, cold rooms and kitchen ventilation. Catalogue prices are starting points for defined installation scope; the final quotation follows a site survey and equipment selection.',
    insightsTitle: 'Field notes from the commissioning sheet.',
    insightsDescription:
      'Technical writing for owners and facility teams: what to measure, what to ask, and which numbers decide the invoice.',
    insightsAnswer:
      'The Coolvane journal publishes answer-first guides on HVAC sizing, commissioning, maintenance, refrigerants and system selection. Each article states its assumptions, the relevant standard or manufacturer data, and the questions an owner should ask before approving work.',
    processTitle: 'Survey to signature, in six stages.',
    processDescription:
      'No stage starts before the previous deliverable exists. The commissioning file is written during stage five, not reconstructed after the invoice.',
    workTitle: 'Handed over, still running.',
    workDescription:
      'Five files from the last four years: two plant rooms, one cold chain, one cleanroom and a maintenance contract that has held since 2021.',
    plansTitle: 'Cover written before the failure.',
    plansDescription:
      'Every plan includes the visit report and the 4-hour dispatch line. Nothing is bundled quietly: the exclusions sit on the card, not in clause nine.',
    faqTitle: 'The questions that decide the invoice.',
    faqDescription:
      'Tonnage, exclusions, commissioning and response times. If an answer here contradicts a quotation, the quotation is wrong — send it back.',
    finalCtaTitle: 'Tell us the setpoint.',
    finalCtaLead:
      'Send the room, the load or the failure. We reply with the number we would design to, the equipment we would specify, and what it costs to hold it there.',
    setpointTitle: 'The setpoint is the contract.',
    setpointDescription:
      'A system is judged at the room, not on the datasheet. Three decisions are made on paper before anything is fixed to a wall — and they are the same three on a flat and a fourteen-floor office.',
    sequenceTitle: 'Six gates. One file.',
    sequenceDescription:
      'No stage starts before the previous deliverable exists. Scroll the rail to see what is handed over at each gate — survey sheet, design basis, quotation, checklist, commissioning file, visit report.',
    sequenceHandoverTitle: 'The file arrives before the invoice.',
    sequenceHandoverBody:
      'Load calculation, equipment schedule, as-built drawings, test record, controls narrative and the refrigerant log — issued together.',
    measuredTitle: 'Evidence, not atmosphere.',
    measuredDescription:
      'Every figure below is a practice, not a promise: systems are counted, tonnage is measured at handover, and the emergency line is answered by an engineer.',
    mapTitle: 'Every line has an owner.',
    mapDescription:
      'The schematic is the single source of truth for the installation. Pipe size, branch selector, drain route, electrical point and control sequence are resolved on the drawing before they are resolved in copper.',
    dispatchTitle: 'Distance is a schedule, not a slogan.',
    dispatchDescription:
      'Dallas is attended from the Central Commerce works. Fort Worth and Plano run on scheduled routes, with the same engineer answering the emergency line at 02:00.',
  },
  about: {
    headline: brandConfig.tagline,
    lead: brandConfig.description,
    story: [],
  },
  workCases: workCaseSeed,
  processStages: processStageSeed,
  processExtras: processExtrasSeed,
  aboutSections: aboutSectionSeed,
  amcDetails: amcDetailsSeed,
  testimonials: testimonialSeed,
  equipmentBrands: equipmentBrandSeed,
  posts: blogPostSeed,
  products: productSeed,
  legal: legalSeed,
  pageSections: pageSectionsSeed,
  pages: {
    services: {
      headline: 'Twenty-two systems, one standard.',
      lead: 'Residential splits to 2,000 TR centrifugal plant. Each entry lists the capacity we design to, the lead time we hold, and the specification that decides the selection — not the brochure tier.',
    },
    process: {
      headline: 'A file, not a promise.',
      lead: 'Six stages from survey to signature. No stage starts before the previous deliverable exists, and the commissioning file is written during the job — not reconstructed after the first breakdown.',
    },
    work: {
      headline: 'Handed over, still running.',
      lead: 'Five files from the last four years: two plant rooms, one cold chain, one cleanroom and a maintenance contract that has held since 2021. Each one states the problem, the change and the measured result.',
    },
    amc: {
      headline: 'Cover written before the failure.',
      lead: 'A contract with a written scope, a visit report every time, and a dispatch line that answers at 02:00. Essential, Comprehensive and Precision — priced per unit or per TR, with the exclusions on the card.',
    },
    contact: {
      headline: 'Talk to the works.',
      lead: 'The person who answers has the plant schedule in front of them. Call for a failure, write for a survey, or send the brief below — all three reach the same three engineers.',
    },
    blog: {
      headline: 'Field notes, written to be used.',
      lead: 'Answer-first technical guides for owners, facility teams and consultants. Every article states the measurement, the assumption and the question worth asking before work is approved.',
    },
    products: {
      headline: 'A specification library, not a shopping cart.',
      lead: 'Residential splits to central plant, selected against the load and quoted after a survey. Compare capacity, refrigerant, installation route and the checks that come with handover.',
    },
  },
  services: catalogueServices.map((service) => ({
    id: service.id,
    index: service.index,
    name: service.name,
    category: service.category,
    capacity: service.capacity,
    timeline: service.timeline,
    specification: service.specification,
    scope: '',
    headline: '',
    intro: '',
    startingFrom: '',
    warranty: '',
    published: true,
  })),
  plans: amcPlans.map((plan) => ({ ...plan, featured: plan.featured ?? false })),
  faqs: homeFaqs.map((faq) => ({ ...faq, published: true })),
  seo: {
    titleTemplate: '{page} · {brand}',
    defaultDescription: brandConfig.description,
    keywords: ['HVAC contractor Dallas', 'VRF installation', 'chiller maintenance', 'AC AMC'],
    canonicalBase: 'https://coolvane.example',
    ogImage: '/og/coolvane-og.jpg',
    robots: 'index, follow',
    pages: [],
  },
}

interface SiteContentContextValue {
  content: SiteContent
  syncedAt: number | null
  stale: boolean
  refresh: () => Promise<void>
}

const SiteContentContext = createContext<SiteContentContextValue>({
  content: fallbackContent,
  syncedAt: null,
  stale: false,
  refresh: async () => {},
})

/** Fill fields added after a cache or server document was written. */

export function SiteContentProvider({
  children,
  initialContent,
}: {
  children: ReactNode
  initialContent?: SiteContent
}) {
  const [content, setContent] = useState(initialContent ?? fallbackContent)
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const [stale, setStale] = useState(false)
  const etagRef = useRef<string | null>(null)
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/content', {
        cache: 'no-store',
        headers: etagRef.current ? { 'If-None-Match': etagRef.current } : {},
      })
      if (response.status === 304) {
        setSyncedAt(Date.now())
        setStale(false)
        return
      }
      if (!response.ok) {
        setStale(true)
        return
      }
      const payload = (await response.json()) as { data: SiteContent }
      if (!payload.data || typeof payload.data !== 'object') {
        setStale(true)
        return
      }
      etagRef.current = response.headers.get('ETag')
      setContent(payload.data)
      setSyncedAt(Date.now())
      setStale(false)
    } catch {
      setStale(true)
    }
  }, [])

  // The public site must actually read the document the admin publishes.
  // Previously this provider only refreshed from a manual button, so every
  // admin edit stayed invisible to visitors. Poll, refresh on focus, listen
  // for the same-tab save event and for the cross-tab BroadcastChannel.
  useEffect(() => {
    let active = true
    const run = () => {
      if (active) void refresh()
    }
    run()
    const timer = window.setInterval(run, 10_000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }
    window.addEventListener('focus', run)
    window.addEventListener('hvac-content-updated', run)
    document.addEventListener('visibilitychange', onVisibility)
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('hvac-content')
      channel.onmessage = run
    } catch {
      channel = null
    }
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', run)
      window.removeEventListener('hvac-content-updated', run)
      document.removeEventListener('visibilitychange', onVisibility)
      channel?.close()
    }
  }, [refresh])

  const value = useMemo<SiteContentContextValue>(
    () => ({ content, syncedAt, stale, refresh }),
    [content, syncedAt, stale, refresh],
  )
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>
}

export function useSiteContent() {
  const context = useContext(SiteContentContext)
  if (!context) throw new Error('useSiteContent must be used inside SiteContentProvider')
  return context
}

export function useSitePlans() {
  const { content } = useSiteContent()
  return content.plans
}

export function useSiteFaqs() {
  const { content } = useSiteContent()
  return content.faqs
}

export function useSiteServices() {
  const { content } = useSiteContent()
  return content.services.filter((service) => service.published)
}

export function usePublishedFaqs() {
  const { content } = useSiteContent()
  return content.faqs.filter((faq) => faq.published)
}
