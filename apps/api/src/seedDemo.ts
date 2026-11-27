import { createHash } from 'node:crypto'
import type {
  AdminLead,
  AmcContract,
  AppointmentRecord,
  CustomerSite,
  EquipmentRecord,
  ExpenseRecord,
  InvoiceRecord,
  JobRecord,
  JobReport,
  NotificationPreferences,
  PayrollRecord,
  QuotationRecord,
  ReminderRecord,
  AttendanceRecord,
  LeaveRequest,
  SalaryAdvance,
  SalaryStructure,
  SalesRepProfile,
  SalesTargetRecord,
  SupportTicket,
  TeamMember,
} from '@hvac/shared'
import { defaultPreferences } from '@hvac/shared'
import { customerStore, encodePassword } from './portalAuth.js'
import {
  amcStore,
  equipmentStore,
  quotationStore,
  reportStore,
  siteStore,
  ticketStore,
} from './portalModules.js'
import { appointmentStore } from './portal.js'
import { expenseStore, invoiceStore, payrollStore, teamStore } from './business.js'
import { jobStore } from './jobStore.js'
import { reminderStore } from './reminders.js'
import { leadStore } from './leads.js'
import { preferenceStore } from './customerPreferences.js'
import { signupStore } from './newsletterSignups.js'
import { createStore } from './store.js'

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Refusing to seed demo operational data in production.')
}

const now = new Date()
const iso = now.toISOString()
const day = (offset: number) => {
  const value = new Date(now)
  value.setDate(value.getDate() + offset)
  return value.toISOString()
}
const date = (offset: number) => day(offset).slice(0, 10)
const month = iso.slice(0, 7)
const photo = '/uploads/home/1795366097400-3ec22d57.png'

const CUSTOMER = {
  primary: '11111111-1111-4111-8111-111111111111',
  secondary: '22222222-2222-4222-8222-222222222222',
  pending: '33333333-3333-4333-8333-333333333333',
  unverified: '44444444-4444-4444-8444-444444444444',
  reset: '55555555-5555-4555-8555-555555555555',
  suspended: '66666666-6666-4666-8666-666666666666',
}
const EMAIL = {
  primary: 'demo.coolvane@example.com',
  secondary: 'riley.demo@example.com',
  pending: 'pending.demo@example.com',
  unverified: 'unverified.demo@example.com',
  reset: 'reset.demo@example.com',
  suspended: 'suspended.demo@example.com',
}
const PASSWORD = 'Coolvane!Demo2026'
const VERIFY_TOKEN = 'demo-verify-token-2026'
const RESET_TOKEN = 'demo-reset-token-2026'
const SITE = { primary: 'demo-site-hq', annex: 'demo-site-annex' }
const EQUIP = {
  vrf: 'demo-equip-vrf',
  cassette: 'demo-equip-cassette',
  ahu: 'demo-equip-ahu',
}
const AMC_ID = 'demo-amc-contract'
const APT = {
  upcoming: 'demo-appointment-upcoming',
  completed: 'demo-appointment-completed',
  requested: 'demo-appointment-requested',
  cancelled: 'demo-appointment-cancelled',
}
const JOB = {
  scheduled: 'demo-job-scheduled',
  completed: 'demo-job-completed',
  active: 'demo-job-active',
}
const QUOTE = {
  sent: 'demo-quote-sent',
  changes: 'demo-quote-changes',
  accepted: 'demo-quote-accepted',
  sentAlt: 'demo-quote-sent-alt',
}
const TICKET = { open: 'demo-ticket-open', closed: 'demo-ticket-closed' }
const TEAM = { marcus: 'demo-team-marcus', priya: 'demo-team-priya', luis: 'demo-team-luis' }

function upsert<T extends { id: string }>(current: T[], record: T): T[] {
  return current.some((entry) => entry.id === record.id)
    ? current.map((entry) => (entry.id === record.id ? record : entry))
    : [record, ...current]
}

function hash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function customer(input: {
  id: string
  name: string
  email: string
  phone: string
  address: string
  status: 'unverified' | 'pending' | 'active' | 'suspended'
  verificationTokenHash?: string | null
  verificationExpiresAt?: number | null
}) {
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    address: input.address,
    status: input.status,
    createdAt: iso,
    updatedAt: iso,
    emailVerifiedAt: input.status === 'unverified' ? null : iso,
    verificationTokenHash: input.verificationTokenHash ?? null,
    verificationExpiresAt: input.verificationExpiresAt ?? null,
    ...encodePassword(PASSWORD),
  }
}

async function seedCustomers() {
  const records = [
    customer({
      id: CUSTOMER.primary,
      name: 'Avery Stone',
      email: EMAIL.primary,
      phone: '2145550101',
      address: '2100 McKinney Ave, Dallas, TX 75201',
      status: 'active',
    }),
    customer({
      id: CUSTOMER.secondary,
      name: 'Riley Chen',
      email: EMAIL.secondary,
      phone: '2145550102',
      address: '4100 Alpha Rd, Dallas, TX 75244',
      status: 'active',
    }),
    customer({
      id: CUSTOMER.pending,
      name: 'Morgan Lee',
      email: EMAIL.pending,
      phone: '2145550103',
      address: '77 Oak Lawn Ave, Dallas, TX 75219',
      status: 'pending',
    }),
    customer({
      id: CUSTOMER.unverified,
      name: 'Jordan Blake',
      email: EMAIL.unverified,
      phone: '2145550104',
      address: '18 Cole Ave, Dallas, TX 75204',
      status: 'unverified',
      verificationTokenHash: hash(VERIFY_TOKEN),
      verificationExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
    }),
    customer({
      id: CUSTOMER.reset,
      name: 'Taylor Reed',
      email: EMAIL.reset,
      phone: '2145550105',
      address: '901 Main St, Dallas, TX 75202',
      status: 'active',
    }),
    customer({
      id: CUSTOMER.suspended,
      name: 'Casey Park',
      email: EMAIL.suspended,
      phone: '2145550106',
      address: '25 Highland Park, Dallas, TX 75205',
      status: 'suspended',
    }),
  ]
  await customerStore.mutate((current) => {
    let next = current
    for (const record of records) {
      next = next.some((entry) => entry.email === record.email)
        ? next.map((entry) =>
            entry.email === record.email ? { ...entry, ...record, id: entry.id } : entry,
          )
        : [record, ...next]
    }
    return next
  })
}

async function seedSites() {
  const records: CustomerSite[] = [
    {
      id: SITE.primary,
      customerId: CUSTOMER.primary,
      label: 'McKinney HQ',
      address: '2100 McKinney Ave',
      city: 'Dallas',
      region: 'TX',
      postalCode: '75201',
      isPrimary: true,
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: SITE.annex,
      customerId: CUSTOMER.primary,
      label: 'Design studio annex',
      address: '4100 Alpha Rd',
      city: 'Dallas',
      region: 'TX',
      postalCode: '75244',
      isPrimary: false,
      createdAt: iso,
      updatedAt: iso,
    },
  ]
  await siteStore.mutate((current) => records.reduce(upsert, current))
}

async function seedEquipment() {
  const records: EquipmentRecord[] = [
    {
      id: EQUIP.vrf,
      customerId: CUSTOMER.primary,
      siteId: SITE.primary,
      name: 'VRF outdoor plant',
      brand: 'Mitsubishi Electric',
      model: 'PUHY-P300YNW-A',
      serial: 'ME-VRF-88421',
      capacity: '30 HP / 28 TR',
      installedAt: '2024-04-18',
      warrantyUntil: '2029-04-18',
      notes: 'Two-module heat-recovery plant serving floors 3–7.',
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: EQUIP.cassette,
      customerId: CUSTOMER.primary,
      siteId: SITE.primary,
      name: 'Cassette bank · floor 4',
      brand: 'Daikin',
      model: 'FCNQ36MVJU',
      serial: 'DK-CAS-67211',
      capacity: '3 TR · R-410A',
      installedAt: '2024-06-02',
      warrantyUntil: '2029-06-02',
      notes: 'Twelve ceiling cassettes on the fourth-floor tenant suite.',
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: EQUIP.ahu,
      customerId: CUSTOMER.primary,
      siteId: SITE.annex,
      name: 'Fresh-air AHU',
      brand: 'Trane',
      model: 'SAHA-12',
      serial: 'TR-AHU-11092',
      capacity: '12,000 CFM',
      installedAt: '2023-11-11',
      warrantyUntil: '2028-11-11',
      notes: 'Heat-wheel AHU with MERV 13 final filters.',
      createdAt: iso,
      updatedAt: iso,
    },
  ]
  await equipmentStore.mutate((current) => records.reduce(upsert, current))
}

async function seedAmc() {
  const record: AmcContract = {
    id: AMC_ID,
    ref: 'AMC-2026-9001',
    customerId: CUSTOMER.primary,
    plan: 'Comprehensive',
    equipmentIds: [EQUIP.vrf, EQUIP.cassette, EQUIP.ahu],
    startDate: date(-90),
    endDate: date(275),
    visitsPerYear: 4,
    price: 4800,
    status: 'active',
    notes: 'Quarterly visits, priority breakdown cover and 12-month parts warranty coordination.',
    renewalRequestedAt: null,
    createdAt: iso,
    updatedAt: iso,
  }
  await amcStore.mutate((current) => upsert(current, record))
}

async function seedQuotes() {
  const lines = [
    {
      id: 'demo-quote-line-1',
      description: 'VRF branch selector service and pressure test',
      quantity: 1,
      unitPrice: 780,
      taxPercent: 8.25,
    },
    {
      id: 'demo-quote-line-2',
      description: 'Refrigerant recovery and recharge · R-410A',
      quantity: 1,
      unitPrice: 420,
      taxPercent: 8.25,
    },
  ]
  const records: QuotationRecord[] = [
    {
      id: QUOTE.sent,
      ref: 'QT-2026-9001',
      customerId: CUSTOMER.primary,
      leadRef: 'ENQ-2026-9001',
      serviceSlug: 'vrf-systems',
      title: 'VRF branch selector repair',
      service: 'VRF / VRV design & installation',
      lines,
      discount: 0,
      notes:
        'Access to the ceiling void is included. Work is scheduled after the morning tenant window.',
      terms: 'Valid for 21 days. Payment due on completion.',
      status: 'sent',
      validUntil: date(21),
      acceptedAt: null,
      sentAt: day(-2),
      lastReminderAt: null,
      changeRequest: null,
      createdAt: day(-2),
      updatedAt: day(-2),
    },
    {
      id: QUOTE.changes,
      ref: 'QT-2026-9002',
      customerId: CUSTOMER.primary,
      leadRef: null,
      serviceSlug: 'ac-servicing',
      title: 'Seasonal cassette deep clean',
      service: 'AC servicing & deep cleaning',
      lines: [
        {
          id: 'demo-quote-line-3',
          description: 'Deep clean twelve cassettes and clear condensate',
          quantity: 12,
          unitPrice: 95,
          taxPercent: 8.25,
        },
      ],
      discount: 0,
      notes: 'Includes coil cleaning and drain pan treatment.',
      terms: 'Valid for 14 days.',
      status: 'changes-requested',
      validUntil: date(14),
      acceptedAt: null,
      sentAt: day(-5),
      lastReminderAt: null,
      changeRequest: 'Please add a Saturday access option and confirm filter pricing.',
      createdAt: day(-5),
      updatedAt: day(-1),
    },
    {
      id: QUOTE.sentAlt,
      ref: 'QT-2026-9004',
      customerId: CUSTOMER.primary,
      leadRef: null,
      serviceSlug: 'ducting',
      title: 'Kitchen exhaust duct clean',
      service: 'Ducting design & fabrication',
      lines: [
        {
          id: 'demo-quote-line-5',
          description: 'Commercial kitchen exhaust duct clean and degrease',
          quantity: 1,
          unitPrice: 2400,
          taxPercent: 8.25,
        },
      ],
      discount: 0,
      notes: 'Night access only. Includes grease trap clean.',
      terms: 'Valid for 21 days.',
      status: 'sent',
      validUntil: date(21),
      acceptedAt: null,
      sentAt: day(-1),
      lastReminderAt: null,
      changeRequest: null,
      createdAt: day(-1),
      updatedAt: day(-1),
    },
    {
      id: QUOTE.accepted,
      ref: 'QT-2026-9003',
      customerId: CUSTOMER.primary,
      leadRef: null,
      serviceSlug: 'chilled-water',
      title: 'Chiller plant vibration survey',
      service: 'Chilled water systems & chillers',
      lines: [
        {
          id: 'demo-quote-line-4',
          description: 'Vibration analysis and alignment report',
          quantity: 1,
          unitPrice: 1450,
          taxPercent: 8.25,
        },
      ],
      discount: 0,
      notes: 'Report issued within three working days.',
      terms: 'Accepted quotation.',
      status: 'accepted',
      validUntil: date(30),
      acceptedAt: day(-8),
      sentAt: day(-12),
      lastReminderAt: null,
      changeRequest: null,
      createdAt: day(-12),
      updatedAt: day(-8),
    },
  ]
  await quotationStore.mutate((current) => records.reduce(upsert, current))
}

async function seedAppointments() {
  const base = {
    customerId: CUSTOMER.primary,
    customerName: 'Avery Stone',
    customerEmail: EMAIL.primary,
    customerPhone: '2145550101',
    address: '2100 McKinney Ave, Dallas, TX 75201',
    leadRef: null,
    rebookOf: null,
    createdAt: iso,
    updatedAt: iso,
  }
  const records: AppointmentRecord[] = [
    {
      ...base,
      id: APT.upcoming,
      ref: 'APT-2026-9001',
      serviceSlug: 'vrf-systems',
      serviceName: 'VRF / VRV design & installation',
      scheduledAt: day(2).replace('T00:00:00.000Z', 'T09:00:00.000Z'),
      window: 'morning',
      status: 'scheduled',
      notes: 'Quarterly AMC visit. Bring branch selector spares and a leak detector.',
      technician: 'Marcus Reed',
      amcContractId: AMC_ID,
    },
    {
      ...base,
      id: APT.completed,
      ref: 'APT-2026-9002',
      serviceSlug: 'ac-servicing',
      serviceName: 'AC servicing & deep cleaning',
      scheduledAt: day(-15).replace('T00:00:00.000Z', 'T13:00:00.000Z'),
      window: 'afternoon',
      status: 'completed',
      notes: 'Completed deep clean and filter replacement.',
      technician: 'Luis Ortega',
      amcContractId: null,
    },
    {
      ...base,
      id: APT.requested,
      ref: 'APT-2026-9003',
      serviceSlug: 'ac-repair',
      serviceName: 'AC repair & emergency breakdown',
      scheduledAt: day(5).replace('T00:00:00.000Z', 'T15:00:00.000Z'),
      window: 'evening',
      status: 'requested',
      notes: 'Intermittent fan noise from the floor 4 cassette bank.',
      technician: '',
      amcContractId: null,
    },
    {
      ...base,
      id: APT.cancelled,
      ref: 'APT-2026-9004',
      serviceSlug: 'ducting',
      serviceName: 'Ducting design & fabrication',
      scheduledAt: day(-3).replace('T00:00:00.000Z', 'T09:00:00.000Z'),
      window: 'morning',
      status: 'cancelled',
      notes: 'Cancelled by customer; site access deferred.',
      technician: 'Priya Shah',
      amcContractId: null,
    },
  ]
  await appointmentStore.mutate((current) => records.reduce(upsert, current))
}

async function seedJobs() {
  const base = {
    customerId: CUSTOMER.primary,
    customerName: 'Avery Stone',
    customerEmail: EMAIL.primary,
    address: '2100 McKinney Ave, Dallas, TX 75201',
    amcContractId: null,
    equipmentIds: [EQUIP.vrf],
    parts: [
      {
        id: 'demo-job-part-1',
        name: 'Branch selector',
        quantity: 1,
        unitPrice: 310,
        note: 'OEM part',
      },
      { id: 'demo-job-part-2', name: 'Filter drier', quantity: 1, unitPrice: 48, note: '' },
    ],
    photos: [{ id: 'demo-job-photo-1', url: photo, alt: 'VRF plant room before service' }],
    signature: 'A. Stone',
    createdAt: iso,
    updatedAt: iso,
  }
  const checklist = (done: boolean) => [
    { id: 'demo-check-1', label: 'Site access and safety check', done, note: '' },
    { id: 'demo-check-2', label: 'Isolate and recover refrigerant', done, note: '' },
    { id: 'demo-check-3', label: 'Replace branch selector and pressure test', done, note: '' },
  ]
  const records: JobRecord[] = [
    {
      ...base,
      id: JOB.scheduled,
      ref: 'JOB-2026-9001',
      appointmentId: APT.upcoming,
      title: 'Quarterly VRF plant service',
      service: 'VRF / VRV design & installation',
      status: 'scheduled',
      technician: 'Marcus Reed',
      scheduledAt: day(2),
      startedAt: null,
      completedAt: null,
      checklist: checklist(false),
      notes: 'AMC quarterly visit.',
    },
    {
      ...base,
      id: JOB.completed,
      ref: 'JOB-2026-9002',
      appointmentId: APT.completed,
      title: 'Cassette deep clean and filter change',
      service: 'AC servicing & deep cleaning',
      status: 'completed',
      technician: 'Luis Ortega',
      scheduledAt: day(-15),
      startedAt: day(-15),
      completedAt: day(-15),
      checklist: checklist(true),
      notes: 'Completed and signed by customer.',
    },
    {
      ...base,
      id: JOB.active,
      ref: 'JOB-2026-9003',
      appointmentId: null,
      title: 'AHU filter and belt inspection',
      service: 'Ventilation, fresh air & exhaust',
      status: 'in-progress',
      technician: 'Priya Shah',
      scheduledAt: day(0),
      startedAt: day(0),
      completedAt: null,
      checklist: checklist(false),
      notes: 'Engineer on site.',
    },
  ]
  await jobStore.mutate((current) => records.reduce(upsert, current))
}

async function seedReports() {
  const records: JobReport[] = [
    {
      id: 'demo-report-1',
      ref: 'RPT-2026-9001',
      customerId: CUSTOMER.primary,
      appointmentId: APT.completed,
      equipmentId: EQUIP.cassette,
      title: 'Cassette deep clean · floor 4',
      summary:
        'Twelve cassettes cleaned, condensate drains cleared and filters replaced. No refrigerant leaks detected.',
      checklist: [
        { id: 'demo-report-check-1', label: 'Power isolated', done: true, note: '' },
        {
          id: 'demo-report-check-2',
          label: 'Coil and drain pan cleaned',
          done: true,
          note: 'Two pans required treatment.',
        },
        { id: 'demo-report-check-3', label: 'Filter set replaced', done: true, note: '' },
      ],
      photos: [{ id: 'demo-report-photo-1', url: photo, alt: 'Cassette after deep clean' }],
      findings: 'Minor condensate staining on cassette 7; drain cleared and monitored.',
      recommendations: 'Replace the floor 4 filter set again in six months.',
      technician: 'Luis Ortega',
      completedAt: day(-15),
      createdAt: day(-15),
      updatedAt: day(-15),
    },
    {
      id: 'demo-report-2',
      ref: 'RPT-2026-9002',
      customerId: CUSTOMER.primary,
      appointmentId: null,
      equipmentId: EQUIP.vrf,
      title: 'VRF plant vibration check',
      summary: 'Plant operating within expected vibration envelope. No abnormal bearing noise.',
      checklist: [
        {
          id: 'demo-report-check-4',
          label: 'Record suction and discharge pressures',
          done: true,
          note: '',
        },
        { id: 'demo-report-check-5', label: 'Check compressor mounts', done: true, note: '' },
      ],
      photos: [],
      findings: 'No action required.',
      recommendations: 'Continue quarterly monitoring.',
      technician: 'Marcus Reed',
      completedAt: day(-30),
      createdAt: day(-30),
      updatedAt: day(-30),
    },
  ]
  await reportStore.mutate((current) => records.reduce(upsert, current))
}

async function seedTickets() {
  const records: SupportTicket[] = [
    {
      id: TICKET.open,
      ref: 'SUP-2026-9001',
      customerId: CUSTOMER.primary,
      subject: 'Cassette 7 condensate drip',
      category: 'support',
      status: 'open',
      messages: [
        {
          id: 'demo-ticket-msg-1',
          at: day(-1),
          authorRole: 'customer',
          authorName: 'Avery Stone',
          body: 'There is a small drip from cassette 7 after the deep clean. Can someone take a look?',
        },
        {
          id: 'demo-ticket-msg-2',
          at: day(0),
          authorRole: 'admin',
          authorName: 'Coolvane works desk',
          body: 'We have logged this and will call the site lead today to arrange access.',
        },
      ],
      createdAt: day(-1),
      updatedAt: day(0),
    },
    {
      id: TICKET.closed,
      ref: 'SUP-2026-9002',
      customerId: CUSTOMER.primary,
      subject: 'Invoice copy for finance',
      category: 'billing',
      status: 'closed',
      messages: [
        {
          id: 'demo-ticket-msg-3',
          at: day(-20),
          authorRole: 'customer',
          authorName: 'Avery Stone',
          body: 'Please send a copy of invoice INV-2026-9003 to our accounts inbox.',
        },
        {
          id: 'demo-ticket-msg-4',
          at: day(-19),
          authorRole: 'admin',
          authorName: 'Coolvane accounts',
          body: 'Sent and closed. Thank you.',
        },
      ],
      createdAt: day(-20),
      updatedAt: day(-19),
    },
  ]
  await ticketStore.mutate((current) => records.reduce(upsert, current))
}

async function seedInvoices() {
  const base = {
    customerName: 'Avery Stone',
    customerPhone: '2145550101',
    customerEmail: EMAIL.primary,
    customerAddress: '2100 McKinney Ave, Dallas, TX 75201',
    customerGstin: '',
    leadRef: null,
    discount: 0,
    taxMode: 'intra' as const,
    notes: 'Thank you for keeping the plant online.',
    terms: 'Payment due within 15 days. Bank transfer preferred.',
    reminderDates: [],
    lastReminderAt: null,
    createdAt: iso,
    updatedAt: iso,
  }
  const records: InvoiceRecord[] = [
    {
      ...base,
      id: 'demo-invoice-unpaid',
      ref: 'INV-2026-9001',
      service: 'VRF branch selector repair',
      issueDate: date(-4),
      dueDate: date(11),
      status: 'issued',
      lines: [
        {
          id: 'demo-inv-line-1',
          description: 'VRF diagnostics and branch selector repair',
          quantity: 1,
          unitPrice: 1250,
          taxPercent: 8.25,
        },
        {
          id: 'demo-inv-line-2',
          description: 'R-410A recovery and recharge',
          quantity: 1,
          unitPrice: 420,
          taxPercent: 8.25,
        },
      ],
      payments: [],
    },
    {
      ...base,
      id: 'demo-invoice-partial',
      ref: 'INV-2026-9002',
      service: 'Cassette deep clean · floor 4',
      issueDate: date(-10),
      dueDate: date(5),
      status: 'issued',
      lines: [
        {
          id: 'demo-inv-line-3',
          description: 'Deep clean twelve cassettes',
          quantity: 12,
          unitPrice: 95,
          taxPercent: 8.25,
        },
        {
          id: 'demo-inv-line-4',
          description: 'Replacement filter sets',
          quantity: 12,
          unitPrice: 22,
          taxPercent: 8.25,
        },
      ],
      payments: [
        {
          id: 'demo-payment-1',
          amount: 500,
          method: 'bank-transfer',
          reference: 'ACH-22119',
          notes: 'Part payment received.',
          receivedAt: date(-3),
          recordedAt: day(-3),
          recordedBy: 'admin@coolvane.example',
        },
      ],
    },
    {
      ...base,
      id: 'demo-invoice-paid',
      ref: 'INV-2026-9003',
      service: 'Chiller plant vibration survey',
      issueDate: date(-35),
      dueDate: date(-20),
      status: 'issued',
      lines: [
        {
          id: 'demo-inv-line-5',
          description: 'Vibration analysis and alignment report',
          quantity: 1,
          unitPrice: 1450,
          taxPercent: 8.25,
        },
      ],
      payments: [
        {
          id: 'demo-payment-2',
          amount: 1569.63,
          method: 'bank-transfer',
          reference: 'ACH-21944',
          notes: 'Paid in full.',
          receivedAt: date(-18),
          recordedAt: day(-18),
          recordedBy: 'admin@coolvane.example',
        },
      ],
    },
    {
      ...base,
      id: 'demo-invoice-draft',
      ref: 'INV-2026-9004',
      service: 'AHU filter replacement',
      issueDate: date(0),
      dueDate: date(15),
      status: 'draft',
      lines: [
        {
          id: 'demo-inv-line-6',
          description: 'MERV 13 filter set',
          quantity: 8,
          unitPrice: 64,
          taxPercent: 8.25,
        },
      ],
      payments: [],
    },
  ]
  await invoiceStore.mutate((current) => records.reduce(upsert, current))
}

async function seedLeads() {
  const records: AdminLead[] = [
    {
      ref: 'ENQ-2026-9001',
      createdAt: day(-12),
      updatedAt: day(-8),
      status: 'quoted',
      source: 'contact-page',
      name: 'Avery Stone',
      email: EMAIL.primary,
      phone: '2145550101',
      message: 'VRF branch selector noise on floor 4. Requesting a survey and quotation.',
      serviceSlug: 'vrf-systems',
      serviceName: 'VRF / VRV design & installation',
      city: 'Dallas',
      urgency: 'normal',
      plan: null,
      context: 'Quarterly maintenance follow-up',
      owner: 'admin@coolvane.example',
      value: 1850,
      followUpAt: day(2),
      notes: [
        {
          id: 'demo-lead-note-1',
          at: day(-8),
          author: 'admin@coolvane.example',
          body: 'Site survey completed; quotation sent.',
        },
      ],
    },
    {
      ref: 'ENQ-2026-9002',
      createdAt: day(-2),
      updatedAt: day(-2),
      status: 'new',
      source: 'service-page',
      name: 'Avery Stone',
      email: EMAIL.primary,
      phone: '2145550101',
      message: 'Requesting the autumn cassette deep clean for twelve units.',
      serviceSlug: 'ac-servicing',
      serviceName: 'AC servicing & deep cleaning',
      city: 'Dallas',
      urgency: 'normal',
      plan: null,
      context: 'Service page enquiry',
      owner: null,
      value: null,
      followUpAt: null,
      notes: [],
    },
    {
      ref: 'ENQ-2026-9003',
      createdAt: day(-20),
      updatedAt: day(-18),
      status: 'won',
      source: 'amc-page',
      name: 'Avery Stone',
      email: EMAIL.primary,
      phone: '2145550101',
      message: 'AMC renewal enquiry for the Comprehensive plan.',
      serviceSlug: 'amc',
      serviceName: 'Annual maintenance contracts',
      city: 'Dallas',
      urgency: 'normal',
      plan: 'Comprehensive',
      context: 'AMC plan · Comprehensive',
      owner: 'admin@coolvane.example',
      value: 4800,
      followUpAt: null,
      notes: [
        {
          id: 'demo-lead-note-2',
          at: day(-18),
          author: 'admin@coolvane.example',
          body: 'Contract renewed.',
        },
      ],
    },
  ]
  await leadStore.mutate((current) => {
    let next = current
    for (const record of records) {
      next = next.some((entry) => entry.ref === record.ref)
        ? next.map((entry) => (entry.ref === record.ref ? record : entry))
        : [record, ...next]
    }
    return next
  })
}

async function seedTeamAndPayroll() {
  const team: TeamMember[] = [
    {
      id: TEAM.marcus,
      name: 'Marcus Reed',
      role: 'senior-technician',
      phone: '2145550121',
      email: 'marcus.reed@coolvane.example',
      skills: ['VRF', 'Chillers', 'Electrical diagnosis'],
      certifications: ['EPA 608 Universal', 'OSHA 10'],
      monthlySalary: 6800,
      payCycle: 'monthly',
      joinedAt: '2021-03-15',
      status: 'active',
      notes: 'Lead technician for commercial plant.',
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: TEAM.priya,
      name: 'Priya Shah',
      role: 'engineer',
      phone: '2145550122',
      email: 'priya.shah@coolvane.example',
      skills: ['Load calculations', 'Duct design', 'Commissioning'],
      certifications: ['PE candidate', 'LEED GA'],
      monthlySalary: 8200,
      payCycle: 'monthly',
      joinedAt: '2022-08-01',
      status: 'active',
      notes: 'Design and commissioning engineer.',
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: TEAM.luis,
      name: 'Luis Ortega',
      role: 'technician',
      phone: '2145550123',
      email: 'luis.ortega@coolvane.example',
      skills: ['Split systems', 'Cassette service', 'IAQ'],
      certifications: ['EPA 608 Universal'],
      monthlySalary: 5200,
      payCycle: 'monthly',
      joinedAt: '2023-01-09',
      status: 'active',
      notes: 'Residential and light-commercial service.',
      createdAt: iso,
      updatedAt: iso,
    },
  ]
  await teamStore.mutate((current) => team.reduce(upsert, current))

  const salary = (
    id: string,
    memberId: string,
    baseAmount: number,
    status: 'pending' | 'paid',
    bonus = 0,
  ) => ({
    id,
    memberId,
    period: month,
    baseAmount,
    bonus,
    deductions: 0,
    amount: baseAmount + bonus,
    status,
    paidAt: status === 'paid' ? day(-2) : null,
    method: 'bank-transfer' as const,
    reference: status === 'paid' ? `PAY-${month}-001` : '',
    notes: status === 'paid' ? 'Monthly salary paid.' : 'Awaiting payroll run.',
    createdAt: iso,
    updatedAt: iso,
  })
  const payroll: PayrollRecord[] = [
    salary('demo-payroll-marcus', TEAM.marcus, 6800, 'paid', 250),
    salary('demo-payroll-priya', TEAM.priya, 8200, 'pending'),
    salary('demo-payroll-luis', TEAM.luis, 5200, 'pending'),
  ]
  await payrollStore.mutate((current) => payroll.reduce(upsert, current))
}

async function seedExpenses() {
  const records: ExpenseRecord[] = [
    {
      id: 'demo-expense-1',
      date: date(-2),
      category: 'materials',
      vendor: 'Dallas Refrigeration Supply',
      description: 'R-410A cylinder and filter driers',
      amount: 684.5,
      taxAmount: 56.47,
      method: 'card-on-site',
      reference: 'DRS-4491',
      notes: 'Restock for VRF service van.',
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: 'demo-expense-2',
      date: date(-4),
      category: 'transport',
      vendor: 'Metro Fuel',
      description: 'Van fuel and tolls',
      amount: 142.8,
      taxAmount: 11.78,
      method: 'card-on-site',
      reference: 'MF-2219',
      notes: '',
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: 'demo-expense-3',
      date: date(-35),
      category: 'equipment',
      vendor: 'Testo',
      description: 'Digital manifold and vacuum gauge set',
      amount: 980,
      taxAmount: 80.85,
      method: 'bank-transfer',
      reference: 'TESTO-8812',
      notes: 'Commissioning kit.',
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: 'demo-expense-4',
      date: date(-40),
      category: 'marketing',
      vendor: 'Field Notes Studio',
      description: 'Autumn maintenance campaign artwork',
      amount: 1250,
      taxAmount: 0,
      method: 'bank-transfer',
      reference: 'FNS-331',
      notes: '',
      createdAt: iso,
      updatedAt: iso,
    },
  ]
  await expenseStore.mutate((current) => records.reduce(upsert, current))
}

async function seedReminders() {
  const records: ReminderRecord[] = [
    {
      id: 'demo-reminder-overdue',
      title: 'Call Avery Stone about branch selector quote',
      body: 'Quote QT-2026-9001 is waiting for approval.',
      dueAt: day(-1),
      status: 'open',
      priority: 'high',
      category: 'follow-up',
      leadRef: 'ENQ-2026-9001',
      invoiceRef: null,
      createdAt: iso,
      completedAt: null,
    },
    {
      id: 'demo-reminder-today',
      title: 'Confirm AMC quarterly visit access',
      body: 'Call the site lead before the engineer arrives.',
      dueAt: day(0),
      status: 'open',
      priority: 'urgent',
      category: 'renewal',
      leadRef: null,
      invoiceRef: null,
      createdAt: iso,
      completedAt: null,
    },
    {
      id: 'demo-reminder-upcoming',
      title: 'Review August expenses',
      body: 'Check fuel receipts and material invoices.',
      dueAt: day(6),
      status: 'open',
      priority: 'normal',
      category: 'other',
      leadRef: null,
      invoiceRef: null,
      createdAt: iso,
      completedAt: null,
    },
    {
      id: 'demo-reminder-done',
      title: 'Send invoice INV-2026-9003',
      body: 'Invoice sent to the customer accounts inbox.',
      dueAt: day(-20),
      status: 'done',
      priority: 'normal',
      category: 'payment',
      leadRef: null,
      invoiceRef: 'INV-2026-9003',
      createdAt: iso,
      completedAt: day(-19),
    },
  ]
  await reminderStore.mutate((current) => records.reduce(upsert, current))
}

async function seedPreferencesAndSignups() {
  await preferenceStore.mutate((current) => ({
    ...current,
    [CUSTOMER.primary]: {
      ...defaultPreferences(CUSTOMER.primary),
      emailMarketing: true,
      updatedAt: iso,
    } satisfies NotificationPreferences,
    [CUSTOMER.secondary]: {
      ...defaultPreferences(CUSTOMER.secondary),
      updatedAt: iso,
    } satisfies NotificationPreferences,
  }))

  await signupStore.mutate((current) => {
    const records = [
      {
        id: 'demo-signup-1',
        email: EMAIL.primary,
        source: 'footer',
        status: 'subscribed' as const,
        createdAt: iso,
        updatedAt: iso,
      },
      {
        id: 'demo-signup-2',
        email: 'facilities@northline.example',
        source: 'footer',
        status: 'subscribed' as const,
        createdAt: iso,
        updatedAt: iso,
      },
    ]
    let next = current
    for (const record of records) {
      next = next.some((entry) => entry.email === record.email)
        ? next.map((entry) => (entry.email === record.email ? record : entry))
        : [record, ...next]
    }
    return next
  })
}

async function seedResetToken() {
  const resetStore = createStore<Record<string, { customerId: string; expiresAt: number }>>(
    'password-resets.json',
    () => ({}),
  )
  await resetStore.mutate((current) => ({
    ...current,
    [hash(RESET_TOKEN)]: { customerId: CUSTOMER.reset, expiresAt: Date.now() + 60 * 60 * 1000 },
  }))
}

async function seedSalesAndPayrollPro() {
  const salesProfileStore = createStore<SalesRepProfile[]>('sales-profiles.json', () => [])
  const salesTargetStore = createStore<SalesTargetRecord[]>('sales-targets.json', () => [])
  const structureStore = createStore<Record<string, SalaryStructure>>(
    'salary-structures.json',
    () => ({}),
  )
  const attendanceStore = createStore<AttendanceRecord[]>('attendance.json', () => [])
  const leaveStore = createStore<LeaveRequest[]>('team-leaves.json', () => [])
  const advanceStore = createStore<SalaryAdvance[]>('salary-advances.json', () => [])

  const profiles: SalesRepProfile[] = [
    {
      email: 'priya.shah@coolvane.example',
      name: 'Priya Shah',
      userId: null,
      teamMemberId: TEAM.priya,
      baseSalary: 8200,
      active: true,
      updatedAt: iso,
    },
    {
      email: 'marcus.reed@coolvane.example',
      name: 'Marcus Reed',
      userId: null,
      teamMemberId: TEAM.marcus,
      baseSalary: 6800,
      active: true,
      updatedAt: iso,
    },
  ]
  await salesProfileStore.mutate((current) => {
    const map = new Map(current.map((p) => [p.email, p]))
    for (const p of profiles) map.set(p.email, p)
    return Array.from(map.values())
  })

  const targets: SalesTargetRecord[] = [
    {
      email: 'priya.shah@coolvane.example',
      month,
      revenueTarget: 45000,
      dealsTarget: 6,
      quotesTarget: 12,
      commissionRate: 0.04,
      updatedAt: iso,
      updatedBy: 'seed',
    },
    {
      email: 'marcus.reed@coolvane.example',
      month,
      revenueTarget: 28000,
      dealsTarget: 4,
      quotesTarget: 8,
      commissionRate: 0.03,
      updatedAt: iso,
      updatedBy: 'seed',
    },
  ]
  await salesTargetStore.mutate((current) => {
    const map = new Map(current.map((t) => [`${t.email}:${t.month}`, t]))
    for (const t of targets) map.set(`${t.email}:${t.month}`, t)
    return Array.from(map.values())
  })

  await structureStore.mutate((current) => ({
    ...current,
    [TEAM.marcus]: {
      memberId: TEAM.marcus,
      components: [
        { id: 'basic', name: 'Basic salary', kind: 'earning', mode: 'fixed', value: 5200, base: 'gross', taxable: true },
        { id: 'field', name: 'Field allowance', kind: 'earning', mode: 'fixed', value: 1600, base: 'gross', taxable: true },
        { id: 'tax', name: 'Withholding tax', kind: 'deduction', mode: 'percent', value: 12, base: 'gross', taxable: false },
      ],
      updatedAt: iso,
    },
    [TEAM.priya]: {
      memberId: TEAM.priya,
      components: [
        { id: 'basic', name: 'Basic salary', kind: 'earning', mode: 'fixed', value: 6500, base: 'gross', taxable: true },
        { id: 'eng', name: 'Engineering allowance', kind: 'earning', mode: 'fixed', value: 1700, base: 'gross', taxable: true },
        { id: 'tax', name: 'Withholding tax', kind: 'deduction', mode: 'percent', value: 14, base: 'gross', taxable: false },
      ],
      updatedAt: iso,
    },
    [TEAM.luis]: {
      memberId: TEAM.luis,
      components: [
        { id: 'basic', name: 'Basic salary', kind: 'earning', mode: 'fixed', value: 4200, base: 'gross', taxable: true },
        { id: 'van', name: 'Service allowance', kind: 'earning', mode: 'fixed', value: 1000, base: 'gross', taxable: true },
        { id: 'tax', name: 'Withholding tax', kind: 'deduction', mode: 'percent', value: 10, base: 'gross', taxable: false },
      ],
      updatedAt: iso,
    },
  }))

  const attendance: AttendanceRecord[] = [
    { id: 'demo-att-1', memberId: TEAM.marcus, date: date(-2), status: 'present', hours: 8, overtimeHours: 1.5, note: 'Chiller plant commissioning', createdAt: iso, updatedAt: iso },
    { id: 'demo-att-2', memberId: TEAM.priya, date: date(-2), status: 'remote', hours: 8, overtimeHours: 0, note: 'Load calculations & quotes', createdAt: iso, updatedAt: iso },
    { id: 'demo-att-3', memberId: TEAM.luis, date: date(-2), status: 'present', hours: 8, overtimeHours: 0, note: 'Cassette service route', createdAt: iso, updatedAt: iso },
    { id: 'demo-att-4', memberId: TEAM.marcus, date: date(-1), status: 'present', hours: 8, overtimeHours: 0, note: 'McKinney HQ inspection', createdAt: iso, updatedAt: iso },
    { id: 'demo-att-5', memberId: TEAM.priya, date: date(-1), status: 'present', hours: 8, overtimeHours: 1, note: 'Client site walkthrough', createdAt: iso, updatedAt: iso },
    { id: 'demo-att-6', memberId: TEAM.luis, date: date(-1), status: 'half-day', hours: 4, overtimeHours: 0, note: 'Morning route only', createdAt: iso, updatedAt: iso },
  ]
  await attendanceStore.mutate((current) => attendance.reduce(upsert, current))

  const leaves: LeaveRequest[] = [
    {
      id: 'demo-leave-1',
      memberId: TEAM.luis,
      type: 'paid',
      from: date(4),
      to: date(5),
      note: 'Scheduled family travel',
      status: 'approved',
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: 'demo-leave-2',
      memberId: TEAM.marcus,
      type: 'sick',
      from: date(9),
      to: date(9),
      note: 'Dental appointment',
      status: 'pending',
      createdAt: iso,
      updatedAt: iso,
    },
  ]
  await leaveStore.mutate((current) => leaves.reduce(upsert, current))

  const advances: SalaryAdvance[] = [
    {
      id: 'demo-adv-1',
      memberId: TEAM.luis,
      date: date(-6),
      amount: 400,
      note: 'Tool kit upgrade advance',
      recoverInPeriod: month,
      createdAt: iso,
      updatedAt: iso,
    },
  ]
  await advanceStore.mutate((current) => advances.reduce(upsert, current))
}

async function main() {
  await seedCustomers()
  await seedSites()
  await seedEquipment()
  await seedAmc()
  await seedQuotes()
  await seedAppointments()
  await seedJobs()
  await seedReports()
  await seedTickets()
  await seedInvoices()
  await seedLeads()
  await seedTeamAndPayroll()
  await seedSalesAndPayrollPro()
  await seedExpenses()
  await seedReminders()
  await seedPreferencesAndSignups()
  await seedResetToken()
  console.log('Demo data seeded.')
  console.log(`Primary portal: ${EMAIL.primary} / ${PASSWORD}`)
  console.log(`Reset link: /portal?reset=${RESET_TOKEN}`)
  console.log(`Verify link: /portal?verify=${VERIFY_TOKEN}`)
}

await main()
