create or replace function public.transfer_workspace_ownership(
  p_workspace_id uuid,
  p_new_owner uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'You need to be signed in';
  end if;

  if public.workspace_role(p_workspace_id, v_user) <> 'owner' then
    raise exception 'Only a workspace owner can transfer ownership';
  end if;

  if not exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = p_new_owner
  ) then
    raise exception 'The new owner must already be a workspace member';
  end if;

  update public.workspace_members
  set role = 'admin'
  where workspace_id = p_workspace_id
    and user_id = v_user
    and user_id <> p_new_owner;

  update public.workspace_members
  set role = 'owner'
  where workspace_id = p_workspace_id
    and user_id = p_new_owner;
end;
$$;

create or replace function public.soft_delete_workspace(
  p_workspace_id uuid,
  p_confirmation text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
begin
  if v_user is null then
    raise exception 'You need to be signed in';
  end if;

  if public.workspace_role(p_workspace_id, v_user) <> 'owner' then
    raise exception 'Only a workspace owner can delete the workspace';
  end if;

  select name into v_name from public.workspaces where id = p_workspace_id;
  if v_name is distinct from p_confirmation then
    raise exception 'Type the workspace name exactly to confirm deletion';
  end if;

  update public.workspaces
  set deleted_at = now()
  where id = p_workspace_id;
end;
$$;

create or replace function public.purge_deleted_workspaces()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.workspaces
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
$$;

revoke all on function public.transfer_workspace_ownership(uuid, uuid) from public, anon;
revoke all on function public.soft_delete_workspace(uuid, text) from public, anon;
revoke all on function public.purge_deleted_workspaces() from public, anon;

grant execute on function public.transfer_workspace_ownership(uuid, uuid) to authenticated;
grant execute on function public.soft_delete_workspace(uuid, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'microaxis-purge-workspaces',
      '0 3 * * *',
      'select public.purge_deleted_workspaces();'
    );
  end if;
end;
$$;
