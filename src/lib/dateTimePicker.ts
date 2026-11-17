import { format, isValid, parse } from 'date-fns'
import { addDaysToDateKey, daysBetweenDateKeys } from './date'

function localMinutes(value: string) {
  const [dateKey, timeKey = '00:00'] = value.split('T')
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hour, minute] = timeKey.split(':').map(Number)
  return Date.UTC(year, month - 1, day, hour, minute) / 60_000
}

function startOfWeekKey(dateKey: string, weekStartsOn: 0 | 1) {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  const offset = (date.getUTCDay() - weekStartsOn + 7) % 7
  date.setUTCDate(date.getUTCDate() - offset)
  return date.toISOString().slice(0, 10)
}

export function addMinutesToDateTimeLocal(value: string, minutes: number) {
  const [dateKey, timeKey = '00:00'] = value.split('T')
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hour, minute] = timeKey.split(':').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes))
  return date.toISOString().slice(0, 16)
}

export function adjustEndAfterStart(
  oldStartValue: string,
  newStartValue: string,
  endValue: string,
  allDay: boolean,
) {
  if (!newStartValue) return endValue

  if (allDay) {
    const oldStartKey = oldStartValue.slice(0, 10)
    const newStartKey = newStartValue.slice(0, 10)
    const endKey = endValue.slice(0, 10)
    if (!endKey) return newStartKey
    const duration = daysBetweenDateKeys(oldStartKey, endKey)
    return duration > 0 ? addDaysToDateKey(newStartKey, duration) : newStartKey
  }

  if (!endValue) return addMinutesToDateTimeLocal(newStartValue, 60)

  const duration = localMinutes(endValue) - localMinutes(oldStartValue)
  return addMinutesToDateTimeLocal(newStartValue, duration > 0 ? duration : 60)
}

export function formatTimeValue(value: string, clock24h: boolean) {
  const [hourString, minuteString] = value.split(':')
  const hour = Number(hourString)
  const minute = Number(minuteString)
  if (clock24h) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

export function parseTimeValue(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/i)
  if (!match) return null

  let hour = Number(match[1])
  const minute = match[2] ? Number(match[2]) : 0
  const suffix = match[3]?.toLowerCase()

  if (suffix) {
    if (hour < 1 || hour > 12) return null
    hour = (hour % 12) + (suffix === 'pm' ? 12 : 0)
  } else if (hour > 23) {
    return null
  }

  if (minute > 59) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function parseDateValue(input: string): string | null {
  const value = input.trim()
  if (!value) return null

  for (const pattern of ['yyyy-MM-dd', 'MMM d, yyyy', 'MMMM d, yyyy', 'M/d/yyyy']) {
    const date = parse(value, pattern, new Date())
    if (isValid(date)) return format(date, 'yyyy-MM-dd')
  }

  return null
}

export function buildMonthGrid(monthKey: string, weekStartsOn: 0 | 1) {
  const [year, month] = monthKey.split('-').map(Number)
  const firstKey = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10)
  const gridStart = startOfWeekKey(firstKey, weekStartsOn)
  return Array.from({ length: 42 }, (_, index) => addDaysToDateKey(gridStart, index))
}

export function addMonthsToMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}
