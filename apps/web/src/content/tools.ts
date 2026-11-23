import type { CalculatorKind } from '@/content/serviceDetails'

export interface ToolDefinition {
  slug: string
  kind: CalculatorKind
  label: string
  service: string
  note: string
  description: string
}

/** Standalone calculators. Service pages link here; they do not duplicate them. */
export const tools: ToolDefinition[] = [
  {
    slug: 'room-tonnage',
    kind: 'tonnage',
    label: 'Room tonnage',
    service: 'Split / cassette sizing',
    note: 'Indicative load from area, glazing exposure and occupancy.',
    description:
      'Estimate room tonnage from floor area, main exposure and occupancy, then send the assumptions to the works desk.',
  },
  {
    slug: 'vrf-zones',
    kind: 'vrf',
    label: 'VRF zones',
    service: 'VRF / VRV planning',
    note: 'Room count, diversity and block load for a multi-room brief.',
    description:
      'Estimate outdoor VRF capacity from room count, average area and simultaneous-use diversity.',
  },
  {
    slug: 'duct-sizing',
    kind: 'duct',
    label: 'Duct sizing',
    service: 'Duct design',
    note: 'Airflow and velocity check for a trunk or branch.',
    description:
      'Check equivalent duct diameter from airflow and main velocity before a pressure-class survey.',
  },
  {
    slug: 'cold-room',
    kind: 'cold-room',
    label: 'Cold room',
    service: 'Cold room load',
    note: 'Volume, temperature class and door traffic.',
    description:
      'Estimate cold-room duty from chamber volume, holding temperature and daily door openings.',
  },
  {
    slug: 'chiller-capacity',
    kind: 'chiller',
    label: 'Chiller capacity',
    service: 'Chilled water plant',
    note: 'Area and load density for a central plant conversation.',
    description: 'Estimate central plant capacity from conditioned area and internal load density.',
  },
  {
    slug: 'amc-plan',
    kind: 'amc',
    label: 'AMC plan',
    service: 'Maintenance plan',
    note: 'Unit count and plan level for an annual cover estimate.',
    description:
      'Compare indicative annual maintenance cover from indoor-unit count and plan level.',
  },
]

export function toolBySlug(slug: string | undefined): ToolDefinition | null {
  return tools.find((tool) => tool.slug === slug) ?? null
}

export function toolForKind(kind: CalculatorKind): ToolDefinition | null {
  return tools.find((tool) => tool.kind === kind) ?? null
}
