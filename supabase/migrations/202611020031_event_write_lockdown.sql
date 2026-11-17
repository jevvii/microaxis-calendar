-- Event writes must go through the validated security-definer RPCs. Allowing
-- direct PostgREST writes lets an authenticated editor update an event without
-- the expected version, bypassing optimistic concurrency and RPC validation.
drop policy if exists events_insert_contributor on public.events;
drop policy if exists events_update_editor on public.events;
drop policy if exists events_delete_editor on public.events;
