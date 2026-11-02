insert into public.calendar_shares (
  calendar_id, subject_type, subject_id, role, hide_details, created_by
)
values (
  '30000000-0000-4000-8000-000000000001',
  'team',
  '20000000-0000-4000-8000-000000000003',
  'viewer',
  true,
  'a0000000-0000-4000-8000-000000000001'
)
on conflict (calendar_id, subject_type, subject_id) do update
set role = excluded.role, hide_details = excluded.hide_details;

insert into public.calendars (
  id, workspace_id, owner_id, team_id, name, description, kind, color, visibility, created_by
)
values (
  '30000000-0000-4000-8000-000000000008',
  '10000000-0000-4000-8000-000000000001',
  null,
  null,
  'Pricing room',
  'A shared room for pricing work.',
  'shared',
  '#6E5140',
  'workspace',
  'a0000000-0000-4000-8000-000000000001'
)
on conflict (id) do nothing;

insert into public.calendar_shares (
  calendar_id, subject_type, subject_id, role, hide_details, created_by
)
values
  (
    '30000000-0000-4000-8000-000000000008',
    'user',
    'a0000000-0000-4000-8000-000000000002',
    'editor',
    false,
    'a0000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000008',
    'user',
    'a0000000-0000-4000-8000-000000000003',
    'viewer',
    false,
    'a0000000-0000-4000-8000-000000000001'
  )
on conflict (calendar_id, subject_type, subject_id) do update
set role = excluded.role, hide_details = excluded.hide_details;

insert into public.events (
  id, workspace_id, calendar_id, created_by, title, description, location,
  starts_at, ends_at, all_day, time_zone, category_id, priority, status, visibility
)
values
  (
    '40000000-0000-4000-8000-000000000014',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Pricing office hours',
    'Open questions on the retainer model.',
    'Studio room',
    '2026-11-05T05:00:00.000Z',
    '2026-11-05T06:00:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000005',
    'normal',
    'scheduled',
    'calendar'
  ),
  (
    '40000000-0000-4000-8000-000000000015',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000008',
    'a0000000-0000-4000-8000-000000000001',
    'Pricing model review',
    'Walk through the revised tiers.',
    'Studio room',
    '2026-11-06T05:00:00.000Z',
    '2026-11-06T06:00:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000005',
    'normal',
    'scheduled',
    'calendar'
  )
on conflict (id) do nothing;

set role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.workspaces where id = '10000000-0000-4000-8000-000000000001';
  if v_count <> 1 then
    raise exception 'Ivo should see MicroAxis Studio';
  end if;

  select count(*) into v_count from public.workspaces where id = '10000000-0000-4000-8000-000000000002';
  if v_count <> 0 then
    raise exception 'Ivo must not see Northwind Fieldwork';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.workspaces where id = '10000000-0000-4000-8000-000000000001';
  if v_count <> 1 then
    raise exception 'Mara should see MicroAxis Studio';
  end if;

  select count(*) into v_count from public.workspaces where id = '10000000-0000-4000-8000-000000000002';
  if v_count <> 0 then
    raise exception 'Mara must not see Northwind Fieldwork';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', false);

do $$
declare
  v_count integer;
  v_title text;
begin
  select count(*) into v_count
  from public.calendars
  where id = '30000000-0000-4000-8000-000000000001';
  if v_count <> 1 then
    raise exception 'Bea should see the shared calendar shell';
  end if;

  select count(*) into v_count
  from public.events
  where id = '40000000-0000-4000-8000-000000000014';
  if v_count <> 0 then
    raise exception 'Bea must not read a busy-only event through the base table';
  end if;

  select title into v_title
  from public.calendar_visible_events
  where id = '40000000-0000-4000-8000-000000000014';
  if v_title is distinct from 'Busy' then
    raise exception 'Bea should see a busy block, found %', coalesce(v_title, 'no row');
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', false);

do $$
declare
  v_count integer;
  v_title text;
begin
  select count(*) into v_count
  from public.events
  where id = '40000000-0000-4000-8000-000000000014';
  if v_count <> 1 then
    raise exception 'Rin should see the full event through the Product share';
  end if;

  select title into v_title
  from public.events
  where id = '40000000-0000-4000-8000-000000000014';
  if v_title <> 'Pricing office hours' then
    raise exception 'Rin should see the real event title';
  end if;

  update public.events
  set title = 'Rin should not edit this'
  where id = '40000000-0000-4000-8000-000000000015'
  returning title into v_title;

  if v_title is not null then
    raise exception 'A viewer must not update a shared event';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);

do $$
declare
  v_version integer;
begin
  update public.events
  set title = 'Pricing model review — editor pass'
  where id = '40000000-0000-4000-8000-000000000015'
  returning version into v_version;

  if v_version is null then
    raise exception 'An editor should update the shared event';
  end if;
  if v_version <> 2 then
    raise exception 'Expected version 2 after editor update, found %', v_version;
  end if;
end;
$$;

do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'event-attachments',
      '10000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000013/proof.pdf',
      'a0000000-0000-4000-8000-000000000002'
    );
    raise exception 'Cross-workspace attachment insert should be denied';
  exception
    when insufficient_privilege then
      null;
    when others then
      if sqlerrm like '%row-level security%' then
        null;
      else
        raise;
      end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.workspace_audit_log;
  if v_count = 0 then
    raise exception 'An owner should read the workspace audit log';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', false);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.workspace_audit_log;
  if v_count <> 0 then
    raise exception 'A member must not read the workspace audit log';
  end if;
end;
$$;

reset role;

do $$
begin
  begin
    delete from public.workspace_members
    where workspace_id = '10000000-0000-4000-8000-000000000001'
      and user_id = 'a0000000-0000-4000-8000-000000000001';
    raise exception 'Removing the last owner should be rejected';
  exception
    when others then
      if sqlerrm not like '%at least one owner%' then
        raise;
      end if;
  end;
end;
$$;
