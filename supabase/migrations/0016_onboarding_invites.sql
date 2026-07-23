-- ===========================================================================
-- GroomOS — Invite-based onboarding (founder-assisted account handover)
-- ---------------------------------------------------------------------------
-- One NEW table, `onboarding_invites`, tracking accounts the founder pre-builds
-- for groomers on a setup call. The account (business + settings + services) is
-- created up front; the groomer then claims it via a single-use, time-limited
-- invite link and sets THEIR OWN password (the founder never sees or sets it).
--
-- This migration is ADDITIVE ONLY. It creates one new table and references
-- public.businesses(id) and auth.users(id) via foreign keys — it does NOT alter,
-- drop or modify any existing table.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

create table if not exists public.onboarding_invites (
  id               uuid primary key default gen_random_uuid(),
  -- the founder who sent it; RLS scopes rows to them
  owner_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email            text not null,
  business_name    text not null,
  -- the business/account created for this invite (kept if the founder is deleted)
  business_id      uuid references public.businesses(id) on delete set null,
  -- the invited auth user (set once created), for marking acceptance
  invited_user_id  uuid,
  status           text not null default 'sent',   -- 'sent' | 'accepted'  ('expired' is derived on read)
  sent_at          timestamptz not null default now(),
  accepted_at      timestamptz,
  expires_at       timestamptz not null default (now() + interval '7 days')
);

create index if not exists onboarding_invites_owner_idx on public.onboarding_invites (owner_id);
create index if not exists onboarding_invites_email_idx on public.onboarding_invites (lower(email));

alter table public.onboarding_invites enable row level security;

-- Only the founder who created an invite can see/manage it. (The server also
-- uses the service-role client for the admin steps, which bypasses RLS.)
drop policy if exists onboarding_invites_rw on public.onboarding_invites;
create policy onboarding_invites_rw on public.onboarding_invites for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
