import { storage } from '../storage';
import { openai } from './openai';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Convert callback-based functions to promise-based
const unlinkAsync = promisify(fs.unlink);

// Initialize Whisper API (using OpenAI client)
export function initWhisperAPI() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not available. Speech-to-text functionality will be limited.");
    return null;
  }
  
  console.log("Whisper API initialized");
  return true;
}

// Audio transcription using Whisper API
export async function speechToText(
  audioFile: {
    path: string;
    buffer?: Buffer;
    filename?: string;
    mimetype?: string;
  },
  options: {
    language?: string;
    prompt?: string;
    temperature?: number;
    removeFileAfterProcessing?: boolean;
  } = {}
): Promise<{
  success: boolean;
  transcript?: string;
  duration?: number;
  language?: string;
  error?: string;
}> {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not available");
    }

    // Log activity
    await storage.createSystemActivity({
      module: "Speech Engines",
      event: "Speech-to-Text Request",
      status: "Started",
      timestamp: new Date(),
      details: {
        filename: audioFile.filename || 'unknown',
        language: options.language || 'auto',
      }
    });

    // Create a file stream from buffer or read from path
    let fileStream;
    if (audioFile.buffer) {
      // If buffer is provided, use it directly
      fileStream = audioFile.buffer;
    } else if (audioFile.path) {
      // Otherwise read from file path
      fileStream = fs.createReadStream(audioFile.path);
    } else {
      throw new Error("No audio data provided");
    }

    // For the API to work properly, we need to ensure we have a file on disk
    // If we have a buffer but no path, write it to a temporary file
    let filePath = audioFile.path;
    let needsCleanup = false;
    
    if (audioFile.buffer && (!audioFile.path || audioFile.path === 'temp')) {
      // Generate a temporary file path
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFileName = `whisper_${Date.now()}_${Math.floor(Math.random() * 10000)}.mp3`;
      filePath = path.join(tempDir, tempFileName);
      
      // Write the buffer to the file
      fs.writeFileSync(filePath, audioFile.buffer);
      needsCleanup = true;
    }
    
    // Call the Whisper API with a file stream
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: options.language,
      prompt: options.prompt,
      temperature: options.temperature,
    });
    
    // Clean up the temporary file if we created one
    if (needsCleanup) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn(`Failed to delete temporary file ${filePath}:`, error);
      }
    }

    // Delete the file if requested
    if (options.removeFileAfterProcessing && audioFile.path) {
      try {
        await unlinkAsync(audioFile.path);
      } catch (error) {
        console.warn(`Failed to delete audio file ${audioFile.path}:`, error);
      }
    }

    // Parse and estimate audio duration (OpenAI doesn't provide this in the response)
    // A typical English speaker speaks at ~150 words per minute
    const wordCount = transcription.text.split(/\s+/).length;
    const estimatedDuration = wordCount / 150 * 60; // in seconds
    
    // Log successful transcription
    await storage.createSystemActivity({
      module: "Speech Engines",
      event: "Speech-to-Text Completed",
      status: "Completed",
      timestamp: new Date(),
      details: {
        estimatedDuration: Math.round(estimatedDuration),
        language: options.language || 'auto',
        textLength: transcription.text.length,
        wordCount
      }
    });

    return {
      success: true,
      transcript: transcription.text,
      duration: Math.round(estimatedDuration),
      language: options.language || 'auto',
    };
  } catch (error: any) {
    console.error("Error in speech-to-text processing:", error);

    // Log error
    await storage.createSystemActivity({
      module: "Speech Engines",
      event: "Speech-to-Text Failed",
      status: "Error", 
      timestamp: new Date(),
      details: {
        error: error.message,
      }
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

// Audio transcription from URL
export async function speechToTextFromUrl(
  audioUrl: string,
  options: {
    language?: string;
    prompt?: string;
    temperature?: number;
  } = {}
): Promise<{
  success: boolean;
  transcript?: string;
  duration?: number;
  language?: string;
  error?: string;
}> {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not available");
    }

    // Log activity
    await storage.createSystemActivity({
      module: "Speech Engines",
      event: "Speech-to-Text from URL Request",
      status: "Started",
      timestamp: new Date(),
      details: {
        url: audioUrl,
        language: options.language || 'auto',
      }
    });

    // In a production implementation, you would:
    // 1. Download the audio from the URL
    // 2. Convert to a format accepted by Whisper API if needed
    // 3. Call the Whisper API
    
    // For now, we'll implement a basic version that assumes publicly accessible URLs
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio from URL: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Call the speechToText function with the downloaded buffer
    return await speechToText({
      path: 'temp',
      buffer,
      filename: audioUrl.split('/').pop(),
      mimetype: response.headers.get('content-type') || undefined,
    }, options);
  } catch (error: any) {
    console.error("Error in speech-to-text from URL processing:", error);

    // Log error
    await storage.createSystemActivity({
      module: "Speech Engines",
      event: "Speech-to-Text from URL Failed",
      status: "Error",
      timestamp: new Date(),
      details: {
        error: error.message,
        url: audioUrl,
      }
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

// Implement voice activity detection (dummy implementation)
export async function detectVoiceActivity(
  audioBuffer: Buffer
): Promise<{
  success: boolean;
  hasVoice: boolean;
  confidence?: number;
  error?: string;
}> {
  try {
    // In a real implementation, you would:
    // 1. Use a voice activity detection algorithm or API
    // 2. Return the results

    // For demo purposes, return a positive result
    return {
      success: true,
      hasVoice: true,
      confidence: 0.95,
    };
  } catch (error: any) {
    console.error("Error in voice activity detection:", error);
    return {
      success: false,
      hasVoice: false,
      error: error.message,
    };
  }
}

// Function to estimate transcription cost based on audio duration
export function estimateTranscriptionCost(
  durationSeconds: number
): { cost: number; currency: string } {
  // Based on OpenAI Whisper API pricing as of 2024
  // $0.006 per minute (rounded to the nearest second)
  const minutes = durationSeconds / 60;
  const cost = minutes * 0.006;
  
  return {
    cost: Math.round(cost * 1000) / 1000, // Round to 3 decimal places
    currency: "USD",
  };
}