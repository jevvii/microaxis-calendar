import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'

export function useComments(eventId: string | null | undefined) {
  const provider = useDataProvider()

  return useQuery({
    queryKey: ['comments', eventId],
    queryFn: () => provider.listComments(eventId as string),
    enabled: Boolean(eventId),
  })
}

export function useCreateComment(eventId: string | null | undefined) {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: string) => provider.createComment(eventId as string, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateComment(eventId: string | null | undefined) {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { commentId: string; body: string }) =>
      provider.updateComment(variables.commentId, variables.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', eventId] })
    },
  })
}

export function useDeleteComment(eventId: string | null | undefined) {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) => provider.deleteComment(commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useEventActivity(eventId: string | null | undefined) {
  const provider = useDataProvider()

  return useQuery({
    queryKey: ['activity', eventId],
    queryFn: () => provider.listActivity(eventId as string),
    enabled: Boolean(eventId),
  })
}
