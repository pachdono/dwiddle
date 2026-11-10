-- Fixes from the November 2026 code review (D1 to D5, D7, D9, D13, D16).
-- Run once in the Supabase SQL editor as a new query, AFTER every other file
-- in this folder. Safe to run again. It never touches the cron secret value.

-- D1. The reminder secret can never be the public placeholder, and has to be
--     long. Existing rows are not checked, new ones are. If push.sql was ever
--     re-run before, rotate CRON_SECRET and insert the new value by hand.
delete from public.push_secret where secret = 'PUT-THE-CRON-SECRET-HERE';
alter table public.push_secret drop constraint if exists push_secret_strong;
alter table public.push_secret add constraint push_secret_strong
  check (secret <> 'PUT-THE-CRON-SECRET-HERE' and length(secret) >= 32) not valid;

-- D2. Reviews are served only by public_reviews(). The feedback table holds
--     the reviewer's email, so nobody can read it directly any more.
drop policy if exists "approved reviews are public" on public.feedback;
revoke select on public.feedback from anon;

-- D3. A bad time zone or hour can no longer break reminders for everyone.
update public.push_subs set tz = 'UTC' where tz not in (select name from pg_timezone_names);
update public.push_subs set hour = 17 where hour not between 0 and 23;
alter table public.push_subs drop constraint if exists push_subs_hour_range;
alter table public.push_subs add constraint push_subs_hour_range check (hour between 0 and 23);

create or replace function public.push_subs_check_tz() returns trigger
language plpgsql as $$
begin
  if new.tz is null or not exists (select 1 from pg_timezone_names where name = new.tz) then
    new.tz := 'UTC';
  end if;
  return new;
end $$;
drop trigger if exists push_subs_check_tz on public.push_subs;
create trigger push_subs_check_tz before insert or update of tz on public.push_subs
  for each row execute function public.push_subs_check_tz();

-- D4. Owners can publish, edit their own words and delete, but cannot undo
--     moderation or fake popularity. Banned people cannot publish.
drop policy if exists "own shares" on public.shares;
drop policy if exists "read own shares" on public.shares;
drop policy if exists "publish own shares" on public.shares;
drop policy if exists "edit own shares" on public.shares;
drop policy if exists "delete own shares" on public.shares;
create policy "read own shares" on public.shares for select to authenticated
  using (owner = auth.uid());
create policy "publish own shares" on public.shares for insert to authenticated
  with check (owner = auth.uid() and not public.is_banned() and hidden = false and saves = 0);
create policy "edit own shares" on public.shares for update to authenticated
  using (owner = auth.uid() and not public.is_banned())
  with check (owner = auth.uid());
create policy "delete own shares" on public.shares for delete to authenticated
  using (owner = auth.uid());
revoke update on public.shares from anon, authenticated;
grant update (title, about, subject, payload, listed) on public.shares to authenticated;

-- D5. XP: the first report is capped, and gains are limited by elapsed time
--     (300 plus 100 a minute), not by the number of calls.
create or replace function public.report_xp(p_total int) returns void
language plpgsql security definer set search_path = public as $$
declare
  wk date := date_trunc('week', now())::date;
  mo date := date_trunc('month', now())::date;
  r public.xp_board;
  room bigint;
  new_total bigint;
begin
  if auth.uid() is null then return; end if;
  p_total := least(greatest(coalesce(p_total, 0), 0), 50000000);
  select * into r from public.xp_board where user_id = auth.uid();
  if not found then
    p_total := least(p_total, 100000);
    insert into public.xp_board (user_id, total, week_start, week_base, month_start, month_base)
      values (auth.uid(), p_total, wk, p_total, mo, p_total);
    return;
  end if;
  room := 300 + floor(extract(epoch from (now() - r.updated_at)) / 60 * 100);
  new_total := least(greatest(p_total, r.total)::bigint, r.total::bigint + room, 50000000);
  update public.xp_board set
    total = new_total::int,
    week_base = case when r.week_start < wk then r.total else r.week_base end,
    week_start = wk,
    month_base = case when r.month_start < mo then r.total else r.month_base end,
    month_start = mo,
    updated_at = case when new_total > r.total then now() else r.updated_at end
  where user_id = auth.uid();
end $$;

-- D7. The anonymous role cannot run any function except the few meant to be
--     public (Supabase grants new functions to anon directly, so
--     "revoke from public" alone does not remove it).
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname not in ('public_reviews', 'user_count', 'push_targets', 'push_mark',
                            'nudge_targets', 'nudge_mark', 'nudge_optout', 'calfeed_get')
  loop
    execute format('revoke execute on function %s from anon', f.sig);
  end loop;
end $$;
revoke execute on function public.person_name(uuid) from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon;

-- D9. The notebooks bucket: private, size limited, and each person can only
--     reach the folder named after their own user id.
insert into storage.buckets (id, name, public, file_size_limit)
values ('notebooks', 'notebooks', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "notebooks read own" on storage.objects;
drop policy if exists "notebooks insert own" on storage.objects;
drop policy if exists "notebooks update own" on storage.objects;
drop policy if exists "notebooks delete own" on storage.objects;
create policy "notebooks read own" on storage.objects for select to authenticated
  using (bucket_id = 'notebooks' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "notebooks insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'notebooks' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "notebooks update own" on storage.objects for update to authenticated
  using (bucket_id = 'notebooks' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'notebooks' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "notebooks delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'notebooks' and (storage.foldername(name))[1] = auth.uid()::text);

-- D13. Deleting an account also deletes their feedback, including the email.
do $$
begin
  if exists (select 1 from pg_constraint
             where conname = 'feedback_user_id_fkey' and conrelid = 'public.feedback'::regclass) then
    alter table public.feedback drop constraint feedback_user_id_fkey;
    alter table public.feedback add constraint feedback_user_id_fkey
      foreign key (user_id) references auth.users on delete cascade;
  end if;
end $$;

-- D16. Chat photos must be real image data URLs and files must be data URLs,
--      so a message cannot carry a tracking link. Existing rows are not checked.
alter table public.messages drop constraint if exists messages_data_shape;
alter table public.messages add constraint messages_data_shape check (
  data is null
  or (kind = 'image' and data ~ '^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$')
  or (kind = 'file' and data ~ '^data:[a-z0-9.+/-]{1,100}(;[a-z0-9=.+-]{1,100})*;base64,[A-Za-z0-9+/=]*$')
) not valid;
