import type {
  Calendar,
  Event,
  EventCategory,
  EventInput,
  Notification,
  Team,
  Workspace,
  WorkspaceMembership,
} from '../../types/domain'
import { calendarRole } from '../../lib/permissions'
import type {
  DataProvider,
  DeleteEventResult,
  EventRange,
  UpdateEventResult,
} from '../types'
import { createDemoSeed, DEMO_STORAGE_KEY, type DemoState } from './demoData'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function createDemoProvider(storage: Storage = window.localStorage): DataProvider {
  let state = loadState()

  function loadState(): DemoState {
    try {
      const stored = storage.getItem(DEMO_STORAGE_KEY)
      if (stored) return JSON.parse(stored) as DemoState
    } catch {
      // A corrupt or unavailable store should not block the demo.
    }
    const seed = createDemoSeed()
    try {
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed))
    } catch {
      // Private browsing can reject writes; the in-memory state still works.
    }
    return seed
  }

  function saveState(next: DemoState) {
    state = next
    try {
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Private browsing can reject writes; the in-memory state still works.
    }
  }

  function currentUser() {
    return state.profiles.find((profile) => profile.id === state.currentUserId) ?? null
  }

  function workspaceRole(workspaceId: string) {
    return (
      state.workspaceMemberships.find(
        (membership) =>
          membership.workspaceId === workspaceId && membership.userId === state.currentUserId,
      )?.role ?? null
    )
  }

  function teamIds(workspaceId: string) {
    return state.teamMemberships
      .filter(
        (membership) =>
          membership.userId === state.currentUserId &&
          state.teams.some(
            (team) =>
              team.id === membership.teamId &&
              team.workspaceId === workspaceId &&
              !team.deletedAt,
          ),
      )
      .map((membership) => membership.teamId)
  }

  function teamRole(teamId: string | null) {
    if (!teamId) return null
    return (
      state.teamMemberships.find(
        (membership) =>
          membership.teamId === teamId && membership.userId === state.currentUserId,
      )?.role ?? null
    )
  }

  function accessibleCalendars(workspaceId: string) {
    const role = workspaceRole(workspaceId)
    const memberships = {
      workspaceRole: role,
      teamIds: teamIds(workspaceId),
    }

    return state.calendars.filter((calendar) => {
      if (calendar.workspaceId !== workspaceId || calendar.deletedAt) return false
      return (
        calendarRole(calendar, state.currentUserId, {
          ...memberships,
          teamRole: teamRole(calendar.teamId),
        }) !== null
      )
    })
  }

  function attachCalendar(calendar: Calendar): Calendar {
    return clone(calendar)
  }

  function attachEvent(event: Event): Event {
    const creator = state.profiles.find((profile) => profile.id === event.createdBy)
    const category = state.categories.find((item) => item.id === event.categoryId)
    const participants = (event.participants ?? []).map((participant) => ({
      ...participant,
      profile: state.profiles.find((profile) => profile.id === participant.userId),
    }))

    return clone({ ...event, creator, category, participants })
  }

  function attachMember(membership: WorkspaceMembership): WorkspaceMembership {
    return {
      ...membership,
      profile: state.profiles.find((profile) => profile.id === membership.userId),
    }
  }

  function attachTeam(team: Team): Team {
    const memberships = state.teamMemberships.filter((membership) => membership.teamId === team.id)
    return {
      ...team,
      leadIds: memberships
        .filter((membership) => membership.role === 'lead')
        .map((membership) => membership.userId),
      memberCount: memberships.length,
    }
  }

  return {
    mode: 'demo',

    async listWorkspaces() {
      return clone(state.workspaces.filter((workspace) => !workspace.deletedAt))
    },

    async createWorkspace(input) {
      const now = new Date().toISOString()
      const workspace: Workspace = {
        id: crypto.randomUUID(),
        name: input.name,
        slug: input.slug,
        createdBy: state.currentUserId,
        createdAt: now,
        deletedAt: null,
      }

      const next: DemoState = {
        ...state,
        workspaces: [...state.workspaces, workspace],
        workspaceMemberships: [
          ...state.workspaceMemberships,
          {
            id: crypto.randomUUID(),
            workspaceId: workspace.id,
            userId: state.currentUserId,
            role: 'owner',
            joinedAt: now,
          },
        ],
      }

      const calendar: Calendar = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        ownerId: state.currentUserId,
        teamId: null,
        name: `${currentUser()?.fullName ?? 'My'}’s calendar`,
        description: null,
        kind: 'personal',
        color: '#0C7A43',
        visibility: 'private',
        createdBy: state.currentUserId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        shares: [],
      }

      next.calendars = [...next.calendars, calendar]
      saveState(next)
      return clone(workspace)
    },

    async listTeams(workspaceId) {
      return state.teams
        .filter((team) => team.workspaceId === workspaceId && !team.deletedAt)
        .map(attachTeam)
        .map(clone)
    },

    async listMembers(workspaceId) {
      return state.workspaceMemberships
        .filter((membership) => membership.workspaceId === workspaceId)
        .map(attachMember)
    },

    async listCalendars(workspaceId) {
      return accessibleCalendars(workspaceId).map(attachCalendar)
    },

    async listCategories(workspaceId): Promise<EventCategory[]> {
      return state.categories.filter((category) => category.workspaceId === workspaceId).map(clone)
    },

    async listEvents(range: EventRange) {
      const calendarIds = new Set(accessibleCalendars(range.workspaceId).map((calendar) => calendar.id))
      const rangeStart = new Date(range.rangeStart).getTime()
      const rangeEnd = new Date(range.rangeEnd).getTime()

      return state.events
        .filter((event) => {
          if (event.deletedAt || !calendarIds.has(event.calendarId)) return false
          if (event.recurrenceRule) {
            const until = event.recurrenceUntil ? new Date(event.recurrenceUntil).getTime() : null
            return new Date(event.startsAt).getTime() < rangeEnd && (!until || until >= rangeStart)
          }
          return (
            new Date(event.startsAt).getTime() < rangeEnd &&
            new Date(event.endsAt).getTime() > rangeStart
          )
        })
        .map(attachEvent)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    },

    async createEvent(input: EventInput) {
      const calendar = state.calendars.find((item) => item.id === input.calendarId)
      if (!calendar) throw new Error('Calendar not found')

      const now = new Date().toISOString()
      const eventId = crypto.randomUUID()
      const participantIds = [...new Set(input.participantIds ?? [])]

      const event: Event = {
        id: eventId,
        workspaceId: calendar.workspaceId,
        calendarId: calendar.id,
        calendarKind: calendar.kind,
        createdBy: state.currentUserId,
        title: input.title,
        description: input.description || null,
        location: input.location || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        allDay: input.allDay,
        timeZone: input.timeZone,
        categoryId: input.categoryId ?? null,
        priority: input.priority,
        status: input.status ?? 'scheduled',
        visibility: input.visibility,
        recurrenceRule: input.recurrenceRule ?? null,
        recurrenceUntil: input.recurrenceUntil ?? null,
        recurrenceExceptions: [],
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        participants: participantIds.map((userId) => ({
          eventId,
          userId,
          status: 'no_response',
          respondedAt: null,
        })),
      }

      saveState({ ...state, events: [...state.events, event] })
      return attachEvent(event)
    },

    async updateEvent(
      eventId: string,
      input: EventInput,
      expectedVersion: number,
    ): Promise<UpdateEventResult> {
      const current = state.events.find((event) => event.id === eventId)
      if (!current) return { ok: false, conflict: true, current: null }
      if (current.version !== expectedVersion) {
        return { ok: false, conflict: true, current: attachEvent(current) }
      }

      const calendar = state.calendars.find((item) => item.id === input.calendarId)
      if (!calendar) throw new Error('Calendar not found')

      const existingParticipants = new Map(
        (current.participants ?? []).map((participant) => [participant.userId, participant]),
      )
      const participantIds = [...new Set(input.participantIds ?? [])]
      const updated: Event = {
        ...current,
        calendarId: calendar.id,
        calendarKind: calendar.kind,
        title: input.title,
        description: input.description || null,
        location: input.location || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        allDay: input.allDay,
        timeZone: input.timeZone,
        categoryId: input.categoryId ?? null,
        priority: input.priority,
        status: input.status ?? current.status,
        visibility: input.visibility,
        recurrenceRule: input.recurrenceRule ?? null,
        recurrenceUntil: input.recurrenceUntil ?? null,
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
        participants: participantIds.map((userId) => {
          const existing = existingParticipants.get(userId)
          return (
            existing ?? {
              eventId,
              userId,
              status: 'no_response' as const,
              respondedAt: null,
            }
          )
        }),
      }

      saveState({
        ...state,
        events: state.events.map((event) => (event.id === eventId ? updated : event)),
      })
      return { ok: true, event: attachEvent(updated) }
    },

    async deleteEvent(eventId: string, expectedVersion: number): Promise<DeleteEventResult> {
      const current = state.events.find((event) => event.id === eventId)
      if (!current) return { ok: false, conflict: true, current: null }
      if (current.version !== expectedVersion) {
        return { ok: false, conflict: true, current: attachEvent(current) }
      }

      const deleted = { ...current, deletedAt: new Date().toISOString(), version: current.version + 1 }
      saveState({
        ...state,
        events: state.events.map((event) => (event.id === eventId ? deleted : event)),
      })
      return { ok: true }
    },

    async listNotifications(workspaceId: string): Promise<Notification[]> {
      return state.notifications
        .filter(
          (notification) =>
            notification.workspaceId === workspaceId &&
            notification.userId === state.currentUserId,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(clone)
    },

    async markNotificationRead(notificationId: string) {
      saveState({
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId && !notification.readAt
            ? { ...notification, readAt: new Date().toISOString() }
            : notification,
        ),
      })
    },
  }
}
