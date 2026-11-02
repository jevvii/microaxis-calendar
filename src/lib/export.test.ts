import { describe, expect, it } from 'vitest'
import type { Calendar, Event } from '../types/domain'
import { exportCalendarIcs, exportWorkspaceJson } from './export'

const calendar: Calendar = {
  id: 'cal-1',
  workspaceId: 'ws-1',
  ownerId: null,
  teamId: 'team-1',
  name: 'Product',
  description: null,
  kind: 'team',
  color: '#2F5D78',
  visibility: 'team',
  createdBy: 'u-1',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  deletedAt: null,
  shares: [],
}

const event: Event = {
  id: 'evt-1',
  workspaceId: 'ws-1',
  calendarId: 'cal-1',
  calendarKind: 'team',
  createdBy: 'u-1',
  title: 'Pricing review, revised; final',
  description: 'Line one\nLine two',
  location: 'Room 2',
  startsAt: '2026-11-03T01:30:00.000Z',
  endsAt: '2026-11-03T02:30:00.000Z',
  allDay: false,
  timeZone: 'Asia/Manila',
  categoryId: null,
  priority: 'normal',
  status: 'scheduled',
  visibility: 'calendar',
  exportToGoogle: true,
  recurrenceRule: 'FREQ=WEEKLY;COUNT=8',
  recurrenceUntil: null,
  recurrenceExceptions: [],
  version: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  deletedAt: null,
}

describe('exportCalendarIcs', () => {
  it('escapes text, writes all-day dates, and includes recurrence', () => {
    const ics = exportCalendarIcs(calendar, [
      event,
      {
        ...event,
        id: 'evt-2',
        title: 'Studio closed',
        allDay: true,
        startsAt: '2026-11-07T00:00:00.000Z',
        endsAt: '2026-11-08T00:00:00.000Z',
      },
    ])

    expect(ics).toContain('SUMMARY:Pricing review\\, revised\\; final')
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;COUNT=8')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261107')
    expect(ics).toContain('DTEND;VALUE=DATE:20261108')
  })
})

describe('exportWorkspaceJson', () => {
  it('exports workspace data without Google tokens', () => {
    const json = exportWorkspaceJson({
      workspace: {
        id: 'ws-1',
        name: 'MicroAxis Studio',
        slug: 'microaxis-studio',
        createdBy: 'u-1',
        createdAt: '2026-11-01T00:00:00.000Z',
        deletedAt: null,
      },
      members: [],
      teams: [],
      calendars: [calendar],
      categories: [],
      events: [event],
    })

    expect(json).toContain('MicroAxis Studio')
    expect(json).not.toContain('refresh_token')
    expect(json).not.toContain('access_token')
  })
})
