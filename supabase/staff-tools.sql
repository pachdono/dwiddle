-- Accounts required for feedback, reply templates, a history of every
-- message for transcripts, and staff profile pictures.
-- Run once in the Supabase SQL editor (a new query), after staff-identity.sql.
-- Safe to run again.

-- ---------- feedback needs an account ----------
-- Feedback, bug reports, reviews and complaints can only be sent from a
-- signed in account, as that account.
drop policy if exists "anyone may leave feedback" on public.feedback;
drop policy if exists "signed in people may leave feedback" on public.feedback;
create policy "signed in people may leave feedback" on public.feedback
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and approved = false
    and status = 'new'
    and highlight is null
    and not public.is_banned()
  );

-- ---------- staff profile pictures ----------
-- One of the security ducks, chosen by each member of staff themselves.
alter table public.staff add column if not exists staff_avatar text;
alter table public.staff drop constraint if exists staff_avatar_check;
alter table public.staff add constraint staff_avatar_check check (staff_avatar is null or staff_avatar ~ '^sec:[a-z0-9-]{1,20}$');

drop function if exists public.staff_me();
create function public.staff_me()
returns table (email text, role text, staff_name text, staff_no integer, owner boolean, staff_avatar text)
language sql
security definer
set search_path = public
stable
as $$
  select s.email, s.role, s.staff_name, s.staff_no, s.owner, s.staff_avatar
  from auth.users u
  join public.staff s on lower(s.email) = lower(u.email)
  where u.id = auth.uid() and u.email_confirmed_at is not null
  limit 1;
$$;
revoke all on function public.staff_me() from public;
grant execute on function public.staff_me() to authenticated;

create or replace function public.staff_set_avatar(pick text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'Not staff'; end if;
  update public.staff s set staff_avatar = pick
    from auth.users u
    where u.id = auth.uid() and lower(s.email) = lower(u.email);
end;
$$;
revoke all on function public.staff_set_avatar(text) from public;
grant execute on function public.staff_set_avatar(text) to authenticated;

-- Everyone on staff, for showing names, IDs and pictures beside their work.
drop function if exists public.staff_team();
create function public.staff_team()
returns table (email text, role text, staff_name text, staff_no integer, owner boolean, staff_avatar text)
language sql
security definer
set search_path = public
stable
as $$
  select email, role, staff_name, staff_no, owner, staff_avatar from public.staff where public.is_staff() order by staff_no;
$$;
revoke all on function public.staff_team() from public;
grant execute on function public.staff_team() to authenticated;

-- ---------- reply templates ----------
-- Shared by all staff. {name} becomes the person's first name.
create table if not exists public.reply_templates (
  id         uuid primary key default gen_random_uuid(),
  kind       text check (kind is null or kind in ('feedback', 'review', 'bug', 'complaint')),
  title      text not null check (char_length(title) between 1 and 60),
  body       text not null check (char_length(body) between 1 and 5000),
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.reply_templates enable row level security;
drop policy if exists "staff use templates" on public.reply_templates;
create policy "staff use templates" on public.reply_templates
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

insert into public.reply_templates (kind, title, body, created_by)
select * from (values
  ('bug', 'Fixed', 'Thanks for reporting this. It''s fixed now: reload Dwiddle (or restart the app) and it should work. If it still happens, just reply to this email.', 'Dwiddle'),
  ('bug', 'Need more detail', 'Thanks for letting us know. So we can find the problem, could you tell us which device and browser you were using, and what you tapped just before it happened? A screenshot helps a lot too.', 'Dwiddle'),
  ('bug', 'Can''t reproduce', 'Thanks for the report. We tried to make this happen and couldn''t yet. If you see it again, could you reply with the steps you took and a screenshot? That will help us track it down.', 'Dwiddle'),
  ('bug', 'On the list', 'Thanks for reporting this. We''ve confirmed the problem and it''s on our list to fix. We''ll let you know when it''s done.', 'Dwiddle'),
  ('review', 'Thanks for the review', 'Thank you so much for your review! It really helps a small team like ours. We''re glad Dwiddle is useful for your studying.', 'Dwiddle'),
  ('review', 'Review on the website', 'Thank you for your review! We loved it, and it''s now on the Dwiddle front page. Good luck with your studying.', 'Dwiddle'),
  ('feedback', 'Great idea', 'Thanks for the idea! We''ve added it to the list of things we''re considering. We can''t promise when, but we read every suggestion.', 'Dwiddle'),
  ('feedback', 'Already there', 'Thanks for your message! Good news: Dwiddle can already do this. Here''s how: ', 'Dwiddle'),
  ('complaint', 'Sorry, looking into it', 'We''re sorry about this, and thank you for telling us. We''re looking into what happened and will get back to you as soon as we can.', 'Dwiddle'),
  ('complaint', 'Resolved', 'Thank you for your patience. We''ve looked into your complaint and ', 'Dwiddle')
) as v(kind, title, body, created_by)
where not exists (select 1 from public.reply_templates);

-- ---------- a history of every message, for transcripts ----------
-- Each change staff make to a message is written down with who made it.
create table if not exists public.feedback_events (
  id          uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback on delete cascade,
  what        text not null,
  by_email    text,
  by_name     text,
  staff_no    integer,
  at          timestamptz not null default now()
);
create index if not exists feedback_events_by_message on public.feedback_events (feedback_id, at);
alter table public.feedback_events enable row level security;
drop policy if exists "staff read events" on public.feedback_events;
create policy "staff read events" on public.feedback_events
  for select to authenticated using (public.is_staff());

create or replace function public.log_feedback_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me record;
  said text := '';
begin
  select * into me from public.staff_me() limit 1;
  if new.status is distinct from old.status then said := said || 'Marked ' || new.status || '. '; end if;
  if new.approved is distinct from old.approved then said := said || case when new.approved then 'Put on the website. ' else 'Taken off the website. ' end; end if;
  if new.title is distinct from old.title then said := said || 'Headline set to "' || coalesce(new.title, '') || '". '; end if;
  if new.highlight is distinct from old.highlight then said := said || 'Highlight set to "' || coalesce(new.highlight, '') || '". '; end if;
  if said <> '' then
    insert into public.feedback_events (feedback_id, what, by_email, by_name, staff_no)
    values (new.id, trim(said), me.email, me.staff_name, me.staff_no);
  end if;
  return new;
end;
$$;
drop trigger if exists feedback_log on public.feedback;
create trigger feedback_log after update on public.feedback
  for each row execute function public.log_feedback_change();
