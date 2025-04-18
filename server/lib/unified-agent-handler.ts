/**
 * Unified Agent Handler
 * 
 * This module provides a standardized interface for all AI agents (WhatsApp, Email, Live Chat, Call)
 * to interact with user profiles, training data, and response generation.
 * 
 * It ensures consistent behavior across all communication channels including:
 * - User profile access and updating
 * - Interaction logging
 * - Training data utilization
 * - Response filtering and standardization
 * - Meeting scheduling detection and processing
 */

import { scheduleMeeting } from './google-calendar';
import { userProfileManager } from './user-profile-manager';
import { storage } from '../database-storage';
import { getUserProfileAssistant } from './user-profile-assistant';

// Define types here to avoid circular dependencies
export type Channel = 'whatsapp' | 'email' | 'chat' | 'call';

export interface AgentProcessingOptions {
  userId: number;
  contactIdentifier: string; // Phone number, email, or session ID
  message: string;
  channel: Channel;
  existingProfileId?: number;
  enhancements?: any;
}

export interface SchedulingResult {
  isSchedulingRequest: boolean;
  scheduled: boolean;
  meetingLink?: string;
  dateTime?: string;
  subject?: string;
  duration?: number;
  error?: string;
}

export interface AgentProcessingResult {
  success: boolean;
  response: string;
  profileId?: number;
  schedulingResult?: SchedulingResult;
  error?: string;
}

// Keywords that indicate a scheduling request across all channels
const SCHEDULE_KEYWORDS = [
  'schedule', 'meeting', 'appointment', 'calendar', 'book', 
  'meet', 'talk', 'call', 'zoom', 'teams', 'google meet'
];

/**
 * Process a user message with consistent handling across all communication channels
 */
export async function processMessage(options: AgentProcessingOptions): Promise<AgentProcessingResult> {
  try {
    console.log(`[UnifiedAgent] Processing ${options.channel} message from ${options.contactIdentifier}`);
    
    // Step 1: Use the profile assistant to generate a response with user profile awareness
    const userProfileAssistant = getUserProfileAssistant();
    
    const { response: aiResponse, profileId } = await userProfileAssistant.generateResponse(
      options.userId,
      options.contactIdentifier,
      options.message,
      options.channel
    );
    
    if (!profileId) {
      console.error(`[UnifiedAgent] Failed to get profile ID for ${options.contactIdentifier}`);
      return {
        success: false,
        response: "I'm having trouble accessing your information. Could you please try again?",
        error: "Failed to get profile ID"
      };
    }
    
    // Step 2: Handle scheduling requests if present
    let finalResponse = aiResponse;
    let schedulingResult = {
      isSchedulingRequest: false,
      scheduled: false
    };
    
    // Check if this might be a scheduling request
    const messageHasScheduleKeywords = SCHEDULE_KEYWORDS.some(
      keyword => options.message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (messageHasScheduleKeywords) {
      // Check if the AI response contains scheduling data in JSON format
      try {
        // See if the response can be parsed as JSON containing scheduling data
        if (aiResponse.includes('"is_scheduling_request": true') || 
            aiResponse.includes('"schedule_meeting": true')) {
          
          let schedulingData;
          try {
            // Extract the JSON portion if it's embedded in text
            const jsonMatch = aiResponse.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
              schedulingData = JSON.parse(jsonMatch[0]);
            } else {
              schedulingData = JSON.parse(aiResponse);
            }
          } catch (parseError) {
            console.warn("[UnifiedAgent] Couldn't parse full response as JSON, using regex extraction instead");
            
            // Use regex to extract possible scheduling information
            const dateTimeMatch = aiResponse.match(/date_?time"?\s*:\s*"([^"]+)"/i);
            const emailMatch = aiResponse.match(/email"?\s*:\s*"([^"]+)"/i);
            const subjectMatch = aiResponse.match(/subject"?\s*:\s*"([^"]+)"/i);
            const durationMatch = aiResponse.match(/duration(?:_minutes)?"?\s*:\s*(\d+)/i);
            
            schedulingData = {
              is_scheduling_request: true,
              date_time: dateTimeMatch ? dateTimeMatch[1] : null,
              email: emailMatch ? emailMatch[1] : null,
              subject: subjectMatch ? subjectMatch[1] : null,
              duration_minutes: durationMatch ? parseInt(durationMatch[1]) : 30
            };
          }
          
          if (schedulingData && 
              (schedulingData.is_scheduling_request || schedulingData.schedule_meeting)) {
            
            // Flag this as a scheduling request
            schedulingResult.isSchedulingRequest = true;
            
            // Get user profile to ensure we have necessary data
            const userProfile = await userProfileManager.getProfile(profileId);
            
            // Check if we're missing essential information for scheduling
            if (!userProfile || !userProfile.email) {
              // If the extracted JSON has the email, use it
              if (schedulingData.email) {
                // Update the profile with the email from the scheduling data
                await userProfileManager.updateProfile(profileId, {
                  email: schedulingData.email
                });
                
                // Attempt to schedule with the newly added email
                return await processSchedulingRequest(
                  options.userId,
                  profileId,
                  options.contactIdentifier,
                  options.channel,
                  schedulingData,
                  aiResponse
                );
              } else {
                // We're missing email and couldn't extract it, ask for it
                finalResponse = "I'd be happy to schedule a meeting for you, but I'll need your email address first. Could you please provide it?";
                
                schedulingResult = {
                  isSchedulingRequest: true,
                  scheduled: false,
                  error: "Missing email address"
                };
              }
            } else {
              // We have all required information, proceed with scheduling
              return await processSchedulingRequest(
                options.userId,
                profileId,
                options.contactIdentifier,
                options.channel,
                schedulingData,
                aiResponse
              );
            }
          }
        }
      } catch (error) {
        console.error("[UnifiedAgent] Error processing potential scheduling request:", error);
      }
    }
    
    // Step 3: Record the outgoing message as an interaction
    try {
      await userProfileManager.recordInteraction(
        profileId,
        options.channel,
        'outbound',
        finalResponse.substring(0, 100) + (finalResponse.length > 100 ? '...' : ''),
        {
          timestamp: new Date().toISOString(),
          aiGenerated: true,
          contactIdentifier: options.contactIdentifier
        }
      );
      
      // Update last interaction source in profile
      await userProfileManager.updateProfile(profileId, {
        lastInteractionSource: options.channel
      });
    } catch (error) {
      console.error(`[UnifiedAgent] Error recording interaction for profile ${profileId}:`, error);
      // Continue even if logging fails
    }
    
    // Step 4: Return the final response
    return {
      success: true,
      response: finalResponse,
      profileId,
      schedulingResult
    };
  } catch (error) {
    console.error('[UnifiedAgent] Error in processMessage:', error);
    return { 
      success: false, 
      response: "I'm sorry, I encountered an error processing your request. Please try again.",
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Process a scheduling request across all channels
 */
async function processSchedulingRequest(
  userId: number,
  profileId: number,
  contactIdentifier: string,
  channel: Channel,
  schedulingData: any,
  originalResponse: string
): Promise<AgentProcessingResult> {
  try {
    console.log(`[UnifiedAgent] Processing scheduling request for ${channel}:`, schedulingData);
    
    // Get the user profile to use their email
    const userProfile = await userProfileManager.getProfile(profileId);
    
    if (!userProfile) {
      return {
        success: false,
        response: "I'm having trouble accessing your profile information. Could you please try again?",
        profileId,
        schedulingResult: {
          isSchedulingRequest: true,
          scheduled: false,
          error: "Profile not found"
        },
        error: "Profile not found for scheduling"
      };
    }
    
    // Use the email from the profile or from the scheduling data
    const attendeeEmail = schedulingData.email || userProfile.email;
    
    if (!attendeeEmail) {
      return {
        success: false,
        response: "I'd be happy to schedule a meeting for you, but I'll need your email address first. Could you please provide it?",
        profileId,
        schedulingResult: {
          isSchedulingRequest: true,
          scheduled: false,
          error: "Missing email address"
        }
      };
    }
    
    // Parse date/time or use tomorrow by default
    let scheduledDateTime;
    try {
      scheduledDateTime = new Date(schedulingData.date_time);
      
      // Validate that the date is not in the past and is valid
      if (isNaN(scheduledDateTime.getTime()) || scheduledDateTime < new Date()) {
        // Use tomorrow at 3 PM if the date is invalid or in the past
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(15, 0, 0, 0);
        scheduledDateTime = tomorrow;
      }
    } catch (e) {
      // Default to 3PM tomorrow if parsing fails
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(15, 0, 0, 0);
      scheduledDateTime = tomorrow;
    }
    
    // Meeting request parameters
    const meetingParams = {
      attendeeEmail: attendeeEmail,
      subject: schedulingData.subject || `Meeting with ${userProfile.name || contactIdentifier}`,
      dateTimeString: scheduledDateTime.toISOString(),
      duration: schedulingData.duration_minutes || 30,
      description: `Meeting scheduled via ${channel.toUpperCase()} with ${contactIdentifier}. Original message: "${schedulingData.message || ''}"`,
      attendeeName: userProfile.name || ""
    };
    
    // Schedule the meeting
    const meetingResult = await scheduleMeeting(userId, meetingParams);
    
    if (meetingResult.success) {
      // Generate user-friendly response with meeting details
      const formattedDate = scheduledDateTime.toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      
      const response = `I've scheduled your meeting for ${formattedDate}. ${meetingResult.meetingLink ? `You can join with this link: ${meetingResult.meetingLink}` : ''}`;
      
      // Log the meeting in the database
      await storage.createMeetingLog({
        userId,
        attendeeEmail: meetingParams.attendeeEmail,
        attendeePhone: channel === 'whatsapp' || channel === 'call' ? contactIdentifier : null,
        subject: meetingParams.subject,
        startTime: scheduledDateTime,
        duration: meetingParams.duration,
        status: 'scheduled',
        meetingLink: meetingResult.meetingLink || null,
        notes: `Scheduled via ${channel} AI agent`
      });
      
      return {
        success: true,
        response,
        profileId,
        schedulingResult: {
          isSchedulingRequest: true,
          scheduled: true,
          meetingLink: meetingResult.meetingLink,
          dateTime: scheduledDateTime.toISOString(),
          subject: meetingParams.subject
        }
      };
    } else {
      // If scheduling failed, include error in response
      const errorResponse = `I tried to schedule your meeting, but encountered an issue: ${meetingResult.message || 'Unable to access calendar'}. Please try again later or contact our team directly.`;
      
      return {
        success: false,
        response: errorResponse,
        profileId,
        schedulingResult: {
          isSchedulingRequest: true,
          scheduled: false,
          error: meetingResult.message || 'Unable to access calendar'
        }
      };
    }
  } catch (error) {
    console.error('[UnifiedAgent] Error in processSchedulingRequest:', error);
    
    return {
      success: false,
      response: "I encountered an issue while trying to schedule your meeting. Please try again or provide more details about when you'd like to meet.",
      profileId,
      schedulingResult: {
        isSchedulingRequest: true,
        scheduled: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}