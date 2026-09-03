-- Dwiddle database schema.
-- Run this once in the Supabase SQL editor: Dashboard, SQL Editor, New query.

-- One row per person. Everything the app remembers lives in `data` as JSON,
-- which keeps the schema stable while the app's shape is still moving.
create table if not exists public.progress (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Generated material: notes turned into topics, questions and a study sheet.
create table if not exists public.materials (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  title      text not null,
  source     text,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists materials_user_created
  on public.materials (user_id, created_at desc);

-- Row level security. Without these policies the anon key would let anyone
-- read every row, so they are the part that actually protects the data.
alter table public.progress  enable row level security;
alter table public.materials enable row level security;

drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own materials" on public.materials;
create policy "own materials" on public.materials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at honest so the client can tell which copy is newer.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists progress_touch on public.progress;
create trigger progress_touch
  before update on public.progress
  for each row execute function public.touch_updated_at();
