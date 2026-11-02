import { formatInTimeZone } from 'date-fns-tz'
import { describe, expect, it } from 'vitest'
import type { Event } from '../types/domain'
import { expansionDateKey, expandRecurrence } from './recurrence'

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    workspaceId: 'ws-1',
    calendarId: 'cal-1',
    calendarKind: 'team',
    createdBy: 'u-1',
    title: 'Studio review',
    description: null,
    location: null,
    startsAt: '2026-03-01T14:00:00.000Z',
    endsAt: '2026-03-01T15:00:00.000Z',
    allDay: false,
    timeZone: 'America/New_York',
    categoryId: null,
    priority: 'normal',
    status: 'scheduled',
    visibility: 'calendar',
    exportToGoogle: true,
    recurrenceRule: null,
    recurrenceUntil: null,
    recurrenceExceptions: [],
    version: 1,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

describe('expandRecurrence', () => {
  it('keeps 09:00 wall time across the US spring-forward boundary', () => {
    const occurrences = expandRecurrence(
      makeEvent({ recurrenceRule: 'FREQ=WEEKLY;COUNT=4' }),
      '2026-03-01T00:00:00.000Z',
      '2026-03-31T00:00:00.000Z',
    )

    expect(occurrences).toHaveLength(4)
    expect(
      occurrences.map((occurrence) =>
        formatInTimeZone(occurrence.occurrenceStart, 'America/New_York', 'HH:mm'),
      ),
    ).toEqual(['09:00', '09:00', '09:00', '09:00'])
    expect(occurrences.map((occurrence) => occurrence.occurrenceStart)).toEqual([
      '2026-03-01T14:00:00.000Z',
      '2026-03-08T13:00:00.000Z',
      '2026-03-15T13:00:00.000Z',
      '2026-03-22T13:00:00.000Z',
    ])
  })

  it('skips months that do not contain the 31st', () => {
    const occurrences = expandRecurrence(
      makeEvent({
        startsAt: '2026-01-31T09:00:00.000Z',
        endsAt: '2026-01-31T10:00:00.000Z',
        timeZone: 'UTC',
        recurrenceRule: 'FREQ=MONTHLY;COUNT=4',
      }),
      '2026-01-01T00:00:00.000Z',
      '2026-12-31T00:00:00.000Z',
    )

    expect(occurrences.map((occurrence) => expansionDateKey(occurrence.occurrenceStart))).toEqual([
      '2026-01-31',
      '2026-03-31',
      '2026-05-31',
      '2026-07-31',
    ])
  })

  it('removes only the cancelled occurrence', () => {
    const occurrences = expandRecurrence(
      makeEvent({
        recurrenceRule: 'FREQ=WEEKLY;COUNT=3',
        recurrenceExceptions: ['2026-03-08T13:00:00.000Z'],
      }),
      '2026-03-01T00:00:00.000Z',
      '2026-03-31T00:00:00.000Z',
    )

    expect(occurrences.map((occurrence) => occurrence.occurrenceStart)).toEqual([
      '2026-03-01T14:00:00.000Z',
      '2026-03-15T13:00:00.000Z',
    ])
  })

  it('keeps all-day dates stable across a timezone transition', () => {
    const occurrences = expandRecurrence(
      makeEvent({
        startsAt: '2026-03-07T05:00:00.000Z',
        endsAt: '2026-03-08T05:00:00.000Z',
        allDay: true,
        timeZone: 'America/New_York',
        recurrenceRule: 'FREQ=DAILY;COUNT=3',
      }),
      '2026-03-01T00:00:00.000Z',
      '2026-03-31T00:00:00.000Z',
    )

    expect(occurrences.map((occurrence) => expansionDateKey(occurrence.occurrenceStart))).toEqual([
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
    ])
  })

  it('keeps Asia/Manila all-day dates stable', () => {
    const occurrences = expandRecurrence(
      makeEvent({
        startsAt: '2026-11-04T16:00:00.000Z',
        endsAt: '2026-11-05T16:00:00.000Z',
        allDay: true,
        timeZone: 'Asia/Manila',
        recurrenceRule: 'FREQ=DAILY;COUNT=3',
      }),
      '2026-11-01T00:00:00.000Z',
      '2026-11-30T00:00:00.000Z',
    )

    expect(occurrences.map((occurrence) => occurrence.occurrenceStart)).toEqual([
      '2026-11-05T00:00:00.000Z',
      '2026-11-06T00:00:00.000Z',
      '2026-11-07T00:00:00.000Z',
    ])
  })

  it('expands weekly BYDAY rules', () => {
    const occurrences = expandRecurrence(
      makeEvent({
        startsAt: '2026-03-02T14:00:00.000Z',
        endsAt: '2026-03-02T15:00:00.000Z',
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4',
      }),
      '2026-03-01T00:00:00.000Z',
      '2026-03-31T00:00:00.000Z',
    )

    expect(occurrences.map((occurrence) => occurrence.occurrenceStart)).toEqual([
      '2026-03-02T14:00:00.000Z',
      '2026-03-04T14:00:00.000Z',
      '2026-03-09T13:00:00.000Z',
      '2026-03-11T13:00:00.000Z',
    ])
  })

  it('returns a single occurrence for a non-recurring event', () => {
    const occurrences = expandRecurrence(
      makeEvent(),
      '2026-03-01T00:00:00.000Z',
      '2026-03-02T00:00:00.000Z',
    )

    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].occurrenceStart).toBe('2026-03-01T14:00:00.000Z')
  })
})
