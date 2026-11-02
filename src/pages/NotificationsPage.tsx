import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'
import { useWorkspace } from '../providers/WorkspaceProvider'
import { NotificationList } from '../components/notifications/NotificationList'
import { NotificationPreferences } from '../components/notifications/NotificationPreferences'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import type { Notification } from '../types/domain'

export function NotificationsPage() {
  const { activeWorkspaceId, loading: workspaceLoading } = useWorkspace()
  const navigate = useNavigate()
  const notifications = useNotifications(activeWorkspaceId)

  function openNotification(notification: Notification) {
    notifications.markRead(notification.id)
    if (notification.href) navigate(notification.href)
  }

  if (workspaceLoading || notifications.isLoading) {
    return (
      <div className="mx-auto grid max-w-3xl gap-3 p-4 sm:p-6">
        <Skeleton className="h-9 w-40" />
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">Inbox</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">Notifications</h1>
          <p className="mt-1 text-sm text-ink-3">
            {notifications.unreadCount > 0
              ? `${notifications.unreadCount} unread`
              : 'Everything is caught up.'}
          </p>
        </div>
        {notifications.unreadCount > 0 ? (
          <Button variant="secondary" size="sm" onClick={notifications.markAllRead}>
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="mt-6 overflow-hidden rounded-panel border border-line bg-surface">
        <NotificationList
          notifications={notifications.notifications}
          onSelect={openNotification}
          onMarkRead={(notification) => notifications.markRead(notification.id)}
        />
      </div>

      <div className="mt-10 border-t border-line pt-8">
        <NotificationPreferences />
      </div>
    </div>
  )
}
