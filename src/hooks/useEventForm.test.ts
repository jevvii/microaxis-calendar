import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialDraft, nextHourLocal } from './useEventForm'

describe('event form time defaults', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the viewer time zone for a new event', () => {
    const draft = createInitialDraft([], [], null, 'Europe/London')
    expect(draft.timeZone).toBe('Europe/London')
  })

  it('uses the active calendar instead of the first calendar', () => {
    const calendars = [
      {
        id: 'cal-first',
        workspaceId: 'ws-1',
        ownerId: null,
        teamId: null,
        name: 'First',
        description: null,
        kind: 'shared' as const,
        color: '#0C7A43',
        visibility: 'workspace' as const,
        createdBy: 'u-1',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
        deletedAt: null,
        shares: [],
      },
      {
        id: 'cal-active',
        workspaceId: 'ws-1',
        ownerId: null,
        teamId: null,
        name: 'Active',
        description: null,
        kind: 'shared' as const,
        color: '#2F5D78',
        visibility: 'workspace' as const,
        createdBy: 'u-1',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
        deletedAt: null,
        shares: [],
      },
    ]

    const draft = createInitialDraft(calendars, [], null, 'Asia/Manila', 'cal-active')
    expect(draft.calendarId).toBe('cal-active')
  })

  it('finds the next hour in the event time zone, not the browser hour', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-03T01:30:00.000Z'))

    expect(nextHourLocal('Asia/Kolkata')).toBe('2026-11-03T08:00')
  })
})
