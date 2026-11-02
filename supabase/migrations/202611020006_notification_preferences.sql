alter table public.profiles
  add column if not exists notification_preferences jsonb not null
  default '{
    "reminders": true,
    "email": true,
    "push": false,
    "newSharedEvent": true,
    "mentions": true,
    "dailyAgenda": false,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00"
  }'::jsonb;
