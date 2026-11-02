import { Bell, Check, EnvelopeOpen, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useDataProvider } from '../data/provider'
import { useWorkspace } from '../providers/WorkspaceProvider'
import type { Notification } from '../types/domain'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'

export function NotificationsPage() {
  const provider = useDataProvider()
  const { activeWorkspaceId, loading: workspaceLoading } = useWorkspace()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspaceId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    provider
      .listNotifications(activeWorkspaceId)
      .then((items) => {
        if (!cancelled) setNotifications(items)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId, provider])

  async function markRead(id: string) {
    await provider.markNotificationRead(id)
    setNotifications((items) =>
      items.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    )
  }

  async function markAllRead() {
    const unread = notifications.filter((item) => !item.readAt)
    await Promise.all(unread.map((item) => provider.markNotificationRead(item.id)))
    setNotifications((items) =>
      items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
    )
  }

  if (workspaceLoading || loading) {
    return (
      <div className="mx-auto grid max-w-3xl gap-3 p-4 sm:p-6">
        <Skeleton className="h-9 w-40" />
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
    )
  }

  const unreadCount = notifications.filter((notification) => !notification.readAt).length

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">Inbox</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">Notifications</h1>
          <p className="mt-1 text-sm text-ink-3">
            {unreadCount > 0 ? `${unreadCount} unread` : 'Everything is caught up.'}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Check size={14} weight="bold" aria-hidden />}
            onClick={markAllRead}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="Nothing needs you right now."
          description="Reminders, shared event updates, and mentions will collect here."
          icon={<Bell size={18} aria-hidden />}
        />
      ) : (
        <div className="mt-6 divide-y divide-line border-y border-line">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex gap-3 py-4 ${notification.readAt ? 'opacity-65' : ''}`}
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control border border-line bg-surface-2 text-ink-3">
                {notification.type === 'comment_mention' ? (
                  <EnvelopeOpen size={15} aria-hidden />
                ) : notification.type === 'event_reminder' ? (
                  <Bell size={15} aria-hidden />
                ) : (
                  <WarningCircle size={15} aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-ink">{notification.title}</p>
                  {!notification.readAt ? <Badge tone="accent">New</Badge> : null}
                </div>
                {notification.body ? (
                  <p className="mt-1 text-sm leading-6 text-ink-3">{notification.body}</p>
                ) : null}
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-3">
                  {new Date(notification.createdAt).toLocaleString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {!notification.readAt ? (
                <button
                  type="button"
                  onClick={() => markRead(notification.id)}
                  className="h-8 shrink-0 rounded-control px-2 text-[11px] font-medium text-ink-3 hover:bg-surface-3 hover:text-ink"
                >
                  Mark read
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
