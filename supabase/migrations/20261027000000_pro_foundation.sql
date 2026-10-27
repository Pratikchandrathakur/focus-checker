-- FocusChecker Pro foundation
-- ---------------------------------------------------------------------------
-- Every Pro rule lives HERE, in the database, where a user's browser cannot change it:
--   * who is Pro                       -> public.subscriptions (written only by the payments webhook)
--   * what free accounts may sync      -> row level security on public.history_items (last 7 days)
--   * custom sound mixes, weekly email -> row level security, Pro only
-- The app's own checks are only there to show the right buttons.
--
-- Safe to run on a project that already has public.history_items: old policies are replaced
-- (a leftover permissive policy would silently bypass the 7-day rule).
-- ---------------------------------------------------------------------------

-- ===== subscriptions (server-written only) =====
create table if not exists public.subscriptions (
  user_id                  uuid primary key references auth.users (id) on delete cascade,
  provider                 text not null check (provider ~ '^[a-z0-9_-]{1,32}$'),
  provider_subscription_id text not null check (provider_subscription_id ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  provider_customer_id     text check (provider_customer_id is null or provider_customer_id ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  plan                     text not null check (plan in ('monthly', 'yearly')),
  status                   text not null check (status in ('active', 'trialing', 'past_due', 'paused', 'canceled', 'expired')),
  current_period_end       timestamptz not null,
  cancel_at_period_end     boolean not null default false,
  last_event_at            timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from public, anon, authenticated;
grant select (plan, status, current_period_end, cancel_at_period_end) on public.subscriptions to authenticated;
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- Remembers every payment event we have processed so replays are harmless.
create table if not exists public.webhook_events (
  provider    text not null,
  event_id    text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);
alter table public.webhook_events enable row level security;
revoke all on public.webhook_events from public, anon, authenticated;

-- ===== entitlement =====
-- Internal: is this user Pro right now? Not callable by clients (so nobody can probe other accounts).
create or replace function public.is_pro_user(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user
      and s.status in ('active', 'trialing', 'past_due', 'canceled')
      -- 3 days of grace for late renewal webhooks / card retries; none once a cancelled plan has run out.
      and s.current_period_end + (case when s.status = 'canceled' then interval '0' else interval '3 days' end) > now()
  )
$$;
revoke execute on function public.is_pro_user(uuid) from public, anon, authenticated;
grant execute on function public.is_pro_user(uuid) to service_role;

-- "Am I Pro?" for the signed-in caller only. No arguments on purpose.
create or replace function public.is_pro()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_pro_user((select auth.uid()))
$$;
revoke execute on function public.is_pro() from public, anon;
grant execute on function public.is_pro() to authenticated, service_role;

create or replace function public.my_entitlement()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  s record;
  pro boolean;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  pro := public.is_pro_user(uid);
  select plan, status, current_period_end, cancel_at_period_end into s
    from public.subscriptions where user_id = uid;
  return jsonb_build_object(
    'pro', pro,
    'plan', case when pro then s.plan end,
    'status', s.status,
    'current_period_end', s.current_period_end,
    'cancel_at_period_end', coalesce(s.cancel_at_period_end, false),
    'history_days', case when pro then null else 7 end,
    'max_mixes', case when pro then 20 else 0 end
  );
end $$;
revoke execute on function public.my_entitlement() from public, anon;
grant execute on function public.my_entitlement() to authenticated;

-- ===== the one place subscription state changes (called by the payments-webhook function) =====
create or replace function public.apply_subscription_event(
  p_provider text, p_event_id text, p_event_time timestamptz, p_user_id uuid,
  p_sub_id text, p_customer_id text, p_plan text, p_status text,
  p_period_end timestamptz, p_cancel_at_period_end boolean
) returns text language plpgsql security definer set search_path = '' as $$
declare
  owner_of_sub uuid;
  inserted int;
  current_last timestamptz;
begin
  -- Second line of defence behind the webhook's own validation: a bad timestamp must never be stored.
  -- A far-future event time would make every later (real) event look stale and freeze the account;
  -- a far-future period end would be a free lifetime plan.
  if p_event_time is null or p_event_time > now() + interval '5 minutes'
     or p_period_end is null or p_period_end > now() + interval '3 years' or p_period_end < now() - interval '2 years' then
    raise exception 'invalid subscription event' using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    return 'unknown_user';
  end if;

  select user_id into owner_of_sub from public.subscriptions
    where provider = p_provider and provider_subscription_id = p_sub_id;
  if owner_of_sub is not null and owner_of_sub <> p_user_id then
    return 'conflict';
  end if;

  insert into public.webhook_events (provider, event_id) values (p_provider, p_event_id)
    on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return 'duplicate';
  end if;

  select last_event_at into current_last from public.subscriptions where user_id = p_user_id;
  if current_last is not null and current_last > p_event_time then
    return 'stale';
  end if;

  insert into public.subscriptions as s
    (user_id, provider, provider_subscription_id, provider_customer_id, plan, status,
     current_period_end, cancel_at_period_end, last_event_at, updated_at)
  values
    (p_user_id, p_provider, p_sub_id, p_customer_id, p_plan, p_status,
     p_period_end, coalesce(p_cancel_at_period_end, false), p_event_time, now())
  on conflict (user_id) do update set
    provider = excluded.provider,
    provider_subscription_id = excluded.provider_subscription_id,
    provider_customer_id = excluded.provider_customer_id,
    plan = excluded.plan,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    last_event_at = excluded.last_event_at,
    updated_at = now()
  where s.last_event_at <= excluded.last_event_at;
  return 'applied';
end $$;
revoke execute on function public.apply_subscription_event(text, text, timestamptz, uuid, text, text, text, text, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.apply_subscription_event(text, text, timestamptz, uuid, text, text, text, text, timestamptz, boolean)
  to service_role;

-- ===== history_items: free = last 7 days, Pro = everything =====
create table if not exists public.history_items (
  user_id uuid        not null references auth.users (id) on delete cascade,
  id      bigint      not null,
  type    text        not null,
  date    timestamptz not null,
  payload jsonb       not null,
  primary key (user_id, id)
);
create index if not exists history_items_user_date_idx on public.history_items (user_id, date desc);
alter table public.history_items enable row level security;

-- Remove whatever policies the table had before: a leftover permissive policy would bypass the rules below.
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'history_items' loop
    execute format('drop policy %I on public.history_items', r.policyname);
  end loop;
end $$;

revoke all on public.history_items from public, anon, authenticated;
grant select, insert, update, delete on public.history_items to authenticated;

create policy history_select on public.history_items for select to authenticated
  using (user_id = (select auth.uid()) and (public.is_pro() or date::timestamptz >= now() - interval '7 days'));
create policy history_insert on public.history_items for insert to authenticated
  with check (user_id = (select auth.uid()) and (public.is_pro() or date::timestamptz >= now() - interval '7 days'));
create policy history_update on public.history_items for update to authenticated
  using (user_id = (select auth.uid()) and (public.is_pro() or date::timestamptz >= now() - interval '7 days'))
  with check (user_id = (select auth.uid()) and (public.is_pro() or date::timestamptz >= now() - interval '7 days'));
create policy history_delete on public.history_items for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.history_items_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  n int;
  is_pro boolean;
begin
  if new.type not in ('Check', 'Session', 'StressReset') then
    raise exception 'invalid history item type' using errcode = '23514';
  end if;
  if jsonb_typeof(new.payload) <> 'object' then
    raise exception 'history payload must be a JSON object' using errcode = '23514';
  end if;
  if pg_column_size(new.payload) > 16384 then
    raise exception 'history payload too large' using errcode = '23514';
  end if;
  if new.date::timestamptz > now() + interval '2 days' then
    raise exception 'history item dated in the future' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    is_pro := public.is_pro_user(new.user_id);
    if is_pro then
      select count(*) into n from public.history_items where user_id = new.user_id;
      if n >= 50000 then raise exception 'history quota reached' using errcode = '53400'; end if;
    else
      -- Free accounts only ever hold the last 7 days, so only those rows count.
      select count(*) into n from public.history_items
        where user_id = new.user_id and date::timestamptz >= now() - interval '7 days';
      if n >= 500 then raise exception 'history quota reached' using errcode = '53400'; end if;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.history_items_guard() from public, anon, authenticated;
drop trigger if exists history_items_guard on public.history_items;
create trigger history_items_guard before insert or update on public.history_items
  for each row execute function public.history_items_guard();

-- ===== sound_mixes (Pro) =====
create table if not exists public.sound_mixes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  layers     jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sound_mixes_user_idx on public.sound_mixes (user_id);
alter table public.sound_mixes enable row level security;
revoke all on public.sound_mixes from public, anon, authenticated;
grant select, insert, update, delete on public.sound_mixes to authenticated;

drop policy if exists sound_mixes_select on public.sound_mixes;
drop policy if exists sound_mixes_insert on public.sound_mixes;
drop policy if exists sound_mixes_update on public.sound_mixes;
drop policy if exists sound_mixes_delete on public.sound_mixes;
create policy sound_mixes_select on public.sound_mixes for select to authenticated
  using (user_id = (select auth.uid()));
create policy sound_mixes_insert on public.sound_mixes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_pro());
create policy sound_mixes_update on public.sound_mixes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_pro());
create policy sound_mixes_delete on public.sound_mixes for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.sound_mixes_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  el jsonb;
  n int;
begin
  new.name := btrim(new.name);
  if length(new.name) < 1 or length(new.name) > 40 or new.name ~ '[[:cntrl:]]' then
    raise exception 'mix name must be 1-40 characters' using errcode = '23514';
  end if;
  if jsonb_typeof(new.layers) <> 'array' or jsonb_array_length(new.layers) not between 1 and 6 then
    raise exception 'a mix needs 1 to 6 layers' using errcode = '23514';
  end if;
  for el in select * from jsonb_array_elements(new.layers) loop
    if jsonb_typeof(el) <> 'object'
       or (select count(*) from jsonb_object_keys(el)) <> 2
       or not (el ? 'preset' and el ? 'volume')
       or jsonb_typeof(el -> 'preset') <> 'string'
       or (el ->> 'preset') not in ('gamma', 'alpha', 'pink', 'rain', 'brown', 'waves')
       or jsonb_typeof(el -> 'volume') <> 'number'
       or (el ->> 'volume')::numeric not between 0 and 1 then
      raise exception 'invalid mix layer' using errcode = '23514';
    end if;
  end loop;
  if (select count(distinct x ->> 'preset') from jsonb_array_elements(new.layers) x) <> jsonb_array_length(new.layers) then
    raise exception 'each sound can appear once per mix' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    select count(*) into n from public.sound_mixes where user_id = new.user_id;
    if n >= 20 then raise exception 'mix limit reached' using errcode = '53400'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.sound_mixes_guard() from public, anon, authenticated;
drop trigger if exists sound_mixes_guard on public.sound_mixes;
create trigger sound_mixes_guard before insert or update on public.sound_mixes
  for each row execute function public.sound_mixes_guard();

-- ===== report_prefs (weekly email, Pro) =====
-- The address is read from the account at send time, never stored here, so nobody can aim the email elsewhere.
create table if not exists public.report_prefs (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  weekly_email boolean not null default false,
  last_sent_at timestamptz,
  updated_at   timestamptz not null default now()
);
alter table public.report_prefs enable row level security;
revoke all on public.report_prefs from public, anon, authenticated;
grant select on public.report_prefs to authenticated;
grant insert (user_id, weekly_email), update (weekly_email) on public.report_prefs to authenticated;

drop policy if exists report_prefs_select on public.report_prefs;
drop policy if exists report_prefs_insert on public.report_prefs;
drop policy if exists report_prefs_update on public.report_prefs;
create policy report_prefs_select on public.report_prefs for select to authenticated
  using (user_id = (select auth.uid()));
create policy report_prefs_insert on public.report_prefs for insert to authenticated
  with check (user_id = (select auth.uid()) and (not weekly_email or public.is_pro()));
create policy report_prefs_update on public.report_prefs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (not weekly_email or public.is_pro()));

-- Used only by the weekly-report function (service role): who should get an email now?
create or replace function public.report_recipients(p_limit int default 500)
returns table (user_id uuid, email text) language sql stable security definer set search_path = '' as $$
  select p.user_id, u.email
  from public.report_prefs p
  join auth.users u on u.id = p.user_id
  where p.weekly_email
    and u.email is not null
    and public.is_pro_user(p.user_id)
    and (p.last_sent_at is null or p.last_sent_at < now() - interval '6 days')
  order by p.last_sent_at nulls first
  limit least(greatest(p_limit, 1), 1000)
$$;
revoke execute on function public.report_recipients(int) from public, anon, authenticated;
grant execute on function public.report_recipients(int) to service_role;

create or replace function public.mark_report_sent(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.report_prefs set last_sent_at = now() where user_id = p_user
$$;
revoke execute on function public.mark_report_sent(uuid) from public, anon, authenticated;
grant execute on function public.mark_report_sent(uuid) to service_role;
