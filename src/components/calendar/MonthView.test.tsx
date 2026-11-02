import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { EventOccurrence } from '../../types/domain'
import { MonthView } from './MonthView'

const baseEvent: EventOccurrence = {
  id: 'evt-1',
  workspaceId: 'ws-1',
  calendarId: 'cal-1',
  calendarKind: 'team',
  createdBy: 'u-1',
  title: 'Late-night review',
  description: null,
  location: 'Room 2',
  startsAt: '2026-11-02T16:30:00.000Z',
  endsAt: '2026-11-02T17:30:00.000Z',
  allDay: false,
  timeZone: 'Asia/Manila',
  categoryId: 'cat-1',
  priority: 'high',
  status: 'scheduled',
  visibility: 'calendar',
  recurrenceRule: null,
  recurrenceUntil: null,
  recurrenceExceptions: [],
  version: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  deletedAt: null,
  creator: {
    id: 'u-1',
    fullName: 'Mara Velasco',
    avatarUrl: null,
    timezone: 'Asia/Manila',
    weekStartsOn: 1,
    clock24h: false,
  },
  category: {
    id: 'cat-1',
    workspaceId: 'ws-1',
    name: 'Meeting',
    color: '#2F5D78',
    icon: 'users',
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  occurrenceStart: '2026-11-02T16:30:00.000Z',
  occurrenceEnd: '2026-11-02T17:30:00.000Z',
  isRecurring: false,
  parentStart: '2026-11-02T16:30:00.000Z',
}

describe('MonthView', () => {
  it('aligns days to Monday and groups an event by its Manila date', () => {
    render(
      <MonthView
        date={new Date('2026-11-01T00:00:00')}
        events={[baseEvent]}
        timeZone="Asia/Manila"
        onSelectEvent={vi.fn()}
      />,
    )

    expect(screen.getByTestId('month-day-2026-10-26')).toBeInTheDocument()
    const cell = screen.getByTestId('month-day-2026-11-03')
    expect(within(cell).getByText('Late-night review')).toBeInTheDocument()
    expect(screen.getByLabelText('Created by Mara Velasco')).toBeInTheDocument()
  })

  it('shows three event bands and a +N more count', () => {
    const events = Array.from({ length: 5 }, (_, index) => ({
      ...baseEvent,
      id: `evt-${index}`,
      title: `Review ${index + 1}`,
      occurrenceStart: '2026-11-02T16:30:00.000Z',
      occurrenceEnd: '2026-11-02T17:30:00.000Z',
    }))

    render(
      <MonthView
        date={new Date('2026-11-01T00:00:00')}
        events={events}
        timeZone="Asia/Manila"
        onSelectEvent={vi.fn()}
      />,
    )

    const cell = screen.getByTestId('month-day-2026-11-03')
    expect(within(cell).getByText('+2 more')).toBeInTheDocument()
  })
})
