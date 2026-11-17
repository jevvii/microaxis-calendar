grant select on public.event_schedule_requests to authenticated;

create or replace function public.notify_schedule_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_recipient uuid;
  v_notification uuid;
  v_type public.notification_type;
  v_title text;
  v_body text;
  v_href text;
  v_event public.events%rowtype;
  v_full boolean;
  v_requester_name text;
begin
  select * into v_event from public.events where id = new.event_id;
  if v_event.id is null then return new; end if;

  if tg_op = 'INSERT' then
    v_recipient := new.recipient_id;
    v_type := 'schedule_requested';
    v_full := public.can_view_event(new.event_id, new.recipient_id);

    select full_name into v_requester_name from public.profiles where id = new.requester_id;

    v_title := case
      when v_full then 'Schedule request: ' || v_event.title
      else coalesce(v_requester_name, 'A teammate') || ' asked about a scheduling conflict'
    end;

    v_body := to_char(
        v_event.starts_at at time zone v_event.time_zone,
        'Mon DD, HH12:MI AM'
      ) || ' – ' || to_char(
        v_event.ends_at at time zone v_event.time_zone,
        'HH12:MI AM'
      );

    v_href := '/app/calendar?event=' || new.conflict_event_id;
  elsif tg_op = 'UPDATE' then
    if new.status = old.status or new.status = 'superseded' then
      return new;
    end if;

    if v_actor = new.recipient_id then
      v_recipient := new.requester_id;
    elsif v_actor = new.requester_id then
      v_recipient := new.recipient_id;
    else
      return new;
    end if;

    v_type := case new.status
      when 'accepted' then 'schedule_accepted'::public.notification_type
      when 'declined' then 'schedule_declined'::public.notification_type
      when 'countered' then 'schedule_countered'::public.notification_type
      when 'withdrawn' then 'schedule_withdrawn'::public.notification_type
      else null
    end;

    if v_type is null then return new; end if;

    v_full := public.can_view_event(new.event_id, v_recipient);

    v_title := case new.status
      when 'accepted' then 'Schedule request accepted'
      when 'declined' then 'Schedule request declined'
      when 'countered' then 'New time proposed'
      when 'withdrawn' then 'Schedule request withdrawn'
      else 'Schedule request updated'
    end;

    if new.status = 'countered' and new.proposed_starts_at is not null then
      v_body := to_char(
        new.proposed_starts_at at time zone v_event.time_zone,
        'Mon DD, HH12:MI AM'
      );
    else
      v_body := case
        when v_full then v_event.title
        else 'A shared calendar changed'
      end;
    end if;

    v_href := '/app/calendar?event=' || case
      when v_recipient = new.requester_id then new.event_id
      else new.conflict_event_id
    end;
  else
    return new;
  end if;

  if v_recipient is null then return new; end if;

  insert into public.notifications (
    workspace_id, user_id, type, title, body, href, metadata, dedupe_key
  )
  values (
    new.workspace_id,
    v_recipient,
    v_type,
    v_title,
    v_body,
    v_href,
    jsonb_build_object(
      'requestId', new.id,
      'eventId', new.event_id,
      'conflictEventId', new.conflict_event_id,
      'status', new.status
    ),
    'schedulerequest:' || new.id || ':' || new.status || ':' || v_recipient
  )
  on conflict (dedupe_key) do nothing
  returning id into v_notification;

  if v_notification is not null then
    perform public.queue_notification_channels(v_notification, v_recipient);
  end if;

  return new;
end;
$$;

drop trigger if exists event_schedule_requests_notify on public.event_schedule_requests;
create trigger event_schedule_requests_notify
  after insert or update on public.event_schedule_requests
  for each row execute function public.notify_schedule_request_change();

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  begin
    execute 'alter publication supabase_realtime add table public.event_schedule_requests';
  exception
    when duplicate_object then null;
  end;
end;
$$;

alter table public.event_schedule_requests replica identity full;
