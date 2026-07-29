-- ===========================================================================
-- GroomOS — Editable WhatsApp message templates
-- ---------------------------------------------------------------------------
-- Backs the one-tap "Send WhatsApp reminder" links: each business can set its
-- own wording for the appointment reminder, deposit request and rebooking nudge.
-- We only ever build a wa.me deep link the groomer taps send on — nothing is
-- sent automatically, and no unofficial WhatsApp library is involved.
--
-- WHAT THIS TOUCHES: only the existing `settings` table, and only with ONE new
-- nullable column. Every existing settings row keeps working unchanged — a null
-- here means "use the built-in default wording" (DEFAULT_WHATSAPP_TEMPLATES in
-- lib/whatsapp.ts). No data is migrated, altered or dropped.
--
-- Shape stored: { "reminder": "...", "deposit": "...", "rebook": "..." }
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this
-- -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

alter table public.settings
  add column if not exists whatsapp_templates jsonb;

-- Quick self-check (optional):
-- select business_id, whatsapp_templates from public.settings;
