import type { Express } from "express";
import { storage } from "../storage";
import { createChatCompletion, analyzeSentiment } from "./openai";

// Initialize Twilio client
let twilioClient: any = null;

// Function to initialize Twilio with credentials
export async function initTwilio() {
  try {
    // Look up Twilio configuration from storage
    const userId = 1; // For demo purposes
    const twilioConfig = await storage.getTwilioConfigByUserId(userId);

    if (!twilioConfig) {
      console.warn("Twilio configuration not found in storage");
      return null;
    }

    // Use environment variables as fallback
    const accountSid = process.env.TWILIO_ACCOUNT_SID || twilioConfig.accountSid;
    const authToken = process.env.TWILIO_AUTH_TOKEN || twilioConfig.authToken;

    if (!accountSid || !authToken) {
      console.warn("Twilio credentials not available");
      return null;
    }

    // Import dynamically to avoid loading if not needed
    const { Twilio } = await import('twilio');
    twilioClient = new Twilio(accountSid, authToken);
    
    console.log("Twilio client initialized");
    return twilioClient;
  } catch (error) {
    console.error("Error initializing Twilio:", error);
    return null;
  }
}

// Get Twilio client (lazy initialization)
export async function getTwilioClient() {
  if (!twilioClient) {
    twilioClient = await initTwilio();
  }
  
  if (!twilioClient) {
    throw new Error("Twilio client not initialized. Check your credentials.");
  }
  
  return twilioClient;
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

// Function to make outbound call
export async function makeOutboundCall(to: string, message: string) {
  try {
    const client = await getTwilioClient();
    const userId = 1; // For demo purposes
    
    // Get the Twilio phone number from configuration
    const twilioConfig = await storage.getTwilioConfigByUserId(userId);
    if (!twilioConfig) {
      throw new Error("Twilio configuration not found");
    }
    
    const from = twilioConfig.phoneNumber;
    
    // Create TwiML for the outbound call
    const { VoiceResponse } = await import('twilio').then(twilio => twilio.twiml);
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'alice' }, message);
    
    // Make the call
    const call = await client.calls.create({
      twiml: twiml.toString(),
      to,
      from,
    });
    
    // Log the outbound call
    await storage.createCallLog({
      userId,
      phoneNumber: to,
      timestamp: new Date(),
      status: 'initiated',
    });
    
    // Create system activity record
    await storage.createSystemActivity({
      module: 'Voice Call',
      event: 'Outbound Call Initiated',
      status: 'Completed',
      timestamp: new Date(),
      details: { to, message }
    });
    
    return call;
  } catch (error) {
    console.error("Error making outbound call:", error);
    throw error;
  }
}

// Function to send SMS
export async function sendSMS(to: string, body: string) {
  try {
    const client = await getTwilioClient();
    const userId = 1; // For demo purposes
    
    // Get the Twilio phone number from configuration
    const twilioConfig = await storage.getTwilioConfigByUserId(userId);
    if (!twilioConfig) {
      throw new Error("Twilio configuration not found");
    }
    
    const from = twilioConfig.phoneNumber;
    
    // Send the SMS
    const message = await client.messages.create({
      body,
      to,
      from,
    });
    
    // Create system activity record
    await storage.createSystemActivity({
      module: 'SMS',
      event: 'SMS Sent',
      status: 'Completed',
      timestamp: new Date(),
      details: { to, body }
    });
    
    return message;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
}
