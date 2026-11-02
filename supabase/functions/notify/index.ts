import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { sendBrevoEmail } from '../_shared/brevo.ts'
import { occurrencesBetween } from '../_shared/recurrence.ts'
import { sendWebPush } from '../_shared/webpush.ts'
import { reminderEmail } from '../_shared/templates.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

type EventRow = {
  id: string
  workspace_id: string
  calendar_id: string
  created_by: string | null
  title: string
  location: string | null
  starts_at: string
  ends_at: string
  all_day: boolean
  time_zone: string
  recurrence_rule: string | null
  recurrence_until: string | null
  recurrence_exceptions: unknown
  status: string
  visibility: string
}

type ProfileRow = {
  id: string
  full_name: string
  timezone: string
  notification_preferences: {
    reminders?: boolean
    email?: boolean
    push?: boolean
    quietHoursStart?: string
    quietHoursEnd?: string
  } | null
}

type OutboxRow = {
  id: string
  notification_id: string
  channel: 'in_app' | 'email' | 'push'
  attempts: number
  notifications: {
    id: string
    user_id: string
    title: string
    body: string | null
    href: string | null
    metadata: Record<string, unknown> | null
  } | null
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
  }
}

function minutes(value: string) {
  const [hours, mins] = value.split(':').map(Number)
  return (hours || 0) * 60 + (mins || 0)
}

function isQuietNow(date: Date, timeZone: string, preferences: ProfileRow['notification_preferences']) {
  if (!preferences) return false
  const start = minutes(preferences.quietHoursStart ?? '22:00')
  const end = minutes(preferences.quietHoursEnd ?? '08:00')
  const current = localParts(date, timeZone)
  const currentMinutes = current.hour * 60 + current.minute
  if (start === end) return false
  if (start < end) return currentMinutes >= start && currentMinutes < end
  return currentMinutes >= start || currentMinutes < end
}

function nextMorning(date: Date, timeZone: string) {
  const local = localParts(date, timeZone)
  const localNow = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute)
  let target = Date.UTC(local.year, local.month - 1, local.day, 8, 0)
  if (localNow >= target) target += 86_400_000
  return new Date(date.getTime() + (target - localNow))
}

function formatWhen(occurrence: Date, timeZone: string, allDay: boolean) {
  if (allDay) {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(occurrence)
  }
  return new Intl.DateTimeFormat('en-PH', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(occurrence)
}

async function processReminders(admin: ReturnType<typeof createAdminClient>) {
  const now = new Date()
  const rangeStart = new Date(now.getTime() - 60_000)
  const rangeEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const { data: events, error } = await admin
    .from('events')
    .select(
      'id, workspace_id, calendar_id, created_by, title, location, starts_at, ends_at, all_day, time_zone, recurrence_rule, recurrence_until, recurrence_exceptions, status, visibility',
    )
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .lt('starts_at', rangeEnd.toISOString())
    .returns<EventRow[]>()

  if (error) throw new Error(error.message)

  let created = 0

  for (const event of events ?? []) {
    const occurrences = occurrencesBetween(
      {
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        all_day: event.all_day,
        time_zone: event.time_zone,
        recurrence_rule: event.recurrence_rule,
        recurrence_until: event.recurrence_until,
        recurrence_exceptions: event.recurrence_exceptions,
      },
      rangeStart,
      rangeEnd,
    )

    for (const occurrence of occurrences) {
      for (const minutesBefore of [1440, 60]) {
        const trigger = occurrence.getTime() - minutesBefore * 60_000
        if (now.getTime() < trigger || now.getTime() >= trigger + 90_000) continue

        const { data: recipientIds, error: recipientError } = await admin.rpc(
          'event_recipient_ids',
          { p_event_id: event.id },
        )
        if (recipientError) throw new Error(recipientError.message)

        const ids = (recipientIds ?? []) as string[]
        if (ids.length === 0) continue

        const { data: profiles, error: profileError } = await admin
          .from('profiles')
          .select('id, full_name, timezone, notification_preferences')
          .in('id', ids)
          .returns<ProfileRow[]>()

        if (profileError) throw new Error(profileError.message)

        for (const profile of profiles ?? []) {
          const preferences = profile.notification_preferences
          if (preferences?.reminders === false) continue

          const { data: fullDetails } = await admin.rpc('calendar_has_full_details', {
            p_calendar_id: event.calendar_id,
            p_user_id: profile.id,
          })

          const when = formatWhen(occurrence, event.time_zone, event.all_day)
          const title = fullDetails
            ? `${event.title} · ${minutesBefore >= 1440 ? 'tomorrow' : 'in 1 hour'}`
            : `Upcoming event · ${when}`
          const body = fullDetails
            ? `${when}${event.location ? ` · ${event.location}` : ''}`
            : 'A shared calendar has a busy block coming up.'
          const dedupeKey = `reminder:${event.id}:${occurrence.toISOString()}:${minutesBefore}:${profile.id}`
          const scheduledAt = isQuietNow(now, profile.timezone, preferences)
            ? nextMorning(now, profile.timezone).toISOString()
            : now.toISOString()

          const { data: notification, error: notificationError } = await admin
            .from('notifications')
            .upsert(
              {
                workspace_id: event.workspace_id,
                user_id: profile.id,
                type: 'event_reminder',
                title,
                body,
                href: `/app/calendar?event=${event.id}`,
                metadata: {
                  eventId: event.id,
                  occurrenceStart: occurrence.toISOString(),
                  minutesBefore,
                  fullDetails: Boolean(fullDetails),
                },
                dedupe_key: dedupeKey,
              },
              { onConflict: 'dedupe_key', ignoreDuplicates: true },
            )
            .select('id')
            .maybeSingle<{ id: string }>()

          if (notificationError) throw new Error(notificationError.message)
          if (!notification) continue
          created += 1

          if (preferences?.email !== false) {
            await admin.from('notification_outbox').upsert(
              {
                notification_id: notification.id,
                channel: 'email',
                scheduled_at: scheduledAt,
              },
              { onConflict: 'notification_id,channel', ignoreDuplicates: true },
            )
          }

          if (preferences?.push === true) {
            await admin.from('notification_outbox').upsert(
              {
                notification_id: notification.id,
                channel: 'push',
                scheduled_at: scheduledAt,
              },
              { onConflict: 'notification_id,channel', ignoreDuplicates: true },
            )
          }
        }
      }
    }
  }

  return { created }
}

async function processOutbox(admin: ReturnType<typeof createAdminClient>) {
  const now = new Date().toISOString()
  const { data: rows, error } = await admin
    .from('notification_outbox')
    .select(
      'id, notification_id, channel, attempts, notifications(id, user_id, title, body, href, metadata)',
    )
    .in('status', ['pending', 'failed'])
    .lte('scheduled_at', now)
    .lt('attempts', 5)
    .order('scheduled_at', { ascending: true })
    .limit(50)
    .returns<OutboxRow[]>()

  if (error) throw new Error(error.message)

  let sent = 0
  let failed = 0

  for (const row of rows ?? []) {
    await admin
      .from('notification_outbox')
      .update({ status: 'processing', attempts: row.attempts + 1 })
      .eq('id', row.id)

    try {
      const notification = row.notifications
      if (!notification) throw new Error('Notification was not found')

      if (row.channel === 'email') {
        const { data: userData, error: userError } = await admin.auth.admin.getUserById(
          notification.user_id,
        )
        if (userError || !userData.user?.email) throw new Error('Recipient email is unavailable')

        const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
        const busyOnly = notification.metadata?.fullDetails === false
        const message = reminderEmail({
          recipientName: userData.user.email.split('@')[0],
          eventTitle: notification.title,
          when: notification.body ?? 'Your calendar',
          eventUrl: `${appUrl}${notification.href ?? '/app/calendar'}`,
          busyOnly,
        })
        await sendBrevoEmail({
          to: userData.user.email,
          toName: userData.user.email,
          subject: message.subject,
          htmlContent: message.htmlContent,
          textContent: message.textContent,
        })
      } else if (row.channel === 'push') {
        const { data: subscriptions, error: subscriptionError } = await admin
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', notification.user_id)

        if (subscriptionError) throw new Error(subscriptionError.message)
        if (!subscriptions?.length) {
          await admin
            .from('notification_outbox')
            .update({ status: 'skipped', error: 'No push subscription' })
            .eq('id', row.id)
          continue
        }

        let delivered = 0
        for (const subscription of subscriptions) {
          try {
            await sendWebPush(subscription, {
              title: notification.title,
              body: notification.body ?? 'Calendar update',
              url: notification.href ?? '/app/calendar',
              tag: `microaxis-${row.notification_id}`,
            })
            delivered += 1
          } catch (reason) {
            const message = reason instanceof Error ? reason.message : 'push failed'
            if (message.includes('404') || message.includes('410')) {
              await admin
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', subscription.endpoint)
            }
          }
        }

        if (delivered === 0) throw new Error('No push subscription accepted the message')
      } else {
        throw new Error(`Unsupported outbox channel: ${row.channel}`)
      }

      await admin
        .from('notification_outbox')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
        .eq('id', row.id)
      sent += 1
    } catch (reason) {
      failed += 1
      await admin
        .from('notification_outbox')
        .update({
          status: 'failed',
          error: reason instanceof Error ? reason.message : 'delivery failed',
        })
        .eq('id', row.id)
    }
  }

  return { sent, failed }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let payload: { mode?: 'reminders' | 'outbox' } = {}
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  try {
    const admin = createAdminClient()
    const result =
      payload.mode === 'outbox'
        ? await processOutbox(admin)
        : await processReminders(admin)
    return jsonResponse({ ok: true, ...result })
  } catch (reason) {
    return jsonResponse(
      { error: reason instanceof Error ? reason.message : 'Notification worker failed' },
      500,
    )
  }
})
