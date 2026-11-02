import { format } from 'date-fns'
import type { EventActivity } from '../../types/domain'
import { CreatorMark } from '../calendar/CreatorMark'

const actionLabels: Record<string, string> = {
  created: 'created the event',
  updated: 'updated the event',
  status_changed: 'changed the status',
  visibility_changed: 'changed who can see it',
  deleted: 'deleted the event',
}

export function ActivityLog({ activity }: { activity: EventActivity[] }) {
  if (activity.length === 0) {
    return <p className="text-sm text-ink-3">No activity recorded yet.</p>
  }

  return (
    <ol className="grid gap-3">
      {activity.map((item) => {
        const actorName = item.actor?.fullName ?? 'A workspace member'
        return (
          <li key={item.id} className="flex items-start gap-2.5">
            <CreatorMark name={actorName} avatarUrl={item.actor?.avatarUrl} size="xs" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] leading-5 text-ink-2">
                <span className="font-medium text-ink">{actorName}</span>{' '}
                {actionLabels[item.action] ?? item.action.replaceAll('_', ' ')}
              </p>
              <time
                dateTime={item.createdAt}
                className="font-mono text-[9px] uppercase tracking-[0.04em] text-ink-3"
              >
                {format(new Date(item.createdAt), 'MMM d, h:mm a')}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
