-- ===========================================================================
-- GroomOS — Founder Pipeline Tracker (internal, founder-only sales CRM)
-- ---------------------------------------------------------------------------
-- Two tables backing /pipeline: `prospects` (Instagram outreach leads) and
-- `outreach_daily` (per-day funnel counters). The page itself is gated to the
-- founder in the app (FOUNDER_EMAIL). As defence-in-depth, RLS scopes every row
-- to its owner (auth.uid()), so no other authenticated user can read or write
-- these rows even via the API. owner_id defaults to the signed-in user, so the
-- app never has to set it.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

-- 1) prospects ---------------------------------------------------------------
create table if not exists public.prospects (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  handle            text not null,
  name              text,
  area              text not null default 'Gtr Manchester',
  stage             text not null default 'Warm',
  signal            text,
  next_action       text,
  next_action_date  date,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists prospects_owner_idx on public.prospects (owner_id);
create index if not exists prospects_owner_next_action_idx
  on public.prospects (owner_id, next_action_date);

-- keep updated_at fresh. Define the trigger fn here too — create-or-replace is
-- idempotent, so this migration is self-contained and doesn't depend on 0001
-- having created it.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_prospects_updated_at on public.prospects;
create trigger trg_prospects_updated_at
  before update on public.prospects
  for each row execute function public.set_updated_at();

-- 2) outreach_daily ----------------------------------------------------------
create table if not exists public.outreach_daily (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day               date not null,
  openers           integer not null default 0,
  replies           integer not null default 0,
  calls_booked      integer not null default 0,
  trials_started    integer not null default 0,
  paid_conversions  integer not null default 0
);

-- one row per day, per owner (the app upserts on this)
create unique index if not exists outreach_daily_owner_day_idx
  on public.outreach_daily (owner_id, day);

-- 3) Row-level security ------------------------------------------------------
alter table public.prospects      enable row level security;
alter table public.outreach_daily enable row level security;

drop policy if exists prospects_rw on public.prospects;
create policy prospects_rw on public.prospects for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists outreach_daily_rw on public.outreach_daily;
create policy outreach_daily_rw on public.outreach_daily for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
