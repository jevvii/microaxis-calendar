create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_event_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.version is not distinct from old.version then
    new.version = old.version + 1;
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'member@microaxis.local'), '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.log_event_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'created';
    insert into public.event_activity (workspace_id, event_id, actor_id, action, metadata)
    values (
      new.workspace_id,
      new.id,
      coalesce(v_actor, new.created_by),
      v_action,
      jsonb_build_object('title', new.title, 'calendar_id', new.calendar_id)
    );
    return new;
  end if;

  if new.deleted_at is not null and old.deleted_at is null then
    v_action := 'deleted';
  elsif new.status is distinct from old.status then
    v_action := 'status_changed';
  elsif new.visibility is distinct from old.visibility then
    v_action := 'visibility_changed';
  else
    v_action := 'updated';
  end if;

  insert into public.event_activity (workspace_id, event_id, actor_id, action, metadata)
  values (
    new.workspace_id,
    new.id,
    coalesce(v_actor, new.created_by),
    v_action,
    jsonb_build_object(
      'title', new.title,
      'status', new.status,
      'version', new.version
    )
  );

  return new;
end;
$$;

create or replace function public.audit_workspace_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_actor uuid := auth.uid();
  v_row jsonb;
  v_target_id uuid;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  case tg_table_name
    when 'workspace_members' then
      v_workspace_id := (v_row ->> 'workspace_id')::uuid;
      v_target_id := (v_row ->> 'user_id')::uuid;
    when 'teams' then
      v_workspace_id := (v_row ->> 'workspace_id')::uuid;
      v_target_id := (v_row ->> 'id')::uuid;
    when 'team_members' then
      select workspace_id into v_workspace_id
      from public.teams
      where id = (v_row ->> 'team_id')::uuid;
      v_target_id := (v_row ->> 'user_id')::uuid;
    when 'calendars' then
      v_workspace_id := (v_row ->> 'workspace_id')::uuid;
      v_target_id := (v_row ->> 'id')::uuid;
    when 'calendar_shares' then
      select workspace_id into v_workspace_id
      from public.calendars
      where id = (v_row ->> 'calendar_id')::uuid;
      v_target_id := (v_row ->> 'id')::uuid;
    when 'event_categories' then
      v_workspace_id := (v_row ->> 'workspace_id')::uuid;
      v_target_id := (v_row ->> 'id')::uuid;
    when 'workspace_invites' then
      v_workspace_id := (v_row ->> 'workspace_id')::uuid;
      v_target_id := (v_row ->> 'id')::uuid;
    else
      v_workspace_id := null;
  end case;

  if v_workspace_id is not null then
    insert into public.workspace_audit_log (
      workspace_id,
      actor_id,
      action,
      target_type,
      target_id,
      metadata
    )
    values (
      v_workspace_id,
      v_actor,
      lower(tg_op),
      tg_table_name,
      v_target_id,
      jsonb_build_object('row', v_row)
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger workspaces_touch_updated_at
  before update on public.workspaces
  for each row execute function public.touch_updated_at();

create trigger teams_touch_updated_at
  before update on public.teams
  for each row execute function public.touch_updated_at();

create trigger calendars_touch_updated_at
  before update on public.calendars
  for each row execute function public.touch_updated_at();

create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_event_updated_at();

create trigger event_participants_touch_updated_at
  before update on public.event_participants
  for each row execute function public.touch_updated_at();

create trigger event_comments_touch_updated_at
  before update on public.event_comments
  for each row execute function public.touch_updated_at();

create trigger google_connections_touch_updated_at
  before update on public.google_connections
  for each row execute function public.touch_updated_at();

create trigger calendar_export_preferences_touch_updated_at
  before update on public.calendar_export_preferences
  for each row execute function public.touch_updated_at();

create trigger events_log_activity
  after insert or update on public.events
  for each row execute function public.log_event_activity();

create trigger workspace_members_audit
  after insert or update or delete on public.workspace_members
  for each row execute function public.audit_workspace_change();

create trigger teams_audit
  after insert or update or delete on public.teams
  for each row execute function public.audit_workspace_change();

create trigger team_members_audit
  after insert or update or delete on public.team_members
  for each row execute function public.audit_workspace_change();

create trigger calendars_audit
  after insert or update or delete on public.calendars
  for each row execute function public.audit_workspace_change();

create trigger calendar_shares_audit
  after insert or update or delete on public.calendar_shares
  for each row execute function public.audit_workspace_change();

create trigger event_categories_audit
  after insert or update or delete on public.event_categories
  for each row execute function public.audit_workspace_change();

create trigger workspace_invites_audit
  after insert or update or delete on public.workspace_invites
  for each row execute function public.audit_workspace_change();
