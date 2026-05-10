# `integration/` — Supabase ↔ subsystems bridge

This package is the glue that lets **Supabase** act as the unified backing layer
for the three subsystems that live in this repo:

```
                   ┌──────────────────────────────────────┐
                   │           Supabase (Postgres)        │
                   │  Auth · Storage · RLS · pgAudit ·    │
                   │  Realtime · Edge Functions · pg_cron │
                   └─┬───────────────┬───────────────┬────┘
                     │ JWT           │ replication   │ JWT
       ┌─────────────┴───┐  ┌────────┴─────────┐  ┌──┴──────────┐
       │ bcgov FastAPI   │  │ Easy!Appointments │  │   Metabase  │
       │ (api/, web/)    │  │ (PHP/MySQL)       │  │   (BI)      │
       └─────────────────┘  └───────────────────┘  └─────────────┘
```

## Three sub-packages

### `auth-bridge/` — JWT-everywhere

A thin Hono service (Node 20) that:

1. Verifies a Supabase-issued JWT against the project's JWKS.
2. **bcgov FastAPI**: returns the JWT directly — bcgov's FastAPI middleware is updated to accept it (replaces Keycloak validation).
3. **Easy!Appointments**: exchanges the JWT for an EA session cookie by calling EA's `/api/v1/login` with a service-account credential, then writes the user's profile (linked via `app.profiles.ea_user_id`).
4. **Metabase**: signs a Metabase JWT (HS256 with the embedding key) so the Metabase SDK auto-provisions the user from their Supabase identity. Free-tier-friendly via the `JWT_SHARED_SECRET` env var; uses Metabase Pro's full SSO if available.

Endpoints:
- `POST /exchange/ea` → 200 with `Set-Cookie: ea_session=…`
- `POST /exchange/metabase` → 200 with `{ token, expires_at }`
- `GET /me` → 200 with the consolidated profile across the three systems

### `ea-sync/` — EA MySQL → Supabase Postgres

A long-running worker that mirrors EA's `appointments`, `users` (providers/customers), `services`, and `settings` tables into the Supabase `app.bookings_mirror` projection. Two modes:

- **Polling** (default, demo-friendly): every 30s, upserts changed rows since `synced_at`.
- **Binlog** (production): subscribes to MySQL's binary log via `mysql2`'s replication API. Lower latency (~seconds) but needs `binlog_format=ROW` on the EA MySQL.

State machine remap: EA's `pending / confirmed / cancelled` → unified `requested / accepted / cancelled`; the additional RFP states (`assigned`, `declined`, `completed`) are written by the bcgov FastAPI side and read here.

### `metabase-sso/` — drop-in JWT auto-provisioning

A small Express middleware that fronts Metabase. When a user lands at `/metabase/*` carrying a Supabase JWT, this proxy:

1. Verifies the JWT.
2. Calls Metabase's `POST /api/session` with the bridge's JWT.
3. Sets the resulting `metabase.SESSION` cookie.
4. Reverse-proxies the request to `metabase:3000`.

Lets us get SSO behavior on the open-source edition without buying Metabase Pro. Optional — flip the env to use Pro's native JWT SSO when JCC ships the contract.

## Run it

All three sub-packages live in this folder as separate Node services. From the repo root:

```bash
# 1. Stand up the rest of the stack first
docker compose -f easyappointments/docker-compose.yml -f easyappointments/docker-compose.override.yml up -d

# 2. Stand up Supabase locally
cd supabase && supabase start && cd ..

# 3. Run the integration services
cd integration && npm install && npm run dev:all
```

`npm run dev:all` boots all three sub-packages with `concurrently`. Each sub-package has its own README + tests.

## Environment

See [`.env.example`](./.env.example) for the full list. Headline vars:

| Var | Used by | What |
| --- | --- | --- |
| `SUPABASE_URL` | all | `http://127.0.0.1:54321` for local |
| `SUPABASE_SERVICE_ROLE_KEY` | sync, sms-inbound | service role for cross-table writes |
| `SUPABASE_JWT_SECRET` | auth-bridge | verify incoming JWTs |
| `EA_BASE_URL` | auth-bridge, sync | `http://localhost:8085` |
| `EA_ADMIN_API_TOKEN` | auth-bridge, sync | EA admin API token |
| `EA_DB_*` | sync | mysql:3306 internal docker network |
| `METABASE_SITE_URL` | sso | `http://localhost:8088` |
| `METABASE_EMBEDDING_SECRET` | sso | from Metabase admin → Embedding settings |

## Status — Bid scaffold

This package is a **scaffold with stub implementations** for each bridge service.
The data flows, env contracts, and entry points are all in place; the Twilio
verification + EA admin-account exchange + Metabase Pro fallbacks are all
marked `TODO` in code. ~5 dev-days to ship to bid-demo quality.
