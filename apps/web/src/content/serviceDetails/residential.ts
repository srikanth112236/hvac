import type { ServiceDetail } from './types'

export const residentialDetails: ServiceDetail[] = [
  {
    id: 'split-ac-installation',
    headline: 'Sized on the room, not the brochure.',
    intro:
      'A wall, cassette or ductable split selected on the sensible load, installed on a bracket that can be serviced, and commissioned with a measured charge. The drain slope and electrical point are agreed before a wall is opened.',
    warranty: '3 years workmanship · 5 years compressor (OEM)',
    startingFrom: '$420',
    priceBasis: 'per indoor unit, standard 3 m copper run',
    priceFactors: [
      'Tonnage and star rating of the selected unit',
      'Copper run beyond 3 m, measured along the actual route',
      'Wall type, floor level and outdoor-unit access',
    ],
    includes: [
      'Room-by-room sensible load check',
      'Indoor bracket or floor stand, fixed to structure',
      '3 m copper pair with closed-cell insulation',
      'Drain pipe at 1:100 with a visible trap',
      'Vacuum to 500 microns and weighed refrigerant charge',
    ],
    excludes: [
      'Electrical point, MCB and stabiliser',
      'Wall cutting beyond one 50 mm hole',
      'Society NOC, lift booking or crane charges',
    ],
    specs: [
      ['Capacity', '1.5 – 8.5 TR'],
      ['Refrigerant', 'R-32 · R-410A'],
      ['Indoor noise', '19 – 42 dB(A)'],
      ['Pipe run', '3 m standard · 15 m maximum'],
    ],
    selection: [
      [
        'West glazing is not a detail',
        'A 420 sq ft west-facing room with 1.5 m of glass can land 30% above the same room facing north. We take orientation, glazing area and occupancy before tonnage.',
      ],
      [
        'The cassette needs 250 mm of void',
        'Ceiling depth, beam positions and drain fall decide whether a cassette is honest. If the void is 180 mm, a ducted unit or a high-wall is the correct answer.',
      ],
      [
        'Noise is a night-time specification',
        'The indoor unit is selected on its low-fan dB(A), not its rated cooling capacity. Outdoor placement keeps the compressor away from bedroom windows and the neighbour’s wall.',
      ],
    ],
    site: [
      '230 V single-phase point within 1 m of the indoor unit',
      'One 50 mm hole with safe outdoor access',
      '300 mm service clearance at the outdoor unit',
      'Drain route to a gravity or pump discharge',
    ],
    steps: [
      ['Load check', 'Room dimensions, glazing, occupancy and equipment gain measured on site.'],
      ['Route and brackets', 'Copper path, drain fall and outdoor position marked and approved before drilling.'],
      ['Install and evacuate', 'Bracket fixed, flare joints torqued, vacuum held at 500 microns.'],
      ['Commission', 'Charge weighed in, delta-T measured, drain tested and handover sheet signed.'],
    ],
    faqs: [
      [
        'What tonnage do I need for a bedroom?',
        'A 120 – 150 sq ft bedroom with one window usually lands at 1 – 1.2 TR; a 300 sq ft west-facing living room with heavy glazing can need 3 TR. Floor area alone is not enough — we check orientation, glass and occupancy.',
      ],
      [
        'Is extra copper charged separately?',
        'Yes. The quotation includes 3 m per unit; anything beyond that is priced per metre along the measured route, including insulation and additional refrigerant. The rate is stated before work starts.',
      ],
      [
        'How long does an installation take?',
        'One working day for a standard wall split, two for a cassette or a long route. Sites with society restrictions may need a second visit for drilling or outdoor-unit lifting.',
      ],
      [
        'Do you install units bought online?',
        'Yes, after we check the model against the room load and confirm the warranty position. We will not install a unit that is undersized for the room and then warrant the result.',
      ],
    ],
    related: ['ac-servicing', 'gas-charging', 'inverter-multi-split'],
    calculator: 'tonnage',
  },
  {
    id: 'ac-repair',
    headline: 'Diagnosis before parts.',
    intro:
      'A same-day repair service that tests the board, compressor and refrigerant circuit before quoting a component. You get a written repair note with the readings, not a guess and a parts list.',
    warranty: '90 days on the repair performed',
    startingFrom: '$85',
    priceBasis: 'diagnostic, waived against an approved repair',
    priceFactors: [
      'Fault type: electrical, refrigerant or mechanical',
      'Parts required and whether they are held in stock',
      'Access, height and after-hours attendance',
    ],
    includes: [
      'Error-code read and symptom reproduction',
      'PCB, sensor and compressor winding tests',
      'Leak trace on the refrigerant circuit',
      'Repair note with pressures and electrical readings',
      'Post-repair run test at the actual room load',
    ],
    excludes: [
      'Compressor, PCB and fan motor parts (quoted separately)',
      'Refrigerant lost through a pipe damaged by others',
      'Electrical supply faults upstream of the unit',
    ],
    specs: [
      ['Response', '4 hours inside city limits'],
      ['Dispatch', '24 × 7 · 365 days'],
      ['Refrigerants', 'R-32 · R-410A · R-134a'],
      ['Repair warranty', '90 days on labour and joints'],
    ],
    selection: [
      [
        'Symptom is not diagnosis',
        'A unit that runs but does not cool can be a dirty coil, a failing capacitor, a blocked capillary or a slow leak. We test in that order before recommending a compressor.',
      ],
      [
        'Age changes the economics',
        'Beyond eight years, a compressor or PCB replacement can exceed half the unit’s replacement value. We give both numbers and let you choose, rather than repairing by default.',
      ],
      [
        'Parts availability decides the window',
        'Common capacitors, sensors and fan motors are carried on the van. PCBs and compressors are sourced against the model serial, with the lead time stated at diagnosis.',
      ],
    ],
    site: [
      'Access to the indoor unit and outdoor unit',
      'A working 230 V supply to test under load',
      'Gate pass or society entry for the engineer',
      'Someone authorised to approve a repair on site',
    ],
    steps: [
      ['Log the call', 'Symptom, unit model and site address taken by dispatch; a 4-hour window is confirmed.'],
      ['Test', 'Electrical and refrigerant readings taken before any part is removed.'],
      ['Quote', 'Repair options priced in writing, including the no-repair outcome.'],
      ['Repair and prove', 'Approved work completed, run-tested at load and logged on the repair note.'],
    ],
    faqs: [
      [
        'Do you charge if the unit cannot be repaired?',
        'The diagnostic fee applies and is not waiveable when no repair is approved. If the unit is beyond economic repair, the fee covers the written assessment you can use for replacement quotes.',
      ],
      [
        'Can you attend at night?',
        'Yes. Dispatch runs 24 × 7. Night and weekend attendance carries an out-of-hours rate, quoted before the engineer is assigned.',
      ],
      [
        'How fast is a compressor replacement?',
        'Two to five working days depending on model and stock, plus one day for installation and commissioning. The unit is isolated and the circuit made safe on the first visit.',
      ],
      [
        'Is the repair guaranteed?',
        'Labour and joints carry a 90-day warranty. Parts carry the manufacturer’s warranty, which we register against the unit serial at handover.',
      ],
    ],
    related: ['ac-servicing', 'gas-charging', 'amc'],
  },
  {
    id: 'ac-servicing',
    headline: 'Coil-safe wash, photographed before and after.',
    intro:
      'A deep clean that removes the biological film and dust mat from the coil and blower without attacking the aluminium fins. Each unit is photographed before and after and the images are filed against its serial.',
    warranty: 'Free re-visit within 7 days if the drain or airflow is not right',
    startingFrom: '$70',
    priceBasis: 'per indoor unit, single visit',
    priceFactors: [
      'Unit type: wall, cassette, ducted or tower',
      'Number of units at one site',
      'Access and height, including false-ceiling removal',
    ],
    includes: [
      'Filter removal and wash',
      'Coil cleaning with pH-neutral, fin-safe chemical',
      'Blower wheel and scroll cleaning',
      'Drain pan flush and drain-line test',
      'Before/after coil photographs filed by unit serial',
    ],
    excludes: [
      'Refrigerant top-up or leak repair',
      'Electrical fault-finding and PCB replacement',
      'Duct interior cleaning (quoted as a separate scope)',
    ],
    specs: [
      ['Duration', '2 – 3 hours per unit'],
      ['Wash pressure', '8 – 10 bar at the nozzle'],
      ['Chemical', 'pH-neutral, aluminium-safe'],
      ['Interval', '3 – 6 months depending on use'],
    ],
    selection: [
      [
        'Jet wash is not steam',
        'High-pressure steam can distort fins and drive moisture into the blower housing. We use a controlled jet at 8 – 10 bar with a fin-safe cleaner and a containment bag.',
      ],
      [
        'The drain is half the job',
        'A clean coil with a sloped drain line still leaks into the ceiling. The pan is flushed, the trap checked and the line tested to the discharge point on every visit.',
      ],
      [
        'Frequency follows the site',
        'A roadside flat needs service twice a year; a clean-room office may need it quarterly. We set the interval from filter loading and coil photographs, not a fixed annual visit.',
      ],
    ],
    site: [
      'Water point and drain access',
      'Power for the vacuum and wash equipment',
      'Protected floor area below the indoor unit',
      'Access panel or ceiling clearance for ducted units',
    ],
    steps: [
      ['Isolate and contain', 'Supply isolated, containment fitted, filters removed.'],
      ['Wash the coil', 'Chemical applied, dwelled and flushed; blower cleaned separately.'],
      ['Flush the drain', 'Pan and line flushed, trap checked, flow tested.'],
      ['Reassemble and prove', 'Unit reassembled, run-tested, delta-T recorded, photographs filed.'],
    ],
    faqs: [
      [
        'How often should a split be serviced?',
        'Every six months in normal residential use; every three months for roadside sites, kitchens or homes with pets. Filter cleaning between visits is a two-minute job the occupant can do.',
      ],
      [
        'Does servicing include gas top-up?',
        'No. A sealed system should not need gas. If pressures are low, we look for the leak first and quote the repair separately — topping up without finding the leak is a recurring bill.',
      ],
      [
        'Will the chemical damage my coil?',
        'We use a pH-neutral, aluminium-safe cleaner and flush it fully. Acidic coil cleaners are faster but attack the fin bond and shorten the coil’s life.',
      ],
      [
        'Can you service a unit that is still under warranty?',
        'Yes. Routine cleaning is maintenance, not a repair, and does not void the OEM warranty when done to the manual. We record the work against the serial.',
      ],
    ],
    related: ['split-ac-installation', 'gas-charging', 'amc'],
  },
  {
    id: 'gas-charging',
    headline: 'Pressure-tested, then charged by weight.',
    intro:
      'A refrigerant job that starts with a 550 psi nitrogen test and a 500-micron vacuum, not a top-up can. The charge is weighed against the nameplate and recorded, so the next engineer knows what is actually in the circuit.',
    warranty: '90 days on brazed joints and the charge',
    startingFrom: '$240',
    priceBasis: 'per circuit, including pressure test and vacuum',
    priceFactors: [
      'Refrigerant type and charge weight',
      'Pipe run length and number of joints',
      'Access to both ends of the circuit',
    ],
    includes: [
      'Nitrogen pressure test at 550 psi, held 24 hours',
      'Leak trace at joints, flares and the coil',
      'Brazing or flare repair where accessible',
      'Vacuum to 500 microns with decay check',
      'Charge weighed in and recorded against nameplate',
    ],
    excludes: [
      'Top-up without a pressure test',
      'Compressor replacement and internal coil leaks',
      'Pipe replacement inside a wall or ceiling',
    ],
    specs: [
      ['Refrigerants', 'R-32 · R-410A · R-134a'],
      ['Test pressure', '550 psi nitrogen'],
      ['Vacuum', '500 microns, 10-minute decay'],
      ['Charge tolerance', '±10 g against nameplate'],
    ],
    selection: [
      [
        'Low pressure is a symptom',
        'A system that is low has lost refrigerant somewhere. The test locates the loss before any gas goes in; a charge without a repair is a repeat visit with a higher bill.',
      ],
      [
        'Pipe length changes the charge',
        'Every metre beyond the factory charge adds refrigerant. The nameplate plus the measured run decides the weight, not the sight glass alone.',
      ],
      [
        'Moisture is the hidden failure',
        'A vacuum held at 500 microns with no decay proves the circuit is dry. Skipping the decay check leaves moisture that freezes at the metering device and kills the compressor.',
      ],
    ],
    site: [
      'Access to both indoor and outdoor service ports',
      'Power to run the vacuum pump and gauges',
      'Ventilated working area for nitrogen and brazing',
      'Permission for hot work where brazing is required',
    ],
    steps: [
      ['Pressure test', 'Nitrogen at 550 psi, isolated and logged for 24 hours.'],
      ['Repair', 'Leak at a flare or joint repaired and re-tested before evacuation.'],
      ['Evacuate', 'Vacuum to 500 microns, decay checked, moisture proven absent.'],
      ['Charge and record', 'Refrigerant weighed in, running pressures and delta-T recorded on the job sheet.'],
    ],
    faqs: [
      [
        'How do I know the system has a leak?',
        'Ice on the suction line, poor cooling, a hissing joint or a slowly rising room temperature are common signs. The only proof is a pressure test; gauge readings alone can mislead in high ambient.',
      ],
      [
        'Can you just top up the gas?',
        'We will not top up a system without locating the leak. It is illegal to vent refrigerant and uneconomic to keep replacing it. The test is included in the quoted job.',
      ],
      [
        'Which refrigerant does my unit use?',
        'The nameplate states it — R-32, R-410A or R-134a on most residential equipment. Refrigerants are not interchangeable, and the wrong gas can damage the compressor.',
      ],
      [
        'How long does the job take?',
        'Three to five hours for a standard split, plus the 24-hour pressure hold. If a leak is inside a wall, the repair becomes a separate scope with making-good included.',
      ],
    ],
    related: ['ac-repair', 'split-ac-installation', 'ac-servicing'],
  },
  {
    id: 'ac-relocation',
    headline: 'Moved without losing the charge.',
    intro:
      'A pump-down, protected transport and a full re-installation with new flare joints. The unit is re-commissioned at the new site with a fresh vacuum and a measured charge, not reconnected and switched on.',
    warranty: '30 days on the re-installation',
    startingFrom: '$320',
    priceBasis: 'per unit, within city limits',
    priceFactors: [
      'Floor level and lift access at both sites',
      'Copper and drain length at the new location',
      'Whether the existing pipework can be reused',
    ],
    includes: [
      'Pump-down and refrigerant recovery into the outdoor unit',
      'Uninstall with capped ports and protected coils',
      'Transport within city limits',
      'New flare joints and insulation at the new site',
      'Vacuum, leak test and re-commissioning',
    ],
    excludes: [
      'Society NOC, lift booking and crane charges',
      'Wall making-good and new electrical points',
      'Refrigerant lost through damaged or cut pipework',
    ],
    specs: [
      ['Duration', '1 working day'],
      ['Capacity', '1.5 – 6 TR'],
      ['New pipe run', '15 m maximum'],
      ['Re-commission', 'Vacuum and delta-T recorded'],
    ],
    selection: [
      [
        'Pump-down protects the compressor',
        'Refrigerant is recovered into the outdoor unit before the pipes are opened. Simply cutting the line loses the charge and contaminates the circuit with air and moisture.',
      ],
      [
        'Old flares are not reused',
        'Flare joints work-harden and leak after one torque cycle. New flares and new insulation are part of the move, not an optional extra.',
      ],
      [
        'The new site decides the cost',
        'Third-floor walk-up, a long copper route or a balcony with no lifting access changes labour. The survey at both ends is what makes the quote firm.',
      ],
    ],
    site: [
      'Access at both the old and new site',
      'Lift or stair width for the outdoor unit',
      'Power at the new site for commissioning',
      'Landlord approval for the new outdoor position',
    ],
    steps: [
      ['Pump down', 'Refrigerant recovered, ports capped, unit isolated.'],
      ['Remove and protect', 'Indoor and outdoor units removed with coil guards and capped pipes.'],
      ['Reinstall', 'New brackets, new flares, drain slope and electrical reconnected.'],
      ['Recommission', 'Vacuum, leak test, charge check and run test at the new site.'],
    ],
    faqs: [
      [
        'Can the existing copper be reused?',
        'Sometimes, if it can be removed without kinking and the flares are cut back. We pressure-test reused pipe before connecting it; a hidden leak after the move is expensive to trace.',
      ],
      [
        'Do you move the unit yourself?',
        'Yes, within Dallas, Fort Worth and Plano. Inter-city moves are quoted with a transport partner and the unit is insured for transit.',
      ],
      [
        'Will the warranty survive the move?',
        'The OEM warranty stays with the unit if the reinstall is done to spec and documented. Our workmanship warranty covers the new installation for 30 days.',
      ],
      [
        'How long is the unit offline?',
        'One working day for a standard split, assuming both sites are accessible. A long copper route or a new electrical point can extend it to two.',
      ],
    ],
    related: ['split-ac-installation', 'gas-charging', 'ac-servicing'],
  },
  {
    id: 'inverter-multi-split',
    headline: 'One outdoor bank, rooms that behave differently.',
    intro:
      'A multi-split designed room by room, with a diversity check that reflects how the house is actually used. Bedrooms at night, living room in the evening, guest room once a month — the outdoor capacity follows that pattern.',
    warranty: '3 years workmanship · 5 years compressor (OEM)',
    startingFrom: 'Quoted per system',
    priceBasis: 'on the indoor unit count and combined capacity',
    priceFactors: [
      'Number of indoor units and their individual loads',
      'Simultaneous-use diversity',
      'Outdoor position, pipe length and lift',
    ],
    includes: [
      'Room-by-room load and diversity calculation',
      'Outdoor unit sized on simultaneous use, not the sum',
      'Drain routing for every indoor unit',
      'Electrical load coordination with the main panel',
      'Commissioning at the furthest indoor unit',
    ],
    excludes: [
      'Electrical point and dedicated MCB',
      'Ceiling or wall civil work',
      'Society NOC and outdoor-unit lifting',
    ],
    specs: [
      ['Capacity', '1.5 – 12 TR'],
      ['Indoor units', '3 – 5 per outdoor'],
      ['Refrigerant', 'R-32'],
      ['Diversity', '85 – 100%'],
    ],
    selection: [
      [
        'Diversity is a design decision',
        'If five indoor units never run together, the outdoor unit can be smaller than their sum. We ask how the rooms are used before applying a diversity factor.',
      ],
      [
        'Pipe length is shared',
        'Every indoor unit’s run is measured from the same outdoor position. A long branch to the far bedroom affects the whole system’s charge and pressure drop.',
      ],
      [
        'One outdoor, one noise source',
        'A single bank is easier to service and screen acoustically than four separate condensers. It also means one failure takes more rooms offline — the trade-off is stated up front.',
      ],
    ],
    site: [
      'Outdoor wall or terrace with 300 mm clearance',
      'Drain route from every indoor unit',
      'Dedicated electrical circuit at the outdoor unit',
      'Access for future service at each indoor head',
    ],
    steps: [
      ['Zone load', 'Each room measured and its simultaneous-use pattern agreed.'],
      ['Route design', 'Branch lengths, lift and drain falls drawn before installation.'],
      ['Install', 'Brackets, pipework, drains and electrical coordinated in one visit.'],
      ['Commission', 'Leak test, vacuum, charge and run test at the furthest head.'],
    ],
    faqs: [
      [
        'Is a multi-split cheaper than several splits?',
        'Not always. One outdoor unit saves wall space and electrical points, but the equipment costs more and a failure affects multiple rooms. We price both arrangements when the site allows.',
      ],
      [
        'Can I add a room later?',
        'Only if the outdoor unit has spare capacity and a spare port. We size the outdoor bank with one future head in mind where the pipe route allows, and say so in the quotation.',
      ],
      [
        'Do all rooms cool at once?',
        'They can, within the diversity limit. If every head is switched on simultaneously, the outdoor unit modulates down and the furthest room may lose capacity first.',
      ],
      [
        'How long does installation take?',
        'Two to four days for three to five heads, depending on pipe routes and whether ceilings need opening. Commissioning is a separate half-day.',
      ],
    ],
    related: ['split-ac-installation', 'vrf-systems', 'smart-thermostats'],
    calculator: 'vrf',
  },
  {
    id: 'ducted-residential',
    headline: 'Cooling you hear only at the diffuser.',
    intro:
      'A ducted home system designed around the ceiling void, with static pressure calculated per branch and access panels where the filters actually are. The ceiling closes only after the air balance is measured.',
    warranty: '3 years workmanship · 5 years compressor (OEM)',
    startingFrom: 'Quoted per TR',
    priceBasis: 'on tonnage, duct route and diffuser count',
    priceFactors: [
      'Tonnage and number of zones',
      'Duct material: PIR, GI or pre-insulated',
      'Ceiling void depth and diffuser count',
    ],
    includes: [
      'Ceiling void and structural survey',
      'Duct layout with calculated static per branch',
      'PIR ductwork with access panels at filters',
      'Diffuser and return grille selection for throw and noise',
      'Air balance measured at every diffuser',
    ],
    excludes: [
      'False ceiling, civil work and painting',
      'Electrical point and control wiring beyond 1 m',
      'Society NOC and terrace structural work',
    ],
    specs: [
      ['Capacity', '3 – 20 TR'],
      ['Static pressure', '35 – 60 Pa'],
      ['Duct insulation', '25 mm PIR'],
      ['Air per branch', 'Up to 640 CFM'],
    ],
    selection: [
      [
        'Void depth decides the unit',
        'A ducted unit needs 250 – 350 mm plus drain fall. If the void is shallower, a high-static slim unit or a different system is the honest answer.',
      ],
      [
        'Static pressure is spent on fittings',
        'Every elbow, damper and flexible connector costs pressure. The fan is selected against the calculated route, not the datasheet’s free-air figure.',
      ],
      [
        'Access panels are part of the design',
        'Filters and drain traps need a service opening. Panels are drawn on the ceiling layout before the gypsum goes up, not cut after the first complaint.',
      ],
    ],
    site: [
      'Ceiling void of at least 300 mm on the unit route',
      'Terrace or service area for the outdoor unit',
      'Drain route with gravity fall or a condensate pump',
      'Access panels agreed with the interior designer',
    ],
    steps: [
      ['Void survey', 'Depth, beams, drain fall and diffuser positions measured.'],
      ['Design and fabricate', 'Duct layout, static calculation and access panel schedule issued.'],
      ['Install', 'Duct, unit, drains and controls installed before the ceiling closes.'],
      ['Balance', 'CFM at every diffuser and static at every branch measured and adjusted.'],
    ],
    faqs: [
      [
        'Is ducted cooling quieter than splits?',
        'Yes, when the fan and duct are sized correctly. A poorly sized duct with a high-static fan is louder than a split; the noise moves from the room to the ceiling grille.',
      ],
      [
        'Can it be zoned room by room?',
        'Yes, with motorised dampers and separate thermostats. Zoning adds controls and commissioning time; the duct layout has to be designed for the reduced airflow when a zone closes.',
      ],
      [
        'What maintenance does it need?',
        'Filter cleaning every 2 – 3 months through the access panels, coil and drain service every 6 months, and a yearly duct inspection. Without panels, maintenance becomes ceiling work.',
      ],
      [
        'How long does the installation take?',
        'Five to ten days for a typical three-bedroom home, excluding ceiling and painting. The air balance is a separate half-day after the ceiling is closed.',
      ],
    ],
    related: ['ducting', 'split-ac-installation', 'air-purification'],
    calculator: 'tonnage',
  },
  {
    id: 'air-purification',
    headline: 'Filtration that survives the first monsoon.',
    intro:
      'A filtration and ventilation package designed for the room’s actual occupancy: media filtration at the right pressure drop, UV-C at the coil where it works, and a fresh-air fraction that keeps CO₂ down without throwing away the cooling.',
    warranty: '1 year on UV and filter housings',
    startingFrom: '$1,250',
    priceBasis: 'per system, including filter housing and UV',
    priceFactors: [
      'Filter class: MERV 13, HEPA or carbon',
      'Number of rooms and air changes required',
      'Fresh-air ducting and UV-C points',
    ],
    includes: [
      'Occupancy and CO₂-based fresh-air check',
      'MERV 13 media filter or HEPA module',
      'UV-C lamp at the evaporator coil',
      'Pressure-drop check across the filter',
      'Filter replacement schedule and spares list',
    ],
    excludes: [
      'Duct interior cleaning and duct replacement',
      'Medical-grade validation or hospital compliance',
      'Electrical work beyond the UV circuit',
    ],
    specs: [
      ['Particles', 'PM2.5 · PM10 · VOC'],
      ['UV-C', '254 nm at the coil'],
      ['Fresh air', '10 – 20% of supply'],
      ['CO₂ target', 'Below 800 ppm occupied'],
    ],
    selection: [
      [
        'Filter class is a pressure decision',
        'A HEPA filter on a residential fan can starve the airflow. We check the fan’s external static before specifying the class, and often land at MERV 13 plus a carbon stage.',
      ],
      [
        'UV-C needs a clean coil',
        'UV-C keeps a clean coil clean; it does not clean a fouled one. The coil is washed before the lamp is fitted, otherwise the light never reaches the surface.',
      ],
      [
        'Fresh air is the underrated fix',
        'CO₂ above 1,000 ppm in a meeting room is a ventilation problem, not a filtration one. A small fresh-air duct with a heat-recovery core often does more than another filter stage.',
      ],
    ],
    site: [
      'Filter housing space at the return or AHU',
      'Power point for the UV-C circuit',
      'Fresh-air intake away from exhausts and kitchens',
      'Access for filter replacement',
    ],
    steps: [
      ['Audit', 'Room volume, occupancy and existing filtration measured.'],
      ['Design', 'Filter class, UV points and fresh-air fraction selected against fan static.'],
      ['Install', 'Housings, lamp and ducting fitted; coil cleaned before UV commissioning.'],
      ['Verify', 'Pressure drop, CO₂ and particle count checked with the room occupied.'],
    ],
    faqs: [
      [
        'Does UV-C kill mould in the room?',
        'No. UV-C at the coil treats the coil and the air passing it; it does not disinfect a room. Room-level disinfection needs a different dose and a different product, which we do not sell.',
      ],
      [
        'How often do filters need changing?',
        'Every 3 – 6 months for MERV 13 in Dallas, sooner on a roadside or during construction. The pressure drop across the housing tells you when, and we leave a gauge or a schedule.',
      ],
      [
        'Will a HEPA filter reduce my AC capacity?',
        'It can, because the fan has to push through a denser media. We measure external static and select a filter that fits the fan, rather than fitting the highest class and accepting reduced airflow.',
      ],
      [
        'Is this useful in a normal flat?',
        'Yes, if the flat is near traffic, has allergies or uses a room with poor fresh air. For a well-ventilated flat with a clean coil, regular servicing and a MERV 13 filter may be enough.',
      ],
    ],
    related: ['ducted-residential', 'ac-servicing', 'smart-thermostats'],
  },
  {
    id: 'smart-thermostats',
    headline: 'Schedules the building actually follows.',
    intro:
      'Zoned control with schedules, setpoint limits and a handover for the person who pays the bill. We map the zones, programme the week and leave the app configured — not a manual and a default schedule.',
    warranty: '2 years on controls installation',
    startingFrom: '$680',
    priceBasis: 'per zone, including thermostat and commissioning',
    priceFactors: [
      'Number of zones and existing wiring',
      'Protocol: Wi-Fi, BACnet or Modbus',
      'BMS integration and head-end work',
    ],
    includes: [
      'Zone mapping and thermostat placement',
      '7-day schedule with occupancy and holiday overrides',
      'Setpoint limits to stop runaway operation',
      'App handover for the site contact',
      'Wiring and commissioning per zone',
    ],
    excludes: [
      'OEM cloud subscription fees',
      'Rewiring beyond 1 m per thermostat',
      'BMS head-end software and graphics',
    ],
    specs: [
      ['Zones', '1 thermostat per zone'],
      ['Duration', '4 – 6 hours per zone'],
      ['Protocols', 'Wi-Fi · BACnet · Modbus'],
      ['Schedule', '7-day + holiday override'],
    ],
    selection: [
      [
        'Existing wiring decides the model',
        'A two-wire system may need a C-wire or a power module. We check the wiring at the indoor unit before recommending a thermostat that cannot run on it.',
      ],
      [
        'Zoning follows use, not rooms',
        'A guest room and a study can share a zone if they are never occupied together. More zones means more dampers, more controls and more to commission.',
      ],
      [
        'Setpoint limits protect the bill',
        'A minimum of 24 °C in summer and a locked fan speed stop the system being used as a refrigerator. Limits are set with the site contact, not imposed silently.',
      ],
    ],
    site: [
      'C-wire or power module at each thermostat',
      'Wi-Fi coverage at the thermostat location',
      'Access to the indoor unit and control panel',
      'A named person for the app handover',
    ],
    steps: [
      ['Map zones', 'Rooms, occupancy and existing wiring documented.'],
      ['Install', 'Thermostats mounted away from sun, draughts and doorways.'],
      ['Programme', 'Schedules, limits and overrides set with the site contact.'],
      ['Handover', 'App configured on the client’s phone; one-page schedule left on site.'],
    ],
    faqs: [
      [
        'Can I control the AC from my phone?',
        'Yes, with a Wi-Fi thermostat or an IR controller for units that lack a native app. We confirm the model’s app and account requirements before installation.',
      ],
      [
        'Do smart thermostats save money?',
        'They save energy when schedules match occupancy and setpoints are limited. A thermostat cannot fix an oversized unit, a leaking duct or a coil that has never been cleaned.',
      ],
      [
        'Will it work with my VRF system?',
        'VRF systems usually use a proprietary controller or a BACnet gateway, not a residential thermostat. We specify the gateway and integrate it rather than replacing the manufacturer’s controls.',
      ],
      [
        'What happens when the internet is down?',
        'The thermostat keeps running its local schedule. App control and remote alerts are unavailable until the connection returns; heating and cooling are not.',
      ],
    ],
    related: ['bms', 'split-ac-installation', 'inverter-multi-split'],
  },
]
