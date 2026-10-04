-- Friends, the weekly leaderboard, messages between friends, and the online
-- library. Run once in the Supabase SQL editor (a new query), after
-- profile.sql and roles.sql. Safe to run again.
--
-- Everything is reached through the functions at the bottom, which check who
-- is asking. The tables themselves can only be read by the people they
-- belong to.

-- ---------- a username, so friends can find each other ----------
alter table public.profiles add column if not exists handle text;
alter table public.profiles drop constraint if exists profiles_handle_check;
alter table public.profiles add constraint profiles_handle_check check (handle is null or handle ~ '^[a-z0-9_]{3,20}$');
create unique index if not exists profiles_handle_key on public.profiles (handle) where handle is not null;

-- ---------- xp, for the weekly board ----------
create table if not exists public.xp_board (
  user_id uuid primary key references auth.users on delete cascade,
  total int not null default 0,
  week_start date not null default date_trunc('week', now())::date,
  week_base int not null default 0,
  month_start date not null default date_trunc('month', now())::date,
  month_base int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.xp_board add column if not exists month_start date not null default date_trunc('month', now())::date;
alter table public.xp_board add column if not exists month_base int not null default 0;
alter table public.xp_board enable row level security;
drop policy if exists "own xp row" on public.xp_board;
create policy "own xp row" on public.xp_board for select to authenticated using (user_id = auth.uid());

-- people who already have synced progress start on the board with the XP in it,
-- instead of waiting for their app to report. Never overwrites a row.
insert into public.xp_board (user_id, total, week_base, month_base)
select p.user_id, x.n, x.n, x.n
from public.progress p
cross join lateral (select case when (p.data #>> '{dwiddle-stats,xp}') ~ '^[0-9]{1,9}$' then (p.data #>> '{dwiddle-stats,xp}')::int else 0 end as n) x
where x.n > 0
on conflict (user_id) do nothing;

-- ---------- friends ----------
create table if not exists public.friendships (
  a uuid not null references auth.users on delete cascade,
  b uuid not null references auth.users on delete cascade,
  requested_by uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
alter table public.friendships enable row level security;
drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships" on public.friendships for select to authenticated using (auth.uid() in (a, b));

-- ---------- messages ----------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_pair on public.messages (least(from_id, to_id), greatest(from_id, to_id), id);
alter table public.messages enable row level security;
drop policy if exists "see own messages" on public.messages;
create policy "see own messages" on public.messages for select to authenticated using (auth.uid() in (from_id, to_id));
drop policy if exists "send to a friend" on public.messages;
create policy "send to a friend" on public.messages for insert to authenticated
  with check (
    from_id = auth.uid()
    and not public.is_banned()
    and exists (select 1 from public.friendships f
                where f.status = 'accepted' and f.a = least(from_id, to_id) and f.b = greatest(from_id, to_id))
  );
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;

-- ---------- shared material and notebooks ----------
create table if not exists public.shares (
  id text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  owner uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('material', 'notebook')),
  title text not null check (char_length(title) between 1 and 120),
  about text check (about is null or char_length(about) <= 300),
  subject text check (subject is null or char_length(subject) <= 40),
  payload jsonb not null check (octet_length(payload::text) <= 3000000),
  listed boolean not null default false,
  hidden boolean not null default false,
  saves int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists shares_listed on public.shares (created_at desc) where listed and not hidden;
alter table public.shares enable row level security;
drop policy if exists "own shares" on public.shares;
create policy "own shares" on public.shares for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

create table if not exists public.share_reports (
  share_id text not null references public.shares on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (share_id, user_id)
);
alter table public.share_reports enable row level security;

-- ---------- functions ----------
create or replace function public.person_name(uid uuid) returns text
language sql security definer set search_path = public stable as $$
  select coalesce(p.display_name, p.handle, 'Someone') from public.profiles p where p.user_id = uid
$$;

-- claim or change a username
create or replace function public.set_handle(h text) returns text
language plpgsql security definer set search_path = public as $$
declare clean text := lower(trim(h));
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if clean !~ '^[a-z0-9_]{3,20}$' then raise exception 'Use 3 to 20 letters, numbers or underscores.'; end if;
  if exists (select 1 from public.profiles where handle = clean and user_id <> auth.uid()) then raise exception 'That name is taken.'; end if;
  update public.profiles set handle = clean where user_id = auth.uid();
  if not found then raise exception 'Finish your profile first.'; end if;
  return clean;
end $$;

-- the signed in person's total xp; the week's and month's figures are worked out from it
create or replace function public.report_xp(p_total int) returns void
language plpgsql security definer set search_path = public as $$
declare wk date := date_trunc('week', now())::date; mo date := date_trunc('month', now())::date; r public.xp_board;
begin
  if auth.uid() is null then return; end if;
  select * into r from public.xp_board where user_id = auth.uid();
  if not found then
    insert into public.xp_board (user_id, total, week_start, week_base, month_start, month_base)
      values (auth.uid(), greatest(p_total, 0), wk, greatest(p_total, 0), mo, greatest(p_total, 0));
    return;
  end if;
  -- no one earns more than 3000 xp between two reports
  p_total := least(greatest(p_total, r.total), r.total + 3000);
  update public.xp_board set
    total = p_total,
    week_base = case when r.week_start < wk then r.total else r.week_base end,
    week_start = wk,
    month_base = case when r.month_start < mo then r.total else r.month_base end,
    month_start = mo,
    updated_at = now()
  where user_id = auth.uid();
end $$;

-- the board: the top 10, and you with your own rank if you are lower down.
-- 'everyone' is all time, for people who have picked a username (and you).
-- 'friends' (and you) is this month.
drop function if exists public.leaderboard(text);
create function public.leaderboard(scope text default 'everyone')
returns table (user_id uuid, name text, avatar text, handle text, score int, me boolean, rank int)
language sql security definer set search_path = public stable as $$
  with pool as (
    select x.user_id, coalesce(p.display_name, p.handle, 'Someone') as name, p.avatar, p.handle,
           case when scope = 'friends'
                then (case when x.month_start = date_trunc('month', now())::date then x.total - x.month_base else 0 end)
                else x.total end as score,
           x.user_id = auth.uid() as me, x.total
    from public.xp_board x
    left join public.profiles p on p.user_id = x.user_id
    where auth.uid() is not null and (
      (scope = 'friends' and (x.user_id = auth.uid() or exists (select 1 from public.friendships f where f.status = 'accepted'
            and f.a = least(x.user_id, auth.uid()) and f.b = greatest(x.user_id, auth.uid()))))
      or (scope = 'everyone' and (p.handle is not null or x.user_id = auth.uid()))
    )
  ), ranked as (
    select pool.*, (row_number() over (order by score desc, total desc, user_id))::int as rank from pool
  )
  select r.user_id, r.name, r.avatar, r.handle, r.score, r.me, r.rank
  from ranked r where r.rank <= 10 or r.me
  order by r.rank
$$;

-- look someone up by username
create or replace function public.find_person(h text)
returns table (user_id uuid, name text, avatar text, handle text)
language sql security definer set search_path = public stable as $$
  select p.user_id, coalesce(p.display_name, p.handle), p.avatar, p.handle
  from public.profiles p where p.handle = lower(trim(h)) and auth.uid() is not null and p.user_id <> auth.uid()
$$;

create or replace function public.add_friend(other uuid) returns text
language plpgsql security definer set search_path = public as $$
declare lo uuid := least(auth.uid(), other); hi uuid := greatest(auth.uid(), other); r public.friendships;
begin
  if auth.uid() is null or other is null or other = auth.uid() then raise exception 'not possible'; end if;
  select * into r from public.friendships where a = lo and b = hi;
  if not found then
    insert into public.friendships (a, b, requested_by) values (lo, hi, auth.uid());
    return 'sent';
  elsif r.status = 'pending' and r.requested_by <> auth.uid() then
    update public.friendships set status = 'accepted' where a = lo and b = hi;
    return 'accepted';
  end if;
  return r.status;
end $$;

create or replace function public.answer_friend(other uuid, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare lo uuid := least(auth.uid(), other); hi uuid := greatest(auth.uid(), other);
begin
  if accept then
    update public.friendships set status = 'accepted' where a = lo and b = hi and requested_by <> auth.uid();
  else
    delete from public.friendships where a = lo and b = hi;
  end if;
end $$;

drop function if exists public.my_friends();
create function public.my_friends()
returns table (user_id uuid, name text, avatar text, handle text, status text, incoming boolean, month_xp int)
language sql security definer set search_path = public stable as $$
  select o.id, coalesce(p.display_name, p.handle, 'Someone'), p.avatar, p.handle, f.status, f.requested_by <> auth.uid(),
         coalesce(case when x.month_start = date_trunc('month', now())::date then x.total - x.month_base else 0 end, 0)
  from public.friendships f
  cross join lateral (select case when f.a = auth.uid() then f.b else f.a end as id) o
  left join public.profiles p on p.user_id = o.id
  left join public.xp_board x on x.user_id = o.id
  where auth.uid() in (f.a, f.b)
  order by f.status, 2
$$;

-- the online library: listed shares, newest first or by a search
create or replace function public.explore(q text default '', n int default 40)
returns table (id text, kind text, title text, about text, subject text, saves int, created_at timestamptz, author text)
language sql security definer set search_path = public stable as $$
  select s.id, s.kind, s.title, s.about, s.subject, s.saves, s.created_at, public.person_name(s.owner)
  from public.shares s
  where s.listed and not s.hidden and auth.uid() is not null
    and (q = '' or s.title ilike '%' || q || '%' or coalesce(s.about, '') ilike '%' || q || '%' or coalesce(s.subject, '') ilike '%' || q || '%')
  order by s.saves desc, s.created_at desc
  limit least(greatest(n, 1), 60)
$$;

-- one share, to anyone with its code: listed or not, unless hidden
create or replace function public.open_share(sid text)
returns table (id text, kind text, title text, about text, subject text, payload jsonb, author text, saves int, mine boolean)
language sql security definer set search_path = public stable as $$
  select s.id, s.kind, s.title, s.about, s.subject, s.payload, public.person_name(s.owner), s.saves, s.owner = auth.uid()
  from public.shares s where s.id = sid and auth.uid() is not null and (not s.hidden or s.owner = auth.uid())
$$;

create or replace function public.count_save(sid text) returns void
language sql security definer set search_path = public as $$
  update public.shares set saves = saves + 1 where id = sid and not hidden and auth.uid() is not null
$$;

create or replace function public.report_share(sid text, why text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.share_reports (share_id, user_id, reason) values (sid, auth.uid(), left(why, 200)) on conflict do nothing;
  -- three different people reporting hides it until staff look
  if (select count(*) from public.share_reports where share_id = sid) >= 3 then
    update public.shares set hidden = true where id = sid;
  end if;
end $$;

-- staff: see reported shares and put them back or leave them hidden
create or replace function public.staff_hidden_shares()
returns table (id text, kind text, title text, about text, author text, reports bigint, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select s.id, s.kind, s.title, s.about, public.person_name(s.owner), (select count(*) from public.share_reports r where r.share_id = s.id), s.created_at
  from public.shares s where public.is_staff() and (s.hidden or exists (select 1 from public.share_reports r where r.share_id = s.id))
  order by s.created_at desc limit 100
$$;
create or replace function public.staff_set_share_hidden(sid text, h boolean) returns void
language sql security definer set search_path = public as $$
  update public.shares set hidden = h where id = sid and public.is_staff()
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'set_handle(text)', 'report_xp(int)', 'leaderboard(text)', 'find_person(text)', 'add_friend(uuid)', 'answer_friend(uuid,boolean)',
    'my_friends()', 'explore(text,int)', 'open_share(text)', 'count_save(text)', 'report_share(text,text)',
    'staff_hidden_shares()', 'staff_set_share_hidden(text,boolean)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
