alter type public.notification_type add value if not exists 'schedule_requested';
alter type public.notification_type add value if not exists 'schedule_accepted';
alter type public.notification_type add value if not exists 'schedule_declined';
alter type public.notification_type add value if not exists 'schedule_countered';
alter type public.notification_type add value if not exists 'schedule_withdrawn';
