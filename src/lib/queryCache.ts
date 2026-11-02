import type { QueryClient } from '@tanstack/react-query'
import type {
  Calendar,
  CalendarShare,
  Event,
  Notification,
  RsvpStatus,
} from '../types/domain'

function eventQueries(queryClient: QueryClient) {
  return queryClient.getQueryCache().findAll({ queryKey: ['events'] })
}

function workspaceEventQueries(queryClient: QueryClient, workspaceId: string) {
  return eventQueries(queryClient).filter((query) => query.queryKey[1] === workspaceId)
}

function overlapsRange(event: Event, rangeStart: string, rangeEnd: string) {
  const start = Date.parse(rangeStart)
  const end = Date.parse(rangeEnd)
  const eventStart = Date.parse(event.startsAt)
  if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(eventStart)) return false

  if (event.recurrenceRule) {
    const until = event.recurrenceUntil ? Date.parse(event.recurrenceUntil) : null
    return eventStart < end && (until === null || Number.isNaN(until) || until >= start)
  }

  return eventStart < end && Date.parse(event.endsAt) > start
}

function sorted(events: Event[]) {
  return [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

/** Add an event to every cached event range that contains it. */
export function cacheCreatedEvent(queryClient: QueryClient, event: Event) {
  for (const query of workspaceEventQueries(queryClient, event.workspaceId)) {
    const current = query.state.data as Event[] | undefined
    const rangeStart = query.queryKey[2]
    const rangeEnd = query.queryKey[3]
    if (!current || typeof rangeStart !== 'string' || typeof rangeEnd !== 'string') continue
    if (!overlapsRange(event, rangeStart, rangeEnd)) continue

    queryClient.setQueryData(
      query.queryKey,
      sorted([...current.filter((item) => item.id !== event.id), event]),
    )
  }
}

/** Replace an event in cached ranges, moving it in or out as its times change. */
export function cacheUpdatedEvent(queryClient: QueryClient, event: Event) {
  for (const query of workspaceEventQueries(queryClient, event.workspaceId)) {
    const current = query.state.data as Event[] | undefined
    const rangeStart = query.queryKey[2]
    const rangeEnd = query.queryKey[3]
    if (!current || typeof rangeStart !== 'string' || typeof rangeEnd !== 'string') continue

    const existing = current.some((item) => item.id === event.id)
    const inRange = overlapsRange(event, rangeStart, rangeEnd)
    if (!existing && !inRange) continue

    const without = current.filter((item) => item.id !== event.id)
    queryClient.setQueryData(query.queryKey, inRange ? sorted([...without, event]) : without)
  }
}

/** Drop an event from every cached range, regardless of workspace. */
export function cacheDeletedEvent(queryClient: QueryClient, eventId: string) {
  for (const query of eventQueries(queryClient)) {
    const current = query.state.data as Event[] | undefined
    if (!current?.some((item) => item.id === eventId)) continue
    queryClient.setQueryData(
      query.queryKey,
      current.filter((item) => item.id !== eventId),
    )
  }
}

/** Apply an RSVP response to every cached copy of the event. */
export function cacheRsvp(
  queryClient: QueryClient,
  eventId: string,
  userId: string,
  status: RsvpStatus,
  respondedAt: string,
) {
  for (const query of eventQueries(queryClient)) {
    const current = query.state.data as Event[] | undefined
    if (!current?.some((item) => item.id === eventId)) continue

    queryClient.setQueryData(
      query.queryKey,
      current.map((event) => {
        if (event.id !== eventId) return event
        const participants = event.participants ?? []
        const existing = participants.some((participant) => participant.userId === userId)

        return {
          ...event,
          participants: existing
            ? participants.map((participant) =>
                participant.userId === userId
                  ? { ...participant, status, respondedAt }
                  : participant,
              )
            : [...participants, { eventId, userId, status, respondedAt }],
        }
      }),
    )
  }
}

/** Insert or replace a calendar without disturbing the list order. */
export function cacheCalendar(queryClient: QueryClient, calendar: Calendar) {
  const key = ['calendars', calendar.workspaceId]
  const current = queryClient.getQueryData<Calendar[]>(key)
  if (!current) return

  const exists = current.some((item) => item.id === calendar.id)
  queryClient.setQueryData(
    key,
    exists
      ? current.map((item) => (item.id === calendar.id ? calendar : item))
      : [...current, calendar],
  )
}

export function cacheDeletedCalendar(
  queryClient: QueryClient,
  workspaceId: string | null | undefined,
  calendarId: string,
) {
  const key = ['calendars', workspaceId]
  const current = queryClient.getQueryData<Calendar[]>(key)
  if (!current) return
  queryClient.setQueryData(
    key,
    current.filter((item) => item.id !== calendarId),
  )
}

export function cacheCalendarShare(
  queryClient: QueryClient,
  workspaceId: string | null | undefined,
  share: CalendarShare,
) {
  const key = ['calendars', workspaceId]
  const current = queryClient.getQueryData<Calendar[]>(key)
  if (!current) return

  queryClient.setQueryData(
    key,
    current.map((calendar) => {
      if (calendar.id !== share.calendarId) return calendar
      const shares = (calendar.shares ?? []).filter(
        (item) =>
          item.id !== share.id &&
          !(item.subjectType === share.subjectType && item.subjectId === share.subjectId),
      )
      return { ...calendar, shares: [...shares, share] }
    }),
  )
}

export function cacheDeletedCalendarShare(
  queryClient: QueryClient,
  workspaceId: string | null | undefined,
  shareId: string,
) {
  const key = ['calendars', workspaceId]
  const current = queryClient.getQueryData<Calendar[]>(key)
  if (!current) return

  queryClient.setQueryData(
    key,
    current.map((calendar) =>
      calendar.shares?.some((share) => share.id === shareId)
        ? {
            ...calendar,
            shares: calendar.shares.filter((share) => share.id !== shareId),
          }
        : calendar,
    ),
  )
}

/** Mark notifications read in the cached panel before the request settles. */
export function cacheNotificationsRead(
  queryClient: QueryClient,
  workspaceId: string | null | undefined,
  notificationIds: string[],
  readAt = new Date().toISOString(),
) {
  if (!workspaceId || notificationIds.length === 0) return

  const key = ['notifications', workspaceId]
  const current = queryClient.getQueryData<Notification[]>(key)
  if (!current) return

  const ids = new Set(notificationIds)
  queryClient.setQueryData(
    key,
    current.map((notification) =>
      ids.has(notification.id) && !notification.readAt
        ? { ...notification, readAt }
        : notification,
    ),
  )
}
