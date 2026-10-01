-- A friendly email to anyone who has not studied for a week.
-- Run once in the Supabase SQL editor as a new query, after push.sql. Safe to run again.

-- Who said no to these emails, and when each person was last emailed.
create table if not exists public.nudges (
  user_id uuid primary key references auth.users on delete cascade,
  opted_out boolean not null default false,
  last_nudged date
);
alter table public.nudges enable row level security;
drop policy if exists "own nudges" on public.nudges;
create policy "own nudges" on public.nudges
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Everyone to email now: an account a week old or more, nothing studied in
-- the last 7 days, not emailed in the last 7 days, and not opted out.
create or replace function public.nudge_targets(key text)
returns table (user_id uuid, email text, first_name text, last_day text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.email::text, coalesce(p.first_name, ''),
         (select max(d) from jsonb_array_elements_text(coalesce(g.data -> 'dwiddle-stats' -> 'days', '[]'::jsonb)) d)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.progress g on g.user_id = u.id
  left join public.nudges n on n.user_id = u.id
  where exists (select 1 from public.push_secret x where x.secret = key)
    and u.email is not null
    and u.email_confirmed_at is not null
    and u.created_at < now() - interval '7 days'
    and coalesce(n.opted_out, false) = false
    and (n.last_nudged is null or n.last_nudged < current_date - 7)
    and coalesce((select max(d) from jsonb_array_elements_text(coalesce(g.data -> 'dwiddle-stats' -> 'days', '[]'::jsonb)) d), '0000-00-00')
        < to_char(current_date - 7, 'YYYY-MM-DD')
  limit 60;
$$;
revoke all on function public.nudge_targets(text) from public;
grant execute on function public.nudge_targets(text) to anon, authenticated;

create or replace function public.nudge_mark(key text, ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.push_secret x where x.secret = key) then
    return;
  end if;
  insert into public.nudges (user_id, last_nudged)
  select unnest(ids), current_date
  on conflict (user_id) do update set last_nudged = excluded.last_nudged;
end;
$$;
revoke all on function public.nudge_mark(text, uuid[]) from public;
grant execute on function public.nudge_mark(text, uuid[]) to anon, authenticated;

-- The unsubscribe link in the email: works without signing in.
create or replace function public.nudge_optout(key text, uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.push_secret x where x.secret = key) then
    return;
  end if;
  insert into public.nudges (user_id, opted_out) values (uid, true)
  on conflict (user_id) do update set opted_out = true;
end;
$$;
revoke all on function public.nudge_optout(text, uuid) from public;
grant execute on function public.nudge_optout(text, uuid) to anon, authenticated;
