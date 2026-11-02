import { cn } from '../../lib/cn'
import { eventTimeLabel } from '../../lib/date'
import type { EventOccurrence } from '../../types/domain'
import { CreatorMark } from './CreatorMark'

const fallbackColor = '#67675E'

export function EventBand({
  event,
  timeZone,
  compact = false,
  onSelect,
  className,
}: {
  event: EventOccurrence
  timeZone: string
  compact?: boolean
  onSelect: () => void
  className?: string
}) {
  const creatorName = event.creator?.fullName ?? 'Unknown creator'
  const color = event.category?.color ?? fallbackColor
  const time = event.allDay ? 'All day' : eventTimeLabel(event, timeZone, false).split(' – ')[0]

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${event.title}, ${time}, created by ${creatorName}`}
      className={cn(
        'group w-full overflow-hidden rounded-[5px] border border-line bg-surface px-2 py-1.5 text-left',
        'transition-[border-color,background-color] duration-150 hover:border-line-strong hover:bg-surface-2',
        event.status === 'cancelled' && 'opacity-55',
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate font-mono text-[9px] text-ink-3">{time}</span>
        {event.priority === 'urgent' ? (
          <span className="ml-auto size-1.5 shrink-0 rounded-full bg-danger" title="Urgent" />
        ) : event.priority === 'high' ? (
          <span className="ml-auto size-1.5 shrink-0 rounded-full bg-warning" title="High priority" />
        ) : null}
      </div>
      <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-4 tracking-[-0.01em] text-ink">
        {event.title}
      </p>
      {!compact ? (
        <div className="mt-1 flex items-center gap-1.5">
          <CreatorMark
            name={creatorName}
            avatarUrl={event.creator?.avatarUrl}
            size="xs"
            showName
          />
        </div>
      ) : (
        <span className="mt-1 block">
          <CreatorMark name={creatorName} avatarUrl={event.creator?.avatarUrl} size="xs" />
        </span>
      )}
    </button>
  )
}
