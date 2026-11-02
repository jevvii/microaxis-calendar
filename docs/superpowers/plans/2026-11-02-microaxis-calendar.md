# MicroAxis Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MicroAxis Calendar, an independent multi-tenant team calendar PWA with private personal calendars, explicit sharing, shared-calendar collaboration, reminders, one-way Google Calendar export, and a free-tier Render Static Site + Supabase deployment.

**Architecture:** React 19 + Vite + TypeScript SPA deployed as a Render Static Site. Supabase provides Auth, Postgres with RLS, Realtime, Storage, and Edge Functions. The client talks directly to Supabase through RLS; secrets and scheduled work live only in Edge Functions. pg_cron drives reminder processing and Google sync. A demo provider makes the interface runnable without credentials, but never masks missing production integrations.

**Tech Stack:** React 19, Vite 7, TypeScript, Tailwind CSS 4, TanStack Query, React Router, Supabase JS, date-fns/date-fns-tz, Zod, Phosphor Icons, Motion, vite-plugin-pwa, Vitest, Testing Library, Playwright.

**Spec:** `docs/specs/2026-11-02-microaxis-calendar.md`

## Global Constraints

- Strictly $0: Render Static Site, Supabase Free, Google Calendar API free tier, Brevo Free. No paid tier, no credit card, no custom domain.
- Supabase Free ceilings: 500 MB database, 1 GB storage, 5 GB egress, 200 concurrent Realtime connections, 2M Realtime messages/month, 500k Edge Function invocations/month, 50 MB max upload.
- Beta ceiling: 10 workspaces, 100 users, 50 MB attachments per workspace.
- Every public table has RLS enabled. No service-role key in the client. No secrets in Vite env except the Supabase URL and anon key.
- Personal calendars are owner-private by default. Workspace Admins never read personal calendars unless the owner shares them.
- Personal event core details are creator-only. Shared event core details are creator/Editor/Manager/Team Lead/Admin only. Attendance is per-user.
- All mutable event updates use optimistic concurrency with an integer `version`.
- Offline is read-only: 90 days forward, 30 days back; no offline writes; no comment bodies or attachments cached.
- UI: Instrument Sans, Instrument Serif only for welcome/empty-state display, IBM Plex Mono for times and counts. No Inter, Roboto, Lucide, emojis, gradients, heavy shadows, or pure black.
- Light and dark themes. 6px controls, 10px panels, 999px only for tags/avatars.
- The existing landing page is not modified.
- Every feature must degrade with a specific, honest disabled state when its credential or integration is absent.

## Review Focus

- **Personal-share privacy:** busy-only shares must never leak titles, descriptions, locations, comments, or attachments through UI, Realtime payloads, or attachment URLs.
- **Tenant isolation:** a member of workspace A must not read or mutate workspace B, even through nested calendar, event, comment, or storage paths.
- **DST and recurrence:** weekly/monthly events must keep wall-clock time across time-zone transitions and expand exceptions correctly.
- **Stale writes:** a stale event edit must not overwrite a newer version; the conflict path must be reachable and recoverable.
- **Notification idempotency:** retries must not duplicate reminders, emails, or pushes, and Brevo’s 300/day ceiling must not be exhausted by a busy workspace.
- **Google sync identity:** updates and deletions must not create duplicates or orphan Google events; disconnecting must stop future sync without deleting Google data silently.
- **Mobile accessibility:** 44px targets, keyboard focus, visible focus, reduced motion, and screen-reader labels for icon-only controls.

---

### Task 1: Scaffold, toolchain, and design tokens

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `.gitignore`, `.env.example`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles/globals.css`, `src/lib/cn.ts`, `src/lib/env.ts`
- Create: `vitest.config.ts`, `src/test/setup.ts`, `src/lib/cn.test.ts`
- Create: `public/` app icons copied from `/home/javvii/MicroAxis/logo/`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string`
- Produces: `env: { supabaseUrl: string; supabaseAnonKey: string; demoMode: boolean; vapidPublicKey: string }`
- Produces: Tailwind theme tokens `canvas`, `surface`, `ink`, `ink-muted`, `line`, `accent`, `accent-wash`, and category pastels.

- [ ] **Step 1: Scaffold Vite React TypeScript in place**

Run:
```bash
npm create vite@latest . -- --template react-ts
```
Keep the generated `src` structure, then replace the demo content.

- [ ] **Step 2: Install runtime and dev dependencies**

Run:
```bash
npm install react-router-dom @supabase/supabase-js @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister idb-keyval date-fns date-fns-tz zod @phosphor-icons/react motion clsx tailwind-merge @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-switch @radix-ui/react-select
npm install -D tailwindcss @tailwindcss/vite vite-plugin-pwa vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitejs/plugin-react
```

- [ ] **Step 3: Configure Vite, Tailwind, PWA, and Vitest**

`vite.config.ts` must include `react()`, `tailwindcss()`, and `VitePWA({ registerType: 'autoUpdate', injectManifest: { swSrc: 'src/sw.ts' } })`. Add `test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }`.

- [ ] **Step 4: Define design tokens and type scale in `src/styles/globals.css`**

Create CSS variables for light and `.dark` themes using the spec values. Map them with `@theme inline`. Set:
```css
--font-sans: 'Instrument Sans', 'Helvetica Neue', sans-serif;
--font-serif: 'Instrument Serif', Georgia, serif;
--font-mono: 'IBM Plex Mono', 'SFMono-Regular', monospace;
```
Add `@media (prefers-reduced-motion: reduce)` to disable transitions and animations. Load fonts from Google Fonts in `index.html`.

- [ ] **Step 5: Add `cn` and env parsing with tests**

`cn` combines `clsx` and `twMerge`. `env` reads `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEMO_MODE`, and `VITE_VAPID_PUBLIC_KEY`; `demoMode` is true when `VITE_DEMO_MODE === 'true'` or the Supabase URL is empty.

Test:
```ts
expect(cn('px-2', false && 'hidden', 'px-4')).toBe('px-4');
```

- [ ] **Step 6: Verify build and test**

Run:
```bash
npm run test -- --run
npm run build
```
Expected: tests pass; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold MicroAxis Calendar and design tokens"
```

---

### Task 2: UI primitives, theme, and app shell

**Files:**
- Create: `src/components/ui/Button.tsx`, `IconButton.tsx`, `Input.tsx`, `Textarea.tsx`, `Select.tsx`, `Dialog.tsx`, `Popover.tsx`, `Avatar.tsx`, `Badge.tsx`, `Toast.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `SegmentedControl.tsx`, `Field.tsx`
- Create: `src/providers/ThemeProvider.tsx`, `ToastProvider.tsx`
- Create: `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `MobileNav.tsx`, `Logo.tsx`
- Create: `src/hooks/useMediaQuery.ts`, `src/hooks/useTheme.ts`
- Test: `src/components/ui/Button.test.tsx`, `src/components/ui/Dialog.test.tsx`, `src/providers/ThemeProvider.test.tsx`

**Interfaces:**
- Produces: `Button({ variant?: 'primary'|'secondary'|'ghost'|'danger', size?: 'sm'|'md', loading?: boolean })`
- Produces: `Dialog({ open, onOpenChange, title, description?, children, footer? })`
- Produces: `Avatar({ name, src?, size?: 'xs'|'sm'|'md'|'lg' })` with deterministic initials and no generic user icon.
- Produces: `ThemeProvider` with `theme: 'light'|'dark'|'system'`, `setTheme`, and localStorage persistence.
- Produces: `AppShell({ sidebar, topbar, children, mobileNav })`.

- [ ] **Step 1: Write failing interaction tests**

Tests must assert: disabled button does not fire; loading button exposes `aria-busy`; Dialog traps focus and returns focus to trigger; theme toggle persists `microaxis-theme` and applies `.dark`.

- [ ] **Step 2: Implement primitives with Radix or native semantics**

Use Radix Dialog/Popover/Dropdown/Tooltip/Select. Buttons use 6px radius, 36px/40px heights, `active:scale-[0.98]`, no shadow. Icon-only controls require `aria-label`. Focus-visible uses a 2px accent outline offset 2px.

- [ ] **Step 3: Build the app shell**

Desktop: 248px sidebar, 56px topbar, main canvas, optional 360px right drawer slot. Mobile: topbar plus bottom nav with Today, Calendar, Inbox, More. Sidebar sections: workspace switcher, primary views, calendars, teams, settings. All controls 44px minimum on touch.

- [ ] **Step 4: Run tests and build**

Run:
```bash
npm run test -- --run
npm run build
```
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add design-system primitives and responsive app shell"
```

---

### Task 3: Domain types, permissions, date, and recurrence utilities

**Files:**
- Create: `src/types/domain.ts`
- Create: `src/lib/permissions.ts`, `src/lib/date.ts`, `src/lib/recurrence.ts`, `src/lib/validation.ts`
- Test: `src/lib/permissions.test.ts`, `src/lib/date.test.ts`, `src/lib/recurrence.test.ts`

**Interfaces:**
- Produces types: `WorkspaceRole`, `TeamRole`, `CalendarRole`, `CalendarKind`, `EventPriority`, `EventStatus`, `EventVisibility`, `RsvpStatus`, `Workspace`, `Team`, `Calendar`, `Event`, `EventOccurrence`, `Notification`.
- Produces: `hasCalendarAccess(calendar, userId, memberships): boolean`
- Produces: `calendarRole(calendar, userId, memberships): CalendarRole | null`
- Produces: `canEditEvent(event, calendarRole, workspaceRole, teamRole, userId): boolean`
- Produces: `expandRecurrence(event, rangeStart, rangeEnd): EventOccurrence[]`
- Produces: `eventTimeLabel(event, timeZone, clock24h): string`
- Produces Zod schemas `eventInputSchema`, `workspaceInputSchema`, `calendarInputSchema`.

- [ ] **Step 1: Write failing permission tests**

Cover: personal owner manager; personal share viewer cannot edit; team member sees team calendar; non-member cannot; workspace member sees workspace calendar; editor edits another creator’s shared event; viewer cannot; creator edits own personal event; admin cannot edit personal event unless shared as editor.

- [ ] **Step 2: Write failing recurrence and DST tests**

Test a weekly event across the US spring-forward boundary in `America/New_York` keeps 09:00 wall time. Test monthly on the 31st skips months without a 31st. Test cancelled exception removes only that occurrence. Test all-day event has no time-zone shift.

- [ ] **Step 3: Implement types and pure functions**

Use `date-fns` and `date-fns-tz`. Store event instants as UTC ISO strings; keep `timeZone` and `allDay` separately. Recurrence uses a small supported RRULE parser for `FREQ=DAILY|WEEKLY|MONTHLY`, `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY` (weekly only).

- [ ] **Step 4: Run tests**

Run:
```bash
npm run test -- --run src/lib
```
Expected: all permission, date, and recurrence tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add domain types, permissions, timezone, and recurrence logic"
```

---

### Task 4: Demo data provider and runnable app routes

**Files:**
- Create: `src/data/types.ts`, `src/data/demo/demoData.ts`, `src/data/demo/demoProvider.ts`, `src/data/provider.tsx`
- Create: `src/providers/AuthProvider.tsx`, `src/providers/WorkspaceProvider.tsx`
- Create: `src/pages/AuthPage.tsx`, `src/pages/OnboardingPage.tsx`, `src/pages/CalendarPage.tsx`, `src/pages/NotificationsPage.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/WorkspacePage.tsx`, `src/pages/TeamPage.tsx`, `src/pages/InvitePage.tsx`, `src/pages/OfflinePage.tsx`
- Create: `src/App.tsx` routes and `src/main.tsx` providers
- Test: `src/data/demo/demoProvider.test.ts`, `src/App.test.tsx`

**Interfaces:**
- Produces `DataProvider` interface: `listWorkspaces`, `createWorkspace`, `listCalendars`, `listEvents`, `createEvent`, `updateEvent`, `deleteEvent`, `listNotifications`, `markNotificationRead`.
- Produces hooks: `useAuth()`, `useWorkspace()`, `useDataProvider()`.
- Demo provider persists to localStorage under `microaxis-demo-v1` and seeds 3 teams, 5 calendars, 12 events, 4 members.

- [ ] **Step 1: Write failing provider and route tests**

Test that demo provider seeds a personal and shared calendar, creates an event with version 1, and incrementing an update produces version 2. Test that `/app/calendar` renders without Supabase credentials in demo mode.

- [ ] **Step 2: Implement demo data and provider**

Use realistic MicroAxis context: team names “Product”, “Client Delivery”, “Operations”; members “Mara Velasco”, “Ivo Santos”, “Rin Takahashi”, “Bea Ocampo”; events like “OceanJet release review”, “Milksha sprint planning”, “DBM accessibility audit”. No generic names.

- [ ] **Step 3: Implement providers and routes**

`AuthProvider` switches between demo user and Supabase session. `WorkspaceProvider` tracks active workspace and persists its id. Routes: `/`, `/auth`, `/auth/callback`, `/onboarding`, `/invite/:token`, `/app/calendar`, `/app/notifications`, `/app/settings`, `/app/workspace`, `/app/team/:teamId`, `/offline`.

- [ ] **Step 4: Run tests and build**

Run:
```bash
npm run test -- --run
npm run build
```
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add demo data provider, auth/workspace contexts, and routes"
```

---

### Task 5: Supabase schema, indexes, and triggers

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202611020001_schema.sql`
- Create: `supabase/migrations/202611020002_functions.sql`
- Create: `supabase/seed.sql`

**Interfaces:**
- Tables: `profiles`, `workspaces`, `workspace_members`, `teams`, `team_members`, `calendars`, `calendar_shares`, `events`, `event_participants`, `event_comments`, `event_attachments`, `event_activity`, `notifications`, `notification_outbox`, `push_subscriptions`, `google_connections`, `google_event_links`, `workspace_audit_log`.
- Enums: `workspace_role`, `team_role`, `calendar_role`, `calendar_kind`, `event_priority`, `event_status`, `event_visibility`, `rsvp_status`, `share_subject`, `notification_channel`, `notification_status`.
- Produces: `touch_updated_at()` trigger, `events.version` default 1, `event_activity` insert trigger.

- [ ] **Step 1: Start local Supabase and confirm Docker**

Run:
```bash
npx supabase start
```
Expected: local API URL, DB URL, anon key, service key printed.

- [ ] **Step 2: Write the schema migration**

Include UUID primary keys, `created_at timestamptz default now()`, `deleted_at timestamptz`, foreign keys with appropriate `on delete cascade`, `workspace_id` on every tenant-owned row, and indexes on `(workspace_id, starts_at)`, `(calendar_id, starts_at)`, `(user_id, read_at)`, `(event_id, created_at)`, and `(google_event_links.user_id, event_id)`.

`calendar_shares` columns: `calendar_id`, `subject_type` (`user|team|workspace`), `subject_id`, `role` (`viewer|participant|editor`), `hide_details boolean`, unique on `(calendar_id, subject_type, subject_id)`.

- [ ] **Step 3: Add triggers**

`touch_updated_at` updates `updated_at` and increments `events.version` only when the update did not explicitly set version. Event insert/update writes an `event_activity` row with actor id from `auth.uid()`. Workspace membership/team/calendar changes write `workspace_audit_log`.

- [ ] **Step 4: Seed local data**

Seed two auth users, two workspaces, teams, calendars, events, comments, and notifications. Use deterministic UUIDs.

- [ ] **Step 5: Verify reset**

Run:
```bash
npx supabase db reset
```
Expected: migrations and seed complete without errors; `select count(*) from events` returns at least 12.

- [ ] **Step 6: Commit**

```bash
git add supabase
git commit -m "feat: add Supabase schema, indexes, and activity triggers"
```

---

### Task 6: RLS, storage policies, and Realtime publication

**Files:**
- Create: `supabase/migrations/202611020003_rls.sql`
- Create: `supabase/migrations/202611020004_storage_realtime.sql`
- Create: `supabase/tests/rls.sql`
- Create: `docs/security-model.md`

**Interfaces:**
- Produces SQL helpers: `is_workspace_member(uuid, uuid)`, `workspace_role(uuid, uuid)`, `is_team_member(uuid, uuid)`, `team_role(uuid, uuid)`, `calendar_role(uuid, uuid)`, `can_view_event(uuid, uuid)`, `can_edit_event(uuid, uuid)`, `can_manage_calendar(uuid, uuid)`.
- All helpers are `security definer` with `set search_path = ''` and `stable`.
- Storage bucket `event-attachments`, private, 10 MB limit, MIME allowlist.

- [ ] **Step 1: Write failing RLS assertions**

`supabase/tests/rls.sql` must assert: workspace A member cannot select workspace B; personal calendar owner sees it; unrelated member cannot; shared viewer can select but not update; event editor can update; viewer cannot; busy-only share cannot select event title via a view; attachment object path from another workspace is denied.

- [ ] **Step 2: Implement helper functions and policies**

Use `auth.uid()` and the helper functions. Avoid recursive policy subqueries. Calendar visibility is the union of ownership, explicit share, team share, workspace share, team membership, and workspace calendar membership. `hide_details` is enforced at the query/view layer and by a `calendar_visible_events` view that masks titles/locations/descriptions for busy-only viewers.

- [ ] **Step 3: Configure Storage policies**

Object path format: `<workspace_id>/<event_id>/<uuid>.<ext>`. Insert allowed when `can_view_event(event_id, auth.uid())`. Select allowed when `can_view_event(...)` and share is not busy-only. Delete allowed for uploader or calendar Manager/Admin.

- [ ] **Step 4: Add Realtime publication**

Add `events`, `event_participants`, `event_comments`, `event_attachments`, `notifications`, `calendars` to `supabase_realtime` publication. Add `realtime.messages` policies for workspace channels.

- [ ] **Step 5: Run SQL tests**

Run:
```bash
npx supabase db reset
npx supabase test db
```
Expected: all RLS assertions pass.

- [ ] **Step 6: Commit**

```bash
git add supabase docs/security-model.md
git commit -m "feat: enforce tenant isolation and storage access with RLS"
```

---

### Task 7: Supabase auth, onboarding, and invitations

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/auth.ts`
- Modify: `src/providers/AuthProvider.tsx`, `src/providers/WorkspaceProvider.tsx`
- Create: `src/pages/AuthCallbackPage.tsx`, `src/components/workspace/CreateWorkspaceForm.tsx`, `src/components/workspace/InviteDialog.tsx`
- Create: `supabase/functions/send-invite/index.ts`
- Test: `src/lib/auth.test.ts`, `src/pages/OnboardingPage.test.tsx`

**Interfaces:**
- Produces: `signInWithGoogle()`, `signInWithMagicLink(email)`, `signOut()`, `acceptInvite(token)`.
- Produces: `createWorkspace({ name, slug })` returning workspace id.
- Edge Function `send-invite` accepts `{ email, workspaceId, role }` and sends a Brevo email with an invite link.

- [ ] **Step 1: Write failing auth tests**

Test unauthenticated `/app/calendar` redirects to `/auth`; demo mode bypasses; missing Supabase env shows a setup screen rather than crashing; invite token route handles expired token.

- [ ] **Step 2: Implement Supabase client and auth**

`supabase.ts` returns `null` when env is missing. Use `detectSessionInUrl: true`, `persistSession: true`, `autoRefreshToken: true`. Google OAuth uses `redirectTo: `${origin}/auth/callback``. Magic link uses `emailRedirectTo`.

- [ ] **Step 3: Implement onboarding**

First authenticated user without a workspace sees `/onboarding`. Create workspace creates a workspace row and an Owner membership in one RPC `create_workspace_with_owner`. Slug is unique, lowercase, hyphenated.

- [ ] **Step 4: Implement invitations**

Owners/Admins create invite tokens with 7-day expiry. `send-invite` sends the email. `/invite/:token` shows workspace name and accepts. Team Leads can create team invite links for existing workspace members.

- [ ] **Step 5: Run tests and build**

Run:
```bash
npm run test -- --run
npm run build
```
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Supabase auth, workspace onboarding, and invitations"
```

---

### Task 8: Calendar/event data layer, OCC, and Realtime

**Files:**
- Create: `src/data/supabase/supabaseProvider.ts`, `src/hooks/useCalendars.ts`, `src/hooks/useEvents.ts`, `src/hooks/useRealtime.ts`, `src/hooks/useEventMutations.ts`
- Create: `src/lib/queryClient.ts`, `src/lib/queryPersistence.ts`
- Modify: `src/data/provider.tsx`
- Test: `src/lib/occ.test.ts`, `src/hooks/useEvents.test.tsx`

**Interfaces:**
- Produces: `useCalendars(workspaceId)`, `useEvents({ workspaceId, rangeStart, rangeEnd, filters })`.
- Produces: `useCreateEvent()`, `useUpdateEvent()`, `useDeleteEvent()`.
- Produces mutation result union: `{ ok: true; event: Event } | { ok: false; conflict: true; current: Event }`.
- Produces: `useRealtimeWorkspace(workspaceId)` that invalidates `['events']`, `['notifications']`, `['comments']` on changes.

- [ ] **Step 1: Write failing OCC tests**

Test an update with stale `version` returns `conflict` and does not change the stored row. Test a successful update increments version exactly once. Test a deleted event returns a not-found conflict.

- [ ] **Step 2: Implement Supabase provider**

Queries select only needed columns. Event reads use the `calendar_visible_events` view for busy-only masking. Mutations use `.eq('version', expectedVersion)` and `.select().single()`; zero rows means conflict, then fetch current row.

- [ ] **Step 3: Implement TanStack Query and persistence**

Set `staleTime: 30_000`, `gcTime: 24h`, retry 2 with exponential backoff. Persist only event summary queries to IndexedDB; exclude comments, attachments, and notifications from persistence.

- [ ] **Step 4: Implement Realtime**

Subscribe to one channel per workspace: `postgres_changes` for events, participants, comments, attachments, notifications. Filter notifications by `user_id=eq.${userId}`. On reconnect, invalidate active queries. Do not use Realtime for ephemeral typing in v1.

- [ ] **Step 5: Run tests**

Run:
```bash
npm run test -- --run src/hooks src/lib/occ.test.ts
```
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Supabase data layer with OCC and Realtime invalidation"
```

---

### Task 9: Calendar views, navigation, filters, and creator marks

**Files:**
- Create: `src/components/calendar/CalendarHeader.tsx`, `ViewSwitcher.tsx`, `CalendarCanvas.tsx`, `MonthView.tsx`, `WeekView.tsx`, `AgendaView.tsx`, `EventBand.tsx`, `CreatorMark.tsx`, `FilterBar.tsx`, `TimeSpine.tsx`, `CalendarEmptyState.tsx`
- Modify: `src/pages/CalendarPage.tsx`, `src/components/layout/Sidebar.tsx`
- Test: `src/components/calendar/MonthView.test.tsx`, `src/components/calendar/WeekView.test.tsx`, `src/components/calendar/FilterBar.test.tsx`

**Interfaces:**
- Produces: `CalendarCanvas({ view, date, events, onSelectEvent, onCreateAt })`
- Produces: `FilterState { calendarIds: string[]; teamIds: string[]; categoryIds: string[]; priorities: EventPriority[]; creatorIds: string[]; statuses: EventStatus[]; query: string }`.
- Produces: `CreatorMark({ name, avatarUrl?, size?: 'xs'|'sm' })` as a subtle monogram with tooltip.

- [ ] **Step 1: Write failing view tests**

Test month grid contains correct weekday alignment for Asia/Manila; week view renders 24 hour rows; agenda groups by date; filtering by priority hides non-matching events; creator mark exposes accessible name “Created by Mara Velasco”.

- [ ] **Step 2: Implement month, week, agenda**

Desktop default week; mobile default agenda. Month cells show up to three event bands plus “+N more.” Week view uses a ledger-margin time spine and a current-time line. Agenda groups by day with a left date margin. All event bands show a 2px category tick, time, title, priority marker, and creator mark.

- [ ] **Step 3: Implement navigation and filters**

Header: previous/next/today, date range, view switcher, search, filter button with count, notification bell, avatar menu. Filters persist in localStorage per user. Empty state uses an Instrument Serif headline and a concrete action.

- [ ] **Step 4: Implement keyboard and mobile behavior**

Arrow keys move dates; `t` today; `w/m/a` view; `n` new event; `Escape` closes overlays. Mobile bottom nav and horizontal day strip. Ensure 44px touch targets.

- [ ] **Step 5: Run tests and build**

Run:
```bash
npm run test -- --run src/components/calendar
npm run build
```
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add month, week, and agenda calendar views with filters"
```

---

### Task 10: Event drawer, create/edit form, participants, RSVP, and recurrence

**Files:**
- Create: `src/components/event/EventDrawer.tsx`, `EventForm.tsx`, `DateTimeFields.tsx`, `RecurrenceFields.tsx`, `ParticipantPicker.tsx`, `RsvpControl.tsx`, `EventStatusControl.tsx`, `VisibilityControl.tsx`, `DeleteEventDialog.tsx`
- Create: `src/hooks/useEventForm.ts`
- Test: `src/components/event/EventForm.test.tsx`, `src/components/event/RsvpControl.test.tsx`

**Interfaces:**
- Produces: `EventForm({ mode: 'create'|'edit', initial?, calendars, categories, members, onSubmit })`
- Produces: `RsvpControl({ eventId, userId, value, onChange })`
- Produces: `EventStatusControl({ value, canEdit, onChange })`
- Event form values validated by `eventInputSchema`.

- [ ] **Step 1: Write failing form tests**

Test required title, end after start, all-day clears time fields, recurrence requires interval >= 1, participant picker excludes non-members, viewer cannot submit core edits, RSVP is per-user.

- [ ] **Step 2: Implement event form**

Fields: calendar, title, description, location, start/end, all-day, time zone, category, priority, visibility, participants, reminders, recurrence. Use native date/time inputs with clear labels. No modal-inside-modal. Show inline errors below fields.

- [ ] **Step 3: Implement event drawer**

Drawer header: category tick, title, date/time, creator mark, status. Body: description, participants/RSVP, attachments, comments, activity. Footer: Edit, Delete (with confirmation), Add to Google (if connected). On mobile, full-screen sheet.

- [ ] **Step 4: Implement OCC conflict UI**

When update returns conflict, show a non-destructive panel: “This event changed while you were editing.” Actions: “Review current version” and “Keep my draft.” Never auto-overwrite.

- [ ] **Step 5: Run tests and build**

Run:
```bash
npm run test -- --run src/components/event
npm run build
```
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add event drawer, editor, participants, RSVP, and recurrence"
```

---

### Task 11: Comments, attachments, and activity

**Files:**
- Create: `src/components/event/CommentThread.tsx`, `CommentComposer.tsx`, `AttachmentList.tsx`, `AttachmentUploader.tsx`, `ActivityLog.tsx`
- Create: `src/hooks/useComments.ts`, `src/hooks/useAttachments.ts`, `src/lib/mentions.ts`, `src/lib/imageCompression.ts`
- Create: `src/components/event/AttachmentPreview.tsx`
- Test: `src/lib/mentions.test.ts`, `src/components/event/CommentThread.test.tsx`

**Interfaces:**
- Produces: `parseMentions(body, members): Mention[]`
- Produces: `uploadAttachment({ workspaceId, eventId, file })` with 10 MB validation and MIME allowlist.
- Produces: `getAttachmentUrl(path)` that returns a 60-second signed URL.

- [ ] **Step 1: Write failing mention and upload tests**

Test @name parsing with display names containing spaces; test 10 MB rejection; test disallowed MIME rejection; test comment edit/delete only for author or Admin.

- [ ] **Step 2: Implement comments**

Plain text, preserve line breaks, no HTML rendering. Composer with @mention autocomplete. Edit/delete own. Admin moderation action. Realtime append without full refetch.

- [ ] **Step 3: Implement attachments**

Validate type/size, compress images above 1 MB client-side, upload to `event-attachments/<workspace>/<event>/<uuid>`, insert metadata row. Show file name, size, uploader, time. Signed URL preview for images/PDF. Delete for uploader or Manager/Admin.

- [ ] **Step 4: Implement activity log**

Chronological rows: actor, action, time, metadata summary. Visible to calendar members; no private event details in busy-only shares.

- [ ] **Step 5: Run tests**

Run:
```bash
npm run test -- --run src/lib/mentions.test.ts src/components/event
```
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add comments, mentions, attachments, and event activity"
```

---

### Task 12: Notification center, preferences, and Web Push

**Files:**
- Create: `src/components/notifications/NotificationPanel.tsx`, `NotificationList.tsx`, `NotificationPreferences.tsx`, `PushPermissionPrompt.tsx`
- Create: `src/hooks/useNotifications.ts`, `src/hooks/usePushSubscription.ts`
- Create: `src/pages/NotificationsPage.tsx`
- Create: `public/push-sw.js` or `src/sw.ts` push handler
- Test: `src/hooks/useNotifications.test.tsx`, `src/hooks/usePushSubscription.test.ts`

**Interfaces:**
- Produces: `useNotifications(workspaceId)` with unread count, markRead, markAllRead.
- Produces: `subscribeToPush(): Promise<'granted'|'denied'|'unsupported'|'unconfigured'>`
- Produces: `NotificationPreferences { reminders: boolean; email: boolean; push: boolean; newSharedEvent: boolean; mentions: boolean; dailyAgenda: boolean; quietHoursStart: string; quietHoursEnd: string }`.

- [ ] **Step 1: Write failing notification tests**

Test unread count; mark read; Realtime append; push returns `unsupported` when service worker unavailable; push returns `unconfigured` when VAPID key missing; quiet-hours calculation across midnight.

- [ ] **Step 2: Implement notification center**

Bell with unread dot. Panel groups Today/Earlier. Each row: type icon, title, body, time, link. Mark read on open. Empty state. Preferences form with toggles and quiet hours.

- [ ] **Step 3: Implement Web Push**

Register `/sw.js`, request permission only after an explicit click, subscribe with VAPID public key, POST subscription to `push_subscriptions`. iOS requires installed PWA; show that hint when applicable. Never prompt on page load.

- [ ] **Step 4: Run tests and build**

Run:
```bash
npm run test -- --run
npm run build
```
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add notification center, preferences, and Web Push"
```

---

### Task 13: Workspace, team, calendar management, and personal sharing

**Files:**
- Create: `src/pages/WorkspacePage.tsx`, `src/pages/TeamPage.tsx`, `src/components/workspace/MemberTable.tsx`, `RoleSelect.tsx`, `TeamEditor.tsx`, `AuditLog.tsx`
- Create: `src/components/calendar/CalendarSettings.tsx`, `ShareDialog.tsx`, `CalendarMemberList.tsx`, `CalendarCreateDialog.tsx`
- Create: `src/hooks/useWorkspaceAdmin.ts`, `src/hooks/useCalendarAdmin.ts`
- Test: `src/lib/permissions.test.ts` additions, `src/components/calendar/ShareDialog.test.tsx`

**Interfaces:**
- Produces: `ShareDialog({ calendar, teams, members, onShare })` with subject type, subject id, role, busy-only toggle.
- Produces: `CalendarCreateDialog({ kind, teams, onCreate })`.
- Produces: `useWorkspaceAdmin()` for member/team/role CRUD and audit log.

- [ ] **Step 1: Write failing sharing tests**

Test personal calendar owner can share to a team; recipient cannot edit; busy-only hides title in preview; revoke removes access; team lead can add existing member but cannot invite new user; multiple owners/leads allowed; last owner cannot be removed.

- [ ] **Step 2: Implement workspace admin**

Tabs: Members, Teams, Categories, Audit log, Danger zone. Member table with role selects, invite dialog, remove. Team editor with multiple leads and members. Category editor with color/icon pickers using pastel tokens.

- [ ] **Step 3: Implement calendar management**

Create personal/team/workspace/custom shared calendar. Calendar settings: name, description, color, kind, members, shares, export toggle. Personal share dialog with team/workspace/member targets, Viewer/Participant, busy-only. Revoke.

- [ ] **Step 4: Implement audit log**

Paginated list for Owners/Admins. Filters by actor, action, date. No personal calendar details.

- [ ] **Step 5: Run tests and build**

Run:
```bash
npm run test -- --run
npm run build
```
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add workspace, team, calendar, and personal-share management"
```

---

### Task 14: Google Calendar OAuth and one-way sync

**Files:**
- Create: `supabase/functions/google-oauth/index.ts`
- Create: `supabase/functions/google-sync/index.ts`
- Create: `supabase/functions/_shared/google.ts`, `crypto.ts`, `supabaseAdmin.ts`
- Create: `src/components/settings/GoogleCalendarSettings.tsx`, `src/hooks/useGoogleConnection.ts`
- Create: `supabase/migrations/202611020005_google.sql`
- Test: `src/hooks/useGoogleConnection.test.ts`

**Interfaces:**
- Produces: `google-oauth` POST `{ code, redirectUri }`; exchanges tokens, creates dedicated calendar “MicroAxis”, stores encrypted refresh/access tokens, returns `{ connected: true, googleCalendarId }`.
- Produces: `google-sync` POST `{ userId?, eventId? }`; idempotently inserts/updates/deletes Google events and records `google_event_links`.
- Produces: `useGoogleConnection()` with connect, disconnect, sync status, and per-calendar export toggles.

- [ ] **Step 1: Write failing connection tests**

Test unconfigured Google shows setup state; disconnect stops future export; per-calendar toggle defaults off; sync status surfaces retryable error.

- [ ] **Step 2: Implement OAuth exchange**

Use least-privilege scopes: `https://www.googleapis.com/auth/calendar.app.created` and `https://www.googleapis.com/auth/userinfo.email`. Store tokens AES-GCM encrypted with `TOKEN_ENCRYPTION_KEY`; only service role can read. Create a secondary calendar named “MicroAxis”. Store `google_calendar_id`.

- [ ] **Step 3: Implement sync**

For each dirty event mapping, call `events.insert`, `events.patch`, or `events.delete`. Store `microaxis_event_id` in `extendedProperties.private`. Use idempotency by mapping row unique `(user_id, event_id, google_calendar_id)`. Handle 401 by refresh; 410 by recreating; 429 with exponential backoff. Never import Google events.

- [ ] **Step 4: Implement UI**

Settings page: Connect Google, connection status, dedicated calendar name, per-calendar export toggles, per-event override, sync status list, disconnect with confirmation. If OAuth env is absent, show exact setup instructions, not a fake connected state.

- [ ] **Step 5: Verify functions locally**

Run:
```bash
npx supabase functions serve google-oauth google-sync --env-file supabase/.env.local
```
Expected: functions boot; unauthenticated requests return 401; missing config returns a specific 503.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Google Calendar OAuth and one-way export sync"
```

---

### Task 15: Reminder and notification worker with pg_cron, Brevo, and Web Push

**Files:**
- Create: `supabase/functions/notify/index.ts`
- Create: `supabase/functions/_shared/brevo.ts`, `webpush.ts`, `templates.ts`
- Create: `supabase/migrations/202611020006_cron.sql`
- Create: `docs/notifications.md`
- Test: `supabase/tests/notifications.sql`

**Interfaces:**
- Produces: `notify` POST `{ mode: 'reminders'|'outbox' }`, protected by `CRON_SECRET`.
- Produces: `notification_outbox` rows with `channel`, `status`, `attempts`, `scheduled_at`, `sent_at`, `error`, unique `(notification_id, channel)`.
- Produces: pg_cron job every minute for reminders/outbox, and every 5 minutes for Google sync.

- [ ] **Step 1: Write failing SQL tests**

Test reminder uniqueness `(event_id, user_id, minutes_before, occurrence_start)`; outbox unique `(notification_id, channel)`; quiet-hours deferral; actor exclusion; busy-only share recipient excluded from detail notifications.

- [ ] **Step 2: Implement reminder materialization**

On event create/update, materialize reminders for participants or calendar members. Respect per-user reminder overrides and quiet hours. Store occurrence start for recurring events. Cancel future reminders on event cancellation/delete.

- [ ] **Step 3: Implement Brevo email**

Send auth/invite and notification email through Brevo API. Use a verified sender address. Include plain-text and simple HTML. Add Brevo branding on free plan. Batch non-urgent emails at 08:00 local. Record attempts and errors. Never retry a permanent 4xx.

- [ ] **Step 4: Implement Web Push**

Use VAPID keys from Edge Function env. Send to all active subscriptions for a user. Remove 404/410 subscriptions. Payload: title, body, url, tag, icon. Do not include sensitive event details for busy-only shares.

- [ ] **Step 5: Schedule pg_cron**

Use `cron.schedule` with `net.http_post` to call `notify` and `google-sync`. Include `Authorization: Bearer <CRON_SECRET>`. Add advisory locks to prevent overlapping runs. Document that Render is not used for scheduling.

- [ ] **Step 6: Verify locally**

Run:
```bash
npx supabase db reset
npx supabase functions serve notify --env-file supabase/.env.local
```
Expected: a due reminder creates exactly one outbox row per channel; a second run sends nothing new.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add reminder worker, Brevo email, Web Push, and pg_cron jobs"
```

---

### Task 16: PWA, offline read cache, and reconnect behavior

**Files:**
- Create: `src/sw.ts`, `src/lib/offlineCache.ts`, `src/components/layout/OfflineBanner.tsx`, `src/hooks/useOnlineStatus.ts`
- Modify: `vite.config.ts`, `src/lib/queryPersistence.ts`, `src/main.tsx`
- Create: `public/manifest.webmanifest` via plugin config
- Test: `src/lib/offlineCache.test.ts`, `src/hooks/useOnlineStatus.test.ts`

**Interfaces:**
- Produces: `cacheEventSummaries(events)`, `readCachedEventSummaries(rangeStart, rangeEnd)`.
- Produces: `useOnlineStatus(): boolean`.
- PWA manifest: name “MicroAxis Calendar”, short_name “MicroAxis”, theme `#0C7A43`, background `#F7F6F2`, display `standalone`, icons 192/512/maskable.

- [ ] **Step 1: Write failing cache tests**

Test only title/time/location/calendar id stored; description, comments, attachments excluded; range filter returns 90 days forward and 30 days back; cache version bump clears old data.

- [ ] **Step 2: Configure PWA**

Use `vite-plugin-pwa` injectManifest. Precache app shell and fonts. Do not cache Supabase API responses in the service worker. Add install prompt after second visit, dismissible.

- [ ] **Step 3: Implement offline behavior**

Offline banner: “You’re offline. Showing saved events; changes are disabled.” Disable create/edit/delete/comment/upload. Read-only cached agenda/week. On reconnect, invalidate queries and show “Back online” toast.

- [ ] **Step 4: Run tests and build**

Run:
```bash
npm run test -- --run
npm run build
```
Expected: pass; build emits service worker and manifest.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PWA installability, offline read cache, and reconnect handling"
```

---

### Task 17: Export, deletion, ownership transfer, and account lifecycle

**Files:**
- Create: `src/lib/export.ts`, `src/components/settings/DangerZone.tsx`, `src/components/settings/OwnershipTransfer.tsx`
- Create: `supabase/functions/delete-account/index.ts`
- Create: `supabase/migrations/202611020007_lifecycle.sql`
- Test: `src/lib/export.test.ts`

**Interfaces:**
- Produces: `exportWorkspaceJson(workspaceId): Blob`
- Produces: `exportCalendarIcs(calendarId): string`
- Produces: `transferOwnership(workspaceId, userId)` with last-owner guard.
- Produces: `deleteWorkspace(workspaceId, confirmationName)` with 30-day grace.
- Produces: `deleteAccount()` via Edge Function.

- [ ] **Step 1: Write failing export tests**

Test ICS escapes commas/semicolons/newlines; all-day dates use `VALUE=DATE`; recurring events include RRULE; JSON excludes Google tokens and secrets.

- [ ] **Step 2: Implement exports**

JSON includes workspace, teams, calendars, events, comments metadata, memberships. ICS uses UTC for timed events, local date for all-day, stable UID `<event-id>@microaxis.calendar`.

- [ ] **Step 3: Implement deletion and transfer**

Only Owners. Last owner cannot leave or be removed. Workspace deletion sets `deleted_at = now() + 30 days`, hides it from all members, and schedules purge via pg_cron. Account deletion requires typed confirmation and is executed by Edge Function with service role.

- [ ] **Step 4: Run tests and build**

Run:
```bash
npm run test -- --run
npm run build
```
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add data export, ownership transfer, and deletion lifecycle"
```

---

### Task 18: Accessibility, visual polish, and end-to-end verification

**Files:**
- Modify: all screens and components as needed
- Create: `playwright.config.ts`, `e2e/calendar.spec.ts`, `e2e/settings.spec.ts`
- Create: `README.md`, `docs/deployment.md`, `render.yaml`
- Create: `.github/workflows/ci.yml` (test + build)
- Test: accessibility scan with `@axe-core/playwright`

**Interfaces:**
- Produces: a deployable Render Static Site config and a Supabase setup checklist.
- Produces: seeded demo flow that runs without credentials.

- [ ] **Step 1: Run automated accessibility checks**

Add Playwright and `@axe-core/playwright`. Test `/app/calendar`, event drawer, and settings in light and dark themes. Fail on serious or critical violations.

- [ ] **Step 2: Verify keyboard and responsive behavior**

Keyboard-only create/edit/cancel event; tab order in drawer; focus return; 375px, 768px, 1440px layouts; no horizontal scroll; 44px mobile targets; reduced-motion mode.

- [ ] **Step 3: Run visual review**

Run the app with demo data. Capture screenshots of month, week, agenda, event drawer, notifications, and settings in both themes. Check: no gradients, no heavy shadows, no card soup, creator marks legible, category color never the only signal.

- [ ] **Step 4: Add deployment documentation**

README covers local demo, Supabase local, migrations, Edge Function secrets, Brevo sender verification, Google Cloud OAuth setup, Web Push VAPID keys, pg_cron, Render Static Site settings, and the 100-user Google beta cap. `render.yaml` configures a static site with build `npm ci && npm run build` and publish `dist`.

- [ ] **Step 5: Final verification**

Run:
```bash
npm run test -- --run
npm run build
npx playwright test
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: add accessibility, end-to-end coverage, and deployment docs"
```
