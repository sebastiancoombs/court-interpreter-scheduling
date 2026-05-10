-- Auto-run by the postgres image on a fresh data volume.
-- Creates the Metabase app-metadata user and database so Metabase shares
-- the same Postgres instance as EA — one DB engine, three logical tenants
-- (`easyappointments` for EA, `metabase` for Metabase's own state, plus
-- the Supabase project hosting the unified `app.*` schema in production).
CREATE USER metabase WITH PASSWORD 'metabase';
CREATE DATABASE metabase OWNER metabase;
GRANT ALL PRIVILEGES ON DATABASE metabase TO metabase;
