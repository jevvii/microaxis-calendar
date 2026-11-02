-- Nullable unique indexes permit multiple NULLs, so this supports both
-- deduplicated reminders and legacy notifications without a key.
drop index if exists public.notifications_dedupe_key_idx;
create unique index notifications_dedupe_key_idx
  on public.notifications (dedupe_key);
