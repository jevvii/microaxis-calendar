import { ArrowRight, WarningCircle } from '@phosphor-icons/react'
import type { Calendar, EventOccurrence } from '../../types/domain'
import type { EventConflict } from '../../lib/conflicts'
import { eventTimeLabel, formatDateKey } from '../../lib/date'
import { formatTimeValue } from '../../lib/dateTimePicker'

export type FreeSlotSuggestion = { startValue: string; endValue: string }

export function EventConflicts({
  conflicts,
  calendars,
  timeZone,
  clock24h,
  suggestions = [],
  onChooseSuggestion,
}: {
  conflicts: EventConflict[]
  calendars: Calendar[]
  timeZone: string
  clock24h: boolean
  suggestions?: FreeSlotSuggestion[]
  onChooseSuggestion?: (suggestion: FreeSlotSuggestion) => void
}) {
  if (conflicts.length === 0) return null

  const own = conflicts.filter((conflict) => conflict.mine)
  const others = conflicts.filter((conflict) => !conflict.mine)

  return (
    <div className="rounded-panel border border-warning/30 bg-warning-wash p-3">
      <div className="flex items-start gap-2.5">
        <WarningCircle size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-warning">
            This time overlaps {conflicts.length}{' '}
            {conflicts.length === 1 ? 'event' : 'events'}.
          </p>
          <p className="mt-1 text-xs leading-5 text-warning/90">
            Saving will hold this event as tentative and send a schedule request to the
            affected people.
          </p>

          <div className="mt-2 grid gap-1.5">
            {own.length > 0 ? (
              <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-warning">
                You are busy
              </p>
            ) : null}
            {own.map((conflict) => (
              <ConflictRow
                key={`${conflict.event.id}-${conflict.startsAt}`}
                conflict={conflict}
                calendars={calendars}
                timeZone={timeZone}
                clock24h={clock24h}
              />
            ))}

            {others.length > 0 ? (
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-warning">
                Others are busy
              </p>
            ) : null}
            {others.map((conflict) => (
              <ConflictRow
                key={`${conflict.event.id}-${conflict.startsAt}`}
                conflict={conflict}
                calendars={calendars}
                timeZone={timeZone}
                clock24h={clock24h}
              />
            ))}
          </div>

          {suggestions.length > 0 && onChooseSuggestion ? (
            <div className="mt-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-warning">
                Next free times
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.startValue}
                    type="button"
                    onClick={() => onChooseSuggestion(suggestion)}
                    className="inline-flex items-center gap-1 rounded-control border border-warning/30 bg-surface px-2 py-1 font-mono text-[10px] text-warning transition-colors hover:border-warning hover:bg-warning-wash"
                  >
                    {formatDateKey(suggestion.startValue.slice(0, 10), timeZone, 'EEE d')}
                    <span className="text-warning/60">·</span>
                    {formatTimeValue(suggestion.startValue.slice(11, 16), clock24h)}
                    <ArrowRight size={10} aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ConflictRow({
  conflict,
  calendars,
  timeZone,
  clock24h,
}: {
  conflict: EventConflict
  calendars: Calendar[]
  timeZone: string
  clock24h: boolean
}) {
  const calendar = calendars.find((item) => item.id === conflict.event.calendarId)
  const occurrence: EventOccurrence = {
    ...conflict.event,
    startsAt: conflict.startsAt,
    endsAt: conflict.endsAt,
  }
  const title = conflict.event.title === 'Busy' ? 'Busy' : conflict.event.title

  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-control bg-surface/70 px-2 py-1.5">
      <span
        className="size-2 shrink-0 rounded-full border border-black/10"
        style={{ backgroundColor: calendar?.color ?? '#67675E' }}
        aria-hidden
      />
      <span className="min-w-0 max-w-[12rem] truncate text-xs font-medium text-ink">
        {title}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.05em] text-ink-3">
        {calendar?.name ?? 'Calendar'}
      </span>
      <span className="ml-auto font-mono text-[10px] text-ink-3">
        {occurrence.allDay ? 'All day' : eventTimeLabel(occurrence, timeZone, clock24h)}
      </span>
    </div>
  )
}
