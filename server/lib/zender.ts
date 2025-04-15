import axios from 'axios';
import FormData from 'form-data';
import { storage } from '../storage';
import { WhatsappConfig, InsertWhatsappLog } from '@shared/schema';

// Extended interface that includes the new fields
interface ExtendedWhatsappLog extends InsertWhatsappLog {
  status?: string;
  externalId?: string;
}

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
        console.log('Config not initialized, attempting to initialize Zender service');
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Failed to initialize Zender service for sending message');
          return {
            success: false,
            error: 'Zender service not initialized'
          };
        }
      }
      
      // Check for required config
      if (!this.config || !this.config.apiSecret || !this.config.accountId) {
        console.error('Missing required Zender configuration for sending message');
        return {
          success: false,
          error: 'Missing Zender configuration (API secret or account ID)'
        };
      }
      
      // Sanitize phone number (remove + and spaces)
      const sanitizedRecipient = params.recipient.replace(/[\s+]/g, '');
      console.log(`Preparing to send WhatsApp message to ${sanitizedRecipient} via Zender`);
      
      // Create form data for the request
      const form = new FormData();
      form.append('secret', this.config.apiSecret);
      form.append('account', this.config.accountId);
      form.append('recipient', sanitizedRecipient);
      form.append('type', params.type || 'text');
      form.append('message', params.message);
      
      // Add optional parameters if provided
      if (params.media) {
        form.append('media', params.media);
        console.log(`Message includes media URL: ${params.media.substring(0, 30)}...`);
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
        console.log(`Using template message: ${params.templateName}`);
        
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
        console.log(`Message includes ${params.buttons.length} buttons`);
      }
      
      // For list messages
      if (params.type === 'list' && params.sections) {
        form.append('sections', JSON.stringify(params.sections));
        console.log(`Message includes list with ${params.sections.length} sections`);
      }
      
      // Set the API endpoint for sending messages
      const sendUrl = `${this.baseUrl}/send/whatsapp`;
      console.log(`Sending message to Zender API: ${sendUrl}`);
      
      // Log the message with 'pending' status before sending
      const timestamp = new Date();
      const loggedMessage = await storage.createWhatsappLog({
        userId: this.userId,
        phoneNumber: sanitizedRecipient,
        message: params.message,
        mediaUrl: params.media,
        direction: 'outbound',
        timestamp: timestamp,
        status: 'pending'
      });
      
      console.log(`Created outbound message log with ID ${loggedMessage.id} and pending status`);
      
      try {
        // Make the POST request to Zender API with timeout
        const response = await axios.post(sendUrl, form, { 
          headers: form.getHeaders(),
          timeout: 15000 // 15 second timeout
        });
        
        console.log('Zender API response:', response.data);
        
        // Check for success
        if (response.data && response.data.status === 'success') {
          // Get message ID from response
          const messageId = response.data.data?.id || response.data.data?.message_id;
          console.log(`Message sent successfully, ID: ${messageId}`);
          
          // Update the message log with the external ID and 'sent' status
          await storage.updateWhatsappLog(loggedMessage.id, {
            status: 'sent',
            externalId: messageId
          });
          
          return {
            success: true,
            messageId: messageId
          };
        } else {
          // The API returned a response but it wasn't successful
          const errorMsg = response.data?.message || 'Unknown error from Zender API';
          console.error(`Zender API returned error: ${errorMsg}`);
          
          // Update message status to failed
          await storage.updateWhatsappLog(loggedMessage.id, {
            status: 'failed'
          });
          
          return {
            success: false,
            error: errorMsg
          };
        }
      } catch (apiError: any) {
        // More detailed logging for API errors
        let errorMsg = 'Unknown API error';
        
        if (apiError.response) {
          // The request was made and the server responded with a status code outside of 2xx
          errorMsg = `API error ${apiError.response.status}: ${JSON.stringify(apiError.response.data)}`;
          console.error(`Zender API error ${apiError.response.status}:`, apiError.response.data);
        } else if (apiError.request) {
          // The request was made but no response was received
          errorMsg = 'No response from WhatsApp service (timeout)';
          console.error('No response received from Zender API (timeout)');
        } else {
          // Something happened in setting up the request
          errorMsg = `Request setup error: ${apiError.message}`;
          console.error('Error setting up Zender request:', apiError.message);
        }
        
        // Update message status to failed
        await storage.updateWhatsappLog(loggedMessage.id, {
          status: 'failed'
        });
        
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error: any) {
      console.error('Unexpected error sending WhatsApp message via Zender:', error);
      
      // We don't have access to loggedMessage here as the error happened before it was assigned
      // We should log the error but can't easily update the message status in this case
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
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
          console.error('Failed to initialize Zender config for test connection');
          return false;
        }
      }
      
      if (!this.config || !this.config.apiSecret || !this.config.accountId) {
        console.error('Zender config missing required credentials for test');
        return false;
      }
      
      // We'll use a simpler endpoint to check connection status
      const statusUrl = `${this.baseUrl}/status`;
      console.log(`Testing Zender connection with URL: ${statusUrl}`);
      
      // Create form data for the request
      const form = new FormData();
      form.append('secret', this.config.apiSecret);
      form.append('account', this.config.accountId);
      
      try {
        const response = await axios.post(statusUrl, form, { 
          headers: form.getHeaders(),
          timeout: 10000 // 10 second timeout
        });
        
        console.log('Zender test connection response:', response.data);
        
        // Check for success response
        const isSuccess = response.data && response.data.status === 'success';
        console.log(`Zender connection test ${isSuccess ? 'successful' : 'failed'}`);
        
        return isSuccess;
      } catch (apiError: any) {
        // More detailed error logging for API errors
        if (apiError.response) {
          // The request was made and the server responded with a status code outside of 2xx
          console.error(`Zender API error: ${apiError.response.status}`, apiError.response.data);
        } else if (apiError.request) {
          // The request was made but no response was received
          console.error('Zender API timeout or no response received');
        } else {
          // Something happened in setting up the request
          console.error('Zender API request error:', apiError.message);
        }
        
        return false;
      }
    } catch (error) {
      console.error('Unexpected error testing Zender connection:', error);
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
      
      // Check if this is a status update webhook
      if (data.type === 'status' || 
          data.data?.type === 'status' || 
          data['data[type]'] === 'status' ||
          data.status || 
          data.data?.status || 
          data['data[status]']) {
        return await this.processStatusUpdate(data);
      }
      
      // Otherwise, process as a regular message webhook
      // Zender webhooks come in different formats depending on the configuration
      // Format 1: Direct data object with properties
      // Format 2: Form-like data with data[property] format
      // Format 3: Nested data object
      
      let sender = '';
      let message = '';
      let mediaUrl = null;
      let timestamp = new Date();
      let messageId = null;
      
      // First, try to extract from direct properties (Format 1)
      if (data.from && data.message) {
        sender = data.from;
        message = data.message;
        mediaUrl = data.media_url || null;
        messageId = data.id || data.message_id || null;
        if (data.timestamp) {
          timestamp = new Date(parseInt(data.timestamp) * 1000);
        }
      } 
      // Try nested data object (Format 3)
      else if (data.data && (data.data.from || data.data.phone)) {
        sender = data.data.from || data.data.phone;
        message = data.data.message || '';
        mediaUrl = data.data.media_url || null;
        messageId = data.data.id || data.data.message_id || null;
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
          
          // Look for message ID
          const idKey = keys.find(k => k === 'data[id]' || k === 'data[message_id]');
          if (idKey) {
            messageId = data[idKey];
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
      
      // Log the incoming message with status
      await storage.createWhatsappLog({
        userId: this.userId,
        phoneNumber: sender,
        message: message,
        mediaUrl: mediaUrl,
        direction: 'inbound',
        timestamp: timestamp,
        status: 'received',
        externalId: messageId
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
  private async logMessage(logData: ExtendedWhatsappLog): Promise<void> {
    try {
      await storage.createWhatsappLog(logData);
    } catch (error) {
      console.error('Error logging WhatsApp message:', error);
    }
  }

  /**
   * Process a status update webhook from Zender
   */
  private async processStatusUpdate(data: any): Promise<boolean> {
    try {
      console.log('Processing Zender status update webhook:', JSON.stringify(data, null, 2));
      
      // Extract the message ID and status from the webhook data
      let messageId = '';
      let status = '';
      
      // Handle different webhook formats
      if (data.id && data.status) {
        // Format 1: Direct properties
        messageId = data.id;
        status = data.status.toLowerCase();
      } else if (data.data && data.data.id && data.data.status) {
        // Format 2: Nested data object
        messageId = data.data.id;
        status = data.data.status.toLowerCase();
      } else {
        // Format 3: Form-like data
        const keys = Object.keys(data);
        const idKey = keys.find(k => k === 'data[id]' || k === 'data[message_id]');
        const statusKey = keys.find(k => k === 'data[status]');
        
        if (idKey && statusKey) {
          messageId = data[idKey];
          status = data[statusKey].toLowerCase();
        } else {
          console.error('Could not extract message ID or status from webhook data');
          return false;
        }
      }
      
      if (!messageId) {
        console.error('No message ID found in status update webhook');
        return false;
      }
      
      // Map Zender status to our status values
      let mappedStatus = 'sent';
      if (status.includes('deliver')) {
        mappedStatus = 'delivered';
      } else if (status.includes('read')) {
        mappedStatus = 'read';
      } else if (status.includes('fail') || status.includes('error')) {
        mappedStatus = 'failed';
      }
      
      console.log(`Processing status update for message ${messageId}: ${status} -> ${mappedStatus}`);
      
      // Try to find the message in our database by externalId
      const message = await storage.getMostRecentWhatsappLogByExternalId(messageId);
      
      if (message) {
        // Update the message status
        await storage.updateWhatsappLog(message.id, {
          status: mappedStatus
        });
        
        console.log(`Updated message ${message.id} with status: ${mappedStatus}`);
        
        // Record system activity
        await storage.createSystemActivity({
          module: 'WhatsApp',
          event: 'Message Status Updated',
          status: 'Completed',
          timestamp: new Date(),
          details: {
            messageId: message.id,
            externalId: messageId,
            newStatus: mappedStatus
          }
        });
        
        return true;
      } else {
        console.warn(`Could not find message with external ID: ${messageId}`);
        return false;
      }
    } catch (error) {
      console.error('Error processing status update webhook:', error);
      return false;
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