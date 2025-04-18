/**
 * WhatsApp Unified Handler
 * 
 * Implements the standardized WhatsApp message processing using the user profile system
 * This replaces the previous implementation but maintains the same function signatures
 * for compatibility with existing code.
 */

import { storage } from '../database-storage';
import { userProfileManager } from './user-profile-manager';
import { ZenderService } from './zender';
import { getUserProfileAssistant } from './user-profile-assistant';
import { scheduleMeeting } from './google-calendar';

// Channel type definition
type Channel = 'whatsapp' | 'email' | 'chat' | 'call';

/**
 * Process a WhatsApp message with unified user profile management
 */
export async function processWhatsappMessageWithProfile(
  userId: number,
  phoneNumber: string,
  incomingMessage: string,
  zenderService?: ZenderService
): Promise<{ success: boolean; reply?: string; error?: string }> {
  try {
    console.log(`Processing WhatsApp message with unified profile for ${phoneNumber}: ${incomingMessage.substring(0, 50)}...`);
    
    // Initialize the user profile assistant
    const userProfileAssistant = getUserProfileAssistant();
    
    // Generate context-aware response using user profile data
    console.log(`Calling userProfileAssistant.generateResponse for WhatsApp message from ${phoneNumber}`);
    
    let aiReplyText;
    let profileId;
    
    try {
      const result = await userProfileAssistant.generateResponse(
        userId,
        phoneNumber,
        incomingMessage,
        'whatsapp'
      );
      
      aiReplyText = result.response;
      profileId = result.profileId;
      
      console.log(`Successfully generated WhatsApp response for ${phoneNumber}, profileId: ${profileId || 'none'}`);
    } catch (responseError) {
      console.error(`Error generating WhatsApp response for ${phoneNumber}:`, responseError);
      // Provide a fallback response
      aiReplyText = "I'm sorry, I'm having trouble processing your message right now. Please try again in a moment.";
      
      // Try to find profile just based on phone number for logging
      try {
        const profile = await userProfileManager.findProfileByPhone(phoneNumber);
        if (profile) {
          profileId = profile.id;
          console.log(`Found existing profile by phone for fallback: ${profileId}`);
        }
      } catch (profileError) {
        console.error('Error finding profile by phone for fallback:', profileError);
      }
      
      // Log error for debugging
      await storage.createSystemActivity({
        module: 'WhatsApp',
        event: 'Message Processing Error',
        status: 'Error',
        timestamp: new Date(),
        details: { 
          phoneNumber,
          error: responseError instanceof Error ? responseError.message : String(responseError)
        }
      });
    }
    
    if (!profileId) {
      console.error(`Failed to get profile ID for ${phoneNumber}`);
      return {
        success: false,
        error: "Failed to process user profile"
      };
    }
    
    // Extract email from message if present (for profile enhancement)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = incomingMessage.match(emailRegex);
    const extractedEmail = emailMatches ? emailMatches[0] : null;
    
    // Update profile with email if found and profile doesn't have one yet
    if (extractedEmail) {
      const userProfile = await userProfileManager.getProfile(profileId);
      if (userProfile && !userProfile.email) {
        await userProfileManager.updateProfile(profileId, {
          email: extractedEmail
        });
        console.log(`Updated user profile ${profileId} with email from message: ${extractedEmail}`);
      }
    }
    
    // Process the response for meeting scheduling if needed
    let finalResponse = aiReplyText;
    let wasSchedulingRequest = false;
    let schedulingSuccessful = false;
    
    // Check for scheduling keywords
    const scheduleKeywords = ['schedule', 'meeting', 'appointment', 'calendar', 'book'];
    const messageHasScheduleKeywords = scheduleKeywords.some(
      keyword => incomingMessage.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Look for scheduling data in AI response
    if (messageHasScheduleKeywords && 
        (aiReplyText.includes('"is_scheduling_request": true') || 
         aiReplyText.includes('"schedule_meeting": true'))) {
      
      try {
        // Attempt to parse scheduling data from response
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
          console.warn("Couldn't parse response as JSON, using regex extraction", parseError);
          
          const dateTimeMatch = aiReplyText.match(/date_?time"?\s*:\s*"([^"]+)"/i);
          const emailMatch = aiReplyText.match(/email"?\s*:\s*"([^"]+)"/i);
          const subjectMatch = aiReplyText.match(/subject"?\s*:\s*"([^"]+)"/i);
          const durationMatch = aiReplyText.match(/duration(?:_minutes)?"?\s*:\s*(\d+)/i);
          
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
          
          wasSchedulingRequest = true;
          
          // Get user profile to check for required meeting information
          const userProfile = await userProfileManager.getProfile(profileId);
          
          // Either use email from scheduling data or from profile
          const attendeeEmail = schedulingData.email || 
                              extractedEmail || 
                              (userProfile ? userProfile.email : null);
          
          // Check if we have an email to schedule with
          if (!attendeeEmail) {
            finalResponse = "I'd be happy to schedule a meeting for you, but I'll need your email address first. Could you please provide it?";
          } else {
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
              attendeeEmail: attendeeEmail,
              subject: schedulingData.subject || `Meeting with ${userProfile?.name || phoneNumber}`,
              dateTimeString: scheduledDateTime.toISOString(),
              duration: schedulingData.duration_minutes || 30,
              description: `Meeting scheduled via WhatsApp with ${phoneNumber}. Original message: "${incomingMessage}"`
            };
            
            // Schedule the meeting
            const meetingResult = await scheduleMeeting(userId, meetingParams);
            
            if (meetingResult.success) {
              schedulingSuccessful = true;
              
              // Create a user-friendly response
              finalResponse = `I've scheduled your meeting for ${scheduledDateTime.toLocaleString('en-US', {
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
                attendeePhone: phoneNumber,
                subject: meetingParams.subject,
                startTime: scheduledDateTime,
                duration: meetingParams.duration,
                status: 'scheduled',
                meetingLink: meetingResult.meetingLink || null,
                notes: `Scheduled via WhatsApp AI agent`
              });
              
              // Update user profile with email if needed
              if (attendeeEmail && userProfile && !userProfile.email) {
                await userProfileManager.updateProfile(profileId, {
                  email: attendeeEmail
                });
              }
            } else {
              // Meeting scheduling failed
              finalResponse = `I tried to schedule your meeting, but encountered an issue: ${meetingResult.message || 'Unable to access calendar'}. Please try again later or contact our team directly.`;
            }
          }
        }
      } catch (error) {
        console.error('Error processing scheduling data:', error);
        // Continue with the original AI response
      }
    }
    
    // Record the AI-generated response in the user profile
    await userProfileManager.recordInteraction(
      profileId,
      'whatsapp',
      'outbound',
      finalResponse,
      {
        timestamp: new Date().toISOString(),
        aiGenerated: true,
        phoneNumber,
        wasSchedulingRequest,
        schedulingSuccessful
      }
    );
    
    // Update last interaction source in profile
    await userProfileManager.updateProfile(profileId, {
      lastInteractionSource: 'whatsapp'
    });
    
    // Send the message if Zender service is provided
    if (zenderService) {
      const result = await zenderService.sendTextMessage(phoneNumber, finalResponse);
      
      if (!result.success) {
        console.error(`Failed to send WhatsApp message: ${result.error}`);
        return { success: false, error: result.error || 'Failed to send message' };
      }
    }
    
    // Create system activity record
    await storage.createSystemActivity({
      module: 'WhatsApp',
      event: 'Message Processed',
      status: 'Completed',
      timestamp: new Date(),
      details: { 
        to: phoneNumber,
        wasSchedulingRequest,
        schedulingSuccessful,
        profileId
      }
    });
    
    return { success: true, reply: finalResponse };
  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error processing WhatsApp message' 
    };
  }
}