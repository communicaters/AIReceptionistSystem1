import { pgTable, serial, integer, text, boolean, timestamp, jsonb, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const calendarSettings = pgTable("calendar_settings", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	googleClientId: text("google_client_id").notNull(),
	googleClientSecret: text("google_client_secret").notNull(),
	googleRefreshToken: text("google_refresh_token"),
	googleCalendarId: text("google_calendar_id"),
	availabilityStartTime: text("availability_start_time").default('09:00').notNull(),
	availabilityEndTime: text("availability_end_time").default('17:00').notNull(),
	slotDuration: integer("slot_duration").default(30).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
});

export const callLogs = pgTable("call_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	phoneNumber: text("phone_number").notNull(),
	duration: integer(),
	recordingUrl: text("recording_url"),
	transcript: text(),
	sentiment: text(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	status: text().notNull(),
});

export const chatConfig = pgTable("chat_config", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	widgetTitle: text("widget_title").notNull(),
	widgetColor: text("widget_color").default('#2563eb').notNull(),
	greetingMessage: text("greeting_message").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
});

export const chatLogs = pgTable("chat_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	sessionId: text("session_id").notNull(),
	message: text().notNull(),
	sender: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
});

export const emailLogs = pgTable("email_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	fromEmail: text("from_email").notNull(),
	toEmail: text("to_email").notNull(),
	subject: text().notNull(),
	body: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	status: text().notNull(),
});

export const intentMap = pgTable("intent_map", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	intent: text().notNull(),
	examples: text().array().notNull(),
});

export const inventoryStatus = pgTable("inventory_status", {
	id: serial().primaryKey().notNull(),
	productId: integer("product_id").notNull(),
	quantity: integer().default(0).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).notNull(),
});

export const mailgunConfig = pgTable("mailgun_config", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	apiKey: text("api_key").notNull(),
	domain: text().notNull(),
	fromEmail: text("from_email").notNull(),
	fromName: text("from_name").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
});

export const meetingLogs = pgTable("meeting_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	attendees: text().array(),
	subject: text().notNull(),
	description: text(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	googleEventId: text("google_event_id"),
	status: text().notNull(),
});

export const moduleStatus = pgTable("module_status", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	status: text().notNull(),
	responseTime: integer("response_time"),
	successRate: integer("success_rate"),
	lastChecked: timestamp("last_checked", { mode: 'string' }).notNull(),
	details: text(),
});

export const openphoneConfig = pgTable("openphone_config", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	apiKey: text("api_key").notNull(),
	phoneNumber: text("phone_number").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
});

export const productData = pgTable("product_data", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	category: text(),
	priceInCents: integer("price_in_cents").notNull(),
	sku: text().notNull(),
});

export const sendgridConfig = pgTable("sendgrid_config", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	apiKey: text("api_key").notNull(),
	fromEmail: text("from_email").notNull(),
	fromName: text("from_name").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
});

export const sipPhoneSettings = pgTable("sip_phone_settings", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	serverUrl: text("server_url").notNull(),
	username: text().notNull(),
	password: text().notNull(),
	extension: text(),
	isActive: boolean("is_active").default(true).notNull(),
});

export const smtpEmailConfig = pgTable("smtp_email_config", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	host: text().notNull(),
	port: integer().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	fromEmail: text("from_email").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
});

export const systemActivity = pgTable("system_activity", {
	id: serial().primaryKey().notNull(),
	module: text().notNull(),
	event: text().notNull(),
	status: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	details: jsonb(),
});

export const trainingData = pgTable("training_data", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	category: text().notNull(),
	question: text().notNull(),
	answer: text().notNull(),
});

export const twilioConfig = pgTable("twilio_config", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	accountSid: text("account_sid").notNull(),
	authToken: text("auth_token").notNull(),
	phoneNumber: text("phone_number").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	fullName: text("full_name").notNull(),
	role: text().default('user').notNull(),
	email: text().notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const whatsappConfig = pgTable("whatsapp_config", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	phoneNumberId: text("phone_number_id").notNull(),
	accessToken: text("access_token").notNull(),
	businessAccountId: text("business_account_id").notNull(),
	webhookVerifyToken: text("webhook_verify_token").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
});

export const whatsappLogs = pgTable("whatsapp_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	phoneNumber: text("phone_number").notNull(),
	message: text().notNull(),
	mediaUrl: text("media_url"),
	direction: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
});
