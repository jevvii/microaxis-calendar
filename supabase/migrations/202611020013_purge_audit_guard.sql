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

  -- Cascades during workspace purge can outlive the parent workspace row.
  if v_workspace_id is not null and exists (
    select 1 from public.workspaces where id = v_workspace_id
  ) then
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
