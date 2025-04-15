import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { storage } from '../storage';
import { createChatCompletion } from './openai';

// Initialize Mailgun client instances by user
const mailgunInstances = new Map<number, any>();

// Function to initialize Mailgun with API key and domain
export async function initMailgun(userId: number = 1) {
  try {
    // Look up Mailgun configuration from storage
    const mailgunConfig = await storage.getMailgunConfigByUserId(userId);

    if (!mailgunConfig) {
      console.warn(`Mailgun configuration not found for user ${userId}`);
      return null;
    }

    if (!mailgunConfig.isActive) {
      console.warn(`Mailgun service is inactive for user ${userId}`);
      return null;
    }

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: 'api',
      key: mailgunConfig.apiKey,
    });
    
    // Store the instance in our map
    mailgunInstances.set(userId, {
      client: mg,
      domain: mailgunConfig.domain,
      fromEmail: mailgunConfig.fromEmail,
      authorizedRecipients: mailgunConfig.authorizedRecipients
    });
    
    console.log(`Mailgun client initialized for user ${userId}`);
    return mailgunInstances.get(userId);
  } catch (error) {
    console.error("Error initializing Mailgun:", error);
    return null;
  }
}

// Get Mailgun client (lazy initialization)
export async function getMailgunClient(userId: number = 1) {
  if (!mailgunInstances.has(userId)) {
    await initMailgun(userId);
  }
  
  const instance = mailgunInstances.get(userId);
  if (!instance) {
    throw new Error("Mailgun client not initialized. Check your configuration.");
  }
  
  return instance;
}

// Email parameters interface
export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
}

// Function to send email using Mailgun
export async function sendEmail(params: EmailParams, userId: number = 1): Promise<boolean> {
  try {
    const { client, domain, fromEmail, authorizedRecipients } = await getMailgunClient(userId);
    
    // Check if using sandbox domain for Mailgun
    const isSandboxDomain = domain.includes('sandbox');
    if (isSandboxDomain) {
      // For sandbox domains, check if the recipient is authorized
      const authorizedList = authorizedRecipients?.split(',').map(email => email.trim()) || [];
      
      // If recipient is not in authorized list, provide a better error message
      if (authorizedList.length === 0 || !authorizedList.includes(params.to)) {
        console.warn(`Mailgun sandbox domain cannot send to unauthorized recipient: ${params.to}`);
        console.warn(`For sandbox domains, you must add recipients in the authorized list`);
        
        throw new Error(
          `Mailgun sandbox domains can only send to authorized recipients. Please add ${params.to} to your authorized recipients list in the configuration.`
        );
      }
    }
    
    // Configure email message
    const messageData = {
      from: params.fromName ? `${params.fromName} <${params.from || fromEmail}>` : (params.from || fromEmail),
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html
    };
    
    // Send email
    await client.messages.create(domain, messageData);
    
    // Log the sent email
    await storage.createEmailLog({
      userId,
      from: params.from || fromEmail,
      to: params.to,
      subject: params.subject,
      body: params.text || params.html || "",
      timestamp: new Date(),
      status: "sent",
      service: "mailgun"
    });
    
    // Create system activity record
    await storage.createSystemActivity({
      module: "Email",
      event: "Email Sent via Mailgun",
      status: "Completed",
      timestamp: new Date(),
      details: { recipient: params.to, subject: params.subject }
    });
    
    return true;
  } catch (error) {
    console.error("Error sending Mailgun email:", error);
    
    // Log the failed email attempt
    await storage.createEmailLog({
      userId,
      from: params.from,
      to: params.to,
      subject: params.subject,
      body: params.text || params.html || "",
      timestamp: new Date(),
      status: "failed",
      service: "mailgun"
    });
    
    // Create system activity record for failure
    await storage.createSystemActivity({
      module: "Email",
      event: "Mailgun Email Failed",
      status: "Error",
      timestamp: new Date(),
      details: { recipient: params.to, subject: params.subject, error: (error as Error).message }
    });
    
    return false;
  }
}

// Function to auto-respond to emails
export async function autoRespondToEmail(incomingEmail: {
  from: string;
  subject: string;
  body: string;
  recipient?: string;
}, userId: number = 1): Promise<boolean> {
  try {
    // Log the received email
    await storage.createEmailLog({
      userId,
      from: incomingEmail.from,
      to: incomingEmail.recipient || "receptionist@example.com", // Default or specified receiver
      subject: incomingEmail.subject,
      body: incomingEmail.body,
      timestamp: new Date(),
      status: "received",
      service: "mailgun"
    });
    
    // Get Mailgun configuration
    const mailgunConfig = await storage.getMailgunConfigByUserId(userId);
    if (!mailgunConfig) {
      throw new Error("Mailgun configuration not found");
    }
    
    // Generate AI response using chat completion
    const aiResponse = await createChatCompletion([
      { 
        role: "system", 
        content: "You are an AI Receptionist responding to an email. Respond professionally and helpfully."
      },
      { 
        role: "user", 
        content: `Subject: ${incomingEmail.subject}\n\nBody: ${incomingEmail.body}`
      }
    ]);
    
    const responseBody = aiResponse.success ? aiResponse.content : "Thank you for your email. We'll get back to you shortly.";
    
    // Prepare response subject line
    const responseSubject = incomingEmail.subject.startsWith("Re:") 
      ? incomingEmail.subject 
      : `Re: ${incomingEmail.subject}`;
    
    // Send the auto-response
    return await sendEmail({
      to: incomingEmail.from,
      from: mailgunConfig.fromEmail,
      subject: responseSubject,
      text: responseBody,
    }, userId);
    
  } catch (error) {
    console.error("Error auto-responding to email via Mailgun:", error);
    return false;
  }
}

// Process webhook events from Mailgun
export async function handleMailgunWebhook(payload: any): Promise<boolean> {
  try {
    // Extract relevant data from the webhook payload
    // Note: Structure will vary based on the Mailgun event type
    
    // For "delivered" events
    if (payload['event-data'] && payload['event-data'].event === 'delivered') {
      const eventData = payload['event-data'];
      const userId = 1; // Default user ID, should implement a way to map to correct user
      
      // Create activity for successful delivery
      await storage.createSystemActivity({
        module: "Email",
        event: "Email Delivered",
        status: "Completed",
        timestamp: new Date(),
        details: { 
          messageId: eventData.message.headers['message-id'],
          recipient: eventData.recipient,
          subject: eventData.message.headers.subject
        }
      });
      
      // Update email log status if possible
      // Would need to store messageId in logs to enable this
      
      return true;
    }
    
    // For received emails (inbound)
    if (payload.sender && payload.recipient && payload.subject) {
      const incomingEmail = {
        from: payload.sender,
        subject: payload.subject,
        body: payload['body-plain'] || payload['body-html'] || "",
        recipient: payload.recipient
      };
      
      return await autoRespondToEmail(incomingEmail);
    }
    
    return false;
  } catch (error) {
    console.error("Error handling Mailgun webhook:", error);
    return false;
  }
}