import { storage } from '../storage';
import * as sendgridService from './sendgrid';
import * as smtpService from './smtp';
import * as mailgunService from './mailgun';
import { createChatCompletion } from './openai';
import { EmailParams } from './sendgrid';

// Email Service Type
export type EmailService = 'sendgrid' | 'smtp' | 'mailgun';

// Initialize all email services
export async function initEmailServices(userId: number = 1) {
  try {
    // Initialize all available services
    await sendgridService.initSendgrid();
    await smtpService.initSmtp(userId);
    await mailgunService.initMailgun(userId);
    
    console.log("Email services initialized");
    return true;
  } catch (error) {
    console.error("Error initializing email services:", error);
    return false;
  }
}

// Function to send an email using the preferred or specified service
export async function sendEmail(params: EmailParams, service?: EmailService, userId: number = 1): Promise<boolean> {
  // Determine which service to use if not specified
  if (!service) {
    service = await determinePreferredEmailService(userId);
  }
  
  try {
    switch (service) {
      case 'sendgrid':
        return await sendgridService.sendEmail(params);
      
      case 'smtp':
        return await smtpService.sendEmail(params, userId);
      
      case 'mailgun':
        return await mailgunService.sendEmail(params, userId);
      
      default:
        throw new Error(`Unknown email service: ${service}`);
    }
  } catch (error) {
    console.error(`Error sending email via ${service}:`, error);
    
    // Try fallback services if the primary one fails
    if (service !== 'sendgrid') {
      try {
        // Try SendGrid as fallback
        return await sendgridService.sendEmail(params);
      } catch (fallbackError) {
        console.error("Fallback to SendGrid failed:", fallbackError);
      }
    }
    
    if (service !== 'smtp') {
      try {
        // Try SMTP as fallback
        return await smtpService.sendEmail(params, userId);
      } catch (fallbackError) {
        console.error("Fallback to SMTP failed:", fallbackError);
      }
    }
    
    return false;
  }
}

// Function to determine the preferred email service for a user
async function determinePreferredEmailService(userId: number): Promise<EmailService> {
  // Get all service configurations for the user
  const sendgridConfig = await storage.getSendgridConfigByUserId(userId);
  const smtpConfig = await storage.getSmtpConfigByUserId(userId);
  const mailgunConfig = await storage.getMailgunConfigByUserId(userId);
  
  // Check which services are active and prioritize them
  if (sendgridConfig?.isActive) {
    return 'sendgrid';
  } else if (smtpConfig?.isActive) {
    return 'smtp';
  } else if (mailgunConfig?.isActive) {
    return 'mailgun';
  }
  
  // Default to SendGrid if no service is active (will likely fail but provides consistent behavior)
  return 'sendgrid';
}

// Function to parse email content and generate AI response
export async function parseEmailAndGenerateResponse(
  emailContent: {
    from: string;
    subject: string;
    body: string;
    to?: string;
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
  }
}> {
  try {
    // Generate AI response using chat completion
    const aiResponse = await createChatCompletion([
      { 
        role: "system", 
        content: `You are an AI Receptionist responding to an email. Respond professionally and helpfully.
        If the email contains a request for scheduling a meeting, identify the requested date and time if provided.
        
        Provide your response in the following JSON format:
        {
          "response": "Your complete email response here",
          "intents": ["list", "of", "identified", "user", "intents"],
          "shouldScheduleMeeting": boolean value indicating if a meeting request was detected,
          "meetingDetails": {
            "date": "YYYY-MM-DD format if specified",
            "time": "HH:MM format if specified",
            "duration": duration in minutes if specified
          }
        }
        
        Note that meetingDetails should only be included if shouldScheduleMeeting is true.`
      },
      { 
        role: "user", 
        content: `From: ${emailContent.from}\nTo: ${emailContent.to || 'info@example.com'}\nSubject: ${emailContent.subject}\n\nBody: ${emailContent.body}`
      }
    ], true); // Set to true to get JSON response
    
    if (!aiResponse.success) {
      // Default fallback response
      return {
        response: "Thank you for your email. We'll review it and get back to you shortly.",
        intents: ["general_inquiry"],
        shouldScheduleMeeting: false
      };
    }
    
    try {
      // Parse the JSON response from the AI
      const parsedResponse = JSON.parse(aiResponse.content);
      
      // Validate the response structure
      if (!parsedResponse.response || !Array.isArray(parsedResponse.intents)) {
        throw new Error("Invalid response structure from AI");
      }
      
      return {
        response: parsedResponse.response,
        intents: parsedResponse.intents,
        shouldScheduleMeeting: !!parsedResponse.shouldScheduleMeeting,
        meetingDetails: parsedResponse.meetingDetails
      };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      
      // Return the raw response as fallback
      return {
        response: aiResponse.content,
        intents: ["general_inquiry"],
        shouldScheduleMeeting: false
      };
    }
  } catch (error) {
    console.error("Error generating email response:", error);
    
    // Default fallback response for any error
    return {
      response: "Thank you for your email. Our team will review it and respond as soon as possible.",
      intents: ["general_inquiry"],
      shouldScheduleMeeting: false
    };
  }
}

// Function to process an incoming email and respond appropriately
export async function processIncomingEmail(
  emailContent: {
    from: string;
    to: string;
    subject: string;
    body: string;
  },
  userId: number = 1,
  service: EmailService = 'sendgrid'
): Promise<boolean> {
  try {
    // Log the received email
    await storage.createEmailLog({
      userId,
      from: emailContent.from,
      to: emailContent.to,
      subject: emailContent.subject,
      body: emailContent.body,
      timestamp: new Date(),
      status: "received",
      service
    });
    
    // Parse email and generate response
    const { response, intents, shouldScheduleMeeting, meetingDetails } = 
      await parseEmailAndGenerateResponse(emailContent, userId);
    
    // Create email response
    const responseSubject = emailContent.subject.startsWith("Re:") 
      ? emailContent.subject 
      : `Re: ${emailContent.subject}`;
    
    // Get the appropriate configuration for the service
    let fromEmail = '';
    let fromName = '';
    
    switch(service) {
      case 'sendgrid':
        const sendgridConfig = await storage.getSendgridConfigByUserId(userId);
        fromEmail = sendgridConfig?.fromEmail || '';
        fromName = sendgridConfig?.fromName || '';
        break;
      
      case 'smtp':
        const smtpConfig = await storage.getSmtpConfigByUserId(userId);
        fromEmail = smtpConfig?.fromEmail || '';
        break;
      
      case 'mailgun':
        const mailgunConfig = await storage.getMailgunConfigByUserId(userId);
        fromEmail = mailgunConfig?.fromEmail || '';
        break;
    }
    
    // Schedule meeting if requested
    if (shouldScheduleMeeting && meetingDetails) {
      // Record intent for meeting scheduling
      await storage.createIntent({
        userId,
        category: "meeting_scheduling",
        intent: "schedule_meeting",
        confidence: 0.9,
        date: new Date()
      });
      
      // TODO: Add calendar integration to schedule the meeting
      console.log("Meeting scheduling requested:", meetingDetails);
    }
    
    // Send response email
    const success = await sendEmail({
      to: emailContent.from,
      from: fromEmail,
      fromName: fromName,
      subject: responseSubject,
      text: response,
    }, service, userId);
    
    // Record the intents
    for (const intent of intents) {
      await storage.createIntent({
        userId,
        category: "email",
        intent,
        confidence: 0.8,
        date: new Date()
      });
    }
    
    // Create system activity record
    await storage.createSystemActivity({
      module: "Email",
      event: "Email Processed",
      status: success ? "Completed" : "Error",
      timestamp: new Date(),
      details: { 
        from: emailContent.from, 
        subject: emailContent.subject, 
        intents,
        meetingRequested: shouldScheduleMeeting
      }
    });
    
    return success;
  } catch (error) {
    console.error("Error processing incoming email:", error);
    
    // Create system activity record for failure
    await storage.createSystemActivity({
      module: "Email",
      event: "Email Processing Failed",
      status: "Error",
      timestamp: new Date(),
      details: { 
        from: emailContent.from, 
        subject: emailContent.subject, 
        error: (error as Error).message 
      }
    });
    
    return false;
  }
}

// Function to send a test email
export async function sendTestEmail(
  testEmailAddress: string,
  userId: number = 1,
  service?: EmailService
): Promise<boolean> {
  // Determine service to use if not specified
  if (!service) {
    service = await determinePreferredEmailService(userId);
  }
  
  try {
    // Get user for personalization
    const user = await storage.getUser(userId);
    const username = user?.username || 'User';
    
    // Get the email address to use based on the selected service
    let fromEmail = '';
    let fromName = 'AI Receptionist';
    
    // Fetch the correct "from" email based on the service
    switch (service) {
      case 'sendgrid':
        const sendgridConfig = await storage.getSendgridConfigByUserId(userId);
        fromEmail = sendgridConfig?.fromEmail || '';
        fromName = sendgridConfig?.fromName || fromName;
        break;
      
      case 'smtp':
        const smtpConfig = await storage.getSmtpConfigByUserId(userId);
        fromEmail = smtpConfig?.fromEmail || '';
        // SMTP doesn't have fromName in the schema, so we leave it as default
        break;
      
      case 'mailgun':
        const mailgunConfig = await storage.getMailgunConfigByUserId(userId);
        fromEmail = mailgunConfig?.fromEmail || '';
        fromName = mailgunConfig?.fromName || fromName;
        break;
    }
    
    if (!fromEmail) {
      console.error(`No from email address found for ${service} service. Cannot send test email.`);
      return false;
    }
    
    // Create test email content with service-specific parameters
    const testEmailParams: EmailParams = {
      to: testEmailAddress,
      from: fromEmail,
      // Only add fromName for services that support it (NOT for SMTP)
      ...(service !== 'smtp' && { fromName: fromName }),
      subject: 'Test Email from AI Receptionist',
      text: `Hello ${username},\n\nThis is a test email from your AI Receptionist system to verify that the email service is working correctly.\n\nIf you're receiving this, your ${service} email service is properly configured!\n\nBest regards,\nAI Receptionist`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a5568;">Test Email from AI Receptionist</h2>
          <p>Hello ${username},</p>
          <p>This is a test email from your AI Receptionist system to verify that the email service is working correctly.</p>
          <p>If you're receiving this, your <strong>${service}</strong> email service is properly configured!</p>
          <p style="margin-top: 20px;">Best regards,<br>AI Receptionist</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #718096; font-size: 12px;">
            <p>This is an automated message sent at ${new Date().toISOString()}</p>
          </div>
        </div>
      `
    };
    
    // Send the test email using the specified service
    return await sendEmail(testEmailParams, service, userId);
  } catch (error) {
    console.error(`Error sending test email via ${service}:`, error);
    return false;
  }
}