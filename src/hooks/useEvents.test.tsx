import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DataProviderProvider } from '../data/provider'
import { DEMO_WORKSPACE_ID } from '../data/demo/demoData'
import { queryClient } from '../lib/queryClient'
import type { EventFilters } from '../lib/eventFilters'
import { QueryProvider } from '../providers/QueryProvider'
import { useEvents } from './useEvents'

function EventsProbe({ filters }: { filters?: EventFilters }) {
  const query = useEvents({
    workspaceId: DEMO_WORKSPACE_ID,
    rangeStart: '2026-11-02T00:00:00.000Z',
    rangeEnd: '2026-11-09T00:00:00.000Z',
    filters,
  })

  return (
    <div data-testid="events">
      {query.isLoading ? 'loading' : (query.data ?? []).map((event) => event.title).join('|')}
    </div>
  )
}

function renderProbe(filters?: EventFilters) {
  return render(
    <DataProviderProvider>
      <QueryProvider>
        <EventsProbe filters={filters} />
      </QueryProvider>
    </DataProviderProvider>,
  )
}

describe('useEvents', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient.clear()
  })

  it('loads workspace events for the requested range', async () => {
    renderProbe()

    await waitFor(() => {
      expect(screen.getByTestId('events')).toHaveTextContent('OceanJet release review')
    })
    expect(screen.getByTestId('events')).toHaveTextContent('Product weekly')
  })

  it('applies priority filters without losing the query cache', async () => {
    renderProbe({ priorities: ['urgent'] })

    await waitFor(() => {
      expect(screen.getByTestId('events')).toHaveTextContent('DBM accessibility audit')
    })
    expect(screen.getByTestId('events')).not.toHaveTextContent('OceanJet release review')
    expect(screen.getByTestId('events')).toHaveTextContent('OceanJet go-live')
  })
})
