create or replace function public.create_event(
  p_calendar_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_calendar public.calendars%rowtype;
  v_event public.events%rowtype;
  v_participant uuid;
  v_category_id uuid := nullif(p_payload ->> 'category_id', '')::uuid;
begin
  if v_user is null then
    raise exception 'You need to be signed in';
  end if;

  select * into v_calendar
  from public.calendars
  where id = p_calendar_id and deleted_at is null;

  if not found then
    raise exception 'Calendar not found';
  end if;

  if not public.is_workspace_member(v_calendar.workspace_id, v_user)
    or not public.can_contribute_to_calendar(p_calendar_id, v_user) then
    raise exception 'You do not have permission to add events to this calendar';
  end if;

  if nullif(trim(p_payload ->> 'title'), '') is null then
    raise exception 'Add a title';
  end if;

  if v_category_id is not null and not exists (
    select 1 from public.event_categories
    where id = v_category_id and workspace_id = v_calendar.workspace_id
  ) then
    raise exception 'Category does not belong to this workspace';
  end if;

  insert into public.events (
    workspace_id,
    calendar_id,
    created_by,
    title,
    description,
    location,
    starts_at,
    ends_at,
    all_day,
    time_zone,
    category_id,
    priority,
    status,
    visibility,
    recurrence_rule,
    recurrence_until,
    recurrence_exceptions,
    export_to_google
  )
  values (
    v_calendar.workspace_id,
    p_calendar_id,
    v_user,
    trim(p_payload ->> 'title'),
    nullif(p_payload ->> 'description', ''),
    nullif(p_payload ->> 'location', ''),
    (p_payload ->> 'starts_at')::timestamptz,
    (p_payload ->> 'ends_at')::timestamptz,
    coalesce((p_payload ->> 'all_day')::boolean, false),
    coalesce(nullif(p_payload ->> 'time_zone', ''), 'Asia/Manila'),
    v_category_id,
    coalesce((p_payload ->> 'priority')::public.event_priority, 'normal'),
    coalesce((p_payload ->> 'status')::public.event_status, 'scheduled'),
    coalesce((p_payload ->> 'visibility')::public.event_visibility, 'calendar'),
    nullif(p_payload ->> 'recurrence_rule', ''),
    nullif(p_payload ->> 'recurrence_until', '')::timestamptz,
    '[]'::jsonb,
    coalesce((p_payload ->> 'export_to_google')::boolean, true)
  )
  returning * into v_event;

  for v_participant in
    select (jsonb_array_elements_text(coalesce(p_payload -> 'participant_ids', '[]'::jsonb)))::uuid
  loop
    if public.is_workspace_member(v_calendar.workspace_id, v_participant) then
      insert into public.event_participants (event_id, user_id, status)
      values (v_event.id, v_participant, 'no_response')
      on conflict (event_id, user_id) do nothing;
    end if;
  end loop;

  select * into v_event from public.events where id = v_event.id;

  return jsonb_build_object(
    'event', to_jsonb(v_event),
    'calendar_kind', v_calendar.kind
  );
end;
$$;

create or replace function public.update_event(
  p_event_id uuid,
  p_expected_version integer,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_current public.events%rowtype;
  v_updated public.events%rowtype;
  v_calendar public.calendars%rowtype;
  v_category_id uuid;
  v_existing jsonb;
  v_participant uuid;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  select * into v_current from public.events where id = p_event_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'conflict', true, 'current', null);
  end if;
  if v_current.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'conflict', true, 'current', to_jsonb(v_current));
  end if;
  if v_current.created_by <> v_user and not public.can_edit_event(p_event_id, v_user) then
    raise exception 'You do not have permission to edit this event';
  end if;

  select * into v_calendar
  from public.calendars
  where id = coalesce(nullif(p_payload ->> 'calendar_id', '')::uuid, v_current.calendar_id)
    and deleted_at is null;
  if not found then raise exception 'Calendar not found'; end if;
  if v_calendar.workspace_id <> v_current.workspace_id then
    raise exception 'An event cannot be moved to another workspace';
  end if;
  if not public.can_contribute_to_calendar(v_calendar.id, v_user) then
    raise exception 'You do not have permission to use this calendar';
  end if;

  v_category_id := case
    when p_payload ? 'category_id' then nullif(p_payload ->> 'category_id', '')::uuid
    else v_current.category_id
  end;
  if v_category_id is not null and not exists (
    select 1 from public.event_categories
    where id = v_category_id and workspace_id = v_calendar.workspace_id
  ) then
    raise exception 'Category does not belong to this workspace';
  end if;
  if nullif(trim(p_payload ->> 'title'), '') is null then raise exception 'Add a title'; end if;

  update public.events
  set calendar_id = v_calendar.id,
      title = trim(p_payload ->> 'title'),
      description = case when p_payload ? 'description' then nullif(p_payload ->> 'description', '') else description end,
      location = case when p_payload ? 'location' then nullif(p_payload ->> 'location', '') else location end,
      starts_at = coalesce(nullif(p_payload ->> 'starts_at', '')::timestamptz, starts_at),
      ends_at = coalesce(nullif(p_payload ->> 'ends_at', '')::timestamptz, ends_at),
      all_day = coalesce((p_payload ->> 'all_day')::boolean, all_day),
      time_zone = coalesce(nullif(p_payload ->> 'time_zone', ''), time_zone),
      category_id = v_category_id,
      priority = coalesce((p_payload ->> 'priority')::public.event_priority, priority),
      status = coalesce((p_payload ->> 'status')::public.event_status, status),
      visibility = coalesce((p_payload ->> 'visibility')::public.event_visibility, visibility),
      recurrence_rule = case when p_payload ? 'recurrence_rule' then nullif(p_payload ->> 'recurrence_rule', '') else recurrence_rule end,
      recurrence_until = case when p_payload ? 'recurrence_until' then nullif(p_payload ->> 'recurrence_until', '')::timestamptz else recurrence_until end,
      export_to_google = coalesce((p_payload ->> 'export_to_google')::boolean, export_to_google)
  where id = p_event_id and version = p_expected_version
  returning * into v_updated;

  if not found then
    select * into v_current from public.events where id = p_event_id;
    return jsonb_build_object('ok', false, 'conflict', true, 'current', to_jsonb(v_current));
  end if;

  v_existing := coalesce(
    (
      select jsonb_object_agg(
        user_id,
        jsonb_build_object('status', status, 'responded_at', responded_at)
      )
      from public.event_participants
      where event_id = p_event_id
    ),
    '{}'::jsonb
  );
  delete from public.event_participants where event_id = p_event_id;

  for v_participant in
    select (jsonb_array_elements_text(coalesce(p_payload -> 'participant_ids', '[]'::jsonb)))::uuid
  loop
    if public.is_workspace_member(v_calendar.workspace_id, v_participant) then
      insert into public.event_participants (event_id, user_id, status, responded_at)
      values (
        p_event_id,
        v_participant,
        coalesce(
          (v_existing -> v_participant::text ->> 'status')::public.rsvp_status,
          'no_response'
        ),
        case
          when v_existing ? v_participant::text
            then (v_existing -> v_participant::text ->> 'responded_at')::timestamptz
          else null
        end
      )
      on conflict (event_id, user_id) do nothing;
    end if;
  end loop;

  select * into v_updated from public.events where id = p_event_id;

  return jsonb_build_object(
    'ok', true,
    'event', to_jsonb(v_updated),
    'calendar_kind', v_calendar.kind
  );
end;
$$;

create or replace function public.delete_event(
  p_event_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_current public.events%rowtype;
  v_updated public.events%rowtype;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  select * into v_current from public.events where id = p_event_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'conflict', true, 'current', null);
  end if;
  if v_current.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'conflict', true, 'current', to_jsonb(v_current));
  end if;
  if v_current.created_by <> v_user and not public.can_edit_event(p_event_id, v_user) then
    raise exception 'You do not have permission to delete this event';
  end if;

  update public.events
  set deleted_at = now()
  where id = p_event_id and version = p_expected_version
  returning * into v_updated;

  if not found then
    select * into v_current from public.events where id = p_event_id;
    return jsonb_build_object('ok', false, 'conflict', true, 'current', to_jsonb(v_current));
  end if;

  select * into v_updated from public.events where id = p_event_id;
  return jsonb_build_object('ok', true, 'event', to_jsonb(v_updated));
end;
$$;
