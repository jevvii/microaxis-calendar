import { useState } from 'react'
import { addDaysToDateKey, fromDateInput, fromDateTimeLocal, toDateInput, toDateTimeLocal } from '../lib/date'
import { eventInputSchema } from '../lib/validation'
import type {
  Calendar,
  Event,
  EventCategory,
  EventInput,
  EventPriority,
  EventStatus,
  EventVisibility,
} from '../types/domain'

export type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly'
export type RepeatEnd = 'count' | 'until'

export type EventFormDraft = {
  calendarId: string
  title: string
  description: string
  location: string
  startValue: string
  endValue: string
  allDay: boolean
  timeZone: string
  categoryId: string
  priority: EventPriority
  status: EventStatus
  visibility: EventVisibility
  participantIds: string[]
  repeatFrequency: RepeatFrequency
  repeatInterval: number
  repeatEnd: RepeatEnd
  repeatCount: number
  repeatUntil: string
}

export type EventFormErrors = Record<string, string>

function nextHourLocal(timeZone: string) {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setHours(now.getHours() + 1)
  return toDateTimeLocal(now.toISOString(), timeZone)
}

function parseRule(rule: string | null) {
  if (!rule) {
    return {
      repeatFrequency: 'none' as const,
      repeatInterval: 1,
      repeatEnd: 'count' as const,
      repeatCount: 8,
      repeatUntil: '',
    }
  }

  const fields = new Map(
    rule
      .split(';')
      .map((part) => part.split('='))
      .filter((pair): pair is [string, string] => pair.length === 2)
      .map(([key, value]) => [key.toUpperCase(), value.toUpperCase()]),
  )
  const rawFrequency = fields.get('FREQ')?.toLowerCase()
  const repeatFrequency: RepeatFrequency =
    rawFrequency === 'daily' || rawFrequency === 'weekly' || rawFrequency === 'monthly'
      ? rawFrequency
      : 'none'

  return {
    repeatFrequency,
    repeatInterval: Math.max(1, Number(fields.get('INTERVAL') ?? 1)),
    repeatEnd: fields.has('UNTIL') ? ('until' as const) : ('count' as const),
    repeatCount: Number(fields.get('COUNT') ?? 8),
    repeatUntil: fields.has('UNTIL')
      ? `${fields.get('UNTIL')!.slice(0, 4)}-${fields.get('UNTIL')!.slice(4, 6)}-${fields.get('UNTIL')!.slice(6, 8)}`
      : '',
  }
}

export function createInitialDraft(
  calendars: Calendar[],
  categories: EventCategory[],
  initial?: Event | null,
): EventFormDraft {
  const timeZone = initial?.timeZone ?? 'Asia/Manila'
  const startValue = initial
    ? initial.allDay
      ? toDateInput(initial.startsAt, timeZone)
      : toDateTimeLocal(initial.startsAt, timeZone)
    : nextHourLocal(timeZone)
  const endValue = initial
    ? initial.allDay
      ? toDateInput(addDaysToDateKey(toDateInput(initial.endsAt, timeZone), -1), timeZone)
      : toDateTimeLocal(initial.endsAt, timeZone)
    : toDateTimeLocal(new Date(new Date(startValue).getTime() + 3_600_000).toISOString(), timeZone)

  return {
    calendarId: initial?.calendarId ?? calendars[0]?.id ?? '',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    location: initial?.location ?? '',
    startValue,
    endValue,
    allDay: initial?.allDay ?? false,
    timeZone,
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    priority: initial?.priority ?? 'normal',
    status: initial?.status ?? 'scheduled',
    visibility: initial?.visibility ?? 'calendar',
    participantIds: initial?.participants?.map((participant) => participant.userId) ?? [],
    ...parseRule(initial?.recurrenceRule ?? null),
  }
}

export function useEventForm({
  calendars,
  categories,
  initial,
}: {
  calendars: Calendar[]
  categories: EventCategory[]
  initial?: Event | null
}) {
  const [draft, setDraft] = useState<EventFormDraft>(() =>
    createInitialDraft(calendars, categories, initial),
  )
  const [errors, setErrors] = useState<EventFormErrors>({})

  function setField<K extends keyof EventFormDraft>(key: K, value: EventFormDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function validate(): EventInput | null {
    const nextErrors: EventFormErrors = {}

    if (!draft.title.trim()) nextErrors.title = 'Add a title'
    if (!draft.calendarId) nextErrors.calendarId = 'Choose a calendar'
    if (draft.repeatFrequency !== 'none' && draft.repeatInterval < 1) {
      nextErrors.repeatInterval = 'Interval must be at least 1'
    }

    let startsAt: string
    let endsAt: string

    if (draft.allDay) {
      if (!draft.startValue) nextErrors.startValue = 'Choose a start date'
      if (!draft.endValue) nextErrors.endValue = 'Choose an end date'
      startsAt = draft.startValue ? fromDateInput(draft.startValue, draft.timeZone) : ''
      endsAt =
        draft.startValue && draft.endValue
          ? fromDateInput(addDaysToDateKey(draft.endValue, 1), draft.timeZone)
          : ''
      if (
        draft.startValue &&
        draft.endValue &&
        addDaysToDateKey(draft.endValue, 1) <= draft.startValue
      ) {
        nextErrors.endValue = 'End date must be on or after the start date'
      }
    } else {
      if (!draft.startValue) nextErrors.startValue = 'Choose a start time'
      if (!draft.endValue) nextErrors.endValue = 'Choose an end time'
      startsAt = draft.startValue ? fromDateTimeLocal(draft.startValue, draft.timeZone) : ''
      endsAt = draft.endValue ? fromDateTimeLocal(draft.endValue, draft.timeZone) : ''
    }

    let recurrenceRule: string | null = null
    let recurrenceUntil: string | null = null

    if (draft.repeatFrequency !== 'none') {
      const frequency = draft.repeatFrequency.toUpperCase()
      recurrenceRule = `FREQ=${frequency};INTERVAL=${draft.repeatInterval}`
      if (draft.repeatEnd === 'count') {
        recurrenceRule += `;COUNT=${draft.repeatCount}`
      } else if (draft.repeatUntil) {
        recurrenceRule += `;UNTIL=${draft.repeatUntil.replaceAll('-', '')}`
        recurrenceUntil = fromDateInput(addDaysToDateKey(draft.repeatUntil, 1), draft.timeZone)
      } else {
        nextErrors.repeatUntil = 'Choose a repeat end date'
      }
    }

    const candidate = {
      calendarId: draft.calendarId,
      title: draft.title,
      description: draft.description,
      location: draft.location,
      startsAt,
      endsAt,
      allDay: draft.allDay,
      timeZone: draft.timeZone,
      categoryId: draft.categoryId || null,
      priority: draft.priority,
      status: draft.status,
      visibility: draft.visibility,
      recurrenceRule,
      recurrenceUntil,
      participantIds: draft.participantIds,
    }

    const parsed = eventInputSchema.safeParse(candidate)
    if (!parsed.success) {
      const fieldMap: Record<string, string> = {
        startsAt: 'startValue',
        endsAt: 'endValue',
        recurrenceUntil: 'repeatUntil',
      }
      for (const issue of parsed.error.issues) {
        const rawKey = String(issue.path[0] ?? 'form')
        nextErrors[fieldMap[rawKey] ?? rawKey] = issue.message
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return null
    }

    setErrors({})
    return parsed.success ? parsed.data : null
  }

  return { draft, setField, errors, setErrors, validate }
}
