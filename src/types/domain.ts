export type ISODateString = string

export type WorkspaceRole = 'owner' | 'admin' | 'member'
export type TeamRole = 'lead' | 'member'
export type CalendarRole = 'viewer' | 'participant' | 'editor' | 'manager'
export type CalendarKind = 'personal' | 'team' | 'workspace' | 'shared'
export type CalendarVisibility = 'private' | 'team' | 'workspace'
export type EventPriority = 'low' | 'normal' | 'high' | 'urgent'
export type EventStatus = 'scheduled' | 'tentative' | 'cancelled'
export type EventVisibility = 'calendar' | 'participants' | 'private'
export type RsvpStatus = 'going' | 'maybe' | 'declined' | 'no_response'
export type ShareSubjectType = 'user' | 'team' | 'workspace'
export type NotificationType =
  | 'event_reminder'
  | 'event_created'
  | 'event_updated'
  | 'event_cancelled'
  | 'comment_mention'
  | 'daily_agenda'
  | 'workspace_invite'
  | 'system'

export type Profile = {
  id: string
  fullName: string
  avatarUrl: string | null
  timezone: string
  weekStartsOn: 0 | 1
  clock24h: boolean
}

export type Workspace = {
  id: string
  name: string
  slug: string
  createdBy: string
  createdAt: ISODateString
  deletedAt: ISODateString | null
}

export type WorkspaceMembership = {
  id: string
  workspaceId: string
  userId: string
  role: WorkspaceRole
  joinedAt: ISODateString
  profile?: Profile
}

export type Team = {
  id: string
  workspaceId: string
  name: string
  description: string | null
  color: string
  createdBy: string
  createdAt: ISODateString
  deletedAt: ISODateString | null
  leadIds?: string[]
  memberCount?: number
}

export type TeamMembership = {
  id: string
  teamId: string
  userId: string
  role: TeamRole
  joinedAt: ISODateString
  profile?: Profile
}

export type CalendarShare = {
  id: string
  calendarId: string
  subjectType: ShareSubjectType
  subjectId: string
  role: CalendarRole
  hideDetails: boolean
}

export type Calendar = {
  id: string
  workspaceId: string
  ownerId: string | null
  teamId: string | null
  name: string
  description: string | null
  kind: CalendarKind
  color: string
  visibility: CalendarVisibility
  createdBy: string
  createdAt: ISODateString
  updatedAt: ISODateString
  deletedAt: ISODateString | null
  shares?: CalendarShare[]
}

export type CalendarMemberships = {
  workspaceRole?: WorkspaceRole | null
  teamRole?: TeamRole | null
  teamIds?: string[]
  calendarRole?: CalendarRole | null
}

export type EventCategory = {
  id: string
  workspaceId: string
  name: string
  color: string
  icon: string
  createdAt: ISODateString
}

export type EventParticipant = {
  eventId: string
  userId: string
  status: RsvpStatus
  respondedAt: ISODateString | null
  profile?: Profile
}

export type Event = {
  id: string
  workspaceId: string
  calendarId: string
  calendarKind: CalendarKind
  createdBy: string
  title: string
  description: string | null
  location: string | null
  startsAt: ISODateString
  endsAt: ISODateString
  allDay: boolean
  timeZone: string
  categoryId: string | null
  priority: EventPriority
  status: EventStatus
  visibility: EventVisibility
  recurrenceRule: string | null
  recurrenceUntil: ISODateString | null
  recurrenceExceptions: ISODateString[]
  version: number
  createdAt: ISODateString
  updatedAt: ISODateString
  deletedAt: ISODateString | null
  creator?: Profile
  category?: EventCategory
  participants?: EventParticipant[]
  commentCount?: number
  attachmentCount?: number
}

export type EventOccurrence = Event & {
  occurrenceStart: ISODateString
  occurrenceEnd: ISODateString
  isRecurring: boolean
  parentStart: ISODateString
}

export type Notification = {
  id: string
  workspaceId: string
  userId: string
  type: NotificationType
  title: string
  body: string | null
  href: string | null
  readAt: ISODateString | null
  createdAt: ISODateString
  metadata: Record<string, unknown>
}

export type EventInput = {
  calendarId: string
  title: string
  description?: string
  location?: string
  startsAt: string
  endsAt: string
  allDay: boolean
  timeZone: string
  categoryId?: string | null
  priority: EventPriority
  status?: EventStatus
  visibility: EventVisibility
  recurrenceRule?: string | null
  recurrenceUntil?: string | null
  participantIds?: string[]
}
