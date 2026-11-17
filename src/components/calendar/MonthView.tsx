import { addDays, eachDayOfInterval, endOfMonth, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { dateKeyInTimeZone } from '../../lib/date'
import type { EventOccurrence } from '../../types/domain'
import { EventBand } from './EventBand'

export function MonthView({
  date,
  events,
  timeZone,
  weekStartsOn = 1,
  clock24h = false,
  onSelectEvent,
  onCreateAt,
  onOpenDay,
}: {
  date: Date
  events: EventOccurrence[]
  timeZone: string
  weekStartsOn?: 0 | 1
  clock24h?: boolean
  onSelectEvent: (event: EventOccurrence) => void
  onCreateAt?: (date: Date) => void
  onOpenDay?: (date: Date) => void
}) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { weekStartsOn })
  const gridEnd = addDays(startOfWeek(addDays(monthEnd, 1), { weekStartsOn }), 6)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const todayKey = dateKeyInTimeZone(new Date(), timeZone)
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    format(addDays(gridStart, index), 'EEE'),
  )

  const eventsByDay = new Map<string, EventOccurrence[]>()
  for (const event of events) {
    const key = dateKeyInTimeZone(event.occurrenceStart, timeZone)
    const list = eventsByDay.get(key) ?? []
    list.push(event)
    eventsByDay.set(key, list)
  }

  return (
    <div className="min-w-[720px]">
      <div className="grid grid-cols-7 border-b border-line bg-surface-2">
        {weekdayLabels.map((day) => (
          <div
            key={day}
            className="border-r border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDay.get(key) ?? []
          const outsideMonth = !isSameMonth(day, date)
          const isToday = key === todayKey
          return (
            <div
              key={key}
              data-testid={`month-day-${key}`}
              aria-label={format(day, 'EEEE, MMMM d, yyyy')}
              onDoubleClick={() => onCreateAt?.(day)}
              className={`min-h-36 border-b border-r border-line p-1.5 last:border-r-0 ${
                outsideMonth ? 'bg-surface-2/60' : 'bg-surface'
              } ${isToday ? 'bg-accent-wash/35' : ''}`}
            >
              <div className="flex items-baseline justify-between px-1 py-1">
                <span
                  className={`font-mono text-[11px] ${
                    isToday ? 'font-medium text-accent' : 'text-ink-3'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {index === 0 ? (
                  <span className="font-mono text-[9px] text-ink-3">{format(day, 'MMM')}</span>
                ) : null}
              </div>
              <div className="grid gap-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <EventBand
                    key={`${event.id}-${event.occurrenceStart}`}
                    event={event}
                    timeZone={timeZone}
                    clock24h={clock24h}
                    compact
                    onSelect={() => onSelectEvent(event)}
                  />
                ))}
                {dayEvents.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => onOpenDay?.(day)}
                    className="px-1 text-left font-mono text-[9px] text-ink-3 hover:text-ink"
                  >
                    +{dayEvents.length - 3} more
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
