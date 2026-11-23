import type {
  AdminLead,
  AdminRole,
  AmcContract,
  AmcInput,
  AppointmentRecord,
  CustomerAccount,
  CustomerAccountWithStats,
  CustomerPortalFile,
  CustomerSite,
  CustomerSiteInput,
  EquipmentInput,
  EquipmentRecord,
  ExpenseInput,
  ExpensePatch,
  ExpenseRecord,
  InvoiceInput,
  InvoicePatch,
  InvoicePaymentInput,
  InvoiceSummary,
  InvoiceWithTotals,
  JobReport,
  JobReportInput,
  PayrollInput,
  PayrollPatch,
  PayrollRecord,
  QuotationRecord,
  QuotationTotals,
  QuotationInput,
  ReminderRecord,
  SiteContent,
  SiteContentPayload,
  SiteMediaAsset,
  ContentRevisionList,
  ContentRevisionMeta,
  CouponInput,
  CouponPatch,
  CouponSummary,
  CouponWithStats,
  NewsletterInput,
  NewsletterPatch,
  NewsletterRecord,
  NewsletterSummary,
  SupportTicket,
  TeamMember,
  TeamMemberInput,
  TeamMemberPatch,
  TicketStatus,
} from '@hvac/shared'

export interface AdminUser {
  email: string
  role: AdminRole
  userId?: string | null
  expiresAt: number
}

export interface TwoFactorChallenge {
  requires2fa: true
  challengeId: string
  maskedEmail: string
  expiresAt: number
}

export interface TwoFactorSetupChallenge {
  challengeId: string
  maskedEmail: string
  expiresAt: number
  purpose: 'enable' | 'disable'
}

export interface TwoFactorStatus {
  enabled: boolean
  enabledAt: string | null
  mailConfigured: boolean
  email: string
  maskedEmail: string
}

export interface PermissionDefinition {
  key: string
  label: string
  description: string
}

export interface PermissionMatrix {
  roles: AdminRole[]
  permissions: PermissionDefinition[]
  matrix: Record<AdminRole, string[]>
  readOnly: boolean
}

export type AdminLoginResult = AdminUser | TwoFactorChallenge

export function isTwoFactorChallenge(value: AdminLoginResult): value is TwoFactorChallenge {
  return 'requires2fa' in value
}

export interface PublicAdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

export interface AdminMetrics {
  leads: {
    total: number
    byStatus: Record<string, number>
    newThisWeek: number
    overdueFollowUps: number
    pipelineValue: number
    wonValue: number
  }
  payments: {
    collected: number
    pending: number
    overdue: number
    count: number
    byMethod: Record<string, number>
  }
  reminders: { open: number; overdue: number; dueToday: number }
  invoices: InvoiceSummary
  finance: {
    invoiced: number
    collected: number
    outstanding: number
    overdueAmount: number
    expenses: number
    expensesThisMonth: number
    payrollThisMonth: number
    payrollPaidThisMonth: number
    payrollCommitment: number
    netThisMonth: number
    netLifetime: number
    activeTeam: number
  }
  revenue: { month: string; amount: number }[]
  financeTrend: {
    month: string
    collected: number
    expenses: number
    payroll: number
    net: number
  }[]
  serviceDemand: { service: string; count: number }[]
  recentLeads: AdminLead[]
  recentInvoices: InvoiceWithTotals[]
  content: { version: number; updatedAt: string }
}

export interface ExpenseSummary {
  total: number
  thisMonth: number
  byCategory: Record<string, number>
  count: number
}

export interface PayrollSummary {
  thisMonth: number
  thisMonthPaid: number
  thisMonthPending: number
  totalPaid: number
  activeTeam: number
  monthlyPayrollCommitment: number
  count: number
}

interface ApiErrorBody {
  error?: { message?: string; issues?: { message: string; path: string }[] }
}

export interface AuditEntry {
  id: string
  at: string
  actor: string | null
  method: string
  path: string
  status: number
  ip: string
}

export interface DataHealth {
  generatedAt: string
  dataVersion: number | null
  counts: Record<string, number>
  issues: string[]
}

export interface SearchResult {
  type: string
  id: string
  title: string
  subtitle: string
  path: string
}

export class ApiError extends Error {
  status: number
  issues?: { message: string; path: string }[]

  constructor(message: string, status: number, issues?: { message: string; path: string }[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.issues = issues
  }
}

function notifyAdminData(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('hvac-admin-data-changed'))
  try {
    const channel = new BroadcastChannel('hvac-admin')
    channel.postMessage({ type: 'changed' })
    channel.close()
  } catch {
    // Cross-tab broadcast is an enhancement; the same-tab event still fires.
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        'X-Admin-Request': '1',
        ...(init.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError('The works API could not be reached.', 0)
  }

  if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/2fa')) {
    window.dispatchEvent(new Event('hvac-admin-unauthorised'))
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    let issues: { message: string; path: string }[] | undefined
    try {
      const body = (await response.json()) as ApiErrorBody
      message = body.error?.message ?? message
      issues = body.error?.issues
    } catch {
      // Keep the status message when the body is not JSON.
    }
    throw new ApiError(message, response.status, issues)
  }

  if (init.method && init.method !== 'GET' && init.method !== 'HEAD') {
    notifyAdminData()
  }

  return (await response.json()) as T
}

export const adminApi = {
  me: () => request<{ data: AdminUser }>('/auth/me').then((payload) => payload.data),
  hint: () =>
    request<{ data: { email: string } | null }>('/auth/hint').then((payload) => payload.data),
  login: (email: string, password: string) =>
    request<{ data: AdminLoginResult }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((payload) => payload.data),
  verifyTwoFactorLogin: (challengeId: string, code: string) =>
    request<{ data: AdminUser }>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId, code }),
    }).then((payload) => payload.data),
  resendTwoFactorCode: (challengeId: string) =>
    request<{ data: TwoFactorChallenge }>('/auth/2fa/resend', {
      method: 'POST',
      body: JSON.stringify({ challengeId }),
    }).then((payload) => payload.data),
  twoFactorStatus: () =>
    request<{ data: TwoFactorStatus }>('/auth/2fa').then((payload) => payload.data),
  setupTwoFactor: (purpose: 'enable' | 'disable') =>
    request<{ data: TwoFactorSetupChallenge }>('/auth/2fa/setup', {
      method: 'POST',
      body: JSON.stringify({ purpose }),
    }).then((payload) => payload.data),
  confirmTwoFactor: (challengeId: string, code: string, purpose: 'enable' | 'disable') =>
    request<{ data: TwoFactorStatus }>('/auth/2fa/confirm', {
      method: 'POST',
      body: JSON.stringify({ challengeId, code, purpose }),
    }).then((payload) => payload.data),
  logout: () => request<{ data: { signedOut: boolean } }>('/auth/logout', { method: 'POST' }),

  metrics: () => request<{ data: AdminMetrics }>('/admin/metrics').then((payload) => payload.data),
  mailStatus: () =>
    request<{ data: { configured: boolean; from: string; notify: string } }>(
      '/admin/mail/status',
    ).then((payload) => payload.data),
  billing: () =>
    request<{ data: SiteContent['brand']['billing'] }>('/admin/billing').then(
      (payload) => payload.data,
    ),
  audit: () =>
    request<{ data: AuditEntry[] }>('/admin/audit?limit=25').then((payload) => payload.data),
  dataHealth: () =>
    request<{ data: DataHealth }>('/admin/data-health').then((payload) => payload.data),
  search: (query: string) =>
    request<{ data: { results: SearchResult[] } }>(
      `/admin/search?q=${encodeURIComponent(query)}`,
    ).then((payload) => payload.data.results),
  users: () => request<{ data: PublicAdminUser[] }>('/admin/users').then((payload) => payload.data),
  permissions: () =>
    request<{ data: PermissionMatrix }>('/admin/permissions').then((payload) => payload.data),
  createAdminUser: (input: { name: string; email: string; password: string; role: AdminRole }) =>
    request<{ data: PublicAdminUser }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((payload) => payload.data),
  patchAdminUser: (
    id: string,
    patch: { name?: string; role?: AdminRole; status?: 'active' | 'disabled'; password?: string },
  ) =>
    request<{ data: PublicAdminUser }>(`/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then((payload) => payload.data),

  leads: (query = '') =>
    request<{ data: AdminLead[]; meta: { count: number; total: number } }>(`/admin/leads${query}`),
  patchLead: (
    ref: string,
    patch: {
      status?: string
      owner?: string | null
      value?: number | null
      followUpAt?: string | null
      note?: string
    },
  ) =>
    request<{ data: AdminLead }>(`/admin/leads/${encodeURIComponent(ref)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then((payload) => payload.data),
  createLead: (input: Record<string, unknown>) =>
    request<{ data: AdminLead }>('/admin/leads', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((payload) => payload.data),

  reminders: () => request<{ data: ReminderRecord[]; meta: { open: number } }>('/admin/reminders'),
  createReminder: (input: Record<string, unknown>) =>
    request<{ data: ReminderRecord }>('/admin/reminders', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((payload) => payload.data),
  patchReminder: (id: string, patch: Record<string, unknown>) =>
    request<{ data: ReminderRecord }>(`/admin/reminders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then((payload) => payload.data),
  deleteReminder: (id: string) =>
    request<{ data: { deleted: string } }>(`/admin/reminders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  invoices: () =>
    request<{ data: InvoiceWithTotals[]; summary: InvoiceSummary }>('/admin/invoices'),
  invoice: (id: string) =>
    request<{ data: InvoiceWithTotals }>(`/admin/invoices/${encodeURIComponent(id)}`).then(
      (payload) => payload.data,
    ),
  createInvoice: (input: InvoiceInput) =>
    request<{ data: InvoiceWithTotals; summary: InvoiceSummary }>('/admin/invoices', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  patchInvoice: (id: string, patch: InvoicePatch) =>
    request<{ data: InvoiceWithTotals; summary: InvoiceSummary }>(
      `/admin/invoices/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    ),
  deleteInvoice: (id: string) =>
    request<{ data: { deleted: string }; summary: InvoiceSummary }>(
      `/admin/invoices/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),
  addInvoicePayment: (id: string, input: InvoicePaymentInput) =>
    request<{ data: InvoiceWithTotals; summary: InvoiceSummary }>(
      `/admin/invoices/${encodeURIComponent(id)}/payments`,
      { method: 'POST', body: JSON.stringify(input) },
    ),
  deleteInvoicePayment: (id: string, paymentId: string) =>
    request<{ data: InvoiceWithTotals; summary: InvoiceSummary }>(
      `/admin/invoices/${encodeURIComponent(id)}/payments/${encodeURIComponent(paymentId)}`,
      { method: 'DELETE' },
    ),
  remindInvoice: (id: string) =>
    request<{ data: InvoiceWithTotals; reminder: ReminderRecord; summary: InvoiceSummary }>(
      `/admin/invoices/${encodeURIComponent(id)}/remind`,
      { method: 'POST' },
    ),

  expenses: () => request<{ data: ExpenseRecord[]; summary: ExpenseSummary }>('/admin/expenses'),
  createExpense: (input: ExpenseInput) =>
    request<{ data: ExpenseRecord; summary: ExpenseSummary }>('/admin/expenses', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  patchExpense: (id: string, patch: ExpensePatch) =>
    request<{ data: ExpenseRecord; summary: ExpenseSummary }>(
      `/admin/expenses/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    ),
  deleteExpense: (id: string) =>
    request<{ data: { deleted: string }; summary: ExpenseSummary }>(
      `/admin/expenses/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),

  team: () => request<{ data: TeamMember[]; summary: PayrollSummary }>('/admin/team'),
  createTeamMember: (input: TeamMemberInput) =>
    request<{ data: TeamMember; summary: PayrollSummary }>('/admin/team', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  patchTeamMember: (id: string, patch: TeamMemberPatch) =>
    request<{ data: TeamMember; summary: PayrollSummary }>(
      `/admin/team/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    ),
  deleteTeamMember: (id: string) =>
    request<{ data: { deleted: string }; summary: PayrollSummary }>(
      `/admin/team/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),

  payroll: () => request<{ data: PayrollRecord[]; summary: PayrollSummary }>('/admin/payroll'),
  createPayroll: (input: PayrollInput) =>
    request<{ data: PayrollRecord; summary: PayrollSummary }>('/admin/payroll', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  patchPayroll: (id: string, patch: PayrollPatch) =>
    request<{ data: PayrollRecord; summary: PayrollSummary }>(
      `/admin/payroll/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    ),
  deletePayroll: (id: string) =>
    request<{ data: { deleted: string }; summary: PayrollSummary }>(
      `/admin/payroll/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),
  generatePayroll: (period: string) =>
    request<{
      data: { period: string; created: number; skipped: number }
      summary: PayrollSummary
    }>('/admin/payroll/generate', { method: 'POST', body: JSON.stringify({ period }) }),

  content: () => request<{ data: SiteContent }>('/admin/content').then((payload) => payload.data),
  saveContent: (content: SiteContentPayload, baseVersion?: number) =>
    request<{
      data: SiteContent
      meta: { changed: boolean; revision: ContentRevisionMeta | null }
    }>('/admin/content', {
      method: 'PUT',
      body: JSON.stringify(content),
      ...(baseVersion !== undefined ? { headers: { 'If-Match': String(baseVersion) } } : {}),
    }),
  contentHistory: () =>
    request<{ data: ContentRevisionList }>('/admin/content/revisions').then(
      (payload) => payload.data,
    ),
  restoreContentVersion: (version: number, pageId?: string) =>
    request<{
      data: SiteContent
      meta: { changed: boolean; revision: ContentRevisionMeta | null }
    }>(`/admin/content/revisions/${version}/restore`, {
      method: 'POST',
      body: JSON.stringify(pageId ? { pageId } : {}),
    }),

  media: (folder = '') =>
    request<{ data: SiteMediaAsset[]; folders: string[] }>(
      `/admin/media${folder ? `?folder=${encodeURIComponent(folder)}` : ''}`,
    ),
  patchMedia: (id: string, alt: string) =>
    request<{ data: SiteMediaAsset }>(`/admin/media/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ alt }),
    }).then((payload) => payload.data),
  deleteMedia: (id: string) =>
    request<{ data: { deleted: string } }>(`/admin/media/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  uploadMedia: (
    files: File[],
    folder: string,
    alt: string,
    onProgress?: (percent: number) => void,
  ) =>
    new Promise<{ data: SiteMediaAsset[]; folders: string[] }>((resolve, reject) => {
      const body = new FormData()
      body.append('folder', folder)
      if (alt.trim()) body.append('alt', alt.trim())
      for (const file of files) body.append('files', file)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/v1/admin/media')
      xhr.withCredentials = true
      xhr.setRequestHeader('Accept', 'application/json')
      xhr.setRequestHeader('X-Admin-Request', '1')
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
      })
      xhr.addEventListener('load', () => {
        let payload: {
          data?: SiteMediaAsset[]
          folders?: string[]
          error?: { message?: string }
        } = {}
        try {
          payload = JSON.parse(xhr.responseText) as typeof payload
        } catch {
          reject(new ApiError('The upload response could not be read.', xhr.status))
          return
        }
        if (xhr.status === 401) {
          window.dispatchEvent(new Event('hvac-admin-unauthorised'))
        }
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(
            new ApiError(payload.error?.message ?? `Upload failed (${xhr.status}).`, xhr.status),
          )
          return
        }
        resolve({ data: payload.data ?? [], folders: payload.folders ?? [] })
        notifyAdminData()
      })
      xhr.addEventListener('error', () =>
        reject(new ApiError('The upload could not reach the works API.', 0)),
      )
      xhr.send(body)
    }),

  customers: () =>
    request<{ data: CustomerAccountWithStats[] }>('/admin/customers').then(
      (payload) => payload.data,
    ),
  patchCustomer: (id: string, status: string) =>
    request<{ data: CustomerAccountWithStats }>(`/admin/customers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then((payload) => payload.data),
  customerFile: (id: string) =>
    request<{ data: { customer: CustomerAccount; file: CustomerPortalFile } }>(
      `/admin/customers/${encodeURIComponent(id)}/file`,
    ).then((payload) => payload.data),
  createCustomerSite: (id: string, input: CustomerSiteInput) =>
    request<{ data: CustomerSite }>(`/admin/customers/${encodeURIComponent(id)}/sites`, {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((payload) => payload.data),
  patchCustomerSite: (id: string, siteId: string, input: Partial<CustomerSiteInput>) =>
    request<{ data: CustomerSite }>(
      `/admin/customers/${encodeURIComponent(id)}/sites/${encodeURIComponent(siteId)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    ).then((payload) => payload.data),
  deleteCustomerSite: (id: string, siteId: string) =>
    request<{ data: { deleted: string } }>(
      `/admin/customers/${encodeURIComponent(id)}/sites/${encodeURIComponent(siteId)}`,
      { method: 'DELETE' },
    ),
  createEquipment: (id: string, input: EquipmentInput) =>
    request<{ data: EquipmentRecord }>(`/admin/customers/${encodeURIComponent(id)}/equipment`, {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((payload) => payload.data),
  patchEquipment: (id: string, equipmentId: string, input: Partial<EquipmentInput>) =>
    request<{ data: EquipmentRecord }>(
      `/admin/customers/${encodeURIComponent(id)}/equipment/${encodeURIComponent(equipmentId)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    ).then((payload) => payload.data),
  deleteEquipment: (id: string, equipmentId: string) =>
    request<{ data: { deleted: string } }>(
      `/admin/customers/${encodeURIComponent(id)}/equipment/${encodeURIComponent(equipmentId)}`,
      { method: 'DELETE' },
    ),
  createQuotation: (id: string, input: QuotationInput) =>
    request<{ data: QuotationRecord & { totals: QuotationTotals } }>(
      `/admin/customers/${encodeURIComponent(id)}/quotations`,
      { method: 'POST', body: JSON.stringify(input) },
    ).then((payload) => payload.data),
  patchQuotation: (id: string, quotationId: string, input: Record<string, unknown>) =>
    request<{ data: QuotationRecord & { totals: QuotationTotals } }>(
      `/admin/customers/${encodeURIComponent(id)}/quotations/${encodeURIComponent(quotationId)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    ).then((payload) => payload.data),
  deleteQuotation: (id: string, quotationId: string) =>
    request<{ data: { deleted: string } }>(
      `/admin/customers/${encodeURIComponent(id)}/quotations/${encodeURIComponent(quotationId)}`,
      { method: 'DELETE' },
    ),
  createAmc: (id: string, input: AmcInput) =>
    request<{ data: AmcContract }>(`/admin/customers/${encodeURIComponent(id)}/amc`, {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((payload) => payload.data),
  patchAmc: (id: string, contractId: string, input: Partial<AmcInput>) =>
    request<{ data: AmcContract }>(
      `/admin/customers/${encodeURIComponent(id)}/amc/${encodeURIComponent(contractId)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    ).then((payload) => payload.data),
  deleteAmc: (id: string, contractId: string) =>
    request<{ data: { deleted: string } }>(
      `/admin/customers/${encodeURIComponent(id)}/amc/${encodeURIComponent(contractId)}`,
      { method: 'DELETE' },
    ),
  createJobReport: (id: string, input: JobReportInput) =>
    request<{ data: JobReport }>(`/admin/customers/${encodeURIComponent(id)}/reports`, {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((payload) => payload.data),
  patchJobReport: (id: string, reportId: string, input: Partial<JobReportInput>) =>
    request<{ data: JobReport }>(
      `/admin/customers/${encodeURIComponent(id)}/reports/${encodeURIComponent(reportId)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    ).then((payload) => payload.data),
  deleteJobReport: (id: string, reportId: string) =>
    request<{ data: { deleted: string } }>(
      `/admin/customers/${encodeURIComponent(id)}/reports/${encodeURIComponent(reportId)}`,
      { method: 'DELETE' },
    ),
  replySupportTicket: (id: string, body: string) =>
    request<{ data: SupportTicket }>(`/admin/support-tickets/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }).then((payload) => payload.data),
  patchSupportTicket: (id: string, status: TicketStatus) =>
    request<{ data: SupportTicket }>(`/admin/support-tickets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then((payload) => payload.data),
  eraseCustomer: (id: string) =>
    request<{ data: { erased: boolean } }>(`/admin/customers/${encodeURIComponent(id)}/erase`, {
      method: 'POST',
      body: JSON.stringify({ confirm: 'ERASE' }),
    }).then((payload) => payload.data),
  appointments: () =>
    request<{ data: AppointmentRecord[] }>('/admin/appointments').then((payload) => payload.data),

  newsletters: () =>
    request<{ data: NewsletterRecord[]; summary: NewsletterSummary }>('/admin/newsletters'),
  newsletterAudiences: () =>
    request<{
      data: {
        counts: Record<string, number>
        customers: { name: string; email: string }[]
      }
    }>('/admin/newsletters/audiences').then((payload) => payload.data),
  createNewsletter: (input: NewsletterInput) =>
    request<{ data: NewsletterRecord; summary: NewsletterSummary }>('/admin/newsletters', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  patchNewsletter: (id: string, patch: NewsletterPatch) =>
    request<{ data: NewsletterRecord; summary: NewsletterSummary }>(
      `/admin/newsletters/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    ),
  sendNewsletter: (id: string) =>
    request<{ data: NewsletterRecord; summary: NewsletterSummary }>(
      `/admin/newsletters/${encodeURIComponent(id)}/send`,
      { method: 'POST' },
    ),
  scheduleNewsletter: (id: string, scheduledAt: string) =>
    request<{ data: NewsletterRecord; summary: NewsletterSummary }>(
      `/admin/newsletters/${encodeURIComponent(id)}/schedule`,
      { method: 'POST', body: JSON.stringify({ scheduledAt }) },
    ),
  pauseNewsletter: (id: string) =>
    request<{ data: NewsletterRecord; summary: NewsletterSummary }>(
      `/admin/newsletters/${encodeURIComponent(id)}/pause`,
      { method: 'POST' },
    ),
  resumeNewsletter: (id: string) =>
    request<{ data: NewsletterRecord; summary: NewsletterSummary }>(
      `/admin/newsletters/${encodeURIComponent(id)}/resume`,
      { method: 'POST' },
    ),
  duplicateNewsletter: (id: string) =>
    request<{ data: NewsletterRecord; summary: NewsletterSummary }>(
      `/admin/newsletters/${encodeURIComponent(id)}/duplicate`,
      { method: 'POST' },
    ),
  deleteNewsletter: (id: string) =>
    request<{ data: { deleted: string }; summary: NewsletterSummary }>(
      `/admin/newsletters/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),

  coupons: () => request<{ data: CouponWithStats[]; summary: CouponSummary }>('/admin/coupons'),
  createCoupon: (input: CouponInput) =>
    request<{ data: CouponWithStats; summary: CouponSummary }>('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  patchCoupon: (id: string, patch: CouponPatch) =>
    request<{ data: CouponWithStats; summary: CouponSummary }>(
      `/admin/coupons/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    ),
  deleteCoupon: (id: string) =>
    request<{ data: { deleted: string }; summary: CouponSummary }>(
      `/admin/coupons/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),
  createAppointment: (input: Record<string, unknown>) =>
    request<{ data: AppointmentRecord }>('/admin/appointments', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((payload) => payload.data),
  patchAppointment: (id: string, patch: Record<string, unknown>) =>
    request<{ data: AppointmentRecord }>(`/admin/appointments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then((payload) => payload.data),
}
