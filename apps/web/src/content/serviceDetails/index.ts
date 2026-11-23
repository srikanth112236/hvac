import { catalogueServices } from '@/content/services'
import type { CatalogueService } from '@/content/services'
import { commercialDetails } from './commercial'
import { industrialDetails } from './industrial'
import { maintenanceDetails } from './maintenance'
import { residentialDetails } from './residential'
import type { ServiceDetail } from './types'

export type { CalculatorKind, Pair, ServiceDetail } from './types'

const detailRecords = [
  ...residentialDetails,
  ...commercialDetails,
  ...industrialDetails,
  ...maintenanceDetails,
]

/** Catalogue order is the public order, so the index and detail pages agree. */
export const serviceDetails: (ServiceDetail & { catalogue: CatalogueService })[] =
  catalogueServices.map((catalogue) => {
    const detail = detailRecords.find((entry) => entry.id === catalogue.id)
    if (!detail) {
      throw new Error(`Missing service detail content for "${catalogue.id}"`)
    }
    return { ...detail, catalogue }
  })

export function getServiceDetail(id: string) {
  return serviceDetails.find((service) => service.id === id) ?? null
}

export function relatedServices(id: string) {
  const current = getServiceDetail(id)
  if (!current) return []
  return current.related
    .map((relatedId) => getServiceDetail(relatedId))
    .filter((service): service is NonNullable<typeof service> => Boolean(service))
}
