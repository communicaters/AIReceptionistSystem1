import nodemailer from 'nodemailer';
import { storage } from '../storage';
import { createChatCompletion } from './openai';

// Maintain a map of SMTP transports for different users
const transportMap = new Map<number, nodemailer.Transporter>();

// Function to initialize SMTP with configuration
export async function initSmtp(userId: number = 1) {
  try {
    // Look up SMTP configuration from storage
    const smtpConfig = await storage.getSmtpConfigByUserId(userId);

    if (!smtpConfig) {
      console.warn(`SMTP configuration not found for user ${userId}`);
      return null;
    }

    if (!smtpConfig.isActive) {
      console.warn(`SMTP service is inactive for user ${userId}`);
      return null;
    }

    // Create SMTP transport
    const transport = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465, // true for 465, false for other ports
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      }
    });

    // Store the transport in our map
    transportMap.set(userId, transport);
    
    console.log(`SMTP client initialized for user ${userId}`);
    return transport;
  } catch (error) {
    console.error("Error initializing SMTP:", error);
    return null;
  }
}

// Get SMTP transport (lazy initialization)
export async function getSmtpTransport(userId: number = 1) {
  if (!transportMap.has(userId)) {
    await initSmtp(userId);
  }
  
  const transport = transportMap.get(userId);
  if (!transport) {
    throw new Error("SMTP transport not initialized. Check your configuration.");
  }
  
  return transport;
}

// Email parameters interface
export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
  headers?: Record<string, string>;
  isAutomatedReply?: boolean;
}

// Function to send email using SMTP
export async function sendEmail(params: EmailParams, userId: number = 1): Promise<boolean> {
  try {
    const transport = await getSmtpTransport(userId);
    const smtpConfig = await storage.getSmtpConfigByUserId(userId);
    
    if (!smtpConfig) {
      throw new Error("SMTP configuration not found");
    }
    
    // Configure email message
    // For SMTP, we need to be precise with the from field - it must match the authenticated user exactly
    const message = {
      from: params.from, // Use only the email address without the name to avoid SMTP errors
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      headers: params.headers || {}, // Include any provided headers
    };
    
    // Always include AI system identifier header (for loop detection)
    if (!message.headers['X-AI-Receptionist']) {
      message.headers['X-AI-Receptionist'] = 'true';
    }
    
    // Send email
    await transport.sendMail(message);
    
    // Log the sent email
    await storage.createEmailLog({
      userId,
      from: params.from,
      to: params.to,
      subject: params.subject,
      body: params.text || params.html || "",
      timestamp: new Date(),
      status: "sent",
      service: "smtp"
    });
    
    // Create system activity record
    await storage.createSystemActivity({
      module: "Email",
      event: "Email Sent via SMTP",
      status: "Completed",
      timestamp: new Date(),
      details: { recipient: params.to, subject: params.subject }
    });
    
    return true;
  } catch (error) {
    console.error("Error sending SMTP email:", error);
    
    // Log the failed email attempt
    await storage.createEmailLog({
      userId,
      from: params.from,
      to: params.to,
      subject: params.subject,
      body: params.text || params.html || "",
      timestamp: new Date(),
      status: "failed",
      service: "smtp"
    });
    
    // Create system activity record for failure
    await storage.createSystemActivity({
      module: "Email",
      event: "SMTP Email Failed",
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
}, userId: number = 1): Promise<boolean> {
  try {
    // Log the received email
    await storage.createEmailLog({
      userId,
      from: incomingEmail.from,
      to: "receptionist@example.com", // Default receiver
      subject: incomingEmail.subject,
      body: incomingEmail.body,
      timestamp: new Date(),
      status: "received",
      service: "smtp"
    });
    
    // Get SMTP configuration for sending the response
    const smtpConfig = await storage.getSmtpConfigByUserId(userId);
    if (!smtpConfig) {
      throw new Error("SMTP configuration not found");
    }
    
    // Generate AI response using the unified agent with user profile handling
    try {
      // Import the email unified handler for processing with consistent behavior
      const { processEmailWithUnifiedProfile } = await import('./email-unified-handler');
      
      // Process via unified handler to ensure company name consistency
      const result = await processEmailWithUnifiedProfile({
        from: incomingEmail.from,
        subject: incomingEmail.subject,
        body: incomingEmail.body
      }, userId);
      
      // Use the AI-generated response from the unified handler
      const responseBody = result.response;
      console.log(`Generated company-specific email response using unified profile system`);
      
      // Prepare response subject line
      const responseSubject = incomingEmail.subject.startsWith("Re:") 
        ? incomingEmail.subject 
        : `Re: ${incomingEmail.subject}`;
        
      // Send the auto-response with appropriate headers
      return await sendEmail({
        to: incomingEmail.from,
        from: smtpConfig.fromEmail,
        subject: responseSubject,
        text: responseBody,
        headers: {
          'X-AI-Receptionist': 'true',
          'X-Auto-Reply': 'true'
        },
        isAutomatedReply: true
      }, userId);
      
    } catch (processingError) {
      console.error("Error using unified profile processor:", processingError);
      
      // Fallback to direct chat completion if unified system fails
      const aiResponse = await createChatCompletion([
        { 
          role: "system", 
          content: "You are a receptionist at TechSolutions Inc. responding to an email. IMPORTANT: Your company name is TechSolutions Inc. Always introduce yourself as Jamie, a human receptionist. Respond warmly and professionally."
        },
        { 
          role: "user", 
          content: `Subject: ${incomingEmail.subject}\n\nBody: ${incomingEmail.body}`
        }
      ]);
      
      const responseBody = aiResponse.success ? aiResponse.content : "Thank you for your email. Our team at TechSolutions Inc. will get back to you shortly.";
    
      // Prepare response subject line
      const responseSubject = incomingEmail.subject.startsWith("Re:") 
        ? incomingEmail.subject 
        : `Re: ${incomingEmail.subject}`;
    
      // Send the auto-response with appropriate headers
      return await sendEmail({
        to: incomingEmail.from,
        from: smtpConfig.fromEmail,
        subject: responseSubject,
        text: responseBody,
        headers: {
          'X-AI-Receptionist': 'true',
          'X-Auto-Reply': 'true'
        },
        isAutomatedReply: true
      }, userId);
    }
    
  } catch (error) {
    console.error("Error auto-responding to email via SMTP:", error);
    return false;
  }
}

// Function to verify SMTP connection
export async function verifySmtpConnection(userId: number = 1): Promise<boolean> {
  try {
    const transport = await getSmtpTransport(userId);
    await transport.verify();
    return true;
  } catch (error) {
    console.error("SMTP verification failed:", error);
    return false;
  }
}