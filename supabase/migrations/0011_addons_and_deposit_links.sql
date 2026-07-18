-- ===========================================================================
-- GroomOS — Service add-ons + deposit payment links
-- ---------------------------------------------------------------------------
-- Add-ons: extra services (teeth clean, nail trim…) a client can add on top of
-- their main groom. Marked with is_addon so they stay a separate category.
-- Deposit links: a per-appointment secure token the groomer sends by text so a
-- phone-booked client can pay their deposit; the paid deposit lands in the
-- groomer's connected Stripe account.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

-- Add-ons are just services flagged as such.
alter table public.services
  add column if not exists is_addon boolean not null default false;

alter table public.appointments
  -- Snapshot of chosen add-ons: [{ "name": "...", "price": 8 }]
  add column if not exists addons                  jsonb,
  -- Deposit payment link (for phone bookings)
  add column if not exists deposit_link_token      text,
  add column if not exists deposit_link_expires_at timestamptz;

-- A deposit link token resolves to exactly one appointment.
create unique index if not exists appointments_deposit_link_token_idx
  on public.appointments (deposit_link_token)
  where deposit_link_token is not null;

-- Quick self-check (optional):
-- select name, is_addon, duration_min, price_gbp from public.services order by is_addon;
