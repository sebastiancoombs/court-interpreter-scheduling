-- EA → bcgov table aliasing layer.
--
-- Companion to docs/EA-ALIAS-MAPPING.md. Single source of truth lives in
-- bcgov's tables; this migration projects EA's expected table + column
-- names as PostgreSQL VIEWs. INSTEAD OF triggers translate EA's write
-- statements back into bcgov's columns where the mapping exists; the
-- less-trafficked EA tables (settings/webhooks/consents/etc.) are real
-- tables instead of views since they don't overlap with bcgov.
--
-- EA's CodeIgniter PHP doesn't know it's hitting views — same table
-- names, same column names. No EA source patches required.
--
-- This migration is idempotent on its DDL via `IF NOT EXISTS` /
-- `CREATE OR REPLACE` where possible. The triggers + columns we add to
-- bcgov tables are wrapped in `DO` blocks so re-running is safe.

-- ============================================================================
-- 1. Column gaps — add EA-required columns to bcgov tables.
-- ============================================================================
-- EA writes / reads a few attributes bcgov never tracked. We add them
-- directly on bcgov's tables so the views can pass them through and the
-- INSTEAD OF triggers can persist them.

ALTER TABLE public.interpreter
    ADD COLUMN IF NOT EXISTS working_plan text,
    ADD COLUMN IF NOT EXISTS notifications boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS google_sync boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS google_token text,
    ADD COLUMN IF NOT EXISTS google_calendar varchar(128),
    ADD COLUMN IF NOT EXISTS sync_past_days integer DEFAULT 5,
    ADD COLUMN IF NOT EXISTS sync_future_days integer DEFAULT 5,
    ADD COLUMN IF NOT EXISTS username varchar(256),
    ADD COLUMN IF NOT EXISTS password varchar(512),
    ADD COLUMN IF NOT EXISTS salt varchar(512);

ALTER TABLE public.booking
    ADD COLUMN IF NOT EXISTS hash text;

ALTER TABLE public.language
    ADD COLUMN IF NOT EXISTS duration integer DEFAULT 60,
    ADD COLUMN IF NOT EXISTS price numeric(10,2),
    ADD COLUMN IF NOT EXISTS currency varchar(32) DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS availabilities_type varchar(32) DEFAULT 'flexible',
    ADD COLUMN IF NOT EXISTS attendants_number integer DEFAULT 1,
    ADD COLUMN IF NOT EXISTS service_location varchar(256),
    ADD COLUMN IF NOT EXISTS color varchar(7) DEFAULT '#3D8FD1';

-- ============================================================================
-- 2. Stand-alone EA tables (no bcgov overlap).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ea_settings (
    id serial PRIMARY KEY,
    name varchar(512),
    value text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ea_blocked_periods (
    id serial PRIMARY KEY,
    start_datetime timestamptz NOT NULL,
    end_datetime timestamptz NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ea_consents (
    id serial PRIMARY KEY,
    first_name varchar(256),
    last_name varchar(256),
    email varchar(512),
    ip_address varchar(64),
    type varchar(64),
    modal_title varchar(512),
    modal_message text,
    button_text varchar(64),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ea_webhooks (
    id serial PRIMARY KEY,
    name varchar(256),
    url varchar(512),
    actions varchar(256),
    secret_header varchar(256),
    secret_token varchar(256),
    is_ssl_verified boolean DEFAULT true,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ea_secretaries_providers (
    id_users_secretary integer NOT NULL,
    id_users_provider integer NOT NULL,
    PRIMARY KEY (id_users_secretary, id_users_provider)
);

CREATE TABLE IF NOT EXISTS public.ea_user_settings (
    id_users integer PRIMARY KEY,
    username varchar(256),
    password varchar(512),
    salt varchar(512),
    working_plan text,
    notifications smallint DEFAULT 1,
    google_sync smallint DEFAULT 0,
    google_token text,
    google_calendar varchar(128),
    sync_past_days integer DEFAULT 5,
    sync_future_days integer DEFAULT 5,
    calendar_view varchar(32) DEFAULT 'default'
);

-- ============================================================================
-- 3. Constant-data views (EA expects rows we can hardcode).
-- ============================================================================

-- ea_roles — EA's four built-in role kinds. bcgov has its own `role` table
-- but with different role names; this view returns EA's canonical set.
CREATE OR REPLACE VIEW public.ea_roles AS
SELECT * FROM (VALUES
    (1, 'Administrator', 'admin',     true,  15, 15, 15, 15, 15, 15),
    (2, 'Provider',      'provider',  false, 15, 15,  0,  0,  0, 15),
    (3, 'Customer',      'customer',  false,  0,  0,  0,  0,  0,  0),
    (4, 'Secretary',     'secretary', false, 15, 15,  0,  0,  0, 15)
) AS t(id, name, slug, is_admin, appointments, customers, services, users, system_settings, user_settings);

-- ea_service_categories — two static rows mapping bcgov's language types.
CREATE OR REPLACE VIEW public.ea_service_categories AS
SELECT * FROM (VALUES
    (1, 'Spoken Languages',  'Languages spoken interpreters provide', now(), now()),
    (2, 'Visual / Sign',     'Sign language + visual interpretation', now(), now())
) AS t(id, name, description, created_at, updated_at);

-- ============================================================================
-- 4. Projection views over bcgov tables.
-- ============================================================================

-- ea_services ← language
-- Each bcgov language is one EA "service" the public booking wizard exposes.
-- Category defaults to "Spoken" (id=1); a real deploy can refine this once
-- bcgov tracks language types.
CREATE OR REPLACE VIEW public.ea_services AS
SELECT
    l.id,
    l.name,
    COALESCE(l.duration, 60)                    AS duration,
    l.price,
    COALESCE(l.currency, 'USD')                 AS currency,
    l.description,
    COALESCE(l.availabilities_type, 'flexible') AS availabilities_type,
    COALESCE(l.attendants_number, 1)            AS attendants_number,
    l.service_location                          AS location,
    COALESCE(l.color, '#3D8FD1')                AS color,
    1                                           AS id_service_categories,
    l.created_at,
    l.updated_at,
    l.updated_by
FROM public.language l;

-- ea_users ← UNION over interpreter (role=provider) and user (admins, clerks).
-- EA's ea_users has one row per person regardless of role; we tag rows by
-- their bcgov origin so `id_roles` lines up with the ea_roles view above.
-- The id-space is offset so interpreter rows + user rows don't collide:
--   interpreter.id    → ea_users.id =       interpreter.id      (role 2 = Provider)
--   "user".id         → ea_users.id = 1_000_000 + "user".id     (role 1/3)
-- Pick offset > any reasonable bcgov.interpreter.id.
CREATE OR REPLACE VIEW public.ea_users AS
SELECT
    i.id,
    i.first_name,
    i.last_name,
    i.email,
    i.cell_phone                  AS mobile_number,
    i.business_phone              AS phone_number,
    i.address,
    i.city,
    i.province                    AS state,
    i.postal_code                 AS zip_code,
    i.comments                    AS notes,
    2::integer                    AS id_roles,        -- Provider
    i.username,
    i.password,
    i.salt,
    i.created_at,
    i.updated_at
FROM public.interpreter i
UNION ALL
SELECT
    1000000 + u.id                AS id,
    u.first_name,
    u.last_name,
    u.email,
    NULL::varchar                 AS mobile_number,
    NULL::varchar                 AS phone_number,
    NULL::varchar                 AS address,
    NULL::varchar                 AS city,
    NULL::varchar                 AS state,
    NULL::varchar                 AS zip_code,
    NULL::varchar                 AS notes,
    CASE WHEN u.is_staff THEN 1 ELSE 3 END AS id_roles,  -- Administrator vs Customer
    u.username,
    NULL::varchar                 AS password,
    NULL::varchar                 AS salt,
    u.date_joined                 AS created_at,
    u.last_login                  AS updated_at
FROM public."user" u;

-- ea_services_providers ← interpreter_language (provider ↔ service M2M).
CREATE OR REPLACE VIEW public.ea_services_providers AS
SELECT
    il.interpreter_id AS id_users,
    il.language_id    AS id_services
FROM public.interpreter_language il
WHERE il.interpreter_id IS NOT NULL AND il.language_id IS NOT NULL;

-- ea_appointments ← booking joined to its primary booking_date row.
-- EA represents each appointment as one row with start/end datetimes; bcgov
-- splits date + start_time + finish_time across booking_dates. We project
-- the FIRST booking_date per booking; multi-date bookings collapse to their
-- first slot for EA's view of the world.
CREATE OR REPLACE VIEW public.ea_appointments AS
SELECT
    b.id,
    b.created_at                                                                        AS book_datetime,
    (bd.date::date + COALESCE(bd.start_time, '00:00')::time)                            AS start_datetime,
    (bd.date::date + COALESCE(bd.finish_time, '00:00')::time)                           AS end_datetime,
    b.adm_detail                                                                        AS notes,
    COALESCE(b.hash, b.qr_signdate, b.id::text)                                         AS hash,
    0::smallint                                                                         AS is_unavailability,
    b.interpreter_id                                                                    AS id_users_provider,
    NULL::integer                                                                       AS id_users_customer,
    NULL::integer                                                                       AS id_services,
    NULL::text                                                                          AS id_google_calendar,
    b.created_at,
    b.updated_at
FROM public.booking b
LEFT JOIN LATERAL (
    SELECT date, start_time, finish_time
    FROM public.booking_dates bd
    WHERE bd.booking_id = b.id
    ORDER BY bd.id ASC
    LIMIT 1
) bd ON true;

-- ============================================================================
-- 5. INSTEAD OF triggers — make ea_appointments writable from EA's PHP.
-- ============================================================================
-- The PHP issues INSERT/UPDATE/DELETE against ea_appointments; we translate
-- those into bcgov.booking + bcgov.booking_dates operations.

CREATE OR REPLACE FUNCTION public.ea_appointments_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    new_id integer;
BEGIN
    INSERT INTO public.booking (interpreter_id, hash, adm_detail, created_at, updated_at)
    VALUES (NEW.id_users_provider, NEW.hash, NEW.notes, COALESCE(NEW.book_datetime, now()), now())
    RETURNING id INTO new_id;

    IF NEW.start_datetime IS NOT NULL THEN
        INSERT INTO public.booking_dates (booking_id, date, start_time, finish_time, interpreter_id)
        VALUES (new_id, NEW.start_datetime::date,
                to_char(NEW.start_datetime, 'HH24:MI'),
                to_char(COALESCE(NEW.end_datetime, NEW.start_datetime), 'HH24:MI'),
                NEW.id_users_provider);
    END IF;

    NEW.id := new_id;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ea_appointments_insert_tg ON public.ea_appointments;
CREATE TRIGGER ea_appointments_insert_tg
    INSTEAD OF INSERT ON public.ea_appointments
    FOR EACH ROW EXECUTE FUNCTION public.ea_appointments_insert();

CREATE OR REPLACE FUNCTION public.ea_appointments_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.booking
       SET interpreter_id = NEW.id_users_provider,
           adm_detail     = NEW.notes,
           hash           = NEW.hash,
           updated_at     = now()
     WHERE id = OLD.id;

    UPDATE public.booking_dates
       SET date         = NEW.start_datetime::date,
           start_time   = to_char(NEW.start_datetime, 'HH24:MI'),
           finish_time  = to_char(COALESCE(NEW.end_datetime, NEW.start_datetime), 'HH24:MI'),
           interpreter_id = NEW.id_users_provider
     WHERE booking_id = OLD.id
       AND id = (SELECT id FROM public.booking_dates WHERE booking_id = OLD.id ORDER BY id ASC LIMIT 1);

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ea_appointments_update_tg ON public.ea_appointments;
CREATE TRIGGER ea_appointments_update_tg
    INSTEAD OF UPDATE ON public.ea_appointments
    FOR EACH ROW EXECUTE FUNCTION public.ea_appointments_update();

CREATE OR REPLACE FUNCTION public.ea_appointments_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM public.booking_dates WHERE booking_id = OLD.id;
    DELETE FROM public.booking WHERE id = OLD.id;
    RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS ea_appointments_delete_tg ON public.ea_appointments;
CREATE TRIGGER ea_appointments_delete_tg
    INSTEAD OF DELETE ON public.ea_appointments
    FOR EACH ROW EXECUTE FUNCTION public.ea_appointments_delete();

-- ============================================================================
-- 6. INSTEAD OF triggers on ea_services — EA admins create new "services"
--    (= interpreted languages in our model). Forward to bcgov.language.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ea_services_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    new_id integer;
BEGIN
    INSERT INTO public.language (
        name, duration, price, currency, description,
        availabilities_type, attendants_number, service_location, color,
        updated_by, created_at, updated_at)
    VALUES (
        NEW.name, COALESCE(NEW.duration, 60), NEW.price, COALESCE(NEW.currency, 'USD'),
        NEW.description,
        COALESCE(NEW.availabilities_type, 'flexible'),
        COALESCE(NEW.attendants_number, 1),
        NEW.location, COALESCE(NEW.color, '#3D8FD1'),
        'ea', now(), now())
    RETURNING id INTO new_id;
    NEW.id := new_id;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ea_services_insert_tg ON public.ea_services;
CREATE TRIGGER ea_services_insert_tg
    INSTEAD OF INSERT ON public.ea_services
    FOR EACH ROW EXECUTE FUNCTION public.ea_services_insert();

CREATE OR REPLACE FUNCTION public.ea_services_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.language SET
        name                = NEW.name,
        duration            = NEW.duration,
        price               = NEW.price,
        currency            = NEW.currency,
        description         = NEW.description,
        availabilities_type = NEW.availabilities_type,
        attendants_number   = NEW.attendants_number,
        service_location    = NEW.location,
        color               = NEW.color,
        updated_at          = now()
     WHERE id = OLD.id;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ea_services_update_tg ON public.ea_services;
CREATE TRIGGER ea_services_update_tg
    INSTEAD OF UPDATE ON public.ea_services
    FOR EACH ROW EXECUTE FUNCTION public.ea_services_update();

CREATE OR REPLACE FUNCTION public.ea_services_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM public.language WHERE id = OLD.id;
    RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS ea_services_delete_tg ON public.ea_services;
CREATE TRIGGER ea_services_delete_tg
    INSTEAD OF DELETE ON public.ea_services
    FOR EACH ROW EXECUTE FUNCTION public.ea_services_delete();

-- ============================================================================
-- 7. INSTEAD OF triggers on ea_services_providers — EA admins toggle which
--    providers can offer which services. Forward to interpreter_language.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ea_services_providers_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.interpreter_language (interpreter_id, language_id, level)
    VALUES (NEW.id_users, NEW.id_services, 4)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ea_services_providers_insert_tg ON public.ea_services_providers;
CREATE TRIGGER ea_services_providers_insert_tg
    INSTEAD OF INSERT ON public.ea_services_providers
    FOR EACH ROW EXECUTE FUNCTION public.ea_services_providers_insert();

CREATE OR REPLACE FUNCTION public.ea_services_providers_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM public.interpreter_language
     WHERE interpreter_id = OLD.id_users
       AND language_id   = OLD.id_services;
    RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS ea_services_providers_delete_tg ON public.ea_services_providers;
CREATE TRIGGER ea_services_providers_delete_tg
    INSTEAD OF DELETE ON public.ea_services_providers
    FOR EACH ROW EXECUTE FUNCTION public.ea_services_providers_delete();

-- ============================================================================
-- 8. INSTEAD OF on ea_users — provider creation flows back into bcgov.interpreter.
--    Customer/admin creates write into bcgov."user". The id-space split
--    (interpreter < 1_000_000 < users) determines which target receives it.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ea_users_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    new_id integer;
BEGIN
    IF NEW.id_roles = 2 THEN
        -- Provider → bcgov.interpreter
        INSERT INTO public.interpreter (
            first_name, last_name, email, cell_phone, business_phone,
            address, city, province, postal_code, comments,
            username, password, salt,
            contract_valid, completed_training,
            created_at, updated_at, updated_by)
        VALUES (
            NEW.first_name, NEW.last_name, NEW.email, NEW.mobile_number, NEW.phone_number,
            NEW.address, NEW.city, NEW.state, NEW.zip_code, NEW.notes,
            NEW.username, NEW.password, NEW.salt,
            true, false,
            COALESCE(NEW.created_at, now()), COALESCE(NEW.updated_at, now()), 'ea')
        RETURNING id INTO new_id;
        NEW.id := new_id;
    ELSE
        -- Admin (1) / Customer (3) / Secretary (4) → bcgov."user"
        INSERT INTO public."user" (
            username, email, first_name, last_name,
            is_staff, last_login, date_joined)
        VALUES (
            COALESCE(NEW.username, NEW.email), NEW.email, NEW.first_name, NEW.last_name,
            NEW.id_roles IN (1, 4),
            COALESCE(NEW.updated_at, now()), COALESCE(NEW.created_at, now()))
        RETURNING id INTO new_id;
        NEW.id := 1000000 + new_id;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ea_users_insert_tg ON public.ea_users;
CREATE TRIGGER ea_users_insert_tg
    INSTEAD OF INSERT ON public.ea_users
    FOR EACH ROW EXECUTE FUNCTION public.ea_users_insert();

-- ============================================================================
-- 9. Default ea_settings rows — EA's setup expects these to exist or it
--    re-runs the install wizard. Idempotent.
-- ============================================================================

INSERT INTO public.ea_settings (name, value) VALUES
    ('company_name',         'Judicial Council of California'),
    ('company_email',        'noreply@cis.local'),
    ('company_link',         'https://cis-unified-production.up.railway.app/'),
    ('book_advance_timeout', '30'),
    ('date_format',          'YMD'),
    ('time_format',          'military'),
    ('first_weekday',        'sunday'),
    ('require_captcha',      '0'),
    ('require_phone_number', '1'),
    ('display_cookie_notice','0'),
    ('limit_customer_access','0'),
    ('localization',         'english'),
    ('display_logo',         '1'),
    ('legal_settings_terms', ''),
    ('legal_settings_privacy', '')
ON CONFLICT DO NOTHING;
