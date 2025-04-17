--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

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
-- Name: user_role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.user_role AS ENUM (
    'user',
    'admin',
    'manager'
);


ALTER TYPE public.user_role OWNER TO neondb_owner;

--
-- Name: user_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'inactive',
    'suspended'
);


ALTER TYPE public.user_status OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: calendar_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.calendar_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    google_client_id text NOT NULL,
    google_client_secret text NOT NULL,
    google_refresh_token text,
    google_calendar_id text,
    availability_start_time text DEFAULT '09:00'::text NOT NULL,
    availability_end_time text DEFAULT '17:00'::text NOT NULL,
    slot_duration integer DEFAULT 30 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.calendar_settings OWNER TO neondb_owner;

--
-- Name: calendar_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.calendar_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.calendar_settings_id_seq OWNER TO neondb_owner;

--
-- Name: calendar_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.calendar_settings_id_seq OWNED BY public.calendar_settings.id;


--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.call_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    phone_number text NOT NULL,
    duration integer,
    recording_url text,
    transcript text,
    sentiment text,
    "timestamp" timestamp without time zone NOT NULL,
    status text NOT NULL,
    call_sid text,
    service text
);


ALTER TABLE public.call_logs OWNER TO neondb_owner;

--
-- Name: call_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.call_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.call_logs_id_seq OWNER TO neondb_owner;

--
-- Name: call_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.call_logs_id_seq OWNED BY public.call_logs.id;


--
-- Name: chat_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chat_config (
    id integer NOT NULL,
    user_id integer NOT NULL,
    widget_title text NOT NULL,
    widget_color text DEFAULT '#2563eb'::text NOT NULL,
    greeting_message text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.chat_config OWNER TO neondb_owner;

--
-- Name: chat_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.chat_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_config_id_seq OWNER TO neondb_owner;

--
-- Name: chat_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.chat_config_id_seq OWNED BY public.chat_config.id;


--
-- Name: chat_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chat_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    session_id text NOT NULL,
    message text NOT NULL,
    sender text NOT NULL,
    "timestamp" timestamp without time zone NOT NULL
);


ALTER TABLE public.chat_logs OWNER TO neondb_owner;

--
-- Name: chat_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.chat_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_logs_id_seq OWNER TO neondb_owner;

--
-- Name: chat_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.chat_logs_id_seq OWNED BY public.chat_logs.id;


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    from_email text NOT NULL,
    to_email text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    status text NOT NULL,
    service text,
    message_id text
);


ALTER TABLE public.email_logs OWNER TO neondb_owner;

--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.email_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_logs_id_seq OWNER TO neondb_owner;

--
-- Name: email_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.email_logs_id_seq OWNED BY public.email_logs.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    description text,
    category text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    variables text,
    last_used timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_templates OWNER TO neondb_owner;

--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_templates_id_seq OWNER TO neondb_owner;

--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: feature_usage_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.feature_usage_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    feature_key text NOT NULL,
    usage_count integer DEFAULT 1 NOT NULL,
    used_at timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb
);


ALTER TABLE public.feature_usage_logs OWNER TO neondb_owner;

--
-- Name: feature_usage_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.feature_usage_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feature_usage_logs_id_seq OWNER TO neondb_owner;

--
-- Name: feature_usage_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.feature_usage_logs_id_seq OWNED BY public.feature_usage_logs.id;


--
-- Name: intent_map; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.intent_map (
    id integer NOT NULL,
    user_id integer NOT NULL,
    intent text NOT NULL,
    examples text[] NOT NULL
);


ALTER TABLE public.intent_map OWNER TO neondb_owner;

--
-- Name: intent_map_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.intent_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.intent_map_id_seq OWNER TO neondb_owner;

--
-- Name: intent_map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.intent_map_id_seq OWNED BY public.intent_map.id;


--
-- Name: inventory_status; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_status (
    id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    last_updated timestamp without time zone NOT NULL
);


ALTER TABLE public.inventory_status OWNER TO neondb_owner;

--
-- Name: inventory_status_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_status_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_status_id_seq OWNED BY public.inventory_status.id;


--
-- Name: login_activity; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.login_activity (
    id integer NOT NULL,
    user_id integer NOT NULL,
    ip_address text,
    user_agent text,
    login_time timestamp without time zone DEFAULT now() NOT NULL,
    status text NOT NULL,
    failure_reason text,
    metadata jsonb
);


ALTER TABLE public.login_activity OWNER TO neondb_owner;

--
-- Name: login_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.login_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.login_activity_id_seq OWNER TO neondb_owner;

--
-- Name: login_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.login_activity_id_seq OWNED BY public.login_activity.id;


--
-- Name: mailgun_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.mailgun_config (
    id integer NOT NULL,
    user_id integer NOT NULL,
    api_key text NOT NULL,
    domain text NOT NULL,
    from_email text NOT NULL,
    from_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    authorized_recipients text
);


ALTER TABLE public.mailgun_config OWNER TO neondb_owner;

--
-- Name: mailgun_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.mailgun_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mailgun_config_id_seq OWNER TO neondb_owner;

--
-- Name: mailgun_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.mailgun_config_id_seq OWNED BY public.mailgun_config.id;


--
-- Name: meeting_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.meeting_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    attendees text[],
    subject text NOT NULL,
    description text,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    google_event_id text,
    status text NOT NULL,
    meeting_link text,
    timezone text
);


ALTER TABLE public.meeting_logs OWNER TO neondb_owner;

--
-- Name: meeting_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.meeting_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.meeting_logs_id_seq OWNER TO neondb_owner;

--
-- Name: meeting_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.meeting_logs_id_seq OWNED BY public.meeting_logs.id;


--
-- Name: module_status; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.module_status (
    id integer NOT NULL,
    name text NOT NULL,
    status text NOT NULL,
    response_time integer,
    success_rate integer,
    last_checked timestamp without time zone NOT NULL,
    details text
);


ALTER TABLE public.module_status OWNER TO neondb_owner;

--
-- Name: module_status_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.module_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_status_id_seq OWNER TO neondb_owner;

--
-- Name: module_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.module_status_id_seq OWNED BY public.module_status.id;


--
-- Name: openphone_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.openphone_config (
    id integer NOT NULL,
    user_id integer NOT NULL,
    api_key text NOT NULL,
    phone_number text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    callback_url text,
    team_id text
);


ALTER TABLE public.openphone_config OWNER TO neondb_owner;

--
-- Name: openphone_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.openphone_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.openphone_config_id_seq OWNER TO neondb_owner;

--
-- Name: openphone_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.openphone_config_id_seq OWNED BY public.openphone_config.id;


--
-- Name: package_features; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.package_features (
    id integer NOT NULL,
    package_id integer NOT NULL,
    feature_key text NOT NULL,
    usage_limit integer,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.package_features OWNER TO neondb_owner;

--
-- Name: package_features_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.package_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.package_features_id_seq OWNER TO neondb_owner;

--
-- Name: package_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.package_features_id_seq OWNED BY public.package_features.id;


--
-- Name: packages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.packages (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.packages OWNER TO neondb_owner;

--
-- Name: packages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.packages_id_seq OWNER TO neondb_owner;

--
-- Name: packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.packages_id_seq OWNED BY public.packages.id;


--
-- Name: product_data; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.product_data (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    price_in_cents integer NOT NULL,
    sku text NOT NULL
);


ALTER TABLE public.product_data OWNER TO neondb_owner;

--
-- Name: product_data_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.product_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_data_id_seq OWNER TO neondb_owner;

--
-- Name: product_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.product_data_id_seq OWNED BY public.product_data.id;


--
-- Name: report_cache; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.report_cache (
    id integer NOT NULL,
    report_type text NOT NULL,
    report_data text NOT NULL,
    generated_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.report_cache OWNER TO neondb_owner;

--
-- Name: report_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.report_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_cache_id_seq OWNER TO neondb_owner;

--
-- Name: report_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.report_cache_id_seq OWNED BY public.report_cache.id;


--
-- Name: scheduled_emails; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.scheduled_emails (
    id integer NOT NULL,
    user_id integer NOT NULL,
    to_email text NOT NULL,
    from_email text NOT NULL,
    from_name text,
    subject text NOT NULL,
    body text NOT NULL,
    html_body text,
    scheduled_time timestamp without time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    template_id integer,
    service text,
    sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_recurring boolean DEFAULT false,
    recurring_rule text
);


ALTER TABLE public.scheduled_emails OWNER TO neondb_owner;

--
-- Name: scheduled_emails_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.scheduled_emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scheduled_emails_id_seq OWNER TO neondb_owner;

--
-- Name: scheduled_emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.scheduled_emails_id_seq OWNED BY public.scheduled_emails.id;


--
-- Name: sendgrid_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sendgrid_config (
    id integer NOT NULL,
    user_id integer NOT NULL,
    api_key text NOT NULL,
    from_email text NOT NULL,
    from_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.sendgrid_config OWNER TO neondb_owner;

--
-- Name: sendgrid_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sendgrid_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sendgrid_config_id_seq OWNER TO neondb_owner;

--
-- Name: sendgrid_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sendgrid_config_id_seq OWNED BY public.sendgrid_config.id;


--
-- Name: sip_phone_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sip_phone_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    server_domain text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    caller_id text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    outbound_proxy text,
    port integer DEFAULT 5060 NOT NULL,
    transport_protocol text DEFAULT 'UDP'::text NOT NULL,
    registration_expiry_time integer DEFAULT 3600 NOT NULL,
    stun_server text,
    dtmf_mode text DEFAULT 'RFC2833'::text NOT NULL,
    audio_codecs text[] DEFAULT '{G.711,G.722,Opus}'::text[],
    voicemail_uri text,
    sip_uri text,
    keep_alive_interval integer DEFAULT 30 NOT NULL,
    tls_cert_path text,
    callback_url text
);


ALTER TABLE public.sip_phone_settings OWNER TO neondb_owner;

--
-- Name: sip_phone_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sip_phone_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sip_phone_settings_id_seq OWNER TO neondb_owner;

--
-- Name: sip_phone_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sip_phone_settings_id_seq OWNED BY public.sip_phone_settings.id;


--
-- Name: smtp_email_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.smtp_email_config (
    id integer NOT NULL,
    user_id integer NOT NULL,
    host text NOT NULL,
    port integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    from_email text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    imap_host text,
    imap_port integer,
    imap_secure boolean DEFAULT true
);


ALTER TABLE public.smtp_email_config OWNER TO neondb_owner;

--
-- Name: smtp_email_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.smtp_email_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.smtp_email_config_id_seq OWNER TO neondb_owner;

--
-- Name: smtp_email_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.smtp_email_config_id_seq OWNED BY public.smtp_email_config.id;


--
-- Name: system_activity; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.system_activity (
    id integer NOT NULL,
    module text NOT NULL,
    event text NOT NULL,
    status text NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    details jsonb
);


ALTER TABLE public.system_activity OWNER TO neondb_owner;

--
-- Name: system_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.system_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_activity_id_seq OWNER TO neondb_owner;

--
-- Name: system_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.system_activity_id_seq OWNED BY public.system_activity.id;


--
-- Name: training_data; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.training_data (
    id integer NOT NULL,
    user_id integer NOT NULL,
    category text NOT NULL,
    content text NOT NULL,
    embedding jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.training_data OWNER TO neondb_owner;

--
-- Name: training_data_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.training_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.training_data_id_seq OWNER TO neondb_owner;

--
-- Name: training_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.training_data_id_seq OWNED BY public.training_data.id;


--
-- Name: twilio_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.twilio_config (
    id integer NOT NULL,
    user_id integer NOT NULL,
    account_sid text NOT NULL,
    auth_token text NOT NULL,
    phone_number text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    callback_url text
);


ALTER TABLE public.twilio_config OWNER TO neondb_owner;

--
-- Name: twilio_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.twilio_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.twilio_config_id_seq OWNER TO neondb_owner;

--
-- Name: twilio_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.twilio_config_id_seq OWNED BY public.twilio_config.id;


--
-- Name: user_packages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_packages (
    id integer NOT NULL,
    user_id integer NOT NULL,
    package_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_packages OWNER TO neondb_owner;

--
-- Name: user_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_packages_id_seq OWNER TO neondb_owner;

--
-- Name: user_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_packages_id_seq OWNED BY public.user_packages.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    email text NOT NULL,
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    verification_token text,
    reset_token text,
    reset_token_expiry timestamp without time zone,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: voice_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.voice_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    voice_id text NOT NULL,
    display_name text NOT NULL,
    external_voice_id text NOT NULL,
    accent text DEFAULT 'American'::text NOT NULL,
    description text,
    preview_url text,
    stability double precision DEFAULT 0.5 NOT NULL,
    similarity_boost double precision DEFAULT 0.75 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.voice_settings OWNER TO neondb_owner;

--
-- Name: voice_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.voice_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.voice_settings_id_seq OWNER TO neondb_owner;

--
-- Name: voice_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.voice_settings_id_seq OWNED BY public.voice_settings.id;


--
-- Name: whatsapp_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.whatsapp_config (
    id integer NOT NULL,
    user_id integer NOT NULL,
    phone_number_id text,
    access_token text,
    business_account_id text,
    webhook_verify_token text,
    is_active boolean DEFAULT true NOT NULL,
    api_secret text,
    account_id text,
    zender_url text DEFAULT 'https://pakgame.store/WA/Install/api'::text,
    provider text DEFAULT 'zender'::text,
    webhook_secret text
);


ALTER TABLE public.whatsapp_config OWNER TO neondb_owner;

--
-- Name: whatsapp_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.whatsapp_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_config_id_seq OWNER TO neondb_owner;

--
-- Name: whatsapp_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.whatsapp_config_id_seq OWNED BY public.whatsapp_config.id;


--
-- Name: whatsapp_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.whatsapp_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    phone_number text NOT NULL,
    message text NOT NULL,
    media_url text,
    direction text NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    status text DEFAULT 'sent'::text,
    external_id text
);


ALTER TABLE public.whatsapp_logs OWNER TO neondb_owner;

--
-- Name: whatsapp_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.whatsapp_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_logs_id_seq OWNER TO neondb_owner;

--
-- Name: whatsapp_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.whatsapp_logs_id_seq OWNED BY public.whatsapp_logs.id;


--
-- Name: whatsapp_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.whatsapp_templates (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    content text NOT NULL,
    description text,
    category text NOT NULL,
    components_json text,
    is_active boolean DEFAULT true NOT NULL,
    provider text DEFAULT 'facebook'::text NOT NULL,
    template_id text,
    last_used timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.whatsapp_templates OWNER TO neondb_owner;

--
-- Name: whatsapp_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.whatsapp_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_templates_id_seq OWNER TO neondb_owner;

--
-- Name: whatsapp_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.whatsapp_templates_id_seq OWNED BY public.whatsapp_templates.id;


--
-- Name: calendar_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.calendar_settings ALTER COLUMN id SET DEFAULT nextval('public.calendar_settings_id_seq'::regclass);


--
-- Name: call_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_logs ALTER COLUMN id SET DEFAULT nextval('public.call_logs_id_seq'::regclass);


--
-- Name: chat_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_config ALTER COLUMN id SET DEFAULT nextval('public.chat_config_id_seq'::regclass);


--
-- Name: chat_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_logs ALTER COLUMN id SET DEFAULT nextval('public.chat_logs_id_seq'::regclass);


--
-- Name: email_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_logs ALTER COLUMN id SET DEFAULT nextval('public.email_logs_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: feature_usage_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feature_usage_logs ALTER COLUMN id SET DEFAULT nextval('public.feature_usage_logs_id_seq'::regclass);


--
-- Name: intent_map id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.intent_map ALTER COLUMN id SET DEFAULT nextval('public.intent_map_id_seq'::regclass);


--
-- Name: inventory_status id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_status ALTER COLUMN id SET DEFAULT nextval('public.inventory_status_id_seq'::regclass);


--
-- Name: login_activity id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.login_activity ALTER COLUMN id SET DEFAULT nextval('public.login_activity_id_seq'::regclass);


--
-- Name: mailgun_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.mailgun_config ALTER COLUMN id SET DEFAULT nextval('public.mailgun_config_id_seq'::regclass);


--
-- Name: meeting_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.meeting_logs ALTER COLUMN id SET DEFAULT nextval('public.meeting_logs_id_seq'::regclass);


--
-- Name: module_status id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.module_status ALTER COLUMN id SET DEFAULT nextval('public.module_status_id_seq'::regclass);


--
-- Name: openphone_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.openphone_config ALTER COLUMN id SET DEFAULT nextval('public.openphone_config_id_seq'::regclass);


--
-- Name: package_features id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.package_features ALTER COLUMN id SET DEFAULT nextval('public.package_features_id_seq'::regclass);


--
-- Name: packages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packages ALTER COLUMN id SET DEFAULT nextval('public.packages_id_seq'::regclass);


--
-- Name: product_data id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_data ALTER COLUMN id SET DEFAULT nextval('public.product_data_id_seq'::regclass);


--
-- Name: report_cache id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.report_cache ALTER COLUMN id SET DEFAULT nextval('public.report_cache_id_seq'::regclass);


--
-- Name: scheduled_emails id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scheduled_emails ALTER COLUMN id SET DEFAULT nextval('public.scheduled_emails_id_seq'::regclass);


--
-- Name: sendgrid_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sendgrid_config ALTER COLUMN id SET DEFAULT nextval('public.sendgrid_config_id_seq'::regclass);


--
-- Name: sip_phone_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sip_phone_settings ALTER COLUMN id SET DEFAULT nextval('public.sip_phone_settings_id_seq'::regclass);


--
-- Name: smtp_email_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.smtp_email_config ALTER COLUMN id SET DEFAULT nextval('public.smtp_email_config_id_seq'::regclass);


--
-- Name: system_activity id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_activity ALTER COLUMN id SET DEFAULT nextval('public.system_activity_id_seq'::regclass);


--
-- Name: training_data id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.training_data ALTER COLUMN id SET DEFAULT nextval('public.training_data_id_seq'::regclass);


--
-- Name: twilio_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.twilio_config ALTER COLUMN id SET DEFAULT nextval('public.twilio_config_id_seq'::regclass);


--
-- Name: user_packages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_packages ALTER COLUMN id SET DEFAULT nextval('public.user_packages_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: voice_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.voice_settings ALTER COLUMN id SET DEFAULT nextval('public.voice_settings_id_seq'::regclass);


--
-- Name: whatsapp_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_config ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_config_id_seq'::regclass);


--
-- Name: whatsapp_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_logs ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_logs_id_seq'::regclass);


--
-- Name: whatsapp_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_templates ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_templates_id_seq'::regclass);


--
-- Name: calendar_settings calendar_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.calendar_settings
    ADD CONSTRAINT calendar_settings_pkey PRIMARY KEY (id);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: chat_config chat_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_config
    ADD CONSTRAINT chat_config_pkey PRIMARY KEY (id);


--
-- Name: chat_logs chat_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_logs
    ADD CONSTRAINT chat_logs_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: feature_usage_logs feature_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feature_usage_logs
    ADD CONSTRAINT feature_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: intent_map intent_map_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.intent_map
    ADD CONSTRAINT intent_map_pkey PRIMARY KEY (id);


--
-- Name: inventory_status inventory_status_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_status
    ADD CONSTRAINT inventory_status_pkey PRIMARY KEY (id);


--
-- Name: login_activity login_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.login_activity
    ADD CONSTRAINT login_activity_pkey PRIMARY KEY (id);


--
-- Name: mailgun_config mailgun_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.mailgun_config
    ADD CONSTRAINT mailgun_config_pkey PRIMARY KEY (id);


--
-- Name: meeting_logs meeting_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.meeting_logs
    ADD CONSTRAINT meeting_logs_pkey PRIMARY KEY (id);


--
-- Name: module_status module_status_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.module_status
    ADD CONSTRAINT module_status_pkey PRIMARY KEY (id);


--
-- Name: openphone_config openphone_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.openphone_config
    ADD CONSTRAINT openphone_config_pkey PRIMARY KEY (id);


--
-- Name: package_features package_features_package_id_feature_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.package_features
    ADD CONSTRAINT package_features_package_id_feature_key_key UNIQUE (package_id, feature_key);


--
-- Name: package_features package_features_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.package_features
    ADD CONSTRAINT package_features_pkey PRIMARY KEY (id);


--
-- Name: packages packages_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_name_key UNIQUE (name);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: product_data product_data_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_data
    ADD CONSTRAINT product_data_pkey PRIMARY KEY (id);


--
-- Name: report_cache report_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.report_cache
    ADD CONSTRAINT report_cache_pkey PRIMARY KEY (id);


--
-- Name: scheduled_emails scheduled_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scheduled_emails
    ADD CONSTRAINT scheduled_emails_pkey PRIMARY KEY (id);


--
-- Name: sendgrid_config sendgrid_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sendgrid_config
    ADD CONSTRAINT sendgrid_config_pkey PRIMARY KEY (id);


--
-- Name: sip_phone_settings sip_phone_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sip_phone_settings
    ADD CONSTRAINT sip_phone_settings_pkey PRIMARY KEY (id);


--
-- Name: smtp_email_config smtp_email_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.smtp_email_config
    ADD CONSTRAINT smtp_email_config_pkey PRIMARY KEY (id);


--
-- Name: system_activity system_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_activity
    ADD CONSTRAINT system_activity_pkey PRIMARY KEY (id);


--
-- Name: training_data training_data_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.training_data
    ADD CONSTRAINT training_data_pkey PRIMARY KEY (id);


--
-- Name: twilio_config twilio_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.twilio_config
    ADD CONSTRAINT twilio_config_pkey PRIMARY KEY (id);


--
-- Name: user_packages user_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_packages
    ADD CONSTRAINT user_packages_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: voice_settings voice_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.voice_settings
    ADD CONSTRAINT voice_settings_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_config whatsapp_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_config
    ADD CONSTRAINT whatsapp_config_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_logs whatsapp_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_templates whatsapp_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);


--
-- Name: calendar_settings calendar_settings_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.calendar_settings
    ADD CONSTRAINT calendar_settings_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: call_logs call_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_config chat_config_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_config
    ADD CONSTRAINT chat_config_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_logs chat_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_logs
    ADD CONSTRAINT chat_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_logs email_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_templates email_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: feature_usage_logs feature_usage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feature_usage_logs
    ADD CONSTRAINT feature_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: intent_map intent_map_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.intent_map
    ADD CONSTRAINT intent_map_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: inventory_status inventory_status_product_id_product_data_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_status
    ADD CONSTRAINT inventory_status_product_id_product_data_id_fk FOREIGN KEY (product_id) REFERENCES public.product_data(id) ON DELETE CASCADE;


--
-- Name: login_activity login_activity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.login_activity
    ADD CONSTRAINT login_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mailgun_config mailgun_config_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.mailgun_config
    ADD CONSTRAINT mailgun_config_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: meeting_logs meeting_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.meeting_logs
    ADD CONSTRAINT meeting_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: openphone_config openphone_config_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.openphone_config
    ADD CONSTRAINT openphone_config_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: package_features package_features_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.package_features
    ADD CONSTRAINT package_features_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE;


--
-- Name: product_data product_data_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_data
    ADD CONSTRAINT product_data_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scheduled_emails scheduled_emails_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scheduled_emails
    ADD CONSTRAINT scheduled_emails_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id) ON DELETE SET NULL;


--
-- Name: scheduled_emails scheduled_emails_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scheduled_emails
    ADD CONSTRAINT scheduled_emails_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sendgrid_config sendgrid_config_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sendgrid_config
    ADD CONSTRAINT sendgrid_config_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sip_phone_settings sip_phone_settings_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sip_phone_settings
    ADD CONSTRAINT sip_phone_settings_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: smtp_email_config smtp_email_config_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.smtp_email_config
    ADD CONSTRAINT smtp_email_config_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: training_data training_data_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.training_data
    ADD CONSTRAINT training_data_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: twilio_config twilio_config_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.twilio_config
    ADD CONSTRAINT twilio_config_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_packages user_packages_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_packages
    ADD CONSTRAINT user_packages_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE;


--
-- Name: user_packages user_packages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_packages
    ADD CONSTRAINT user_packages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: voice_settings voice_settings_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.voice_settings
    ADD CONSTRAINT voice_settings_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_config whatsapp_config_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_config
    ADD CONSTRAINT whatsapp_config_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_logs whatsapp_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_templates whatsapp_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

