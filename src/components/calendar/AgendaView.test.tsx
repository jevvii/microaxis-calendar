import { render, screen } from '@testing-library/react'
import { addDays, startOfWeek } from 'date-fns'
import { describe, expect, it, vi } from 'vitest'
import type { EventOccurrence } from '../../types/domain'
import { AgendaView } from './AgendaView'

function makeEvent(overrides: Partial<EventOccurrence> = {}): EventOccurrence {
  return {
    id: 'evt-1',
    workspaceId: 'ws-1',
    calendarId: 'cal-1',
    calendarKind: 'team',
    createdBy: 'u-1',
    title: 'OceanJet release review',
    description: null,
    location: 'Room 2',
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
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    deletedAt: null,
    occurrenceStart: '2026-11-03T01:30:00.000Z',
    occurrenceEnd: '2026-11-03T02:30:00.000Z',
    isRecurring: false,
    parentStart: '2026-11-03T01:30:00.000Z',
    creator: {
      id: 'u-1',
      fullName: 'Mara Velasco',
      avatarUrl: null,
      timezone: 'Asia/Manila',
      weekStartsOn: 1,
      clock24h: false,
    },
    ...overrides,
  }
}

describe('AgendaView', () => {
  it('groups events under their calendar day', () => {
    const weekStart = startOfWeek(new Date('2026-11-02T00:00:00'), { weekStartsOn: 1 })
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
    const events = new Map([
      ['2026-11-03', [makeEvent()]],
      [
        '2026-11-05',
        [
          makeEvent({
            id: 'evt-2',
            title: 'Pricing office hours',
            occurrenceStart: '2026-11-05T05:00:00.000Z',
            occurrenceEnd: '2026-11-05T06:00:00.000Z',
          }),
        ],
      ],
    ])

    render(
      <AgendaView
        days={days}
        eventsByDay={events}
        timeZone="Asia/Manila"
        onSelectEvent={vi.fn()}
      />,
    )

    expect(screen.getByTestId('agenda-day-2026-11-03')).toHaveTextContent('OceanJet release review')
    expect(screen.getByTestId('agenda-day-2026-11-05')).toHaveTextContent('Pricing office hours')
    expect(screen.queryByTestId('agenda-day-2026-11-04')).not.toBeInTheDocument()
  })
})
