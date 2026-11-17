import { describe, expect, it } from 'vitest'
import type { EventOccurrence } from '../types/domain'
import { findEventConflicts, suggestFreeSlots } from './conflicts'

function makeEvent(overrides: Partial<EventOccurrence> = {}): EventOccurrence {
  return {
    id: 'evt-1',
    workspaceId: 'ws-1',
    calendarId: 'cal-2',
    calendarKind: 'team',
    createdBy: 'u-2',
    title: 'Team planning',
    description: null,
    location: null,
    startsAt: '2026-11-03T02:30:00.000Z',
    endsAt: '2026-11-03T03:30:00.000Z',
    allDay: false,
    timeZone: 'Asia/Manila',
    categoryId: null,
    priority: 'normal',
    status: 'scheduled',
    visibility: 'calendar',
    exportToGoogle: true,
    recurrenceRule: null,
    recurrenceUntil: null,
    recurrenceExceptions: [],
    version: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    deletedAt: null,
    occurrenceStart: '2026-11-03T02:30:00.000Z',
    occurrenceEnd: '2026-11-03T03:30:00.000Z',
    isRecurring: false,
    parentStart: '2026-11-03T02:30:00.000Z',
    ...overrides,
  }
}

const baseArgs = {
  targetCalendarId: 'cal-1',
  startsAt: '2026-11-03T02:00:00.000Z',
  endsAt: '2026-11-03T03:00:00.000Z',
  userId: 'u-1',
}

describe('findEventConflicts', () => {
  it('finds overlapping events on other calendars', () => {
    const conflicts = findEventConflicts({ ...baseArgs, events: [makeEvent()] })
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].mine).toBe(false)
  })

  it('ignores the target calendar, cancelled events, and the edited event', () => {
    expect(
      findEventConflicts({
        ...baseArgs,
        events: [
          makeEvent({ calendarId: 'cal-1' }),
          makeEvent({ id: 'evt-2', status: 'cancelled' }),
          makeEvent({ id: 'evt-3' }),
        ],
        excludeEventId: 'evt-3',
      }),
    ).toHaveLength(0)
  })

  it('marks events the viewer created or joined as theirs', () => {
    const created = findEventConflicts({
      ...baseArgs,
      events: [makeEvent({ createdBy: 'u-1' })],
    })
    expect(created[0].mine).toBe(true)

    const joined = findEventConflicts({
      ...baseArgs,
      events: [
        makeEvent({
          participants: [
            { eventId: 'evt-1', userId: 'u-1', status: 'going', respondedAt: null },
          ],
        }),
      ],
    })
    expect(joined[0].mine).toBe(true)
  })
})

describe('suggestFreeSlots', () => {
  it('skips occupied slots and stays inside working hours', () => {
    const suggestions = suggestFreeSlots({
      events: [
        makeEvent({
          occurrenceStart: '2026-11-03T02:00:00.000Z',
          occurrenceEnd: '2026-11-03T03:00:00.000Z',
        }),
      ],
      targetCalendarId: 'cal-1',
      startValue: '2026-11-03T09:00',
      durationMinutes: 60,
      timeZone: 'Asia/Manila',
      userId: 'u-1',
      count: 2,
    })

    expect(suggestions).toHaveLength(2)
    expect(suggestions[0].startValue).toBe('2026-11-03T09:00')
    expect(suggestions[1].startValue).toBe('2026-11-03T11:00')
  })
})
