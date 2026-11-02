# MicroAxis Calendar — Security Model

## Tenant isolation

Every tenant-owned row carries a `workspace_id`. RLS is enabled on every public table. Access is derived from `workspace_members`, `team_members`, calendar ownership, and `calendar_shares`; clients never supply a workspace filter as proof of access.

The helper functions in `202611020003_rls.sql` are `security definer`, `stable`, and use `set search_path = ''`. They are the only place where cross-table membership lookups are allowed to bypass RLS.

## Role derivation

`calendar_role(calendar_id, user_id)` returns the highest applicable role:

1. Personal owner → `manager`
2. Team member → `participant`; team lead → `manager`
3. Workspace member → `participant`; workspace Owner/Admin → `manager`
4. Custom shared creator → `manager`; explicit share → `viewer`/`participant`/`editor`
5. Any explicit user, team, or workspace share

There is no path from workspace Admin to another user’s personal calendar unless the owner shares it.

Every calendar access check also requires live workspace membership and a live workspace. Removing a member triggers cleanup of their team memberships, user-targeted calendar shares, export preferences, reminder rows, and queued notifications. A soft-deleted workspace therefore revokes calendar access immediately, not just from the workspace list.


## Busy-only shares

`calendar_has_full_details(calendar_id, user_id)` is true only when at least one access path is not marked `hide_details`.

- The `events` table is selectable only through `can_view_event`, which requires full details. A busy-only viewer cannot read event rows, comments, attachments, or activity through the base tables.
- `calendar_visible_events` is an owner-rights view that masks title, description, location, category, priority, recurrence, and exceptions for busy-only viewers. It shows the time block and status only.
- Attachment storage policies use `can_view_event`, so a busy-only viewer cannot request a signed URL.

## Mutations

- Event updates require `can_edit_event`: creator, calendar Editor, or calendar Manager. Private events are creator-only.
- Attendance is a separate `event_participants` row. A user can update their own RSVP; editors can manage participants.
- Calendar settings, shares, and membership require `can_manage_calendar`.
- The last workspace Owner cannot be removed; a trigger enforces this even against direct SQL.
- Workspace Admins can manage workspace/team calendars but cannot read or mutate personal calendar content without a share.

## Secrets

Google OAuth tokens are stored only in `google_connections`, encrypted by the Edge Function before storage. Authenticated clients have column-level access to safe status fields only; the token columns are revoked. `notification_outbox` is service-role only.

## Storage

A workspace may store at most 50 MB of event attachments, and a single file is limited to 10 MB. Both limits are enforced server-side.


Bucket `event-attachments` is private, limited to 10 MB, and restricted to an explicit MIME allowlist. Object paths are `<workspace_id>/<event_id>/<uuid>.<ext>`. Insert and select require event access; delete requires the uploader or calendar Manager.

## Realtime

Postgres Changes are used for events, participants, comments, attachments, notifications, and calendars. RLS on the source tables governs row visibility. Broadcast/presence channels use `workspace:<workspace_id>` and are guarded by `realtime.messages` policies tied to workspace membership.

## Known free-tier limits

- Supabase Free: 500 MB database, 1 GB storage, 5 GB egress, 200 concurrent Realtime connections, 2M messages/month.
- The beta target is 10 workspaces / 100 users. Public-scale use requires a paid plan.
- No server-side malware scanning is included in v1. Uploads are limited by MIME and size, and attachments are served through short-lived signed URLs.
