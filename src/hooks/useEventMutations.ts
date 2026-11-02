import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'
import type { EventInput } from '../types/domain'

export function useCreateEvent() {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: EventInput) => provider.createEvent(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useUpdateEvent() {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: {
      eventId: string
      input: EventInput
      expectedVersion: number
    }) => provider.updateEvent(variables.eventId, variables.input, variables.expectedVersion),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteEvent() {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { eventId: string; expectedVersion: number }) =>
      provider.deleteEvent(variables.eventId, variables.expectedVersion),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
