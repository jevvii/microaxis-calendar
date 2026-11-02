import { addDays, format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { useEffect, useMemo, useRef } from 'react'
import { dateKeyInTimeZone } from '../../lib/date'
import type { EventOccurrence } from '../../types/domain'
import { CreatorMark } from './CreatorMark'
import { EventBand } from './EventBand'
import { TimeSpine } from './TimeSpine'

const HOUR_HEIGHT = 48
const HOURS = Array.from({ length: 24 }, (_, index) => index)

function minutesInZone(value: string, timeZone: string) {
  const [hours, minutes] = formatInTimeZone(new Date(value), timeZone, 'HH:mm')
    .split(':')
    .map(Number)
  return hours * 60 + minutes
}

function layoutDay(events: EventOccurrence[], timeZone: string) {
  const sorted = [...events].sort(
    (a, b) => minutesInZone(a.occurrenceStart, timeZone) - minutesInZone(b.occurrenceStart, timeZone),
  )
  const lanes: number[] = []
  const items = sorted.map((event) => {
    const start = minutesInZone(event.occurrenceStart, timeZone)
    const end = Math.max(start + 15, minutesInZone(event.occurrenceEnd, timeZone) || 1440)
    let lane = lanes.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) {
      lane = lanes.length
      lanes.push(end)
    } else {
      lanes[lane] = end
    }
    return { event, start, end, lane }
  })

  return { items, laneCount: Math.max(1, lanes.length) }
}

export function WeekView({
  weekStart,
  events,
  timeZone,
  onSelectEvent,
}: {
  weekStart: Date
  events: EventOccurrence[]
  timeZone: string
  onSelectEvent: (event: EventOccurrence) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const nowMinutes =
    Number(formatInTimeZone(new Date(), timeZone, 'HH')) * 60 +
    Number(formatInTimeZone(new Date(), timeZone, 'mm'))

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
    }
  }, [])

  const allDayByDay = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>()
    for (const event of events.filter((item) => item.allDay)) {
      const key = dateKeyInTimeZone(event.occurrenceStart, timeZone)
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [events, timeZone])

  const timedByDay = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>()
    for (const event of events.filter((item) => !item.allDay)) {
      const key = dateKeyInTimeZone(event.occurrenceStart, timeZone)
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [events, timeZone])

  return (
    <div className="min-w-[900px]">
      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line bg-surface-2">
        <div className="border-r border-line" />
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const today = key === todayKey
          return (
            <div
              key={key}
              className={`border-r border-line px-3 py-2 last:border-r-0 ${
                today ? 'bg-accent-wash/40' : ''
              }`}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
                {format(day, 'EEE')}
              </p>
              <p
                className={`mt-0.5 font-mono text-sm ${
                  today ? 'font-medium text-accent' : 'text-ink-2'
                }`}
              >
                {format(day, 'd')}
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line bg-surface-2/55">
        <div className="flex items-start justify-end border-r border-line px-2 py-2 font-mono text-[9px] uppercase tracking-[0.05em] text-ink-3">
          All day
        </div>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = allDayByDay.get(key) ?? []
          return (
            <div key={key} className="min-h-10 border-r border-line p-1 last:border-r-0">
              {dayEvents.map((event) => (
                <EventBand
                  key={`${event.id}-${event.occurrenceStart}`}
                  event={event}
                  timeZone={timeZone}
                  compact
                  onSelect={() => onSelectEvent(event)}
                />
              ))}
            </div>
          )
        })}
      </div>

      <div ref={scrollRef} className="max-h-[calc(100dvh-13rem)] overflow-y-auto">
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
          <TimeSpine />

          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayEvents = timedByDay.get(key) ?? []
            const { items, laneCount } = layoutDay(dayEvents, timeZone)
            const today = key === todayKey

            return (
              <div key={key} className="relative border-r border-line last:border-r-0">
                {HOURS.map((hour) => (
                  <div key={hour} className="h-12 border-b border-line" />
                ))}

                {today ? (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10"
                    style={{ top: `${(nowMinutes / 1440) * 100}%` }}
                    aria-hidden="true"
                  >
                    <span className="absolute -left-1 -top-1 size-2 rounded-full bg-accent" />
                    <span className="block h-px bg-accent" />
                  </div>
                ) : null}

                {items.map(({ event, start, end, lane }) => {
                  const top = (start / 1440) * 100
                  const height = Math.max(((end - start) / 1440) * 100, 1.6)
                  const width = 100 / laneCount
                  const creatorName = event.creator?.fullName ?? 'Unknown creator'
                  const color = event.category?.color ?? '#67675E'
                  const time = formatInTimeZone(new Date(event.occurrenceStart), timeZone, 'h:mm a')

                  return (
                    <button
                      key={`${event.id}-${event.occurrenceStart}`}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      aria-label={`${event.title}, ${time}, created by ${creatorName}`}
                      className="absolute z-20 overflow-hidden rounded-[4px] border border-line bg-surface text-left transition-colors hover:border-line-strong hover:bg-surface-2"
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        left: `calc(${(lane * width).toFixed(4)}% + 2px)`,
                        width: `calc(${width.toFixed(4)}% - 4px)`,
                      }}
                    >
                      <span
                        className="absolute inset-y-0 left-0 w-0.5"
                        style={{ backgroundColor: color }}
                      />
                      <span className="absolute right-1 top-1 z-10">
                        <CreatorMark
                          name={creatorName}
                          avatarUrl={event.creator?.avatarUrl}
                          size="xs"
                        />
                      </span>
                      <span className="block pl-2 pr-8 pt-1">
                        <span className="block truncate font-mono text-[8px] text-ink-3">{time}</span>
                        <span className="mt-0.5 block line-clamp-2 text-[10px] font-medium leading-[14px] text-ink">
                          {event.title}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
