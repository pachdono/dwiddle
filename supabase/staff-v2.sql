-- Security fixes and account names for the staff site.
-- Run once in the Supabase SQL editor (a new query), after staff.sql.
-- Safe to run again.

-- 1. Staff is decided by the account s own confirmed email, read from the
--    accounts table, not by the sign in token alone. An account whose email
--    was never confirmed can never count as staff.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from auth.users u
    join public.staff s on lower(s.email) = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- 2. Anyone leaving feedback could mark their own review as approved (or any
--    status) straight through the API, which put it on the front page.
--    New feedback must now arrive unapproved and new.
drop policy if exists "anyone may leave feedback" on public.feedback;
create policy "anyone may leave feedback" on public.feedback
  for insert
  to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and approved = false
    and status = 'new'
  );

-- 3. Announcement links can only be web addresses.
alter table public.announcements drop constraint if exists announcements_link_web;
alter table public.announcements add constraint announcements_link_web
  check (link is null or link ~* '^https?://');

-- 4. The name on the account (from Google, or typed at sign up) as well as
--    the details filled in afterwards.
drop function if exists public.staff_users();
create function public.staff_users()
returns table (user_id uuid, email text, account_name text, first_name text, last_name text,
               birth_date date, country text, signed_up timestamptz, last_seen timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.email::text,
         nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ''),
         p.first_name, p.last_name, p.birth_date, p.country, u.created_at, u.last_sign_in_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where public.is_staff()
  order by u.created_at desc
  limit 2000;
$$;
revoke all on function public.staff_users() from public;
grant execute on function public.staff_users() to authenticated;

drop function if exists public.staff_feedback();
create function public.staff_feedback()
returns table (id uuid, kind text, rating int, message text, contact text, status text,
               approved boolean, created_at timestamptz, account_email text, name text)
language sql
security definer
set search_path = public
stable
as $$
  select f.id, f.kind, f.rating, f.message, f.contact, f.status, f.approved, f.created_at,
         u.email::text,
         coalesce(
           nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
           nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '')
         )
  from public.feedback f
  left join auth.users u on u.id = f.user_id
  left join public.profiles p on p.user_id = f.user_id
  where public.is_staff()
  order by f.created_at desc
  limit 1000;
$$;
revoke all on function public.staff_feedback() from public;
grant execute on function public.staff_feedback() to authenticated;
