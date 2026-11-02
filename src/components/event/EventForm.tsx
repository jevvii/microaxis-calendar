import { useState, type FormEvent } from 'react'
import type {
  Calendar,
  Event,
  EventCategory,
  EventInput,
  EventPriority,
  EventStatus,
  EventVisibility,
  WorkspaceMembership,
} from '../../types/domain'
import { useEventForm } from '../../hooks/useEventForm'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { DateTimeFields } from './DateTimeFields'
import { ParticipantPicker } from './ParticipantPicker'
import { RecurrenceFields } from './RecurrenceFields'
import { VisibilityControl } from './VisibilityControl'

const timeZones = [
  'Asia/Manila',
  'UTC',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/London',
  'America/New_York',
]

export function EventForm({
  mode,
  initial,
  calendars,
  categories,
  members,
  onSubmit,
  onCancel,
  submitting = false,
}: {
  mode: 'create' | 'edit'
  initial?: Event | null
  calendars: Calendar[]
  categories: EventCategory[]
  members: WorkspaceMembership[]
  onSubmit: (input: EventInput) => void
  onCancel?: () => void
  submitting?: boolean
}) {
  const { draft, setField, errors, validate } = useEventForm({
    calendars,
    categories,
    initial,
  })
  const [allDayNotice, setAllDayNotice] = useState(false)

  function handleAllDay(next: boolean) {
    setField('allDay', next)
    setAllDayNotice(false)
    if (next) {
      setField('startValue', draft.startValue.slice(0, 10))
      setField('endValue', draft.endValue.slice(0, 10))
    } else {
      const start = draft.startValue.slice(0, 10)
      const end = draft.endValue.slice(0, 10)
      setField('startValue', `${start}T09:00`)
      setField('endValue', `${end}T10:00`)
      setAllDayNotice(true)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = validate()
    if (input) onSubmit(input)
  }

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field label="Calendar" htmlFor="event-calendar" error={errors.calendarId}>
        <Select
          id="event-calendar"
          value={draft.calendarId}
          onChange={(event) => setField('calendarId', event.target.value)}
        >
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Title" htmlFor="event-title" error={errors.title}>
        <Input
          id="event-title"
          value={draft.title}
          onChange={(event) => setField('title', event.target.value)}
          placeholder="What is happening?"
          autoFocus
          invalid={Boolean(errors.title)}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category" htmlFor="event-category">
          <Select
            id="event-category"
            value={draft.categoryId}
            onChange={(event) => setField('categoryId', event.target.value)}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority" htmlFor="event-priority">
          <Select
            id="event-priority"
            value={draft.priority}
            onChange={(event) => setField('priority', event.target.value as EventPriority)}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </Field>
      </div>

      <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[13px] text-ink">
        <input
          type="checkbox"
          checked={draft.allDay}
          onChange={(event) => handleAllDay(event.target.checked)}
          className="size-4 accent-[var(--accent)]"
        />
        All-day event
      </label>
      {allDayNotice ? (
        <p className="-mt-3 text-xs leading-5 text-ink-3">Times were set to 09:00–10:00.</p>
      ) : null}

      <DateTimeFields
        allDay={draft.allDay}
        startValue={draft.startValue}
        endValue={draft.endValue}
        startError={errors.startValue}
        endError={errors.endValue}
        onChange={(field, value) => setField(field, value)}
      />

      <Field label="Time zone" htmlFor="event-timezone">
        <Select
          id="event-timezone"
          value={draft.timeZone}
          onChange={(event) => setField('timeZone', event.target.value)}
        >
          {timeZones.map((timeZone) => (
            <option key={timeZone} value={timeZone}>
              {timeZone}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Location" htmlFor="event-location" optional>
        <Input
          id="event-location"
          value={draft.location}
          onChange={(event) => setField('location', event.target.value)}
          placeholder="Room, address, or video call"
        />
      </Field>

      <Field label="Description" htmlFor="event-description" optional>
        <Textarea
          id="event-description"
          value={draft.description}
          onChange={(event) => setField('description', event.target.value)}
          placeholder="Context, links, and the decision this event needs."
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Visibility" htmlFor="event-visibility">
          <VisibilityControl
            value={draft.visibility}
            onChange={(visibility: EventVisibility) => setField('visibility', visibility)}
          />
        </Field>
        <Field label="Status" htmlFor="event-status">
          <Select
            id="event-status"
            value={draft.status}
            onChange={(event) => setField('status', event.target.value as EventStatus)}
          >
            <option value="scheduled">Scheduled</option>
            <option value="tentative">Tentative</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Field>
      </div>

      <ParticipantPicker
        members={members}
        selectedIds={draft.participantIds}
        onChange={(ids) => setField('participantIds', ids)}
      />

      <RecurrenceFields
        draft={draft}
        onChange={setField}
        intervalError={errors.repeatInterval}
        untilError={errors.repeatUntil}
      />

      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" variant="primary" loading={submitting}>
          {mode === 'create' ? 'Create event' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
