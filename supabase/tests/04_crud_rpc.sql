set role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', false);

do $$
declare
  v_calendar uuid;
  v_team uuid;
  v_event jsonb;
  v_version integer;
  v_comment public.event_comments%rowtype;
  v_attachment public.event_attachments%rowtype;
  v_path text;
  v_count integer;
begin
  select public.create_calendar(
    '10000000-0000-4000-8000-000000000001',
    'CRUD Shared Calendar',
    'Created by the CRUD test',
    'shared',
    null,
    '#2F5D78'
  ) into v_calendar;

  if v_calendar is null then raise exception 'create_calendar returned no id'; end if;

  perform public.update_calendar(v_calendar, 'CRUD Shared Calendar Updated', 'Updated', '#3F5C3A');
  perform public.delete_calendar(v_calendar);

  v_team := public.save_team(
    null,
    '10000000-0000-4000-8000-000000000001',
    'CRUD Team',
    'Created by the CRUD test',
    '#8B4039',
    array['a0000000-0000-4000-8000-000000000002']::uuid[],
    array['a0000000-0000-4000-8000-000000000001']::uuid[]
  );
  if v_team is null then raise exception 'save_team returned no id'; end if;

  perform public.save_team(
    v_team,
    '10000000-0000-4000-8000-000000000001',
    'CRUD Team Updated',
    'Updated',
    '#8A651A',
    array['a0000000-0000-4000-8000-000000000002']::uuid[],
    array['a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003']::uuid[]
  );
  perform public.delete_team(v_team);

  select version into v_version from public.events where id = '40000000-0000-4000-8000-000000000001';

  select public.update_event(
    '40000000-0000-4000-8000-000000000001',
    v_version,
    jsonb_build_object(
      'calendar_id', '30000000-0000-4000-8000-000000000002',
      'title', 'CRUD event updated',
      'starts_at', '2026-11-03T01:30:00.000Z',
      'ends_at', '2026-11-03T02:30:00.000Z',
      'all_day', false,
      'time_zone', 'Asia/Manila',
      'priority', 'high',
      'status', 'scheduled',
      'visibility', 'calendar',
      'participant_ids', jsonb_build_array('a0000000-0000-4000-8000-000000000001')
    )
  ) into v_event;

  if coalesce((v_event ->> 'ok')::boolean, false) is not true then
    raise exception 'update_event failed: %', v_event;
  end if;

  v_comment := public.create_comment('40000000-0000-4000-8000-000000000001', 'CRUD comment');
  if v_comment.id is null then raise exception 'create_comment returned no id'; end if;
  v_comment := public.update_comment(v_comment.id, 'CRUD comment updated');
  if v_comment.body <> 'CRUD comment updated' then raise exception 'update_comment did not update'; end if;
  perform public.delete_comment(v_comment.id);

  v_attachment := public.create_attachment(
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/crud.txt',
    'crud.txt',
    'text/plain',
    100
  );
  if v_attachment.id is null then raise exception 'create_attachment returned no id'; end if;
  v_path := public.delete_attachment(v_attachment.id);
  if v_path is null then raise exception 'delete_attachment returned no path'; end if;

  perform public.set_calendar_export('30000000-0000-4000-8000-000000000002', true);
  select count(*) into v_count from public.calendar_export_preferences
  where user_id = 'a0000000-0000-4000-8000-000000000002'
    and calendar_id = '30000000-0000-4000-8000-000000000002'
    and enabled = true;
  if v_count <> 1 then raise exception 'set_calendar_export did not enable export'; end if;
  perform public.set_calendar_export('30000000-0000-4000-8000-000000000002', false);

  perform public.save_push_subscription(
    'https://example.test/push/crud',
    'p256dh-test',
    'auth-test',
    'CRUD test'
  );
  select count(*) into v_count from public.push_subscriptions
  where endpoint = 'https://example.test/push/crud'
    and user_id = 'a0000000-0000-4000-8000-000000000002';
  if v_count <> 1 then raise exception 'save_push_subscription failed'; end if;
  perform public.delete_push_subscription('https://example.test/push/crud');

  perform public.update_notification_preferences('{"email":false,"push":true,"reminders":true,"newSharedEvent":true,"mentions":true,"dailyAgenda":false,"quietHoursStart":"22:00","quietHoursEnd":"08:00"}'::jsonb);
  select count(*) into v_count from public.profiles
  where id = 'a0000000-0000-4000-8000-000000000002'
    and (notification_preferences ->> 'email')::boolean is false;
  if v_count <> 1 then raise exception 'update_notification_preferences failed'; end if;

  select public.delete_event(
    '40000000-0000-4000-8000-000000000001',
    v_version + 1
  ) into v_event;
  if coalesce((v_event ->> 'ok')::boolean, false) is not true then
    raise exception 'delete_event failed: %', v_event;
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', false);

do $$
declare
  v_share uuid;
begin
  v_share := public.upsert_calendar_share(
    '30000000-0000-4000-8000-000000000001',
    'team',
    '20000000-0000-4000-8000-000000000001',
    'viewer',
    false
  );
  if v_share is null then raise exception 'upsert_calendar_share returned no id'; end if;
  perform public.delete_calendar_share(v_share);
  perform public.mark_notification_read('60000000-0000-4000-8000-000000000001');
end;
$$;

reset role;
