import type {
  SiteAboutSections,
  SiteAmcDetails,
  SiteLegalDocument,
  SitePageSections,
  SiteProcessExtras,
  SiteProcessStage,
  SiteTestimonial,
  SiteWorkCase,
} from './site'

export const workCases: SiteWorkCase[] = [
  {
    id: 'meridian-foods',
    category: 'Cold room',
    name: 'Meridian Foods',
    location: 'Frisco',
    plate: 'Four chambers · -18 °C · blast freeze',
    spec: '12 TR · 4 chambers',
    detail: 'Held -18 °C through a 14-hour changeover with the standby scroll pair.',
    year: '2025',
    challenge:
      'Four cold chambers sharing one condensing unit, with a blast-freeze cycle that pulled 18 kW at start-up. The standby pair had never been proven under changeover, and the existing alarm went to a phone that was no longer in service.',
    solution:
      'Split the load across two scroll pairs with independent defrost schedules, re-piped the headers for a 14-hour changeover, and moved the alarm to the duty engineer with a 15-minute escalation. Panels rebuilt at 100 mm PIR with new gaskets and heaters.',
    result:
      'Held -18 °C through a full changeover with product inside. Alarm reached the duty engineer in 40 seconds during the witnessed test.',
    system: 'Cold chain · 12 TR · Frisco',
    metrics: [
      { label: 'Chambers', value: '4' },
      { label: 'Holding', value: '-18 °C' },
      { label: 'Changeover', value: '14 h' },
      { label: 'Standby', value: 'N+1' },
    ],
    scope: ['Heat load', 'Panel and door replacement', 'Scroll pairs', 'Alarm escalation', 'Changeover witness test'],
  },
  {
    id: 'aster-offices',
    category: 'VRF',
    name: 'Meridian Offices',
    location: 'Downtown Dallas',
    plate: 'Rooftop condenser bank · riser riser',
    spec: '84 TR · 14 floors',
    detail: '62 indoor units on heat recovery, 68 m furthest run, 92% diversity.',
    year: '2024',
    challenge:
      'A 14-floor office with west glazing and a tenant mix that changed floor by floor. The base-build design assumed 8 m² per person; actual occupancy on two floors was closer to 4 m², and the riser had no spare capacity for a conventional four-pipe system.',
    solution:
      'Heat-recovery VRF with branch selectors sized room by room, 62 indoor units and a 68 m furthest run checked against pressure drop. Diversity set at 92% with the outdoor bank staged across the roof to keep the acoustic limit at the neighbouring plot.',
    result:
      'Cooling delivered on all floors with one outdoor module held as standby. The measured kW/TR at 60% load was 0.81 against a design of 0.85.',
    system: 'VRF · 84 TR · Dallas',
    metrics: [
      { label: 'Capacity', value: '84 TR' },
      { label: 'Indoor units', value: '62' },
      { label: 'Furthest run', value: '68 m' },
      { label: 'Diversity', value: '92%' },
    ],
    scope: ['Room-by-room load', 'Heat-recovery VRF', 'Riser and roof plant', 'Acoustic staging', 'Commissioning at furthest unit'],
  },
  {
    id: 'northline-labs',
    category: 'Chiller',
    name: 'Northline Labs',
    location: 'Las Colinas, Irving',
    plate: 'Water-cooled plant · primary/secondary',
    spec: '320 TR · 0.58 kW/TR',
    detail: 'Design load met at 41 °C ambient with one screw compressor held as standby.',
    year: '2024',
    challenge:
      'A 320 TR water-cooled plant running two screw compressors with no headered standby. The building needed 24-hour operation for sample storage, and the existing primary pump set could not deliver design flow with one chiller isolated.',
    solution:
      'Primary-secondary pumping with N+1 headers, 7.2 / 12.4 °C design, and a plant sequence that holds at 40% load. Condenser water treatment corrected the fouling that had pushed the approach temperature 1.8 °C above design.',
    result:
      'Design load met at 41 °C ambient with one compressor isolated. Measured plant efficiency 0.58 kW/TR against a 0.60 design figure.',
    system: 'Chilled water · 320 TR · Fort Worth',
    metrics: [
      { label: 'Capacity', value: '320 TR' },
      { label: 'Efficiency', value: '0.58 kW/TR' },
      { label: 'Ambient', value: '41 °C' },
      { label: 'Redundancy', value: 'N+1' },
    ],
    scope: ['Load profile', 'Primary/secondary pumping', 'N+1 headers', 'Water treatment', 'Sequence and witness test'],
  },
  {
    id: 'helix-devices',
    category: 'Cleanroom',
    name: 'Helix Devices',
    location: 'Plano',
    plate: 'ISO 7 suite · FFU ceiling grid',
    spec: 'ISO 7 · 22 Pa · 18 ACH',
    detail: 'Positive pressure held across 14 airlocks; particle count signed off at handover.',
    year: '2023',
    challenge:
      'An ISO 7 suite with 14 airlocks, a particle-count guarantee and a process that could not tolerate a pressure reversal during filter change. The shell was already built, so the FFU grid had to fit a fixed ceiling height.',
    solution:
      'FFU ceiling grid with pressure-independent dampers, a cascade designed at 22 Pa and 18 ACH, and a change procedure that isolates one filter at a time. Validation ran with the process equipment installed, not in an empty room.',
    result:
      'ISO 7 held at all 14 airlocks; particle count and pressure cascade signed off by the independent testing agency at handover.',
    system: 'Cleanroom · ISO 7 · Plano',
    metrics: [
      { label: 'Class', value: 'ISO 7' },
      { label: 'Cascade', value: '22 Pa' },
      { label: 'Air changes', value: '18 ACH' },
      { label: 'Airlocks', value: '14' },
    ],
    scope: ['Particle count', 'Pressure cascade', 'FFU grid', 'Validation protocol', 'Independent sign-off'],
  },
  {
    id: 'harbour-mall',
    category: 'AMC',
    name: 'Northpark Galleria',
    location: 'Frisco',
    plate: 'Rooftop package units · common area',
    spec: '26 visits/yr · 640 TR',
    detail: 'Comprehensive cover on 640 TR of installed base; 4-hour dispatch since 2021.',
    year: '2021',
    challenge:
      'A 640 TR retail site with 31 rooftop packaged units, no single asset register and recurring summer complaints concentrated in the food court. The previous contractor serviced by visit count, not by measured performance.',
    solution:
      'Comprehensive AMC with 26 visits a year, a unit-level asset register, filter and coil service to a written scope, and a 4-hour dispatch line. Food-court make-up air re-balanced and the grease extract cleaned on a separate schedule.',
    result:
      'Emergency callouts down 38% in the second year. Food-court temperatures held within 0.6 °C of setpoint through the May peak.',
    system: 'AMC · 640 TR · Frisco',
    metrics: [
      { label: 'Installed base', value: '640 TR' },
      { label: 'Visits', value: '26 / yr' },
      { label: 'Dispatch', value: '4 h' },
      { label: 'Callouts', value: '-38%' },
    ],
    scope: ['Asset register', 'Scheduled PPM', '24 × 7 dispatch', 'Food-court air balance', 'Quarterly performance review'],
  },
]

export const processStages: SiteProcessStage[] = [
  {
    index: '01',
    name: 'Survey',
    duration: '1 – 2 days',
    body: 'Room-by-room survey with glazing, orientation, occupancy and equipment counts. Plant room, riser, terrace and drain routes photographed and measured. We ask for the last electricity bill and the maintenance history, because both change the design.',
    deliverable: 'Load sheet + site constraints',
    gate: 'Survey signed by the site contact',
    evidence: 'Dimensioned sketch, photographs, existing plant nameplate data',
    client: 'Access to plant room, terrace and a typical occupied room',
  },
  {
    index: '02',
    name: 'Design',
    duration: '4 – 7 days',
    body: 'Sensible and latent load to ASHRAE comfort data. Equipment schedule, pipe sizing to the furthest run, duct layout, electrical load and a control sequence written in plain language. Redundancy is designed for the failure case, not the datasheet case.',
    deliverable: 'Design basis + equipment schedule',
    gate: 'Second-engineer design review',
    evidence: 'Load calculation, selection sheet, schematic and control narrative',
    client: 'Confirm occupancy, operating hours and any planning constraints',
  },
  {
    index: '03',
    name: 'Quote',
    duration: '2 days',
    body: 'Line items with quantities, makes and model numbers. Inclusions and exclusions written down, sales tax shown, validity stated. Where two options are credible, both are priced with the operating difference shown in kW.',
    deliverable: 'Itemised quotation',
    gate: 'Scope and exclusions checked against the survey',
    evidence: 'Quotation with make list, payment schedule and validity',
    client: 'Approve the scope in writing; raise any landlord or permit requirement',
  },
  {
    index: '04',
    name: 'Install',
    duration: '3 – 21 days',
    body: 'Method statement, building approval and freight elevator booking handled. Installation checklist signed per room, with photographs before the ceiling closes. Daily site log for occupied buildings; night and weekend windows quoted up front.',
    deliverable: 'Signed installation checklist',
    gate: 'Pre-close inspection of every route',
    evidence: 'Photographs, pressure test log, hanger and support schedule',
    client: 'Site access, power for tools, storage for equipment',
  },
  {
    index: '05',
    name: 'Commission',
    duration: '1 day',
    body: '24-hour run log, delta-T across every coil, static pressure at each branch, refrigerant charge recorded against nameplate, drain flow test and as-built drawings. The file is issued at handover, not on request three months later.',
    deliverable: 'Commissioning file',
    gate: 'All measured values inside the design tolerance',
    evidence: 'Run log, air balance, refrigerant weight, signed handover',
    client: 'Witness the run log and sign the handover sheet',
  },
  {
    index: '06',
    name: 'Maintain',
    duration: 'Quarterly +',
    body: 'Filter and coil service to a written scope. Visit report the same day, consumables log, and renewal reminder at 60, 30 and 7 days. Breakdown cover is measured from the logged call to an engineer on site.',
    deliverable: 'Visit report + renewal notice',
    gate: 'Report issued within 24 hours of the visit',
    evidence: 'Visit checklist, before/after coil photographs, consumable list',
    client: 'Report a fault through dispatch; keep the plant room accessible',
  },
]

export const processExtras: SiteProcessExtras = {
  inputs: [
    'Room or floor plan with dimensions, or a measured sketch we can verify',
    'Glazing area and orientation for each façade',
    'Occupancy and operating hours, including weekend use',
    'Existing equipment make, model and tonnage — nameplate photographs are enough',
    'Electrical supply details: phase, service load, panel capacity',
    'Landlord, building or permit requirements, and permitted working hours',
  ],
  file: [
    'Design basis with the load calculation and the ASHRAE edition used',
    'Equipment schedule with make, model, serial and capacity',
    'As-built pipe and duct routing, including the furthest equivalent run',
    'Nitrogen pressure test log and vacuum decay record',
    'Refrigerant charge by weight against nameplate',
    'Air balance: static pressure at each branch, CFM at each diffuser',
    'Delta-T across every coil, plus the 24-hour run log',
    'Electrical load schedule and control sequence narrative',
    'O&M manuals, warranty certificates and the signed handover checklist',
  ],
  faqs: [
    {
      question: 'Can the survey happen while the building is occupied?',
      answer:
        'Yes. We survey room by room and do not need the plant shut down to measure. If the existing system must run during the survey, we record its current setpoints and operating pressures so the new design is compared against real conditions rather than a clean-sheet assumption.',
    },
    {
      question: 'Who arranges the building approval and freight elevator booking?',
      answer:
        'We draft the method statement and the equipment movement plan, then coordinate with the property manager. The building fee itself is paid by the client and shown separately in the quotation; we do not bury it in the installation line.',
    },
    {
      question: 'What happens if the measured air balance misses the design?',
      answer:
        'The branch is re-balanced and re-measured before handover. If a duct run is undersized, the correction is ours, not a change order. That is why the pressure class and hanger schedule are drawn before fabrication.',
    },
    {
      question: 'Is the commissioning file available before final payment?',
      answer:
        'Yes. The file is issued at handover and final payment is against it. If a measured value is outside tolerance, the file is not complete and the balance remains open until it is corrected.',
    },
  ],
}

export const aboutSections: SiteAboutSections = {
  milestones: [
    { year: '2009', title: 'Two engineers, one van', body: 'Company founded in Dallas. First contract: nine residential splits across two buildings in the Design District.' },
    { year: '2012', title: 'First chilled-water plant', body: 'A 180 TR screw chiller for a pharmaceutical packing hall in Plano. Commissioned with a 24-hour load log and a written plant sequence.' },
    { year: '2015', title: 'Fabrication shop opens', body: 'In-house GI and PIR duct fabrication, pressure class and hanger schedule drawn before cutting. Leak testing moves from sample to every run.' },
    { year: '2018', title: 'VRF at scale', body: 'First 84 TR heat-recovery project in Downtown Dallas: 14 floors, 62 indoor units, 68 m furthest run. The commissioning file becomes the standard template.' },
    { year: '2021', title: 'Maintenance desk goes 24 × 7', body: 'Dedicated dispatch line, four-hour response inside city limits, and the first comprehensive AMC on a 640 TR retail site.' },
    { year: '2024', title: 'Cleanroom validation', body: 'ISO 7 suite handed over with particle counts and pressure cascade signed by an independent testing agency.' },
  ],
  principles: [
    { index: '01', title: 'Measure, then promise.', body: 'Every capacity, static pressure and delta-T in a quotation comes from a survey or a meter reading. We do not quote a tonnage from floor area alone, and we do not publish a response time we have not staffed.', proof: 'Load sheet issued with every quotation' },
    { index: '02', title: 'Access is part of the design.', body: 'A unit that cannot be reached through the ceiling grid, or a valve with no clearance, is a maintenance cost for the next ten years. Service access is drawn on the layout before equipment is ordered.', proof: 'Access checked at survey and at handover' },
    { index: '03', title: 'The file is the product.', body: 'As-built drawings, equipment schedule, measured air balance and refrigerant log are issued at handover — not reconstructed at the first breakdown. Final payment is against that file.', proof: 'Commissioning file in 5 working days' },
    { index: '04', title: 'One crew, start to finish.', body: 'The engineers who commission the plant are the ones who answer its warranty call. No handover by email, no subcontractor discovering the riser on the day of installation.', proof: 'No subcontracted commissioning' },
  ],
  leadership: [
    { initials: 'MW', name: 'M. Whitaker', role: 'Founder & principal engineer', focus: 'Plant selection, commissioning standards, warranty arbitration. Signs every chilled-water design basis.', years: 'Since 2009' },
    { initials: 'DA', name: 'D. Alvarez', role: 'Head of projects', focus: 'VRF and ducted installations. Runs the fabrication shop, the site phasing plans and the permit calendar.', years: 'Since 2013' },
    { initials: 'RB', name: 'R. Boone', role: 'Service & dispatch lead', focus: 'Maintenance contracts, the 24 × 7 desk and the spare-parts stock held for each contracted site.', years: 'Since 2016' },
  ],
  certifications: [
    { code: 'ISO 9001:2015', label: 'Quality management', body: 'Audited annually. Design review, installation checklist and commissioning sign-off are documented procedures, not habits.' },
    { code: 'ISHRAE', label: 'Member firm', body: 'Comfort and process loads are calculated to ASHRAE data; design basis sheets cite the edition used.' },
    { code: 'UL', label: 'Certified installers', body: 'Refrigerant handling and electrical isolation follow UL and EPA practice. Copper, insulation and duct gauges are checked against specification on delivery.' },
    { code: 'EIN', label: 'Registered entity', body: 'Tax invoice with every job. Cash, cheque, bank transfer or card on site — no payment gateway and no processing fee.' },
  ],
  safety: [
    { icon: 'shield', title: 'Permit before pressure', body: 'Hot work, confined-space entry and roof access run on a signed permit. Nitrogen pressure tests are barricaded and logged; nobody is in the room while a system is pressurised above 150 psi.' },
    { icon: 'bolt', title: 'Isolate, lock, prove', body: 'Electrical isolation is locked and proved dead before a panel is opened. The same electrician restores supply after the commissioning checklist is signed.' },
    { icon: 'refrigerant', title: 'Recover, never vent', body: 'Refrigerant is recovered into labelled cylinders, weighed and recorded. A loss above 10% triggers a leak report before any top-up is discussed.' },
    { icon: 'gauge', title: 'Fall protection on every roof', body: 'Harness anchor points are identified at survey. Terrace units are not commissioned until the safe access route is in place and photographed.' },
  ],
  qualityGates: [
    { index: 'Q1', gate: 'Design review', evidence: 'Load sheet, equipment schedule and pipe sizing checked by a second engineer before quotation.', owner: 'Principal engineer' },
    { index: 'Q2', gate: 'Pre-installation survey', evidence: 'Ceiling void, riser, terrace structure, electrical capacity and drain route measured and photographed.', owner: 'Project lead' },
    { index: 'Q3', gate: 'Pressure & vacuum', evidence: 'Nitrogen test at 550 psi held for 24 hours; vacuum to 500 microns with a decay check.', owner: 'Commissioning engineer' },
    { index: 'Q4', gate: 'Air balance', evidence: 'Static pressure at each branch and delta-T across every coil, recorded on the commissioning sheet.', owner: 'Commissioning engineer' },
    { index: 'Q5', gate: 'Handover file', evidence: 'As-built drawings, refrigerant log, O&M file and signed checklist issued to the client.', owner: 'Head of projects' },
  ],
}

export const amcDetails: SiteAmcDetails = {
  terms: [
    { id: 'essential', response: 'Next working day', parts: 'Not included', reporting: 'Visit report within 24 h', bestFor: 'Equipment still inside OEM warranty', commitment: '12 months, paid annually' },
    { id: 'comprehensive', response: '4 hours across the metro', parts: 'Consumables to $600 / visit', reporting: 'Visit report + coil photographs', bestFor: 'Offices, clinics and retail trading floors', commitment: '12 months, quarterly invoicing' },
    { id: 'precision', response: '2 hours · named engineer', parts: 'Critical spares held on site', reporting: 'Monthly report + BMS trend review', bestFor: 'Cleanrooms, labs and data rooms', commitment: '12 months, 99.5% uptime clause' },
  ],
  schedule: [
    { period: 'Month 1', essential: 'Filter clean, drain check', comprehensive: 'Full service, coil wash, electrical check', precision: 'Full service + BMS alarm review' },
    { period: 'Month 3', essential: '—', comprehensive: 'Filter and belt inspection', precision: 'Filter, belt, bearing and vibration check' },
    { period: 'Month 6', essential: 'Coil wash, pressure check', comprehensive: 'Deep clean with before/after photographs', precision: 'Deep clean + sensor calibration check' },
    { period: 'Month 9', essential: '—', comprehensive: 'Filter and drain service', precision: 'Filter, drain and redundancy test' },
    { period: 'Month 12', essential: 'Annual condition report', comprehensive: 'Annual report + renewal review', precision: 'Annual validation support + renewal review' },
  ],
  sla: [
    { metric: 'Call answered', standard: 'Within 3 rings · 24 × 7', note: 'Dispatch line, not a voicemail tree' },
    { metric: 'Remote diagnosis', standard: '30 minutes', note: 'Engineer calls back with the plant history open' },
    { metric: 'On site', standard: '4 hours across the metro', note: '2 hours on Precision plans' },
    { metric: 'Repair window', standard: 'Same working day where parts are stocked', note: 'Compressor and PCB lead times stated at diagnosis' },
    { metric: 'Visit report', standard: 'Within 24 hours', note: 'Photographs filed against the unit' },
    { metric: 'Renewal notice', standard: '60 / 30 / 7 days before expiry', note: 'No auto-renewal without written approval' },
  ],
  includes: [
    'Scheduled visits to a written scope, not a visit count',
    'Filter, coil, drain, belt and electrical checks per visit',
    'Visit report with photographs within 24 hours',
    'Consumables log with quantities and part numbers',
    '24 × 7 dispatch line and escalation path',
    'Renewal review at 60, 30 and 7 days with a condition report',
  ],
  excludes: [
    'Compressor, PCB and major component replacement (quoted after inspection)',
    'Refrigerant loss above 10% without an approved leak repair',
    'Civil work, duct replacement and controls upgrades',
    'Damage from power surges, water ingress or third-party work',
  ],
  faqs: [
    { question: 'Is the AMC price per unit or per ton?', answer: 'Split, cassette and ducted residential equipment is priced per indoor unit. VRF, chilled-water and precision systems are priced per TR of installed capacity, because the visit scope scales with plant rather than room count. Both include the visit report and the dispatch line.' },
    { question: 'What is excluded from a comprehensive plan?', answer: 'Compressor, PCB and refrigerant loss above 10% are quoted after inspection. Civil work, duct replacement and controls upgrades are separate projects. Consumables are covered to $600 per visit; anything above that is approved in writing before it is used.' },
    { question: 'Can I switch plans mid-term?', answer: 'Yes, at the next quarterly review. The difference is pro-rated from the switch date. If a site moves from Essential to Comprehensive after a failure, the failed repair is still chargeable — cover does not apply retroactively.' },
    { question: 'What happens if the four-hour response is missed?', answer: 'Precision plans carry service credits against the quarterly invoice. Comprehensive and Essential plans carry a written escalation to the head of service and a priority slot the same day. The clock starts at the logged call, not at the first available appointment.' },
    { question: 'Do you service equipment you did not install?', answer: 'Yes, on all major makes. We survey the asset first, record nameplate data and condition, and may exclude equipment that is already beyond economic repair. That exclusion is written into the contract before it starts, not discovered at the first breakdown.' },
    { question: 'How do we pay?', answer: 'Cash, cheque, bank transfer or card on site. Annual plans can be paid annually or quarterly; Precision plans are invoiced quarterly with the uptime credit applied at review. There is no payment gateway and no processing fee.' },
  ],
}

export const testimonials: SiteTestimonial[] = [
  {
    id: 'aster-commissioning',
    quote: 'The commissioning file had delta-T across every coil, not just the plant average. That is the first time a contractor has handed us that without being asked twice.',
    context: 'Facility manager · 84 TR VRF · Downtown Dallas',
    published: true,
  },
  {
    id: 'northline-air-balance',
    quote: 'They traced 38 Pa of static going into a closed damper. Two visits later the fourth-floor south wing stopped running cold at 2 pm.',
    context: 'Building services lead · 320 TR chiller · Irving',
    published: true,
  },
  {
    id: 'meridian-changeover',
    quote: 'The cold room held -18 °C through a fourteen-hour changeover, and the alarm reached the duty engineer before it reached us.',
    context: 'Operations head · 4 × 3 TR chambers · Frisco',
    published: true,
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

export const legalDocuments: SiteLegalDocument[] = [
  {
    slug: 'privacy',
    title: 'Privacy policy',
    summary: 'What we collect when you enquire, why we hold it, who can see it and how long it stays.',
    updatedAt: '2026-11-22',
    published: true,
    sections: [
      {
        heading: 'Who we are',
        body: [
          'Coolvane Climate Systems LLC operates this website and the works line. Our registered works address is 500 Commerce Street, Suite 1200, Dallas, TX 75202, USA. For privacy questions write to works@coolvane.example.',
        ],
      },
      {
        heading: 'Information we collect',
        body: [
          'When you submit an enquiry we collect the name, phone number, email address, city, service interest, urgency and message you provide. If you call the works, we may record the same details in our call log.',
          'Our servers also receive standard technical information such as IP address, browser type and the page requested. We use this only to keep the site available, investigate abuse and understand which service pages are used.',
        ],
      },
      {
        heading: 'Why we hold it',
        body: [
          'We use enquiry information to respond to you, prepare a survey or quotation, schedule works, raise invoices and maintain the service record for any equipment we install or maintain. We do not sell personal data and we do not use it for third-party advertising.',
        ],
      },
      {
        heading: 'Who can see it',
        body: [
          'Access is limited to Coolvane staff who need it for the enquiry, project or service record. We may share the minimum necessary information with a courier, equipment supplier, subcontractor or statutory authority where that is required to deliver the works or comply with law.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'Enquiries that do not become work are kept for 24 months and then removed. Project, invoice and warranty records are kept for the period required by Indian tax and contract law, normally eight financial years from the end of the relevant year. Site photographs and commissioning records are kept for the life of the installation and for one year after the warranty ends.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'You may ask us to confirm what personal data we hold about you, correct it, or delete it where we are not required to keep it. You may also ask us to stop sending service reminders. Write to works@coolvane.example with enough detail for us to identify your record. We respond within 30 days.',
        ],
      },
      {
        heading: 'Security and complaints',
        body: [
          'The admin area is protected by a signed session and is not indexed by search engines. Data is stored on access-controlled systems and transmitted over HTTPS. If you believe your data has been mishandled, contact us first at works@coolvane.example so we can investigate. You may also complain to the Data Protection Board of India once it is constituted.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of service',
    summary: 'The basis on which we survey, quote, install, commission and maintain HVAC systems.',
    updatedAt: '2026-11-22',
    published: true,
    sections: [
      {
        heading: 'These terms',
        body: [
          'These terms apply to enquiries, quotations, installation contracts and maintenance plans provided by Coolvane Climate Systems Pvt. Ltd. A signed quotation, work order or annual maintenance contract takes precedence over this page where it is more specific.',
        ],
      },
      {
        heading: 'Surveys and quotations',
        body: [
          'A quotation is based on the access, dimensions, occupancy and existing plant observed or supplied at survey. If concealed conditions differ materially — for example a blocked riser, asbestos, structural restriction or electrical capacity below the surveyed figure — we will stop, explain the difference in writing and issue a revised scope before continuing.',
          'Quotations are valid for 15 days unless stated otherwise. Equipment prices are subject to availability and statutory duty changes before order placement.',
        ],
      },
      {
        heading: 'Scope, access and client obligations',
        body: [
          'The client provides safe access to the plant room, terrace, risers and a typical occupied area, together with power for tools and secure storage for equipment. Society, landlord and statutory approvals remain the client’s responsibility unless we have agreed in writing to obtain them on the client’s behalf.',
          'Work outside the agreed scope — additional rooms, extra pipe runs, civil openings, controls changes or night-shift windows — is quoted separately before it is carried out.',
        ],
      },
      {
        heading: 'Programme',
        body: [
          'Programme dates exclude equipment lead time, statutory approvals, client decisions and access delays. We notify the client in writing when a delay is likely to affect the handover date. Time is not of the essence unless a written programme specifically says so.',
        ],
      },
      {
        heading: 'Payment',
        body: [
          'Unless the quotation states otherwise, 40% is payable on order, 50% before commissioning and 10% on handover against the commissioning file. AMC plans are payable annually or quarterly as stated in the plan. We accept cash, cheque, bank transfer and card on site. There is no card gateway and no processing fee.',
          'Invoices are due within the period stated on the invoice. We may suspend non-emergency work and maintenance visits on an account that is more than 30 days overdue after giving written notice.',
        ],
      },
      {
        heading: 'Handover, warranty and defects',
        body: [
          'Handover occurs when the commissioning file is issued and the measured values are within the design tolerance. Final payment is against that file.',
          'Workmanship is warranted for 12 months from handover. Equipment carries the manufacturer’s warranty. The warranty does not cover damage from power surges, water ingress, third-party work, unauthorised modification, lack of scheduled maintenance or operation outside the design conditions. We must be notified of a defect in writing and given a reasonable opportunity to inspect and correct it.',
        ],
      },
      {
        heading: 'Liability',
        body: [
          'Our liability for any claim arising from a contract is limited to the value of that contract, except where Indian law does not permit that limit. We are not liable for indirect or consequential loss, loss of profit, loss of production or loss of data. Nothing in these terms excludes liability for death, personal injury or fraud caused by our negligence.',
        ],
      },
      {
        heading: 'Suspension, termination and law',
        body: [
          'Either party may terminate for a material breach that is not corrected within 14 days of written notice. On termination the client pays for work performed, equipment ordered and non-cancellable commitments. These terms are governed by the laws of the State of Texas and the courts in Dallas County have exclusive jurisdiction.',
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    title: 'Cookie policy',
    summary: 'The small number of cookies this site uses, what each one does and how to remove them.',
    updatedAt: '2026-11-22',
    published: true,
    sections: [
      {
        heading: 'Cookies we use',
        body: [
          'The public site stores a single browser preference for the light or dark theme. It contains no personal information and is not sent to the server.',
          'When a staff member signs in to the admin area, the server sets an HttpOnly session cookie. It keeps the admin signed in, expires automatically and is not readable by page scripts. The admin area is not indexed and is not part of the public site experience.',
        ],
      },
      {
        heading: 'No advertising cookies',
        body: [
          'We do not run advertising pixels, cross-site trackers or third-party analytics that profile visitors. Enquiry forms are submitted directly to our own API.',
        ],
      },
      {
        heading: 'Managing cookies',
        body: [
          'You can block or delete cookies in your browser settings. Blocking the theme preference only resets the site appearance. Blocking the admin session prevents staff sign-in but does not affect the public site.',
        ],
      },
    ],
  },
  {
    slug: 'refunds',
    title: 'Refunds and cancellation',
    summary: 'How deposits, cancelled orders, part-paid invoices and AMC plans are adjusted.',
    updatedAt: '2026-11-22',
    published: true,
    sections: [
      {
        heading: 'Before equipment is ordered',
        body: [
          'If you cancel before equipment is ordered and before installation is scheduled, we refund the deposit less any survey, design or mobilisation work already performed. Those deductions are shown as line items, not a flat fee.',
        ],
      },
      {
        heading: 'After equipment is ordered',
        body: [
          'Equipment that has been ordered or dispatched is subject to the supplier’s cancellation terms. We pass through the actual restocking or freight charge and refund the balance. Custom-fabricated ductwork, control panels and non-standard equipment cannot normally be cancelled once fabrication has started.',
        ],
      },
      {
        heading: 'After installation has started',
        body: [
          'You pay for work completed and materials delivered up to the cancellation date, measured against the quotation. We provide a written reconciliation with photographs and invoices within 10 working days. Any credit is returned by bank transfer within 7 working days of the reconciliation being agreed.',
        ],
      },
      {
        heading: 'AMC plans',
        body: [
          'Annual plans may be cancelled with 30 days’ written notice. Unused full quarters are refunded pro rata; a quarter in which a visit has been made is not refundable. Precision plans with an uptime clause settle service credits at the quarterly review before any refund is calculated. Renewal is never automatic without written approval.',
        ],
      },
      {
        heading: 'Overpayment and part payment',
        body: [
          'If an invoice has been part paid and the balance is later cancelled or reduced, the credit is applied to the next invoice or refunded on request. Every payment is receipted against the invoice reference, and a part payment does not change the due date of the remaining balance unless we agree that in writing.',
        ],
      },
      {
        heading: 'How to request a refund',
        body: [
          'Email works@coolvane.example with the invoice reference, the amount paid and the reason for the request. We acknowledge within two working days and decide within 10 working days. Approved refunds are paid to the original payer by bank transfer.',
        ],
      },
    ],
  },
  {
    slug: 'accessibility',
    title: 'Accessibility statement',
    summary: 'How this site is built for keyboard, screen-reader and low-bandwidth use — and how to report a barrier.',
    updatedAt: '2026-11-22',
    published: true,
    sections: [
      {
        heading: 'Our commitment',
        body: [
          'We want the public site to be usable by people who navigate with a keyboard, a screen reader, magnification or a slow connection. We aim to meet the Web Content Accessibility Guidelines 2.2 at Level AA for the public pages.',
        ],
      },
      {
        heading: 'What we have built',
        body: [
          'Pages use landmark regions, one main heading and a logical heading order. Interactive controls are reachable by keyboard and show a visible focus ring. Colour pairs are chosen for contrast, motion respects the operating system reduced-motion setting, and the enquiry form labels every field and announces errors in text.',
        ],
      },
      {
        heading: 'Known limitations',
        body: [
          'Some technical drawings and schematic plates are illustrative and carry a text description nearby. The admin area is intended for trained staff and has not been audited to the same standard as the public site. Third-party PDFs, where linked, may not be tagged for screen readers; we can supply the same information as text on request.',
        ],
      },
      {
        heading: 'Contact and feedback',
        body: [
          'If a page or a form blocks you, call +1 214 555 0140 or email works@coolvane.example with the page address and what happened. We aim to reply within five working days and to fix confirmed barriers in the next site release. This statement was last reviewed on 22 November 2026.',
        ],
      },
    ],
  },
]

/**
 * Section copy between each hero and collection. Seeded once, then owned by
 * the page studio; every public heading below is rendered from these values.
 */
export const pageSections: SitePageSections = {
  about: {
    story: {
      title: 'Built in the plant room.',
      body: 'Seventeen years of survey, installation and measured handover. The method did not come from a brochure; it came from the jobs that failed in the second summer.',
    },
    milestones: {
      title: 'The jobs that changed the method.',
      body: 'Not a growth chart. Each entry is a project that forced a change in how the next one was designed, documented or maintained.',
    },
    principles: {
      title: 'Four rules, with evidence.',
      body: 'Values are only useful if they change a decision. Each one here has a proof that appears in a quotation, a site log or a handover file.',
    },
    people: {
      title: 'Who signs the handover.',
      body: 'Three roles, not a directory. The person accountable for the design, the install and the dispatch line is reachable by name.',
    },
    safety: {
      title: 'No pressure without a permit.',
      body: 'Safety is a method statement, a permit and a proving test. Quality is a gate that can stop a handover. Both are written down before the van leaves.',
    },
    certifications: {
      title: 'Checked from outside.',
      body: 'Memberships, certifications and third-party checks that keep the method honest.',
    },
    next: {
      title: 'Look at the files, not the logo.',
      body: 'Five projects with the challenge, the fix and the measured result. Then send us the room or the plant list.',
    },
  },
  services: {
    index: {
      title: 'The whole catalogue, filter included.',
      body: 'Filter by category, then open an enquiry with the service already attached. Capacity and lead time are the ranges we hold in writing, not best-case figures.',
    },
    selection: {
      title: 'What decides the number.',
      body: 'Three checks happen before a quotation leaves the office. They are also the three reasons a cheaper quote fails in the second summer.',
    },
    next: {
      title: 'Send the load, not the brochure.',
      body: 'Room schedule, plant capacity or the failure itself. We reply with the selection we would make and the figures we would hold the installer to.',
    },
    selectionNotes: [
      {
        index: '01',
        title: 'Load, not floor area',
        body: 'Orientation, glazing area, occupancy, equipment gain and fresh-air fraction decide the tonnage. A west-facing 420 sq ft room with 1.5 m of glass lands 30% higher than the same room facing north.',
      },
      {
        index: '02',
        title: 'Access before equipment',
        body: 'Ceiling void, riser, terrace structure, electrical capacity and drain route are surveyed first. A unit that cannot be serviced through the ceiling grid is the wrong unit, whatever the datasheet says.',
      },
      {
        index: '03',
        title: 'The handover file',
        body: 'Load sheet, equipment schedule, static pressure at each branch, delta-T across every coil and as-built drawings. Final payment is against that file, not against a verbal assurance.',
      },
    ],
  },
  process: {
    stages: {
      title: 'Six gates, each with a deliverable.',
      body: 'A gate is not a meeting. It is the evidence that lets the next stage start: a signed survey, a reviewed design, an approved scope, a photographed route, a measured balance, a filed report.',
    },
    handover: {
      title: 'The file is the product.',
      body: 'Nine documents, issued at handover. Final payment is against this file, not against a verbal assurance. If a measured value is outside tolerance, the balance stays open.',
    },
    before: {
      title: 'What we need from you.',
      body: 'Six inputs. None of them needs to be a CAD drawing — photographs, a measured sketch and the last electricity bill are enough to start a survey.',
    },
    questions: {
      title: 'Before you sign.',
      body: 'The answers that decide whether a programme is honest. If a contractor cannot answer these in writing, the programme is not fixed.',
    },
    next: {
      title: 'Send the room, or the plant list.',
      body: 'The survey is the first stage for a reason. It is also the one that decides whether the rest of the programme is credible.',
    },
  },
  work: {
    cases: {
      title: 'The problem is the interesting part.',
      body: 'A result without the constraint behind it is a brochure. Each file states the building, the failure and what had to change — including the parts that were not equipment.',
    },
    beforeAfter: {
      title: 'What change looks like.',
      body: 'A drawn comparison of the Aster Offices riser: the base-build route on the left, the commissioned heat-recovery route on the right. Drag to compare.',
    },
    next: {
      title: 'Your building is the next file.',
      body: 'Send the plant list, the failing system or the floor plan. We will tell you what we would measure first.',
    },
    beforeLabel: 'As found · base-build riser · 4-pipe route, no spare capacity',
    afterLabel: 'As commissioned · heat-recovery VRF · 68 m furthest run',
    caption: 'Meridian Offices · 84 TR · 14 floors · Downtown Dallas',
  },
  amc: {
    plans: {
      title: 'Three plans, the exclusions included.',
      body: 'Every plan carries the visit report and the dispatch line. The difference is visits, consumables and response — not whether the report exists.',
    },
    schedule: {
      title: 'What happens in each month.',
      body: 'A visit count is not a scope. The schedule below is the minimum for each plan; additional visits are triggered by a fault, not by a sales call.',
    },
    serviceLevels: {
      title: 'Written, timed, credited.',
      body: 'Precision plans carry service credits against the quarterly invoice. Every plan carries the escalation path and the report deadline.',
    },
    questions: {
      title: 'Before you renew.',
      body: 'Plan scope, parts cover, switching mid-term and what happens when the four-hour response is missed.',
    },
    next: {
      title: 'A contract is only as good as the visit.',
      body: 'Send the equipment list and the sites. We will survey, price and show you the report before you sign.',
    },
  },
  contact: {
    form: {
      title: 'Send a brief.',
      body: 'Room schedule, plant list or the failure itself. Drawings can follow by email once this reaches the works — there is no file upload in this build.',
    },
    coverage: {
      title: 'Three cities, measured in drive time.',
      body: 'The four-hour response is measured from the logged call to an engineer on site, and it is written into every AMC. Outside the radii below we still quote — with travel and a named engineer stated up front.',
    },
  },
  blog: {
    articles: {
      title: 'Answer first. Evidence second.',
      body: 'Filter by the decision you are making. Every article is written for the person who signs the quotation or the handover — not for a search engine.',
    },
    next: {
      title: 'Have a number that does not look right?',
      body: 'Send the model, the room schedule or the reading. The engineering desk will tell you what to check before anyone sells you a part.',
    },
  },
  products: {
    featured: {
      title: 'Three starting points.',
      body: 'Starting points, not fixed packages. Final capacity and scope are confirmed on survey.',
    },
    catalogue: {
      title: 'Every family, stated in the units that matter.',
      body: 'Capacity, refrigerant, installation route and the checks that come with handover. Prices are starting points for a defined scope; every project is quoted after a survey.',
    },
    next: {
      title: 'Send the room, the plan or the failure.',
      body: 'A catalogue range is not a quotation. Send the load, the layout or the failing system and we will return the model, the scope and the number we would hold the installer to.',
    },
  },
  legal: {
    questions: {
      title: 'Questions about this policy?',
      body: 'Write to works@coolvane.example or call the works. We answer policy questions the same way we answer a service call: with the record in front of us.',
    },
    note: 'Site visits by appointment · freight elevator, roof and building access arranged by us',
  },
}