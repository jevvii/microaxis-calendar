# Notifications and Reminders

## Channels

- **In-app:** written to `notifications` and delivered through Supabase Realtime.
- **Email:** queued in `notification_outbox` and sent through Brevo.
- **Web Push:** queued in `notification_outbox` and sent using VAPID keys.

In-app notifications are created immediately. Email and push are scheduled around per-user quiet hours. Defaults are 22:00–08:00 local; deferred messages are scheduled for 08:00.

## Reminder generation

`notify` runs in `reminders` mode every minute via pg_cron:

1. Finds events in the next 25 hours, including recurring occurrences.
2. Resolves recipients with `event_recipient_ids(event_id)`:
   - explicit participants when present
   - otherwise personal owner, team members, workspace members, and calendar-share recipients
3. Creates 24-hour and 1-hour reminders.
4. Uses `notifications.dedupe_key` to guarantee exactly one in-app reminder per event occurrence, user, and offset.
5. Queues email and push rows with a unique `(notification_id, channel)` constraint.

Busy-only share recipients receive a time-only reminder; they never receive event titles, descriptions, locations, attachments, or comment text.

## Outbox delivery

`notify` runs in `outbox` mode every minute:

- Email uses Brevo Free. The free plan allows 300 emails/day and may include Brevo branding.
- Push uses `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
- Failed deliveries retry up to five attempts. Permanent 4xx responses are recorded and not retried indefinitely.
- Invalid push subscriptions are removed on 404/410.

## Required Edge Function secrets

```bash
supabase secrets set \
  APP_URL=https://your-render-site.onrender.com \
  CRON_SECRET=<random-long-secret> \
  BREVO_API_KEY=<brevo-api-key> \
  BREVO_SENDER_EMAIL=<verified-sender@example.com> \
  BREVO_SENDER_NAME="MicroAxis Calendar" \
  VAPID_PUBLIC_KEY=<public-key> \
  VAPID_PRIVATE_KEY=<private-key> \
  VAPID_SUBJECT=mailto:notifications@example.com \
  TOKEN_ENCRYPTION_KEY=<base64-32-byte-key> \
  GOOGLE_CLIENT_ID=<client-id> \
  GOOGLE_CLIENT_SECRET=<client-secret>
```

`TOKEN_ENCRYPTION_KEY` is used for Google OAuth tokens and must decode to exactly 32 bytes. Generate it with:

```bash
openssl rand -base64 32
```

## Cron configuration

Set the database settings before scheduling:

```sql
alter database postgres set app.settings.supabase_url = 'https://<project-ref>.supabase.co';
alter database postgres set app.settings.cron_secret = '<same CRON_SECRET>';
```

Then apply `202611020008_notify.sql`. It schedules:

- `microaxis-reminders` every minute
- `microaxis-outbox` every minute
- `microaxis-google-sync` every five minutes

Render Free is not used for scheduling because it sleeps. Supabase pg_cron and pg_net run inside the database.

## Free-tier limits

- Supabase Edge Functions: 500,000 invocations/month.
- Brevo Free: 300 emails/day.
- Web Push itself is free; browser support and iOS installation requirements still apply.
- A busy workspace should monitor Brevo volume. If the beta exceeds 300 emails/day, reduce non-urgent email or upgrade; “strictly free” and unbounded email cannot both hold.
