-- ===========================================================================
-- GroomOS — Client declarations + Terms & Conditions acceptance
-- ---------------------------------------------------------------------------
-- Groomers configure a short list of yes/no client declarations (e.g. "coat is
-- not matted") and paste their own T&Cs. On the booking page the client must
-- tick every enabled declaration and, if T&Cs exist, agree + type their name as
-- an e-signature before they can confirm. Each booking stores an immutable
-- snapshot of exactly what was shown + agreed — the groomer's proof record.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

-- ── Per-business config (on the settings row) ──────────────────────────────
-- declarations: [{ "id": "...", "label": "...", "enabled": true }]. Ships with
-- sensible defaults (coat + aggression on, health off) so it's active out of
-- the box; a groomer can edit the wording, toggle, add/remove, or clear it.
alter table public.settings
  add column if not exists declarations jsonb not null default
    '[{"id":"coat","label":"My dog''s coat is not matted or pelted","enabled":true},{"id":"aggression","label":"My dog has no history of aggression towards groomers, staff, or other dogs","enabled":true},{"id":"health","label":"My dog has no known health conditions that affect grooming","enabled":false}]'::jsonb,
  add column if not exists terms_text text not null default '';

-- ── Per-booking proof snapshot (on the appointment) ────────────────────────
-- declarations: ["<label agreed>", ...] frozen at booking time.
-- terms_text: the exact T&Cs text the client was shown.
-- terms_signed_name / terms_accepted_at: the typed e-signature + when.
alter table public.appointments
  add column if not exists declarations        jsonb,
  add column if not exists terms_text          text,
  add column if not exists terms_signed_name   text,
  add column if not exists terms_accepted_at   timestamptz;

-- Quick self-check (optional):
-- select declarations, terms_text from public.settings limit 5;
