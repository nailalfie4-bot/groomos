-- ===========================================================================
-- GroomOS — Stage 2: auto-provision a tenant on signup
-- ---------------------------------------------------------------------------
-- When a new user signs up (a row is inserted into auth.users), create:
--   1. a businesses row (named from the business_name they entered at signup),
--   2. a users row linked to that business (the owner),
--   3. a default settings row for the business.
-- All in one transaction, so a user always lands fully set up.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent).
-- ===========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  biz_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''),
    'My grooming business'
  );
begin
  -- 1) the tenant
  insert into public.businesses (name)
  values (biz_name)
  returning id into new_business_id;

  -- 2) the owner profile, linked to the tenant
  insert into public.users (id, business_id, email, full_name, role)
  values (
    new.id,
    new_business_id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    'owner'
  );

  -- 3) a default settings row (matches DEFAULT_SETTINGS in lib/pricing.ts)
  insert into public.settings (business_id)
  values (new_business_id);

  return new;
end;
$$;

-- Fire it after each new auth user is created.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
