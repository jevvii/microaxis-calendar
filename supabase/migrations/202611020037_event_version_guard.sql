-- Internal conflict-hold updates must not consume an optimistic-concurrency
-- version or pollute the activity feed. The request sync sets a transaction-local
-- flag around its own event updates.
create or replace function public.touch_event_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if coalesce(current_setting('microaxis.skip_version', true), '') <> '1'
    and new.version is not distinct from old.version then
    new.version = old.version + 1;
  end if;
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
  if coalesce(current_setting('microaxis.skip_version', true), '') = '1' then
    return new;
  end if;

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
