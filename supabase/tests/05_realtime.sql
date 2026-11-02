-- Realtime publication coverage, replica identity, and recipient share visibility.

do $$
declare
  v_missing text;
begin
  select string_agg(tablename, ', ' order by tablename) into v_missing
  from (
    select unnest(array[
      'events',
      'event_participants',
      'event_comments',
      'event_attachments',
      'notifications',
      'calendars',
      'teams',
      'team_members',
      'workspace_members',
      'calendar_shares',
      'event_categories'
    ]) as tablename
  ) expected
  where not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and pg_publication_tables.tablename = expected.tablename
  );

  if v_missing is not null then
    raise exception 'supabase_realtime is missing tables: %', v_missing;
  end if;
end;
$$;

do $$
declare
  v_table text;
  v_identity "char";
begin
  foreach v_table in array array['team_members', 'workspace_members', 'calendar_shares'] loop
    select c.relreplident into v_identity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = v_table;

    if v_identity is distinct from 'f' then
      raise exception '% should use replica identity full, found %', v_table, v_identity;
    end if;
  end loop;
end;
$$;

-- Recipient visibility for share rows. rls.sql added a team share on the
-- personal calendar, and earlier tests revoked the seeded team share.
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', false);
set role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', false);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.calendar_shares
  where calendar_id = '30000000-0000-4000-8000-000000000001'
    and subject_type = 'team'
    and subject_id = '20000000-0000-4000-8000-000000000003';

  if v_count <> 1 then
    raise exception 'a team member should see their team share row, found %', v_count;
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', false);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.calendar_shares
  where calendar_id = '30000000-0000-4000-8000-000000000001'
    and subject_type = 'team'
    and subject_id = '20000000-0000-4000-8000-000000000003';

  if v_count <> 0 then
    raise exception 'a non-recipient should not see the team share row, found %', v_count;
  end if;
end;
$$;

reset role;
