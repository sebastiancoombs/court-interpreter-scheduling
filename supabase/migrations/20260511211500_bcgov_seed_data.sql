-- Seed data that bcgov's alembic chain inserted via op.bulk_insert calls.
-- The schema dump (..._bcgov_schema.sql) captured the structure but not
-- this constant-seed data. The bcgov-api startup lifespan task assumes
-- these rows exist:
--
--   - `geo_status` (2 rows) — lifespan task `check_geo_update_schedule`
--     queries `.first()` for id=1 and id=2; without rows it crashes on
--     None.next_update_at.
--   - `role` (3 rows) — auth guards reference these role names.
--   - `rate` (13 rows) — admin rates page would render empty without them.
--
-- All inserts are idempotent via ON CONFLICT so re-running this migration
-- against an already-seeded DB is safe.

-- geo_status — bcgov alembic b7ddd26f4423_added_geo_status_table.py
INSERT INTO geo_status (name, description, progress) VALUES
    ('locations',    'All Locations',    100),
    ('interpreters', 'All Interpreters', 100)
ON CONFLICT DO NOTHING;

-- role — bcgov alembic 8706729850e5_added_user_oidc_role_userrole_tables.py
INSERT INTO role (role_name, updated_by) VALUES
    ('super-admin', 'System'),
    ('cis-admin',   'System'),
    ('cis-user',    'System')
ON CONFLICT DO NOTHING;

-- rate — bcgov alembic 9a9558afa1f2_added_rate_table.py
INSERT INTO rate (name, value, previous_value, updated_by) VALUES
    ('SPKL1',       '63.16',  '63.16',  'System'),
    ('SPKL2',       '55.8',   '55.8',   'System'),
    ('SPKL3',       '37.94',  '37.94',  'System'),
    ('SPKL4',       '37.94',  '37.94',  'System'),
    ('ASL1',        '84.21',  '84.21',  'System'),
    ('ASL2',        '55.8',   '55.8',   'System'),
    ('CART',        '112.35', '112.35', 'System'),
    ('MILEAGE',     '0.55',   '0.55',   'System'),
    ('BREAKFAST',   '12.75',  '12.75',  'System'),
    ('LUNCH',       '14.75',  '14.75',  'System'),
    ('DINNER',      '25.50',  '25.50',  'System'),
    ('LODGING',     '152.22', '152.22', 'System'),
    ('TRAVEL_HOUR', '0.0',    '0.0',    'System')
ON CONFLICT DO NOTHING;
