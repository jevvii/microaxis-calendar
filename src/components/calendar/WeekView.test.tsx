import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { EventOccurrence } from '../../types/domain'
import { WeekView } from './WeekView'

const event: EventOccurrence = {
  id: 'evt-1',
  workspaceId: 'ws-1',
  calendarId: 'cal-1',
  calendarKind: 'team',
  createdBy: 'u-2',
  title: 'OceanJet release review',
  description: null,
  location: 'Room 2',
  startsAt: '2026-11-03T01:30:00.000Z',
  endsAt: '2026-11-03T02:30:00.000Z',
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
    id: 'u-2',
    fullName: 'Ivo Santos',
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
  occurrenceStart: '2026-11-03T01:30:00.000Z',
  occurrenceEnd: '2026-11-03T02:30:00.000Z',
  isRecurring: false,
  parentStart: '2026-11-03T01:30:00.000Z',
}

describe('WeekView', () => {
  it('renders 24 time rows and positions the event by its Manila time', () => {
    render(
      <WeekView
        weekStart={new Date('2026-11-02T00:00:00')}
        events={[event]}
        timeZone="Asia/Manila"
        onSelectEvent={vi.fn()}
      />,
    )

    expect(screen.getAllByTestId('week-hour-row')).toHaveLength(24)
    expect(screen.getByText('OceanJet release review')).toBeInTheDocument()
    expect(screen.getByLabelText('Created by Ivo Santos')).toBeInTheDocument()
  })
})
