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
  NotificationPreferences,
  WorkspaceAuditEntry,
  CalendarShare,
  CalendarRole,
  ShareSubjectType,
  WorkspaceRole,
  EventComment,
  EventAttachment,
  EventActivity,
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

export type TeamAdminInput = {
  name: string
  description: string
  color: string
  leadIds: string[]
  memberIds: string[]
}

export type CalendarAdminInput = {
  workspaceId: string
  name: string
  description: string
  kind: 'personal' | 'team' | 'workspace' | 'shared'
  teamId?: string | null
  color: string
}

export type CalendarShareInput = {
  calendarId: string
  subjectType: ShareSubjectType
  subjectId: string
  role: Exclude<CalendarRole, 'manager'>
  hideDetails: boolean
}

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
  listComments: (eventId: string) => Promise<EventComment[]>
  createComment: (eventId: string, body: string) => Promise<EventComment>
  updateComment: (commentId: string, body: string) => Promise<EventComment>
  deleteComment: (commentId: string) => Promise<void>
  listAttachments: (eventId: string) => Promise<EventAttachment[]>
  uploadAttachment: (input: {
    workspaceId: string
    eventId: string
    file: File
  }) => Promise<EventAttachment>
  deleteAttachment: (attachmentId: string) => Promise<void>
  getAttachmentUrl: (storagePath: string) => Promise<string>
  listActivity: (eventId: string) => Promise<EventActivity[]>
  getNotificationPreferences: () => Promise<NotificationPreferences>
  updateNotificationPreferences: (preferences: NotificationPreferences) => Promise<void>
  updateWorkspaceMember: (
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ) => Promise<void>
  removeWorkspaceMember: (workspaceId: string, userId: string) => Promise<void>
  createTeam: (workspaceId: string, input: TeamAdminInput) => Promise<Team>
  updateTeam: (teamId: string, input: TeamAdminInput) => Promise<Team>
  deleteTeam: (teamId: string) => Promise<void>
  createCalendar: (input: CalendarAdminInput) => Promise<Calendar>
  updateCalendar: (
    calendarId: string,
    input: { name: string; description: string; color: string },
  ) => Promise<Calendar>
  deleteCalendar: (calendarId: string) => Promise<void>
  upsertCalendarShare: (input: CalendarShareInput) => Promise<CalendarShare>
  deleteCalendarShare: (shareId: string) => Promise<void>
  listAuditLog: (workspaceId: string) => Promise<WorkspaceAuditEntry[]>
  transferWorkspaceOwnership: (workspaceId: string, newOwnerId: string) => Promise<void>
  deleteWorkspace: (workspaceId: string, confirmationName: string) => Promise<void>
}
