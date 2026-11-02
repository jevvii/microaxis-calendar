import { Field } from '../ui/Field'
import { Input } from '../ui/Input'

export function DateTimeFields({
  allDay,
  startValue,
  endValue,
  startError,
  endError,
  onChange,
}: {
  allDay: boolean
  startValue: string
  endValue: string
  startError?: string
  endError?: string
  onChange: (field: 'startValue' | 'endValue', value: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Starts" htmlFor="event-start" error={startError}>
        <Input
          id="event-start"
          type={allDay ? 'date' : 'datetime-local'}
          value={allDay ? startValue.slice(0, 10) : startValue}
          onChange={(event) => onChange('startValue', event.target.value)}
          aria-describedby={startError ? 'event-start-error' : undefined}
        />
      </Field>
      <Field label="Ends" htmlFor="event-end" error={endError}>
        <Input
          id="event-end"
          type={allDay ? 'date' : 'datetime-local'}
          value={allDay ? endValue.slice(0, 10) : endValue}
          onChange={(event) => onChange('endValue', event.target.value)}
          aria-describedby={endError ? 'event-end-error' : undefined}
        />
      </Field>
    </div>
  )
}
