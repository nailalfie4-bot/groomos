-- ===========================================================================
-- GroomOS — Stripe subscription billing: subscription state on each business
-- ---------------------------------------------------------------------------
-- The Stripe webhook (service-role) writes these; the business owner reads
-- them via existing RLS (they can already SELECT their own business row). No
-- new policies are needed.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

alter table public.businesses
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan                   text,   -- 'starter' | 'pro' | 'team'
  add column if not exists subscription_status    text,   -- 'active' | 'past_due' | 'canceled' | …
  add column if not exists current_period_end     timestamptz;

-- Webhooks look a business up by these ids, so index them.
create index if not exists idx_businesses_stripe_customer
  on public.businesses (stripe_customer_id);
create index if not exists idx_businesses_stripe_subscription
  on public.businesses (stripe_subscription_id);

-- Quick self-check (optional):
-- select name, plan, subscription_status from public.businesses order by created_at;
