import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { decryptToken, encryptToken } from '../_shared/crypto.ts'
import {
  deleteGoogleEvent,
  googleConfig,
  googleEventBody,
  insertGoogleEvent,
  patchGoogleEvent,
  refreshAccessToken,
  type MicroaxisGoogleEvent,
} from '../_shared/google.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

type Connection = {
  user_id: string
  google_calendar_id: string | null
  refresh_token_encrypted: string | null
  token_expires_at: string | null
  sync_enabled: boolean
}

type EventRow = MicroaxisGoogleEvent & {
  calendar_id: string
  created_by: string | null
  visibility: 'calendar' | 'participants' | 'private'
  export_to_google: boolean
}

type CalendarRow = {
  id: string
  kind: string
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  if (!googleConfig()) {
    return jsonResponse(
      {
        error:
          'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      },
      503,
    )
  }

  const admin = createAdminClient()
  const authorization = request.headers.get('Authorization') ?? ''
  const cronSecret = Deno.env.get('CRON_SECRET')
  const isCron = Boolean(cronSecret && authorization === `Bearer ${cronSecret}`)

  let userId: string | null = null
  if (!isCron) {
    const { data, error } = await admin.auth.getUser(authorization.replace('Bearer ', ''))
    if (error || !data.user) return jsonResponse({ error: 'Invalid session' }, 401)
    userId = data.user.id
  }

  let connectionQuery = admin
    .from('google_connections')
    .select(
      'user_id, google_calendar_id, refresh_token_encrypted, token_expires_at, sync_enabled',
    )
    .eq('sync_enabled', true)

  if (userId) connectionQuery = connectionQuery.eq('user_id', userId)

  const { data: connections, error: connectionError } =
    await connectionQuery.returns<Connection[]>()

  if (connectionError) return jsonResponse({ error: connectionError.message }, 500)
  if (!connections?.length) return jsonResponse({ ok: true, synced: 0 })

  let synced = 0
  const errors: string[] = []

  for (const connection of connections) {
    if (!connection.google_calendar_id || !connection.refresh_token_encrypted) {
      continue
    }

    try {
      const refreshToken = await decryptToken(connection.refresh_token_encrypted)
      const tokens = await refreshAccessToken(refreshToken)
      const accessToken = tokens.access_token
      await admin
        .from('google_connections')
        .update({
          access_token_encrypted: await encryptToken(accessToken),
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('user_id', connection.user_id)

      const { data: preferences, error: preferenceError } = await admin
        .from('calendar_export_preferences')
        .select('calendar_id')
        .eq('user_id', connection.user_id)
        .eq('enabled', true)

      if (preferenceError) throw new Error(preferenceError.message)

      const preferredCalendarIds = (preferences ?? []).map(
        (preference: { calendar_id: string }) => preference.calendar_id,
      )
      const calendarIds: string[] = []
      for (const calendarId of preferredCalendarIds) {
        const { data: fullDetails } = await admin.rpc('calendar_has_full_details', {
          p_calendar_id: calendarId,
          p_user_id: connection.user_id,
        })
        if (fullDetails === true) calendarIds.push(calendarId)
      }
      if (calendarIds.length === 0) continue

      const { data: calendarRows } = await admin
        .from('calendars')
        .select('id, kind')
        .in('id', calendarIds)
        .is('deleted_at', null)
        .returns<CalendarRow[]>()

      const calendarKinds = new Map(
        (calendarRows ?? []).map((calendar) => [calendar.id, calendar.kind]),
      )

      const { data: activeEvents, error: eventError } = await admin
        .from('events')
        .select(
          'id, calendar_id, created_by, visibility, title, description, location, starts_at, ends_at, all_day, time_zone, recurrence_rule, status, deleted_at, export_to_google',
        )
        .in('calendar_id', calendarIds)
        .is('deleted_at', null)
        .eq('export_to_google', true)
        .returns<EventRow[]>()

      if (eventError) throw new Error(eventError.message)

      const { data: mappings, error: mappingError } = await admin
        .from('google_event_links')
        .select('id, event_id, google_calendar_id, google_event_id')
        .eq('user_id', connection.user_id)

      if (mappingError) throw new Error(mappingError.message)

      const eventIds = (activeEvents ?? []).map((event) => event.id)
      const { data: participantRows } = eventIds.length
        ? await admin
            .from('event_participants')
            .select('event_id')
            .eq('user_id', connection.user_id)
            .in('event_id', eventIds)
        : { data: [] }
      const participantEventIds = new Set(
        (participantRows ?? []).map((row: { event_id: string }) => row.event_id),
      )

      const visibleEvents = (activeEvents ?? []).filter((event) => {
        if (event.visibility === 'private') return event.created_by === connection.user_id
        if (event.visibility === 'participants') {
          return (
            event.created_by === connection.user_id ||
            participantEventIds.has(event.id)
          )
        }
        return true
      })

      const activeIds = new Set(visibleEvents.map((event) => event.id))
      for (const mapping of mappings ?? []) {
        if (!activeIds.has(mapping.event_id)) {
          await deleteGoogleEvent(
            accessToken,
            mapping.google_calendar_id,
            mapping.google_event_id,
          )
          await admin.from('google_event_links').delete().eq('id', mapping.id)
        }
      }

      for (const event of visibleEvents) {
        const existing = (mappings ?? []).find(
          (mapping) => mapping.event_id === event.id,
        )
        const body = googleEventBody(
          event,
          calendarKinds.get(event.calendar_id) ?? 'shared',
        )

        try {
          if (existing) {
            const patched = await patchGoogleEvent(
              accessToken,
              existing.google_calendar_id,
              existing.google_event_id,
              body,
            )
            if (!patched) {
              const inserted = await insertGoogleEvent(
                accessToken,
                connection.google_calendar_id,
                body,
              )
              await admin
                .from('google_event_links')
                .update({
                  google_event_id: inserted.id,
                  sync_status: 'synced',
                  last_synced_at: new Date().toISOString(),
                  error: null,
                })
                .eq('id', existing.id)
            } else {
              await admin
                .from('google_event_links')
                .update({
                  sync_status: 'synced',
                  last_synced_at: new Date().toISOString(),
                  error: null,
                })
                .eq('id', existing.id)
            }
          } else {
            const inserted = await insertGoogleEvent(
              accessToken,
              connection.google_calendar_id,
              body,
            )
            await admin.from('google_event_links').insert({
              user_id: connection.user_id,
              event_id: event.id,
              google_calendar_id: connection.google_calendar_id,
              google_event_id: inserted.id,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            })
          }
          synced += 1
        } catch (reason) {
          const message = reason instanceof Error ? reason.message : 'Google sync failed'
          errors.push(`${event.id}: ${message}`)
          if (existing) {
            await admin
              .from('google_event_links')
              .update({ sync_status: 'failed', error: message })
              .eq('id', existing.id)
          }
        }
      }
    } catch (reason) {
      errors.push(
        `${connection.user_id}: ${reason instanceof Error ? reason.message : 'sync failed'}`,
      )
    }
  }

  return jsonResponse({ ok: errors.length === 0, synced, errors: errors.slice(0, 20) }, 200)
})
