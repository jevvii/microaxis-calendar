do $$
declare
  v_count integer;
  v_version integer;
  v_activity integer;
  v_audit integer;
begin
  select count(*) into v_count from public.events;
  if v_count < 12 then
    raise exception 'expected at least 12 seeded events, found %', v_count;
  end if;

  select count(*) into v_count from public.profiles;
  if v_count < 4 then
    raise exception 'expected at least 4 seeded profiles, found %', v_count;
  end if;

  select count(*) into v_count from public.workspaces;
  if v_count <> 2 then
    raise exception 'expected 2 workspaces, found %', v_count;
  end if;

  select count(*) into v_audit from public.workspace_audit_log;
  if v_audit = 0 then
    raise exception 'expected workspace audit entries';
  end if;

  update public.events
  set title = 'OceanJet release review — revised'
  where id = '40000000-0000-4000-8000-000000000001';

  select version into v_version
  from public.events
  where id = '40000000-0000-4000-8000-000000000001';

  if v_version <> 2 then
    raise exception 'expected event version 2 after update, found %', v_version;
  end if;

  select count(*) into v_activity
  from public.event_activity
  where event_id = '40000000-0000-4000-8000-000000000001';

  if v_activity < 2 then
    raise exception 'expected insert and update activity rows, found %', v_activity;
  end if;
end;
$$;
