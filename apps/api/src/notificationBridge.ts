import type { NextFunction, Request, Response } from 'express'
import type { NotificationCategory, NotificationPriority, NotificationSource } from '@hvac/shared'
import { createNotification } from './notifications.js'

type Obj = Record<string, unknown>

interface NotificationDescriptor {
  type: string
  category: NotificationCategory
  priority: NotificationPriority
  title: string
  message: string
  link: string
  entityType: string | null
  entityId: string | null
  entityLabel: string | null
  source: NotificationSource
  metadata: Record<string, string | number | boolean | null>
}

const LEAD_STATUS_LABEL: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  'site-visit': 'Site visit',
  quoted: 'Quoted',
  won: 'Won',
  lost: 'Lost',
}

function asRecord(value: unknown): Obj | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Obj) : null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function money(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function dataOf(body: unknown): Obj {
  const record = asRecord(body)
  if (!record) return {}
  return asRecord(record.data) ?? record
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const candidate = text(value)
    if (candidate) return candidate
  }
  return ''
}

function pathId(path: string, index: number): string {
  return path.split('/').filter(Boolean)[index] ?? ''
}

function customerIdFromPath(path: string): string {
  const match = path.match(/\/admin\/customers\/([^/]+)/)
  return match?.[1] ?? ''
}

function actionWord(method: string, path: string, body: Obj, data: Obj): string {
  if (path.endsWith('/payments')) return 'payment recorded'
  if (path.endsWith('/accept')) return 'accepted'
  if (path.endsWith('/changes')) return 'change requested'
  if (path.endsWith('/messages')) return 'reply added'
  if (path.endsWith('/renew')) return 'renewal requested'
  if (path.endsWith('/send')) return 'sent'
  if (path.endsWith('/schedule')) return 'scheduled'
  if (path.endsWith('/pause')) return 'paused'
  if (path.endsWith('/resume')) return 'resumed'
  if (path.endsWith('/duplicate')) return 'duplicated'
  if (path.endsWith('/remind')) return 'reminder sent'
  if (path.endsWith('/restore')) return 'restored'
  if (path.endsWith('/erase')) return 'erased'
  if (path.endsWith('/generate')) return 'generated'
  if (path.endsWith('/approve')) return 'approved'
  if (method === 'POST') {
    if (path === '/admin/leads') return 'created'
    const status = firstText(data.status, body.status)
    if (path.startsWith('/admin/leads/') && status)
      return `moved to ${LEAD_STATUS_LABEL[status] ?? status}`
    return 'created'
  }
  if (method === 'PUT' || method === 'PATCH') {
    const status = firstText(data.status, body.status)
    if (path.startsWith('/admin/leads/') && status)
      return `moved to ${LEAD_STATUS_LABEL[status] ?? status}`
    if (status === 'done' || status === 'completed') return 'completed'
    if (status === 'active') return 'approved'
    return 'updated'
  }
  if (method === 'DELETE') return 'removed'
  return 'changed'
}

function basePriority(method: string, path: string, data: Obj, body: Obj): NotificationPriority {
  if (path.endsWith('/accept') || path.endsWith('/changes')) return 'high'
  if (path.endsWith('/payments')) return 'high'
  if (path.endsWith('/remind')) return 'low'
  if (path.endsWith('/erase')) return 'urgent'
  if (path === '/leads' || path === '/leads/callback') {
    return firstText(data.urgency, body.urgency) === 'emergency' ? 'urgent' : 'high'
  }
  if (path === '/portal/tickets' || path.endsWith('/messages')) return 'high'
  if (path.includes('/support-tickets')) return 'high'
  if (method === 'POST' && path.includes('/newsletters/') && path.endsWith('/send')) return 'high'
  if (method === 'DELETE') return 'low'
  return 'normal'
}

function sourceFor(path: string, adminEmail: string | null): NotificationSource {
  if (path.startsWith('/portal/')) return 'portal'
  if (path === '/leads' || path === '/leads/callback' || path === '/newsletter-signups')
    return 'public'
  if (adminEmail) return 'admin'
  return 'system'
}

function leadDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const ref = firstText(data.ref, body.ref, pathId(path, 2))
  const name = firstText(data.name, body.name, 'A new enquiry')
  const status = firstText(data.status, body.status, 'new')
  const service = firstText(data.serviceName, body.serviceName, 'Service to be allocated')
  const city = firstText(data.city, body.city)
  const statusLabel = LEAD_STATUS_LABEL[status] ?? status
  const edited = method !== 'POST'
  return {
    type: edited ? 'lead.updated' : 'lead.received',
    category: 'leads' as const,
    priority: basePriority(method, path, data, body),
    title: edited ? `Lead ${statusLabel.toLowerCase()} · ${name}` : `New enquiry · ${name}`,
    message: [service, city, ref].filter(Boolean).join(' · '),
    link: `/admin/leads?lead=${encodeURIComponent(ref)}`,
    entityType: 'lead',
    entityId: ref || null,
    entityLabel: name,
    source: sourceFor(path, adminEmail),
    metadata: { reference: ref, status, service, city, method, path },
  }
}

function customerDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const id = firstText(data.id, body.id, pathId(path, 2))
  const name = firstText(data.name, body.name, 'Customer')
  const status = firstText(data.status, body.status)
  return {
    type: method === 'POST' ? 'customer.created' : 'customer.updated',
    category: 'customers' as const,
    priority: status === 'active' ? ('high' as const) : ('normal' as const),
    title:
      status === 'active'
        ? `Customer approved · ${name}`
        : method === 'POST'
          ? `New customer · ${name}`
          : `Customer updated · ${name}`,
    message: [firstText(data.email, body.email), firstText(data.phone, body.phone)]
      .filter(Boolean)
      .join(' · '),
    link: id ? `/admin/customers/${encodeURIComponent(id)}` : '/admin/customers',
    entityType: 'customer',
    entityId: id || null,
    entityLabel: name,
    source: sourceFor(path, adminEmail),
    metadata: { status, method, path },
  }
}

function invoiceDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const id = firstText(data.id, pathId(path, 2))
  const ref = firstText(data.ref, body.ref, id)
  const customer = firstText(data.customerName, body.customerName, 'Customer')
  const totals = asRecord(data.totals)
  const state = firstText(totals?.state, data.status, body.status)
  const balance = numberValue(totals?.balance)
  const action = path.endsWith('/payments')
    ? 'Payment recorded'
    : path.endsWith('/remind')
      ? 'Payment reminder sent'
      : method === 'DELETE'
        ? 'Invoice removed'
        : method === 'POST'
          ? 'Invoice created'
          : state === 'paid'
            ? 'Invoice paid'
            : 'Invoice updated'
  return {
    type: path.endsWith('/payments') ? 'invoice.payment' : 'invoice.updated',
    category: 'invoices' as const,
    priority: basePriority(method, path, data, body),
    title: `${action} · ${ref}`,
    message: [
      customer,
      state ? state.toUpperCase() : '',
      balance !== null ? `Balance ${money(balance)}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    link:
      method === 'DELETE' || !id ? '/admin/invoices' : `/admin/invoices/${encodeURIComponent(id)}`,
    entityType: 'invoice',
    entityId: id || ref || null,
    entityLabel: ref || customer,
    source: sourceFor(path, adminEmail),
    metadata: { reference: ref, customer, state, balance, method, path },
  }
}

function quotationDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const id = firstText(
    data.id,
    body.id,
    path.includes('/customers/') ? pathId(path, 4) : pathId(path, 2),
  )
  const ref = firstText(data.ref, body.ref, id)
  const customer = firstText(data.customerName, body.customerName, 'Customer')
  const title = firstText(data.title, body.title, 'Quotation')
  const action = path.endsWith('/accept')
    ? 'Quotation accepted'
    : path.endsWith('/changes')
      ? 'Quotation change requested'
      : method === 'POST'
        ? 'Quotation created'
        : method === 'DELETE'
          ? 'Quotation removed'
          : 'Quotation updated'
  const totals = asRecord(data.totals)
  const total = numberValue(totals?.total)
  return {
    type: path.endsWith('/accept')
      ? 'quotation.accepted'
      : path.endsWith('/changes')
        ? 'quotation.changes'
        : 'quotation.updated',
    category: 'quotations' as const,
    priority: basePriority(method, path, data, body),
    title: `${action} · ${ref}`,
    message: [customer, title, total !== null ? `Total ${money(total)}` : '']
      .filter(Boolean)
      .join(' · '),
    link:
      method === 'DELETE' || !id
        ? '/admin/quotations'
        : `/admin/quotations?open=${encodeURIComponent(id)}`,
    entityType: 'quotation',
    entityId: id || ref || null,
    entityLabel: ref || title,
    source: sourceFor(path, adminEmail),
    metadata: { reference: ref, customer, title, total, method, path },
  }
}

function jobDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const id = firstText(data.id, pathId(path, 2))
  const ref = firstText(data.ref, body.ref, id)
  const title = firstText(data.title, body.title, 'Job')
  const customer = firstText(data.customerName, body.customerName)
  const status = firstText(data.status, body.status)
  return {
    type: method === 'POST' ? 'job.created' : 'job.updated',
    category: 'jobs' as const,
    priority: status === 'completed' ? ('normal' as const) : ('normal' as const),
    title:
      method === 'POST'
        ? `Job created · ${ref}`
        : method === 'DELETE'
          ? `Job removed · ${ref}`
          : `Job updated · ${ref}`,
    message: [title, customer, status].filter(Boolean).join(' · '),
    link: method === 'DELETE' || !id ? '/admin/jobs' : `/admin/jobs?open=${encodeURIComponent(id)}`,
    entityType: 'job',
    entityId: id || ref || null,
    entityLabel: ref || title,
    source: sourceFor(path, adminEmail),
    metadata: { reference: ref, status, customer, method, path },
  }
}

function reminderDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const id = firstText(data.id, pathId(path, 2))
  const title = firstText(data.title, body.title, 'Reminder')
  const status = firstText(data.status, body.status)
  return {
    type: status === 'done' ? 'reminder.completed' : 'reminder.updated',
    category: 'reminders' as const,
    priority: 'normal' as const,
    title:
      status === 'done'
        ? `Reminder completed · ${title}`
        : method === 'DELETE'
          ? `Reminder removed · ${title}`
          : method === 'POST'
            ? `Reminder created · ${title}`
            : `Reminder updated · ${title}`,
    message: [firstText(data.leadRef, body.leadRef), firstText(data.invoiceRef, body.invoiceRef)]
      .filter(Boolean)
      .join(' · '),
    link:
      method === 'DELETE' || !id
        ? '/admin/reminders'
        : `/admin/reminders?open=${encodeURIComponent(id)}`,
    entityType: 'reminder',
    entityId: id || null,
    entityLabel: title,
    source: sourceFor(path, adminEmail),
    metadata: { status, method, path },
  }
}

function marketingDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
): NotificationDescriptor {
  if (path === '/newsletter-signups') {
    const email = firstText(data.email, body.email)
    return {
      type: 'marketing.signup',
      category: 'marketing' as const,
      priority: 'low' as const,
      title: 'Newsletter signup',
      message: email,
      link: '/admin/newsletters',
      entityType: 'newsletter-signup',
      entityId: email || null,
      entityLabel: email || null,
      source: 'public' as const,
      metadata: { email, method, path },
    }
  }

  if (path.startsWith('/admin/coupons')) {
    const id = firstText(data.id, pathId(path, 2))
    const code = firstText(data.code, body.code, id)
    return {
      type: 'coupon.updated',
      category: 'marketing' as const,
      priority: 'normal' as const,
      title:
        method === 'POST'
          ? `Coupon created · ${code}`
          : method === 'DELETE'
            ? `Coupon removed · ${code}`
            : `Coupon updated · ${code}`,
      message: firstText(data.description, body.description),
      link:
        method === 'DELETE' || !id
          ? '/admin/coupons'
          : `/admin/coupons?open=${encodeURIComponent(id)}`,
      entityType: 'coupon',
      entityId: id || code || null,
      entityLabel: code || null,
      source: sourceFor(path, adminEmail),
      metadata: { code, method, path },
    }
  }

  const id = firstText(data.id, pathId(path, 2))
  const subject = firstText(data.subject, body.subject, 'Campaign')
  const action = actionWord(method, path, body, data)
  return {
    type: `campaign.${action.replace(/\s+/g, '-')}`,
    category: 'marketing' as const,
    priority: basePriority(method, path, data, body),
    title: `Campaign ${action} · ${subject}`,
    message: firstText(data.preheader, data.status, ''),
    link:
      method === 'DELETE' || !id
        ? '/admin/newsletters'
        : `/admin/newsletters?open=${encodeURIComponent(id)}`,
    entityType: 'campaign',
    entityId: id || null,
    entityLabel: subject,
    source: sourceFor(path, adminEmail),
    metadata: { subject, status: firstText(data.status), method, path },
  }
}

function expenseDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const id = firstText(data.id, pathId(path, 2))
  const description = firstText(data.description, body.description, 'Expense')
  return {
    type: 'expense.updated',
    category: 'expenses' as const,
    priority: 'normal' as const,
    title:
      method === 'POST'
        ? `Expense recorded · ${description}`
        : method === 'DELETE'
          ? `Expense removed · ${description}`
          : `Expense updated · ${description}`,
    message: [
      firstText(data.vendor, body.vendor),
      firstText(data.category),
      firstText(data.reference),
    ]
      .filter(Boolean)
      .join(' · '),
    link:
      method === 'DELETE' || !id
        ? '/admin/expenses'
        : `/admin/expenses?open=${encodeURIComponent(id)}`,
    entityType: 'expense',
    entityId: id || null,
    entityLabel: description,
    source: sourceFor(path, adminEmail),
    metadata: { method, path },
  }
}

function teamDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const isPayroll = path.includes('/payroll')
  const id = firstText(data.id, pathId(path, 2))
  const label = isPayroll
    ? firstText(data.period, body.period, 'Payroll')
    : firstText(data.name, body.name, 'Team member')
  return {
    type: isPayroll ? 'payroll.updated' : 'team.updated',
    category: 'team' as const,
    priority: 'normal' as const,
    title: isPayroll
      ? `Payroll ${method === 'POST' ? 'recorded' : 'updated'} · ${label}`
      : `Team member ${method === 'POST' ? 'added' : method === 'DELETE' ? 'removed' : 'updated'} · ${label}`,
    message: [firstText(data.email, body.email), firstText(data.role, body.role)]
      .filter(Boolean)
      .join(' · '),
    link:
      method === 'DELETE' || !id
        ? '/admin/team'
        : isPayroll
          ? `/admin/team?payroll=${encodeURIComponent(id)}`
          : `/admin/team?member=${encodeURIComponent(id)}`,
    entityType: isPayroll ? 'payroll' : 'team',
    entityId: id || null,
    entityLabel: label,
    source: sourceFor(path, adminEmail),
    metadata: { method, path },
  }
}

function supportDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const id = firstText(data.id, pathId(path, 2))
  const ref = firstText(data.ref, id)
  const subject = firstText(data.subject, body.subject, 'Support request')
  const customerId = firstText(data.customerId, path.match(/\/customers\/([^/]+)/)?.[1] ?? '')
  return {
    type: method === 'POST' ? 'support.created' : 'support.updated',
    category: 'support' as const,
    priority: basePriority(method, path, data, body),
    title: path.endsWith('/messages')
      ? `Support reply · ${ref}`
      : method === 'POST'
        ? `New support request · ${ref}`
        : `Support request updated · ${ref}`,
    message: subject,
    link: customerId
      ? `/admin/customers/${encodeURIComponent(customerId)}?tab=tickets&open=${encodeURIComponent(id)}`
      : '/admin/customers',
    entityType: 'support-ticket',
    entityId: id || ref || null,
    entityLabel: ref || subject,
    source: sourceFor(path, adminEmail),
    metadata: { reference: ref, subject, method, path },
  }
}

function appointmentDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const id = firstText(data.id, pathId(path, 2))
  const ref = firstText(data.ref, body.ref, id)
  const customer = firstText(data.customerName, body.customerName, 'Customer')
  const service = firstText(data.serviceName, body.serviceName, 'Service visit')
  return {
    type: method === 'POST' ? 'visit.booked' : 'visit.updated',
    category: 'jobs' as const,
    priority: 'high' as const,
    title: method === 'POST' ? `Visit requested · ${customer}` : `Visit updated · ${customer}`,
    message: [service, ref, firstText(data.address, body.address)].filter(Boolean).join(' · '),
    link: id ? `/admin/dispatch?open=${encodeURIComponent(id)}` : '/admin/dispatch',
    entityType: 'appointment',
    entityId: id || ref || null,
    entityLabel: ref || customer,
    source: sourceFor(path, adminEmail),
    metadata: { reference: ref, customer, service, method, path },
  }
}

function customerScopedDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
  resource: 'sites' | 'equipment' | 'quotations' | 'amc' | 'reports',
) {
  const customerId = customerIdFromPath(path)
  const id = firstText(data.id, pathId(path, 4))
  const label =
    resource === 'sites'
      ? firstText(data.label, body.label, 'Service site')
      : resource === 'equipment'
        ? firstText(data.name, body.name, 'Equipment')
        : resource === 'quotations'
          ? firstText(data.ref, body.ref, 'Quotation')
          : resource === 'amc'
            ? firstText(data.ref, body.ref, 'AMC contract')
            : firstText(data.ref, data.title, body.title, 'Report')
  return {
    type: `${resource}.updated`,
    category: (resource === 'quotations'
      ? 'quotations'
      : resource === 'reports'
        ? 'jobs'
        : 'customers') as NotificationCategory,
    priority: 'normal' as const,
    title: `${resource === 'sites' ? 'Site' : resource === 'equipment' ? 'Equipment' : resource === 'quotations' ? 'Quotation' : resource === 'amc' ? 'AMC contract' : 'Report'} ${method === 'POST' ? 'added' : method === 'DELETE' ? 'removed' : 'updated'} · ${label}`,
    message: firstText(data.customerName, body.customerName, 'Customer file updated'),
    link: customerId
      ? `/admin/customers/${encodeURIComponent(customerId)}?tab=${resource}&open=${encodeURIComponent(id)}`
      : `/admin/customers/${encodeURIComponent(customerId)}`,
    entityType: resource,
    entityId: id || null,
    entityLabel: label,
    source: sourceFor(path, adminEmail),
    metadata: { customerId, method, path },
  }
}

function contentDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const version = firstText(data.version, body.version)
  return {
    type: path.includes('/restore') ? 'content.restored' : 'content.published',
    category: 'content' as const,
    priority: 'high' as const,
    title: path.includes('/restore')
      ? `Content restored${version ? ` · v${version}` : ''}`
      : 'Website content published',
    message: firstText(data.note, body.note, 'The public site was updated.'),
    link: version
      ? `/admin/content/revisions?version=${encodeURIComponent(version)}`
      : '/admin/content/revisions',
    entityType: 'content',
    entityId: version || null,
    entityLabel: version ? `v${version}` : 'Website content',
    source: sourceFor(path, adminEmail),
    metadata: { version, method, path },
  }
}

function userDescriptor(
  path: string,
  method: string,
  body: Obj,
  data: Obj,
  adminEmail: string | null,
) {
  const id = firstText(data.id, pathId(path, 2))
  const email = firstText(data.email, body.email, 'Staff account')
  return {
    type: 'user.updated',
    category: 'system' as const,
    priority: 'normal' as const,
    title:
      method === 'POST' ? `Staff account added · ${email}` : `Staff account updated · ${email}`,
    message: firstText(data.role, body.role, ''),
    link: id ? `/admin/settings?user=${encodeURIComponent(id)}` : '/admin/settings',
    entityType: 'admin-user',
    entityId: id || email || null,
    entityLabel: email,
    source: sourceFor(path, adminEmail),
    metadata: { email, method, path },
  }
}

function resolveDescriptor(
  method: string,
  path: string,
  body: Obj,
  bodyData: Obj,
  adminEmail: string | null,
  customerName: string | null,
): NotificationDescriptor | null {
  if (path === '/leads' || path === '/leads/callback' || path === '/admin/leads') {
    return leadDescriptor(path, method, body, bodyData, adminEmail)
  }
  if (path.startsWith('/admin/leads/'))
    return leadDescriptor(path, method, body, bodyData, adminEmail)

  if (path.startsWith('/admin/customers/')) {
    if (path.includes('/quotations'))
      return quotationDescriptor(path, method, body, bodyData, adminEmail)
    if (path.includes('/sites'))
      return customerScopedDescriptor(path, method, body, bodyData, adminEmail, 'sites')
    if (path.includes('/equipment'))
      return customerScopedDescriptor(path, method, body, bodyData, adminEmail, 'equipment')
    if (path.includes('/amc'))
      return customerScopedDescriptor(path, method, body, bodyData, adminEmail, 'amc')
    if (path.includes('/reports'))
      return customerScopedDescriptor(path, method, body, bodyData, adminEmail, 'reports')
    return customerDescriptor(path, method, body, bodyData, adminEmail)
  }
  if (path === '/admin/customers')
    return customerDescriptor(path, method, body, bodyData, adminEmail)

  if (path.startsWith('/admin/invoices'))
    return invoiceDescriptor(path, method, body, bodyData, adminEmail)
  if (path.startsWith('/admin/quotations'))
    return quotationDescriptor(path, method, body, bodyData, adminEmail)
  if (path.startsWith('/admin/jobs')) return jobDescriptor(path, method, body, bodyData, adminEmail)
  if (path.startsWith('/admin/appointments')) {
    return appointmentDescriptor(path, method, body, bodyData, adminEmail)
  }
  if (path.startsWith('/admin/reminders'))
    return reminderDescriptor(path, method, body, bodyData, adminEmail)
  if (path.startsWith('/admin/expenses'))
    return expenseDescriptor(path, method, body, bodyData, adminEmail)
  if (path.startsWith('/admin/team') || path.startsWith('/admin/payroll')) {
    return teamDescriptor(path, method, body, bodyData, adminEmail)
  }
  if (path.startsWith('/admin/support-tickets'))
    return supportDescriptor(path, method, body, bodyData, adminEmail)
  if (
    path.startsWith('/admin/newsletters') ||
    path.startsWith('/admin/coupons') ||
    path === '/newsletter-signups'
  ) {
    return marketingDescriptor(path, method, body, bodyData, adminEmail)
  }
  if (path.startsWith('/admin/media')) {
    return {
      type: 'media.updated',
      category: 'content',
      priority: 'low',
      title:
        method === 'POST'
          ? 'Media uploaded'
          : method === 'DELETE'
            ? 'Media removed'
            : 'Media updated',
      message: firstText(bodyData.alt, bodyData.filename, 'Content library changed.'),
      link: '/admin/content',
      entityType: 'media',
      entityId: firstText(bodyData.id, pathId(path, 2)) || null,
      entityLabel: firstText(bodyData.filename, bodyData.alt, 'Media'),
      source: sourceFor(path, adminEmail),
      metadata: { method, path },
    }
  }
  if (path.startsWith('/admin/content')) {
    return contentDescriptor(path, method, body, bodyData, adminEmail)
  }
  if (path.startsWith('/admin/users'))
    return userDescriptor(path, method, body, bodyData, adminEmail)

  if (path.startsWith('/portal/quotations/'))
    return quotationDescriptor(path, method, body, bodyData, adminEmail)
  if (path.startsWith('/portal/tickets'))
    return supportDescriptor(path, method, body, bodyData, adminEmail)
  if (path.startsWith('/portal/amc/')) {
    const ticket = asRecord(bodyData)
    return {
      type: 'amc.renewal',
      category: 'support',
      priority: 'high',
      title: `AMC renewal requested · ${firstText(bodyData.ref, 'Contract')}`,
      message: customerName ?? 'Customer requested a renewal.',
      link: ticket?.id
        ? `/admin/customers/${encodeURIComponent(String(ticket.customerId ?? ''))}?tab=tickets&open=${encodeURIComponent(String(ticket.id))}`
        : '/admin/customers',
      entityType: 'support-ticket',
      entityId: firstText(bodyData.id, bodyData.ref, '') || null,
      entityLabel: firstText(bodyData.ref, 'AMC renewal'),
      source: 'portal',
      metadata: { method, path },
    }
  }
  if (path.startsWith('/portal/appointments')) {
    return appointmentDescriptor(path, method, body, bodyData, adminEmail)
  }
  if (path === '/portal/profile') {
    const customerId = firstText(bodyData.id)
    return {
      type: 'customer.profile-updated',
      category: 'customers',
      priority: 'normal',
      title: 'Customer updated portal contact details',
      message: customerName ?? 'A customer changed their contact details.',
      link: customerId ? `/admin/customers/${encodeURIComponent(customerId)}` : '/admin/customers',
      entityType: 'customer',
      entityId: customerId || null,
      entityLabel: customerName,
      source: 'portal',
      metadata: { method, path },
    }
  }
  if (path.startsWith('/portal/sites') || path.startsWith('/portal/preferences')) {
    const customerId = firstText(bodyData.customerId, body.customerId)
    const isSite = path.startsWith('/portal/sites')
    const recordId = firstText(bodyData.id, pathId(path, 2))
    const tab = isSite ? 'sites' : 'preferences'
    return {
      type: 'customer.portal-updated',
      category: 'customers',
      priority: 'normal',
      title: isSite
        ? `Customer ${method === 'POST' ? 'added' : method === 'DELETE' ? 'removed' : 'updated'} a service site`
        : 'Customer portal preferences updated',
      message: customerName ?? 'A customer changed their portal settings.',
      link: customerId
        ? `/admin/customers/${encodeURIComponent(customerId)}?tab=${tab}${isSite && recordId ? `&open=${encodeURIComponent(recordId)}` : ''}`
        : '/admin/customers',
      entityType: 'customer',
      entityId: customerId || null,
      entityLabel: customerName,
      source: 'portal',
      metadata: { method, path },
    }
  }
  if (path === '/portal/auth/register') {
    return {
      type: 'customer.registered',
      category: 'customers',
      priority: 'high',
      title: `Portal account registered · ${firstText(bodyData.name, body.name, 'New customer')}`,
      message: firstText(bodyData.email, body.email, 'Awaiting admin approval.'),
      link: firstText(bodyData.id)
        ? `/admin/customers/${encodeURIComponent(firstText(bodyData.id))}`
        : '/admin/customers',
      entityType: 'customer',
      entityId: firstText(bodyData.id, body.email) || null,
      entityLabel: firstText(bodyData.name, body.name, 'New customer'),
      source: 'portal',
      metadata: { method, path },
    }
  }

  if (path.startsWith('/admin/amc/auto-schedule')) {
    return {
      type: 'amc.schedule-run',
      category: 'jobs',
      priority: 'low',
      title: 'AMC schedule checked',
      message: `${firstText(bodyData.created, '0')} new visit(s) generated.`,
      link: '/admin/jobs',
      entityType: 'job',
      entityId: null,
      entityLabel: 'AMC schedule',
      source: 'system',
      metadata: { method, path },
    }
  }

  return null
}

function isNotifiable(path: string, method: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false
  if (path.startsWith('/admin/notifications')) return false
  if (path.startsWith('/auth/')) return false
  if (path.startsWith('/portal/auth/') && path !== '/portal/auth/register') return false
  if (path === '/health' || path === '/ready') return false
  return true
}

/**
 * Capture successful mutations after the response has been produced. The
 * bridge keeps route handlers free of notification plumbing while giving the
 * control room a complete, linkable activity feed.
 */
export function notificationBridge(req: Request, res: Response, next: NextFunction): void {
  const path = req.originalUrl.split('?')[0]?.replace(/^\/api\/v1/, '') ?? req.path
  if (!isNotifiable(path, req.method)) {
    next()
    return
  }

  let responseBody: unknown
  const originalJson = res.json.bind(res)
  res.json = ((body: unknown) => {
    responseBody = body
    return originalJson(body)
  }) as Response['json']

  res.on('finish', () => {
    if (res.statusCode >= 400) return
    const admin = res.locals.admin as { email?: string } | undefined
    const customer = res.locals.customer as { name?: string } | undefined
    const requestBody = asRecord(req.body) ?? {}
    const descriptor = resolveDescriptor(
      req.method,
      path,
      requestBody,
      dataOf(responseBody),
      admin?.email ?? null,
      customer?.name ?? null,
    )
    if (!descriptor) return
    void createNotification({
      ...descriptor,
      actor: admin?.email ?? customer?.name ?? null,
    }).catch((error) => console.error('[hvac-api] notification write failed', error))
  })
  next()
}
