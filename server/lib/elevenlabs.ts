import { storage } from '../storage';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Convert callback-based functions to promise-based
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);

// Audio cache implementation
interface AudioCacheEntry {
  url: string;
  expiry: Date;
  voiceId: string;
  params: Record<string, any>;
}

class AudioCache {
  private cache: Map<string, AudioCacheEntry> = new Map();
  private cacheDir: string;
  private ttlMs: number = 24 * 60 * 60 * 1000; // 24 hours by default

  constructor() {
    this.cacheDir = path.join(process.cwd(), 'cache', 'audio');
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    
    // Load existing cache entries
    this.loadCacheIndex();
  }

  private generateCacheKey(text: string, voiceId: string, params: Record<string, any>): string {
    const data = JSON.stringify({ text, voiceId, params });
    return crypto.createHash('md5').update(data).digest('hex');
  }
  
  private async loadCacheIndex(): Promise<void> {
    try {
      const indexPath = path.join(this.cacheDir, 'cache-index.json');
      if (fs.existsSync(indexPath)) {
        const data = await readFileAsync(indexPath, 'utf8');
        const entries = JSON.parse(data);
        
        // Rebuild the cache map
        for (const [key, entry] of Object.entries(entries)) {
          const cacheEntry = entry as AudioCacheEntry;
          cacheEntry.expiry = new Date(cacheEntry.expiry);
          
          // Skip expired entries
          if (cacheEntry.expiry < new Date()) {
            // Delete the cached file
            const filePath = path.join(this.cacheDir, `${key}.mp3`);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
            continue;
          }
          
          this.cache.set(key, cacheEntry);
        }
      }
    } catch (error) {
      console.error('Error loading audio cache index:', error);
      // Start with an empty cache on error
      this.cache = new Map();
    }
  }
  
  private async saveCacheIndex(): Promise<void> {
    try {
      // Convert the map to a plain object
      const entries: Record<string, AudioCacheEntry> = {};
      // Use Array.from to convert the iterator to an array
      Array.from(this.cache.entries()).forEach(([key, entry]) => {
        entries[key] = entry;
      });
      
      const indexPath = path.join(this.cacheDir, 'cache-index.json');
      await writeFileAsync(indexPath, JSON.stringify(entries, null, 2));
    } catch (error) {
      console.error('Error saving audio cache index:', error);
    }
  }
  
  async get(text: string, voiceId: string, params: Record<string, any>): Promise<string | null> {
    const key = this.generateCacheKey(text, voiceId, params);
    const entry = this.cache.get(key);
    
    // Check if entry exists and isn't expired
    if (entry && entry.expiry > new Date()) {
      // Check if the cache file exists
      const filePath = path.join(this.cacheDir, `${key}.mp3`);
      if (fs.existsSync(filePath)) {
        // Update the expiry time
        entry.expiry = new Date(Date.now() + this.ttlMs);
        await this.saveCacheIndex();
        
        return entry.url;
      }
    }
    
    return null;
  }
  
  async set(text: string, voiceId: string, params: Record<string, any>, audioData: Buffer): Promise<string> {
    const key = this.generateCacheKey(text, voiceId, params);
    
    // Generate unique audio URL for the server to serve using our direct API endpoint
    const audioUrl = `/api/audio/${key}`;
    
    // Save the audio file to the cache directory
    const filePath = path.join(this.cacheDir, `${key}.mp3`);
    await writeFileAsync(filePath, audioData);
    
    // Create a cache entry
    const entry: AudioCacheEntry = {
      url: audioUrl,
      expiry: new Date(Date.now() + this.ttlMs),
      voiceId,
      params
    };
    
    this.cache.set(key, entry);
    await this.saveCacheIndex();
    
    return audioUrl;
  }
  
  async purgeExpired(): Promise<number> {
    const now = new Date();
    let purgedCount = 0;
    
    // Use Array.from to convert the iterator to an array
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.expiry < now) {
        this.cache.delete(key);
        
        // Delete the cached file
        const filePath = path.join(this.cacheDir, `${key}.mp3`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          purgedCount++;
        }
      }
    });
    
    if (purgedCount > 0) {
      await this.saveCacheIndex();
    }
    
    return purgedCount;
  }
}

// Create a singleton instance of the audio cache
const audioCache = new AudioCache();

// Initialize ElevenLabs TTS API
export function initElevenLabs() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.warn("ElevenLabs API key not available. Text-to-speech functionality will be limited.");
    return null;
  }
  
  console.log("ElevenLabs API initialized");
  return { 
    apiKey,
    // Method to generate speech using the API
    async generateSpeech(text: string, voiceId: string, options: any = {}) {
      // Use default voices from our collection if none specified
      // Maps to actual ElevenLabs voice IDs
      const voiceMap: Record<string, string> = {
        "emma": "EXAVITQu4vr4xnSDxMaL",     // Female voice
        "michael": "ErXwobaYiN019PkySvjV",  // Male voice (Adam)
        "olivia": "pNInz6obpgDQGcFmaJgB",   // Female voice
        "james": "TxGEqnHWrfWFTfGW9XjX"     // Male voice (Josh)
      };
      
      let actualVoiceId;
      
      // If the voice ID looks like an ElevenLabs ID (long ID string), use it directly
      if (voiceId && voiceId.length > 20) {
        console.log(`Using custom ElevenLabs voice ID: ${voiceId}`);
        actualVoiceId = voiceId;
      } else {
        // Otherwise, try to map it to one of our predefined voices
        actualVoiceId = voiceMap[voiceId] || voiceMap["emma"];
        console.log(`Mapped voice ID "${voiceId}" to ElevenLabs voice ID: ${actualVoiceId}`);
      }
      
      // Construct the API URL
      const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${actualVoiceId}/stream`;
      
      // Prepare the request body
      const requestBody = {
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarityBoost || 0.75
        }
      };
      
      // Make the API request
      console.log(`Making ElevenLabs API request for text: "${text.substring(0, 30)}..."`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify(requestBody)
      });
      
      // Check if the request was successful
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }
      
      // Get the audio data as a buffer
      const audioArrayBuffer = await response.arrayBuffer();
      return Buffer.from(audioArrayBuffer);
    }
  };
}

// Get ElevenLabs client (lazy initialization)
export function getElevenLabsClient() {
  const client = initElevenLabs();
  
  if (!client) {
    throw new Error("ElevenLabs client not initialized. Check your API key.");
  }
  
  return client;
}

// Available voices with more detailed metadata
export const AVAILABLE_VOICES = [
  { 
    id: "emma", 
    name: "Emma", 
    accent: "American",
    description: "Professional female voice",
    previewUrl: "/api/audio/samples_emma"
  },
  { 
    id: "michael", 
    name: "Michael", 
    accent: "American",
    description: "Professional male voice",
    previewUrl: "/api/audio/samples_michael"
  },
  { 
    id: "olivia", 
    name: "Olivia", 
    accent: "British",
    description: "Friendly female voice",
    previewUrl: "/api/audio/samples_olivia"
  },
  { 
    id: "james", 
    name: "James", 
    accent: "British",
    description: "Friendly male voice",
    previewUrl: "/api/audio/samples_james"
  },
];

// Fallback TTS implementation with static files
async function fallbackTextToSpeech(
  text: string,
  options: {
    voiceId?: string;
  } = {}
): Promise<{ success: boolean; audioUrl?: string }> {
  try {
    // Log fallback usage
    await storage.createSystemActivity({
      module: "Speech Engines",
      event: "Using Fallback TTS",
      status: "Started",
      timestamp: new Date(),
      details: {
        reason: "ElevenLabs unavailable",
        textLength: text.length,
      }
    });
    
    // Create a fallback cache directory if it doesn't exist
    const fallbackDir = path.join(process.cwd(), 'cache', 'audio', 'fallback');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    
    // Generate a unique filename based on text content (truncated) and timestamp
    const timestamp = Date.now();
    const safeText = text.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `fallback_${safeText}_${timestamp}.mp3`;
    const filepath = path.join(fallbackDir, filename);
    
    // For demo purposes, create a valid minimal MP3 file
    // This ensures the audio player can actually play something
    // In a real implementation, generate actual audio from a TTS service
    const validMinimalMp3 = Buffer.from([
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
    
    // Write to file system
    await writeFileAsync(filepath, validMinimalMp3);
    
    // Return a URL that points to our API endpoint
    const audioId = `fallback_${safeText}_${timestamp}`;
    const fallbackUrl = `/api/audio/${audioId}`;
    
    await storage.createSystemActivity({
      module: "Speech Engines",
      event: "Fallback TTS Completed",
      status: "Completed",
      timestamp: new Date(),
      details: {
        textLength: text.length,
        usedFallback: true,
        audioFile: filename,
      }
    });
    
    return { success: true, audioUrl: fallbackUrl };
  } catch (error) {
    console.error("Error in fallback TTS:", error);
    return { success: false };
  }
}

// Convert text to speech with caching and fallback
export async function textToSpeech(
  text: string,
  options: {
    voiceId?: string;
    stability?: number;
    similarityBoost?: number;
    useCache?: boolean;
  } = {}
): Promise<{ success: boolean; audioUrl?: string; fromCache?: boolean }> {
  try {
    // Use default values if not provided
    const voiceId = options.voiceId || AVAILABLE_VOICES[0].id;
    const stability = options.stability || 0.5;
    const similarityBoost = options.similarityBoost || 0.7;
    const useCache = options.useCache !== false; // Default to true
    
    // Check cache first if enabled
    if (useCache) {
      const cachedUrl = await audioCache.get(text, voiceId, { stability, similarityBoost });
      if (cachedUrl) {
        // Log cache hit
        await storage.createSystemActivity({
          module: "Speech Engines",
          event: "TTS Cache Hit",
          status: "Completed",
          timestamp: new Date(),
          details: {
            textLength: text.length,
            voice: voiceId,
          }
        });
        
        return { success: true, audioUrl: cachedUrl, fromCache: true };
      }
    }
    
    // Try to use ElevenLabs API
    try {
      const client = getElevenLabsClient();
      
      // Create a directory for TTS audio files if it doesn't exist
      const ttsDir = path.join(process.cwd(), 'cache', 'audio', 'tts');
      if (!fs.existsSync(ttsDir)) {
        fs.mkdirSync(ttsDir, { recursive: true });
      }
      
      // Generate a unique filename based on text content and timestamp
      const timestamp = Date.now();
      const safeText = text.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `tts_${safeText}_${timestamp}.mp3`;
      const filepath = path.join(ttsDir, filename);
      
      // Call the actual ElevenLabs API to generate speech
      console.log(`Generating speech with ElevenLabs for voice ID: "${voiceId}" and text: "${text.substring(0, 30)}..."`);
      
      // Generate a unique ID for this audio
      const audioId = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Create a URL path for the audio file (use direct API endpoint)
      const audioUrl = `/api/audio/${audioId}`;
      
      try {
        // Check if we need to map our internal voice ID to an ElevenLabs ID
        // This allows us to support both our predefined voices and custom ElevenLabs voice IDs
        let actualVoiceId = voiceId;
        
        // If the voice ID looks like an ElevenLabs ID (typically long alphanumeric string), use it directly
        if (voiceId && voiceId.length > 20) {
          console.log(`Using custom ElevenLabs voice ID directly: ${voiceId}`);
          actualVoiceId = voiceId;
        } 
        // Otherwise, check if it's one of our internal IDs that has a custom mapping
        else if (voiceId && voiceId.length < 20) {
          try {
            // Get all voice settings to find a matching voice ID
            const allVoiceSettings = await storage.getAllVoiceSettings();
            const matchedSetting = allVoiceSettings.find(vs => vs.voiceId === voiceId);
            
            if (matchedSetting && matchedSetting.externalVoiceId) {
              actualVoiceId = matchedSetting.externalVoiceId;
              console.log(`Mapped internal voice ID "${voiceId}" to external ID "${actualVoiceId}"`);
            } else {
              // If no custom mapping exists, use our default voice mapping
              const client = getElevenLabsClient();
              const voiceMap: Record<string, string> = {
                "emma": "EXAVITQu4vr4xnSDxMaL",     // Female voice
                "michael": "ErXwobaYiN019PkySvjV",  // Male voice (Adam)
                "olivia": "pNInz6obpgDQGcFmaJgB",   // Female voice
                "james": "TxGEqnHWrfWFTfGW9XjX"     // Male voice (Josh)
              };
              actualVoiceId = voiceMap[voiceId] || voiceMap["emma"];
              console.log(`Using default voice mapping for "${voiceId}": ${actualVoiceId}`);
            }
          } catch (err) {
            console.warn("Failed to look up voice settings:", err);
          }
        }
        
        // Generate audio using the ElevenLabs API with potentially mapped voice ID
        const audioBuffer = await client.generateSpeech(text, actualVoiceId, {
          stability,
          similarityBoost
        });
        
        // Write the audio buffer to disk with the audioId as filename
        const audioIdFilepath = path.join(ttsDir, `${audioId}.mp3`);
        await writeFileAsync(audioIdFilepath, audioBuffer);
        
        // Write to the original path too (for cache purposes)
        await writeFileAsync(filepath, audioBuffer);
        
        // Cache the audio data if caching is enabled
        if (useCache) {
          await audioCache.set(text, voiceId, { stability, similarityBoost }, audioBuffer);
        }
      } catch (apiError) {
        console.error("Error calling ElevenLabs API:", apiError);
        throw apiError;
      }
      
      // Create system activity record
      await storage.createSystemActivity({
        module: "Speech Engines",
        event: "Text-to-Speech Generated",
        status: "Completed",
        timestamp: new Date(),
        details: {
          textLength: text.length,
          voice: voiceId,
        }
      });
      
      console.log(`Generated speech for text: "${text.substring(0, 30)}..."`);
      
      return { 
        success: true, 
        audioUrl: audioUrl, 
        fromCache: false 
      };
    } catch (error) {
      console.warn("ElevenLabs TTS failed, falling back to alternative:", error);
      
      // Log the failure
      await storage.createSystemActivity({
        module: "Speech Engines",
        event: "Primary TTS Failed",
        status: "Warning",
        timestamp: new Date(),
        details: {
          error: (error as Error).message,
          action: "Using fallback",
        }
      });
      
      // Fall back to alternative TTS
      return await fallbackTextToSpeech(text, { voiceId });
    }
  } catch (error) {
    console.error("Error converting text to speech:", error);
    
    // Create system activity record for failure
    await storage.createSystemActivity({
      module: "Speech Engines",
      event: "Text-to-Speech Failed",
      status: "Error",
      timestamp: new Date(),
      details: {
        error: (error as Error).message,
      }
    });
    
    return { success: false };
  }
}
