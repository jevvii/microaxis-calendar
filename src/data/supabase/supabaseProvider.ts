import { supabase } from '../../lib/supabase'
import { validateAttachmentFile } from '../../lib/attachments'
import { compressImage } from '../../lib/imageCompression'
import { normalizeNotificationPreferences } from '../../lib/notificationPreferences'
import type {
  Calendar,
  CalendarKind,
  Event,
  EventActivity,
  EventAttachment,
  EventCategory,
  EventComment,
  EventInput,
  Notification,
  Profile,
  Team,
  Workspace,
  WorkspaceMembership,
} from '../../types/domain'
import type {
  DataProvider,
  DeleteEventResult,
  EventRange,
  UpdateEventResult,
  TeamAdminInput,
  CalendarAdminInput,
  CalendarShareInput,
} from '../types'
import {
  mapCalendarRow,
  mapEventActivityRow,
  mapEventAttachmentRow,
  mapEventCategoryRow,
  mapEventCommentRow,
  mapEventParticipantRow,
  mapEventRow,
  mapNotificationRow,
  mapProfileRow,
  mapTeamRow,
  mapWorkspaceAuditEntryRow,
  mapWorkspaceMemberRow,
  mapWorkspaceRow,
  type CalendarRow,
  type EventActivityRow,
  type EventAttachmentRow,
  type EventCategoryRow,
  type EventCommentRow,
  type EventParticipantRow,
  type EventRow,
  type NotificationRow,
  type ProfileRow,
  type TeamRow,
  type WorkspaceAuditEntryRow,
  type WorkspaceMemberRow,
  type WorkspaceRow,
} from './mappers'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

async function currentUserId() {
  const { data, error } = await client().auth.getUser()
  throwIf(error)
  if (!data.user) throw new Error('You need to be signed in')
  return data.user.id
}

async function getProfile(userId: string): Promise<Profile | undefined> {
  const { data, error } = await client()
    .from('profiles')
    .select('id, full_name, avatar_url, timezone, week_starts_on, clock_24h')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapProfileRow(data as ProfileRow) : undefined
}

async function getCategory(categoryId: string | null): Promise<EventCategory | undefined> {
  if (!categoryId) return undefined
  const { data, error } = await client()
    .from('event_categories')
    .select('id, workspace_id, name, color, icon, created_at')
    .eq('id', categoryId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapEventCategoryRow(data as EventCategoryRow) : undefined
}

async function hydrateEvent(
  row: EventRow,
  calendarKind: CalendarKind,
): Promise<Event> {
  const [creator, category, participantsResult] = await Promise.all([
    row.created_by ? getProfile(row.created_by) : Promise.resolve(undefined),
    getCategory(row.category_id),
    client()
      .from('event_participants')
      .select(
        'event_id, user_id, status, responded_at, profile:profiles(id, full_name, avatar_url, timezone, week_starts_on, clock_24h)',
      )
      .eq('event_id', row.id),
  ])

  throwIf(participantsResult.error)
  const participants = (participantsResult.data ?? []).map((participant) =>
    mapEventParticipantRow(participant as unknown as EventParticipantRow),
  )

  return mapEventRow(row, calendarKind, { creator, category, participants })
}

async function listEventRows(range: EventRange) {
  const { data, error } = await client()
    .from('calendar_visible_events')
    .select('*')
    .eq('workspace_id', range.workspaceId)
    .lt('starts_at', range.rangeEnd)
    .order('starts_at', { ascending: true })

  throwIf(error)

  const rangeStart = new Date(range.rangeStart).getTime()
  return ((data ?? []) as EventRow[]).filter((row) => {
    if (row.recurrence_rule) {
      return (
        !row.recurrence_until || new Date(row.recurrence_until).getTime() >= rangeStart
      )
    }
    return new Date(row.ends_at).getTime() > rangeStart
  })
}

async function calendarsById(workspaceId: string) {
  const { data, error } = await client()
    .from('calendars')
    .select('id, kind')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  throwIf(error)
  return new Map(
    ((data ?? []) as Array<{ id: string; kind: CalendarKind }>).map((calendar) => [
      calendar.id,
      calendar.kind,
    ]),
  )
}

async function getTeamById(teamId: string): Promise<Team> {
  const { data, error } = await client()
    .from('teams')
    .select(
      'id, workspace_id, name, description, color, created_by, created_at, deleted_at, team_members(user_id, role)',
    )
    .eq('id', teamId)
    .single<TeamRow>()

  throwIf(error)
  if (!data) throw new Error('Team not found')
  return mapTeamRow(data)
}

async function getCalendarKind(calendarId: string): Promise<CalendarKind> {
  const { data, error } = await client()
    .from('calendars')
    .select('kind')
    .eq('id', calendarId)
    .single<{ kind: CalendarKind }>()

  throwIf(error)
  return data?.kind ?? 'shared'
}

async function getCalendarById(calendarId: string): Promise<Calendar> {
  const { data, error } = await client()
    .from('calendars')
    .select('*, calendar_shares(*)')
    .eq('id', calendarId)
    .single<CalendarRow>()

  throwIf(error)
  if (!data) throw new Error('Calendar not found')
  return mapCalendarRow(data)
}

export function createSupabaseProvider(): DataProvider {
  return {
    mode: 'supabase',

    async listWorkspaces(): Promise<Workspace[]> {
      const { data, error } = await client()
        .from('workspaces')
        .select('id, name, slug, created_by, created_at, deleted_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      throwIf(error)
      return ((data ?? []) as WorkspaceRow[]).map(mapWorkspaceRow)
    },

    async createWorkspace(input): Promise<Workspace> {
      const { data, error } = await client().rpc('create_workspace_with_owner', {
        p_name: input.name,
        p_slug: input.slug,
      })
      throwIf(error)

      const { data: workspace, error: workspaceError } = await client()
        .from('workspaces')
        .select('id, name, slug, created_by, created_at, deleted_at')
        .eq('id', data as string)
        .single()

      throwIf(workspaceError)
      return mapWorkspaceRow(workspace as WorkspaceRow)
    },

    async listTeams(workspaceId: string): Promise<Team[]> {
      const { data, error } = await client()
        .from('teams')
        .select(
          'id, workspace_id, name, description, color, created_by, created_at, deleted_at, team_members(user_id, role)',
        )
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      throwIf(error)
      return ((data ?? []) as TeamRow[]).map(mapTeamRow)
    },

    async listMembers(workspaceId: string): Promise<WorkspaceMembership[]> {
      const { data, error } = await client()
        .from('workspace_members')
        .select(
          'id, workspace_id, user_id, role, joined_at, profile:profiles(id, full_name, avatar_url, timezone, week_starts_on, clock_24h)',
        )
        .eq('workspace_id', workspaceId)
        .order('joined_at', { ascending: true })

      throwIf(error)
      return ((data ?? []) as unknown as WorkspaceMemberRow[]).map(mapWorkspaceMemberRow)
    },

    async listCalendars(workspaceId: string): Promise<Calendar[]> {
      const { data, error } = await client()
        .from('calendars')
        .select('*, calendar_shares(*)')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      throwIf(error)
      return ((data ?? []) as CalendarRow[]).map(mapCalendarRow)
    },

    async listCategories(workspaceId: string): Promise<EventCategory[]> {
      const { data, error } = await client()
        .from('event_categories')
        .select('id, workspace_id, name, color, icon, created_at')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true })

      throwIf(error)
      return ((data ?? []) as EventCategoryRow[]).map(mapEventCategoryRow)
    },

    async listEvents(range: EventRange): Promise<Event[]> {
      const [rows, kindMap] = await Promise.all([
        listEventRows(range),
        calendarsById(range.workspaceId),
      ])

      if (rows.length === 0) return []

      const eventIds = rows.map((row) => row.id)
      const creatorIds = [...new Set(rows.map((row) => row.created_by).filter(Boolean))] as string[]
      const categoryIds = [
        ...new Set(rows.map((row) => row.category_id).filter(Boolean)),
      ] as string[]

      const [profilesResult, categoriesResult, participantsResult] = await Promise.all([
        creatorIds.length
          ? client()
              .from('profiles')
              .select('id, full_name, avatar_url, timezone, week_starts_on, clock_24h')
              .in('id', creatorIds)
          : Promise.resolve({ data: [], error: null }),
        categoryIds.length
          ? client()
              .from('event_categories')
              .select('id, workspace_id, name, color, icon, created_at')
              .in('id', categoryIds)
          : Promise.resolve({ data: [], error: null }),
        client()
          .from('event_participants')
          .select(
            'event_id, user_id, status, responded_at, profile:profiles(id, full_name, avatar_url, timezone, week_starts_on, clock_24h)',
          )
          .in('event_id', eventIds),
      ])

      throwIf(profilesResult.error)
      throwIf(categoriesResult.error)
      throwIf(participantsResult.error)

      const profiles = new Map(
        ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [
          profile.id,
          mapProfileRow(profile),
        ]),
      )
      const categories = new Map(
        ((categoriesResult.data ?? []) as EventCategoryRow[]).map((category) => [
          category.id,
          mapEventCategoryRow(category),
        ]),
      )
      const participants = new Map<string, ReturnType<typeof mapEventParticipantRow>[]>()
      for (const participant of (participantsResult.data ?? []) as unknown as EventParticipantRow[]) {
        const list = participants.get(participant.event_id) ?? []
        list.push(mapEventParticipantRow(participant))
        participants.set(participant.event_id, list)
      }

      return rows.map((row) =>
        mapEventRow(row, kindMap.get(row.calendar_id) ?? 'shared', {
          creator: row.created_by ? profiles.get(row.created_by) : undefined,
          category: row.category_id ? categories.get(row.category_id) : undefined,
          participants: participants.get(row.id) ?? [],
        }),
      )
    },

    async createEvent(input: EventInput): Promise<Event> {
      const { data: calendar, error: calendarError } = await client()
        .from('calendars')
        .select('id, kind')
        .eq('id', input.calendarId)
        .single<{ id: string; kind: CalendarKind }>()

      throwIf(calendarError)
      if (!calendar) throw new Error('Calendar not found')

      const { data, error } = await client().rpc('create_event', {
        p_calendar_id: input.calendarId,
        p_payload: {
          title: input.title,
          description: input.description ?? '',
          location: input.location ?? '',
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          all_day: input.allDay,
          time_zone: input.timeZone,
          category_id: input.categoryId ?? null,
          priority: input.priority,
          status: input.status ?? 'scheduled',
          visibility: input.visibility,
          recurrence_rule: input.recurrenceRule ?? null,
          recurrence_until: input.recurrenceUntil ?? null,
          participant_ids: input.participantIds ?? [],
          export_to_google: input.exportToGoogle ?? true,
        },
      })

      throwIf(error)
      const result = data as { event?: EventRow; calendar_kind?: CalendarKind } | null
      if (!result?.event) throw new Error('The event could not be created')

      return hydrateEvent(result.event, result.calendar_kind ?? calendar.kind)
    },

    async updateEvent(
      eventId: string,
      input: EventInput,
      expectedVersion: number,
    ): Promise<UpdateEventResult> {
      const { data, error } = await client().rpc('update_event', {
        p_event_id: eventId,
        p_expected_version: expectedVersion,
        p_payload: {
          calendar_id: input.calendarId,
          title: input.title,
          description: input.description ?? '',
          location: input.location ?? '',
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          all_day: input.allDay,
          time_zone: input.timeZone,
          category_id: input.categoryId ?? null,
          priority: input.priority,
          status: input.status ?? 'scheduled',
          visibility: input.visibility,
          recurrence_rule: input.recurrenceRule ?? null,
          recurrence_until: input.recurrenceUntil ?? null,
          participant_ids: input.participantIds ?? [],
          export_to_google: input.exportToGoogle ?? true,
        },
      })

      throwIf(error)
      const result = data as {
        ok?: boolean
        conflict?: boolean
        event?: EventRow
        calendar_kind?: CalendarKind
        current?: EventRow | null
      } | null

      if (!result?.ok) {
        const current = result?.current
        return {
          ok: false,
          conflict: true,
          current: current
            ? await hydrateEvent(current, await getCalendarKind(current.calendar_id))
            : null,
        }
      }

      if (!result.event) throw new Error('The event could not be updated')
      return {
        ok: true,
        event: await hydrateEvent(
          result.event,
          result.calendar_kind ?? (await getCalendarKind(result.event.calendar_id)),
        ),
      }
    },

    async deleteEvent(eventId: string, expectedVersion: number): Promise<DeleteEventResult> {
      const { data, error } = await client().rpc('delete_event', {
        p_event_id: eventId,
        p_expected_version: expectedVersion,
      })

      throwIf(error)
      const result = data as {
        ok?: boolean
        conflict?: boolean
        current?: EventRow | null
      } | null

      if (!result?.ok) {
        const current = result?.current
        return {
          ok: false,
          conflict: true,
          current: current
            ? mapEventRow(current, await getCalendarKind(current.calendar_id))
            : null,
        }
      }

      return { ok: true }
    },

    async listNotifications(workspaceId: string): Promise<Notification[]> {
      const { data, error } = await client()
        .from('notifications')
        .select('id, workspace_id, user_id, type, title, body, href, metadata, read_at, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      throwIf(error)
      return ((data ?? []) as NotificationRow[]).map(mapNotificationRow)
    },

    async markNotificationRead(notificationId: string) {
      const { error } = await client().rpc('mark_notification_read', {
        p_notification_id: notificationId,
      })
      throwIf(error)
    },

    async listComments(eventId: string): Promise<EventComment[]> {
      const { data, error } = await client()
        .from('event_comments')
        .select(
          'id, workspace_id, event_id, author_id, body, created_at, updated_at, deleted_at, author:profiles(id, full_name, avatar_url, timezone, week_starts_on, clock_24h)',
        )
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      throwIf(error)
      return ((data ?? []) as unknown as EventCommentRow[]).map(mapEventCommentRow)
    },

    async createComment(eventId: string, body: string): Promise<EventComment> {
      const { data, error } = await client().rpc('create_comment', {
        p_event_id: eventId,
        p_body: body.trim(),
      })

      throwIf(error)
      if (!data) throw new Error('The comment could not be created')
      return mapEventCommentRow(data as EventCommentRow)
    },

    async updateComment(commentId: string, body: string): Promise<EventComment> {
      const { data, error } = await client().rpc('update_comment', {
        p_comment_id: commentId,
        p_body: body.trim(),
      })

      throwIf(error)
      if (!data) throw new Error('The comment could not be updated')
      return mapEventCommentRow(data as EventCommentRow)
    },

    async deleteComment(commentId: string) {
      const { error } = await client().rpc('delete_comment', {
        p_comment_id: commentId,
      })
      throwIf(error)
    },

    async listAttachments(eventId: string): Promise<EventAttachment[]> {
      const { data, error } = await client()
        .from('event_attachments')
        .select(
          'id, workspace_id, event_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, created_at, deleted_at, uploader:profiles(id, full_name, avatar_url, timezone, week_starts_on, clock_24h)',
        )
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      throwIf(error)
      return ((data ?? []) as unknown as EventAttachmentRow[]).map(mapEventAttachmentRow)
    },

    async uploadAttachment({ workspaceId, eventId, file }) {
      const validationError = validateAttachmentFile(file)
      if (validationError) throw new Error(validationError)

      const uploadFile =
        file.type.startsWith('image/') && file.size > 1024 * 1024
          ? await compressImage(file)
          : file
      const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const storagePath = `${workspaceId}/${eventId}/${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await client()
        .storage.from('event-attachments')
        .upload(storagePath, uploadFile, {
          contentType: uploadFile.type,
          upsert: false,
        })
      throwIf(uploadError)

      const { data, error } = await client().rpc('create_attachment', {
        p_workspace_id: workspaceId,
        p_event_id: eventId,
        p_storage_path: storagePath,
        p_file_name: file.name,
        p_mime_type: uploadFile.type,
        p_size_bytes: uploadFile.size,
      })

      if (error) {
        await client().storage.from('event-attachments').remove([storagePath])
        throw new Error(error.message)
      }
      if (!data) throw new Error('The attachment could not be saved')
      return mapEventAttachmentRow(data as EventAttachmentRow)
    },

    async deleteAttachment(attachmentId: string) {
      const { data, error } = await client().rpc('delete_attachment', {
        p_attachment_id: attachmentId,
      })
      throwIf(error)

      if (data) {
        const { error: storageError } = await client()
          .storage.from('event-attachments')
          .remove([data as string])
        throwIf(storageError)
      }
    },

    async getAttachmentUrl(storagePath: string) {
      const { data, error } = await client()
        .storage.from('event-attachments')
        .createSignedUrl(storagePath, 60)
      throwIf(error)
      return data?.signedUrl ?? ''
    },

    async listActivity(eventId: string): Promise<EventActivity[]> {
      const { data, error } = await client()
        .from('event_activity')
        .select(
          'id, workspace_id, event_id, actor_id, action, metadata, created_at, actor:profiles(id, full_name, avatar_url, timezone, week_starts_on, clock_24h)',
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      throwIf(error)
      return ((data ?? []) as unknown as EventActivityRow[]).map(mapEventActivityRow)
    },

    async updateWorkspaceMember(workspaceId, userId, role) {
      const { error } = await client().rpc('update_workspace_member', {
        p_workspace_id: workspaceId,
        p_user_id: userId,
        p_role: role,
      })
      throwIf(error)
    },

    async removeWorkspaceMember(workspaceId, userId) {
      const { error } = await client().rpc('remove_workspace_member', {
        p_workspace_id: workspaceId,
        p_user_id: userId,
      })
      throwIf(error)
    },

    async createTeam(workspaceId: string, input: TeamAdminInput) {
      const { data, error } = await client().rpc('save_team', {
        p_team_id: null,
        p_workspace_id: workspaceId,
        p_name: input.name,
        p_description: input.description,
        p_color: input.color,
        p_lead_ids: input.leadIds,
        p_member_ids: input.memberIds,
      })

      throwIf(error)
      if (!data) throw new Error('The team could not be created')
      return getTeamById(data as string)
    },

    async updateTeam(teamId: string, input: TeamAdminInput) {
      const { data: team, error: teamError } = await client()
        .from('teams')
        .select('workspace_id')
        .eq('id', teamId)
        .single<{ workspace_id: string }>()

      throwIf(teamError)
      if (!team) throw new Error('Team not found')

      const { error } = await client().rpc('save_team', {
        p_team_id: teamId,
        p_workspace_id: team.workspace_id,
        p_name: input.name,
        p_description: input.description,
        p_color: input.color,
        p_lead_ids: input.leadIds,
        p_member_ids: input.memberIds,
      })

      throwIf(error)
      return getTeamById(teamId)
    },

    async deleteTeam(teamId: string) {
      const { error } = await client().rpc('delete_team', {
        p_team_id: teamId,
      })
      throwIf(error)
    },

    async createCalendar(input: CalendarAdminInput) {
      const { data, error } = await client().rpc('create_calendar', {
        p_workspace_id: input.workspaceId,
        p_name: input.name,
        p_description: input.description,
        p_kind: input.kind,
        p_team_id: input.kind === 'team' ? input.teamId ?? null : null,
        p_color: input.color,
      })

      throwIf(error)
      if (!data) throw new Error('The calendar could not be created')
      return getCalendarById(data as string)
    },

    async updateCalendar(calendarId, input) {
      const { error } = await client().rpc('update_calendar', {
        p_calendar_id: calendarId,
        p_name: input.name,
        p_description: input.description,
        p_color: input.color,
      })
      throwIf(error)
      return getCalendarById(calendarId)
    },

    async deleteCalendar(calendarId) {
      const { error } = await client().rpc('delete_calendar', {
        p_calendar_id: calendarId,
      })
      throwIf(error)
    },

    async upsertCalendarShare(input: CalendarShareInput) {
      const { data, error } = await client().rpc('upsert_calendar_share', {
        p_calendar_id: input.calendarId,
        p_subject_type: input.subjectType,
        p_subject_id: input.subjectId,
        p_role: input.role,
        p_hide_details: input.hideDetails,
      })

      throwIf(error)
      if (!data) throw new Error('The calendar share could not be saved')
      return {
        id: data as string,
        calendarId: input.calendarId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        role: input.role,
        hideDetails: input.hideDetails,
      }
    },

    async deleteCalendarShare(shareId) {
      const { error } = await client().rpc('delete_calendar_share', {
        p_share_id: shareId,
      })
      throwIf(error)
    },

    async listAuditLog(workspaceId) {
      const { data, error } = await client()
        .from('workspace_audit_log')
        .select(
          'id, workspace_id, actor_id, action, target_type, target_id, metadata, created_at, actor:profiles(id, full_name, avatar_url, timezone, week_starts_on, clock_24h)',
        )
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(100)

      throwIf(error)
      return ((data ?? []) as unknown as WorkspaceAuditEntryRow[]).map(mapWorkspaceAuditEntryRow)
    },

    async transferWorkspaceOwnership(workspaceId, newOwnerId) {
      const { error } = await client().rpc('transfer_workspace_ownership', {
        p_workspace_id: workspaceId,
        p_new_owner: newOwnerId,
      })
      throwIf(error)
    },

    async deleteWorkspace(workspaceId, confirmationName) {
      const { error } = await client().rpc('soft_delete_workspace', {
        p_workspace_id: workspaceId,
        p_confirmation: confirmationName,
      })
      throwIf(error)
    },

    async getNotificationPreferences() {
      const userId = await currentUserId()
      const { data, error } = await client()
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single<{ notification_preferences: unknown }>()

      throwIf(error)
      return normalizeNotificationPreferences(data?.notification_preferences)
    },

    async updateNotificationPreferences(preferences) {
      const { error } = await client().rpc('update_notification_preferences', {
        p_preferences: preferences,
      })
      throwIf(error)
    },

    async setRsvp(eventId: string, status) {
      const { error } = await client().rpc('set_event_rsvp', {
        p_event_id: eventId,
        p_status: status,
      })
      throwIf(error)
    },
  }
}
