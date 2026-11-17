set role authenticated;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', false);

do $$
begin
  perform public.upsert_calendar_share(
    '30000000-0000-4000-8000-000000000001',
    'team',
    '20000000-0000-4000-8000-000000000001',
    'viewer',
    false
  );
end;
$$;

do $$
declare
  v_event jsonb;
begin
  select public.create_event(
    '30000000-0000-4000-8000-000000000001',
    jsonb_build_object(
      'title', 'Owner focus block',
      'starts_at', '2026-12-01T01:00:00.000Z',
      'ends_at', '2026-12-01T02:00:00.000Z',
      'all_day', false,
      'time_zone', 'Asia/Manila',
      'priority', 'normal',
      'status', 'scheduled',
      'visibility', 'calendar'
    )
  ) into v_event;

  if v_event -> 'event' ->> 'status' <> 'scheduled' then
    raise exception 'A non-conflicting event should stay scheduled: %', v_event;
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', false);

do $$
declare
  v_event jsonb;
  v_event_id uuid;
  v_request_id uuid;
  v_recipient uuid;
begin
  select public.create_event(
    '30000000-0000-4000-8000-000000000002',
    jsonb_build_object(
      'title', 'Team planning',
      'starts_at', '2026-12-01T01:30:00.000Z',
      'ends_at', '2026-12-01T02:30:00.000Z',
      'all_day', false,
      'time_zone', 'Asia/Manila',
      'priority', 'normal',
      'status', 'scheduled',
      'visibility', 'calendar'
    )
  ) into v_event;

  v_event_id := (v_event -> 'event' ->> 'id')::uuid;

  if v_event -> 'event' ->> 'status' <> 'tentative' then
    raise exception 'A conflicting event should be tentative: %', v_event;
  end if;

  select id, recipient_id into v_request_id, v_recipient
  from public.event_schedule_requests
  where event_id = v_event_id and status = 'pending';

  if v_request_id is null then
    raise exception 'A conflicting event should create a pending request';
  end if;

  if v_recipient <> 'a0000000-0000-4000-8000-000000000001' then
    raise exception 'The request should target the conflicting event creator';
  end if;

end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', false);

do $$
declare
  v_request_id uuid;
  v_event_id uuid;
begin
  select id, event_id into v_request_id, v_event_id
  from public.event_schedule_requests
  where recipient_id = 'a0000000-0000-4000-8000-000000000001'
    and status = 'pending'
  order by created_at desc
  limit 1;

  if v_request_id is null then
    raise exception 'Expected a pending request for the recipient';
  end if;

  if not exists (
    select 1 from public.notifications
    where user_id = 'a0000000-0000-4000-8000-000000000001'
      and type = 'schedule_requested'
      and metadata ->> 'requestId' = v_request_id::text
  ) then
    raise exception 'The recipient should receive a schedule_requested notification';
  end if;

  perform public.respond_schedule_request(v_request_id, 'accept');

  if not exists (
    select 1 from public.event_schedule_requests
    where id = v_request_id and status = 'accepted'
  ) then
    raise exception 'Accept should resolve the request';
  end if;

  if (select status from public.events where id = v_event_id) <> 'scheduled' then
    raise exception 'The requesting event should be scheduled after every request is accepted';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', false);

do $$
declare
  v_request_id uuid;
begin
  select id into v_request_id
  from public.event_schedule_requests
  where requester_id = 'a0000000-0000-4000-8000-000000000002'
    and status = 'accepted'
  order by created_at desc
  limit 1;

  if not exists (
    select 1 from public.notifications
    where user_id = 'a0000000-0000-4000-8000-000000000002'
      and type = 'schedule_accepted'
      and metadata ->> 'requestId' = v_request_id::text
  ) then
    raise exception 'The requester should receive a schedule_accepted notification';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', false);

do $$
begin
  perform public.create_event(
    '30000000-0000-4000-8000-000000000001',
    jsonb_build_object(
      'title', 'Owner focus block 2',
      'starts_at', '2026-12-02T01:00:00.000Z',
      'ends_at', '2026-12-02T02:00:00.000Z',
      'all_day', false,
      'time_zone', 'Asia/Manila',
      'priority', 'normal',
      'status', 'scheduled',
      'visibility', 'calendar'
    )
  );

  perform public.create_event(
    '30000000-0000-4000-8000-000000000001',
    jsonb_build_object(
      'title', 'Owner focus block 3',
      'starts_at', '2026-12-03T01:00:00.000Z',
      'ends_at', '2026-12-03T02:00:00.000Z',
      'all_day', false,
      'time_zone', 'Asia/Manila',
      'priority', 'normal',
      'status', 'scheduled',
      'visibility', 'calendar'
    )
  );

  perform public.create_event(
    '30000000-0000-4000-8000-000000000001',
    jsonb_build_object(
      'title', 'Owner focus block 4',
      'starts_at', '2026-12-04T01:00:00.000Z',
      'ends_at', '2026-12-04T02:00:00.000Z',
      'all_day', false,
      'time_zone', 'Asia/Manila',
      'priority', 'normal',
      'status', 'scheduled',
      'visibility', 'calendar'
    )
  );
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', false);

do $$
declare
  v_event jsonb;
begin
  select public.create_event(
    '30000000-0000-4000-8000-000000000002',
    jsonb_build_object(
      'title', 'Team planning decline',
      'starts_at', '2026-12-02T01:30:00.000Z',
      'ends_at', '2026-12-02T02:30:00.000Z',
      'all_day', false,
      'time_zone', 'Asia/Manila',
      'priority', 'normal',
      'status', 'scheduled',
      'visibility', 'calendar'
    )
  ) into v_event;

  if v_event -> 'event' ->> 'status' <> 'tentative' then
    raise exception 'The decline fixture should be tentative';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', false);

do $$
declare
  v_request_id uuid;
  v_event_id uuid;
begin
  select id, event_id into v_request_id, v_event_id
  from public.event_schedule_requests
  where recipient_id = 'a0000000-0000-4000-8000-000000000001'
    and status = 'pending'
  order by created_at desc
  limit 1;

  perform public.respond_schedule_request(v_request_id, 'decline');

  if (select status from public.event_schedule_requests where id = v_request_id) <> 'declined' then
    raise exception 'Decline should close the request';
  end if;

  if (select status from public.events where id = v_event_id) <> 'cancelled' then
    raise exception 'Decline should cancel the requesting event';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', false);

do $$
declare
  v_event jsonb;
begin
  select public.create_event(
    '30000000-0000-4000-8000-000000000002',
    jsonb_build_object(
      'title', 'Team planning counter',
      'starts_at', '2026-12-03T01:30:00.000Z',
      'ends_at', '2026-12-03T02:30:00.000Z',
      'all_day', false,
      'time_zone', 'Asia/Manila',
      'priority', 'normal',
      'status', 'scheduled',
      'visibility', 'calendar'
    )
  ) into v_event;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', false);

do $$
declare
  v_request_id uuid;
begin
  select id into v_request_id
  from public.event_schedule_requests
  where recipient_id = 'a0000000-0000-4000-8000-000000000001'
    and status = 'pending'
  order by created_at desc
  limit 1;

  perform public.respond_schedule_request(
    v_request_id,
    'counter',
    '2026-12-03T03:00:00.000Z',
    '2026-12-03T04:00:00.000Z',
    'Can we move this to 11:00?'
  );

  if (select status from public.event_schedule_requests where id = v_request_id) <> 'countered' then
    raise exception 'Counter should move the request to countered';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', false);

do $$
declare
  v_request_id uuid;
  v_event_id uuid;
begin
  select id, event_id into v_request_id, v_event_id
  from public.event_schedule_requests
  where requester_id = 'a0000000-0000-4000-8000-000000000002'
    and status = 'countered'
  order by created_at desc
  limit 1;

  perform public.respond_schedule_request(v_request_id, 'accept_counter');

  if (select status from public.event_schedule_requests where id = v_request_id) <> 'accepted' then
    raise exception 'Accepting a counter should resolve the request';
  end if;

  if not exists (
    select 1 from public.events
    where id = v_event_id
      and starts_at = '2026-12-03T03:00:00.000Z'
      and ends_at = '2026-12-03T04:00:00.000Z'
      and status = 'scheduled'
  ) then
    raise exception 'Accepting a counter should move and schedule the event';
  end if;
end;
$$;

do $$
declare
  v_event jsonb;
  v_request_id uuid;
begin
  select public.create_event(
    '30000000-0000-4000-8000-000000000002',
    jsonb_build_object(
      'title', 'Team planning withdraw',
      'starts_at', '2026-12-04T01:30:00.000Z',
      'ends_at', '2026-12-04T02:30:00.000Z',
      'all_day', false,
      'time_zone', 'Asia/Manila',
      'priority', 'normal',
      'status', 'scheduled',
      'visibility', 'calendar'
    )
  ) into v_event;

  select id into v_request_id
  from public.event_schedule_requests
  where event_id = (v_event -> 'event' ->> 'id')::uuid
    and status = 'pending';

  perform public.respond_schedule_request(v_request_id, 'withdraw');

  if (select status from public.event_schedule_requests where id = v_request_id) <> 'withdrawn' then
    raise exception 'Withdraw should close the request';
  end if;

  if (select status from public.events where id = (v_event -> 'event' ->> 'id')::uuid) <> 'cancelled' then
    raise exception 'Withdraw should cancel the requesting event';
  end if;
end;
$$;

do $$
declare
  v_request_id uuid;
begin
  select id into v_request_id from public.event_schedule_requests limit 1;

  begin
    update public.event_schedule_requests
    set status = 'accepted'
    where id = v_request_id;
    raise exception 'Direct schedule request updates must be denied';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like '%permission denied%' or sqlerrm like '%row-level security%' then
        null;
      else
        raise;
      end if;
  end;

  begin
    insert into public.event_schedule_requests (
      workspace_id, event_id, conflict_event_id, requester_id, recipient_id
    )
    select
      workspace_id, event_id, conflict_event_id, requester_id, recipient_id
    from public.event_schedule_requests
    limit 1;
    raise exception 'Direct schedule request inserts must be denied';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like '%row-level security%' or sqlerrm like '%permission denied%' then
        null;
      else
        raise;
      end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', false);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.event_schedule_requests;
  if v_count <> 0 then
    raise exception 'An unrelated member must not see schedule requests';
  end if;
end;
$$;

reset role;
