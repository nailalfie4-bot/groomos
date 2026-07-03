-- ===========================================================================
-- GroomOS — complete Supabase setup (migrations 0001 + 0002 + 0003, combined)
-- ---------------------------------------------------------------------------
-- Paste ALL of this into: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to run more than once (every step is idempotent — it won't duplicate or
-- wipe anything). The final line prints a health summary so you can confirm it.
--
-- After running this: turn OFF email confirmation for testing
--   (Authentication -> Providers -> Email -> "Confirm email" -> off -> Save),
-- then sign up in the app.
-- ===========================================================================


-- ###########################################################################
-- PART 1 — schema (tables, enums, indexes, row-level security)
-- ###########################################################################

create extension if not exists pgcrypto;   -- provides gen_random_uuid()

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

-- App users / profiles. id mirrors auth.users.id; business_id is the tenant.
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
  report           jsonb,
  created_at       timestamptz not null default now()
);

-- Exactly one settings row per business.
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

create index if not exists idx_users_business       on public.users(business_id);
create index if not exists idx_clients_business      on public.clients(business_id);
create index if not exists idx_pets_business         on public.pets(business_id);
create index if not exists idx_pets_client           on public.pets(client_id);
create index if not exists idx_services_business     on public.services(business_id);
create index if not exists idx_appointments_business on public.appointments(business_id);
create index if not exists idx_appointments_client   on public.appointments(client_id);
create index if not exists idx_appointments_pet      on public.appointments(pet_id);
create index if not exists idx_appointments_start    on public.appointments(business_id, start_at);

-- Keep settings.updated_at fresh.
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

-- Row Level Security: each business only sees its own data.
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

drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated
  using (id = auth.uid() or business_id = public.current_business_id());
drop policy if exists users_insert on public.users;
create policy users_insert on public.users for insert to authenticated
  with check (id = auth.uid());
drop policy if exists users_update on public.users;
create policy users_update on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

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


-- ###########################################################################
-- PART 2 — auto-provision a tenant on signup
-- On each new auth.users row, create a businesses row, a linked users (owner)
-- row, and a default settings row — all in one transaction.
-- ###########################################################################

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
  insert into public.businesses (name)
  values (biz_name)
  returning id into new_business_id;

  insert into public.users (id, business_id, email, full_name, role)
  values (
    new.id,
    new_business_id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    'owner'
  );

  insert into public.settings (business_id)
  values (new_business_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ###########################################################################
-- PART 3 — diagnostics function (powers /debug and /api/health)
-- ###########################################################################

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


-- ###########################################################################
-- DONE — this final line prints the summary. Every value should be `true`.
-- (Look for: businesses..settings = true, handle_new_user_fn = true,
--  signup_trigger = true.)
-- ###########################################################################
select public.groomos_health() as groomos_health;
