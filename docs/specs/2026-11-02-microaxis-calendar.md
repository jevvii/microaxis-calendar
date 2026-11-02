# MicroAxis Calendar — Product Specification

**Status:** Approved through structured review, 2026-11-02  
**Product:** MicroAxis Calendar, an independent multi-tenant scheduling product  
**Visual reference:** `/home/javvii/MicroAxis/preview-3-five-questions.html` (reference only; not modified)

## 1. Product

MicroAxis Calendar is a multi-tenant team calendar for small, senior software teams. It combines shared team scheduling, private personal calendars with explicit sharing, lightweight collaboration, and one-way Google Calendar export.

The public landing page remains separate. The app is a PWA hosted on a Render Static Site; Supabase provides authentication, Postgres, Realtime, Storage, and Edge Functions.

### Beta target

- 10 workspaces
- 100 users
- 200 concurrent Realtime connections
- 1 GB total file storage
- 5 GB monthly egress
- 500 MB database

These are hard free-tier ceilings, not growth targets.

## 2. Roles and access

### Workspace

- Multiple **Owners** (at least one required)
- Multiple **Admins**
- **Members**

Owners can manage billing-free workspace lifecycle, transfer ownership, export workspace data, and delete the workspace. Admins can manage members, teams, categories, workspace calendars, and workspace settings. Members can create custom shared calendars, join teams by invite, and use calendars shared with them.

### Team

- Multiple **Leads**
- **Members**

Team Leads can add or remove existing workspace members, create team invite links, and manage team calendars. Only workspace Owners/Admins can invite a brand-new person to the workspace.

### Calendar

- **Viewer** — view event details, RSVP, comment, attach
- **Participant** — Viewer plus create events and edit events they created
- **Editor** — edit all events in the calendar
- **Manager** — manage calendar settings, membership, and all events

Calendar kinds:

- **Personal** — owner-only by default; owner is always Manager
- **Team** — visible to team members
- **Workspace** — visible to all workspace members
- **Custom Shared** — explicit membership; any member can create one and becomes Manager

### Personal calendar sharing

A personal calendar owner may share the whole calendar with selected teams, the whole workspace, or named members. Recipients get Viewer or Participant access; they can never edit or delete the owner’s personal events. Sharing can be revoked at any time. A share may be “busy only,” hiding titles, descriptions, locations, comments, and attachments.

Per-event visibility:

- **Calendar** — visible to everyone with calendar access
- **Participants only** — visible to the creator and explicit participants
- **Private** — creator-only; appears as a busy block to others with calendar access

## 3. Calendar items

### Event fields

Title, description, location, start, end, all-day flag, IANA time zone, category, priority, lifecycle status, visibility, recurrence, participants, reminders, creator, timestamps, and optimistic-concurrency version.

### Categories and priorities

Workspace-defined categories with seeded defaults: Meeting, Deadline, Milestone, Leave, Focus, Holiday, Other. Each has a muted color and icon. One category per event.

Priorities: Low, Normal, High, Urgent. One priority per event.

### Event lifecycle and RSVP

- Lifecycle: Scheduled, Tentative, Cancelled. Editable by creator, calendar Editor/Manager, Team Lead, or workspace Admin.
- Attendance: Going, Maybe, Declined, No response. Each user controls their own attendance.
- Participants are optional. When set, only participants receive RSVP prompts and event-specific notifications. When empty, all calendar members with access are implicit participants.

### Recurrence

Simple recurrence in v1: daily, weekly, monthly; until date or occurrence count; individual occurrence exceptions and cancellations. Store UTC timestamps plus IANA time zone. All-day events use date-only semantics. Display in viewer time zone. Workspace default time zone is Asia/Manila; week starts Monday; 12-hour clock. All user-overridable.

## 4. Collaboration

- Plain-text comments with @mentions
- Edit/delete your own comment; Admins may moderate
- Attachments: 10 MB per file; 50 MB per workspace; images, PDF, DOCX, XLSX, TXT
- Client-side image compression; no server-side image transforms on the free tier
- Per-event activity log visible to calendar members
- Workspace audit log for membership, role, and settings changes, visible to Owners/Admins
- Soft delete for 30 days

## 5. Notifications

Channels: in-app Realtime notification center, email through Brevo Free, and opt-in Web Push.

Defaults:

- Reminders at 24 hours and 1 hour before; user can use 5m/15m/1h/1d or add custom reminders
- In-app always on; email on; browser push opt-in
- New shared event, event update/cancellation, and comment mention notify immediately in-app
- Email/push follow unless quiet hours are active
- Quiet hours 22:00–08:00 local
- Non-urgent email batches at 08:00
- Daily agenda opt-in, off by default
- Only users with access are notified; the actor is excluded

Brevo Free provides 300 emails/day and may add Brevo branding. No custom sending domain at launch; use a verified sender address and accept weaker deliverability.

## 6. Google Calendar

One-way export only: MicroAxis → Google. Export is off by default.

Each user connects their own Google account and chooses which calendars export into a dedicated “MicroAxis” Google calendar. Shared events are included only when the user opts in per calendar. Per-event overrides are available. Deletions propagate. Sync status and retry are visible. No Google → MicroAxis import.

Google OAuth stays in testing mode for the 100-user beta. The app remains usable without Google.

## 7. Realtime, concurrency, caching, offline

- **OCC:** every mutable event has a `version` integer. Updates send the expected version; stale writes return a conflict and show a compare/refresh choice.
- **CDC:** Supabase Realtime Postgres Changes for events, participants, comments, attachments, and notifications; RLS governs visibility.
- **Caching:** TanStack Query with stale-while-revalidate; static assets long-cached; no Redis.
- **Offline:** read-only cache of the next 90 days and previous 30 days of event titles, times, and locations in IndexedDB. No offline writes. Attachments and comment bodies are not cached.
- Reconnect with exponential backoff and a refetch of active queries.

## 8. Visual direction

The app uses the MicroAxis brand as a reference, not as a copied layout.

- **Concept:** “The working ledger.” A calendar that reads like a well-kept studio ledger: paper, ink, hairline rules, one green stamp of affirmation.
- **Type:** Instrument Sans for UI; Instrument Serif only for welcome and empty-state display headings, never for calendar data; IBM Plex Mono for times, counts, and keyboard hints.
- **Light palette:** paper `#F7F6F2`, surface `#FFFFFF`, ink `#141411`, muted ink `#6F6F66`, line `#E5E4DC`, accent `#0C7A43`, accent wash `#E7F2EB`.
- **Dark palette:** canvas `#121310`, surface `#191A16`, ink `#F2F0E8`, muted ink `#9B9A90`, line `#2B2C26`, accent `#5BC08A`, accent wash `#1D2B22`.
- **Category pastels:** sage, sky, amber, rose, clay. Never color-only; pair with icon and label.
- **Shape:** 6px controls, 10px panels, 999px only for tags and avatars. No gradients, no heavy shadows, no glassmorphism.
- **Layout:** 248px left rail; calendar canvas; contextual event drawer. Mobile uses agenda by default and a bottom navigation bar.
- **Distinctive detail:** a ledger-margin time spine in week/agenda views and small creator monograms on event bands.
- **Motion:** 160–240ms, transform/opacity only; drawer slide; toast; no perpetual motion. Respect reduced motion.
- **Themes:** light and dark, system-aware with a manual override.

## 9. Non-goals for v1

- Two-way Google sync or import
- Native iOS/Android apps
- Rich-text comments or versioned attachments
- Full offline editing or mutation queues
- Public API
- Custom domain
- Paid email/SMS
- Restyling the existing landing page

## 10. Operational constraints

- Render Free Web Services sleep; therefore the frontend is a Render **Static Site** and the API surface is Supabase.
- Supabase Free projects pause after 7 days of database inactivity; pg_cron reminder jobs provide regular activity.
- Supabase Edge Functions handle secrets: Google OAuth exchange, Google sync, Brevo email, Web Push, account deletion.
- pg_cron schedules reminder processing and Google sync; it never depends on Render.
- RLS is enabled on every public table. Storage buckets use RLS-backed policies. Google tokens are encrypted before storage and readable only by service-role functions.
- The app must degrade honestly when Google, email, or push credentials are absent: features are disabled with a clear setup message, not faked.
