do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.event_recipient_ids('40000000-0000-4000-8000-000000000001');
  if v_count <> 3 then
    raise exception 'Expected 3 participant recipients, found %', v_count;
  end if;

  select count(*) into v_count
  from public.event_recipient_ids('40000000-0000-4000-8000-000000000004');
  if v_count <> 4 then
    raise exception 'Expected 4 workspace recipients, found %', v_count;
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);

do $$
declare
  v_export boolean;
begin
  select export_to_google into v_export
  from public.calendar_visible_events
  where id = '40000000-0000-4000-8000-000000000001';
  if v_export is not true then
    raise exception 'calendar_visible_events must expose export_to_google';
  end if;
end;
$$;

reset role;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);

insert into public.events (
  id, workspace_id, calendar_id, created_by, title, starts_at, ends_at,
  time_zone, priority, status, visibility
)
values (
  '40000000-0000-4000-8000-000000000097',
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'Private team event',
  '2026-11-10T01:00:00.000Z',
  '2026-11-10T02:00:00.000Z',
  'Asia/Manila',
  'normal',
  'scheduled',
  'private'
)
on conflict (id) do nothing;

insert into public.event_participants (event_id, user_id, status)
values
  ('40000000-0000-4000-8000-000000000097', 'a0000000-0000-4000-8000-000000000002', 'going'),
  ('40000000-0000-4000-8000-000000000097', 'a0000000-0000-4000-8000-000000000003', 'going')
on conflict (event_id, user_id) do nothing;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.event_recipient_ids('40000000-0000-4000-8000-000000000097');
  if v_count <> 1 then
    raise exception 'Private event recipient leak: expected 1, found %', v_count;
  end if;
end;
$$;

insert into public.notifications (
  id, workspace_id, user_id, type, title, dedupe_key
)
values (
  '60000000-0000-4000-8000-000000000099',
  '10000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'event_reminder',
  'Dedupe test',
  'reminder:test:001'
);

do $$
begin
  begin
    insert into public.notifications (
      id, workspace_id, user_id, type, title, dedupe_key
    )
    values (
      '60000000-0000-4000-8000-000000000098',
      '10000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001',
      'event_reminder',
      'Duplicate',
      'reminder:test:001'
    );
    raise exception 'Duplicate reminder key should be rejected';
  exception
    when unique_violation then
      null;
  end;
end;
$$;

insert into public.notification_outbox (notification_id, channel)
values ('60000000-0000-4000-8000-000000000099', 'email');

do $$
begin
  begin
    insert into public.notification_outbox (notification_id, channel)
    values ('60000000-0000-4000-8000-000000000099', 'email');
    raise exception 'Duplicate outbox channel should be rejected';
  exception
    when unique_violation then
      null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);

insert into public.events (
  id, workspace_id, calendar_id, created_by, title, starts_at, ends_at,
  time_zone, priority, status, visibility
)
values (
  '40000000-0000-4000-8000-000000000095',
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000002',
  'Triggered shared event',
  '2026-11-11T01:00:00.000Z',
  '2026-11-11T02:00:00.000Z',
  'Asia/Manila',
  'normal',
  'scheduled',
  'calendar'
)
on conflict (id) do nothing;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.notifications
  where type = 'event_created'
    and metadata ->> 'eventId' = '40000000-0000-4000-8000-000000000095';

  if v_count <> 2 then
    raise exception 'Expected 2 event-created notifications for team recipients, found %', v_count;
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', false);

insert into public.event_comments (
  id, workspace_id, event_id, author_id, body
)
values (
  '70000000-0000-4000-8000-000000000095',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000003',
  '@Mara Velasco please check the triggered mention.'
)
on conflict (id) do nothing;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.notifications
  where type = 'comment_mention'
    and metadata ->> 'commentId' = '70000000-0000-4000-8000-000000000095';

  if v_count <> 1 then
    raise exception 'Expected one mention notification, found %', v_count;
  end if;
end;
$$;
