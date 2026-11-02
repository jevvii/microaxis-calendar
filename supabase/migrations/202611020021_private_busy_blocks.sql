create or replace view public.calendar_visible_events
with (security_invoker = false)
as
select
  e.id,
  e.workspace_id,
  e.calendar_id,
  e.created_by,
  case
    when (e.visibility = 'private' and e.created_by is distinct from auth.uid())
      or not public.calendar_has_full_details(e.calendar_id, auth.uid()) then 'Busy'
    else e.title
  end as title,
  case
    when (e.visibility = 'private' and e.created_by is distinct from auth.uid())
      or not public.calendar_has_full_details(e.calendar_id, auth.uid()) then null
    else e.description
  end as description,
  case
    when (e.visibility = 'private' and e.created_by is distinct from auth.uid())
      or not public.calendar_has_full_details(e.calendar_id, auth.uid()) then null
    else e.location
  end as location,
  e.starts_at,
  e.ends_at,
  e.all_day,
  e.time_zone,
  case
    when (e.visibility = 'private' and e.created_by is distinct from auth.uid())
      or not public.calendar_has_full_details(e.calendar_id, auth.uid()) then null
    else e.category_id
  end as category_id,
  case
    when (e.visibility = 'private' and e.created_by is distinct from auth.uid())
      or not public.calendar_has_full_details(e.calendar_id, auth.uid()) then 'normal'::public.event_priority
    else e.priority
  end as priority,
  e.status,
  e.visibility,
  case
    when (e.visibility = 'private' and e.created_by is distinct from auth.uid())
      or not public.calendar_has_full_details(e.calendar_id, auth.uid()) then null
    else e.recurrence_rule
  end as recurrence_rule,
  case
    when (e.visibility = 'private' and e.created_by is distinct from auth.uid())
      or not public.calendar_has_full_details(e.calendar_id, auth.uid()) then null
    else e.recurrence_until
  end as recurrence_until,
  case
    when (e.visibility = 'private' and e.created_by is distinct from auth.uid())
      or not public.calendar_has_full_details(e.calendar_id, auth.uid()) then '[]'::jsonb
    else e.recurrence_exceptions
  end as recurrence_exceptions,
  e.version,
  e.created_at,
  e.updated_at,
  e.deleted_at,
  e.export_to_google
from public.events e
join public.calendars c on c.id = e.calendar_id
where e.deleted_at is null
  and c.deleted_at is null
  and public.calendar_role(e.calendar_id, auth.uid()) is not null
  and (
    e.visibility <> 'participants'
    or e.created_by = auth.uid()
    or exists (
      select 1 from public.event_participants ep
      where ep.event_id = e.id and ep.user_id = auth.uid()
    )
  );

grant select on public.calendar_visible_events to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.event_recipient_ids(uuid) to service_role;
    grant execute on function public.notify_lock() to service_role;
    grant execute on function public.notify_unlock() to service_role;
  end if;
end;
$$;
