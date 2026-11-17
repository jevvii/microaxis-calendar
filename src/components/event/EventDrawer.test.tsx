import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Calendar, Event, WorkspaceMembership } from '../../types/domain'
import { EventDrawer } from './EventDrawer'

vi.mock('./EventCollaboration', () => ({
  EventCollaboration: () => null,
}))

const calendar: Calendar = {
  id: '30000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000001',
  ownerId: 'a0000000-0000-4000-8000-000000000001',
  teamId: null,
  name: 'Mara’s calendar',
  description: null,
  kind: 'personal',
  color: '#0C7A43',
  visibility: 'private',
  createdBy: 'a0000000-0000-4000-8000-000000000001',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  deletedAt: null,
  shares: [],
}

const event: Event = {
  id: '40000000-0000-4000-8000-000000000001',
  workspaceId: calendar.workspaceId,
  calendarId: calendar.id,
  calendarKind: 'personal',
  createdBy: 'a0000000-0000-4000-8000-000000000001',
  title: 'Original title',
  description: 'Original description',
  location: 'Studio room',
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

const members: WorkspaceMembership[] = [
  {
    id: 'b0000000-0000-4000-8000-000000000001',
    workspaceId: calendar.workspaceId,
    userId: 'a0000000-0000-4000-8000-000000000001',
    role: 'owner',
    joinedAt: '2026-11-01T00:00:00.000Z',
    profile: {
      id: 'a0000000-0000-4000-8000-000000000001',
      fullName: 'Mara Velasco',
      avatarUrl: null,
      timezone: 'Asia/Manila',
      weekStartsOn: 1,
      clock24h: false,
    },
  },
]

function renderDrawer(conflict: Event | null) {
  return render(
    <EventDrawer
      open
      onOpenChange={vi.fn()}
      mode="edit"
      event={event}
      calendars={[calendar]}
      categories={[]}
      members={members}
      currentUserId="a0000000-0000-4000-8000-000000000001"
      canEdit
      conflict={conflict}
      onEdit={vi.fn()}
      onCancelEdit={vi.fn()}
      onSave={vi.fn()}
      onDelete={vi.fn()}
      onRsvp={vi.fn()}
      onStatusChange={vi.fn()}
      onReviewConflict={vi.fn()}
      onKeepDraft={vi.fn()}
    />,
  )
}

describe('EventDrawer time display', () => {
  it('shows the event in the viewer time zone with the viewer clock', () => {
    render(
      <EventDrawer
        open
        onOpenChange={vi.fn()}
        mode="view"
        event={event}
        calendars={[calendar]}
        categories={[]}
        members={members}
        currentUserId="a0000000-0000-4000-8000-000000000001"
        clock24h
        viewerTimeZone="America/New_York"
        canEdit
        onEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onRsvp={vi.fn()}
        onStatusChange={vi.fn()}
        onReviewConflict={vi.fn()}
        onKeepDraft={vi.fn()}
      />,
    )

    expect(screen.getByText('20:30 – 21:30')).toBeInTheDocument()
  })

  it('names the source calendar in event details', () => {
    render(
      <EventDrawer
        open
        onOpenChange={vi.fn()}
        mode="view"
        event={event}
        calendars={[calendar]}
        categories={[]}
        members={members}
        currentUserId="a0000000-0000-4000-8000-000000000001"
        canEdit
        onEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onRsvp={vi.fn()}
        onStatusChange={vi.fn()}
        onReviewConflict={vi.fn()}
        onKeepDraft={vi.fn()}
      />,
    )

    expect(screen.getByText('Mara’s calendar')).toBeInTheDocument()
  })
})

describe('EventDrawer conflict review', () => {
  it('reviews the newer version without discarding the draft', async () => {
    const user = userEvent.setup()
    const { rerender } = renderDrawer(null)

    const title = screen.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'My draft')

    rerender(
      <EventDrawer
        open
        onOpenChange={vi.fn()}
        mode="edit"
        event={event}
        calendars={[calendar]}
        categories={[]}
        members={members}
        currentUserId="a0000000-0000-4000-8000-000000000001"
        canEdit
        conflict={{ ...event, title: 'Newer title', version: 2 }}
        onEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onRsvp={vi.fn()}
        onStatusChange={vi.fn()}
        onReviewConflict={vi.fn()}
        onKeepDraft={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Review current version' }))

    expect(screen.getByText('Current version')).toBeInTheDocument()
    expect(screen.getByText('Newer title')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('My draft')
  })
})
