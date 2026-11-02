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

  return jsonb_build_object(
    'event', to_jsonb(v_event),
    'calendar_kind', v_calendar.kind
  );
end;
$$;

revoke all on function public.create_event(uuid, jsonb) from public, anon;
grant execute on function public.create_event(uuid, jsonb) to authenticated;
