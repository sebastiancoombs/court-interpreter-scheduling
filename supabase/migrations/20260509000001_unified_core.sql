-- Unified core schema — Supabase as the backing layer for the three subsystems:
--   bcgov FastAPI  (api/)            — Postgres source of truth for ADM, audit reports, interpreters
--   Easy!Appointments (easyappointments/) — MySQL source of truth for bookings, providers, customers
--   Metabase (easyappointments/docker)    — reads from this schema for the §5 analytics layer
--
-- This file establishes the unified projections that EA + bcgov sync TO. Both
-- subsystems remain authoritative for their own writes; we replicate into here
-- so Metabase has one place to query and Supabase Auth/RLS/Storage/Realtime
-- can govern the unified surface.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create schema if not exists app;

----------------------------------------------------------------------
-- Identity
----------------------------------------------------------------------

create type app.role_kind as enum (
  'super_admin',
  'court_coordinator',
  'court_staff',
  'interpreter'
);

create type app.subsystem as enum ('bcgov', 'easyappointments', 'metabase');

create table app.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null,
  email          text not null,
  phone          text,
  default_court_id text,                  -- maps to bcgov locations.location_code / EA service.location
  active         boolean not null default true,
  -- Cross-subsystem identity links
  bcgov_user_id  text,                    -- bcgov api/users.user_id
  ea_user_id     bigint,                  -- easyappointments users.id
  ea_role_slug   text,                    -- 'admin' | 'provider' | 'secretary' | 'customer'
  metabase_user_id integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index profiles_bcgov_idx on app.profiles(bcgov_user_id) where bcgov_user_id is not null;
create unique index profiles_ea_idx    on app.profiles(ea_user_id)    where ea_user_id is not null;

create table app.roles (
  user_id    uuid not null references app.profiles(user_id) on delete cascade,
  role       app.role_kind not null,
  court_id   text,                                            -- null = system-wide
  granted_at timestamptz not null default now(),
  primary key (user_id, role, court_id)
);

----------------------------------------------------------------------
-- Bookings mirror — read-side projection populated by integration/ea-sync
-- Authoritative source remains EA's MySQL; we mirror for Metabase + RLS.
----------------------------------------------------------------------

create type app.booking_status as enum (
  'requested',
  'assigned',
  'accepted',
  'declined',
  'completed',
  'cancelled'
);

create table app.bookings_mirror (
  id                bigint primary key,                       -- EA appointment id
  source            app.subsystem not null default 'easyappointments',
  court_id          text,
  language          text,
  required_level    text,
  interpreter_id    bigint,
  customer_id       bigint,
  status            app.booking_status not null default 'requested',
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  case_number       text,
  case_name         text,
  courtroom         text,
  notes             text,
  created_at        timestamptz not null,
  updated_at        timestamptz not null,
  synced_at         timestamptz not null default now()
);
create index on app.bookings_mirror(starts_at);
create index on app.bookings_mirror(status);
create index on app.bookings_mirror(court_id, starts_at);
create index on app.bookings_mirror(interpreter_id, starts_at);

----------------------------------------------------------------------
-- Documents — cert uploads + ADM forms in Supabase Storage
----------------------------------------------------------------------

create table app.documents (
  id              bigint generated always as identity primary key,
  bucket          text not null,                    -- 'interpreter-certifications' | 'adm-forms'
  object_path     text not null,                    -- Supabase Storage object key
  owner_user_id   uuid references app.profiles(user_id) on delete set null,
  source_subsystem app.subsystem,
  source_record_id text,
  kind            text,                             -- 'cert' | 'background_check' | 'insurance' | 'adm322' ...
  expires_on      date,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);
create index on app.documents(owner_user_id);
create index on app.documents(expires_on) where expires_on is not null;

----------------------------------------------------------------------
-- Unified audit log — every mutation across all three subsystems
-- bcgov writes via SQLAlchemy event hook, EA writes via a MySQL → forwarder,
-- Metabase mutations land here via Metabase's audit log → forwarder.
----------------------------------------------------------------------

create table app.audit_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  source      app.subsystem not null,
  actor_id    uuid,
  actor_role  text,
  action      text not null,                                -- INSERT | UPDATE | DELETE | LOGIN | EXPORT ...
  table_name  text,
  row_id      text,
  before      jsonb,
  after       jsonb,
  ip_address  inet,
  user_agent  text,
  request_id  text
);
create index on app.audit_log(occurred_at desc);
create index on app.audit_log(source, occurred_at desc);
create index on app.audit_log(actor_id, occurred_at desc);

-- Auto-write trigger for any mutation on app.* tables (bcgov + EA forwarders also write here directly)
create or replace function app.audit_trigger()
returns trigger language plpgsql security definer as $$
begin
  insert into app.audit_log(source, actor_id, action, table_name, row_id, before, after)
  values (
    'bcgov'::app.subsystem,
    auth.uid(),
    tg_op,
    tg_table_schema || '.' || tg_table_name,
    coalesce(new.id::text, old.id::text),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  for t in select unnest(array['profiles','roles','bookings_mirror','documents']) loop
    execute format(
      'create trigger %I_audit after insert or update or delete on app.%I for each row execute function app.audit_trigger();',
      t || '_audit', t
    );
  end loop;
end $$;
