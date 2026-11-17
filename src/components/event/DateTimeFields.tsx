import { cn } from '../../lib/cn'
import { DatePicker } from '../ui/DatePicker'
import { Field } from '../ui/Field'
import { TimePicker } from '../ui/TimePicker'

const DURATIONS = [15, 30, 45, 60, 90]

export function DateTimeFields({
  allDay,
  startValue,
  endValue,
  timeZone,
  clock24h = false,
  weekStartsOn = 1,
  startError,
  endError,
  onChange,
  onDurationChange,
}: {
  allDay: boolean
  startValue: string
  endValue: string
  timeZone: string
  clock24h?: boolean
  weekStartsOn?: 0 | 1
  startError?: string
  endError?: string
  onChange: (field: 'startValue' | 'endValue', value: string) => void
  onDurationChange?: (minutes: number) => void
}) {
  const startParts = allDay ? [startValue.slice(0, 10)] : startValue.split('T')
  const endParts = allDay ? [endValue.slice(0, 10)] : endValue.split('T')
  const startDate = startParts[0] ?? ''
  const startTime = startParts[1] ?? '09:00'
  const endDate = endParts[0] ?? ''
  const endTime = endParts[1] ?? '10:00'

  function changeStartDate(date: string) {
    onChange('startValue', allDay ? date : `${date}T${startTime || '09:00'}`)
  }

  function changeStartTime(time: string) {
    if (!startDate) return
    onChange('startValue', `${startDate}T${time}`)
  }

  function changeEndDate(date: string) {
    onChange('endValue', allDay ? date : `${date}T${endTime || '10:00'}`)
  }

  function changeEndTime(time: string) {
    if (!endDate) return
    onChange('endValue', `${endDate}T${time}`)
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Starts" htmlFor="event-start" error={startError}>
          <div className={cn('grid gap-2', !allDay && 'sm:grid-cols-[1fr_8.5rem]')}>
            <DatePicker
              id="event-start"
              value={startDate}
              onChange={changeStartDate}
              timeZone={timeZone}
              weekStartsOn={weekStartsOn}
              invalid={Boolean(startError)}
              describedBy={startError ? 'event-start-error' : undefined}
            />
            {!allDay ? (
              <TimePicker
                id="event-start-time"
                value={startTime}
                onChange={changeStartTime}
                clock24h={clock24h}
                invalid={Boolean(startError)}
                describedBy={startError ? 'event-start-error' : undefined}
                ariaLabel="Start time"
              />
            ) : null}
          </div>
        </Field>

        <Field label="Ends" htmlFor="event-end" error={endError}>
          <div className={cn('grid gap-2', !allDay && 'sm:grid-cols-[1fr_8.5rem]')}>
            <DatePicker
              id="event-end"
              value={endDate}
              onChange={changeEndDate}
              timeZone={timeZone}
              weekStartsOn={weekStartsOn}
              min={startDate || undefined}
              invalid={Boolean(endError)}
              describedBy={endError ? 'event-end-error' : undefined}
            />
            {!allDay ? (
              <TimePicker
                id="event-end-time"
                value={endTime}
                onChange={changeEndTime}
                clock24h={clock24h}
                invalid={Boolean(endError)}
                describedBy={endError ? 'event-end-error' : undefined}
                ariaLabel="End time"
              />
            ) : null}
          </div>
        </Field>
      </div>

      {!allDay ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
            Duration
          </span>
          {DURATIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => onDurationChange?.(minutes)}
              className="rounded-control border border-line px-2 py-1 font-mono text-[10px] text-ink-2 transition-colors hover:border-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-none"
            >
              {minutes}m
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
