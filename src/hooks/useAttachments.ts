import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'
import type { EventAttachment } from '../types/domain'

export function useAttachments(eventId: string | null | undefined) {
  const provider = useDataProvider()

  return useQuery({
    queryKey: ['attachments', eventId],
    queryFn: () => provider.listAttachments(eventId as string),
    enabled: Boolean(eventId),
  })
}

export function useUploadAttachment(eventId: string | null | undefined) {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { workspaceId: string; eventId: string; file: File }) =>
      provider.uploadAttachment(input),
    onSuccess: (attachment) => {
      queryClient.setQueryData<EventAttachment[]>(['attachments', eventId], (current) => {
        if (!current) return [attachment]
        return [attachment, ...current.filter((item) => item.id !== attachment.id)]
      })
      void queryClient.invalidateQueries({ queryKey: ['attachments', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useDeleteAttachment(eventId: string | null | undefined) {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attachmentId: string) => provider.deleteAttachment(attachmentId),
    onSuccess: (_result, attachmentId) => {
      queryClient.setQueryData<EventAttachment[]>(['attachments', eventId], (current) =>
        current?.filter((item) => item.id !== attachmentId),
      )
      void queryClient.invalidateQueries({ queryKey: ['attachments', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
