import { Router, Request, Response, NextFunction } from "express";
import { createChatCompletion, analyzeSentiment, classifyIntent, createEmbeddings } from "../lib/openai";
import { storage } from "../storage";
import { db } from "../db";
import { intentMap, trainingData, User } from "@shared/schema";
import { z } from "zod";
import { asc, desc, eq, like } from "drizzle-orm";
import { authenticate, requireAuth } from "../middleware/auth";

// Helper function to handle authenticated routes
function withAuth(handler: (req: Request, res: Response, user: User) => Promise<void>) {
  return async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    
    // At this point, we know req.user exists and is authenticated
    // TypeScript doesn't know this, so we assert it
    const user = req.user as User;
    
    try {
      await handler(req, res, user);
    } catch (error: any) {
      console.error("Error in route handler:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
};

// Schema validation for request bodies
const chatCompletionSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  options: z
    .object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      max_tokens: z.number().positive().optional(),
      context_id: z.string().optional(),
    })
    .optional(),
});

const sentimentAnalysisSchema = z.object({
  text: z.string().min(1),
});

const intentClassificationSchema = z.object({
  text: z.string().min(1),
  possibleIntents: z.array(z.string()).optional(),
});

const embeddingGenerationSchema = z.object({
  texts: z.array(z.string()),
});

const trainingDataSchema = z.object({
  category: z.string(),
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const aiRouter = Router();

// AI chat completion endpoint
aiRouter.post("/chat", async (req, res) => {
  try {
    // Validate request body
    const { messages, options } = chatCompletionSchema.parse(req.body);

    // Check for authenticated user
    const userId = req.user?.id || null;

    // Add user info to the options for logging
    const extendedOptions = {
      ...options,
      context_id: options?.context_id || `user_${userId}_${Date.now()}`,
    };

    // Call OpenAI API
    const result = await createChatCompletion(messages, extendedOptions);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error("Error in chat completion:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Sentiment analysis endpoint
aiRouter.post("/sentiment", async (req, res) => {
  try {
    const { text } = sentimentAnalysisSchema.parse(req.body);
    const result = await analyzeSentiment(text);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error("Error in sentiment analysis:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Intent classification endpoint
aiRouter.post("/intent", async (req, res) => {
  try {
    const { text, possibleIntents } = intentClassificationSchema.parse(req.body);
    
    // If no intents were provided, fetch them from the database for the user
    let intents = possibleIntents;
    if (!intents || intents.length === 0) {
      // Get user ID with fallback to system-wide intents if not authenticated
      const userId = req.user?.id;
      
      const userIntents = userId 
        ? await storage.getIntentsByUserId(userId)
        : [];
        
      // Extract the intent names
      intents = userIntents.map(intent => intent.intent);
      
      // If still no intents, use some defaults
      if (intents.length === 0) {
        intents = [
          "product_inquiry", 
          "pricing_question", 
          "schedule_meeting", 
          "technical_support",
          "complaint",
          "general_question",
          "greeting"
        ];
      }
    }

    const result = await classifyIntent(text, intents);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error("Error in intent classification:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Embedding generation endpoint
aiRouter.post("/embeddings", async (req, res) => {
  try {
    const { texts } = embeddingGenerationSchema.parse(req.body);
    const result = await createEmbeddings(texts);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error("Error in embedding generation:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// CRUD operations for training data

// Create training data entry
aiRouter.post("/training-data", withAuth(async (req, res, user) => {
  try {
    const { category, content, metadata } = trainingDataSchema.parse(req.body);
    
    // Generate embeddings for the content
    const embeddingResult = await createEmbeddings([content]);
    
    if (!embeddingResult.success) {
      return res.status(500).json({ success: false, error: "Failed to generate embeddings" });
    }

    const embedding = embeddingResult.embeddings[0];
    
    // Create the training data entry using the authenticated user
    const trainingDataEntry = await storage.createTrainingData({
      userId: user.id,
      category,
      content,
      embedding,
      metadata: metadata || {},
      createdAt: new Date(),
    });

    res.status(201).json({ success: true, data: trainingDataEntry });
  } catch (error: any) {
    console.error("Error creating training data:", error);
    res.status(400).json({ success: false, error: error.message });
  }
}));

// Get all training data by user
aiRouter.get("/training-data", withAuth(async (req, res, user) => {
  try {
    const category = req.query.category as string | undefined;
    let trainingDataEntries;
    
    if (category) {
      trainingDataEntries = await storage.getTrainingDataByCategory(user.id, category);
    } else {
      trainingDataEntries = await storage.getTrainingDataByUserId(user.id);
    }

    res.json({ success: true, data: trainingDataEntries });
  } catch (error: any) {
    console.error("Error fetching training data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}));

// Get training data by ID
aiRouter.get("/training-data/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    const trainingDataEntry = await storage.getTrainingData(id);

    if (!trainingDataEntry || trainingDataEntry.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Training data not found" });
    }

    res.json({ success: true, data: trainingDataEntry });
  } catch (error: any) {
    console.error("Error fetching training data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update training data
aiRouter.put("/training-data/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    const { category, content, metadata } = trainingDataSchema.parse(req.body);
    
    // Check ownership
    const existingData = await storage.getTrainingData(id);
    if (!existingData || existingData.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Training data not found" });
    }

    // Generate new embeddings if content changed
    let embedding = existingData.embedding;
    if (content !== existingData.content) {
      const embeddingResult = await createEmbeddings([content]);
      
      if (!embeddingResult.success) {
        return res.status(500).json({ success: false, error: "Failed to generate embeddings" });
      }
      
      embedding = embeddingResult.embeddings[0];
    }
    
    // Update the training data
    const updatedData = await storage.updateTrainingData(id, {
      category,
      content,
      embedding,
      metadata: metadata || existingData.metadata,
    });

    res.json({ success: true, data: updatedData });
  } catch (error: any) {
    console.error("Error updating training data:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete training data
aiRouter.delete("/training-data/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    
    // Check ownership
    const existingData = await storage.getTrainingData(id);
    if (!existingData || existingData.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Training data not found" });
    }

    // Delete the training data
    const success = await storage.deleteTrainingData(id);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: "Failed to delete training data" });
    }
  } catch (error: any) {
    console.error("Error deleting training data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// CRUD operations for intent maps

// Create intent
aiRouter.post("/intents", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { intent, examples } = req.body;
    
    if (!intent || !examples || !Array.isArray(examples)) {
      return res.status(400).json({ success: false, error: "Invalid intent data" });
    }

    const intentEntry = await storage.createIntent({
      userId: req.user.id,
      intent,
      examples,
    });

    res.status(201).json({ success: true, data: intentEntry });
  } catch (error: any) {
    console.error("Error creating intent:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get all intents by user
aiRouter.get("/intents", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const intents = await storage.getIntentsByUserId(req.user.id);
    res.json({ success: true, data: intents });
  } catch (error: any) {
    console.error("Error fetching intents:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get intent by ID
aiRouter.get("/intents/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    const intent = await storage.getIntent(id);

    if (!intent || intent.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Intent not found" });
    }

    res.json({ success: true, data: intent });
  } catch (error: any) {
    console.error("Error fetching intent:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update intent
aiRouter.put("/intents/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    const { intent, examples } = req.body;
    
    if (!intent || !examples || !Array.isArray(examples)) {
      return res.status(400).json({ success: false, error: "Invalid intent data" });
    }
    
    // Check ownership
    const existingIntent = await storage.getIntent(id);
    if (!existingIntent || existingIntent.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Intent not found" });
    }

    // Update the intent
    const updatedIntent = await storage.updateIntent(id, {
      intent,
      examples,
    });

    res.json({ success: true, data: updatedIntent });
  } catch (error: any) {
    console.error("Error updating intent:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete intent
aiRouter.delete("/intents/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    
    // Check ownership
    const existingIntent = await storage.getIntent(id);
    if (!existingIntent || existingIntent.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Intent not found" });
    }

    // Delete the intent
    const success = await storage.deleteIntent(id);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: "Failed to delete intent" });
    }
  } catch (error: any) {
    console.error("Error deleting intent:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});