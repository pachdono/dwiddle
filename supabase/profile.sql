-- Profile name and picture, and review headlines.
-- Run once in the Supabase SQL editor (a new query), after replies.sql.
-- Safe to run again.

-- ---------- the name and picture people show as ----------
-- avatar is one of Dwiddle s own ("duck:sakura"), or a small picture the
-- person uploaded, kept as an image in the row (about 20 KB, never more
-- than 90 KB), or empty for their Google picture.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar text;
alter table public.profiles drop constraint if exists profiles_display_name_check;
alter table public.profiles add constraint profiles_display_name_check
  check (display_name is null or char_length(display_name) between 1 and 40);
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check
  check (avatar is null
    or avatar ~ '^duck:[a-z0-9-]{1,20}$'
    or (avatar ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' and char_length(avatar) <= 90000));

-- ---------- reviews: a headline and a highlighted phrase ----------
-- The person writing it can give a headline. Staff can change it and pick a
-- phrase to highlight on the front page.
alter table public.feedback add column if not exists title text;
alter table public.feedback add column if not exists highlight text;
alter table public.feedback drop constraint if exists feedback_title_check;
alter table public.feedback add constraint feedback_title_check check (title is null or char_length(title) <= 80);
alter table public.feedback drop constraint if exists feedback_highlight_check;
alter table public.feedback add constraint feedback_highlight_check check (highlight is null or char_length(highlight) <= 200);

-- Only a headline can be given when leaving feedback, never a highlight.
drop policy if exists "anyone may leave feedback" on public.feedback;
create policy "anyone may leave feedback" on public.feedback
  for insert to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and approved = false
    and status = 'new'
    and highlight is null
    and not public.is_banned()
  );

-- ---------- approved reviews for the front page ----------
drop function if exists public.public_reviews(int);
create function public.public_reviews(n int default 6)
returns table (id uuid, rating int, title text, message text, highlight text, created_at timestamptz, name text, avatar text)
language sql
security definer
set search_path = public
stable
as $$
  select f.id, f.rating, f.title, f.message, f.highlight, f.created_at,
         coalesce(
           p.display_name,
           p.first_name || coalesce(' ' || nullif(left(p.last_name, 1), '') || '.', ''),
           nullif(split_part(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ' ', 1), '')
         ),
         coalesce(p.avatar, u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
  from public.feedback f
  left join auth.users u on u.id = f.user_id
  left join public.profiles p on p.user_id = f.user_id
  where f.approved = true and f.kind = 'review'
  order by f.created_at desc
  limit least(greatest(n, 1), 24);
$$;
revoke all on function public.public_reviews(int) from public;
grant execute on function public.public_reviews(int) to anon, authenticated;

-- ---------- the staff inbox, with headlines ----------
drop function if exists public.staff_feedback();
create function public.staff_feedback()
returns table (id uuid, kind text, rating int, title text, message text, highlight text, contact text, status text,
               approved boolean, created_at timestamptz, account_email text, name text, avatar text)
language sql
security definer
set search_path = public
stable
as $$
  select f.id, f.kind, f.rating, f.title, f.message, f.highlight, f.contact, f.status, f.approved, f.created_at,
         u.email::text,
         coalesce(
           p.display_name,
           nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
           nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '')
         ),
         coalesce(p.avatar, u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
  from public.feedback f
  left join auth.users u on u.id = f.user_id
  left join public.profiles p on p.user_id = f.user_id
  where public.is_staff()
  order by f.created_at desc
  limit 1000;
$$;
revoke all on function public.staff_feedback() from public;
grant execute on function public.staff_feedback() to authenticated;
