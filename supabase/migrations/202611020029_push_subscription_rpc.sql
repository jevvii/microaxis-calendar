create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'You need to be signed in'; end if;
  if nullif(p_endpoint, '') is null or nullif(p_p256dh, '') is null or nullif(p_auth, '') is null then
    raise exception 'Invalid push subscription';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, last_used_at)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent, now())
  on conflict (endpoint) do update
  set user_id = auth.uid(),
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      last_used_at = now();
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id = auth.uid()
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke all on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;
