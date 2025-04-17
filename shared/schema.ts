import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users and authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"), // admin, user
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("active"), // active, inactive, suspended
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
  emailVerified: boolean("email_verified").default(false),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  verificationToken: text("verification_token"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
  resetToken: true,
  resetTokenExpiry: true,
  verificationToken: true,
});

// Packages for feature management
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price"), // in cents
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Features that can be assigned to packages
export const packageFeatures = pgTable("package_features", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").notNull().references(() => packages.id, { onDelete: 'cascade' }),
  featureKey: text("feature_key").notNull(), // e.g., "email_management", "voice_call", etc.
  usageLimit: integer("usage_limit"), // null means unlimited
  isEnabled: boolean("is_enabled").notNull().default(true),
});

export const insertPackageFeatureSchema = createInsertSchema(packageFeatures).omit({
  id: true,
});

// User-package assignments
export const userPackages = pgTable("user_packages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  packageId: integer("package_id").notNull().references(() => packages.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserPackageSchema = createInsertSchema(userPackages).omit({
  id: true,
  assignedAt: true,
});

// Feature usage logs
export const featureUsageLogs = pgTable("feature_usage_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  featureKey: text("feature_key").notNull(),
  usedAt: timestamp("used_at").notNull().defaultNow(),
  usageCount: integer("usage_count").notNull().default(1),
  metadata: jsonb("metadata"),
});

export const insertFeatureUsageLogSchema = createInsertSchema(featureUsageLogs).omit({
  id: true,
  usedAt: true,
});

// Login activity tracking
export const loginActivity = pgTable("login_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  loginTime: timestamp("login_time").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull(), // success, failed
  metadata: jsonb("metadata"),
});

export const insertLoginActivitySchema = createInsertSchema(loginActivity).omit({
  id: true,
  loginTime: true,
});

// Reports cache for faster reporting
export const adminReportsCache = pgTable("admin_reports_cache", {
  id: serial("id").primaryKey(),
  reportType: text("report_type").notNull(),
  data: jsonb("data").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  filtersApplied: jsonb("filters_applied"),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertAdminReportsCacheSchema = createInsertSchema(adminReportsCache).omit({
  id: true,
  generatedAt: true,
});

// Define user relations
export const usersRelations = relations(users, ({ many }) => ({
  sipConfigs: many(sipConfig),
  twilioConfigs: many(twilioConfig),
  openPhoneConfigs: many(openPhoneConfig),
  smtpConfigs: many(smtpConfig),
  sendgridConfigs: many(sendgridConfig),
  mailgunConfigs: many(mailgunConfig),
  chatConfigs: many(chatConfig),
  whatsappConfigs: many(whatsappConfig),
  calendarConfigs: many(calendarConfig),
  products: many(productData),
  trainingData: many(trainingData),
  intents: many(intentMap),
  callLogs: many(callLogs),
  emailLogs: many(emailLogs),
  chatLogs: many(chatLogs),
  whatsappLogs: many(whatsappLogs),
  meetingLogs: many(meetingLogs),
  voiceSettings: many(voiceSettings),
  // New user management relations
  userPackages: many(userPackages),
  featureUsageLogs: many(featureUsageLogs),
  loginActivities: many(loginActivity),
}));

// Package relations
export const packagesRelations = relations(packages, ({ many }) => ({
  features: many(packageFeatures),
  users: many(userPackages),
}));

// Package features relations
export const packageFeaturesRelations = relations(packageFeatures, ({ one }) => ({
  package: one(packages, {
    fields: [packageFeatures.packageId],
    references: [packages.id],
  }),
}));

// User packages relations
export const userPackagesRelations = relations(userPackages, ({ one }) => ({
  user: one(users, {
    fields: [userPackages.userId],
    references: [users.id],
  }),
  package: one(packages, {
    fields: [userPackages.packageId],
    references: [packages.id],
  }),
}));

// Feature usage logs relations
export const featureUsageLogsRelations = relations(featureUsageLogs, ({ one }) => ({
  user: one(users, {
    fields: [featureUsageLogs.userId],
    references: [users.id],
  }),
}));

// Login activity relations
export const loginActivityRelations = relations(loginActivity, ({ one }) => ({
  user: one(users, {
    fields: [loginActivity.userId],
    references: [users.id],
  }),
}));

// Phone service configurations
export const sipConfig = pgTable("sip_phone_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  username: text("username").notNull(),
  password: text("password").notNull(),
  serverDomain: text("server_domain").notNull(),
  outboundProxy: text("outbound_proxy"),
  port: integer("port").notNull().default(5060),
  transportProtocol: text("transport_protocol").notNull().default("UDP"),
  registrationExpiryTime: integer("registration_expiry_time").notNull().default(3600),
  callerId: text("caller_id").notNull(),
  stunServer: text("stun_server"),
  dtmfMode: text("dtmf_mode").notNull().default("RFC2833"),
  audioCodecs: text("audio_codecs").array().default(['G.711', 'G.722', 'Opus']),
  voicemailUri: text("voicemail_uri"),
  sipUri: text("sip_uri"),
  keepAliveInterval: integer("keep_alive_interval").notNull().default(30),
  tlsCertPath: text("tls_cert_path"),
  callbackUrl: text("callback_url"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertSipConfigSchema = createInsertSchema(sipConfig).omit({
  id: true,
});

export const sipConfigRelations = relations(sipConfig, ({ one }) => ({
  user: one(users, {
    fields: [sipConfig.userId],
    references: [users.id],
  }),
}));

export const twilioConfig = pgTable("twilio_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountSid: text("account_sid").notNull(),
  authToken: text("auth_token").notNull(),
  phoneNumber: text("phone_number").notNull(),
  callbackUrl: text("callback_url"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertTwilioConfigSchema = createInsertSchema(twilioConfig).omit({
  id: true,
});

export const twilioConfigRelations = relations(twilioConfig, ({ one }) => ({
  user: one(users, {
    fields: [twilioConfig.userId],
    references: [users.id],
  }),
}));

export const openPhoneConfig = pgTable("openphone_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiKey: text("api_key").notNull(),
  teamId: text("team_id"), // Made optional to fix existing NULL values
  phoneNumber: text("phone_number").notNull(),
  callbackUrl: text("callback_url"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertOpenPhoneConfigSchema = createInsertSchema(openPhoneConfig).omit({
  id: true,
});

export const openPhoneConfigRelations = relations(openPhoneConfig, ({ one }) => ({
  user: one(users, {
    fields: [openPhoneConfig.userId],
    references: [users.id],
  }),
}));

// Email service configurations
export const smtpConfig = pgTable("smtp_email_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fromEmail: text("from_email").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  // IMAP configuration fields
  imapHost: text("imap_host"),
  imapPort: integer("imap_port"),
  imapSecure: boolean("imap_secure").default(true),
});

export const insertSmtpConfigSchema = createInsertSchema(smtpConfig).omit({
  id: true,
});

export const smtpConfigRelations = relations(smtpConfig, ({ one }) => ({
  user: one(users, {
    fields: [smtpConfig.userId],
    references: [users.id],
  }),
}));

export const sendgridConfig = pgTable("sendgrid_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiKey: text("api_key").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertSendgridConfigSchema = createInsertSchema(sendgridConfig).omit({
  id: true,
});

export const sendgridConfigRelations = relations(sendgridConfig, ({ one }) => ({
  user: one(users, {
    fields: [sendgridConfig.userId],
    references: [users.id],
  }),
}));

export const mailgunConfig = pgTable("mailgun_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiKey: text("api_key").notNull(),
  domain: text("domain").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  authorizedRecipients: text("authorized_recipients"), // Comma-separated list of emails authorized for sandbox domains
  isActive: boolean("is_active").notNull().default(true),
});

export const insertMailgunConfigSchema = createInsertSchema(mailgunConfig).omit({
  id: true,
});

export const mailgunConfigRelations = relations(mailgunConfig, ({ one }) => ({
  user: one(users, {
    fields: [mailgunConfig.userId],
    references: [users.id],
  }),
}));

// Chat and messaging configurations
export const chatConfig = pgTable("chat_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  widgetTitle: text("widget_title").notNull(),
  widgetColor: text("widget_color").notNull().default("#2563eb"),
  greetingMessage: text("greeting_message").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertChatConfigSchema = createInsertSchema(chatConfig).omit({
  id: true,
});

export const chatConfigRelations = relations(chatConfig, ({ one }) => ({
  user: one(users, {
    fields: [chatConfig.userId],
    references: [users.id],
  }),
}));

// Email templates
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  description: text("description"),
  category: text("category").notNull(), // general, support, sales, etc.
  isActive: boolean("is_active").notNull().default(true),
  variables: text("variables"), // JSON string of variables used in the template
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  lastUsed: true,
  createdAt: true,
  updatedAt: true,
});

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  user: one(users, {
    fields: [emailTemplates.userId],
    references: [users.id],
  }),
}));

// Scheduled emails
export const scheduledEmails = pgTable("scheduled_emails", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  to: text("to_email").notNull(),
  from: text("from_email").notNull(),
  fromName: text("from_name"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  htmlBody: text("html_body"),
  scheduledTime: timestamp("scheduled_time").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, failed
  templateId: integer("template_id").references(() => emailTemplates.id, { onDelete: 'set null' }),
  service: text("service"), // sendgrid, smtp, mailgun
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isRecurring: boolean("is_recurring").default(false),
  recurringRule: text("recurring_rule"), // iCal RRule format for recurring emails
});

export const insertScheduledEmailSchema = createInsertSchema(scheduledEmails).omit({
  id: true,
  status: true,
  sentAt: true,
  createdAt: true,
});

export const scheduledEmailsRelations = relations(scheduledEmails, ({ one }) => ({
  user: one(users, {
    fields: [scheduledEmails.userId],
    references: [users.id],
  }),
  template: one(emailTemplates, {
    fields: [scheduledEmails.templateId],
    references: [emailTemplates.id],
  }),
}));

// Zender WhatsApp configuration (used for the Zender provider)
export const whatsappConfig = pgTable("whatsapp_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiSecret: text("api_secret"),
  accountId: text("account_id"),
  zenderUrl: text("zender_url").default("https://pakgame.store/WA/Install/api"),
  webhookVerifyToken: text("webhook_verify_token"),
  webhookSecret: text("webhook_secret"), // Secret for authenticating Zender webhooks
  provider: text("provider").default("zender"), // Should always be "zender" for this table
  isActive: boolean("is_active").notNull().default(false),
  // Legacy fields that will be kept for backward compatibility
  phoneNumberId: text("phone_number_id"),
  accessToken: text("access_token"),
  businessAccountId: text("business_account_id"),
});

export const insertWhatsappConfigSchema = createInsertSchema(whatsappConfig).omit({
  id: true,
});

export const whatsappConfigRelations = relations(whatsappConfig, ({ one }) => ({
  user: one(users, {
    fields: [whatsappConfig.userId],
    references: [users.id],
  }),
}));

// Facebook WhatsApp configuration (used for the Facebook/Meta provider)
export const facebookWhatsappConfig = pgTable("facebook_whatsapp_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  phoneNumberId: text("phone_number_id").notNull(),
  accessToken: text("access_token").notNull(),
  businessAccountId: text("business_account_id").notNull(),
  webhookVerifyToken: text("webhook_verify_token"),
  webhookSecret: text("webhook_secret"), // Secret for authenticating Meta webhooks
  isActive: boolean("is_active").notNull().default(false),
});

export const insertFacebookWhatsappConfigSchema = createInsertSchema(facebookWhatsappConfig).omit({
  id: true,
});

export const facebookWhatsappConfigRelations = relations(facebookWhatsappConfig, ({ one }) => ({
  user: one(users, {
    fields: [facebookWhatsappConfig.userId],
    references: [users.id],
  }),
}));

// Calendar and scheduling configurations
export const calendarConfig = pgTable("calendar_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  googleClientId: text("google_client_id").notNull(),
  googleClientSecret: text("google_client_secret").notNull(),
  googleRefreshToken: text("google_refresh_token"),
  googleCalendarId: text("google_calendar_id"),
  availabilityStartTime: text("availability_start_time").notNull().default("09:00"),
  availabilityEndTime: text("availability_end_time").notNull().default("17:00"),
  slotDuration: integer("slot_duration").notNull().default(30), // in minutes
  isActive: boolean("is_active").notNull().default(true),
});

export const insertCalendarConfigSchema = createInsertSchema(calendarConfig).omit({
  id: true,
});

export const calendarConfigRelations = relations(calendarConfig, ({ one }) => ({
  user: one(users, {
    fields: [calendarConfig.userId],
    references: [users.id],
  }),
}));

// Product and inventory configurations
export const productData = pgTable("product_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  priceInCents: integer("price_in_cents").notNull(),
  sku: text("sku").notNull(),
});

export const insertProductDataSchema = createInsertSchema(productData).omit({
  id: true,
});

export const productDataRelations = relations(productData, ({ one, many }) => ({
  user: one(users, {
    fields: [productData.userId],
    references: [users.id],
  }),
  inventory: many(inventoryStatus),
}));

export const inventoryStatus = pgTable("inventory_status", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productData.id, { onDelete: 'cascade' }),
  quantity: integer("quantity").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull(),
});

export const insertInventoryStatusSchema = createInsertSchema(inventoryStatus).omit({
  id: true,
});

export const inventoryStatusRelations = relations(inventoryStatus, ({ one }) => ({
  product: one(productData, {
    fields: [inventoryStatus.productId],
    references: [productData.id],
  }),
}));

// AI training and models
export const trainingData = pgTable("training_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text("category").notNull(),
  content: text("content").notNull(),
  embedding: jsonb("embedding"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTrainingDataSchema = createInsertSchema(trainingData).omit({
  id: true,
});

export const trainingDataRelations = relations(trainingData, ({ one }) => ({
  user: one(users, {
    fields: [trainingData.userId],
    references: [users.id],
  }),
}));

export const intentMap = pgTable("intent_map", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  intent: text("intent").notNull(),
  examples: text("examples").array().notNull(),
});

export const insertIntentMapSchema = createInsertSchema(intentMap).omit({
  id: true,
});

export const intentMapRelations = relations(intentMap, ({ one }) => ({
  user: one(users, {
    fields: [intentMap.userId],
    references: [users.id],
  }),
}));

// Logs and monitoring
export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  phoneNumber: text("phone_number").notNull(),
  duration: integer("duration"), // in seconds
  recording: text("recording_url"),
  transcript: text("transcript"),
  sentiment: text("sentiment"),
  timestamp: timestamp("timestamp").notNull(),
  status: text("status").notNull(),
  callSid: text("call_sid"),
  service: text("service"),
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
});

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  user: one(users, {
    fields: [callLogs.userId],
    references: [users.id],
  }),
}));

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  from: text("from_email").notNull(),
  to: text("to_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  status: text("status").notNull(),
  service: text("service"), // Added to track which email service was used (smtp, mailgun, sendgrid)
  messageId: text("message_id"), // Added to uniquely identify emails for IMAP synchronization
  isReplied: boolean("is_replied").default(false), // Flag to mark if email has been replied to
  inReplyTo: text("in_reply_to"), // Message ID of the email this is replying to
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
});

// Define the email replies table for tracking relationships between emails
export const emailReplies = pgTable("email_replies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  originalEmailId: integer("original_email_id").notNull().references(() => emailLogs.id, { onDelete: 'cascade' }),
  replyEmailId: integer("reply_email_id").references(() => emailLogs.id, { onDelete: 'set null' }),
  autoGenerated: boolean("auto_generated").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  replyContent: text("reply_content").notNull(),
  replyStatus: text("reply_status").notNull().default('pending'),
  messageId: text("message_id"),
  inReplyTo: text("in_reply_to"),
  referenceIds: text("reference_ids"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
});

export const insertEmailReplySchema = createInsertSchema(emailReplies).omit({
  id: true,
  createdAt: true,
});

export const emailLogsRelations = relations(emailLogs, ({ one, many }) => ({
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id],
  }),
  // Add a relation to track replies to this email
  replies: many(emailReplies, { relationName: "original_emails" }),
  // Add a relation to track emails this is a reply to
  replyTo: many(emailReplies, { relationName: "reply_emails" }),
}));

export const emailRepliesRelations = relations(emailReplies, ({ one }) => ({
  user: one(users, {
    fields: [emailReplies.userId],
    references: [users.id],
  }),
  originalEmail: one(emailLogs, {
    fields: [emailReplies.originalEmailId],
    references: [emailLogs.id],
    relationName: "original_emails"
  }),
  replyEmail: one(emailLogs, {
    fields: [emailReplies.replyEmailId],
    references: [emailLogs.id],
    relationName: "reply_emails"
  }),
}));

export const chatLogs = pgTable("chat_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: text("session_id").notNull(),
  message: text("message").notNull(),
  sender: text("sender").notNull(), // 'user' or 'ai'
  timestamp: timestamp("timestamp").notNull(),
});

export const insertChatLogSchema = createInsertSchema(chatLogs).omit({
  id: true,
});

export const chatLogsRelations = relations(chatLogs, ({ one }) => ({
  user: one(users, {
    fields: [chatLogs.userId],
    references: [users.id],
  }),
}));

export const whatsappLogs = pgTable("whatsapp_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  phoneNumber: text("phone_number").notNull(),
  message: text("message").notNull(),
  mediaUrl: text("media_url"),
  direction: text("direction").notNull(), // 'inbound' or 'outbound'
  timestamp: timestamp("timestamp").notNull(),
  status: text("status").default('sent'), // 'sent', 'delivered', 'read', 'failed'
  externalId: text("external_id"), // ID from external service like Zender or Facebook
});

export const insertWhatsappLogSchema = createInsertSchema(whatsappLogs).omit({
  id: true,
});

export const whatsappLogsRelations = relations(whatsappLogs, ({ one }) => ({
  user: one(users, {
    fields: [whatsappLogs.userId],
    references: [users.id],
  }),
}));

export const meetingLogs = pgTable("meeting_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  attendees: text("attendees").array(),
  subject: text("subject").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  googleEventId: text("google_event_id"),
  status: text("status").notNull(),
  meetingLink: text("meeting_link"),
  timezone: text("timezone"), // Add timezone field
});

export const insertMeetingLogSchema = createInsertSchema(meetingLogs).omit({
  id: true,
});

export const meetingLogsRelations = relations(meetingLogs, ({ one }) => ({
  user: one(users, {
    fields: [meetingLogs.userId],
    references: [users.id],
  }),
}));

// System and module status
export const moduleStatus = pgTable("module_status", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull(), // 'operational', 'degraded', 'outage'
  responseTime: integer("response_time"), // in milliseconds
  successRate: integer("success_rate"), // percentage
  lastChecked: timestamp("last_checked").notNull(),
  details: text("details"),
});

export const insertModuleStatusSchema = createInsertSchema(moduleStatus).omit({
  id: true,
});

export const systemActivity = pgTable("system_activity", {
  id: serial("id").primaryKey(),
  module: text("module").notNull(),
  event: text("event").notNull(),
  status: text("status").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  details: jsonb("details"),
});

export const insertSystemActivitySchema = createInsertSchema(systemActivity).omit({
  id: true,
});

// Voice settings and TTS configuration
export const voiceSettings = pgTable("voice_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  voiceId: text("voice_id").notNull(),  // Internal voice ID (like "emma", "michael")
  displayName: text("display_name").notNull(), // Human-readable name
  externalVoiceId: text("external_voice_id").notNull(), // External API voice ID (like ElevenLabs ID)
  accent: text("accent").notNull().default("American"),
  description: text("description"),
  previewUrl: text("preview_url"),
  stability: doublePrecision("stability").notNull().default(0.5),
  similarityBoost: doublePrecision("similarity_boost").notNull().default(0.75),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertVoiceSettingsSchema = createInsertSchema(voiceSettings).omit({
  id: true,
});

export const voiceSettingsRelations = relations(voiceSettings, ({ one }) => ({
  user: one(users, {
    fields: [voiceSettings.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SipConfig = typeof sipConfig.$inferSelect;
export type InsertSipConfig = z.infer<typeof insertSipConfigSchema>;

export type TwilioConfig = typeof twilioConfig.$inferSelect;
export type InsertTwilioConfig = z.infer<typeof insertTwilioConfigSchema>;

export type OpenPhoneConfig = typeof openPhoneConfig.$inferSelect;
export type InsertOpenPhoneConfig = z.infer<typeof insertOpenPhoneConfigSchema>;

export type SmtpConfig = typeof smtpConfig.$inferSelect;
export type InsertSmtpConfig = z.infer<typeof insertSmtpConfigSchema>;

export type SendgridConfig = typeof sendgridConfig.$inferSelect;
export type InsertSendgridConfig = z.infer<typeof insertSendgridConfigSchema>;

export type MailgunConfig = typeof mailgunConfig.$inferSelect;
export type InsertMailgunConfig = z.infer<typeof insertMailgunConfigSchema>;

export type ChatConfig = typeof chatConfig.$inferSelect;
export type InsertChatConfig = z.infer<typeof insertChatConfigSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export type ScheduledEmail = typeof scheduledEmails.$inferSelect;

// WhatsApp message templates
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  description: text("description"),
  category: text("category").notNull(), // general, support, sales, etc.
  componentsJson: text("components_json"), // JSON string for template components
  isActive: boolean("is_active").notNull().default(true),
  provider: text("provider").notNull().default('facebook'), // facebook, zender
  templateId: text("template_id"), // ID from the WhatsApp service provider
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).omit({
  id: true,
  lastUsed: true,
  createdAt: true,
  updatedAt: true,
});

export const whatsappTemplatesRelations = relations(whatsappTemplates, ({ one }) => ({
  user: one(users, {
    fields: [whatsappTemplates.userId],
    references: [users.id],
  }),
}));

export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;
export type InsertScheduledEmail = z.infer<typeof insertScheduledEmailSchema>;

export type WhatsappConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsappConfig = z.infer<typeof insertWhatsappConfigSchema>;

export type FacebookWhatsappConfig = typeof facebookWhatsappConfig.$inferSelect;
export type InsertFacebookWhatsappConfig = z.infer<typeof insertFacebookWhatsappConfigSchema>;

export type CalendarConfig = typeof calendarConfig.$inferSelect;
export type InsertCalendarConfig = z.infer<typeof insertCalendarConfigSchema>;

export type ProductData = typeof productData.$inferSelect;
export type InsertProductData = z.infer<typeof insertProductDataSchema>;

export type InventoryStatus = typeof inventoryStatus.$inferSelect;
export type InsertInventoryStatus = z.infer<typeof insertInventoryStatusSchema>;

export type TrainingData = typeof trainingData.$inferSelect;
export type InsertTrainingData = z.infer<typeof insertTrainingDataSchema>;

export type IntentMap = typeof intentMap.$inferSelect;
export type InsertIntentMap = z.infer<typeof insertIntentMapSchema>;

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

export type ChatLog = typeof chatLogs.$inferSelect;
export type InsertChatLog = z.infer<typeof insertChatLogSchema>;

export type WhatsappLog = typeof whatsappLogs.$inferSelect;
export type InsertWhatsappLog = z.infer<typeof insertWhatsappLogSchema>;

export type MeetingLog = typeof meetingLogs.$inferSelect;
export type InsertMeetingLog = z.infer<typeof insertMeetingLogSchema>;

export type ModuleStatus = typeof moduleStatus.$inferSelect;
export type InsertModuleStatus = z.infer<typeof insertModuleStatusSchema>;

export type SystemActivity = typeof systemActivity.$inferSelect;
export type InsertSystemActivity = z.infer<typeof insertSystemActivitySchema>;

export type VoiceSettings = typeof voiceSettings.$inferSelect;
export type InsertVoiceSettings = z.infer<typeof insertVoiceSettingsSchema>;

// User Management Type Definitions
export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;

export type PackageFeature = typeof packageFeatures.$inferSelect;
export type InsertPackageFeature = z.infer<typeof insertPackageFeatureSchema>;

export type UserPackage = typeof userPackages.$inferSelect;
export type InsertUserPackage = z.infer<typeof insertUserPackageSchema>;

export type FeatureUsageLog = typeof featureUsageLogs.$inferSelect;
export type InsertFeatureUsageLog = z.infer<typeof insertFeatureUsageLogSchema>;

export type LoginActivity = typeof loginActivity.$inferSelect;
export type InsertLoginActivity = z.infer<typeof insertLoginActivitySchema>;

export type AdminReportsCache = typeof adminReportsCache.$inferSelect;
export type InsertAdminReportsCache = z.infer<typeof insertAdminReportsCacheSchema>;
