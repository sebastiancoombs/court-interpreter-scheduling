-- bcgov seed data — equivalent to what bcgov alembic op.bulk_insert
-- did during upgrade. Companion to the bcgov_schema.sql dump.
-- Re-generate via `bash api/scripts/dump_schema.sh`.
--
-- Tables included:
--   geo_status
--   language
--   rate
--   role




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Data for Name: geo_status; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.geo_status VALUES (1, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', NULL, NULL, 'locations', 'All Locations', NULL, 100) ON CONFLICT DO NOTHING;
INSERT INTO public.geo_status VALUES (2, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', NULL, NULL, 'interpreters', 'All Interpreters', NULL, 100) ON CONFLICT DO NOTHING;


-- Name: geo_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -

SELECT pg_catalog.setval('public.geo_status_id_seq', 2, true);







SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Data for Name: language; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.language VALUES (1, 'English', '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System') ON CONFLICT DO NOTHING;


-- Name: language_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -

SELECT pg_catalog.setval('public.language_id_seq', 2, false);







SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Data for Name: rate; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.rate VALUES (1, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'SPKL1', 63.16, 63.16, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (2, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'SPKL2', 55.8, 55.8, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (3, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'SPKL3', 37.94, 37.94, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (4, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'SPKL4', 37.94, 37.94, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (5, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'ASL1', 84.21, 84.21, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (6, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'ASL2', 55.8, 55.8, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (7, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'CART', 112.35, 112.35, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (8, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'MILEAGE', 0.55, 0.55, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (9, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'BREAKFAST', 12.75, 12.75, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (10, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'LUNCH', 14.75, 14.75, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (11, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'DINNER', 25.5, 25.5, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (12, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'LODGING', 152.22, 152.22, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate VALUES (13, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'TRAVEL_HOUR', 0, 0, '2026-05-11 22:20:35.020057+00') ON CONFLICT DO NOTHING;


-- Name: rate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -

SELECT pg_catalog.setval('public.rate_id_seq', 13, true);







SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Data for Name: role; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.role VALUES (1, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'super-admin') ON CONFLICT DO NOTHING;
INSERT INTO public.role VALUES (2, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'cis-admin') ON CONFLICT DO NOTHING;
INSERT INTO public.role VALUES (3, '2026-05-11 22:20:35.020057+00', '2026-05-11 22:20:35.020057+00', 'System', 'cis-user') ON CONFLICT DO NOTHING;


-- Name: role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -

SELECT pg_catalog.setval('public.role_id_seq', 3, true);




