-- ===========================================================================
-- GroomOS — verify a signup created its tenant correctly.
-- Run this AFTER signing up in the app. Change the email on query (A).
-- Run in: Supabase Dashboard -> SQL Editor.
-- ===========================================================================

-- (A) The one-shot integrity check — the important one.
--     Expect exactly ONE row, with:
--       profile_matches_auth = true   (users.id == the auth user's id)
--       business_link_ok     = true   (users.business_id points at a real business)
--       profile_id           = not null
--       business_name        = the name you typed at signup
select
  au.email,
  au.id                   as auth_user_id,
  pu.id                   as profile_id,
  pu.business_id,
  b.name                  as business_name,
  (pu.id = au.id)         as profile_matches_auth,
  (pu.business_id = b.id) as business_link_ok
from auth.users au
left join public.users      pu on pu.id = au.id
left join public.businesses b  on b.id  = pu.business_id
where au.email = 'YOUR-TEST-EMAIL@example.com';   -- <-- change this

-- (B) Eyeball the latest rows in each table.
select id, name, created_at         from public.businesses order by created_at desc limit 5;
select id, email, business_id, role from public.users      order by created_at desc limit 5;
select business_id, deposit_amount, cancellation_notice_hours
  from public.settings order by updated_at desc limit 5;
