import { useQuery } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'

export function useCalendars(workspaceId: string | null | undefined) {
  const provider = useDataProvider()

  return useQuery({
    queryKey: ['calendars', workspaceId],
    queryFn: () => provider.listCalendars(workspaceId as string),
    enabled: Boolean(workspaceId),
  })
}
