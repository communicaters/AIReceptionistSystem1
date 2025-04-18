/**
 * WhatsApp Profile Handler
 * Integrates WhatsApp messages with user profile management and personalized AI responses
 * using the unified agent handler for standardized behavior across channels
 */

import { storage } from '../database-storage';
import { userProfileManager } from './user-profile-manager';
import { ZenderService } from './zender';
import { processMessage } from './unified-agent-handler';
import { type AgentProcessingOptions } from './types';

/**
 * Process a WhatsApp message with user profile management
 * using the unified agent handler
 */
export async function processWhatsappMessageWithProfile(
  userId: number,
  phoneNumber: string,
  incomingMessage: string,
  zenderService?: ZenderService
): Promise<{ success: boolean; reply?: string; error?: string }> {
  try {
    console.log(`Processing WhatsApp message with unified agent for ${phoneNumber}: ${incomingMessage.substring(0, 50)}...`);
    
    // Create processing options for the unified agent
    const options: AgentProcessingOptions = {
      userId,
      contactIdentifier: phoneNumber,
      message: incomingMessage,
      channel: 'whatsapp'
    };
    
    // Process the message using the unified agent handler
    const result = await processMessage(options);
    
    // Send the message if Zender service is provided
    if (result.success && zenderService) {
      const sendResult = await zenderService.sendTextMessage(phoneNumber, result.response);
      
      if (!sendResult.success) {
        console.error(`Failed to send WhatsApp message: ${sendResult.error}`);
        return { success: false, error: sendResult.error || 'Failed to send message' };
      }
    }
    
    // Create system activity record
    await storage.createSystemActivity({
      module: 'WhatsApp',
      event: 'Message Processed',
      status: result.success ? 'Completed' : 'Failed',
      timestamp: new Date(),
      details: { 
        to: phoneNumber,
        wasSchedulingRequest: result.schedulingResult?.isSchedulingRequest || false,
        scheduled: result.schedulingResult?.scheduled || false,
        profileId: result.profileId
      }
    });
    
    return { 
      success: result.success, 
      reply: result.response,
      error: result.error
    };
  } catch (error) {
    console.error('Error in processWhatsappMessageWithProfile:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error processing WhatsApp message' 
    };
  }
}