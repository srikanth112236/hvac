import type {
  AppointmentRecord,
  CustomerAccount,
  CustomerAppointmentAction,
  CustomerBookingInput,
  CustomerPortalFile,
  CustomerProfileInput,
  CustomerRegisterInput,
  CustomerSite,
  CustomerSiteInput,
  InvoiceWithTotals,
  NotificationPreferences,
  NotificationPreferencesPatch,
  QuotationRecord,
  QuotationTotals,
  SupportTicket,
  TicketInput,
} from '@hvac/shared'

const API_BASE = '/api/v1'

export class PortalError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'PortalError'
    this.status = status
  }
}

function mutationHeaders(json = true): HeadersInit {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'X-Customer-Request': '1',
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: { ...mutationHeaders(init.body !== undefined), ...init.headers },
  })
  let payload: { data?: T; error?: { message?: string } } = {}
  try {
    payload = (await response.json()) as typeof payload
  } catch {
    throw new PortalError('The portal response could not be read.', response.status)
  }
  if (!response.ok) {
    throw new PortalError(payload.error?.message ?? `Request failed (${response.status}).`, response.status)
  }
  return payload.data as T
}

export const portalApi = {
  me: () => request<CustomerAccount>('/portal/auth/me'),
  login: (email: string, password: string) =>
    request<CustomerAccount>('/portal/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  forgot: (email: string) =>
    request<{ requested: boolean }>('/portal/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  reset: (token: string, password: string) =>
    request<{ reset: boolean }>('/portal/auth/reset', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  register: (input: CustomerRegisterInput) =>
    request<CustomerAccount>('/portal/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  verify: (token: string) =>
    request<{ verified: boolean }>('/portal/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  resendVerification: (email: string) =>
    request<{ requested: boolean }>('/portal/auth/verify/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  logout: () =>
    request<{ signedOut: boolean }>('/portal/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  updateProfile: (input: CustomerProfileInput) =>
    request<CustomerAccount>('/portal/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  file: () => request<CustomerPortalFile>('/portal/file'),
  overview: () => request<CustomerPortalFile>('/portal/file'),
  invoice: (id: string) => request<InvoiceWithTotals>(`/portal/invoices/${encodeURIComponent(id)}`),
  book: (input: CustomerBookingInput) =>
    request<AppointmentRecord>('/portal/appointments', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  patchAppointment: (id: string, input: CustomerAppointmentAction) =>
    request<AppointmentRecord>(`/portal/appointments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  createSite: (input: CustomerSiteInput) =>
    request<CustomerSite>('/portal/sites', { method: 'POST', body: JSON.stringify(input) }),
  patchSite: (id: string, input: Partial<CustomerSiteInput>) =>
    request<CustomerSite>(`/portal/sites/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteSite: (id: string) =>
    request<{ deleted: string }>(`/portal/sites/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  acceptQuotation: (id: string) =>
    request<QuotationRecord & { totals: QuotationTotals }>(
      `/portal/quotations/${encodeURIComponent(id)}/accept`,
      { method: 'POST' },
    ),
  requestQuotationChanges: (id: string, note: string) =>
    request<QuotationRecord & { totals: QuotationTotals }>(
      `/portal/quotations/${encodeURIComponent(id)}/changes`,
      { method: 'POST', body: JSON.stringify({ note }) },
    ),
  renewAmc: (id: string) =>
    request<SupportTicket>(`/portal/amc/${encodeURIComponent(id)}/renew`, { method: 'POST' }),
  createTicket: (input: TicketInput) =>
    request<SupportTicket>('/portal/tickets', { method: 'POST', body: JSON.stringify(input) }),
  replyTicket: (id: string, body: string) =>
    request<SupportTicket>(`/portal/tickets/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  preferences: () => request<NotificationPreferences>('/portal/preferences'),
  patchPreferences: (patch: NotificationPreferencesPatch) =>
    request<NotificationPreferences>('/portal/preferences', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
}
