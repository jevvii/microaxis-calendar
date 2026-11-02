create or replace function public.event_recipient_ids(p_event_id uuid)
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_calendar_id uuid;
  v_kind public.calendar_kind;
  v_visibility public.event_visibility;
  v_created_by uuid;
begin
  select e.calendar_id, c.kind, e.visibility, e.created_by
  into v_calendar_id, v_kind, v_visibility, v_created_by
  from public.events e
  join public.calendars c on c.id = e.calendar_id
  where e.id = p_event_id
    and e.deleted_at is null
    and c.deleted_at is null;

  if v_calendar_id is null then
    return;
  end if;

  -- Private events are creator-only. Participant-only events are creator plus
  -- explicit participants. Calendar-wide events use participants when present,
  -- otherwise the calendar audience.
  if v_visibility = 'private' then
    return query select v_created_by where v_created_by is not null;
    return;
  end if;

  if v_visibility = 'participants' then
    return query
      select distinct recipients.user_id
      from (
        select v_created_by as user_id
        union
        select ep.user_id
        from public.event_participants ep
        where ep.event_id = p_event_id
      ) recipients
      where recipients.user_id is not null;
    return;
  end if;

  if exists (
    select 1 from public.event_participants ep where ep.event_id = p_event_id
  ) then
    return query
      select distinct ep.user_id
      from public.event_participants ep
      where ep.event_id = p_event_id;
    return;
  end if;

  return query
    select distinct recipients.user_id
    from (
      select c.owner_id as user_id
      from public.calendars c
      where c.id = v_calendar_id and c.owner_id is not null

      union

      select tm.user_id
      from public.calendars c
      join public.team_members tm on tm.team_id = c.team_id
      where c.id = v_calendar_id and c.kind = 'team'

      union

      select wm.user_id
      from public.calendars c
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where c.id = v_calendar_id and c.kind = 'workspace'

      union

      select s.subject_id
      from public.calendar_shares s
      where s.calendar_id = v_calendar_id and s.subject_type = 'user'

      union

      select tm.user_id
      from public.calendar_shares s
      join public.team_members tm on tm.team_id = s.subject_id
      where s.calendar_id = v_calendar_id and s.subject_type = 'team'

      union

      select wm.user_id
      from public.calendar_shares s
      join public.workspace_members wm on wm.workspace_id = s.subject_id
      where s.calendar_id = v_calendar_id and s.subject_type = 'workspace'
    ) recipients
    where recipients.user_id is not null;
end;
$$;
