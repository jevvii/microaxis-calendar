import { ArrowUpRight, CalendarBlank, Plus } from '@phosphor-icons/react'
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getISOWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCalendars } from '../hooks/useCalendars'
import { useEvents } from '../hooks/useEvents'
import { useAuth } from '../providers/AuthProvider'
import { useToast } from '../providers/ToastProvider'
import { useWorkspace } from '../providers/WorkspaceProvider'
import { dateKeyInTimeZone, eventTimeLabel } from '../lib/date'
import { expandRecurrence } from '../lib/recurrence'
import type { EventOccurrence } from '../types/domain'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Skeleton } from '../components/ui/Skeleton'

type View = 'week' | 'month' | 'agenda'

function viewFrom(value: string | null): View {
  return value === 'month' || value === 'agenda' ? value : 'week'
}

const categoryColor: Record<string, string> = {
  Meeting: '#2F5D78',
  Deadline: '#8B4039',
  Milestone: '#3F5C3A',
  Leave: '#7A5A1F',
  Focus: '#6E5140',
  Holiday: '#5D5D54',
  Other: '#67675E',
}

export function CalendarPage() {
  const { user } = useAuth()
  const { activeWorkspace, activeWorkspaceId, loading: workspaceLoading } = useWorkspace()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedDate = searchParams.get('date')
    ? new Date(`${searchParams.get('date')}T00:00:00`)
    : new Date()
  const view = viewFrom(searchParams.get('view'))
  const calendarFilter = searchParams.get('calendar')
  const timeZone = 'Asia/Manila'

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 7)
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = addDays(endOfMonth(selectedDate), 1)
  const rangeStart = view === 'month' ? monthStart : weekStart
  const rangeEnd = view === 'month' ? monthEnd : weekEnd
  const rangeStartIso = rangeStart.toISOString()
  const rangeEndIso = rangeEnd.toISOString()

  const calendarsQuery = useCalendars(activeWorkspaceId)
  const eventsQuery = useEvents({
    workspaceId: activeWorkspaceId,
    rangeStart: rangeStartIso,
    rangeEnd: rangeEndIso,
  })

  const calendars = calendarsQuery.data ?? []
  const events = eventsQuery.data ?? []
  const loading =
    workspaceLoading ||
    (Boolean(activeWorkspaceId) && (calendarsQuery.isLoading || eventsQuery.isLoading))
  const loadError = calendarsQuery.error ?? eventsQuery.error

  const calendarMap = useMemo(
    () => new Map(calendars.map((calendar) => [calendar.id, calendar])),
    [calendars],
  )

  const occurrences = useMemo(() => {
    return events
      .filter((event) => !calendarFilter || event.calendarId === calendarFilter)
      .flatMap((event) => expandRecurrence(event, rangeStartIso, rangeEndIso))
      .sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart))
  }, [calendarFilter, events, rangeEndIso, rangeStartIso])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>()
    for (const occurrence of occurrences) {
      const key = dateKeyInTimeZone(occurrence.occurrenceStart, timeZone)
      const list = map.get(key) ?? []
      list.push(occurrence)
      map.set(key, list)
    }
    return map
  }, [occurrences, timeZone])

  const days =
    view === 'month'
      ? eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: addDays(startOfWeek(addDays(monthEnd, -1), { weekStartsOn: 1 }), 6) })
      : eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })

  function setView(nextView: View) {
    const next = new URLSearchParams(searchParams)
    next.set('view', nextView)
    setSearchParams(next, { replace: true })
  }

  if (loadError) {
    return (
      <EmptyState
        title="The calendar could not load."
        description={loadError instanceof Error ? loadError.message : 'Try again in a moment.'}
        icon={<CalendarBlank size={18} aria-hidden />}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void calendarsQuery.refetch()
              void eventsQuery.refetch()
            }}
          >
            Try again
          </Button>
        }
      />
    )
  }

  if (workspaceLoading || loading) {
    return (
      <div className="grid gap-4 p-4 sm:p-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-panel border border-line bg-line">
          {Array.from({ length: 35 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-none bg-surface" />
          ))}
        </div>
      </div>
    )
  }

  const eventCount = occurrences.length
  const responseCount = occurrences.filter((occurrence) =>
    occurrence.participants?.some(
      (participant) => participant.userId === user?.id && participant.status === 'no_response',
    ),
  ).length

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-4 py-5 sm:px-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            {format(weekStart, 'yyyy')} / Week {getISOWeek(weekStart)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
            {view === 'week' ? 'This week' : view === 'month' ? format(selectedDate, 'MMMM yyyy') : 'Agenda'}
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            {eventCount} {eventCount === 1 ? 'event' : 'events'} across {calendars.length} calendars.
            {responseCount > 0 ? ` ${responseCount} need your response.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <SegmentedControl
              ariaLabel="Calendar view"
              value={view}
              onChange={setView}
              size="sm"
              options={[
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'agenda', label: 'Agenda' },
              ]}
            />
          </div>
          {calendarFilter && calendarMap.get(calendarFilter) ? (
            <Badge tone="neutral" dot>
              {calendarMap.get(calendarFilter)?.name}
            </Badge>
          ) : null}
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={14} weight="bold" aria-hidden />}
            onClick={() =>
              toast({
                title: 'Event editor is next',
                description: 'The create form is wired after the data layer lands.',
                tone: 'info',
              })
            }
          >
            New event
          </Button>
        </div>
      </div>

      {eventCount === 0 ? (
        <EmptyState
          title="The week is still open."
          description="Add the first event, or choose a different calendar from the left rail."
          icon={<CalendarBlank size={18} aria-hidden />}
          action={
            <Button
              variant="primary"
              leadingIcon={<Plus size={15} weight="bold" aria-hidden />}
              onClick={() =>
                toast({
                  title: 'Event editor is next',
                  description: 'The create form is wired after the data layer lands.',
                  tone: 'info',
                })
              }
            >
              New event
            </Button>
          }
        />
      ) : view === 'agenda' ? (
        <AgendaView
          days={days}
          eventsByDay={eventsByDay}
          timeZone={timeZone}
          onSelect={(event) =>
            toast({
              title: event.title,
              description: 'The event drawer opens in the next pass.',
              tone: 'info',
            })
          }
        />
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className={view === 'month' ? 'min-w-[720px]' : 'min-w-[760px]'}>
            <div className="grid grid-cols-7 border-b border-line bg-surface-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
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
                const isToday = key === format(new Date(), 'yyyy-MM-dd')
                const outsideMonth = view === 'month' && !isSameMonth(day, selectedDate)
                return (
                  <div
                    key={key}
                    className={`min-h-36 border-b border-r border-line p-1.5 last:border-r-0 ${
                      outsideMonth ? 'bg-surface-2/60' : ''
                    } ${isToday ? 'bg-accent-wash/35' : ''}`}
                  >
                    <div className="flex items-baseline justify-between px-1 py-1">
                      <span
                        className={`font-mono text-[11px] ${
                          isToday ? 'font-medium text-accent' : 'text-ink-3'
                        }`}
                      >
                        {view === 'month' ? format(day, 'd') : format(day, 'MMM d')}
                      </span>
                      {index === 0 ? (
                        <span className="font-mono text-[9px] text-ink-3">W{getISOWeek(day)}</span>
                      ) : null}
                    </div>
                    <div className="grid gap-1">
                      {dayEvents.slice(0, view === 'month' ? 2 : 4).map((event) => (
                        <EventBand
                          key={`${event.id}-${event.occurrenceStart}`}
                          event={event}
                          timeZone={timeZone}
                          compact={view === 'month'}
                          onSelect={() =>
                            toast({
                              title: event.title,
                              description: 'The event drawer opens in the next pass.',
                              tone: 'info',
                            })
                          }
                        />
                      ))}
                      {dayEvents.length > (view === 'month' ? 2 : 4) ? (
                        <button
                          type="button"
                          className="px-1 text-left font-mono text-[9px] text-ink-3 hover:text-ink"
                        >
                          +{dayEvents.length - (view === 'month' ? 2 : 4)} more
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2.5 text-[11px] text-ink-3 sm:px-6">
        <span className="inline-flex items-center gap-1.5">
          <CalendarBlank size={13} aria-hidden />
          {activeWorkspace?.name ?? 'MicroAxis Calendar'}
        </span>
        <span className="text-line-strong">/</span>
        <span>{timeZone}</span>
        <span className="text-line-strong">/</span>
        <span>Creator marks are always visible.</span>
      </div>
    </div>
  )
}

function EventBand({
  event,
  timeZone,
  compact,
  onSelect,
}: {
  event: EventOccurrence
  timeZone: string
  compact: boolean
  onSelect: () => void
}) {
  const creatorName = event.creator?.fullName ?? 'Unknown creator'
  const color = event.category?.color ?? categoryColor[event.category?.name ?? 'Other'] ?? '#67675E'

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full rounded-[5px] border border-line bg-surface px-2 py-1.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
      aria-label={`${event.title}, created by ${creatorName}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate font-mono text-[9px] text-ink-3">
          {event.allDay ? 'All day' : eventTimeLabel(event, timeZone, false).split(' – ')[0]}
        </span>
        {event.priority === 'urgent' ? (
          <span className="ml-auto size-1.5 shrink-0 rounded-full bg-danger" title="Urgent" />
        ) : null}
      </div>
      <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-4 tracking-[-0.01em] text-ink">
        {event.title}
      </p>
      {!compact ? (
        <div className="mt-1 flex items-center gap-1.5">
          <Avatar name={creatorName} size="xs" decorative />
          <span className="truncate text-[9px] text-ink-3">{creatorName}</span>
          <ArrowUpRight
            size={10}
            className="ml-auto shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </div>
      ) : null}
    </button>
  )
}

function AgendaView({
  days,
  eventsByDay,
  timeZone,
  onSelect,
}: {
  days: Date[]
  eventsByDay: Map<string, EventOccurrence[]>
  timeZone: string
  onSelect: (event: EventOccurrence) => void
}) {
  return (
    <div className="divide-y divide-line">
      {days.map((day) => {
        const key = format(day, 'yyyy-MM-dd')
        const dayEvents = eventsByDay.get(key) ?? []
        if (dayEvents.length === 0) return null
        return (
          <section key={key} className="grid gap-4 px-4 py-5 sm:grid-cols-[9rem_1fr] sm:px-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                {format(day, 'EEE')}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.02em]">{format(day, 'MMM d')}</p>
            </div>
            <div className="grid gap-2">
              {dayEvents.map((event) => (
                <button
                  key={`${event.id}-${event.occurrenceStart}`}
                  type="button"
                  onClick={() => onSelect(event)}
                  className="grid gap-2 rounded-panel border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong hover:bg-surface-2 sm:grid-cols-[7rem_1fr_auto] sm:items-center"
                >
                  <span className="font-mono text-[11px] text-ink-3">
                    {event.allDay ? 'All day' : eventTimeLabel(event, timeZone, false)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{event.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink-3">
                      {event.location ?? 'No location'}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Avatar name={event.creator?.fullName ?? 'Unknown'} size="sm" decorative />
                    <span className="text-[11px] text-ink-3">
                      {event.creator?.fullName ?? 'Unknown creator'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
