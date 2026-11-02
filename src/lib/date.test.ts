import { describe, expect, it } from 'vitest'
import type { Event } from '../types/domain'
import { dateKeyInTimeZone, eventTimeLabel } from './date'

const event: Event = {
  id: 'evt-1',
  workspaceId: 'ws-1',
  calendarId: 'cal-1',
  calendarKind: 'team',
  createdBy: 'u-1',
  title: 'OceanJet release review',
  description: null,
  location: null,
  startsAt: '2026-11-03T01:30:00.000Z',
  endsAt: '2026-11-03T02:30:00.000Z',
  allDay: false,
  timeZone: 'Asia/Manila',
  categoryId: null,
  priority: 'normal',
  status: 'scheduled',
  visibility: 'calendar',
  recurrenceRule: null,
  recurrenceUntil: null,
  recurrenceExceptions: [],
  version: 1,
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  deletedAt: null,
}

describe('eventTimeLabel', () => {
  it('formats a same-day timed event in 12-hour time', () => {
    expect(eventTimeLabel(event, 'Asia/Manila', false)).toBe('9:30 AM – 10:30 AM')
  })

  it('formats a same-day timed event in 24-hour time', () => {
    expect(eventTimeLabel(event, 'Asia/Manila', true)).toBe('09:30 – 10:30')
  })

  it('marks an all-day event without a time', () => {
    expect(eventTimeLabel({ ...event, allDay: true }, 'Asia/Manila', false)).toBe('All day')
  })

  it('includes the date when the event crosses midnight in the viewer zone', () => {
    const crossing = {
      ...event,
      startsAt: '2026-11-03T15:30:00.000Z',
      endsAt: '2026-11-03T16:30:00.000Z',
    }
    expect(eventTimeLabel(crossing, 'Asia/Manila', false)).toBe(
      'Nov 3, 11:30 PM – Nov 4, 12:30 AM',
    )
  })
})

describe('dateKeyInTimeZone', () => {
  it('returns the date in the requested zone', () => {
    expect(dateKeyInTimeZone('2026-11-03T01:30:00.000Z', 'Asia/Manila')).toBe('2026-11-03')
    expect(dateKeyInTimeZone('2026-11-03T01:30:00.000Z', 'America/New_York')).toBe('2026-11-02')
  })
})
