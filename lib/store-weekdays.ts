import { STORE_TIMEZONE } from '@/lib/kitchen-timezone'

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export function storeWeekday(date = new Date()): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: STORE_TIMEZONE, weekday: 'short' }).format(date)
  return WEEKDAY_INDEX[name] ?? date.getDay()
}

export function parseWeekdays(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
}

/** Empty means the promotion is available every day. */
export function isScheduledWeekday(days: unknown, weekday = storeWeekday()): boolean {
  const selected = parseWeekdays(days)
  return selected.length === 0 || selected.includes(weekday)
}
