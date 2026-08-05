-- ===========================================================================
-- GroomOS — Configurable advance-booking window
-- ---------------------------------------------------------------------------
-- The public booking page was capped to 14 days in the UI, with no setting.
-- Groomers rebook clients every 6–8 weeks, so that made the page unusable for
-- its main purpose. This adds a per-business "how far ahead clients can book"
-- window, in MONTHS.
--
-- DEFAULT 3 MONTHS FOR EVERYONE, including existing businesses: the column
-- default is 3, so every existing settings row immediately reads 3 — nobody is
-- left on 14 days.
--
-- WHAT THIS TOUCHES: only the existing `settings` table, and only with ONE new
-- column defaulting to 3. No data migration; pricing / Stripe / auth untouched.
-- Allowed values (1, 2, 3, 6, 12) are enforced in the app; the column just
-- stores the integer.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this
-- -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

alter table public.settings
  add column if not exists booking_window_months int not null default 3;

-- Quick self-check (optional):
-- select business_id, booking_window_months from public.settings;
