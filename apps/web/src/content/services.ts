import type { IconName } from '@/components/icons'
import type { ServiceCategory } from '@hvac/shared'

/**
 * Service catalogue for the public index.
 *
 * Phase 6 replaces this with the Service collection; the shapes match what the
 * API will return so the index component does not change. Capacity, lead time
 * and specification are the three columns a facilities engineer compares.
 */

export interface CatalogueService {
  id: string
  index: string
  name: string
  category: ServiceCategory
  icon: IconName
  capacity: string
  timeline: string
  specification: string
  scope: string
}

export type CategoryFilter = ServiceCategory | 'all'

export const serviceCategoryOrder = [
  'residential',
  'commercial',
  'industrial',
  'maintenance',
] as const

export const categoryLabels: Record<ServiceCategory, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  maintenance: 'Maintenance',
}

export const catalogueServices: CatalogueService[] = [
  {
    id: 'split-ac-installation',
    index: '01',
    name: 'Split AC installation',
    category: 'residential',
    icon: 'snowflake',
    capacity: '1.5 – 8.5 TR',
    timeline: '1 – 2 days',
    specification: 'Wall · cassette · tower · ductable',
    scope: 'Load check, bracket or stand, drain slope, electrical point and a weighed refrigerant log at handover.',
  },
  {
    id: 'ac-repair',
    index: '02',
    name: 'AC repair & emergency breakdown',
    category: 'residential',
    icon: 'wrench',
    capacity: 'All split systems',
    timeline: 'Same day',
    specification: '4 h response · 24 × 7 dispatch',
    scope: 'Fault diagnosis, board and compressor testing, leak trace and a written repair note with parts used.',
  },
  {
    id: 'ac-servicing',
    index: '03',
    name: 'AC servicing & deep cleaning',
    category: 'residential',
    icon: 'filter',
    capacity: '1.5 – 8.5 TR',
    timeline: '2 – 3 h / unit',
    specification: 'Jet wash · coil-safe chemicals',
    scope: 'Filter, blower, coil and drain cleaning with before-and-after coil photographs filed against the unit.',
  },
  {
    id: 'gas-charging',
    index: '04',
    name: 'Gas charging & leak detection',
    category: 'residential',
    icon: 'refrigerant',
    capacity: 'R-32 · R-410A · R-134a',
    timeline: '3 – 5 h',
    specification: '550 psi nitrogen test',
    scope: 'Nitrogen pressure test, brazing, vacuum to 500 microns and a weighed charge recorded against nameplate.',
  },
  {
    id: 'ac-relocation',
    index: '05',
    name: 'AC relocation & reinstall',
    category: 'residential',
    icon: 'coil',
    capacity: '1.5 – 6 TR',
    timeline: '1 day',
    specification: 'Pump-down · new flares',
    scope: 'Pump-down, uninstall, protected transport, new flare joints and full re-commissioning at the new site.',
  },
  {
    id: 'inverter-multi-split',
    index: '06',
    name: 'Inverter & multi-split systems',
    category: 'residential',
    icon: 'vrf',
    capacity: '1.5 – 12 TR',
    timeline: '2 – 4 days',
    specification: 'R-32 · 3 – 5 indoor units',
    scope: 'Room-by-room load, diversity check, drain routing and electrical coordination before any wall is opened.',
  },
  {
    id: 'ducted-residential',
    index: '07',
    name: 'Ducted residential HVAC',
    category: 'residential',
    icon: 'duct',
    capacity: '3 – 20 TR',
    timeline: '5 – 10 days',
    specification: 'PIR · 35 – 60 Pa',
    scope: 'Ceiling void survey, duct layout, diffuser selection and a static pressure test before the ceiling closes.',
  },
  {
    id: 'air-purification',
    index: '08',
    name: 'Air purification, UV & IAQ',
    category: 'residential',
    icon: 'airflow',
    capacity: 'Full home',
    timeline: '1 – 2 days',
    specification: 'PM2.5 · VOC · UV-C',
    scope: 'Filtration upgrade, UV-C at the coil, fresh-air fraction and a CO₂ check with the rooms occupied.',
  },
  {
    id: 'smart-thermostats',
    index: '09',
    name: 'Smart thermostats & controls',
    category: 'residential',
    icon: 'thermostat',
    capacity: 'Per zone',
    timeline: '4 – 6 h',
    specification: 'BACnet · Modbus · Wi-Fi',
    scope: 'Zone mapping, schedule programming, setpoint limits and an app handover for the person who pays the bill.',
  },
  {
    id: 'vrf-systems',
    index: '10',
    name: 'VRF / VRV design & installation',
    category: 'commercial',
    icon: 'vrf',
    capacity: '8 – 1,200 TR',
    timeline: '3 – 8 weeks',
    specification: 'Heat recovery · 92% diversity',
    scope: 'Branch selector sizing, pipe runs to 68 m, indoor unit schedule and commissioning at the furthest unit.',
  },
  {
    id: 'chilled-water',
    index: '11',
    name: 'Chilled water systems & chillers',
    category: 'industrial',
    icon: 'chiller',
    capacity: '60 – 2,000 TR',
    timeline: '6 – 16 weeks',
    specification: '0.52 kW/TR at design',
    scope: 'Load profile, primary/secondary pumping, plant sequence and N+1 headering for the failure case.',
  },
  {
    id: 'packaged-rooftop',
    index: '12',
    name: 'Packaged & rooftop units',
    category: 'commercial',
    icon: 'condenser',
    capacity: '10 – 150 TR',
    timeline: '2 – 5 weeks',
    specification: 'DX · 42 Pa static',
    scope: 'Structural check, curb and duct interface, economiser setting and controls integration.',
  },
  {
    id: 'ducting',
    index: '13',
    name: 'Ducting design & fabrication',
    category: 'commercial',
    icon: 'duct',
    capacity: '800 – 24,000 CFM',
    timeline: '2 – 6 weeks',
    specification: 'GI · PIR · 640 Pa test',
    scope: 'Pressure class, hanger schedule, fabrication drawings, installation and a leak test before handover.',
  },
  {
    id: 'ventilation',
    index: '14',
    name: 'Ventilation, fresh air & exhaust',
    category: 'commercial',
    icon: 'damper',
    capacity: '500 – 30,000 CFM',
    timeline: '1 – 4 weeks',
    specification: '4 – 12 ACH',
    scope: 'Fresh-air fraction, kitchen and toilet exhaust, make-up air and a measured balance across the building.',
  },
  {
    id: 'cold-rooms',
    index: '15',
    name: 'Cold rooms & walk-in coolers',
    category: 'industrial',
    icon: 'cold-room',
    capacity: '-25 to +8 °C',
    timeline: '4 – 10 weeks',
    specification: '12 – 80 TR · 100 mm PIR',
    scope: 'Heat load, panel layout, defrost strategy and a changeover test long enough to prove the standby pair.',
  },
  {
    id: 'precision-cooling',
    index: '16',
    name: 'Cleanrooms & precision cooling',
    category: 'industrial',
    icon: 'ahu',
    capacity: '5 – 220 TR',
    timeline: '6 – 14 weeks',
    specification: 'ISO 5 – 8 · ±0.5 °C',
    scope: 'Particle count, pressure cascade, FFU grid and a validation file signed by the testing agency.',
  },
  {
    id: 'server-room',
    index: '17',
    name: 'Server room & data centre cooling',
    category: 'industrial',
    icon: 'thermostat',
    capacity: '3 – 200 TR',
    timeline: '3 – 8 weeks',
    specification: 'N+1 · 22 – 27 °C',
    scope: 'Sensible load, in-row or perimeter units, redundancy and alarm escalation to the duty engineer.',
  },
  {
    id: 'bms',
    index: '18',
    name: 'BMS integration & energy management',
    category: 'commercial',
    icon: 'gauge',
    capacity: 'Any plant',
    timeline: '2 – 6 weeks',
    specification: 'BACnet/IP · Modbus',
    scope: 'Points list, alarm schedule, trend logging and plant scheduling that survives a setpoint audit.',
  },
  {
    id: 'retrofit-audit',
    index: '19',
    name: 'HVAC retrofit & energy audit',
    category: 'commercial',
    icon: 'bolt',
    capacity: 'Existing plant',
    timeline: '2 – 6 weeks',
    specification: 'Metered kW/TR baseline',
    scope: 'Metered baseline, leak and fouling survey, payback model and a phased plan that keeps the building running.',
  },
  {
    id: 'amc',
    index: '20',
    name: 'Annual maintenance contracts',
    category: 'maintenance',
    icon: 'shield',
    capacity: 'All makes',
    timeline: '12-month term',
    specification: '2 – 26 visits / year',
    scope: 'Written scope, visit reports, consumables log and the 4-hour dispatch line inside city limits.',
  },
  {
    id: 'chiller-maintenance',
    index: '21',
    name: 'Chiller, AHU & cooling tower service',
    category: 'maintenance',
    icon: 'cooling-tower',
    capacity: '60 – 2,000 TR',
    timeline: 'Per visit',
    specification: 'Tube brush · water treatment',
    scope: 'Tube cleaning, water treatment, bearing and vibration check, with a performance log against design.',
  },
  {
    id: 'kitchen-ventilation',
    index: '22',
    name: 'Commercial kitchen ventilation',
    category: 'commercial',
    icon: 'filter',
    capacity: '2,000 – 20,000 CFM',
    timeline: '2 – 5 weeks',
    specification: 'Hood · UV · grease filter',
    scope: 'Hood capture velocity, make-up air, grease filtration and fire damper commissioning with the kitchen live.',
  },
]

const featuredIds = [
  'vrf-systems',
  'chilled-water',
  'ducting',
  'precision-cooling',
  'split-ac-installation',
  'amc',
] as const

export const featuredServices = featuredIds
  .map((id) => catalogueServices.find((service) => service.id === id))
  .filter((service): service is CatalogueService => Boolean(service))
