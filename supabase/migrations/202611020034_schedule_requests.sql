create type public.schedule_request_status as enum (
  'pending',
  'accepted',
  'declined',
  'countered',
  'withdrawn',
  'superseded'
);

create table public.event_schedule_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  conflict_event_id uuid not null references public.events(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status public.schedule_request_status not null default 'pending',
  proposed_starts_at timestamptz,
  proposed_ends_at timestamptz,
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint event_schedule_requests_distinct_parties check (requester_id <> recipient_id),
  constraint event_schedule_requests_proposed_order check (
    proposed_starts_at is null
    or proposed_ends_at is null
    or proposed_ends_at > proposed_starts_at
  ),
  constraint event_schedule_requests_message_length check (
    message is null or char_length(message) <= 500
  )
);

create unique index event_schedule_requests_pending_idx
  on public.event_schedule_requests (event_id, conflict_event_id, recipient_id)
  where status = 'pending';

create index event_schedule_requests_event_idx
  on public.event_schedule_requests (event_id, created_at desc);

create index event_schedule_requests_recipient_idx
  on public.event_schedule_requests (recipient_id, status, created_at desc);

create index event_schedule_requests_workspace_idx
  on public.event_schedule_requests (workspace_id, created_at desc);

alter table public.event_schedule_requests enable row level security;

create policy event_schedule_requests_select_party
  on public.event_schedule_requests
  for select to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies: requests are created by the event trigger
-- and changed through the validated security-definer RPCs.

create or replace function public.touch_event_schedule_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists event_schedule_requests_touch on public.event_schedule_requests;
create trigger event_schedule_requests_touch
  before update on public.event_schedule_requests
  for each row execute function public.touch_event_schedule_request();

alter table public.events
  add column if not exists conflict_hold boolean not null default false;
