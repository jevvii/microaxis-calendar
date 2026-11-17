import { useMemo, useState, type FormEvent } from 'react'
import type {
  Calendar,
  Event,
  EventCategory,
  EventInput,
  EventOccurrence,
  EventPriority,
  EventStatus,
  EventVisibility,
  WorkspaceMembership,
} from '../../types/domain'
import { useEventForm } from '../../hooks/useEventForm'
import { addDaysToDateKey, fromDateInput, fromDateTimeLocal } from '../../lib/date'
import { addMinutesToDateTimeLocal } from '../../lib/dateTimePicker'
import { findEventConflicts, suggestFreeSlots } from '../../lib/conflicts'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { DateTimeFields } from './DateTimeFields'
import { EventConflicts } from './EventConflicts'
import { ParticipantPicker } from './ParticipantPicker'
import { RecurrenceFields } from './RecurrenceFields'
import { VisibilityControl } from './VisibilityControl'

const fallbackTimeZones = [
  'Asia/Manila',
  'UTC',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/London',
  'America/New_York',
]

function supportedTimeZones() {
  const supported = Intl.supportedValuesOf?.('timeZone')
  return supported && supported.length > 0 ? supported : fallbackTimeZones
}

export function EventForm({
  mode,
  initial,
  calendars,
  categories,
  members,
  onSubmit,
  onCancel,
  submitting = false,
  defaultTimeZone,
  defaultCalendarId,
  clock24h = false,
  weekStartsOn = 1,
  events = [],
  currentUserId = '',
}: {
  mode: 'create' | 'edit'
  initial?: Event | null
  calendars: Calendar[]
  categories: EventCategory[]
  members: WorkspaceMembership[]
  onSubmit: (input: EventInput) => void
  onCancel?: () => void
  submitting?: boolean
  defaultTimeZone?: string
  defaultCalendarId?: string
  clock24h?: boolean
  weekStartsOn?: 0 | 1
  events?: EventOccurrence[]
  currentUserId?: string
}) {
  const { draft, setField, errors, validate } = useEventForm({
    calendars,
    categories,
    initial,
    defaultTimeZone,
    defaultCalendarId,
  })
  const [allDayNotice, setAllDayNotice] = useState(false)
  const availableTimeZones = supportedTimeZones()
  const timeZones = availableTimeZones.includes(draft.timeZone)
    ? availableTimeZones
    : [draft.timeZone, ...availableTimeZones]
  const selectedCalendar = calendars.find((calendar) => calendar.id === draft.calendarId)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingInput, setPendingInput] = useState<EventInput | null>(null)

  const startsAt = draft.allDay
    ? draft.startValue
      ? fromDateInput(draft.startValue, draft.timeZone)
      : ''
    : draft.startValue
      ? fromDateTimeLocal(draft.startValue, draft.timeZone)
      : ''
  const endsAt = draft.allDay
    ? draft.endValue
      ? fromDateInput(addDaysToDateKey(draft.endValue, 1), draft.timeZone)
      : ''
    : draft.endValue
      ? fromDateTimeLocal(draft.endValue, draft.timeZone)
      : ''

  const conflicts = useMemo(
    () =>
      findEventConflicts({
        events,
        targetCalendarId: draft.calendarId,
        startsAt,
        endsAt,
        excludeEventId: initial?.id,
        userId: currentUserId,
      }),
    [currentUserId, draft.calendarId, endsAt, events, initial?.id, startsAt],
  )

  const suggestions = useMemo(() => {
    if (draft.allDay || !draft.startValue || conflicts.length === 0) return []
    const duration = Math.round(
      (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000,
    )
    return suggestFreeSlots({
      events,
      targetCalendarId: draft.calendarId,
      startValue: draft.startValue,
      durationMinutes: duration > 0 ? duration : 60,
      timeZone: draft.timeZone,
      excludeEventId: initial?.id,
      userId: currentUserId,
    })
  }, [
    conflicts.length,
    currentUserId,
    draft.allDay,
    draft.calendarId,
    draft.startValue,
    draft.timeZone,
    endsAt,
    events,
    initial?.id,
    startsAt,
  ])

  function handleAllDay(next: boolean) {
    setField('allDay', next)
    setAllDayNotice(!next)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = validate()
    if (!input) {
      requestAnimationFrame(() => {
        const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]')
        firstInvalid?.focus()
      })
      return
    }

    if (conflicts.length > 0) {
      setPendingInput(input)
      setConfirmOpen(true)
      return
    }

    onSubmit(input)
  }

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field label="Calendar" htmlFor="event-calendar" error={errors.calendarId}>
        <Select
          id="event-calendar"
          value={draft.calendarId}
          invalid={Boolean(errors.calendarId)}
          aria-describedby={errors.calendarId ? 'event-calendar-error' : undefined}
          onChange={(event) => setField('calendarId', event.target.value)}
        >
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.name}
            </option>
          ))}
        </Select>
        {mode === 'create' && selectedCalendar ? (
          <p className="text-[11px] leading-5 text-ink-3">
            New event in <span className="font-medium text-ink">{selectedCalendar.name}</span>.
          </p>
        ) : null}
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
        timeZone={draft.timeZone}
        clock24h={clock24h}
        weekStartsOn={weekStartsOn}
        startError={errors.startValue}
        endError={errors.endValue}
        onChange={(field, value) => setField(field, value)}
        onDurationChange={(minutes) =>
          setField('endValue', addMinutesToDateTimeLocal(draft.startValue, minutes))
        }
      />

      <EventConflicts
        conflicts={conflicts}
        calendars={calendars}
        timeZone={draft.timeZone}
        clock24h={clock24h}
        suggestions={suggestions}
        onChooseSuggestion={(suggestion) => {
          setField('startValue', suggestion.startValue)
          setField('endValue', suggestion.endValue)
        }}
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
            id="event-visibility"
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

      <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[13px] text-ink">
        <input
          type="checkbox"
          checked={draft.exportToGoogle}
          onChange={(event) => setField('exportToGoogle', event.target.checked)}
          className="size-4 accent-[var(--accent)]"
        />
        Export this event to my Google Calendar
      </label>

      <ParticipantPicker
        members={members}
        selectedIds={draft.participantIds}
        onChange={(ids) => setField('participantIds', ids)}
      />

      <RecurrenceFields
        draft={draft}
        onChange={setField}
        timeZone={draft.timeZone}
        weekStartsOn={weekStartsOn}
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
          {mode === 'create'
            ? conflicts.length > 0
              ? 'Create and request'
              : 'Create event'
            : conflicts.length > 0
              ? 'Save and request'
              : 'Save changes'}
        </Button>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send schedule requests?"
        description="This event overlaps other calendars. The affected people will be asked to accept, decline, or propose another time."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmOpen(false)
                if (pendingInput) onSubmit(pendingInput)
                setPendingInput(null)
              }}
            >
              {mode === 'create' ? 'Create and request' : 'Save and request'}
            </Button>
          </div>
        }
      >
        <EventConflicts
          conflicts={conflicts}
          calendars={calendars}
          timeZone={draft.timeZone}
          clock24h={clock24h}
        />
      </Dialog>
    </form>
  )
}
