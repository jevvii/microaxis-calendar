drop policy if exists teams_update_admin_or_lead on public.teams;
create policy teams_update_admin_or_lead on public.teams
  for update to authenticated
  using (
    public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin')
    or public.team_role(id, auth.uid()) = 'lead'
  )
  with check (
    public.workspace_role(workspace_id, auth.uid()) in ('owner', 'admin')
    or public.team_role(id, auth.uid()) = 'lead'
  );
