import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterBar, emptyFilters } from './FilterBar'

describe('FilterBar', () => {
  it('adds a priority filter when Urgent is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <FilterBar
        filters={emptyFilters}
        onChange={onChange}
        categories={[
          {
            id: 'cat-1',
            workspaceId: 'ws-1',
            name: 'Meeting',
            color: '#2F5D78',
            icon: 'users',
            createdAt: '2026-11-01T00:00:00.000Z',
          },
        ]}
        members={[]}
        calendars={[]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByRole('checkbox', { name: 'Urgent' }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ priorities: ['urgent'] }),
    )
  })

  it('updates the search query', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <FilterBar
        filters={emptyFilters}
        onChange={onChange}
        categories={[]}
        members={[]}
        calendars={[]}
      />,
    )

    await user.type(screen.getByRole('searchbox', { name: 'Search events' }), 'OceanJet')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ query: 'O' }))
  })
})
