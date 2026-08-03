-- ===========================================================================
-- GroomOS — Opt-in auto-confirm for online bookings
-- ---------------------------------------------------------------------------
-- Online bookings are created as 'pending' and the groomer confirms each one
-- (the default, unchanged). This adds a per-business opt-in: when switched on,
-- an online booking is created 'confirmed' instead. Manual confirming stays the
-- default — every existing business keeps confirming by hand until they turn
-- this on.
--
-- WHAT THIS TOUCHES: only the existing `settings` table, and only with ONE new
-- column defaulting to false (= today's behaviour). No data is migrated, and
-- pricing / Stripe / auth are untouched.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this
-- -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

alter table public.settings
  add column if not exists auto_confirm_bookings boolean not null default false;

-- Quick self-check (optional):
-- select business_id, auto_confirm_bookings from public.settings;
