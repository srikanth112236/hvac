import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const categories = [
  {
    title: 'HVAC, climate and energy',
    change: 'Rebrand and replace HVAC service copy. Existing service catalogue, equipment records, AMC, dispatch, jobs, quotes and invoices already fit.',
    items: [
      ['Residential HVAC contractor', 100],
      ['Commercial HVAC contractor', 100],
      ['HVAC maintenance and AMC provider', 100],
      ['Emergency HVAC repair company', 100],
      ['VRF / VRV specialist', 99],
      ['Chilled-water and chiller service', 98],
      ['Duct design and fabrication', 96],
      ['Indoor air quality and UV service', 96],
      ['Ventilation and exhaust contractor', 96],
      ['Commercial refrigeration contractor', 94],
      ['Cold-room design and service', 93],
      ['Kitchen exhaust cleaning', 93],
      ['Building automation and BMS integrator', 88],
      ['Energy audit and retrofit contractor', 88],
      ['Data-centre cooling specialist', 88],
      ['Cleanroom HVAC contractor', 87],
      ['Geothermal heat-pump installer', 84],
      ['Plumbing and HVAC combined contractor', 94],
      ['Mechanical engineering consultancy', 84],
      ['Facilities energy-management provider', 90],
      ['Solar thermal installer', 80],
      ['Generator and standby-power service', 86],
      ['HVAC equipment distributor with service arm', 85],
      ['Refrigerant recovery and compliance service', 93],
    ],
  },
  {
    title: 'Trades and field service',
    change: 'Keep dispatch, customer file, quotes and invoices. Swap service catalogue and job checklists; terminology only for most trades.',
    items: [
      ['Electrical contractor', 92],
      ['Plumbing contractor', 92],
      ['Appliance repair company', 96],
      ['Locksmith', 94],
      ['Garage-door installation and repair', 93],
      ['Pest-control company', 89],
      ['Pool and spa service', 90],
      ['Landscaping contractor', 87],
      ['Tree care and arborist', 84],
      ['Fencing contractor', 82],
      ['Painting contractor', 84],
      ['Flooring contractor', 80],
      ['Handyman service', 93],
      ['Window and door installer', 84],
      ['Gutter cleaning service', 92],
      ['Pressure-washing service', 91],
      ['Junk-removal service', 88],
      ['Septic-tank service', 87],
      ['Water-treatment installer', 88],
      ['Chimney sweep', 91],
      ['Glass and glazing repair', 84],
      ['Fire and security systems installer', 86],
      ['CCTV and access-control installer', 87],
      ['Satellite and antenna installer', 84],
      ['Mobile mechanic', 84],
      ['Tire-service mobile unit', 88],
      ['Towing and roadside assistance', 82],
      ['Restoration and water-damage company', 87],
      ['Mold-remediation company', 83],
    ],
  },
  {
    title: 'Construction, property and real estate',
    change: 'Use jobs as projects and quotes as estimates. Add phases, milestones and retention fields for heavier construction; CRM and billing already fit.',
    items: [
      ['General contractor', 80],
      ['Home builder', 76],
      ['Remodeling contractor', 82],
      ['Kitchen and bath remodeler', 81],
      ['Concrete contractor', 73],
      ['Masonry contractor', 71],
      ['Steel-erection contractor', 67],
      ['Carpentry contractor', 78],
      ['Drywall contractor', 75],
      ['Insulation contractor', 83],
      ['Asphalt and paving contractor', 74],
      ['Excavation contractor', 68],
      ['Demolition contractor', 68],
      ['Scaffolding contractor', 71],
      ['Crane and rigging company', 67],
      ['Land-surveying company', 64],
      ['Architecture studio', 68],
      ['Interior-design studio', 65],
      ['Property-management company', 87],
      ['HOA management company', 79],
      ['Vacation-rental manager', 77],
      ['Real-estate agency', 64],
      ['Home-inspection company', 87],
      ['Appraisal company', 72],
      ['Moving company', 80],
      ['Storage-facility operator', 62],
    ],
  },
  {
    title: 'Facilities, cleaning and maintenance',
    change: 'Reuse customer files, locations, visits, checklists, invoicing and reminders. Replace HVAC assets with the relevant asset or location model.',
    items: [
      ['Commercial cleaning company', 94],
      ['Janitorial-services company', 94],
      ['Window-cleaning company', 91],
      ['Carpet and upholstery cleaning', 89],
      ['Facility-management company', 91],
      ['Building-maintenance company', 90],
      ['Grounds and groundskeeping service', 87],
      ['Snow-removal contractor', 86],
      ['Waste-collection company', 68],
      ['Recycling service', 63],
      ['Laundry and linen service', 63],
      ['Water-cooler and dispenser service', 82],
      ['Signage maintenance company', 80],
      ['Parking-management company', 72],
      ['Security-guard company', 77],
      ['Fire-extinguisher service', 87],
      ['Elevator maintenance company', 80],
      ['Solar O&M provider', 84],
      ['Telecom-site maintenance', 78],
      ['Generator maintenance company', 84],
      ['Disinfection and sanitisation service', 82],
      ['Bird and wildlife control', 82],
      ['Matting and entrance-service provider', 72],
      ['Commercial-kitchen equipment service', 92],
      ['Laundromat equipment service', 88],
    ],
  },
  {
    title: 'Healthcare, care and wellbeing',
    change: 'Job records become care visits or appointments; add consent, care-plan and practitioner fields. CRM, scheduling, reminders, invoices and portal remain reusable.',
    items: [
      ['Home healthcare agency', 82],
      ['Home nursing service', 80],
      ['Physiotherapy clinic', 80],
      ['Chiropractic clinic', 72],
      ['Dental practice', 68],
      ['Veterinary clinic', 72],
      ['Mobile veterinary service', 78],
      ['Mobile phlebotomy service', 80],
      ['Medical-equipment servicing company', 84],
      ['Assisted-living facility', 72],
      ['Senior-care provider', 80],
      ['Hospice provider', 74],
      ['Mental-health clinic', 68],
      ['Optometry practice', 67],
      ['Podiatry practice', 72],
      ['Dietitian practice', 77],
      ['Occupational-therapy practice', 77],
      ['Speech-therapy practice', 77],
      ['Doula and maternity support', 72],
      ['Pet-grooming service', 87],
      ['Pet-sitting service', 84],
      ['Dog-walking service', 82],
      ['Pet-training service', 82],
      ['Mobile wellness clinic', 76],
      ['Massage therapy practice', 73],
    ],
  },
  {
    title: 'Professional and business services',
    change: 'Remove equipment/AMC language. Use customers, engagements/jobs, proposals/quotations, invoices, reminders and document portal for most firms.',
    items: [
      ['Management consultancy', 82],
      ['Accounting firm', 78],
      ['Bookkeeping service', 82],
      ['Tax-preparation practice', 75],
      ['Law firm', 68],
      ['Marketing agency', 78],
      ['SEO agency', 80],
      ['Web-design studio', 78],
      ['Software-development agency', 73],
      ['IT support and MSP', 87],
      ['Cybersecurity consultancy', 80],
      ['HR consultancy', 78],
      ['Recruitment agency', 75],
      ['Corporate training provider', 80],
      ['Business coaching practice', 84],
      ['Business brokerage', 63],
      ['Translation agency', 73],
      ['Grant-writing consultancy', 75],
      ['Engineering consultancy', 78],
      ['Compliance consultancy', 78],
      ['Notary and document service', 77],
      ['Market-research firm', 68],
      ['Public-relations agency', 75],
      ['Photography studio', 80],
      ['Videography studio', 78],
      ['Copywriting service', 80],
      ['Virtual-assistant agency', 83],
      ['Project-management consultancy', 80],
      ['Architecture practice', 68],
      ['Surveying practice', 64],
    ],
  },
  {
    title: 'Financial, insurance and compliance',
    change: 'Reuse CRM, document portal, reminders, invoices and audit trail. Add policy, case or compliance fields; regulated workflows need review.',
    items: [
      ['Insurance agency', 73],
      ['Insurance broker', 65],
      ['Financial-advisory firm', 70],
      ['Mortgage broker', 63],
      ['Equipment-leasing company', 68],
      ['Debt-collection agency', 63],
      ['Credit-repair service', 65],
      ['Payroll-service bureau', 85],
      ['Professional-employer organisation', 80],
      ['Warranty provider', 78],
      ['Home-inspection company', 87],
      ['Property-appraisal firm', 73],
      ['Title and escrow company', 63],
      ['Fraud-investigation service', 68],
      ['Compliance-audit firm', 78],
      ['Risk-consulting firm', 75],
      ['Background-check service', 73],
      ['Relocation service', 80],
      ['Tax-lien service', 58],
      ['Invoice-factoring company', 62],
    ],
  },
  {
    title: 'Education, training and childcare',
    change: 'Use customers as learners/parents, appointments as classes, jobs as courses or sessions, invoices and reminders as-is. Add enrolment fields.',
    items: [
      ['Tutoring company', 78],
      ['Test-preparation centre', 75],
      ['Music school', 82],
      ['Driving school', 84],
      ['Trade school', 78],
      ['Corporate-training company', 80],
      ['First-aid training provider', 84],
      ['Fitness-coaching business', 82],
      ['Yoga studio', 75],
      ['Dance studio', 78],
      ['Martial-arts school', 78],
      ['Art school', 78],
      ['Language school', 73],
      ['Online-course creator', 63],
      ['Childcare centre', 68],
      ['Preschool', 68],
      ['After-school programme', 73],
      ['Summer camp', 73],
      ['Tutoring marketplace', 60],
      ['Learning-management SaaS', 45],
    ],
  },
  {
    title: 'Events, hospitality and venues',
    change: 'Use jobs as events/bookings, staff as crew, quotes/invoices and reminders. Add event dates, venue and resource fields; pure hospitality needs POS integration.',
    items: [
      ['Wedding-planning company', 78],
      ['Event-rental company', 84],
      ['Catering company', 75],
      ['DJ and entertainment service', 82],
      ['Event photographer', 80],
      ['Florist', 75],
      ['Event venue', 68],
      ['Hotel', 58],
      ['Bed and breakfast', 63],
      ['Restaurant', 42],
      ['Food-truck operator', 48],
      ['Bar or lounge', 42],
      ['Tour operator', 68],
      ['Travel agency', 73],
      ['Corporate-events agency', 78],
      ['AV-production company', 80],
      ['Event-staging company', 78],
      ['Event-security company', 75],
      ['Event-cleaning company', 87],
      ['Valet-parking service', 73],
    ],
  },
  {
    title: 'Agriculture, environment and field services',
    change: 'Use customers as farms/sites, equipment records for machinery, jobs for field visits, and invoices for seasonal work. Add crop/plot fields when needed.',
    items: [
      ['Landscaping company', 87],
      ['Irrigation contractor', 90],
      ['Arborist and tree service', 84],
      ['Agricultural pest control', 89],
      ['Soil-testing service', 78],
      ['Crop-consulting service', 73],
      ['Farm-equipment repair', 84],
      ['Mobile veterinary practice', 78],
      ['Greenhouse service', 75],
      ['Hydroponics installer', 68],
      ['Forestry service', 68],
      ['Environmental-testing lab', 78],
      ['Water-well service', 84],
      ['Septic service', 87],
      ['Solar-farm O&M', 80],
      ['Wind-turbine service', 73],
      ['Conservation contractor', 63],
      ['Wildlife-control service', 82],
      ['Beekeeping service', 73],
      ['Ranch-management service', 68],
    ],
  },
  {
    title: 'Industrial, equipment and logistics',
    change: 'Strong reuse of equipment, jobs, checklists, parts, expenses and invoices. Add asset hierarchy, serials and compliance fields for heavier industry.',
    items: [
      ['Industrial-equipment repair', 87],
      ['Industrial-maintenance contractor', 84],
      ['Welding and fabrication shop', 80],
      ['Precision machining shop', 72],
      ['Compressed-air service', 84],
      ['Pump-service company', 84],
      ['Generator-service company', 84],
      ['Forklift-service company', 87],
      ['Crane-service company', 74],
      ['Boiler-service company', 80],
      ['Industrial-HVAC contractor', 96],
      ['Commercial-refrigeration service', 94],
      ['Calibration service', 80],
      ['Non-destructive-testing service', 74],
      ['Safety-inspection service', 84],
      ['Industrial-cleaning service', 82],
      ['Tank-cleaning service', 74],
      ['Waste-oil collection', 68],
      ['Courier and delivery service', 68],
      ['Fleet-maintenance company', 87],
      ['Trailer-repair company', 82],
      ['Tire-service company', 87],
      ['Mobile-car-wash service', 82],
      ['Towing company', 80],
      ['Equipment-rental company', 78],
    ],
  },
  {
    title: 'Personal, lifestyle and home services',
    change: 'Use appointments, customer portal, reminders, invoices and coupons. Add practitioner, resource or package fields; no architecture change for most.',
    items: [
      ['Beauty salon', 63],
      ['Barber shop', 65],
      ['Spa', 68],
      ['Massage practice', 73],
      ['Nail salon', 63],
      ['Tattoo studio', 58],
      ['Personal-training business', 82],
      ['Nutritionist practice', 77],
      ['Life-coaching practice', 84],
      ['Pet-grooming business', 87],
      ['Pet-training business', 82],
      ['House-sitting service', 82],
      ['Errand and concierge service', 82],
      ['Home-organising service', 84],
      ['Residential-cleaning company', 94],
      ['Laundry pickup and delivery', 80],
      ['Tailoring and alterations', 68],
      ['Upholstery service', 78],
      ['Mobile car-detailing service', 87],
      ['Home-technology installer', 84],
    ],
  },
  {
    title: 'Public sector, nonprofit and community',
    change: 'Reuse cases, contacts, scheduling, documents, reminders and communication. Add grant, case, client or asset fields; procurement and accessibility review needed.',
    items: [
      ['Municipal-services contractor', 68],
      ['Utility contractor', 80],
      ['Public-works department', 70],
      ['Parks-maintenance service', 75],
      ['Waste-collection authority', 68],
      ['Housing-authority programme', 65],
      ['Nonprofit programme delivery', 73],
      ['Charity service coordination', 68],
      ['Volunteer coordination', 75],
      ['Community centre', 63],
      ['Church administration', 68],
      ['Membership association', 78],
      ['Housing cooperative', 63],
      ['Public-health programme', 63],
      ['Emergency-services support', 58],
      ['Disaster-relief coordination', 63],
      ['Social-services provider', 68],
      ['Grant-funded programme', 73],
      ['School-facilities team', 73],
      ['Public-transport operator', 48],
    ],
  },
  {
    title: 'Retail, manufacturing, software and other weaker fits',
    change: 'Requires a different product model: cart, SKU, fulfilment, manufacturing BOM or subscription billing. Do not position the current build as a native fit.',
    items: [
      ['E-commerce store', 35],
      ['Fashion retail', 27],
      ['Grocery retail', 32],
      ['Restaurant chain', 40],
      ['Hotel chain', 45],
      ['Airline', 20],
      ['Bank', 32],
      ['Insurance carrier', 38],
      ['SaaS product company', 45],
      ['Mobile-app company', 42],
      ['Game studio', 25],
      ['Media publisher', 42],
      ['Manufacturing plant', 47],
      ['Wholesale distributor', 52],
      ['Automotive dealer', 52],
      ['Real-estate listings marketplace', 46],
      ['Ride-hailing platform', 25],
      ['Food-delivery marketplace', 30],
      ['Streaming service', 15],
      ['Crypto exchange', 15],
    ],
  },
  {
    title: 'Emerging, technical and specialist services',
    change: 'Reuse CRM, jobs, assets, compliance checklists, quotes and billing. Add technical metadata or certification fields; terminology is the main change.',
    items: [
      ['EV-charger installation', 88],
      ['Battery-storage installer', 82],
      ['Solar-PV installer', 82],
      ['Smart-home integrator', 84],
      ['Network-cabling contractor', 82],
      ['Audio-visual integrator', 82],
      ['Telecom-infrastructure contractor', 80],
      ['Drone-inspection service', 78],
      ['3D-scanning and surveying', 72],
      ['Water-quality testing service', 76],
      ['Radon-testing and mitigation', 80],
      ['Asbestos-surveying service', 78],
      ['Lead-paint inspection', 78],
      ['Environmental-remediation contractor', 80],
      ['Laboratory-equipment service', 84],
      ['Medical-imaging service', 72],
      ['Pharmaceutical cold-chain service', 78],
      ['Food-safety inspection', 78],
      ['Brewery equipment service', 82],
      ['Commercial-kitchen design and service', 88],
    ],
  },
]

const bandFor = (fit) => {
  if (fit >= 96) return 'Native'
  if (fit >= 90) return 'High'
  if (fit >= 80) return 'Strong'
  if (fit >= 70) return 'Moderate'
  if (fit >= 55) return 'Significant'
  if (fit >= 40) return 'Heavy'
  return 'Poor'
}

const all = categories.flatMap((category) => category.items.map(([name, fit]) => ({ name, fit, category })))
const counts = all.reduce(
  (result, item) => {
    result[bandFor(item.fit)] += 1
    return result
  },
  { Native: 0, High: 0, Strong: 0, Moderate: 0, Significant: 0, Heavy: 0, Poor: 0 },
)
const best = [...all]
  .filter((item) => item.fit >= 90)
  .sort((a, b) => b.fit - a.fit || a.name.localeCompare(b.name))

const markdown = `# Industry-fit catalog

**Purpose:** show how many commercial niches can use the current Coolvane platform
(public site, customer portal, admin, CMS, CRM, dispatch, jobs, quotations,
invoices, expenses, payroll, reminders, newsletters, coupon engine, revision
engine, notifications, RBAC, audit trail, APIs and design tokens) and how much
change each one normally needs.

**Catalog size:** ${all.length} industries / niches  
**Native or high fit (90–100%):** ${counts.Native + counts.High}  
**Strong fit (80–89%):** ${counts.Strong}  
**Moderate fit (70–79%):** ${counts.Moderate}  
**Significant fit (55–69%):** ${counts.Significant}  
**Heavy rebuild (40–54%):** ${counts.Heavy}  
**Poor fit (below 40%):** ${counts.Poor}

The percentage is not a delivery estimate. It means:

- **96–100% — Native:** rebrand, rename services, seed domain content. No schema change for the core flow.
- **90–95% — High:** light terminology and one or two field changes; all core modules remain.
- **80–89% — Strong:** add a small object model (assets, visits, cases, packages) and adapt copy.
- **70–79% — Moderate:** add domain-specific records, checklists, compliance or portal fields; keep most CRM and billing.
- **55–69% — Significant:** replace part of the operating model; still cheaper than a new platform.
- **40–54% — Heavy:** major new catalogue, billing or fulfilment logic. Treat as a separate product line.
- **Below 40% — Poor:** the current platform is not the right starting point. Use a commerce, marketplace, manufacturing or industry-specific product.

## Best immediate targets

These are the strongest reuse candidates from the catalog:

${best
  .slice(0, 30)
  .map((item, index) => `${index + 1}. **${item.name}** — ${item.fit}% (${item.category.title})`)
  .join('\n')}

## What is already reusable across most of the catalog

- Public website, service pages and content-driven SEO
- Page registry, content studio and revision engine
- Brand, contact, theme tokens and billing identity
- Leads, customers, customer files and customer portal
- Service catalogue, appointments, dispatch and operational jobs
- Job checklists, parts, photos, signatures and reports
- Quotations, invoices, payments, discounts and PDFs
- Expenses, team register, payroll and recurring reminders
- Newsletter campaigns, audiences, suppression and coupons
- WebSocket notifications, audit log, RBAC, users and data health
- Shared APIs, SSR, media library, backups and retention tooling

## Catalog by industry group

${categories
  .map(
    (category) => `### ${category.title}

${category.change}

| Industry / niche | Fit | Band | Minimal change |
|---|---:|---|---|
${category.items
  .map(
    ([name, fit]) =>
      `| ${name} | ${fit}% | ${bandFor(fit)} | ${category.change}`,
  )
  .join('\n')}
`,
  )
  .join('\n')}

## Commercial guidance

### Use the current platform nearly as-is

HVAC, refrigeration, plumbing, electrical, appliance repair, locksmith,
garage doors, cleaning, landscaping, pest control, pool service, facilities
maintenance, fire safety, equipment service, generator service, IT support,
home inspection, property management, pet care, tutoring, training, events
rental and similar field-service businesses.

### Use after a focused vertical layer

Home healthcare, veterinary, legal, accounting, consulting, fitness, salons,
spas, childcare, venues, tour operators, utilities, nonprofits and public
programmes. The common change is a domain record such as patient, learner,
matter, client, member, policy or case; scheduling, billing and communication
remain reusable.

### Do not position as a native fit

E-commerce, grocery, restaurants, hotels, airlines, banks, insurance carriers,
pure SaaS, games, streaming, ride-hailing, food marketplaces, crypto exchanges,
manufacturers and wholesalers. Each needs a materially different catalogue,
fulfilment, billing or compliance model.

## Recommended market positioning

The product is a **white-label service operations platform** with a built-in
website, customer portal, CMS and revision ledger. It is strongest where a
business:

1. sells a service rather than a physical basket;
2. books visits, jobs or appointments;
3. keeps customer assets, sites or equipment;
4. sends quotations and invoices;
5. wants reminders, email campaigns and a customer portal.

That is a much larger market than HVAC alone, but it is not “any business”.
The defensible categories are **field service, home service, maintenance,
professional service and care-service operations**.
`

await mkdir('docs', { recursive: true })
await writeFile(path.join('docs', 'industry-fit-catalog.md'), markdown, 'utf8')
console.log(`Wrote docs/industry-fit-catalog.md with ${all.length} industries`)
console.log(counts)
