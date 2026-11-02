-- A busy-only share grants time visibility, not event details. It must never be
-- usable as a Google export source, because the sync worker runs with service role.
drop policy if exists calendar_export_preferences_all_self on public.calendar_export_preferences;

create policy calendar_export_preferences_all_self on public.calendar_export_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.calendar_has_full_details(calendar_id, auth.uid())
  );
