import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { EventOccurrence } from '../../types/domain'
import { EventBand } from './EventBand'

const event: EventOccurrence = {
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
  exportToGoogle: true,
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
  occurrenceStart: '2026-11-03T01:30:00.000Z',
  occurrenceEnd: '2026-11-03T02:30:00.000Z',
  isRecurring: false,
  parentStart: '2026-11-03T01:30:00.000Z',
}

describe('EventBand', () => {
  it('uses the viewer 24-hour clock preference', () => {
    render(
      <EventBand
        event={event}
        timeZone="Asia/Manila"
        clock24h
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('09:30')).toBeInTheDocument()
  })
})
