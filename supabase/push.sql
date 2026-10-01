-- Daily study reminders by push notification.
-- Run once in the Supabase SQL editor, as a new query. Safe to run again.
-- Put the same value as CRON_SECRET in Vercel where it says PUT-THE-CRON-SECRET-HERE.

-- 1. Each device that turned reminders on.
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  tz text not null default 'UTC',
  last_sent date,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "own push subs" on public.push_subs;
create policy "own push subs" on public.push_subs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2. The secret the daily job proves itself with. Nobody can read this table
--    through the API: it has no policies at all.
create table if not exists public.push_secret (id int primary key default 1, secret text not null);
alter table public.push_secret enable row level security;
insert into public.push_secret (id, secret) values (1, 'PUT-THE-CRON-SECRET-HERE') on conflict (id) do update set secret = excluded.secret;

-- 3. Who to remind today: reminders on, not reminded yet today, and not
--    studied yet today in their own time zone. Only for the daily job.
create or replace function public.push_targets(key text)
returns table (endpoint text, p256dh text, auth text, streak_alive boolean)
language sql
security definer
set search_path = public
stable
as $$
  select s.endpoint, s.p256dh, s.auth,
         coalesce((p.data -> 'dwiddle-stats' -> 'days') ? to_char((now() at time zone s.tz) - interval '1 day', 'YYYY-MM-DD'), false)
  from public.push_subs s
  left join public.progress p on p.user_id = s.user_id
  where exists (select 1 from public.push_secret x where x.secret = key)
    and (s.last_sent is null or s.last_sent < (now() at time zone s.tz)::date)
    and not coalesce((p.data -> 'dwiddle-stats' -> 'days') ? to_char(now() at time zone s.tz, 'YYYY-MM-DD'), false);
$$;
revoke all on function public.push_targets(text) from public;
grant execute on function public.push_targets(text) to anon, authenticated;

-- 4. Marks who was reminded, and forgets devices that switched it off.
create or replace function public.push_mark(key text, sent text[], gone text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.push_secret x where x.secret = key) then
    return;
  end if;
  update public.push_subs set last_sent = (now() at time zone tz)::date where endpoint = any(sent);
  delete from public.push_subs where endpoint = any(gone);
end;
$$;
revoke all on function public.push_mark(text, text[], text[]) from public;
grant execute on function public.push_mark(text, text[], text[]) to anon, authenticated;
