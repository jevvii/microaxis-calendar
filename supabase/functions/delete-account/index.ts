import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing authorization' }, 401)
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.getUser(authorization.replace('Bearer ', ''))
  if (error || !data.user) return jsonResponse({ error: 'Invalid session' }, 401)

  const { data: ownedWorkspaces, error: membershipError } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', data.user.id)
    .eq('role', 'owner')

  if (membershipError) return jsonResponse({ error: membershipError.message }, 500)

  for (const row of ownedWorkspaces ?? []) {
    const { count, error: countError } = await admin
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', row.workspace_id)
      .eq('role', 'owner')

    if (countError) return jsonResponse({ error: countError.message }, 500)
    if ((count ?? 0) <= 1) {
      return jsonResponse(
        {
          error:
            'Transfer ownership of every workspace where you are the only Owner before deleting your account.',
        },
        409,
      )
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) return jsonResponse({ error: deleteError.message }, 500)

  return jsonResponse({ ok: true })
})
