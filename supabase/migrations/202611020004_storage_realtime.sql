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
  e.deleted_at
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-attachments',
  'event-attachments',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists event_attachments_objects_read on storage.objects;
create policy event_attachments_objects_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'event-attachments'
    and public.can_view_event((storage.foldername(name))[2]::uuid, auth.uid())
  );

drop policy if exists event_attachments_objects_insert on storage.objects;
create policy event_attachments_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-attachments'
    and public.can_view_event((storage.foldername(name))[2]::uuid, auth.uid())
    and (storage.foldername(name))[1]::uuid = (
      select e.workspace_id
      from public.events e
      where e.id = (storage.foldername(name))[2]::uuid
    )
  );

drop policy if exists event_attachments_objects_delete on storage.objects;
create policy event_attachments_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'event-attachments'
    and (
      owner_id::text = auth.uid()::text
      or exists (
        select 1
        from public.event_attachments ea
        join public.events e on e.id = ea.event_id
        where ea.storage_path = storage.objects.name
          and public.can_manage_calendar(e.calendar_id, auth.uid())
      )
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.events, public.event_participants, public.event_comments, public.event_attachments, public.notifications, public.calendars';
    exception when duplicate_object then
      null;
    end;
  end if;
end;
$$;

drop policy if exists workspace_broadcast_read on realtime.messages;
create policy workspace_broadcast_read on realtime.messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.user_id = auth.uid()
        and realtime.topic() = 'workspace:' || wm.workspace_id::text
    )
  );

drop policy if exists workspace_broadcast_write on realtime.messages;
create policy workspace_broadcast_write on realtime.messages
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.workspace_members wm
      where wm.user_id = auth.uid()
        and realtime.topic() = 'workspace:' || wm.workspace_id::text
    )
  );
