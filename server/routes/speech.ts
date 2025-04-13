import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { speechToText, speechToTextFromUrl } from "../lib/whisper";
import { textToSpeech, AVAILABLE_VOICES } from "../lib/elevenlabs";
import { User } from "@shared/schema";
import { randomUUID } from "crypto";
import * as fs from "fs";

// Helper function to handle authenticated routes
function withAuth(handler: (req: Request, res: Response, user: User) => Promise<any>) {
  return async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    
    const user = req.user as User;
    
    try {
      await handler(req, res, user);
    } catch (error: any) {
      console.error("Error in route handler:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent collisions
    const uniqueId = randomUUID();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp4',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/webm',
      'audio/ogg',
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types: ${allowedMimeTypes.join(', ')}`));
    }
  }
});

// Validation schemas
const transcribeUrlSchema = z.object({
  audioUrl: z.string().url(),
  language: z.string().optional(),
  prompt: z.string().optional(),
});

const textToSpeechSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().optional(),
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
});

// Create router
export const speechRouter = Router();

// Configure audio file serving
const audioDir = path.join(process.cwd(), 'cache', 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Serve audio files from cache
speechRouter.get('/audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(audioDir, filename);
  
  // Security check to prevent directory traversal
  if (!filepath.startsWith(audioDir)) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  
  if (fs.existsSync(filepath)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    fs.createReadStream(filepath).pipe(res);
  } else {
    res.status(404).json({ success: false, error: 'Audio file not found' });
  }
});

// Get available TTS voices
speechRouter.get("/tts/voices", async (req, res) => {
  try {
    res.json({ success: true, voices: AVAILABLE_VOICES });
  } catch (error: any) {
    console.error("Error fetching voices:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Text-to-speech endpoint
speechRouter.post("/tts", withAuth(async (req, res, user) => {
  try {
    const { text, voiceId, stability, similarityBoost } = textToSpeechSchema.parse(req.body);
    
    // Call the text-to-speech service
    const result = await textToSpeech(text, { voiceId, stability, similarityBoost });
    
    if (result.success) {
      res.json({ 
        success: true, 
        audioUrl: result.audioUrl,
        text,
        voiceId: voiceId || AVAILABLE_VOICES[0].id
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate speech" 
      });
    }
  } catch (error: any) {
    console.error("Error in text-to-speech endpoint:", error);
    res.status(400).json({ success: false, error: error.message });
  }
}));

// Speech-to-text from file upload
speechRouter.post("/stt/upload", upload.single('audio'), withAuth(async (req, res, user) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ 
        success: false, 
        error: "No audio file uploaded" 
      });
    }
    
    const language = req.body.language;
    const prompt = req.body.prompt;
    
    // Call the speech-to-text service
    const result = await speechToText({
      path: file.path,
      mimetype: file.mimetype,
      filename: file.originalname,
    }, {
      language,
      prompt,
      removeFileAfterProcessing: true, // Clean up the file after processing
    });
    
    if (result.success) {
      res.json({
        success: true,
        transcript: result.transcript,
        duration: result.duration,
        language: result.language,
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error || "Failed to transcribe audio" 
      });
    }
  } catch (error: any) {
    console.error("Error in speech-to-text upload endpoint:", error);
    
    // Clean up file if it exists
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn(`Failed to delete uploaded file ${req.file.path}`, e);
      }
    }
    
    res.status(400).json({ success: false, error: error.message });
  }
}));

// Speech-to-text from URL
speechRouter.post("/stt/url", withAuth(async (req, res, user) => {
  try {
    const { audioUrl, language, prompt } = transcribeUrlSchema.parse(req.body);
    
    // Call the speech-to-text service
    const result = await speechToTextFromUrl(audioUrl, { language, prompt });
    
    if (result.success) {
      res.json({
        success: true,
        transcript: result.transcript,
        duration: result.duration,
        language: result.language,
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error || "Failed to transcribe audio from URL" 
      });
    }
  } catch (error: any) {
    console.error("Error in speech-to-text URL endpoint:", error);
    res.status(400).json({ success: false, error: error.message });
  }
}));