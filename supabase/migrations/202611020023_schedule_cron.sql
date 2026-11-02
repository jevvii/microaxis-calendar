-- Re-schedule notification and Google sync jobs after database settings exist.
-- Safe to run even if 202611020008_notify.sql already scheduled them.
do $$
declare
  v_url text := current_setting('app.settings.supabase_url', true);
  v_secret text := current_setting('app.settings.cron_secret', true);
begin
  if v_url is null or v_secret is null then
    raise notice 'Set app.settings.supabase_url and app.settings.cron_secret before scheduling jobs.';
    return;
  end if;

  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not enabled; skipping notification scheduling.';
    return;
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
