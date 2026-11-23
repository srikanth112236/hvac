/**
 * Time-zone helpers for the business calendar. Appointments are stored as UTC
 * instants, but a date-only booking ("2026-12-05", afternoon) means afternoon
 * in the business's city, not in whatever zone the server process happens to
 * run in. All conversion goes through Intl so no dependency is required.
 */
export function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const values: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  const asUtc = Date.UTC(
    values.year ?? 1970,
    (values.month ?? 1) - 1,
    values.day ?? 1,
    values.hour ?? 0,
    values.minute ?? 0,
    values.second ?? 0,
  )
  return asUtc - utcMs
}

export function zonedTimeToUtc(
  dateOnly: string,
  hour: number,
  timeZone: string,
  minute = 0,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return null
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0)
  const firstOffset = zoneOffsetMs(guess, timeZone)
  let result = guess - firstOffset
  const secondOffset = zoneOffsetMs(result, timeZone)
  if (secondOffset !== firstOffset) result = guess - secondOffset
  const check = zonedParts(result, timeZone)
  if (check.year !== year || check.month !== month || check.day !== day) return null
  return new Date(result)
}

export function zonedParts(
  utcMs: number,
  timeZone: string,
): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(utcMs))
  const values: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  return {
    year: values.year ?? 1970,
    month: values.month ?? 1,
    day: values.day ?? 1,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
  }
}

export function todayInZone(timeZone: string, now = Date.now()): string {
  const parts = zonedParts(now, timeZone)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export function hourInZone(timeZone: string, now = Date.now()): number {
  return zonedParts(now, timeZone).hour
}

export function startOfTodayInZone(timeZone: string, now = Date.now()): Date {
  return zonedTimeToUtc(todayInZone(timeZone, now), 0, timeZone) ?? new Date(now)
}
