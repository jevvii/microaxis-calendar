import { supabase } from '../../lib/supabase'
import type {
  Calendar,
  CalendarKind,
  Event,
  EventCategory,
  EventInput,
  Notification,
  Profile,
  Team,
  Workspace,
  WorkspaceMembership,
} from '../../types/domain'
import type { DataProvider, DeleteEventResult, EventRange, UpdateEventResult } from '../types'
import {
  mapCalendarRow,
  mapEventCategoryRow,
  mapEventParticipantRow,
  mapEventRow,
  mapNotificationRow,
  mapProfileRow,
  mapTeamRow,
  mapWorkspaceMemberRow,
  mapWorkspaceRow,
  type CalendarRow,
  type EventCategoryRow,
  type EventParticipantRow,
  type EventRow,
  type NotificationRow,
  type ProfileRow,
  type TeamRow,
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
      const userId = await currentUserId()
      const { data: calendar, error: calendarError } = await client()
        .from('calendars')
        .select('id, workspace_id, kind')
        .eq('id', input.calendarId)
        .single<{ id: string; workspace_id: string; kind: CalendarKind }>()

      throwIf(calendarError)
      if (!calendar) throw new Error('Calendar not found')

      const { data, error } = await client()
        .from('events')
        .insert({
          workspace_id: calendar.workspace_id,
          calendar_id: calendar.id,
          created_by: userId,
          title: input.title,
          description: input.description || null,
          location: input.location || null,
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
          recurrence_exceptions: [],
        })
        .select('*')
        .single<EventRow>()

      throwIf(error)
      if (!data) throw new Error('The event could not be created')

      const participantIds = [...new Set(input.participantIds ?? [])]
      if (participantIds.length > 0) {
        const { error: participantError } = await client()
          .from('event_participants')
          .upsert(
            participantIds.map((participantId) => ({
              event_id: data.id,
              user_id: participantId,
              status: 'no_response',
            })),
            { onConflict: 'event_id,user_id', ignoreDuplicates: true },
          )
        throwIf(participantError)
      }

      return hydrateEvent(data, calendar.kind)
    },

    async updateEvent(
      eventId: string,
      input: EventInput,
      expectedVersion: number,
    ): Promise<UpdateEventResult> {
      const { data: calendar, error: calendarError } = await client()
        .from('calendars')
        .select('id, workspace_id, kind')
        .eq('id', input.calendarId)
        .single<{ id: string; workspace_id: string; kind: CalendarKind }>()

      throwIf(calendarError)
      if (!calendar) throw new Error('Calendar not found')

      const { data, error } = await client()
        .from('events')
        .update({
          calendar_id: calendar.id,
          title: input.title,
          description: input.description || null,
          location: input.location || null,
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
        })
        .eq('id', eventId)
        .eq('version', expectedVersion)
        .select('*')
        .maybeSingle<EventRow>()

      throwIf(error)

      if (!data) {
        const { data: current } = await client()
          .from('events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle<EventRow>()

        return {
          ok: false,
          conflict: true,
          current: current
            ? await hydrateEvent(current, calendar.kind)
            : null,
        }
      }

      const { data: existingParticipants } = await client()
        .from('event_participants')
        .select('user_id, status, responded_at')
        .eq('event_id', eventId)

      const existing = new Map(
        ((existingParticipants ?? []) as Array<{
          user_id: string
          status: 'going' | 'maybe' | 'declined' | 'no_response'
          responded_at: string | null
        }>).map((participant) => [participant.user_id, participant]),
      )

      const participantIds = [...new Set(input.participantIds ?? [])]
      const { error: deleteError } = await client()
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
      throwIf(deleteError)

      if (participantIds.length > 0) {
        const { error: participantError } = await client()
          .from('event_participants')
          .insert(
            participantIds.map((participantId) => ({
              event_id: eventId,
              user_id: participantId,
              status: existing.get(participantId)?.status ?? 'no_response',
              responded_at: existing.get(participantId)?.responded_at ?? null,
            })),
          )
        throwIf(participantError)
      }

      return { ok: true, event: await hydrateEvent(data, calendar.kind) }
    },

    async deleteEvent(eventId: string, expectedVersion: number): Promise<DeleteEventResult> {
      const { data, error } = await client()
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', eventId)
        .eq('version', expectedVersion)
        .select('id')
        .maybeSingle<{ id: string }>()

      throwIf(error)
      if (data) return { ok: true }

      const { data: current } = await client()
        .from('events')
        .select('id, workspace_id, calendar_id, created_by, title, description, location, starts_at, ends_at, all_day, time_zone, category_id, priority, status, visibility, recurrence_rule, recurrence_until, recurrence_exceptions, version, created_at, updated_at, deleted_at')
        .eq('id', eventId)
        .maybeSingle<EventRow>()

      return {
        ok: false,
        conflict: true,
        current: current ? mapEventRow(current, 'shared') : null,
      }
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
      const { error } = await client()
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
      throwIf(error)
    },
  }
}
