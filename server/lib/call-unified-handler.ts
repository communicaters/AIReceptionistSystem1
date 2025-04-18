/**
 * Call Unified Handler
 * 
 * Provides centralized call processing with user profile management
 * and standardized behavior across all channels.
 */

import { storage } from '../database-storage';
import { userProfileManager } from './user-profile-manager';
import { getUserProfileAssistant } from './user-profile-assistant';
import { scheduleMeeting } from './google-calendar';
import { speechToText, textToSpeech } from './speech-engines';

/**
 * Process a voice call with unified user profile management
 */
export async function processCallWithUnifiedProfile(
  userId: number,
  phoneNumber: string,
  spokenText: string,
  callSid?: string
): Promise<{
  success: boolean;
  responseText: string;
  responseAudio?: Buffer;
  isSchedulingRequest?: boolean;
  voiceId?: string;
  error?: string;
}> {
  try {
    console.log(`Processing Call with unified profile for ${phoneNumber}`);
    
    // Use the Profile Assistant to handle the call with unified profile awareness
    const userProfileAssistant = getUserProfileAssistant();
    
    // Generate a context-aware response
    const { response: aiReplyText, profileId } = await userProfileAssistant.generateResponse(
      userId,
      phoneNumber,
      spokenText,
      'call'
    );
    
    if (!profileId) {
      console.error(`Failed to get profile ID for call from ${phoneNumber}`);
      
      const errorResponse = "I'm having trouble accessing your information. Could you please repeat your request?";
      
      // Generate speech for the error message
      const audioBuffer = await textToSpeech(errorResponse, 'emma');
      
      return {
        success: false,
        responseText: errorResponse,
        responseAudio: audioBuffer,
        error: "Failed to get profile ID"
      };
    }
    
    // Process the response for scheduling information
    let finalResponse = aiReplyText;
    let isSchedulingRequest = false;
    let schedulingSuccessful = false;
    
    // Check for scheduling keywords in the spoken text
    const scheduleKeywords = ['schedule', 'meeting', 'appointment', 'calendar', 'book'];
    const callHasScheduleKeywords = scheduleKeywords.some(keyword => 
      spokenText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Look for scheduling data in AI response
    if (callHasScheduleKeywords && 
        (aiReplyText.includes('"is_scheduling_request": true') || 
         aiReplyText.includes('"schedule_meeting": true'))) {
      
      isSchedulingRequest = true;
      
      try {
        // First, make sure we have required user information for scheduling a meeting
        const profile = await userProfileManager.getProfile(profileId);
        
        // If we're missing email information, we can't schedule yet
        if (!profile || !profile.email) {
          finalResponse = "I'd be happy to schedule a meeting for you. Could you please provide your email address so I can send you the meeting invitation?";
        } else {
          // We have the necessary information, process the scheduling request
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
            console.warn("Couldn't parse call response as JSON, using regex extraction", parseError);
            
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
              subject: schedulingData.subject || `Meeting with ${profile.name || phoneNumber}`,
              dateTimeString: scheduledDateTime.toISOString(),
              duration: schedulingData.duration_minutes || 30,
              description: `Meeting scheduled via Phone Call. Phone: ${phoneNumber}`
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
              })}. I'll send you an email confirmation with all the details.`;
              
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
                notes: `Scheduled via Voice Call agent`
              });
            } else {
              // Meeting scheduling failed
              finalResponse = `I tried to schedule your meeting, but encountered an issue: ${meetingResult.message || 'Unable to access calendar'}. Could you please try again later or call back during business hours?`;
            }
          }
        }
      } catch (error) {
        console.error("Error processing call scheduling request:", error);
        finalResponse = "I'm having trouble with the calendar system right now. Could you please call back in a few minutes or try a different time?";
      }
    }
    
    // Record the outgoing message as an interaction
    await userProfileManager.recordInteraction(
      profileId,
      'call',
      'outbound',
      finalResponse,
      {
        timestamp: new Date().toISOString(),
        aiGenerated: true,
        phoneNumber,
        callSid,
        isSchedulingRequest,
        schedulingSuccessful
      }
    );
    
    // Update last interaction source in profile
    await userProfileManager.updateProfile(profileId, {
      lastInteractionSource: 'call'
    });
    
    // Log the call in the database
    await storage.createCallLog({
      userId,
      phoneNumber,
      direction: 'inbound',
      status: 'completed',
      duration: 0, // Will be updated when call ends
      callSid: callSid || null,
      transcript: spokenText,
      aiResponse: finalResponse,
      timestamp: new Date()
    });
    
    // Create system activity record
    await storage.createSystemActivity({
      module: 'Voice Call',
      event: 'Call Processed',
      status: 'Completed',
      timestamp: new Date(),
      details: { 
        phoneNumber, 
        callSid,
        profileId,
        isSchedulingRequest,
        schedulingSuccessful
      }
    });
    
    // Generate speech for the response
    // Determine best voice based on user profile
    const profile = await userProfileManager.getProfile(profileId);
    const voiceId = profile?.metadata?.preferredVoice || 'emma'; // Default to female voice
    
    const audioBuffer = await textToSpeech(finalResponse, voiceId);
    
    return {
      success: true,
      responseText: finalResponse,
      responseAudio: audioBuffer,
      isSchedulingRequest,
      voiceId
    };
  } catch (error) {
    console.error("Error processing call with unified profile:", error);
    
    const errorResponse = "I'm sorry, I'm having trouble processing your request. Could you please try again?";
    
    // Generate speech for the error message
    const audioBuffer = await textToSpeech(errorResponse, 'emma');
    
    return {
      success: false,
      responseText: errorResponse,
      responseAudio: audioBuffer,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Convert speech audio to text and process it with the unified agent
 */
export async function processCallAudio(
  userId: number,
  phoneNumber: string,
  audioData: Buffer | { path: string, buffer?: Buffer },
  callSid?: string
): Promise<{
  success: boolean;
  responseText: string;
  responseAudio?: Buffer;
  transcription?: string;
  error?: string;
}> {
  try {
    // Step 1: Convert the audio to text
    const transcriptionResult = await speechToText(audioData, {
      language: 'en',
      removeFileAfterProcessing: true
    });
    
    if (!transcriptionResult.success || !transcriptionResult.transcript) {
      console.error("Failed to transcribe call audio:", transcriptionResult.error);
      
      const errorResponse = "I'm sorry, I couldn't understand what you said. Could you please repeat that?";
      const audioBuffer = await textToSpeech(errorResponse, 'emma');
      
      return {
        success: false,
        responseText: errorResponse,
        responseAudio: audioBuffer,
        error: transcriptionResult.error || "Failed to transcribe audio"
      };
    }
    
    const transcription = transcriptionResult.transcript;
    console.log(`Transcribed call audio: "${transcription}"`);
    
    // Step 2: Process the transcribed text with the unified agent
    const result = await processCallWithUnifiedProfile(
      userId,
      phoneNumber,
      transcription,
      callSid
    );
    
    return {
      ...result,
      transcription
    };
  } catch (error) {
    console.error("Error processing call audio:", error);
    
    const errorResponse = "I'm sorry, I encountered an error processing your call. Please try again.";
    const audioBuffer = await textToSpeech(errorResponse, 'emma');
    
    return {
      success: false,
      responseText: errorResponse,
      responseAudio: audioBuffer,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}