import {
  users, User, InsertUser,
  sipConfig, SipConfig, InsertSipConfig,
  twilioConfig, TwilioConfig, InsertTwilioConfig,
  openPhoneConfig, OpenPhoneConfig, InsertOpenPhoneConfig,
  smtpConfig, SmtpConfig, InsertSmtpConfig,
  sendgridConfig, SendgridConfig, InsertSendgridConfig,
  mailgunConfig, MailgunConfig, InsertMailgunConfig,
  chatConfig, ChatConfig, InsertChatConfig,
  emailTemplates, EmailTemplate, InsertEmailTemplate,
  scheduledEmails, ScheduledEmail, InsertScheduledEmail,
  whatsappConfig, WhatsappConfig, InsertWhatsappConfig,
  facebookWhatsappConfig, FacebookWhatsappConfig, InsertFacebookWhatsappConfig,
  whatsappTemplates, WhatsappTemplate, InsertWhatsappTemplate,
  calendarConfig, CalendarConfig, InsertCalendarConfig,
  productData, ProductData, InsertProductData,
  inventoryStatus, InventoryStatus, InsertInventoryStatus,
  trainingData, TrainingData, InsertTrainingData,
  intentMap, IntentMap, InsertIntentMap,
  callLogs, CallLog, InsertCallLog,
  emailLogs, EmailLog, InsertEmailLog,
  emailReplies, InsertEmailReply,
  chatLogs, ChatLog, InsertChatLog,
  whatsappLogs, WhatsappLog, InsertWhatsappLog,
  meetingLogs, MeetingLog, InsertMeetingLog,
  moduleStatus, ModuleStatus, InsertModuleStatus,
  systemActivity, SystemActivity, InsertSystemActivity,
  voiceSettings, VoiceSettings, InsertVoiceSettings,
  // User management imports
  packages, Package, InsertPackage,
  packageFeatures, PackageFeature, InsertPackageFeature,
  userPackages, UserPackage, InsertUserPackage,
  featureUsageLogs, FeatureUsageLog, InsertFeatureUsageLog,
  loginActivity, LoginActivity, InsertLoginActivity,
  adminReportsCache, AdminReportsCache, InsertAdminReportsCache
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserStatus(id: number, status: string): Promise<User | undefined>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  updateUserPassword(id: number, password: string): Promise<User | undefined>;
  updateUserLastLogin(id: number): Promise<User | undefined>;
  verifyUserEmail(id: number): Promise<User | undefined>;
  setUserResetToken(id: number, token: string, expiry: Date): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Packages
  getPackage(id: number): Promise<Package | undefined>;
  getPackageByName(name: string): Promise<Package | undefined>;
  getAllPackages(): Promise<Package[]>;
  getActivePackages(): Promise<Package[]>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: number, pkg: Partial<InsertPackage>): Promise<Package | undefined>;
  deletePackage(id: number): Promise<boolean>;

  // Package Features
  getPackageFeature(id: number): Promise<PackageFeature | undefined>;
  getPackageFeaturesByPackageId(packageId: number): Promise<PackageFeature[]>;
  getPackageFeatureByKey(packageId: number, featureKey: string): Promise<PackageFeature | undefined>;
  createPackageFeature(feature: InsertPackageFeature): Promise<PackageFeature>;
  updatePackageFeature(id: number, feature: Partial<InsertPackageFeature>): Promise<PackageFeature | undefined>;
  deletePackageFeature(id: number): Promise<boolean>;

  // User Packages
  getUserPackage(id: number): Promise<UserPackage | undefined>;
  getUserPackagesByUserId(userId: number): Promise<UserPackage[]>;
  getActiveUserPackage(userId: number): Promise<UserPackage | undefined>;
  createUserPackage(userPackage: InsertUserPackage): Promise<UserPackage>;
  updateUserPackage(id: number, userPackage: Partial<InsertUserPackage>): Promise<UserPackage | undefined>;
  deactivateUserPackage(id: number): Promise<UserPackage | undefined>;
  deleteUserPackage(id: number): Promise<boolean>;

  // Feature Usage Logs
  getFeatureUsageLog(id: number): Promise<FeatureUsageLog | undefined>;
  getFeatureUsageLogsByUserId(userId: number): Promise<FeatureUsageLog[]>;
  getFeatureUsageLogsByFeatureKey(userId: number, featureKey: string): Promise<FeatureUsageLog[]>;
  getFeatureUsageSummary(userId: number, timeframe?: string): Promise<any>;
  createFeatureUsageLog(log: InsertFeatureUsageLog): Promise<FeatureUsageLog>;

  // Login Activity
  getLoginActivity(id: number): Promise<LoginActivity | undefined>;
  getLoginActivitiesByUserId(userId: number, limit?: number): Promise<LoginActivity[]>;
  createLoginActivity(activity: InsertLoginActivity): Promise<LoginActivity>;

  // Admin Reports Cache
  getReportCache(id: number): Promise<AdminReportsCache | undefined>;
  getReportCacheByType(reportType: string): Promise<AdminReportsCache | undefined>;
  createReportCache(report: InsertAdminReportsCache): Promise<AdminReportsCache>;
  deleteReportCache(id: number): Promise<boolean>;

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
  
  // Email Templates
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplatesByUserId(userId: number): Promise<EmailTemplate[]>;
  getEmailTemplatesByCategory(userId: number, category: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;
  
  // Scheduled Emails
  getScheduledEmail(id: number): Promise<ScheduledEmail | undefined>;
  getScheduledEmailsByUserId(userId: number): Promise<ScheduledEmail[]>;
  getPendingScheduledEmails(cutoffTime?: Date): Promise<ScheduledEmail[]>;
  createScheduledEmail(email: InsertScheduledEmail): Promise<ScheduledEmail>;
  updateScheduledEmail(id: number, email: Partial<InsertScheduledEmail>): Promise<ScheduledEmail | undefined>;
  updateScheduledEmailStatus(id: number, status: string, sentAt?: Date): Promise<ScheduledEmail | undefined>;
  deleteScheduledEmail(id: number): Promise<boolean>;

  // WhatsApp Config (Zender)
  getWhatsappConfig(id: number): Promise<WhatsappConfig | undefined>;
  getWhatsappConfigByUserId(userId: number): Promise<WhatsappConfig | undefined>;
  createWhatsappConfig(config: InsertWhatsappConfig): Promise<WhatsappConfig>;
  updateWhatsappConfig(id: number, config: Partial<InsertWhatsappConfig>): Promise<WhatsappConfig | undefined>;
  
  // Facebook WhatsApp Config
  getFacebookWhatsappConfig(id: number): Promise<FacebookWhatsappConfig | undefined>;
  getFacebookWhatsappConfigByUserId(userId: number): Promise<FacebookWhatsappConfig | undefined>;
  createFacebookWhatsappConfig(config: InsertFacebookWhatsappConfig): Promise<FacebookWhatsappConfig>;
  updateFacebookWhatsappConfig(id: number, config: Partial<InsertFacebookWhatsappConfig>): Promise<FacebookWhatsappConfig | undefined>;
  
  // WhatsApp Templates
  getWhatsappTemplate(id: number): Promise<WhatsappTemplate | undefined>;
  getWhatsappTemplatesByUserId(userId: number): Promise<WhatsappTemplate[]>;
  getWhatsappTemplatesByCategory(userId: number, category: string): Promise<WhatsappTemplate[]>;
  getWhatsappTemplatesByProvider(userId: number, provider: string): Promise<WhatsappTemplate[]>;
  createWhatsappTemplate(template: InsertWhatsappTemplate): Promise<WhatsappTemplate>;
  updateWhatsappTemplate(id: number, template: Partial<InsertWhatsappTemplate>): Promise<WhatsappTemplate | undefined>;
  deleteWhatsappTemplate(id: number): Promise<boolean>;

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
  updateCallLog(id: number, log: Partial<InsertCallLog>): Promise<CallLog | undefined>;

  // Email Logs
  getEmailLog(id: number): Promise<EmailLog | undefined>;
  getEmailLogsByUserId(userId: number, limit?: number): Promise<EmailLog[]>;
  getEmailLogByMessageId(messageId: string): Promise<EmailLog | undefined>;
  getEmailLogsByFromAndSubject(userId: number, from: string, subject: string): Promise<EmailLog[]>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;
  updateEmailLogIsReplied(id: number, isReplied: boolean, inReplyTo?: string): Promise<EmailLog | undefined>;
  getUnrepliedEmails(userId: number): Promise<EmailLog[]>;
  
  // Email Replies
  createEmailReply(reply: InsertEmailReply): Promise<any>;
  getEmailReplyByOriginalEmailId(originalEmailId: number): Promise<any | undefined>;
  updateEmailReplyStatus(id: number, status: string, messageId?: string, error?: string): Promise<any | undefined>;

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
  private emailTemplates: Map<number, EmailTemplate>;
  private scheduledEmails: Map<number, ScheduledEmail>;
  private whatsappTemplates: Map<number, WhatsappTemplate>;
  private whatsappConfigs: Map<number, WhatsappConfig>;
  private facebookWhatsappConfigs: Map<number, FacebookWhatsappConfig>;
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
  
  // User management related maps
  private packages: Map<number, Package>;
  private packageFeatures: Map<number, PackageFeature>;
  private userPackages: Map<number, UserPackage>;
  private featureUsageLogs: Map<number, FeatureUsageLog>;
  private loginActivities: Map<number, LoginActivity>;
  private reportCaches: Map<number, AdminReportsCache>;

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
    facebookWhatsappConfigs: number;
    whatsappTemplates: number;
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
    voiceSettings: number;
    // User management related ids
    packages: number;
    packageFeatures: number;
    userPackages: number;
    featureUsageLogs: number;
    loginActivities: number;
    reportCaches: number;
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
    this.emailTemplates = new Map();
    this.scheduledEmails = new Map();
    this.whatsappTemplates = new Map();
    this.whatsappConfigs = new Map();
    this.facebookWhatsappConfigs = new Map();
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
    
    // Initialize user management maps
    this.packages = new Map();
    this.packageFeatures = new Map();
    this.userPackages = new Map();
    this.featureUsageLogs = new Map();
    this.loginActivities = new Map();
    this.reportCaches = new Map();

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
      emailTemplates: 1,
      scheduledEmails: 1,
      whatsappTemplates: 1,
      whatsappConfigs: 1,
      facebookWhatsappConfigs: 1,
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
      // Initialize user management IDs
      packages: 1,
      packageFeatures: 1,
      userPackages: 1,
      featureUsageLogs: 1,
      loginActivities: 1,
      reportCaches: 1,
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const now = new Date();
    const newUser: User = { 
      ...user, 
      id, 
      createdAt: now,
      updatedAt: now,
      status: 'active',
      emailVerified: false,
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser: User = { 
      ...existingUser, 
      ...userData,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserStatus(id: number, status: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = { ...user, status, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = { ...user, role, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserPassword(id: number, password: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = { ...user, password, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = { ...user, lastLogin: new Date(), updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async verifyUserEmail(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = { 
      ...user, 
      emailVerified: true, 
      verificationToken: null,
      updatedAt: new Date() 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async setUserResetToken(id: number, token: string, expiry: Date): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = { 
      ...user, 
      resetToken: token, 
      resetTokenExpiry: expiry,
      updatedAt: new Date() 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.resetToken === token && user.resetTokenExpiry > new Date(),
    );
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
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
  
  // Facebook WhatsApp Config
  async getFacebookWhatsappConfig(id: number): Promise<FacebookWhatsappConfig | undefined> {
    return this.facebookWhatsappConfigs.get(id);
  }

  async getFacebookWhatsappConfigByUserId(userId: number): Promise<FacebookWhatsappConfig | undefined> {
    return Array.from(this.facebookWhatsappConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createFacebookWhatsappConfig(config: InsertFacebookWhatsappConfig): Promise<FacebookWhatsappConfig> {
    const id = this.currentIds.facebookWhatsappConfigs++;
    const newConfig: FacebookWhatsappConfig = { ...config, id };
    this.facebookWhatsappConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateFacebookWhatsappConfig(id: number, config: Partial<InsertFacebookWhatsappConfig>): Promise<FacebookWhatsappConfig | undefined> {
    const existingConfig = this.facebookWhatsappConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig: FacebookWhatsappConfig = { ...existingConfig, ...config };
    this.facebookWhatsappConfigs.set(id, updatedConfig);
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

  async updateCallLog(id: number, log: Partial<InsertCallLog>): Promise<CallLog | undefined> {
    const existingLog = this.callLogs.get(id);
    if (!existingLog) return undefined;
    
    const updatedLog: CallLog = { ...existingLog, ...log };
    this.callLogs.set(id, updatedLog);
    return updatedLog;
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
  
  async getEmailLogByMessageId(messageId: string): Promise<EmailLog | undefined> {
    if (!messageId) return undefined;
    
    return Array.from(this.emailLogs.values())
      .find((log) => log.messageId === messageId);
  }
  
  async getEmailLogsByFromAndSubject(userId: number, from: string, subject: string): Promise<EmailLog[]> {
    return Array.from(this.emailLogs.values())
      .filter((log) => 
        log.userId === userId && 
        log.from === from && 
        log.subject === subject
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
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

  async getWhatsappLogsByUserId(userId: number, limit: number = 20, offset: number = 0): Promise<WhatsappLog[]> {
    const logs = Array.from(this.whatsappLogs.values())
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return logs.slice(offset, offset + limit);
  }

  async getWhatsappLogsByPhoneNumber(userId: number, phoneNumber: string, limit: number = 20, offset: number = 0): Promise<WhatsappLog[]> {
    const logs = Array.from(this.whatsappLogs.values())
      .filter((log) => log.userId === userId && log.phoneNumber === phoneNumber)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
    return logs.slice(offset, offset + limit);
  }
  
  async getWhatsappLogCountByUserId(userId: number): Promise<number> {
    return Array.from(this.whatsappLogs.values())
      .filter((log) => log.userId === userId)
      .length;
  }
  
  async getWhatsappLogCountByPhoneNumber(userId: number, phoneNumber: string): Promise<number> {
    return Array.from(this.whatsappLogs.values())
      .filter((log) => log.userId === userId && log.phoneNumber === phoneNumber)
      .length;
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
  
  // Voice Settings
  async getVoiceSettings(id: number): Promise<VoiceSettings | undefined> {
    return this.voiceSettings.get(id);
  }
  
  async getVoiceSettingsByVoiceId(voiceId: string): Promise<VoiceSettings | undefined> {
    return Array.from(this.voiceSettings.values()).find(
      (setting) => setting.voiceId === voiceId
    );
  }
  
  async getVoiceSettingsByUserId(userId: number): Promise<VoiceSettings[]> {
    return Array.from(this.voiceSettings.values()).filter(
      (setting) => setting.userId === userId
    );
  }
  
  async getAllVoiceSettings(): Promise<VoiceSettings[]> {
    return Array.from(this.voiceSettings.values());
  }
  
  async createVoiceSettings(settings: InsertVoiceSettings): Promise<VoiceSettings> {
    const id = this.currentIds.voiceSettings++;
    const newSettings: VoiceSettings = { ...settings, id, lastUpdated: new Date() };
    this.voiceSettings.set(id, newSettings);
    return newSettings;
  }
  
  async updateVoiceSettings(id: number, settings: Partial<InsertVoiceSettings>): Promise<VoiceSettings | undefined> {
    const existingSettings = this.voiceSettings.get(id);
    if (!existingSettings) return undefined;
    
    const updatedSettings: VoiceSettings = { 
      ...existingSettings, 
      ...settings, 
      lastUpdated: new Date() 
    };
    this.voiceSettings.set(id, updatedSettings);
    return updatedSettings;
  }
  
  async deleteVoiceSettings(id: number): Promise<boolean> {
    this.voiceSettings.delete(id);
    return true;
  }

  // Email Templates
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    return this.emailTemplates.get(id);
  }

  async getEmailTemplatesByUserId(userId: number): Promise<EmailTemplate[]> {
    return Array.from(this.emailTemplates.values()).filter(
      (template) => template.userId === userId
    );
  }

  async getEmailTemplatesByCategory(userId: number, category: string): Promise<EmailTemplate[]> {
    return Array.from(this.emailTemplates.values()).filter(
      (template) => template.userId === userId && template.category === category
    );
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = this.currentIds.emailTemplates++;
    const newTemplate: EmailTemplate = { ...template, id };
    this.emailTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const existingTemplate = this.emailTemplates.get(id);
    if (!existingTemplate) return undefined;
    
    const updatedTemplate: EmailTemplate = { ...existingTemplate, ...template };
    this.emailTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    return this.emailTemplates.delete(id);
  }

  // Scheduled Emails
  async getScheduledEmail(id: number): Promise<ScheduledEmail | undefined> {
    return this.scheduledEmails.get(id);
  }

  async getScheduledEmailsByUserId(userId: number): Promise<ScheduledEmail[]> {
    return Array.from(this.scheduledEmails.values()).filter(
      (email) => email.userId === userId
    );
  }

  async getPendingScheduledEmails(cutoffTime: Date = new Date()): Promise<ScheduledEmail[]> {
    return Array.from(this.scheduledEmails.values()).filter(
      (email) => email.status === 'pending' && new Date(email.scheduledTime) <= cutoffTime
    );
  }

  async createScheduledEmail(email: InsertScheduledEmail): Promise<ScheduledEmail> {
    const id = this.currentIds.scheduledEmails++;
    const newEmail: ScheduledEmail = { ...email, id };
    this.scheduledEmails.set(id, newEmail);
    return newEmail;
  }

  async updateScheduledEmail(id: number, email: Partial<InsertScheduledEmail>): Promise<ScheduledEmail | undefined> {
    const existingEmail = this.scheduledEmails.get(id);
    if (!existingEmail) return undefined;
    
    const updatedEmail: ScheduledEmail = { ...existingEmail, ...email };
    this.scheduledEmails.set(id, updatedEmail);
    return updatedEmail;
  }

  async updateScheduledEmailStatus(id: number, status: string, sentAt?: Date): Promise<ScheduledEmail | undefined> {
    const existingEmail = this.scheduledEmails.get(id);
    if (!existingEmail) return undefined;
    
    const updatedEmail: ScheduledEmail = { 
      ...existingEmail, 
      status,
      sentAt: sentAt || (status === 'sent' ? new Date() : existingEmail.sentAt)
    };
    this.scheduledEmails.set(id, updatedEmail);
    return updatedEmail;
  }

  async deleteScheduledEmail(id: number): Promise<boolean> {
    return this.scheduledEmails.delete(id);
  }

  // WhatsApp Templates
  async getWhatsappTemplate(id: number): Promise<WhatsappTemplate | undefined> {
    return this.whatsappTemplates.get(id);
  }

  async getWhatsappTemplatesByUserId(userId: number): Promise<WhatsappTemplate[]> {
    return Array.from(this.whatsappTemplates.values())
      .filter((template) => template.userId === userId);
  }

  async getWhatsappTemplatesByCategory(userId: number, category: string): Promise<WhatsappTemplate[]> {
    return Array.from(this.whatsappTemplates.values())
      .filter((template) => template.userId === userId && template.category === category);
  }

  async getWhatsappTemplatesByProvider(userId: number, provider: string): Promise<WhatsappTemplate[]> {
    return Array.from(this.whatsappTemplates.values())
      .filter((template) => template.userId === userId && template.provider === provider);
  }

  async createWhatsappTemplate(template: InsertWhatsappTemplate): Promise<WhatsappTemplate> {
    const id = this.currentIds.whatsappTemplates++;
    const newTemplate: WhatsappTemplate = { ...template, id };
    this.whatsappTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateWhatsappTemplate(id: number, template: Partial<InsertWhatsappTemplate>): Promise<WhatsappTemplate | undefined> {
    const existingTemplate = this.whatsappTemplates.get(id);
    if (!existingTemplate) return undefined;
    
    const updatedTemplate: WhatsappTemplate = { ...existingTemplate, ...template };
    this.whatsappTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteWhatsappTemplate(id: number): Promise<boolean> {
    if (!this.whatsappTemplates.has(id)) return false;
    return this.whatsappTemplates.delete(id);
  }
}

import { DatabaseStorage } from './database-storage';

// Use DatabaseStorage instead of MemStorage for persistent storage
export const storage = new DatabaseStorage();
