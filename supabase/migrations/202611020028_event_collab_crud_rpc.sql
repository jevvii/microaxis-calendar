-- Event update/delete
create or replace function public.update_event(
  p_event_id uuid,
  p_expected_version integer,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_current public.events%rowtype;
  v_updated public.events%rowtype;
  v_calendar public.calendars%rowtype;
  v_category_id uuid;
  v_existing jsonb;
  v_participant uuid;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  select * into v_current from public.events where id = p_event_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'conflict', true, 'current', null);
  end if;
  if v_current.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'conflict', true, 'current', to_jsonb(v_current));
  end if;
  if v_current.created_by <> v_user and not public.can_edit_event(p_event_id, v_user) then
    raise exception 'You do not have permission to edit this event';
  end if;

  select * into v_calendar
  from public.calendars
  where id = coalesce(nullif(p_payload ->> 'calendar_id', '')::uuid, v_current.calendar_id)
    and deleted_at is null;
  if not found then raise exception 'Calendar not found'; end if;
  if v_calendar.workspace_id <> v_current.workspace_id then
    raise exception 'An event cannot be moved to another workspace';
  end if;
  if not public.can_contribute_to_calendar(v_calendar.id, v_user) then
    raise exception 'You do not have permission to use this calendar';
  end if;

  v_category_id := case
    when p_payload ? 'category_id' then nullif(p_payload ->> 'category_id', '')::uuid
    else v_current.category_id
  end;
  if v_category_id is not null and not exists (
    select 1 from public.event_categories
    where id = v_category_id and workspace_id = v_calendar.workspace_id
  ) then
    raise exception 'Category does not belong to this workspace';
  end if;
  if nullif(trim(p_payload ->> 'title'), '') is null then raise exception 'Add a title'; end if;

  update public.events
  set calendar_id = v_calendar.id,
      title = trim(p_payload ->> 'title'),
      description = case when p_payload ? 'description' then nullif(p_payload ->> 'description', '') else description end,
      location = case when p_payload ? 'location' then nullif(p_payload ->> 'location', '') else location end,
      starts_at = coalesce(nullif(p_payload ->> 'starts_at', '')::timestamptz, starts_at),
      ends_at = coalesce(nullif(p_payload ->> 'ends_at', '')::timestamptz, ends_at),
      all_day = coalesce((p_payload ->> 'all_day')::boolean, all_day),
      time_zone = coalesce(nullif(p_payload ->> 'time_zone', ''), time_zone),
      category_id = v_category_id,
      priority = coalesce((p_payload ->> 'priority')::public.event_priority, priority),
      status = coalesce((p_payload ->> 'status')::public.event_status, status),
      visibility = coalesce((p_payload ->> 'visibility')::public.event_visibility, visibility),
      recurrence_rule = case when p_payload ? 'recurrence_rule' then nullif(p_payload ->> 'recurrence_rule', '') else recurrence_rule end,
      recurrence_until = case when p_payload ? 'recurrence_until' then nullif(p_payload ->> 'recurrence_until', '')::timestamptz else recurrence_until end,
      export_to_google = coalesce((p_payload ->> 'export_to_google')::boolean, export_to_google)
  where id = p_event_id and version = p_expected_version
  returning * into v_updated;

  if not found then
    select * into v_current from public.events where id = p_event_id;
    return jsonb_build_object('ok', false, 'conflict', true, 'current', to_jsonb(v_current));
  end if;

  v_existing := coalesce(
    (select jsonb_object_agg(user_id, status) from public.event_participants where event_id = p_event_id),
    '{}'::jsonb
  );
  delete from public.event_participants where event_id = p_event_id;

  for v_participant in
    select (jsonb_array_elements_text(coalesce(p_payload -> 'participant_ids', '[]'::jsonb)))::uuid
  loop
    if public.is_workspace_member(v_calendar.workspace_id, v_participant) then
      insert into public.event_participants (event_id, user_id, status, responded_at)
      values (
        p_event_id,
        v_participant,
        coalesce((v_existing ->> v_participant::text)::public.rsvp_status, 'no_response'),
        now()
      )
      on conflict (event_id, user_id) do nothing;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'event', to_jsonb(v_updated),
    'calendar_kind', v_calendar.kind
  );
end;
$$;

create or replace function public.delete_event(
  p_event_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_current public.events%rowtype;
  v_updated public.events%rowtype;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  select * into v_current from public.events where id = p_event_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'conflict', true, 'current', null);
  end if;
  if v_current.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'conflict', true, 'current', to_jsonb(v_current));
  end if;
  if v_current.created_by <> v_user and not public.can_edit_event(p_event_id, v_user) then
    raise exception 'You do not have permission to delete this event';
  end if;

  update public.events
  set deleted_at = now()
  where id = p_event_id and version = p_expected_version
  returning * into v_updated;

  if not found then
    select * into v_current from public.events where id = p_event_id;
    return jsonb_build_object('ok', false, 'conflict', true, 'current', to_jsonb(v_current));
  end if;
  return jsonb_build_object('ok', true, 'event', to_jsonb(v_updated));
end;
$$;

-- Comments
create or replace function public.create_comment(p_event_id uuid, p_body text)
returns public.event_comments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_event public.events%rowtype;
  v_comment public.event_comments%rowtype;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  select * into v_event from public.events where id = p_event_id and deleted_at is null;
  if not found then raise exception 'Event not found'; end if;
  if not public.can_view_event(p_event_id, v_user) then
    raise exception 'You do not have access to this event';
  end if;
  if nullif(trim(p_body), '') is null or char_length(p_body) > 5000 then
    raise exception 'Comments must be between 1 and 5000 characters';
  end if;
  insert into public.event_comments (workspace_id, event_id, author_id, body)
  values (v_event.workspace_id, p_event_id, v_user, trim(p_body))
  returning * into v_comment;
  return v_comment;
end;
$$;

create or replace function public.update_comment(p_comment_id uuid, p_body text)
returns public.event_comments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_comment public.event_comments%rowtype;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  select * into v_comment from public.event_comments where id = p_comment_id and deleted_at is null;
  if not found then raise exception 'Comment not found'; end if;
  if v_comment.author_id <> v_user
    and public.workspace_role(v_comment.workspace_id, v_user) not in ('owner', 'admin') then
    raise exception 'You can only edit your own comments';
  end if;
  if nullif(trim(p_body), '') is null or char_length(p_body) > 5000 then
    raise exception 'Comments must be between 1 and 5000 characters';
  end if;
  update public.event_comments set body = trim(p_body) where id = p_comment_id
  returning * into v_comment;
  return v_comment;
end;
$$;

create or replace function public.delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_comment public.event_comments%rowtype;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  select * into v_comment from public.event_comments where id = p_comment_id and deleted_at is null;
  if not found then return; end if;
  if v_comment.author_id <> v_user
    and public.workspace_role(v_comment.workspace_id, v_user) not in ('owner', 'admin') then
    raise exception 'You can only delete your own comments';
  end if;
  update public.event_comments set deleted_at = now() where id = p_comment_id;
end;
$$;

-- Attachments
create or replace function public.create_attachment(
  p_workspace_id uuid,
  p_event_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint
)
returns public.event_attachments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_event public.events%rowtype;
  v_attachment public.event_attachments%rowtype;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  select * into v_event from public.events where id = p_event_id and deleted_at is null;
  if not found then raise exception 'Event not found'; end if;
  if v_event.workspace_id <> p_workspace_id then raise exception 'Workspace mismatch'; end if;
  if not public.can_view_event(p_event_id, v_user) then
    raise exception 'You do not have access to this event';
  end if;
  if p_storage_path not like p_workspace_id::text || '/' || p_event_id::text || '/%' then
    raise exception 'Invalid attachment path';
  end if;
  if p_size_bytes <= 0 or p_size_bytes > 10485760 then
    raise exception 'Attachments must be 10 MB or smaller';
  end if;
  insert into public.event_attachments (
    workspace_id, event_id, uploaded_by, storage_path, file_name, mime_type, size_bytes
  )
  values (p_workspace_id, p_event_id, v_user, p_storage_path, p_file_name, p_mime_type, p_size_bytes)
  returning * into v_attachment;
  return v_attachment;
end;
$$;

create or replace function public.delete_attachment(p_attachment_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_attachment public.event_attachments%rowtype;
  v_event public.events%rowtype;
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  select * into v_attachment from public.event_attachments where id = p_attachment_id and deleted_at is null;
  if not found then return null; end if;
  select * into v_event from public.events where id = v_attachment.event_id;
  if v_attachment.uploaded_by <> v_user
    and not public.can_manage_calendar(v_event.calendar_id, v_user) then
    raise exception 'You do not have permission to delete this attachment';
  end if;
  update public.event_attachments set deleted_at = now() where id = p_attachment_id;
  return v_attachment.storage_path;
end;
$$;

-- Notification state and export preferences
create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = auth.uid()
$$;

create or replace function public.update_notification_preferences(p_preferences jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'You need to be signed in'; end if;
  if jsonb_typeof(p_preferences) <> 'object' then raise exception 'Preferences must be an object'; end if;
  update public.profiles set notification_preferences = p_preferences where id = auth.uid();
end;
$$;

create or replace function public.set_calendar_export(p_calendar_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'You need to be signed in'; end if;
  if not public.calendar_has_full_details(p_calendar_id, v_user) then
    raise exception 'Busy-only calendar shares cannot be exported';
  end if;
  if p_enabled then
    insert into public.calendar_export_preferences (user_id, calendar_id, enabled)
    values (v_user, p_calendar_id, true)
    on conflict (user_id, calendar_id) do update set enabled = true, updated_at = now();
  else
    delete from public.calendar_export_preferences
    where user_id = v_user and calendar_id = p_calendar_id;
  end if;
end;
$$;

revoke all on function public.update_event(uuid, integer, jsonb) from public, anon;
revoke all on function public.delete_event(uuid, integer) from public, anon;
revoke all on function public.create_comment(uuid, text) from public, anon;
revoke all on function public.update_comment(uuid, text) from public, anon;
revoke all on function public.delete_comment(uuid) from public, anon;
revoke all on function public.create_attachment(uuid, uuid, text, text, text, bigint) from public, anon;
revoke all on function public.delete_attachment(uuid) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.update_notification_preferences(jsonb) from public, anon;
revoke all on function public.set_calendar_export(uuid, boolean) from public, anon;

grant execute on function public.update_event(uuid, integer, jsonb) to authenticated;
grant execute on function public.delete_event(uuid, integer) to authenticated;
grant execute on function public.create_comment(uuid, text) to authenticated;
grant execute on function public.update_comment(uuid, text) to authenticated;
grant execute on function public.delete_comment(uuid) to authenticated;
grant execute on function public.create_attachment(uuid, uuid, text, text, text, bigint) to authenticated;
grant execute on function public.delete_attachment(uuid) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.update_notification_preferences(jsonb) to authenticated;
grant execute on function public.set_calendar_export(uuid, boolean) to authenticated;
