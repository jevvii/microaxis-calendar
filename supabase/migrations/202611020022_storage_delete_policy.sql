-- Supabase storage.objects.owner_id may be text while auth.uid() is uuid.
-- Recreate the delete policy independently so a partially-applied 004 is repaired.
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
