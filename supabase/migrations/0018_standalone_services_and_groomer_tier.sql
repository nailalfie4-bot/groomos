-- ===========================================================================
-- GroomOS — Standalone (bookable-alone) services + server-side groomer tier gate
-- ---------------------------------------------------------------------------
-- Two independent changes, both additive and safe to re-run (idempotent).
--
-- 1) services.bookable_alone  — lets an add-on / minor service (nail trim, teeth
--    clean, anal glands…) be booked on its own, not only as an extra. NULL means
--    "use the historical default": bookable alone iff it is NOT an add-on. So no
--    existing service changes behaviour, and there is NO backfill/UPDATE.
--
-- 2) A BEFORE INSERT trigger on `groomers` that enforces the multi-groomer tier
--    rule server-side (mirrors lib/trial.ts canUseGroomers): internal/owner and
--    Pro/Team may add groomers; a running free trial may (to showcase it); a
--    Starter subscriber (or an expired trial without Pro/Team) may NOT. It only
--    gates NEW inserts — existing groomers on any account are untouched.
--
-- WHAT THIS TOUCHES: adds one nullable column to `services`; adds a trigger to
-- `groomers`. No existing row in either table is read or modified.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this
-- -> Run. Safe to re-run. Expect "Success. No rows returned".
-- ===========================================================================

-- 1) Bookable-on-its-own flag (NULL = historical default).
alter table public.services
  add column if not exists bookable_alone boolean;

-- 2) Server-side groomer tier gate.
create or replace function public.enforce_groomer_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan   text;
  v_status text;
  v_trial  timestamptz;
begin
  select plan, subscription_status, trial_ends_at
    into v_plan, v_status, v_trial
    from public.businesses
    where id = new.business_id;

  -- Internal / owner accounts: always allowed.
  if v_plan in ('internal', 'owner') then
    return new;
  end if;

  -- An active paid subscription: only Pro/Team may add groomers.
  if v_plan is not null and v_status is not null
     and v_status in ('active', 'trialing', 'past_due') then
    if v_plan in ('pro', 'team') then
      return new;
    end if;
    raise exception 'Adding groomers requires the Pro or Team plan.'
      using errcode = 'check_violation';
  end if;

  -- No active subscription: allowed only while the free trial is still running
  -- (a NULL trial date is treated as not-expired, matching the app).
  if v_trial is null or v_trial > now() then
    return new;
  end if;

  raise exception 'Adding groomers requires the Pro or Team plan.'
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists trg_enforce_groomer_tier on public.groomers;
create trigger trg_enforce_groomer_tier
  before insert on public.groomers
  for each row execute function public.enforce_groomer_tier();

-- Quick self-checks (optional):
-- select name, is_addon, bookable_alone from public.services order by created_at;
-- select tgname from pg_trigger where tgrelid = 'public.groomers'::regclass;
