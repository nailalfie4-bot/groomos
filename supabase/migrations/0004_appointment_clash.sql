-- ===========================================================================
-- GroomOS — Stage 3(c): server-side clash / buffer enforcement
-- ---------------------------------------------------------------------------
-- Guarantees, at the database, that one groomer can't be double-booked. Every
-- appointment reserves [start, start + duration + cleanup buffer). Two
-- non-cancelled appointments in the same business may never have overlapping
-- reserved windows — enforced atomically by an exclusion constraint, so it
-- holds even if two bookings race.
--
-- The buffer comes from each business's settings row, applied at write time by
-- a BEFORE trigger. Cancelled appointments don't block (they leave the
-- constraint's partial index).
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

-- GiST support for equality on scalar types (needed to mix business_id = and
-- range && in one exclusion constraint).
create extension if not exists btree_gist;

-- The reserved time window for each appointment (kept in sync by the trigger).
alter table public.appointments
  add column if not exists reserved tstzrange;

-- Compute reserved = [start, start + duration + buffer) using the business's
-- configured cleanup buffer (0 if no settings row somehow exists).
create or replace function public.set_appointment_reserved()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  buf int;
begin
  select coalesce(buffer_min, 0) into buf
    from public.settings
    where business_id = new.business_id;
  buf := coalesce(buf, 0);

  new.reserved := tstzrange(
    new.start_at,
    new.start_at + make_interval(mins => coalesce(new.duration_min, 0) + buf),
    '[)'
  );
  return new;
end $$;

drop trigger if exists trg_appointment_reserved on public.appointments;
create trigger trg_appointment_reserved
  before insert or update of start_at, duration_min, business_id, status
  on public.appointments
  for each row execute function public.set_appointment_reserved();

-- Backfill any existing rows so the constraint can be added cleanly.
update public.appointments a
set reserved = tstzrange(
  a.start_at,
  a.start_at + make_interval(
    mins => coalesce(a.duration_min, 0)
          + coalesce((select buffer_min from public.settings s where s.business_id = a.business_id), 0)
  ),
  '[)'
)
where a.reserved is null;

-- No two live (non-cancelled) appointments in a business may overlap.
alter table public.appointments
  drop constraint if exists appointments_no_overlap;
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    business_id with =,
    reserved with &&
  ) where (status <> 'cancelled');

-- Quick self-check (optional): should report the constraint + trigger present.
-- select conname from pg_constraint where conname = 'appointments_no_overlap';
-- select tgname  from pg_trigger    where tgname  = 'trg_appointment_reserved';
