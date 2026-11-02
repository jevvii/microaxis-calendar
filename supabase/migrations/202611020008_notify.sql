alter table public.notifications
  add column if not exists dedupe_key text;

create unique index if not exists notifications_dedupe_key_idx
  on public.notifications (dedupe_key)
  where dedupe_key is not null;

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
begin
  select e.calendar_id, c.kind
  into v_calendar_id, v_kind
  from public.events e
  join public.calendars c on c.id = e.calendar_id
  where e.id = p_event_id
    and e.deleted_at is null
    and c.deleted_at is null;

  if v_calendar_id is null then
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

grant execute on function public.event_recipient_ids(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end;
$$;

do $$
declare
  v_url text := current_setting('app.settings.supabase_url', true);
  v_secret text := current_setting('app.settings.cron_secret', true);
begin
  if v_url is null or v_secret is null then
    raise notice 'Set app.settings.supabase_url and app.settings.cron_secret to schedule notification jobs.';
    return;
  end if;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'microaxis-reminders',
      '* * * * *',
      format(
        $job$
          select net.http_post(
            url := %L,
            headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'),
            body := '{"mode":"reminders"}'::jsonb
          );
        $job$,
        v_url || '/functions/v1/notify',
        'Bearer ' || v_secret
      )
    );

    perform cron.schedule(
      'microaxis-outbox',
      '* * * * *',
      format(
        $job$
          select net.http_post(
            url := %L,
            headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'),
            body := '{"mode":"outbox"}'::jsonb
          );
        $job$,
        v_url || '/functions/v1/notify',
        'Bearer ' || v_secret
      )
    );

    perform cron.schedule(
      'microaxis-google-sync',
      '*/5 * * * *',
      format(
        $job$
          select net.http_post(
            url := %L,
            headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'),
            body := '{}'::jsonb
          );
        $job$,
        v_url || '/functions/v1/google-sync',
        'Bearer ' || v_secret
      )
    );
  end if;
end;
$$;
