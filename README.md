# MicroAxis Calendar

A calm, multi-tenant team calendar for small studios. Personal calendars stay private; shared calendars stay legible; every event keeps its creator in view.

MicroAxis Calendar is an independent product. It uses the MicroAxis landing page only as a visual reference.

## What is included

- Multi-tenant workspaces, multiple Owners/Admins, multiple team Leads
- Personal, Team, Workspace, and custom Shared calendars
- Personal-calendar sharing with team, workspace, or named people
- Viewer, Participant, Editor, and Manager calendar roles
- Shared event status/RSVP, optional participants, comments, mentions, attachments, and activity
- Calendar categories, priorities, filters, search, month/week/agenda views, creator marks
- Realtime updates through Supabase Realtime
- In-app notifications, Brevo email, and Web Push
- 24-hour and 1-hour reminders, quiet hours, and per-user delivery preferences
- One-way Google Calendar export with per-calendar opt-in and per-event override
- PWA installability, offline read cache, reconnect handling, light and dark themes
- Workspace/account export, ownership transfer, 30-day workspace deletion, account deletion
- RLS on every public table, encrypted Google tokens, private attachment storage

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4 with custom editorial tokens
- TanStack Query with IndexedDB persistence
- Supabase Auth, Postgres, Realtime, Storage, Edge Functions
- Render Static Site
- Google Calendar API, Brevo Free, Web Push/VAPID, pg_cron/pg_net

## Quick start without credentials

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. With no Supabase URL, the app runs the demo workspace in `src/data/demo/`. Demo mode is local-only and never pretends to be a production backend.

```bash
npm run test:run      # unit and component tests
npm run test:sql      # schema, RLS, RPC, notification SQL tests
npm run build         # typecheck and production build
npm run e2e           # Playwright + axe checks (starts Vite)
```

The SQL test script starts a temporary PostgreSQL 18 cluster because Docker/Supabase local is not required. Real Supabase setup is documented in `docs/deployment.md`.

## Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required for production:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_VAPID_PUBLIC_KEY=<vapid-public-key>
VITE_GOOGLE_CLIENT_ID=<google-oauth-client-id>
VITE_DEMO_MODE=false
```

The service-role key, Brevo key, Google client secret, VAPID private key, cron secret, and token encryption key live only in Supabase Edge Function secrets. See `docs/deployment.md`.

## Repository map

```text
src/
  components/calendar/     Month, week, agenda, event bands, filters, sharing
  components/event/        Event drawer, form, comments, attachments, activity
  components/notifications/ Inbox panel, preferences, push permission
  components/settings/     Google, danger zone, ownership transfer
  components/workspace/    Members, teams, audit log
  data/                    Demo provider + Supabase provider
  hooks/                   Query, form, realtime, push, Google, admin hooks
  lib/                     Date/timezone, recurrence, permissions, export, offline cache
  pages/                   Auth, calendar, workspace, team, notifications, settings
supabase/
  migrations/              Schema, RLS, storage, Realtime, cron, lifecycle
  functions/               Google OAuth/sync, invite email, notification worker, account deletion
  tests/                   Schema, RLS, RPC, notification assertions
docs/
  specs/                   Product specification
  superpowers/plans/       Implementation plan
  deployment.md            Full deployment runbook
  notifications.md         Reminder/outbox operations
  security-model.md        RLS and permission model
  design-system.md         Visual and accessibility system
```

## Free-tier reality

The beta target is **10 workspaces / 100 users**. Strictly free infrastructure has hard limits:

- Supabase Free: 500 MB database, 1 GB storage, 5 GB egress, 200 concurrent Realtime connections, 2M messages/month
- Render Static Site: free, globally cached, no web-service cold start
- Render Free Web Services sleep after 15 minutes, which is why the app is a static PWA
- Supabase Free pauses after 7 days of database inactivity; pg_cron reminder jobs keep the project active
- Brevo Free: 300 emails/day; free mail may include Brevo branding
- Google OAuth sensitive scopes require verification for public launch; testing mode is capped at 100 users

“Strictly free” and “public scale” cannot both hold. The app is designed to fit the beta ceiling honestly.

## Known constraints

- Google export is one-way. Google changes never flow back.
- Offline mode is read-only. Writes require connectivity.
- No server-side virus scanning; attachments are limited by MIME, size, and signed URLs.
- The demo provider stores data in localStorage; it is for product review, not production.
- Email deliverability without a custom sending domain is weaker; Brevo sender verification is required.
- The landing page in `/home/javvii/MicroAxis/` is not modified.

## License

Private MicroAxis project.
