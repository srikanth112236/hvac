import type { IconName } from '@/components/icons'

/**
 * Company, process, work and AMC copy.
 *
 * Phase 6 moves these into the Page / Project / AMCPlan collections. Until
 * then this module is the single source for the four public pages, so the
 * layout decides where a fact appears rather than repeating it per route.
 */

/* -------------------------------------------------------------------------- */
/*  About                                                                       */
/* -------------------------------------------------------------------------- */

export const aboutStory = [
  'Coolvane started in 2009 with two engineers, one van and a rule that has not changed: the number written on the handover sheet has to be the number measured on site. The first contracts were residential splits in North Dallas and a single 40 TR packaged unit for a printing plant outside Fort Worth.',
  'The work moved into plant rooms because that is where the failures were. A split that is 300 mm short of service access is inconvenient; a chiller sequence that cannot hold at 40% load is a building with no cooling by June. We kept the residential crews and added commissioning engineers who could read a points list, which is still the mix today.',
  'Seventeen years later the company runs three city crews, a fabrication shop for GI and PIR ductwork, and a maintenance desk that answers at 02:00. We do not subcontract commissioning, and we do not issue a handover file we have not measured ourselves.',
]

export interface Milestone {
  year: string
  title: string
  body: string
}

export const milestones: Milestone[] = [
  {
    year: '2009',
    title: 'Two engineers, one van',
    body: 'Company founded in Dallas. First contract: nine residential splits across two buildings in the Design District.',
  },
  {
    year: '2012',
    title: 'First chilled-water plant',
    body: 'A 180 TR screw chiller for a pharmaceutical packing hall in Plano. Commissioned with a 24-hour load log and a written plant sequence.',
  },
  {
    year: '2015',
    title: 'Fabrication shop opens',
    body: 'In-house GI and PIR duct fabrication, pressure class and hanger schedule drawn before cutting. Leak testing moves from sample to every run.',
  },
  {
    year: '2018',
    title: 'VRF at scale',
    body: 'First 84 TR heat-recovery project in Downtown Dallas: 14 floors, 62 indoor units, 68 m furthest run. The commissioning file becomes the standard template.',
  },
  {
    year: '2021',
    title: 'Maintenance desk goes 24 × 7',
    body: 'Dedicated dispatch line, four-hour response inside city limits, and the first comprehensive AMC on a 640 TR retail site.',
  },
  {
    year: '2024',
    title: 'Cleanroom validation',
    body: 'ISO 7 suite handed over with particle counts and pressure cascade signed by an independent testing agency.',
  },
]

export interface Principle {
  index: string
  title: string
  body: string
  proof: string
}

export const principles: Principle[] = [
  {
    index: '01',
    title: 'Measure, then promise.',
    body: 'Every capacity, static pressure and delta-T in a quotation comes from a survey or a meter reading. We do not quote a tonnage from floor area alone, and we do not publish a response time we have not staffed.',
    proof: 'Load sheet issued with every quotation',
  },
  {
    index: '02',
    title: 'Access is part of the design.',
    body: 'A unit that cannot be reached through the ceiling grid, or a valve with no clearance, is a maintenance cost for the next ten years. Service access is drawn on the layout before equipment is ordered.',
    proof: 'Access checked at survey and at handover',
  },
  {
    index: '03',
    title: 'The file is the product.',
    body: 'As-built drawings, equipment schedule, measured air balance and refrigerant log are issued at handover — not reconstructed at the first breakdown. Final payment is against that file.',
    proof: 'Commissioning file in 5 working days',
  },
  {
    index: '04',
    title: 'One crew, start to finish.',
    body: 'The engineers who commission the plant are the ones who answer its warranty call. No handover by email, no subcontractor discovering the riser on the day of installation.',
    proof: 'No subcontracted commissioning',
  },
]

export interface Leader {
  initials: string
  name: string
  role: string
  focus: string
  years: string
}

export const leadership: Leader[] = [
  {
    initials: 'AD',
    name: 'A. Deshmukh',
    role: 'Founder & principal engineer',
    focus: 'Plant selection, commissioning standards, warranty arbitration. Signs every chilled-water design basis.',
    years: 'Since 2009',
  },
  {
    initials: 'SK',
    name: 'S. Kulkarni',
    role: 'Head of projects',
    focus: 'VRF and ducted installations. Runs the fabrication shop, the site phasing plans and the NOC calendar.',
    years: 'Since 2013',
  },
  {
    initials: 'RM',
    name: 'R. Mhatre',
    role: 'Service & dispatch lead',
    focus: 'Maintenance contracts, the 24 × 7 desk and the spare-parts stock held for each contracted site.',
    years: 'Since 2016',
  },
]

export interface Certification {
  code: string
  label: string
  body: string
}

export const certifications: Certification[] = [
  {
    code: 'ISO 9001:2015',
    label: 'Quality management',
    body: 'Audited annually. Design review, installation checklist and commissioning sign-off are documented procedures, not habits.',
  },
  {
    code: 'ISHRAE',
    label: 'Member firm',
    body: 'Comfort and process loads are calculated to ISHRAE data; design basis sheets cite the edition used.',
  },
  {
    code: 'BIS',
    label: 'Certified installers',
    body: 'Refrigerant handling and electrical isolation follow BIS practice. Copper, insulation and duct gauges are checked against specification on delivery.',
  },
  {
    code: 'EIN',
    label: 'Registered entity',
    body: 'Tax invoice with every job. Cash, cheque, bank transfer or card on site — no payment gateway and no processing fee.',
  },
]

export interface Standard {
  icon: IconName
  title: string
  body: string
}

export const safetyStandards: Standard[] = [
  {
    icon: 'shield',
    title: 'Permit before pressure',
    body: 'Hot work, confined-space entry and roof access run on a signed permit. Nitrogen pressure tests are barricaded and logged; nobody is in the room while a system is pressurised above 150 psi.',
  },
  {
    icon: 'bolt',
    title: 'Isolate, lock, prove',
    body: 'Electrical isolation is locked and proved dead before a panel is opened. The same electrician restores supply after the commissioning checklist is signed.',
  },
  {
    icon: 'refrigerant',
    title: 'Recover, never vent',
    body: 'Refrigerant is recovered into labelled cylinders, weighed and recorded. A loss above 10% triggers a leak report before any top-up is discussed.',
  },
  {
    icon: 'gauge',
    title: 'Fall protection on every roof',
    body: 'Harness anchor points are identified at survey. Terrace units are not commissioned until the safe access route is in place and photographed.',
  },
]

export interface QualityGate {
  index: string
  gate: string
  evidence: string
  owner: string
}

export const qualityGates: QualityGate[] = [
  {
    index: 'Q1',
    gate: 'Design review',
    evidence: 'Load sheet, equipment schedule and pipe sizing checked by a second engineer before quotation.',
    owner: 'Principal engineer',
  },
  {
    index: 'Q2',
    gate: 'Pre-installation survey',
    evidence: 'Ceiling void, riser, terrace structure, electrical capacity and drain route measured and photographed.',
    owner: 'Project lead',
  },
  {
    index: 'Q3',
    gate: 'Pressure & vacuum',
    evidence: 'Nitrogen test at 550 psi held for 24 hours; vacuum to 500 microns with a decay check.',
    owner: 'Commissioning engineer',
  },
  {
    index: 'Q4',
    gate: 'Air balance',
    evidence: 'Static pressure at each branch and delta-T across every coil, recorded on the commissioning sheet.',
    owner: 'Commissioning engineer',
  },
  {
    index: 'Q5',
    gate: 'Handover file',
    evidence: 'As-built drawings, refrigerant log, O&M file and signed checklist issued to the client.',
    owner: 'Head of projects',
  },
]

/* -------------------------------------------------------------------------- */
/*  Process                                                                     */
/* -------------------------------------------------------------------------- */

export interface ProcessDetail {
  index: string
  name: string
  duration: string
  body: string
  deliverable: string
  gate: string
  evidence: string
  client: string
}

export const processDetails: ProcessDetail[] = [
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
    body: 'Sensible and latent load to ISHRAE comfort data. Equipment schedule, pipe sizing to the furthest run, duct layout, electrical load and a control sequence written in plain language. Redundancy is designed for the failure case, not the datasheet case.',
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
    client: 'Approve the scope in writing; raise any landlord or NOC requirement',
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

export const clientInputs = [
  'Room or floor plan with dimensions, or a measured sketch we can verify',
  'Glazing area and orientation for each façade',
  'Occupancy and operating hours, including weekend use',
  'Existing equipment make, model and tonnage — nameplate photographs are enough',
  'Electrical supply details: phase, sanctioned load, panel capacity',
  'Landlord, society or NOC requirements, and permitted working hours',
]

export const commissioningFile = [
  'Design basis with the load calculation and the ISHRAE edition used',
  'Equipment schedule with make, model, serial and capacity',
  'As-built pipe and duct routing, including the furthest equivalent run',
  'Nitrogen pressure test log and vacuum decay record',
  'Refrigerant charge by weight against nameplate',
  'Air balance: static pressure at each branch, CFM at each diffuser',
  'Delta-T across every coil, plus the 24-hour run log',
  'Electrical load schedule and control sequence narrative',
  'O&M manuals, warranty certificates and the signed handover checklist',
]

export const processFaqs = [
  {
    question: 'Can the survey happen while the building is occupied?',
    answer:
      'Yes. We survey room by room and do not need the plant shut down to measure. If the existing system must run during the survey, we record its current setpoints and operating pressures so the new design is compared against real conditions rather than a clean-sheet assumption.',
  },
  {
    question: 'Who arranges the building approval and freight elevator booking?',
    answer:
      'We draft the method statement and the equipment movement plan, then coordinate with the society or building manager. The NOC fee itself is paid by the client and shown separately in the quotation; we do not bury it in the installation line.',
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
]

/* -------------------------------------------------------------------------- */
/*  Work                                                                        */
/* -------------------------------------------------------------------------- */

export interface WorkCaseFile {
  id: string
  challenge: string
  solution: string
  result: string
  metrics: [label: string, value: string][]
  scope: string[]
  system: string
}

export const workCaseFiles: WorkCaseFile[] = [
  {
    id: 'meridian-foods',
    challenge:
      'Four cold chambers sharing one condensing unit, with a blast-freeze cycle that pulled 18 kW at start-up. The standby pair had never been proven under changeover, and the existing alarm went to a phone that was no longer in service.',
    solution:
      'Split the load across two scroll pairs with independent defrost schedules, re-piped the headers for a 14-hour changeover, and moved the alarm to the duty engineer with a 15-minute escalation. Panels rebuilt at 100 mm PIR with new gaskets and heaters.',
    result:
      'Held -18 °C through a full changeover with product inside. Alarm reached the duty engineer in 40 seconds during the witnessed test.',
    metrics: [
      ['Chambers', '4'],
      ['Holding', '-18 °C'],
      ['Changeover', '14 h'],
      ['Standby', 'N+1'],
    ],
    scope: ['Heat load', 'Panel and door replacement', 'Scroll pairs', 'Alarm escalation', 'Changeover witness test'],
    system: 'Cold chain · 12 TR · Dallas',
  },
  {
    id: 'aster-offices',
    challenge:
      'A 14-floor office with west glazing and a tenant mix that changed floor by floor. The base-build design assumed 8 m² per person; actual occupancy on two floors was closer to 4 m², and the riser had no spare capacity for a conventional four-pipe system.',
    solution:
      'Heat-recovery VRF with branch selectors sized room by room, 62 indoor units and a 68 m furthest run checked against pressure drop. Diversity set at 92% with the outdoor bank staged across the roof to keep the acoustic limit at the neighbouring plot.',
    result:
      'Cooling delivered on all floors with one outdoor module held as standby. The measured kW/TR at 60% load was 0.81 against a design of 0.85.',
    metrics: [
      ['Capacity', '84 TR'],
      ['Indoor units', '62'],
      ['Furthest run', '68 m'],
      ['Diversity', '92%'],
    ],
    scope: ['Room-by-room load', 'Heat-recovery VRF', 'Riser and roof plant', 'Acoustic staging', 'Commissioning at furthest unit'],
    system: 'VRF · 84 TR · Dallas',
  },
  {
    id: 'northline-labs',
    challenge:
      'A 320 TR water-cooled plant running two screw compressors with no headered standby. The building needed 24-hour operation for sample storage, and the existing primary pump set could not deliver design flow with one chiller isolated.',
    solution:
      'Primary–secondary pumping with N+1 headers, 7.2 / 12.4 °C design, and a plant sequence that holds at 40% load. Condenser water treatment corrected the fouling that had pushed the approach temperature 1.8 °C above design.',
    result:
      'Design load met at 41 °C ambient with one compressor isolated. Measured plant efficiency 0.58 kW/TR against a 0.60 design figure.',
    metrics: [
      ['Capacity', '320 TR'],
      ['Efficiency', '0.58 kW/TR'],
      ['Ambient', '41 °C'],
      ['Redundancy', 'N+1'],
    ],
    scope: ['Load profile', 'Primary/secondary pumping', 'N+1 headers', 'Water treatment', 'Sequence and witness test'],
    system: 'Chilled water · 320 TR · Fort Worth',
  },
  {
    id: 'helix-devices',
    challenge:
      'An ISO 7 suite with 14 airlocks, a particle-count guarantee and a process that could not tolerate a pressure reversal during filter change. The shell was already built, so the FFU grid had to fit a fixed ceiling height.',
    solution:
      'FFU ceiling grid with pressure-independent dampers, a cascade designed at 22 Pa and 18 ACH, and a change procedure that isolates one filter at a time. Validation ran with the process equipment installed, not in an empty room.',
    result:
      'ISO 7 held at all 14 airlocks; particle count and pressure cascade signed off by the independent testing agency at handover.',
    metrics: [
      ['Class', 'ISO 7'],
      ['Cascade', '22 Pa'],
      ['Air changes', '18 ACH'],
      ['Airlocks', '14'],
    ],
    scope: ['Particle count', 'Pressure cascade', 'FFU grid', 'Validation protocol', 'Independent sign-off'],
    system: 'Cleanroom · ISO 7 · Plano',
  },
  {
    id: 'harbour-mall',
    challenge:
      'A 640 TR retail site with 31 rooftop packaged units, no single asset register and recurring summer complaints concentrated in the food court. The previous contractor serviced by visit count, not by measured performance.',
    solution:
      'Comprehensive AMC with 26 visits a year, a unit-level asset register, filter and coil service to a written scope, and a 4-hour dispatch line. Food-court make-up air re-balanced and the grease extract cleaned on a separate schedule.',
    result:
      'Emergency callouts down 38% in the second year. Food-court temperatures held within 0.6 °C of setpoint through the May peak.',
    metrics: [
      ['Installed base', '640 TR'],
      ['Visits', '26 / yr'],
      ['Dispatch', '4 h'],
      ['Callouts', '-38%'],
    ],
    scope: ['Asset register', 'Scheduled PPM', '24 × 7 dispatch', 'Food-court air balance', 'Quarterly performance review'],
    system: 'AMC · 640 TR · Frisco',
  },
]

export const workFilters = ['All', 'VRF', 'Chiller', 'Cold room', 'Cleanroom', 'AMC'] as const

/* -------------------------------------------------------------------------- */
/*  AMC                                                                         */
/* -------------------------------------------------------------------------- */

export interface PlanTerms {
  id: string
  response: string
  parts: string
  reporting: string
  bestFor: string
  commitment: string
}

export const planTerms: PlanTerms[] = [
  {
    id: 'essential',
    response: 'Next working day',
    parts: 'Not included',
    reporting: 'Visit report within 24 h',
    bestFor: 'Equipment still inside OEM warranty',
    commitment: '12 months, paid annually',
  },
  {
    id: 'comprehensive',
    response: '4 hours inside city limits',
    parts: 'Consumables to $600 / visit',
    reporting: 'Visit report + coil photographs',
    bestFor: 'Offices, clinics and retail trading floors',
    commitment: '12 months, quarterly invoicing',
  },
  {
    id: 'precision',
    response: '2 hours · named engineer',
    parts: 'Critical spares held on site',
    reporting: 'Monthly report + BMS trend review',
    bestFor: 'Cleanrooms, labs and data rooms',
    commitment: '12 months, 99.5% uptime clause',
  },
]

export interface ScheduleRow {
  period: string
  essential: string
  comprehensive: string
  precision: string
}

export const visitSchedule: ScheduleRow[] = [
  {
    period: 'Month 1',
    essential: 'Filter clean, drain check',
    comprehensive: 'Full service, coil wash, electrical check',
    precision: 'Full service + BMS alarm review',
  },
  {
    period: 'Month 3',
    essential: '—',
    comprehensive: 'Filter and belt inspection',
    precision: 'Filter, belt, bearing and vibration check',
  },
  {
    period: 'Month 6',
    essential: 'Coil wash, pressure check',
    comprehensive: 'Deep clean with before/after photographs',
    precision: 'Deep clean + sensor calibration check',
  },
  {
    period: 'Month 9',
    essential: '—',
    comprehensive: 'Filter and drain service',
    precision: 'Filter, drain and redundancy test',
  },
  {
    period: 'Month 12',
    essential: 'Annual condition report',
    comprehensive: 'Annual report + renewal review',
    precision: 'Annual validation support + renewal review',
  },
]

export const amcSla: [metric: string, standard: string, note: string][] = [
  ['Call answered', 'Within 3 rings · 24 × 7', 'Dispatch line, not a voicemail tree'],
  ['Remote diagnosis', '30 minutes', 'Engineer calls back with the plant history open'],
  ['On site', '4 hours inside city limits', '2 hours on Precision plans'],
  ['Repair window', 'Same working day where parts are stocked', 'Compressor and PCB lead times stated at diagnosis'],
  ['Visit report', 'Within 24 hours', 'Photographs filed against the unit'],
  ['Renewal notice', '60 / 30 / 7 days before expiry', 'No auto-renewal without written approval'],
]

export const amcFaqs = [
  {
    question: 'Is the AMC price per unit or per ton?',
    answer:
      'Split, cassette and ducted residential equipment is priced per indoor unit. VRF, chilled-water and precision systems are priced per TR of installed capacity, because the visit scope scales with plant rather than room count. Both include the visit report and the dispatch line.',
  },
  {
    question: 'What is excluded from a comprehensive plan?',
    answer:
      'Compressor, PCB and refrigerant loss above 10% are quoted after inspection. Civil work, duct replacement and controls upgrades are separate projects. Consumables are covered to $600 per visit; anything above that is approved in writing before it is used.',
  },
  {
    question: 'Can I switch plans mid-term?',
    answer:
      'Yes, at the next quarterly review. The difference is pro-rated from the switch date. If a site moves from Essential to Comprehensive after a failure, the failed repair is still chargeable — cover does not apply retroactively.',
  },
  {
    question: 'What happens if the four-hour response is missed?',
    answer:
      'Precision plans carry service credits against the quarterly invoice. Comprehensive and Essential plans carry a written escalation to the head of service and a priority slot the same day. The clock starts at the logged call, not at the first available appointment.',
  },
  {
    question: 'Do you service equipment you did not install?',
    answer:
      'Yes, on all major makes. We survey the asset first, record nameplate data and condition, and may exclude equipment that is already beyond economic repair. That exclusion is written into the contract before it starts, not discovered at the first breakdown.',
  },
  {
    question: 'How do we pay?',
    answer:
      'Cash, cheque, bank transfer or card on site. Annual plans can be paid annually or quarterly; Precision plans are invoiced quarterly with the uptime credit applied at review. There is no payment gateway and no processing fee.',
  },
]

export const amcIncludes = [
  'Scheduled visits to a written scope, not a visit count',
  'Filter, coil, drain, belt and electrical checks per visit',
  'Visit report with photographs within 24 hours',
  'Consumables log with quantities and part numbers',
  '24 × 7 dispatch line and escalation path',
  'Renewal review at 60, 30 and 7 days with a condition report',
]

export const amcExcludes = [
  'Compressor, PCB and major component replacement (quoted after inspection)',
  'Refrigerant loss above 10% without an approved leak repair',
  'Civil work, duct replacement and controls upgrades',
  'Damage from power surges, water ingress or third-party work',
]
