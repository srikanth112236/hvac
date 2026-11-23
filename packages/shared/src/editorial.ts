import type { SitePost, SiteProduct } from './site'

export const blogPosts: SitePost[] = [
  {
    id: 'post-delta-t',
    slug: 'split-ac-delta-t-what-good-looks-like',
    title: 'Delta-T on a split AC: what a healthy number looks like',
    excerpt:
      'A simple return-to-supply temperature check can tell you whether an air conditioner is short of refrigerant, short of airflow, or simply doing its job.',
    answer:
      'Measure the air entering the indoor unit and the air leaving it after 15–20 minutes of steady operation. A healthy split system typically holds a temperature difference of about 8–12 °C at design airflow, although the manufacturer’s data for that model is the final reference. A low delta-T points to airflow, coil or refrigerant problems; an unusually high one often points to restricted airflow.',
    category: 'Commissioning',
    tags: ['delta-T', 'split AC', 'commissioning', 'airflow'],
    authorName: 'Coolvane engineering desk',
    authorRole: 'Service and commissioning team',
    publishedAt: '2026-11-18',
    updatedAt: '2026-11-18',
    readingMinutes: 6,
    heroPlate: 'CV-AIR-ΔT · return / supply',
    featured: true,
    published: true,
    body: `## The short answer

A split air conditioner is doing useful work when it removes both heat and moisture from the room. The quickest field check is the temperature difference between the air entering the indoor coil and the air leaving it — the **delta-T**. For many split and cassette systems, a steady reading of roughly **8–12 °C** is a reasonable starting point at design airflow. Treat that as a diagnostic band, not a universal specification; the equipment manufacturer’s performance table is the authority for the installed model.

## How to take the reading properly

1. Run the unit in cooling on a high fan setting for at least 15–20 minutes.
2. Hold a calibrated probe in the return-air stream, away from the wall and direct sunlight.
3. Take the supply reading at the centre of the discharge grille, not against the louvre.
4. Record the room temperature, outdoor temperature, fan speed and refrigerant type at the same time.

A single number without those conditions is not very useful. A unit tested on a 24 °C day with the fan on low will not match a test on a 38 °C day with the fan on high.

## What a low delta-T suggests

A delta-T below the expected band usually means the coil is not transferring heat efficiently. The common causes are:

- A dirty filter, blocked evaporator fin or collapsed return duct.
- Low refrigerant charge after a slow leak.
- A restricted expansion device or a faulty sensor.
- Air bypassing the coil because the unit or ceiling opening is not sealed.

Do not add refrigerant before checking airflow. Overcharging a system that is merely short of air raises pressure, worsens cooling and can damage the compressor.

## What a high delta-T suggests

A very high difference can look impressive while the room stays warm. It often means the fan is moving too little air across the coil. Check the filter, the blower setting, the duct static pressure and whether the indoor unit is oversized for the ductwork. Low airflow also increases the risk of coil icing.

## Why moisture matters

Sensible temperature is only half of comfort. In Dallas and Fort Worth, latent load is significant. A system can show an acceptable delta-T and still leave the room clammy if it is oversized, cycling too quickly, or running a fan speed that does not allow enough condensate to drain. Look at the drain pan, the condensate line and the indoor relative humidity alongside the temperature split.

> A delta-T reading is a clue, not a diagnosis. Pair it with suction and discharge pressures, superheat or subcooling where the manufacturer specifies them, and a visual check of the coil and drain.

## What we record at handover

A useful commissioning sheet records the room condition, outdoor condition, fan speed, supply and return temperatures, refrigerant pressures, and the measured condensate flow. If a system is handed over with only a tick in a box, there is no baseline for the first service visit.

## When to call an engineer

Call for a site check if the delta-T is outside the manufacturer’s band, if the unit ices up, if cooling varies sharply between rooms, or if the outdoor unit runs continuously without holding the setpoint. A pressure and airflow test takes less time than a repeat visit after a compressor failure.`,
    takeaways: [
      'Measure return and supply air after 15–20 minutes of steady cooling.',
      'A typical split-system band is about 8–12 °C, but the model data wins.',
      'Check airflow and coil condition before adding refrigerant.',
    ],
    faqs: [
      {
        question: 'Is a higher delta-T always better?',
        answer:
          'No. A very high split can indicate low airflow across the coil. The target is the manufacturer’s design condition, not the largest number on the thermometer.',
      },
      {
        question: 'Can I check delta-T with a phone thermometer?',
        answer:
          'A phone sensor is better than nothing, but it is not calibrated for HVAC diagnostics. Use a probe thermometer with a stable reading and record the conditions at the same time.',
      },
      {
        question: 'Does delta-T tell me if the refrigerant is low?',
        answer:
          'It can suggest a problem, but it does not prove low charge. Pressures, superheat or subcooling and airflow must be checked before refrigerant is added.',
      },
    ],
    relatedServices: ['ac-servicing', 'gas-charging', 'ac-repair'],
    seoTitle: 'Split AC delta-T: healthy temperature difference and what low delta-T means',
    seoDescription:
      'How to measure delta-T on a split AC, the typical 8–12 °C band, and what low or high readings say about airflow, refrigerant and coil condition.',
  },
  {
    id: 'post-tonnage',
    slug: 'how-to-size-an-ac-room-tonnage',
    title: 'How to size an AC: tonnage is a result, not a room measurement',
    excerpt:
      'Floor area is a starting point. Orientation, glazing, occupancy and fresh air decide the load — and the load decides the tonnage.',
    answer:
      'Air-conditioner tonnage should be selected from a room-by-room heat-load calculation, not from floor area alone. A rough area rule can start a conversation, but orientation, window area, insulation, occupancy, lighting, equipment gain and fresh-air requirement can move the result by 20–40%. One refrigeration ton equals about 3.517 kW of cooling capacity.',
    category: 'Design',
    tags: ['tonnage', 'heat load', 'sizing', 'residential HVAC'],
    authorName: 'Coolvane engineering desk',
    authorRole: 'Design and estimation team',
    publishedAt: '2026-11-10',
    updatedAt: '2026-11-10',
    readingMinutes: 7,
    heroPlate: 'CV-LOAD · kW → TR',
    featured: false,
    published: true,
    body: `## The short answer

An air conditioner is sized against a **heat-load calculation**, not against a floor-area chart. The calculation adds heat coming through the building envelope, solar gain through glazing, heat from people, lights and equipment, and the load created by bringing in fresh air. The result is a peak sensible and latent load in kW; tonnage is simply that load divided by roughly 3.517.

## Why the area rule fails

A common shortcut says one ton per 100–120 sq ft. It can be useful for a first budget, but it ignores the things that decide comfort:

- A west-facing wall gains far more heat in the late afternoon than a north-facing wall.
- A room with 1.5 m of single-glazed window can need 25–35% more capacity than an identical room with shaded double glazing.
- A home office with two monitors, a printer and two people is not the same load as a bedroom.
- A kitchen or a room with an open door to a corridor needs an allowance for extract and infiltration.
- Dallas’s latent load is high; removing moisture may dominate the selection.

## A worked example

Take a 420 sq ft west-facing room with 1.5 m of glazing, two occupants and ordinary lighting. A simple area rule might suggest 3.5–4.2 TR. A proper calculation may land nearer **3.2–3.5 TR** once the glazing is shaded and the actual equipment gain is counted — or higher if the glass is unshaded and the fresh-air path is uncontrolled. The exact figure depends on the inputs, which is why we publish the assumptions with the selection.

## Oversizing is not a safety margin

An oversized unit reaches the setpoint quickly, then cycles. Short cycles remove less moisture, stress the compressor and create uneven room temperatures. Inverter systems modulate better, but they are still selected against a load. A unit that is too large for its ductwork can also be noisy and prone to coil icing.

## What a good load sheet includes

A load sheet should state the room geometry, orientation, glazing area and shading, wall and roof construction, occupancy, lighting and equipment gains, outdoor design condition, indoor setpoint and fresh-air rate. It should show the sensible and latent totals separately, not only a final tonnage.

## The practical sequence

1. Survey the room and record the envelope.
2. Agree the indoor design condition and fresh-air requirement.
3. Calculate the load room by room.
4. Select equipment with a capacity table at the actual entering-air and outdoor conditions.
5. Check part-load behaviour, noise and service access.
6. Recheck the selection after the duct or pipe route is known.

> The right question is not “how many tons for this room?” It is “what load does this room carry at the design condition, and what equipment holds it quietly and efficiently?”

## When a room-by-room calculation is essential

It is essential for a whole home, a VRF system, a ducted system, a commercial floor or any room with unusual glazing, occupancy or ventilation. For a single existing bedroom, a measured survey and a conservative calculation may be enough — but the assumptions should still be written down.`,
    takeaways: [
      'Select tonnage from a heat-load calculation, not floor area alone.',
      'West glazing, fresh air, occupancy and equipment can move the load sharply.',
      'Oversizing causes short cycling and poor humidity control.',
    ],
    faqs: [
      {
        question: 'How many kW is one ton of air conditioning?',
        answer:
          'One refrigeration ton is approximately 3.517 kW of cooling capacity. Equipment capacity tables should still be checked at the actual operating conditions.',
      },
      {
        question: 'Is 1 ton enough for a 150 sq ft room?',
        answer:
          'Often it can be, but not automatically. Glazing, orientation, occupancy, insulation and fresh air can push the load above or below the area rule.',
      },
      {
        question: 'Should I choose a larger AC to cool the room faster?',
        answer:
          'No. A larger unit may cool the air quickly but remove less moisture and cycle more often. Select for the calculated load and required part-load performance.',
      },
    ],
    relatedServices: ['split-ac-installation', 'ducted-residential', 'vrf-systems'],
    seoTitle: 'How to size an AC: room tonnage, heat load and kW explained',
    seoDescription:
      'Why floor area is not enough to size an air conditioner, how heat load becomes tonnage, and what a proper room-by-room HVAC calculation includes.',
  },
  {
    id: 'post-vrf-chilled-water',
    slug: 'vrf-vs-chilled-water-office',
    title: 'VRF or chilled water? The decision starts with the building, not the brochure',
    excerpt:
      'Both systems can hold a setpoint. The right choice depends on capacity, diversity, route length, maintenance access and how the building will be used in five years.',
    answer:
      'VRF is often a strong fit for multi-room offices with part-load diversity and a constrained plant area. Chilled water is often stronger for large, centralized loads, long pipe runs and buildings with an existing plant room and maintenance team. There is no universal winner: compare first cost, part-load efficiency, refrigerant charge, route length, redundancy, acoustic limits and lifecycle maintenance for the actual building.',
    category: 'Systems',
    tags: ['VRF', 'chilled water', 'office HVAC', 'system selection'],
    authorName: 'Coolvane engineering desk',
    authorRole: 'Design and estimation team',
    publishedAt: '2026-10-28',
    updatedAt: '2026-11-04',
    readingMinutes: 8,
    heroPlate: 'CV-SYS-02 · VRF / CHW',
    featured: false,
    published: true,
    body: `## The short answer

VRF and chilled water solve the same comfort problem with different architectures. VRF moves refrigerant to many indoor units and modulates compressors across a shared outdoor bank. Chilled water centralizes the refrigeration plant and distributes cooling through water pipes, pumps and air-handling units. The correct choice is a project decision, not a brand preference.

## Where VRF tends to win

- A multi-room office with varied occupancy and a need for room-by-room control.
- A building with limited plant-room area and a roof or façade that can take outdoor units.
- A phased fit-out where indoor units can be added to an existing refrigerant system.
- A project where metering at the indoor-unit level is valuable.

VRF’s part-load performance is a real advantage when diversity is high. It is also less forgiving of poor installation: flare quality, pipe length, oil return, additional charge and leak testing decide whether the system performs.

## Where chilled water tends to win

- Large capacities where a centralized chiller plant is more efficient and easier to maintain.
- Long distribution routes where refrigerant charge and pressure drop become impractical.
- Buildings with an existing plant room, cooling tower and trained operators.
- Projects that need thermal storage, heat recovery or a high degree of plant redundancy.

Chilled water adds pumps, water treatment, insulation and balancing to the maintenance scope. Those are not disadvantages if the building already has the team and the plant space to manage them.

## The numbers to compare

Ask for the same set of outputs from each option:

1. Peak capacity at the actual outdoor design condition.
2. Part-load efficiency across the expected load profile, not only a full-load kW/TR.
3. Total refrigerant charge and leak-management plan.
4. Pipe or duct routes, shaft sizes and pressure drops.
5. N+1 or N+2 redundancy and the changeover sequence.
6. Acoustic levels at the nearest occupied space and at the boundary.
7. Maintenance access, spare-parts strategy and expected service life.
8. First cost and 10-year energy and maintenance cost.

## The questions that decide it

How will the floors be let in five years? Can the roof take the outdoor bank? Is there a competent plant operator? What happens on a single fan failure? How long is the furthest indoor unit from the source? What refrigerant transition is likely during the equipment’s life? These questions expose more than a catalogue comparison.

> A system that is cheap to install but impossible to service is not a low-cost system. Access, isolation and documentation belong in the selection, not the maintenance contract.

## Our default approach

We model both options when the capacity falls in the overlap. If the building has a central plant and a large base load, chilled water usually deserves serious consideration. If the brief is a multi-tenant office with room-level control and a constrained plant area, VRF often leads. The recommendation should state the assumptions and the lifecycle cost, not just the equipment schedule.`,
    takeaways: [
      'VRF suits distributed, part-load-heavy loads with constrained plant space.',
      'Chilled water suits large central loads, long routes and existing plant teams.',
      'Compare lifecycle cost, refrigerant charge, access and redundancy — not only first cost.',
    ],
    faqs: [
      {
        question: 'Is VRF more energy efficient than chilled water?',
        answer:
          'It depends on the load profile, climate, part-load performance and installation quality. Compare annual energy at the actual operating hours, not a single full-load efficiency figure.',
      },
      {
        question: 'Can a VRF system serve a large office tower?',
        answer:
          'Yes, within the manufacturer’s limits for capacity, pipe length and height. Very tall or very large projects may still favour chilled water because of refrigerant charge, shaft space and maintenance.',
      },
      {
        question: 'Which system is cheaper to maintain?',
        answer:
          'VRF has many distributed indoor units and refrigerant leak checks. Chilled water has centralized plant but adds pumps, water treatment and balancing. The local team and access usually decide the real cost.',
      },
    ],
    relatedServices: ['vrf-systems', 'chilled-water', 'bms'],
    seoTitle: 'VRF vs chilled water for offices: a practical selection guide',
    seoDescription:
      'Compare VRF and chilled-water HVAC for offices by load profile, part-load efficiency, refrigerant charge, plant space, maintenance and lifecycle cost.',
  },
  {
    id: 'post-amc-visit',
    slug: 'what-an-amc-visit-should-include',
    title: 'What an AMC visit should actually include',
    excerpt:
      'A maintenance contract is not a filter wash and a signature. The visit should produce measurements, photographs and a clear list of what changed.',
    answer:
      'A proper AMC visit covers filters and coils, drain and insulation, refrigerant pressures or temperatures, electrical connections, controls and safety devices, plus a written report with readings. The frequency should follow equipment type, environment and manufacturer guidance. Parts, refrigerant, response times and exclusions must be stated in the contract, not discovered at the first breakdown.',
    category: 'Maintenance',
    tags: ['AMC', 'preventive maintenance', 'service report', 'HVAC maintenance'],
    authorName: 'Coolvane engineering desk',
    authorRole: 'Service and commissioning team',
    publishedAt: '2026-10-14',
    updatedAt: '2026-10-14',
    readingMinutes: 6,
    heroPlate: 'CV-AMC · visit record',
    featured: false,
    published: true,
    body: `## The short answer

An annual maintenance contract should buy scheduled, documented work that reduces failure risk and keeps efficiency from drifting. A visit that only washes a filter and resets a trip is attendance, not maintenance. The report should let an owner compare this visit with the last one.

## The minimum visit scope

For a split or cassette system, a useful visit includes:

- Filter removal, cleaning and condition check.
- Evaporator and condenser coil inspection; cleaning where accessible.
- Drain pan, drain line and insulation check.
- Supply and return air temperature readings.
- Refrigerant pressure or temperature readings, compared with the previous visit.
- Electrical terminals, contactor and capacitor inspection.
- Fan blade, motor and bearing check.
- Controls, setpoint and safety-device test.
- Outdoor unit clearance and mounting check.
- Photographs of the coil, drain and nameplate.

For VRF, chilled water and precision systems, add the manufacturer’s specific checks, water treatment, pump and valve inspection, BMS alarm review and redundancy test.

## Frequency is not a marketing number

Two visits a year may be right for a clean residential unit. A restaurant, a dusty industrial bay or a 24-hour data room needs a different schedule. The contract should state the visit frequency and the scope per visit, not just an annual price. Manufacturer warranties may also require documented servicing.

## What the report should show

A report with no measurements is hard to audit. Ask for the actual readings, the date and time, the technician’s name, the unit identifier and the actions taken. A photo of a clean coil is useful; a photo with the before condition and the reading is better.

> If the report says “serviced and found normal” every time, it is not a maintenance record. It is a receipt.

## Parts, refrigerant and exclusions

Check what is included. Many low-cost contracts cover labour only and exclude refrigerant, compressors, PCBs, motors and consumables. That is not automatically bad, but the owner should know the cap and the approval process. A contract should also state the response time, the escalation path and whether after-hours calls are included.

## How to compare two AMC quotes

Put the offers side by side: number of visits, scope per visit, parts allowance, refrigerant allowance, response time, reporting, exclusions, renewal terms and the cost of a breakdown call. The lowest annual price can be the most expensive contract if the first compressor repair is excluded.

## A simple owner checklist

1. Is the equipment list attached?
2. Is the scope written per equipment type?
3. Are readings and photos required?
4. Are parts and refrigerant capped or excluded?
5. Is the response time measured from call logging to arrival?
6. Is there a named escalation contact?
7. Can the contract be cancelled without an automatic renewal trap?

A maintenance plan is only premium when the paperwork is as serious as the visit.`,
    takeaways: [
      'A visit should produce measurements and photographs, not just a signature.',
      'Match frequency to equipment, environment and manufacturer requirements.',
      'Read the parts, refrigerant and response-time exclusions before comparing price.',
    ],
    faqs: [
      {
        question: 'How often should a split AC be serviced?',
        answer:
          'A clean residential installation may need two visits a year; a dusty or high-use site may need more. Follow the manufacturer’s schedule and the actual operating environment.',
      },
      {
        question: 'Does an AMC include refrigerant?',
        answer:
          'Only if the contract says so. Many plans exclude refrigerant or cap the included amount. Check the clause and the leak-repair policy before signing.',
      },
      {
        question: 'What is a reasonable AMC response time?',
        answer:
          'For contracted commercial plant, a four-hour arrival inside city limits is a common target, subject to parts and access. The contract should define when the clock starts.',
      },
    ],
    relatedServices: ['amc', 'ac-servicing', 'chiller-maintenance'],
    seoTitle: 'What an AC AMC visit should include: scope, report and exclusions',
    seoDescription:
      'A practical checklist for HVAC annual maintenance contracts: visit scope, frequency, readings, photographs, parts, refrigerant, response times and exclusions.',
  },
  {
    id: 'post-refrigerants',
    slug: 'r32-r410a-r454b-building-owner-guide',
    title: 'R-32, R-410A and R-454B: a building owner’s guide to the refrigerant transition',
    excerpt:
      'Refrigerant names are appearing in tenders and service quotes. Here is what the numbers mean, what changes on site, and what not to do.',
    answer:
      'R-410A is a widely used HFC blend with a global warming potential of about 2,088. R-32 is a single-component HFC with a GWP of about 675 and mild flammability classified as A2L. R-454B is an A2L blend with a GWP of about 466. Refrigerants are not interchangeable: equipment, lubricants, components, leak detection and safety procedures must be designed for the specific refrigerant.',
    category: 'Refrigerants',
    tags: ['R-32', 'R-410A', 'R-454B', 'A2L', 'refrigerant transition'],
    authorName: 'Coolvane engineering desk',
    authorRole: 'Technical standards team',
    publishedAt: '2026-09-30',
    updatedAt: '2026-10-08',
    readingMinutes: 8,
    heroPlate: 'CV-REF · GWP 675 / 2088 / 466',
    featured: false,
    published: true,
    body: `## The short answer

The HVAC industry is moving toward refrigerants with lower global warming potential. The three names a building owner is most likely to see are R-410A, R-32 and R-454B. They operate at different pressures and have different safety classifications, so the equipment, controls, service tools and leak procedures must match the nameplate.

## The numbers that matter

- **R-410A** — HFC blend, approximate GWP 2,088, safety class A1.
- **R-32** — single-component HFC, approximate GWP 675, safety class A2L.
- **R-454B** — HFC blend, approximate GWP 466, safety class A2L.

GWP compares the climate impact of a refrigerant with carbon dioxide over a defined period. A lower GWP reduces the impact of a leak, but it does not make a system efficient by itself. Charge size, leak tightness, energy use and end-of-life recovery still matter.

## What A2L means in practice

A2L refrigerants are classified as mildly flammable. They are not a return to the flammable refrigerants of the past, but they do require proper design and handling: ventilation, ignition-source control, leak detection where required, marked components and technicians trained for the refrigerant. The installation standard and manufacturer’s instructions govern the details.

## What changes on site

- Service gauges, hoses and recovery equipment must be rated for the refrigerant.
- Leak detection and evacuation procedures must follow the safety class.
- Pipe sizing, charge limits and ventilation requirements may differ.
- Components such as pressure switches and sensors are not automatically interchangeable.
- Labels and handover documentation must state the actual refrigerant and charge.

## What not to do

Do not top up an R-410A system with R-32 or R-454B. Do not assume a lower-GWP refrigerant is a drop-in replacement. Do not vent refrigerant during service. Do not mix lubricants or use a recovery cylinder for a different refrigerant without following the cylinder and local rules.

> The nameplate is the instruction. If a service technician cannot tell you which refrigerant the system holds and what safety class it is, stop before the manifold goes on.

## What to ask in a tender

1. Which refrigerant does the proposed equipment use?
2. What is the charge per circuit and the total site charge?
3. What leak-detection and ventilation measures are included?
4. Are the service team and tools certified for that refrigerant?
5. What is the recovery and end-of-life plan?
6. How does the refrigerant choice affect energy use and maintenance cost?

## The owner’s takeaway

The transition is not only an equipment specification. It changes training, tools, spares, labels, leak procedures and the service contract. A lower-GWP system installed without those controls is not a better system; it is a new risk with a greener label.`,
    takeaways: [
      'R-32 and R-454B are A2L refrigerants; R-410A is A1.',
      'Lower GWP does not mean drop-in compatibility.',
      'Service tools, leak procedures and technician training must match the nameplate.',
    ],
    faqs: [
      {
        question: 'Can R-32 be used in an R-410A system?',
        answer:
          'No. R-32 is not a drop-in replacement for R-410A. Equipment, pressures, components and safety requirements differ, and the system must be designed for the refrigerant on its nameplate.',
      },
      {
        question: 'Is R-32 flammable?',
        answer:
          'R-32 is classified A2L, meaning mildly flammable. It requires appropriate design, handling, ventilation and leak procedures under the applicable standard and manufacturer instructions.',
      },
      {
        question: 'Which refrigerant has the lowest GWP?',
        answer:
          'Of the three discussed here, R-454B has the lowest approximate GWP at 466, followed by R-32 at 675 and R-410A at about 2,088. System efficiency and leak tightness still matter.',
      },
    ],
    relatedServices: ['split-ac-installation', 'vrf-systems', 'gas-charging'],
    seoTitle: 'R-32 vs R-410A vs R-454B: GWP, A2L safety and service guide',
    seoDescription:
      'A building owner’s guide to R-32, R-410A and R-454B: GWP, A2L classification, service changes, leak procedures and tender questions.',
  },
  {
    id: 'post-commissioning-file',
    slug: 'what-belongs-in-an-hvac-commissioning-file',
    title: 'What belongs in an HVAC commissioning file',
    excerpt:
      'The handover file is the building’s first maintenance manual. If it is missing, every future service visit starts from zero.',
    answer:
      'A complete HVAC commissioning file includes the approved load calculation, equipment schedule, as-built drawings, test and balancing records, electrical and controls data, refrigerant charge, warranty documents and the operations and maintenance manual. Each record should identify the equipment, the measured value and the design value so a future engineer can compare performance.',
    category: 'Commissioning',
    tags: ['commissioning', 'handover', 'O&M', 'documentation'],
    authorName: 'Coolvane engineering desk',
    authorRole: 'Commissioning team',
    publishedAt: '2026-09-16',
    updatedAt: '2026-09-16',
    readingMinutes: 7,
    heroPlate: 'CV-FILE · 6 records',
    featured: false,
    published: true,
    body: `## The short answer

Commissioning is the process of proving that the installed system performs as designed. The file is the evidence. It should be assembled during the job, not reconstructed after the first breakdown. A useful file answers three questions for every system: what was designed, what was installed, and what was measured.

## The six core records

### 1. Load calculation and design basis

The approved room-by-room load calculation, outdoor and indoor design conditions, fresh-air rate and the assumptions behind them. Without this, a future change has no baseline.

### 2. Equipment schedule

Model, capacity, refrigerant, electrical data, location, serial number and the accessories fitted. The schedule should match the nameplates, not the original quotation.

### 3. As-built drawings

Pipe routes, duct routes, riser and shaft penetrations, valve and damper locations, access panels and outdoor-unit positions. Red-line the installation and issue a clean as-built set.

### 4. Test and balance record

Airflow at each terminal, fan speed, static pressure, water flow where applicable, supply and return temperatures, and the balancing method. Record design versus measured values.

### 5. Electrical and controls record

Supply voltage, protection settings, control sequence, BMS points list, alarm schedule, setpoints and access credentials. A controls handover without a points list is not a handover.

### 6. O&M manual and warranty

Manufacturer manuals, service intervals, spare-parts list, refrigerant log, warranty terms, emergency contacts and the signed completion certificate.

## What makes a record useful

A number with no context is not a record. State the unit, the location, the date, the instrument and the condition. “Delta-T 9.4 °C” is weaker than “AHU-02, 9.4 °C return-to-supply, 18 November, fan high, outdoor 33 °C”.

> The commissioning file should let an engineer who has never visited the building understand how it was designed to work — and what was actually measured.

## The owner’s handover checklist

1. Does the equipment schedule match the nameplates?
2. Are the as-built drawings marked and signed?
3. Are airflow and temperature readings recorded per terminal?
4. Is the refrigerant type and charge recorded per circuit?
5. Is there a controls points list and alarm schedule?
6. Are warranty, service contacts and spare parts documented?
7. Was the client trained on the controls and isolation points?

## Why it matters commercially

A complete file shortens troubleshooting, protects warranty claims and makes a maintenance contract measurable. It also supports a future retrofit or lease handover. The cost of assembling it during commissioning is small compared with the cost of reconstructing a plant schedule from photographs three years later.`,
    takeaways: [
      'A commissioning file proves design, installation and measured performance.',
      'Record design versus measured values for every terminal and system.',
      'As-builts, controls points and refrigerant logs are not optional extras.',
    ],
    faqs: [
      {
        question: 'Who should prepare the commissioning file?',
        answer:
          'The installing contractor normally assembles it, with design inputs from the consultant and sign-off from the owner or their representative. The final file should be issued digitally and in a controlled revision.',
      },
      {
        question: 'Is a test and balance report part of commissioning?',
        answer:
          'Yes. Air and water balancing records are core commissioning evidence. They should show design and measured values, not only a final pass/fail statement.',
      },
      {
        question: 'How long should commissioning records be kept?',
        answer:
          'Keep them for the life of the equipment, and at least through the warranty and any lease or sale due-diligence period. Digital copies should be backed up and version-controlled.',
      },
    ],
    relatedServices: ['ducting', 'vrf-systems', 'bms', 'amc'],
    seoTitle: 'HVAC commissioning file: the six records every handover needs',
    seoDescription:
      'What belongs in an HVAC commissioning file: load calculation, equipment schedule, as-builts, test and balance, controls, O&M and warranty records.',
  },
]

export const products: SiteProduct[] = [
  {
    id: 'high-wall-inverter',
    slug: 'high-wall-inverter-split',
    name: 'High-wall inverter split system',
    category: 'Residential',
    brand: 'Open specification',
    capacity: '1.5 – 2.2 TR',
    priceFrom: 'From $480',
    priceNote: 'installation scope, per indoor unit',
    summary:
      'A quiet inverter split for bedrooms and small offices, selected on a room load and installed with a checked drain, electrical point and service access.',
    description:
      'The common residential choice when a ceiling void is not available. We specify the indoor and outdoor unit against the measured room load, confirm the pipe route and drain slope before opening the wall, and commission with recorded supply and return temperatures. Equipment brand is selected from the approved list for the budget, refrigerant and service network.',
    features: [
      'Room-by-room load selection',
      'Inverter compressor with part-load modulation',
      'Drain slope and insulation checked before handover',
      'Wall penetration sealed and finished',
      'Commissioning record with delta-T',
    ],
    specs: [
      { label: 'Nominal capacity', value: '1.5 – 2.2 TR' },
      { label: 'Refrigerant', value: 'R-32 or R-410A by model' },
      { label: 'Indoor sound', value: 'Model-dependent, checked at selection' },
      { label: 'Typical installation', value: '4 – 8 hours' },
      { label: 'Workmanship warranty', value: '3 years' },
    ],
    applications: ['Bedrooms', 'Home offices', 'Small clinics', 'Retail cabins'],
    tags: ['split AC', 'inverter', 'residential'],
    plate: 'CV-PRD-01 · wall mount',
    featured: true,
    published: true,
  },
  {
    id: 'cassette-system',
    slug: 'ceiling-cassette-system',
    name: 'Ceiling cassette system',
    category: 'Residential',
    brand: 'Open specification',
    capacity: '1.5 – 5.0 TR',
    priceFrom: 'Quoted per room',
    priceNote: 'equipment, installation and commissioning',
    summary:
      'A four-way cassette for rooms where wall space is limited and a ceiling void can take the unit, drain pump and service access.',
    description:
      'Cassette units distribute air from the ceiling and keep the wall clear. The selection depends on ceiling height, throw, fresh-air provision and access for coil cleaning. We check the void depth and drain pump route before approving the location, and balance the louvres to avoid dumping air directly onto occupants.',
    features: [
      'Four-way or two-way airflow configuration',
      'Ceiling void and drain pump survey',
      'Louvre balancing at handover',
      'Access panels for coil and filter service',
      'Condensate test under load',
    ],
    specs: [
      { label: 'Capacity range', value: '1.5 – 5.0 TR' },
      { label: 'Minimum void', value: 'Survey-dependent' },
      { label: 'Drain', value: 'Gravity or pump by route' },
      { label: 'Typical installation', value: '1 – 2 days' },
      { label: 'Workmanship warranty', value: '3 years' },
    ],
    applications: ['Living rooms', 'Offices', 'Clinics', 'Showrooms'],
    tags: ['cassette', 'ceiling', 'residential'],
    plate: 'CV-PRD-02 · four-way throw',
    featured: false,
    published: true,
  },
  {
    id: 'ducted-residential-package',
    slug: 'ducted-residential-system',
    name: 'Ducted residential system',
    category: 'Residential',
    brand: 'Open specification',
    capacity: '3 – 20 TR',
    priceFrom: 'Quoted after survey',
    priceNote: 'design, ductwork, equipment and commissioning',
    summary:
      'Concealed ducted cooling for a whole home, with room-by-room airflow and a designed return path rather than a single oversized indoor unit.',
    description:
      'A ducted system can cool several rooms from concealed plant, but it only works when the duct layout, static pressure and return path are designed together. We calculate room loads, size the trunk and branches, specify acoustic treatment and commission airflow at every diffuser. The handover includes a balancing sheet and access-panel layout.',
    features: [
      'Room-by-room load and airflow design',
      'GI, PIR or flexible duct as the route requires',
      'Acoustic treatment at plant and bedrooms',
      'Balancing dampers at each branch',
      'Access panels and as-built duct layout',
    ],
    specs: [
      { label: 'Capacity range', value: '3 – 20 TR' },
      { label: 'External static', value: 'Designed per route' },
      { label: 'Filtration', value: 'MERV 8 or better by brief' },
      { label: 'Typical installation', value: '5 – 10 days' },
      { label: 'Handover', value: 'Balancing sheet + as-builts' },
    ],
    applications: ['Apartments', 'Villas', 'Home offices', 'Small clinics'],
    tags: ['ducted', 'whole home', 'airflow'],
    plate: 'CV-PRD-03 · concealed plant',
    featured: false,
    published: true,
  },
  {
    id: 'vrf-heat-recovery',
    slug: 'vrf-heat-recovery-system',
    name: 'VRF heat-recovery system',
    category: 'Commercial',
    brand: 'Open specification',
    capacity: '8 – 1,200 TR',
    priceFrom: 'Quoted per project',
    priceNote: 'design, equipment, installation and BMS',
    summary:
      'A multi-room VRF system that can move heat from cooling zones to zones that need it, with diversity and part-load performance designed for the actual occupancy.',
    description:
      'VRF is a strong fit for offices, clinics and mixed-use floors with varied occupancy. Heat recovery adds a three-pipe branch selector so simultaneous heating and cooling can share energy. We design the outdoor bank, pipe routes, diversity, acoustic limits and BMS points as one system, then commission each indoor unit and the changeover sequence.',
    features: [
      'Heat-recovery branch selectors',
      'Room-level metering and control',
      'Diversity and part-load design',
      'Pipe length and height verification',
      'BMS points list and alarm schedule',
    ],
    specs: [
      { label: 'Capacity range', value: '8 – 1,200 TR' },
      { label: 'Refrigerant', value: 'R-410A or R-32 by platform' },
      { label: 'Diversity', value: 'Designed, not assumed' },
      { label: 'Typical installation', value: '3 – 8 weeks' },
      { label: 'Controls', value: 'BACnet / Modbus gateway' },
    ],
    applications: ['Offices', 'Clinics', 'Hotels', 'Mixed-use floors'],
    tags: ['VRF', 'heat recovery', 'commercial'],
    plate: 'CV-PRD-04 · three-pipe',
    featured: true,
    published: true,
  },
  {
    id: 'air-cooled-chiller',
    slug: 'air-cooled-chiller-plant',
    name: 'Air-cooled chiller plant',
    category: 'Industrial',
    brand: 'Open specification',
    capacity: '60 – 500 TR',
    priceFrom: 'Quoted per plant',
    priceNote: 'plant, hydraulics, controls and commissioning',
    summary:
      'A central chilled-water plant for larger buildings, with headered pumps, water treatment and a controls sequence that can prove redundancy.',
    description:
      'An air-cooled chiller plant is often the right answer when the load is centralized and the building can take the outdoor plant. We size the chillers against the block load, design N+1 changeover, specify primary and secondary pumping, and commission the sequence with a witnessed failure test. The handover includes water-treatment records and a kW/TR baseline.',
    features: [
      'Block-load and diversity calculation',
      'N+1 chiller and pump arrangement',
      'Primary / secondary hydraulics',
      'Water treatment and strainer schedule',
      'Witnessed changeover and kW/TR baseline',
    ],
    specs: [
      { label: 'Capacity range', value: '60 – 500 TR' },
      { label: 'Plant', value: 'Air-cooled screw or scroll' },
      { label: 'Redundancy', value: 'N+1 by brief' },
      { label: 'Typical installation', value: '6 – 16 weeks' },
      { label: 'Handover', value: 'O&M file + water treatment log' },
    ],
    applications: ['Office towers', 'Hotels', 'Hospitals', 'Industrial plants'],
    tags: ['chiller', 'chilled water', 'central plant'],
    plate: 'CV-PRD-05 · central plant',
    featured: false,
    published: true,
  },
  {
    id: 'precision-cooling',
    slug: 'precision-cooling-unit',
    name: 'Precision cooling unit',
    category: 'Industrial',
    brand: 'Open specification',
    capacity: '5 – 220 TR',
    priceFrom: 'Quoted per room',
    priceNote: 'unit, redundancy and controls',
    summary:
      'Close-control cooling for server rooms, labs and cleanrooms where temperature and humidity limits are written into the operating procedure.',
    description:
      'Precision units are selected for sensible heat ratio, airflow, redundancy and controls, not just tonnage. We survey the room heat gain, define the alarm and escalation logic, and commission the units with a simulated failure so the standby sequence is proven. Humidity control, condensate and filter access are part of the design.',
    features: [
      'Sensible heat ratio and airflow selection',
      'N+1 unit and controls sequence',
      'Temperature and humidity alarm logic',
      'Simulated failure commissioning',
      'Filter, humidifier and drain access',
    ],
    specs: [
      { label: 'Capacity range', value: '5 – 220 TR' },
      { label: 'Control', value: '±0.5 °C by application' },
      { label: 'Humidity', value: 'Designed to room brief' },
      { label: 'Redundancy', value: 'N+1 or N+2' },
      { label: 'Typical installation', value: '6 – 14 weeks' },
    ],
    applications: ['Server rooms', 'Cleanrooms', 'Laboratories', 'Data halls'],
    tags: ['precision cooling', 'cleanroom', 'data centre'],
    plate: 'CV-PRD-06 · close control',
    featured: false,
    published: true,
  },
  {
    id: 'cold-room-package',
    slug: 'cold-room-package',
    name: 'Cold room package',
    category: 'Industrial',
    brand: 'Open specification',
    capacity: '-25 to +8 °C',
    priceFrom: 'Quoted after load survey',
    priceNote: 'panels, refrigeration, controls and alarm',
    summary:
      'A walk-in cold room or blast-freeze package designed around product load, door traffic and a proven standby changeover.',
    description:
      'Cold-room performance is decided by the product load, insulation, door openings and defrost strategy. We calculate the refrigeration duty, specify panel thickness and door hardware, and commission the standby changeover with product inside where the brief allows. Alarms are routed to a named duty contact with an escalation path.',
    features: [
      'Product-load and door-traffic calculation',
      '100 mm PIR panels and sealed joints',
      'Independent defrost schedules',
      'Standby changeover witness test',
      'Alarm escalation to a named contact',
    ],
    specs: [
      { label: 'Temperature range', value: '-25 to +8 °C' },
      { label: 'Panel', value: '100 mm PIR by application' },
      { label: 'Refrigeration', value: 'Scroll or semi-hermetic' },
      { label: 'Typical installation', value: '4 – 10 weeks' },
      { label: 'Handover', value: 'Pull-down + alarm test' },
    ],
    applications: ['Food storage', 'Pharma', 'Cloud kitchens', 'Distribution'],
    tags: ['cold room', 'refrigeration', 'food safety'],
    plate: 'CV-PRD-07 · -18 °C hold',
    featured: true,
    published: true,
  },
  {
    id: 'kitchen-ventilation',
    slug: 'commercial-kitchen-ventilation',
    name: 'Commercial kitchen ventilation',
    category: 'Commercial',
    brand: 'Open specification',
    capacity: '2,000 – 20,000 CFM',
    priceFrom: 'Quoted per hood line',
    priceNote: 'hood, duct, fan, UV and commissioning',
    summary:
      'A hood-to-fan package that captures grease and heat at the source, with make-up air and a cleaning route that the kitchen team can actually maintain.',
    description:
      'Kitchen ventilation is a capture problem before it is a fan problem. We design the hood over the actual cooking line, calculate exhaust and make-up air, specify grease filtration and access, and commission the balance with the kitchen in operation. Fire damper, cleaning access and roof discharge are part of the package.',
    features: [
      'Cooking-line capture and hood sizing',
      'Exhaust and make-up air balance',
      'Grease filters, UV option and access',
      'Fire damper and cleaning schedule',
      'Commissioning with the kitchen running',
    ],
    specs: [
      { label: 'Exhaust range', value: '2,000 – 20,000 CFM' },
      { label: 'Hood', value: 'SS 304 by brief' },
      { label: 'Filtration', value: 'Baffle + UV optional' },
      { label: 'Typical installation', value: '2 – 5 weeks' },
      { label: 'Handover', value: 'Air balance + cleaning guide' },
    ],
    applications: ['Restaurants', 'Cloud kitchens', 'Hotels', 'Food courts'],
    tags: ['kitchen', 'ventilation', 'exhaust'],
    plate: 'CV-PRD-08 · capture / exhaust',
    featured: false,
    published: true,
  },
]
