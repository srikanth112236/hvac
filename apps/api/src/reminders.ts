import type { ReminderRecord } from '@hvac/shared'
import { createStore } from './store.js'

export const reminderStore = createStore<ReminderRecord[]>('reminders.json', () => [])