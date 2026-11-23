import type { IconName } from '@/components/icons'

/**
 * Home page content.
 *
 * Phase 3 renders from this module; Phase 6 replaces each export with a fetch
 * from the CMS collections (Service, Project, Testimonial, FAQ, AMCPlan). The
 * shapes here are deliberately the shapes the API will return, so the page
 * components do not change when the source does.
 *
 * Testimonials are labelled sample data in the UI — Section 0.4 forbids
 * presenting invented reviews as real.
 */

export interface ServiceEntry {
  id: string
  index: string
  name: string
  category: 'Residential' | 'Commercial' | 'Industrial' | 'Maintenance'
  icon: IconName
  capacity: string
  summary: string
  specs: string[]
}

export const homeServices: ServiceEntry[] = [
  {
    id: 'vrf-systems',
    index: '01',
    name: 'VRF & multi-split systems',
    category: 'Commercial',
    icon: 'vrf',
    capacity: '8 – 1,200 TR',
    summary:
      'Heat-recovery branch selectors sized room by room. Pipe runs are checked against pressure drop at the furthest indoor unit, not the average of the riser.',
    specs: ['64 indoor units max', '92% diversity'],
  },
  {
    id: 'chilled-water',
    index: '02',
    name: 'Chilled water & chillers',
    category: 'Industrial',
    icon: 'chiller',
    capacity: '60 – 2,000 TR',
    summary:
      'Primary–secondary pumping at 7.2 / 12.4 °C design, with a plant sequence that still holds at 40% load. Air-cooled, water-cooled, screw and centrifugal.',
    specs: ['0.52 kW/TR at design', 'N+1 headers'],
  },
  {
    id: 'ducting',
    index: '03',
    name: 'Ducting & ventilation',
    category: 'Commercial',
    icon: 'duct',
    capacity: '800 – 24,000 CFM',
    summary:
      'Fabricated to a stated pressure class, hung from calculated hangers, and leak-tested before the ceiling closes. Every elbow removed is fan energy kept.',
    specs: ['GI · PIR · pre-insulated', '640 Pa leak test'],
  },
  {
    id: 'precision-cooling',
    index: '04',
    name: 'Precision cooling & cleanrooms',
    category: 'Industrial',
    icon: 'thermostat',
    capacity: '5 – 220 TR',
    summary:
      'Temperature, humidity and particle count held at the same time. Redundancy is designed for the failure case, not the datasheet case.',
    specs: ['ISO 5 – 8', '±0.5 °C · 18 ACH'],
  },
  {
    id: 'split-ac-installation',
    index: '05',
    name: 'Split AC installation',
    category: 'Residential',
    icon: 'heat-pump',
    capacity: '1.5 – 8.5 TR',
    summary:
      'Sensible load first, then the unit. Drain slope, electrical point and service access are agreed before a wall is opened, not after.',
    specs: ['Wall · cassette · ducted', 'R-32 inverter'],
  },
  {
    id: 'amc',
    index: '06',
    name: 'AMC & breakdown cover',
    category: 'Maintenance',
    icon: 'wrench',
    capacity: 'All makes',
    summary:
      'Scheduled visits with a written report each time, and a dispatch line that answers at 02:00 on a Sunday. Comprehensive and non-comprehensive plans.',
    specs: ['4 h response', '26 visits / year'],
  },
]

export interface AirflowStep {
  index: string
  title: string
  body: string
  meta: string
}

export const airflowSteps: AirflowStep[] = [
  {
    index: '01',
    title: 'Outdoor unit',
    body: 'Heat leaves the refrigerant across the condenser coil. Ambient dry-bulb, coil face velocity and a clean fin pack decide how much of it leaves in the next hour.',
    meta: 'Condenser · 3,200 CFM · 45 °C ambient',
  },
  {
    index: '02',
    title: 'Refrigerant line',
    body: 'Insulated copper carries the change of state inside. Length, lift and every fitting are pressure drop — 68 m equivalent is a design limit, not a plumbing note.',
    meta: 'Liquid 9.5 mm · suction 15.9 mm · 68 m',
  },
  {
    index: '03',
    title: 'Indoor coil',
    body: 'Air crosses the evaporator and sensible and latent load come off together. Bypass factor is the number nobody quotes and the one that decides your humidity.',
    meta: 'Evaporator · 6.5 °C · bypass 0.18',
  },
  {
    index: '04',
    title: 'Ductwork',
    body: 'Static pressure is spent on fittings. A 640 Pa fan set against 42 Pa of design static is a noise complaint waiting for the first closed damper.',
    meta: 'Supply · 42 Pa · 640 CFM per branch',
  },
  {
    index: '05',
    title: 'Terminal',
    body: 'The diffuser is where the design is actually judged. Throw, drop and noise are selected for the occupied zone, not for the ceiling grid.',
    meta: 'Diffuser · 24 °C ±0.5 · 55% RH',
  },
  {
    index: '06',
    title: 'Return & exhaust',
    body: 'Return air carries the load back and the fresh-air fraction with it. Twelve percent outside air at 4 ACH keeps CO₂ down without throwing away the cooling.',
    meta: 'Return plenum · 12% fresh air · 4 ACH',
  },
]

export interface ProcessStage {
  index: string
  name: string
  icon: IconName
  duration: string
  body: string
  deliverable: string
}

export const processStages: ProcessStage[] = [
  {
    index: '01',
    name: 'Survey',
    icon: 'search',
    duration: '1 – 2 days',
    body: 'Room-by-room survey with glazing, occupancy and equipment counts. Plant room, riser and terrace access photographed and measured.',
    deliverable: 'Load sheet + site constraints',
  },
  {
    index: '02',
    name: 'Design',
    icon: 'gauge',
    duration: '4 – 7 days',
    body: 'Sensible and latent load to ISHRAE comfort data. Equipment schedule, pipe sizing to the furthest run, duct layout and electrical load.',
    deliverable: 'Design basis + equipment schedule',
  },
  {
    index: '03',
    name: 'Quote',
    icon: 'download',
    duration: '2 days',
    body: 'Line items with quantities, makes and model numbers. Inclusions and exclusions written down, sales tax shown, validity stated.',
    deliverable: 'Itemised quotation',
  },
  {
    index: '04',
    name: 'Install',
    icon: 'wrench',
    duration: '3 – 21 days',
    body: 'Method statement, building approval and freight elevator booking handled. Installation checklist signed per room, with photographs before the ceiling closes.',
    deliverable: 'Signed installation checklist',
  },
  {
    index: '05',
    name: 'Commission',
    icon: 'thermostat',
    duration: '1 day',
    body: '24-hour run log, delta-T across every coil, static pressure at each branch, refrigerant charge recorded and as-built drawings issued.',
    deliverable: 'Commissioning file',
  },
  {
    index: '06',
    name: 'Maintain',
    icon: 'shield',
    duration: 'Quarterly +',
    body: 'Filter and coil service to a written scope. Visit report the same day, consumables log, renewal reminder at 60, 30 and 7 days.',
    deliverable: 'Visit report + renewal notice',
  },
]

export interface ProjectEntry {
  id: string
  category: string
  name: string
  location: string
  plate: string
  spec: string
  detail: string
  year: string
  image?: string
  imageAlt?: string
}

export const projects: ProjectEntry[] = [
  {
    id: 'meridian-foods',
    category: 'Cold room',
    name: 'Meridian Foods Distribution',
    location: 'Dallas Logistics Park',
    plate: 'Four chambers · -18 °C · blast freeze',
    spec: '12 TR · 4 chambers',
    detail: 'Held -18 °C through a 14-hour changeover with the standby scroll pair.',
    year: '2025',
  },
  {
    id: 'aster-offices',
    category: 'VRF',
    name: 'Aster Corporate Offices',
    location: 'Downtown Dallas',
    plate: 'Rooftop condenser bank · riser upgrade',
    spec: '84 TR · 14 floors',
    detail: '62 indoor units on heat recovery, 68 m furthest run, 92% diversity.',
    year: '2024',
  },
  {
    id: 'northline-labs',
    category: 'Chiller',
    name: 'Northline Research Labs',
    location: 'Fort Worth Innovation District',
    plate: 'Water-cooled plant · primary/secondary',
    spec: '320 TR · 0.58 kW/TR',
    detail: 'Design load met at 41 °C ambient with one screw compressor held as standby.',
    year: '2024',
  },
  {
    id: 'helix-devices',
    category: 'Cleanroom',
    name: 'Helix Device Manufacturing',
    location: 'Plano Technology Campus',
    plate: 'ISO 7 suite · FFU ceiling grid',
    spec: 'ISO 7 · 22 Pa · 18 ACH',
    detail: 'Positive pressure held across 14 airlocks; particle count signed off at handover.',
    year: '2023',
  },
  {
    id: 'harbour-mall',
    category: 'AMC',
    name: 'Harbour Crossing Mall',
    location: 'Frisco Retail Corridor',
    plate: 'Rooftop package units · common area',
    spec: '26 visits/yr · 640 TR',
    detail: 'Comprehensive cover on 640 TR of installed base; 4-hour dispatch since 2021.',
    year: '2021',
  },
]

export interface PlanEntry {
  id: string
  name: string
  price: string
  priceNote: string
  visits: string
  summary: string
  includes: string[]
  excluded: string
  featured?: boolean
}

export const amcPlans: PlanEntry[] = [
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
  },
]

export interface ReviewEntry {
  quote: string
  context: string
}

/** Sample copy. Replaced by moderated records from the Reviews collection. */
export const sampleReviews: ReviewEntry[] = [
  {
    quote:
      'The commissioning file had delta-T across every coil, not just the plant average. That is the first time a contractor has handed us that without being asked twice.',
    context: 'Facility manager · 84 TR VRF · Downtown Dallas',
  },
  {
    quote:
      'They traced 38 Pa of static going into a closed damper. Two visits later the fourth-floor south wing stopped running cold at 2 pm.',
    context: 'Building services lead · 320 TR chiller · Fort Worth',
  },
  {
    quote:
      'The cold room held -18 °C through a fourteen-hour changeover, and the alarm reached the duty engineer before it reached us.',
    context: 'Operations head · 4 × 3 TR chambers · Plano',
  },
]

export const equipmentBrands = [
  'Daikin',
  'Mitsubishi Electric',
  'Carrier',
  'Trane',
  'Blue Star',
  'Voltas',
  'Hitachi',
  'Danfoss',
]

export interface FaqEntry {
  id: string
  question: string
  answer: string
}

export const homeFaqs: FaqEntry[] = [
  {
    id: 'tonnage',
    question: 'How do you decide the tonnage for a room?',
    answer:
      'Sensible and latent load, not floor area. A 420 sq ft west-facing room with 1.5 m of glazing and two occupants typically lands at 3.2–3.5 TR; the same room facing north is closer to 2.6 TR. We take glazing area, orientation, occupancy, equipment gain and fresh-air fraction, then select on the higher of the sensible or latent requirement.',
  },
  {
    id: 'exclusions',
    question: 'What is excluded from a standard split installation?',
    answer:
      'Electrical point to the indoor unit, stabiliser, wall or slab cutting beyond one 50 mm hole, drain routing longer than 3 m, and building approval fees. Every quotation lists these explicitly rather than burying them in a lump sum, so the final invoice matches the number you approved.',
  },
  {
    id: 'occupied',
    question: 'Can you work inside an occupied office or a live plant room?',
    answer:
      'Yes. We issue a method statement and phasing plan before mobilising, work room by room where the system allows, and isolate only the branch being serviced. Night and weekend slots are available for trading floors, clinics and cleanrooms; the labour rate for those windows is quoted up front.',
  },
  {
    id: 'commissioning',
    question: 'What does commissioning actually include?',
    answer:
      'A 24-hour run log, delta-T across every coil, static pressure at each branch, refrigerant charge recorded against nameplate, drain flow test, and as-built drawings. You get the file at handover, not on request three months later.',
  },
  {
    id: 'emergency',
    question: 'How fast is an emergency visit?',
    answer:
      'Four hours inside Dallas, Fort Worth and Plano city limits for AMC customers, measured from the logged call to an engineer on site. Non-contract calls are attended the same working day where parts are held in stock; the dispatch line answers 24 × 7.',
  },
  {
    id: 'amc-pricing',
    question: 'Are AMC plans priced per unit or per TR?',
    answer:
      'Split, cassette and ducted residential equipment is priced per indoor unit. VRF, chilled-water and precision systems are priced per TR of installed capacity, because visit scope scales with plant, not with room count. Both include the visit report and the 4-hour dispatch line.',
  },
  {
    id: 'payment',
    question: 'Do you accept card or online payment?',
    answer:
      'No payment gateway. Quotations and invoices are settled by cash, cheque, bank transfer or card on site, and the receipt is issued against the invoice. That keeps the paper trail clean for audits and avoids a processing fee on every service call.',
  },
]
