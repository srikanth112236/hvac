import type { ServiceDetail } from './types'

export const commercialDetails: ServiceDetail[] = [
  {
    id: 'vrf-systems',
    headline: 'Heat recovery, sized at the furthest branch.',
    intro:
      'A VRF system designed from the indoor unit schedule outwards: branch selectors, pipe runs and diversity checked against pressure drop at the last indoor unit. The outdoor bank is staged for acoustics and standby, not just tonnage.',
    warranty: '2 years workmanship · 5 years compressor (OEM)',
    startingFrom: 'Quoted per TR',
    priceBasis: 'on installed capacity and indoor unit count',
    priceFactors: [
      'Indoor unit count and diversity',
      'Pipe route: furthest equivalent length and lift',
      'Outdoor staging, acoustic treatment and standby',
    ],
    includes: [
      'Room-by-room load and indoor unit schedule',
      'Branch selector and pipe sizing to the furthest run',
      'Refrigerant pipework with brazed joints and insulation',
      'Outdoor bank staging and acoustic check',
      'Commissioning at the furthest indoor unit',
    ],
    excludes: [
      'Electrical HT/LT work and transformer upgrades',
      'Structural steel and roof platform fabrication',
      'BMS head-end graphics and third-party integration',
    ],
    specs: [
      ['Capacity', '8 – 1,200 TR'],
      ['Indoor units', 'Up to 64 per system'],
      ['Furthest run', '68 m equivalent'],
      ['Diversity', 'Up to 92%'],
    ],
    selection: [
      [
        'The last indoor unit sets the limit',
        'A VRF that works on the first floor can starve the fourteenth. We calculate equivalent length, lift and pressure drop at the furthest branch before selecting the outdoor bank.',
      ],
      [
        'Heat recovery needs a reason',
        'Simultaneous heating and cooling only saves energy when the building actually has both loads at once. We check the zone schedule before charging for a three-pipe system.',
      ],
      [
        'Acoustics decide the roof layout',
        'Outdoor modules are staged and screened to the nearest neighbour, not packed against the parapet. A 2 dB margin at the boundary is cheaper than a later enclosure.',
      ],
    ],
    site: [
      'Roof or terrace structure for the outdoor bank',
      'Vertical riser with space for insulated pipework',
      'Condensate routes from every indoor unit',
      'Electrical capacity for the outdoor bank',
    ],
    steps: [
      ['Load and schedule', 'Room loads and indoor unit selections agreed with the ceiling layout.'],
      ['Route design', 'Pipe sizes, branch selectors and lift calculated to the furthest unit.'],
      ['Install', 'Brazed pipework, insulation, drains and controls installed to the method statement.'],
      ['Commission', 'Pressure test, vacuum, charge and capacity check at the furthest unit.'],
    ],
    faqs: [
      [
        'VRF or chilled water?',
        'VRF wins below roughly 300 TR or where zoning is fragmented; chilled water wins on large, central plant with a dedicated operator. We price both when the load sits in the overlap.',
      ],
      [
        'How many indoor units can one system take?',
        'Up to 64 on the largest commercial systems, subject to diversity and pipe length. The practical limit is usually the riser and the furthest run, not the catalogue number.',
      ],
      [
        'What is the realistic lead time?',
        'Three to eight weeks for a mid-size project, including equipment procurement, installation and commissioning. Imported outdoor modules can add two to four weeks.',
      ],
      [
        'Can it be phased floor by floor?',
        'Yes, if the riser and outdoor bank are sized for the final build-out. Phasing is designed into the headers from day one; retrofitting a live riser is far more expensive.',
      ],
    ],
    related: ['chilled-water', 'bms', 'ducting'],
    calculator: 'vrf',
  },
  {
    id: 'packaged-rooftop',
    headline: 'One package, a curb that fits the roof.',
    intro:
      'Rooftop and packaged units selected on sensible capacity at the actual ambient, with the structural curb, duct interface and economiser designed before the crane is booked. Controls integrate with the rest of the plant.',
    warranty: '2 years workmanship · 5 years compressor (OEM)',
    startingFrom: 'Quoted per unit',
    priceBasis: 'on tonnage, curb and duct interface',
    priceFactors: [
      'Unit size, heating option and economiser',
      'Curb, structural support and crane access',
      'Duct interface, plenum and controls integration',
    ],
    includes: [
      'Structural check and curb layout',
      'Packaged unit placement and levelling',
      'Supply/return duct interface and flexible connections',
      'Economiser and fresh-air damper setting',
      'Controls integration and run test',
    ],
    excludes: [
      'Roof structural strengthening and waterproofing',
      'Crane hire and road permissions',
      'Ductwork beyond the unit interface',
    ],
    specs: [
      ['Capacity', '10 – 150 TR'],
      ['System', 'DX packaged · air-cooled'],
      ['External static', 'Up to 42 Pa'],
      ['Lead time', '2 – 5 weeks'],
    ],
    selection: [
      [
        'Ambient derates the capacity',
        'A 45 °C roof reduces net capacity and raises current draw. We select on the site ambient, not the 35 °C catalogue condition.',
      ],
      [
        'The curb is a structural item',
        'A packaged unit concentrates load on four points. The curb is designed and waterproofed before delivery; a timber bearer is not a curb.',
      ],
      [
        'Economiser pays only with controls',
        'A fresh-air economiser that is not wired to the space sensor is a damper. The sequence and changeover setpoint are part of commissioning.',
      ],
    ],
    site: [
      'Roof area with structural capacity and drainage',
      'Crane or lift access for the packaged unit',
      'Duct route from the unit to the occupied zone',
      'Electrical supply and isolator at the unit',
    ],
    steps: [
      ['Survey', 'Roof structure, curb position, crane path and duct route checked.'],
      ['Fabricate curb', 'Curb and flashing installed and waterproofed before delivery.'],
      ['Set and connect', 'Unit lifted, levelled, ducted and electrically connected.'],
      ['Commission', 'Airflow, economiser changeover and controls sequence proven.'],
    ],
    faqs: [
      [
        'Packaged unit or split system?',
        'Packaged units suit a single large space with a roof above it; splits suit multiple rooms. A packaged unit with a long duct run can lose more to static than it gains in simplicity.',
      ],
      [
        'How long does a rooftop installation take?',
        'Two to five weeks including curb work, crane booking and duct interface. The crane and waterproofing are usually the critical path, not the equipment.',
      ],
      [
        'Can it provide fresh air?',
        'Yes, with an economiser or a fresh-air intake sized to the occupancy. The damper and changeover need commissioning, otherwise it is a hole with a flap.',
      ],
      [
        'What maintenance does it need?',
        'Filter changes every 2 – 3 months, coil and drain service twice a year, and an annual belt, bearing and economiser check. Roof access must be safe and permanent.',
      ],
    ],
    related: ['ducting', 'ventilation', 'bms'],
    calculator: 'tonnage',
  },
  {
    id: 'ducting',
    headline: 'Drawn to a pressure class, tested before handover.',
    intro:
      'GI, PIR and pre-insulated ductwork fabricated to a stated pressure class, hung from a calculated hanger schedule, and leak-tested before the ceiling closes. Every fitting is in the drawing before it is in the air.',
    warranty: '2 years workmanship on fabrication and installation',
    startingFrom: 'Quoted per m²',
    priceBasis: 'on duct area, pressure class and access',
    priceFactors: [
      'Duct area and pressure class',
      'Material: GI, PIR or pre-insulated',
      'Height, access and ceiling constraints',
    ],
    includes: [
      'Pressure class and duct sizing calculation',
      'Fabrication drawings and hanger schedule',
      'GI/PIR duct fabrication and installation',
      'Access doors and test points',
      'Leak test at the specified pressure',
    ],
    excludes: [
      'Ceiling, civil work and fire-stopping',
      'Fire dampers and statutory approvals',
      'Controls and VAV boxes',
    ],
    specs: [
      ['Airflow', '800 – 24,000 CFM'],
      ['Materials', 'GI · PIR · pre-insulated'],
      ['Leak test', 'Up to 640 Pa'],
      ['Velocity', '6 – 10 m/s in mains'],
    ],
    selection: [
      [
        'Pressure class is not a label',
        'A 640 Pa duct built to a 300 Pa standard will leak and whistle. The class decides gauge, reinforcement and sealant, and it is stated on the drawing.',
      ],
      [
        'Every elbow is fan energy',
        'Fittings dominate pressure drop. We route for the shortest equivalent length and use radiused elbows where the ceiling allows, instead of squaring the run.',
      ],
      [
        'Access decides maintenance',
        'Dampers, filters and fire dampers need doors. Access points are drawn on the fabrication layout, not cut after the ceiling is painted.',
      ],
    ],
    site: [
      'Ceiling or shaft route with agreed dimensions',
      'Safe working platform at height',
      'Power for fabrication and test equipment',
      'Storage area protected from rain and dust',
    ],
    steps: [
      ['Calculate', 'Airflow, velocity and pressure class agreed against the fan curve.'],
      ['Fabricate', 'Drawings, gauge, reinforcement and hanger schedule issued.'],
      ['Install', 'Duct erected, sealed, supported and access doors fitted.'],
      ['Test', 'Leak test at class pressure, then air balance at each branch.'],
    ],
    faqs: [
      [
        'GI or PIR ductwork?',
        'GI for high pressure, long runs and robustness; PIR for exposed or tight routes where insulation and weight matter. PIR needs careful sealing at joints and is not a substitute for a fire-rated duct.',
      ],
      [
        'Do you fabricate off site?',
        'Yes. Ducts are cut and formed in our shop, delivered in sections and assembled on site. That keeps site dust down and gives a consistent seam and seal.',
      ],
      [
        'What leak test do you use?',
        'A pressure test at the specified class, typically up to 640 Pa, with joints sealed and the test recorded. The result is part of the commissioning file.',
      ],
      [
        'Can you match an existing system?',
        'Yes, after a survey of gauge, pressure class and connection details. Mixing classes without a transition is a common source of leakage and noise.',
      ],
    ],
    related: ['ventilation', 'ducted-residential', 'kitchen-ventilation'],
    calculator: 'duct',
  },
  {
    id: 'ventilation',
    headline: 'Fresh air measured, not assumed.',
    intro:
      'Supply, exhaust and make-up air balanced across the building, with the fresh-air fraction set for occupancy and the kitchen or toilet extract sized so the building does not run under negative pressure.',
    warranty: '2 years workmanship on installation',
    startingFrom: 'Quoted per system',
    priceBasis: 'on airflow, duct route and fan selection',
    priceFactors: [
      'Supply and exhaust airflow',
      'Duct route and access for fans',
      'Heat recovery and controls',
    ],
    includes: [
      'Fresh-air and exhaust airflow calculation',
      'Fan and damper selection against system resistance',
      'Supply/exhaust ductwork and terminals',
      'Make-up air for kitchen and toilet extract',
      'Air balance measured at each terminal',
    ],
    excludes: [
      'Fire dampers and statutory fire-stopping',
      'Kitchen hood and grease filtration',
      'Electrical work beyond the fan isolator',
    ],
    specs: [
      ['Airflow', '500 – 30,000 CFM'],
      ['Air changes', '4 – 12 ACH'],
      ['Fresh air', '10 – 20% of supply'],
      ['CO₂ target', 'Below 800 ppm occupied'],
    ],
    selection: [
      [
        'Extract without make-up air fails',
        'A kitchen extract that pulls 8,000 CFM needs a path for replacement air, or the doors whistle and the burners starve. Make-up air is designed with the extract, not after.',
      ],
      [
        'Air changes are not a substitute for CO₂',
        'A 6 ACH office can still exceed 1,000 ppm if the fresh-air fraction is wrong. We measure CO₂ with the room occupied and adjust the damper, not just the fan speed.',
      ],
      [
        'Heat recovery changes the economics',
        'A plate or wheel exchanger recovers 50 – 70% of the exhaust energy in a Texas summer. The payback depends on run hours, which we meter rather than assume.',
      ],
    ],
    site: [
      'Fresh-air intake away from exhausts and kitchens',
      'Fan mounting with service access and isolation',
      'Duct route to each occupied zone',
      'Roof or wall penetration with weatherproofing',
    ],
    steps: [
      ['Calculate', 'Occupancy, airflow and pressure budget agreed.'],
      ['Select', 'Fans, dampers and heat recovery sized against the route.'],
      ['Install', 'Ductwork, terminals, fans and controls installed.'],
      ['Balance', 'Airflow measured at every terminal and the system adjusted.'],
    ],
    faqs: [
      [
        'How much fresh air does an office need?',
        'Typically 10 – 20% of supply air, or around 8 – 10 L/s per person, depending on occupancy and activity. The number is set by CO₂ measurement, not a rule of thumb.',
      ],
      [
        'Why do my doors whistle?',
        'The extract is removing more air than the make-up path can supply. The building runs negative and pulls air through every gap. Balancing the make-up air fixes it.',
      ],
      [
        'Can we add heat recovery later?',
        'Sometimes, if the duct route has space for the exchanger and the fans have spare static. Retrofitting a wheel into a tight ceiling is usually a duct replacement, not an add-on.',
      ],
      [
        'How often should ventilation be balanced?',
        'After installation, after any duct modification, and every two to three years as a check. Filters loading and damper drift change the balance quietly.',
      ],
    ],
    related: ['ducting', 'kitchen-ventilation', 'air-purification'],
    calculator: 'duct',
  },
  {
    id: 'bms',
    headline: 'A points list the next engineer can read.',
    intro:
      'BMS integration with a written points list, alarm schedule and trend plan. Plant sequencing is documented in plain language, so a setpoint audit does not turn into an archaeology project.',
    warranty: '2 years on controls installation and programming',
    startingFrom: 'Quoted per project',
    priceBasis: 'on point count, protocol and plant complexity',
    priceFactors: [
      'Point count and controller count',
      'Protocol: BACnet/IP, Modbus, proprietary gateway',
      'Graphics, alarms and trend configuration',
    ],
    includes: [
      'Points list and IO schedule',
      'Controller and gateway installation',
      'Plant sequencing and alarm schedule',
      'Trend logging for the agreed points',
      'Operator training and as-built graphics',
    ],
    excludes: [
      'Third-party head-end licences',
      'Electrical works and panel fabrication beyond controls',
      'IT network changes and cybersecurity policy',
    ],
    specs: [
      ['Protocols', 'BACnet/IP · Modbus'],
      ['Points', 'Any plant, scheduled per controller'],
      ['Trends', '15-minute default, 12-month retention'],
      ['Alarms', 'Priority 1 – 4 with escalation'],
    ],
    selection: [
      [
        'The points list is the contract',
        'Every sensor, command and alarm is listed with its address and range before programming. A BMS priced without a points list is a placeholder, not a scope.',
      ],
      [
        'Sequence before graphics',
        'A beautiful dashboard on a plant with no written sequence is decoration. We write the sequence first and make the graphics report it.',
      ],
      [
        'Trends settle disputes',
        'When a tenant says the floor was hot at 3 pm, a 15-minute trend of supply temperature and valve position answers it. Trend the points that decide the argument.',
      ],
    ],
    site: [
      'Controls panel with space for controllers and gateways',
      'Network drop and IP address allocation',
      'Access to plant for sensor installation',
      'A named operator for training and handover',
    ],
    steps: [
      ['Points list', 'IO schedule and alarm priorities agreed with the client.'],
      ['Install', 'Controllers, sensors and gateways installed and addressed.'],
      ['Programme', 'Sequence, schedules, alarms and trends configured.'],
      ['Validate', 'Every point commanded and read back; training and as-builts issued.'],
    ],
    faqs: [
      [
        'Can you integrate with our existing BMS?',
        'Yes, through BACnet/IP or Modbus where the existing head-end supports it. Proprietary systems may need a gateway; we confirm compatibility before quoting.',
      ],
      [
        'Do we need a full BMS for a small building?',
        'Not necessarily. A small plant can use a standalone controller with remote alarms and a schedule. A full head-end earns its cost when there are multiple plant items and an operator.',
      ],
      [
        'Who owns the programming?',
        'You do. We hand over the programme, the points list and the as-built drawings at completion, and we do not lock the controllers to our company.',
      ],
      [
        'How long does integration take?',
        'Two to six weeks depending on point count and whether the plant is running. Retrofit work on a live plant is phased floor by floor.',
      ],
    ],
    related: ['vrf-systems', 'retrofit-audit', 'smart-thermostats'],
  },
  {
    id: 'retrofit-audit',
    headline: 'A metered baseline before a single dollar moves.',
    intro:
      'An energy audit that measures the existing plant, finds the leaks and fouling, and prices the fix against a payback you can check. The phased plan keeps the building running while the work happens.',
    warranty: 'Audit findings warranted for 12 months',
    startingFrom: 'Quoted per site',
    priceBasis: 'on plant size, metering scope and reporting depth',
    priceFactors: [
      'Metering points and logging duration',
      'Plant size and number of systems',
      'Reporting depth and investment-grade model',
    ],
    includes: [
      'Metered kW/TR baseline over a full week',
      'Leak, fouling and insulation survey',
      'Operating sequence review against actual use',
      'Payback model with capex and savings',
      'Phased implementation plan',
    ],
    excludes: [
      'Implementation works (quoted separately)',
      'Structural or electrical upgrades',
      'Utility tariff negotiation',
    ],
    specs: [
      ['Duration', '2 – 6 weeks'],
      ['Baseline', '7-day metered kW/TR'],
      ['Metering', 'Power, temperature, flow, runtime'],
      ['Report', 'Payback and phased capex'],
    ],
    selection: [
      [
        'The baseline must be metered',
        'A nameplate efficiency is not a baseline. We log power, temperatures and run hours for a week, including a weekend, before recommending a retrofit.',
      ],
      [
        'Fouling is the cheapest win',
        'A condenser approach 2 °C above design can cost more than a controls upgrade and is fixed by tube cleaning and water treatment. We check it first.',
      ],
      [
        'Phasing protects operations',
        'A plant replacement in a live building needs temporary cooling and a changeover plan. The audit prices that work, not just the equipment.',
      ],
    ],
    site: [
      'Access to plant room, panels and meters',
      'Permission to install temporary loggers',
      'Twelve months of utility bills and maintenance records',
      'A shutdown window for any intrusive survey',
    ],
    steps: [
      ['Meter', 'Loggers installed on power, flow and temperature for a full week.'],
      ['Survey', 'Leaks, fouling, insulation and control sequence inspected.'],
      ['Model', 'Savings and capex priced with a payback range, not a single number.'],
      ['Plan', 'Phased works sequenced around the building’s operation.'],
    ],
    faqs: [
      [
        'How much does an audit cost?',
        'It depends on metering scope and plant size. A single-chiller site is a one-week exercise; a multi-plant campus needs more points and a longer baseline. The fee is credited against implementation if you proceed.',
      ],
      [
        'Will a retrofit disrupt operations?',
        'It can, which is why the plan is phased. Temporary cooling, night work and floor-by-floor changeover are priced in the audit so there are no surprises at mobilisation.',
      ],
      [
        'What savings are realistic?',
        'Fouling, leaks and schedule corrections typically return 8 – 18% without equipment replacement. Chiller replacement can reach 25 – 35%, but only with a metered baseline and a correct load profile.',
      ],
      [
        'Do you implement the works?',
        'Yes, or we can hand the report to your contractor. The audit is written so a third party can price and execute it without calling us.',
      ],
    ],
    related: ['chilled-water', 'bms', 'chiller-maintenance'],
  },
  {
    id: 'kitchen-ventilation',
    headline: 'Capture velocity before fan size.',
    intro:
      'A commercial kitchen extract designed around the hood’s capture velocity, with make-up air that reaches the burners and grease filtration that can be cleaned. Fire dampers are commissioned with the kitchen live.',
    warranty: '2 years workmanship on duct and hood installation',
    startingFrom: 'Quoted per kitchen',
    priceBasis: 'on hood length, airflow and duct route',
    priceFactors: [
      'Hood length and cooking type',
      'Extract and make-up airflow',
      'Duct route, fire rating and access',
    ],
    includes: [
      'Hood capture velocity and airflow calculation',
      'Extract ductwork with grease-tight joints',
      'Grease filter and access door schedule',
      'Make-up air distribution to the cooking line',
      'Fire damper and fan interlock commissioning',
    ],
    excludes: [
      'Fire suppression and statutory kitchen approvals',
      'Civil work, roofing and steel supports',
      'Gas connections and appliance installation',
    ],
    specs: [
      ['Airflow', '2,000 – 20,000 CFM'],
      ['Capture', '0.25 – 0.5 m/s at the hood face'],
      ['Filtration', 'Baffle grease filter · UV optional'],
      ['Fire rating', 'Duct rated to the kitchen boundary'],
    ],
    selection: [
      [
        'Hood height changes everything',
        'A hood mounted 300 mm higher needs more airflow to hold capture. We measure the cooking line and the ceiling before selecting the hood, not after.',
      ],
      [
        'Make-up air must reach the line',
        'Supply diffusers placed behind the cooks create draughts; placed too far away, they never reach the hood. The make-up route is designed with the extract.',
      ],
      [
        'Grease access is a fire decision',
        'Access doors at every change of direction and a filter that can be removed without tools are part of the fire strategy, not a maintenance convenience.',
      ],
    ],
    site: [
      'Ceiling height and hood mounting points',
      'Roof or wall route for the extract duct',
      'Make-up air path and fan location',
      'Fire damper access and interlock wiring',
    ],
    steps: [
      ['Survey', 'Cooking line, hood height, ceiling and duct route measured.'],
      ['Calculate', 'Capture velocity, extract and make-up airflow agreed.'],
      ['Install', 'Hood, duct, filters, fans and fire dampers installed.'],
      ['Commission', 'Airflow, capture smoke test and fire interlock proven with the kitchen live.'],
    ],
    faqs: [
      [
        'How much extract airflow does a kitchen need?',
        'It depends on hood length, cooking type and mounting height. A light-duty line might need 200 CFM per linear foot; a charbroiler or wok line needs substantially more. We calculate from the hood, not a fixed number.',
      ],
      [
        'Why does the kitchen smell in the dining area?',
        'Usually the kitchen is under negative pressure and pulling air (and odour) from the dining room, or the make-up air is short. The balance and the hood capture are measured together.',
      ],
      [
        'How often should grease filters be cleaned?',
        'Daily for a busy kitchen, at minimum every shift for high-fat cooking. The duct should be inspected quarterly and cleaned to the fire code interval, which is risk-based.',
      ],
      [
        'Can UV treatment remove the need for duct cleaning?',
        'No. UV-C reduces grease vapour and odour but does not replace mechanical cleaning. Ducts still need access doors and scheduled cleaning.',
      ],
    ],
    related: ['ventilation', 'ducting', 'amc'],
    calculator: 'duct',
  },
]
