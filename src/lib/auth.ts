import type { User } from '@supabase/supabase-js'
import type { Profile, WorkspaceRole } from '../types/domain'
import { supabase } from './supabase'

const CONFIGURATION_ERROR =
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.'

export type AuthResult = { error: string | null }

export function isAuthConfigured() {
  return supabase !== null
}

function redirectTo(path: string) {
  return `${window.location.origin}${path}`
}

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return { error: CONFIGURATION_ERROR }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo('/auth/callback'),
    },
  })

  return { error: error?.message ?? null }
}

export async function signInWithMagicLink(email: string): Promise<AuthResult> {
  const trimmed = email.trim().toLowerCase()

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    return { error: 'Enter a valid email address' }
  }

  if (!supabase) return { error: CONFIGURATION_ERROR }

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      emailRedirectTo: redirectTo('/auth/callback'),
    },
  })

  return { error: error?.message ?? null }
}

export async function signOut() {
  await supabase?.auth.signOut()
}

export async function loadProfile(user: User): Promise<Profile | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, timezone, week_starts_on, clock_24h')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error

  if (data) {
    return {
      id: data.id,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      timezone: data.timezone,
      weekStartsOn: data.week_starts_on === 0 ? 0 : 1,
      clock24h: data.clock_24h,
    }
  }

  const metadata = user.user_metadata as Record<string, unknown>
  const fullName =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    user.email?.split('@')[0] ||
    'MicroAxis member'

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: fullName,
      avatar_url: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
      timezone: 'Asia/Manila',
      week_starts_on: 1,
      clock_24h: false,
    })
    .select('id, full_name, avatar_url, timezone, week_starts_on, clock_24h')
    .single()

  if (createError) throw createError
  if (!created) return null

  return {
    id: created.id,
    fullName: created.full_name,
    avatarUrl: created.avatar_url,
    timezone: created.timezone,
    weekStartsOn: created.week_starts_on === 0 ? 0 : 1,
    clock24h: created.clock_24h,
  }
}

export async function acceptInvite(
  token: string,
): Promise<{ error: string | null; workspaceId?: string }> {
  if (!supabase) return { error: CONFIGURATION_ERROR }

  const { data, error } = await supabase.rpc('accept_workspace_invite', {
    p_token: token,
  })

  if (error) return { error: error.message }
  return { error: null, workspaceId: typeof data === 'string' ? data : undefined }
}

export async function createWorkspaceInvite(input: {
  workspaceId: string
  email: string
  role: WorkspaceRole
  teamId?: string | null
}): Promise<{ error: string | null; invite?: { id: string; token: string } }> {
  if (!supabase) return { error: CONFIGURATION_ERROR }

  const { data, error } = await supabase.rpc('create_workspace_invite', {
    p_workspace_id: input.workspaceId,
    p_email: input.email.trim().toLowerCase(),
    p_role: input.role,
    p_team_id: input.teamId ?? null,
  })

  if (error) return { error: error.message }

  const row = Array.isArray(data) ? data[0] : data
  if (!row?.id || !row?.token) return { error: 'The invitation could not be created' }

  return { error: null, invite: { id: row.id, token: row.token } }
}

export function inviteUrl(token: string) {
  return `${window.location.origin}/invite/${token}`
}
