import { Router } from 'express';
import { storage } from '../storage';
import { scheduleMeeting } from '../lib/google-calendar';
import { getZenderService } from '../lib/zender';

// Helper function to handle API responses
function apiResponse(res: any, data: any, status = 200) {
  return res.status(status).json(data);
}

const router = Router();

// Test endpoint to check if WhatsApp meeting scheduling works correctly
router.post('/test-meeting-scheduling', async (req, res) => {
  try {
    const { phoneNumber, dateTime, subject, description, email, duration } = req.body;
    
    if (!phoneNumber || !dateTime) {
      return apiResponse(res, { error: "Phone number and date/time are required" }, 400);
    }
    
    const userId = 1; // For testing, use fixed user ID
    
    // Validate that Google Calendar is configured
    const calendarConfig = await storage.getCalendarConfigByUserId(userId);
    if (!calendarConfig || !calendarConfig.googleRefreshToken) {
      return apiResponse(res, { 
        error: "Google Calendar not configured",
        success: false,
        message: "Please configure Google Calendar integration first"
      }, 400);
    }
    
    // Try to schedule a meeting
    const meetingResult = await scheduleMeeting(userId, {
      attendeeEmail: email || `${phoneNumber}@whatsapp.virtual.user`,
      subject: subject || `Meeting with ${phoneNumber}`,
      dateTimeString: dateTime,
      duration: duration || 30,
      description: description || `Meeting scheduled via WhatsApp test with ${phoneNumber}`
    });
    
    if (!meetingResult.success) {
      return apiResponse(res, meetingResult, 400);
    }
    
    // If meeting was scheduled successfully
    if (meetingResult.success) {
      // Get meeting link if available
      const meetingLink = meetingResult.meetingLink;
      // Initialize Zender service
      const zenderService = getZenderService(userId);
      await zenderService.initialize();
      
      // Send initial confirmation message
      const initialMessage = `I've scheduled your meeting for ${new Date(dateTime).toLocaleString()}`;
      
      const firstMessageLog = await storage.createWhatsappLog({
        userId,
        phoneNumber,
        message: initialMessage,
        direction: "outbound",
        timestamp: new Date(),
        status: 'pending'
      });
      
      // Send the confirmation message
      const messageResult = await zenderService.sendMessage({
        recipient: phoneNumber,
        message: initialMessage,
        type: 'text'
      });
      
      if (messageResult.success) {
        await storage.updateWhatsappLog(firstMessageLog.id, { 
          status: 'sent',
          externalId: messageResult.messageId
        });
      }
      
      // Wait 1 second and send the meeting link
      setTimeout(async () => {
        try {
          const linkMessage = `Here's your meeting link: ${meetingLink || "No link available"}\n\nYou can click this link at the scheduled time to join the meeting.`;
          
          const linkMessageLog = await storage.createWhatsappLog({
            userId,
            phoneNumber,
            message: linkMessage,
            direction: "outbound",
            timestamp: new Date(),
            status: 'pending'
          });
          
          // Send the meeting link message
          const linkSendResult = await zenderService.sendMessage({
            recipient: phoneNumber,
            message: linkMessage,
            type: 'text'
          });
          
          if (linkSendResult.success) {
            await storage.updateWhatsappLog(linkMessageLog.id, { 
              status: 'sent',
              externalId: linkSendResult.messageId
            });
          }
        } catch (error) {
          console.error("Error sending meeting link follow-up:", error);
        }
      }, 1000);
    }
    
    return apiResponse(res, {
      success: true,
      message: "Meeting scheduled successfully",
      result: meetingResult
    });
    
  } catch (error: any) {
    console.error("Error in test-meeting-scheduling:", error);
    return apiResponse(res, { 
      error: error.message || "Unknown error occurred",
      success: false
    }, 500);
  }
});

// Test endpoint to verify WhatsApp message history retrieval logic
router.post('/test-history', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return apiResponse(res, { error: "Phone number is required" }, 400);
    }
    
    const userId = 1; // For testing, use fixed user ID
    
    // Get message history with increased limit (100 instead of 20)
    const messageHistory = await storage.getWhatsappLogsByPhoneNumber(userId, phoneNumber, 100);
    
    // Order messages by most recent first (descending order)
    const orderedMessages = messageHistory.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Take the 30 most recent messages (increased from 10)
    const recentMessages = orderedMessages.slice(0, 30);
    
    // Reverse again to get chronological order for display/context
    const chronologicalMessages = [...recentMessages].reverse();
    
    return apiResponse(res, {
      success: true,
      totalMessagesFound: messageHistory.length,
      messagesProcessed: recentMessages.length,
      originalOrder: orderedMessages.map(m => ({
        id: m.id,
        direction: m.direction,
        timestamp: m.timestamp,
        preview: m.message.substring(0, 30) + '...'
      })),
      chronologicalOrder: chronologicalMessages.map(m => ({
        id: m.id,
        direction: m.direction,
        timestamp: m.timestamp,
        preview: m.message.substring(0, 30) + '...'
      }))
    });
    
  } catch (error: any) {
    console.error("Error in test-history:", error);
    return apiResponse(res, { 
      error: error.message || "Unknown error occurred",
      success: false
    }, 500);
  }
});

// Webhook test endpoint to manually simulate an incoming WhatsApp message
router.post('/test-webhook', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return apiResponse(res, { error: "Phone number and message are required" }, 400);
    }
    
    // Create a simulated webhook payload in the Zender format
    const webhookPayload = {
      secret: "test_secret",
      type: "whatsapp",
      "data[id]": String(Date.now()),
      "data[wid]": phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
      "data[phone]": phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
      "data[message]": message,
      "data[attachment]": "0",
      "data[timestamp]": (Math.floor(Date.now() / 1000)).toString()
    };
    
    console.log("Simulated webhook payload:", webhookPayload);
    
    // Process the webhook with the Zender service
    const userId = 1; // For demo purposes
    const zenderService = getZenderService(userId);
    await zenderService.initialize();
    
    const success = await zenderService.processWebhook(webhookPayload);
    
    if (success) {
      return apiResponse(res, {
        success: true,
        message: "Test webhook processed successfully",
        payload: webhookPayload
      });
    } else {
      return apiResponse(res, {
        success: false,
        message: "Failed to process test webhook",
        payload: webhookPayload
      }, 400);
    }
  } catch (error: any) {
    console.error("Error in test-webhook:", error);
    return apiResponse(res, { 
      error: error.message || "Unknown error occurred",
      success: false
    }, 500);
  }
});

export default router;