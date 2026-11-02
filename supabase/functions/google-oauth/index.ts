import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { encryptToken } from '../_shared/crypto.ts'
import {
  createMicroaxisCalendar,
  exchangeCode,
  getGoogleEmail,
  googleConfig,
  googleConsentUrl,
} from '../_shared/google.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing authorization' }, 401)
  }

  if (!googleConfig()) {
    return jsonResponse(
      {
        error:
          'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the function.',
      },
      503,
    )
  }

  const admin = createAdminClient()
  const { data: userData, error: userError } = await admin.auth.getUser(
    authorization.replace('Bearer ', ''),
  )
  if (userError || !userData.user) return jsonResponse({ error: 'Invalid session' }, 401)

  let payload: {
    action?: 'start' | 'exchange' | 'disconnect'
    code?: string
    state?: string
  }
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'Expected a JSON body' }, 400)
  }

  if (payload.action === 'start') {
    const state = crypto.randomUUID().replaceAll('-', '')
    const { error } = await admin.from('google_oauth_states').insert({
      state,
      user_id: userData.user.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ url: googleConsentUrl(state) })
  }

  if (payload.action === 'disconnect') {
    const { error } = await admin
      .from('google_connections')
      .delete()
      .eq('user_id', userData.user.id)
    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ ok: true })
  }

  if (payload.action === 'exchange') {
    if (!payload.code || !payload.state) {
      return jsonResponse({ error: 'Missing code or state' }, 400)
    }

    const { data: stateRow, error: stateError } = await admin
      .from('google_oauth_states')
      .select('state, user_id, expires_at')
      .eq('state', payload.state)
      .eq('user_id', userData.user.id)
      .maybeSingle<{ state: string; user_id: string; expires_at: string }>()

    if (stateError) return jsonResponse({ error: stateError.message }, 500)
    if (!stateRow || new Date(stateRow.expires_at).getTime() < Date.now()) {
      return jsonResponse({ error: 'OAuth state is invalid or expired' }, 400)
    }

    await admin.from('google_oauth_states').delete().eq('state', payload.state)

    try {
      const tokens = await exchangeCode(payload.code)
      const existing = await admin
        .from('google_connections')
        .select('google_calendar_id, refresh_token_encrypted, google_email')
        .eq('user_id', userData.user.id)
        .maybeSingle<{
          google_calendar_id: string | null
          refresh_token_encrypted: string | null
          google_email: string | null
        }>()

      const googleCalendarId =
        existing.data?.google_calendar_id ??
        (await createMicroaxisCalendar(tokens.access_token)).id
      const identity = await getGoogleEmail(tokens.access_token)

      const refreshTokenEncrypted = tokens.refresh_token
        ? await encryptToken(tokens.refresh_token)
        : existing.data?.refresh_token_encrypted ?? null

      const accessTokenEncrypted = await encryptToken(tokens.access_token)

      const { error: upsertError } = await admin.from('google_connections').upsert({
        user_id: userData.user.id,
        google_sub: identity?.id ?? null,
        google_email: identity?.email ?? existing.data?.google_email ?? null,
        google_calendar_id: googleCalendarId,
        access_token_encrypted: accessTokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope ?? null,
        sync_enabled: true,
      })

      if (upsertError) return jsonResponse({ error: upsertError.message }, 500)

      return jsonResponse({ connected: true, googleCalendarId })
    } catch (reason) {
      return jsonResponse(
        { error: reason instanceof Error ? reason.message : 'Google connection failed' },
        502,
      )
    }
  }

  return jsonResponse({ error: 'Unknown action' }, 400)
})
