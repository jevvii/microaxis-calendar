import { formatInTimeZone } from 'date-fns-tz'
import type { Event } from '../types/domain'

export function dateKeyInTimeZone(value: string | Date, timeZone: string) {
  return formatInTimeZone(value instanceof Date ? value : new Date(value), timeZone, 'yyyy-MM-dd')
}

export function isSameDayInTimeZone(a: string | Date, b: string | Date, timeZone: string) {
  return dateKeyInTimeZone(a, timeZone) === dateKeyInTimeZone(b, timeZone)
}

export function formatTimeInTimeZone(value: string | Date, timeZone: string, clock24h: boolean) {
  return formatInTimeZone(
    value instanceof Date ? value : new Date(value),
    timeZone,
    clock24h ? 'HH:mm' : 'h:mm a',
  )
}

export function eventTimeLabel(event: Event, timeZone: string, clock24h: boolean) {
  if (event.allDay) return 'All day'

  const start = new Date(event.startsAt)
  const end = new Date(event.endsAt)
  const sameDay = isSameDayInTimeZone(start, end, timeZone)

  if (sameDay) {
    return `${formatTimeInTimeZone(start, timeZone, clock24h)} – ${formatTimeInTimeZone(
      end,
      timeZone,
      clock24h,
    )}`
  }

  const dateFormat = clock24h ? 'MMM d, HH:mm' : 'MMM d, h:mm a'
  return `${formatInTimeZone(start, timeZone, dateFormat)} – ${formatInTimeZone(
    end,
    timeZone,
    dateFormat,
  )}`
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetweenDateKeys(startKey: string, endKey: string) {
  const start = Date.parse(`${startKey}T00:00:00.000Z`)
  const end = Date.parse(`${endKey}T00:00:00.000Z`)
  return Math.round((end - start) / 86_400_000)
}

export function startOfDayInTimeZone(value: string | Date, timeZone: string) {
  return new Date(`${dateKeyInTimeZone(value, timeZone)}T00:00:00.000Z`)
}
