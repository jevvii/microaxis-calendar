-- Calendar CRUD
create or replace function public.create_calendar(
  p_workspace_id uuid,
  p_name text,
  p_description text,
  p_kind public.calendar_kind,
  p_team_id uuid,
  p_color text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_calendar uuid;
  v_team_workspace uuid;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  if not public.is_workspace_member(p_workspace_id, v_user) then
    raise exception 'You are not a member of this workspace';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'Add a calendar name'; end if;
  if p_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Use a six-digit hex color'; end if;

  if p_kind = 'personal' then
    null;
  elsif p_kind = 'team' then
    select workspace_id into v_team_workspace
    from public.teams where id = p_team_id and deleted_at is null;
    if v_team_workspace is distinct from p_workspace_id then
      raise exception 'That team is not part of this workspace';
    end if;
    if public.workspace_role(p_workspace_id, v_user) not in ('owner', 'admin')
      and public.team_role(p_team_id, v_user) <> 'lead' then
      raise exception 'Only team leads or workspace admins can create a team calendar';
    end if;
  elsif p_kind = 'workspace' then
    if public.workspace_role(p_workspace_id, v_user) not in ('owner', 'admin') then
      raise exception 'Only workspace owners or admins can create a workspace calendar';
    end if;
  end if;

  insert into public.calendars (
    workspace_id, owner_id, team_id, name, description, kind, color, visibility, created_by
  )
  values (
    p_workspace_id,
    case when p_kind = 'personal' then v_user else null end,
    case when p_kind = 'team' then p_team_id else null end,
    trim(p_name),
    nullif(trim(p_description), ''),
    p_kind,
    p_color,
    (case when p_kind = 'personal' then 'private' when p_kind = 'team' then 'team' else 'workspace' end)::public.calendar_visibility,
    v_user
  )
  returning id into v_calendar;

  return v_calendar;
end;
$$;

create or replace function public.update_calendar(
  p_calendar_id uuid,
  p_name text,
  p_description text,
  p_color text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  if not public.can_manage_calendar(p_calendar_id, v_user) then
    raise exception 'Only calendar managers can edit this calendar';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'Add a calendar name'; end if;
  if p_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Use a six-digit hex color'; end if;

  update public.calendars
  set name = trim(p_name),
      description = nullif(trim(p_description), ''),
      color = p_color,
      updated_at = now()
  where id = p_calendar_id and deleted_at is null;
end;
$$;

create or replace function public.delete_calendar(p_calendar_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  if not public.can_manage_calendar(p_calendar_id, v_user) then
    raise exception 'Only calendar managers can delete this calendar';
  end if;
  update public.calendars set deleted_at = now() where id = p_calendar_id;
end;
$$;

-- Team CRUD
create or replace function public.save_team(
  p_team_id uuid,
  p_workspace_id uuid,
  p_name text,
  p_description text,
  p_color text,
  p_lead_ids uuid[],
  p_member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_team uuid := p_team_id;
  v_existing_workspace uuid;
  v_member uuid;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Add a team name'; end if;
  if p_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Use a six-digit hex color'; end if;
  if not public.is_workspace_member(p_workspace_id, v_user) then
    raise exception 'You are not a member of this workspace';
  end if;

  if v_team is null then
    if public.workspace_role(p_workspace_id, v_user) not in ('owner', 'admin') then
      raise exception 'Only workspace owners or admins can create teams';
    end if;
    insert into public.teams (workspace_id, name, description, color, created_by)
    values (p_workspace_id, trim(p_name), nullif(trim(p_description), ''), p_color, v_user)
    returning id into v_team;
  else
    select workspace_id into v_existing_workspace from public.teams where id = v_team and deleted_at is null;
    if v_existing_workspace is distinct from p_workspace_id then
      raise exception 'Team not found in this workspace';
    end if;
    if public.workspace_role(p_workspace_id, v_user) not in ('owner', 'admin')
      and public.team_role(v_team, v_user) <> 'lead' then
      raise exception 'Only team leads or workspace admins can edit this team';
    end if;
    update public.teams
    set name = trim(p_name),
        description = nullif(trim(p_description), ''),
        color = p_color,
        updated_at = now()
    where id = v_team;
    delete from public.team_members where team_id = v_team;
  end if;

  for v_member in select distinct unnest(p_lead_ids) loop
    if not public.is_workspace_member(p_workspace_id, v_member) then
      raise exception 'A team lead must be a workspace member';
    end if;
    insert into public.team_members (team_id, user_id, role)
    values (v_team, v_member, 'lead')
    on conflict (team_id, user_id) do update set role = 'lead';
  end loop;

  for v_member in
    select distinct unnest(p_member_ids)
    except
    select distinct unnest(p_lead_ids)
  loop
    if not public.is_workspace_member(p_workspace_id, v_member) then
      raise exception 'A team member must be a workspace member';
    end if;
    insert into public.team_members (team_id, user_id, role)
    values (v_team, v_member, 'member')
    on conflict (team_id, user_id) do update set role = 'member';
  end loop;

  return v_team;
end;
$$;

create or replace function public.delete_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_workspace uuid;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  select workspace_id into v_workspace from public.teams where id = p_team_id and deleted_at is null;
  if v_workspace is null then raise exception 'Team not found'; end if;
  if public.workspace_role(v_workspace, v_user) not in ('owner', 'admin') then
    raise exception 'Only workspace owners or admins can delete teams';
  end if;
  update public.teams set deleted_at = now() where id = p_team_id;
end;
$$;

-- Workspace members
create or replace function public.update_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid,
  p_role public.workspace_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.workspace_role;
  v_target_role public.workspace_role;
begin
  if v_actor is null then raise exception 'You need to be signed in'; end if;
  v_actor_role := public.workspace_role(p_workspace_id, v_actor);
  if v_actor_role not in ('owner', 'admin') then
    raise exception 'Only workspace owners or admins can change roles';
  end if;
  select role into v_target_role from public.workspace_members
  where workspace_id = p_workspace_id and user_id = p_user_id;
  if v_target_role is null then raise exception 'Workspace member not found'; end if;
  if v_actor_role = 'admin' and (v_target_role = 'owner' or p_role = 'owner') then
    raise exception 'Only an owner can grant or change the owner role';
  end if;
  update public.workspace_members set role = p_role
  where workspace_id = p_workspace_id and user_id = p_user_id;
end;
$$;

create or replace function public.remove_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.workspace_role;
  v_target_role public.workspace_role;
begin
  if v_actor is null then raise exception 'You need to be signed in'; end if;
  v_actor_role := public.workspace_role(p_workspace_id, v_actor);
  if v_actor_role not in ('owner', 'admin') then
    raise exception 'Only workspace owners or admins can remove members';
  end if;
  select role into v_target_role from public.workspace_members
  where workspace_id = p_workspace_id and user_id = p_user_id;
  if v_target_role is null then return; end if;
  if v_actor_role = 'admin' and v_target_role = 'owner' then
    raise exception 'Only an owner can remove an owner';
  end if;
  delete from public.workspace_members
  where workspace_id = p_workspace_id and user_id = p_user_id;
end;
$$;

-- Calendar shares
create or replace function public.upsert_calendar_share(
  p_calendar_id uuid,
  p_subject_type public.share_subject,
  p_subject_id uuid,
  p_role public.calendar_role,
  p_hide_details boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_share uuid;
  v_kind public.calendar_kind;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  if not public.can_manage_calendar(p_calendar_id, v_user) then
    raise exception 'Only calendar managers can share this calendar';
  end if;
  if p_role = 'manager' then raise exception 'Manager access cannot be granted by share'; end if;
  if not public.calendar_share_subject_allowed(p_calendar_id, p_subject_type, p_subject_id) then
    raise exception 'That recipient is not part of this workspace';
  end if;
  select kind into v_kind from public.calendars where id = p_calendar_id;
  if v_kind = 'personal' and p_role = 'editor' then
    raise exception 'Personal calendars can only be shared as viewer or participant';
  end if;

  insert into public.calendar_shares (
    calendar_id, subject_type, subject_id, role, hide_details, created_by
  )
  values (p_calendar_id, p_subject_type, p_subject_id, p_role, p_hide_details, v_user)
  on conflict (calendar_id, subject_type, subject_id) do update
  set role = excluded.role, hide_details = excluded.hide_details
  returning id into v_share;

  return v_share;
end;
$$;

create or replace function public.delete_calendar_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_calendar uuid;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  select calendar_id into v_calendar from public.calendar_shares where id = p_share_id;
  if v_calendar is null then return; end if;
  if not public.can_manage_calendar(v_calendar, v_user) then
    raise exception 'Only calendar managers can revoke a share';
  end if;
  delete from public.calendar_shares where id = p_share_id;
end;
$$;

revoke all on function public.create_calendar(uuid, text, text, public.calendar_kind, uuid, text) from public, anon;
revoke all on function public.update_calendar(uuid, text, text, text) from public, anon;
revoke all on function public.delete_calendar(uuid) from public, anon;
revoke all on function public.save_team(uuid, uuid, text, text, text, uuid[], uuid[]) from public, anon;
revoke all on function public.delete_team(uuid) from public, anon;
revoke all on function public.update_workspace_member(uuid, uuid, public.workspace_role) from public, anon;
revoke all on function public.remove_workspace_member(uuid, uuid) from public, anon;
revoke all on function public.upsert_calendar_share(uuid, public.share_subject, uuid, public.calendar_role, boolean) from public, anon;
revoke all on function public.delete_calendar_share(uuid) from public, anon;

grant execute on function public.create_calendar(uuid, text, text, public.calendar_kind, uuid, text) to authenticated;
grant execute on function public.update_calendar(uuid, text, text, text) to authenticated;
grant execute on function public.delete_calendar(uuid) to authenticated;
grant execute on function public.save_team(uuid, uuid, text, text, text, uuid[], uuid[]) to authenticated;
grant execute on function public.delete_team(uuid) to authenticated;
grant execute on function public.update_workspace_member(uuid, uuid, public.workspace_role) to authenticated;
grant execute on function public.remove_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.upsert_calendar_share(uuid, public.share_subject, uuid, public.calendar_role, boolean) to authenticated;
grant execute on function public.delete_calendar_share(uuid) to authenticated;
