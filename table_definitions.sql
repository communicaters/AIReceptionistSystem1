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
CREATE SEQUENCE public.calendar_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.call_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.chat_config (
    id integer NOT NULL,
    user_id integer NOT NULL,
    widget_title text NOT NULL,
    widget_color text DEFAULT '#2563eb'::text NOT NULL,
    greeting_message text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);
CREATE SEQUENCE public.chat_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.chat_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    session_id text NOT NULL,
    message text NOT NULL,
    sender text NOT NULL,
    "timestamp" timestamp without time zone NOT NULL
);
CREATE SEQUENCE public.chat_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.email_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.feature_usage_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    feature_key text NOT NULL,
    usage_count integer DEFAULT 1 NOT NULL,
    used_at timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb
);
CREATE SEQUENCE public.feature_usage_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.intent_map (
    id integer NOT NULL,
    user_id integer NOT NULL,
    intent text NOT NULL,
    examples text[] NOT NULL
);
CREATE SEQUENCE public.intent_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.intent_map_id_seq OWNED BY public.intent_map.id;
CREATE TABLE public.inventory_status (
    id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    last_updated timestamp without time zone NOT NULL
);
CREATE SEQUENCE public.inventory_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.inventory_status_id_seq OWNED BY public.inventory_status.id;
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
CREATE SEQUENCE public.login_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.mailgun_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.meeting_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.module_status (
    id integer NOT NULL,
    name text NOT NULL,
    status text NOT NULL,
    response_time integer,
    success_rate integer,
    last_checked timestamp without time zone NOT NULL,
    details text
);
CREATE SEQUENCE public.module_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.openphone_config (
    id integer NOT NULL,
    user_id integer NOT NULL,
    api_key text NOT NULL,
    phone_number text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    callback_url text,
    team_id text
);
CREATE SEQUENCE public.openphone_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.package_features (
    id integer NOT NULL,
    package_id integer NOT NULL,
    feature_key text NOT NULL,
    usage_limit integer,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.package_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.packages (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.product_data (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    price_in_cents integer NOT NULL,
    sku text NOT NULL
);
CREATE SEQUENCE public.product_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.report_cache (
    id integer NOT NULL,
    report_type text NOT NULL,
    report_data text NOT NULL,
    generated_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL
);
CREATE SEQUENCE public.report_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.report_cache_id_seq OWNED BY public.report_cache.id;
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
CREATE SEQUENCE public.scheduled_emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
CREATE TABLE public.sendgrid_config (
    id integer NOT NULL,
    user_id integer NOT NULL,
    api_key text NOT NULL,
    from_email text NOT NULL,
    from_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);
CREATE SEQUENCE public.sendgrid_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.sip_phone_settings_id_seq
    AS integer
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
CREATE SEQUENCE public.smtp_email_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.system_activity (
    id integer NOT NULL,
    module text NOT NULL,
    event text NOT NULL,
    status text NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    details jsonb
);
CREATE SEQUENCE public.system_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.training_data (
    id integer NOT NULL,
    user_id integer NOT NULL,
    category text NOT NULL,
    content text NOT NULL,
    embedding jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.training_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.twilio_config (
    id integer NOT NULL,
    user_id integer NOT NULL,
    account_sid text NOT NULL,
    auth_token text NOT NULL,
    phone_number text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    callback_url text
);
CREATE SEQUENCE public.twilio_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.user_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.voice_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.whatsapp_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.whatsapp_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
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
CREATE SEQUENCE public.whatsapp_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
