import { addDays, startOfWeek } from 'date-fns'
import { dateKeyInTimeZone } from '../../lib/date'
import type { EventOccurrence } from '../../types/domain'
import { AgendaView } from './AgendaView'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import type { CalendarView } from './ViewSwitcher'

export function CalendarCanvas({
  view,
  date,
  events,
  timeZone,
  weekStartsOn = 1,
  clock24h = false,
  onSelectEvent,
  onCreateAt,
  onOpenDay,
}: {
  view: CalendarView
  date: Date
  events: EventOccurrence[]
  timeZone: string
  weekStartsOn?: 0 | 1
  clock24h?: boolean
  onSelectEvent: (event: EventOccurrence) => void
  onCreateAt?: (date: Date) => void
  onOpenDay?: (date: Date) => void
}) {
  const weekStart = startOfWeek(date, { weekStartsOn })
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))

  if (view === 'month') {
    return (
      <MonthView
        date={date}
        events={events}
        timeZone={timeZone}
        weekStartsOn={weekStartsOn}
        clock24h={clock24h}
        onSelectEvent={onSelectEvent}
        onCreateAt={onCreateAt}
        onOpenDay={onOpenDay}
      />
    )
  }

  if (view === 'week') {
    return (
      <WeekView
        weekStart={weekStart}
        events={events}
        timeZone={timeZone}
        clock24h={clock24h}
        onSelectEvent={onSelectEvent}
      />
    )
  }

  const eventsByDay = new Map<string, EventOccurrence[]>()
  for (const event of events) {
    const key = dateKeyInTimeZone(event.occurrenceStart, timeZone)
    const list = eventsByDay.get(key) ?? []
    list.push(event)
    eventsByDay.set(key, list)
  }

  return (
    <AgendaView
      days={days}
      eventsByDay={eventsByDay}
      timeZone={timeZone}
      clock24h={clock24h}
      onSelectEvent={onSelectEvent}
    />
  )
}
