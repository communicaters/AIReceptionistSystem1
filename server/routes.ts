import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { setupTwilioWebhooks } from "./lib/twilio";
import { initOpenAI } from "./lib/openai";
import { initSendgrid } from "./lib/sendgrid";
import { initGoogleCalendar, createOAuth2Client } from "./lib/google-calendar";
import { initElevenLabs } from "./lib/elevenlabs";
import { initWhisperAPI } from "./lib/whisper";
import { createAllSampleMp3s } from "./lib/create-sample-mp3";
import { setupWebsocketHandlers } from "./lib/websocket";
import { aiRouter } from "./routes/ai";
import { speechRouter } from "./routes/speech";
import { authenticate } from "./middleware/auth";
import express from "express";
import path from "path";
import fs from "fs";

// Helper function to handle API responses
function apiResponse(res: Response, data: any, status = 200) {
  return res.status(status).json(data);
}

// Format a date to a time string (e.g., "9:00 AM")
function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  
  return hours + ':' + minutesStr + ' ' + ampm;
}

// Format a date to a time slot string for comparison (e.g., "09:00")
function formatTimeSlot(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize the WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  setupWebsocketHandlers(wss);
  
  // Initialize external services
  initOpenAI();
  initSendgrid();
  initGoogleCalendar();
  initElevenLabs();
  initWhisperAPI();
  
  // Google OAuth redirect URI - share this with users for Google Console setup
  const googleRedirectUri = `${process.env.HOST_URL || 'http://localhost:5000'}/api/calendar/auth/callback`;
  console.log("Google OAuth Redirect URI:", googleRedirectUri);
  
  // Initialize Twilio webhook handling
  setupTwilioWebhooks(app);
  
  // Create and serve audio directories
  const audioDir = path.join(process.cwd(), 'cache', 'audio');
  const ttsDir = path.join(audioDir, 'tts');
  const fallbackDir = path.join(audioDir, 'fallback');
  
  // Create directories if they don't exist
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  if (!fs.existsSync(ttsDir)) {
    fs.mkdirSync(ttsDir, { recursive: true });
  }
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
  
  // Create sample MP3 files for voice samples
  createAllSampleMp3s().catch(err => {
    console.error("Error creating sample MP3 files:", err);
  });
  
  // Direct audio serving endpoint
  app.get('/api/audio/:audioId', (req, res) => {
    const { audioId } = req.params;
    
    if (!audioId) {
      return res.status(400).json({ success: false, error: 'Audio ID required' });
    }
    
    // Check for any file extension like .mp3 and remove it
    const baseAudioId = audioId.replace(/\.[^/.]+$/, "");
    
    // Check if this is a sample voice request
    if (baseAudioId.startsWith('samples_')) {
      const voiceName = baseAudioId.replace('samples_', '');
      const samplesDir = path.join(process.cwd(), 'public', 'audio', 'samples');
      const samplePath = path.join(samplesDir, `${voiceName}.mp3`);
      
      if (fs.existsSync(samplePath)) {
        console.log(`Serving sample voice audio: ${samplePath}`);
        
        // Set proper headers for audio
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `inline; filename="${voiceName}.mp3"`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        
        // Stream the file
        return fs.createReadStream(samplePath).pipe(res);
      }
    }
    
    // Try different audio paths
    const possiblePaths = [
      path.join(ttsDir, `${baseAudioId}.mp3`),
      path.join(fallbackDir, `${baseAudioId}.mp3`),
      path.join(audioDir, `${baseAudioId}.mp3`)
    ];
    
    // Find the first valid path
    let filepath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filepath = possiblePath;
        break;
      }
    }
    
    if (filepath) {
      console.log(`Serving audio file from direct API endpoint: ${filepath}`);
      
      // Set proper headers for audio streaming
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `inline; filename="${baseAudioId}.mp3"`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Stream the file
      fs.createReadStream(filepath).pipe(res);
    } else {
      console.error(`Audio file not found: ${baseAudioId}`);
      res.status(404).json({ 
        success: false, 
        error: 'Audio file not found',
        audioId: baseAudioId
      });
    }
  });
  
  // Serve audio files without authentication (as fallback)
  app.use('/audio', express.static(audioDir));
  
  // Serve the chat widget demo page (no auth required)
  app.get('/chat-widget-demo', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'chat-widget-demo.html'));
  });
  
  // Serve the embeddable chat widget script (no auth required)
  app.get('/embed-chat.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'max-age=3600'); // Cache for 1 hour
    res.sendFile(path.join(process.cwd(), 'public', 'embed-chat.js'));
  });

  // Apply authentication middleware to all other routes
  app.use(authenticate);

  // Register AI routes
  app.use("/api/ai", aiRouter);
  
  // Register Speech routes
  app.use("/api/speech", speechRouter);
  
  // API routes
  app.get("/api/health", (req, res) => {
    apiResponse(res, { status: "OK", timestamp: new Date().toISOString() });
  });

  // System status and stats
  app.get("/api/system/status", async (req, res) => {
    try {
      const moduleStatuses = await storage.getAllModuleStatuses();
      apiResponse(res, moduleStatuses);
    } catch (error) {
      console.error("Error fetching module statuses:", error);
      apiResponse(res, { error: "Failed to fetch module statuses" }, 500);
    }
  });

  app.get("/api/system/activity", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const activities = await storage.getRecentSystemActivity(limit);
      apiResponse(res, activities);
    } catch (error) {
      console.error("Error fetching system activities:", error);
      apiResponse(res, { error: "Failed to fetch system activities" }, 500);
    }
  });

  // Users and authentication
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      apiResponse(res, users);
    } catch (error) {
      console.error("Error fetching users:", error);
      apiResponse(res, { error: "Failed to fetch users" }, 500);
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      apiResponse(res, user);
    } catch (error) {
      console.error("Error creating user:", error);
      apiResponse(res, { error: "Failed to create user" }, 500);
    }
  });

  // Voice Call module
  app.get("/api/voice/configs", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const twilioConfig = await storage.getTwilioConfigByUserId(userId);
      const sipConfig = await storage.getSipConfigByUserId(userId);
      const openPhoneConfig = await storage.getOpenPhoneConfigByUserId(userId);
      
      apiResponse(res, {
        twilio: twilioConfig || null,
        sip: sipConfig || null,
        openPhone: openPhoneConfig || null
      });
    } catch (error) {
      console.error("Error fetching voice configs:", error);
      apiResponse(res, { error: "Failed to fetch voice configurations" }, 500);
    }
  });

  app.get("/api/voice/logs", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await storage.getCallLogsByUserId(userId, limit);
      apiResponse(res, logs);
    } catch (error) {
      console.error("Error fetching call logs:", error);
      apiResponse(res, { error: "Failed to fetch call logs" }, 500);
    }
  });

  // Email module
  app.get("/api/email/configs", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const sendgridConfig = await storage.getSendgridConfigByUserId(userId);
      const smtpConfig = await storage.getSmtpConfigByUserId(userId);
      const mailgunConfig = await storage.getMailgunConfigByUserId(userId);
      
      apiResponse(res, {
        sendgrid: sendgridConfig || null,
        smtp: smtpConfig || null,
        mailgun: mailgunConfig || null
      });
    } catch (error) {
      console.error("Error fetching email configs:", error);
      apiResponse(res, { error: "Failed to fetch email configurations" }, 500);
    }
  });

  app.get("/api/email/logs", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await storage.getEmailLogsByUserId(userId, limit);
      apiResponse(res, logs);
    } catch (error) {
      console.error("Error fetching email logs:", error);
      apiResponse(res, { error: "Failed to fetch email logs" }, 500);
    }
  });

  // Chat module
  app.get("/api/chat/config", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const config = await storage.getChatConfigByUserId(userId);
      apiResponse(res, config || { error: "No chat configuration found" });
    } catch (error) {
      console.error("Error fetching chat config:", error);
      apiResponse(res, { error: "Failed to fetch chat configuration" }, 500);
    }
  });

  app.post("/api/chat/config", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const existingConfig = await storage.getChatConfigByUserId(userId);
      
      // Create or update config based on existing data
      let updatedConfig;
      if (existingConfig) {
        updatedConfig = await storage.updateChatConfig(existingConfig.id, {
          ...req.body,
          userId
        });
      } else {
        updatedConfig = await storage.createChatConfig({
          ...req.body,
          userId,
          isActive: true,
          widgetColor: req.body.widgetColor || "#2563eb",
          widgetTitle: req.body.widgetTitle || "Company Assistant",
          greetingMessage: req.body.greetingMessage || "Hello! How can I assist you today?",
          aiResponseTime: req.body.aiResponseTime || 2000,
          activeHours: req.body.activeHours || "9:00-17:00",
          enableAutoResponse: req.body.enableAutoResponse !== undefined ? req.body.enableAutoResponse : true,
          enableHumanHandoff: req.body.enableHumanHandoff !== undefined ? req.body.enableHumanHandoff : true,
          humanHandoffDelay: req.body.humanHandoffDelay || 300000 // 5 minutes default
        });
      }
      
      apiResponse(res, updatedConfig);
      
      // Log system activity
      await storage.createSystemActivity({
        module: "Live Chat",
        event: "Chat Configuration Updated",
        status: "Completed",
        timestamp: new Date(),
        details: { userId }
      });
    } catch (error) {
      console.error("Error updating chat config:", error);
      apiResponse(res, { error: "Failed to update chat configuration" }, 500);
    }
  });

  app.get("/api/chat/logs", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100; // Increased default limit to show more logs
      const sessionId = req.query.sessionId as string;
      
      let logs;
      if (sessionId) {
        // Get session-specific logs
        logs = await storage.getChatLogsBySessionId(sessionId);
        console.log(`Fetched ${logs.length} logs for session ${sessionId}`);
      } else {
        // Get all logs for this user
        logs = await storage.getChatLogsByUserId(userId, limit);
        console.log(`Fetched ${logs.length} total chat logs for user ${userId}`);
        
        // Log unique sessions for debugging
        const uniqueSessions = [...new Set(logs.map(log => log.sessionId))];
        console.log(`Found ${uniqueSessions.length} unique chat sessions: ${uniqueSessions.join(', ')}`);
      }
      
      apiResponse(res, logs);
    } catch (error) {
      console.error("Error fetching chat logs:", error);
      apiResponse(res, { error: "Failed to fetch chat logs" }, 500);
    }
  });
  
  app.post("/api/chat/message", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { message, sessionId, sender } = req.body;
      
      if (!message || !sessionId || !sender) {
        return apiResponse(res, { error: "Missing required fields: message, sessionId, or sender" }, 400);
      }
      
      // Create the chat log entry
      const chatLog = await storage.createChatLog({
        userId,
        sessionId,
        message,
        sender,
        timestamp: new Date()
      });
      
      apiResponse(res, chatLog);
    } catch (error) {
      console.error("Error creating chat message:", error);
      apiResponse(res, { error: "Failed to create chat message" }, 500);
    }
  });

  // WhatsApp module
  app.get("/api/whatsapp/config", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const config = await storage.getWhatsappConfigByUserId(userId);
      apiResponse(res, config || { error: "No WhatsApp configuration found" });
    } catch (error) {
      console.error("Error fetching WhatsApp config:", error);
      apiResponse(res, { error: "Failed to fetch WhatsApp configuration" }, 500);
    }
  });

  app.post("/api/whatsapp/config", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const configData = req.body;
      
      // Validate required fields
      const requiredFields = ['phoneNumberId', 'accessToken', 'businessAccountId', 'webhookVerifyToken'];
      const missingFields = requiredFields.filter(field => !configData[field]);
      
      if (missingFields.length > 0) {
        return apiResponse(res, { 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        }, 400);
      }
      
      // Check if config already exists for this user
      const existingConfig = await storage.getWhatsappConfigByUserId(userId);
      let config;
      
      if (existingConfig) {
        // Update existing config
        config = await storage.updateWhatsappConfig(existingConfig.id, {
          ...configData,
          userId
        });
      } else {
        // Create new config
        config = await storage.createWhatsappConfig({
          ...configData,
          userId
        });
      }
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: existingConfig ? "ConfigUpdated" : "ConfigCreated",
        status: "success",
        timestamp: new Date(),
        details: { userId, configId: config.id }
      });
      
      apiResponse(res, config);
    } catch (error) {
      console.error("Error saving WhatsApp config:", error);
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "ConfigError",
        status: "error",
        timestamp: new Date(),
        details: { error: error.message }
      });
      
      apiResponse(res, { error: "Failed to save WhatsApp configuration" }, 500);
    }
  });

  // WhatsApp Webhook Endpoint
  app.get("/api/whatsapp/webhook", async (req, res) => {
    try {
      // Handle the verification request from WhatsApp
      // When you configure webhooks in the WhatsApp API, the platform sends a verification request
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];
      
      // Fetch the verify token from our storage to validate
      const userId = 1; // For demo, use fixed user ID
      const config = await storage.getWhatsappConfigByUserId(userId);
      
      if (!config) {
        console.error("WhatsApp verification failed: No configuration found");
        return res.sendStatus(403);
      }
      
      // Check if the mode and token are in the query string of the request
      if (mode === "subscribe" && token === config.webhookVerifyToken) {
        // Respond with the challenge token from the request
        console.log("WhatsApp webhook verified successfully");
        
        await storage.createSystemActivity({
          module: "WhatsApp",
          event: "WebhookVerified",
          status: "success",
          timestamp: new Date(),
          details: { userId }
        });
        
        return res.status(200).send(challenge);
      }
      
      // Otherwise, respond with 403 Forbidden status
      console.error("WhatsApp webhook verification failed: Invalid verification token");
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "WebhookVerificationFailed",
        status: "error",
        timestamp: new Date(),
        details: { 
          userId,
          expected: config.webhookVerifyToken,
          received: token
        }
      });
      
      return res.sendStatus(403);
    } catch (error) {
      console.error("Error during WhatsApp webhook verification:", error);
      return res.sendStatus(500);
    }
  });

  // WhatsApp message receiving webhook
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      // Facebook/WhatsApp requires a 200 response quickly to acknowledge receipt
      res.status(200).send("EVENT_RECEIVED");
      
      const userId = 1; // For demo, use fixed user ID
      const data = req.body;
      
      // Log the incoming webhook payload for debugging
      console.log("WhatsApp webhook received:", JSON.stringify(data, null, 2));
      
      // Record system activity for the webhook event
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "WebhookReceived",
        status: "success",
        timestamp: new Date(),
        details: { payload: data }
      });
      
      // Process the incoming webhook
      if (data.object === "whatsapp_business_account") {
        // Process each entry
        for (const entry of data.entry) {
          for (const change of entry.changes) {
            if (change.field === "messages") {
              const value = change.value;
              
              // Handle different types of messages
              if (value && value.messages && value.messages.length > 0) {
                for (const message of value.messages) {
                  const phoneNumber = value.contacts[0]?.wa_id || "unknown";
                  const timestamp = new Date(parseInt(message.timestamp) * 1000);
                  
                  let messageText = "";
                  let mediaUrl = null;
                  
                  // Handle different message types (text, media, etc.)
                  if (message.type === "text" && message.text) {
                    messageText = message.text.body;
                  } else if (message.type === "image" && message.image) {
                    messageText = "📷 Image received";
                    mediaUrl = message.image.id || message.image.link;
                  } else if (message.type === "audio" && message.audio) {
                    messageText = "🎵 Audio received";
                    mediaUrl = message.audio.id || message.audio.link;
                  } else if (message.type === "video" && message.video) {
                    messageText = "🎬 Video received";
                    mediaUrl = message.video.id || message.video.link;
                  } else if (message.type === "document" && message.document) {
                    messageText = `📄 Document received: ${message.document.filename}`;
                    mediaUrl = message.document.id || message.document.link;
                  } else {
                    messageText = `Message of type ${message.type} received`;
                  }
                  
                  // Store the message in our logs
                  await storage.createWhatsappLog({
                    userId,
                    phoneNumber,
                    message: messageText,
                    mediaUrl,
                    direction: "inbound",
                    timestamp
                  });
                  
                  // Here you would add code to pass the message to your AI for processing
                  // and generating a response, which would then be sent back to the user.
                  
                  console.log(`WhatsApp message processed from ${phoneNumber}: ${messageText}`);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing WhatsApp webhook:", error);
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "WebhookError",
        status: "error",
        timestamp: new Date(),
        details: { error: error.message }
      });
    }
  });

  // Send WhatsApp message endpoint
  app.post("/api/whatsapp/send", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { phoneNumber, message, mediaUrl } = req.body;
      
      if (!phoneNumber || !message) {
        return apiResponse(res, { error: "Phone number and message are required" }, 400);
      }
      
      // Get the WhatsApp configuration
      const config = await storage.getWhatsappConfigByUserId(userId);
      
      if (!config) {
        return apiResponse(res, { error: "WhatsApp configuration not found" }, 404);
      }
      
      if (!config.isActive) {
        return apiResponse(res, { error: "WhatsApp integration is not active" }, 400);
      }
      
      // Here you would implement the actual sending of the message via WhatsApp API
      // For now, we'll just log it and simulate success for the demo
      console.log(`Sending WhatsApp message to ${phoneNumber}: ${message}`);
      
      // Log the outgoing message
      const whatsappLog = await storage.createWhatsappLog({
        userId,
        phoneNumber,
        message,
        mediaUrl,
        direction: "outbound",
        timestamp: new Date()
      });
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "MessageSent",
        status: "success",
        timestamp: new Date(),
        details: { userId, phoneNumber, messageId: whatsappLog.id }
      });
      
      apiResponse(res, { 
        success: true, 
        messageId: whatsappLog.id,
        message: "Message queued for delivery"
      });
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "MessageSendError",
        status: "error",
        timestamp: new Date(),
        details: { error: error.message }
      });
      
      apiResponse(res, { error: "Failed to send WhatsApp message" }, 500);
    }
  });

  // Test WhatsApp connection
  app.post("/api/whatsapp/test", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      
      // Get the WhatsApp configuration
      const config = await storage.getWhatsappConfigByUserId(userId);
      
      if (!config) {
        return apiResponse(res, { 
          success: false, 
          error: "WhatsApp configuration not found"
        }, 404);
      }
      
      // For a real implementation, you would make a test call to the WhatsApp API here
      // For now, we'll just simulate a connection test
      
      const isSuccessful = config.isActive && config.accessToken && config.phoneNumberId;
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "ConnectionTest",
        status: isSuccessful ? "success" : "error",
        timestamp: new Date(),
        details: { userId, isSuccessful }
      });
      
      apiResponse(res, { 
        success: isSuccessful,
        message: isSuccessful 
          ? "WhatsApp connection successful" 
          : "WhatsApp connection failed"
      });
    } catch (error) {
      console.error("Error testing WhatsApp connection:", error);
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "ConnectionTestError",
        status: "error",
        timestamp: new Date(),
        details: { error: error.message }
      });
      
      apiResponse(res, { 
        success: false, 
        error: "Failed to test WhatsApp connection" 
      }, 500);
    }
  });

  app.get("/api/whatsapp/logs", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const phoneNumber = req.query.phoneNumber as string;
      
      let logs;
      if (phoneNumber) {
        logs = await storage.getWhatsappLogsByPhoneNumber(userId, phoneNumber);
      } else {
        logs = await storage.getWhatsappLogsByUserId(userId, limit);
      }
      
      apiResponse(res, logs);
    } catch (error) {
      console.error("Error fetching WhatsApp logs:", error);
      apiResponse(res, { error: "Failed to fetch WhatsApp logs" }, 500);
    }
  });

  // Calendar module
  // Google OAuth routes (public - no auth required)
  app.use("/api/calendar/auth", (req, res, next) => {
    // Skip authentication for OAuth routes
    next();
  });
  
  // Google OAuth authorization endpoint
  app.get("/api/calendar/auth/authorize", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 1;
      
      // Get existing config to check client ID and secret
      const config = await storage.getCalendarConfigByUserId(userId);
      
      if (!config || !config.googleClientId || !config.googleClientSecret) {
        return apiResponse(res, {
          error: "Google Calendar configuration missing. Please set your Google Client ID and Secret first."
        }, 400);
      }
      
      // Generate a state parameter to prevent CSRF
      const state = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Store the state temporarily (in a real app, store in a database or Redis)
      // For simplicity, we're just storing it in memory here
      global.oauthStateStore = global.oauthStateStore || {};
      global.oauthStateStore[state] = {
        userId,
        timestamp: Date.now()
      };
      
      // Construct the Google OAuth URL
      const redirectUri = `${process.env.HOST_URL || 'http://localhost:5000'}/api/calendar/auth/callback`;
      const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
      
      // Log the authorization attempt
      await storage.createSystemActivity({
        module: "Calendar",
        event: "OAuthAuthorizeInitiated",
        status: "pending",
        timestamp: new Date(),
        details: { userId }
      });
      
      // Redirect the user to Google's OAuth page
      res.redirect(authUrl);
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
      apiResponse(res, { error: "Failed to initiate Google authentication" }, 500);
    }
  });
  
  // Google OAuth callback endpoint
  app.get("/api/calendar/auth/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      // Check for OAuth errors
      if (error) {
        console.error("Google OAuth error:", error);
        return res.redirect(`/calendar?error=${error}`);
      }
      
      // Validate state parameter to prevent CSRF
      if (!state || !global.oauthStateStore || !global.oauthStateStore[state as string]) {
        console.error("Invalid OAuth state parameter");
        return res.redirect('/calendar?error=invalid_state');
      }
      
      // Extract user ID from state
      const { userId } = global.oauthStateStore[state as string];
      
      // Clean up the state store
      delete global.oauthStateStore[state as string];
      
      // Get the calendar config for this user
      const config = await storage.getCalendarConfigByUserId(userId);
      
      if (!config || !config.googleClientId || !config.googleClientSecret) {
        console.error("Missing Google Calendar configuration");
        return res.redirect('/calendar?error=missing_config');
      }
      
      // Exchange the authorization code for tokens
      const redirectUri = `${process.env.HOST_URL || 'http://localhost:5000'}/api/calendar/auth/callback`;
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      
      // Make a request to Google's token endpoint
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code as string,
          client_id: config.googleClientId,
          client_secret: config.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      
      const tokenData = await response.json();
      
      if (!response.ok || tokenData.error) {
        console.error("Error exchanging code for tokens:", tokenData.error || "Unknown error");
        
        await storage.createSystemActivity({
          module: "Calendar",
          event: "OAuthTokenError",
          status: "error",
          timestamp: new Date(),
          details: { userId, error: tokenData.error || "Unknown token error" }
        });
        
        return res.redirect('/calendar?error=token_exchange_failed');
      }
      
      // Save the refresh token to the user's config
      const updatedConfig = await storage.updateCalendarConfig(config.id, {
        googleRefreshToken: tokenData.refresh_token || config.googleRefreshToken,
        isActive: true
      });
      
      // Log the successful authorization
      await storage.createSystemActivity({
        module: "Calendar",
        event: "OAuthAuthorizeSuccess",
        status: "success",
        timestamp: new Date(),
        details: { userId }
      });
      
      // Redirect back to the calendar page with success message
      res.redirect('/calendar?connected=true');
    } catch (error) {
      console.error("Error handling OAuth callback:", error);
      res.redirect('/calendar?error=callback_error');
    }
  });

  app.get("/api/calendar/config", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const config = await storage.getCalendarConfigByUserId(userId);
      apiResponse(res, config || { error: "No calendar configuration found" });
    } catch (error) {
      console.error("Error fetching calendar config:", error);
      apiResponse(res, { error: "Failed to fetch calendar configuration" }, 500);
    }
  });

  app.post("/api/calendar/config", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const configData = req.body;
      
      // Validate required fields
      if (!configData.googleClientId || !configData.googleClientSecret) {
        return apiResponse(res, { error: "Google Client ID and Secret are required" }, 400);
      }

      // Check if configuration already exists
      const existingConfig = await storage.getCalendarConfigByUserId(userId);
      
      let savedConfig;
      if (existingConfig) {
        // Update existing config
        savedConfig = await storage.updateCalendarConfig(existingConfig.id, {
          ...configData,
          userId
        });
        
        console.log("Updated calendar configuration:", savedConfig);
      } else {
        // Create new config
        savedConfig = await storage.createCalendarConfig({
          ...configData,
          userId,
          isActive: configData.isActive ?? true
        });
        
        console.log("Created new calendar configuration:", savedConfig);
      }
      
      // Log activity
      await storage.createSystemActivity({
        module: "Calendar",
        event: existingConfig ? "ConfigUpdated" : "ConfigCreated",
        status: "success",
        timestamp: new Date(),
        details: { userId }
      });
      
      apiResponse(res, savedConfig);
    } catch (error) {
      console.error("Error saving calendar config:", error);
      
      // Log error
      await storage.createSystemActivity({
        module: "Calendar",
        event: "ConfigError",
        status: "error",
        timestamp: new Date(),
        details: { error: String(error) }
      });
      
      apiResponse(res, { error: "Failed to save calendar configuration" }, 500);
    }
  });

  app.get("/api/calendar/meetings", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await storage.getMeetingLogsByUserId(userId, limit);
      apiResponse(res, logs);
    } catch (error) {
      console.error("Error fetching meeting logs:", error);
      apiResponse(res, { error: "Failed to fetch meeting logs" }, 500);
    }
  });
  
  app.post("/api/calendar/meetings", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const meetingData = req.body;
      
      // Validate required fields
      if (!meetingData.subject || !meetingData.startTime || !meetingData.endTime) {
        return apiResponse(res, { 
          error: "Subject, start time, and end time are required" 
        }, 400);
      }
      
      // Format for database
      const meeting = {
        userId,
        subject: meetingData.subject,
        description: meetingData.description || null,
        startTime: new Date(meetingData.startTime),
        endTime: new Date(meetingData.endTime),
        attendees: meetingData.attendees || [],
        status: "scheduled",
        googleEventId: null
      };
      
      // Check if calendar is configured
      const calendarConfig = await storage.getCalendarConfigByUserId(userId);
      
      let savedMeeting;
      let googleEventCreated = false;
      
      // Try to create Google Calendar event if configured
      if (calendarConfig?.isActive && 
          calendarConfig.googleRefreshToken && 
          calendarConfig.googleClientId && 
          calendarConfig.googleClientSecret) {
        try {
          // Import the createEvent function from lib/google-calendar
          const { createEvent } = require('./lib/google-calendar');
          
          // Convert attendees from comma-separated string to array if needed
          let attendeesArray = meeting.attendees;
          if (typeof attendeesArray === 'string') {
            attendeesArray = attendeesArray.split(',').map(email => email.trim()).filter(email => email);
          }
          
          // Format event for Google Calendar API
          const event = {
            summary: meeting.subject,
            description: meeting.description || '',
            start: { 
              dateTime: new Date(meeting.startTime).toISOString() 
            },
            end: { 
              dateTime: new Date(meeting.endTime).toISOString() 
            },
            attendees: attendeesArray.map(email => ({ email }))
          };
          
          // Create event in Google Calendar
          console.log("Creating Google Calendar event:", event);
          const googleEvent = await createEvent(userId, event);
          
          // Save meeting with Google Calendar event ID
          savedMeeting = await storage.createMeetingLog({
            ...meeting,
            googleEventId: googleEvent.id
          });
          
          googleEventCreated = true;
        } catch (googleError) {
          console.error("Error creating Google Calendar event:", googleError);
          // Fall back to creating just a local meeting
        }
      }
      
      // If Google Calendar creation failed or not configured, create local meeting only
      if (!googleEventCreated) {
        savedMeeting = await storage.createMeetingLog(meeting);
      }
      
      // Log activity
      await storage.createSystemActivity({
        module: "Calendar",
        event: "MeetingCreated",
        status: "success",
        timestamp: new Date(),
        details: { meetingId: savedMeeting.id, subject: meeting.subject }
      });
      
      apiResponse(res, savedMeeting);
    } catch (error) {
      console.error("Error creating meeting:", error);
      
      // Log error
      await storage.createSystemActivity({
        module: "Calendar",
        event: "MeetingCreationError",
        status: "error",
        timestamp: new Date(),
        details: { error: String(error) }
      });
      
      apiResponse(res, { error: "Failed to create meeting" }, 500);
    }
  });
  
  app.get("/api/calendar/slots", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const dateStr = req.query.date as string;
      
      if (!dateStr) {
        return apiResponse(res, { error: "Date parameter is required" }, 400);
      }
      
      // Parse the date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return apiResponse(res, { error: "Invalid date format" }, 400);
      }
      
      // Get calendar config
      const config = await storage.getCalendarConfigByUserId(userId);
      
      // If no config, return error
      if (!config) {
        return apiResponse(res, { 
          error: "Calendar not configured" 
        }, 404);
      }
      
      // Get meetings for the date
      const meetings = await storage.getMeetingLogsByUserId(userId);
      const datesMeetings = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.startTime);
        return meetingDate.toDateString() === date.toDateString();
      });
      
      // Import the getAvailableTimeSlots function from lib/google-calendar
      const { getAvailableTimeSlots } = require('./lib/google-calendar');
      
      // If calendar is connected to Google (has refresh token), use Google Calendar API
      if (config.googleRefreshToken) {
        try {
          console.log(`Getting available time slots from Google Calendar for ${date.toDateString()}`);
          // Get slots from Google Calendar based on free/busy data
          const slots = await getAvailableTimeSlots(userId, date, config.slotDuration);
          apiResponse(res, slots);
          return;
        } catch (googleError) {
          console.error("Error getting Google Calendar slots:", googleError);
          // Fall back to local slot generation
        }
      }
      
      // Fall back to local slot generation if Google Calendar is not connected or there's an error
      const startHour = parseInt(config.availabilityStartTime.split(':')[0]);
      const endHour = parseInt(config.availabilityEndTime.split(':')[0]);
      const slotDuration = config.slotDuration;
      
      const slots = [];
      const occupied = new Set();
      
      // Mark occupied slots from local meetings
      datesMeetings.forEach(meeting => {
        const startTime = new Date(meeting.startTime);
        const endTime = new Date(meeting.endTime);
        
        // Mark all slots that overlap with this meeting as occupied
        let currentSlot = new Date(date);
        currentSlot.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        
        while (currentSlot < endTime) {
          occupied.add(formatTimeSlot(currentSlot));
          currentSlot = new Date(currentSlot.getTime() + slotDuration * 60000);
        }
      });
      
      // Generate all slots based on business hours
      let currentTime = new Date(date);
      currentTime.setHours(startHour, 0, 0, 0);
      
      const endTime = new Date(date);
      endTime.setHours(endHour, 0, 0, 0);
      
      while (currentTime < endTime) {
        const timeString = formatTimeSlot(currentTime);
        slots.push({
          time: formatTime(currentTime),
          available: !occupied.has(timeString)
        });
        
        // Move to next slot
        currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
      }
      
      apiResponse(res, slots);
    } catch (error) {
      console.error("Error getting available slots:", error);
      apiResponse(res, { error: "Failed to get available time slots" }, 500);
    }
  });

  // Product module
  app.get("/api/products", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const products = await storage.getProductsByUserId(userId);
      
      // Get inventory for each product
      const productsWithInventory = await Promise.all(
        products.map(async (product) => {
          const inventory = await storage.getInventoryByProductId(product.id);
          return {
            ...product,
            inventory: inventory || null
          };
        })
      );
      
      apiResponse(res, productsWithInventory);
    } catch (error) {
      console.error("Error fetching products:", error);
      apiResponse(res, { error: "Failed to fetch products" }, 500);
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const product = await storage.createProduct(req.body);
      
      // Initialize inventory if provided
      if (req.body.inventory) {
        await storage.createInventory({
          productId: product.id,
          quantity: req.body.inventory.quantity || 0,
          lastUpdated: new Date()
        });
      }
      
      apiResponse(res, product);
    } catch (error) {
      console.error("Error creating product:", error);
      apiResponse(res, { error: "Failed to create product" }, 500);
    }
  });

  // AI Training module
  app.get("/api/training/data", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const category = req.query.category as string;
      
      let trainingData;
      if (category) {
        trainingData = await storage.getTrainingDataByCategory(userId, category);
      } else {
        trainingData = await storage.getTrainingDataByUserId(userId);
      }
      
      apiResponse(res, trainingData);
    } catch (error) {
      console.error("Error fetching training data:", error);
      apiResponse(res, { error: "Failed to fetch training data" }, 500);
    }
  });

  app.post("/api/training/data", async (req, res) => {
    try {
      const trainingData = await storage.createTrainingData(req.body);
      apiResponse(res, trainingData);
    } catch (error) {
      console.error("Error creating training data:", error);
      apiResponse(res, { error: "Failed to create training data" }, 500);
    }
  });

  app.get("/api/training/intents", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const intents = await storage.getIntentsByUserId(userId);
      apiResponse(res, intents);
    } catch (error) {
      console.error("Error fetching intents:", error);
      apiResponse(res, { error: "Failed to fetch intents" }, 500);
    }
  });

  app.post("/api/training/intents", async (req, res) => {
    try {
      const intent = await storage.createIntent(req.body);
      apiResponse(res, intent);
    } catch (error) {
      console.error("Error creating intent:", error);
      apiResponse(res, { error: "Failed to create intent" }, 500);
    }
  });

  // Module management
  app.put("/api/modules/:name/status", async (req, res) => {
    try {
      const { name } = req.params;
      const { status, responseTime, successRate, details } = req.body;
      
      const moduleStatus = await storage.getModuleStatusByName(name);
      if (!moduleStatus) {
        return apiResponse(res, { error: "Module not found" }, 404);
      }
      
      const updatedStatus = await storage.updateModuleStatus(moduleStatus.id, {
        status,
        responseTime,
        successRate,
        lastChecked: new Date(),
        details
      });
      
      // Log system activity for status change
      if (status !== moduleStatus.status) {
        await storage.createSystemActivity({
          module: name,
          event: `Status changed to ${status}`,
          status: "Completed",
          timestamp: new Date(),
          details: { previousStatus: moduleStatus.status, newStatus: status }
        });
      }
      
      apiResponse(res, updatedStatus);
    } catch (error) {
      console.error("Error updating module status:", error);
      apiResponse(res, { error: "Failed to update module status" }, 500);
    }
  });

  return httpServer;
}
