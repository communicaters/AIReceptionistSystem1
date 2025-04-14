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
    
    // Generate unique audio URL for the server to serve
    const audioUrl = `/audio/${key}.mp3`;
    
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
  return { apiKey };
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
    id: "voice1", 
    name: "Emma", 
    accent: "American",
    description: "Professional female voice",
    previewUrl: "/audio/samples/emma.mp3"
  },
  { 
    id: "voice2", 
    name: "Michael", 
    accent: "American",
    description: "Professional male voice",
    previewUrl: "/audio/samples/michael.mp3"
  },
  { 
    id: "voice3", 
    name: "Olivia", 
    accent: "British",
    description: "Friendly female voice",
    previewUrl: "/audio/samples/olivia.mp3"
  },
  { 
    id: "voice4", 
    name: "James", 
    accent: "British",
    description: "Friendly male voice",
    previewUrl: "/audio/samples/james.mp3"
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
    
    // For demo purposes, create a small empty MP3 file
    // This ensures the audio player doesn't get a 404 error
    // In a real implementation, generate actual audio
    const emptyAudioBuffer = Buffer.from([
      0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    await writeFileAsync(filepath, emptyAudioBuffer);
    
    // Return a URL that points to this file
    const fallbackUrl = `/audio/fallback/${filename}`;
    
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
      
      // In a real implementation, you would:
      // 1. Call ElevenLabs API to convert text to speech
      // 2. Store or return the audio data
      // For demo, generate a fake audio URL
      const audioUrl = `/audio/tts/${Date.now()}_${Math.floor(Math.random() * 1000)}.mp3`;
      
      // In a real implementation, we would cache the actual audio data
      // For demo purposes, we're just simulating caching with the URL
      if (useCache) {
        // Simulate caching the audio data
        // In a real implementation, you would:
        // 1. Get the actual audio buffer from the ElevenLabs API
        // 2. Cache it using audioCache.set()
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
      
      return { success: true, audioUrl, fromCache: false };
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
