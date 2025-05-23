import { apiRequest } from "./queryClient";

// AI Training Data Types
export interface TrainingData {
  id: number;
  userId: number;
  category: string;
  content: string;
  metadata?: any;
  embedding?: any;
  createdAt: string;
}

export interface Intent {
  id: number;
  userId: number;
  intent: string;
  examples: string[];
}

// AI Training API Functions
export const getTrainingData = async (category?: string): Promise<TrainingData[]> => {
  const url = category 
    ? `/api/training/data?category=${encodeURIComponent(category)}` 
    : '/api/training/data';
  const response = await apiRequest('GET', url);
  return response.json();
};

export const createTrainingData = async (data: {
  category: string;
  content: string;
  userId?: number;
  metadata?: any;
}): Promise<TrainingData> => {
  const response = await apiRequest('POST', '/api/training/data', {
    ...data,
    userId: data.userId || 1 // Default to user 1 if not provided
  });
  return response.json();
};

export const updateTrainingData = async (
  id: number, 
  data: Partial<Omit<TrainingData, 'id' | 'userId' | 'createdAt' | 'metadata'>>
): Promise<TrainingData> => {
  const response = await apiRequest('PATCH', `/api/training/data/${id}`, data);
  return response.json();
};

export const deleteTrainingData = async (id: number): Promise<any> => {
  const response = await apiRequest('DELETE', `/api/training/data/${id}`);
  return response.json();
};

export const getIntents = async (): Promise<Intent[]> => {
  const response = await apiRequest('GET', '/api/training/intents');
  return response.json();
};

export const createIntent = async (data: {
  intent: string;
  examples: string[];
  userId?: number;
}): Promise<Intent> => {
  const response = await apiRequest('POST', '/api/training/intents', {
    ...data,
    userId: data.userId || 1 // Default to user 1 if not provided
  });
  return response.json();
};

export const deleteIntent = async (id: number): Promise<any> => {
  const response = await apiRequest('DELETE', `/api/training/intents/${id}`);
  return response.json();
};

export interface ModuleStatus {
  id: number;
  name: string;
  status: string;
  responseTime: number | null;
  successRate: number | null;
  lastChecked: string;
  details: string | null;
}

export interface SystemActivity {
  id: number;
  module: string;
  event: string;
  status: string;
  timestamp: string;
  details: Record<string, any> | null;
}

export interface TwilioConfig {
  id: number;
  userId: number;
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  callbackUrl: string | null;
  isActive: boolean;
  connectionStatus?: 'connected' | 'disconnected' | 'pending';
}

export interface SipConfig {
  id: number;
  userId: number;
  username: string;
  password: string;
  serverDomain: string;
  outboundProxy: string | null;
  port: number;
  transportProtocol: 'UDP' | 'TCP' | 'TLS';
  registrationExpiryTime: number;
  callerId: string;
  stunServer: string | null;
  dtmfMode: 'RFC2833' | 'SIP INFO' | 'IN-BAND';
  audioCodecs: string[]; // e.g., ['G.711', 'G.722', 'Opus']
  voicemailUri: string | null;
  sipUri: string | null;
  keepAliveInterval: number;
  tlsCertPath: string | null;
  callbackUrl: string | null;
  isActive: boolean;
  connectionStatus?: 'connected' | 'disconnected' | 'pending';
}

export interface OpenPhoneConfig {
  id: number;
  userId: number;
  apiKey: string;
  teamId: string;
  phoneNumber: string;
  callbackUrl: string | null;
  isActive: boolean;
  connectionStatus?: 'connected' | 'disconnected' | 'pending';
}

export interface VoiceConfig {
  twilio: TwilioConfig | null;
  sip: SipConfig | null;
  openPhone: OpenPhoneConfig | null;
}

export interface SendgridConfig {
  id: number;
  userId: number;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  isActive: boolean;
}

export interface SmtpConfig {
  id: number;
  userId: number;
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  isActive: boolean;
  // IMAP configuration
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
}

export interface MailgunConfig {
  id: number;
  userId: number;
  apiKey: string;
  domain: string;
  fromEmail: string;
  fromName?: string;
  authorizedRecipients?: string;
  isActive: boolean;
}

export interface EmailConfig {
  sendgrid: SendgridConfig | null;
  smtp: SmtpConfig | null;
  mailgun: MailgunConfig | null;
}

export interface CallLog {
  id: number;
  userId: number;
  phoneNumber: string;
  duration: number | null;
  recording: string | null;
  transcript: string | null;
  sentiment: string | null;
  timestamp: string;
  status: string;
  callSid?: string;
  service?: string;
}

export interface EmailLog {
  id: number;
  userId: number;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  status: string;
  service?: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  userId: number;
  subject: string;
  body: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  lastUpdated: string;
  description: string | null;
  variables: string | null;
}

export interface EmailLog {
  id: number;
  userId: number;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  status: string;
  service?: string;
}

export interface ScheduledEmail {
  id: number;
  userId: number;
  to: string;
  from: string;
  subject: string;
  body: string;
  scheduledTime: string;
  service: string;
  status: string; // 'pending', 'sent', 'cancelled', 'failed'
  createdAt: string;
  sentAt: string | null;
  templateId: number | null;
  fromName: string | null;
  htmlBody: string | null;
  isRecurring: boolean;
  recurringRule: string | null; // e.g., 'FREQ=DAILY' or 'FREQ=WEEKLY;BYDAY=MO,WE,FR'
}

export interface ChatLog {
  id: number;
  userId: number;
  sessionId: string;
  message: string;
  sender: string;
  timestamp: string;
}

export interface WhatsappConfig {
  id: number;
  userId: number;
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  isActive: boolean;
}

export interface WhatsappLog {
  id: number;
  userId: number;
  phoneNumber: string;
  message: string;
  mediaUrl: string | null;
  direction: string;
  timestamp: string;
  status?: string; // 'sent', 'delivered', 'read', 'failed'
  externalId?: string | null; // ID from external service like Zender or Facebook
}

export interface MeetingLog {
  id: number;
  userId: number;
  attendees: string[];
  subject: string;
  description: string | null;
  startTime: string;
  endTime: string;
  googleEventId: string | null;
  status: string;
}

export interface Product {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  category: string | null;
  priceInCents: number;
  sku: string;
  inventory: {
    id: number;
    productId: number;
    quantity: number;
    lastUpdated: string;
  } | null;
}

// These interfaces were replaced by the ones at the top of the file

// API functions
export const updateModuleStatus = async (
  moduleId: string, 
  status: string
): Promise<ModuleStatus> => {
  const response = await apiRequest("PUT", `/api/modules/${moduleId}/status`, {
    status,
    lastChecked: new Date().toISOString()
  });
  return response.json();
};

export const getVoiceConfigs = async (): Promise<VoiceConfig> => {
  const response = await apiRequest("GET", "/api/voice/configs");
  return response.json();
};

export const saveTwilioConfig = async (config: Partial<TwilioConfig>): Promise<TwilioConfig> => {
  const response = await apiRequest("POST", "/api/voice/twilio/config", config);
  return response.json();
};

export const saveSipConfig = async (config: Partial<SipConfig>): Promise<SipConfig> => {
  const response = await apiRequest("POST", "/api/voice/sip/config", config);
  return response.json();
};

export const saveOpenPhoneConfig = async (config: Partial<OpenPhoneConfig>): Promise<OpenPhoneConfig> => {
  const response = await apiRequest("POST", "/api/voice/openphone/config", config);
  return response.json();
};

export const makeTestCall = async (
  phoneNumber: string, 
  message?: string,
  service?: 'twilio' | 'sip' | 'openphone'
): Promise<{ success: boolean; error?: string; callSid?: string; service?: string }> => {
  const response = await apiRequest("POST", "/api/voice/test-call", { 
    phoneNumber, 
    message,
    service
  });
  return response.json();
};

export const getCallLogs = async (limit?: number): Promise<CallLog[]> => {
  const queryParams = limit ? `?limit=${limit}` : "";
  const response = await apiRequest("GET", `/api/voice/logs${queryParams}`);
  return response.json();
};

export const createCallLog = async (
  callLog: Partial<CallLog>
): Promise<CallLog> => {
  const response = await apiRequest("POST", "/api/voice/logs", callLog);
  return response.json();
};

export const updateCallLog = async (
  id: number, 
  updates: Partial<CallLog>
): Promise<CallLog> => {
  const response = await apiRequest("PATCH", `/api/voice/logs/${id}`, updates);
  return response.json();
};

export const getEmailConfigs = async (): Promise<EmailConfig> => {
  const response = await apiRequest("GET", "/api/email/configs");
  return response.json();
};

export const getEmailLogs = async (limit?: number): Promise<EmailLog[]> => {
  const queryParams = limit ? `?limit=${limit}` : "";
  const response = await apiRequest("GET", `/api/email/logs${queryParams}`);
  return response.json();
};

export const saveSendgridConfig = async (
  config: Partial<SendgridConfig>
): Promise<SendgridConfig> => {
  const response = await apiRequest("POST", "/api/email/config/sendgrid", config);
  return response.json();
};

export const saveSmtpConfig = async (
  config: Partial<SmtpConfig>
): Promise<SmtpConfig> => {
  const response = await apiRequest("POST", "/api/email/config/smtp", config);
  return response.json();
};

export const saveMailgunConfig = async (
  config: Partial<MailgunConfig>
): Promise<MailgunConfig> => {
  const response = await apiRequest("POST", "/api/email/config/mailgun", config);
  return response.json();
};

export const verifySmtpConnection = async (
  config?: {
    host: string;
    port: number | string;
    username: string;
    password: string;
  }
): Promise<{ success: boolean; message: string }> => {
  const response = await apiRequest("POST", "/api/email/verify/smtp", config || {});
  return response.json();
};

export const sendTestEmail = async (
  to: string,
  service?: 'sendgrid' | 'smtp' | 'mailgun'
): Promise<{ success: boolean; message: string }> => {
  const response = await apiRequest("POST", "/api/email/test", { to, service });
  return response.json();
};

export const processIncomingEmail = async (
  email: {
    from: string;
    to?: string;
    subject: string;
    body: string;
  },
  service?: 'sendgrid' | 'smtp' | 'mailgun'
): Promise<{ success: boolean; message: string }> => {
  const response = await apiRequest("POST", "/api/email/process", {
    ...email,
    service
  });
  return response.json();
};

// Function to send an email from the composer
export const sendEmail = async (
  email: {
    to: string;
    subject: string;
    body: string;
    templateId?: number;
    htmlBody?: string;
  },
  service?: 'sendgrid' | 'smtp' | 'mailgun'
): Promise<{ success: boolean; message: string }> => {
  const response = await apiRequest("POST", "/api/email/send", {
    ...email,
    service
  });
  return response.json();
};

export const sendReply = async (
  emailId: number,
  replyContent: string,
  subject?: string
): Promise<{ success: boolean; reply?: any; error?: string }> => {
  const response = await apiRequest("POST", "/api/email/reply", {
    emailId,
    replyContent,
    subject
  });
  return response.json();
};

// IMAP Sync Emails - Fetches emails from the configured IMAP server
export const syncEmails = async (): Promise<{ 
  success: boolean; 
  message: string; 
  count?: number 
}> => {
  const response = await apiRequest("POST", "/api/email/sync");
  return response.json();
};

// Check IMAP connection status
export const checkImapStatus = async (): Promise<{ 
  success: boolean; 
  connected: boolean;
  message: string 
}> => {
  const response = await apiRequest("GET", "/api/email/imap-status");
  return response.json();
};

// Email Templates API Functions
export const getEmailTemplates = async (category?: string): Promise<EmailTemplate[]> => {
  const queryParams = category ? `?category=${category}` : "";
  const response = await apiRequest("GET", `/api/email/templates${queryParams}`);
  return response.json();
};

export const getEmailTemplate = async (id: number): Promise<EmailTemplate> => {
  const response = await apiRequest("GET", `/api/email/templates/${id}`);
  return response.json();
};

export const createEmailTemplate = async (
  template: Omit<EmailTemplate, "id" | "createdAt" | "lastUpdated">
): Promise<EmailTemplate> => {
  const response = await apiRequest("POST", "/api/email/templates", template);
  return response.json();
};

export const updateEmailTemplate = async (
  id: number,
  template: Partial<EmailTemplate>
): Promise<EmailTemplate> => {
  const response = await apiRequest("PUT", `/api/email/templates/${id}`, template);
  return response.json();
};

export const deleteEmailTemplate = async (id: number): Promise<{ success: boolean }> => {
  const response = await apiRequest("DELETE", `/api/email/templates/${id}`);
  return response.json();
};

// Scheduled Emails API Functions
export const getScheduledEmails = async (): Promise<ScheduledEmail[]> => {
  const response = await apiRequest("GET", "/api/email/scheduled");
  return response.json();
};

export const getScheduledEmail = async (id: number): Promise<ScheduledEmail> => {
  const response = await apiRequest("GET", `/api/email/scheduled/${id}`);
  return response.json();
};

export const createScheduledEmail = async (
  email: {
    to: string;
    subject: string;
    body?: string;
    scheduledTime: string;
    service: 'sendgrid' | 'smtp' | 'mailgun';
    templateId?: number;
    fromName?: string;
    htmlBody?: string;
    isRecurring?: boolean;
    recurringRule?: string;
  }
): Promise<ScheduledEmail> => {
  const response = await apiRequest("POST", "/api/email/scheduled", email);
  return response.json();
};

export const updateScheduledEmail = async (
  id: number,
  email: Partial<ScheduledEmail>
): Promise<ScheduledEmail> => {
  const response = await apiRequest("PUT", `/api/email/scheduled/${id}`, email);
  return response.json();
};

export const deleteScheduledEmail = async (id: number): Promise<{ success: boolean }> => {
  const response = await apiRequest("DELETE", `/api/email/scheduled/${id}`);
  return response.json();
};

export const cancelScheduledEmail = async (id: number): Promise<ScheduledEmail> => {
  const response = await apiRequest("POST", `/api/email/scheduled/${id}/cancel`);
  return response.json();
};

export const getChatLogs = async (
  sessionId?: string,
  limit?: number
): Promise<ChatLog[]> => {
  let queryParams = "";
  if (sessionId) queryParams = `?sessionId=${sessionId}`;
  else if (limit) queryParams = `?limit=${limit}`;
  
  const response = await apiRequest("GET", `/api/chat/logs${queryParams}`);
  return response.json();
};

export interface WhatsappLogResponse {
  logs: WhatsappLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const getWhatsappLogs = async (
  phoneNumber?: string,
  limit: number = 20,
  offset: number = 0
): Promise<WhatsappLogResponse> => {
  let queryParams = `?limit=${limit}&offset=${offset}`;
  if (phoneNumber) queryParams += `&phoneNumber=${phoneNumber}`;
  
  const response = await apiRequest("GET", `/api/whatsapp/logs${queryParams}`);
  return response.json();
};

// WhatsApp config interface
export interface WhatsappConfig {
  id: number;
  userId: number;
  // Meta/Facebook API fields
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  // Zender specific fields
  apiSecret: string | null;
  accountId: string | null;
  zenderUrl: string | null;
  provider: string | null;
  isActive: boolean;
}

export const getWhatsappConfig = async (): Promise<WhatsappConfig> => {
  const response = await apiRequest("GET", "/api/whatsapp/config");
  return response.json();
};

export const saveWhatsappConfig = async (
  config: Partial<WhatsappConfig>
): Promise<WhatsappConfig> => {
  const response = await apiRequest("POST", "/api/whatsapp/config", config);
  return response.json();
};

export const testWhatsappConnection = async (): Promise<{success: boolean, message: string, provider?: string}> => {
  const response = await apiRequest("POST", "/api/whatsapp/test");
  return response.json();
};

export const sendWhatsappMessage = async (
  phoneNumber: string, 
  message: string, 
  mediaUrl?: string
): Promise<{success: boolean, messageId?: string, error?: string, logId?: number}> => {
  try {
    const response = await apiRequest("POST", "/api/whatsapp/send", {
      phoneNumber,
      message,
      mediaUrl
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("WhatsApp send error:", errorData);
      return {
        success: false,
        error: errorData.error || `Error sending message: ${response.status} ${response.statusText}`
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error("WhatsApp API exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending WhatsApp message"
    };
  }
};

// WhatsApp Template Interface
export interface WhatsappTemplate {
  id: number;
  name: string;
  userId: number;
  content: string;
  category: string;
  provider: string; // 'facebook' or 'zender'
  isActive: boolean;
  description: string | null;
  componentsJson: string | null; // For storing structured components
  templateId: string | null; // External template ID from provider
  createdAt?: string;
  updatedAt?: string;
  lastUsed?: string | null;
}

// WhatsApp Templates API Functions
export const getWhatsappTemplates = async (
  category?: string,
  provider?: string
): Promise<WhatsappTemplate[]> => {
  let queryParams = "";
  
  if (category && provider) {
    queryParams = `?category=${category}&provider=${provider}`;
  } else if (category) {
    queryParams = `?category=${category}`;
  } else if (provider) {
    queryParams = `?provider=${provider}`;
  }
  
  const response = await apiRequest("GET", `/api/whatsapp/templates${queryParams}`);
  return response.json();
};

export const getWhatsappTemplate = async (id: number): Promise<WhatsappTemplate> => {
  const response = await apiRequest("GET", `/api/whatsapp/templates/${id}`);
  return response.json();
};

export const createWhatsappTemplate = async (
  template: Omit<WhatsappTemplate, "id" | "createdAt" | "updatedAt" | "lastUsed">
): Promise<WhatsappTemplate> => {
  const response = await apiRequest("POST", "/api/whatsapp/templates", template);
  return response.json();
};

export const updateWhatsappTemplate = async (
  id: number,
  template: Partial<WhatsappTemplate>
): Promise<WhatsappTemplate> => {
  const response = await apiRequest("PUT", `/api/whatsapp/templates/${id}`, template);
  return response.json();
};

export const deleteWhatsappTemplate = async (id: number): Promise<{ success: boolean }> => {
  const response = await apiRequest("DELETE", `/api/whatsapp/templates/${id}`);
  return response.json();
};

export const getMeetingLogs = async (limit?: number): Promise<MeetingLog[]> => {
  const queryParams = limit ? `?limit=${limit}` : "";
  const response = await apiRequest("GET", `/api/calendar/meetings${queryParams}`);
  return response.json();
};

export interface CalendarConfig {
  id: number;
  userId: number;
  googleClientId: string;
  googleClientSecret: string;
  googleRefreshToken: string | null;
  googleCalendarId: string | null;
  availabilityStartTime: string;
  availabilityEndTime: string;
  slotDuration: number;
  isActive: boolean;
}

export const getCalendarConfig = async (): Promise<CalendarConfig | { error: string }> => {
  const response = await apiRequest("GET", "/api/calendar/config");
  return response.json();
};

export const saveCalendarConfig = async (
  config: Partial<CalendarConfig>
): Promise<CalendarConfig> => {
  const response = await apiRequest("POST", "/api/calendar/config", config);
  return response.json();
};

export const getAvailableTimeSlots = async (
  date: string
): Promise<{ time: string; available: boolean }[]> => {
  const response = await apiRequest("GET", `/api/calendar/slots?date=${date}`);
  return response.json();
};

export const createMeeting = async (
  meeting: {
    subject: string;
    description?: string;
    startTime: string;
    endTime: string;
    attendees: string[];
    timezone?: string; // Add timezone parameter
  }
): Promise<MeetingLog> => {
  // Get browser timezone if not explicitly provided
  const userTimezone = meeting.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Include timezone in meeting data
  const response = await apiRequest("POST", "/api/calendar/meetings", {
    ...meeting,
    timezone: userTimezone
  });
  
  return response.json();
};

export const getProducts = async (): Promise<Product[]> => {
  const response = await apiRequest("GET", "/api/products");
  return response.json();
};

export const createProduct = async (product: Omit<Product, "id">): Promise<Product> => {
  const response = await apiRequest("POST", "/api/products", product);
  return response.json();
};

// Training data and intent functions have been moved to the top of this file
