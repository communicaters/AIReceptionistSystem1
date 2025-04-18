/**
 * Email Unified Handler
 * 
 * Provides centralized email processing with user profile management
 * and standardized behavior across all channels.
 */

import { storage } from '../database-storage';
import { userProfileManager } from './user-profile-manager';
import { getUserProfileAssistant } from './user-profile-assistant';
import { scheduleMeeting } from './google-calendar';
import { EmailParams } from './sendgrid';

/**
 * Process an email message with unified user profile management
 * @param emailContent The content of the email to process
 * @param userId User ID for context and training data
 */
export async function processEmailWithUnifiedProfile(
  emailContent: {
    from: string;
    subject: string;
    body: string;
    to?: string;
    messageId?: string;
  },
  userId: number = 1
): Promise<{
  response: string;
  intents: string[];
  shouldScheduleMeeting: boolean;
  meetingDetails?: {
    date?: string;
    time?: string;
    duration?: number;
    link?: string;
  }
}> {
  try {
    // Extract the email address from the "from" field which might be in format "Name <email@domain.com>"
    const fromEmailAddress = (emailContent.from.match(/<([^>]+)>/) || [null, emailContent.from])[1];
    
    // Use the Profile Assistant to handle the email with unified profile awareness
    const userProfileAssistant = getUserProfileAssistant();
    
    // Generate a context-aware response
    const { response: assistantResponse, profileId } = await userProfileAssistant.generateResponse(
      userId,
      fromEmailAddress,
      `Subject: ${emailContent.subject}\n\n${emailContent.body}`,
      'email'
    );
    
    if (!profileId) {
      console.error(`Failed to get profile ID for ${fromEmailAddress}`);
      
      // Create a basic response for fallback
      return {
        response: "Thank you for your email. We'll review it and get back to you shortly.",
        intents: ["general_inquiry"],
        shouldScheduleMeeting: false
      };
    }
    
    // Process the response for scheduling information
    let finalResponse = assistantResponse;
    let shouldScheduleMeeting = false;
    let meetingDetails = {};
    
    // Check for scheduling keywords in the email
    const scheduleKeywords = ['schedule', 'meeting', 'appointment', 'calendar', 'book'];
    const emailHasScheduleKeywords = scheduleKeywords.some(keyword => 
      emailContent.body.toLowerCase().includes(keyword.toLowerCase()) || 
      emailContent.subject.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Look for scheduling data in AI response
    if (emailHasScheduleKeywords && 
        (assistantResponse.includes('"is_scheduling_request": true') || 
         assistantResponse.includes('"schedule_meeting": true'))) {
      
      try {
        // Attempt to parse scheduling data from response
        let schedulingData;
        try {
          // Try to extract JSON
          const jsonMatch = assistantResponse.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            schedulingData = JSON.parse(jsonMatch[0]);
          } else {
            schedulingData = JSON.parse(assistantResponse);
          }
        } catch (parseError) {
          // Fall back to regex extraction if parsing fails
          console.warn("Couldn't parse response as JSON, using regex extraction", parseError);
          
          const dateTimeMatch = assistantResponse.match(/date_?time"?\s*:\s*"([^"]+)"/i);
          const emailMatch = assistantResponse.match(/email"?\s*:\s*"([^"]+)"/i);
          const subjectMatch = assistantResponse.match(/subject"?\s*:\s*"([^"]+)"/i);
          const durationMatch = assistantResponse.match(/duration(?:_minutes)?"?\s*:\s*(\d+)/i);
          
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
          
          shouldScheduleMeeting = true;
          
          // Get user profile to ensure we have the necessary information
          const userProfile = await userProfileManager.getProfile(profileId);
          
          // Use sender's email for scheduling
          const attendeeEmail = fromEmailAddress;
          
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
            subject: schedulingData.subject || emailContent.subject || `Meeting with ${userProfile?.name || attendeeEmail}`,
            dateTimeString: scheduledDateTime.toISOString(),
            duration: schedulingData.duration_minutes || 30,
            description: `Meeting scheduled via Email. Original subject: "${emailContent.subject}"`
          };
          
          // Schedule the meeting
          const meetingResult = await scheduleMeeting(userId, meetingParams);
          
          if (meetingResult.success) {
            // Create a user-friendly response
            finalResponse = `
Thank you for your email.

I've scheduled your meeting for ${scheduledDateTime.toLocaleString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})}.

${meetingResult.meetingLink ? `You can join with this link: ${meetingResult.meetingLink}` : ''}

Please let me know if you need to reschedule or have any questions.

Best regards,
${userProfile?.name || 'The Team'}
`;
            
            // Log the meeting
            await storage.createMeetingLog({
              userId,
              attendeeEmail: meetingParams.attendeeEmail,
              subject: meetingParams.subject,
              startTime: scheduledDateTime,
              duration: meetingParams.duration,
              status: 'scheduled',
              meetingLink: meetingResult.meetingLink || null,
              notes: `Scheduled via Email agent`
            });
            
            // Prepare meeting details for return
            meetingDetails = {
              date: scheduledDateTime.toISOString().split('T')[0],
              time: scheduledDateTime.toISOString().split('T')[1].substring(0, 5),
              duration: meetingParams.duration,
              link: meetingResult.meetingLink
            };
          } else {
            // Meeting scheduling failed
            finalResponse = `
Thank you for your email. 

I tried to schedule your meeting, but encountered an issue: ${meetingResult.message || 'Unable to access calendar'}. 

Please reply with a few alternative times that would work for you, or contact our team directly to arrange the meeting.

Best regards,
${userProfile?.name || 'The Team'}
`;
          }
        }
      } catch (error) {
        console.error('Error processing email scheduling data:', error);
        // Continue with the original AI response
      }
    }
    
    // Record the outgoing message as an interaction
    await userProfileManager.recordInteraction(
      profileId,
      'email',
      'outbound',
      finalResponse.substring(0, 100) + (finalResponse.length > 100 ? '...' : ''),
      {
        timestamp: new Date().toISOString(),
        aiGenerated: true,
        email: fromEmailAddress,
        subject: emailContent.subject,
        messageId: emailContent.messageId
      }
    );
    
    // Update last interaction source in profile
    await userProfileManager.updateProfile(profileId, {
      lastInteractionSource: 'email'
    });
    
    // Create system activity record
    await storage.createSystemActivity({
      module: 'Email',
      event: 'Email Processed',
      status: 'Completed',
      timestamp: new Date(),
      details: { 
        from: fromEmailAddress,
        subject: emailContent.subject,
        shouldScheduleMeeting,
        profileId
      }
    });
    
    // Try to detect intents from the response
    const intentMatches = [
      { regex: /schedule|meeting|appointment/i, intent: 'schedule_meeting' },
      { regex: /order|purchase|buy/i, intent: 'order' },
      { regex: /support|help|issue|problem/i, intent: 'support' },
      { regex: /information|details|learn more/i, intent: 'inquiry' },
      { regex: /complaint|dissatisfied|unhappy/i, intent: 'complaint' }
    ];
    
    // Determine intents from both the original email and the response
    const intents = intentMatches
      .filter(im => im.regex.test(emailContent.body) || im.regex.test(emailContent.subject) || im.regex.test(finalResponse))
      .map(im => im.intent);
    
    // Always include at least a general intent
    if (intents.length === 0) {
      intents.push('general');
    }
    
    return {
      response: finalResponse,
      intents,
      shouldScheduleMeeting,
      meetingDetails
    };
  } catch (error) {
    console.error("Error processing email with unified profile:", error);
    
    // Provide a safe fallback response
    return {
      response: "Thank you for your email. We'll review it and get back to you shortly.",
      intents: ["general_inquiry"],
      shouldScheduleMeeting: false
    };
  }
}

/**
 * Format an email for sending with proper headers and signature
 */
export function formatEmailForSending(
  response: string,
  fromName: string,
  toEmail: string,
  subject: string,
  userId: number = 1
): EmailParams {
  // Add a proper email signature if not already present
  let formattedResponse = response;
  
  if (!formattedResponse.includes('Best regards') && 
      !formattedResponse.includes('Sincerely') && 
      !formattedResponse.includes('Thank you')) {
    
    formattedResponse += `\n\nBest regards,\n${fromName}`;
  }
  
  // Create a properly formatted email
  return {
    to: toEmail,
    from: `${fromName} <noreply@yourdomain.com>`,
    subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    text: formattedResponse,
    html: formattedResponse.replace(/\n/g, '<br>'),
  };
}