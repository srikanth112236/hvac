import { defaultPreferences, type NotificationPreferences } from '@hvac/shared'
import { createStore } from './store.js'

/** Per-customer email preferences, shared by portal and admin notification paths. */
export const preferenceStore = createStore<Record<string, NotificationPreferences>>(
  'customer-preferences.json',
  () => ({}),
)

export async function preferencesFor(customerId: string): Promise<NotificationPreferences> {
  const current = await preferenceStore.read()
  if (current[customerId]) return { ...defaultPreferences(customerId), ...current[customerId] }
  const record = defaultPreferences(customerId)
  await preferenceStore.mutate((all) => ({ ...all, [customerId]: record }))
  return record
}

export async function customerWantsEmail(
  customerId: string,
  field: 'emailService' | 'emailBilling' | 'emailAmc',
): Promise<boolean> {
  const preferences = await preferenceStore.read()
  return preferences[customerId]?.[field] ?? true
}
