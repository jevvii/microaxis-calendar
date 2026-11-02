create or replace function public.create_workspace_with_owner(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_workspace uuid;
  v_slug text := lower(trim(p_slug));
begin
  if v_user is null then
    raise exception 'You need to be signed in';
  end if;

  if char_length(trim(p_name)) < 2 then
    raise exception 'Workspace name is too short';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Workspace address must use lowercase letters, numbers, and hyphens';
  end if;

  if exists (select 1 from public.workspaces where slug = v_slug) then
    raise exception 'That workspace address is already taken';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (trim(p_name), v_slug, v_user)
  returning id into v_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace, v_user, 'owner');

  insert into public.calendars (
    workspace_id, owner_id, name, kind, color, visibility, created_by
  )
  values (
    v_workspace, v_user, 'My calendar', 'personal', '#0C7A43', 'private', v_user
  );

  insert into public.event_categories (workspace_id, name, color, icon)
  values
    (v_workspace, 'Meeting', '#2F5D78', 'users'),
    (v_workspace, 'Deadline', '#8B4039', 'flag'),
    (v_workspace, 'Milestone', '#3F5C3A', 'diamond'),
    (v_workspace, 'Leave', '#7A5A1F', 'airplane'),
    (v_workspace, 'Focus', '#6E5140', 'target'),
    (v_workspace, 'Holiday', '#5D5D54', 'sun'),
    (v_workspace, 'Other', '#67675E', 'dots');

  return v_workspace;
end;
$$;

create or replace function public.accept_workspace_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invite public.workspace_invites%rowtype;
begin
  if v_user is null then
    raise exception 'You need to be signed in';
  end if;

  select *
  into v_invite
  from public.workspace_invites
  where token = p_token
    and accepted_at is null
    and expires_at > now()
    and lower(email) = v_email
  for update;

  if not found then
    raise exception 'This invitation is invalid or has expired';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, v_user, v_invite.role)
  on conflict (workspace_id, user_id) do nothing;

  if v_invite.team_id is not null then
    insert into public.team_members (team_id, user_id, role)
    values (v_invite.team_id, v_user, 'member')
    on conflict (team_id, user_id) do nothing;
  end if;

  update public.workspace_invites
  set accepted_at = now()
  where id = v_invite.id;

  return v_invite.workspace_id;
end;
$$;

create or replace function public.create_workspace_invite(
  p_workspace_id uuid,
  p_email text,
  p_role public.workspace_role default 'member',
  p_team_id uuid default null
)
returns table (id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_invite_id uuid;
begin
  if v_user is null then
    raise exception 'You need to be signed in';
  end if;

  if public.workspace_role(p_workspace_id, v_user) not in ('owner', 'admin') then
    raise exception 'Only workspace owners and admins can invite people';
  end if;

  if p_role = 'owner' then
    raise exception 'Ownership cannot be granted by invitation';
  end if;

  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address';
  end if;

  if p_team_id is not null and not exists (
    select 1 from public.teams t
    where t.id = p_team_id
      and t.workspace_id = p_workspace_id
      and t.deleted_at is null
  ) then
    raise exception 'That team is not part of this workspace';
  end if;

  insert into public.workspace_invites as wi (
    workspace_id, team_id, email, role, token, invited_by, expires_at
  )
  values (
    p_workspace_id,
    p_team_id,
    lower(trim(p_email)),
    p_role,
    v_token,
    v_user,
    now() + interval '7 days'
  )
  returning wi.id into v_invite_id;

  return query select v_invite_id, v_token;
end;
$$;

revoke all on function public.create_workspace_with_owner(text, text) from public, anon;
revoke all on function public.accept_workspace_invite(text) from public, anon;
revoke all on function public.create_workspace_invite(uuid, text, public.workspace_role, uuid) from public, anon;

grant execute on function public.create_workspace_with_owner(text, text) to authenticated;
grant execute on function public.accept_workspace_invite(text) to authenticated;
grant execute on function public.create_workspace_invite(uuid, text, public.workspace_role, uuid) to authenticated;
