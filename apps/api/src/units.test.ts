import { describe, expect, it } from 'vitest'
import {
  invoiceTotals,
  summarizeContentChanges,
  type ContentRevision,
  type NewsletterRecurrence,
} from '@hvac/shared'
import { defaultContent } from './content.js'
import { restoreSelectedChanges } from './contentHistory.js'
import { nextRecurringOccurrence, applySuppression } from './marketing.js'
import { sanitizeNewsletterHtml } from './sanitize.js'
import { zonedTimeToUtc } from './time.js'

describe('newsletter sanitiser', () => {
  it('removes scripts, handlers and javascript urls', () => {
    const dirty =
      '<p onclick="alert(1)" style="color:#333">Hello<script>alert(2)</script>' +
      '<img src="javascript:alert(3)" onerror="alert(4)">' +
      '<a href="javascript:alert(5)">x</a></p>'
    const clean = sanitizeNewsletterHtml(dirty)
    expect(clean).not.toMatch(/<script/i)
    expect(clean).not.toMatch(/onerror/i)
    expect(clean).not.toMatch(/onclick/i)
    expect(clean).not.toMatch(/javascript:/i)
    expect(clean).toContain('Hello')
  })
})

describe('business timezone', () => {
  it('converts a date-only afternoon to the city zone', () => {
    const date = zonedTimeToUtc('2026-12-05', 12, 'America/Chicago')
    expect(date?.toISOString()).toBe('2026-12-05T18:00:00.000Z')
  })
})

describe('invoice totals', () => {
  it('classifies a partially paid overdue invoice as overdue', () => {
    const totals = invoiceTotals(
      {
        id: '1',
        ref: 'INV-1',
        customerName: 'Test',
        customerPhone: '',
        customerEmail: '',
        customerAddress: '',
        customerGstin: '',
        service: '',
        leadRef: null,
        issueDate: '2025-12-01',
        dueDate: '2026-01-01',
        status: 'issued',
        lines: [{ id: 'l1', description: 'x', quantity: 1, unitPrice: 1000, taxPercent: 0 }],
        discount: 0,
        taxMode: 'intra',
        notes: '',
        terms: '',
        payments: [
          {
            id: 'p1',
            amount: 100,
            method: 'cash',
            reference: '',
            notes: '',
            receivedAt: '2026-01-10',
            recordedAt: '2026-01-10',
            recordedBy: 'test',
          },
        ],
        reminderDates: [],
        lastReminderAt: null,
        createdAt: '',
        updatedAt: '',
      },
      Date.parse('2026-11-23T00:00:00.000Z'),
    )
    expect(totals.state).toBe('overdue')
    expect(totals.balance).toBe(900)
    expect(totals.daysOverdue).toBeGreaterThan(0)
  })
})

describe('content revision field restore', () => {
  it('restores only the selected changed leaves and leaves the live document untouched', () => {
    const current = defaultContent()
    current.version = 12
    current.updatedAt = '2026-11-23T12:00:00.000Z'
    current.home.heroTitle = 'Current hero'
    const serviceId = current.services[0]?.id
    expect(serviceId).toBeTruthy()
    if (!serviceId) return
    current.services[0]!.name = 'Current service name'

    const target = structuredClone(current)
    target.version = 11
    target.updatedAt = '2026-11-22T12:00:00.000Z'
    target.home.heroTitle = 'Previous hero'
    target.services[0]!.name = 'Previous service name'

    const changes = [
      {
        path: 'home.heroTitle',
        field: 'Hero title',
        pageId: 'home',
        pageLabel: 'Home',
        sectionKey: 'home',
        sectionLabel: 'Home',
        kind: 'changed' as const,
        before: 'Previous hero',
        after: 'Current hero',
      },
      {
        path: `services.${serviceId}.name`,
        field: 'Name',
        pageId: 'services',
        pageLabel: 'Services',
        sectionKey: 'services',
        sectionLabel: 'Services',
        kind: 'changed' as const,
        before: 'Previous service name',
        after: 'Current service name',
      },
    ]
    const revision: ContentRevision = {
      id: 'revision-test',
      version: 11,
      previousVersion: 10,
      createdAt: target.updatedAt,
      author: 'test',
      note: 'test',
      stats: summarizeContentChanges(changes),
      changes,
      content: target,
    }

    const restored = restoreSelectedChanges(current, revision, [
      'home.heroTitle',
      `services.${serviceId}.name`,
    ])
    expect(restored.home.heroTitle).toBe('Previous hero')
    expect(restored.services[0]!.name).toBe('Previous service name')
    expect(current.home.heroTitle).toBe('Current hero')
    expect(current.services[0]!.name).toBe('Current service name')
  })

  it('refuses to restore an added record leaf in isolation', () => {
    const current = defaultContent()
    const target = structuredClone(current)
    const changes = [
      {
        path: 'faqs.new-faq.question',
        field: 'Question',
        pageId: 'site',
        pageLabel: 'Shared FAQs',
        sectionKey: 'faqs',
        sectionLabel: 'Shared FAQs',
        kind: 'added' as const,
        before: '',
        after: 'New question',
      },
    ]
    const revision: ContentRevision = {
      id: 'revision-test',
      version: 1,
      previousVersion: null,
      createdAt: current.updatedAt,
      author: 'test',
      note: 'test',
      stats: summarizeContentChanges(changes),
      changes,
      content: target,
    }
    expect(() => restoreSelectedChanges(current, revision, ['faqs.new-faq.question'])).toThrow(
      /whole page or complete version/i,
    )
  })
})

describe('newsletter recurrence', () => {
  const base = '2026-11-23T15:00:00.000Z'
  const after = Date.parse(base)
  const recurrence = (overrides: Partial<NewsletterRecurrence>): NewsletterRecurrence => ({
    kind: 'daily',
    interval: 1,
    weekdays: [1],
    monthlyMode: 'day-of-month',
    dayOfMonth: 1,
    weekday: 1,
    weekOfMonth: 1,
    endAt: null,
    ...overrides,
  })

  it('advances a daily schedule by the interval', () => {
    expect(nextRecurringOccurrence(recurrence({ kind: 'daily', interval: 2 }), base, after)).toBe(
      '2026-11-25T15:00:00.000Z',
    )
  })

  it('advances a weekly schedule by the interval and selected weekday', () => {
    expect(
      nextRecurringOccurrence(
        recurrence({ kind: 'weekly', interval: 2, weekdays: [1] }),
        base,
        after,
      ),
    ).toBe('2026-12-07T15:00:00.000Z')
  })

  it('supports monthly nth weekday schedules', () => {
    expect(
      nextRecurringOccurrence(
        recurrence({
          kind: 'monthly',
          interval: 1,
          monthlyMode: 'nth-weekday',
          weekday: 2,
          weekOfMonth: 2,
        }),
        '2026-11-10T15:00:00.000Z',
        Date.parse('2026-11-10T15:00:00.000Z'),
      ),
    ).toBe('2026-12-08T15:00:00.000Z')
  })

  it('stops when the next occurrence is beyond the end date', () => {
    expect(
      nextRecurringOccurrence(
        recurrence({ kind: 'daily', interval: 1, endAt: '2026-11-23T23:59:59.000Z' }),
        base,
        after,
      ),
    ).toBeNull()
  })
})

describe('newsletter suppression guard', () => {
  const blocked = [
    {
      email: 'unsubscribed@example.com',
      name: 'Unsubscribed',
      reason: 'Unsubscribed from the mailing list',
      source: 'signup' as const,
    },
  ]

  it('excludes suppressed addresses by default', () => {
    expect(
      applySuppression(['unsubscribed@example.com', 'customer@example.com'], blocked, false),
    ).toEqual({
      recipients: ['customer@example.com'],
      suppressedCount: 1,
    })
  })

  it('includes suppressed addresses when the admin overrides', () => {
    expect(
      applySuppression(['unsubscribed@example.com', 'customer@example.com'], blocked, true),
    ).toEqual({
      recipients: ['unsubscribed@example.com', 'customer@example.com'],
      suppressedCount: 1,
    })
  })
})
