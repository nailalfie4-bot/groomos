-- ===========================================================================
-- GroomOS — Stripe Connect deposits: connected-account state + deposit outcome
-- ---------------------------------------------------------------------------
-- Lets each groomer connect their OWN Stripe account (Express) so client card
-- deposits are charged straight into the groomer's balance. The public booking
-- route (service-role) writes the deposit outcome onto each appointment; the
-- Stripe webhook + the groomer's settings screen keep charges_enabled fresh.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

-- The groomer's connected Stripe (Express) account.
alter table public.businesses
  add column if not exists stripe_connect_account_id      text,
  -- Mirror of the account's charges_enabled: true once onboarding is complete
  -- and the account can actually accept charges.
  add column if not exists stripe_connect_charges_enabled boolean not null default false;

-- Webhooks (account.updated) look a business up by its connected account id.
create index if not exists idx_businesses_stripe_connect
  on public.businesses (stripe_connect_account_id);

-- Deposit outcome on each appointment.
--   'none'     — no deposit taken
--   'recorded' — deposit agreed but not card-charged (groomer not connected)
--   'paid'     — deposit card-charged into the groomer's Stripe account
alter table public.appointments
  add column if not exists deposit_status             text,
  add column if not exists deposit_payment_intent_id  text;

-- A given deposit PaymentIntent can confirm at most one booking (replay-safe).
create unique index if not exists appointments_deposit_pi_idx
  on public.appointments (deposit_payment_intent_id)
  where deposit_payment_intent_id is not null;

-- Quick self-check (optional):
-- select name, stripe_connect_account_id, stripe_connect_charges_enabled
--   from public.businesses order by created_at;
