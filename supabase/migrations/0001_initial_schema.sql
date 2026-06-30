-- ===========================================================================
-- GroomOS — Stage 1: initial database schema
-- ---------------------------------------------------------------------------
-- Multi-tenant foundation for: businesses, users, clients, pets, services,
-- appointments, settings. Column shapes mirror the domain types in
-- lib/types.ts (camelCase there -> snake_case here; mapped in a later stage).
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste ALL of
-- this -> Run. Expect "Success. No rows returned". Safe to re-run (idempotent).
-- ===========================================================================

-- 1) Extensions -------------------------------------------------------------
create extension if not exists pgcrypto;   -- provides gen_random_uuid()

-- 2) Enums (match the string unions in lib/types.ts) ------------------------
do $$ begin
  create type dog_size as enum ('small','medium','large','giant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coat_condition as enum ('smooth','tangled','matted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum
    ('pending','confirmed','completed','no-show','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_source as enum ('staff','online');
exception when duplicate_object then null; end $$;

-- 3) Tables -----------------------------------------------------------------

-- One grooming business = one tenant.
create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  open_hour     int  not null default 9,
  close_hour    int  not null default 17,
  stations      int  not null default 1,
  address_line  text,
  city          text,
  postcode      text,
  phone         text,
  created_at    timestamptz not null default now()
);

-- App users / profiles. id mirrors Supabase's built-in auth.users.id, so a
-- login in a later stage maps 1:1 to a row here. business_id is the tenant.
create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  email        text,
  full_name    text,
  role         text not null default 'owner',   -- 'owner' | 'staff'
  created_at   timestamptz not null default now()
);

create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  first_name   text not null,
  last_name    text not null default '',
  email        text,
  phone        text,
  created_at   timestamptz not null default now()
);

create table if not exists public.pets (
  id             uuid primary key default gen_random_uuid(),
  -- business_id is denormalised onto pets (derivable via client) purely to
  -- keep tenant security rules below simple and fast.
  business_id    uuid not null references public.businesses(id) on delete cascade,
  client_id      uuid not null references public.clients(id) on delete cascade,
  name           text not null,
  breed          text not null default '',
  size           dog_size not null default 'medium',
  coat_type      text,
  temperament    text,
  notes          text not null default '',
  date_of_birth  date,
  created_at     timestamptz not null default now()
);

create table if not exists public.services (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  name          text not null,
  description   text not null default '',
  duration_min  int  not null default 60,
  price_gbp     numeric(10,2) not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete cascade,
  pet_id           uuid not null references public.pets(id) on delete cascade,
  -- keep the appointment even if the service is later deleted (price/duration
  -- are snapshotted onto the row at booking time).
  service_id       uuid references public.services(id) on delete set null,
  start_at         timestamptz not null,
  status           appointment_status not null default 'pending',
  source           appointment_source not null default 'staff',
  notes            text not null default '',
  price_gbp        numeric(10,2) not null default 0,
  coat_condition   coat_condition not null default 'smooth',
  duration_min     int not null default 60,
  deposit          numeric(10,2),
  reminder_sent_at timestamptz,
  -- before/after card: { summary, beforePhoto, afterPhoto, createdAt }
  report           jsonb,
  created_at       timestamptz not null default now()
);

-- Exactly one settings row per business (defaults match DEFAULT_SETTINGS
-- in lib/pricing.ts).
create table if not exists public.settings (
  business_id               uuid primary key references public.businesses(id) on delete cascade,
  buffer_min                int not null default 15,
  tangled_fee               numeric(10,2) not null default 10,
  tangled_extra_min         int not null default 30,
  matted_fee                numeric(10,2) not null default 20,
  matted_extra_min          int not null default 60,
  giant_fee                 numeric(10,2) not null default 15,
  giant_extra_min           int not null default 15,
  reminders_enabled         boolean not null default true,
  default_rebook_weeks      int not null default 6,
  deposit_enabled           boolean not null default true,
  deposit_amount            numeric(10,2) not null default 10,
  cancellation_notice_hours int not null default 48,
  updated_at                timestamptz not null default now()
);

-- 4) Indexes (tenant scoping + common lookups) ------------------------------
create index if not exists idx_users_business       on public.users(business_id);
create index if not exists idx_clients_business      on public.clients(business_id);
create index if not exists idx_pets_business         on public.pets(business_id);
create index if not exists idx_pets_client           on public.pets(client_id);
create index if not exists idx_services_business     on public.services(business_id);
create index if not exists idx_appointments_business on public.appointments(business_id);
create index if not exists idx_appointments_client   on public.appointments(client_id);
create index if not exists idx_appointments_pet      on public.appointments(pet_id);
create index if not exists idx_appointments_start    on public.appointments(business_id, start_at);

-- 5) Keep settings.updated_at fresh -----------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- 6) Row Level Security (the "lock" that keeps each business's data private) -
-- Helper: the business_id of the currently logged-in user. SECURITY DEFINER
-- lets it read public.users without tripping that table's own RLS.
create or replace function public.current_business_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select business_id from public.users where id = auth.uid();
$$;

alter table public.businesses   enable row level security;
alter table public.users        enable row level security;
alter table public.clients      enable row level security;
alter table public.pets         enable row level security;
alter table public.services     enable row level security;
alter table public.appointments enable row level security;
alter table public.settings     enable row level security;

-- businesses: see/edit only your own; any signed-in user may create one
-- (onboarding) and gets linked to it in a later stage.
drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses for select to authenticated
  using (id = public.current_business_id());
drop policy if exists businesses_insert on public.businesses;
create policy businesses_insert on public.businesses for insert to authenticated
  with check (true);
drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses for update to authenticated
  using (id = public.current_business_id()) with check (id = public.current_business_id());
drop policy if exists businesses_delete on public.businesses;
create policy businesses_delete on public.businesses for delete to authenticated
  using (id = public.current_business_id());

-- users: see yourself and teammates; manage only your own row.
drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated
  using (id = auth.uid() or business_id = public.current_business_id());
drop policy if exists users_insert on public.users;
create policy users_insert on public.users for insert to authenticated
  with check (id = auth.uid());
drop policy if exists users_update on public.users;
create policy users_update on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- tenant data: everything scoped to your business.
drop policy if exists clients_rw on public.clients;
create policy clients_rw on public.clients for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

drop policy if exists pets_rw on public.pets;
create policy pets_rw on public.pets for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

drop policy if exists services_rw on public.services;
create policy services_rw on public.services for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

drop policy if exists appointments_rw on public.appointments;
create policy appointments_rw on public.appointments for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

drop policy if exists settings_rw on public.settings;
create policy settings_rw on public.settings for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- Done. Tables are created empty and locked to their owners. The public
-- self-booking path (anonymous inserts) is intentionally NOT opened here —
-- that's handled deliberately in a later stage.
