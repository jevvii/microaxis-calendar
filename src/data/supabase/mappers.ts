import type {
  Calendar,
  CalendarKind,
  CalendarShare,
  Event,
  EventActivity,
  EventAttachment,
  EventCategory,
  EventComment,
  EventParticipant,
  Notification,
  Profile,
  Team,
  Workspace,
  WorkspaceMembership,
  WorkspaceAuditEntry,
} from '../../types/domain'

export type ProfileRow = {
  id: string
  full_name: string
  avatar_url: string | null
  timezone: string
  week_starts_on: number
  clock_24h: boolean
}

export type WorkspaceRow = {
  id: string
  name: string
  slug: string
  created_by: string | null
  created_at: string
  deleted_at: string | null
}

export type CalendarShareRow = {
  id: string
  calendar_id: string
  subject_type: 'user' | 'team' | 'workspace'
  subject_id: string
  role: 'viewer' | 'participant' | 'editor' | 'manager'
  hide_details: boolean
}

export type CalendarRow = {
  id: string
  workspace_id: string
  owner_id: string | null
  team_id: string | null
  name: string
  description: string | null
  kind: CalendarKind
  color: string
  visibility: 'private' | 'team' | 'workspace'
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  calendar_shares?: CalendarShareRow[]
}

export type TeamRow = {
  id: string
  workspace_id: string
  name: string
  description: string | null
  color: string
  created_by: string | null
  created_at: string
  deleted_at: string | null
  team_members?: Array<{ user_id: string; role: 'lead' | 'member' }>
}

export type WorkspaceMemberRow = {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  profile?: ProfileRow | ProfileRow[] | null
}

export type EventRow = {
  id: string
  workspace_id: string
  calendar_id: string
  created_by: string | null
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  all_day: boolean
  time_zone: string
  category_id: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'scheduled' | 'tentative' | 'cancelled'
  visibility: 'calendar' | 'participants' | 'private'
  export_to_google?: boolean
  recurrence_rule: string | null
  recurrence_until: string | null
  recurrence_exceptions: unknown
  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type EventParticipantRow = {
  event_id: string
  user_id: string
  status: 'going' | 'maybe' | 'declined' | 'no_response'
  responded_at: string | null
  profile?: ProfileRow | ProfileRow[] | null
}

export type EventCategoryRow = {
  id: string
  workspace_id: string
  name: string
  color: string
  icon: string
  created_at: string
}

export type EventCommentRow = {
  id: string
  workspace_id: string
  event_id: string
  author_id: string | null
  body: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  author?: ProfileRow | ProfileRow[] | null
}

export type EventAttachmentRow = {
  id: string
  workspace_id: string
  event_id: string
  uploaded_by: string | null
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  created_at: string
  deleted_at: string | null
  uploader?: ProfileRow | ProfileRow[] | null
}

export type EventActivityRow = {
  id: string
  workspace_id: string
  event_id: string
  actor_id: string | null
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
  actor?: ProfileRow | ProfileRow[] | null
}

export type WorkspaceAuditEntryRow = {
  id: string
  workspace_id: string
  actor_id: string | null
  action: string
  target_type: string
  target_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  actor?: ProfileRow | ProfileRow[] | null
}

export type NotificationRow = {
  id: string
  workspace_id: string
  user_id: string
  type: Notification['type']
  title: string
  body: string | null
  href: string | null
  metadata: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    timezone: row.timezone,
    weekStartsOn: row.week_starts_on === 0 ? 0 : 1,
    clock24h: row.clock_24h,
  }
}

export function mapWorkspaceRow(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdBy: row.created_by ?? '',
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  }
}

export function mapCalendarShareRow(row: CalendarShareRow): CalendarShare {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    role: row.role,
    hideDetails: row.hide_details,
  }
}

export function mapCalendarRow(row: CalendarRow): Calendar {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    teamId: row.team_id,
    name: row.name,
    description: row.description,
    kind: row.kind,
    color: row.color,
    visibility: row.visibility,
    createdBy: row.created_by ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    shares: (row.calendar_shares ?? []).map(mapCalendarShareRow),
  }
}

export function mapTeamRow(row: TeamRow): Team {
  const members = row.team_members ?? []
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    color: row.color,
    createdBy: row.created_by ?? '',
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    leadIds: members.filter((member) => member.role === 'lead').map((member) => member.user_id),
    memberIds: members.map((member) => member.user_id),
    memberCount: members.length,
  }
}

export function mapWorkspaceMemberRow(row: WorkspaceMemberRow): WorkspaceMembership {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    profile: row.profile
      ? mapProfileRow(Array.isArray(row.profile) ? row.profile[0] : row.profile)
      : undefined,
  }
}

export function mapEventCategoryRow(row: EventCategoryRow): EventCategory {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
  }
}

export function mapEventParticipantRow(row: EventParticipantRow): EventParticipant {
  return {
    eventId: row.event_id,
    userId: row.user_id,
    status: row.status,
    respondedAt: row.responded_at,
    profile: row.profile
      ? mapProfileRow(Array.isArray(row.profile) ? row.profile[0] : row.profile)
      : undefined,
  }
}

export function mapEventRow(
  row: EventRow,
  calendarKind: CalendarKind,
  extras: {
    creator?: Profile
    category?: EventCategory
    participants?: EventParticipant[]
  } = {},
): Event {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    calendarId: row.calendar_id,
    calendarKind,
    createdBy: row.created_by ?? '',
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    timeZone: row.time_zone,
    categoryId: row.category_id,
    priority: row.priority,
    status: row.status,
    visibility: row.visibility,
    exportToGoogle: row.export_to_google ?? true,
    recurrenceRule: row.recurrence_rule,
    recurrenceUntil: row.recurrence_until,
    recurrenceExceptions: Array.isArray(row.recurrence_exceptions)
      ? row.recurrence_exceptions.filter((value): value is string => typeof value === 'string')
      : [],
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    creator: extras.creator,
    category: extras.category,
    participants: extras.participants,
  }
}

export function mapEventCommentRow(row: EventCommentRow): EventComment {
  const author = Array.isArray(row.author) ? row.author[0] : row.author
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    eventId: row.event_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    author: author ? mapProfileRow(author) : undefined,
  }
}

export function mapEventAttachmentRow(row: EventAttachmentRow): EventAttachment {
  const uploader = Array.isArray(row.uploader) ? row.uploader[0] : row.uploader
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    eventId: row.event_id,
    uploadedBy: row.uploaded_by,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    uploader: uploader ? mapProfileRow(uploader) : undefined,
  }
}

export function mapEventActivityRow(row: EventActivityRow): EventActivity {
  const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    eventId: row.event_id,
    actorId: row.actor_id,
    action: row.action,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    actor: actor ? mapProfileRow(actor) : undefined,
  }
}

export function mapWorkspaceAuditEntryRow(row: WorkspaceAuditEntryRow): WorkspaceAuditEntry {
  const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    actorId: row.actor_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    actor: actor ? mapProfileRow(actor) : undefined,
  }
}

export function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    metadata: row.metadata ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}
