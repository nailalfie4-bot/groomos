-- ===========================================================================
-- GroomOS — Trial expiry + simple multi-groomer (staff assignment)
-- ---------------------------------------------------------------------------
-- trial_ends_at: 30-day free trial per business. New businesses get it
--   automatically; existing rows are backfilled to created_at + 30 days. After
--   it passes with no active subscription, the main app is gated (booking pages
--   keep working). Edit this value on a test business to extend/reset a trial.
-- groomers: a simple staff list per business (name + colour). Appointments can
--   be assigned to one; no separate logins/permissions yet.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

-- ── Trial expiry ───────────────────────────────────────────────────────────
alter table public.businesses
  add column if not exists trial_ends_at timestamptz default (now() + interval '30 days');

-- Backfill existing businesses from their signup date.
update public.businesses
  set trial_ends_at = created_at + interval '30 days'
  where trial_ends_at is null;

-- ── Groomers (staff assignment) ────────────────────────────────────────────
create table if not exists public.groomers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  colour      text not null default '#C9756B',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists groomers_business_id_idx on public.groomers (business_id);

alter table public.groomers enable row level security;

-- Tenant-scoped RLS: a user only sees/manages groomers in their own business
-- (mirrors clients/pets/services, using the current_business_id() helper).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'groomers' and policyname = 'groomers_rw') then
    create policy groomers_rw on public.groomers for all to authenticated
      using (business_id = public.current_business_id())
      with check (business_id = public.current_business_id());
  end if;
end $$;

-- Which groomer an appointment is assigned to (nullable → unassigned).
alter table public.appointments
  add column if not exists groomer_id uuid references public.groomers(id) on delete set null;

create index if not exists appointments_groomer_id_idx on public.appointments (groomer_id);
