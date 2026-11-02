import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'

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
    onSuccess: () => {
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attachments', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
