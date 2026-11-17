import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'
import type { ScheduleRequestAction } from '../types/domain'

export function useScheduleRequests(workspaceId: string | null | undefined) {
  const provider = useDataProvider()

  return useQuery({
    queryKey: ['schedule-requests', workspaceId],
    queryFn: () => provider.listScheduleRequests(workspaceId as string),
    enabled: Boolean(workspaceId),
  })
}

export function useRespondScheduleRequest() {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      requestId: string
      action: ScheduleRequestAction
      proposedStartsAt?: string | null
      proposedEndsAt?: string | null
      message?: string | null
    }) => provider.respondScheduleRequest(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
