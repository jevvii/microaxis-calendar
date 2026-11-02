import { useQuery } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'
import { applyEventFilters, type EventFilters } from '../lib/eventFilters'

export type UseEventsInput = {
  workspaceId: string | null | undefined
  rangeStart: string
  rangeEnd: string
  filters?: EventFilters
}

export function useEvents({ workspaceId, rangeStart, rangeEnd, filters }: UseEventsInput) {
  const provider = useDataProvider()
  const filterKey = JSON.stringify(filters ?? {})

  return useQuery({
    queryKey: ['events', workspaceId, rangeStart, rangeEnd, filterKey],
    queryFn: () =>
      provider.listEvents({
        workspaceId: workspaceId as string,
        rangeStart,
        rangeEnd,
      }),
    enabled: Boolean(workspaceId),
    select: (events) => applyEventFilters(events, filters),
  })
}
