insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
)
values (
  'a0000000-0000-4000-8000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'new.member@microaxis.test',
  extensions.crypt('microaxis-demo', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"New Member"}'::jsonb,
  'authenticated',
  'authenticated'
)
on conflict (id) do nothing;

set role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claims', '{"email":"mara@microaxis.test"}', false);

do $$
declare
  v_workspace uuid;
  v_invite record;
  v_categories integer;
begin
  select public.create_workspace_with_owner('Test Workspace', 'test-workspace') into v_workspace;

  if v_workspace is null then
    raise exception 'create_workspace_with_owner returned no workspace';
  end if;

  select count(*) into v_categories
  from public.event_categories
  where workspace_id = v_workspace;

  if v_categories <> 7 then
    raise exception 'Expected 7 default categories, found %', v_categories;
  end if;

  select * into v_invite
  from public.create_workspace_invite(
    v_workspace,
    'new.member@microaxis.test',
    'member',
    null
  );

  if v_invite.token is null then
    raise exception 'Invite token was not created';
  end if;

  perform set_config('microaxis.test.invite_token', v_invite.token, false);
  perform set_config('microaxis.test.workspace_id', v_workspace::text, false);
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000099', false);
select set_config('request.jwt.claims', '{"email":"new.member@microaxis.test"}', false);

do $$
declare
  v_workspace uuid;
  v_token text := current_setting('microaxis.test.invite_token');
  v_joined integer;
begin
  select public.accept_workspace_invite(v_token) into v_workspace;

  select count(*) into v_joined
  from public.workspace_members
  where workspace_id = v_workspace
    and user_id = 'a0000000-0000-4000-8000-000000000099';

  if v_joined <> 1 then
    raise exception 'Invitee did not join the workspace';
  end if;
end;
$$;

do $$
declare
  v_roles text;
begin
  select string_agg(user_id::text || ':' || role::text, ',' order by user_id)
  into v_roles
  from public.workspace_members
  where workspace_id = '10000000-0000-4000-8000-000000000001';

  if v_roles not like '%a0000000-0000-4000-8000-000000000001:owner%' then
    raise exception 'Expected Mara to remain the workspace owner before transfer, got %', v_roles;
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claims', '{"email":"mara@microaxis.test"}', false);

select public.transfer_workspace_ownership(
  '10000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002'
);

reset role;

do $$
declare
  v_old text;
  v_new text;
begin
  select role::text into v_old
  from public.workspace_members
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and user_id = 'a0000000-0000-4000-8000-000000000001';

  select role::text into v_new
  from public.workspace_members
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and user_id = 'a0000000-0000-4000-8000-000000000002';

  if v_old <> 'admin' or v_new <> 'owner' then
    raise exception 'Ownership transfer failed: old=%, new=%', v_old, v_new;
  end if;
end;
$$;

insert into public.workspaces (id, name, slug, created_by)
values (
  '10000000-0000-4000-8000-000000000099',
  'Purge Test',
  'purge-test',
  'a0000000-0000-4000-8000-000000000001'
);

insert into public.workspace_members (workspace_id, user_id, role)
values (
  '10000000-0000-4000-8000-000000000099',
  'a0000000-0000-4000-8000-000000000001',
  'owner'
);

update public.workspaces
set deleted_at = now() - interval '31 days'
where id = '10000000-0000-4000-8000-000000000099';

select public.purge_deleted_workspaces();

do $$
begin
  if exists (select 1 from public.workspaces where id = '10000000-0000-4000-8000-000000000099') then
    raise exception 'Deleted workspace should be purged after 30 days';
  end if;
end;
$$;

reset role;
