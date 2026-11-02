import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'
import { normalizeNotificationPreferences } from '../lib/notificationPreferences'
import type { NotificationPreferences } from '../types/domain'

export function useNotifications(workspaceId: string | null | undefined) {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', workspaceId],
    queryFn: () => provider.listNotifications(workspaceId as string),
    enabled: Boolean(workspaceId),
  })

  const markRead = useMutation({
    mutationFn: (notificationId: string) => provider.markNotificationRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] })
    },
  })

  const markAll = useMutation({
    mutationFn: (notificationIds: string[]) =>
      Promise.all(notificationIds.map((id) => provider.markNotificationRead(id))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] })
    },
  })

  const notifications = query.data ?? []
  const unreadCount = notifications.filter((notification) => !notification.readAt).length

  return {
    ...query,
    notifications,
    unreadCount,
    markRead: (notificationId: string) => markRead.mutate(notificationId),
    markAllRead: () =>
      markAll.mutate(
        notifications
          .filter((notification) => !notification.readAt)
          .map((notification) => notification.id),
      ),
    marking: markRead.isPending || markAll.isPending,
  }
}

export function useNotificationPreferences() {
  const provider = useDataProvider()

  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => normalizeNotificationPreferences(await provider.getNotificationPreferences()),
  })
}

export function useUpdateNotificationPreferences() {
  const provider = useDataProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (preferences: NotificationPreferences) =>
      provider.updateNotificationPreferences(preferences),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })
}
