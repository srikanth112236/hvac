/**
 * Brand configuration — the single source of client identity.
 *
 * Every deployment of this template is re-skin-able from this file plus the
 * admin Brand Settings (Phase 6), which hydrate the same shape at runtime.
 * Nothing brand-specific may be hardcoded in a component.
 */

export interface ServiceArea {
  city: string
  region: string
  slug: string
  /** Radius in kilometres used by the booking availability engine. */
  radiusKm: number
}

export interface BrandConfig {
  name: string
  shortName: string
  legalName: string
  tagline: string
  description: string
  monogram: string
  logo: {
    wordmark: string | null
    mark: string | null
  }
  favicon?: string
  socialImage?: string
  contact: {
    phone: string
    phoneDisplay: string
    emergencyPhone: string
    email: string
    salesEmail: string
  }
  address: {
    line1: string
    line2: string
    locality: string
    region: string
    postalCode: string
    country: string
  }
  hours: {
    weekdays: string
    saturday: string
    sunday: string
    emergency: string
  }
  serviceAreas: ServiceArea[]
  social: {
    linkedin: string | null
    instagram: string | null
    youtube: string | null
  }
  foundedYear: number
  stats: {
    yearsOperating: number
    systemsInstalled: number
    tonnageCommissioned: number
    emergencyResponseHours: number
  }
  credentials: string[]
  gstin: string | null
}

export const brandConfig: BrandConfig = {
  name: 'Coolvane HVAC',
  shortName: 'Coolvane',
  legalName: 'Coolvane Climate Systems LLC',
  tagline: 'Thermal engineering for buildings that cannot afford to fail.',
  description:
    'Design, installation and maintenance of split, VRF, chilled-water and precision cooling systems for homes, offices, plants and cleanrooms. Measured, commissioned and documented.',
  monogram: 'CV',
  logo: {
    wordmark: null,
    mark: null,
  },
  contact: {
    phone: '+15555550142',
    phoneDisplay: '(555) 555-0142',
    emergencyPhone: '+15555550177',
    email: 'works@coolvane.example',
    salesEmail: 'projects@coolvane.example',
  },
  address: {
    line1: '8420 Central Commerce Drive, Suite 210',
    line2: 'Engineering and dispatch',
    locality: 'Dallas',
    region: 'TX',
    postalCode: '75201',
    country: 'US',
  },
  hours: {
    weekdays: '08:00 – 18:00',
    saturday: '09:00 – 15:00',
    sunday: 'Emergency cover only',
    emergency: '24 × 7 dispatch',
  },
  serviceAreas: [
    { city: 'Dallas', region: 'Texas', slug: 'dallas', radiusKm: 72 },
    { city: 'Fort Worth', region: 'Texas', slug: 'fort-worth', radiusKm: 56 },
    { city: 'Plano', region: 'Texas', slug: 'plano', radiusKm: 48 },
  ],
  social: {
    linkedin: 'https://www.linkedin.com/company/coolvane-example',
    instagram: null,
    youtube: null,
  },
  foundedYear: 2009,
  stats: {
    yearsOperating: 17,
    systemsInstalled: 4120,
    tonnageCommissioned: 18600,
    emergencyResponseHours: 4,
  },
  credentials: ['ASHRAE member', 'NATE-certified installers', 'EPA Section 608 certified'],
  gstin: null,
}

/** Runtime overrides applied by admin Brand Settings without a redeploy. */
export type BrandOverrides = Partial<
  Pick<
    BrandConfig,
    | 'name'
    | 'shortName'
    | 'legalName'
    | 'tagline'
    | 'description'
    | 'monogram'
    | 'logo'
    | 'favicon'
    | 'socialImage'
    | 'contact'
    | 'hours'
    | 'address'
    | 'serviceAreas'
    | 'stats'
    | 'credentials'
    | 'foundedYear'
    | 'gstin'
  >
>
