import { describe, expect, it } from 'vitest'
import { invoiceTotals } from '@hvac/shared'
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
