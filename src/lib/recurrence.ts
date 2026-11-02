import { addDays, addMonths, addWeeks, getDate } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import type { Event, EventOccurrence } from '../types/domain'
import { addDaysToDateKey, daysBetweenDateKeys } from './date'

type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

type ParsedRule = {
  frequency: Frequency
  interval: number
  count: number | null
  until: Date | null
  byDay: number[] | null
}

const weekdayNumbers: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

const MAX_OCCURRENCES = 5_000

function parseUntil(value: string | null | undefined): Date | null {
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

export function parseRecurrenceRule(rule: string): ParsedRule | null {
  const fields = new Map<string, string>()

  for (const part of rule.trim().split(';')) {
    if (!part) continue
    const [key, value] = part.split('=')
    if (key && value) fields.set(key.toUpperCase(), value.toUpperCase())
  }

  const frequency = fields.get('FREQ')
  if (frequency !== 'DAILY' && frequency !== 'WEEKLY' && frequency !== 'MONTHLY') {
    return null
  }

  const interval = Math.max(1, Number.parseInt(fields.get('INTERVAL') ?? '1', 10) || 1)
  const countValue = Number.parseInt(fields.get('COUNT') ?? '', 10)
  const count = Number.isFinite(countValue) && countValue > 0 ? countValue : null
  const until = parseUntil(fields.get('UNTIL'))
  const byDay =
    frequency === 'WEEKLY' && fields.get('BYDAY')
      ? fields
          .get('BYDAY')!
          .split(',')
          .map((day) => weekdayNumbers[day])
          .filter((day): day is number => day !== undefined)
      : null

  return {
    frequency,
    interval,
    count,
    until,
    byDay: byDay && byDay.length > 0 ? byDay : null,
  }
}

function startOfWeekUtc(date: Date) {
  const copy = new Date(date)
  const offset = (copy.getUTCDay() + 6) % 7
  copy.setUTCDate(copy.getUTCDate() - offset)
  copy.setUTCHours(0, 0, 0, 0)
  return copy
}

function earliestUntil(rule: ParsedRule, event: Event) {
  const eventUntil = parseUntil(event.recurrenceUntil)
  if (!rule.until) return eventUntil
  if (!eventUntil) return rule.until
  return rule.until.getTime() <= eventUntil.getTime() ? rule.until : eventUntil
}

type Candidate = { start: Date; end: Date }

function generateTimedCandidates(
  event: Event,
  rule: ParsedRule,
  rangeEndMs: number,
): Candidate[] {
  const timeZone = event.timeZone
  const startZoned = toZonedTime(new Date(event.startsAt), timeZone)
  const durationMs = Math.max(
    0,
    new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime(),
  )
  const startDayOfMonth = getDate(startZoned)
  const until = earliestUntil(rule, event)
  const weekStart =
    rule.frequency === 'WEEKLY' && rule.byDay
      ? (() => {
          const copy = new Date(startZoned)
          copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7))
          return copy
        })()
      : null

  const candidates: Candidate[] = []
  let validCount = 0

  for (let iteration = 0; iteration < MAX_OCCURRENCES; iteration += 1) {
    const localCandidates: Date[] = []

    if (rule.frequency === 'DAILY') {
      localCandidates.push(addDays(startZoned, iteration * rule.interval))
    } else if (rule.frequency === 'WEEKLY' && rule.byDay && weekStart) {
      const week = addWeeks(weekStart, iteration * rule.interval)
      for (const weekday of rule.byDay) {
        localCandidates.push(addDays(week, (weekday + 6) % 7))
      }
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

      const start = fromZonedTime(local, timeZone)
      if (until && start.getTime() > until.getTime()) return candidates
      if (start.getTime() > rangeEndMs) return candidates

      validCount += 1
      if (rule.count && validCount > rule.count) return candidates

      candidates.push({
        start,
        end: new Date(start.getTime() + durationMs),
      })
    }
  }

  return candidates
}

function generateAllDayCandidates(
  event: Event,
  rule: ParsedRule,
  rangeEndMs: number,
): Candidate[] {
  const startKey = event.startsAt.slice(0, 10)
  const endKey = event.endsAt.slice(0, 10)
  const durationDays = Math.max(1, daysBetweenDateKeys(startKey, endKey))
  const startDate = new Date(`${startKey}T00:00:00.000Z`)
  const startDayOfMonth = startDate.getUTCDate()
  const until = earliestUntil(rule, event)
  const weekStart =
    rule.frequency === 'WEEKLY' && rule.byDay ? startOfWeekUtc(startDate) : null

  const candidates: Candidate[] = []
  let validCount = 0

  for (let iteration = 0; iteration < MAX_OCCURRENCES; iteration += 1) {
    const localCandidates: Date[] = []

    if (rule.frequency === 'DAILY') {
      localCandidates.push(addDays(startDate, iteration * rule.interval))
    } else if (rule.frequency === 'WEEKLY' && rule.byDay && weekStart) {
      const week = addWeeks(weekStart, iteration * rule.interval)
      for (const weekday of rule.byDay) {
        localCandidates.push(addDays(week, (weekday + 6) % 7))
      }
    } else if (rule.frequency === 'WEEKLY') {
      localCandidates.push(addWeeks(startDate, iteration * rule.interval))
    } else {
      const monthly = addMonths(startDate, iteration * rule.interval)
      if (getDate(monthly) !== startDayOfMonth) continue
      localCandidates.push(monthly)
    }

    localCandidates.sort((a, b) => a.getTime() - b.getTime())

    for (const local of localCandidates) {
      if (local.getTime() < startDate.getTime()) continue
      if (until && local.getTime() > until.getTime()) return candidates
      if (local.getTime() > rangeEndMs) return candidates

      validCount += 1
      if (rule.count && validCount > rule.count) return candidates

      const occurrenceStartKey = local.toISOString().slice(0, 10)
      const occurrenceEndKey = addDaysToDateKey(occurrenceStartKey, durationDays)

      candidates.push({
        start: new Date(`${occurrenceStartKey}T00:00:00.000Z`),
        end: new Date(`${occurrenceEndKey}T00:00:00.000Z`),
      })
    }
  }

  return candidates
}

export function expandRecurrence(
  event: Event,
  rangeStart: string,
  rangeEnd: string,
): EventOccurrence[] {
  const rangeStartMs = new Date(rangeStart).getTime()
  const rangeEndMs = new Date(rangeEnd).getTime()

  if (Number.isNaN(rangeStartMs) || Number.isNaN(rangeEndMs)) return []

  const buildOccurrence = (start: Date, end: Date, recurring: boolean): EventOccurrence => ({
    ...event,
    occurrenceStart: start.toISOString(),
    occurrenceEnd: end.toISOString(),
    isRecurring: recurring,
    parentStart: event.startsAt,
  })

  if (!event.recurrenceRule) {
    const start = new Date(event.startsAt)
    const end = new Date(event.endsAt)
    if (start.getTime() < rangeEndMs && end.getTime() > rangeStartMs) {
      return [buildOccurrence(start, end, false)]
    }
    return []
  }

  const rule = parseRecurrenceRule(event.recurrenceRule)
  if (!rule) return []

  const exceptions = new Set(
    event.recurrenceExceptions
      .map((value) => new Date(value).getTime())
      .filter((value) => !Number.isNaN(value)),
  )

  const candidates = event.allDay
    ? generateAllDayCandidates(event, rule, rangeEndMs)
    : generateTimedCandidates(event, rule, rangeEndMs)

  return candidates
    .filter(
      (candidate) =>
        !exceptions.has(candidate.start.getTime()) &&
        candidate.start.getTime() < rangeEndMs &&
        candidate.end.getTime() > rangeStartMs,
    )
    .map((candidate) => buildOccurrence(candidate.start, candidate.end, true))
}

export function expansionDateKey(value: string) {
  return value.slice(0, 10)
}
