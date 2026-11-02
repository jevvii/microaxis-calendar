import { CalendarBlank } from '@phosphor-icons/react'
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarCanvas } from '../components/calendar/CalendarCanvas'
import { CalendarEmptyState } from '../components/calendar/CalendarEmptyState'
import { CalendarHeader } from '../components/calendar/CalendarHeader'
import {
  emptyFilters,
  FilterBar,
  type FilterState,
} from '../components/calendar/FilterBar'
import type { CalendarView } from '../components/calendar/ViewSwitcher'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useCalendars } from '../hooks/useCalendars'
import { useCategories } from '../hooks/useCategories'
import { useEvents } from '../hooks/useEvents'
import { expandRecurrence } from '../lib/recurrence'
import { useAuth } from '../providers/AuthProvider'
import { useToast } from '../providers/ToastProvider'
import { useWorkspace } from '../providers/WorkspaceProvider'
import type { EventOccurrence } from '../types/domain'

const FILTERS_KEY = 'microaxis-calendar-filters'
const timeZone = 'Asia/Manila'

function viewFrom(value: string | null): CalendarView {
  return value === 'month' || value === 'agenda' ? value : 'week'
}

function readFilters(): FilterState {
  try {
    const stored = window.localStorage.getItem(FILTERS_KEY)
    if (!stored) return emptyFilters
    return { ...emptyFilters, ...(JSON.parse(stored) as Partial<FilterState>) }
  } catch {
    return emptyFilters
  }
}

export function CalendarPage() {
  const { user } = useAuth()
  const { activeWorkspace, activeWorkspaceId, loading: workspaceLoading, members, teams } =
    useWorkspace()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<FilterState>(readFilters)

  const selectedDate = searchParams.get('date')
    ? new Date(`${searchParams.get('date')}T00:00:00`)
    : new Date()
  const view = viewFrom(searchParams.get('view'))
  const calendarFilter = searchParams.get('calendar')

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = addDays(endOfMonth(selectedDate), 1)
  const rangeStart = view === 'month' ? monthStart : weekStart
  const rangeEnd = view === 'month' ? monthEnd : addDays(weekStart, 7)
  const rangeStartIso = rangeStart.toISOString()
  const rangeEndIso = rangeEnd.toISOString()

  const calendarsQuery = useCalendars(activeWorkspaceId)
  const categoriesQuery = useCategories(activeWorkspaceId)
  const calendars = calendarsQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  const selectedCalendarIds = useMemo(() => {
    const ids = new Set(filters.calendarIds)
    if (filters.teamIds.length > 0) {
      for (const calendar of calendars) {
        if (calendar.teamId && filters.teamIds.includes(calendar.teamId)) ids.add(calendar.id)
      }
    }
    return calendarFilter ? [calendarFilter] : [...ids]
  }, [calendarFilter, calendars, filters.calendarIds, filters.teamIds])

  const eventsQuery = useEvents({
    workspaceId: activeWorkspaceId,
    rangeStart: rangeStartIso,
    rangeEnd: rangeEndIso,
    filters: { ...filters, calendarIds: selectedCalendarIds },
  })

  const events = eventsQuery.data ?? []
  const loading =
    workspaceLoading ||
    (Boolean(activeWorkspaceId) &&
      (calendarsQuery.isLoading || eventsQuery.isLoading || categoriesQuery.isLoading))
  const loadError = calendarsQuery.error ?? eventsQuery.error ?? categoriesQuery.error

  const occurrences = useMemo(
    () =>
      events
        .flatMap((event) => expandRecurrence(event, rangeStartIso, rangeEndIso))
        .sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart)),
    [events, rangeEndIso, rangeStartIso],
  )

  useEffect(() => {
    window.localStorage.setItem(FILTERS_KEY, JSON.stringify(filters))
  }, [filters])

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
  }

  function movePeriod(direction: -1 | 1) {
    const nextDate =
      view === 'month'
        ? addMonths(selectedDate, direction)
        : addDays(selectedDate, direction * 7)
    updateParams({ date: format(nextDate, 'yyyy-MM-dd') })
  }

  function openNewEvent() {
    toast({
      title: 'Event editor is next',
      description: 'The create form is wired in the following pass.',
      tone: 'info',
    })
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        movePeriod(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        movePeriod(1)
      } else if (event.key.toLowerCase() === 't') {
        updateParams({ date: null })
      } else if (event.key.toLowerCase() === 'w') {
        updateParams({ view: 'week' })
      } else if (event.key.toLowerCase() === 'm') {
        updateParams({ view: 'month' })
      } else if (event.key.toLowerCase() === 'a') {
        updateParams({ view: 'agenda' })
      } else if (event.key.toLowerCase() === 'n') {
        openNewEvent()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

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
              void categoriesQuery.refetch()
              void eventsQuery.refetch()
            }}
          >
            Try again
          </Button>
        }
      />
    )
  }

  if (loading) {
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

  const title =
    view === 'week'
      ? 'This week'
      : view === 'month'
        ? format(selectedDate, 'MMMM yyyy')
        : 'Agenda'

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <CalendarHeader
        title={title}
        subtitle={`${eventCount} ${eventCount === 1 ? 'event' : 'events'} across ${calendars.length} calendars.${
          responseCount > 0 ? ` ${responseCount} need your response.` : ''
        }`}
        weekStart={weekStart}
        weekEnd={weekEnd}
        view={view}
        onViewChange={(nextView) => updateParams({ view: nextView })}
        onPrev={() => movePeriod(-1)}
        onNext={() => movePeriod(1)}
        onToday={() => updateParams({ date: null })}
        onNewEvent={openNewEvent}
      />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        categories={categories}
        members={members}
        calendars={calendars}
        teams={teams}
      />

      {eventCount === 0 ? (
        <CalendarEmptyState onNewEvent={openNewEvent} />
      ) : (
        <div className="flex-1 overflow-x-auto">
          <CalendarCanvas
            view={view}
            date={selectedDate}
            events={occurrences}
            timeZone={timeZone}
            onSelectEvent={(event: EventOccurrence) =>
              toast({
                title: event.title,
                description: 'The event drawer opens in the next pass.',
                tone: 'info',
              })
            }
            onCreateAt={() =>
              toast({
                title: 'Event editor is next',
                description: 'Double-click creation is wired with the event form.',
                tone: 'info',
              })
            }
          />
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
