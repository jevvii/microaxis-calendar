import { describe, expect, it } from 'vitest'
import type { Event } from '../types/domain'
import { filterCachedEventSummaries, toEventSummaries } from './offlineCache'

const event: Event = {
  id: 'evt-1',
  workspaceId: 'ws-1',
  calendarId: 'cal-1',
  calendarKind: 'team',
  createdBy: 'u-1',
  title: 'OceanJet release review',
  description: 'Sensitive context that must not be cached offline.',
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
  recurrenceRule: null,
  recurrenceUntil: null,
  recurrenceExceptions: [],
  version: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  deletedAt: null,
}

describe('offline event cache', () => {
  it('stores only the safe summary fields', () => {
    const [summary] = toEventSummaries([event])
    expect(summary).toEqual({
      id: 'evt-1',
      calendarId: 'cal-1',
      title: 'OceanJet release review',
      startsAt: '2026-11-03T01:30:00.000Z',
      endsAt: '2026-11-03T02:30:00.000Z',
      allDay: false,
      timeZone: 'Asia/Manila',
      location: 'Room 2',
    })
    expect(summary).not.toHaveProperty('description')
    expect(summary).not.toHaveProperty('comments')
  })

  it('filters cached summaries to the requested range', () => {
    const summaries = toEventSummaries([event])
    expect(
      filterCachedEventSummaries(
        summaries,
        '2026-11-02T00:00:00.000Z',
        '2026-11-09T00:00:00.000Z',
      ),
    ).toHaveLength(1)
    expect(
      filterCachedEventSummaries(
        summaries,
        '2026-11-10T00:00:00.000Z',
        '2026-11-17T00:00:00.000Z',
      ),
    ).toHaveLength(0)
  })
})
