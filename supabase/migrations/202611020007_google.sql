alter table public.events
  add column if not exists export_to_google boolean not null default true;

create table if not exists public.google_oauth_states (
  state text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.google_oauth_states enable row level security;
revoke all on public.google_oauth_states from anon, authenticated;

create index if not exists google_oauth_states_expires_idx
  on public.google_oauth_states (expires_at);

create index if not exists google_connections_sync_idx
  on public.google_connections (sync_enabled)
  where sync_enabled = true;
