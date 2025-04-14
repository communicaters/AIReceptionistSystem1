import { IStorage } from './storage';
import { db } from './db';
import { eq, desc, and } from 'drizzle-orm';
import { 
  users, User, InsertUser,
  sipConfig, SipConfig, InsertSipConfig,
  twilioConfig, TwilioConfig, InsertTwilioConfig,
  openPhoneConfig, OpenPhoneConfig, InsertOpenPhoneConfig,
  smtpConfig, SmtpConfig, InsertSmtpConfig,
  sendgridConfig, SendgridConfig, InsertSendgridConfig,
  mailgunConfig, MailgunConfig, InsertMailgunConfig,
  chatConfig, ChatConfig, InsertChatConfig,
  whatsappConfig, WhatsappConfig, InsertWhatsappConfig,
  calendarConfig, CalendarConfig, InsertCalendarConfig,
  productData, ProductData, InsertProductData,
  inventoryStatus, InventoryStatus, InsertInventoryStatus,
  trainingData, TrainingData, InsertTrainingData,
  intentMap, IntentMap, InsertIntentMap,
  callLogs, CallLog, InsertCallLog,
  emailLogs, EmailLog, InsertEmailLog,
  chatLogs, ChatLog, InsertChatLog,
  whatsappLogs, WhatsappLog, InsertWhatsappLog,
  meetingLogs, MeetingLog, InsertMeetingLog,
  moduleStatus, ModuleStatus, InsertModuleStatus,
  systemActivity, SystemActivity, InsertSystemActivity,
  voiceSettings, VoiceSettings, InsertVoiceSettings
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from './db';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
    console.log('Database storage initialized');
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // SIP Config
  async getSipConfig(id: number): Promise<SipConfig | undefined> {
    const result = await db.select().from(sipConfig).where(eq(sipConfig.id, id));
    return result[0];
  }

  async getSipConfigByUserId(userId: number): Promise<SipConfig | undefined> {
    const result = await db.select().from(sipConfig).where(eq(sipConfig.userId, userId));
    return result[0];
  }

  async createSipConfig(config: InsertSipConfig): Promise<SipConfig> {
    const result = await db.insert(sipConfig).values(config).returning();
    return result[0];
  }

  async updateSipConfig(id: number, config: Partial<InsertSipConfig>): Promise<SipConfig | undefined> {
    const result = await db.update(sipConfig).set(config).where(eq(sipConfig.id, id)).returning();
    return result[0];
  }

  // Twilio Config
  async getTwilioConfig(id: number): Promise<TwilioConfig | undefined> {
    const result = await db.select().from(twilioConfig).where(eq(twilioConfig.id, id));
    return result[0];
  }

  async getTwilioConfigByUserId(userId: number): Promise<TwilioConfig | undefined> {
    const result = await db.select().from(twilioConfig).where(eq(twilioConfig.userId, userId));
    return result[0];
  }

  async createTwilioConfig(config: InsertTwilioConfig): Promise<TwilioConfig> {
    const result = await db.insert(twilioConfig).values(config).returning();
    return result[0];
  }

  async updateTwilioConfig(id: number, config: Partial<InsertTwilioConfig>): Promise<TwilioConfig | undefined> {
    const result = await db.update(twilioConfig).set(config).where(eq(twilioConfig.id, id)).returning();
    return result[0];
  }

  // OpenPhone Config
  async getOpenPhoneConfig(id: number): Promise<OpenPhoneConfig | undefined> {
    const result = await db.select().from(openPhoneConfig).where(eq(openPhoneConfig.id, id));
    return result[0];
  }

  async getOpenPhoneConfigByUserId(userId: number): Promise<OpenPhoneConfig | undefined> {
    const result = await db.select().from(openPhoneConfig).where(eq(openPhoneConfig.userId, userId));
    return result[0];
  }

  async createOpenPhoneConfig(config: InsertOpenPhoneConfig): Promise<OpenPhoneConfig> {
    const result = await db.insert(openPhoneConfig).values(config).returning();
    return result[0];
  }

  async updateOpenPhoneConfig(id: number, config: Partial<InsertOpenPhoneConfig>): Promise<OpenPhoneConfig | undefined> {
    const result = await db.update(openPhoneConfig).set(config).where(eq(openPhoneConfig.id, id)).returning();
    return result[0];
  }

  // SMTP Config
  async getSmtpConfig(id: number): Promise<SmtpConfig | undefined> {
    const result = await db.select().from(smtpConfig).where(eq(smtpConfig.id, id));
    return result[0];
  }

  async getSmtpConfigByUserId(userId: number): Promise<SmtpConfig | undefined> {
    const result = await db.select().from(smtpConfig).where(eq(smtpConfig.userId, userId));
    return result[0];
  }

  async createSmtpConfig(config: InsertSmtpConfig): Promise<SmtpConfig> {
    const result = await db.insert(smtpConfig).values(config).returning();
    return result[0];
  }

  async updateSmtpConfig(id: number, config: Partial<InsertSmtpConfig>): Promise<SmtpConfig | undefined> {
    const result = await db.update(smtpConfig).set(config).where(eq(smtpConfig.id, id)).returning();
    return result[0];
  }

  // SendGrid Config
  async getSendgridConfig(id: number): Promise<SendgridConfig | undefined> {
    const result = await db.select().from(sendgridConfig).where(eq(sendgridConfig.id, id));
    return result[0];
  }

  async getSendgridConfigByUserId(userId: number): Promise<SendgridConfig | undefined> {
    const result = await db.select().from(sendgridConfig).where(eq(sendgridConfig.userId, userId));
    return result[0];
  }

  async createSendgridConfig(config: InsertSendgridConfig): Promise<SendgridConfig> {
    const result = await db.insert(sendgridConfig).values(config).returning();
    return result[0];
  }

  async updateSendgridConfig(id: number, config: Partial<InsertSendgridConfig>): Promise<SendgridConfig | undefined> {
    const result = await db.update(sendgridConfig).set(config).where(eq(sendgridConfig.id, id)).returning();
    return result[0];
  }

  // Mailgun Config
  async getMailgunConfig(id: number): Promise<MailgunConfig | undefined> {
    const result = await db.select().from(mailgunConfig).where(eq(mailgunConfig.id, id));
    return result[0];
  }

  async getMailgunConfigByUserId(userId: number): Promise<MailgunConfig | undefined> {
    const result = await db.select().from(mailgunConfig).where(eq(mailgunConfig.userId, userId));
    return result[0];
  }

  async createMailgunConfig(config: InsertMailgunConfig): Promise<MailgunConfig> {
    const result = await db.insert(mailgunConfig).values(config).returning();
    return result[0];
  }

  async updateMailgunConfig(id: number, config: Partial<InsertMailgunConfig>): Promise<MailgunConfig | undefined> {
    const result = await db.update(mailgunConfig).set(config).where(eq(mailgunConfig.id, id)).returning();
    return result[0];
  }

  // Chat Config
  async getChatConfig(id: number): Promise<ChatConfig | undefined> {
    const result = await db.select().from(chatConfig).where(eq(chatConfig.id, id));
    return result[0];
  }

  async getChatConfigByUserId(userId: number): Promise<ChatConfig | undefined> {
    const result = await db.select().from(chatConfig).where(eq(chatConfig.userId, userId));
    return result[0];
  }

  async createChatConfig(config: InsertChatConfig): Promise<ChatConfig> {
    const result = await db.insert(chatConfig).values(config).returning();
    return result[0];
  }

  async updateChatConfig(id: number, config: Partial<InsertChatConfig>): Promise<ChatConfig | undefined> {
    const result = await db.update(chatConfig).set(config).where(eq(chatConfig.id, id)).returning();
    return result[0];
  }

  // WhatsApp Config
  async getWhatsappConfig(id: number): Promise<WhatsappConfig | undefined> {
    const result = await db.select().from(whatsappConfig).where(eq(whatsappConfig.id, id));
    return result[0];
  }

  async getWhatsappConfigByUserId(userId: number): Promise<WhatsappConfig | undefined> {
    const result = await db.select().from(whatsappConfig).where(eq(whatsappConfig.userId, userId));
    return result[0];
  }

  async createWhatsappConfig(config: InsertWhatsappConfig): Promise<WhatsappConfig> {
    const result = await db.insert(whatsappConfig).values(config).returning();
    return result[0];
  }

  async updateWhatsappConfig(id: number, config: Partial<InsertWhatsappConfig>): Promise<WhatsappConfig | undefined> {
    const result = await db.update(whatsappConfig).set(config).where(eq(whatsappConfig.id, id)).returning();
    return result[0];
  }

  // Calendar Config
  async getCalendarConfig(id: number): Promise<CalendarConfig | undefined> {
    const result = await db.select().from(calendarConfig).where(eq(calendarConfig.id, id));
    return result[0];
  }

  async getCalendarConfigByUserId(userId: number): Promise<CalendarConfig | undefined> {
    const result = await db.select().from(calendarConfig).where(eq(calendarConfig.userId, userId));
    return result[0];
  }

  async createCalendarConfig(config: InsertCalendarConfig): Promise<CalendarConfig> {
    const result = await db.insert(calendarConfig).values(config).returning();
    return result[0];
  }

  async updateCalendarConfig(id: number, config: Partial<InsertCalendarConfig>): Promise<CalendarConfig | undefined> {
    const result = await db.update(calendarConfig).set(config).where(eq(calendarConfig.id, id)).returning();
    return result[0];
  }

  // Product Data
  async getProduct(id: number): Promise<ProductData | undefined> {
    const result = await db.select().from(productData).where(eq(productData.id, id));
    return result[0];
  }

  async getProductsByUserId(userId: number): Promise<ProductData[]> {
    return await db.select().from(productData).where(eq(productData.userId, userId));
  }

  async createProduct(product: InsertProductData): Promise<ProductData> {
    const result = await db.insert(productData).values(product).returning();
    return result[0];
  }

  async updateProduct(id: number, product: Partial<InsertProductData>): Promise<ProductData | undefined> {
    const result = await db.update(productData).set(product).where(eq(productData.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(productData).where(eq(productData.id, id));
    return true;
  }

  // Inventory Status
  async getInventory(id: number): Promise<InventoryStatus | undefined> {
    const result = await db.select().from(inventoryStatus).where(eq(inventoryStatus.id, id));
    return result[0];
  }

  async getInventoryByProductId(productId: number): Promise<InventoryStatus | undefined> {
    const result = await db.select().from(inventoryStatus).where(eq(inventoryStatus.productId, productId));
    return result[0];
  }

  async createInventory(inventory: InsertInventoryStatus): Promise<InventoryStatus> {
    const result = await db.insert(inventoryStatus).values(inventory).returning();
    return result[0];
  }

  async updateInventory(id: number, inventory: Partial<InsertInventoryStatus>): Promise<InventoryStatus | undefined> {
    const result = await db.update(inventoryStatus).set(inventory).where(eq(inventoryStatus.id, id)).returning();
    return result[0];
  }

  // Training Data
  async getTrainingData(id: number): Promise<TrainingData | undefined> {
    const result = await db.select().from(trainingData).where(eq(trainingData.id, id));
    return result[0];
  }

  async getTrainingDataByUserId(userId: number): Promise<TrainingData[]> {
    return await db.select().from(trainingData).where(eq(trainingData.userId, userId));
  }

  async getTrainingDataByCategory(userId: number, category: string): Promise<TrainingData[]> {
    return await db.select().from(trainingData).where(
      and(eq(trainingData.userId, userId), eq(trainingData.category, category))
    );
  }

  async createTrainingData(data: InsertTrainingData): Promise<TrainingData> {
    const result = await db.insert(trainingData).values(data).returning();
    return result[0];
  }

  async updateTrainingData(id: number, data: Partial<InsertTrainingData>): Promise<TrainingData | undefined> {
    const result = await db.update(trainingData).set(data).where(eq(trainingData.id, id)).returning();
    return result[0];
  }

  async deleteTrainingData(id: number): Promise<boolean> {
    await db.delete(trainingData).where(eq(trainingData.id, id));
    return true;
  }

  // Intent Map
  async getIntent(id: number): Promise<IntentMap | undefined> {
    const result = await db.select().from(intentMap).where(eq(intentMap.id, id));
    return result[0];
  }

  async getIntentsByUserId(userId: number): Promise<IntentMap[]> {
    return await db.select().from(intentMap).where(eq(intentMap.userId, userId));
  }

  async createIntent(intent: InsertIntentMap): Promise<IntentMap> {
    const result = await db.insert(intentMap).values(intent).returning();
    return result[0];
  }

  async updateIntent(id: number, intent: Partial<InsertIntentMap>): Promise<IntentMap | undefined> {
    const result = await db.update(intentMap).set(intent).where(eq(intentMap.id, id)).returning();
    return result[0];
  }

  async deleteIntent(id: number): Promise<boolean> {
    await db.delete(intentMap).where(eq(intentMap.id, id));
    return true;
  }

  // Call Logs
  async getCallLog(id: number): Promise<CallLog | undefined> {
    const result = await db.select().from(callLogs).where(eq(callLogs.id, id));
    return result[0];
  }

  async getCallLogsByUserId(userId: number, limit: number = 100): Promise<CallLog[]> {
    return await db.select().from(callLogs)
      .where(eq(callLogs.userId, userId))
      .orderBy(desc(callLogs.timestamp))
      .limit(limit);
  }

  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    const result = await db.insert(callLogs).values(log).returning();
    return result[0];
  }

  async updateCallLog(id: number, log: Partial<InsertCallLog>): Promise<CallLog | undefined> {
    const result = await db
      .update(callLogs)
      .set({
        ...log,
        // Ensure timestamp is preserved if not provided
        ...(log.timestamp ? {} : { timestamp: new Date() })
      })
      .where(eq(callLogs.id, id))
      .returning();
    return result[0];
  }

  // Email Logs
  async getEmailLog(id: number): Promise<EmailLog | undefined> {
    const result = await db.select().from(emailLogs).where(eq(emailLogs.id, id));
    return result[0];
  }

  async getEmailLogsByUserId(userId: number, limit: number = 100): Promise<EmailLog[]> {
    return await db.select().from(emailLogs)
      .where(eq(emailLogs.userId, userId))
      .orderBy(desc(emailLogs.timestamp))
      .limit(limit);
  }

  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const result = await db.insert(emailLogs).values(log).returning();
    return result[0];
  }

  // Chat Logs
  async getChatLog(id: number): Promise<ChatLog | undefined> {
    const result = await db.select().from(chatLogs).where(eq(chatLogs.id, id));
    return result[0];
  }

  async getChatLogsBySessionId(sessionId: string): Promise<ChatLog[]> {
    return await db.select().from(chatLogs)
      .where(eq(chatLogs.sessionId, sessionId))
      .orderBy(desc(chatLogs.timestamp));
  }

  async getChatLogsByUserId(userId: number, limit: number = 100): Promise<ChatLog[]> {
    return await db.select().from(chatLogs)
      .where(eq(chatLogs.userId, userId))
      .orderBy(desc(chatLogs.timestamp))
      .limit(limit);
  }

  async createChatLog(log: InsertChatLog): Promise<ChatLog> {
    const result = await db.insert(chatLogs).values(log).returning();
    return result[0];
  }

  // WhatsApp Logs
  async getWhatsappLog(id: number): Promise<WhatsappLog | undefined> {
    const result = await db.select().from(whatsappLogs).where(eq(whatsappLogs.id, id));
    return result[0];
  }

  async getWhatsappLogsByUserId(userId: number, limit: number = 100): Promise<WhatsappLog[]> {
    return await db.select().from(whatsappLogs)
      .where(eq(whatsappLogs.userId, userId))
      .orderBy(desc(whatsappLogs.timestamp))
      .limit(limit);
  }

  async getWhatsappLogsByPhoneNumber(userId: number, phoneNumber: string): Promise<WhatsappLog[]> {
    return await db.select().from(whatsappLogs)
      .where(and(
        eq(whatsappLogs.userId, userId),
        eq(whatsappLogs.phoneNumber, phoneNumber)
      ))
      .orderBy(desc(whatsappLogs.timestamp));
  }

  async createWhatsappLog(log: InsertWhatsappLog): Promise<WhatsappLog> {
    const result = await db.insert(whatsappLogs).values(log).returning();
    return result[0];
  }

  // Meeting Logs
  async getMeetingLog(id: number): Promise<MeetingLog | undefined> {
    const result = await db.select().from(meetingLogs).where(eq(meetingLogs.id, id));
    return result[0];
  }

  async getMeetingLogsByUserId(userId: number, limit: number = 100): Promise<MeetingLog[]> {
    return await db.select().from(meetingLogs)
      .where(eq(meetingLogs.userId, userId))
      .orderBy(desc(meetingLogs.startTime))
      .limit(limit);
  }

  async createMeetingLog(log: InsertMeetingLog): Promise<MeetingLog> {
    const result = await db.insert(meetingLogs).values(log).returning();
    return result[0];
  }

  async updateMeetingLog(id: number, log: Partial<InsertMeetingLog>): Promise<MeetingLog | undefined> {
    const result = await db.update(meetingLogs).set(log).where(eq(meetingLogs.id, id)).returning();
    return result[0];
  }

  // Module Status
  async getModuleStatus(id: number): Promise<ModuleStatus | undefined> {
    const result = await db.select().from(moduleStatus).where(eq(moduleStatus.id, id));
    return result[0];
  }

  async getModuleStatusByName(name: string): Promise<ModuleStatus | undefined> {
    const result = await db.select().from(moduleStatus).where(eq(moduleStatus.name, name));
    return result[0];
  }

  async getAllModuleStatuses(): Promise<ModuleStatus[]> {
    return await db.select().from(moduleStatus);
  }

  async createModuleStatus(status: InsertModuleStatus): Promise<ModuleStatus> {
    const result = await db.insert(moduleStatus).values(status).returning();
    return result[0];
  }

  async updateModuleStatus(id: number, status: Partial<InsertModuleStatus>): Promise<ModuleStatus | undefined> {
    const result = await db.update(moduleStatus).set(status).where(eq(moduleStatus.id, id)).returning();
    return result[0];
  }

  // System Activity
  async getSystemActivity(id: number): Promise<SystemActivity | undefined> {
    const result = await db.select().from(systemActivity).where(eq(systemActivity.id, id));
    return result[0];
  }

  async getRecentSystemActivity(limit: number = 100): Promise<SystemActivity[]> {
    return await db.select().from(systemActivity)
      .orderBy(desc(systemActivity.timestamp))
      .limit(limit);
  }

  async getSystemActivityByModule(module: string, limit: number = 100): Promise<SystemActivity[]> {
    return await db.select().from(systemActivity)
      .where(eq(systemActivity.module, module))
      .orderBy(desc(systemActivity.timestamp))
      .limit(limit);
  }

  async createSystemActivity(activity: InsertSystemActivity): Promise<SystemActivity> {
    const result = await db.insert(systemActivity).values(activity).returning();
    return result[0];
  }

  // Voice Settings
  async getVoiceSettings(id: number): Promise<VoiceSettings | undefined> {
    const result = await db.select().from(voiceSettings).where(eq(voiceSettings.id, id));
    return result[0];
  }

  async getVoiceSettingsByVoiceId(voiceId: string): Promise<VoiceSettings | undefined> {
    const result = await db.select().from(voiceSettings).where(eq(voiceSettings.voiceId, voiceId));
    return result[0];
  }

  async getVoiceSettingsByUserId(userId: number): Promise<VoiceSettings[]> {
    return await db.select().from(voiceSettings).where(eq(voiceSettings.userId, userId));
  }
  
  async getAllVoiceSettings(): Promise<VoiceSettings[]> {
    return await db.select().from(voiceSettings);
  }

  async createVoiceSettings(settings: InsertVoiceSettings): Promise<VoiceSettings> {
    const result = await db.insert(voiceSettings).values(settings).returning();
    return result[0];
  }

  async updateVoiceSettings(id: number, settings: Partial<InsertVoiceSettings>): Promise<VoiceSettings | undefined> {
    const result = await db.update(voiceSettings).set(settings).where(eq(voiceSettings.id, id)).returning();
    return result[0];
  }

  async deleteVoiceSettings(id: number): Promise<boolean> {
    await db.delete(voiceSettings).where(eq(voiceSettings.id, id));
    return true;
  }
}