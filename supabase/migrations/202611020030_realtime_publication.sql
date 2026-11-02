-- Extend Realtime coverage to the tables that drive sidebar structure.
-- The original publication statement in 202611020004 adds six tables at once and
-- aborts as a whole when any one is already a member, so add them one by one.
do $$
declare
  v_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach v_table in array array[
    'teams',
    'team_members',
    'workspace_members',
    'calendar_shares',
    'event_categories'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    exception
      when duplicate_object then null;
    end;
  end loop;
end;
$$;

-- DELETE events only carry primary keys unless the table logs full rows.
-- These tables are small and their removals change who can see what.
alter table public.team_members replica identity full;
alter table public.workspace_members replica identity full;
alter table public.calendar_shares replica identity full;

-- Share rows were only readable by calendar managers, which also meant
-- calendarRole() could not derive a recipient's role. Realtime only delivers
-- rows the subscriber can SELECT, so sharing a calendar needs this policy for the
-- recipient's sidebar to update without a manual refresh.
drop policy if exists calendar_shares_select_recipient on public.calendar_shares;
create policy calendar_shares_select_recipient on public.calendar_shares
  for select to authenticated
  using (
    (subject_type = 'user' and subject_id = auth.uid())
    or (
      subject_type = 'team'
      and exists (
        select 1
        from public.team_members tm
        where tm.team_id = calendar_shares.subject_id
          and tm.user_id = auth.uid()
      )
    )
    or (
      subject_type = 'workspace'
      and public.is_workspace_member(subject_id, auth.uid())
    )
  );
