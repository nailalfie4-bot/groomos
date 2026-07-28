-- ===========================================================================
-- GroomOS — Founder customer-health dashboard (founder-only, read-only)
-- ---------------------------------------------------------------------------
-- Powers the founder's "Customers" view: one aggregated row per business so the
-- founder can see who's active, who's stuck, and whose trial is ending — WITHOUT
-- ever seeing a customer's password or their individual client records. Only
-- counts and account-level flags are returned.
--
-- WHAT THIS ADDS (additive only — no existing table is altered or dropped):
--   1. login_events  — a new table: one row per deliberate sign-in, so we can
--      show "total logins" and "first login" (last login comes from auth.users).
--   2. founder_customer_health() — a read-only SECURITY DEFINER function that
--      aggregates existing tables (businesses, users, clients, pets,
--      appointments, services, settings) + login_events + auth.users, returning
--      one row per business. It only READS; it never writes to any table.
--
-- SECURITY: the function is locked to the service_role (the server's admin
-- client) only — execute is REVOKED from anon + authenticated, so no
-- customer-facing account can call it, even if they knew its name. The founder
-- page/API also gate on FOUNDER_EMAIL in the app layer (defence in depth).
--
-- TABLES TOUCHED: none altered. Reads (never writes): businesses, users,
-- clients, pets, appointments, services, settings, auth.users. Adds: table
-- login_events, function founder_customer_health().
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

-- 1) Login events -----------------------------------------------------------
create table if not exists public.login_events (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references public.businesses(id) on delete cascade,
  user_id      uuid,
  created_at   timestamptz not null default now()
);
create index if not exists idx_login_events_business on public.login_events (business_id);

-- Only the service-role server writes/reads this (via the app's admin client).
-- RLS on with NO policies = no anon/authenticated access at all.
alter table public.login_events enable row level security;

-- 2) Aggregated, read-only customer health ----------------------------------
-- One row per business. SECURITY DEFINER so it can read auth.users (for last
-- sign-in) and cross-tenant counts; callable only by service_role (see grants).
create or replace function public.founder_customer_health()
returns table (
  business_id           uuid,
  business_name         text,
  owner_email           text,
  signup_at             timestamptz,
  plan                  text,
  subscription_status   text,
  trial_ends_at         timestamptz,
  last_sign_in_at       timestamptz,
  login_count           bigint,
  first_login_at        timestamptz,
  clients_count         bigint,
  pets_count            bigint,
  bookings_count        bigint,
  completed_count       bigint,
  online_bookings_count bigint,
  deposits_enabled      boolean,
  has_booking_page      boolean,
  priced_services_count bigint,
  first_client_at       timestamptz,
  first_booking_at      timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    b.id,
    b.name,
    (select u.email
       from public.users u
      where u.business_id = b.id
      order by (u.role = 'owner') desc, u.created_at asc
      limit 1),
    b.created_at,
    b.plan,
    b.subscription_status,
    b.trial_ends_at,
    (select max(au.last_sign_in_at)
       from public.users u
       join auth.users au on au.id = u.id
      where u.business_id = b.id),
    (select count(*) from public.login_events le where le.business_id = b.id),
    (select min(le.created_at) from public.login_events le where le.business_id = b.id),
    (select count(*) from public.clients c where c.business_id = b.id),
    (select count(*) from public.pets p where p.business_id = b.id),
    (select count(*) from public.appointments a where a.business_id = b.id),
    (select count(*) from public.appointments a where a.business_id = b.id and a.status = 'completed'),
    (select count(*) from public.appointments a where a.business_id = b.id and a.source = 'online'),
    coalesce((select s.deposit_enabled from public.settings s where s.business_id = b.id), false),
    (b.slug is not null and b.slug <> '' and exists (
       select 1 from public.services sv
        where sv.business_id = b.id and sv.active and sv.price_gbp > 0)),
    (select count(*) from public.services sv
       where sv.business_id = b.id and sv.active and sv.price_gbp > 0),
    (select min(c.created_at) from public.clients c where c.business_id = b.id),
    (select min(a.created_at) from public.appointments a where a.business_id = b.id)
  from public.businesses b
  order by b.created_at desc;
$$;

-- Lock it down: no customer role may execute it; only the server's service_role.
revoke all on function public.founder_customer_health() from public;
revoke all on function public.founder_customer_health() from anon;
revoke all on function public.founder_customer_health() from authenticated;
grant execute on function public.founder_customer_health() to service_role;

-- Quick self-check (optional):
-- select business_name, plan, clients_count, bookings_count, last_sign_in_at
--   from public.founder_customer_health();
