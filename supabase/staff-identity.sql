-- Staff names and IDs, owners, and complaints.
-- Run once in the Supabase SQL editor (a new query). Safe to run again.

-- ---------- who each member of staff is ----------
-- staff_no: a number given once and never changed (shown as DWS-001).
-- staff_name: chosen once by the member of staff; after that only an owner
-- can change it. owner: the two accounts that run Dwiddle.
alter table public.staff add column if not exists staff_no integer generated always as identity;
alter table public.staff add column if not exists staff_name text;
alter table public.staff add column if not exists owner boolean not null default false;
alter table public.staff drop constraint if exists staff_name_check;
alter table public.staff add constraint staff_name_check check (staff_name is null or char_length(trim(staff_name)) between 2 and 40);
create unique index if not exists staff_name_unique on public.staff (lower(staff_name));
create unique index if not exists staff_no_unique on public.staff (staff_no);
update public.staff set owner = true where lower(email) in ('dwiddle36@gmail.com', 'donoplayz2410@gmail.com');

-- The signed in member of staff.
drop function if exists public.staff_me();
create function public.staff_me()
returns table (email text, role text, staff_name text, staff_no integer, owner boolean)
language sql
security definer
set search_path = public
stable
as $$
  select s.email, s.role, s.staff_name, s.staff_no, s.owner
  from auth.users u
  join public.staff s on lower(s.email) = lower(u.email)
  where u.id = auth.uid() and u.email_confirmed_at is not null
  limit 1;
$$;
revoke all on function public.staff_me() from public;
grant execute on function public.staff_me() to authenticated;

-- Choosing a name: anyone on staff may choose their own once. After that,
-- and for anyone else, only an owner can change it.
create or replace function public.staff_set_name(new_name text, target_email text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.staff%rowtype;
  them public.staff%rowtype;
  clean text := trim(regexp_replace(coalesce(new_name, ''), '\s+', ' ', 'g'));
begin
  select s.* into me from auth.users u join public.staff s on lower(s.email) = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null limit 1;
  if me.email is null then raise exception 'Not staff'; end if;
  if char_length(clean) < 2 or char_length(clean) > 40 then raise exception 'A staff name is 2 to 40 characters'; end if;
  select * into them from public.staff where lower(email) = lower(coalesce(target_email, me.email));
  if them.email is null then raise exception 'No such member of staff'; end if;
  if them.email <> me.email and not me.owner then raise exception 'Only an owner can change another person name'; end if;
  if them.email = me.email and me.staff_name is not null and not me.owner then
    raise exception 'Your staff name is set. Ask dwiddle36@gmail.com or donoplayz2410@gmail.com to change it.';
  end if;
  if exists (select 1 from public.staff where lower(staff_name) = lower(clean) and email <> them.email) then
    raise exception 'Another member of staff already has that name';
  end if;
  update public.staff set staff_name = clean where email = them.email;
end;
$$;
revoke all on function public.staff_set_name(text, text) from public;
grant execute on function public.staff_set_name(text, text) to authenticated;

-- ---------- replies say who sent them ----------
alter table public.feedback_replies add column if not exists sent_by_name text;
alter table public.feedback_replies add column if not exists staff_no integer;

-- ---------- complaints ----------
alter table public.feedback drop constraint if exists feedback_kind_check;
alter table public.feedback add constraint feedback_kind_check check (kind in ('feedback', 'review', 'bug', 'complaint'));

-- ---------- the users list, with staff names and IDs ----------
drop function if exists public.staff_users();
create function public.staff_users()
returns table (user_id uuid, email text, account_name text, avatar text, first_name text, last_name text,
               birth_date date, country text, signed_up timestamptz, last_seen timestamptz,
               role text, tester boolean, banned boolean, ban_reason text,
               staff_name text, staff_no integer, owner boolean)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.email::text,
         nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ''),
         coalesce(p.avatar, u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
         p.first_name, p.last_name, p.birth_date, p.country, u.created_at, u.last_sign_in_at,
         s.role, t.user_id is not null, b.user_id is not null, b.reason,
         s.staff_name, s.staff_no, coalesce(s.owner, false)
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

-- ---------- owners cannot be demoted or removed ----------
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
  their_owner boolean := coalesce((select owner from public.staff where lower(email) = lower(their_email)), false);
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
    if their_owner then raise exception 'Owners keep their role'; end if;
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
