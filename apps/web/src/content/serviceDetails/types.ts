export type Pair = readonly [label: string, value: string]

export type CalculatorKind = 'tonnage' | 'vrf' | 'chiller' | 'duct' | 'cold-room' | 'amc'

/**
 * One detailed service page. The template reads this shape only; a new service
 * added here gets the full page, enquiry routing and related links without a
 * component change.
 */
export interface ServiceDetail {
  id: string
  headline: string
  intro: string
  warranty: string
  standards?: string[]
  startingFrom: string
  priceBasis: string
  priceFactors: string[]
  includes: string[]
  excludes: string[]
  specs: Pair[]
  selection: Pair[]
  site: string[]
  steps: Pair[]
  faqs: Pair[]
  related: string[]
  calculator?: CalculatorKind
}
