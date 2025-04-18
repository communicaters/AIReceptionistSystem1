/**
 * WhatsApp Profile Handler
 * Integrates WhatsApp messages with user profile management and personalized AI responses
 */

import { storage } from '../database-storage';
import { userProfileManager } from './user-profile-manager';
import { ZenderService } from './zender';
import { scheduleMeeting } from './google-calendar';
import { getUserProfileAssistant } from './user-profile-assistant';

export async function processWhatsappMessageWithProfile(
  userId: number,
  phoneNumber: string,
  incomingMessage: string,
  zenderService?: ZenderService
): Promise<{ success: boolean; reply?: string; error?: string }> {
  try {
    console.log(`Processing WhatsApp message with profile for ${phoneNumber}: ${incomingMessage.substring(0, 50)}...`);
    
    // Initialize the user profile assistant
    const userProfileAssistant = getUserProfileAssistant();
    
    // Generate context-aware response using user profile data
    const { response: aiReplyText, profileId } = await userProfileAssistant.generateResponse(
      userId,
      phoneNumber,
      incomingMessage,
      'whatsapp'
    );
    
    // Check for email addresses in the message that might be used for scheduling
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = incomingMessage.match(emailRegex);
    const attendeeEmail = emailMatches ? emailMatches[0] : null;
    
    // Store the result with proper type
    let replyToUser = aiReplyText;
    
    // If an email was found in the message and we have a profile ID, update the profile
    if (attendeeEmail && profileId) {
      const userProfile = await userProfileManager.getProfile(profileId);
      if (userProfile && !userProfile.email) {
        await userProfileManager.updateProfile(profileId, {
          email: attendeeEmail
        });
        console.log(`Updated user profile ${profileId} with email from message: ${attendeeEmail}`);
      }
    }
    
    // Check if this might be a scheduling request by looking for specific keywords
    const scheduleKeywords = ['schedule a meeting', 'book a meeting', 'arrange a call', 'set up a meeting', 'book an appointment'];
    const messageHasScheduleKeywords = scheduleKeywords.some(
      keyword => incomingMessage.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Process scheduling if detected
    if (messageHasScheduleKeywords && aiReplyText.includes('"is_scheduling_request": true')) {
      try {
        // Try to parse the response as JSON if it contains scheduling data
        const schedulingData = JSON.parse(aiReplyText);
        
        if (schedulingData.is_scheduling_request === true) {
          console.log('Detected meeting scheduling request:', schedulingData);
          
          // Use the next day for the meeting
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          // Try to parse the requested date time
          let scheduledDateTime;
          try {
            scheduledDateTime = new Date(schedulingData.date_time);
          } catch (e) {
            // Default to 3PM tomorrow if parsing fails
            scheduledDateTime = new Date(
              tomorrow.getFullYear(),
              tomorrow.getMonth(),
              tomorrow.getDate(),
              15, 0, 0
            );
          }
          
          // Meeting request parameters
          const meetingParams = {
            attendeeEmail: schedulingData.email || attendeeEmail || `${phoneNumber}@whatsapp.virtual.user`,
            subject: schedulingData.subject || `Meeting with ${phoneNumber}`,
            dateTimeString: scheduledDateTime.toISOString(),
            duration: schedulingData.duration_minutes || 30,
            description: `Meeting scheduled via WhatsApp with ${phoneNumber}. Original message: "${incomingMessage}"`
          };
          
          // Schedule the meeting
          const meetingResult = await scheduleMeeting(userId, meetingParams);
          
          if (meetingResult.success) {
            // Generate user-friendly response with meeting details
            replyToUser = `I've scheduled your meeting for ${scheduledDateTime.toLocaleString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}. ${meetingResult.meetingLink ? `\n\nYou can join with this link: ${meetingResult.meetingLink}` : ''}`;
            
            // Log the meeting in the database
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
            
            // If we found an email for scheduling, ensure it's in the user profile
            if (schedulingData.email && profileId) {
              await userProfileManager.updateProfile(profileId, {
                email: schedulingData.email
              });
            }
          } else {
            // If scheduling failed, include error in response
            replyToUser = `I tried to schedule your meeting, but encountered an issue: ${meetingResult.message || 'Unable to access calendar'}. Please try again later or contact our team directly.`;
          }
        }
      } catch (parseError) {
        console.error('Error parsing scheduling data from AI response:', parseError);
        // Continue with the normal AI response text
      }
    }
    
    // Record the AI-generated response in the user profile
    if (profileId) {
      await userProfileManager.recordInteraction(
        profileId,
        'whatsapp',
        'outbound',
        replyToUser,
        {
          timestamp: new Date().toISOString(),
          aiGenerated: true,
          phoneNumber
        }
      );
    }
    
    // Send the message if Zender service is provided
    if (zenderService) {
      const result = await zenderService.sendTextMessage(phoneNumber, replyToUser);
      
      if (!result.success) {
        console.error(`Failed to send WhatsApp message: ${result.error}`);
        return { success: false, error: result.error || 'Failed to send message' };
      }
    }
    
    return { success: true, reply: replyToUser };
  } catch (error) {
    console.error('Error in processWhatsappMessageWithProfile:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error processing WhatsApp message' 
    };
  }
}