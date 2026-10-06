-- Messages: replies, deleting your own, photos, files and shared notebooks.
-- Run once in the Supabase SQL editor, after supabase/social.sql.
-- Plain text messages keep working before and after.

alter table public.messages add column if not exists kind text not null default 'text';
alter table public.messages add column if not exists attach jsonb;          -- name, type, size for a file; id, kind, title for a share
alter table public.messages add column if not exists data text;             -- a photo or file as a data URL, fetched only when it is shown
alter table public.messages add column if not exists reply_to bigint;
alter table public.messages add column if not exists reply_preview jsonb;   -- { from, text } as it was when replied to, so it survives a delete

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text', 'image', 'file', 'share'));

alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) <= 1000 and (kind <> 'text' or char_length(body) >= 1));

alter table public.messages drop constraint if exists messages_data_size;
alter table public.messages add constraint messages_data_size check (data is null or char_length(data) <= 1200000);

-- you can take back your own messages, and only yours
drop policy if exists "delete own message" on public.messages;
create policy "delete own message" on public.messages for delete to authenticated using (from_id = auth.uid());

-- the photo or file of one message, for a person in that conversation
create or replace function public.message_data(mid bigint)
returns text language sql security definer set search_path = public stable as $$
  select m.data from public.messages m where m.id = mid and auth.uid() in (m.from_id, m.to_id)
$$;
revoke all on function public.message_data(bigint) from public;
grant execute on function public.message_data(bigint) to authenticated;
