import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'
import { normalizeNotificationPreferences } from '../lib/notificationPreferences'
import { cacheNotificationsRead } from '../lib/queryCache'
import type { Notification, NotificationPreferences } from '../types/domain'

export function useNotifications(workspaceId: string | null | undefined) {
  const provider = useDataProvider()
  const queryClient = useQueryClient()
  const notificationKey = ['notifications', workspaceId]

  const query = useQuery({
    queryKey: notificationKey,
    queryFn: () => provider.listNotifications(workspaceId as string),
    enabled: Boolean(workspaceId),
  })

  function snapshot() {
    return queryClient.getQueryData<Notification[]>(notificationKey)
  }

  function restore(previous: Notification[] | undefined) {
    if (previous) queryClient.setQueryData(notificationKey, previous)
  }

  const markRead = useMutation({
    mutationFn: (notificationId: string) => provider.markNotificationRead(notificationId),
    onMutate: (notificationId) => {
      const previous = snapshot()
      cacheNotificationsRead(queryClient, workspaceId, [notificationId])
      return { previous }
    },
    onError: (_error, _notificationId, context) => restore(context?.previous),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAll = useMutation({
    mutationFn: (notificationIds: string[]) =>
      Promise.all(notificationIds.map((id) => provider.markNotificationRead(id))),
    onMutate: (notificationIds) => {
      const previous = snapshot()
      cacheNotificationsRead(queryClient, workspaceId, notificationIds)
      return { previous }
    },
    onError: (_error, _notificationIds, context) => restore(context?.previous),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
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
