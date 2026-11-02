create or replace view public.calendar_visible_events
with (security_invoker = false)
as
select
  e.id,
  e.workspace_id,
  e.calendar_id,
  e.created_by,
  case
    when public.calendar_has_full_details(e.calendar_id, auth.uid()) then e.title
    else 'Busy'
  end as title,
  case
    when public.calendar_has_full_details(e.calendar_id, auth.uid()) then e.description
    else null
  end as description,
  case
    when public.calendar_has_full_details(e.calendar_id, auth.uid()) then e.location
    else null
  end as location,
  e.starts_at,
  e.ends_at,
  e.all_day,
  e.time_zone,
  case
    when public.calendar_has_full_details(e.calendar_id, auth.uid()) then e.category_id
    else null
  end as category_id,
  case
    when public.calendar_has_full_details(e.calendar_id, auth.uid()) then e.priority
    else 'normal'::public.event_priority
  end as priority,
  e.status,
  e.visibility,
  case
    when public.calendar_has_full_details(e.calendar_id, auth.uid()) then e.recurrence_rule
    else null
  end as recurrence_rule,
  case
    when public.calendar_has_full_details(e.calendar_id, auth.uid()) then e.recurrence_until
    else null
  end as recurrence_until,
  case
    when public.calendar_has_full_details(e.calendar_id, auth.uid()) then e.recurrence_exceptions
    else '[]'::jsonb
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
  and (e.visibility <> 'private' or e.created_by = auth.uid())
  and (
    e.visibility <> 'participants'
    or e.created_by = auth.uid()
    or exists (
      select 1 from public.event_participants ep
      where ep.event_id = e.id and ep.user_id = auth.uid()
    )
  );

grant select on public.calendar_visible_events to authenticated;
