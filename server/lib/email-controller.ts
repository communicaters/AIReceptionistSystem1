import { storage } from '../storage';
import * as sendgridService from './sendgrid';
import * as smtpService from './smtp';
import * as mailgunService from './mailgun';
import { createChatCompletion } from './openai';
import { EmailParams } from './sendgrid';
import { generateEmailResponse, selectBestTemplate, processTemplate } from './template-processor';

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
export async function sendEmail(params: EmailParams, service?: EmailService, userId: number = 1): Promise<{success: boolean, service?: string, error?: string}> {
  // Log the attempt for debugging
  console.log(`Attempting to send email to ${params.to} with subject "${params.subject}" via ${service || 'preferred'} service`);
  
  // Add AI Receptionist identifier to email headers
  if (!params.headers) {
    params.headers = {};
  }
  
  // Add a unique identifier to mark this as a system-generated email
  params.headers['X-AI-Receptionist'] = 'true';
  
  // Set isAutomatedReply flag
  params.isAutomatedReply = true;
  
  // Validate critical parameters
  if (!params.to || !params.from || !params.subject) {
    const missingFields = [];
    if (!params.to) missingFields.push('to');
    if (!params.from) missingFields.push('from');
    if (!params.subject) missingFields.push('subject');
    
    const errorMessage = `Missing required email fields: ${missingFields.join(', ')}`;
    console.error(errorMessage);
    
    // Log the error
    await storage.createSystemActivity({
      module: 'Email',
      event: 'EmailValidationError',
      status: 'error',
      timestamp: new Date(),
      details: { error: errorMessage, params }
    }).catch(err => console.error('Failed to log email validation error:', err));
    
    return { success: false, error: errorMessage };
  }
  
  // Determine which service to use if not specified
  if (!service) {
    service = await determinePreferredEmailService(userId);
    console.log(`Using preferred email service: ${service}`);
  }
  
  // Track which services we've tried
  const attemptedServices = new Set<EmailService>();
  
  // Try the specified/preferred service first
  try {
    let success = false;
    attemptedServices.add(service);
    
    switch (service) {
      case 'sendgrid':
        success = await sendgridService.sendEmail(params);
        break;
      
      case 'smtp':
        success = await smtpService.sendEmail(params, userId);
        break;
      
      case 'mailgun':
        success = await mailgunService.sendEmail(params, userId);
        break;
      
      default:
        throw new Error(`Unknown email service: ${service}`);
    }
    
    if (success) {
      console.log(`Email sent successfully via ${service} to ${params.to}`);
      
      // Log successful email
      await storage.createSystemActivity({
        module: 'Email',
        event: 'EmailSent',
        status: 'success',
        timestamp: new Date(),
        details: { 
          service, 
          to: params.to, 
          subject: params.subject,
          from: params.from
        }
      }).catch(err => console.error('Failed to log email success:', err));
      
      return { success: true, service };
    } else {
      // If the service returned false but didn't throw
      console.warn(`Email service ${service} returned false but didn't throw an error`);
      throw new Error(`${service} returned failure without specific error`);
    }
  } catch (error) {
    console.error(`Error sending email via ${service}:`, error);
    
    // Log the error
    await storage.createSystemActivity({
      module: 'Email',
      event: 'EmailError',
      status: 'error',
      timestamp: new Date(),
      details: { 
        service, 
        error: error instanceof Error ? error.message : String(error),
        to: params.to
      }
    }).catch(err => console.error('Failed to log email error:', err));
    
    // Try fallback services
    const fallbackServices: EmailService[] = ['sendgrid', 'smtp', 'mailgun']
      .filter(s => !attemptedServices.has(s as EmailService)) as EmailService[];
    
    for (const fallbackService of fallbackServices) {
      try {
        console.log(`Trying fallback email service: ${fallbackService}`);
        attemptedServices.add(fallbackService);
        
        let success = false;
        switch (fallbackService) {
          case 'sendgrid':
            success = await sendgridService.sendEmail(params);
            break;
            
          case 'smtp':
            success = await smtpService.sendEmail(params, userId);
            break;
            
          case 'mailgun':
            success = await mailgunService.sendEmail(params, userId);
            break;
        }
        
        if (success) {
          console.log(`Email sent successfully with fallback service ${fallbackService}`);
          
          // Log successful fallback
          await storage.createSystemActivity({
            module: 'Email',
            event: 'EmailFallbackSuccess',
            status: 'success',
            timestamp: new Date(),
            details: { 
              originalService: service,
              fallbackService,
              to: params.to 
            }
          }).catch(err => console.error('Failed to log email fallback success:', err));
          
          return { success: true, service: fallbackService };
        }
      } catch (fallbackError) {
        console.error(`Fallback to ${fallbackService} failed:`, fallbackError);
      }
    }
    
    // All services failed
    console.error(`All email services failed for recipient ${params.to}`);
    
    // Log complete failure
    await storage.createSystemActivity({
      module: 'Email',
      event: 'AllEmailServicesFailed',
      status: 'error',
      timestamp: new Date(),
      details: { 
        to: params.to,
        subject: params.subject,
        attemptedServices: Array.from(attemptedServices)
      }
    }).catch(err => console.error('Failed to log email complete failure:', err));
    
    return { 
      success: false, 
      error: `Failed to send email using all available services: ${Array.from(attemptedServices).join(', ')}` 
    };
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
      // Clean up the response before parsing
      let cleanedResponse = aiResponse.content;
      
      // Try to extract JSON from markdown code blocks
      const jsonBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        // Use the content inside the code block
        cleanedResponse = jsonBlockMatch[1].trim();
      } else {
        // If no code block, just clean up the response
        // Replace backticks
        cleanedResponse = cleanedResponse.replace(/```(?:json)?|```/g, '');
      }
      
      // Additional cleanup
      cleanedResponse = cleanedResponse.trim();
      
      // Handle common formatting issues
      if (cleanedResponse.startsWith('{') && !cleanedResponse.startsWith('{"')) {
        // Make sure property names are properly quoted
        cleanedResponse = cleanedResponse.replace(/(\{|\,)\s*(\w+)\s*\:/g, '$1"$2":');
      }
      
      console.log("Cleaned JSON response:", cleanedResponse);
      
      // Parse the JSON response from the AI
      const parsedResponse = JSON.parse(cleanedResponse);
      
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
      
      // Use the email formatter to extract clean text
      const { extractCleanResponseText } = require('./email-formatter');
      const cleanText = extractCleanResponseText(aiResponse.content);
      
      // Return the cleaned text as fallback
      return {
        response: cleanText || aiResponse.content,
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
    
    // Step 1: Use AI to analyze the email and get intents and meeting details
    const { intents, shouldScheduleMeeting, meetingDetails } = 
      await parseEmailAndGenerateResponse(emailContent, userId);
    
    // Log detected intents
    console.log("Detected intents:", intents);

    // Step 2: Generate a template-based response using our enhanced template processor
    // This will find the best matching template and fill in variables
    const aiGeneratedResponse = await generateEmailResponse(emailContent, intents, userId);
    
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
        intent: "schedule_meeting",
        examples: ["schedule a meeting", "book an appointment", "set up a call"]
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
      text: aiGeneratedResponse,
      html: aiGeneratedResponse.replace(/\n/g, '<br>') // Simple HTML conversion
    }, service, userId);
    
    // Record the intents
    for (const intent of intents) {
      await storage.createIntent({
        userId,
        intent,
        examples: [`${intent} email`, `email about ${intent}`, `inquiry regarding ${intent}`]
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
        meetingRequested: shouldScheduleMeeting,
        usedTemplate: true
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
  
  // For SMTP, use the specialized test function due to stricter format requirements
  if (service === 'smtp') {
    return await sendSmtpTestEmail(testEmailAddress, userId);
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
      
      case 'mailgun':
        const mailgunConfig = await storage.getMailgunConfigByUserId(userId);
        fromEmail = mailgunConfig?.fromEmail || '';
        fromName = mailgunConfig?.fromName || fromName;
        
        // Check if using Mailgun sandbox domain
        if (mailgunConfig?.domain?.includes('sandbox')) {
          // Verify the recipient is in the authorized list
          const authorizedRecipients = mailgunConfig?.authorizedRecipients?.split(',').map(email => email.trim()) || [];
          if (authorizedRecipients.length === 0) {
            console.warn("Using Mailgun sandbox domain without authorized recipients.");
            console.warn(`Please add ${testEmailAddress} to authorized recipients in Mailgun configuration.`);
            // We'll still try to send, but will likely fail if recipient isn't authorized
          } else if (!authorizedRecipients.includes(testEmailAddress)) {
            console.warn(`Recipient ${testEmailAddress} is not in the authorized list for sandbox domain.`);
            console.warn("Adding authorized recipients can be done in the email configuration page.");
            // We'll still try to send, but will likely fail if recipient isn't authorized
          }
        }
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
      fromName: fromName,
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

// Specialized function for sending SMTP test emails
// SMTP has stricter format requirements, so needs special handling
async function sendSmtpTestEmail(
  testEmailAddress: string,
  userId: number = 1
): Promise<boolean> {
  try {
    // Get user for personalization
    const user = await storage.getUser(userId);
    const username = user?.username || 'User';
    
    // Get SMTP configuration
    const smtpConfig = await storage.getSmtpConfigByUserId(userId);
    if (!smtpConfig || !smtpConfig.fromEmail) {
      console.error('SMTP configuration not found or missing from email');
      return false;
    }
    
    // Generate HTML content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a5568;">Test Email from AI Receptionist</h2>
        <p>Hello ${username},</p>
        <p>This is a test email from your AI Receptionist system to verify that the SMTP email service is working correctly.</p>
        <p>If you're receiving this, your <strong>SMTP</strong> email service is properly configured!</p>
        <p style="margin-top: 20px;">Best regards,<br>AI Receptionist</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #718096; font-size: 12px;">
          <p>This is an automated message sent at ${new Date().toISOString()}</p>
        </div>
      </div>
    `;
    
    // Text fallback version
    const textContent = `Hello ${username},\n\nThis is a test email from your AI Receptionist system to verify that the SMTP email service is working correctly.\n\nIf you're receiving this, your SMTP email service is properly configured!\n\nBest regards,\nAI Receptionist`;
    
    // Create email parameters with the specific format required by SMTP
    const params: EmailParams = {
      to: testEmailAddress,
      from: smtpConfig.fromEmail,
      subject: 'Test Email from AI Receptionist (SMTP)',
      text: textContent,
      html: htmlContent
    };
    
    // Send directly via the SMTP service
    const result = await smtpService.sendEmail(params, userId);
    
    // Log the test result
    await storage.createSystemActivity({
      module: "Email",
      event: "SMTP Test Email",
      status: result ? "Completed" : "Failed",
      timestamp: new Date(),
      details: { recipient: testEmailAddress }
    });
    
    return result;
  } catch (error) {
    console.error("Error sending SMTP test email:", error);
    
    // Log the failure
    await storage.createSystemActivity({
      module: "Email",
      event: "SMTP Test Email",
      status: "Failed",
      timestamp: new Date(),
      details: { error: (error as Error).message }
    });
    
    return false;
  }
}