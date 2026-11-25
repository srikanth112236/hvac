export const NOTIFICATION_CATEGORIES = [
  'leads',
  'customers',
  'invoices',
  'quotations',
  'jobs',
  'expenses',
  'reminders',
  'marketing',
  'content',
  'support',
  'team',
  'system',
] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

export const notificationCategoryLabel: Record<NotificationCategory, string> = {
  leads: 'Leads',
  customers: 'Customers',
  invoices: 'Invoices',
  quotations: 'Quotations',
  jobs: 'Jobs',
  expenses: 'Expenses',
  reminders: 'Reminders',
  marketing: 'Marketing',
  content: 'Content',
  support: 'Support',
  team: 'Team',
  system: 'System',
}

export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number]

export const notificationPriorityLabel: Record<NotificationPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

export const NOTIFICATION_SOURCES = ['admin', 'portal', 'public', 'system'] as const
export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number]

export interface NotificationRecord {
  id: string
  type: string
  category: NotificationCategory
  priority: NotificationPriority
  title: string
  message: string
  link: string
  entityType: string | null
  entityId: string | null
  entityLabel: string | null
  actor: string | null
  source: NotificationSource
  metadata: Record<string, string | number | boolean | null>
  createdAt: string
  readBy: string[]
}

export type NotificationView = Omit<NotificationRecord, 'readBy'> & {
  read: boolean
}

export interface NotificationFeed {
  data: NotificationView[]
  unread: number
  total: number
  byCategory: Record<NotificationCategory, number>
}

export type NotificationClientMessage =
  | { type: 'notification:read'; id: string }
  | { type: 'notification:read-all' }
  | { type: 'notification:refresh' }
  | { type: 'notification:ping' }

export type NotificationServerMessage =
  | { type: 'notification:init'; data: NotificationFeed }
  | { type: 'notification:new'; data: NotificationView; unread: number }
  | { type: 'notification:update'; data: { id: string; read: boolean; unread: number } }
  | { type: 'notification:read-all'; data: { unread: number } }
  | { type: 'notification:pong'; data: { at: string } }
  | { type: 'notification:error'; data: { message: string } }
