import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { speechToText, speechToTextFromUrl } from "../lib/whisper";
import { textToSpeech, AVAILABLE_VOICES } from "../lib/elevenlabs";
import { User, insertVoiceSettingsSchema, VoiceSettings } from "@shared/schema";
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

// Create directories for audio files
const fallbackDir = path.join(audioDir, 'fallback');
const ttsDir = path.join(audioDir, 'tts');
const samplesDir = path.join(audioDir, 'samples');

// Ensure all directories exist
[fallbackDir, ttsDir, samplesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create placeholder sample files if they don't exist
const sampleVoices = [
  { id: 'emma', text: 'This is Emma, a professional female voice with an American accent.' },
  { id: 'michael', text: 'This is Michael, a professional male voice with an American accent.' },
  { id: 'olivia', text: 'This is Olivia, a friendly female voice with a British accent.' },
  { id: 'james', text: 'This is James, a friendly male voice with a British accent.' },
];

// Create sample files (minimal valid MP3 files for demo)
sampleVoices.forEach(voice => {
  const samplePath = path.join(samplesDir, `${voice.id}.mp3`);
  if (!fs.existsSync(samplePath)) {
    // Create a valid MP3 file that browsers can actually play
    const validMp3 = Buffer.from([
      // MP3 header
      0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // Additional frames to make it valid for browsers
      0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    fs.writeFileSync(samplePath, validMp3);
    console.log(`Created sample voice file: ${samplePath}`);
  }
});

// Audio API endpoint for serving audio files
speechRouter.get('/audio/:audioId', (req, res) => {
  const { audioId } = req.params;
  
  if (!audioId) {
    return res.status(400).json({ success: false, error: 'Audio ID required' });
  }
  
  // Check for any file extension like .mp3 and remove it
  const baseAudioId = audioId.replace(/\.[^/.]+$/, "");
  
  const filepath = path.join(ttsDir, `${baseAudioId}.mp3`);
  
  console.log(`Serving audio file: ${filepath}`);
  
  // Security check to prevent directory traversal
  if (!filepath.startsWith(audioDir)) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  
  if (fs.existsSync(filepath)) {
    // Set proper headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="${baseAudioId}.mp3"`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Stream the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
    
    // Handle errors
    fileStream.on('error', (error) => {
      console.error(`Error streaming audio file: ${error.message}`);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Error streaming audio file' });
      }
    });
  } else {
    console.error(`Audio file not found: ${filepath}`);
    res.status(404).json({ 
      success: false, 
      error: 'Audio file not found',
      requestedPath: filepath,
      audioId: baseAudioId
    });
  }
});

// Legacy audio route for backward compatibility
speechRouter.get('/audio/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  
  // Process the request
  if (!filename) {
    // If only one parameter is provided, it's the filename (not the type)
    const actualFilename = type || '';
    const filepath = path.join(audioDir, actualFilename);
    
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
  } else {
    // Process with type and filename
    let filepath: string;
    const safeType = type || '';
    const safeFilename = filename || '';
    
    switch (safeType) {
      case 'fallback':
        filepath = path.join(fallbackDir, safeFilename);
        break;
      case 'tts':
        filepath = path.join(ttsDir, safeFilename);
        break;
      case 'samples':
        filepath = path.join(samplesDir, safeFilename);
        break;
      default:
        filepath = path.join(audioDir, safeType, safeFilename);
    }
    
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

// Voice Settings Management

// Get voice settings for the current user
speechRouter.get("/voice-settings", withAuth(async (req, res, user) => {
  try {
    const settings = await storage.getVoiceSettingsByUserId(user.id);
    
    if (settings && settings.length > 0) {
      res.json({ success: true, settings });
    } else {
      res.json({ success: true, settings: [] });
    }
  } catch (error: any) {
    console.error("Error fetching voice settings:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}));

// Get a specific voice setting by ID
speechRouter.get("/voice-settings/:id", withAuth(async (req, res, user) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid voice setting ID" });
    }
    
    const setting = await storage.getVoiceSettings(id);
    
    if (!setting) {
      return res.status(404).json({ success: false, error: "Voice setting not found" });
    }
    
    // Check if the setting belongs to the user
    if (setting.userId !== user.id) {
      return res.status(403).json({ success: false, error: "Unauthorized access to voice setting" });
    }
    
    res.json({ success: true, setting });
  } catch (error: any) {
    console.error("Error fetching voice setting:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}));

// Create a new voice setting
speechRouter.post("/voice-settings", withAuth(async (req, res, user) => {
  try {
    // Validate the input
    const validatedData = insertVoiceSettingsSchema.parse({
      ...req.body,
      userId: user.id // Force the user ID to be the current user's ID
    });
    
    // Create the voice setting
    const setting = await storage.createVoiceSettings(validatedData);
    
    // Create system activity log
    await storage.createSystemActivity({
      module: "Speech Engines",
      event: "Voice Setting Created",
      status: "Completed",
      timestamp: new Date(),
      details: {
        voiceId: setting.voiceId,
        displayName: setting.displayName
      }
    });
    
    res.status(201).json({ success: true, setting });
  } catch (error: any) {
    console.error("Error creating voice setting:", error);
    res.status(400).json({ success: false, error: error.message });
  }
}));

// Update a voice setting
speechRouter.put("/voice-settings/:id", withAuth(async (req, res, user) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid voice setting ID" });
    }
    
    // Check if the setting exists and belongs to the user
    const existingSetting = await storage.getVoiceSettings(id);
    
    if (!existingSetting) {
      return res.status(404).json({ success: false, error: "Voice setting not found" });
    }
    
    if (existingSetting.userId !== user.id) {
      return res.status(403).json({ success: false, error: "Unauthorized access to voice setting" });
    }
    
    // Never allow changing the user ID
    const { userId, ...updateData } = req.body;
    
    // Update the setting
    const updatedSetting = await storage.updateVoiceSettings(id, updateData);
    
    // Create system activity log
    if (updatedSetting) {
      await storage.createSystemActivity({
        module: "Speech Engines",
        event: "Voice Setting Updated",
        status: "Completed",
        timestamp: new Date(),
        details: {
          voiceId: updatedSetting.voiceId,
          displayName: updatedSetting.displayName
        }
      });
    }
    
    res.json({ success: true, setting: updatedSetting });
  } catch (error: any) {
    console.error("Error updating voice setting:", error);
    res.status(400).json({ success: false, error: error.message });
  }
}));

// Delete a voice setting
speechRouter.delete("/voice-settings/:id", withAuth(async (req, res, user) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid voice setting ID" });
    }
    
    // Check if the setting exists and belongs to the user
    const existingSetting = await storage.getVoiceSettings(id);
    
    if (!existingSetting) {
      return res.status(404).json({ success: false, error: "Voice setting not found" });
    }
    
    if (existingSetting.userId !== user.id) {
      return res.status(403).json({ success: false, error: "Unauthorized access to voice setting" });
    }
    
    // Delete the setting
    await storage.deleteVoiceSettings(id);
    
    // Create system activity log
    await storage.createSystemActivity({
      module: "Speech Engines",
      event: "Voice Setting Deleted",
      status: "Completed",
      timestamp: new Date(),
      details: {
        voiceId: existingSetting.voiceId,
        displayName: existingSetting.displayName
      }
    });
    
    res.json({ success: true, message: "Voice setting deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting voice setting:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}));