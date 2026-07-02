-- ===========================================================================
-- GroomOS — Stage 2 diagnostics: groomos_health()
-- ---------------------------------------------------------------------------
-- A tiny read-only function that reports whether the schema + signup trigger
-- are installed. Powers the /debug page and /api/health so a misconfigured
-- setup is obvious. Returns only booleans about what exists — no data.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run. (You can DROP it before public launch.)
-- ===========================================================================

create or replace function public.groomos_health()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'businesses',        to_regclass('public.businesses')   is not null,
    'users',             to_regclass('public.users')        is not null,
    'clients',           to_regclass('public.clients')      is not null,
    'pets',              to_regclass('public.pets')         is not null,
    'services',          to_regclass('public.services')     is not null,
    'appointments',      to_regclass('public.appointments') is not null,
    'settings',          to_regclass('public.settings')     is not null,
    'handle_new_user_fn', exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'handle_new_user'
    ),
    'signup_trigger', exists (
      select 1
      from pg_trigger
      where tgname = 'on_auth_user_created' and not tgisinternal
    )
  );
$$;

grant execute on function public.groomos_health() to anon, authenticated, service_role;
