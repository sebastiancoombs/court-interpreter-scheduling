# EA → bcgov table-aliasing plan

> **Status:** design doc. Execution deferred until EA is being deployed
> on Railway. No code changes yet — this is the agreement on what we'll
> build when the time comes.

When Easy!Appointments comes back into the deploy, its PHP/CodeIgniter
code talks to a fixed set of tables and column names (`ea_appointments`,
`ea_users`, `ea_services`, …). We don't want a second copy of the data,
and we don't want to rewrite EA's queries. Pattern:

> **bcgov tables are the source of truth. EA reads/writes through
> PostgreSQL `VIEW`s that project bcgov's columns under EA's names.
> `INSTEAD OF INSERT/UPDATE/DELETE` triggers translate EA's writes
> back into bcgov's columns.**

That gives EA an unchanged surface (same table names, same columns),
no replication lag, and a single physical source of truth in bcgov's
`booking`, `interpreter`, `language` etc.

This replaces the earlier `app.bookings_mirror` + `integration/ea-sync`
worker pattern, which kept a parallel copy with a polling worker.
That work gets retired the day this lands.

## Architecture

```
            ┌──────────────────────────────────────────┐
            │      Supabase Postgres (single DB)       │
            │                                          │
            │  bcgov tables (truth)                    │
            │   booking, interpreter, language, …      │
            │                                          │
            │  EA-shaped VIEWs                         │
            │   ea_appointments  →  booking            │
            │   ea_users         →  interpreter + user │
            │   ea_services      →  language           │
            │   ea_customers     →  user (court clerk) │
            │   …                                      │
            │                                          │
            │  INSTEAD OF triggers handle EA writes    │
            └──────────────────────────────────────────┘
                         ▲                ▲
                         │ SQLAlchemy     │ CodeIgniter
                         │                │ DB driver
                  bcgov-api (FastAPI)   easyappointments (PHP)
```

## Table mapping

Concrete EA tables ↔ bcgov tables. Columns whose semantics line up cleanly
are direct projections; the rest are filled with `NULL` or a constant.

| EA table | bcgov source | Notes |
| --- | --- | --- |
| `ea_appointments` | `booking` (1:1 row), `booking_dates` (datetime parts) | `start_datetime` = `booking_dates.date + booking_dates.start_time`; `id_users_provider` = `booking.interpreter_id` |
| `ea_users` (role=provider) | `interpreter` | Phone fields split: bcgov has `phone`, EA wants `home_phone`/`business_phone`/`cell_phone` — project bcgov's into one of them (cell_phone), `NULL` for the others |
| `ea_users` (role=customer) | `user` filtered by role-relation = court clerk | Court clerks are bcgov `user` rows with role assignment in `request_access_role_relation` |
| `ea_users` (role=admin) | `user` filtered by role = super-admin | |
| `ea_users` (role=secretary) | `user` (role = clerk's supporting staff) | bcgov doesn't model this distinctly; fold into customer role or stub |
| `ea_services` | `language` | Each "service" is one interpreted language slot; `duration` = a config constant (e.g. 60 minutes), `price` from `rate` table |
| `ea_service_categories` | `language.category` (or a constant set) | EA expects categories like "Spoken" / "Visual"; map from `language.type` if present, else hard-code two rows |
| `ea_services_providers` | `interpreter_language` (m2m) | Direct projection: `id_users` ← `interpreter_id`, `id_services` ← `language_id` |
| `ea_secretaries_providers` | (n/a) | bcgov has no secretary↔provider model; return an empty view |
| `ea_user_settings` | new column on `interpreter` (json `working_plan`) | bcgov doesn't track working plan; **needs a one-column addition to `interpreter`** before this view works |
| `ea_settings` | `app.ea_settings` (new table) | EA's system-wide settings — store as JSON key/value pairs in a tiny bcgov-side table |
| `ea_roles` | constant rows | Static set of 4 rows: admin, provider, customer, secretary; built into the view's `SELECT … FROM (VALUES …)` |

## Column-gap punch list

Columns EA expects that bcgov doesn't currently track. Need to either add
to bcgov tables or fill with `NULL` constants in the view:

- **interpreter** + `working_plan TEXT` (JSON blob describing per-day open/close + breaks) — required for the EA Working Plan tab
- **interpreter** + `notifications BOOLEAN` (opt-in toggle)
- **interpreter** + `google_token TEXT`, `google_calendar VARCHAR(128)` (Google Calendar sync — leave NULL unless we wire that integration)
- **booking** + `hash TEXT` (EA uses for booking-cancellation URLs; can mirror bcgov's `qr_hash`)
- **booking** + `book_datetime` (when the booking *request* was made; mirror bcgov's `created_at`)
- **language** + `duration INTEGER DEFAULT 60`, `price NUMERIC(10,2)`, `currency VARCHAR(32) DEFAULT 'USD'`, `is_active BOOLEAN DEFAULT true` (defaults if we don't want to add real columns)

## INSTEAD OF trigger pattern

EA's PHP issues `INSERT INTO ea_appointments (…) VALUES (…)`. The view
itself isn't writable, but `INSTEAD OF INSERT` lets us translate that
into an insert on `booking` (+ `booking_dates`):

```sql
CREATE OR REPLACE FUNCTION ea_appointments_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  new_booking_id integer;
BEGIN
  INSERT INTO booking
    (interpreter_id, requested_by_id, language_id,
     comment, qr_hash, status, created_at, updated_at)
  VALUES
    (NEW.id_users_provider, NEW.id_users_customer, NEW.id_services,
     NEW.notes, NEW.hash, 'pending', now(), now())
  RETURNING id INTO new_booking_id;

  INSERT INTO booking_dates
    (booking_id, date, start_time, finish_time)
  VALUES
    (new_booking_id,
     NEW.start_datetime::date,
     NEW.start_datetime::time,
     NEW.end_datetime::time);

  NEW.id := new_booking_id;
  RETURN NEW;
END $$;

CREATE TRIGGER ea_appointments_insert
  INSTEAD OF INSERT ON ea_appointments
  FOR EACH ROW EXECUTE FUNCTION ea_appointments_insert();
```

Similar `_update` and `_delete` functions handle the other DML. The
status enum and any FK validation happen at bcgov's table level, so
EA can't insert a row that breaks bcgov invariants — by design.

## Migration file

When we execute, this lands as a single Supabase migration:

```
supabase/migrations/<timestamp>_ea_aliases.sql
  1. ALTER TABLE interpreter ADD COLUMN working_plan TEXT, …  (column gaps)
  2. ALTER TABLE booking     ADD COLUMN hash TEXT, …
  3. CREATE VIEW ea_appointments AS SELECT … FROM booking …
  4. CREATE FUNCTION ea_appointments_iud() …
  5. CREATE TRIGGER ea_appointments_iud …
  6. (repeat for ea_users, ea_services, …)
```

Plus drop the legacy mirror layer in the same commit:

```sql
DROP TABLE app.bookings_mirror;
-- and delete integration/ea-sync/* in code
```

## Open questions before execution

1. **Which user table?** bcgov has `user` (admin/clerk) and `interpreter`
   (separate table). EA expects ONE `ea_users` table with a role column.
   → View `ea_users` as `UNION ALL` over both, projecting role from
   bcgov's role-relation or a constant.
2. **Working plan storage** — add `working_plan` column to bcgov.interpreter
   or store separately in `app.interpreter_settings`. Recommendation:
   new column, keeps interpretation atomic with the row.
3. **Hashing** — bcgov's `qr_hash` semantics vs EA's `hash` for cancellation
   URLs. Same purpose? Verify before aliasing.
4. **Service categories** — bcgov doesn't categorize languages. EA wants
   service_categories. Hard-code two rows ("Spoken" / "Visual / Sign") via
   a `VALUES`-backed view, or add a `category` column to `language`.
5. **Currency / pricing** — EA wants per-service price + currency. bcgov
   tracks rates in a separate `rate` table by interpreter level. Decide
   whether to surface a flat language-level price (lossy) or always
   `NULL` and let EA's quote page degrade gracefully.

## When to execute

Execute the day we're wiring EA as a Railway service. Until then,
EA remains an external concern and the views are documentation only.
The Supabase migration file lives unrun in `docs/drafts/` or stays
on a feature branch until that moment.
