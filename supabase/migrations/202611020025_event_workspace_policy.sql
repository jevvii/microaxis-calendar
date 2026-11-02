-- The original subquery compared c.workspace_id to itself. Qualify the outer row
-- so an event cannot be written into a calendar from another workspace.
drop policy if exists events_insert_contributor on public.events;
create policy events_insert_contributor on public.events
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.can_contribute_to_calendar(calendar_id, auth.uid())
    and exists (
      select 1 from public.calendars c
      where c.id = events.calendar_id
        and c.workspace_id = events.workspace_id
        and c.deleted_at is null
    )
  );

drop policy if exists events_update_editor on public.events;
create policy events_update_editor on public.events
  for update to authenticated
  using (public.can_edit_event(id, auth.uid()))
  with check (
    public.can_contribute_to_calendar(calendar_id, auth.uid())
    and exists (
      select 1 from public.calendars c
      where c.id = events.calendar_id
        and c.workspace_id = events.workspace_id
        and c.deleted_at is null
    )
  );
