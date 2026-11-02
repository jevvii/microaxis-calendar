import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Calendar, EventCategory, WorkspaceMembership } from '../../types/domain'
import { EventForm } from './EventForm'

const calendars: Calendar[] = [
  {
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
  },
]

const categories: EventCategory[] = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    workspaceId: '10000000-0000-4000-8000-000000000001',
    name: 'Meeting',
    color: '#2F5D78',
    icon: 'users',
    createdAt: '2026-11-01T00:00:00.000Z',
  },
]

const members: WorkspaceMembership[] = [
  {
    id: 'b0000000-0000-4000-8000-000000000001',
    workspaceId: '10000000-0000-4000-8000-000000000001',
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

describe('EventForm', () => {
  it('requires a title', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EventForm
        mode="create"
        calendars={calendars}
        categories={categories}
        members={members}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(screen.getByText('Add a title')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects an end time before the start time', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EventForm
        mode="create"
        calendars={calendars}
        categories={categories}
        members={members}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Title'), 'Pricing review')
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-11-03T10:00' } })
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-11-03T09:00' } })
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(screen.getByText('End time must be after the start time')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('switches to date-only fields for an all-day event', async () => {
    const user = userEvent.setup()

    render(
      <EventForm
        mode="create"
        calendars={calendars}
        categories={categories}
        members={members}
        onSubmit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'All-day event' }))

    expect(screen.getByLabelText('Starts')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Ends')).toHaveAttribute('type', 'date')
  })

  it('submits a valid event with the selected participant', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EventForm
        mode="create"
        calendars={calendars}
        categories={categories}
        members={members}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Title'), 'Pricing review')
    await user.click(screen.getByRole('checkbox', { name: /Mara Velasco/ }))
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Pricing review',
        participantIds: ['a0000000-0000-4000-8000-000000000001'],
      }),
    )
  })
})
