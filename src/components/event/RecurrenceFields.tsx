import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import type { EventFormDraft, RepeatEnd, RepeatFrequency } from '../../hooks/useEventForm'

export function RecurrenceFields({
  draft,
  onChange,
  intervalError,
  untilError,
}: {
  draft: EventFormDraft
  onChange: <K extends keyof EventFormDraft>(key: K, value: EventFormDraft[K]) => void
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
              <Input
                id="event-repeat-until"
                type="date"
                value={draft.repeatUntil}
                invalid={Boolean(untilError)}
                aria-describedby={untilError ? 'event-repeat-until-error' : undefined}
                onChange={(event) => onChange('repeatUntil', event.target.value)}
              />
            </Field>
          )}
        </div>
      ) : null}
    </div>
  )
}
