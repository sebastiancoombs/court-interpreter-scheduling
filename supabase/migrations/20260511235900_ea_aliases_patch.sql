-- EA alias patch — fixes three gaps discovered after the initial aliasing
-- migration (20260511230000_ea_aliases.sql):
--
-- 1. ea_appointments.id_services was NULL — language lives in the deep path
--    booking → booking_dates → booking_cases → interpreter_language → language.
--    The view now walks that join; triggers now persist id_services as a
--    booking_cases row.
--
-- 2. ea_appointments.id_users_customer was NULL — bcgov has no user-FK on
--    bookings, so this stays NULL on reads. We just stop asserting NULL in the
--    SELECT so EA doesn't choke if we later add a column.
--
-- 3. ea_users had no UPDATE trigger — EA admin edits to provider/customer
--    profiles were silently dropped. Added INSTEAD OF UPDATE routing to
--    interpreter (id < 1_000_000) or "user" (id ≥ 1_000_000).

-- ============================================================================
-- 1. Rebuild ea_appointments view to carry id_services.
-- ============================================================================

CREATE OR REPLACE VIEW public.ea_appointments AS
SELECT
    b.id,
    b.created_at                                                                     AS book_datetime,
    (bd.date::date + COALESCE(bd.start_time, '00:00')::time)                         AS start_datetime,
    (bd.date::date + COALESCE(bd.finish_time, '00:00')::time)                        AS end_datetime,
    b.adm_detail                                                                     AS notes,
    COALESCE(b.hash, b.qr_signdate, b.id::text)                                      AS hash,
    0::smallint                                                                      AS is_unavailability,
    b.interpreter_id                                                                 AS id_users_provider,
    NULL::integer                                                                    AS id_users_customer,
    -- Walk booking → booking_dates (first row) → booking_cases → interpreter_language → language
    (
        SELECT il.language_id
        FROM   public.booking_dates  bd2
        JOIN   public.booking_cases  bc  ON bc.booking_date_id = bd2.id
        JOIN   public.interpreter_language il ON il.id = bc.interpreter_language_id
        WHERE  bd2.booking_id = b.id
        ORDER  BY bd2.id ASC
        LIMIT  1
    )                                                                                AS id_services,
    NULL::text                                                                       AS id_google_calendar,
    b.created_at,
    b.updated_at
FROM public.booking b
LEFT JOIN LATERAL (
    SELECT date, start_time, finish_time
    FROM   public.booking_dates bd
    WHERE  bd.booking_id = b.id
    ORDER  BY bd.id ASC
    LIMIT  1
) bd ON true;

-- ============================================================================
-- 2. Rebuild ea_appointments_insert — also write booking_cases so language
--    (id_services) is persisted alongside the booking_dates row.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ea_appointments_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    new_booking_id  integer;
    new_bd_id       integer;
    il_id           integer;
BEGIN
    -- Core booking row
    INSERT INTO public.booking (interpreter_id, hash, adm_detail, created_at, updated_at)
    VALUES (
        NEW.id_users_provider,
        NEW.hash,
        NEW.notes,
        COALESCE(NEW.book_datetime, now()),
        now()
    )
    RETURNING id INTO new_booking_id;

    -- booking_dates row (required for booking_cases FK)
    IF NEW.start_datetime IS NOT NULL THEN
        INSERT INTO public.booking_dates (
            booking_id, date, start_time, finish_time, interpreter_id)
        VALUES (
            new_booking_id,
            NEW.start_datetime::date,
            to_char(NEW.start_datetime, 'HH24:MI'),
            to_char(COALESCE(NEW.end_datetime, NEW.start_datetime), 'HH24:MI'),
            NEW.id_users_provider
        )
        RETURNING id INTO new_bd_id;

        -- booking_cases row — links language via interpreter_language
        IF NEW.id_services IS NOT NULL THEN
            SELECT il.id INTO il_id
            FROM   public.interpreter_language il
            WHERE  il.interpreter_id = NEW.id_users_provider
              AND  il.language_id    = NEW.id_services
            LIMIT 1;

            INSERT INTO public.booking_cases (
                booking_date_id, interpreter_language_id,
                federal, requested_by, method_of_appearance)
            VALUES (
                new_bd_id,
                il_id,          -- may be NULL if interpreter doesn't offer this language yet
                false,
                'Court',
                'In-Person'
            );
        END IF;
    END IF;

    NEW.id := new_booking_id;
    RETURN NEW;
END $$;

-- ============================================================================
-- 3. Rebuild ea_appointments_update — keep language in sync.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ea_appointments_update()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    bd_id  integer;
    il_id  integer;
BEGIN
    -- Update core booking
    UPDATE public.booking
       SET interpreter_id = NEW.id_users_provider,
           adm_detail     = NEW.notes,
           hash           = NEW.hash,
           updated_at     = now()
     WHERE id = OLD.id;

    -- Update first booking_dates row
    SELECT id INTO bd_id
    FROM   public.booking_dates
    WHERE  booking_id = OLD.id
    ORDER  BY id ASC
    LIMIT  1;

    IF bd_id IS NOT NULL AND NEW.start_datetime IS NOT NULL THEN
        UPDATE public.booking_dates
           SET date           = NEW.start_datetime::date,
               start_time     = to_char(NEW.start_datetime, 'HH24:MI'),
               finish_time    = to_char(COALESCE(NEW.end_datetime, NEW.start_datetime), 'HH24:MI'),
               interpreter_id = NEW.id_users_provider
         WHERE id = bd_id;

        -- Update booking_cases language if id_services changed
        IF NEW.id_services IS NOT NULL AND NEW.id_services IS DISTINCT FROM OLD.id_services THEN
            SELECT il.id INTO il_id
            FROM   public.interpreter_language il
            WHERE  il.interpreter_id = NEW.id_users_provider
              AND  il.language_id    = NEW.id_services
            LIMIT 1;

            UPDATE public.booking_cases
               SET interpreter_language_id = il_id
             WHERE booking_date_id = bd_id;
        END IF;
    END IF;

    RETURN NEW;
END $$;

-- ============================================================================
-- 4. Add INSTEAD OF UPDATE on ea_users.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ea_users_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.id < 1000000 THEN
        -- Provider → bcgov.interpreter
        UPDATE public.interpreter SET
            first_name    = NEW.first_name,
            last_name     = NEW.last_name,
            email         = NEW.email,
            cell_phone    = NEW.mobile_number,
            business_phone = NEW.phone_number,
            address       = NEW.address,
            city          = NEW.city,
            province      = NEW.state,
            postal_code   = NEW.zip_code,
            comments      = NEW.notes,
            username      = NEW.username,
            password      = NEW.password,
            salt          = NEW.salt,
            updated_at    = now()
         WHERE id = OLD.id;
    ELSE
        -- Admin/Customer → bcgov."user"
        UPDATE public."user" SET
            first_name = NEW.first_name,
            last_name  = NEW.last_name,
            email      = NEW.email,
            username   = COALESCE(NEW.username, NEW.email),
            is_staff   = NEW.id_roles IN (1, 4)
         WHERE id = (OLD.id - 1000000);
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ea_users_update_tg ON public.ea_users;
CREATE TRIGGER ea_users_update_tg
    INSTEAD OF UPDATE ON public.ea_users
    FOR EACH ROW EXECUTE FUNCTION public.ea_users_update();

-- Also wire a DELETE on ea_users (soft: interpreters can be deactivated,
-- bcgov users can be removed if they have no bookings).
CREATE OR REPLACE FUNCTION public.ea_users_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.id < 1000000 THEN
        -- Hard delete. If interpreter has bookings the FK on booking.interpreter_id
        -- will raise a constraint error — correct behaviour, don't delete booked interpreters.
        DELETE FROM public.interpreter_language WHERE interpreter_id = OLD.id;
        DELETE FROM public.interpreter WHERE id = OLD.id;
    ELSE
        DELETE FROM public."user" WHERE id = (OLD.id - 1000000);
    END IF;
    RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS ea_users_delete_tg ON public.ea_users;
CREATE TRIGGER ea_users_delete_tg
    INSTEAD OF DELETE ON public.ea_users
    FOR EACH ROW EXECUTE FUNCTION public.ea_users_delete();
