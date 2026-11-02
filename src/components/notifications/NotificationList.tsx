import { Bell, ChatCircle, CheckCircle, EnvelopeOpen, WarningCircle } from '@phosphor-icons/react'
import { format, isToday, isYesterday } from 'date-fns'
import type { Notification } from '../../types/domain'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/cn'

function notificationIcon(type: Notification['type']) {
  if (type === 'comment_mention') return ChatCircle
  if (type === 'event_reminder') return Bell
  if (type === 'event_created' || type === 'event_updated') return CheckCircle
  if (type === 'event_cancelled') return WarningCircle
  return EnvelopeOpen
}

function groupLabel(date: Date) {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d')
}

export function NotificationList({
  notifications,
  onSelect,
  onMarkRead,
  compact = false,
}: {
  notifications: Notification[]
  onSelect: (notification: Notification) => void
  onMarkRead: (notification: Notification) => void
  compact?: boolean
}) {
  const groups = new Map<string, Notification[]>()
  for (const notification of notifications) {
    const label = groupLabel(new Date(notification.createdAt))
    const list = groups.get(label) ?? []
    list.push(notification)
    groups.set(label, list)
  }

  if (notifications.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <Bell size={18} className="mx-auto text-ink-3" aria-hidden />
        <p className="mt-3 text-sm font-medium text-ink">Nothing needs you right now.</p>
        <p className="mt-1 text-xs leading-5 text-ink-3">
          Reminders, shared event updates, and mentions collect here.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('divide-y divide-line', compact && 'max-h-[24rem] overflow-y-auto')}>
      {[...groups.entries()].map(([label, items]) => (
        <section key={label}>
          <p className="bg-surface-2 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
            {label}
          </p>
          {items.map((notification) => {
            const Icon = notificationIcon(notification.type)
            return (
              <div
                key={notification.id}
                className={cn(
                  'flex gap-2.5 px-3 py-3 transition-colors hover:bg-surface-2',
                  !notification.readAt && 'bg-accent-wash/20',
                )}
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-ink-3">
                  <Icon size={14} aria-hidden />
                </span>
                <button
                  type="button"
                  onClick={() => onSelect(notification)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] font-medium leading-5 text-ink">
                      {notification.title}
                    </span>
                    {!notification.readAt ? <span className="size-1.5 rounded-full bg-accent" /> : null}
                  </span>
                  {notification.body ? (
                    <span className="mt-0.5 line-clamp-2 block text-[11px] leading-5 text-ink-3">
                      {notification.body}
                    </span>
                  ) : null}
                  <span className="mt-1 block font-mono text-[9px] text-ink-3">
                    {format(new Date(notification.createdAt), 'h:mm a')}
                  </span>
                </button>
                {!notification.readAt ? (
                  <button
                    type="button"
                    aria-label={`Mark ${notification.title} read`}
                    onClick={() => onMarkRead(notification)}
                    className="mt-0.5 h-7 shrink-0 rounded-control px-1.5 text-[9px] font-medium text-ink-3 hover:bg-surface-3 hover:text-ink"
                  >
                    Read
                  </button>
                ) : (
                  <Badge tone="neutral" className="mt-0.5 h-fit">
                    Read
                  </Badge>
                )}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
