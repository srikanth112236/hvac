import type { ServiceDetail } from './types'

export const maintenanceDetails: ServiceDetail[] = [
  {
    id: 'amc',
    headline: 'Cover written before the failure.',
    intro:
      'Annual maintenance contracts with a written scope, a visit report every time, and a dispatch line that answers at 02:00. Comprehensive and non-comprehensive plans priced on the basis the trade actually uses.',
    warranty: 'Contractual response and uptime terms per plan',
    startingFrom: '$480',
    priceBasis: 'per indoor unit per year · plant priced per TR',
    priceFactors: [
      'Indoor unit count or installed TR',
      'Plan: Essential, Comprehensive or Precision',
      'Site count, access and travel outside city limits',
    ],
    includes: [
      'Scheduled visits to a written scope',
      'Filter, coil, drain, belt and electrical checks',
      'Visit report with photographs within 24 hours',
      '24 × 7 dispatch line and escalation path',
      'Renewal review with a condition report',
    ],
    excludes: [
      'Compressor, PCB and major component replacement',
      'Refrigerant loss above 10% without an approved repair',
      'Civil work, duct replacement and controls upgrades',
    ],
    specs: [
      ['Visits', '2 – 26 per year'],
      ['Response', '4 hours inside city limits'],
      ['Dispatch', '24 × 7 · 365 days'],
      ['Term', '12 months, written renewal'],
    ],
    selection: [
      [
        'Per unit or per TR',
        'Residential splits are priced per indoor unit; VRF, chilled water and precision plant per TR. The visit scope scales with equipment count or plant capacity, not with a flat site fee.',
      ],
      [
        'Parts cover is the price gap',
        'The difference between Essential and Comprehensive is mostly consumables and priority dispatch. Compressor and PCB failures are quoted after inspection on every plan.',
      ],
      [
        'The report is the proof',
        'A visit that leaves no report is not auditable. Every plan includes a same-day report with coil photographs and a consumables list.',
      ],
    ],
    site: [
      'Access to every indoor and outdoor unit',
      'A named site contact for scheduling',
      'Plant room and electrical panel access',
      'Safe roof access where equipment is external',
    ],
    steps: [
      ['Survey', 'Asset register, condition and access checked before pricing.'],
      ['Scope', 'Plan, visit frequency and exclusions agreed in writing.'],
      ['Schedule', 'First visit booked and the dispatch contacts registered.'],
      ['Review', 'Quarterly performance review and renewal at 60/30/7 days.'],
    ],
    faqs: [
      [
        'What is the difference between comprehensive and non-comprehensive?',
        'Comprehensive includes labour, consumables and priority dispatch, usually with a parts allowance per visit. Non-comprehensive covers scheduled labour and checks; parts and refrigerant are quoted separately.',
      ],
      [
        'Does the AMC cover a compressor failure?',
        'No plan covers a compressor as routine maintenance. It is inspected, the cause is diagnosed and the replacement is quoted. Precision plans may hold a critical spare on site for a fixed response.',
      ],
      [
        'Can I cover only some units?',
        'Yes. The asset register lists what is covered and what is excluded, and the price follows that list. Mixing covered and uncovered equipment on one site is normal.',
      ],
      [
        'How does renewal work?',
        'We issue a condition report and renewal quote at 60 days. The contract does not auto-renew without written approval, and the price is held for 30 days from the quote.',
      ],
    ],
    related: ['chiller-maintenance', 'ac-servicing', 'ac-repair'],
    calculator: 'amc',
  },
  {
    id: 'chiller-maintenance',
    headline: 'Approach temperature, not a visit count.',
    intro:
      'Chiller, AHU and cooling-tower maintenance measured against design: tube brushing, water treatment, bearing and vibration checks, and a performance log that shows the plant drifting before it fails.',
    warranty: 'Workmanship on service interventions',
    startingFrom: 'Quoted per visit',
    priceBasis: 'on plant size, tower count and visit frequency',
    priceFactors: [
      'Chiller capacity and type',
      'Cooling tower and pump count',
      'Water treatment and chemical scope',
    ],
    includes: [
      'Condenser and evaporator tube brushing',
      'Water treatment and chemical dosing check',
      'Bearing, vibration and alignment check',
      'AHU/FCU coil, filter and drain service',
      'Performance log against design kW/TR',
    ],
    excludes: [
      'Refrigerant and compressor overhauls',
      'Tube replacement and eddy-current testing',
      'Cooling tower fill replacement and structural repair',
    ],
    specs: [
      ['Capacity', '60 – 2,000 TR'],
      ['Frequency', 'Per visit · quarterly or monthly'],
      ['Tube cleaning', 'Brush and water flush'],
      ['Log', 'Approach, kW/TR and vibration'],
    ],
    selection: [
      [
        'Approach temperature is the tell',
        'A condenser approach rising from 1.5 to 3.5 °C means fouling or poor water flow. Cleaning before it reaches 4 °C protects the compressor and the bill.',
      ],
      [
        'Water treatment is part of service',
        'Brushing a tube without correcting the chemistry is a recurring cost. We test and dose the loop, and log the results with the mechanical checks.',
      ],
      [
        'Vibration catches what eyes miss',
        'A bearing that is starting to fail shows in the vibration spectrum before it is audible. Quarterly readings build the trend that justifies a planned replacement.',
      ],
    ],
    site: [
      'Plant room access with safe tube-cleaning space',
      'Water and drain points for flushing',
      'Cooling tower access with fall protection',
      'Panel access for electrical and vibration readings',
    ],
    steps: [
      ['Baseline', 'Approach, kW/TR and vibration recorded on the first visit.'],
      ['Service', 'Tubes brushed, water treated, bearings and belts checked.'],
      ['Log', 'Readings compared with baseline and design; deviations flagged.'],
      ['Plan', 'Repairs and overhauls scheduled before failure, with a written quote.'],
    ],
    faqs: [
      [
        'How often should chiller tubes be brushed?',
        'Quarterly in North Texas water conditions, monthly if the tower is near a construction site or the water is hard. The approach temperature, not the calendar, is the final trigger.',
      ],
      [
        'What is a normal condenser approach?',
        'Typically 1 – 2 °C at design flow and clean tubes. Above 3 °C suggests fouling or low water flow and should be investigated before it becomes a capacity problem.',
      ],
      [
        'Do you provide water treatment chemicals?',
        'We test, dose and log the loop as part of the service, with chemicals billed at cost or included in the plan. We do not sell treatment equipment we have not specified.',
      ],
      [
        'Can you service a chiller you did not install?',
        'Yes, after a condition survey and a baseline log. If the machine is already beyond economic repair, we say so before taking on the contract.',
      ],
    ],
    related: ['chilled-water', 'amc', 'retrofit-audit'],
  },
]
