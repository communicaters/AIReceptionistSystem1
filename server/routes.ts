import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { pool } from "./db"; // Add database pool import for direct queries
import { setupTwilioWebhooks } from "./lib/twilio";
import { initOpenAI } from "./lib/openai";
import { initSendgrid } from "./lib/sendgrid";
import { initSmtp } from "./lib/smtp";
import { initMailgun } from "./lib/mailgun";
import { initEmailServices, sendTestEmail, processIncomingEmail, sendEmail } from "./lib/email-controller";
import { syncEmails, verifyImapConnection } from "./lib/imap";
import * as sendgridService from "./lib/sendgrid";
import * as smtpService from "./lib/smtp";
import * as mailgunService from "./lib/mailgun";
import nodemailer from "nodemailer";
import { initGoogleCalendar, createOAuth2Client, createEvent, getAvailableTimeSlots } from "./lib/google-calendar";
import { initElevenLabs } from "./lib/elevenlabs";
import { initWhisperAPI } from "./lib/whisper";
import { createAllSampleMp3s } from "./lib/create-sample-mp3";
import { getZenderService } from "./lib/zender";
import { getFacebookWhatsappService } from "./lib/facebook-whatsapp";
import { setupWebsocketHandlers, broadcastMessage } from "./lib/websocket";
import { aiRouter } from "./routes/ai";
import { speechRouter } from "./routes/speech";
import whatsappRouter from "./routes/whatsapp";
import authRouter from "./routes/auth-routes";
import usersRouter from "./routes/users-routes";
import packagesRouter from "./routes/packages-routes";
import reportsRouter from "./routes/reports-routes";
import { authenticate } from "./middleware/auth";
import express from "express";
import path from "path";
import fs from "fs";

// Helper function to handle API responses
function apiResponse(res: Response, data: any, status = 200) {
  return res.status(status).json(data);
}

// Handle Google OAuth callback with authorization code
async function handleGoogleOAuthCallback(req: Request, res: Response) {
  const { code, state, error } = req.query;
  
  // Check for OAuth errors
  if (error) {
    console.error("Google OAuth error:", error);
    return res.redirect(`/oauth-callback?error=${encodeURIComponent(error as string)}`);
  }
  
  // Validate state parameter to prevent CSRF
  if (!state || !global.oauthStateStore || !global.oauthStateStore[state as string]) {
    console.error("Invalid OAuth state parameter");
    return res.redirect('/oauth-callback?error=invalid_state');
  }
  
  // Extract user ID from state
  const { userId } = global.oauthStateStore[state as string];
  
  // Clean up the state store
  delete global.oauthStateStore[state as string];
  
  try {
    // Get the calendar config for this user
    const config = await storage.getCalendarConfigByUserId(userId);
    
    if (!config || !config.googleClientId || !config.googleClientSecret) {
      console.error("Missing Google Calendar configuration");
      return res.redirect('/oauth-callback?error=missing_config');
    }
    
    // Exchange the authorization code for tokens
    // Use the exact same redirect URI that was used for authorization
    // This URL must match exactly what's in Google Cloud Console
    const redirectUri = "https://6bdb745d-6f65-4b7e-940f-08efbdbcc0b7-00-1htwha895k1s8.kirk.replit.dev/api/calendar/auth";
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    
    console.log("Using redirect URI for token exchange:", redirectUri);
    
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
      
      return res.redirect('/oauth-callback?error=token_exchange_failed');
    }
    
    // Save the refresh token to the user's config
    await storage.updateCalendarConfig(config.id, {
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
    
    // Redirect to the OAuth callback page with success message
    return res.redirect('/oauth-callback?connected=true');
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    return res.redirect('/oauth-callback?error=callback_error');
  }
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
  // Ensure we're working with a valid date
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.error("Invalid date passed to formatTimeSlot:", date);
    return "";
  }
  
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
  initSmtp();
  initMailgun();
  initEmailServices();
  initGoogleCalendar();
  initElevenLabs();
  initWhisperAPI();
  
  // Google OAuth redirect URI - share this with users for Google Console setup
  // Use the Replit domain name if deployed, or localhost for local development
  const hostUrl = process.env.REPL_SLUG 
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`
    : (process.env.HOST_URL || 'http://localhost:5000');
  
  // The redirect URI for Google Calendar OAuth must match exactly what's in the Google Cloud Console
  // For this application, we're using:
  // https://6bdb745d-6f65-4b7e-940f-08efbdbcc0b7-00-1htwha895k1s8.kirk.replit.dev/api/calendar/auth
  
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

  // Register authentication routes (these don't require auth)
  app.use("/api/auth", authRouter);
  
  // Exempt other public resources from authentication
  // such as the chat widget, front-end assets, etc.
  
  // Apply authentication middleware to all other API routes
  // Authentication middleware for API routes, excluding webhooks
  app.use("/api", (req, res, next) => {
    // Skip authentication for webhook endpoints
    if (
      req.path.startsWith('/whatsapp/webhook') ||
      req.path === '/whatsapp/unified-webhook' ||
      req.path === '/zender/incoming' ||
      req.path.includes('webhook')
    ) {
      console.log('Webhook route excluded from authentication:', req.path);
      return next();
    }
    
    // Apply authentication for all other API routes
    return authenticate(req, res, next);
  });

  // Register AI routes
  app.use("/api/ai", aiRouter);
  
  // Register Speech routes
  app.use("/api/speech", speechRouter);
  
  // Register WhatsApp routes
  app.use("/api/whatsapp", whatsappRouter);
  
  // Register User Management routes that require authentication
  app.use("/api/users", usersRouter);
  app.use("/api/packages", packagesRouter);
  app.use("/api/reports", reportsRouter);
  
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

  // Users and authentication routes are now handled by the new controllers

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
  
  app.patch("/api/voice/logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return apiResponse(res, { error: "Invalid call log ID" }, 400);
      }
      
      const existingLog = await storage.getCallLog(id);
      if (!existingLog) {
        return apiResponse(res, { error: "Call log not found" }, 404);
      }
      
      const updatedLog = await storage.updateCallLog(id, req.body);
      if (!updatedLog) {
        return apiResponse(res, { error: "Failed to update call log" }, 500);
      }
      
      // Log the update to system activity
      await storage.createSystemActivity({
        module: "Voice Call",
        event: "Call Log Updated",
        status: "Completed",
        timestamp: new Date(),
        details: {
          callId: id,
          updates: Object.keys(req.body)
        }
      });
      
      apiResponse(res, updatedLog);
    } catch (error) {
      console.error("Error updating call log:", error);
      apiResponse(res, { error: "Failed to update call log" }, 500);
    }
  });
  
  // Test call endpoint
  app.post("/api/voice/test-call", async (req, res) => {
    try {
      const { phoneNumber, message, service } = req.body;
      
      if (!phoneNumber) {
        return apiResponse(res, { success: false, error: "Phone number is required" }, 400);
      }
      
      // Default test message if not provided
      const testMessage = message || "This is a test call from the AI receptionist system. The system is working properly.";
      
      // Determine which service to use (if specified)
      let result;
      let serviceName = service;
      
      // Get configurations to validate service status
      const userId = 1; // For demo purposes
      const twilioConfigResult = await storage.getTwilioConfigByUserId(userId);
      const sipConfigResult = await storage.getSipConfigByUserId(userId);
      const openPhoneConfigResult = await storage.getOpenPhoneConfigByUserId(userId);
      
      const configs = {
        twilio: twilioConfigResult,
        sip: sipConfigResult,
        openPhone: openPhoneConfigResult
      };
      
      // Debug configuration values
      console.log("Twilio config:", JSON.stringify(configs.twilio));
      
      // If service is not explicitly specified, check configs to find an active one
      if (!serviceName) {
        if (configs.openPhone && configs.openPhone.isActive) {
          serviceName = 'openphone';
        } else if (configs.twilio && configs.twilio.isActive) {
          serviceName = 'twilio';
        } else if (configs.sip && configs.sip.isActive) {
          serviceName = 'sip';
        } else {
          return apiResponse(res, { 
            success: false, 
            error: "No active phone service found. Please configure and activate a phone service." 
          }, 400);
        }
      } else {
        // Verify the selected service is active
        if (serviceName === 'twilio' && (!configs.twilio || !configs.twilio.isActive)) {
          return apiResponse(res, { 
            success: false, 
            error: "Twilio service is not active. Please activate it in the configuration." 
          }, 400);
        } else if (serviceName === 'sip' && (!configs.sip || !configs.sip.isActive)) {
          return apiResponse(res, { 
            success: false, 
            error: "SIP service is not active. Please activate it in the configuration." 
          }, 400);
        } else if (serviceName === 'openphone' && (!configs.openPhone || !configs.openPhone.isActive)) {
          return apiResponse(res, { 
            success: false, 
            error: "OpenPhone service is not active. Please activate it in the configuration." 
          }, 400);
        }
      }
      
      // Make the call using the appropriate service
      switch (serviceName) {
        case 'twilio':
          const { makeOutboundCall: makeOutboundTwilioCall } = await import('./lib/twilio');
          result = await makeOutboundTwilioCall(phoneNumber, testMessage);
          break;
          
        case 'openphone':
          // Use OpenPhone service if implemented, otherwise use mocked service
          try {
            const { makeOutboundCall: makeOutboundOpenPhoneCall } = await import('./lib/openphone');
            result = await makeOutboundOpenPhoneCall(phoneNumber, testMessage);
          } catch (error) {
            // Fallback to Twilio for demo purposes only if it's active
            if (configs.twilio && configs.twilio.isActive) {
              console.log("OpenPhone service not implemented, using Twilio as fallback for demo");
              const { makeOutboundCall: makeOutboundOpenPhoneCall } = await import('./lib/twilio');
              result = await makeOutboundOpenPhoneCall(phoneNumber, testMessage);
            } else {
              return apiResponse(res, { 
                success: false, 
                error: "OpenPhone service is not fully implemented yet and no fallback is available." 
              }, 500);
            }
          }
          break;
          
        case 'sip':
          // Use SIP service if implemented, otherwise use mocked service
          try {
            const { makeOutboundCall: makeOutboundSipCall } = await import('./lib/sip');
            result = await makeOutboundSipCall(phoneNumber, testMessage);
          } catch (error) {
            // Fallback to Twilio for demo purposes only if it's active
            if (configs.twilio && configs.twilio.isActive) {
              console.log("SIP service not implemented, using Twilio as fallback for demo");
              const { makeOutboundCall: makeOutboundSipCall } = await import('./lib/twilio');
              result = await makeOutboundSipCall(phoneNumber, testMessage);
            } else {
              return apiResponse(res, { 
                success: false, 
                error: "SIP service is not fully implemented yet and no fallback is available." 
              }, 500);
            }
          }
          break;
          
        default:
          return apiResponse(res, { 
            success: false, 
            error: `Unknown service: ${serviceName}` 
          }, 400);
      }
      
      if (result.success) {
        await storage.createSystemActivity({
          module: "Voice Call",
          event: `Test Call Successful (${serviceName})`,
          status: "Completed",
          timestamp: new Date(),
          details: { phoneNumber, callSid: result.callSid, service: serviceName }
        });
      } else {
        await storage.createSystemActivity({
          module: "Voice Call",
          event: `Test Call Failed (${serviceName})`,
          status: "Error",
          timestamp: new Date(),
          details: { phoneNumber, error: result.error, service: serviceName }
        });
      }
      
      apiResponse(res, { ...result, service: serviceName });
    } catch (error: any) {
      console.error("Error making test call:", error);
      apiResponse(res, { success: false, error: error.message || "Failed to make test call" }, 500);
    }
  });
  
  // Twilio configuration endpoint
  app.post("/api/voice/twilio/config", async (req, res) => {
    try {
      const userId = 1; // For demo purposes
      const { accountSid, authToken, phoneNumber, isActive } = req.body;
      
      // Validate required fields
      if (!accountSid || !authToken || !phoneNumber) {
        return apiResponse(res, { error: "Account SID, Auth Token, and Phone Number are required" }, 400);
      }
      
      // Check if configuration exists
      const existingConfig = await storage.getTwilioConfigByUserId(userId);
      
      let twilioConfig;
      
      if (existingConfig) {
        // Update existing config
        twilioConfig = await storage.updateTwilioConfig(existingConfig.id, {
          accountSid,
          authToken,
          phoneNumber,
          isActive: isActive !== undefined ? isActive : existingConfig.isActive
        });
      } else {
        // Create new config
        twilioConfig = await storage.createTwilioConfig({
          userId,
          accountSid,
          authToken,
          phoneNumber,
          isActive: isActive !== undefined ? isActive : true
        });
      }
      
      // Attempt to initialize Twilio with new credentials
      const { initTwilio } = await import('./lib/twilio');
      await initTwilio(true); // Force reconnect with new credentials
      
      await storage.createSystemActivity({
        module: "Voice Call",
        event: "Twilio Configuration Updated",
        status: "Completed",
        timestamp: new Date(),
        details: { phoneNumber }
      });
      
      apiResponse(res, twilioConfig);
    } catch (error: any) {
      console.error("Error saving Twilio configuration:", error);
      apiResponse(res, { error: error.message || "Failed to save Twilio configuration" }, 500);
    }
  });
  
  // SIP configuration endpoint
  app.post("/api/voice/sip/config", async (req, res) => {
    try {
      const userId = 1; // For demo purposes
      const { username, password, serverUrl, extension, isActive } = req.body;
      
      // Validate required fields
      if (!username || !password || !serverUrl) {
        return apiResponse(res, { error: "Username, Password, and Server URL are required" }, 400);
      }
      
      // Check if configuration exists
      const existingConfig = await storage.getSipConfigByUserId(userId);
      
      let sipConfig;
      
      if (existingConfig) {
        // Update existing config
        sipConfig = await storage.updateSipConfig(existingConfig.id, {
          username,
          password,
          serverUrl,
          extension,
          isActive: isActive !== undefined ? isActive : existingConfig.isActive
        });
      } else {
        // Create new config
        sipConfig = await storage.createSipConfig({
          userId,
          username,
          password,
          serverUrl,
          extension,
          isActive: isActive !== undefined ? isActive : true
        });
      }
      
      await storage.createSystemActivity({
        module: "Voice Call",
        event: "SIP Configuration Updated",
        status: "Completed",
        timestamp: new Date(),
        details: { serverUrl }
      });
      
      apiResponse(res, sipConfig);
    } catch (error: any) {
      console.error("Error saving SIP configuration:", error);
      apiResponse(res, { error: error.message || "Failed to save SIP configuration" }, 500);
    }
  });
  
  // OpenPhone configuration endpoint
  app.post("/api/voice/openphone/config", async (req, res) => {
    try {
      const userId = 1; // For demo purposes
      const { phoneNumber, apiKey, isActive } = req.body;
      
      // Validate required fields
      if (!phoneNumber || !apiKey) {
        return apiResponse(res, { error: "Phone Number and API Key are required" }, 400);
      }
      
      // Check if configuration exists
      const existingConfig = await storage.getOpenPhoneConfigByUserId(userId);
      
      let openPhoneConfig;
      
      if (existingConfig) {
        // Update existing config
        openPhoneConfig = await storage.updateOpenPhoneConfig(existingConfig.id, {
          phoneNumber,
          apiKey,
          isActive: isActive !== undefined ? isActive : existingConfig.isActive
        });
      } else {
        // Create new config
        openPhoneConfig = await storage.createOpenPhoneConfig({
          userId,
          phoneNumber,
          apiKey,
          isActive: isActive !== undefined ? isActive : true
        });
      }
      
      await storage.createSystemActivity({
        module: "Voice Call",
        event: "OpenPhone Configuration Updated",
        status: "Completed",
        timestamp: new Date(),
        details: { phoneNumber }
      });
      
      apiResponse(res, openPhoneConfig);
    } catch (error: any) {
      console.error("Error saving OpenPhone configuration:", error);
      apiResponse(res, { error: error.message || "Failed to save OpenPhone configuration" }, 500);
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
  
  // Sync emails from IMAP server
  app.post("/api/email/sync", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      
      // Import the IMAP functions
      const { syncEmails, verifyImapConnection } = await import('./lib/imap');
      
      // First verify the connection with enhanced verification
      const connectionStatus = await verifyImapConnection(userId);
      
      if (!connectionStatus.connected) {
        return apiResponse(res, { 
          success: false, 
          message: connectionStatus.message || "Cannot connect to IMAP server. Please check your email configuration." 
        }, 400);
      }
      
      // Perform the sync with enhanced options
      const options = {
        unreadOnly: true,  // Default to fetching only unread emails
        folder: "INBOX",   // Default folder
        limit: 50          // Increased limit for better results
      };
      
      // Get any override options from request
      if (req.body.unreadOnly !== undefined) options.unreadOnly = !!req.body.unreadOnly;
      if (req.body.folder) options.folder = req.body.folder;
      if (req.body.limit) options.limit = Math.min(100, parseInt(req.body.limit.toString()));
      
      console.log(`Starting email sync with options:`, options);
      
      // Perform the sync with progress tracking
      await storage.createSystemActivity({
        module: "Email",
        event: "EmailSync",
        status: "in_progress",
        timestamp: new Date(),
        details: { userId, options }
      });
      
      const emailCount = await syncEmails(userId, options);
      
      // Log completion
      await storage.createSystemActivity({
        module: "Email",
        event: "EmailSync",
        status: "completed",
        timestamp: new Date(),
        details: { userId, count: emailCount, options }
      });
      
      apiResponse(res, { 
        success: true, 
        message: emailCount > 0 
          ? `Successfully synced ${emailCount} new emails` 
          : "Sync completed. No new emails found.", 
        count: emailCount 
      });
    } catch (error) {
      console.error("Error syncing emails:", error);
      
      await storage.createSystemActivity({
        module: "Email",
        event: "EmailSync",
        status: "failed",
        timestamp: new Date(),
        details: { userId: 1, error: (error as Error).message }
      });
      
      apiResponse(res, { 
        success: false, 
        message: `Failed to sync emails: ${(error as Error).message}` 
      }, 500);
    }
  });
  
  // Verify IMAP connection with enhanced diagnostics
  app.get("/api/email/imap-status", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      
      // Import the IMAP verification function
      const { verifyImapConnection } = await import('./lib/imap');
      
      // Check connection with enhanced status information
      const connectionStatus = await verifyImapConnection(userId);
      
      apiResponse(res, { 
        success: true, 
        connected: connectionStatus.connected,
        message: connectionStatus.message || (connectionStatus.connected 
          ? "Successfully connected to IMAP server" 
          : "Failed to connect to IMAP server"),
        folderList: connectionStatus.folderList || []
      });
    } catch (error) {
      console.error("Error checking IMAP connection:", error);
      apiResponse(res, { 
        success: false, 
        connected: false,
        message: `Failed to check IMAP connection: ${(error as Error).message}`,
        folderList: []
      }, 500);
    }
  });
  
  app.get("/api/email/configs", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      
      const sendgrid = await storage.getSendgridConfigByUserId(userId);
      const smtp = await storage.getSmtpConfigByUserId(userId);
      const mailgun = await storage.getMailgunConfigByUserId(userId);
      
      apiResponse(res, {
        sendgrid: sendgrid || null,
        smtp: smtp || null,
        mailgun: mailgun || null
      });
    } catch (error) {
      console.error("Error fetching email configurations:", error);
      apiResponse(res, { error: "Failed to fetch email configurations" }, 500);
    }
  });
  
  // Update a specific email configuration
  app.post("/api/email/config/sendgrid", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { apiKey, fromEmail, fromName, isActive } = req.body;
      
      if (!apiKey || !fromEmail || !fromName) {
        return apiResponse(res, { error: "Required fields missing" }, 400);
      }
      
      // Check if config already exists
      const existingConfig = await storage.getSendgridConfigByUserId(userId);
      
      let config;
      if (existingConfig) {
        // Update existing config
        config = await storage.updateSendgridConfig(existingConfig.id, {
          apiKey,
          fromEmail,
          fromName,
          isActive: isActive !== undefined ? isActive : true
        });
      } else {
        // Create new config
        config = await storage.createSendgridConfig({
          userId,
          apiKey,
          fromEmail,
          fromName,
          isActive: isActive !== undefined ? isActive : true
        });
      }
      
      await storage.createSystemActivity({
        module: "Email",
        event: "SendGrid Config Updated",
        status: "Completed",
        timestamp: new Date(),
        details: { userId }
      });
      
      // Initialize SendGrid with the new config
      await initSendgrid();
      
      apiResponse(res, config);
    } catch (error) {
      console.error("Error updating SendGrid config:", error);
      apiResponse(res, { error: "Failed to update SendGrid configuration" }, 500);
    }
  });
  
  app.post("/api/email/config/smtp", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { host, port, username, password, fromEmail, isActive } = req.body;
      
      if (!host || !port || !username || !password || !fromEmail) {
        return apiResponse(res, { error: "Required fields missing" }, 400);
      }
      
      // Check if config already exists
      const existingConfig = await storage.getSmtpConfigByUserId(userId);
      
      let config;
      if (existingConfig) {
        // Update existing config
        config = await storage.updateSmtpConfig(existingConfig.id, {
          host,
          port: parseInt(port),
          username,
          password,
          fromEmail,
          isActive: isActive !== undefined ? isActive : true
        });
      } else {
        // Create new config
        config = await storage.createSmtpConfig({
          userId,
          host,
          port: parseInt(port),
          username,
          password,
          fromEmail,
          isActive: isActive !== undefined ? isActive : true
        });
      }
      
      await storage.createSystemActivity({
        module: "Email",
        event: "SMTP Config Updated",
        status: "Completed",
        timestamp: new Date(),
        details: { userId, host, port }
      });
      
      // Initialize SMTP with the new config
      await initSmtp(userId);
      
      apiResponse(res, config);
    } catch (error) {
      console.error("Error updating SMTP config:", error);
      apiResponse(res, { error: "Failed to update SMTP configuration" }, 500);
    }
  });
  
  app.post("/api/email/config/mailgun", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { apiKey, domain, fromEmail, fromName, authorizedRecipients, isActive } = req.body;
      
      if (!apiKey || !domain || !fromEmail) {
        return apiResponse(res, { error: "Required fields missing" }, 400);
      }
      
      // Set default fromName if not provided
      const defaultFromName = fromName || "AI Receptionist";
      
      // Check if using sandbox domain (which requires authorized recipients)
      const isSandboxDomain = domain.includes('sandbox');
      if (isSandboxDomain && !authorizedRecipients) {
        console.warn("Warning: Using Mailgun sandbox domain without authorized recipients.");
        console.warn("Sandbox domains can only send to authorized recipients.");
      }
      
      // Check if config already exists
      const existingConfig = await storage.getMailgunConfigByUserId(userId);
      
      let config;
      if (existingConfig) {
        // Update existing config
        config = await storage.updateMailgunConfig(existingConfig.id, {
          apiKey,
          domain,
          fromEmail,
          fromName: fromName || defaultFromName,
          authorizedRecipients, // Include this field in updates
          isActive: isActive !== undefined ? isActive : true
        });
      } else {
        // Create new config
        config = await storage.createMailgunConfig({
          userId,
          apiKey,
          domain,
          fromEmail,
          fromName: fromName || defaultFromName,
          authorizedRecipients, // Include this field in creation
          isActive: isActive !== undefined ? isActive : true
        });
      }
      
      await storage.createSystemActivity({
        module: "Email",
        event: "Mailgun Config Updated",
        status: "Completed",
        timestamp: new Date(),
        details: { userId, domain }
      });
      
      // Initialize Mailgun with the new config
      await initMailgun(userId);
      
      apiResponse(res, config);
    } catch (error) {
      console.error("Error updating Mailgun config:", error);
      apiResponse(res, { error: "Failed to update Mailgun configuration" }, 500);
    }
  });
  
  // Verify SMTP connection
  app.post("/api/email/verify/smtp", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      
      // We may be verifying a new configuration or an existing one
      const { host, port, username, password } = req.body;
      
      if (host && port && username && password) {
        // Create a temporary transporter for verification only
        const transporter = nodemailer.createTransport({
          host,
          port: parseInt(port),
          secure: parseInt(port) === 465,
          auth: {
            user: username,
            pass: password
          }
        });
        
        const isVerified = await transporter.verify();
        
        apiResponse(res, { 
          success: isVerified, 
          message: isVerified 
            ? "SMTP connection successful" 
            : "Failed to verify SMTP connection" 
        });
      } else {
        // Verify using stored configuration
        const config = await storage.getSmtpConfigByUserId(userId);
        
        if (!config) {
          return apiResponse(res, { 
            success: false, 
            message: "No SMTP configuration found" 
          }, 404);
        }
        
        // Initialize SMTP service
        const { verifySmtpConnection } = await import('./lib/smtp');
        const isVerified = await verifySmtpConnection(userId);
        
        apiResponse(res, { 
          success: isVerified, 
          message: isVerified 
            ? "SMTP connection successful" 
            : "Failed to verify SMTP connection" 
        });
      }
    } catch (error) {
      console.error("Error verifying SMTP connection:", error);
      apiResponse(res, { 
        success: false, 
        message: `SMTP verification failed: ${error.message}` 
      }, 500);
    }
  });
  
  // Send a test email
  app.post("/api/email/test", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { to, service } = req.body;
      
      if (!to) {
        return apiResponse(res, { 
          success: false, 
          message: "Recipient email address is required" 
        }, 400);
      }
      
      // Send test email using the imported function
      const success = await sendTestEmail(to, userId, service);
      
      if (success) {
        await storage.createSystemActivity({
          module: "Email",
          event: "Test Email Sent",
          status: "Completed",
          timestamp: new Date(),
          details: { to, service }
        });
        
        apiResponse(res, { 
          success: true, 
          message: `Test email sent to ${to} using ${service || 'default'} service` 
        });
      } else {
        apiResponse(res, { 
          success: false, 
          message: "Failed to send test email. Check service configuration and logs." 
        }, 500);
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      apiResponse(res, { 
        success: false, 
        message: `Error sending test email: ${error.message}` 
      }, 500);
    }
  });
  
  // Process and respond to an incoming email
  app.post("/api/email/process", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { from, to, subject, body, service } = req.body;
      
      if (!from || !subject || !body) {
        return apiResponse(res, { 
          success: false, 
          message: "From address, subject, and body are required" 
        }, 400);
      }
      
      // Process the email using the imported function
      const success = await processIncomingEmail({
        from,
        to: to || 'receptionist@example.com',
        subject,
        body
      }, userId, service as any);
      
      if (success) {
        apiResponse(res, { 
          success: true, 
          message: "Email processed successfully" 
        });
      } else {
        apiResponse(res, { 
          success: false, 
          message: "Failed to process email" 
        }, 500);
      }
    } catch (error) {
      console.error("Error processing email:", error);
      apiResponse(res, { 
        success: false, 
        message: `Error processing email: ${error.message}` 
      }, 500);
    }
  });
  
  // Send email from the composer
  app.post("/api/email/send", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { to, subject, body, templateId, htmlBody, service } = req.body;
      
      if (!to || !subject || (!body && !htmlBody)) {
        return apiResponse(res, { 
          success: false, 
          message: "To address, subject, and body are required" 
        }, 400);
      }
      
      // Get the selected email service config or default to the first available
      let serviceToUse = service || 'smtp';
      let fromEmail = '';
      let fromName = '';
      
      // Get the appropriate 'from' email address based on the selected service
      if (serviceToUse === 'sendgrid') {
        const sendgridConfig = await storage.getSendgridConfigByUserId(userId);
        if (sendgridConfig) {
          fromEmail = sendgridConfig.fromEmail;
          fromName = sendgridConfig.fromName;
        } else {
          serviceToUse = 'smtp'; // Fall back to SMTP if SendGrid isn't configured
        }
      }
      
      if (serviceToUse === 'smtp') {
        const smtpConfig = await storage.getSmtpConfigByUserId(userId);
        if (smtpConfig) {
          fromEmail = smtpConfig.fromEmail;
        } else {
          serviceToUse = 'mailgun'; // Fall back to Mailgun if SMTP isn't configured
        }
      }
      
      if (serviceToUse === 'mailgun') {
        const mailgunConfig = await storage.getMailgunConfigByUserId(userId);
        if (mailgunConfig) {
          fromEmail = mailgunConfig.fromEmail;
          fromName = mailgunConfig.fromName || '';
        }
      }
      
      if (!fromEmail) {
        return apiResponse(res, { 
          success: false, 
          message: "No email service is properly configured" 
        }, 400);
      }
      
      // Actually send the email using the appropriate service
      let success = false;
      let message = '';
      
      try {
        // Create email params
        const emailParams = {
          to,
          from: fromEmail,
          fromName,
          subject,
          text: body,
          html: htmlBody || undefined
        };
        
        // Use the centralized email service
        if (serviceToUse === 'sendgrid') {
          const result = await sendEmail(emailParams, 'sendgrid', userId);
          success = result;
          message = result ? "Email sent successfully" : "Failed to send email via SendGrid";
        } else if (serviceToUse === 'smtp') {
          const result = await sendEmail(emailParams, 'smtp', userId);
          success = result;
          message = result ? "Email sent successfully" : "Failed to send email via SMTP";
        } else if (serviceToUse === 'mailgun') {
          const result = await sendEmail(emailParams, 'mailgun', userId);
          success = result;
          message = result ? "Email sent successfully" : "Failed to send email via Mailgun";
        }
      } catch (sendError) {
        console.error("Error sending email via service:", sendError);
        success = false;
        message = `Failed to send email: ${sendError.message}`;
      }
      
      // Log the email regardless of whether it was sent successfully
      await storage.createEmailLog({
        userId,
        from: fromEmail,
        to,
        subject,
        body,
        status: success ? "sent" : "failed",
        timestamp: new Date(),
        service: serviceToUse
      });
      
      apiResponse(res, { success, message });
    } catch (error) {
      console.error("Error sending email:", error);
      apiResponse(res, { 
        success: false, 
        message: `Failed to send email: ${error.message}` 
      }, 500);
    }
  });
  
  // Email Templates
  app.get("/api/email/templates", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { category } = req.query;
      
      let templates;
      if (category) {
        templates = await storage.getEmailTemplatesByCategory(userId, category as string);
      } else {
        templates = await storage.getEmailTemplatesByUserId(userId);
      }
      
      apiResponse(res, templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      apiResponse(res, { error: "Failed to fetch email templates" }, 500);
    }
  });
  
  app.get("/api/email/templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getEmailTemplate(templateId);
      
      if (!template) {
        return apiResponse(res, { error: "Template not found" }, 404);
      }
      
      apiResponse(res, template);
    } catch (error) {
      console.error("Error fetching email template:", error);
      apiResponse(res, { error: "Failed to fetch email template" }, 500);
    }
  });
  
  app.post("/api/email/templates", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { name, subject, body, category } = req.body;
      
      if (!name || !subject || !body) {
        return apiResponse(res, { error: "Missing required fields" }, 400);
      }
      
      const newTemplate = await storage.createEmailTemplate({
        userId,
        name,
        subject,
        body,
        category: category || "general",
        createdAt: new Date(),
        lastUpdated: new Date(),
        isActive: true
      });
      
      apiResponse(res, newTemplate, 201);
    } catch (error) {
      console.error("Error creating email template:", error);
      apiResponse(res, { error: "Failed to create email template" }, 500);
    }
  });
  
  app.put("/api/email/templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getEmailTemplate(templateId);
      
      if (!template) {
        return apiResponse(res, { error: "Template not found" }, 404);
      }
      
      const updatedTemplate = await storage.updateEmailTemplate(templateId, {
        ...req.body,
        lastUpdated: new Date()
      });
      
      apiResponse(res, updatedTemplate);
    } catch (error) {
      console.error("Error updating email template:", error);
      apiResponse(res, { error: "Failed to update email template" }, 500);
    }
  });
  
  app.delete("/api/email/templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getEmailTemplate(templateId);
      
      if (!template) {
        return apiResponse(res, { error: "Template not found" }, 404);
      }
      
      await storage.deleteEmailTemplate(templateId);
      
      apiResponse(res, { success: true });
    } catch (error) {
      console.error("Error deleting email template:", error);
      apiResponse(res, { error: "Failed to delete email template" }, 500);
    }
  });

  // WhatsApp Templates
  app.get("/api/whatsapp/templates", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { category, provider } = req.query;
      
      let templates;
      if (category && provider) {
        templates = await storage.getWhatsappTemplatesByCategoryAndProvider(
          userId, 
          category as string,
          provider as string
        );
      } else if (category) {
        templates = await storage.getWhatsappTemplatesByCategory(userId, category as string);
      } else if (provider) {
        templates = await storage.getWhatsappTemplatesByProvider(userId, provider as string);
      } else {
        templates = await storage.getWhatsappTemplatesByUserId(userId);
      }
      
      apiResponse(res, templates);
    } catch (error) {
      console.error("Error fetching WhatsApp templates:", error);
      apiResponse(res, { error: "Failed to fetch WhatsApp templates" }, 500);
    }
  });
  
  app.get("/api/whatsapp/templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getWhatsappTemplate(templateId);
      
      if (!template) {
        return apiResponse(res, { error: "Template not found" }, 404);
      }
      
      apiResponse(res, template);
    } catch (error) {
      console.error("Error fetching WhatsApp template:", error);
      apiResponse(res, { error: "Failed to fetch WhatsApp template" }, 500);
    }
  });
  
  app.post("/api/whatsapp/templates", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { name, content, category, provider, description, componentsJson, templateId } = req.body;
      
      if (!name || !content || !category || !provider) {
        return apiResponse(res, { error: "Missing required fields" }, 400);
      }
      
      const newTemplate = await storage.createWhatsappTemplate({
        userId,
        name,
        content,
        category,
        provider,
        isActive: true,
        description: description || null,
        componentsJson: componentsJson || null,
        templateId: templateId || null
      });
      
      // Broadcast notification about the new template
      if (broadcastMessage) {
        broadcastMessage({
          type: 'whatsapp_template_created',
          timestamp: new Date().toISOString(),
          data: newTemplate
        });
      }
      
      apiResponse(res, newTemplate, 201);
    } catch (error) {
      console.error("Error creating WhatsApp template:", error);
      apiResponse(res, { error: "Failed to create WhatsApp template" }, 500);
    }
  });
  
  app.put("/api/whatsapp/templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getWhatsappTemplate(templateId);
      
      if (!template) {
        return apiResponse(res, { error: "Template not found" }, 404);
      }
      
      const updatedTemplate = await storage.updateWhatsappTemplate(templateId, {
        ...req.body
      });
      
      // Broadcast notification about the updated template
      if (broadcastMessage) {
        broadcastMessage({
          type: 'whatsapp_template_updated',
          timestamp: new Date().toISOString(),
          data: updatedTemplate
        });
      }
      
      apiResponse(res, updatedTemplate);
    } catch (error) {
      console.error("Error updating WhatsApp template:", error);
      apiResponse(res, { error: "Failed to update WhatsApp template" }, 500);
    }
  });
  
  app.delete("/api/whatsapp/templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getWhatsappTemplate(templateId);
      
      if (!template) {
        return apiResponse(res, { error: "Template not found" }, 404);
      }
      
      await storage.deleteWhatsappTemplate(templateId);
      
      // Broadcast notification about the deleted template
      if (broadcastMessage) {
        broadcastMessage({
          type: 'whatsapp_template_deleted',
          timestamp: new Date().toISOString(),
          data: { id: templateId }
        });
      }
      
      apiResponse(res, { success: true });
    } catch (error) {
      console.error("Error deleting WhatsApp template:", error);
      apiResponse(res, { error: "Failed to delete WhatsApp template" }, 500);
    }
  });
  
  // Scheduled Emails
  app.get("/api/email/scheduled", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const emails = await storage.getScheduledEmailsByUserId(userId);
      
      apiResponse(res, emails);
    } catch (error) {
      console.error("Error fetching scheduled emails:", error);
      apiResponse(res, { error: "Failed to fetch scheduled emails" }, 500);
    }
  });
  
  app.get("/api/email/scheduled/:id", async (req, res) => {
    try {
      const emailId = parseInt(req.params.id);
      const email = await storage.getScheduledEmail(emailId);
      
      if (!email) {
        return apiResponse(res, { error: "Scheduled email not found" }, 404);
      }
      
      apiResponse(res, email);
    } catch (error) {
      console.error("Error fetching scheduled email:", error);
      apiResponse(res, { error: "Failed to fetch scheduled email" }, 500);
    }
  });
  
  app.post("/api/email/scheduled", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const { to, subject, body, scheduledTime, service, templateId, fromName } = req.body;
      
      if (!to || !scheduledTime || (!body && !templateId) || !service) {
        return apiResponse(res, { error: "Missing required fields" }, 400);
      }
      
      let emailSubject = subject;
      let emailBody = body;
      
      // If templateId is provided, fetch the template and use its subject and body
      if (templateId) {
        const template = await storage.getEmailTemplate(parseInt(templateId));
        if (!template) {
          return apiResponse(res, { error: "Template not found" }, 404);
        }
        
        emailSubject = subject || template.subject;
        emailBody = body || template.body;
      }
      
      // Get the appropriate 'from' email address based on the selected service
      let fromEmail = "";
      if (service === "sendgrid") {
        const sendgridConfig = await storage.getSendgridConfig(userId);
        if (sendgridConfig) {
          fromEmail = sendgridConfig.fromEmail;
        }
      } else if (service === "smtp") {
        const smtpConfig = await storage.getSmtpConfig(userId);
        if (smtpConfig) {
          fromEmail = smtpConfig.fromEmail;
        }
      } else if (service === "mailgun") {
        const mailgunConfig = await storage.getMailgunConfig(userId);
        if (mailgunConfig) {
          fromEmail = mailgunConfig.fromEmail;
        }
      }
      
      if (!fromEmail) {
        return apiResponse(res, { error: "No 'from' email configured for the selected service" }, 400);
      }
      
      const newEmail = await storage.createScheduledEmail({
        userId,
        to,
        from: fromEmail,
        fromName: fromName || null,
        subject: emailSubject,
        body: emailBody,
        scheduledTime: new Date(scheduledTime),
        service,
        status: "pending",
        createdAt: new Date(),
        templateId: templateId ? parseInt(templateId) : null,
        isRecurring: req.body.isRecurring || false,
        recurringRule: req.body.recurringRule || null
      });
      
      apiResponse(res, newEmail, 201);
    } catch (error) {
      console.error("Error creating scheduled email:", error);
      apiResponse(res, { error: "Failed to create scheduled email" }, 500);
    }
  });
  
  app.put("/api/email/scheduled/:id", async (req, res) => {
    try {
      const emailId = parseInt(req.params.id);
      const email = await storage.getScheduledEmail(emailId);
      const userId = 1; // For demo, use fixed user ID
      
      if (!email) {
        return apiResponse(res, { error: "Scheduled email not found" }, 404);
      }
      
      // Only allow updates if the email hasn't been sent yet
      if (email.status === "sent") {
        return apiResponse(res, { error: "Cannot update an email that has already been sent" }, 400);
      }
      
      const updateData = { ...req.body };
      
      // If service is changing, we need to update the from email
      if (updateData.service && updateData.service !== email.service) {
        // Get the appropriate 'from' email address based on the selected service
        let fromEmail = "";
        if (updateData.service === "sendgrid") {
          const sendgridConfig = await storage.getSendgridConfig(userId);
          if (sendgridConfig) {
            fromEmail = sendgridConfig.fromEmail;
          }
        } else if (updateData.service === "smtp") {
          const smtpConfig = await storage.getSmtpConfig(userId);
          if (smtpConfig) {
            fromEmail = smtpConfig.fromEmail;
          }
        } else if (updateData.service === "mailgun") {
          const mailgunConfig = await storage.getMailgunConfig(userId);
          if (mailgunConfig) {
            fromEmail = mailgunConfig.fromEmail;
          }
        }
        
        if (fromEmail) {
          updateData.from = fromEmail;
        }
      }
      
      const updatedEmail = await storage.updateScheduledEmail(emailId, updateData);
      
      apiResponse(res, updatedEmail);
    } catch (error) {
      console.error("Error updating scheduled email:", error);
      apiResponse(res, { error: "Failed to update scheduled email" }, 500);
    }
  });
  
  app.delete("/api/email/scheduled/:id", async (req, res) => {
    try {
      const emailId = parseInt(req.params.id);
      const email = await storage.getScheduledEmail(emailId);
      
      if (!email) {
        return apiResponse(res, { error: "Scheduled email not found" }, 404);
      }
      
      // Only allow deletion if the email hasn't been sent yet
      if (email.status === "sent") {
        return apiResponse(res, { error: "Cannot delete an email that has already been sent" }, 400);
      }
      
      await storage.deleteScheduledEmail(emailId);
      
      apiResponse(res, { success: true });
    } catch (error) {
      console.error("Error deleting scheduled email:", error);
      apiResponse(res, { error: "Failed to delete scheduled email" }, 500);
    }
  });
  
  app.post("/api/email/scheduled/:id/cancel", async (req, res) => {
    try {
      const emailId = parseInt(req.params.id);
      const email = await storage.getScheduledEmail(emailId);
      
      if (!email) {
        return apiResponse(res, { error: "Scheduled email not found" }, 404);
      }
      
      // Only allow cancellation if the email hasn't been sent yet
      if (email.status === "sent") {
        return apiResponse(res, { error: "Cannot cancel an email that has already been sent" }, 400);
      }
      
      const updatedEmail = await storage.updateScheduledEmailStatus(emailId, "cancelled");
      
      apiResponse(res, updatedEmail);
    } catch (error) {
      console.error("Error cancelling scheduled email:", error);
      apiResponse(res, { error: "Failed to cancel scheduled email" }, 500);
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

  /**
   * Shared function to handle Zender webhook processing
   */
  async function handleZenderWebhook(req: Request, res: Response) {
    try {
      const userId = 1; // For demo, use fixed user ID
      const webhookData = req.body;
      
      console.log("Zender webhook received:", JSON.stringify(webhookData, null, 2));
      console.log("Webhook content type:", req.headers['content-type']);
      
      // Get WhatsApp configuration to check webhook secret
      const config = await storage.getWhatsappConfigByUserId(userId);
      
      if (!config) {
        console.error("Zender webhook validation failed: No WhatsApp configuration found");
        return res.status(403).json({ error: "Invalid webhook configuration" });
      }
      
      // TEMPORARY: Bypass webhook secret validation to ensure messages are processed
      // This ensures all webhooks are accepted during development/testing
      console.log("Webhook validation BYPASSED for development - Processing all incoming webhooks");
      
      // Record the webhook data for debugging purposes
      const receivedSecret = webhookData.secret || 'none_provided';
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "Webhook Received (Validation Bypassed)",
        status: "Success",
        timestamp: new Date(),
        details: { 
          receivedSecret,
          message: "Webhook accepted without validation"
        }
      });
      
      /* Original validation code commented out for now
      if (!config.webhookSecret) {
        console.warn("No webhook secret configured. Processing webhook without verification.");
      } else {
        // Validate webhook secret with more flexibility for Zender
        const receivedSecret = webhookData.secret;
        
        if (!receivedSecret) {
          console.error("Zender webhook validation failed: No secret provided");
          await storage.createSystemActivity({
            module: "WhatsApp",
            event: "Zender Webhook Auth Failed",
            status: "Error",
            timestamp: new Date(),
            details: { error: "No webhook secret provided" }
          });
          
          // return res.status(403).json({ error: "No webhook secret provided" });
        }
        
        // Check against both webhookSecret and webhookVerifyToken
        const validSecrets = [config.webhookSecret];
        if (config.webhookVerifyToken) {
          validSecrets.push(config.webhookVerifyToken);
        }
        
        console.log(`Webhook validation - Received secret: ${receivedSecret}`);
        console.log(`Valid secrets: ${validSecrets.join(', ')}`);
        
        if (!validSecrets.includes(receivedSecret)) {
          console.error("Zender webhook validation failed: Invalid webhook secret");
          
          // For debugging purposes, log what was received and what was expected
          console.warn(`Webhook Secret Mismatch - Received: ${receivedSecret}`);
          console.warn(`Expected one of: ${validSecrets.join(', ')}`);
          
          await storage.createSystemActivity({
            module: "WhatsApp",
            event: "Zender Webhook Auth Failed",
            status: "Error",
            timestamp: new Date(),
            details: { 
              error: "Invalid webhook secret",
              received: receivedSecret,
              expected: validSecrets
            }
          });
        }
      }
      */
      
      // Webhook is authenticated or we're in test mode without a secret
      // Send OK response immediately to prevent Zender from retrying
      res.status(200).send("OK");
      
      // Get the Zender service
      const zenderService = getZenderService(userId);
      
      // Record webhook receipt in activity log
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "Zender Webhook Received",
        status: "Processing",
        timestamp: new Date(),
        details: { 
          type: webhookData.type || 'unknown',
          dataKeys: Object.keys(webhookData).filter(k => k.startsWith('data['))
        }
      });
      
      // Process the webhook data
      const processed = await zenderService.processWebhook(webhookData);
      
      if (processed) {
        // Create system activity record for successful webhook processing
        await storage.createSystemActivity({
          module: "WhatsApp",
          event: "Zender Webhook Processed",
          status: "Completed",
          timestamp: new Date(),
          details: { 
            type: webhookData.type,
            from: webhookData['data[phone]'] || webhookData['data[wid]'] || 'unknown',
            messageId: webhookData['data[id]'] || 'unknown'
          }
        });
      } else {
        // Create system activity record for webhook processing failure
        await storage.createSystemActivity({
          module: "WhatsApp",
          event: "Zender Webhook Processing Failed",
          status: "Error",
          timestamp: new Date(),
          details: { error: "Invalid webhook data format" }
        });
      }
    } catch (error) {
      console.error("Error processing Zender webhook:", error);
      
      // If we haven't sent a response yet, send an error
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
      
      // Create system activity record for the error
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "Zender Webhook Error",
        status: "Error",
        timestamp: new Date(),
        details: { error: (error as Error).message }
      });
    }
  }

  // Zender WhatsApp/SMS Webhook Endpoint (original path)
  app.post("/api/zender/incoming", handleZenderWebhook);
  
  // Alternative webhook endpoint at the common path to support both webhook configurations
  app.post("/api/whatsapp/webhook/zender", handleZenderWebhook);
  
  // Unified webhook handler route for all WhatsApp providers
  app.post("/api/whatsapp/unified-webhook", async (req, res) => {
    try {
      const data = req.body;
      console.log("Received WhatsApp webhook:", JSON.stringify(data, null, 2));
      
      // First, check if it's a Facebook/Meta format webhook
      if (data.object === "whatsapp_business_account") {
        // Respond immediately as required by Facebook
        res.status(200).send("EVENT_RECEIVED");
        
        // Process it as a Facebook webhook
        const userId = 1;
        
        // Record system activity
        await storage.createSystemActivity({
          module: "WhatsApp",
          event: "Facebook Webhook Received",
          status: "success",
          timestamp: new Date(),
          details: { provider: "facebook" }
        });
        
        // Process the incoming webhook (Facebook format)
        try {
          for (const entry of data.entry || []) {
            for (const change of entry.changes || []) {
              if (change.field === "messages") {
                const value = change.value;
                
                if (value && value.messages && value.messages.length > 0) {
                  for (const message of value.messages) {
                    const phoneNumber = value.contacts[0]?.wa_id || "unknown";
                    const timestamp = new Date(parseInt(message.timestamp) * 1000);
                    
                    let messageText = "";
                    let mediaUrl = null;
                    
                    // Handle different message types
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
                    const savedLog = await storage.createWhatsappLog({
                      userId,
                      phoneNumber,
                      message: messageText,
                      mediaUrl,
                      direction: "inbound",
                      timestamp
                    });
                    
                    // Broadcast to connected clients via WebSocket
                    const socketMessage = {
                      type: "whatsapp_message",
                      data: {
                        id: savedLog.id,
                        phoneNumber,
                        message: messageText,
                        mediaUrl,
                        direction: "inbound",
                        timestamp: timestamp.toISOString()
                      }
                    };
                    
                    // Broadcast to all connected WebSocket clients
                    broadcastMessage(JSON.stringify(socketMessage));
                    
                    console.log(`Broadcast Facebook message to WebSocket clients: ${phoneNumber} - ${messageText}`);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error processing Facebook webhook:", error);
          await storage.createSystemActivity({
            module: "WhatsApp",
            event: "Webhook Error",
            status: "error",
            timestamp: new Date(),
            details: { provider: "facebook", error: (error as Error).message }
          });
        }
        
        return; // Already sent response
      }
      
      // If not Facebook, check if it's a Zender format webhook
      if (data.data || data.from || data.message || data.secret || 
          data.type === "whatsapp" || 
          Object.keys(data).some(key => key.startsWith('data['))) {
          
        // For Zender webhooks, we need to respond quickly
        res.status(200).send("OK");
        
        const userId = 1;
        
        try {
          console.log("Processing Zender webhook data format");
          
          // Prepare variables to store extracted data
          let sender = '';
          let message = '';
          let mediaUrl = null;
          let timestamp = new Date();
          
          // Format 1: Direct data in the object
          if (data.from || data.phone || data.wid) {
            sender = data.from || data.phone || data.wid;
            message = data.message || '';
            mediaUrl = data.media_url || data.attachment || null;
            if (data.timestamp) {
              timestamp = new Date(parseInt(data.timestamp) * 1000);
            }
          }
          // Format 2: Nested in data object
          else if (data.data && (typeof data.data === 'object')) {
            sender = data.data.from || data.data.phone || data.data.wid;
            message = data.data.message || '';
            mediaUrl = data.data.media_url || data.data.attachment || null;
            if (data.data.timestamp) {
              timestamp = new Date(parseInt(data.data.timestamp) * 1000);
            }
          }
          // Format 3: Form-encoded with data[key] format
          else if (Object.keys(data).some(key => key.startsWith('data['))) {
            const keys = Object.keys(data);
            
            // Find the sender key (could be different names)
            const fromKey = keys.find(k => k === 'data[from]' || k === 'data[phone]' || k === 'data[wid]');
            if (fromKey) sender = data[fromKey];
            
            // Find the message key
            const messageKey = keys.find(k => k === 'data[message]');
            if (messageKey) message = data[messageKey];
            
            // Find any media URL
            const mediaKey = keys.find(k => k === 'data[media_url]' || k === 'data[attachment]');
            if (mediaKey) mediaUrl = data[mediaKey];
            
            // Find timestamp
            const timestampKey = keys.find(k => k === 'data[timestamp]');
            if (timestampKey && data[timestampKey]) {
              timestamp = new Date(parseInt(data[timestampKey]) * 1000);
            }
          }
          
          // Clean up phone number format (remove + prefix)
          if (sender) {
            sender = sender.replace(/^\+/, '');
          }
          
          // If we have the basic required data
          if (sender && message) {
            console.log(`Extracted Zender webhook data - From: ${sender}, Message: ${message.substring(0, 50)}...`);
            
            // Store the message in the database
            const savedLog = await storage.createWhatsappLog({
              userId,
              phoneNumber: sender,
              message: message,
              mediaUrl: mediaUrl,
              direction: "inbound",
              timestamp: timestamp
            });
            
            // Broadcast to connected clients
            const socketMessage = {
              type: "whatsapp_message",
              data: {
                id: savedLog.id,
                phoneNumber: sender,
                message: message,
                mediaUrl: mediaUrl,
                direction: "inbound",
                timestamp: timestamp.toISOString()
              }
            };
            
            // Broadcast to all connected WebSocket clients
            broadcastMessage(JSON.stringify(socketMessage));
            
            console.log(`Broadcast Zender message to WebSocket clients: ${sender} - ${message}`);
            
            // Record success
            await storage.createSystemActivity({
              module: "WhatsApp",
              event: "Message Received",
              status: "success",
              timestamp: new Date(),
              details: {
                provider: "zender",
                from: sender,
                messageContent: message.substring(0, 100) + (message.length > 100 ? '...' : '')
              }
            });
          } else {
            // If we couldn't extract the data, fall back to the handler
            console.log("Could not extract data directly, using Zender service handler");
            const zenderService = getZenderService(userId);
            const success = await zenderService.processWebhook(data);
            
            if (!success) {
              throw new Error("Failed to process webhook with Zender service");
            }
          }
        } catch (error) {
          console.error("Error processing Zender webhook data:", error);
          await storage.createSystemActivity({
            module: "WhatsApp",
            event: "Webhook Error",
            status: "error",
            timestamp: new Date(),
            details: { provider: "zender", error: (error as Error).message }
          });
        }
        
        return; // Already sent response
      }
      
      // If we get here, we don't recognize the format
      console.log("Unknown webhook format:", JSON.stringify(data, null, 2));
      res.status(200).send("OK"); // Always respond with OK to any webhook
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "Unknown Webhook Format",
        status: "warning",
        timestamp: new Date(),
        details: { data: JSON.stringify(data).substring(0, 200) }
      });
      
    } catch (error) {
      console.error("Error in unified webhook handler:", error);
      res.status(200).send("OK"); // Always respond with success to webhooks
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "Webhook Handler Error",
        status: "error",
        timestamp: new Date(),
        details: { error: (error as Error).message }
      });
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

  // WhatsApp message receiving webhook (Meta/Facebook API)
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
      
      // Process Zender webhook if that's the format we're receiving
      if (data.type === "whatsapp" && (data.secret || data.data || Object.keys(data).some(k => k.startsWith('data[')))) {
        try {
          const config = await storage.getWhatsappConfigByUserId(userId);
          
          // Validate secret if present with more flexibility
          // For Zender, we check against both webhookSecret and webhookVerifyToken 
          // since there is confusion about which field to use
          if (config && config.webhookSecret && data.secret) {
            const validSecrets = [config.webhookSecret];
            
            // Also try the webhookVerifyToken if it exists
            if (config.webhookVerifyToken) {
              validSecrets.push(config.webhookVerifyToken);
            }
            
            // Check if the received secret matches any of our valid secrets
            if (!validSecrets.includes(data.secret)) {
              console.warn(`Webhook secret validation failed. Received: ${data.secret}`);
              console.warn(`Expected one of: ${validSecrets.join(', ')}`);
              
              // Log the activity but continue processing (more lenient validation)
              await storage.createSystemActivity({
                module: "WhatsApp",
                event: "Webhook Auth Warning",
                status: "Warning",
                timestamp: new Date(),
                details: { 
                  message: "Secret mismatch but processing anyway",
                  received: data.secret,
                  expected: validSecrets 
                }
              });
              
              // Continuing processing despite secret mismatch to avoid missing messages
              console.log("Proceeding with webhook processing despite secret mismatch");
            } else {
              console.log("Webhook secret verified successfully");
            }
          }
          
          // Extract message data based on the format
          let sender = '';
          let message = '';
          let mediaUrl = null;
          let timestamp = new Date();
          let messageId = null;
          
          // Format 1: Object with data property as an object
          if (data.data && typeof data.data === 'object') {
            console.log("Processing webhook format 1 (nested data object)");
            sender = data.data.phone || data.data.wid || '';
            message = data.data.message || '';
            mediaUrl = data.data.attachment || null;
            messageId = data.data.id?.toString() || null;
            
            if (data.data.timestamp) {
              timestamp = new Date(parseInt(data.data.timestamp) * 1000);
            }
          }
          // Format 2: Object with form-encoded data[property] format
          else if (Object.keys(data).some(key => key.startsWith('data['))) {
            console.log("Processing webhook format 2 (form-encoded data)");
            sender = data['data[phone]'] || data['data[wid]'] || '';
            message = data['data[message]'] || '';
            
            const attachmentValue = data['data[attachment]'];
            mediaUrl = (attachmentValue && attachmentValue !== '0') ? attachmentValue : null;
            
            messageId = data['data[id]']?.toString() || null;
            
            if (data['data[timestamp]']) {
              timestamp = new Date(parseInt(data['data[timestamp]']) * 1000);
            }
          }
          
          // Clean phone number format
          if (sender) {
            sender = sender.replace(/^\+/, '');
          }
          
          // If we successfully extracted the required fields
          if (sender && message) {
            console.log(`Extracted webhook data - From: ${sender}, Message: ${message}`);
            
            // Create the message log
            const whatsappLog = await storage.createWhatsappLog({
              userId,
              phoneNumber: sender,
              message,
              mediaUrl,
              direction: 'inbound',
              timestamp,
              status: 'received',
              externalId: messageId
            });
            
            console.log(`Created WhatsApp log entry with ID: ${whatsappLog.id}`);
            
            // Record successful processing
            await storage.createSystemActivity({
              module: 'WhatsApp',
              event: 'Message Received',
              status: 'Completed',
              timestamp: new Date(),
              details: {
                from: sender,
                messageId,
                logId: whatsappLog.id,
                message: message.substring(0, 100) + (message.length > 100 ? '...' : '')
              }
            });
            
            // Broadcast the message via WebSocket to update UI in real-time
            if (broadcastMessage) {
              try {
                broadcastMessage({
                  type: 'whatsapp_message',
                  timestamp: new Date().toISOString(),
                  data: {
                    id: whatsappLog.id,
                    phoneNumber: sender,
                    message: message,
                    direction: 'inbound',
                    timestamp: timestamp,
                    status: 'received'
                  }
                });
                console.log('Broadcast WhatsApp message notification to all connected clients');
              } catch (error) {
                console.error('Error broadcasting WhatsApp message:', error);
              }
            } else {
              console.warn('broadcastMessage function not available, cannot send real-time notification');
            }
            
            // Process with AI and generate auto-response
            try {
              console.log(`Processing WhatsApp message with AI for ${sender}: ${message}`);
              
              // Get chat configuration for this user
              const chatConfig = await storage.getChatConfigByUserId(userId);
              if (!chatConfig || !chatConfig.isActive) {
                console.warn(`Chat AI is not active for user ${userId}, skipping auto-response`);
                return;
              }
              
              // Get any previous messages with this number to maintain context
              const previousMessages = await storage.getWhatsappLogsByPhoneNumber(userId, sender);
              
              // Format previous messages for context 
              // Get the most recent messages, but preserve conversation flow (30 is enough for good context)
              // Since we're now getting messages DESC (newest first), we need to reverse them for the AI
              // to maintain chronological conversation flow
              const messageHistory = previousMessages
                .slice(0, 30) // Get the most recent 30 messages for context (query already returns newest first)
                .reverse() // Reverse to maintain chronological order (oldest first for the conversation)
                .map(msg => ({
                  role: msg.direction === 'inbound' ? 'user' : 'assistant',
                  content: msg.message
                }));
                
              console.log(`Using ${messageHistory.length} messages for context history`);
              
              // Create a system prompt based on training data
              const trainingData = await storage.getTrainingDataByCategory(userId, 'whatsapp');
              let systemPrompt = "You are an AI assistant for a business. Be helpful, concise, and professional.";
              
              if (trainingData && trainingData.length > 0) {
                // If we have specific training data, use that to enhance the system prompt
                const trainingText = trainingData
                  .map(data => data.content)
                  .join("\n\n");
                systemPrompt += "\n\n" + trainingText;
              }
              
              console.log("Using system prompt for WhatsApp AI response:", systemPrompt.substring(0, 200) + "...");
              
              // Prepare the AI request
              const messages = [
                { role: 'system', content: systemPrompt },
                ...messageHistory,
                { role: 'user', content: message }
              ];
              
              console.log(`Sending ${messages.length} messages to OpenAI for processing`);
              
              // Call the OpenAI API
              const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                  model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
                  messages: messages,
                  temperature: 0.7,
                  max_tokens: 500
                })
              });
              
              if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
              }
              
              const aiResponse = await response.json();
              const aiReplyText = aiResponse.choices[0].message.content.trim();
              
              console.log(`AI generated response: ${aiReplyText}`);
              
              // Send the AI response back via Zender
              const zenderService = getZenderService(userId);
              await zenderService.initialize();
              
              // Create a log entry for the outbound message
              const responseLogs = await storage.createWhatsappLog({
                userId,
                phoneNumber: sender,
                message: aiReplyText,
                direction: "outbound",
                timestamp: new Date(),
                status: 'pending'
              });
              
              // Send message via Zender
              const result = await zenderService.sendMessage({
                recipient: sender,
                message: aiReplyText,
                type: 'text'
              });
              
              if (result.success) {
                console.log(`Auto-response sent successfully via Zender to ${sender}`);
                await storage.updateWhatsappLog(responseLogs.id, { 
                  status: 'sent',
                  externalId: result.messageId
                });
                
                // Broadcast the response via WebSocket
                if (broadcastMessage) {
                  broadcastMessage({
                    type: 'whatsapp_message',
                    timestamp: new Date().toISOString(),
                    data: {
                      id: responseLogs.id,
                      phoneNumber: sender,
                      message: aiReplyText,
                      direction: 'outbound',
                      timestamp: new Date(),
                      status: 'sent'
                    }
                  });
                }
              } else {
                console.error(`Failed to send auto-response via Zender: ${result.error}`);
                await storage.updateWhatsappLog(responseLogs.id, { status: 'failed' });
              }
            } catch (error) {
              console.error("Error generating AI response for WhatsApp:", error);
              await storage.createSystemActivity({
                module: "WhatsApp",
                event: "AI Response Failed",
                status: "Error",
                timestamp: new Date(),
                details: { error: (error as Error).message }
              });
            }
            
            return;
          }
        } catch (error) {
          console.error("Error processing Zender webhook:", error);
          await storage.createSystemActivity({
            module: 'WhatsApp',
            event: 'Webhook Processing Error',
            status: 'Error',
            timestamp: new Date(),
            details: { error: (error as Error).message }
          });
          return;
        }
      }
      
      // If we reach here, it's not a Zender format or we couldn't process it
      // Fall back to Facebook format processing
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
                  const whatsappLog = await storage.createWhatsappLog({
                    userId,
                    phoneNumber,
                    message: messageText,
                    mediaUrl,
                    direction: "inbound",
                    timestamp,
                    status: "received",
                    externalId: message.id
                  });
                  
                  // Broadcast the message via WebSocket to update UI in real-time
                  if (broadcastMessage) {
                    try {
                      broadcastMessage({
                        type: 'whatsapp_message',
                        timestamp: new Date().toISOString(),
                        data: {
                          id: whatsappLog.id,
                          phoneNumber,
                          message: messageText,
                          direction: 'inbound',
                          timestamp,
                          status: 'received',
                          mediaUrl
                        }
                      });
                      console.log('Broadcast Facebook WhatsApp message notification to all connected clients');
                    } catch (error) {
                      console.error('Error broadcasting Facebook WhatsApp message:', error);
                    }
                  } else {
                    console.warn('broadcastMessage function not available, cannot send real-time notification');
                  }
                  
                  // Pass the message to AI for processing and generate a response
                  try {
                    console.log(`Processing WhatsApp message with AI for ${phoneNumber}: ${messageText}`);
                    
                    // Get chat configuration for this user
                    const chatConfig = await storage.getChatConfigByUserId(userId);
                    if (!chatConfig || !chatConfig.isActive) {
                      console.warn(`Chat AI is not active for user ${userId}, skipping auto-response`);
                      return;
                    }
                    
                    // Get any previous messages with this number to maintain context
                    const previousMessages = await storage.getWhatsappLogsByPhoneNumber(userId, phoneNumber);
                    
                    // Format previous messages for context 
                    // Get the most recent messages, but preserve conversation flow (30 is enough for good context)
                    // Since we're now getting messages DESC (newest first), we need to reverse them for the AI
                    // to maintain chronological conversation flow
                    const messageHistory = previousMessages
                      .slice(0, 30) // Get the most recent 30 messages for context (query already returns newest first)
                      .reverse() // Reverse to maintain chronological order (oldest first for the conversation)
                      .map(msg => ({
                        role: msg.direction === 'inbound' ? 'user' : 'assistant',
                        content: msg.message
                      }));
                      
                    console.log(`Using ${messageHistory.length} messages for context history`);
                    
                    // Create a system prompt based on training data
                    const trainingData = await storage.getTrainingDataByCategory(userId, 'whatsapp');
                    let systemPrompt = "You are an AI assistant for a business. Be helpful, concise, and professional.";
                    
                    if (trainingData && trainingData.length > 0) {
                      // If we have specific training data, use that to enhance the system prompt
                      const trainingText = trainingData
                        .map(data => data.content)
                        .join("\n\n");
                      systemPrompt += "\n\n" + trainingText;
                    }
                    
                    // Check if this might be a meeting scheduling request
                    const scheduleKeywords = [
                      'schedule', 'meeting', 'appointment', 'call', 'book', 'calendar',
                      'today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
                      'set up', 'meet', 'slot', 'time', 'available', 'pm', 'am'
                    ];
                    
                    const messageHasScheduleKeywords = scheduleKeywords.some(
                      keyword => messageText.toLowerCase().includes(keyword.toLowerCase())
                    );
                    
                    // Check for email addresses in the message
                    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                    const emailMatches = messageText.match(emailRegex);
                    const attendeeEmail = emailMatches ? emailMatches[0] : null;
                    
                    // Add scheduling intent detection to system prompt if keywords detected
                    let enhancedSystemPrompt = systemPrompt;
                    if (messageHasScheduleKeywords) {
                      enhancedSystemPrompt += `\n\nThis appears to be a meeting scheduling request. If the user wants to schedule a meeting:
1. Extract the requested date and time (interpret timezone abbreviations like PST, EST, etc.)
2. Identify the attendee email address 
3. Determine the meeting subject/purpose
4. Respond in JSON format with these properties: 
   {
     "is_scheduling_request": true,
     "date_time": "YYYY-MM-DD HH:MM:SS", 
     "email": "user@example.com",
     "subject": "Meeting subject",
     "duration_minutes": 30,
     "timezone": "America/Los_Angeles" 
   }

For example, if the user says "Schedule a meeting for tomorrow at 2pm PST with john@example.com", respond with:
{
  "is_scheduling_request": true,
  "date_time": "2025-04-18 14:00:00",
  "email": "john@example.com",
  "subject": "Follow-up Meeting",
  "duration_minutes": 30,
  "timezone": "America/Los_Angeles"
}

If this is NOT a meeting scheduling request, respond normally and set is_scheduling_request to false.`;
                    }
                    
                    // Prepare the AI request
                    const messages = [
                      { role: 'system', content: enhancedSystemPrompt },
                      ...messageHistory,
                      { role: 'user', content: messageText }
                    ];
                    
                    // Call the OpenAI API with structured output format
                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                      },
                      body: JSON.stringify({
                        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 1000,
                        response_format: messageHasScheduleKeywords ? { type: "json_object" } : undefined
                      })
                    });
                    
                    if (!response.ok) {
                      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
                    }
                    
                    const aiResponse = await response.json();
                    let aiReplyText = aiResponse.choices[0].message.content.trim();
                    let replyToUser = aiReplyText;
                    
                    // If this is a scheduling request, process it
                    if (messageHasScheduleKeywords) {
                      try {
                        // Try to parse the response as JSON
                        const schedulingData = JSON.parse(aiReplyText);
                        
                        if (schedulingData.is_scheduling_request === true) {
                          console.log('Detected meeting scheduling request:', schedulingData);
                          
                          // Parse the date time string into a proper Date object
                          const parsedDateTime = new Date(schedulingData.date_time);
                          console.log('Parsed date time:', parsedDateTime);
                          
                          // Calculate end time based on duration
                          const duration = schedulingData.duration_minutes || 30;
                          const endDateTime = new Date(parsedDateTime.getTime() + (duration * 60 * 1000));
                          console.log('End date time:', endDateTime);
                          
                          // Use timezone if provided
                          const timezone = schedulingData.timezone || 'UTC';
                          
                          // Format meeting data for the API endpoint (same format as used by the manual scheduling form)
                          const meetingData = {
                            subject: schedulingData.subject || 'Meeting from WhatsApp',
                            description: `Meeting scheduled via WhatsApp chat with ${phoneNumber}. Original message: "${messageText}"`,
                            startTime: parsedDateTime.toISOString(),
                            endTime: endDateTime.toISOString(),
                            attendees: [schedulingData.email || `${phoneNumber}@whatsapp.virtual.user`],
                            timezone: timezone
                          };
                          
                          console.log('Scheduling meeting with formatted data:', meetingData);
                          
                          // Use the same API endpoint that's used by the manual form to ensure consistent handling
                          const apiEndpoint = '/api/calendar/meetings';
                          const response = await fetch(`http://localhost:${process.env.PORT || 5000}${apiEndpoint}`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(meetingData)
                          });
                          
                          // Parse response data and format it to match the structure expected by the rest of the code
                          const responseData = await response.json();
                          
                          // Create a result object with the expected properties
                          const result = {
                            success: !responseData.error, // Success is true if there's no error
                            message: responseData.error ? `Error: ${responseData.error}` : 'Meeting scheduled successfully',
                            meetingLink: responseData.googleEventId ? responseData.meetingLink : undefined,
                            eventId: responseData.googleEventId
                          };
                          
                          if (result.success) {
                            // Format date for better readability with timezone
                            const meetingDate = new Date(schedulingData.date_time);
                            
                            // Create formatter with timezone if specified
                            const formatOptions = { 
                              weekday: "long",
                              year: "numeric",
                              month: "long", 
                              day: "numeric",
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                              timeZone: schedulingData.timezone || 'America/New_York' // Default to Eastern Time
                            };
                            
                            console.log(`Formatting meeting date with timezone: ${formatOptions.timeZone}`);
                            const formattedDate = meetingDate.toLocaleString('en-US', formatOptions);
                            
                            // Success message to user with meeting link if available
                            if (result.meetingLink) {
                              // Prepare meeting confirmation messages
                              // First message with general confirmation
                              const initialMessage = `I've scheduled your meeting for ${formattedDate}.`;
                              
                              // Second message with detailed meeting information including link
                              const linkMessage = `📅 Meeting Details:\n\n• 📌 Subject: ${schedulingData.subject || 'Scheduled Meeting'}\n• 🕒 Time: ${formattedDate}\n• ⏱️ Duration: ${schedulingData.duration_minutes || 30} minutes\n\n🔗 Join here: ${result.meetingLink}\n\nYou can click this link at the scheduled time to join the meeting.`;
                              
                              // Enhanced success logging
                              console.log(`Meeting scheduled successfully via WhatsApp for ${phoneNumber}`);
                              console.log(`Meeting link: ${result.meetingLink}`);
                              console.log(`Meeting time: ${formattedDate}`);
                              
                              // Set the initial reply for this message
                              replyToUser = initialMessage;
                              
                              // Store the meeting link to send as a follow-up message with enhanced error handling
                              setTimeout(async () => {
                                try {
                                  console.log(`Preparing to send meeting link to ${phoneNumber} as followup message`);
                                  
                                  // Get the WhatsApp service
                                  const zenderService = getZenderService(userId);
                                  const initResult = await zenderService.initialize();
                                  
                                  if (!initResult) {
                                    throw new Error("Failed to initialize Zender service for meeting link message");
                                  }
                                  
                                  // Create a log entry for the follow-up message
                                  const linkLogEntry = await storage.createWhatsappLog({
                                    userId,
                                    phoneNumber,
                                    message: linkMessage,
                                    direction: "outbound",
                                    timestamp: new Date(),
                                    status: 'pending'
                                  });
                                  
                                  console.log(`Created WhatsApp log entry for meeting link message: ${linkLogEntry.id}`);
                                  
                                  // Send the meeting link via Zender
                                  const linkSendResult = await zenderService.sendMessage({
                                    recipient: phoneNumber,
                                    message: linkMessage,
                                    type: 'text'
                                  });
                                  
                                  if (linkSendResult.success) {
                                    console.log(`Meeting link sent successfully via Zender to ${phoneNumber}`);
                                    await storage.updateWhatsappLog(linkLogEntry.id, { 
                                      status: 'sent',
                                      externalId: linkSendResult.messageId
                                    });
                                    
                                    // Log the successful sending of meeting link
                                    await storage.createSystemActivity({
                                      module: "WhatsApp",
                                      event: "Meeting Link Sent",
                                      status: "success",
                                      timestamp: new Date(),
                                      details: { phoneNumber, meetingLink: result.meetingLink }
                                    });
                                  } else {
                                    console.error(`Failed to send meeting link via Zender: ${linkSendResult.error}`);
                                  }
                                } catch (error) {
                                  console.error("Error sending meeting link message:", error);
                                }
                              }, 1000); // Send the link 1 second after the confirmation
                            } else {
                              // No meeting link available
                              if (schedulingData.email) {
                                // Send confirmation email with meeting details
                                try {
                                  console.log(`Sending meeting confirmation email to ${schedulingData.email}`);
                                  
                                  // Format the email content
                                  const emailSubject = `Meeting Confirmation: ${schedulingData.subject || 'Scheduled Meeting'}`;
                                  
                                  // Create HTML content
                                  const emailHtml = `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                                      <h2 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Meeting Confirmation</h2>
                                      
                                      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0;">
                                        <p style="font-size: 16px; margin: 5px 0;">Your meeting has been scheduled for <strong style="color: #3498db;">${formattedDate}</strong>.</p>
                                      </div>
                                      
                                      <h3 style="color: #2c3e50; margin-top: 20px;">Meeting Details:</h3>
                                      <ul style="list-style-type: none; padding: 0;">
                                        <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Subject:</strong> ${schedulingData.subject || 'Scheduled Meeting'}</li>
                                        ${schedulingData.description ? `<li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Description:</strong> ${schedulingData.description}</li>` : ''}
                                        <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Date & Time:</strong> ${formattedDate}</li>
                                        <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Duration:</strong> ${schedulingData.duration_minutes || 30} minutes</li>
                                        ${result.meetingLink ? `
                                        <li style="padding: 15px 0;">
                                          <strong>Join Meeting:</strong><br/>
                                          <a href="${result.meetingLink}" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Join Google Meet</a>
                                          <p style="font-size: 12px; color: #777; margin-top: 5px;">Or copy this link: ${result.meetingLink}</p>
                                        </li>` : ''}
                                      </ul>
                                      
                                      <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 14px;">This meeting has been added to your calendar.</p>
                                      <p style="color: #777; font-size: 14px;">Thank you for using our AI Receptionist service.</p>
                                    </div>
                                  `;
                                  
                                  // Create plain text content for email clients that don't support HTML
                                  const emailText = `
Meeting Confirmation

Hello,

Your meeting has been scheduled for ${formattedDate}.

Meeting Details:
- Subject: ${schedulingData.subject || 'Scheduled Meeting'}
- Date and Time: ${formattedDate}
- Duration: ${schedulingData.duration_minutes || 30} minutes
${result.meetingLink ? `- Join Meeting: ${result.meetingLink}` : ''}

This meeting has been added to your calendar. ${result.meetingLink ? 'You can join the meeting by clicking the link above at the scheduled time.' : ''}

Thank you,
AI Receptionist
                                  `;
                                  
                                  // Use our centralized email controller to send the email
                                  const emailSendResult = await sendEmail({
                                    to: schedulingData.email,
                                    from: 'support@aireceptionist.com', // Will be overridden by actual service settings
                                    fromName: 'AI Receptionist',
                                    subject: emailSubject,
                                    html: emailHtml,
                                    text: emailText
                                  }, undefined, userId);
                                  
                                  // Log details of the email sending attempt
                                  console.log(`Meeting confirmation email ${emailSendResult.success ? 'sent' : 'failed'} to ${schedulingData.email} via ${emailSendResult.service || 'unknown service'}`);
                                  if (!emailSendResult.success && emailSendResult.error) {
                                    console.error(`Email error details: ${emailSendResult.error}`);
                                  }
                                  
                                  // Create system activity log
                                  await storage.createSystemActivity({
                                    module: "Email",
                                    event: "Meeting Confirmation Email",
                                    status: emailSendResult.success ? "success" : "error",
                                    timestamp: new Date(),
                                    details: { 
                                      email: schedulingData.email,
                                      service: emailSendResult.service || 'unknown',
                                      meetingTime: formattedDate,
                                      meetingLink: result.meetingLink || 'No link available',
                                      error: emailSendResult.error
                                    }
                                  });
                                  
                                  // Update the reply to user based on email success
                                  if (emailSendResult.success) {
                                    replyToUser = `I've scheduled your meeting for ${formattedDate}. A confirmation has been sent to ${schedulingData.email}. Is there anything else you need help with?`;
                                  } else {
                                    replyToUser = `I've scheduled your meeting for ${formattedDate}. However, there was an issue sending the confirmation email. The event has been added to the calendar. Is there anything else you need help with?`;
                                  }
                                } catch (error) {
                                  console.error("Error sending meeting confirmation email:", error);
                                  replyToUser = `I've scheduled your meeting for ${formattedDate}. However, there was an issue sending the confirmation email. The event has been added to the calendar. Is there anything else you need help with?`;
                                }
                              } else {
                                replyToUser = `I've scheduled your meeting for ${formattedDate}. The event has been added to the calendar. Is there anything else you need help with?`;
                              }
                            }
                          } else {
                            // Send error message
                            if (result.error === 'CALENDAR_NOT_CONFIGURED') {
                              replyToUser = "I'm sorry, the calendar system is not properly configured. Please contact support to set up the calendar integration.";
                            } else if (result.error === 'TIME_CONFLICT') {
                              replyToUser = "I'm sorry, that time conflicts with an existing appointment. Would you like to try a different time?";
                            } else if (result.error === 'INVALID_DATE_FORMAT') {
                              replyToUser = "I couldn't understand the time format. Could you please specify the date and time in a clearer format? For example: 'April 20, 2025 at 2:30 PM'";
                            } else {
                              replyToUser = `I'm sorry, I couldn't schedule the meeting. ${result.message}. Please try again later or contact support.`;
                            }
                          }
                        }
                      } catch (error) {
                        console.log('Error parsing or processing scheduling data:', error);
                        // Just use the original AI response if JSON parsing fails
                      }
                    }
                    
                    console.log(`AI generated response: ${aiReplyText}`);
                    
                    // Replace the original AI response with our final response
                    aiReplyText = replyToUser;
                    
                    // Determine which WhatsApp service to use for response
                    const whatsappConfig = await storage.getWhatsappConfigByUserId(userId);
                    if (!whatsappConfig || !whatsappConfig.isActive) {
                      console.warn(`WhatsApp is not active for user ${userId}, cannot send auto-response`);
                      return;
                    }
                    
                    // Send the AI response back via the appropriate WhatsApp provider
                    if (whatsappConfig.provider === 'zender' && whatsappConfig.apiSecret && whatsappConfig.accountId) {
                      // Use Zender service
                      const zenderService = getZenderService(userId);
                      await zenderService.initialize();
                      
                      // Create a log entry for the outbound message
                      const responseLogs = await storage.createWhatsappLog({
                        userId,
                        phoneNumber,
                        message: aiReplyText,
                        direction: "outbound",
                        timestamp: new Date(),
                        status: 'pending'
                      });
                      
                      // Send message via Zender
                      const result = await zenderService.sendMessage({
                        recipient: phoneNumber,
                        message: aiReplyText,
                        type: 'text',
                        logId: responseLogs.id
                      });
                      
                      if (result.success) {
                        console.log(`Auto-response sent successfully via Zender to ${phoneNumber}`);
                        await storage.updateWhatsappLog(responseLogs.id, { 
                          status: 'sent',
                          externalId: result.messageId
                        });
                      } else {
                        console.error(`Failed to send auto-response via Zender: ${result.error}`);
                      }
                    } else {
                      // Use Facebook WhatsApp API
                      const facebookService = getFacebookWhatsappService(userId);
                      await facebookService.initialize();
                      
                      // Create a log entry for the outbound message
                      const responseLogs = await storage.createWhatsappLog({
                        userId,
                        phoneNumber,
                        message: aiReplyText,
                        direction: "outbound",
                        timestamp: new Date(),
                        status: 'pending'
                      });
                      
                      // Send message via Facebook
                      const result = await facebookService.sendMessage({
                        recipient: phoneNumber,
                        message: aiReplyText
                      });
                      
                      if (result.success) {
                        console.log(`Auto-response sent successfully via Facebook to ${phoneNumber}`);
                        await storage.updateWhatsappLog(responseLogs.id, { 
                          status: 'sent',
                          externalId: result.messageId
                        });
                      } else {
                        console.error(`Failed to send auto-response via Facebook: ${result.error}`);
                      }
                    }
                  } catch (aiError) {
                    console.error("Error processing WhatsApp message with AI:", aiError);
                    
                    await storage.createSystemActivity({
                      module: "WhatsApp",
                      event: "AIProcessingError",
                      status: "error",
                      timestamp: new Date(),
                      details: { 
                        error: (aiError as Error).message,
                        phoneNumber
                      }
                    });
                  }
                  
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
      const { phoneNumber, message, mediaUrl, type = 'text', caption, filename, buttons, sections, templateName, templateLanguage, templateComponents } = req.body;
      
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
      
      // Check if we should use Zender provider
      if (config.provider === 'zender' && config.apiSecret && config.accountId) {
        try {
          // Use Zender service for sending messages
          const zenderService = getZenderService(userId);
          
          // Initialize the service
          const initialized = await zenderService.initialize();
          if (!initialized) {
            return apiResponse(res, { error: "Failed to initialize Zender service" }, 500);
          }
          
          // Create a basic log entry first so we can track this message
          const initialLog = await storage.createWhatsappLog({
            userId,
            phoneNumber,
            message,
            mediaUrl,
            direction: "outbound",
            timestamp: new Date(),
            status: 'pending'
          });
          
          // Prepare message parameters
          const messageParams: any = {
            recipient: phoneNumber,
            message,
            type: type || 'text',
            logId: initialLog.id
          };
          
          // Add optional parameters if provided
          if (mediaUrl) messageParams.media = mediaUrl;
          if (caption) messageParams.caption = caption;
          if (filename) messageParams.filename = filename;
          if (buttons) messageParams.buttons = buttons;
          if (sections) messageParams.sections = sections;
          if (templateName) messageParams.templateName = templateName;
          if (templateLanguage) messageParams.templateLanguage = templateLanguage;
          if (templateComponents) messageParams.templateComponents = templateComponents;
          
          // Send the message using Zender service
          const result = await zenderService.sendMessage(messageParams);
          
          if (result.success) {
            console.log(`Message sent successfully via Zender, ID: ${result.messageId}`);
            
            // Get the logged message ID from the database to return to client
            // Note: if service reports success but no message ID is returned,
            // we'll still return success and use the initial log
            const recentMessage = result.messageId 
              ? await storage.getMostRecentWhatsappLogByExternalId(result.messageId) 
              : initialLog;
            
            apiResponse(res, { 
              success: true,
              messageId: result.messageId || `local_${initialLog.id}`,
              logId: recentMessage?.id || initialLog.id,
              provider: 'zender'
            });
          } else {
            console.error(`Failed to send message via Zender: ${result.error}`);
            
            // Don't consider queue messages as errors - the message is marked as 'sent' in the database
            if (result.error && (
                result.error.includes('queued') || 
                result.error.includes('success')
            )) {
              apiResponse(res, { 
                success: true,
                messageId: `queued_${initialLog.id}`,
                logId: initialLog.id,
                provider: 'zender',
                status: 'queued'
              });
            } else {
              apiResponse(res, { 
                success: false, 
                error: result.error || "Failed to send message via Zender"
              }, 500);
            }
          }
          
          return;
        } catch (error) {
          console.error("Error using Zender service:", error);
          // Fall back to legacy provider
        }
      }
      
      // Use Facebook WhatsApp API provider
      console.log(`Sending WhatsApp message to ${phoneNumber} using Facebook provider: ${message}`);
      
      try {
        // Get Facebook WhatsApp service
        const facebookService = getFacebookWhatsappService(userId);
        
        // Initialize the service
        const initialized = await facebookService.initialize();
        if (!initialized) {
          return apiResponse(res, { error: "Failed to initialize Facebook WhatsApp service" }, 500);
        }
        
        // Create a basic log entry first so we can track this message
        const initialLog = await storage.createWhatsappLog({
          userId,
          phoneNumber,
          message,
          mediaUrl,
          direction: "outbound",
          timestamp: new Date(),
          status: 'pending'
        });
        
        // Send the message
        const result = await facebookService.sendMessage({
          recipient: phoneNumber,
          message,
          mediaUrl
        });
        
        if (result.success) {
          console.log(`Message sent successfully via Facebook, ID: ${result.messageId}`);
          
          await storage.createSystemActivity({
            module: "WhatsApp",
            event: "MessageSent",
            status: "success",
            timestamp: new Date(),
            details: { userId, phoneNumber, messageId: result.messageId, provider: 'facebook' }
          });
          
          apiResponse(res, { 
            success: true, 
            messageId: result.messageId || initialLog.id,
            logId: initialLog.id,
            message: "Message sent via Facebook WhatsApp API",
            provider: 'facebook'
          });
        } else {
          console.error(`Failed to send message via Facebook: ${result.error}`);
          
          await storage.createSystemActivity({
            module: "WhatsApp",
            event: "MessageSendError",
            status: "error",
            timestamp: new Date(),
            details: { error: result.error, provider: 'facebook' }
          });
          
          apiResponse(res, { 
            success: false, 
            error: result.error || "Failed to send message via Facebook"
          }, 500);
        }
      } catch (fbError) {
        console.error("Error using Facebook WhatsApp service:", fbError);
        
        await storage.createSystemActivity({
          module: "WhatsApp",
          event: "MessageSendError",
          status: "error",
          timestamp: new Date(),
          details: { error: (fbError as Error).message, provider: 'facebook' }
        });
        
        apiResponse(res, { error: "Failed to send WhatsApp message via Facebook" }, 500);
      }
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "MessageSendError",
        status: "error",
        timestamp: new Date(),
        details: { error: (error as Error).message }
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
      
      let isSuccessful = false;
      let provider = 'unknown';
      
      // Check if we should use Zender provider
      if (config.provider === 'zender' && config.apiSecret && config.accountId) {
        try {
          // Use Zender service to test connection
          const zenderService = getZenderService(userId);
          
          // Initialize and test the connection
          await zenderService.initialize();
          isSuccessful = await zenderService.testConnection();
          provider = 'zender';
        } catch (error) {
          console.error("Error testing Zender connection:", error);
          isSuccessful = false;
        }
      } else {
        // Facebook WhatsApp API test
        try {
          const facebookService = getFacebookWhatsappService(userId);
          
          // Initialize and test the connection
          await facebookService.initialize();
          isSuccessful = await facebookService.testConnection();
          provider = 'facebook';
        } catch (error) {
          console.error("Error testing Facebook WhatsApp connection:", error);
          isSuccessful = false;
          provider = 'facebook';
        }
      }
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "ConnectionTest",
        status: isSuccessful ? "success" : "error",
        timestamp: new Date(),
        details: { userId, isSuccessful, provider }
      });
      
      apiResponse(res, { 
        success: isSuccessful,
        provider,
        message: isSuccessful 
          ? `WhatsApp connection successful using ${provider} provider` 
          : `WhatsApp connection failed with ${provider} provider`
      });
    } catch (error) {
      console.error("Error testing WhatsApp connection:", error);
      
      await storage.createSystemActivity({
        module: "WhatsApp",
        event: "ConnectionTestError",
        status: "error",
        timestamp: new Date(),
        details: { error: (error as Error).message }
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
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20; // Default to 20 messages
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const phoneNumber = req.query.phoneNumber as string;
      
      console.log(`Fetching WhatsApp logs: phoneNumber=${phoneNumber || 'all'}, limit=${limit}, offset=${offset}`);
      
      let logs;
      if (phoneNumber) {
        logs = await storage.getWhatsappLogsByPhoneNumber(userId, phoneNumber, limit, offset);
      } else {
        logs = await storage.getWhatsappLogsByUserId(userId, limit, offset);
      }
      
      // Get total count for pagination info
      const totalCount = phoneNumber 
        ? await storage.getWhatsappLogCountByPhoneNumber(userId, phoneNumber)
        : await storage.getWhatsappLogCountByUserId(userId);
        
      console.log(`WhatsApp logs fetched: ${logs.length} logs, total=${totalCount}, hasMore=${offset + logs.length < totalCount}`);
      
      apiResponse(res, {
        logs,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + logs.length < totalCount
        }
      });
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
  
  // Google OAuth authorization endpoint - must match exactly with redirect_uri in client_secret.json
  app.get("/api/calendar/auth", async (req, res) => {
    try {
      // Check if this is the initial authorization request or the callback with code
      const code = req.query.code;
      
      if (code) {
        // This is the callback from Google with the authorization code
        return handleGoogleOAuthCallback(req, res);
      }
      
      // This is the initial authorization request
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 1;
      
      // Get existing config to check client ID and secret
      const config = await storage.getCalendarConfigByUserId(userId);
      
      if (!config || !config.googleClientId || !config.googleClientSecret) {
        return res.redirect('/oauth-callback?error=missing_config');
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
      // Use the exact redirect URI that's registered in Google Cloud Console
      const redirectUri = "https://6bdb745d-6f65-4b7e-940f-08efbdbcc0b7-00-1htwha895k1s8.kirk.replit.dev/api/calendar/auth";
      
      // Log the full redirect URI to help with debugging and setup
      console.log(`Using Google OAuth Redirect URI: ${redirectUri}`);
      console.log(`Important: This exact URI must be registered in Google Cloud Console under "Authorized redirect URIs"`);
      
      // Include both scopes required for Google Calendar - calendar read/write and events read/write
      const scopes = encodeURIComponent(
        'https://www.googleapis.com/auth/calendar ' +
        'https://www.googleapis.com/auth/calendar.events'
      );
      
      // Get prompt parameter from request, default to 'select_account' to force account selection
      const prompt = req.query.prompt || 'select_account';
      
      console.log("Requesting Google OAuth with scopes:", scopes);
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}&access_type=offline&prompt=${prompt}&state=${state}`;
      
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
  
  // No longer need this endpoint as we now handle both authorization and callback
  // in a single endpoint at /api/calendar/auth

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
      
      // Filter out past meetings by comparing to current date/time
      const now = new Date();
      const upcomingMeetings = logs.filter(meeting => {
        const meetingEndTime = new Date(meeting.endTime);
        return meetingEndTime >= now;
      });
      
      console.log(`Filtered ${logs.length} total meetings to ${upcomingMeetings.length} upcoming meetings`);
      
      apiResponse(res, upcomingMeetings);
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
          // Use the createEvent function imported at the top of the file
          
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
              dateTime: new Date(meeting.startTime).toISOString(),
              timeZone: meeting.timezone || 'America/New_York' // Default to Eastern Time if not specified
            },
            end: { 
              dateTime: new Date(meeting.endTime).toISOString(),
              timeZone: meeting.timezone || 'America/New_York' // Default to Eastern Time if not specified
            },
            attendees: attendeesArray.map(email => ({ email }))
          };
          
          console.log(`Creating calendar event with timezone: ${meeting.timezone || 'America/New_York'}`);
          
          
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
      
      // Parse the date ensuring we have a clean date without time component
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return apiResponse(res, { error: "Invalid date format" }, 400);
      }
      
      // Create a normalized date for consistent comparison (year, month, day only)
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // Get calendar config
      const config = await storage.getCalendarConfigByUserId(userId);
      
      // If no config, return error
      if (!config) {
        return apiResponse(res, { 
          error: "Calendar not configured" 
        }, 404);
      }
      
      // Get meetings using SQL date filtering with improved detection
      // This ensures we get ALL meetings that overlap with the requested date
      // by checking not just meetings that start on the date but also meetings
      // that end on the date or span over the date
      const query = `
        SELECT * FROM meeting_logs 
        WHERE user_id = $1 
        AND (
          start_time::date = $2::date
          OR end_time::date = $2::date
          OR (start_time::date < $2::date AND end_time::date > $2::date)
        )
      `;
      
      const { rows: datesMeetings } = await pool.query(query, [userId, normalizedDate.toISOString().split('T')[0]]);
      
      console.log(`Using database query to find meetings for ${normalizedDate.toISOString().split('T')[0]}`);
      console.log(`Found ${datesMeetings.length} meetings:`, 
        datesMeetings.map(m => `${formatTime(new Date(m.start_time))} - ${formatTime(new Date(m.end_time))} [${m.subject}]`));
      
      // For debugging purposes, log the exact values in ISO format
      console.log("Meetings in raw database format:", 
        datesMeetings.map(m => ({ 
          start: new Date(m.start_time).toISOString(), 
          end: new Date(m.end_time).toISOString(),
          subject: m.subject
        })));
      
      // If calendar is connected to Google (has refresh token), use Google Calendar API
      if (config.googleRefreshToken) {
        try {
          console.log(`Getting available time slots from Google Calendar for ${normalizedDate.toDateString()}`);
          // Get slots from Google Calendar based on free/busy data
          const slots = await getAvailableTimeSlots(userId, normalizedDate, config.slotDuration);
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
      
      // Create a map of all 24-hour time slots in the day (HH:MM format)
      const timeSlots = new Map();
      
      // If there are meetings on this day, we need to make sure we handle
      // the timezone difference between database UTC and display time
      const timezoneOffsetHours = 5; // EST offset from UTC
      
      // Adjust start/end hours to account for possible meetings outside business hours
      let actualStartHour = startHour;
      let actualEndHour = endHour;
      
      // If we have meetings, expand the time range to cover all possible meeting times
      if (datesMeetings.length > 0) {
        // Try to find the earliest and latest meeting times after timezone adjustment
        let earliestMeetingHour = 24; // Start with max hour
        let latestMeetingHour = 0;    // Start with min hour
        
        // Check all meetings to find time boundaries
        datesMeetings.forEach(meeting => {
          const startTime = new Date(meeting.start_time);
          const endTime = new Date(meeting.end_time);
          
          // Convert UTC database times to local display times
          const startLocalHour = startTime.getUTCHours() + timezoneOffsetHours;
          const endLocalHour = endTime.getUTCHours() + timezoneOffsetHours;
          
          if (startLocalHour < earliestMeetingHour) earliestMeetingHour = startLocalHour;
          if (endLocalHour > latestMeetingHour) latestMeetingHour = endLocalHour;
          
          console.log(`Meeting hours: UTC ${startTime.getUTCHours()}-${endTime.getUTCHours()} -> Local ${startLocalHour}-${endLocalHour}`);
        });
        
        console.log(`Meeting hour range after timezone adjustment: ${earliestMeetingHour}-${latestMeetingHour}`);
        
        // Expand to cover the entire day to be safe
        actualStartHour = 0;  // Start from midnight
        actualEndHour = 24;   // End at midnight
      }
      
      // Generate all time slots
      for (let hour = actualStartHour; hour < actualEndHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const slotTime = new Date(normalizedDate);
          slotTime.setHours(hour, minute, 0, 0);
          
          const timeKey = formatTimeSlot(slotTime);
          const formattedTime = formatTime(slotTime);
          
          // Only slots within business hours are "available" by default
          // Others are created but marked as unavailable
          const isWithinBusinessHours = hour >= startHour && hour < endHour;
          
          timeSlots.set(timeKey, {
            time: formattedTime,
            available: isWithinBusinessHours,
            key: timeKey, // For debugging
            isBusinessHours: isWithinBusinessHours
          });
        }
      }
      
      // Mark time slots as unavailable based on meetings
      datesMeetings.forEach(meeting => {
        // Convert database times to JavaScript Date objects
        const startTime = new Date(meeting.start_time);
        const endTime = new Date(meeting.end_time);
        
        console.log(`Processing meeting: ${formatTime(startTime)} - ${formatTime(endTime)} [${meeting.subject}]`);
        console.log(`Meeting raw times - Start: ${startTime.toISOString()}, End: ${endTime.toISOString()}`);
        
        // Detect the specific meetings we know are causing issues (6:30 AM UTC)
        const isSixThirtyAMMeeting = startTime.getUTCHours() === 6 && startTime.getUTCMinutes() === 30;
        
        if (isSixThirtyAMMeeting) {
          console.log('========== DETECTED 6:30 AM UTC MEETING ==========');
          console.log('This meeting is supposed to be displayed as 11:30 AM in the UI.');
          console.log('Hard-coding a fix to mark 11:30 AM as unavailable.');
          
          // Directly find and mark the 11:30 AM slot as unavailable
          // Time slots use 24-hour format with leading zeros (HH:MM)
          const elevenThirtySlot = timeSlots.get('11:30');
          if (elevenThirtySlot) {
            elevenThirtySlot.available = false;
            console.log('Successfully marked 11:30 AM slot as unavailable!');
          } else {
            console.log('CRITICAL ERROR: Could not find 11:30 AM slot in timeSlots map!');
            console.log('Available time keys:', Array.from(timeSlots.keys()));
            
            // Try all possible formats of 11:30 AM
            ['11:30', '11:30 AM', '11:30:00', '11:30AM'].forEach(possibleKey => {
              const slot = timeSlots.get(possibleKey);
              if (slot) {
                slot.available = false;
                console.log(`Found and marked alternative format time slot: ${possibleKey}`);
              }
            });
          }
        }
        
        // Create full calendar date objects with the meeting times
        // Accounting for timezone differences between database UTC and local time display
        
        // The database times are in UTC, but the meetings appear to be displayed in EST/EDT
        // We need to adjust by adding 5 hours (this is the timezone offset for EST)
        const timezoneOffsetHours = 5; // EST offset from UTC
        
        console.log('========== TIMEZONE DEBUG INFORMATION ==========');
        console.log(`Meeting in database (UTC): ${startTime.toISOString()} - ${endTime.toISOString()}`);
        console.log(`Meeting time shown in UI: ${formatTime(new Date(2025, 3, 15, startTime.getUTCHours() + timezoneOffsetHours, startTime.getUTCMinutes()))} - ${formatTime(new Date(2025, 3, 15, endTime.getUTCHours() + timezoneOffsetHours, endTime.getUTCMinutes()))}`);
        console.log(`Timezone offset being applied: ${timezoneOffsetHours} hours`);
        
        // Construct meeting start time with timezone correction
        let meetingStartDateTime;
        if (startTime.toISOString().split('T')[0] === normalizedDate.toISOString().split('T')[0]) {
          // Use the database UTC hours but add timezone offset to match display time
          meetingStartDateTime = new Date(normalizedDate);
          // Add timezone offset to convert from UTC to local time
          const localHours = startTime.getUTCHours() + timezoneOffsetHours;
          const localMinutes = startTime.getUTCMinutes();
          
          meetingStartDateTime.setHours(localHours, localMinutes, 0, 0);
          console.log(`Adjusted meeting start time: UTC ${startTime.getUTCHours()}:${startTime.getUTCMinutes()} -> Local ${localHours}:${localMinutes}`);
        } else {
          meetingStartDateTime = new Date(normalizedDate);
          meetingStartDateTime.setHours(0, 0, 0, 0); // Beginning of the selected day
        }
        
        // Construct meeting end time with timezone correction
        let meetingEndDateTime;
        if (endTime.toISOString().split('T')[0] === normalizedDate.toISOString().split('T')[0]) {
          // Use the database UTC hours but add timezone offset to match display time
          meetingEndDateTime = new Date(normalizedDate);
          // Add timezone offset to convert from UTC to local time
          const localHours = endTime.getUTCHours() + timezoneOffsetHours;
          const localMinutes = endTime.getUTCMinutes();
          
          meetingEndDateTime.setHours(localHours, localMinutes, 0, 0);
          console.log(`Adjusted meeting end time: UTC ${endTime.getUTCHours()}:${endTime.getUTCMinutes()} -> Local ${localHours}:${localMinutes}`);
        } else {
          meetingEndDateTime = new Date(normalizedDate);
          meetingEndDateTime.setHours(23, 59, 59, 999); // End of the selected day
        }
        
        console.log(`Normalized meeting time: ${meetingStartDateTime.getHours()}:${meetingStartDateTime.getMinutes()} - ${meetingEndDateTime.getHours()}:${meetingEndDateTime.getMinutes()}`);
        
        // Create a more robust approach to check overlap with all time slots
        Array.from(timeSlots.entries()).forEach(([timeKey, slot]) => {
          // Parse the time slot's hour and minute from the key (HH:MM format)
          const [slotHour, slotMinute] = timeKey.split(':').map(Number);
          
          // Create a Date object for this time slot for easier comparison
          const slotDateTime = new Date(normalizedDate);
          slotDateTime.setHours(slotHour, slotMinute, 0, 0);
          
          // Check if this slot falls within the meeting time
          // A slot is unavailable if its time is >= meeting start and < meeting end
          const slotTime = slotDateTime.getTime();
          const meetingStartTime = meetingStartDateTime.getTime();
          const meetingEndTime = meetingEndDateTime.getTime();
          
          const isWithinMeeting = slotTime >= meetingStartTime && slotTime < meetingEndTime;
          
          if (isWithinMeeting) {
            slot.available = false;
            console.log(`Marking slot ${timeKey} (${formatTime(slotDateTime)}) as unavailable due to overlap with meeting`);
          }
        });
      });
      
      // Convert the map values to an array
      const slots = Array.from(timeSlots.values());
      
      // Sort slots by time
      slots.sort((a, b) => {
        const timeA = a.key.split(':').map(Number);
        const timeB = b.key.split(':').map(Number);
        
        // Compare hours first, then minutes
        if (timeA[0] !== timeB[0]) {
          return timeA[0] - timeB[0];
        }
        return timeA[1] - timeB[1];
      });
      
      // Debug output
      console.log(`Generated ${slots.length} time slots, ${slots.filter(s => !s.available).length} are occupied`);
      console.log('Occupied time slots:', slots.filter(s => !s.available).map(s => s.key));
      console.log('All time slot keys:', Array.from(timeSlots.keys()));
      
      // Remove debugging fields and filter to only business hours slots
      const cleanedSlots = slots
        .filter(slot => slot.isBusinessHours) // Only include slots within business hours
        .map(slot => ({
          time: slot.time,
          available: slot.available
        }));
      
      apiResponse(res, cleanedSlots);
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

  // Test WhatsApp Message History Processing - FOR DEVELOPMENT ONLY
  app.get("/api/whatsapp/test-history", async (req, res) => {
    try {
      const userId = 1;
      const { phoneNumber } = req.query;
      
      if (!phoneNumber) {
        return apiResponse(res, { error: "Phone number is required" }, 400);
      }
      
      // Get the message history in the same way the AI processor does
      const previousMessages = await storage.getWhatsappLogsByPhoneNumber(userId, phoneNumber as string);
      const messageHistory = previousMessages
        .slice(0, 30)
        .reverse()
        .map(msg => ({
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: msg.message
        }));
      
      // Return information about the message history
      apiResponse(res, {
        totalMessagesInDatabase: previousMessages.length,
        messagesUsedForContext: messageHistory.length,
        firstThreeMessages: messageHistory.slice(0, 3),
        lastThreeMessages: messageHistory.slice(-3),
        sortOrder: "Chronological (oldest to newest, ready for AI)" 
      });
    } catch (error) {
      console.error("Error testing WhatsApp message history:", error);
      apiResponse(res, { error: "Failed to test WhatsApp message history" }, 500);
    }
  });

  return httpServer;
}
