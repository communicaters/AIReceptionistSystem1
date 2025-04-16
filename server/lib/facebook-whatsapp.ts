import axios from 'axios';
import { storage } from '../storage';
import { FacebookWhatsappConfig, InsertWhatsappLog } from '@shared/schema';
import { broadcastMessage } from './websocket';

// Extended interface that includes the new fields
interface ExtendedWhatsappLog extends InsertWhatsappLog {
  status?: string;
  externalId?: string;
}

/**
 * Interface for Facebook API message send parameters
 */
interface FacebookMessageParams {
  recipient: string;
  message: string;
  mediaUrl?: string; // URL for media messages
}

/**
 * Facebook WhatsApp service controller
 */
export class FacebookWhatsappService {
  private config: FacebookWhatsappConfig | null = null;
  private userId: number;
  private apiVersion: string = 'v19.0'; // Current Facebook Graph API version
  
  constructor(userId: number) {
    this.userId = userId;
  }
  
  /**
   * Initialize the Facebook WhatsApp service with configuration
   */
  async initialize(): Promise<boolean> {
    try {
      // Get the Facebook WhatsApp configuration for this user
      const config = await storage.getFacebookWhatsappConfigByUserId(this.userId);
      
      // Update to handle undefined vs null correctly
      this.config = config || null;
      
      if (!this.config || !this.config.accessToken || !this.config.phoneNumberId) {
        console.error('Facebook WhatsApp configuration not found or incomplete');
        return false;
      }
      
      console.log(`Initialized Facebook WhatsApp service for user ${this.userId}`);
      return true;
    } catch (error) {
      console.error('Error initializing Facebook WhatsApp service:', error);
      return false;
    }
  }
  
  /**
   * Send a WhatsApp message via Facebook Graph API
   */
  async sendMessage(params: FacebookMessageParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Make sure we have initialized config
      if (!this.config) {
        console.log('Config not initialized, attempting to initialize Facebook WhatsApp service');
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Failed to initialize Facebook WhatsApp service for sending message');
          return {
            success: false,
            error: 'Facebook WhatsApp service not initialized'
          };
        }
      }
      
      // Check for required config
      if (!this.config || !this.config.accessToken || !this.config.phoneNumberId) {
        console.error('Missing required Facebook WhatsApp configuration for sending message');
        return {
          success: false,
          error: 'Missing Facebook WhatsApp configuration'
        };
      }
      
      // Sanitize phone number (remove + and spaces)
      const sanitizedRecipient = params.recipient.replace(/[\s+]/g, '');
      console.log(`Preparing to send WhatsApp message to ${sanitizedRecipient} via Facebook API`);
      
      const timestamp = new Date();
      
      // Create the message request body
      let requestBody;
      if (params.mediaUrl) {
        // Media message
        requestBody = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizedRecipient,
          type: 'image', // Currently supporting only image type, could be extended
          image: { 
            link: params.mediaUrl
          }
        };
      } else {
        // Text message
        requestBody = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizedRecipient,
          type: 'text',
          text: { 
            body: params.message 
          }
        };
      }
      
      // Log the message with 'pending' status before sending
      const loggedMessage = await storage.createWhatsappLog({
        userId: this.userId,
        phoneNumber: sanitizedRecipient,
        message: params.message,
        mediaUrl: params.mediaUrl,
        direction: 'outbound',
        timestamp: timestamp,
        status: 'pending'
      });
      
      console.log(`Created outbound message log with ID ${loggedMessage.id} and pending status`);
      
      try {
        // Make the POST request to Facebook Graph API
        const sendUrl = `https://graph.facebook.com/${this.apiVersion}/${this.config.phoneNumberId}/messages`;
        const response = await axios.post(sendUrl, requestBody, {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        });
        
        console.log('Facebook WhatsApp API response:', response.data);
        
        // Check for success
        if (response.data && response.data.messages && response.data.messages.length > 0) {
          const messageId = response.data.messages[0].id;
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
          // The API returned a response but it wasn't in the expected format
          console.error('Unexpected Facebook API response format:', response.data);
          
          // Update message status to failed
          await storage.updateWhatsappLog(loggedMessage.id, {
            status: 'failed'
          });
          
          return {
            success: false,
            error: 'Unexpected API response format'
          };
        }
      } catch (apiError: any) {
        // More detailed logging for API errors
        let errorMsg = 'Unknown API error';
        
        if (apiError.response) {
          // The request was made and the server responded with a status code outside of 2xx
          errorMsg = `API error ${apiError.response.status}: ${JSON.stringify(apiError.response.data)}`;
          console.error(`Facebook API error ${apiError.response.status}:`, apiError.response.data);
        } else if (apiError.request) {
          // The request was made but no response was received
          errorMsg = 'No response from Facebook WhatsApp service (timeout)';
          console.error('No response received from Facebook API (timeout)');
        } else {
          // Something happened in setting up the request
          errorMsg = `Request setup error: ${apiError.message}`;
          console.error('Error setting up Facebook request:', apiError.message);
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
      console.error('Unexpected error sending WhatsApp message via Facebook:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Test the Facebook WhatsApp API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Make sure we have initialized config
      if (!this.config) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Failed to initialize Facebook WhatsApp config for test connection');
          return false;
        }
      }
      
      if (!this.config || !this.config.accessToken || !this.config.phoneNumberId) {
        console.error('Facebook WhatsApp config missing required credentials for test');
        return false;
      }
      
      // Use a simpler endpoint to check connection status - just fetch phone number info
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.config.phoneNumberId}`;
      
      try {
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`
          },
          timeout: 10000 // 10 second timeout
        });
        
        console.log('Facebook WhatsApp connection test response:', response.data);
        
        // Check for successful response containing expected phone number data
        const isSuccess = response.data && response.data.id === this.config.phoneNumberId;
        console.log(`Facebook WhatsApp connection test ${isSuccess ? 'successful' : 'failed'}`);
        
        return isSuccess;
      } catch (apiError: any) {
        // More detailed error logging for API errors
        if (apiError.response) {
          console.error(`Facebook API error: ${apiError.response.status}`, apiError.response.data);
        } else if (apiError.request) {
          console.error('Facebook API timeout or no response received');
        } else {
          console.error('Facebook API request error:', apiError.message);
        }
        
        return false;
      }
    } catch (error) {
      console.error('Unexpected error testing Facebook WhatsApp connection:', error);
      return false;
    }
  }
  
  /**
   * Process incoming webhook data from Facebook
   */
  async processWebhook(data: any): Promise<boolean> {
    try {
      if (!data) {
        console.error('No data received in Facebook webhook');
        return false;
      }
      
      console.log('Processing Facebook webhook:', JSON.stringify(data, null, 2));
      
      // Facebook sends webhooks in a specific format
      if (data.object !== 'whatsapp_business_account') {
        console.error('Not a WhatsApp Business webhook');
        return false;
      }
      
      // Process entries from the webhook
      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;
            
            if (value && value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                await this.processIncomingMessage(value, message);
              }
            }
            
            // Also check for message status updates
            if (value && value.statuses && value.statuses.length > 0) {
              for (const status of value.statuses) {
                await this.processStatusUpdate(status);
              }
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error processing Facebook webhook:', error);
      return false;
    }
  }
  
  /**
   * Process an incoming message from Facebook webhook
   */
  private async processIncomingMessage(value: any, message: any): Promise<boolean> {
    try {
      const from = value.contacts[0]?.wa_id;
      const timestamp = new Date(parseInt(message.timestamp) * 1000);
      const messageId = message.id;
      
      let messageText = '';
      let mediaUrl = null;
      
      // Handle different message types
      if (message.type === 'text' && message.text) {
        messageText = message.text.body;
      } else if (message.type === 'image' && message.image) {
        mediaUrl = message.image.url || message.image.id;
        messageText = message.image.caption || '[Image]';
      } else if (message.type === 'video' && message.video) {
        mediaUrl = message.video.url || message.video.id;
        messageText = message.video.caption || '[Video]';
      } else if (message.type === 'audio' && message.audio) {
        mediaUrl = message.audio.url || message.audio.id;
        messageText = '[Audio]';
      } else if (message.type === 'document' && message.document) {
        mediaUrl = message.document.url || message.document.id;
        messageText = message.document.caption || `[Document: ${message.document.filename}]`;
      } else {
        messageText = `[${message.type} message]`;
      }
      
      console.log(`Received message from ${from}: ${messageText}`);
      
      // Log the incoming message with status
      const whatsappLog = await storage.createWhatsappLog({
        userId: this.userId,
        phoneNumber: from,
        message: messageText,
        mediaUrl: mediaUrl,
        direction: 'inbound',
        timestamp: timestamp,
        status: 'received',
        externalId: messageId
      });
      
      console.log(`Created WhatsApp log entry with ID: ${whatsappLog.id}`);
      
      // Broadcast the message via WebSocket to update UI in real-time
      if (broadcastMessage) {
        try {
          broadcastMessage({
            type: 'whatsapp_message',
            timestamp: new Date().toISOString(),
            data: {
              id: whatsappLog.id,
              phoneNumber: from,
              message: messageText,
              direction: 'inbound',
              timestamp: timestamp,
              status: 'received'
            }
          });
          console.log('Broadcast WhatsApp message notification to all connected clients');
        } catch (error) {
          console.error('Error broadcasting WhatsApp message:', error);
        }
      } else {
        console.warn('broadcastMessage function not available, cannot send real-time notification');
      }
      
      // Record system activity
      await storage.createSystemActivity({
        module: 'WhatsApp',
        event: 'Message Received',
        status: 'Completed',
        timestamp: new Date(),
        details: {
          from: from,
          messageContent: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : '')
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error processing incoming Facebook message:', error);
      return false;
    }
  }
  
  /**
   * Process a message status update from Facebook webhook
   */
  private async processStatusUpdate(status: any): Promise<boolean> {
    try {
      console.log('Processing Facebook status update:', JSON.stringify(status, null, 2));
      
      const messageId = status.id;
      let statusValue = 'unknown';
      
      // Map Facebook status to our status values
      if (status.status === 'delivered') {
        statusValue = 'delivered';
      } else if (status.status === 'read') {
        statusValue = 'read';
      } else if (status.status === 'sent') {
        statusValue = 'sent';
      } else if (status.status === 'failed') {
        statusValue = 'failed';
      }
      
      console.log(`Processing status update for message ${messageId}: ${status.status} -> ${statusValue}`);
      
      // Try to find the message in our database by externalId
      const message = await storage.getMostRecentWhatsappLogByExternalId(messageId);
      
      if (message) {
        // Update the message status
        await storage.updateWhatsappLog(message.id, {
          status: statusValue
        });
        
        console.log(`Updated message ${message.id} with status: ${statusValue}`);
        
        // Record system activity
        await storage.createSystemActivity({
          module: 'WhatsApp',
          event: 'Message Status Updated',
          status: 'Completed',
          timestamp: new Date(),
          details: {
            messageId: message.id,
            externalId: messageId,
            newStatus: statusValue
          }
        });
        
        return true;
      } else {
        console.warn(`Could not find message with external ID: ${messageId}`);
        return false;
      }
    } catch (error) {
      console.error('Error processing Facebook status update:', error);
      return false;
    }
  }
}

// Singleton instance for the application to use
let facebookWhatsappService: FacebookWhatsappService | null = null;

/**
 * Get (or create) the Facebook WhatsApp service instance
 */
export function getFacebookWhatsappService(userId: number = 1): FacebookWhatsappService {
  if (!facebookWhatsappService) {
    facebookWhatsappService = new FacebookWhatsappService(userId);
  }
  return facebookWhatsappService;
}