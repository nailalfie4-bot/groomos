-- ===========================================================================
-- GroomOS — Durable invite tokens (survive messaging-app link crawlers)
-- ---------------------------------------------------------------------------
-- The old invite links pointed at /auth/callback, which called verifyOtp() on
-- the GET — so the SINGLE-USE Supabase magic-link token was spent the moment
-- ANY GET hit the URL. Pasting the link into WhatsApp / Instagram / iMessage
-- triggers their link-preview crawlers to fetch it, which quietly consumed the
-- token before the human ever clicked. The customer then saw "invalid or has
-- expired" on their first real open.
--
-- The fix moves invites onto OUR OWN token, stored here and controlled by us:
--   • It is NOT consumed by a GET — landing on /welcome only READS it.
--   • It stays valid until the password is actually set (status -> 'accepted').
--   • Re-sending an invite REUSES the same token, so regenerating never burns a
--     link the customer already has.
--
-- This migration is ADDITIVE ONLY: one nullable column + a unique index on the
-- existing onboarding_invites table. No existing row/column is altered.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

alter table public.onboarding_invites
  -- A long, unguessable, URL-safe token (base64url of 32 random bytes). Only the
  -- service-role server reads it; RLS keeps it invisible to every normal client.
  add column if not exists invite_token text;

-- Fast lookup by token on the claim/verify path, and a guarantee it's unique.
create unique index if not exists onboarding_invites_invite_token_key
  on public.onboarding_invites (invite_token)
  where invite_token is not null;

-- Quick self-check (optional):
-- select email, status, (invite_token is not null) as has_token, expires_at
--   from public.onboarding_invites order by sent_at desc;
