import { Router } from 'express'
import {
  aboutSections,
  amcDetails,
  blogPosts,
  equipmentBrands,
  legalDocuments,
  processExtras,
  processStages,
  pageSections,
  products,
  testimonials,
  workCases,
  type SiteContent,
  type SiteContentPayload,
  type SiteServiceOverride,
} from '@hvac/shared'
import { createStore } from './store.js'

const serviceSeed: [id: string, index: string, name: string, category: SiteServiceOverride['category'], capacity: string, timeline: string, specification: string][] = [
  ['split-ac-installation', '01', 'Split AC installation', 'residential', '1.5 – 8.5 TR', '1 – 2 days', 'Wall · cassette · tower · ductable'],
  ['ac-repair', '02', 'AC repair & emergency breakdown', 'residential', 'All split systems', 'Same day', '4 h response · 24 × 7 dispatch'],
  ['ac-servicing', '03', 'AC servicing & deep cleaning', 'residential', '1.5 – 8.5 TR', '2 – 3 h / unit', 'Jet wash · coil-safe chemicals'],
  ['gas-charging', '04', 'Gas charging & leak detection', 'residential', 'R-32 · R-410A · R-134a', '3 – 5 h', '550 psi nitrogen test'],
  ['ac-relocation', '05', 'AC relocation & reinstall', 'residential', '1.5 – 6 TR', '1 day', 'Pump-down · new flares'],
  ['inverter-multi-split', '06', 'Inverter & multi-split systems', 'residential', '1.5 – 12 TR', '2 – 4 days', 'R-32 · 3 – 5 indoor units'],
  ['ducted-residential', '07', 'Ducted residential HVAC', 'residential', '3 – 20 TR', '5 – 10 days', 'PIR · 35 – 60 Pa'],
  ['air-purification', '08', 'Air purification, UV & IAQ', 'residential', 'Full home', '1 – 2 days', 'PM2.5 · VOC · UV-C'],
  ['smart-thermostats', '09', 'Smart thermostats & controls', 'residential', 'Per zone', '4 – 6 h', 'BACnet · Modbus · Wi-Fi'],
  ['vrf-systems', '10', 'VRF / VRV design & installation', 'commercial', '8 – 1,200 TR', '3 – 8 weeks', 'Heat recovery · 92% diversity'],
  ['chilled-water', '11', 'Chilled water systems & chillers', 'industrial', '60 – 2,000 TR', '6 – 16 weeks', '0.52 kW/TR at design'],
  ['packaged-rooftop', '12', 'Packaged & rooftop units', 'commercial', '10 – 150 TR', '2 – 5 weeks', 'DX · 42 Pa static'],
  ['ducting', '13', 'Ducting design & fabrication', 'commercial', '800 – 24,000 CFM', '2 – 6 weeks', 'GI · PIR · 640 Pa test'],
  ['ventilation', '14', 'Ventilation, fresh air & exhaust', 'commercial', '500 – 30,000 CFM', '1 – 4 weeks', '4 – 12 ACH'],
  ['cold-rooms', '15', 'Cold rooms & walk-in coolers', 'industrial', '-25 to +8 °C', '4 – 10 weeks', '12 – 80 TR · 100 mm PIR'],
  ['precision-cooling', '16', 'Cleanrooms & precision cooling', 'industrial', '5 – 220 TR', '6 – 14 weeks', 'ISO 5 – 8 · ±0.5 °C'],
  ['server-room', '17', 'Server room & data centre cooling', 'industrial', '3 – 200 TR', '3 – 8 weeks', 'N+1 · 22 – 27 °C'],
  ['bms', '18', 'BMS integration & energy management', 'commercial', 'Any plant', '2 – 6 weeks', 'BACnet/IP · Modbus'],
  ['retrofit-audit', '19', 'HVAC retrofit & energy audit', 'commercial', 'Existing plant', '2 – 6 weeks', 'Metered kW/TR baseline'],
  ['amc', '20', 'Annual maintenance contracts', 'maintenance', 'All makes', '12-month term', '2 – 26 visits / year'],
  ['chiller-maintenance', '21', 'Chiller, AHU & cooling tower service', 'maintenance', '60 – 2,000 TR', 'Per visit', 'Tube brush · water treatment'],
  ['kitchen-ventilation', '22', 'Commercial kitchen ventilation', 'commercial', '2,000 – 20,000 CFM', '2 – 5 weeks', 'Hood · UV · grease filter'],
]

function defaultPayload(): SiteContentPayload {
  return {
    brand: {
      name: 'Coolvane HVAC',
      shortName: 'Coolvane',
      legalName: 'Coolvane Climate Systems LLC',
      tagline: 'Thermal engineering for buildings that cannot afford to fail.',
      description:
        'Design, installation and maintenance of split, VRF, chilled-water and precision cooling systems for homes, offices, plants and cleanrooms. Measured, commissioned and documented.',
      monogram: 'CV',
      contact: {
        phone: '+15555550142',
        phoneDisplay: '(555) 555-0142',
        emergencyPhone: '+15555550177',
        email: 'works@coolvane.example',
        salesEmail: 'projects@coolvane.example',
      },
      address: {
        line1: '8420 Central Commerce Drive, Suite 210',
        line2: 'Engineering and dispatch',
        locality: 'Dallas',
        region: 'TX',
        postalCode: '75201',
        country: 'US',
      },
      hours: {
        weekdays: '08:00 – 18:00',
        saturday: '09:00 – 15:00',
        sunday: 'Emergency cover only',
        emergency: '24 × 7 dispatch',
      },
      serviceAreas: [
        { city: 'Dallas', region: 'Texas', slug: 'dallas', radiusKm: 72 },
        { city: 'Fort Worth', region: 'Texas', slug: 'fort-worth', radiusKm: 56 },
        { city: 'Plano', region: 'Texas', slug: 'plano', radiusKm: 48 },
      ],
      stats: {
        yearsOperating: 17,
        systemsInstalled: 4120,
        tonnageCommissioned: 18600,
        emergencyResponseHours: 4,
      },
      credentials: ['ASHRAE member', 'NATE-certified installers', 'EPA Section 608 certified'],
      foundedYear: 2009,
      gstin: '',
      billing: {
        bankName: 'Commerce Bank, Dallas Main',
        accountName: 'Coolvane Climate Systems LLC',
        accountNumber: '000123456789',
        ifsc: '111000025',
        upiId: 'coolvane.example/pay',
        invoicePrefix: 'INV',
        invoiceTerms:
          'Payment by cash, cheque, card on site or bank transfer. Cheques in favour of Coolvane Climate Systems LLC. Please quote the invoice reference with every transfer. Interest at 1.5% per month may apply to balances more than 30 days overdue.',
        invoiceNotes:
          'Thank you for choosing Coolvane. This invoice is issued by Coolvane Climate Systems LLC, Dallas, TX. For billing questions call (555) 555-0142 or write to works@coolvane.example.',
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
      headline: 'Seventeen years of holding a setpoint.',
      lead:
        'Two engineers, one van and a rule that has not changed: the number on the handover sheet has to be the number measured on site. The work moved from flats into plant rooms because that is where the failures were.',
      story: [
        'Coolvane started in 2009 with two engineers, one van and a rule that has not changed: the number written on the handover sheet has to be the number measured on site. The first contracts were residential splits in North Dallas and a single 40 TR packaged unit for a printing plant outside Fort Worth.',
        'The work moved into plant rooms because that is where the failures were. A split that is 300 mm short of service access is inconvenient; a chiller sequence that cannot hold at 40% load is a building with no cooling by June.',
        'Seventeen years later the company runs three city crews, a fabrication shop for GI and PIR ductwork, and a maintenance desk that answers at 02:00. We do not subcontract commissioning, and we do not issue a handover file we have not measured ourselves.',
      ],
    },
    workCases,
    processStages,
    processExtras,
    aboutSections,
    amcDetails,
    testimonials,
    equipmentBrands,
    legal: legalDocuments,
    pageSections,
    pages: {
      services: {
        headline: 'Twenty-two systems, one standard.',
        lead:
          'Residential splits to 2,000 TR centrifugal plant. Each entry lists the capacity we design to, the lead time we hold, and the specification that decides the selection — not the brochure tier.',
      },
      process: {
        headline: 'A file, not a promise.',
        lead:
          'Six stages from survey to signature. No stage starts before the previous deliverable exists, and the commissioning file is written during the job — not reconstructed after the first breakdown.',
      },
      work: {
        headline: 'Handed over, still running.',
        lead:
          'Five files from the last four years: two plant rooms, one cold chain, one cleanroom and a maintenance contract that has held since 2021. Each one states the problem, the change and the measured result.',
      },
      amc: {
        headline: 'Cover written before the failure.',
        lead:
          'A contract with a written scope, a visit report every time, and a dispatch line that answers at 02:00. Essential, Comprehensive and Precision — priced per unit or per TR, with the exclusions on the card.',
      },
      contact: {
        headline: 'Talk to the works.',
        lead:
          'The person who answers has the plant schedule in front of them. Call for a failure, write for a survey, or send the brief below — all three reach the same three engineers.',
      },
      blog: {
        headline: 'Field notes, written to be used.',
        lead:
          'Answer-first technical guides for owners, facility teams and consultants. Every article states the measurement, the assumption and the question worth asking before work is approved.',
      },
      products: {
        headline: 'A specification library, not a shopping cart.',
        lead:
          'Residential splits to central plant, selected against the load and quoted after a survey. Compare capacity, refrigerant, installation route and the checks that come with handover.',
      },
    },
    posts: blogPosts,
    products,
    services: serviceSeed.map(([id, index, name, category, capacity, timeline, specification]) => ({
      id,
      index,
      name,
      category,
      capacity,
      timeline,
      specification,
      scope: '',
      headline: '',
      intro: '',
      startingFrom: '',
      warranty: '',
      published: true,
    })),
    plans: [
      {
        id: 'essential',
        name: 'Essential',
        price: '$480',
        priceNote: 'per indoor unit / year',
        visits: '2 visits / year',
        summary: 'Scheduled cleaning and a pressure check for equipment still under OEM warranty.',
        includes: [
          'Filter clean and coil wash',
          'Refrigerant pressure check',
          'Drain and insulation inspection',
          'Written visit report',
        ],
        excluded: 'Parts, refrigerant and labour outside the visit window are quoted separately.',
        featured: false,
      },
      {
        id: 'comprehensive',
        name: 'Comprehensive',
        price: '$960',
        priceNote: 'per indoor unit / year',
        visits: '4 visits / year',
        summary: 'The plan most offices and clinics specify: labour, consumables and priority dispatch.',
        includes: [
          'Everything in Essential',
          'Parts and consumables to $600 / visit',
          'Priority dispatch inside 4 hours',
          'Annual deep clean with coil photos',
        ],
        excluded: 'Compressor, PCB and refrigerant loss above 10% are quoted after inspection.',
        featured: true,
      },
      {
        id: 'precision',
        name: 'Precision',
        price: 'Quoted per TR',
        priceNote: 'priced on installed capacity',
        visits: '12 visits / year',
        summary: 'For cleanrooms, labs and data rooms where a temperature excursion is a written incident.',
        includes: [
          'Monthly on-site engineer',
          'BMS and alarm review',
          '99.5% uptime clause with credits',
          'Critical spare board held on site',
        ],
        excluded: 'Civil work, duct replacement and controls upgrades are separate projects.',
        featured: false,
      },
    ],
    faqs: [
      {
        id: 'tonnage',
        question: 'How do you decide the tonnage for a room?',
        answer:
          'Sensible and latent load, not floor area. A 420 sq ft west-facing room with 1.5 m of glazing and two occupants typically lands at 3.2–3.5 TR; the same room facing north is closer to 2.6 TR.',
        published: true,
      },
      {
        id: 'exclusions',
        question: 'What is excluded from a standard split installation?',
        answer:
          'Electrical point to the indoor unit, surge protection, wall cutting beyond one 2 in. hole, drain routing longer than 10 ft, and building approval fees. Every quotation lists these explicitly.',
        published: true,
      },
      {
        id: 'emergency',
        question: 'How fast is an emergency visit?',
        answer:
          'Four hours inside Dallas, Fort Worth and Plano city limits for AMC customers, measured from the logged call to an engineer on site. Non-contract calls are attended the same working day where parts are in stock. Weekend and after-hours slots are available for critical outages.',
        published: true,
      },
      {
        id: 'payment',
        question: 'Do you accept card or online payment?',
        answer:
          'We take card on site and bank transfer, and we still issue a paper trail against every invoice. There is no payment gateway fee added to the job.',
        published: true,
      },
    ],
    seo: {
      titleTemplate: '{page} · {brand}',
      defaultDescription:
        'HVAC design, installation and maintenance across Dallas, Fort Worth and Plano — split, VRF, chilled water and precision cooling, commissioned to a measured setpoint.',
      keywords: [
        'HVAC contractor Dallas',
        'VRF installation Dallas',
        'chiller maintenance Fort Worth',
        'AC repair Plano',
        'AMC for air conditioning',
        'precision cooling cleanroom',
      ],
      canonicalBase: 'https://coolvane.example',
      ogImage: '/og/coolvane-og.jpg',
      robots: 'index, follow',
      pages: [
        { path: '/', title: 'Thermal systems', description: 'HVAC design, installation and maintenance for homes, offices and plants across Dallas, Fort Worth and Plano.' },
        { path: '/services', title: 'Services', description: 'Compare 22 HVAC services by capacity, lead time and specification — split, VRF, chilled water, ducting and precision cooling.' },
        { path: '/about', title: 'About', description: 'Seventeen years of survey, design, installation and measured handover. Meet the engineers who sign the commissioning file.' },
        { path: '/process', title: 'Process', description: 'Six stages from survey to signature, each with a written deliverable and a quality gate.' },
        { path: '/work', title: 'Work', description: 'Case files from plant rooms, cold chains, cleanrooms and maintenance contracts across Dallas and Fort Worth.' },
        { path: '/amc', title: 'Maintenance', description: 'Essential, Comprehensive and Precision maintenance plans with a 4-hour dispatch line and written visit reports.' },
        { path: '/contact', title: 'Contact', description: 'Talk to the works: phone, email and a service-tagged enquiry form answered within one working hour.' },
        { path: '/blog', title: 'Journal', description: 'Answer-first HVAC guides on commissioning, sizing, maintenance, refrigerants and system selection.' },
        { path: '/products', title: 'Systems', description: 'HVAC product and system catalogue with capacity, refrigerant, installation scope and commissioning checks.' },
      ],
    },
  }
}

export function defaultContent(): SiteContent {
  return {
    ...defaultPayload(),
    version: 1,
    updatedAt: new Date().toISOString(),
  }
}

export const contentStore = createStore<SiteContent>('content.json', defaultContent)

/**
 * Existing installations may hold a content.json written before a collection
 * was introduced. Normalise it against the current seed so old documents keep
 * serving and the admin editor receives every field the schema expects.
 */
function normalizeContent(stored: SiteContent): SiteContent {
  const defaults = defaultContent()
  const current = stored as Partial<SiteContent>
  return {
    ...defaults,
    ...current,
    version: current.version ?? defaults.version,
    updatedAt: current.updatedAt ?? defaults.updatedAt,
    brand: {
      ...defaults.brand,
      ...(current.brand ?? {}),
      contact: { ...defaults.brand.contact, ...(current.brand?.contact ?? {}) },
      address: { ...defaults.brand.address, ...(current.brand?.address ?? {}) },
      hours: { ...defaults.brand.hours, ...(current.brand?.hours ?? {}) },
      stats: { ...defaults.brand.stats, ...(current.brand?.stats ?? {}) },
      billing: { ...defaults.brand.billing, ...(current.brand?.billing ?? {}) },
      serviceAreas: current.brand?.serviceAreas ?? defaults.brand.serviceAreas,
      credentials: current.brand?.credentials ?? defaults.brand.credentials,
    },
    home: { ...defaults.home, ...(current.home ?? {}) },
    pages: {
      services: { ...defaults.pages.services, ...(current.pages?.services ?? {}) },
      process: { ...defaults.pages.process, ...(current.pages?.process ?? {}) },
      work: { ...defaults.pages.work, ...(current.pages?.work ?? {}) },
      amc: { ...defaults.pages.amc, ...(current.pages?.amc ?? {}) },
      contact: { ...defaults.pages.contact, ...(current.pages?.contact ?? {}) },
      blog: { ...defaults.pages.blog, ...(current.pages?.blog ?? {}) },
      products: { ...defaults.pages.products, ...(current.pages?.products ?? {}) },
    },
    workCases: current.workCases ?? defaults.workCases,
    processStages: current.processStages ?? defaults.processStages,
    processExtras: {
      ...defaults.processExtras,
      ...(current.processExtras ?? {}),
    },
    aboutSections: {
      ...defaults.aboutSections,
      ...(current.aboutSections ?? {}),
    },
    amcDetails: { ...defaults.amcDetails, ...(current.amcDetails ?? {}) },
    testimonials: current.testimonials ?? defaults.testimonials,
    equipmentBrands: current.equipmentBrands ?? defaults.equipmentBrands,
    posts: current.posts ?? defaults.posts,
    products: current.products ?? defaults.products,
    legal: current.legal ?? defaults.legal,
    pageSections: {
      ...defaults.pageSections,
      ...(current.pageSections ?? {}),
      about: { ...defaults.pageSections.about, ...(current.pageSections?.about ?? {}) },
      services: {
        ...defaults.pageSections.services,
        ...(current.pageSections?.services ?? {}),
        selectionNotes:
          current.pageSections?.services?.selectionNotes ??
          defaults.pageSections.services.selectionNotes,
      },
      process: { ...defaults.pageSections.process, ...(current.pageSections?.process ?? {}) },
      work: { ...defaults.pageSections.work, ...(current.pageSections?.work ?? {}) },
      amc: { ...defaults.pageSections.amc, ...(current.pageSections?.amc ?? {}) },
      contact: { ...defaults.pageSections.contact, ...(current.pageSections?.contact ?? {}) },
      blog: { ...defaults.pageSections.blog, ...(current.pageSections?.blog ?? {}) },
      products: { ...defaults.pageSections.products, ...(current.pageSections?.products ?? {}) },
      legal: { ...defaults.pageSections.legal, ...(current.pageSections?.legal ?? {}) },
    },
  }
}

export async function readSiteContent(): Promise<SiteContent> {
  return normalizeContent(await contentStore.read())
}

/**
 * Public document supplied to the website. Unpublished records and the bank
 * details used to print invoices must never be readable by an unauthenticated
 * visitor. The admin editor keeps using readSiteContent() through /admin.
 */
export function publicSiteContent(content: SiteContent): SiteContent {
  return {
    ...content,
    brand: {
      ...content.brand,
      billing: {
        ...content.brand.billing,
        bankName: '',
        accountName: '',
        accountNumber: '',
        ifsc: '',
        upiId: '',
      },
    },
    posts: content.posts.filter((post) => post.published),
    products: content.products.filter((product) => product.published),
    services: content.services.filter((service) => service.published),
    legal: content.legal.filter((document) => document.published),
    faqs: content.faqs.filter((faq) => faq.published),
    testimonials: content.testimonials.filter((testimonial) => testimonial.published),
  }
}

export const contentRouter = Router()

contentRouter.get('/content', async (req, res) => {
  const content = publicSiteContent(await readSiteContent())
  const etag = `W/"content-${content.version}"`
  res.set('Cache-Control', 'public, no-cache')
  res.set('ETag', etag)
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end()
    return
  }
  res.json({ data: content })
})
