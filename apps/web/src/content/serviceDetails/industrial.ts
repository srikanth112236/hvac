import type { ServiceDetail } from './types'

export const industrialDetails: ServiceDetail[] = [
  {
    id: 'chilled-water',
    headline: 'Plant sequence that holds at 40% load.',
    intro:
      'Chilled-water plant designed on the measured load profile: primary/secondary pumping, N+1 headering and a sequence that still works when one chiller is isolated. Air-cooled, water-cooled, screw, scroll or centrifugal.',
    warranty: '2 years workmanship · OEM warranty on plant',
    startingFrom: 'Quoted per TR',
    priceBasis: 'on plant capacity, pumping arrangement and controls',
    priceFactors: [
      'Chiller type and condenser cooling',
      'Primary/secondary pumping and N+1 headers',
      'BMS integration and plant-room works',
    ],
    includes: [
      'Load profile and part-load analysis',
      'Chiller and pump selection with N+1 headering',
      'Primary/secondary pumping and hydraulic design',
      'Plant sequence and changeover logic',
      'Performance test at design and part load',
    ],
    excludes: [
      'Electrical HT/LT upgrades and transformers',
      'Civil works, foundations and structural steel',
      'Cooling tower make-up water treatment plant',
    ],
    specs: [
      ['Capacity', '60 – 2,000 TR'],
      ['Design efficiency', '0.52 kW/TR at design'],
      ['Temperatures', '7.2 / 12.4 °C'],
      ['Redundancy', 'N+1 headers'],
    ],
    selection: [
      [
        'Part load decides the bill',
        'A chiller selected only at design load can run inefficiently for most of the year. We model the load duration curve and check IPLV, not just the full-load kW/TR.',
      ],
      [
        'Headers make redundancy real',
        'N+1 on paper is useless if the pumps and valves cannot isolate the standby machine. The header, isolation valves and changeover sequence are designed together.',
      ],
      [
        'Condenser water is the quiet failure',
        'Fouling, scaling and poor tower performance raise the approach temperature and the kW/TR. Water treatment and tube cleaning are part of the plant design, not an afterthought.',
      ],
    ],
    site: [
      'Plant room with structural capacity and maintenance access',
      'Cooling tower or air-cooled condenser space with acoustic clearance',
      'Electrical capacity and a dedicated plant panel',
      'Make-up water, drain and chemical dosing points',
    ],
    steps: [
      ['Load profile', 'Metered or modelled load across the year, including part-load hours.'],
      ['Design', 'Chiller, pump and header selection with N+1 and hydraulic calculation.'],
      ['Install', 'Plant, pipework, valves, insulation and controls installed.'],
      ['Commission', 'Flush, pressure test, water treatment and performance test at part load.'],
    ],
    faqs: [
      [
        'Air-cooled or water-cooled?',
        'Water-cooled is more efficient in large plants but needs a tower, water treatment and space. Air-cooled is simpler and suits smaller or water-constrained sites. The comparison is priced in kW over the load profile.',
      ],
      [
        'Screw, scroll or centrifugal?',
        'Scroll for small capacities, screw for mid-size part-load duty, centrifugal for large plants with a stable high load. The correct choice follows the load profile, not the catalogue hierarchy.',
      ],
      [
        'How long does a plant installation take?',
        'Six to sixteen weeks including procurement, pipework, electrical and commissioning. Chiller lead times and plant-room access are the usual critical path.',
      ],
      [
        'Can the plant be replaced in phases?',
        'Yes, with temporary cooling and a changeover plan. The headers and electrical capacity are designed for the final arrangement so the temporary plant can be isolated without shutting the building.',
      ],
    ],
    related: ['chiller-maintenance', 'bms', 'retrofit-audit'],
    calculator: 'chiller',
  },
  {
    id: 'cold-rooms',
    headline: 'The standby pair proven under changeover.',
    intro:
      'Cold rooms, walk-in coolers and freezers designed on product load and door gain, with 100 mm PIR panels, a defrost strategy matched to the product, and a changeover test long enough to prove the standby.',
    warranty: '2 years workmanship · 5 years compressor (OEM)',
    startingFrom: 'Quoted per chamber',
    priceBasis: 'on volume, temperature class and refrigeration duty',
    priceFactors: [
      'Chamber volume and temperature class',
      'Panel thickness, doors and floor insulation',
      'Condensing unit redundancy and defrost type',
    ],
    includes: [
      'Product and door-gain heat load',
      '100 mm PIR panels, doors and sealed joints',
      'Condensing unit and evaporator selection',
      'Defrost strategy and drain heat tracing',
      'Changeover and pull-down witness test',
    ],
    excludes: [
      'Civil plinth, flooring and structural steel',
      'Electrical panel and dedicated supply',
      'Product loading and racking',
    ],
    specs: [
      ['Temperature', '-25 to +8 °C'],
      ['Capacity', '12 – 80 TR'],
      ['Panels', '100 mm PIR'],
      ['Standby', 'N+1 condensing pair'],
    ],
    selection: [
      [
        'Product load, not room volume',
        'A chamber full of warm product needs far more duty than an empty room of the same size. We ask what goes in, at what temperature, and how often the door opens.',
      ],
      [
        'Defrost must match the product',
        'Air defrost suits coolers; electric or hot-gas defrost suits freezers. The wrong strategy ices the coil and raises the room temperature on a fixed cycle.',
      ],
      [
        'A changeover test needs product',
        'A standby pair proven on an empty chamber proves very little. The witness test runs with product inside, through a full defrost and changeover.',
      ],
    ],
    site: [
      'Insulated floor or plinth with vapour barrier',
      'Drain with heat tracing for freezer rooms',
      'Condensing unit space with airflow and service access',
      'Dedicated electrical supply and alarm route',
    ],
    steps: [
      ['Heat load', 'Product, door gain, infiltration and pull-down duty calculated.'],
      ['Panel and plant', 'Panel layout, doors and condensing pair selected.'],
      ['Install', 'Panels, refrigeration, drains, controls and alarms installed.'],
      ['Witness', 'Pull-down, defrost and standby changeover tested with product.'],
    ],
    faqs: [
      [
        'How thick should the panels be?',
        '100 mm PIR is the default for freezer and low-temperature rooms; 75 mm can suit chillers in a temperate space. Thickness follows the temperature difference and the cost of heat gain.',
      ],
      [
        'Can a cold room use a standard split?',
        'No. A comfort split is not designed for -18 °C evaporating temperatures, defrost or continuous duty. It will ice, short-cycle and fail early.',
      ],
      [
        'What temperature should pharma storage hold?',
        'Typically 2 – 8 °C for cold-chain products, with continuous monitoring and an alarm. The mapping and validation are separate from the refrigeration installation.',
      ],
      [
        'How long does a cold room take?',
        'Four to ten weeks depending on panel delivery, condensing unit lead time and the electrical works. The witness test adds one to two days.',
      ],
    ],
    related: ['chilled-water', 'amc', 'precision-cooling'],
    calculator: 'cold-room',
  },
  {
    id: 'precision-cooling',
    headline: 'Temperature, humidity and particles at once.',
    intro:
      'Cleanroom and precision cooling designed for the classification, not just the tonnage: pressure cascade, FFU grid, humidity control and a validation file signed by an independent testing agency.',
    warranty: '2 years workmanship · performance warranty per validation',
    startingFrom: 'Quoted per suite',
    priceBasis: 'on ISO class, air changes and validated scope',
    priceFactors: [
      'ISO class and room volume',
      'Air changes, FFU count and pressure cascade',
      'Humidity control, validation and documentation',
    ],
    includes: [
      'Particle count and pressure cascade design',
      'AHU/FFU selection with redundancy',
      'Temperature and humidity control sequence',
      'Validation protocol and independent testing coordination',
      'As-built drawings and validation file',
    ],
    excludes: [
      'Civil construction, doors and cleanroom partitions',
      'Process equipment and utility connections',
      'Ongoing certification and revalidation',
    ],
    specs: [
      ['Capacity', '5 – 220 TR'],
      ['Classification', 'ISO 5 – 8'],
      ['Temperature', '±0.5 °C'],
      ['Air changes', 'Up to 18 ACH'],
    ],
    selection: [
      [
        'Classification sets the airflow',
        'An ISO 7 suite at 18 ACH is a different plant from an ISO 8 at 12 ACH. The FFU grid and AHU are sized from the classification, recovery time and occupancy.',
      ],
      [
        'Humidity is the hard part',
        'Temperature is easy; latent load is not. We design for the process moisture gain and the fresh-air load, not just the sensible tonnage.',
      ],
      [
        'Validation starts at design',
        'Particle count and pressure cascade need test points, access and a protocol. The validation agency is involved before the ceiling closes, not after.',
      ],
    ],
    site: [
      'Cleanroom shell with sealed envelope',
      'AHU/FFU space and service access above the ceiling',
      'Chilled-water or DX capacity for the precision load',
      'Access for validation instruments and airlock testing',
    ],
    steps: [
      ['Class and load', 'ISO class, occupancy, process gain and recovery time agreed.'],
      ['Design', 'AHU/FFU, cascade and humidity control designed and reviewed.'],
      ['Install', 'Plant, duct, FFU grid, controls and monitoring installed.'],
      ['Validate', 'Particle count, pressure cascade and temperature/humidity signed off.'],
    ],
    faqs: [
      [
        'What is the difference between ISO 7 and ISO 8?',
        'ISO 7 allows fewer particles at 0.5 µm and typically needs more air changes and a tighter cascade than ISO 8. The plant cost difference is significant, so the classification must be correct before design.',
      ],
      [
        'Can you guarantee ±0.5 °C?',
        'We design and commission to it, and the validation proves it at the test points. Sustaining it depends on door discipline, occupancy and the control system being maintained.',
      ],
      [
        'Do you provide the validation certificate?',
        'An independent testing agency issues the certificate. We coordinate the test, provide the design basis and close any deviations it finds.',
      ],
      [
        'How long does a cleanroom project take?',
        'Six to fourteen weeks for the HVAC scope, depending on classification and whether the shell is ready. Validation adds one to two weeks.',
      ],
    ],
    related: ['server-room', 'chilled-water', 'bms'],
    calculator: 'chiller',
  },
  {
    id: 'server-room',
    headline: 'Sensible load, redundancy, alarm escalation.',
    intro:
      'Server room and data-centre cooling designed on sensible load and redundancy, with in-row or perimeter units, N+1 capacity and an alarm path that reaches a person at 02:00 — not a dashboard nobody watches.',
    warranty: '2 years workmanship · OEM warranty on units',
    startingFrom: 'Quoted per room',
    priceBasis: 'on IT load, redundancy and unit arrangement',
    priceFactors: [
      'IT load and growth allowance',
      'N+1 or 2N redundancy',
      'In-row, perimeter or chilled-water arrangement',
    ],
    includes: [
      'Sensible load and growth calculation',
      'N+1 unit selection and layout',
      'Temperature and humidity control sequence',
      'Alarm escalation to the duty engineer',
      'Commissioning with the IT load live',
    ],
    excludes: [
      'UPS, electrical distribution and generator',
      'Racking, containment and IT equipment',
      'Fire suppression and monitoring systems',
    ],
    specs: [
      ['Capacity', '3 – 200 TR'],
      ['Redundancy', 'N+1 minimum'],
      ['Room condition', '22 – 27 °C'],
      ['Humidity', '40 – 60% RH'],
    ],
    selection: [
      [
        'Sensible load, not total tonnage',
        'A server room has almost no latent load. A comfort unit selected on total capacity can be 20% short on sensible duty and still cycle on humidity.',
      ],
      [
        'Redundancy is a layout decision',
        'N+1 only works if the standby unit has its own power, its own path and a control sequence that starts it. Two units on one circuit is not redundancy.',
      ],
      [
        'Alarms need a human',
        'A BMS alarm that lands in an unread inbox is not an alarm. We set escalation to the duty engineer, with a repeat if the room temperature keeps rising.',
      ],
    ],
    site: [
      'Room envelope with controlled infiltration',
      'Condensate drain or pump per unit',
      'Dedicated electrical supply for each unit',
      'Clear service access and hot/cold aisle layout',
    ],
    steps: [
      ['IT load', 'Rack load, growth and redundancy requirement agreed.'],
      ['Layout', 'Unit arrangement, airflow and pipe/drain routes designed.'],
      ['Install', 'Units, controls, drains and alarms installed.'],
      ['Commission', 'Capacity, changeover and alarm escalation tested under load.'],
    ],
    faqs: [
      [
        'Can a comfort AC cool a server room?',
        'It can hold the temperature at low load but is not designed for continuous sensible duty, low humidity or 24 × 7 operation. It also lacks the alarm and redundancy a server room needs.',
      ],
      [
        'What temperature should a server room be?',
        '22 – 27 °C at the inlet is the common recommendation, with 40 – 60% RH. Warmer is more efficient, but only if the IT equipment’s inlet specification allows it.',
      ],
      [
        'Do I need N+1 or 2N?',
        'N+1 covers a single unit failure; 2N covers maintenance and a failure at the same time. The choice follows the cost of downtime, not a generic tier.',
      ],
      [
        'How is the alarm tested?',
        'We raise the room temperature or simulate a unit failure and confirm the alarm reaches the named engineer within the agreed time. The test is recorded in the commissioning file.',
      ],
    ],
    related: ['precision-cooling', 'bms', 'amc'],
    calculator: 'chiller',
  },
]
