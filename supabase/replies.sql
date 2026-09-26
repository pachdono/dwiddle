-- Replies written on the staff site, kept under each message.
-- Run once in the Supabase SQL editor (a new query), after roles.sql.
-- Safe to run again.

create table if not exists public.feedback_replies (
  id          uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback on delete cascade,
  body        text not null check (char_length(body) between 1 and 5000),
  sent_by     text not null,
  sent_to     text,
  emailed     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists feedback_replies_by_message on public.feedback_replies (feedback_id, created_at);

alter table public.feedback_replies enable row level security;

-- Staff read them; nothing else can. They are written by the staff site's
-- server after the email goes out, as the staff member who sent it.
drop policy if exists "staff read replies" on public.feedback_replies;
create policy "staff read replies" on public.feedback_replies
  for select to authenticated using (public.is_staff());

drop policy if exists "staff write replies" on public.feedback_replies;
create policy "staff write replies" on public.feedback_replies
  for insert to authenticated
  with check (public.is_staff() and lower(sent_by) = lower(coalesce(auth.jwt() ->> 'email', '')));
