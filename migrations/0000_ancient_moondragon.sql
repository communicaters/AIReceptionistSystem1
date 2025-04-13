-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "calendar_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"google_client_id" text NOT NULL,
	"google_client_secret" text NOT NULL,
	"google_refresh_token" text,
	"google_calendar_id" text,
	"availability_start_time" text DEFAULT '09:00' NOT NULL,
	"availability_end_time" text DEFAULT '17:00' NOT NULL,
	"slot_duration" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"phone_number" text NOT NULL,
	"duration" integer,
	"recording_url" text,
	"transcript" text,
	"sentiment" text,
	"timestamp" timestamp NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"widget_title" text NOT NULL,
	"widget_color" text DEFAULT '#2563eb' NOT NULL,
	"greeting_message" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_id" text NOT NULL,
	"message" text NOT NULL,
	"sender" text NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"from_email" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"intent" text NOT NULL,
	"examples" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailgun_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"api_key" text NOT NULL,
	"domain" text NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"attendees" text[],
	"subject" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"google_event_id" text,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"response_time" integer,
	"success_rate" integer,
	"last_checked" timestamp NOT NULL,
	"details" text
);
--> statement-breakpoint
CREATE TABLE "openphone_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"api_key" text NOT NULL,
	"phone_number" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"price_in_cents" integer NOT NULL,
	"sku" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sendgrid_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"api_key" text NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sip_phone_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"server_url" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"extension" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smtp_email_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"from_email" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"module" text NOT NULL,
	"event" text NOT NULL,
	"status" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "training_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "twilio_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_sid" text NOT NULL,
	"auth_token" text NOT NULL,
	"phone_number" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"phone_number_id" text NOT NULL,
	"access_token" text NOT NULL,
	"business_account_id" text NOT NULL,
	"webhook_verify_token" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"phone_number" text NOT NULL,
	"message" text NOT NULL,
	"media_url" text,
	"direction" text NOT NULL,
	"timestamp" timestamp NOT NULL
);

*/