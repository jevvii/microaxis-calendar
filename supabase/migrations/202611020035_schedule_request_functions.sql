create or replace function public.event_occurrences(
  p_event_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (occurrence_start timestamptz, occurrence_end timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_duration interval;
  v_rule text;
  v_interval interval;
  v_step integer;
  v_count integer;
  v_series_end timestamptz;
begin
  select * into v_event
  from public.events
  where id = p_event_id and deleted_at is null;

  if not found then return; end if;

  v_duration := v_event.ends_at - v_event.starts_at;

  if v_event.recurrence_rule is null or v_event.recurrence_rule = '' then
    if v_event.starts_at < p_to and v_event.ends_at > p_from then
      occurrence_start := v_event.starts_at;
      occurrence_end := v_event.ends_at;
      return next;
    end if;
    return;
  end if;

  v_rule := upper(v_event.recurrence_rule);
  v_step := coalesce(
    nullif(split_part(split_part(v_rule, 'INTERVAL=', 2), ';', 1), '')::integer,
    1
  );
  v_count := nullif(split_part(split_part(v_rule, 'COUNT=', 2), ';', 1), '')::integer;

  if v_rule like '%FREQ=DAILY%' then
    v_interval := make_interval(days => v_step);
  elsif v_rule like '%FREQ=WEEKLY%' then
    v_interval := make_interval(weeks => v_step);
  elsif v_rule like '%FREQ=MONTHLY%' then
    v_interval := make_interval(months => v_step);
  else
    if v_event.starts_at < p_to and v_event.ends_at > p_from then
      occurrence_start := v_event.starts_at;
      occurrence_end := v_event.ends_at;
      return next;
    end if;
    return;
  end if;

  v_series_end := least(coalesce(v_event.recurrence_until, p_to), p_to);

  return query
  select series.occurrence_start, series.occurrence_start + v_duration
  from (
    select
      generated as occurrence_start,
      row_number() over (order by generated) as occurrence_number
    from generate_series(v_event.starts_at, v_series_end, v_interval) as generated
  ) series
  where (v_count is null or series.occurrence_number <= v_count)
    and series.occurrence_start < p_to
    and series.occurrence_start + v_duration > p_from
    and not exists (
      select 1
      from jsonb_array_elements_text(v_event.recurrence_exceptions) as exception
      where exception::timestamptz = series.occurrence_start
    );
end;
$$;

create or replace function public.event_conflicts(p_event_id uuid)
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_from timestamptz;
  v_to timestamptz;
begin
  select * into v_event
  from public.events
  where id = p_event_id and deleted_at is null;

  if not found or v_event.status = 'cancelled' then return; end if;

  v_from := v_event.starts_at;
  v_to := greatest(
    v_event.ends_at,
    coalesce(v_event.recurrence_until, v_event.starts_at + interval '90 days')
  );

  return query
  with target as (
    select * from public.event_occurrences(p_event_id, v_from, v_to)
  )
  select distinct visible.id
  from public.calendar_visible_events visible
  cross join lateral public.event_occurrences(visible.id, v_from, v_to) occurrence
  where visible.workspace_id = v_event.workspace_id
    and visible.calendar_id <> v_event.calendar_id
    and visible.id <> p_event_id
    and visible.status <> 'cancelled'
    and visible.deleted_at is null
    and visible.starts_at < v_to
    and exists (
      select 1 from target
      where target.occurrence_start < occurrence.occurrence_end
        and target.occurrence_end > occurrence.occurrence_start
    );
end;
$$;

create or replace function public.schedule_request_recipient_ids(p_event_id uuid)
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_created_by uuid;
begin
  select workspace_id, created_by into v_workspace_id, v_created_by
  from public.events
  where id = p_event_id and deleted_at is null;

  if v_workspace_id is null then return; end if;

  return query
  select distinct recipient.user_id
  from (
    select v_created_by as user_id
    union
    select participant.user_id
    from public.event_participants participant
    where participant.event_id = p_event_id
  ) recipient
  where recipient.user_id is not null
    and public.is_workspace_member(v_workspace_id, recipient.user_id);
end;
$$;

create or replace function public.refresh_event_conflict_hold(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending boolean;
begin
  select exists (
    select 1
    from public.event_schedule_requests
    where event_id = p_event_id and status in ('pending', 'countered')
  ) into v_pending;

  perform set_config('microaxis.skip_version', '1', true);
  perform set_config('microaxis.skip_sync', '1', true);

  if v_pending then
    update public.events
    set conflict_hold = true,
        status = 'tentative'::public.event_status
    where id = p_event_id and status <> 'cancelled';
  else
    update public.events
    set conflict_hold = false,
        status = case
          when conflict_hold then 'scheduled'::public.event_status
          else status
        end
    where id = p_event_id and status <> 'cancelled';
  end if;

  perform set_config('microaxis.skip_version', '', true);
  perform set_config('microaxis.skip_sync', '', true);
end;
$$;

create or replace function public.sync_event_schedule_requests(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_conflict_id uuid;
  v_recipient uuid;
  v_has_hold boolean := false;
  v_actor uuid := auth.uid();
begin
  select * into v_event
  from public.events
  where id = p_event_id;

  if not found then return; end if;

  update public.event_schedule_requests
  set status = 'superseded'
  where event_id = p_event_id and status in ('pending', 'countered');

  if v_event.deleted_at is not null or v_event.status = 'cancelled' then
    perform set_config('microaxis.skip_version', '1', true);
    perform set_config('microaxis.skip_sync', '1', true);
    update public.events set conflict_hold = false where id = p_event_id;
    perform set_config('microaxis.skip_version', '', true);
    perform set_config('microaxis.skip_sync', '', true);
    return;
  end if;

  for v_conflict_id in select public.event_conflicts(p_event_id) loop
    for v_recipient in select public.schedule_request_recipient_ids(v_conflict_id) loop
      if v_recipient <> coalesce(v_actor, v_event.created_by) then
        insert into public.event_schedule_requests (
          workspace_id,
          event_id,
          conflict_event_id,
          requester_id,
          recipient_id,
          status
        )
        values (
          v_event.workspace_id,
          p_event_id,
          v_conflict_id,
          coalesce(v_actor, v_event.created_by),
          v_recipient,
          'pending'
        )
        on conflict do nothing;

        v_has_hold := true;
      end if;
    end loop;
  end loop;

  perform set_config('microaxis.skip_version', '1', true);
  perform set_config('microaxis.skip_sync', '1', true);

  update public.events
  set conflict_hold = v_has_hold,
      status = case
        when v_has_hold then 'tentative'::public.event_status
        when conflict_hold then 'scheduled'::public.event_status
        else status
      end
  where id = p_event_id;

  perform set_config('microaxis.skip_version', '', true);
  perform set_config('microaxis.skip_sync', '', true);
end;
$$;

create or replace function public.respond_schedule_request(
  p_request_id uuid,
  p_action text,
  p_proposed_starts_at timestamptz default null,
  p_proposed_ends_at timestamptz default null,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_action text := lower(trim(p_action));
  v_request public.event_schedule_requests%rowtype;
  v_updated public.event_schedule_requests%rowtype;
  v_event public.events%rowtype;
begin
  if v_actor is null then raise exception 'You need to be signed in'; end if;

  select * into v_request
  from public.event_schedule_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'Schedule request not found'; end if;

  if v_action in ('accept', 'decline', 'counter') then
    if v_actor <> v_request.recipient_id then
      raise exception 'Only the recipient can answer this request';
    end if;
    if v_request.status <> 'pending' then
      raise exception 'This request is no longer pending';
    end if;
  elsif v_action in ('accept_counter', 'decline_counter') then
    if v_actor <> v_request.requester_id then
      raise exception 'Only the requester can answer a counter-proposal';
    end if;
    if v_request.status <> 'countered' then
      raise exception 'This request has no counter-proposal to answer';
    end if;
  elsif v_action = 'withdraw' then
    if v_actor <> v_request.requester_id then
      raise exception 'Only the requester can withdraw this request';
    end if;
    if v_request.status not in ('pending', 'countered') then
      raise exception 'This request can no longer be withdrawn';
    end if;
  else
    raise exception 'Unknown schedule request action: %', p_action;
  end if;

  if v_action = 'accept' then
    update public.event_schedule_requests
    set status = 'accepted', responded_at = now()
    where id = p_request_id
    returning * into v_updated;

    perform public.refresh_event_conflict_hold(v_request.event_id);
  elsif v_action = 'decline' then
    update public.event_schedule_requests
    set status = 'declined', responded_at = now()
    where id = p_request_id
    returning * into v_updated;

    update public.event_schedule_requests
    set status = 'superseded'
    where event_id = v_request.event_id
      and id <> p_request_id
      and status in ('pending', 'countered');

    update public.events
    set status = 'cancelled', conflict_hold = false
    where id = v_request.event_id;
  elsif v_action = 'counter' then
    if p_proposed_starts_at is null
      or p_proposed_ends_at is null
      or p_proposed_ends_at <= p_proposed_starts_at then
      raise exception 'Choose a valid proposed start and end';
    end if;

    update public.event_schedule_requests
    set status = 'countered',
        proposed_starts_at = p_proposed_starts_at,
        proposed_ends_at = p_proposed_ends_at,
        message = nullif(trim(coalesce(p_message, '')), ''),
        responded_at = now()
    where id = p_request_id
    returning * into v_updated;
  elsif v_action = 'accept_counter' then
    update public.event_schedule_requests
    set status = 'accepted', responded_at = now()
    where id = p_request_id
    returning * into v_updated;

    update public.events
    set starts_at = v_request.proposed_starts_at,
        ends_at = v_request.proposed_ends_at
    where id = v_request.event_id and status <> 'cancelled';

    perform public.sync_event_schedule_requests(v_request.event_id);
  elsif v_action = 'decline_counter' then
    update public.event_schedule_requests
    set status = 'declined', responded_at = now()
    where id = p_request_id
    returning * into v_updated;

    perform set_config('microaxis.skip_version', '1', true);
    perform set_config('microaxis.skip_sync', '1', true);

    update public.events
    set conflict_hold = true,
        status = 'tentative'::public.event_status
    where id = v_request.event_id and status <> 'cancelled';

    perform set_config('microaxis.skip_version', '', true);
    perform set_config('microaxis.skip_sync', '', true);
  elsif v_action = 'withdraw' then
    update public.event_schedule_requests
    set status = 'withdrawn', responded_at = now()
    where id = p_request_id
    returning * into v_updated;

    update public.event_schedule_requests
    set status = 'superseded'
    where event_id = v_request.event_id
      and id <> p_request_id
      and status in ('pending', 'countered');

    update public.events
    set status = 'cancelled', conflict_hold = false
    where id = v_request.event_id;
  end if;

  select * into v_event from public.events where id = v_request.event_id;

  return jsonb_build_object(
    'ok', true,
    'request', to_jsonb(v_updated),
    'event', to_jsonb(v_event)
  );
end;
$$;

create or replace function public.trigger_sync_schedule_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  if coalesce(current_setting('microaxis.skip_sync', true), '') = '1' then return new; end if;
  if auth.uid() is null then return new; end if;

  if new.deleted_at is not null then
    update public.event_schedule_requests
    set status = 'superseded'
    where event_id = new.id and status in ('pending', 'countered');

    update public.events set conflict_hold = false where id = new.id;
    return new;
  end if;

  perform public.sync_event_schedule_requests(new.id);
  return new;
end;
$$;

drop trigger if exists events_sync_schedule_requests on public.events;
create trigger events_sync_schedule_requests
  after insert or update of starts_at, ends_at, all_day, time_zone, calendar_id,
    status, recurrence_rule, recurrence_until, deleted_at
  on public.events
  for each row execute function public.trigger_sync_schedule_requests();

revoke all on function public.event_occurrences(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.event_conflicts(uuid) from public, anon, authenticated;
revoke all on function public.schedule_request_recipient_ids(uuid) from public, anon;
revoke all on function public.refresh_event_conflict_hold(uuid) from public, anon;
revoke all on function public.sync_event_schedule_requests(uuid) from public, anon;
revoke all on function public.respond_schedule_request(uuid, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.respond_schedule_request(uuid, text, timestamptz, timestamptz, text) to authenticated;
