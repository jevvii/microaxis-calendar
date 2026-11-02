drop policy if exists calendar_shares_insert_manager on public.calendar_shares;
create policy calendar_shares_insert_manager on public.calendar_shares
  for insert to authenticated
  with check (
    public.can_manage_calendar(calendar_id, auth.uid())
    and role <> 'manager'
    and public.calendar_share_subject_allowed(calendar_id, subject_type, subject_id)
    and (
      role <> 'editor'
      or exists (
        select 1 from public.calendars c
        where c.id = calendar_id and c.kind <> 'personal'
      )
    )
  );

drop policy if exists calendar_shares_update_manager on public.calendar_shares;
create policy calendar_shares_update_manager on public.calendar_shares
  for update to authenticated
  using (public.can_manage_calendar(calendar_id, auth.uid()))
  with check (
    public.can_manage_calendar(calendar_id, auth.uid())
    and role <> 'manager'
    and public.calendar_share_subject_allowed(calendar_id, subject_type, subject_id)
    and (
      role <> 'editor'
      or exists (
        select 1 from public.calendars c
        where c.id = calendar_id and c.kind <> 'personal'
      )
    )
  );
