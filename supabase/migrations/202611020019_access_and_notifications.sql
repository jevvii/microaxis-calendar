-- 1. Calendar access requires live workspace membership and a live workspace.
create or replace function public.calendar_role(p_calendar_id uuid, p_user_id uuid)
returns public.calendar_role
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select 1
    from public.calendars c
    join public.workspaces w on w.id = c.workspace_id
    where c.id = p_calendar_id
      and c.deleted_at is null
      and w.deleted_at is null
      and public.is_workspace_member(c.workspace_id, p_user_id)
  ),
  candidates as (
    select 'manager'::public.calendar_role as role
    from public.calendars c
    where exists (select 1 from eligible)
      and c.id = p_calendar_id and c.kind = 'personal' and c.owner_id = p_user_id

    union all

    select case when tm.role = 'lead' then 'manager'::public.calendar_role else 'participant'::public.calendar_role end
    from public.calendars c
    join public.team_members tm on tm.team_id = c.team_id
    where exists (select 1 from eligible)
      and c.id = p_calendar_id and c.kind = 'team' and tm.user_id = p_user_id

    union all

    select 'manager'::public.calendar_role
    from public.calendars c
    join public.workspace_members wm on wm.workspace_id = c.workspace_id
    where exists (select 1 from eligible)
      and c.id = p_calendar_id and c.kind = 'team'
      and wm.user_id = p_user_id and wm.role in ('owner', 'admin')

    union all

    select case when wm.role in ('owner', 'admin') then 'manager'::public.calendar_role else 'participant'::public.calendar_role end
    from public.calendars c
    join public.workspace_members wm on wm.workspace_id = c.workspace_id
    where exists (select 1 from eligible)
      and c.id = p_calendar_id and c.kind = 'workspace' and wm.user_id = p_user_id

    union all

    select 'manager'::public.calendar_role
    from public.calendars c
    where exists (select 1 from eligible)
      and c.id = p_calendar_id and c.kind = 'shared' and c.created_by = p_user_id

    union all

    select s.role
    from public.calendar_shares s
    join public.calendars c on c.id = s.calendar_id
    where exists (select 1 from eligible)
      and s.calendar_id = p_calendar_id and s.subject_type = 'user' and s.subject_id = p_user_id

    union all

    select s.role
    from public.calendar_shares s
    join public.calendars c on c.id = s.calendar_id
    join public.team_members tm on tm.team_id = s.subject_id and tm.user_id = p_user_id
    where exists (select 1 from eligible)
      and s.calendar_id = p_calendar_id and s.subject_type = 'team'

    union all

    select s.role
    from public.calendar_shares s
    join public.calendars c on c.id = s.calendar_id
    join public.workspace_members wm on wm.workspace_id = s.subject_id and wm.user_id = p_user_id
    where exists (select 1 from eligible)
      and s.calendar_id = p_calendar_id and s.subject_type = 'workspace'
  )
  select role from candidates
  order by case role when 'manager' then 4 when 'editor' then 3 when 'participant' then 2 else 1 end desc
  limit 1
$$;

create or replace function public.calendar_has_full_details(p_calendar_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select 1
    from public.calendars c
    join public.workspaces w on w.id = c.workspace_id
    where c.id = p_calendar_id
      and c.deleted_at is null
      and w.deleted_at is null
      and public.is_workspace_member(c.workspace_id, p_user_id)
  ),
  candidates as (
    select true as full_details
    from public.calendars c
    where exists (select 1 from eligible)
      and c.id = p_calendar_id
      and ((c.kind = 'personal' and c.owner_id = p_user_id) or (c.kind = 'shared' and c.created_by = p_user_id))

    union all

    select true
    from public.calendars c
    join public.team_members tm on tm.team_id = c.team_id
    where exists (select 1 from eligible)
      and c.id = p_calendar_id and c.kind = 'team' and tm.user_id = p_user_id

    union all

    select true
    from public.calendars c
    join public.workspace_members wm on wm.workspace_id = c.workspace_id
    where exists (select 1 from eligible)
      and c.id = p_calendar_id
      and ((c.kind = 'team' and wm.user_id = p_user_id and wm.role in ('owner', 'admin'))
        or (c.kind = 'workspace' and wm.user_id = p_user_id))

    union all

    select true
    from public.calendar_shares s
    join public.calendars c on c.id = s.calendar_id
    where exists (select 1 from eligible)
      and s.calendar_id = p_calendar_id and s.hide_details = false
      and ((s.subject_type = 'user' and s.subject_id = p_user_id)
        or (s.subject_type = 'workspace' and exists (
          select 1 from public.workspace_members wm where wm.workspace_id = s.subject_id and wm.user_id = p_user_id
        ))
        or (s.subject_type = 'team' and exists (
          select 1 from public.team_members tm where tm.team_id = s.subject_id and tm.user_id = p_user_id
        )))
  )
  select exists (select 1 from candidates where full_details)
$$;

create or replace function public.cleanup_workspace_member_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.team_members tm
  using public.teams t
  where tm.team_id = t.id
    and t.workspace_id = old.workspace_id
    and tm.user_id = old.user_id;

  delete from public.calendar_shares s
  using public.calendars c
  where s.calendar_id = c.id
    and c.workspace_id = old.workspace_id
    and s.subject_type = 'user'
    and s.subject_id = old.user_id;

  delete from public.calendar_export_preferences cep
  using public.calendars c
  where cep.calendar_id = c.id
    and c.workspace_id = old.workspace_id
    and cep.user_id = old.user_id;

  delete from public.event_reminders er
  using public.events e
  where er.event_id = e.id
    and e.workspace_id = old.workspace_id
    and er.user_id = old.user_id;

  delete from public.notification_outbox o
  using public.notifications n
  where o.notification_id = n.id
    and n.workspace_id = old.workspace_id
    and n.user_id = old.user_id;

  delete from public.notifications n
  where n.workspace_id = old.workspace_id
    and n.user_id = old.user_id;

  return old;
end;
$$;

drop trigger if exists workspace_members_cleanup_access on public.workspace_members;
create trigger workspace_members_cleanup_access
  after delete on public.workspace_members
  for each row execute function public.cleanup_workspace_member_access();

-- 2. Recipient resolution also requires live workspace membership.
create or replace function public.event_recipient_ids(p_event_id uuid)
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_calendar_id uuid;
  v_workspace_id uuid;
  v_visibility public.event_visibility;
  v_created_by uuid;
begin
  select e.calendar_id, e.workspace_id, e.visibility, e.created_by
  into v_calendar_id, v_workspace_id, v_visibility, v_created_by
  from public.events e
  join public.calendars c on c.id = e.calendar_id
  join public.workspaces w on w.id = e.workspace_id
  where e.id = p_event_id
    and e.deleted_at is null
    and c.deleted_at is null
    and w.deleted_at is null;

  if v_calendar_id is null then return; end if;

  if v_visibility = 'private' then
    return query
      select v_created_by
      where v_created_by is not null
        and public.is_workspace_member(v_workspace_id, v_created_by);
    return;
  end if;

  if v_visibility = 'participants' then
    return query
      select distinct recipients.user_id
      from (
        select v_created_by as user_id
        union
        select ep.user_id from public.event_participants ep where ep.event_id = p_event_id
      ) recipients
      where recipients.user_id is not null
        and public.is_workspace_member(v_workspace_id, recipients.user_id);
    return;
  end if;

  if exists (select 1 from public.event_participants ep where ep.event_id = p_event_id) then
    return query
      select distinct ep.user_id
      from public.event_participants ep
      where ep.event_id = p_event_id
        and public.is_workspace_member(v_workspace_id, ep.user_id);
    return;
  end if;

  return query
    select distinct recipients.user_id
    from (
      select c.owner_id as user_id from public.calendars c where c.id = v_calendar_id and c.owner_id is not null
      union
      select tm.user_id from public.calendars c join public.team_members tm on tm.team_id = c.team_id
      where c.id = v_calendar_id and c.kind = 'team'
      union
      select wm.user_id from public.calendars c join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where c.id = v_calendar_id and c.kind = 'workspace'
      union
      select s.subject_id from public.calendar_shares s
      where s.calendar_id = v_calendar_id and s.subject_type = 'user'
      union
      select tm.user_id from public.calendar_shares s
      join public.team_members tm on tm.team_id = s.subject_id
      where s.calendar_id = v_calendar_id and s.subject_type = 'team'
      union
      select wm.user_id from public.calendar_shares s
      join public.workspace_members wm on wm.workspace_id = s.subject_id
      where s.calendar_id = v_calendar_id and s.subject_type = 'workspace'
    ) recipients
    where recipients.user_id is not null
      and public.is_workspace_member(v_workspace_id, recipients.user_id);
end;
$$;

-- 3. RSVP must go through a scoped RPC so a participant cannot reassign a row.
create or replace function public.set_event_rsvp(p_event_id uuid, p_status public.rsvp_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  if not public.can_view_event(p_event_id, v_user) then
    raise exception 'You do not have access to this event';
  end if;

  insert into public.event_participants (event_id, user_id, status, responded_at)
  values (p_event_id, v_user, p_status, now())
  on conflict (event_id, user_id) do update
  set status = excluded.status, responded_at = excluded.responded_at;
end;
$$;

drop policy if exists event_participants_update_self_or_editor on public.event_participants;
create policy event_participants_update_editor on public.event_participants
  for update to authenticated
  using (public.can_edit_event(event_id, auth.uid()))
  with check (public.can_edit_event(event_id, auth.uid()));

-- 4. Attachment soft-delete policy and per-workspace quota.
drop policy if exists event_attachments_update_uploader_or_manager on public.event_attachments;
create policy event_attachments_update_uploader_or_manager on public.event_attachments
  for update to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (select 1 from public.events e where e.id = event_id and public.can_manage_calendar(e.calendar_id, auth.uid()))
  )
  with check (
    uploaded_by = auth.uid()
    or exists (select 1 from public.events e where e.id = event_id and public.can_manage_calendar(e.calendar_id, auth.uid()))
  );

create or replace function public.enforce_workspace_attachment_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used bigint;
begin
  select coalesce(sum(size_bytes), 0) into v_used
  from public.event_attachments
  where workspace_id = new.workspace_id and deleted_at is null;

  if v_used + new.size_bytes > 52428800 then
    raise exception 'Workspace attachment limit is 50 MB';
  end if;
  return new;
end;
$$;

drop trigger if exists event_attachments_quota on public.event_attachments;
create trigger event_attachments_quota
  before insert on public.event_attachments
  for each row execute function public.enforce_workspace_attachment_quota();

-- 5. Immediate event/mention notifications and outbox rows.
create or replace function public.queue_notification_channels(
  p_notification_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefs jsonb;
begin
  select notification_preferences into v_prefs from public.profiles where id = p_user_id;

  if coalesce((v_prefs ->> 'email')::boolean, true) then
    insert into public.notification_outbox (notification_id, channel, scheduled_at)
    values (p_notification_id, 'email', now())
    on conflict (notification_id, channel) do nothing;
  end if;

  if coalesce((v_prefs ->> 'push')::boolean, false) then
    insert into public.notification_outbox (notification_id, channel, scheduled_at)
    values (p_notification_id, 'push', now())
    on conflict (notification_id, channel) do nothing;
  end if;
end;
$$;

create or replace function public.notify_event_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(auth.uid(), new.created_by);
  v_recipient uuid;
  v_notification uuid;
  v_type public.notification_type;
  v_title text;
  v_body text;
  v_full boolean;
begin
  if tg_op = 'INSERT' then
    v_type := 'event_created';
  elsif new.deleted_at is not null and old.deleted_at is null then
    v_type := 'event_cancelled';
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    v_type := 'event_cancelled';
  elsif new.title is distinct from old.title
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at
    or new.location is distinct from old.location then
    v_type := 'event_updated';
  else
    return new;
  end if;

  for v_recipient in select public.event_recipient_ids(new.id) loop
    if v_recipient = v_actor then continue; end if;
    v_full := public.calendar_has_full_details(new.calendar_id, v_recipient);

    v_title := case
      when not v_full then
        case when v_type = 'event_cancelled' then 'A shared event was cancelled' else 'A shared calendar changed' end
      when v_type = 'event_cancelled' then 'Cancelled: ' || new.title
      when v_type = 'event_updated' then 'Updated: ' || new.title
      else 'New shared event: ' || new.title
    end;

    v_body := case
      when not v_full then 'A shared calendar has an update.'
      else to_char(new.starts_at at time zone new.time_zone, 'Mon DD, HH12:MI AM')
        || case when new.location is not null then ' · ' || new.location else '' end
    end;

    insert into public.notifications (
      workspace_id, user_id, type, title, body, href, metadata, dedupe_key
    )
    values (
      new.workspace_id, v_recipient, v_type, v_title, v_body,
      '/app/calendar?event=' || new.id,
      jsonb_build_object('eventId', new.id, 'fullDetails', v_full),
      'eventchange:' || new.id || ':' || new.version || ':' || v_recipient
    )
    on conflict (dedupe_key) do nothing
    returning id into v_notification;

    if v_notification is not null then
      perform public.queue_notification_channels(v_notification, v_recipient);
    end if;
  end loop;

  return new;
end;
$$;

create or replace function public.notify_comment_mention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_actor uuid := coalesce(auth.uid(), new.author_id);
  v_actor_name text;
  v_profile record;
  v_notification uuid;
begin
  select * into v_event from public.events where id = new.event_id;
  if v_event.id is null then return new; end if;

  select full_name into v_actor_name from public.profiles where id = v_actor;

  for v_profile in
    select p.id, p.full_name
    from public.workspace_members wm
    join public.profiles p on p.id = wm.user_id
    where wm.workspace_id = v_event.workspace_id
      and p.id <> v_actor
  loop
    if strpos(lower(new.body), lower('@' || v_profile.full_name)) > 0
      and public.can_view_event(new.event_id, v_profile.id) then
      insert into public.notifications (
        workspace_id, user_id, type, title, body, href, metadata, dedupe_key
      )
      values (
        v_event.workspace_id, v_profile.id, 'comment_mention',
        coalesce(v_actor_name, 'A teammate') || ' mentioned you in ' || v_event.title,
        left(new.body, 180),
        '/app/calendar?event=' || v_event.id,
        jsonb_build_object('eventId', v_event.id, 'commentId', new.id, 'fullDetails', true),
        'mention:' || new.id || ':' || v_profile.id
      )
      on conflict (dedupe_key) do nothing
      returning id into v_notification;

      if v_notification is not null then
        perform public.queue_notification_channels(v_notification, v_profile.id);
      end if;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists events_notify_change on public.events;
create trigger events_notify_change
  after insert or update on public.events
  for each row execute function public.notify_event_change();

drop trigger if exists event_comments_notify_mention on public.event_comments;
create trigger event_comments_notify_mention
  after insert on public.event_comments
  for each row execute function public.notify_comment_mention();

-- 6. Serialize notification worker runs and protect helper execution.
create or replace function public.notify_lock()
returns boolean
language sql
security definer
set search_path = ''
as $$ select pg_try_advisory_lock(hashtextextended('microaxis-notify', 0)) $$;

create or replace function public.notify_unlock()
returns void
language sql
security definer
set search_path = ''
as $$ select pg_advisory_unlock(hashtextextended('microaxis-notify', 0)) $$;

revoke execute on function public.workspace_role(uuid, uuid) from public, anon;
revoke execute on function public.is_workspace_member(uuid, uuid) from public, anon;
revoke execute on function public.team_role(uuid, uuid) from public, anon;
revoke execute on function public.is_team_member(uuid, uuid) from public, anon;
revoke execute on function public.calendar_role(uuid, uuid) from public, anon;
revoke execute on function public.calendar_has_full_details(uuid, uuid) from public, anon;
revoke execute on function public.can_view_event(uuid, uuid) from public, anon;
revoke execute on function public.can_edit_event(uuid, uuid) from public, anon;
revoke execute on function public.can_manage_calendar(uuid, uuid) from public, anon;
revoke execute on function public.can_contribute_to_calendar(uuid, uuid) from public, anon;
revoke execute on function public.calendar_share_subject_allowed(uuid, public.share_subject, uuid) from public, anon;
revoke execute on function public.event_recipient_ids(uuid) from public, anon, authenticated;
revoke execute on function public.set_event_rsvp(uuid, public.rsvp_status) from public, anon;
revoke execute on function public.notify_lock() from public, anon, authenticated;
revoke execute on function public.notify_unlock() from public, anon, authenticated;

grant execute on function public.workspace_role(uuid, uuid) to authenticated;
grant execute on function public.is_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.team_role(uuid, uuid) to authenticated;
grant execute on function public.is_team_member(uuid, uuid) to authenticated;
grant execute on function public.calendar_role(uuid, uuid) to authenticated;
grant execute on function public.calendar_has_full_details(uuid, uuid) to authenticated;
grant execute on function public.can_view_event(uuid, uuid) to authenticated;
grant execute on function public.can_edit_event(uuid, uuid) to authenticated;
grant execute on function public.can_manage_calendar(uuid, uuid) to authenticated;
grant execute on function public.can_contribute_to_calendar(uuid, uuid) to authenticated;
grant execute on function public.calendar_share_subject_allowed(uuid, public.share_subject, uuid) to authenticated;
grant execute on function public.set_event_rsvp(uuid, public.rsvp_status) to authenticated;
