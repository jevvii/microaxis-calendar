# Deployment Runbook

## 1. Supabase project

1. Create a free project at `https://supabase.com`.
2. Install the CLI if needed: `npm i -g supabase`.
3. Link the repository:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

`supabase/seed.sql` creates the local demo workspace. Do **not** run it against production unless you want the sample data.

4. Copy the project URL and anon key into Render and `.env.local`.
5. The service-role key is used only by Edge Functions; never expose it to Vite.

## 2. Edge Functions

Deploy:

```bash
npx supabase functions deploy send-invite
npx supabase functions deploy google-oauth
npx supabase functions deploy google-sync
npx supabase functions deploy notify
npx supabase functions deploy delete-account
```

Set secrets:

```bash
supabase secrets set \
  APP_URL=https://<render-site>.onrender.com \
  CRON_SECRET=<openssl-rand-hex-32> \
  BREVO_API_KEY=<brevo-api-key> \
  BREVO_SENDER_EMAIL=<verified-sender@example.com> \
  BREVO_SENDER_NAME="MicroAxis Calendar" \
  VAPID_PUBLIC_KEY=<vapid-public> \
  VAPID_PRIVATE_KEY=<vapid-private> \
  VAPID_SUBJECT=mailto:notifications@example.com \
  TOKEN_ENCRYPTION_KEY=<openssl-rand-base64-32> \
  GOOGLE_CLIENT_ID=<google-client-id> \
  GOOGLE_CLIENT_SECRET=<google-client-secret>
```

`TOKEN_ENCRYPTION_KEY` must be a base64-encoded 32-byte key:

```bash
openssl rand -base64 32
```

## 3. Google Calendar

1. Create a Google Cloud project and enable the Google Calendar API.
2. Configure the OAuth consent screen.
3. Create an OAuth client of type **Web application**.
4. Authorized JavaScript origin: `https://<render-site>.onrender.com`
5. Authorized redirect URI: `https://<render-site>.onrender.com/app/google/callback`
6. Scopes:
   - `https://www.googleapis.com/auth/calendar.app.created`
   - `https://www.googleapis.com/auth/userinfo.email`
7. Put the client id in `VITE_GOOGLE_CLIENT_ID` and the client secret in the `google-oauth`/`google-sync` function secrets.

Testing mode is capped at 100 users. Public launch requires Google OAuth verification. The app works without Google.

Google export is one-way. The dedicated “MicroAxis” calendar is created once per user. Disconnecting stops future sync and does not delete Google events silently.

## 4. Brevo email

1. Create a free Brevo account.
2. Verify a sender email address (a custom domain is optional but improves deliverability).
3. Copy the API key to `BREVO_API_KEY`.
4. Set `BREVO_SENDER_EMAIL` to the verified sender.
5. Free plan: 300 emails/day, Brevo branding on sent mail.

Supabase’s built-in auth mailer is testing-only (2/hour, team addresses). Configure Brevo as Supabase custom SMTP for auth emails, or use a custom Auth email hook.

## 5. Web Push

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

- Public key → `VITE_VAPID_PUBLIC_KEY`
- Private key → `VAPID_PRIVATE_KEY`
- Subject → `VAPID_SUBJECT` (mailto or URL)

Browsers request push permission only after the user clicks **Enable browser notifications**. iOS requires the PWA to be installed to the Home Screen.

## 6. pg_cron

Set database settings, then apply `202611020008_notify.sql`:

```sql
alter database postgres set app.settings.supabase_url = 'https://<project-ref>.supabase.co';
alter database postgres set app.settings.cron_secret = '<same CRON_SECRET>';
```

The migration schedules:

- reminders every minute
- outbox delivery every minute
- Google sync every five minutes
- workspace purge daily (from `202611020009_lifecycle.sql`)

Render is not used for scheduling. Free Render web services sleep, which makes them unsuitable for cron.

## 7. Render Static Site

Create a static site from the repository. `render.yaml` contains the blueprint:

- Build: `npm ci && npm run build`
- Publish: `dist`
- Rewrite `/*` to `/index.html` for client-side routing
- Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_GOOGLE_CLIENT_ID`, `VITE_DEMO_MODE=false`

The frontend is a static site, so it does not cold-start or consume Render web-service instance hours.

## 8. Post-deploy smoke test

1. Sign in with Google or a magic link.
2. Create a workspace; confirm you are Owner and a personal calendar exists.
3. Invite a second account; accept the invitation.
4. Create a team and a team calendar.
5. Create a shared event; confirm the second account sees it and can RSVP.
6. Share a personal calendar; confirm busy-only hides titles.
7. Add a comment with `@Name`; confirm the mention notification.
8. Connect Google; confirm a “MicroAxis” calendar appears and an event exports after **Sync now**.
9. Enable browser notifications; confirm the reminder outbox sends.
10. Export workspace JSON and one calendar ICS.
11. Run `npx playwright test` against the deployed URL by changing `baseURL` if desired.

## 9. Operational checks

- Supabase Dashboard → Database → Cron jobs: confirm three jobs are active.
- Supabase Dashboard → Edge Functions → Logs: check `notify`, `google-sync`, `send-invite`.
- Brevo dashboard: monitor daily email volume against 300/day.
- Supabase storage: monitor 1 GB ceiling.
- Supabase egress: monitor 5 GB.
- Free projects pause after 7 days of database inactivity; reminder jobs normally prevent this.

## 10. Rollback

The app is a static site. Promote the previous Render deploy and, if needed, roll back the Supabase migration through the dashboard. Google OAuth connections are per-user and can be disconnected without deleting Google data.
