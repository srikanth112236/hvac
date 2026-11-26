import { Router } from 'express'
import { invoiceTotals, quotationTotals, reminderPriorityLabel } from '@hvac/shared'
import { requireAdmin } from './auth.js'
import { invoiceStore } from './business.js'
import { leadStore } from './leads.js'
import { amcStore, quotationStore } from './portalModules.js'
import { customerStore } from './portalAuth.js'
import { reminderStore } from './reminders.js'

/**
 * One desk-wide agenda: every open task, unpaid invoice, lead follow-up,
 * awaiting-customer quotation and expiring AMC contract in a single ordered
 * feed. The reminders page renders this, so payments and follow-ups are no
 * longer hidden in separate modules.
 */
export type AgendaKind = 'task' | 'payment' | 'lead' | 'quotation' | 'amc'
export type AgendaPriority = 'urgent' | 'high' | 'normal' | 'low'

export interface AgendaItem {
  id: string
  kind: AgendaKind
  ref: string | null
  title: string
  subtitle: string
  customer: string | null
  dueAt: string | null
  overdue: boolean
  priority: AgendaPriority
  amount: number | null
  href: string
}

const DAY = 86_400_000

function dayStart(value: string): number {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return Number.NaN
  const date = new Date(parsed)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function buildAgenda(input: {
  reminders: Awaited<ReturnType<typeof reminderStore.read>>
  invoices: Awaited<ReturnType<typeof invoiceStore.read>>
  leads: Awaited<ReturnType<typeof leadStore.read>>
  quotations: Awaited<ReturnType<typeof quotationStore.read>>
  contracts: Awaited<ReturnType<typeof amcStore.read>>
  customers: Awaited<ReturnType<typeof customerStore.read>>
  now?: number
}): AgendaItem[] {
  const now = input.now ?? Date.now()
  const customersById = new Map(input.customers.map((customer) => [customer.id, customer]))
  const items: AgendaItem[] = []

  for (const reminder of input.reminders) {
    if (reminder.status !== 'open') continue
    items.push({
      id: `task:${reminder.id}`,
      kind: 'task',
      ref: reminder.invoiceRef ?? reminder.leadRef ?? null,
      title: reminder.title,
      subtitle: reminder.body || reminderPriorityLabel[reminder.priority ?? 'normal'],
      customer: null,
      dueAt: reminder.dueAt,
      overdue: Date.parse(reminder.dueAt) < now,
      priority: reminder.priority ?? 'normal',
      amount: null,
      href: `/admin/reminders?reminder=${encodeURIComponent(reminder.id)}`,
    })
  }

  for (const invoice of input.invoices) {
    const totals = invoiceTotals(invoice, now)
    if (totals.balance <= 0) continue
    if (totals.state === 'draft' || totals.state === 'cancelled') continue
    items.push({
      id: `payment:${invoice.id}`,
      kind: 'payment',
      ref: invoice.ref,
      title: `Collect ${invoice.ref}`,
      subtitle: `${invoice.customerName} · open balance`,
      customer: invoice.customerName,
      dueAt: invoice.dueDate,
      overdue: totals.daysOverdue > 0,
      priority: totals.daysOverdue > 14 ? 'urgent' : totals.daysOverdue > 0 ? 'high' : 'normal',
      amount: totals.balance,
      href: `/admin/invoices/${encodeURIComponent(invoice.id)}`,
    })
  }

  for (const lead of input.leads) {
    if (!lead.followUpAt) continue
    if (lead.status === 'won' || lead.status === 'lost') continue
    const due = Date.parse(lead.followUpAt)
    items.push({
      id: `lead:${lead.ref}`,
      kind: 'lead',
      ref: lead.ref,
      title: `Follow up with ${lead.name}`,
      subtitle: `${lead.phone || lead.email} · ${lead.status.replace('-', ' ')}`,
      customer: lead.name,
      dueAt: lead.followUpAt,
      overdue: Number.isFinite(due) && due < now,
      priority: lead.urgency === 'emergency' ? 'urgent' : lead.status === 'new' ? 'high' : 'normal',
      amount: lead.value,
      href: `/admin/leads?lead=${encodeURIComponent(lead.ref)}`,
    })
  }

  for (const quotation of input.quotations) {
    const totals = quotationTotals(quotation)
    if (quotation.status === 'draft' || quotation.status === 'declined') continue
    const customer = customersById.get(quotation.customerId)
    const validUntil = quotation.validUntil ? Date.parse(quotation.validUntil) : Number.NaN
    const expiringSoon = Number.isFinite(validUntil) && validUntil - now <= 14 * DAY
    const awaiting = quotation.status === 'sent' || quotation.status === 'changes-requested'
    if (!awaiting && !expiringSoon) continue
    items.push({
      id: `quotation:${quotation.id}`,
      kind: 'quotation',
      ref: quotation.ref,
      title:
        quotation.status === 'changes-requested'
          ? `Reissue ${quotation.ref}`
          : `Chase ${quotation.ref}`,
      subtitle: `${customer?.name ?? quotation.title} · ${quotation.status.replace('-', ' ')}`,
      customer: customer?.name ?? null,
      dueAt: quotation.validUntil || null,
      overdue: quotation.status === 'changes-requested' || (Number.isFinite(validUntil) && validUntil < now),
      priority: quotation.status === 'changes-requested' ? 'high' : 'normal',
      amount: totals.total,
      href: `/admin/quotations?ref=${encodeURIComponent(quotation.ref)}`,
    })
  }

  for (const contract of input.contracts) {
    if (contract.status !== 'active') continue
    const end = dayStart(contract.endDate)
    if (!Number.isFinite(end)) continue
    if (end - now > 45 * DAY) continue
    const customer = customersById.get(contract.customerId)
    items.push({
      id: `amc:${contract.id}`,
      kind: 'amc',
      ref: contract.ref,
      title: `Renew ${contract.ref}`,
      subtitle: `${customer?.name ?? 'Customer'} · ${contract.plan} ends ${contract.endDate}`,
      customer: customer?.name ?? null,
      dueAt: contract.endDate,
      overdue: end < now,
      priority: end < now ? 'urgent' : end - now <= 14 * DAY ? 'high' : 'normal',
      amount: contract.price,
      href: `/admin/customers/${encodeURIComponent(contract.customerId)}`,
    })
  }

  return items.sort((a, b) => {
    const aDue = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY
    const bDue = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY
    if (Number.isFinite(aDue) !== Number.isFinite(bDue)) {
      return Number.isFinite(aDue) ? -1 : 1
    }
    if (Number.isFinite(aDue) && Number.isFinite(bDue) && aDue !== bDue) return aDue - bDue
    const rank: Record<AgendaPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
    return rank[a.priority] - rank[b.priority]
  })
}

export const agendaRouter = Router()
agendaRouter.use(requireAdmin)

agendaRouter.get('/agenda', async (_req, res) => {
  const [reminders, invoices, leads, quotations, contracts, customers] = await Promise.all([
    reminderStore.read(),
    invoiceStore.read(),
    leadStore.read(),
    quotationStore.read(),
    amcStore.read(),
    customerStore.read(),
  ])
  const now = Date.now()
  const items = buildAgenda({ reminders, invoices, leads, quotations, contracts, customers, now })
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const weekEnd = now + 7 * DAY
  const byKind = (kind: AgendaKind) => items.filter((item) => item.kind === kind).length
  res.json({
    data: items,
    meta: {
      generatedAt: new Date(now).toISOString(),
      counts: {
        all: items.length,
        overdue: items.filter((item) => item.overdue).length,
        today: items.filter(
          (item) => item.dueAt && Date.parse(item.dueAt) <= todayEnd.getTime() && !item.overdue,
        ).length,
        next7: items.filter((item) => {
          if (!item.dueAt) return false
          const due = Date.parse(item.dueAt)
          return due > todayEnd.getTime() && due <= weekEnd
        }).length,
        task: byKind('task'),
        payment: byKind('payment'),
        lead: byKind('lead'),
        quotation: byKind('quotation'),
        amc: byKind('amc'),
      },
    },
  })
})
