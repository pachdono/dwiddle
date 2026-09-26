-- Roles, testers, bans, and reviews with the reviewer's name.
-- Run once in the Supabase SQL editor (a new query), after staff-v2.sql.
-- Safe to run again.

-- ---------- staff roles ----------
-- admin: everything, including making and removing staff.
-- moderator: everything else (inbox, testers, bans, announcements, logs).
update public.staff set role = 'admin' where role not in ('admin', 'moderator');
alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff add constraint staff_role_check check (role in ('admin', 'moderator'));

-- The signed in person's staff role, or null. Confirmed emails only.
create or replace function public.staff_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select s.role
  from auth.users u
  join public.staff s on lower(s.email) = lower(u.email)
  where u.id = auth.uid() and u.email_confirmed_at is not null
  limit 1;
$$;
revoke all on function public.staff_role() from public;
grant execute on function public.staff_role() to authenticated;

-- ---------- testers and bans ----------
-- No policies on either table: they are read and changed only through the
-- functions below, which check who is asking.
create table if not exists public.testers (
  user_id  uuid primary key references auth.users on delete cascade,
  added_at timestamptz not null default now(),
  added_by text
);
alter table public.testers enable row level security;

create table if not exists public.banned (
  user_id   uuid primary key references auth.users on delete cascade,
  reason    text check (reason is null or char_length(reason) <= 300),
  banned_at timestamptz not null default now(),
  banned_by text
);
alter table public.banned enable row level security;

create or replace function public.is_banned()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.banned where user_id = auth.uid());
$$;
revoke all on function public.is_banned() from public;
grant execute on function public.is_banned() to anon, authenticated;

-- What the app needs to know about the signed in person.
create or replace function public.my_access()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'role', public.staff_role(),
    'tester', exists (select 1 from public.testers where user_id = auth.uid()),
    'banned', exists (select 1 from public.banned where user_id = auth.uid()),
    'reason', (select reason from public.banned where user_id = auth.uid())
  );
$$;
revoke all on function public.my_access() from public;
grant execute on function public.my_access() to authenticated;

-- A banned account can still sign in and read its own data, but can no
-- longer save anything or leave feedback.
drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and not public.is_banned());

drop policy if exists "own materials" on public.materials;
create policy "own materials" on public.materials
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and not public.is_banned());

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and not public.is_banned());

drop policy if exists "anyone may leave feedback" on public.feedback;
create policy "anyone may leave feedback" on public.feedback
  for insert to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and approved = false
    and status = 'new'
    and not public.is_banned()
  );

-- ---------- changing someone's access ----------
-- what: 'tester', 'ban', 'moderator' or 'admin'. on: give or take away.
-- Staff can change testers and bans. Only admins can make or remove staff.
-- Staff can never be banned, nobody can remove their own staff role, and
-- the last admin cannot be removed.
create or replace function public.staff_set_access(target uuid, what text, turn_on boolean, why text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := public.staff_role();
  my_email text := (select email from auth.users where id = auth.uid());
  their_email text := (select email from auth.users where id = target);
  their_role text := (select role from public.staff where lower(email) = lower(their_email));
begin
  if me is null then raise exception 'Not staff'; end if;
  if their_email is null then raise exception 'No such account'; end if;

  if what = 'tester' then
    if turn_on then
      insert into public.testers (user_id, added_by) values (target, my_email) on conflict (user_id) do nothing;
    else
      delete from public.testers where user_id = target;
    end if;

  elsif what = 'ban' then
    if turn_on then
      if their_role is not null then raise exception 'Staff cannot be banned. Remove their staff role first.'; end if;
      insert into public.banned (user_id, reason, banned_by) values (target, left(why, 300), my_email)
        on conflict (user_id) do update set reason = excluded.reason, banned_by = excluded.banned_by, banned_at = now();
    else
      delete from public.banned where user_id = target;
    end if;

  elsif what in ('moderator', 'admin') then
    if me <> 'admin' then raise exception 'Only admins can change staff roles'; end if;
    if target = auth.uid() then raise exception 'You cannot change your own staff role'; end if;
    if turn_on then
      delete from public.banned where user_id = target;
      insert into public.staff (email, role) values (lower(their_email), what)
        on conflict (email) do update set role = excluded.role;
    else
      if their_role = 'admin' and (select count(*) from public.staff where role = 'admin') <= 1 then
        raise exception 'This is the last admin';
      end if;
      delete from public.staff where lower(email) = lower(their_email);
    end if;

  else
    raise exception 'Unknown change';
  end if;
end;
$$;
revoke all on function public.staff_set_access(uuid, text, boolean, text) from public;
grant execute on function public.staff_set_access(uuid, text, boolean, text) to authenticated;

-- ---------- the users list, with roles ----------
drop function if exists public.staff_users();
create function public.staff_users()
returns table (user_id uuid, email text, account_name text, avatar text, first_name text, last_name text,
               birth_date date, country text, signed_up timestamptz, last_seen timestamptz,
               role text, tester boolean, banned boolean, ban_reason text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.email::text,
         nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ''),
         coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
         p.first_name, p.last_name, p.birth_date, p.country, u.created_at, u.last_sign_in_at,
         s.role, t.user_id is not null, b.user_id is not null, b.reason
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.staff s on lower(s.email) = lower(u.email)
  left join public.testers t on t.user_id = u.id
  left join public.banned b on b.user_id = u.id
  where public.is_staff()
  order by u.created_at desc
  limit 2000;
$$;
revoke all on function public.staff_users() from public;
grant execute on function public.staff_users() to authenticated;

-- ---------- approved reviews, with who wrote them ----------
-- Only what the front page shows: first name and last initial, and the
-- profile picture from Google if there is one. Never an email.
create or replace function public.public_reviews(n int default 6)
returns table (id uuid, rating int, message text, created_at timestamptz, name text, avatar text)
language sql
security definer
set search_path = public
stable
as $$
  select f.id, f.rating, f.message, f.created_at,
         coalesce(
           p.first_name || coalesce(' ' || nullif(left(p.last_name, 1), '') || '.', ''),
           nullif(split_part(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ' ', 1), '')
         ),
         coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
  from public.feedback f
  left join auth.users u on u.id = f.user_id
  left join public.profiles p on p.user_id = f.user_id
  where f.approved = true and f.kind = 'review'
  order by f.created_at desc
  limit least(greatest(n, 1), 24);
$$;
revoke all on function public.public_reviews(int) from public;
grant execute on function public.public_reviews(int) to anon, authenticated;
