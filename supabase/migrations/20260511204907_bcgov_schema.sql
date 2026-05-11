-- bcgov schema, captured from  against PostgreSQL 15.
-- Re-generate via api/scripts/dump_schema.sh after model/migration changes.

--
-- PostgreSQL database dump
--


-- Dumped from database version 15.17 (Debian 15.17-1.pgdg13+1)
-- Dumped by pg_dump version 15.17 (Debian 15.17-1.pgdg13+1)

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: booking_interpret_for; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_interpret_for AS ENUM (
    'Witness',
    'Party',
    'Accused'
);


--
-- Name: booking_method_of_appearance; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_method_of_appearance AS ENUM (
    'In-Person',
    'MS Teams',
    'Via Teleconference',
    'RIS'
);


--
-- Name: booking_period; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_period AS ENUM (
    'MORNING',
    'AFTERNOON',
    'WHOLE_DAY'
);


--
-- Name: booking_requested_by; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_requested_by AS ENUM (
    'Court',
    'Crown',
    'Applicant',
    'Defence',
    'Respondent',
    'Accused',
    'Disputant'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'Pending',
    'Booked',
    'Cancelled'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: booking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    interpreter_id integer,
    scheduling_clerk character varying,
    clerk_phone character varying,
    records_approved boolean,
    approver_name character varying,
    interpreter_signed boolean,
    interpreter_signdate character varying,
    qr_signed boolean,
    qr_signdate character varying,
    fees_gst double precision,
    fees_total double precision,
    expense_gst double precision,
    expense_total double precision,
    invoice_total double precision,
    invoice_date character varying,
    invoice_number character varying,
    adm_detail character varying,
    adm_updated_by character varying,
    form_sender character varying,
    form_sender_email character varying,
    form_recipient_email character varying,
    form_sent_date timestamp with time zone,
    invoice_sender character varying,
    invoice_sender_email character varying,
    invoice_recipient_email character varying,
    invoice_sent_date timestamp with time zone,
    location_id integer,
    location_name character varying,
    adm_audit_flag boolean,
    qr_signed_note character varying
);


--
-- Name: booking_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_cases (
    id integer NOT NULL,
    file character varying,
    case_name character varying,
    room character varying,
    case_type character varying,
    court_level character varying,
    court_class character varying,
    reason character varying,
    interpret_for character varying,
    remote_registry character varying,
    remote_location_id integer,
    van_registry character varying,
    van_location_id integer,
    federal boolean NOT NULL,
    prosecutor character varying,
    bilingual boolean,
    interpretation_mode character varying,
    method_of_appearance public.booking_method_of_appearance DEFAULT 'In-Person'::public.booking_method_of_appearance NOT NULL,
    requested_by public.booking_requested_by DEFAULT 'Court'::public.booking_requested_by NOT NULL,
    interpreter_language_id integer,
    booking_date_id integer,
    court_class_other character varying,
    reason_other character varying,
    anticipated_start_time character varying,
    justin_no character varying,
    physical_file_id character varying,
    appearance_id character varying
);


--
-- Name: booking_cases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.booking_cases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: booking_cases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.booking_cases_id_seq OWNED BY public.booking_cases.id;


--
-- Name: booking_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_dates (
    id integer NOT NULL,
    date timestamp with time zone NOT NULL,
    interpreter_id integer,
    booking_id integer,
    start_time character varying,
    finish_time character varying,
    actual_start_time character varying,
    actual_finish_time character varying,
    approvers_initials character varying,
    cancellation_reason character varying,
    cancellation_comment character varying,
    cancellation_date timestamp with time zone,
    cancellation_time character varying,
    cancellation_fee character varying,
    comment character varying,
    method_of_appearance public.booking_method_of_appearance DEFAULT 'In-Person'::public.booking_method_of_appearance NOT NULL,
    status public.booking_status DEFAULT 'Pending'::public.booking_status NOT NULL
);


--
-- Name: booking_dates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.booking_dates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: booking_dates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.booking_dates_id_seq OWNED BY public.booking_dates.id;


--
-- Name: booking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.booking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: booking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.booking_id_seq OWNED BY public.booking.id;


--
-- Name: court_distance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.court_distance (
    id integer NOT NULL,
    court_id integer,
    interpreter_id integer,
    court_code character varying,
    court_address character varying,
    interpreter_address character varying,
    distance integer,
    duration integer,
    court_latitude double precision,
    court_longitude double precision,
    interpreter_latitude double precision,
    interpreter_longitude double precision
);


--
-- Name: court_distance_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.court_distance_backup (
    id integer NOT NULL,
    court_id integer,
    interpreter_id integer,
    court_code character varying,
    court_address character varying,
    interpreter_address character varying,
    distance integer,
    duration integer,
    court_latitude double precision,
    court_longitude double precision,
    interpreter_latitude double precision,
    interpreter_longitude double precision
);


--
-- Name: court_distance_backup_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.court_distance_backup_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: court_distance_backup_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.court_distance_backup_id_seq OWNED BY public.court_distance_backup.id;


--
-- Name: court_distance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.court_distance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: court_distance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.court_distance_id_seq OWNED BY public.court_distance.id;


--
-- Name: court_location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.court_location (
    id integer NOT NULL,
    name character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    short_description character varying,
    location_code character varying,
    city character varying,
    address_line1 character varying,
    address_line2 character varying,
    postal_code character varying,
    province character varying,
    latitude double precision,
    longitude double precision,
    geo_service character varying,
    timezone character varying
);


--
-- Name: court_location_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.court_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: court_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.court_location_id_seq OWNED BY public.court_location.id;


--
-- Name: geo_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_status (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    next_update_at timestamp with time zone,
    update_schedule character varying,
    name character varying,
    description character varying,
    update_service character varying,
    progress integer
);


--
-- Name: geo_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.geo_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: geo_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.geo_status_id_seq OWNED BY public.geo_status.id;


--
-- Name: interpreter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interpreter (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    last_name character varying,
    first_name character varying,
    address character varying,
    city character varying,
    province character varying,
    postal_code character varying,
    home_phone character varying,
    business_phone character varying,
    cell_phone character varying,
    email character varying,
    supplier_no character varying,
    site_code character varying,
    gst_no character varying,
    comments character varying,
    crc_check_date timestamp with time zone,
    crc_comment character varying,
    contract_valid boolean NOT NULL,
    contract_comment character varying,
    completed_training boolean NOT NULL,
    fax character varying,
    admin_comment character varying,
    address_longitude double precision,
    address_latitude double precision,
    geo_service character varying,
    disabled boolean NOT NULL,
    language_history json
);


--
-- Name: interpreter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.interpreter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: interpreter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.interpreter_id_seq OWNED BY public.interpreter.id;


--
-- Name: interpreter_language; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interpreter_language (
    id integer NOT NULL,
    language_id integer,
    interpreter_id integer,
    level integer,
    language character varying,
    comment_on_level character varying
);


--
-- Name: interpreter_language_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.interpreter_language_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: interpreter_language_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.interpreter_language_id_seq OWNED BY public.interpreter_language.id;


--
-- Name: language; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.language (
    id integer NOT NULL,
    name character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying
);


--
-- Name: language_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.language_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: language_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.language_id_seq OWNED BY public.language.id;


--
-- Name: oidcuser; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oidcuser (
    id integer NOT NULL,
    sub character varying,
    userinfo json,
    user_id integer
);


--
-- Name: oidcuser_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.oidcuser_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: oidcuser_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.oidcuser_id_seq OWNED BY public.oidcuser.id;


--
-- Name: pdf_prints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pdf_prints (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    data bytea,
    key character varying,
    pdf_type character varying,
    booking_id integer
);


--
-- Name: pdf_prints_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pdf_prints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pdf_prints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pdf_prints_id_seq OWNED BY public.pdf_prints.id;


--
-- Name: rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    name character varying,
    value double precision,
    previous_value double precision,
    value_changed_date timestamp with time zone DEFAULT now()
);


--
-- Name: rate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rate_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rate_id_seq OWNED BY public.rate.id;


--
-- Name: role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying,
    role_name character varying NOT NULL
);


--
-- Name: role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_id_seq OWNED BY public.role.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id integer NOT NULL,
    last_login timestamp with time zone DEFAULT now() NOT NULL,
    username character varying NOT NULL,
    first_name character varying,
    last_name character varying,
    email character varying,
    is_staff boolean NOT NULL,
    date_joined timestamp with time zone DEFAULT now() NOT NULL,
    authorization_id character varying,
    display_name character varying,
    location_id integer
);


--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: user_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_role (
    id integer NOT NULL,
    user_id integer,
    role_id integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying
);


--
-- Name: user_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_role_id_seq OWNED BY public.user_role.id;


--
-- Name: booking id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking ALTER COLUMN id SET DEFAULT nextval('public.booking_id_seq'::regclass);


--
-- Name: booking_cases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_cases ALTER COLUMN id SET DEFAULT nextval('public.booking_cases_id_seq'::regclass);


--
-- Name: booking_dates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_dates ALTER COLUMN id SET DEFAULT nextval('public.booking_dates_id_seq'::regclass);


--
-- Name: court_distance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_distance ALTER COLUMN id SET DEFAULT nextval('public.court_distance_id_seq'::regclass);


--
-- Name: court_distance_backup id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_distance_backup ALTER COLUMN id SET DEFAULT nextval('public.court_distance_backup_id_seq'::regclass);


--
-- Name: court_location id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_location ALTER COLUMN id SET DEFAULT nextval('public.court_location_id_seq'::regclass);


--
-- Name: geo_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_status ALTER COLUMN id SET DEFAULT nextval('public.geo_status_id_seq'::regclass);


--
-- Name: interpreter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interpreter ALTER COLUMN id SET DEFAULT nextval('public.interpreter_id_seq'::regclass);


--
-- Name: interpreter_language id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interpreter_language ALTER COLUMN id SET DEFAULT nextval('public.interpreter_language_id_seq'::regclass);


--
-- Name: language id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language ALTER COLUMN id SET DEFAULT nextval('public.language_id_seq'::regclass);


--
-- Name: oidcuser id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oidcuser ALTER COLUMN id SET DEFAULT nextval('public.oidcuser_id_seq'::regclass);


--
-- Name: pdf_prints id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_prints ALTER COLUMN id SET DEFAULT nextval('public.pdf_prints_id_seq'::regclass);


--
-- Name: rate id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate ALTER COLUMN id SET DEFAULT nextval('public.rate_id_seq'::regclass);


--
-- Name: role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role ALTER COLUMN id SET DEFAULT nextval('public.role_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: user_role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role ALTER COLUMN id SET DEFAULT nextval('public.user_role_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: booking_cases booking_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_cases
    ADD CONSTRAINT booking_cases_pkey PRIMARY KEY (id);


--
-- Name: booking_dates booking_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_dates
    ADD CONSTRAINT booking_dates_pkey PRIMARY KEY (id);


--
-- Name: booking booking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking
    ADD CONSTRAINT booking_pkey PRIMARY KEY (id);


--
-- Name: court_distance_backup court_distance_backup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_distance_backup
    ADD CONSTRAINT court_distance_backup_pkey PRIMARY KEY (id);


--
-- Name: court_distance court_distance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_distance
    ADD CONSTRAINT court_distance_pkey PRIMARY KEY (id);


--
-- Name: court_location court_location_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_location
    ADD CONSTRAINT court_location_name_key UNIQUE (name);


--
-- Name: court_location court_location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_location
    ADD CONSTRAINT court_location_pkey PRIMARY KEY (id);


--
-- Name: geo_status geo_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_status
    ADD CONSTRAINT geo_status_pkey PRIMARY KEY (id);


--
-- Name: interpreter_language interpreter_language_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interpreter_language
    ADD CONSTRAINT interpreter_language_pkey PRIMARY KEY (id);


--
-- Name: interpreter interpreter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interpreter
    ADD CONSTRAINT interpreter_pkey PRIMARY KEY (id);


--
-- Name: language language_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language
    ADD CONSTRAINT language_name_key UNIQUE (name);


--
-- Name: language language_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language
    ADD CONSTRAINT language_pkey PRIMARY KEY (id);


--
-- Name: oidcuser oidcuser_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oidcuser
    ADD CONSTRAINT oidcuser_pkey PRIMARY KEY (id);


--
-- Name: oidcuser oidcuser_sub_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oidcuser
    ADD CONSTRAINT oidcuser_sub_key UNIQUE (sub);


--
-- Name: pdf_prints pdf_prints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_prints
    ADD CONSTRAINT pdf_prints_pkey PRIMARY KEY (id);


--
-- Name: rate rate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate
    ADD CONSTRAINT rate_pkey PRIMARY KEY (id);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (id);


--
-- Name: role role_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_role_name_key UNIQUE (role_name);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user_role user_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_pkey PRIMARY KEY (id);


--
-- Name: ix_booking_cases_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_booking_cases_id ON public.booking_cases USING btree (id);


--
-- Name: ix_booking_dates_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_booking_dates_id ON public.booking_dates USING btree (id);


--
-- Name: ix_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_booking_id ON public.booking USING btree (id);


--
-- Name: ix_court_distance_backup_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_court_distance_backup_id ON public.court_distance_backup USING btree (id);


--
-- Name: ix_court_distance_court_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_court_distance_court_id ON public.court_distance USING btree (court_id);


--
-- Name: ix_court_distance_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_court_distance_id ON public.court_distance USING btree (id);


--
-- Name: ix_court_distance_interpreter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_court_distance_interpreter_id ON public.court_distance USING btree (interpreter_id);


--
-- Name: ix_court_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_court_location_id ON public.court_location USING btree (id);


--
-- Name: ix_geo_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_geo_status_id ON public.geo_status USING btree (id);


--
-- Name: ix_interpreter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interpreter_id ON public.interpreter USING btree (id);


--
-- Name: ix_interpreter_language_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interpreter_language_id ON public.interpreter_language USING btree (id);


--
-- Name: ix_interpreter_language_interpreter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interpreter_language_interpreter_id ON public.interpreter_language USING btree (interpreter_id);


--
-- Name: ix_interpreter_language_language_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interpreter_language_language_id ON public.interpreter_language USING btree (language_id);


--
-- Name: ix_interpreter_language_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interpreter_language_level ON public.interpreter_language USING btree (level);


--
-- Name: ix_language_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_language_id ON public.language USING btree (id);


--
-- Name: ix_oidcuser_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oidcuser_id ON public.oidcuser USING btree (id);


--
-- Name: ix_pdf_prints_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pdf_prints_id ON public.pdf_prints USING btree (id);


--
-- Name: ix_rate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rate_id ON public.rate USING btree (id);


--
-- Name: ix_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_role_id ON public.role USING btree (id);


--
-- Name: ix_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_id ON public."user" USING btree (id);


--
-- Name: ix_user_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_role_id ON public.user_role USING btree (id);


--
-- Name: booking_cases booking_cases_booking_date_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_cases
    ADD CONSTRAINT booking_cases_booking_date_id_fkey FOREIGN KEY (booking_date_id) REFERENCES public.booking_dates(id) ON DELETE CASCADE;


--
-- Name: booking_cases booking_cases_interpreter_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_cases
    ADD CONSTRAINT booking_cases_interpreter_language_id_fkey FOREIGN KEY (interpreter_language_id) REFERENCES public.interpreter_language(id) ON DELETE CASCADE;


--
-- Name: booking_dates booking_dates_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_dates
    ADD CONSTRAINT booking_dates_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.booking(id) ON DELETE CASCADE;


--
-- Name: booking booking_interpreter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking
    ADD CONSTRAINT booking_interpreter_id_fkey FOREIGN KEY (interpreter_id) REFERENCES public.interpreter(id);


--
-- Name: booking booking_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking
    ADD CONSTRAINT booking_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.court_location(id);


--
-- Name: court_distance court_distance_court_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_distance
    ADD CONSTRAINT court_distance_court_id_fkey FOREIGN KEY (court_id) REFERENCES public.court_location(id) ON DELETE CASCADE;


--
-- Name: court_distance court_distance_interpreter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_distance
    ADD CONSTRAINT court_distance_interpreter_id_fkey FOREIGN KEY (interpreter_id) REFERENCES public.interpreter(id) ON DELETE CASCADE;


--
-- Name: interpreter_language interpreter_language_interpreter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interpreter_language
    ADD CONSTRAINT interpreter_language_interpreter_id_fkey FOREIGN KEY (interpreter_id) REFERENCES public.interpreter(id) ON DELETE CASCADE;


--
-- Name: interpreter_language interpreter_language_language_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interpreter_language
    ADD CONSTRAINT interpreter_language_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.language(id) ON DELETE CASCADE;


--
-- Name: oidcuser oidcuser_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oidcuser
    ADD CONSTRAINT oidcuser_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: pdf_prints pdf_prints_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pdf_prints
    ADD CONSTRAINT pdf_prints_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.booking(id) ON DELETE CASCADE;


--
-- Name: user user_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.court_location(id);


--
-- Name: user_role user_role_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(id) ON DELETE CASCADE;


--
-- Name: user_role user_role_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


