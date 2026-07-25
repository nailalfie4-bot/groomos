-- ===========================================================================
-- GroomOS — Public dog-groomer directory (isolated from customer data)
-- ---------------------------------------------------------------------------
-- A separate set of tables powering the public directory on groomos.co.uk
-- (/dog-groomers-in-{town}, /groomers/{slug}, /grooming-schools/{slug}, /blog).
--
-- ISOLATION: every table is prefixed `dir_` and is DECOUPLED from the product's
-- customer tables (businesses, clients, pets, appointments, groomers…). No
-- foreign key points INTO a customer table, and RLS is enabled with NO public
-- policies — so the anon/authenticated roles cannot read or write any of it.
-- All access happens server-side through the service-role admin client in
-- founder-gated routes. Nothing here can expose or interfere with customer data.
--
-- GDPR: an UNVERIFIED listing holds ONLY public business info (name, town,
-- website or social link). No phone/address/email/personal data is stored for
-- it — that only arrives once a groomer claims the listing and consents.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this
-- -> Run. Safe to re-run (idempotent). Expect "Success. No rows returned".
-- ===========================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- Shared updated_at helper (also defined in 0015; safe to redefine).
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Towns ──────────────────────────────────────────────────────────────────
create table if not exists public.dir_towns (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  county          text,
  nearby_town_ids uuid[] not null default '{}',
  intro_copy      text,
  groomer_count   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Groomer listings ────────────────────────────────────────────────────────
-- groomos_business_id references a businesses.id but is intentionally NOT a
-- foreign key, keeping the directory fully decoupled from customer tables.
create table if not exists public.dir_groomers (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  town_id             uuid references public.dir_towns(id) on delete set null,
  website_url         text,
  social_url          text,
  photos              jsonb not null default '[]'::jsonb,
  services            jsonb not null default '[]'::jsonb,
  prices              jsonb not null default '[]'::jsonb,
  opening_hours       jsonb,
  review_score        numeric(2,1),
  review_count        integer not null default 0,
  groomos_user        boolean not null default false,
  groomos_business_id uuid,                 -- link to businesses.id (no FK: decoupled)
  groomos_booking_url text,                 -- resolved /book/{slug} URL
  verified            boolean not null default false,
  listing_status      text not null default 'live'
                        check (listing_status in ('live','hidden','removal_requested','removed')),
  source              text not null default 'manual',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_dir_groomers_town   on public.dir_groomers(town_id);
create index if not exists idx_dir_groomers_status on public.dir_groomers(listing_status);

-- ── Schools ──────────────────────────────────────────────────────────────────
create table if not exists public.dir_schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  courses     jsonb not null default '[]'::jsonb,
  website     text,
  town_id     uuid references public.dir_towns(id) on delete set null,
  partner     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Blog posts ───────────────────────────────────────────────────────────────
create table if not exists public.dir_blog_posts (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  slug             text not null unique,
  excerpt          text,
  body             text,
  hero_image       text,
  published_at     timestamptz,             -- null = draft
  meta_title       text,
  meta_description text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Claim requests (groomer claims their listing) ───────────────────────────
create table if not exists public.dir_claim_requests (
  id                    uuid primary key default gen_random_uuid(),
  groomer_id            uuid references public.dir_groomers(id) on delete cascade,
  name                  text not null,
  email                 text not null,
  phone                 text,
  business_verification text,
  status                text not null default 'pending'
                          check (status in ('pending','approved','rejected')),
  created_at            timestamptz not null default now()
);
create index if not exists idx_dir_claim_status on public.dir_claim_requests(status);

-- ── Removal requests ("this isn't my business / request removal") ───────────
create table if not exists public.dir_removal_requests (
  id              uuid primary key default gen_random_uuid(),
  groomer_id      uuid references public.dir_groomers(id) on delete cascade,
  reason          text,
  requester_email text,
  status          text not null default 'open'
                    check (status in ('open','actioned','dismissed')),
  created_at      timestamptz not null default now()
);
create index if not exists idx_dir_removal_status on public.dir_removal_requests(status);

-- ── Slug redirects (301 when an admin changes a slug) ───────────────────────
create table if not exists public.dir_redirects (
  id         uuid primary key default gen_random_uuid(),
  from_path  text not null unique,
  to_path    text not null,
  created_at timestamptz not null default now()
);

-- updated_at triggers on the tables that carry updated_at.
do $$
declare t text;
begin
  foreach t in array array['dir_towns','dir_groomers','dir_schools','dir_blog_posts'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ── Lock it all down: RLS ON, and NO policies, so only the service-role (our
--    founder-gated server code) can touch these tables. anon/authenticated get
--    nothing. This is the isolation guarantee. ────────────────────────────────
alter table public.dir_towns            enable row level security;
alter table public.dir_groomers         enable row level security;
alter table public.dir_schools          enable row level security;
alter table public.dir_blog_posts       enable row level security;
alter table public.dir_claim_requests   enable row level security;
alter table public.dir_removal_requests enable row level security;
alter table public.dir_redirects        enable row level security;

-- Quick self-check (optional):
-- select table_name from information_schema.tables
--   where table_schema='public' and table_name like 'dir_%' order by table_name;
