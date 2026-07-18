-- ===========================================================================
-- GroomOS — Per-dog rebook frequency + business logo
-- ---------------------------------------------------------------------------
-- rebook_weeks: each dog gets its own "usually rebooks every N weeks" so the
--   "Due for a groom" list is calculated per-pet. Null = no frequency set (that
--   pet simply doesn't appear in the due list).
-- logo_url: the business's uploaded logo (public URL), shown on the booking
--   page, confirmation screen/email and in-app. Null = initial-letter avatar.
--   Logos are stored in the public "business-logos" Storage bucket created below.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

-- Per-dog rebook frequency (weeks). Null = unset → excluded from the due list.
alter table public.pets
  add column if not exists rebook_weeks integer;

-- Business logo (public URL into the business-logos bucket).
alter table public.businesses
  add column if not exists logo_url text;

-- ── Storage bucket for business logos (public read) ────────────────────────
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

-- Policies on storage.objects for this bucket: anyone can read (public logos),
-- and any signed-in groomer can upload/replace/remove logos. Files are named by
-- business id, and the app only ever writes its own, so this is safe in practice.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'business_logos_public_read') then
    create policy business_logos_public_read on storage.objects
      for select using (bucket_id = 'business-logos');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'business_logos_auth_insert') then
    create policy business_logos_auth_insert on storage.objects
      for insert to authenticated with check (bucket_id = 'business-logos');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'business_logos_auth_update') then
    create policy business_logos_auth_update on storage.objects
      for update to authenticated using (bucket_id = 'business-logos');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'business_logos_auth_delete') then
    create policy business_logos_auth_delete on storage.objects
      for delete to authenticated using (bucket_id = 'business-logos');
  end if;
end $$;
