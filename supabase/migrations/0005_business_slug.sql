-- ===========================================================================
-- GroomOS — Stage 4(a): per-business slug for the public booking page
-- ---------------------------------------------------------------------------
-- Adds businesses.slug (unique, URL-safe), auto-generated from the business
-- name at signup and editable later in Settings. The public booking page lives
-- at /book/<slug> and is served by a server route using the service-role key,
-- so NO anonymous RLS is opened here.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

-- 1) Column ------------------------------------------------------------------
alter table public.businesses
  add column if not exists slug text;

-- 2) Slugify: "Paws & Co." -> "paws-co" -------------------------------------
create or replace function public.slugify(txt text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(txt, '')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- 3) Pick a free slug, suffixing -2, -3, … on collision ----------------------
create or replace function public.unique_business_slug(base text, exclude_id uuid default null)
returns text
language plpgsql
stable
as $$
declare
  root text := nullif(base, '');
  candidate text;
  n int := 1;
begin
  if root is null then root := 'salon'; end if;
  candidate := root;
  while exists (
    select 1 from public.businesses
    where slug = candidate and (exclude_id is null or id <> exclude_id)
  ) loop
    n := n + 1;
    candidate := root || '-' || n;
  end loop;
  return candidate;
end $$;

-- 4) Backfill existing businesses (row by row so each sees the last) ---------
do $$
declare r record;
begin
  for r in select id, name from public.businesses where slug is null or slug = '' loop
    update public.businesses
      set slug = public.unique_business_slug(public.slugify(r.name), r.id)
      where id = r.id;
  end loop;
end $$;

-- 5) Enforce uniqueness ------------------------------------------------------
create unique index if not exists businesses_slug_key on public.businesses (slug);

-- 6) Set the slug on signup (extends the trigger from migration 0002) --------
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
  new_slug text := public.unique_business_slug(public.slugify(biz_name), null);
begin
  -- 1) the tenant
  insert into public.businesses (name, slug)
  values (biz_name, new_slug)
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

-- Trigger itself is unchanged (still on_auth_user_created from 0002); replacing
-- the function above is enough.

-- Quick self-check (optional):
-- select name, slug from public.businesses order by created_at;
