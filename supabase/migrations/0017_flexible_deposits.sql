-- ===========================================================================
-- GroomOS — Flexible deposits: per-service deposit configuration
-- ---------------------------------------------------------------------------
-- Until now every business had a SINGLE deposit amount (settings.deposit_amount)
-- applied to every service and every booking. This lets each service carry its
-- own deposit: a fixed £ amount, a percentage of the service price, explicitly
-- no deposit, or (the default) "fall back to the business setting".
--
-- WHAT THIS TOUCHES: only the `services` table, and only with additive columns.
--   • Every existing service gets deposit_type = 'default' — i.e. it keeps
--     behaving EXACTLY as before (falls back to the business deposit amount).
--   • No settings row and no appointment row is read or changed.
--   • Per-booking overrides reuse the appointments.deposit column that ALREADY
--     exists (added in 0001), so there is no schema change there.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this
-- -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

alter table public.services
  -- 'default' → use the business deposit setting (unchanged existing behaviour)
  -- 'none'    → this service takes no deposit
  -- 'fixed'   → deposit_value is a flat £ amount
  -- 'percent' → deposit_value is a % of the service price
  add column if not exists deposit_type  text not null default 'default',
  add column if not exists deposit_value numeric(10,2);

-- Constrain the allowed values. Added in a guarded block so the whole script
-- stays idempotent (re-running won't error on the already-present constraint).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'services_deposit_type_check'
  ) then
    alter table public.services
      add constraint services_deposit_type_check
      check (deposit_type in ('default', 'none', 'fixed', 'percent'));
  end if;
end $$;

-- Quick self-check (optional):
-- select name, deposit_type, deposit_value from public.services order by created_at;
