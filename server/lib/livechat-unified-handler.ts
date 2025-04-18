/**
 * Live Chat Unified Handler
 * 
 * Provides centralized chat message processing with user profile management
 * and standardized behavior across all channels.
 */

import { storage } from '../database-storage';
import { userProfileManager } from './user-profile-manager';
import { getUserProfileAssistant } from './user-profile-assistant';
import { scheduleMeeting } from './google-calendar';
import { classifyIntent } from './openai';
import { WebSocket } from 'ws';

/**
 * Process a live chat message with unified user profile management
 */
export async function processLiveChatWithUnifiedProfile(
  userId: number,
  sessionId: string,
  message: string,
  sendToClient: (ws: WebSocket, data: any) => void,
  ws: WebSocket
): Promise<{
  success: boolean;
  response: string;
  intent?: string;
  isSchedulingRequest?: boolean;
  error?: string;
}> {
  try {
    console.log(`Processing Live Chat message with unified profile for session ${sessionId}`);
    
    // Use the Profile Assistant to handle the chat with unified profile awareness
    const userProfileAssistant = getUserProfileAssistant();
    
    // Generate a context-aware response
    const { response: aiReplyText, profileId } = await userProfileAssistant.generateResponse(
      userId,
      sessionId,
      message,
      'chat'
    );
    
    if (!profileId) {
      console.error(`Failed to get profile ID for chat session ${sessionId}`);
      
      const errorResponse = "I'm having trouble accessing your information. Please try sending your message again.";
      
      // Send error response back to client
      sendToClient(ws, {
        type: 'chat',
        message: errorResponse,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        response: errorResponse,
        error: "Failed to get profile ID"
      };
    }
    
    // Parse the response for scheduling information
    let finalResponse = aiReplyText;
    let isSchedulingRequest = false;
    let schedulingSuccessful = false;
    
    // Identify the intent of the message using our AI
    const possibleIntents = ["inquiry", "complaint", "support", "order", "general", "schedule_meeting"];
    const intentResult = await classifyIntent(message, possibleIntents);
    
    // Check for scheduling intent and process if detected
    if (intentResult.intent === "schedule_meeting" && intentResult.confidence > 0.7 ||
        aiReplyText.includes('"is_scheduling_request": true') || 
        aiReplyText.includes('"schedule_meeting": true')) {
      
      isSchedulingRequest = true;
      
      try {
        // First, make sure we have required user information for scheduling a meeting
        const profile = await userProfileManager.getProfile(profileId);
        
        // If we're missing information, ask for it before attempting scheduling
        if (!profile || !profile.email || !profile.name) {
          // Build a response that asks for the missing information
          let missingInfoResponse = "I'd be happy to schedule a meeting for you, but I need a few details first.\n\n";
          
          if (!profile?.name) {
            missingInfoResponse += "Could you please tell me your full name?\n";
          }
          
          if (!profile?.email) {
            missingInfoResponse += "Also, I'll need your email address to send you the meeting invitation.\n";
          }
          
          finalResponse = missingInfoResponse;
        } else {
          // We have all required information, attempt to parse scheduling data
          let schedulingData;
          try {
            // Try to extract JSON
            const jsonMatch = aiReplyText.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
              schedulingData = JSON.parse(jsonMatch[0]);
            } else {
              schedulingData = JSON.parse(aiReplyText);
            }
          } catch (parseError) {
            // Fall back to regex extraction if parsing fails
            console.warn("Couldn't parse chat response as JSON, using regex extraction", parseError);
            
            const dateTimeMatch = aiReplyText.match(/date_?time"?\s*:\s*"([^"]+)"/i);
            const subjectMatch = aiReplyText.match(/subject"?\s*:\s*"([^"]+)"/i);
            const durationMatch = aiReplyText.match(/duration(?:_minutes)?"?\s*:\s*(\d+)/i);
            
            schedulingData = {
              is_scheduling_request: true,
              date_time: dateTimeMatch ? dateTimeMatch[1] : null,
              subject: subjectMatch ? subjectMatch[1] : null,
              duration_minutes: durationMatch ? parseInt(durationMatch[1]) : 30
            };
          }
          
          if (schedulingData && 
              (schedulingData.is_scheduling_request || schedulingData.schedule_meeting)) {
            
            // Parse date time or use tomorrow by default
            let scheduledDateTime;
            try {
              scheduledDateTime = new Date(schedulingData.date_time);
              
              // Validate date is not in the past
              if (isNaN(scheduledDateTime.getTime()) || scheduledDateTime < new Date()) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(15, 0, 0, 0);
                scheduledDateTime = tomorrow;
              }
            } catch (e) {
              // Default to tomorrow at 3 PM
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(15, 0, 0, 0);
              scheduledDateTime = tomorrow;
            }
            
            // Create meeting parameters
            const meetingParams = {
              attendeeEmail: profile.email,
              subject: schedulingData.subject || `Meeting with ${profile.name}`,
              dateTimeString: scheduledDateTime.toISOString(),
              duration: schedulingData.duration_minutes || 30,
              description: `Meeting scheduled via Live Chat. Session ID: ${sessionId}`
            };
            
            // Schedule the meeting
            const meetingResult = await scheduleMeeting(userId, meetingParams);
            
            if (meetingResult.success) {
              schedulingSuccessful = true;
              
              // Create a user-friendly response
              finalResponse = `Great! I've scheduled your meeting for ${scheduledDateTime.toLocaleString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}. ${meetingResult.meetingLink ? `\n\nYou can join with this link: ${meetingResult.meetingLink}` : ''}`;
              
              // Log the meeting
              await storage.createMeetingLog({
                userId,
                attendeeEmail: meetingParams.attendeeEmail,
                subject: meetingParams.subject,
                startTime: scheduledDateTime,
                duration: meetingParams.duration,
                status: 'scheduled',
                meetingLink: meetingResult.meetingLink || null,
                notes: `Scheduled via Live Chat agent`
              });
            } else {
              // Meeting scheduling failed
              finalResponse = `I tried to schedule your meeting, but encountered an issue: ${meetingResult.message || 'Unable to access calendar'}. Could you please try again with a different time or contact our team directly?`;
            }
          }
        }
      } catch (error) {
        console.error("Error processing chat scheduling request:", error);
        finalResponse = "I'm having trouble with the calendar system right now. Can you please provide more details about when you'd like to schedule a meeting?";
      }
    }
    
    // Record the outgoing message as an interaction
    await userProfileManager.recordInteraction(
      profileId,
      'livechat',
      'outbound',
      finalResponse.substring(0, 100) + (finalResponse.length > 100 ? '...' : ''),
      {
        sessionId,
        timestamp: new Date(),
        aiGenerated: true,
        intent: intentResult.intent,
        isSchedulingRequest,
        schedulingSuccessful
      }
    );
    
    // Update last interaction source in profile
    await userProfileManager.updateProfile(profileId, {
      lastInteractionSource: 'livechat'
    });
    
    // Log the AI response
    await storage.createChatLog({
      userId,
      sessionId,
      message: finalResponse,
      sender: 'ai',
      timestamp: new Date()
    });
    
    // Send response back to client
    sendToClient(ws, {
      type: 'chat',
      message: finalResponse,
      timestamp: new Date().toISOString()
    });
    
    // Create system activity record
    await storage.createSystemActivity({
      module: 'Live Chat',
      event: 'Chat Message Processed',
      status: 'Completed',
      timestamp: new Date(),
      details: { 
        sessionId, 
        intent: intentResult.intent,
        profileId,
        isSchedulingRequest,
        schedulingSuccessful
      }
    });
    
    return {
      success: true,
      response: finalResponse,
      intent: intentResult.intent,
      isSchedulingRequest
    };
  } catch (error) {
    console.error("Error processing chat message with unified profile:", error);
    
    const errorResponse = "I'm sorry, I encountered an error processing your request. Please try again.";
    
    // Send error response back to client
    sendToClient(ws, {
      type: 'chat',
      message: errorResponse,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      response: errorResponse,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Check if a chat session requires pre-chat form based on profile completeness
 */
export async function checkPrechatFormRequired(
  profileId: number | undefined
): Promise<{
  required: boolean;
  missingFields: string[];
}> {
  if (!profileId) {
    return {
      required: true,
      missingFields: ['name', 'email', 'phone']
    };
  }
  
  try {
    const profile = await userProfileManager.getProfile(profileId);
    
    if (!profile) {
      return {
        required: true,
        missingFields: ['name', 'email', 'phone']
      };
    }
    
    const missingFields = [];
    
    if (!profile.name) missingFields.push('name');
    if (!profile.email) missingFields.push('email');
    if (!profile.phone) missingFields.push('phone');
    
    return {
      required: missingFields.length > 0,
      missingFields
    };
  } catch (error) {
    console.error("Error checking pre-chat form requirement:", error);
    // Default to requiring the form in case of error
    return {
      required: true,
      missingFields: ['name', 'email', 'phone']
    };
  }
}