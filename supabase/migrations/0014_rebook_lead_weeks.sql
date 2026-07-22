-- ===========================================================================
-- GroomOS — Rebooking reminder lead time
-- ---------------------------------------------------------------------------
-- rebook_lead_weeks: how many weeks BEFORE a dog is due the groomer wants to be
-- nudged to rebook them. Groomers are often booked up weeks ahead, so a nudge
-- ON the due date is too late. A dog now appears in "Due for a groom" this many
-- weeks before its own (per-pet) due date. Default 4 weeks.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

alter table public.settings
  add column if not exists rebook_lead_weeks integer not null default 4;
