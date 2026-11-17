import { Field } from '../ui/Field'
import { DatePicker } from '../ui/DatePicker'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import type { EventFormDraft, RepeatEnd, RepeatFrequency } from '../../hooks/useEventForm'

export function RecurrenceFields({
  draft,
  onChange,
  timeZone,
  weekStartsOn = 1,
  intervalError,
  untilError,
}: {
  draft: EventFormDraft
  onChange: <K extends keyof EventFormDraft>(key: K, value: EventFormDraft[K]) => void
  timeZone: string
  weekStartsOn?: 0 | 1
  intervalError?: string
  untilError?: string
}) {
  return (
    <div className="grid gap-3">
      <Field label="Repeat" htmlFor="event-repeat">
        <Select
          id="event-repeat"
          value={draft.repeatFrequency}
          onChange={(event) => onChange('repeatFrequency', event.target.value as RepeatFrequency)}
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </Select>
      </Field>

      {draft.repeatFrequency !== 'none' ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Repeat every" htmlFor="event-repeat-interval" error={intervalError}>
            <Input
              id="event-repeat-interval"
              type="number"
              min={1}
              max={99}
              value={draft.repeatInterval}
              invalid={Boolean(intervalError)}
              aria-describedby={intervalError ? 'event-repeat-interval-error' : undefined}
              onChange={(event) => onChange('repeatInterval', Number(event.target.value))}
            />
          </Field>
          <Field label="Ends" htmlFor="event-repeat-end">
            <Select
              id="event-repeat-end"
              value={draft.repeatEnd}
              onChange={(event) => onChange('repeatEnd', event.target.value as RepeatEnd)}
            >
              <option value="count">After a number of events</option>
              <option value="until">On a date</option>
            </Select>
          </Field>
          {draft.repeatEnd === 'count' ? (
            <Field label="Occurrences" htmlFor="event-repeat-count">
              <Input
                id="event-repeat-count"
                type="number"
                min={1}
                max={365}
                value={draft.repeatCount}
                onChange={(event) => onChange('repeatCount', Number(event.target.value))}
              />
            </Field>
          ) : (
            <Field label="Until" htmlFor="event-repeat-until" error={untilError}>
              <DatePicker
                id="event-repeat-until"
                value={draft.repeatUntil}
                onChange={(value) => onChange('repeatUntil', value)}
                timeZone={timeZone}
                weekStartsOn={weekStartsOn}
                min={draft.startValue.slice(0, 10) || undefined}
                invalid={Boolean(untilError)}
                describedBy={untilError ? 'event-repeat-until-error' : undefined}
              />
            </Field>
          )}
        </div>
      ) : null}
    </div>
  )
}
