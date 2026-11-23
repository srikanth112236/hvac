export function formatEditorialDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function readingMinutes(body: string, fallback: number): number {
  if (fallback > 0) return fallback
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

export function sortByPublished<T extends { publishedAt: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}
