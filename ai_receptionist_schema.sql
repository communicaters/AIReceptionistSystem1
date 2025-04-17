-- AI Receptionist Schema
-- This SQL script contains the schema definition for the AI Receptionist system
-- For setting up a local PostgreSQL database

-- Users Table
CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    company_name text,
    first_name text,
    last_name text,
    phone_number text,
    has_onboarded boolean DEFAULT false NOT NULL
);

-- Subscription Packages Table
CREATE TABLE public.subscription_packages (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price_monthly_cents integer NOT NULL,
    price_yearly_cents integer,
    features jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    limits jsonb
);

-- User Subscriptions Table
CREATE TABLE public.user_subscriptions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    package_id integer NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    status text NOT NULL,
    payment_status text,
    payment_id text,
    is_trial boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    billing_period text DEFAULT 'monthly'::text NOT NULL
);

-- WhatsApp Configuration
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

-- WhatsApp Message Logs
CREATE TABLE public.whatsapp_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    phone_number text NOT NULL,
    message text NOT NULL,
    media_url text,
    direction text NOT NULL,
    timestamp timestamp without time zone NOT NULL,
    status text DEFAULT 'sent'::text,
    external_id text
);

-- WhatsApp Templates
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

-- Calendar Settings
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

-- Meeting Logs
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

-- System Activity Logs
CREATE TABLE public.system_activity (
    id integer NOT NULL,
    user_id integer,
    module text NOT NULL,
    event text NOT NULL,
    status text NOT NULL,
    timestamp timestamp without time zone NOT NULL,
    details jsonb
);

-- Training Data
CREATE TABLE public.training_data (
    id integer NOT NULL,
    user_id integer NOT NULL,
    category text NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

-- Product Data
CREATE TABLE public.product_data (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    description text,
    price_in_cents integer NOT NULL,
    sku text,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    category text,
    inventory_count integer DEFAULT 0 NOT NULL
);

-- Login Activity
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

-- Feature Usage Logs
CREATE TABLE public.feature_usage_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    feature_key text NOT NULL,
    usage_count integer DEFAULT 1 NOT NULL,
    used_at timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb
);

-- Auto-incrementing sequence for IDs
-- Add the sequences for each table
CREATE SEQUENCE public.users_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

CREATE SEQUENCE public.subscription_packages_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.subscription_packages_id_seq OWNED BY public.subscription_packages.id;

CREATE SEQUENCE public.user_subscriptions_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.user_subscriptions_id_seq OWNED BY public.user_subscriptions.id;

CREATE SEQUENCE public.whatsapp_config_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.whatsapp_config_id_seq OWNED BY public.whatsapp_config.id;

CREATE SEQUENCE public.whatsapp_logs_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.whatsapp_logs_id_seq OWNED BY public.whatsapp_logs.id;

CREATE SEQUENCE public.whatsapp_templates_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.whatsapp_templates_id_seq OWNED BY public.whatsapp_templates.id;

CREATE SEQUENCE public.calendar_settings_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.calendar_settings_id_seq OWNED BY public.calendar_settings.id;

CREATE SEQUENCE public.meeting_logs_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.meeting_logs_id_seq OWNED BY public.meeting_logs.id;

CREATE SEQUENCE public.system_activity_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.system_activity_id_seq OWNED BY public.system_activity.id;

CREATE SEQUENCE public.training_data_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.training_data_id_seq OWNED BY public.training_data.id;

CREATE SEQUENCE public.product_data_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.product_data_id_seq OWNED BY public.product_data.id;

CREATE SEQUENCE public.login_activity_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.login_activity_id_seq OWNED BY public.login_activity.id;

CREATE SEQUENCE public.feature_usage_logs_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.feature_usage_logs_id_seq OWNED BY public.feature_usage_logs.id;

-- Set default values for ID columns
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.subscription_packages ALTER COLUMN id SET DEFAULT nextval('public.subscription_packages_id_seq'::regclass);
ALTER TABLE ONLY public.user_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.user_subscriptions_id_seq'::regclass);
ALTER TABLE ONLY public.whatsapp_config ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_config_id_seq'::regclass);
ALTER TABLE ONLY public.whatsapp_logs ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_logs_id_seq'::regclass);
ALTER TABLE ONLY public.whatsapp_templates ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_templates_id_seq'::regclass);
ALTER TABLE ONLY public.calendar_settings ALTER COLUMN id SET DEFAULT nextval('public.calendar_settings_id_seq'::regclass);
ALTER TABLE ONLY public.meeting_logs ALTER COLUMN id SET DEFAULT nextval('public.meeting_logs_id_seq'::regclass);
ALTER TABLE ONLY public.system_activity ALTER COLUMN id SET DEFAULT nextval('public.system_activity_id_seq'::regclass);
ALTER TABLE ONLY public.training_data ALTER COLUMN id SET DEFAULT nextval('public.training_data_id_seq'::regclass);
ALTER TABLE ONLY public.product_data ALTER COLUMN id SET DEFAULT nextval('public.product_data_id_seq'::regclass);
ALTER TABLE ONLY public.login_activity ALTER COLUMN id SET DEFAULT nextval('public.login_activity_id_seq'::regclass);
ALTER TABLE ONLY public.feature_usage_logs ALTER COLUMN id SET DEFAULT nextval('public.feature_usage_logs_id_seq'::regclass);

-- Primary Keys
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.subscription_packages ADD CONSTRAINT subscription_packages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_subscriptions ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.whatsapp_config ADD CONSTRAINT whatsapp_config_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.whatsapp_logs ADD CONSTRAINT whatsapp_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.whatsapp_templates ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.calendar_settings ADD CONSTRAINT calendar_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.meeting_logs ADD CONSTRAINT meeting_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_activity ADD CONSTRAINT system_activity_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.training_data ADD CONSTRAINT training_data_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.product_data ADD CONSTRAINT product_data_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.login_activity ADD CONSTRAINT login_activity_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.feature_usage_logs ADD CONSTRAINT feature_usage_logs_pkey PRIMARY KEY (id);

-- Unique Constraints
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_username_key UNIQUE (username);

-- Foreign Key Constraints
ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.subscription_packages(id);
ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.whatsapp_config
    ADD CONSTRAINT whatsapp_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.calendar_settings
    ADD CONSTRAINT calendar_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.meeting_logs
    ADD CONSTRAINT meeting_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.training_data
    ADD CONSTRAINT training_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_data
    ADD CONSTRAINT product_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.login_activity
    ADD CONSTRAINT login_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.feature_usage_logs
    ADD CONSTRAINT feature_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;