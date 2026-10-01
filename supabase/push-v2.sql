-- Reminders at each person's own time, on their own clock.
-- Run once in the Supabase SQL editor as a new query, after push.sql. Safe to run again.

alter table public.push_subs add column if not exists hour int not null default 17;

-- Who to remind now: reminders on, past their chosen hour where they are (but
-- not late at night), not reminded yet today, and not studied yet today.
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
    and extract(hour from (now() at time zone s.tz)) >= s.hour
    and extract(hour from (now() at time zone s.tz)) < least(s.hour + 4, 23)
    and (s.last_sent is null or s.last_sent < (now() at time zone s.tz)::date)
    and not coalesce((p.data -> 'dwiddle-stats' -> 'days') ? to_char(now() at time zone s.tz, 'YYYY-MM-DD'), false);
$$;
revoke all on function public.push_targets(text) from public;
grant execute on function public.push_targets(text) to anon, authenticated;
