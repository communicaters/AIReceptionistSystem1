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
import { setupWebsocketHandlers } from "./lib/websocket";
import { aiRouter } from "./routes/ai";
import { speechRouter } from "./routes/speech";
import { authenticate } from "./middleware/auth";

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
  
  // Initialize Twilio webhook handling
  setupTwilioWebhooks(app);
  
  // Apply authentication middleware to all routes
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

  app.get("/api/chat/logs", async (req, res) => {
    try {
      const userId = 1; // For demo, use fixed user ID
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const sessionId = req.query.sessionId as string;
      
      let logs;
      if (sessionId) {
        logs = await storage.getChatLogsBySessionId(sessionId);
      } else {
        logs = await storage.getChatLogsByUserId(userId, limit);
      }
      
      apiResponse(res, logs);
    } catch (error) {
      console.error("Error fetching chat logs:", error);
      apiResponse(res, { error: "Failed to fetch chat logs" }, 500);
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
