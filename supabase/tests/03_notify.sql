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
