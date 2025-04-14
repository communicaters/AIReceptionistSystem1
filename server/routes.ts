import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { setupTwilioWebhooks } from "./lib/twilio";
import { initOpenAI } from "./lib/openai";
import { initSendgrid } from "./lib/sendgrid";
import { initGoogleCalendar } from "./lib/google-calendar";
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
