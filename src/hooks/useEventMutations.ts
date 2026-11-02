import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'
import {
  cacheCreatedEvent,
  cacheDeletedEvent,
  cacheRsvp,
  cacheUpdatedEvent,
} from '../lib/queryCache'
import { useAuth } from '../providers/AuthProvider'
import type { EventInput, RsvpStatus } from '../types/domain'

export function useCreateEvent() {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: EventInput) => provider.createEvent(input),
    onSuccess: (event) => {
      cacheCreatedEvent(queryClient, event)
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
    onSuccess: (result) => {
      if (result.ok) cacheUpdatedEvent(queryClient, result.event)
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
    onSuccess: (_result, variables) => {
      cacheDeletedEvent(queryClient, variables.eventId)
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useSetRsvp() {
  const provider = useDataProvider()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (variables: { eventId: string; status: RsvpStatus }) =>
      provider.setRsvp(variables.eventId, variables.status),
    onSuccess: (_result, variables) => {
      if (user) {
        cacheRsvp(
          queryClient,
          variables.eventId,
          user.id,
          variables.status,
          new Date().toISOString(),
        )
      }
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
