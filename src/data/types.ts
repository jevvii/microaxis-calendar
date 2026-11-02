import type {
  Calendar,
  Event,
  EventCategory,
  EventInput,
  Notification,
  Team,
  Workspace,
  WorkspaceMembership,
  RsvpStatus,
} from '../types/domain'

export type EventRange = {
  workspaceId: string
  rangeStart: string
  rangeEnd: string
}

export type UpdateEventResult =
  | { ok: true; event: Event }
  | { ok: false; conflict: true; current: Event | null }

export type DeleteEventResult =
  | { ok: true }
  | { ok: false; conflict: true; current: Event | null }

export type DataProvider = {
  mode: 'demo' | 'supabase'
  listWorkspaces: () => Promise<Workspace[]>
  createWorkspace: (input: { name: string; slug: string }) => Promise<Workspace>
  listTeams: (workspaceId: string) => Promise<Team[]>
  listMembers: (workspaceId: string) => Promise<WorkspaceMembership[]>
  listCalendars: (workspaceId: string) => Promise<Calendar[]>
  listCategories: (workspaceId: string) => Promise<EventCategory[]>
  listEvents: (range: EventRange) => Promise<Event[]>
  createEvent: (input: EventInput) => Promise<Event>
  updateEvent: (
    eventId: string,
    input: EventInput,
    expectedVersion: number,
  ) => Promise<UpdateEventResult>
  deleteEvent: (eventId: string, expectedVersion: number) => Promise<DeleteEventResult>
  listNotifications: (workspaceId: string) => Promise<Notification[]>
  markNotificationRead: (notificationId: string) => Promise<void>
  setRsvp: (eventId: string, status: RsvpStatus) => Promise<void>
}
