drop policy if exists workspace_members_insert_admin on public.workspace_members;
create policy workspace_members_insert_admin on public.workspace_members
  for insert to authenticated
  with check (
    (
      public.workspace_role(workspace_id, auth.uid()) = 'owner'
    )
    or (
      public.workspace_role(workspace_id, auth.uid()) = 'admin'
      and role in ('admin', 'member')
    )
  );

drop policy if exists workspace_members_update_admin on public.workspace_members;
create policy workspace_members_update_admin on public.workspace_members
  for update to authenticated
  using (
    public.workspace_role(workspace_id, auth.uid()) = 'owner'
    or (
      public.workspace_role(workspace_id, auth.uid()) = 'admin'
      and role <> 'owner'
    )
  )
  with check (
    public.workspace_role(workspace_id, auth.uid()) = 'owner'
    or (
      public.workspace_role(workspace_id, auth.uid()) = 'admin'
      and role <> 'owner'
    )
  );

drop policy if exists workspace_members_delete_admin on public.workspace_members;
create policy workspace_members_delete_admin on public.workspace_members
  for delete to authenticated
  using (
    public.workspace_role(workspace_id, auth.uid()) = 'owner'
    or (
      public.workspace_role(workspace_id, auth.uid()) = 'admin'
      and role <> 'owner'
    )
  );

drop policy if exists workspace_invites_write_admin on public.workspace_invites;
create policy workspace_invites_write_admin on public.workspace_invites
  for all to authenticated
  using (public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin'))
  with check (
    (
      public.workspace_role(workspace_id, auth.uid()) = 'owner'
      or (
        public.workspace_role(workspace_id, auth.uid()) = 'admin'
        and role <> 'owner'
      )
    )
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
