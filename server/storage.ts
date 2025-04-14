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

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // SIP Config
  getSipConfig(id: number): Promise<SipConfig | undefined>;
  getSipConfigByUserId(userId: number): Promise<SipConfig | undefined>;
  createSipConfig(config: InsertSipConfig): Promise<SipConfig>;
  updateSipConfig(id: number, config: Partial<InsertSipConfig>): Promise<SipConfig | undefined>;

  // Twilio Config
  getTwilioConfig(id: number): Promise<TwilioConfig | undefined>;
  getTwilioConfigByUserId(userId: number): Promise<TwilioConfig | undefined>;
  createTwilioConfig(config: InsertTwilioConfig): Promise<TwilioConfig>;
  updateTwilioConfig(id: number, config: Partial<InsertTwilioConfig>): Promise<TwilioConfig | undefined>;

  // OpenPhone Config
  getOpenPhoneConfig(id: number): Promise<OpenPhoneConfig | undefined>;
  getOpenPhoneConfigByUserId(userId: number): Promise<OpenPhoneConfig | undefined>;
  createOpenPhoneConfig(config: InsertOpenPhoneConfig): Promise<OpenPhoneConfig>;
  updateOpenPhoneConfig(id: number, config: Partial<InsertOpenPhoneConfig>): Promise<OpenPhoneConfig | undefined>;

  // SMTP Config
  getSmtpConfig(id: number): Promise<SmtpConfig | undefined>;
  getSmtpConfigByUserId(userId: number): Promise<SmtpConfig | undefined>;
  createSmtpConfig(config: InsertSmtpConfig): Promise<SmtpConfig>;
  updateSmtpConfig(id: number, config: Partial<InsertSmtpConfig>): Promise<SmtpConfig | undefined>;

  // SendGrid Config
  getSendgridConfig(id: number): Promise<SendgridConfig | undefined>;
  getSendgridConfigByUserId(userId: number): Promise<SendgridConfig | undefined>;
  createSendgridConfig(config: InsertSendgridConfig): Promise<SendgridConfig>;
  updateSendgridConfig(id: number, config: Partial<InsertSendgridConfig>): Promise<SendgridConfig | undefined>;

  // Mailgun Config
  getMailgunConfig(id: number): Promise<MailgunConfig | undefined>;
  getMailgunConfigByUserId(userId: number): Promise<MailgunConfig | undefined>;
  createMailgunConfig(config: InsertMailgunConfig): Promise<MailgunConfig>;
  updateMailgunConfig(id: number, config: Partial<InsertMailgunConfig>): Promise<MailgunConfig | undefined>;

  // Chat Config
  getChatConfig(id: number): Promise<ChatConfig | undefined>;
  getChatConfigByUserId(userId: number): Promise<ChatConfig | undefined>;
  createChatConfig(config: InsertChatConfig): Promise<ChatConfig>;
  updateChatConfig(id: number, config: Partial<InsertChatConfig>): Promise<ChatConfig | undefined>;

  // WhatsApp Config
  getWhatsappConfig(id: number): Promise<WhatsappConfig | undefined>;
  getWhatsappConfigByUserId(userId: number): Promise<WhatsappConfig | undefined>;
  createWhatsappConfig(config: InsertWhatsappConfig): Promise<WhatsappConfig>;
  updateWhatsappConfig(id: number, config: Partial<InsertWhatsappConfig>): Promise<WhatsappConfig | undefined>;

  // Calendar Config
  getCalendarConfig(id: number): Promise<CalendarConfig | undefined>;
  getCalendarConfigByUserId(userId: number): Promise<CalendarConfig | undefined>;
  createCalendarConfig(config: InsertCalendarConfig): Promise<CalendarConfig>;
  updateCalendarConfig(id: number, config: Partial<InsertCalendarConfig>): Promise<CalendarConfig | undefined>;

  // Product Data
  getProduct(id: number): Promise<ProductData | undefined>;
  getProductsByUserId(userId: number): Promise<ProductData[]>;
  createProduct(product: InsertProductData): Promise<ProductData>;
  updateProduct(id: number, product: Partial<InsertProductData>): Promise<ProductData | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Inventory Status
  getInventory(id: number): Promise<InventoryStatus | undefined>;
  getInventoryByProductId(productId: number): Promise<InventoryStatus | undefined>;
  createInventory(inventory: InsertInventoryStatus): Promise<InventoryStatus>;
  updateInventory(id: number, inventory: Partial<InsertInventoryStatus>): Promise<InventoryStatus | undefined>;

  // Training Data
  getTrainingData(id: number): Promise<TrainingData | undefined>;
  getTrainingDataByUserId(userId: number): Promise<TrainingData[]>;
  getTrainingDataByCategory(userId: number, category: string): Promise<TrainingData[]>;
  createTrainingData(data: InsertTrainingData): Promise<TrainingData>;
  updateTrainingData(id: number, data: Partial<InsertTrainingData>): Promise<TrainingData | undefined>;
  deleteTrainingData(id: number): Promise<boolean>;

  // Intent Map
  getIntent(id: number): Promise<IntentMap | undefined>;
  getIntentsByUserId(userId: number): Promise<IntentMap[]>;
  createIntent(intent: InsertIntentMap): Promise<IntentMap>;
  updateIntent(id: number, intent: Partial<InsertIntentMap>): Promise<IntentMap | undefined>;
  deleteIntent(id: number): Promise<boolean>;

  // Call Logs
  getCallLog(id: number): Promise<CallLog | undefined>;
  getCallLogsByUserId(userId: number, limit?: number): Promise<CallLog[]>;
  createCallLog(log: InsertCallLog): Promise<CallLog>;

  // Email Logs
  getEmailLog(id: number): Promise<EmailLog | undefined>;
  getEmailLogsByUserId(userId: number, limit?: number): Promise<EmailLog[]>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;

  // Chat Logs
  getChatLog(id: number): Promise<ChatLog | undefined>;
  getChatLogsBySessionId(sessionId: string): Promise<ChatLog[]>;
  getChatLogsByUserId(userId: number, limit?: number): Promise<ChatLog[]>;
  createChatLog(log: InsertChatLog): Promise<ChatLog>;

  // WhatsApp Logs
  getWhatsappLog(id: number): Promise<WhatsappLog | undefined>;
  getWhatsappLogsByUserId(userId: number, limit?: number): Promise<WhatsappLog[]>;
  getWhatsappLogsByPhoneNumber(userId: number, phoneNumber: string): Promise<WhatsappLog[]>;
  createWhatsappLog(log: InsertWhatsappLog): Promise<WhatsappLog>;

  // Meeting Logs
  getMeetingLog(id: number): Promise<MeetingLog | undefined>;
  getMeetingLogsByUserId(userId: number, limit?: number): Promise<MeetingLog[]>;
  createMeetingLog(log: InsertMeetingLog): Promise<MeetingLog>;
  updateMeetingLog(id: number, log: Partial<InsertMeetingLog>): Promise<MeetingLog | undefined>;

  // Module Status
  getModuleStatus(id: number): Promise<ModuleStatus | undefined>;
  getModuleStatusByName(name: string): Promise<ModuleStatus | undefined>;
  getAllModuleStatuses(): Promise<ModuleStatus[]>;
  createModuleStatus(status: InsertModuleStatus): Promise<ModuleStatus>;
  updateModuleStatus(id: number, status: Partial<InsertModuleStatus>): Promise<ModuleStatus | undefined>;

  // System Activity
  getSystemActivity(id: number): Promise<SystemActivity | undefined>;
  getRecentSystemActivity(limit?: number): Promise<SystemActivity[]>;
  getSystemActivityByModule(module: string, limit?: number): Promise<SystemActivity[]>;
  createSystemActivity(activity: InsertSystemActivity): Promise<SystemActivity>;
  
  // Voice Settings
  getVoiceSettings(id: number): Promise<VoiceSettings | undefined>;
  getVoiceSettingsByVoiceId(voiceId: string): Promise<VoiceSettings | undefined>;
  getVoiceSettingsByUserId(userId: number): Promise<VoiceSettings[]>;
  getAllVoiceSettings(): Promise<VoiceSettings[]>;
  createVoiceSettings(settings: InsertVoiceSettings): Promise<VoiceSettings>;
  updateVoiceSettings(id: number, settings: Partial<InsertVoiceSettings>): Promise<VoiceSettings | undefined>;
  deleteVoiceSettings(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sipConfigs: Map<number, SipConfig>;
  private twilioConfigs: Map<number, TwilioConfig>;
  private openPhoneConfigs: Map<number, OpenPhoneConfig>;
  private smtpConfigs: Map<number, SmtpConfig>;
  private sendgridConfigs: Map<number, SendgridConfig>;
  private mailgunConfigs: Map<number, MailgunConfig>;
  private chatConfigs: Map<number, ChatConfig>;
  private whatsappConfigs: Map<number, WhatsappConfig>;
  private calendarConfigs: Map<number, CalendarConfig>;
  private products: Map<number, ProductData>;
  private inventories: Map<number, InventoryStatus>;
  private trainingDatas: Map<number, TrainingData>;
  private intents: Map<number, IntentMap>;
  private callLogs: Map<number, CallLog>;
  private emailLogs: Map<number, EmailLog>;
  private chatLogs: Map<number, ChatLog>;
  private whatsappLogs: Map<number, WhatsappLog>;
  private meetingLogs: Map<number, MeetingLog>;
  private moduleStatuses: Map<number, ModuleStatus>;
  private systemActivities: Map<number, SystemActivity>;
  private voiceSettings: Map<number, VoiceSettings>;

  private currentIds: {
    users: number;
    sipConfigs: number;
    twilioConfigs: number;
    openPhoneConfigs: number;
    smtpConfigs: number;
    sendgridConfigs: number;
    mailgunConfigs: number;
    chatConfigs: number;
    whatsappConfigs: number;
    calendarConfigs: number;
    products: number;
    inventories: number;
    trainingDatas: number;
    intents: number;
    callLogs: number;
    emailLogs: number;
    chatLogs: number;
    whatsappLogs: number;
    meetingLogs: number;
    moduleStatuses: number;
    systemActivities: number;
  };

  constructor() {
    // Initialize maps
    this.users = new Map();
    this.sipConfigs = new Map();
    this.twilioConfigs = new Map();
    this.openPhoneConfigs = new Map();
    this.smtpConfigs = new Map();
    this.sendgridConfigs = new Map();
    this.mailgunConfigs = new Map();
    this.chatConfigs = new Map();
    this.whatsappConfigs = new Map();
    this.calendarConfigs = new Map();
    this.products = new Map();
    this.inventories = new Map();
    this.trainingDatas = new Map();
    this.intents = new Map();
    this.callLogs = new Map();
    this.emailLogs = new Map();
    this.chatLogs = new Map();
    this.whatsappLogs = new Map();
    this.meetingLogs = new Map();
    this.moduleStatuses = new Map();
    this.systemActivities = new Map();
    this.voiceSettings = new Map();

    // Initialize IDs
    this.currentIds = {
      users: 1,
      sipConfigs: 1,
      twilioConfigs: 1,
      openPhoneConfigs: 1,
      smtpConfigs: 1,
      sendgridConfigs: 1,
      mailgunConfigs: 1,
      chatConfigs: 1,
      whatsappConfigs: 1,
      calendarConfigs: 1,
      products: 1,
      inventories: 1,
      trainingDatas: 1,
      intents: 1,
      callLogs: 1,
      emailLogs: 1,
      chatLogs: 1,
      whatsappLogs: 1,
      meetingLogs: 1,
      moduleStatuses: 1,
      systemActivities: 1,
      voiceSettings: 1,
    };

    // Initialize default data
    this.initializeDefault();
  }

  private initializeDefault(): void {
    // Create admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: "admin123", // In a real app, this would be hashed
      fullName: "Admin User",
      role: "admin",
      email: "admin@example.com",
    };
    this.createUser(adminUser);

    // Create default module statuses
    const modules = [
      {
        name: "Voice Call Handling",
        status: "operational",
        responseTime: 128,
        successRate: 98,
      },
      {
        name: "Email Management",
        status: "operational",
        responseTime: 95,
        successRate: 99,
      },
      {
        name: "Live Chat",
        status: "degraded",
        responseTime: 342,
        successRate: 91,
      },
      {
        name: "WhatsApp Business",
        status: "outage",
        responseTime: null,
        successRate: 0,
      },
      {
        name: "Calendar & Scheduling",
        status: "operational",
        responseTime: 112,
        successRate: 97,
      },
      {
        name: "Product & Pricing",
        status: "operational",
        responseTime: 154,
        successRate: 99,
      },
      {
        name: "AI Core & Training",
        status: "operational",
        responseTime: 88,
        successRate: 95,
      },
      {
        name: "Speech Engines",
        status: "operational",
        responseTime: 105,
        successRate: 96,
      },
    ];

    for (const module of modules) {
      this.createModuleStatus({
        name: module.name,
        status: module.status,
        responseTime: module.responseTime,
        successRate: module.successRate,
        lastChecked: new Date(),
        details: null,
      });
    }

    // Create default system activities
    const activities = [
      {
        module: "Voice Call",
        event: "Inbound Call Handled",
        status: "Completed",
        details: { phoneNumber: "+1234567890", duration: 124 }
      },
      {
        module: "Calendar",
        event: "Meeting Scheduled",
        status: "Confirmed",
        details: { attendee: "john.doe@example.com", subject: "Product Demo" }
      },
      {
        module: "Email",
        event: "Email Response Sent",
        status: "Delivered",
        details: { recipient: "client@example.com", subject: "Re: Product Inquiry" }
      },
      {
        module: "WhatsApp",
        event: "WhatsApp Connection Failed",
        status: "Error",
        details: { error: "Authentication failed", code: "AUTH_ERROR" }
      },
      {
        module: "AI Core",
        event: "AI Training Completed",
        status: "Completed",
        details: { trainingTime: "45 minutes", accuracy: "92%" }
      },
    ];

    let timestamp = new Date();
    for (const activity of activities) {
      timestamp = new Date(timestamp.getTime() - 15 * 60000); // 15 minutes earlier for each
      this.createSystemActivity({
        module: activity.module,
        event: activity.event,
        status: activity.status,
        timestamp,
        details: activity.details,
      });
    }

    // Initialize demo configs
    this.createTwilioConfig({
      userId: 1,
      accountSid: "AC1234567890abcdef1234567890abcdef",
      authToken: "abcdef1234567890abcdef1234567890",
      phoneNumber: "+15551234567",
      isActive: true,
    });

    this.createSendgridConfig({
      userId: 1,
      apiKey: "SG.1234567890abcdef1234567890abcdef",
      fromEmail: "receptionist@example.com",
      fromName: "AI Receptionist",
      isActive: true,
    });

    this.createChatConfig({
      userId: 1,
      widgetTitle: "Company Assistant",
      widgetColor: "#2563eb",
      greetingMessage: "Hello! How can I assist you today?",
      isActive: true,
    });

    this.createCalendarConfig({
      userId: 1,
      googleClientId: "1234567890-abcdef1234567890abcdef1234567890.apps.googleusercontent.com",
      googleClientSecret: "abcdef1234567890abcdef",
      availabilityStartTime: "09:00",
      availabilityEndTime: "17:00",
      slotDuration: 30,
      isActive: true,
    });

    // Create sample products
    const products = [
      {
        name: "Basic Widget",
        description: "An entry-level widget for everyday use",
        category: "Widgets",
        priceInCents: 1999,
        sku: "W-BASIC-001",
      },
      {
        name: "Premium Widget",
        description: "A high-quality widget with additional features",
        category: "Widgets",
        priceInCents: 4999,
        sku: "W-PREM-001",
      },
      {
        name: "Deluxe Service Package",
        description: "Comprehensive service plan for all widgets",
        category: "Services",
        priceInCents: 9999,
        sku: "S-DELUXE-001",
      },
    ];

    for (const product of products) {
      const newProduct = this.createProduct({
        userId: 1,
        ...product,
      });

      this.createInventory({
        productId: newProduct.id,
        quantity: Math.floor(Math.random() * 100) + 10,
        lastUpdated: new Date(),
      });
    }

    // Create sample training data
    const faqData = [
      {
        category: "General",
        question: "What are your business hours?",
        answer: "Our business hours are Monday to Friday, 9 AM to 5 PM.",
      },
      {
        category: "Products",
        question: "Do you offer warranties on your products?",
        answer: "Yes, all our products come with a standard 1-year warranty. Extended warranties are available for purchase.",
      },
      {
        category: "Support",
        question: "How can I contact technical support?",
        answer: "You can reach our technical support team by phone at 1-800-SUPPORT or by email at support@example.com.",
      },
      {
        category: "Returns",
        question: "What is your return policy?",
        answer: "We accept returns within 30 days of purchase. Items must be in original condition with all packaging.",
      },
      {
        category: "Shipping",
        question: "How long does shipping take?",
        answer: "Standard shipping typically takes 3-5 business days. Express shipping options are available at checkout.",
      },
    ];

    for (const faq of faqData) {
      this.createTrainingData({
        userId: 1,
        ...faq,
      });
    }
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // SIP Config
  async getSipConfig(id: number): Promise<SipConfig | undefined> {
    return this.sipConfigs.get(id);
  }

  async getSipConfigByUserId(userId: number): Promise<SipConfig | undefined> {
    return Array.from(this.sipConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createSipConfig(config: InsertSipConfig): Promise<SipConfig> {
    const id = this.currentIds.sipConfigs++;
    const newConfig: SipConfig = { ...config, id };
    this.sipConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateSipConfig(id: number, config: Partial<InsertSipConfig>): Promise<SipConfig | undefined> {
    const existingConfig = this.sipConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig: SipConfig = { ...existingConfig, ...config };
    this.sipConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  // Twilio Config
  async getTwilioConfig(id: number): Promise<TwilioConfig | undefined> {
    return this.twilioConfigs.get(id);
  }

  async getTwilioConfigByUserId(userId: number): Promise<TwilioConfig | undefined> {
    return Array.from(this.twilioConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createTwilioConfig(config: InsertTwilioConfig): Promise<TwilioConfig> {
    const id = this.currentIds.twilioConfigs++;
    const newConfig: TwilioConfig = { ...config, id };
    this.twilioConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateTwilioConfig(id: number, config: Partial<InsertTwilioConfig>): Promise<TwilioConfig | undefined> {
    const existingConfig = this.twilioConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig: TwilioConfig = { ...existingConfig, ...config };
    this.twilioConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  // OpenPhone Config
  async getOpenPhoneConfig(id: number): Promise<OpenPhoneConfig | undefined> {
    return this.openPhoneConfigs.get(id);
  }

  async getOpenPhoneConfigByUserId(userId: number): Promise<OpenPhoneConfig | undefined> {
    return Array.from(this.openPhoneConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createOpenPhoneConfig(config: InsertOpenPhoneConfig): Promise<OpenPhoneConfig> {
    const id = this.currentIds.openPhoneConfigs++;
    const newConfig: OpenPhoneConfig = { ...config, id };
    this.openPhoneConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateOpenPhoneConfig(id: number, config: Partial<InsertOpenPhoneConfig>): Promise<OpenPhoneConfig | undefined> {
    const existingConfig = this.openPhoneConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig: OpenPhoneConfig = { ...existingConfig, ...config };
    this.openPhoneConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  // SMTP Config
  async getSmtpConfig(id: number): Promise<SmtpConfig | undefined> {
    return this.smtpConfigs.get(id);
  }

  async getSmtpConfigByUserId(userId: number): Promise<SmtpConfig | undefined> {
    return Array.from(this.smtpConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createSmtpConfig(config: InsertSmtpConfig): Promise<SmtpConfig> {
    const id = this.currentIds.smtpConfigs++;
    const newConfig: SmtpConfig = { ...config, id };
    this.smtpConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateSmtpConfig(id: number, config: Partial<InsertSmtpConfig>): Promise<SmtpConfig | undefined> {
    const existingConfig = this.smtpConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig: SmtpConfig = { ...existingConfig, ...config };
    this.smtpConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  // SendGrid Config
  async getSendgridConfig(id: number): Promise<SendgridConfig | undefined> {
    return this.sendgridConfigs.get(id);
  }

  async getSendgridConfigByUserId(userId: number): Promise<SendgridConfig | undefined> {
    return Array.from(this.sendgridConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createSendgridConfig(config: InsertSendgridConfig): Promise<SendgridConfig> {
    const id = this.currentIds.sendgridConfigs++;
    const newConfig: SendgridConfig = { ...config, id };
    this.sendgridConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateSendgridConfig(id: number, config: Partial<InsertSendgridConfig>): Promise<SendgridConfig | undefined> {
    const existingConfig = this.sendgridConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig: SendgridConfig = { ...existingConfig, ...config };
    this.sendgridConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  // Mailgun Config
  async getMailgunConfig(id: number): Promise<MailgunConfig | undefined> {
    return this.mailgunConfigs.get(id);
  }

  async getMailgunConfigByUserId(userId: number): Promise<MailgunConfig | undefined> {
    return Array.from(this.mailgunConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createMailgunConfig(config: InsertMailgunConfig): Promise<MailgunConfig> {
    const id = this.currentIds.mailgunConfigs++;
    const newConfig: MailgunConfig = { ...config, id };
    this.mailgunConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateMailgunConfig(id: number, config: Partial<InsertMailgunConfig>): Promise<MailgunConfig | undefined> {
    const existingConfig = this.mailgunConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig: MailgunConfig = { ...existingConfig, ...config };
    this.mailgunConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  // Chat Config
  async getChatConfig(id: number): Promise<ChatConfig | undefined> {
    return this.chatConfigs.get(id);
  }

  async getChatConfigByUserId(userId: number): Promise<ChatConfig | undefined> {
    return Array.from(this.chatConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createChatConfig(config: InsertChatConfig): Promise<ChatConfig> {
    const id = this.currentIds.chatConfigs++;
    const newConfig: ChatConfig = { ...config, id };
    this.chatConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateChatConfig(id: number, config: Partial<InsertChatConfig>): Promise<ChatConfig | undefined> {
    const existingConfig = this.chatConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig: ChatConfig = { ...existingConfig, ...config };
    this.chatConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  // WhatsApp Config
  async getWhatsappConfig(id: number): Promise<WhatsappConfig | undefined> {
    return this.whatsappConfigs.get(id);
  }

  async getWhatsappConfigByUserId(userId: number): Promise<WhatsappConfig | undefined> {
    return Array.from(this.whatsappConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createWhatsappConfig(config: InsertWhatsappConfig): Promise<WhatsappConfig> {
    const id = this.currentIds.whatsappConfigs++;
    const newConfig: WhatsappConfig = { ...config, id };
    this.whatsappConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateWhatsappConfig(id: number, config: Partial<InsertWhatsappConfig>): Promise<WhatsappConfig | undefined> {
    const existingConfig = this.whatsappConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig: WhatsappConfig = { ...existingConfig, ...config };
    this.whatsappConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  // Calendar Config
  async getCalendarConfig(id: number): Promise<CalendarConfig | undefined> {
    return this.calendarConfigs.get(id);
  }

  async getCalendarConfigByUserId(userId: number): Promise<CalendarConfig | undefined> {
    return Array.from(this.calendarConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createCalendarConfig(config: InsertCalendarConfig): Promise<CalendarConfig> {
    const id = this.currentIds.calendarConfigs++;
    const newConfig: CalendarConfig = { ...config, id };
    this.calendarConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateCalendarConfig(id: number, config: Partial<InsertCalendarConfig>): Promise<CalendarConfig | undefined> {
    const existingConfig = this.calendarConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig: CalendarConfig = { ...existingConfig, ...config };
    this.calendarConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  // Product Data
  async getProduct(id: number): Promise<ProductData | undefined> {
    return this.products.get(id);
  }

  async getProductsByUserId(userId: number): Promise<ProductData[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.userId === userId,
    );
  }

  async createProduct(product: InsertProductData): Promise<ProductData> {
    const id = this.currentIds.products++;
    const newProduct: ProductData = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProductData>): Promise<ProductData | undefined> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) return undefined;
    
    const updatedProduct: ProductData = { ...existingProduct, ...product };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  // Inventory Status
  async getInventory(id: number): Promise<InventoryStatus | undefined> {
    return this.inventories.get(id);
  }

  async getInventoryByProductId(productId: number): Promise<InventoryStatus | undefined> {
    return Array.from(this.inventories.values()).find(
      (inventory) => inventory.productId === productId,
    );
  }

  async createInventory(inventory: InsertInventoryStatus): Promise<InventoryStatus> {
    const id = this.currentIds.inventories++;
    const newInventory: InventoryStatus = { ...inventory, id };
    this.inventories.set(id, newInventory);
    return newInventory;
  }

  async updateInventory(id: number, inventory: Partial<InsertInventoryStatus>): Promise<InventoryStatus | undefined> {
    const existingInventory = this.inventories.get(id);
    if (!existingInventory) return undefined;
    
    const updatedInventory: InventoryStatus = { ...existingInventory, ...inventory };
    this.inventories.set(id, updatedInventory);
    return updatedInventory;
  }

  // Training Data
  async getTrainingData(id: number): Promise<TrainingData | undefined> {
    return this.trainingDatas.get(id);
  }

  async getTrainingDataByUserId(userId: number): Promise<TrainingData[]> {
    return Array.from(this.trainingDatas.values()).filter(
      (data) => data.userId === userId,
    );
  }

  async getTrainingDataByCategory(userId: number, category: string): Promise<TrainingData[]> {
    return Array.from(this.trainingDatas.values()).filter(
      (data) => data.userId === userId && data.category === category,
    );
  }

  async createTrainingData(data: InsertTrainingData): Promise<TrainingData> {
    const id = this.currentIds.trainingDatas++;
    const newData: TrainingData = { ...data, id };
    this.trainingDatas.set(id, newData);
    return newData;
  }

  async updateTrainingData(id: number, data: Partial<InsertTrainingData>): Promise<TrainingData | undefined> {
    const existingData = this.trainingDatas.get(id);
    if (!existingData) return undefined;
    
    const updatedData: TrainingData = { ...existingData, ...data };
    this.trainingDatas.set(id, updatedData);
    return updatedData;
  }

  async deleteTrainingData(id: number): Promise<boolean> {
    return this.trainingDatas.delete(id);
  }

  // Intent Map
  async getIntent(id: number): Promise<IntentMap | undefined> {
    return this.intents.get(id);
  }

  async getIntentsByUserId(userId: number): Promise<IntentMap[]> {
    return Array.from(this.intents.values()).filter(
      (intent) => intent.userId === userId,
    );
  }

  async createIntent(intent: InsertIntentMap): Promise<IntentMap> {
    const id = this.currentIds.intents++;
    const newIntent: IntentMap = { ...intent, id };
    this.intents.set(id, newIntent);
    return newIntent;
  }

  async updateIntent(id: number, intent: Partial<InsertIntentMap>): Promise<IntentMap | undefined> {
    const existingIntent = this.intents.get(id);
    if (!existingIntent) return undefined;
    
    const updatedIntent: IntentMap = { ...existingIntent, ...intent };
    this.intents.set(id, updatedIntent);
    return updatedIntent;
  }

  async deleteIntent(id: number): Promise<boolean> {
    return this.intents.delete(id);
  }

  // Call Logs
  async getCallLog(id: number): Promise<CallLog | undefined> {
    return this.callLogs.get(id);
  }

  async getCallLogsByUserId(userId: number, limit?: number): Promise<CallLog[]> {
    const logs = Array.from(this.callLogs.values())
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? logs.slice(0, limit) : logs;
  }

  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    const id = this.currentIds.callLogs++;
    const newLog: CallLog = { ...log, id };
    this.callLogs.set(id, newLog);
    return newLog;
  }

  // Email Logs
  async getEmailLog(id: number): Promise<EmailLog | undefined> {
    return this.emailLogs.get(id);
  }

  async getEmailLogsByUserId(userId: number, limit?: number): Promise<EmailLog[]> {
    const logs = Array.from(this.emailLogs.values())
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? logs.slice(0, limit) : logs;
  }

  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const id = this.currentIds.emailLogs++;
    const newLog: EmailLog = { ...log, id };
    this.emailLogs.set(id, newLog);
    return newLog;
  }

  // Chat Logs
  async getChatLog(id: number): Promise<ChatLog | undefined> {
    return this.chatLogs.get(id);
  }

  async getChatLogsBySessionId(sessionId: string): Promise<ChatLog[]> {
    return Array.from(this.chatLogs.values())
      .filter((log) => log.sessionId === sessionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getChatLogsByUserId(userId: number, limit?: number): Promise<ChatLog[]> {
    const logs = Array.from(this.chatLogs.values())
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? logs.slice(0, limit) : logs;
  }

  async createChatLog(log: InsertChatLog): Promise<ChatLog> {
    const id = this.currentIds.chatLogs++;
    const newLog: ChatLog = { ...log, id };
    this.chatLogs.set(id, newLog);
    return newLog;
  }

  // WhatsApp Logs
  async getWhatsappLog(id: number): Promise<WhatsappLog | undefined> {
    return this.whatsappLogs.get(id);
  }

  async getWhatsappLogsByUserId(userId: number, limit?: number): Promise<WhatsappLog[]> {
    const logs = Array.from(this.whatsappLogs.values())
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? logs.slice(0, limit) : logs;
  }

  async getWhatsappLogsByPhoneNumber(userId: number, phoneNumber: string): Promise<WhatsappLog[]> {
    return Array.from(this.whatsappLogs.values())
      .filter((log) => log.userId === userId && log.phoneNumber === phoneNumber)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createWhatsappLog(log: InsertWhatsappLog): Promise<WhatsappLog> {
    const id = this.currentIds.whatsappLogs++;
    const newLog: WhatsappLog = { ...log, id };
    this.whatsappLogs.set(id, newLog);
    return newLog;
  }

  // Meeting Logs
  async getMeetingLog(id: number): Promise<MeetingLog | undefined> {
    return this.meetingLogs.get(id);
  }

  async getMeetingLogsByUserId(userId: number, limit?: number): Promise<MeetingLog[]> {
    const logs = Array.from(this.meetingLogs.values())
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    return limit ? logs.slice(0, limit) : logs;
  }

  async createMeetingLog(log: InsertMeetingLog): Promise<MeetingLog> {
    const id = this.currentIds.meetingLogs++;
    const newLog: MeetingLog = { ...log, id };
    this.meetingLogs.set(id, newLog);
    return newLog;
  }

  async updateMeetingLog(id: number, log: Partial<InsertMeetingLog>): Promise<MeetingLog | undefined> {
    const existingLog = this.meetingLogs.get(id);
    if (!existingLog) return undefined;
    
    const updatedLog: MeetingLog = { ...existingLog, ...log };
    this.meetingLogs.set(id, updatedLog);
    return updatedLog;
  }

  // Module Status
  async getModuleStatus(id: number): Promise<ModuleStatus | undefined> {
    return this.moduleStatuses.get(id);
  }

  async getModuleStatusByName(name: string): Promise<ModuleStatus | undefined> {
    return Array.from(this.moduleStatuses.values()).find(
      (status) => status.name === name,
    );
  }

  async getAllModuleStatuses(): Promise<ModuleStatus[]> {
    return Array.from(this.moduleStatuses.values());
  }

  async createModuleStatus(status: InsertModuleStatus): Promise<ModuleStatus> {
    const id = this.currentIds.moduleStatuses++;
    const newStatus: ModuleStatus = { ...status, id };
    this.moduleStatuses.set(id, newStatus);
    return newStatus;
  }

  async updateModuleStatus(id: number, status: Partial<InsertModuleStatus>): Promise<ModuleStatus | undefined> {
    const existingStatus = this.moduleStatuses.get(id);
    if (!existingStatus) return undefined;
    
    const updatedStatus: ModuleStatus = { ...existingStatus, ...status };
    this.moduleStatuses.set(id, updatedStatus);
    return updatedStatus;
  }

  // System Activity
  async getSystemActivity(id: number): Promise<SystemActivity | undefined> {
    return this.systemActivities.get(id);
  }

  async getRecentSystemActivity(limit = 5): Promise<SystemActivity[]> {
    const activities = Array.from(this.systemActivities.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? activities.slice(0, limit) : activities;
  }

  async getSystemActivityByModule(module: string, limit?: number): Promise<SystemActivity[]> {
    const activities = Array.from(this.systemActivities.values())
      .filter((activity) => activity.module === module)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? activities.slice(0, limit) : activities;
  }

  async createSystemActivity(activity: InsertSystemActivity): Promise<SystemActivity> {
    const id = this.currentIds.systemActivities++;
    const newActivity: SystemActivity = { ...activity, id };
    this.systemActivities.set(id, newActivity);
    return newActivity;
  }
}

import { DatabaseStorage } from './database-storage';

// Use DatabaseStorage instead of MemStorage for persistent storage
export const storage = new DatabaseStorage();
