const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created'
const USERINFO_SCOPE = 'https://www.googleapis.com/auth/userinfo.email'

export type GoogleTokens = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type: string
}

export type MicroaxisGoogleEvent = {
  id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  all_day: boolean
  time_zone: string
  recurrence_rule: string | null
  status: string
  deleted_at: string | null
}

export function googleConfig() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')

  if (!clientId || !clientSecret) {
    return null
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/app/google/callback`,
    appUrl,
  }
}

export function googleConsentUrl(state: string) {
  const config = googleConfig()
  if (!config) throw new Error('Google OAuth is not configured')

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: `${CALENDAR_SCOPE} ${USERINFO_SCOPE}`,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const config = googleConfig()
  if (!config) throw new Error('Google OAuth is not configured')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status})`)
  }
  return response.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const config = googleConfig()
  if (!config) throw new Error('Google OAuth is not configured')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error(`Google token refresh failed (${response.status})`)
  }
  return response.json()
}

export async function getGoogleEmail(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null
  const data = (await response.json()) as { email?: string; id?: string }
  return data
}

export async function createMicroaxisCalendar(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: 'MicroAxis',
      description: 'Events exported from MicroAxis Calendar.',
      timeZone: 'Asia/Manila',
    }),
  })

  if (!response.ok) {
    throw new Error(`Could not create the MicroAxis Google calendar (${response.status})`)
  }
  return (await response.json()) as { id: string }
}

export function googleEventBody(event: MicroaxisGoogleEvent, calendarKind: string) {
  const recurrence = event.recurrence_rule ? [`RRULE:${event.recurrence_rule}`] : undefined
  const isAllDay = event.all_day

  return {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    status: event.status === 'cancelled' || event.deleted_at ? 'cancelled' : 'confirmed',
    start: isAllDay
      ? { date: event.starts_at.slice(0, 10) }
      : { dateTime: event.starts_at, timeZone: event.time_zone },
    end: isAllDay
      ? { date: event.ends_at.slice(0, 10) }
      : { dateTime: event.ends_at, timeZone: event.time_zone },
    recurrence,
    extendedProperties: {
      private: {
        microaxis_event_id: event.id,
        microaxis_calendar_kind: calendarKind,
      },
    },
  }
}

export async function insertGoogleEvent(
  accessToken: string,
  calendarId: string,
  body: unknown,
) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
  if (!response.ok) throw new Error(`Google insert failed (${response.status})`)
  return (await response.json()) as { id: string }
}

export async function patchGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  body: unknown,
) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
  if (response.status === 404 || response.status === 410) return null
  if (!response.ok) throw new Error(`Google update failed (${response.status})`)
  return (await response.json()) as { id: string }
}

export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  if (response.status === 404 || response.status === 410) return
  if (!response.ok) throw new Error(`Google delete failed (${response.status})`)
}
