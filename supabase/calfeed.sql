-- A live calendar link for the study plan.
-- Run once in the Supabase SQL editor as a new query. Safe to run again.
--
-- Each person gets one secret link. Google Calendar, Apple Calendar and Outlook
-- subscribe to it and keep the study sessions up to date by themselves, with no
-- Google sign in and no "unverified app" warning. The link only ever shows the
-- sessions (a time and a topic), and anyone holding it can read them, so it is a
-- long random value that can be replaced at any time.

create table if not exists public.calfeeds (
  user_id uuid primary key references auth.users on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  sessions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.calfeeds enable row level security;
drop policy if exists "own calfeed" on public.calfeeds;
create policy "own calfeed" on public.calfeeds
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- What the calendar app fetches: the sessions for one token, nothing else.
create or replace function public.calfeed_get(tok text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce((select sessions from public.calfeeds where token = tok), null);
$$;
revoke all on function public.calfeed_get(text) from public;
grant execute on function public.calfeed_get(text) to anon, authenticated;
