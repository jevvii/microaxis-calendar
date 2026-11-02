import { ArrowRight } from '@phosphor-icons/react'
import type { Notification } from '../../types/domain'
import { Button } from '../ui/Button'
import { NotificationList } from './NotificationList'

export function NotificationPanel({
  notifications,
  unreadCount,
  onSelect,
  onMarkRead,
  onMarkAllRead,
  onViewAll,
}: {
  notifications: Notification[]
  unreadCount: number
  onSelect: (notification: Notification) => void
  onMarkRead: (notification: Notification) => void
  onMarkAllRead: () => void
  onViewAll: () => void
}) {
  return (
    <div className="w-[min(24rem,calc(100vw-1.5rem))]">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold text-ink">Notifications</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.05em] text-ink-3">
            {unreadCount} unread
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
            Mark all read
          </Button>
        ) : null}
      </div>
      <div className="border-y border-line">
        <NotificationList
          compact
          notifications={notifications.slice(0, 5)}
          onSelect={onSelect}
          onMarkRead={onMarkRead}
        />
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[11px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        View all notifications
        <ArrowRight size={13} aria-hidden />
      </button>
    </div>
  )
}
