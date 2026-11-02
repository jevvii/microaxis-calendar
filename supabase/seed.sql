insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'mara@microaxis.test',
    crypt('microaxis-demo', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mara Velasco"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'ivo@microaxis.test',
    crypt('microaxis-demo', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ivo Santos"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'rin@microaxis.test',
    crypt('microaxis-demo', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rin Takahashi"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'a0000000-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'bea@microaxis.test',
    crypt('microaxis-demo', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bea Ocampo"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

update public.profiles
set timezone = 'Asia/Manila', week_starts_on = 1, clock_24h = false
where id in (
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000004'
);

insert into public.workspaces (id, name, slug, created_by)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'MicroAxis Studio',
    'microaxis-studio',
    'a0000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Northwind Fieldwork',
    'northwind-fieldwork',
    'a0000000-0000-4000-8000-000000000003'
  )
on conflict (id) do nothing;

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'owner'),
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'admin'),
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'member'),
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'member'),
  ('10000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'owner'),
  ('10000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004', 'member')
on conflict (workspace_id, user_id) do nothing;

insert into public.teams (id, workspace_id, name, description, color, created_by)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Product',
    'Platform strategy, releases, and design review.',
    '#2F5D78',
    'a0000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Client Delivery',
    'Active client builds and launch support.',
    '#8B4039',
    'a0000000-0000-4000-8000-000000000004'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Operations',
    'Studio rhythm, finance, and internal systems.',
    '#8A651A',
    'a0000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    'Field Ops',
    'Site visits, travel, and field reporting.',
    '#3F5C3A',
    'a0000000-0000-4000-8000-000000000003'
  )
on conflict (id) do nothing;

insert into public.team_members (team_id, user_id, role)
values
  ('20000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'lead'),
  ('20000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'lead'),
  ('20000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'member'),
  ('20000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004', 'lead'),
  ('20000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'member'),
  ('20000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'member'),
  ('20000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'lead'),
  ('20000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'member'),
  ('20000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', 'lead'),
  ('20000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'member')
on conflict (team_id, user_id) do nothing;

insert into public.event_categories (id, workspace_id, name, color, icon)
values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Meeting', '#2F5D78', 'users'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Deadline', '#8B4039', 'flag'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Milestone', '#3F5C3A', 'diamond'),
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Leave', '#7A5A1F', 'airplane'),
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Focus', '#6E5140', 'target'),
  ('50000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Holiday', '#5D5D54', 'sun'),
  ('50000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'Other', '#67675E', 'dots'),
  ('50000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000002', 'Field visit', '#3F5C3A', 'map-pin'),
  ('50000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002', 'Travel', '#7A5A1F', 'airplane'),
  ('50000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002', 'Report', '#8B4039', 'flag')
on conflict (id) do nothing;

insert into public.calendars (
  id, workspace_id, owner_id, team_id, name, description, kind, color, visibility, created_by
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    null,
    'Mara’s calendar',
    'Personal commitments and deep work.',
    'personal',
    '#0C7A43',
    'private',
    'a0000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    null,
    '20000000-0000-4000-8000-000000000001',
    'Product',
    'Release reviews, planning, and product critique.',
    'team',
    '#2F5D78',
    'team',
    'a0000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    null,
    '20000000-0000-4000-8000-000000000002',
    'Client Delivery',
    'Build windows, handoffs, and launch dates.',
    'team',
    '#8B4039',
    'team',
    'a0000000-0000-4000-8000-000000000004'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    null,
    null,
    'Studio',
    'The whole studio, in one place.',
    'workspace',
    '#8A651A',
    'workspace',
    'a0000000-0000-4000-8000-000000000002'
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    null,
    null,
    'Launch room',
    'A shared room for OceanJet launch week.',
    'shared',
    '#3F5C3A',
    'workspace',
    'a0000000-0000-4000-8000-000000000002'
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000003',
    null,
    'Rin’s calendar',
    'Personal fieldwork and travel.',
    'personal',
    '#0C7A43',
    'private',
    'a0000000-0000-4000-8000-000000000003'
  ),
  (
    '30000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000002',
    null,
    '20000000-0000-4000-8000-000000000004',
    'Field Ops',
    'Site visits and field reporting.',
    'team',
    '#3F5C3A',
    'team',
    'a0000000-0000-4000-8000-000000000003'
  )
on conflict (id) do nothing;

insert into public.calendar_shares (
  id, calendar_id, subject_type, subject_id, role, hide_details, created_by
)
values
  (
    'd0000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'team',
    '20000000-0000-4000-8000-000000000001',
    'viewer',
    false,
    'a0000000-0000-4000-8000-000000000001'
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000005',
    'user',
    'a0000000-0000-4000-8000-000000000001',
    'participant',
    false,
    'a0000000-0000-4000-8000-000000000002'
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000005',
    'user',
    'a0000000-0000-4000-8000-000000000004',
    'participant',
    false,
    'a0000000-0000-4000-8000-000000000002'
  )
on conflict (calendar_id, subject_type, subject_id) do nothing;

insert into public.events (
  id, workspace_id, calendar_id, created_by, title, description, location,
  starts_at, ends_at, all_day, time_zone, category_id, priority, status,
  visibility, recurrence_rule
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'OceanJet release review',
    'Final pass on the ticketing release before the freeze.',
    'Room 2',
    '2026-11-03T01:30:00.000Z',
    '2026-11-03T02:30:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000001',
    'high',
    'scheduled',
    'calendar',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Milksha sprint planning',
    'Scope the next ordering release and assign the first slices.',
    'Studio room',
    '2026-11-03T06:00:00.000Z',
    '2026-11-03T07:00:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000001',
    'normal',
    'scheduled',
    'calendar',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000003',
    'DBM accessibility audit',
    'Review keyboard flow and contrast across the transparency portal.',
    'Room 1',
    '2026-11-04T03:00:00.000Z',
    '2026-11-04T04:00:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000003',
    'urgent',
    'scheduled',
    'calendar',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000004',
    'Studio review',
    'Show what shipped, what broke, and what we learned.',
    'Studio room',
    '2026-11-06T02:00:00.000Z',
    '2026-11-06T03:00:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000001',
    'normal',
    'scheduled',
    'calendar',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000002',
    'Flying Tigers handoff',
    'Hand the dispatch release to the client operations team.',
    'Video call',
    '2026-11-06T07:30:00.000Z',
    '2026-11-06T08:30:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000002',
    'high',
    'scheduled',
    'calendar',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Deep work: pricing model',
    'No calls. Model the retainer tiers and margin floor.',
    null,
    '2026-11-05T01:00:00.000Z',
    '2026-11-05T04:00:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000005',
    'normal',
    'scheduled',
    'private',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Product weekly',
    'One decision, one demo, one blocker.',
    null,
    '2026-11-02T02:00:00.000Z',
    '2026-11-02T02:30:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000001',
    'normal',
    'scheduled',
    'calendar',
    'FREQ=WEEKLY;COUNT=8'
  ),
  (
    '40000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000004',
    'Leave: Bea Ocampo',
    'Back Monday. Rin has the client handoff.',
    null,
    '2026-11-05T00:00:00.000Z',
    '2026-11-06T00:00:00.000Z',
    true,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000004',
    'normal',
    'scheduled',
    'calendar',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000009',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000005',
    'a0000000-0000-4000-8000-000000000002',
    'Launch room retro',
    'What should the next launch week reuse?',
    null,
    '2026-11-04T08:00:00.000Z',
    '2026-11-04T09:00:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000001',
    'normal',
    'scheduled',
    'calendar',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000004',
    'Invoice review',
    'Close October and flag anything that slipped.',
    null,
    '2026-11-02T05:00:00.000Z',
    '2026-11-02T05:45:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000002',
    'normal',
    'scheduled',
    'calendar',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000011',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000001',
    'All Saints’ Day',
    'Studio closed.',
    null,
    '2026-11-01T00:00:00.000Z',
    '2026-11-02T00:00:00.000Z',
    true,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000006',
    'normal',
    'scheduled',
    'calendar',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000003',
    'OceanJet go-live',
    'Release window opens at 06:00.',
    null,
    '2026-11-07T00:00:00.000Z',
    '2026-11-08T00:00:00.000Z',
    true,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000003',
    'urgent',
    'scheduled',
    'calendar',
    null
  ),
  (
    '40000000-0000-4000-8000-000000000013',
    '10000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000007',
    'a0000000-0000-4000-8000-000000000003',
    'Northwind site visit',
    'Meet the field crew at the north gate.',
    'North gate',
    '2026-11-04T00:30:00.000Z',
    '2026-11-04T02:30:00.000Z',
    false,
    'Asia/Manila',
    '50000000-0000-4000-8000-000000000008',
    'high',
    'scheduled',
    'calendar',
    null
  )
on conflict (id) do nothing;

insert into public.event_participants (event_id, user_id, status, responded_at)
values
  ('40000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'going', '2026-11-02T02:00:00.000Z'),
  ('40000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'going', '2026-11-02T02:05:00.000Z'),
  ('40000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'no_response', null),
  ('40000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'going', '2026-11-01T02:00:00.000Z'),
  ('40000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'maybe', '2026-11-01T03:00:00.000Z'),
  ('40000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'going', '2026-11-02T00:30:00.000Z'),
  ('40000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000002', 'going', '2026-11-02T00:35:00.000Z'),
  ('40000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000004', 'maybe', '2026-11-02T01:00:00.000Z')
on conflict (event_id, user_id) do nothing;

insert into public.event_comments (workspace_id, event_id, author_id, body, created_at)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000003',
    '@Mara Velasco can you check the focus order on step 3?',
    '2026-11-01T23:55:00.000Z'
  ),
  (
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000002',
    'The release notes are in the shared folder. I will walk through the last two tickets.',
    '2026-11-02T01:10:00.000Z'
  );

insert into public.notifications (
  id, workspace_id, user_id, type, title, body, href, metadata, created_at
)
values
  (
    '60000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'event_reminder',
    'OceanJet release review in 1 hour',
    'Room 2 · Ivo Santos',
    '/app/calendar?event=40000000-0000-4000-8000-000000000001',
    '{"eventId":"40000000-0000-4000-8000-000000000001"}'::jsonb,
    '2026-11-03T00:30:00.000Z'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'event_created',
    'Ivo added Launch room retro',
    'Launch room · Wed, Nov 4 at 4:00 PM',
    '/app/calendar?event=40000000-0000-4000-8000-000000000009',
    '{"eventId":"40000000-0000-4000-8000-000000000009"}'::jsonb,
    '2026-11-02T00:25:00.000Z'
  ),
  (
    '60000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'comment_mention',
    'Rin mentioned you in DBM accessibility audit',
    '“Mara, can you check the focus order on step 3?”',
    '/app/calendar?event=40000000-0000-4000-8000-000000000003',
    '{"eventId":"40000000-0000-4000-8000-000000000003"}'::jsonb,
    '2026-11-01T23:55:00.000Z'
  )
on conflict (id) do nothing;

insert into public.event_reminders (
  event_id, user_id, occurrence_start, minutes_before, channels
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    '2026-11-03T01:30:00.000Z',
    60,
    array['in_app', 'email']::public.notification_channel[]
  ),
  (
    '40000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    '2026-11-03T01:30:00.000Z',
    1440,
    array['in_app', 'email']::public.notification_channel[]
  )
on conflict (event_id, user_id, occurrence_start, minutes_before) do nothing;

insert into public.workspace_invites (
  workspace_id, team_id, email, role, token, invited_by, expires_at
)
values (
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'new.member@microaxis.test',
  'member',
  'demo-invite-token',
  'a0000000-0000-4000-8000-000000000001',
  '2026-12-02T00:00:00.000Z'
)
on conflict (token) do nothing;
