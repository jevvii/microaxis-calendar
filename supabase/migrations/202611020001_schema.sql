create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.team_role as enum ('lead', 'member');
create type public.calendar_role as enum ('viewer', 'participant', 'editor', 'manager');
create type public.calendar_kind as enum ('personal', 'team', 'workspace', 'shared');
create type public.calendar_visibility as enum ('private', 'team', 'workspace');
create type public.event_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.event_status as enum ('scheduled', 'tentative', 'cancelled');
create type public.event_visibility as enum ('calendar', 'participants', 'private');
create type public.rsvp_status as enum ('going', 'maybe', 'declined', 'no_response');
create type public.share_subject as enum ('user', 'team', 'workspace');
create type public.notification_type as enum (
  'event_reminder',
  'event_created',
  'event_updated',
  'event_cancelled',
  'comment_mention',
  'daily_agenda',
  'workspace_invite',
  'system'
);
create type public.notification_channel as enum ('in_app', 'email', 'push');
create type public.notification_status as enum ('pending', 'processing', 'sent', 'failed', 'skipped');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  timezone text not null default 'Asia/Manila',
  week_starts_on smallint not null default 1 check (week_starts_on in (0, 1)),
  clock_24h boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#2F5D78' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.team_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table public.event_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#67675E' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'dots',
  created_at timestamptz not null default now()
);

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  name text not null,
  description text,
  kind public.calendar_kind not null,
  color text not null default '#0C7A43' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  visibility public.calendar_visibility not null default 'private',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint calendars_owner_shape check (
    (kind = 'personal' and owner_id is not null and team_id is null)
    or (kind = 'team' and team_id is not null and owner_id is null)
    or (kind in ('workspace', 'shared') and owner_id is null and team_id is null)
  )
);

create table public.calendar_shares (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  subject_type public.share_subject not null,
  subject_id uuid not null,
  role public.calendar_role not null default 'viewer',
  hide_details boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint calendar_shares_role check (role <> 'manager'),
  unique (calendar_id, subject_type, subject_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  time_zone text not null default 'Asia/Manila',
  category_id uuid references public.event_categories(id) on delete set null,
  priority public.event_priority not null default 'normal',
  status public.event_status not null default 'scheduled',
  visibility public.event_visibility not null default 'calendar',
  recurrence_rule text,
  recurrence_until timestamptz,
  recurrence_exceptions jsonb not null default '[]'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint events_time_order check (ends_at > starts_at)
);

create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.rsvp_status not null default 'no_response',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.event_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.event_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.event_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel public.notification_channel not null,
  status public.notification_status not null default 'pending',
  attempts integer not null default 0,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (notification_id, channel)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table public.google_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  google_sub text,
  google_email text,
  google_calendar_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scope text,
  sync_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.google_event_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  google_calendar_id text not null,
  google_event_id text not null,
  sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed')),
  last_synced_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (user_id, event_id, google_calendar_id)
);

create table public.calendar_export_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, calendar_id)
);

create table public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  occurrence_start timestamptz not null,
  minutes_before integer not null check (minutes_before between 0 and 10080),
  channels public.notification_channel[] not null default array['in_app', 'email']::public.notification_channel[],
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, user_id, occurrence_start, minutes_before)
);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member',
  token text not null unique,
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.workspace_audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index teams_workspace_name_unique
  on public.teams (workspace_id, lower(name))
  where deleted_at is null;

create unique index event_categories_workspace_name_unique
  on public.event_categories (workspace_id, lower(name));

create index workspace_members_user_idx on public.workspace_members (user_id);
create index workspace_members_workspace_idx on public.workspace_members (workspace_id);
create index team_members_user_idx on public.team_members (user_id);
create index team_members_team_idx on public.team_members (team_id);
create index teams_workspace_idx on public.teams (workspace_id) where deleted_at is null;
create index calendars_workspace_idx on public.calendars (workspace_id) where deleted_at is null;
create index calendars_owner_idx on public.calendars (owner_id) where deleted_at is null;
create index calendars_team_idx on public.calendars (team_id) where deleted_at is null;
create index calendar_shares_calendar_idx on public.calendar_shares (calendar_id);
create index calendar_shares_subject_idx on public.calendar_shares (subject_type, subject_id);
create index events_workspace_starts_idx on public.events (workspace_id, starts_at) where deleted_at is null;
create index events_calendar_starts_idx on public.events (calendar_id, starts_at) where deleted_at is null;
create index events_created_by_idx on public.events (created_by) where deleted_at is null;
create index events_category_idx on public.events (category_id) where deleted_at is null;
create index events_title_trgm_idx on public.events using gin (title gin_trgm_ops);
create index event_participants_user_idx on public.event_participants (user_id);
create index event_comments_event_idx on public.event_comments (event_id, created_at) where deleted_at is null;
create index event_attachments_event_idx on public.event_attachments (event_id) where deleted_at is null;
create index event_activity_event_idx on public.event_activity (event_id, created_at);
create index notifications_user_read_idx on public.notifications (user_id, read_at);
create index notifications_workspace_created_idx on public.notifications (workspace_id, created_at desc);
create index notification_outbox_due_idx on public.notification_outbox (status, scheduled_at) where status in ('pending', 'failed');
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index google_event_links_user_event_idx on public.google_event_links (user_id, event_id);
create index calendar_export_preferences_calendar_idx on public.calendar_export_preferences (calendar_id);
create index event_reminders_due_idx on public.event_reminders (sent_at, occurrence_start) where sent_at is null;
create index workspace_invites_token_idx on public.workspace_invites (token);
create index workspace_invites_email_idx on public.workspace_invites (lower(email));
create index workspace_audit_log_workspace_created_idx on public.workspace_audit_log (workspace_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.event_categories enable row level security;
alter table public.calendars enable row level security;
alter table public.calendar_shares enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_comments enable row level security;
alter table public.event_attachments enable row level security;
alter table public.event_activity enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.google_connections enable row level security;
alter table public.google_event_links enable row level security;
alter table public.calendar_export_preferences enable row level security;
alter table public.event_reminders enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.workspace_audit_log enable row level security;
