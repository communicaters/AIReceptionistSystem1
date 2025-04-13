import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users and authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"),
  email: text("email").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  email: true,
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
}));

// Phone service configurations
export const sipConfig = pgTable("sip_phone_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  serverUrl: text("server_url").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  extension: text("extension"),
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
  userId: integer("user_id").notNull(),
  accountSid: text("account_sid").notNull(),
  authToken: text("auth_token").notNull(),
  phoneNumber: text("phone_number").notNull(),
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
  userId: integer("user_id").notNull(),
  apiKey: text("api_key").notNull(),
  phoneNumber: text("phone_number").notNull(),
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
  userId: integer("user_id").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fromEmail: text("from_email").notNull(),
  isActive: boolean("is_active").notNull().default(true),
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
  userId: integer("user_id").notNull(),
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
  userId: integer("user_id").notNull(),
  apiKey: text("api_key").notNull(),
  domain: text("domain").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
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
  userId: integer("user_id").notNull(),
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

export const whatsappConfig = pgTable("whatsapp_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  phoneNumberId: text("phone_number_id").notNull(),
  accessToken: text("access_token").notNull(),
  businessAccountId: text("business_account_id").notNull(),
  webhookVerifyToken: text("webhook_verify_token").notNull(),
  isActive: boolean("is_active").notNull().default(true),
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

// Calendar and scheduling configurations
export const calendarConfig = pgTable("calendar_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
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
  userId: integer("user_id").notNull(),
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
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull(),
});

export const insertInventoryStatusSchema = createInsertSchema(inventoryStatus).omit({
  id: true,
});

// AI training and models
export const trainingData = pgTable("training_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
});

export const insertTrainingDataSchema = createInsertSchema(trainingData).omit({
  id: true,
});

export const intentMap = pgTable("intent_map", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  intent: text("intent").notNull(),
  examples: text("examples").array().notNull(),
});

export const insertIntentMapSchema = createInsertSchema(intentMap).omit({
  id: true,
});

// Logs and monitoring
export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  duration: integer("duration"), // in seconds
  recording: text("recording_url"),
  transcript: text("transcript"),
  sentiment: text("sentiment"),
  timestamp: timestamp("timestamp").notNull(),
  status: text("status").notNull(),
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
});

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  from: text("from_email").notNull(),
  to: text("to_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  status: text("status").notNull(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
});

export const chatLogs = pgTable("chat_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  message: text("message").notNull(),
  sender: text("sender").notNull(), // 'user' or 'ai'
  timestamp: timestamp("timestamp").notNull(),
});

export const insertChatLogSchema = createInsertSchema(chatLogs).omit({
  id: true,
});

export const whatsappLogs = pgTable("whatsapp_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  message: text("message").notNull(),
  mediaUrl: text("media_url"),
  direction: text("direction").notNull(), // 'inbound' or 'outbound'
  timestamp: timestamp("timestamp").notNull(),
});

export const insertWhatsappLogSchema = createInsertSchema(whatsappLogs).omit({
  id: true,
});

export const meetingLogs = pgTable("meeting_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  attendees: text("attendees").array(),
  subject: text("subject").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  googleEventId: text("google_event_id"),
  status: text("status").notNull(),
});

export const insertMeetingLogSchema = createInsertSchema(meetingLogs).omit({
  id: true,
});

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

export type WhatsappConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsappConfig = z.infer<typeof insertWhatsappConfigSchema>;

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
