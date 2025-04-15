import axios from 'axios';
import FormData from 'form-data';
import { storage } from '../storage';
import { WhatsappConfig, InsertWhatsappLog } from '@shared/schema';

/**
 * Interface for Zender message send parameters
 */
interface ZenderMessageParams {
  recipient: string;
  message: string;
  type?: 'text' | 'media' | 'button' | 'list' | 'template';
  media?: string; // URL for media messages
  caption?: string; // Caption for media messages
  filename?: string; // Filename for document messages
  buttons?: any[]; // For button messages
  sections?: any[]; // For list messages
  templateName?: string; // For template messages
  templateLanguage?: string; // For template messages
  templateComponents?: any[]; // For template messages
}

/**
 * Zender WhatsApp service controller
 */
export class ZenderService {
  private config: WhatsappConfig | null = null;
  private userId: number;
  private baseUrl: string = '';
  
  constructor(userId: number) {
    this.userId = userId;
  }
  
  /**
   * Initialize the Zender service with configuration
   */
  async initialize(): Promise<boolean> {
    try {
      // Get the WhatsApp configuration for this user
      this.config = await storage.getWhatsappConfigByUserId(this.userId);
      
      if (!this.config || !this.config.apiSecret || !this.config.accountId) {
        console.error('Zender configuration not found or incomplete');
        return false;
      }
      
      // Set the base URL for API calls
      this.baseUrl = this.config.zenderUrl || 'https://pakgame.store/WA/Install/api';
      
      return true;
    } catch (error) {
      console.error('Error initializing Zender service:', error);
      return false;
    }
  }
  
  /**
   * Send a WhatsApp message via Zender
   */
  async sendMessage(params: ZenderMessageParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Make sure we have initialized config
      if (!this.config) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            error: 'Zender service not initialized'
          };
        }
      }
      
      // Sanitize phone number (remove + and spaces)
      const sanitizedRecipient = params.recipient.replace(/[\s+]/g, '');
      
      // Create form data for the request
      const form = new FormData();
      form.append('secret', this.config!.apiSecret);
      form.append('account', this.config!.accountId);
      form.append('recipient', sanitizedRecipient);
      form.append('type', params.type || 'text');
      form.append('message', params.message);
      
      // Add optional parameters if provided
      if (params.media) {
        form.append('media', params.media);
      }
      
      if (params.caption) {
        form.append('caption', params.caption);
      }
      
      if (params.filename) {
        form.append('filename', params.filename);
      }
      
      // For template messages
      if (params.type === 'template' && params.templateName) {
        form.append('template', params.templateName);
        
        if (params.templateLanguage) {
          form.append('language', params.templateLanguage);
        }
        
        if (params.templateComponents) {
          form.append('components', JSON.stringify(params.templateComponents));
        }
      }
      
      // For button messages
      if (params.type === 'button' && params.buttons) {
        form.append('buttons', JSON.stringify(params.buttons));
      }
      
      // For list messages
      if (params.type === 'list' && params.sections) {
        form.append('sections', JSON.stringify(params.sections));
      }
      
      // Set the API endpoint for sending messages
      const sendUrl = `${this.baseUrl}/send/whatsapp`;
      
      // Make the POST request to Zender API
      const response = await axios.post(sendUrl, form, { 
        headers: form.getHeaders() 
      });
      
      // Check for success
      if (response.data && response.data.status === 'success') {
        // Log the successful message
        await this.logMessage({
          userId: this.userId,
          phoneNumber: sanitizedRecipient,
          message: params.message,
          mediaUrl: params.media,
          direction: 'outbound',
          timestamp: new Date()
        });
        
        return {
          success: true,
          messageId: response.data.data?.id || response.data.data?.message_id
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Unknown error from Zender API'
        };
      }
    } catch (error: any) {
      console.error('Error sending WhatsApp message via Zender:', error);
      
      let errorMessage = 'Unknown error';
      if (error.response) {
        errorMessage = `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
      } else if (error.request) {
        errorMessage = 'No response received from Zender API';
      } else {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Test the Zender connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Make sure we have initialized config
      if (!this.config) {
        const initialized = await this.initialize();
        if (!initialized) {
          return false;
        }
      }
      
      // We'll use a simpler endpoint to check connection status
      const statusUrl = `${this.baseUrl}/status`;
      
      // Create form data for the request
      const form = new FormData();
      form.append('secret', this.config!.apiSecret);
      form.append('account', this.config!.accountId);
      
      const response = await axios.post(statusUrl, form, { 
        headers: form.getHeaders() 
      });
      
      // Check for success response
      return response.data && response.data.status === 'success';
    } catch (error) {
      console.error('Error testing Zender connection:', error);
      return false;
    }
  }
  
  /**
   * Process incoming webhook data from Zender
   */
  async processWebhook(data: any): Promise<boolean> {
    try {
      if (!data) {
        return false;
      }
      
      // Each provider formats webhooks differently
      // For Zender, we'll extract the key information
      const messageData = data.data || data;
      
      if (!messageData.from || !messageData.message) {
        console.error('Invalid webhook data format from Zender');
        return false;
      }
      
      // Extract the key information
      const sender = messageData.from;
      const message = messageData.message;
      const mediaUrl = messageData.media_url || null;
      
      // Log the incoming message
      await this.logMessage({
        userId: this.userId,
        phoneNumber: sender,
        message: message,
        mediaUrl: mediaUrl,
        direction: 'inbound',
        timestamp: new Date()
      });
      
      // Record system activity
      await storage.createSystemActivity({
        module: 'WhatsApp',
        event: 'Message Received',
        status: 'Completed',
        timestamp: new Date(),
        details: {
          from: sender,
          messageContent: message.substring(0, 100) + (message.length > 100 ? '...' : '')
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error processing Zender webhook:', error);
      return false;
    }
  }
  
  /**
   * Helper method to log messages to the database
   */
  private async logMessage(logData: InsertWhatsappLog): Promise<void> {
    try {
      await storage.createWhatsappLog(logData);
    } catch (error) {
      console.error('Error logging WhatsApp message:', error);
    }
  }
}

// Singleton instance for the application to use
let zenderService: ZenderService | null = null;

/**
 * Get (or create) the Zender service instance
 */
export function getZenderService(userId: number = 1): ZenderService {
  if (!zenderService) {
    zenderService = new ZenderService(userId);
  }
  return zenderService;
}