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
      const config = await storage.getWhatsappConfigByUserId(this.userId);
      
      // Update to handle undefined vs null correctly to fix LSP error
      this.config = config || null;
      
      if (!this.config || !this.config.apiSecret || !this.config.accountId) {
        console.error('Zender configuration not found or incomplete');
        return false;
      }
      
      // Set the base URL for API calls
      this.baseUrl = this.config.zenderUrl || 'https://pakgame.store/WA/Install/api';
      
      // Remove any trailing slashes from the URL to ensure consistent URL formatting
      this.baseUrl = this.baseUrl.replace(/\/+$/, '');
      
      console.log(`Initialized Zender service with base URL: ${this.baseUrl}`);
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
        console.error('No data received in Zender webhook');
        return false;
      }
      
      console.log('Processing Zender webhook:', JSON.stringify(data, null, 2));
      
      // Zender webhooks come in different formats depending on the configuration
      // Format 1: Direct data object with properties
      // Format 2: Form-like data with data[property] format
      // Format 3: Nested data object
      
      let sender = '';
      let message = '';
      let mediaUrl = null;
      let timestamp = new Date();
      
      // First, try to extract from direct properties (Format 1)
      if (data.from && data.message) {
        sender = data.from;
        message = data.message;
        mediaUrl = data.media_url || null;
        if (data.timestamp) {
          timestamp = new Date(parseInt(data.timestamp) * 1000);
        }
      } 
      // Try nested data object (Format 3)
      else if (data.data && (data.data.from || data.data.phone)) {
        sender = data.data.from || data.data.phone;
        message = data.data.message || '';
        mediaUrl = data.data.media_url || null;
        if (data.data.timestamp) {
          timestamp = new Date(parseInt(data.data.timestamp) * 1000);
        }
      }
      // Try form-like data (Format 2)
      else {
        // Check for form-encoded data with data[property] format
        const keys = Object.keys(data);
        const fromKey = keys.find(k => k === 'data[from]' || k === 'data[phone]' || k === 'data[wid]');
        const messageKey = keys.find(k => k === 'data[message]');
        
        if (fromKey && messageKey) {
          sender = data[fromKey];
          message = data[messageKey];
          
          // Look for media URL
          const mediaKey = keys.find(k => k === 'data[media_url]' || k === 'data[attachment]');
          if (mediaKey) {
            mediaUrl = data[mediaKey];
          }
          
          // Look for timestamp
          const timestampKey = keys.find(k => k === 'data[timestamp]');
          if (timestampKey && data[timestampKey]) {
            timestamp = new Date(parseInt(data[timestampKey]) * 1000);
          }
        }
      }
      
      // Validate that we have the minimum required data
      if (!sender || !message) {
        console.error('Could not extract sender or message from Zender webhook data');
        return false;
      }
      
      // Clean up phone number (sometimes Zender includes +)
      sender = sender.replace(/^\+/, '');
      
      console.log(`Extracted webhook data - From: ${sender}, Message: ${message.substring(0, 30)}...`);
      
      // Log the incoming message
      await this.logMessage({
        userId: this.userId,
        phoneNumber: sender,
        message: message,
        mediaUrl: mediaUrl,
        direction: 'inbound',
        timestamp: timestamp
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