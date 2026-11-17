import type { EventOccurrence } from '../types/domain'
import { addDaysToDateKey, fromDateTimeLocal } from './date'
import { addMinutesToDateTimeLocal } from './dateTimePicker'

export type EventConflict = {
  event: EventOccurrence
  startsAt: string
  endsAt: string
  mine: boolean
}

export function findEventConflicts({
  events,
  targetCalendarId,
  startsAt,
  endsAt,
  excludeEventId,
  userId,
}: {
  events: EventOccurrence[]
  targetCalendarId: string
  startsAt: string
  endsAt: string
  excludeEventId?: string
  userId: string
}): EventConflict[] {
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return []

  return events
    .filter(
      (event) =>
        event.id !== excludeEventId &&
        event.calendarId !== targetCalendarId &&
        !event.deletedAt &&
        event.status !== 'cancelled' &&
        new Date(event.occurrenceStart).getTime() < end &&
        new Date(event.occurrenceEnd).getTime() > start,
    )
    .map((event) => ({
      event,
      startsAt: event.occurrenceStart,
      endsAt: event.occurrenceEnd,
      mine:
        event.createdBy === userId ||
        Boolean(event.participants?.some((participant) => participant.userId === userId)),
    }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function suggestFreeSlots({
  events,
  targetCalendarId,
  startValue,
  durationMinutes,
  timeZone,
  excludeEventId,
  userId,
  count = 3,
}: {
  events: EventOccurrence[]
  targetCalendarId: string
  startValue: string
  durationMinutes: number
  timeZone: string
  excludeEventId?: string
  userId: string
  count?: number
}) {
  const suggestions: Array<{ startValue: string; endValue: string }> = []
  if (!startValue) return suggestions

  let cursor = startValue
  const daysAhead = addDaysToDateKey(startValue.slice(0, 10), 7)

  while (cursor.slice(0, 10) <= daysAhead && suggestions.length < count) {
    const dateKey = cursor.slice(0, 10)
    const [hour, minute] = cursor.slice(11, 16).split(':').map(Number)

    if (hour < 9) {
      cursor = `${dateKey}T09:00`
      continue
    }

    if (hour > 17 || (hour === 17 && minute + durationMinutes > 60)) {
      cursor = `${addDaysToDateKey(dateKey, 1)}T09:00`
      continue
    }

    const endValue = addMinutesToDateTimeLocal(cursor, durationMinutes)
    const startsAt = fromDateTimeLocal(cursor, timeZone)
    const endsAt = fromDateTimeLocal(endValue, timeZone)
    const conflicts = findEventConflicts({
      events,
      targetCalendarId,
      startsAt,
      endsAt,
      excludeEventId,
      userId,
    })

    if (conflicts.length === 0) suggestions.push({ startValue: cursor, endValue })
    cursor = addMinutesToDateTimeLocal(cursor, 30)
  }

  return suggestions
}
