import { addDays, addMonths, addWeeks, getDate } from 'npm:date-fns@4.4.0'
import { fromZonedTime, toZonedTime } from 'npm:date-fns-tz@3.2.0'

type EventLike = {
  starts_at: string
  ends_at: string
  all_day: boolean
  time_zone: string
  recurrence_rule: string | null
  recurrence_until: string | null
  recurrence_exceptions?: unknown
}

type Rule = {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  interval: number
  count: number | null
  until: Date | null
  byDay: number[] | null
}

function parseUntil(value: string | null | undefined) {
  if (!value) return null
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(value)
  if (compact) {
    return new Date(
      Date.UTC(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3]), 23, 59, 59, 999),
    )
  }
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value)
  if (dateTime) {
    return new Date(
      Date.UTC(
        Number(dateTime[1]),
        Number(dateTime[2]) - 1,
        Number(dateTime[3]),
        Number(dateTime[4]),
        Number(dateTime[5]),
        Number(dateTime[6]),
      ),
    )
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseRule(rule: string): Rule | null {
  const fields = new Map(
    rule
      .split(';')
      .map((part) => part.split('='))
      .filter((pair) => pair.length === 2)
      .map(([key, value]) => [key.toUpperCase(), value.toUpperCase()]),
  )
  const frequency = fields.get('FREQ')
  if (frequency !== 'DAILY' && frequency !== 'WEEKLY' && frequency !== 'MONTHLY') return null

  const dayMap: Record<string, number> = {
    SU: 0,
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
  }
  const byDay =
    frequency === 'WEEKLY' && fields.get('BYDAY')
      ? fields
          .get('BYDAY')!
          .split(',')
          .map((day) => dayMap[day])
          .filter((day): day is number => day !== undefined)
      : null

  return {
    frequency,
    interval: Math.max(1, Number(fields.get('INTERVAL') ?? 1)),
    count: fields.has('COUNT') ? Math.max(1, Number(fields.get('COUNT'))) : null,
    until: parseUntil(fields.get('UNTIL')),
    byDay: byDay && byDay.length > 0 ? byDay : null,
  }
}

export function occurrencesBetween(event: EventLike, rangeStart: Date, rangeEnd: Date) {
  const start = new Date(event.starts_at)
  if (!event.recurrence_rule) {
    return start >= rangeStart && start <= rangeEnd ? [start] : []
  }

  const rule = parseRule(event.recurrence_rule)
  if (!rule) return []

  const startZoned = toZonedTime(start, event.time_zone)
  const startDayOfMonth = getDate(startZoned)
  const exceptions = new Set(
    Array.isArray(event.recurrence_exceptions)
      ? event.recurrence_exceptions
          .filter((value): value is string => typeof value === 'string')
          .map((value) => new Date(value).getTime())
      : [],
  )
  const until =
    rule.until ??
    (event.recurrence_until ? new Date(event.recurrence_until) : null)

  const weekStart = (() => {
    const copy = new Date(startZoned)
    copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7))
    return copy
  })()

  const results: Date[] = []
  let validCount = 0
  const startMs = fromZonedTime(startZoned, event.time_zone).getTime()
  const daysAhead = Math.max(0, (rangeStart.getTime() - startMs) / 86_400_000)
  let iterationStart = 0

  if (!rule.count) {
    if (rule.frequency === 'DAILY') {
      iterationStart = Math.max(0, Math.floor(daysAhead / rule.interval) - 1)
    } else if (rule.frequency === 'WEEKLY') {
      iterationStart = Math.max(0, Math.floor(daysAhead / (7 * rule.interval)) - 1)
    } else {
      iterationStart = Math.max(0, Math.floor(daysAhead / (30 * rule.interval)) - 1)
    }
  }

  for (let iteration = iterationStart; iteration < iterationStart + 5_000; iteration += 1) {
    const localCandidates: Date[] = []
    if (rule.frequency === 'DAILY') {
      localCandidates.push(addDays(startZoned, iteration * rule.interval))
    } else if (rule.frequency === 'WEEKLY' && rule.byDay) {
      const week = addWeeks(weekStart, iteration * rule.interval)
      for (const day of rule.byDay) localCandidates.push(addDays(week, (day + 6) % 7))
    } else if (rule.frequency === 'WEEKLY') {
      localCandidates.push(addWeeks(startZoned, iteration * rule.interval))
    } else {
      const monthly = addMonths(startZoned, iteration * rule.interval)
      if (getDate(monthly) !== startDayOfMonth) continue
      localCandidates.push(monthly)
    }

    localCandidates.sort((a, b) => a.getTime() - b.getTime())
    for (const local of localCandidates) {
      if (local.getTime() < startZoned.getTime()) continue
      const occurrence = fromZonedTime(local, event.time_zone)
      if (until && occurrence.getTime() > until.getTime()) return results
      if (occurrence.getTime() > rangeEnd.getTime()) return results
      validCount += 1
      if (rule.count && validCount > rule.count) return results
      if (
        occurrence.getTime() >= rangeStart.getTime() &&
        occurrence.getTime() <= rangeEnd.getTime() &&
        !exceptions.has(occurrence.getTime())
      ) {
        results.push(occurrence)
      }
    }
  }

  return results
}
