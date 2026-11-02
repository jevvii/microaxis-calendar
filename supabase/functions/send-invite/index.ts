import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

type InviteRow = {
  id: string
  email: string
  token: string
  workspace_id: string
  accepted_at: string | null
  expires_at: string
  workspaces: { name: string } | { name: string }[] | null
}

function workspaceName(invite: InviteRow) {
  if (Array.isArray(invite.workspaces)) return invite.workspaces[0]?.name ?? 'a MicroAxis workspace'
  return invite.workspaces?.name ?? 'a MicroAxis workspace'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing authorization' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase function environment is incomplete' }, 503)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const token = authorization.replace('Bearer ', '')
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) {
    return jsonResponse({ error: 'Invalid session' }, 401)
  }

  let payload: { inviteId?: string }
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'Expected an inviteId' }, 400)
  }

  if (!payload.inviteId) {
    return jsonResponse({ error: 'Expected an inviteId' }, 400)
  }

  const { data: invite, error: inviteError } = await admin
    .from('workspace_invites')
    .select('id, email, token, workspace_id, accepted_at, expires_at, workspaces(name)')
    .eq('id', payload.inviteId)
    .single<InviteRow>()

  if (inviteError || !invite) {
    return jsonResponse({ error: 'Invitation not found' }, 404)
  }

  if (invite.accepted_at) {
    return jsonResponse({ error: 'Invitation was already accepted' }, 409)
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return jsonResponse({ error: 'Invitation has expired' }, 410)
  }

  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', invite.workspace_id)
    .eq('user_id', userData.user.id)
    .maybeSingle<{ role: string }>()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return jsonResponse({ error: 'Only workspace owners and admins can send invitations' }, 403)
  }

  const brevoKey = Deno.env.get('BREVO_API_KEY')
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL')
  const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? 'MicroAxis Calendar'
  const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')

  if (!brevoKey || !senderEmail) {
    return jsonResponse(
      {
        error:
          'Brevo is not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL on the send-invite function.',
      },
      503,
    )
  }

  const inviteLink = `${appUrl}/invite/${invite.token}`
  const name = workspaceName(invite)

  const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: invite.email }],
      subject: `Join ${name} on MicroAxis Calendar`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #141411; line-height: 1.6; max-width: 520px;">
          <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #76766c;">MicroAxis Calendar</p>
          <h1 style="font-size: 24px; letter-spacing: -0.03em;">You have been invited to ${name}.</h1>
          <p>Use the link below to join the workspace. It expires in seven days.</p>
          <p style="margin: 24px 0;">
            <a href="${inviteLink}" style="background: #141411; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none;">Accept invitation</a>
          </p>
          <p style="font-size: 12px; color: #76766c;">If the button does not work, open ${inviteLink}</p>
        </div>
      `,
      textContent: `You have been invited to ${name} on MicroAxis Calendar.\n\nAccept the invitation: ${inviteLink}\n\nThis link expires in seven days.`,
    }),
  })

  if (!emailResponse.ok) {
    const detail = await emailResponse.text()
    return jsonResponse(
      { error: 'Brevo rejected the invitation email', detail: detail.slice(0, 500) },
      502,
    )
  }

  return jsonResponse({ ok: true })
})
