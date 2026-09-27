-- Staff, profiles, announcements and update logs.
-- Run this once in the Supabase SQL editor, after schema.sql:
-- Dashboard, SQL Editor, New query, paste all of this, Run.
-- Safe to run again.

-- ---------- who is staff ----------
-- Only editable here in the dashboard: there are no policies on this table,
-- so nobody can add themselves through the app or the API.
create table if not exists public.staff (
  email      text primary key,
  role       text not null default 'admin',
  added_at   timestamptz not null default now()
);
alter table public.staff enable row level security;

insert into public.staff (email) values
  ('donoplayz2410@gmail.com'),
  ('dwiddle36@gmail.com')
on conflict (email) do nothing;

-- True when the signed in person s email is on the staff list. The email
-- comes from the sign in token, which Supabase signs, so it cannot be faked.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.staff
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- ---------- feedback: bugs as their own kind, and a status ----------
alter table public.feedback drop constraint if exists feedback_kind_check;
alter table public.feedback add constraint feedback_kind_check check (kind in ('feedback', 'review', 'bug'));
alter table public.feedback add column if not exists status text not null default 'new';
alter table public.feedback drop constraint if exists feedback_status_check;
alter table public.feedback add constraint feedback_status_check check (status in ('new', 'seen', 'fixed', 'archived'));

drop policy if exists "staff read feedback" on public.feedback;
create policy "staff read feedback" on public.feedback
  for select to authenticated using (public.is_staff());
drop policy if exists "staff update feedback" on public.feedback;
create policy "staff update feedback" on public.feedback
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff delete feedback" on public.feedback;
create policy "staff delete feedback" on public.feedback
  for delete to authenticated using (public.is_staff());

-- ---------- profiles: filled in once after signing up ----------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name  text not null check (char_length(last_name) between 1 and 60),
  birth_date date not null check (birth_date > '1900-01-01' and birth_date < current_date),
  country    text check (country is null or char_length(country) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles
  for select to authenticated using (public.is_staff());

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- announcements: shown on the landing page ----------
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  message    text not null check (char_length(message) between 1 and 300),
  link       text check (link is null or char_length(link) <= 300),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;

drop policy if exists "active announcements are public" on public.announcements;
create policy "active announcements are public" on public.announcements
  for select to anon, authenticated using (active = true or public.is_staff());
drop policy if exists "staff manage announcements" on public.announcements;
create policy "staff manage announcements" on public.announcements
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- update logs: what changed, shown on the landing page ----------
create table if not exists public.updates (
  id           uuid primary key default gen_random_uuid(),
  version      text check (version is null or char_length(version) <= 20),
  title        text not null check (char_length(title) between 1 and 120),
  body         text not null check (char_length(body) between 1 and 4000),
  published_at timestamptz not null default now()
);
alter table public.updates enable row level security;

drop policy if exists "updates are public" on public.updates;
create policy "updates are public" on public.updates
  for select to anon, authenticated using (true);
drop policy if exists "staff manage updates" on public.updates;
create policy "staff manage updates" on public.updates
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

insert into public.updates (version, title, body, published_at)
select * from (values
  ('1.1.8', 'Character voices', 'Dwiddle and Puddle cheer you on at the end of a quiz and when you level up. Puddle has a new look.', timestamptz '2026-09-25 15:00+00'),
  ('1.1.9', 'Smoother notebook', 'Smoother, sharper ink on iPad with Apple Pencil. Round-ended highlighters. Pencil case, stability slider, ruler, compass and protractor.', timestamptz '2026-09-25 15:20+00'),
  ('1.1.10', 'Notebook on phones', 'Text you type now sits exactly where you see it. Tap text to select it, double tap to type. A tidier toolbar on phones, text boxes that fit their words, and Arial as the default font.', timestamptz '2026-09-26 23:20+00')
) as v(version, title, body, published_at)
where not exists (select 1 from public.updates);

-- ---------- what staff can see: emails come from the accounts ----------
-- Emails live in auth.users, which the app cannot read. These hand them to
-- staff only, and return nothing at all to anyone else.
create or replace function public.staff_feedback()
returns table (id uuid, kind text, rating int, message text, contact text, status text,
               approved boolean, created_at timestamptz, account_email text, name text)
language sql
security definer
set search_path = public
stable
as $$
  select f.id, f.kind, f.rating, f.message, f.contact, f.status, f.approved, f.created_at,
         u.email::text, nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '')
  from public.feedback f
  left join auth.users u on u.id = f.user_id
  left join public.profiles p on p.user_id = f.user_id
  where public.is_staff()
  order by f.created_at desc
  limit 1000;
$$;
revoke all on function public.staff_feedback() from public;
grant execute on function public.staff_feedback() to authenticated;

create or replace function public.staff_users()
returns table (user_id uuid, email text, first_name text, last_name text, birth_date date,
               country text, signed_up timestamptz, last_seen timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.email::text, p.first_name, p.last_name, p.birth_date, p.country, u.created_at, u.last_sign_in_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where public.is_staff()
  order by u.created_at desc
  limit 2000;
$$;
revoke all on function public.staff_users() from public;
grant execute on function public.staff_users() to authenticated;
