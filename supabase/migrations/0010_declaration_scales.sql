-- ===========================================================================
-- GroomOS — Matting meter + temperament declaration scales
-- ---------------------------------------------------------------------------
-- Replaces the yes/no matting + aggression checkboxes with proper visual scales
-- the client taps at booking. Each scale is groomer-configurable: on/off, a
-- title, and which levels are "accepted" for online booking. A booking stores
-- the exact level selected as part of its proof snapshot. (Dollar-quoted JSON
-- defaults so apostrophes don't need escaping.)
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

-- Per-business scale config on the settings row.
-- Shape: { enabled, title, levels: [{ id, label, description, accepted }] }
alter table public.settings
  add column if not exists matting_scale jsonb not null default
    $json${"enabled":true,"title":"How is your dog's coat right now?","levels":[{"id":"smooth","label":"Smooth & brushed","description":"Clean and brushed through — no knots","accepted":true},{"id":"tangles","label":"A few tangles","description":"The odd knot, but it brushes out","accepted":true},{"id":"matted_places","label":"Matted in places","description":"Some areas are matted and won't brush out","accepted":true},{"id":"pelted","label":"Heavily matted / pelted","description":"Large matted areas, close to the skin","accepted":true}]}$json$::jsonb,
  add column if not exists temperament_scale jsonb not null default
    $json${"enabled":true,"title":"How does your dog find grooming?","levels":[{"id":"calm","label":"Calm & used to grooming","description":"Happy to be handled, takes it in stride","accepted":true},{"id":"nervous","label":"A bit nervous","description":"Unsettled, but manageable with patience","accepted":true},{"id":"struggles","label":"Struggles / needs patience","description":"Finds grooming hard, may need breaks","accepted":true},{"id":"unsafe","label":"Has bitten or can't be safely handled","description":"May need a muzzle or vet support","accepted":true}]}$json$::jsonb;

-- Per-booking snapshot: the exact level the client selected (label, frozen).
alter table public.appointments
  add column if not exists matting_level     text,
  add column if not exists temperament_level text;

-- The old yes/no matting + aggression declarations are replaced by the scales
-- above, so remove them (clients shouldn't see both). New rows default to just
-- the optional health declaration; existing rows have coat + aggression stripped.
-- Custom declarations (any other id) are left untouched. Idempotent.
alter table public.settings alter column declarations set default
  $json$[{"id":"health","label":"My dog has no known health conditions that affect grooming","enabled":false}]$json$::jsonb;

update public.settings
set declarations = coalesce(
  (select jsonb_agg(d)
     from jsonb_array_elements(declarations) d
    where d->>'id' not in ('coat','aggression')),
  '[]'::jsonb
)
where declarations @> '[{"id":"coat"}]'::jsonb
   or declarations @> '[{"id":"aggression"}]'::jsonb;

-- Quick self-check (optional):
-- select matting_scale->'levels', temperament_scale->'enabled' from public.settings limit 5;
