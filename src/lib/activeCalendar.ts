import type { Calendar } from '../types/domain'

export function activeCalendarStorageKey(workspaceId: string) {
  return `microaxis-active-calendar:${workspaceId}`
}

export function readRememberedCalendar(workspaceId: string | null | undefined): string | null {
  if (!workspaceId || typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(activeCalendarStorageKey(workspaceId))
  } catch {
    return null
  }
}

export function rememberCalendar(
  workspaceId: string | null | undefined,
  calendarId: string | null,
) {
  if (!workspaceId || typeof window === 'undefined') return
  try {
    if (calendarId) {
      window.localStorage.setItem(activeCalendarStorageKey(workspaceId), calendarId)
    } else {
      window.localStorage.removeItem(activeCalendarStorageKey(workspaceId))
    }
  } catch {
    // Local storage can be unavailable in private or restricted contexts.
  }
}

export function resolveActiveCalendar({
  calendars,
  writableCalendars,
  urlCalendarId,
  rememberedCalendarId,
  userId,
}: {
  calendars: Calendar[]
  writableCalendars: Calendar[]
  urlCalendarId: string | null
  rememberedCalendarId: string | null
  userId: string
}): Calendar | null {
  const all = new Map(calendars.map((calendar) => [calendar.id, calendar]))
  const writable = new Map(writableCalendars.map((calendar) => [calendar.id, calendar]))

  if (urlCalendarId) {
    const selected = all.get(urlCalendarId)
    if (selected && writable.has(selected.id)) return selected
  }

  if (rememberedCalendarId) {
    const remembered = all.get(rememberedCalendarId)
    if (remembered && writable.has(remembered.id)) return remembered
  }

  const personal = writableCalendars.find(
    (calendar) => calendar.kind === 'personal' && calendar.ownerId === userId,
  )
  if (personal) return personal

  return writableCalendars[0] ?? null
}
