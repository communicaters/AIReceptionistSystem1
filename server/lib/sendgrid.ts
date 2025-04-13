import { MailService } from '@sendgrid/mail';
import { storage } from '../storage';
import { createChatCompletion } from './openai';

// Initialize SendGrid client
let mailService: MailService | null = null;

// Function to initialize SendGrid with API key
export async function initSendgrid() {
  try {
    // Look up SendGrid configuration from storage
    const userId = 1; // For demo purposes
    const sendgridConfig = await storage.getSendgridConfigByUserId(userId);

    // Use environment variable as fallback
    const apiKey = process.env.SENDGRID_API_KEY || (sendgridConfig?.apiKey ?? "");

    if (!apiKey) {
      console.warn("SendGrid API key not available");
      return null;
    }

    mailService = new MailService();
    mailService.setApiKey(apiKey);
    
    console.log("SendGrid client initialized");
    return mailService;
  } catch (error) {
    console.error("Error initializing SendGrid:", error);
    return null;
  }
}

// Get SendGrid client (lazy initialization)
export async function getSendgridClient() {
  if (!mailService) {
    mailService = await initSendgrid();
  }
  
  if (!mailService) {
    throw new Error("SendGrid client not initialized. Check your API key.");
  }
  
  return mailService;
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

// Function to send email using SendGrid
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const client = await getSendgridClient();
    const userId = 1; // For demo purposes
    
    await client.send({
      to: params.to,
      from: params.fromName ? { email: params.from, name: params.fromName } : params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    
    // Log the sent email
    await storage.createEmailLog({
      userId,
      from: params.from,
      to: params.to,
      subject: params.subject,
      body: params.text || params.html || "",
      timestamp: new Date(),
      status: "sent",
    });
    
    // Create system activity record
    await storage.createSystemActivity({
      module: "Email",
      event: "Email Sent",
      status: "Completed",
      timestamp: new Date(),
      details: { recipient: params.to, subject: params.subject }
    });
    
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    
    // Log the failed email attempt
    const userId = 1; // For demo purposes
    await storage.createEmailLog({
      userId,
      from: params.from,
      to: params.to,
      subject: params.subject,
      body: params.text || params.html || "",
      timestamp: new Date(),
      status: "failed",
    });
    
    // Create system activity record for failure
    await storage.createSystemActivity({
      module: "Email",
      event: "Email Failed",
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
}): Promise<boolean> {
  try {
    const userId = 1; // For demo purposes
    
    // Log the received email
    await storage.createEmailLog({
      userId,
      from: incomingEmail.from,
      to: "receptionist@example.com", // Default receiver
      subject: incomingEmail.subject,
      body: incomingEmail.body,
      timestamp: new Date(),
      status: "received",
    });
    
    // Get SendGrid configuration for sending the response
    const sendgridConfig = await storage.getSendgridConfigByUserId(userId);
    if (!sendgridConfig) {
      throw new Error("SendGrid configuration not found");
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
      from: sendgridConfig.fromEmail,
      fromName: sendgridConfig.fromName,
      subject: responseSubject,
      text: responseBody,
    });
    
  } catch (error) {
    console.error("Error auto-responding to email:", error);
    return false;
  }
}

// Webhook handler for incoming emails
export async function handleIncomingEmail(payload: any): Promise<boolean> {
  try {
    // Extract email data from the webhook payload
    // Note: This structure varies depending on how you set up SendGrid inbound parse
    const incomingEmail = {
      from: payload.from || payload.sender || "",
      subject: payload.subject || "",
      body: payload.text || payload.html || "",
    };
    
    // Process the incoming email
    const success = await autoRespondToEmail(incomingEmail);
    
    // Create system activity record
    await storage.createSystemActivity({
      module: "Email",
      event: "Email Received and Processed",
      status: success ? "Completed" : "Error",
      timestamp: new Date(),
      details: { from: incomingEmail.from, subject: incomingEmail.subject }
    });
    
    return success;
  } catch (error) {
    console.error("Error handling incoming email webhook:", error);
    return false;
  }
}
