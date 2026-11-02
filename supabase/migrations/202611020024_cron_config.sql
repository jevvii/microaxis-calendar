create schema if not exists private;

create table if not exists private.cron_config (
  key text primary key,
  value text not null
);

revoke all on schema private from anon, authenticated;
revoke all on private.cron_config from anon, authenticated;

create or replace function private.schedule_microaxis_jobs()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from private.cron_config where key = 'supabase_url';
  select value into v_secret from private.cron_config where key = 'cron_secret';

  if v_url is null or v_secret is null then
    raise exception 'Insert supabase_url and cron_secret into private.cron_config first';
  end if;

  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron is not enabled';
  end if;

  if exists (select 1 from cron.job where jobname = 'microaxis-reminders') then
    perform cron.unschedule('microaxis-reminders');
  end if;
  if exists (select 1 from cron.job where jobname = 'microaxis-outbox') then
    perform cron.unschedule('microaxis-outbox');
  end if;
  if exists (select 1 from cron.job where jobname = 'microaxis-google-sync') then
    perform cron.unschedule('microaxis-google-sync');
  end if;

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
end;
$$;

revoke all on function private.schedule_microaxis_jobs() from public, anon, authenticated;
