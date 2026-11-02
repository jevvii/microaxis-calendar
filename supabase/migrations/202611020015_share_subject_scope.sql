create or replace function public.calendar_share_subject_allowed(
  p_calendar_id uuid,
  p_subject_type public.share_subject,
  p_subject_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.calendars c
    where c.id = p_calendar_id
      and c.deleted_at is null
      and (
        (p_subject_type = 'workspace' and p_subject_id = c.workspace_id)
        or (
          p_subject_type = 'team'
          and exists (
            select 1 from public.teams t
            where t.id = p_subject_id
              and t.workspace_id = c.workspace_id
              and t.deleted_at is null
          )
        )
        or (
          p_subject_type = 'user'
          and exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = c.workspace_id
              and wm.user_id = p_subject_id
          )
        )
      )
  )
$$;

drop policy if exists calendar_shares_insert_manager on public.calendar_shares;
create policy calendar_shares_insert_manager on public.calendar_shares
  for insert to authenticated
  with check (
    public.can_manage_calendar(calendar_id, auth.uid())
    and role <> 'manager'
    and public.calendar_share_subject_allowed(calendar_id, subject_type, subject_id)
  );

drop policy if exists calendar_shares_update_manager on public.calendar_shares;
create policy calendar_shares_update_manager on public.calendar_shares
  for update to authenticated
  using (public.can_manage_calendar(calendar_id, auth.uid()))
  with check (
    public.can_manage_calendar(calendar_id, auth.uid())
    and role <> 'manager'
    and public.calendar_share_subject_allowed(calendar_id, subject_type, subject_id)
  );

drop policy if exists workspace_invites_write_admin on public.workspace_invites;
create policy workspace_invites_write_admin on public.workspace_invites
  for all to authenticated
  using (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'))
  with check (
    public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin')
    and (
      team_id is null
      or exists (
        select 1 from public.teams t
        where t.id = team_id
          and t.workspace_id = workspace_id
          and t.deleted_at is null
      )
    )
  );

drop policy if exists events_update_editor on public.events;
create policy events_update_editor on public.events
  for update to authenticated
  using (public.can_edit_event(id, auth.uid()))
  with check (
    public.can_contribute_to_calendar(calendar_id, auth.uid())
    and exists (
      select 1 from public.calendars c
      where c.id = calendar_id
        and c.workspace_id = workspace_id
        and c.deleted_at is null
    )
  );

drop policy if exists event_comments_insert_viewer on public.event_comments;
create policy event_comments_insert_viewer on public.event_comments
  for insert to authenticated
  with check (
    public.can_view_event(event_id, auth.uid())
    and author_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.workspace_id = workspace_id
    )
  );

drop policy if exists event_attachments_insert_viewer on public.event_attachments;
create policy event_attachments_insert_viewer on public.event_attachments
  for insert to authenticated
  with check (
    public.can_view_event(event_id, auth.uid())
    and uploaded_by = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.workspace_id = workspace_id
    )
  );

create or replace function public.accept_workspace_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invite public.workspace_invites%rowtype;
begin
  if v_user is null then
    raise exception 'You need to be signed in';
  end if;

  select *
  into v_invite
  from public.workspace_invites
  where token = p_token
    and accepted_at is null
    and expires_at > now()
    and lower(email) = v_email
  for update;

  if not found then
    raise exception 'This invitation is invalid or has expired';
  end if;

  if v_invite.team_id is not null and not exists (
    select 1 from public.teams t
    where t.id = v_invite.team_id
      and t.workspace_id = v_invite.workspace_id
      and t.deleted_at is null
  ) then
    raise exception 'The invitation team does not belong to this workspace';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, v_user, v_invite.role)
  on conflict (workspace_id, user_id) do nothing;

  if v_invite.team_id is not null then
    insert into public.team_members (team_id, user_id, role)
    values (v_invite.team_id, v_user, 'member')
    on conflict (team_id, user_id) do nothing;
  end if;

  update public.workspace_invites
  set accepted_at = now()
  where id = v_invite.id;

  return v_invite.workspace_id;
end;
$$;

grant execute on function public.calendar_share_subject_allowed(uuid, public.share_subject, uuid) to authenticated;
