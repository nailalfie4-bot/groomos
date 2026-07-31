-- ===========================================================================
-- GroomOS — Time off / holiday blocking + regular closed days
-- ---------------------------------------------------------------------------
-- Lets a groomer mark when they're unavailable so the PUBLIC booking page won't
-- offer or accept those slots:
--   1. time_off  — a NEW table: one row per block (holiday, day off, training),
--      optionally scoped to a single groomer (else the whole business), timed or
--      all-day, with an optional label.
--   2. businesses.closed_weekdays — a NEW column: the weekdays the business is
--      always closed (0 = Sunday … 6 = Saturday). Empty = open every day.
--
-- Existing bookings that fall inside a block are NOT touched — this migration
-- only adds a table + a column. It does NOT alter appointments, pricing, Stripe
-- or auth in any way.
--
-- TABLES TOUCHED: businesses (one additive nullable-with-default column). ADDS:
-- table time_off. Nothing else is altered or dropped.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this
-- -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

-- 1) Regular weekly closed days on the business ------------------------------
alter table public.businesses
  add column if not exists closed_weekdays int[] not null default '{}'::int[];

-- 2) One-off / ranged time-off blocks ---------------------------------------
create table if not exists public.time_off (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  -- null = the whole business is off; otherwise just this groomer.
  groomer_id   uuid references public.groomers(id) on delete cascade,
  start_at     timestamptz not null,
  end_at       timestamptz not null,
  all_day      boolean not null default false,
  label        text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_time_off_business on public.time_off (business_id);
create index if not exists idx_time_off_business_start on public.time_off (business_id, start_at);

-- 3) Tenant isolation (same shape as appointments) ---------------------------
-- Staff manage their own business's blocks. The public booking path reads them
-- with the service-role client (bypasses RLS), so no anonymous policy is opened.
alter table public.time_off enable row level security;

drop policy if exists time_off_rw on public.time_off;
create policy time_off_rw on public.time_off for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- Quick self-check (optional):
-- select id, groomer_id, all_day, label, start_at, end_at from public.time_off order by start_at;
-- select name, closed_weekdays from public.businesses;
