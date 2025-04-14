import type { Express } from "express";
import { storage } from "../storage";
import { createChatCompletion, analyzeSentiment } from "./openai";

// Import type definitions
import type { Twilio } from 'twilio';

// Initialize Twilio client
let twilioClient: Twilio | null = null;
let twilioInitializationError: string | null = null;
let twilioInitAttempts = 0;
const MAX_TWILIO_INIT_ATTEMPTS = 3;

// Function to initialize Twilio with credentials
export async function initTwilio(forceReconnect = false): Promise<{ client: Twilio | null, error: string | null }> {
  try {
    // Reset client if force reconnect is requested
    if (forceReconnect) {
      twilioClient = null;
      twilioInitializationError = null;
      twilioInitAttempts = 0;
    }
    
    // If we already have a client, return it
    if (twilioClient) {
      return { client: twilioClient, error: null };
    }
    
    // If we've reached the maximum number of attempts, don't try again
    if (twilioInitAttempts >= MAX_TWILIO_INIT_ATTEMPTS) {
      return { 
        client: null, 
        error: `Failed to initialize Twilio after ${MAX_TWILIO_INIT_ATTEMPTS} attempts: ${twilioInitializationError}` 
      };
    }
    
    twilioInitAttempts++;
    
    // Look up Twilio configuration from storage
    const userId = 1; // For demo purposes
    const twilioConfig = await storage.getTwilioConfigByUserId(userId);

    if (!twilioConfig) {
      twilioInitializationError = "Twilio configuration not found in storage";
      console.warn(twilioInitializationError);
      
      // Log this as a system activity
      await storage.createSystemActivity({
        module: 'Voice Call',
        event: 'Twilio Initialization Failed',
        status: 'Error',
        timestamp: new Date(),
        details: { error: twilioInitializationError }
      });
      
      return { client: null, error: twilioInitializationError };
    }

    // Use environment variables as fallback
    const accountSid = process.env.TWILIO_ACCOUNT_SID || twilioConfig.accountSid;
    const authToken = process.env.TWILIO_AUTH_TOKEN || twilioConfig.authToken;

    if (!accountSid || !authToken) {
      twilioInitializationError = "Twilio credentials not available";
      console.warn(twilioInitializationError);
      
      // Log this as a system activity
      await storage.createSystemActivity({
        module: 'Voice Call',
        event: 'Twilio Initialization Failed',
        status: 'Error',
        timestamp: new Date(),
        details: { error: twilioInitializationError }
      });
      
      return { client: null, error: twilioInitializationError };
    }

    // Import dynamically to avoid loading if not needed
    const twilio = await import('twilio');
    twilioClient = new twilio.Twilio(accountSid, authToken);
    
    console.log("Twilio client initialized successfully");
    
    // Log successful initialization
    await storage.createSystemActivity({
      module: 'Voice Call',
      event: 'Twilio Initialized',
      status: 'Completed',
      timestamp: new Date(),
      details: { phoneNumber: twilioConfig.phoneNumber }
    });
    
    // Update module status
    await storage.updateModuleStatus(1, { // Assuming ID 1 is Voice Call Handling
      status: 'operational',
      responseTime: 0,
      successRate: 100,
      lastChecked: new Date(),
      details: 'Twilio service connected successfully'
    });
    
    return { client: twilioClient, error: null };
  } catch (error: any) {
    twilioInitializationError = `Error initializing Twilio: ${error.message || 'Unknown error'}`;
    console.error(twilioInitializationError, error);
    
    // Log this as a system activity
    await storage.createSystemActivity({
      module: 'Voice Call',
      event: 'Twilio Initialization Failed',
      status: 'Error',
      timestamp: new Date(),
      details: { 
        error: twilioInitializationError,
        stack: error.stack
      }
    });
    
    // Update module status
    await storage.updateModuleStatus(1, { // Assuming ID 1 is Voice Call Handling
      status: 'degraded',
      responseTime: 0,
      successRate: 0,
      lastChecked: new Date(),
      details: `Twilio initialization failed: ${error.message || 'Unknown error'}`
    });
    
    return { client: null, error: twilioInitializationError };
  }
}

// Get Twilio client (lazy initialization with error handling)
export async function getTwilioClient(): Promise<Twilio> {
  const { client, error } = await initTwilio();
  
  if (!client) {
    throw new Error(`Failed to get Twilio client: ${error}`);
  }
  
  return client;
}

// Set up Twilio webhook endpoints
export function setupTwilioWebhooks(app: Express) {
  // Webhook for incoming voice calls
  app.post("/api/twilio/voice", async (req, res) => {
    try {
      const { VoiceResponse } = await import('twilio').then(twilio => twilio.twiml);
      const twiml = new VoiceResponse();
      
      // Generate greeting message for caller
      twiml.say(
        { voice: 'alice' },
        "Hello, thank you for calling. I'm the AI Receptionist. How may I help you today?"
      );
      
      // Record the caller's message
      twiml.record({
        action: '/api/twilio/handle-recording',
        transcribeCallback: '/api/twilio/transcription',
        maxLength: 30,
        transcribe: true
      });
      
      // If they don't record anything, route to a default message
      twiml.say(
        { voice: 'alice' },
        "I didn't catch that. Please call back if you need assistance."
      );
      
      res.type('text/xml');
      res.send(twiml.toString());
      
      // Log the incoming call
      const userId = 1; // For demo purposes
      await storage.createCallLog({
        userId,
        phoneNumber: req.body.From || 'unknown',
        timestamp: new Date(),
        status: 'received',
      });
      
      // Create system activity record
      await storage.createSystemActivity({
        module: 'Voice Call',
        event: 'Inbound Call Received',
        status: 'Completed',
        timestamp: new Date(),
        details: { from: req.body.From }
      });
      
    } catch (error) {
      console.error("Error handling Twilio voice webhook:", error);
      res.status(500).send("Error processing call");
    }
  });

  // Handle recording from caller
  app.post("/api/twilio/handle-recording", async (req, res) => {
    try {
      const { VoiceResponse } = await import('twilio').then(twilio => twilio.twiml);
      const twiml = new VoiceResponse();
      
      // Thank the caller and say goodbye
      twiml.say(
        { voice: 'alice' },
        "Thank you for your message. We'll process your request and get back to you shortly."
      );
      
      twiml.hangup();
      
      res.type('text/xml');
      res.send(twiml.toString());
      
      // Update the call log with recording URL
      // In a production app, you would match this to the correct call log
      const userId = 1; // For demo purposes
      const callLogs = await storage.getCallLogsByUserId(userId, 1);
      
      if (callLogs.length > 0) {
        const callLog = callLogs[0];
        await storage.updateCallLog(callLog.id, {
          recording: req.body.RecordingUrl,
          status: 'recorded'
        });
      }
      
    } catch (error) {
      console.error("Error handling Twilio recording webhook:", error);
      res.status(500).send("Error processing recording");
    }
  });

  // Handle transcription from recording
  app.post("/api/twilio/transcription", async (req, res) => {
    try {
      const transcript = req.body.TranscriptionText;
      
      if (!transcript) {
        return res.status(400).send("No transcription text provided");
      }
      
      // Analyze sentiment
      const sentimentResult = await analyzeSentiment(transcript);
      
      // Generate AI response to the transcript using chat completion
      const aiResponse = await createChatCompletion([
        { role: "system", content: "You are an AI Receptionist. Respond to the caller's message professionally and helpfully." },
        { role: "user", content: transcript }
      ]);
      
      const responseText = aiResponse.success ? aiResponse.content : "We'll get back to you shortly.";
      
      // Update the call log with transcription and sentiment
      // In a production app, you would match this to the correct call log
      const userId = 1; // For demo purposes
      const callLogs = await storage.getCallLogsByUserId(userId, 1);
      
      if (callLogs.length > 0) {
        const callLog = callLogs[0];
        await storage.updateCallLog(callLog.id, {
          transcript,
          sentiment: sentimentResult.sentiment,
          status: 'transcribed'
        });
      }
      
      // Create system activity record
      await storage.createSystemActivity({
        module: 'Voice Call',
        event: 'Call Transcribed',
        status: 'Completed',
        timestamp: new Date(),
        details: { transcription: transcript, sentiment: sentimentResult.sentiment }
      });
      
      res.status(200).send("Transcription processed");
      
    } catch (error) {
      console.error("Error handling Twilio transcription webhook:", error);
      res.status(500).send("Error processing transcription");
    }
  });
}

// Function to make outbound call with improved error handling and retry
export async function makeOutboundCall(to: string, message: string, retryCount = 0): Promise<{ success: boolean, callSid?: string, error?: string }> {
  const MAX_RETRIES = 2;
  const userId = 1; // For demo purposes
  
  try {
    // Validate phone number format
    if (!to.match(/^\+?[1-9]\d{1,14}$/)) {
      const errorMsg = "Invalid phone number format. Must be E.164 format (e.g., +12125551234)";
      
      // Log the error
      await storage.createSystemActivity({
        module: 'Voice Call',
        event: 'Outbound Call Failed',
        status: 'Error',
        timestamp: new Date(),
        details: { to, error: errorMsg }
      });
      
      return { success: false, error: errorMsg };
    }
    
    // Initialize the Twilio client
    const { client, error } = await initTwilio();
    if (!client) {
      // Log the failure
      await storage.createSystemActivity({
        module: 'Voice Call',
        event: 'Outbound Call Failed',
        status: 'Error',
        timestamp: new Date(),
        details: { to, error }
      });
      
      return { success: false, error: `Failed to initialize Twilio client: ${error}` };
    }
    
    // Get the Twilio phone number from configuration
    const twilioConfig = await storage.getTwilioConfigByUserId(userId);
    if (!twilioConfig) {
      const errorMsg = "Twilio configuration not found";
      
      // Log the failure
      await storage.createSystemActivity({
        module: 'Voice Call',
        event: 'Outbound Call Failed',
        status: 'Error',
        timestamp: new Date(),
        details: { to, error: errorMsg }
      });
      
      return { success: false, error: errorMsg };
    }
    
    const from = twilioConfig.phoneNumber;
    
    // Create TwiML for the outbound call
    const { VoiceResponse } = await import('twilio').then(twilio => twilio.twiml);
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'alice' }, message);
    
    // Add fallback in case the call fails
    twiml.say({ voice: 'alice' }, "If you missed any part of this message, please call back later.");
    
    // Create a callLog entry before making the call to track the attempt
    const callLog = await storage.createCallLog({
      userId,
      phoneNumber: to,
      timestamp: new Date(),
      status: 'initiating', // Initial status before the call is confirmed
    });
    
    // Make the call with timeout handling
    const callPromise = client.calls.create({
      twiml: twiml.toString(),
      to,
      from,
      timeout: 15, // Timeout in seconds
    });
    
    // Add a timeout for the call creation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Call request timed out')), 10000);
    });
    
    // Race the call creation against the timeout
    const call = await Promise.race([callPromise, timeoutPromise]) as any;
    
    // Update the call log with the call SID and status
    await storage.updateCallLog(callLog.id, {
      status: 'initiated',
      recording: call.sid, // Store the call SID in the recording field temporarily
    });
    
    // Create system activity record for successful call initiation
    await storage.createSystemActivity({
      module: 'Voice Call',
      event: 'Outbound Call Initiated',
      status: 'Completed',
      timestamp: new Date(),
      details: { to, callSid: call.sid, message }
    });
    
    // Return success with the call SID
    return { 
      success: true, 
      callSid: call.sid 
    };
    
  } catch (error: any) {
    console.error("Error making outbound call:", error);
    
    // Determine if we should retry
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying outbound call to ${to} (attempt ${retryCount + 1} of ${MAX_RETRIES})`);
      
      // Add exponential backoff for retries (wait longer between each retry)
      const backoffTime = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      
      // Retry the call
      return makeOutboundCall(to, message, retryCount + 1);
    }
    
    // Log the failed call attempt
    await storage.createCallLog({
      userId,
      phoneNumber: to,
      timestamp: new Date(),
      status: 'failed',
      transcript: error.message,
    });
    
    // Create system activity record for the failure
    await storage.createSystemActivity({
      module: 'Voice Call',
      event: 'Outbound Call Failed',
      status: 'Error',
      timestamp: new Date(),
      details: { 
        to, 
        error: error.message || 'Unknown error',
        stack: error.stack,
        retryCount
      }
    });
    
    // Update module status to reflect issues
    await storage.updateModuleStatus(1, { // Assuming ID 1 is Voice Call Handling
      status: 'degraded',
      successRate: 50, // This should be calculated based on actual success rate
      lastChecked: new Date(),
      details: `Call failures detected: ${error.message}`
    });
    
    return { 
      success: false, 
      error: error.message || 'Unknown error making outbound call'
    };
  }
}

// Function to send SMS with error handling and retries
export async function sendSMS(to: string, body: string, retryCount = 0): Promise<{ success: boolean, messageSid?: string, error?: string }> {
  const MAX_RETRIES = 2;
  const userId = 1; // For demo purposes
  
  try {
    // Validate phone number format
    if (!to.match(/^\+?[1-9]\d{1,14}$/)) {
      const errorMsg = "Invalid phone number format. Must be E.164 format (e.g., +12125551234)";
      
      // Log the error
      await storage.createSystemActivity({
        module: 'SMS',
        event: 'SMS Failed',
        status: 'Error',
        timestamp: new Date(),
        details: { to, error: errorMsg }
      });
      
      return { success: false, error: errorMsg };
    }
    
    // Check message length - SMS should be within reasonable limits
    if (body.length > 1600) {
      const errorMsg = "SMS message is too long. Maximum length is 1600 characters";
      
      // Log the error
      await storage.createSystemActivity({
        module: 'SMS',
        event: 'SMS Failed',
        status: 'Error',
        timestamp: new Date(),
        details: { to, error: errorMsg }
      });
      
      return { success: false, error: errorMsg };
    }
    
    // Initialize the Twilio client
    const { client, error } = await initTwilio();
    if (!client) {
      // Log the failure
      await storage.createSystemActivity({
        module: 'SMS',
        event: 'SMS Failed',
        status: 'Error',
        timestamp: new Date(),
        details: { to, error }
      });
      
      return { success: false, error: `Failed to initialize Twilio client: ${error}` };
    }
    
    // Get the Twilio phone number from configuration
    const twilioConfig = await storage.getTwilioConfigByUserId(userId);
    if (!twilioConfig) {
      const errorMsg = "Twilio configuration not found";
      
      // Log the failure
      await storage.createSystemActivity({
        module: 'SMS',
        event: 'SMS Failed',
        status: 'Error',
        timestamp: new Date(),
        details: { to, error: errorMsg }
      });
      
      return { success: false, error: errorMsg };
    }
    
    const from = twilioConfig.phoneNumber;
    
    // Create timeout for SMS sending
    const smsPromise = client.messages.create({
      body,
      to,
      from,
    });
    
    // Add a timeout for the SMS creation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('SMS request timed out')), 10000);
    });
    
    // Race the SMS creation against the timeout
    const message = await Promise.race([smsPromise, timeoutPromise]) as any;
    
    // Log the SMS in the database (we could create a proper SMS log table in the future)
    await storage.createSystemActivity({
      module: 'SMS',
      event: 'SMS Sent',
      status: 'Completed',
      timestamp: new Date(),
      details: { 
        to, 
        from,
        messageSid: message.sid,
        body: body.length > 100 ? body.substring(0, 100) + '...' : body // Truncate long messages in logs
      }
    });
    
    // Return success with the message SID
    return { 
      success: true, 
      messageSid: message.sid 
    };
    
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    
    // Determine if we should retry
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying SMS to ${to} (attempt ${retryCount + 1} of ${MAX_RETRIES})`);
      
      // Add exponential backoff for retries (wait longer between each retry)
      const backoffTime = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      
      // Retry sending the SMS
      return sendSMS(to, body, retryCount + 1);
    }
    
    // Create system activity record for the failure
    await storage.createSystemActivity({
      module: 'SMS',
      event: 'SMS Failed',
      status: 'Error',
      timestamp: new Date(),
      details: { 
        to, 
        error: error.message || 'Unknown error',
        stack: error.stack,
        retryCount
      }
    });
    
    // Update module status to reflect issues
    await storage.updateModuleStatus(1, { // Assuming ID 1 is Voice Call Handling which also handles SMS
      status: 'degraded',
      successRate: 50, // This should be calculated based on actual success rate
      lastChecked: new Date(),
      details: `SMS failures detected: ${error.message}`
    });
    
    return { 
      success: false, 
      error: error.message || 'Unknown error sending SMS'
    };
  }
}
