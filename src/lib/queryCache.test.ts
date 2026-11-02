import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Calendar, Event, Notification } from '../types/domain'
import {
  cacheCalendar,
  cacheCalendarShare,
  cacheCreatedEvent,
  cacheDeletedCalendar,
  cacheDeletedEvent,
  cacheNotificationsRead,
  cacheRsvp,
  cacheUpdatedEvent,
} from './queryCache'

const WORKSPACE = 'workspace-1'
const RANGE_START = '2026-11-02T00:00:00.000Z'
const RANGE_END = '2026-11-09T00:00:00.000Z'

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    workspaceId: WORKSPACE,
    calendarId: 'calendar-1',
    calendarKind: 'team',
    createdBy: 'user-1',
    title: 'OceanJet release review',
    description: null,
    location: null,
    startsAt: '2026-11-04T01:00:00.000Z',
    endsAt: '2026-11-04T02:00:00.000Z',
    allDay: false,
    timeZone: 'Asia/Manila',
    categoryId: null,
    priority: 'normal',
    status: 'scheduled',
    visibility: 'calendar',
    exportToGoogle: true,
    recurrenceRule: null,
    recurrenceUntil: null,
    recurrenceExceptions: [],
    version: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    deletedAt: null,
    participants: [],
    ...overrides,
  }
}

function makeCalendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    id: 'calendar-1',
    workspaceId: WORKSPACE,
    ownerId: null,
    teamId: null,
    name: 'Launch room',
    description: null,
    kind: 'shared',
    color: '#0C7A43',
    visibility: 'workspace',
    createdBy: 'user-1',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    deletedAt: null,
    shares: [],
    ...overrides,
  }
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notification-1',
    workspaceId: WORKSPACE,
    userId: 'user-1',
    type: 'event_created',
    title: 'New shared event',
    body: null,
    href: null,
    readAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    metadata: {},
    ...overrides,
  }
}

describe('event cache helpers', () => {
  let client: QueryClient
  const eventKey = ['events', WORKSPACE, RANGE_START, RANGE_END, '{}']

  beforeEach(() => {
    client = new QueryClient()
  })

  it('adds a created event only to ranges that contain it', () => {
    client.setQueryData(eventKey, [])
    client.setQueryData(['events', WORKSPACE, '2026-12-01T00:00:00.000Z', '2026-12-08T00:00:00.000Z', '{}'], [])

    cacheCreatedEvent(client, makeEvent())

    expect(client.getQueryData<Event[]>(eventKey)?.map((event) => event.id)).toEqual(['event-1'])
    expect(
      client.getQueryData<Event[]>(['events', WORKSPACE, '2026-12-01T00:00:00.000Z', '2026-12-08T00:00:00.000Z', '{}']),
    ).toEqual([])
  })

  it('keeps cached events sorted by start time', () => {
    client.setQueryData(eventKey, [
      makeEvent({ id: 'later', startsAt: '2026-11-05T01:00:00.000Z', endsAt: '2026-11-05T02:00:00.000Z' }),
    ])

    cacheCreatedEvent(client, makeEvent())

    expect(client.getQueryData<Event[]>(eventKey)?.map((event) => event.id)).toEqual([
      'event-1',
      'later',
    ])
  })

  it('moves an updated event out of a range it no longer overlaps', () => {
    client.setQueryData(eventKey, [makeEvent()])

    cacheUpdatedEvent(
      client,
      makeEvent({ startsAt: '2026-11-20T01:00:00.000Z', endsAt: '2026-11-20T02:00:00.000Z', version: 2 }),
    )

    expect(client.getQueryData<Event[]>(eventKey)).toEqual([])
  })

  it('replaces an updated event inside its range', () => {
    client.setQueryData(eventKey, [makeEvent()])

    cacheUpdatedEvent(client, makeEvent({ title: 'Revised review', version: 2 }))

    expect(client.getQueryData<Event[]>(eventKey)?.[0]?.title).toBe('Revised review')
  })

  it('removes a deleted event from every cached range', () => {
    client.setQueryData(eventKey, [makeEvent()])

    cacheDeletedEvent(client, 'event-1')

    expect(client.getQueryData<Event[]>(eventKey)).toEqual([])
  })

  it('applies an RSVP response to the cached event', () => {
    client.setQueryData(eventKey, [makeEvent()])

    cacheRsvp(client, 'event-1', 'user-1', 'going', '2026-11-03T00:00:00.000Z')

    expect(client.getQueryData<Event[]>(eventKey)?.[0]?.participants?.[0]).toMatchObject({
      userId: 'user-1',
      status: 'going',
    })
  })
})

describe('calendar cache helpers', () => {
  let client: QueryClient
  const calendarKey = ['calendars', WORKSPACE]

  beforeEach(() => {
    client = new QueryClient()
  })

  it('appends a created calendar without reordering the list', () => {
    client.setQueryData(calendarKey, [makeCalendar({ id: 'existing' })])

    cacheCalendar(client, makeCalendar({ id: 'new' }))

    expect(client.getQueryData<Calendar[]>(calendarKey)?.map((calendar) => calendar.id)).toEqual([
      'existing',
      'new',
    ])
  })

  it('updates a calendar in place', () => {
    client.setQueryData(calendarKey, [makeCalendar({ id: 'existing' })])

    cacheCalendar(client, makeCalendar({ id: 'existing', name: 'Renamed' }))

    expect(client.getQueryData<Calendar[]>(calendarKey)?.[0]?.name).toBe('Renamed')
  })

  it('leaves the cache untouched until the list has loaded', () => {
    cacheCalendar(client, makeCalendar())

    expect(client.getQueryData<Calendar[]>(calendarKey)).toBeUndefined()
  })

  it('removes a deleted calendar', () => {
    client.setQueryData(calendarKey, [makeCalendar({ id: 'existing' })])

    cacheDeletedCalendar(client, WORKSPACE, 'existing')

    expect(client.getQueryData<Calendar[]>(calendarKey)).toEqual([])
  })

  it('adds and replaces share rows without duplicates', () => {
    client.setQueryData(calendarKey, [makeCalendar({ id: 'calendar-1' })])
    const share = {
      id: 'share-1',
      calendarId: 'calendar-1',
      subjectType: 'user' as const,
      subjectId: 'user-2',
      role: 'viewer' as const,
      hideDetails: false,
    }

    cacheCalendarShare(client, WORKSPACE, share)
    cacheCalendarShare(client, WORKSPACE, share)

    expect(client.getQueryData<Calendar[]>(calendarKey)?.[0]?.shares).toHaveLength(1)
  })
})

describe('notification cache helpers', () => {
  let client: QueryClient
  const notificationKey = ['notifications', WORKSPACE]

  beforeEach(() => {
    client = new QueryClient()
  })

  it('marks only the requested unread notifications as read', () => {
    client.setQueryData(notificationKey, [
      makeNotification({ id: 'a' }),
      makeNotification({ id: 'b' }),
      makeNotification({ id: 'c', readAt: '2026-11-01T00:00:00.000Z' }),
    ])

    cacheNotificationsRead(client, WORKSPACE, ['a', 'c'], '2026-11-03T00:00:00.000Z')

    const notifications = client.getQueryData<Notification[]>(notificationKey) ?? []
    expect(notifications.map((notification) => notification.readAt)).toEqual([
      '2026-11-03T00:00:00.000Z',
      null,
      '2026-11-01T00:00:00.000Z',
    ])
  })
})
