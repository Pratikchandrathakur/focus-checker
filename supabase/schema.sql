-- FocusChecker database schema. Run once in Supabase → SQL Editor.
-- Every row belongs to one user; Row Level Security makes sure people
-- can only ever read or change their own data, even with the public anon key.

create table if not exists public.history_items (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  id         bigint      not null,
  type       text        not null check (type in ('Session', 'Check', 'StressReset')),
  date       timestamptz not null,
  payload    jsonb       not null check (pg_column_size(payload) < 16384),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists history_items_user_date on public.history_items (user_id, date desc);

alter table public.history_items enable row level security;

drop policy if exists "read own"   on public.history_items;
drop policy if exists "insert own" on public.history_items;
drop policy if exists "update own" on public.history_items;
drop policy if exists "delete own" on public.history_items;

create policy "read own"   on public.history_items for select using ((select auth.uid()) = user_id);
create policy "insert own" on public.history_items for insert with check ((select auth.uid()) = user_id);
create policy "update own" on public.history_items for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own" on public.history_items for delete using ((select auth.uid()) = user_id);
