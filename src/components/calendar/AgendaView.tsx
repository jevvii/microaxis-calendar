import { format } from 'date-fns'
import { eventTimeLabel } from '../../lib/date'
import type { EventOccurrence } from '../../types/domain'
import { Badge } from '../ui/Badge'
import { CreatorMark } from './CreatorMark'

export function AgendaView({
  days,
  eventsByDay,
  timeZone,
  onSelectEvent,
}: {
  days: Date[]
  eventsByDay: Map<string, EventOccurrence[]>
  timeZone: string
  onSelectEvent: (event: EventOccurrence) => void
}) {
  const populatedDays = days
    .map((day) => ({ day, key: format(day, 'yyyy-MM-dd') }))
    .filter(({ key }) => (eventsByDay.get(key) ?? []).length > 0)

  return (
    <div className="divide-y divide-line">
      {populatedDays.map(({ day, key }) => {
        const dayEvents = eventsByDay.get(key) ?? []
        return (
          <section
            key={key}
            data-testid={`agenda-day-${key}`}
            className="grid gap-4 px-4 py-5 sm:grid-cols-[8.5rem_1fr] sm:px-6"
          >
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                {format(day, 'EEE')}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.02em]">{format(day, 'MMM d')}</p>
              <p className="mt-0.5 font-mono text-[10px] text-ink-3">
                {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
              </p>
            </div>
            <div className="grid gap-2">
              {dayEvents.map((event) => {
                const creatorName = event.creator?.fullName ?? 'Unknown creator'
                return (
                  <button
                    key={`${event.id}-${event.occurrenceStart}`}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    aria-label={`${event.title}, created by ${creatorName}`}
                    className="grid gap-3 rounded-panel border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong hover:bg-surface-2 sm:grid-cols-[9.5rem_1fr_auto] sm:items-center"
                  >
                    <span className="whitespace-nowrap font-mono text-[11px] text-ink-3">
                      {event.allDay ? 'All day' : eventTimeLabel(event, timeZone, false)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{event.title}</span>
                        {event.priority === 'urgent' ? (
                          <Badge tone="danger">Urgent</Badge>
                        ) : event.priority === 'high' ? (
                          <Badge tone="warning">High</Badge>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-3">
                        {event.location ?? 'No location'}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <CreatorMark
                        name={creatorName}
                        avatarUrl={event.creator?.avatarUrl}
                        size="sm"
                        showName
                      />
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
