# Site map — RFP gaps → subsystem pages

How the four subsystems in this repo collectively cover the JCC LSS-2026-207-RB
Exhibit 1 minimum requirements. Read this top-to-bottom to walk a reviewer
through the user journey; read the right column to confirm RFP coverage.

> **Subsystem legend**
> - **bcgov** — `web/`, `api/` — original BC Gov fork, re-skinned for JCC. Owns interpreter directory, ADM/payment forms, audit reports.
> - **EA** — `easyappointments/` — vendored fork. Owns booking calendar, scheduling wizard, providers, customers, working plan, notifications. Runs on **PostgreSQL** via the dialect-aware `EA_Migration` helpers — same DB instance as Metabase.
> - **MB** — Metabase, run from `easyappointments/docker-compose.override.yml`. Owns §5 reporting + dashboards. Stores its own metadata in the `metabase` database on the same Postgres instance as EA.
> - **SB** — Supabase, configured under `supabase/`. Owns identity, RLS isolation, audit log, Storage, Realtime, edge functions. In production, EA points at the same Supabase Postgres so the entire stack runs against one DB.
> - **Bridge** — `integration/` — auth bridge, Metabase SSO sidecar (with unified-topbar HTML injection). Glue.

---

## Top-level navigation (post-login)

What the signed-in user sees. The frame (topbar, JCC navy + gold) is bcgov; the panes inside are pulled from each subsystem.

| Nav item | Page | Subsystem | URL today |
| --- | --- | --- | --- |
| Dashboard | KPI tiles + upcoming + cert expirations | **MB** embedded via Bridge SSO | `/metabase/dashboard/jcc-overview` (proxied at `:8091`) |
| Manage Bookings | Calendar / table view | **EA** | `:8085/index.php/calendar`, `:8085/index.php/appointments` |
| Add Booking | 3-step wizard | **EA** public | `:8085/` |
| Interpreters | Roster + cert tracking | **bcgov + EA** (see "split" below) | `:8080/directory`, `:8085/index.php/providers` |
| Languages | Configurable list | **bcgov** | `:8080/language` |
| Rates | Per-tier hourly + per-diem | **bcgov** | `:8080/rates` |
| Audit | Compliance trail | **SB** Studio + Bridge `/audit` | `:54323` (Supabase Studio) or custom `/audit` page reading `app.audit_log` |
| Reports | Filterable analytics | **MB** via Bridge SSO sidecar | `:8091/metabase/*` (proxied; sidecar injects unified JCC topbar so Metabase wears the same chrome as bcgov + EA) |
| User Roles | Court staff role assignment | **bcgov + SB** (Supabase Auth source-of-truth, bcgov UI for assignment) | `:8080/user-role` |
| ADM Forms | Payment voucher generation | **bcgov** | `:8080/audit-booking` → ADM modal |

---

## Detailed page → RFP gap matrix

### §1 User & Access

| RFP requirement | Page | Subsystem | Status |
| --- | --- | --- | --- |
| Role-based access (interpreter / coordinator / staff / admin) | User Roles + Profile | **bcgov** UI + **SB** `app.roles` table | ✅ schema in `supabase/migrations/...01_unified_core.sql`; bcgov `UserRole.vue` re-skin |
| SSO + MFA | Unified login | **SB** Auth + **Bridge** `auth-bridge` | ✅ scaffold; ⚠️ SAML IdP needs JCC's actual provider |
| Web on desktop + mobile | All pages | **bcgov** (Bootstrap-Vue) + **EA** (Bootstrap 5) | ✅ responsive defaults; ⚠️ tablet/phone polish pending |
| Mobile-friendly design | All pages | bcgov + EA | 🟡 audit pass on small breakpoints needed |
| 2,000 active users | Backend | **SB** Postgres + Bridge sync | ✅ Postgres + RLS scales; binlog-based EA sync for prod |

### §2 Scheduling & Assignment

| RFP requirement | Page | Subsystem | Status |
| --- | --- | --- | --- |
| Create / modify / cancel by date / time / location / language | Calendar admin | **EA** | ✅ in repo, themed |
| Public booking flow | 3-step wizard | **EA** public | ✅ in repo, themed |
| **Recurring assignments** (standing weekly hearings) | Calendar → repeat options | **EA** | ✅ EA supports recurrence — re-label "weekly recurring" in templates |
| Auto-match by language / level / location | Provider working plan + service availability | **EA** + **bcgov** filter logic | ✅ |
| Manual override | Calendar admin | **EA** coordinator role | ✅ |
| **5-state status machine** (requested / assigned / accepted / declined / completed) | Status enum | **SB** `app.booking_status` + **EA** custom plugin | ⚠️ EA only ships pending/confirmed/cancelled; bridge mirror normalizes |

### §3 Communication & Notifications

| RFP requirement | Page | Subsystem | Status |
| --- | --- | --- | --- |
| Email notifications | EA Settings → Email templates | **EA** built-in | ✅ |
| **SMS notifications** | EA Settings → Integrations | **EA** + Twilio webhook in **SB** edge function `sms-inbound` | ✅ scaffold; ⚠️ Twilio creds + signature verify TODO |
| **Two-way SMS** for accept / decline | Twilio inbound webhook | **SB** edge function | ✅ scaffold in `supabase/functions/sms-inbound/index.ts` |
| Comm audit log | Unified audit | **SB** `app.audit_log` + Bridge forwarders | ✅ schema live |
| Real-time staff updates | Subscribe channel | **SB** Realtime on `app.bookings_mirror` | ⚠️ subscribe code on bcgov frontend pending |

### §4 Interpreter Management

| RFP requirement | Page | Subsystem | Status |
| --- | --- | --- | --- |
| Centralized directory | Interpreter Directory + Providers | **bcgov** (`Directory.vue`) + **EA** (`/providers`) | ✅ both sides; sync via Bridge |
| **Self-service profile + availability** | Provider page → Working Plan tab | **EA** | ✅ in repo (was a hard gap on bcgov alone) |
| Cert expiration alerts | pg_cron job → SMS/email | **SB** edge function `cert-expirations` | ✅ scaffold |
| **Document upload** (certs / contracts / insurance) | Provider profile → docs | **SB** Storage `interpreter-certifications` bucket | ✅ bucket configured in `supabase/config.toml`; UI wiring pending |

### §5 Reporting & Analytics

| RFP requirement | Page | Subsystem | Status |
| --- | --- | --- | --- |
| **Fill rate / response time / no-show metrics** | Dashboard | **MB** | ⚠️ questions/cards to be authored against `app.bookings_mirror` |
| Custom reports | Metabase Questions | **MB** | ✅ tool live |
| **Excel / PDF / CSV export** | Metabase export menu | **MB** | ✅ built-in |
| Filterable dashboard (date / court / interpreter / language) | Dashboard | **MB** with iframe | ✅ |

### §6 Integration & Data

| RFP requirement | Page | Subsystem | Status |
| --- | --- | --- | --- |
| REST API + Swagger | Auto-generated | **bcgov** FastAPI `/docs` + **EA** `/openapi.yml` + **SB** auto-REST | ✅ three independent surfaces; Bridge gateway optional |
| **CIDCS adapter** | Custom integration layer | **Bridge** stub | ❌ needs JCC spec |
| CJIS-aligned hosting | Deployment config | (deploy time) | ⚠️ AWS GovCloud / Azure Gov decision pending |
| Sandbox env | Separate Supabase project | **SB** | ✅ multi-project via same `config.toml` |
| Data retention / archival | pg_cron + storage lifecycle | **SB** | ⚠️ archival job pending |

### §7 Administrative Features

| RFP requirement | Page | Subsystem | Status |
| --- | --- | --- | --- |
| Multi-court / multi-location | Locations admin | **bcgov** + **EA** per-service location | ✅ |
| Custom business rules (priority, seniority) | Service catalog + provider weighting | **EA** Settings → Business Logic | ✅ basic; weighting via custom matcher TODO |
| **Audit trail** | Unified audit log | **SB** `app.audit_log` + trigger | ✅ schema + trigger on every domain table |
| Configurable hours / blackouts / holidays | Settings → Working Plan | **EA** | ✅ |
| Notification templates | Settings → Email / SMS templates | **EA** | ✅ |

### §8 Technical & Support

| RFP requirement | Page | Subsystem | Status |
| --- | --- | --- | --- |
| Cloud SaaS, 99.9% uptime | Deployment | (Supabase Cloud or self-host on AWS GovCloud) | ⚠️ |
| Encryption at rest / transit | Hosting layer | **SB** | ✅ |
| Sandbox env | Separate Supabase project | **SB** | ✅ |
| API documentation | FastAPI Swagger + EA Swagger UI + Supabase auto-REST | ✅ three surfaces | ✅ |

---

## Subsystem-source-of-truth map

When two subsystems can hold the same noun, this is who owns which write:

| Noun | Owner of writes | Mirrored to |
| --- | --- | --- |
| Booking | **EA** (`ea_appointments`) | Supabase `app.bookings_mirror` (read-side, for §5 + RLS) |
| Interpreter (= EA Provider) | **EA** (`ea_users` role=provider) | bcgov `interpreter` table for ADM/payment compatibility; Supabase `app.profiles` for identity |
| Court (= EA Service Location) | **bcgov** `location` table | Mirrored to EA per-service location field via Bridge |
| Language | **bcgov** `language` table | Synced to EA for the public booking wizard |
| Cert / Contract document | **Supabase Storage** | Metadata in `app.documents` |
| User identity | **Supabase Auth** (`auth.users`) | Mirrored to `app.profiles` with cross-subsystem links (`bcgov_user_id`, `ea_user_id`, `metabase_user_id`) |
| Audit event | **Supabase** `app.audit_log` | bcgov writes via SQLAlchemy hook; EA via MySQL trigger forwarder; Metabase via its own audit feed |
| Booking status state machine | **bcgov** + **EA** (split) | EA writes pending/confirmed/cancelled; bcgov writes the additional 5-state RFP transitions; bridge normalizes |

---

## Open coverage items (true build work, not config)

After the integration package + EA fold-in + Metabase + Supabase, what's left:

1. **EA recurrence → bcgov 5-state mapping** (~2 d) — write the bridge code that promotes an EA `confirmed` to `assigned` and emits a `requested → assigned` audit event.
2. **Twilio SMS layer + signature verify** (~3 d) — flesh out `supabase/functions/sms-inbound/index.ts`.
3. **Cert upload UI + Storage wiring** (~1 d) — drop a file input on the bcgov interpreter detail page that POSTs to a Supabase Storage signed URL.
4. **Metabase questions + dashboard** (~2 d) — author fill-rate / response-time / no-show / per-court breakdown cards.
5. **EA Supabase Auth plugin polish** (~1 d) — finish the `Sso_api_v1::exchange` flow + the impersonation step.
6. **Real-time subscription** (~1 d) — bcgov frontend listens to `app.bookings_mirror` Realtime channel.
7. **CIDCS adapter** (size unknown) — needs JCC spec.

Total ≈ 10 dev-days remaining for full RFP coverage. Within the 3-week window.
