create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining integer;
begin
  -- Workspace deletion and purge remove the parent row first (or mark it deleted).
  -- In either case the membership cascade must be allowed to finish.
  if tg_op = 'DELETE' then
    if not exists (
      select 1 from public.workspaces where id = old.workspace_id
    ) then
      return old;
    end if;
    if exists (
      select 1 from public.workspaces
      where id = old.workspace_id and deleted_at is not null
    ) then
      return old;
    end if;
  else
    if exists (
      select 1 from public.workspaces
      where id = new.workspace_id and deleted_at is not null
    ) then
      return new;
    end if;
  end if;

  if old.role <> 'owner' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.role = 'owner' then
    return new;
  end if;

  select count(*) into v_remaining
  from public.workspace_members
  where workspace_id = old.workspace_id
    and role = 'owner'
    and user_id <> old.user_id;

  if v_remaining = 0 then
    raise exception 'A workspace must keep at least one owner';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

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

  -- Promote first, then demote, so the last-owner guard never sees zero owners.
  update public.workspace_members
  set role = 'owner'
  where workspace_id = p_workspace_id
    and user_id = p_new_owner;

  update public.workspace_members
  set role = 'admin'
  where workspace_id = p_workspace_id
    and user_id = v_user
    and user_id <> p_new_owner;
end;
$$;
