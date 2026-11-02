grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

create or replace function public.workspace_role(p_workspace_id uuid, p_user_id uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = ''
as $$
  select wm.role
  from public.workspace_members wm
  join public.workspaces w on w.id = wm.workspace_id
  where wm.workspace_id = p_workspace_id
    and wm.user_id = p_user_id
    and w.deleted_at is null
  limit 1
$$;

create or replace function public.is_workspace_member(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.workspace_role(p_workspace_id, p_user_id) is not null
$$;

create or replace function public.team_role(p_team_id uuid, p_user_id uuid)
returns public.team_role
language sql
stable
security definer
set search_path = ''
as $$
  select tm.role
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.team_id = p_team_id
    and tm.user_id = p_user_id
    and t.deleted_at is null
  limit 1
$$;

create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.team_role(p_team_id, p_user_id) is not null
$$;

create or replace function public.calendar_role(p_calendar_id uuid, p_user_id uuid)
returns public.calendar_role
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select 'manager'::public.calendar_role as role
    from public.calendars c
    where c.id = p_calendar_id
      and c.deleted_at is null
      and c.kind = 'personal'
      and c.owner_id = p_user_id

    union all

    select case when tm.role = 'lead' then 'manager'::public.calendar_role else 'participant'::public.calendar_role end
    from public.calendars c
    join public.team_members tm on tm.team_id = c.team_id
    where c.id = p_calendar_id
      and c.deleted_at is null
      and c.kind = 'team'
      and tm.user_id = p_user_id

    union all

    select 'manager'::public.calendar_role
    from public.calendars c
    join public.workspace_members wm on wm.workspace_id = c.workspace_id
    where c.id = p_calendar_id
      and c.deleted_at is null
      and c.kind = 'team'
      and wm.user_id = p_user_id
      and wm.role in ('owner', 'admin')

    union all

    select case when wm.role in ('owner', 'admin') then 'manager'::public.calendar_role else 'participant'::public.calendar_role end
    from public.calendars c
    join public.workspace_members wm on wm.workspace_id = c.workspace_id
    where c.id = p_calendar_id
      and c.deleted_at is null
      and c.kind = 'workspace'
      and wm.user_id = p_user_id

    union all

    select 'manager'::public.calendar_role
    from public.calendars c
    where c.id = p_calendar_id
      and c.deleted_at is null
      and c.kind = 'shared'
      and c.created_by = p_user_id

    union all

    select s.role
    from public.calendar_shares s
    join public.calendars c on c.id = s.calendar_id
    where s.calendar_id = p_calendar_id
      and c.deleted_at is null
      and s.subject_type = 'user'
      and s.subject_id = p_user_id

    union all

    select s.role
    from public.calendar_shares s
    join public.calendars c on c.id = s.calendar_id
    join public.team_members tm on tm.team_id = s.subject_id and tm.user_id = p_user_id
    where s.calendar_id = p_calendar_id
      and c.deleted_at is null
      and s.subject_type = 'team'

    union all

    select s.role
    from public.calendar_shares s
    join public.calendars c on c.id = s.calendar_id
    join public.workspace_members wm on wm.workspace_id = s.subject_id and wm.user_id = p_user_id
    where s.calendar_id = p_calendar_id
      and c.deleted_at is null
      and s.subject_type = 'workspace'
  )
  select role
  from candidates
  order by case role
    when 'manager' then 4
    when 'editor' then 3
    when 'participant' then 2
    else 1
  end desc
  limit 1
$$;

create or replace function public.calendar_has_full_details(p_calendar_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select true as full_details
    from public.calendars c
    where c.id = p_calendar_id
      and c.deleted_at is null
      and (
        (c.kind = 'personal' and c.owner_id = p_user_id)
        or (c.kind = 'shared' and c.created_by = p_user_id)
      )

    union all

    select true
    from public.calendars c
    join public.team_members tm on tm.team_id = c.team_id
    where c.id = p_calendar_id
      and c.deleted_at is null
      and c.kind = 'team'
      and tm.user_id = p_user_id

    union all

    select true
    from public.calendars c
    join public.workspace_members wm on wm.workspace_id = c.workspace_id
    where c.id = p_calendar_id
      and c.deleted_at is null
      and (
        (c.kind = 'team' and wm.user_id = p_user_id and wm.role in ('owner', 'admin'))
        or (c.kind = 'workspace' and wm.user_id = p_user_id)
      )

    union all

    select true
    from public.calendar_shares s
    join public.calendars c on c.id = s.calendar_id
    where s.calendar_id = p_calendar_id
      and c.deleted_at is null
      and s.hide_details = false
      and (
        (s.subject_type = 'user' and s.subject_id = p_user_id)
        or (s.subject_type = 'workspace' and exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = s.subject_id and wm.user_id = p_user_id
        ))
        or (s.subject_type = 'team' and exists (
          select 1 from public.team_members tm
          where tm.team_id = s.subject_id and tm.user_id = p_user_id
        ))
      )
  )
  select exists (select 1 from candidates where full_details)
$$;

create or replace function public.can_view_event(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.calendars c on c.id = e.calendar_id
    where e.id = p_event_id
      and e.deleted_at is null
      and c.deleted_at is null
      and public.calendar_has_full_details(e.calendar_id, p_user_id)
      and (e.visibility <> 'private' or e.created_by = p_user_id)
      and (
        e.visibility <> 'participants'
        or e.created_by = p_user_id
        or exists (
          select 1 from public.event_participants ep
          where ep.event_id = e.id and ep.user_id = p_user_id
        )
      )
  )
$$;

create or replace function public.can_edit_event(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.calendars c on c.id = e.calendar_id
    where e.id = p_event_id
      and e.deleted_at is null
      and c.deleted_at is null
      and (e.visibility <> 'private' or e.created_by = p_user_id)
      and (
        e.created_by = p_user_id
        or public.calendar_role(e.calendar_id, p_user_id) in ('manager', 'editor')
      )
  )
$$;

create or replace function public.can_manage_calendar(p_calendar_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.calendar_role(p_calendar_id, p_user_id) = 'manager'
$$;

create or replace function public.can_contribute_to_calendar(p_calendar_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.calendar_role(p_calendar_id, p_user_id) in ('participant', 'editor', 'manager')
$$;

create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining integer;
begin
  if old.role <> 'owner' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.role = 'owner' then
    return new;
  end if;

  select count(*) into v_remaining
  from public.workspace_members
  where workspace_id = old.workspace_id
    and role = 'owner'
    and user_id <> old.user_id;

  if v_remaining = 0 then
    raise exception 'A workspace must keep at least one owner';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_members_last_owner on public.workspace_members;
create trigger workspace_members_last_owner
  before update or delete on public.workspace_members
  for each row execute function public.prevent_last_owner_removal();

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.workspace_members me
      join public.workspace_members them on them.workspace_id = me.workspace_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy workspaces_select_member on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id, auth.uid()));

create policy workspaces_insert_self on public.workspaces
  for insert to authenticated
  with check (created_by = auth.uid());

create policy workspaces_update_admin on public.workspaces
  for update to authenticated
  using (public.workspace_role(id, auth.uid()) in ('owner', 'admin'))
  with check (public.workspace_role(id, auth.uid()) in ('owner', 'admin'));

create policy workspaces_delete_owner on public.workspaces
  for delete to authenticated
  using (public.workspace_role(id, auth.uid()) = 'owner');

create policy workspace_members_select_member on public.workspace_members
  for select to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy workspace_members_insert_admin on public.workspace_members
  for insert to authenticated
  with check (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'));

create policy workspace_members_update_admin on public.workspace_members
  for update to authenticated
  using (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'))
  with check (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'));

create policy workspace_members_delete_admin on public.workspace_members
  for delete to authenticated
  using (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'));

create policy teams_select_member on public.teams
  for select to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy teams_insert_admin on public.teams
  for insert to authenticated
  with check (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'));

create policy teams_update_admin_or_lead on public.teams
  for update to authenticated
  using (
    public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin')
    or public.team_role(id, auth.uid()) = 'lead'
  )
  with check (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'));

create policy teams_delete_admin on public.teams
  for delete to authenticated
  using (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'));

create policy team_members_select_member on public.team_members
  for select to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and public.is_workspace_member(t.workspace_id, auth.uid())
    )
  );

create policy team_members_insert_lead on public.team_members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and (
          public.workspace_role(t.workspace_id, auth.uid()) in ('owner', 'admin')
          or public.team_role(team_id, auth.uid()) = 'lead'
        )
        and public.is_workspace_member(t.workspace_id, user_id)
    )
  );

create policy team_members_update_lead on public.team_members
  for update to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and (
          public.workspace_role(t.workspace_id, auth.uid()) in ('owner', 'admin')
          or public.team_role(team_id, auth.uid()) = 'lead'
        )
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and public.is_workspace_member(t.workspace_id, user_id)
    )
  );

create policy team_members_delete_lead on public.team_members
  for delete to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and (
          public.workspace_role(t.workspace_id, auth.uid()) in ('owner', 'admin')
          or public.team_role(team_id, auth.uid()) = 'lead'
        )
    )
  );

create policy event_categories_select_member on public.event_categories
  for select to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy event_categories_write_admin on public.event_categories
  for all to authenticated
  using (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'))
  with check (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'));

create policy calendars_select_access on public.calendars
  for select to authenticated
  using (public.calendar_role(id, auth.uid()) is not null);

create policy calendars_insert_allowed on public.calendars
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_workspace_member(workspace_id, auth.uid())
    and (
      (kind = 'personal' and owner_id = auth.uid() and team_id is null)
      or (
        kind = 'team'
        and team_id is not null
        and exists (
          select 1 from public.teams t
          where t.id = team_id
            and t.workspace_id = workspace_id
            and (
              public.team_role(t.id, auth.uid()) = 'lead'
              or public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin')
            )
        )
      )
      or (
        kind = 'workspace'
        and owner_id is null
        and team_id is null
        and public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin')
      )
      or (kind = 'shared' and owner_id is null and team_id is null)
    )
  );

create policy calendars_update_manager on public.calendars
  for update to authenticated
  using (public.can_manage_calendar(id, auth.uid()))
  with check (public.can_manage_calendar(id, auth.uid()));

create policy calendars_delete_manager on public.calendars
  for delete to authenticated
  using (public.can_manage_calendar(id, auth.uid()));

create policy calendar_shares_select_manager on public.calendar_shares
  for select to authenticated
  using (public.can_manage_calendar(calendar_id, auth.uid()));

create policy calendar_shares_insert_manager on public.calendar_shares
  for insert to authenticated
  with check (
    public.can_manage_calendar(calendar_id, auth.uid())
    and role <> 'manager'
  );

create policy calendar_shares_update_manager on public.calendar_shares
  for update to authenticated
  using (public.can_manage_calendar(calendar_id, auth.uid()))
  with check (public.can_manage_calendar(calendar_id, auth.uid()) and role <> 'manager');

create policy calendar_shares_delete_manager on public.calendar_shares
  for delete to authenticated
  using (public.can_manage_calendar(calendar_id, auth.uid()));

create policy events_select_full_details on public.events
  for select to authenticated
  using (public.can_view_event(id, auth.uid()));

create policy events_insert_contributor on public.events
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.can_contribute_to_calendar(calendar_id, auth.uid())
    and exists (
      select 1 from public.calendars c
      where c.id = calendar_id and c.workspace_id = workspace_id and c.deleted_at is null
    )
  );

create policy events_update_editor on public.events
  for update to authenticated
  using (public.can_edit_event(id, auth.uid()))
  with check (public.can_contribute_to_calendar(calendar_id, auth.uid()));

create policy events_delete_editor on public.events
  for delete to authenticated
  using (public.can_edit_event(id, auth.uid()));

create policy event_participants_select_viewer on public.event_participants
  for select to authenticated
  using (public.can_view_event(event_id, auth.uid()));

create policy event_participants_insert_self_or_editor on public.event_participants
  for insert to authenticated
  with check (
    public.can_view_event(event_id, auth.uid())
    and (user_id = auth.uid() or public.can_edit_event(event_id, auth.uid()))
  );

create policy event_participants_update_self_or_editor on public.event_participants
  for update to authenticated
  using (
    public.can_view_event(event_id, auth.uid())
    and (user_id = auth.uid() or public.can_edit_event(event_id, auth.uid()))
  )
  with check (public.can_view_event(event_id, auth.uid()));

create policy event_participants_delete_self_or_editor on public.event_participants
  for delete to authenticated
  using (user_id = auth.uid() or public.can_edit_event(event_id, auth.uid()));

create policy event_comments_select_viewer on public.event_comments
  for select to authenticated
  using (public.can_view_event(event_id, auth.uid()) and deleted_at is null);

create policy event_comments_insert_viewer on public.event_comments
  for insert to authenticated
  with check (public.can_view_event(event_id, auth.uid()) and author_id = auth.uid());

create policy event_comments_update_author on public.event_comments
  for update to authenticated
  using (
    public.can_view_event(event_id, auth.uid())
    and (
      author_id = auth.uid()
      or public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin')
    )
  )
  with check (public.can_view_event(event_id, auth.uid()));

create policy event_comments_delete_author on public.event_comments
  for delete to authenticated
  using (
    author_id = auth.uid()
    or public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin')
  );

create policy event_attachments_select_viewer on public.event_attachments
  for select to authenticated
  using (public.can_view_event(event_id, auth.uid()) and deleted_at is null);

create policy event_attachments_insert_viewer on public.event_attachments
  for insert to authenticated
  with check (public.can_view_event(event_id, auth.uid()) and uploaded_by = auth.uid());

create policy event_attachments_delete_uploader_or_manager on public.event_attachments
  for delete to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = event_id and public.can_manage_calendar(e.calendar_id, auth.uid())
    )
  );

create policy event_activity_select_viewer on public.event_activity
  for select to authenticated
  using (public.can_view_event(event_id, auth.uid()));

create policy notifications_select_self on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update_self on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_delete_self on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_all_self on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy google_connections_select_self on public.google_connections
  for select to authenticated
  using (user_id = auth.uid());

create policy google_event_links_select_self on public.google_event_links
  for select to authenticated
  using (user_id = auth.uid());

create policy calendar_export_preferences_all_self on public.calendar_export_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy event_reminders_all_self on public.event_reminders
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy workspace_invites_select_admin_or_invitee on public.workspace_invites
  for select to authenticated
  using (
    public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin')
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy workspace_invites_write_admin on public.workspace_invites
  for all to authenticated
  using (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'))
  with check (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'));

create policy workspace_audit_log_select_admin on public.workspace_audit_log
  for select to authenticated
  using (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'));

revoke all on public.notification_outbox from anon, authenticated;
revoke all on public.google_connections from anon, authenticated;
grant select (user_id, google_email, google_calendar_id, token_expires_at, sync_enabled, created_at, updated_at)
  on public.google_connections to authenticated;
revoke all on public.google_event_links from anon, authenticated;
grant select (id, user_id, event_id, google_calendar_id, sync_status, last_synced_at, error, created_at)
  on public.google_event_links to authenticated;
