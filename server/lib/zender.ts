import axios from 'axios';
import FormData from 'form-data';
import { storage } from '../storage';
import { WhatsappConfig, InsertWhatsappLog } from '@shared/schema';
import { broadcastMessage } from './websocket';
import { userProfileManager } from './user-profile-manager';

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
        // Based on the logs, even with status 200, Zender might return a queued or success message
        // Examples: "WhatsApp chat has been queued for sending!"
        if (response.data && 
            (response.data.status === 'success' || 
             response.data.status === 200 || 
             (response.data.message && response.data.message.includes('queued')))) {
          
          // Get message ID from response - paths may vary depending on response format
          const messageId = response.data.data?.id || 
                           response.data.data?.message_id || 
                           response.data.data?.messageId;
                           
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
          
          // Don't mark as error if it contains positive language like "queued" or "sent"
          if (errorMsg.toLowerCase().includes('queued') || 
              errorMsg.toLowerCase().includes('sent') ||
              errorMsg.toLowerCase().includes('success')) {
            
            console.log(`Message appears successful despite non-standard response: ${errorMsg}`);
            
            // Try to extract any message ID
            const messageId = response.data.data?.id || 
                             response.data.data?.message_id || 
                             response.data.data?.messageId;
            
            // Update as sent with ID if available
            await storage.updateWhatsappLog(loggedMessage.id, {
              status: 'sent',
              externalId: messageId || null
            });
            
            return {
              success: true,
              messageId: messageId
            };
          }
          
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
      // Format 4: New format from example with type=whatsapp and data array
      
      let sender = '';
      let message = '';
      let mediaUrl = null;
      let timestamp = new Date();
      let messageId = null;
      
      // Enhanced logging for all webhook data structures
      console.log('DEBUG: Full webhook data:', JSON.stringify(data, null, 2));
      console.log('DEBUG: Data type:', typeof data);
      console.log('DEBUG: Top-level keys:', Object.keys(data));
      
      // Check for the new format from the example where type="whatsapp" and data is an array/object
      if (data.type === 'whatsapp') {
        console.log('Processing webhook in Zender whatsapp format (type=whatsapp)');
        
        // Special handling for the form-encoded format with data[property] AND type=whatsapp
        if (!data.data && Object.keys(data).some(k => k.startsWith('data['))) {
          console.log('DEBUG: Detected form-encoded data with type=whatsapp');
          
          // Extract form-encoded data directly
          const keys = Object.keys(data);
          const widKey = keys.find(k => k === 'data[wid]');
          const phoneKey = keys.find(k => k === 'data[phone]');
          const messageKey = keys.find(k => k === 'data[message]');
          const idKey = keys.find(k => k === 'data[id]');
          const attachmentKey = keys.find(k => k === 'data[attachment]');
          const timestampKey = keys.find(k => k === 'data[timestamp]');
          
          if ((widKey || phoneKey) && messageKey) {
            // Prioritize phoneKey over widKey as phone contains the actual sender number
            sender = phoneKey ? data[phoneKey] : data[widKey];
            message = data[messageKey];
            
            if (idKey) {
              messageId = data[idKey];
            }
            
            if (attachmentKey && data[attachmentKey] !== '0') {
              mediaUrl = data[attachmentKey];
            }
            
            if (timestampKey && data[timestampKey]) {
              timestamp = new Date(parseInt(data[timestampKey]) * 1000);
            }
            
            console.log(`Extracted data from whatsapp webhook form-encoded format: ${sender}, ${message}`);
            // Don't return yet, continue processing the message below
            // The extracted data will be used in the standard processing flow
          }
        }
        
        // Regular handling for data object
        let webhookData;
        
        if (typeof data.data === 'object') {
          webhookData = data.data;
          console.log('DEBUG: data.data is an object:', webhookData);
        } else if (typeof data.data === 'string') {
          try {
            // Try to parse it if it's a JSON string
            webhookData = JSON.parse(data.data);
            console.log('DEBUG: data.data is a JSON string that was parsed:', webhookData);
          } catch (e) {
            console.log('DEBUG: data.data is a string but not valid JSON:', data.data);
            webhookData = null;
          }
        } else {
          console.log('DEBUG: Unexpected data.data type:', typeof data.data);
          webhookData = null;
        }
        
        if (webhookData) {
          // Extract data from the webhook format
          // Prioritize phone field over wid for consistent sender identification
          sender = webhookData.phone || webhookData.wid || '';
          message = webhookData.message || '';
          mediaUrl = webhookData.attachment || null;
          messageId = webhookData.id?.toString() || null;
          
          if (webhookData.timestamp) {
            timestamp = new Date(parseInt(webhookData.timestamp) * 1000);
          }
          
          console.log(`Extracted data from whatsapp webhook format: ${sender}, ${message}`);
        }
      }
      // First, try to extract from direct properties (Format 1)
      else if (data.from && data.message) {
        sender = data.from;
        message = data.message;
        mediaUrl = data.media_url || null;
        messageId = data.id || data.message_id || null;
        if (data.timestamp) {
          timestamp = new Date(parseInt(data.timestamp) * 1000);
        }
        console.log('DEBUG: Extracted from direct properties (Format 1)');
      } 
      // Try nested data object (Format 3)
      else if (data.data && (data.data.from || data.data.phone || data.data.wid)) {
        // Prioritize phone over wid for consistent sender identification
        sender = data.data.from || data.data.phone || data.data.wid;
        message = data.data.message || '';
        mediaUrl = data.data.media_url || data.data.attachment || null;
        messageId = data.data.id || data.data.message_id || null;
        if (data.data.timestamp) {
          timestamp = new Date(parseInt(data.data.timestamp) * 1000);
        }
        console.log('DEBUG: Extracted from nested data object (Format 3)');
      }
      // Try form-like data (Format 2)
      else {
        // Check for form-encoded data with data[property] format
        const keys = Object.keys(data);
        console.log('DEBUG: Checking form-like data keys:', keys);
        
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
      
      // Find or create a user profile for this sender
      try {
        console.log(`Finding or creating user profile for phone: ${sender}`);
        const userProfile = await userProfileManager.findOrCreateProfile({
          phone: sender,
          userId: this.userId
        });
        
        if (userProfile) {
          console.log(`User profile found/created with ID: ${userProfile.id}`);
          
          // Record this WhatsApp interaction
          await userProfileManager.recordInteraction(
            userProfile.id,
            'whatsapp',
            'inbound',
            message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            {
              timestamp: timestamp,
              phoneNumber: sender,
              mediaUrl: mediaUrl
            }
          );
          console.log(`Recorded inbound WhatsApp interaction for user profile ${userProfile.id}`);
          
          // Update the last seen timestamp for the user profile
          await userProfileManager.updateProfile(userProfile.id, {
            lastInteractionSource: 'whatsapp'
          });
        } else {
          console.warn(`Failed to create user profile for phone number: ${sender}`);
        }
      } catch (profileError) {
        console.error('Error managing user profile for WhatsApp sender:', profileError);
        // Continue with message processing even if profile management fails
      }
      
      // Log the incoming message with status
      const whatsappLog = await storage.createWhatsappLog({
        userId: this.userId,
        phoneNumber: sender,
        message: message,
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
              phoneNumber: sender,
              message: message,
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
          from: sender,
          messageContent: message.substring(0, 100) + (message.length > 100 ? '...' : '')
        }
      });
      
      // Generate AI response to the incoming message
      try {
        await this.generateAndSendAIResponse(sender, message);
      } catch (error) {
        console.error('Error generating AI response:', error);
        
        // Log the error but don't fail the entire webhook processing
        await storage.createSystemActivity({
          module: 'WhatsApp',
          event: 'AI Response Failed',
          status: 'Error',
          timestamp: new Date(),
          details: {
            error: error instanceof Error ? error.message : String(error),
            from: sender
          }
        });
      }
      
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

  /**
   * Simplified method to send a message to a phone number with text content
   */
  async sendTextMessage(phoneNumber: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      recipient: phoneNumber,
      message: text,
      type: 'text'
    });
  }
  
  /**
   * Generate an AI response to an incoming message and send it back to the user
   */
  private async generateAndSendAIResponse(phoneNumber: string, incomingMessage: string): Promise<void> {
    try {
      console.log(`Generating AI response to message from ${phoneNumber}: ${incomingMessage.substring(0, 50)}...`);
      
      // Get training data to include in the prompt
      const trainingData = await storage.getTrainingDataByUserId(this.userId);
      const trainingContent = trainingData.map(item => 
        `${item.category}: ${item.content}`
      ).join('\n\n');
      
      // Get product data to include in the prompt
      const products = await storage.getProductsByUserId(this.userId);
      const productContent = products.map(p => 
        `Product: ${p.name}\nDescription: ${p.description || 'N/A'}\nPrice: $${(p.priceInCents / 100).toFixed(2)}\nSKU: ${p.sku}`
      ).join('\n\n');
      
      // Check if this might be a scheduling request by looking for specific scheduling intent keywords
      // More specific to avoid false positives
      const scheduleKeywords = ['schedule a meeting', 'book a meeting', 'arrange a call', 'set up a meeting', 'book an appointment'];
      const messageHasScheduleKeywords = scheduleKeywords.some(
        keyword => incomingMessage.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // Check for email addresses in the message
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emailMatches = incomingMessage.match(emailRegex);
      const attendeeEmail = emailMatches ? emailMatches[0] : null;
      
      // Create the base prompt
      let systemPrompt = `You are an AI assistant for a business. Respond to customer inquiries in a helpful, professional manner. 
Keep responses concise but informative (max 3-4 sentences). Include relevant information about products or services when needed.

Available products:
${productContent}

Business information and common responses:
${trainingContent}

If the customer is asking about pricing, availability, or product details, provide the relevant information from the product catalog.
If the customer requests a meeting or callback, politely acknowledge this and state someone will contact them soon.
Be friendly but professional at all times.`;

      // Add scheduling intent detection to system prompt if keywords detected
      if (messageHasScheduleKeywords) {
        systemPrompt += `\n\nThis appears to be a meeting scheduling request. If the user wants to schedule a meeting:
1. Extract the requested date and time (interpret timezone abbreviations like PST, EST, etc.)
2. Identify the attendee email address 
3. Determine the meeting subject/purpose
4. Respond in JSON format with these properties: 
   {
     "is_scheduling_request": true,
     "date_time": "YYYY-MM-DD HH:MM:SS", 
     "email": "user@example.com",
     "subject": "Meeting subject",
     "duration_minutes": 30,
     "timezone": "America/Los_Angeles" 
   }

For example, if the user says "Schedule a meeting for tomorrow at 2pm PST with john@example.com", respond with:
{
  "is_scheduling_request": true,
  "date_time": "2025-04-18 14:00:00",
  "email": "john@example.com",
  "subject": "Follow-up Meeting",
  "duration_minutes": 30,
  "timezone": "America/Los_Angeles"
}

If this is NOT a meeting scheduling request, respond normally and set is_scheduling_request to false.`;
      }

      // Create messages array
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: incomingMessage }
      ];
      
      // Request completion from OpenAI
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured");
      }
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o", // Use the latest model
          messages: messages,
          max_tokens: 300,
          temperature: 0.7,
          // Only use JSON format if we have strong indicators of a scheduling request
          response_format: messageHasScheduleKeywords && incomingMessage.toLowerCase().includes('arrange') ? 
            { type: "json_object" } : undefined
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      const aiReplyText = responseData.choices[0].message.content.trim();
      let replyToUser = aiReplyText;
      
      // If this is a scheduling request, process it
      if (messageHasScheduleKeywords) {
        try {
          // Try to parse the response as JSON
          let schedulingData;
          try {
            schedulingData = JSON.parse(aiReplyText);
          } catch (jsonError) {
            // If we can't parse as JSON, it's likely a regular text response
            console.log('Response is not in JSON format, treating as regular text');
            schedulingData = { is_scheduling_request: false };
          }
          
          if (schedulingData.is_scheduling_request === true) {
            console.log('Detected meeting scheduling request:', schedulingData);
            
            // The AI sometimes generates dates in the past, so let's make sure we're using tomorrow's date
            // Get tomorrow's date
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Extract just the time part from the AI-suggested time
            let aiDateTime;
            try {
                aiDateTime = new Date(schedulingData.date_time);
            } catch (e) {
                // If parsing fails, default to 3pm
                aiDateTime = new Date();
                aiDateTime.setHours(15, 0, 0, 0);
            }
            
            // Set tomorrow's date with the AI-suggested time
            const parsedDateTime = new Date(
                tomorrow.getFullYear(),
                tomorrow.getMonth(),
                tomorrow.getDate(),
                aiDateTime.getHours(),
                aiDateTime.getMinutes(),
                0
            );
            console.log('Using future date time:', parsedDateTime);
            
            // Calculate end time based on duration
            const duration = schedulingData.duration_minutes || 30;
            const endDateTime = new Date(parsedDateTime.getTime() + (duration * 60 * 1000));
            console.log('End date time:', endDateTime);
            
            // Use timezone if provided
            const timezone = schedulingData.timezone || 'UTC';
            
            // Format meeting data for the API endpoint (same format as used by the manual scheduling form)
            const meetingData = {
              subject: schedulingData.subject || 'Meeting from WhatsApp',
              description: `Meeting scheduled via WhatsApp chat with ${phoneNumber}. Original message: "${incomingMessage}"`,
              startTime: parsedDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
              attendees: [schedulingData.email || `${phoneNumber}@whatsapp.virtual.user`],
              timezone: timezone
            };
            
            console.log('Scheduling meeting with formatted data:', meetingData);
            
            // Use direct Google Calendar scheduling function instead of API endpoint to avoid authentication issues
            console.log('Directly calling the scheduleMeeting function from the Google Calendar module');
            const { scheduleMeeting } = await import('./google-calendar');
            
            // Prepare the meeting data in the format expected by the scheduleMeeting function
            // Use our properly formatted future date
            const meetingRequestData = {
              attendeeEmail: schedulingData.email || `${phoneNumber}@whatsapp.virtual.user`,
              subject: schedulingData.subject || 'Meeting from WhatsApp',
              dateTimeString: parsedDateTime.toISOString(), // Use our corrected future date
              duration: schedulingData.duration_minutes || 30,
              description: `Meeting scheduled via WhatsApp chat with ${phoneNumber}. Original message: "${incomingMessage}"`
            };
            
            // Directly call scheduleMeeting function (bypassing API authentication)
            const responseData = await scheduleMeeting(this.userId, meetingRequestData);
            
            console.log('Meeting scheduling response:', JSON.stringify(responseData, null, 2));
            
            // Create a user-friendly response
            if (responseData.success) {
              // Get meeting link if available
              const meetingLink = responseData.meetingLink || "No link available";
              
              // Create a user-friendly reply
              replyToUser = `I've scheduled your meeting for ${parsedDateTime.toLocaleString()} with ${schedulingData.email || 'you'}.\n\nSubject: ${schedulingData.subject || 'Meeting from WhatsApp'}\n\nMeeting link: ${meetingLink}`;
              
              // Log the meeting scheduling
              await storage.createSystemActivity({
                module: 'Calendar',
                event: 'Meeting Scheduled via WhatsApp',
                status: 'Completed',
                timestamp: new Date(),
                details: {
                  phone: phoneNumber,
                  subject: schedulingData.subject,
                  startTime: parsedDateTime.toISOString(),
                  meetingLink: meetingLink
                }
              });
            } else {
              // If there was an error, inform the user
              replyToUser = `I'm sorry, I couldn't schedule your meeting due to an error: ${responseData.error}. Please try again or contact our support team.`;
            }
          }
        } catch (error) {
          console.error('Error processing scheduling request:', error);
          // If we can't parse the JSON, just use the AI response as is
        }
      }
      
      console.log(`AI generated response: ${replyToUser.substring(0, 100)}...`);
      
      // Log system activity about AI generating a response
      await storage.createSystemActivity({
        module: 'WhatsApp',
        event: 'AI Response Generated',
        status: 'Completed',
        timestamp: new Date(),
        details: {
          to: phoneNumber,
          messagePreview: replyToUser.substring(0, 100) + (replyToUser.length > 100 ? '...' : '')
        }
      });
      
      // Get active WhatsApp template for sent messages
      const sentTemplates = await storage.getWhatsappTemplatesByCategory(this.userId, 'sent');
      let messageBody = replyToUser;
      
      // Use template if available
      if (sentTemplates.length > 0) {
        // Sort by most recently updated and take the first one
        const template = sentTemplates.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        
        // Update template's lastUsed timestamp
        await storage.updateWhatsappTemplate(template.id, {});
        
        // Use the template content with AI message as a variable
        messageBody = template.content.replace('{{message}}', replyToUser);
      }
      
      // Find user profile for this phone number (should already exist from inbound message)
      try {
        const userProfile = await userProfileManager.findOrCreateProfile({
          phone: phoneNumber,
          userId: this.userId
        });
        
        // Record this outbound interaction in the user profile
        if (userProfile) {
          await userProfileManager.recordInteraction(
            userProfile.id,
            'whatsapp',
            'outbound',
            messageBody.substring(0, 100) + (messageBody.length > 100 ? '...' : ''),
            {
              timestamp: new Date(),
              phoneNumber: phoneNumber,
              aiGenerated: true
            }
          );
          console.log(`Recorded outbound WhatsApp interaction for user profile ${userProfile.id}`);
          
          // Update last interaction source in profile
          await userProfileManager.updateProfile(userProfile.id, {
            lastSeen: new Date(),
            lastInteractionSource: 'whatsapp'
          });
        }
      } catch (profileError) {
        console.error('Error managing user profile for WhatsApp response:', profileError);
        // Continue with sending message even if profile management fails
      }
      
      // Send the AI response back to the user
      const result = await this.sendTextMessage(phoneNumber, messageBody);
      
      if (!result.success) {
        throw new Error(`Failed to send AI response: ${result.error}`);
      }
      
      // Log system activity
      await storage.createSystemActivity({
        module: 'WhatsApp',
        event: 'AI Response Sent',
        status: 'Completed',
        timestamp: new Date(),
        details: {
          to: phoneNumber,
          messageContent: messageBody.substring(0, 100) + (messageBody.length > 100 ? '...' : '')
        }
      });
    } catch (error) {
      console.error('Error generating or sending AI response:', error);
      throw error;
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