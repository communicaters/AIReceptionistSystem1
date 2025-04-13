import OpenAI from "openai";
import { storage } from "../storage";

// Initialize OpenAI client
export function initOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not available. AI functionality will be limited.");
  } else {
    console.log("OpenAI client initialized");
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Log AI system activity
async function logAiActivity(event: string, status: string, details: any = {}) {
  await storage.createSystemActivity({
    module: "AI Core",
    event,
    status,
    timestamp: new Date(),
    details,
  });
}

/**
 * Chat completion function with automatic error handling and logging
 */
type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function createChatCompletion(
  messages: Array<ChatMessage>,
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    context_id?: string;
  } = {}
) {
  try {
    // Set default options
    const model = options.model || "gpt-4o"; // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const temperature = options.temperature || 0.7;
    const max_tokens = options.max_tokens || 500;

    // Log the request
    await logAiActivity("Chat Completion Request", "started", {
      model,
      messageCount: messages.length,
      context_id: options.context_id,
    });

    // Make the API call
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
    });

    // Log successful completion
    await logAiActivity("Chat Completion Response", "completed", {
      model,
      tokens_used: response.usage?.total_tokens,
      context_id: options.context_id,
    });

    return {
      success: true,
      content: response.choices[0].message.content,
      usage: response.usage,
    };
  } catch (error: any) {
    // Log error
    await logAiActivity("Chat Completion Error", "failed", {
      error: error.message,
      context_id: options.context_id,
    });

    console.error("OpenAI API error:", error);
    return {
      success: false,
      error: error.message,
      content: null,
      usage: null,
    };
  }
}

/**
 * Function to generate text embeddings for semantic search
 */
export async function createEmbeddings(texts: string[]) {
  try {
    if (!texts.length) return { success: false, error: "No texts provided", embeddings: [] };

    // Log the request
    await logAiActivity("Embedding Generation", "started", {
      count: texts.length,
    });

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    // Log successful completion
    await logAiActivity("Embedding Generation", "completed", {
      count: texts.length,
    });

    return {
      success: true,
      embeddings: response.data.map(item => item.embedding),
    };
  } catch (error: any) {
    // Log error
    await logAiActivity("Embedding Generation", "failed", {
      error: error.message,
    });

    console.error("OpenAI API error:", error);
    return {
      success: false,
      error: error.message,
      embeddings: [],
    };
  }
}

/**
 * Function to analyze sentiment of user messages
 */
export async function analyzeSentiment(text: string): Promise<{
  sentiment: string;
  confidence: number;
  success: boolean;
  error?: string;
}> {
  try {
    // Log the request
    await logAiActivity("Sentiment Analysis", "started", {
      textLength: text.length,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content:
            "You are a sentiment analysis expert. Analyze the sentiment of the text and provide a rating from 1 to 5 stars and a confidence score between 0 and 1. Respond with JSON in this format: { 'sentiment': 'positive/negative/neutral', 'confidence': number }",
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    // Parse the result
    const result = JSON.parse(response.choices[0].message.content || "{}");

    // Log successful completion
    await logAiActivity("Sentiment Analysis", "completed", {
      sentiment: result.sentiment,
      confidence: result.confidence,
    });

    return {
      sentiment: result.sentiment || "neutral",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      success: true,
    };
  } catch (error: any) {
    // Log error
    await logAiActivity("Sentiment Analysis", "failed", {
      error: error.message,
    });

    console.error("Sentiment analysis error:", error);
    return {
      sentiment: "neutral",
      confidence: 0,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Function for intent classification
 */
export async function classifyIntent(
  text: string,
  possibleIntents: string[]
): Promise<{
  intent: string;
  confidence: number;
  success: boolean;
  error?: string;
}> {
  try {
    // Log the request
    await logAiActivity("Intent Classification", "started", {
      textLength: text.length,
      intentCount: possibleIntents.length,
    });

    const intentList = possibleIntents.join(", ");
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an intent classification expert. Classify the intent of the text into one of the following categories: ${intentList}. Respond with JSON in this format: { 'intent': string, 'confidence': number }. The confidence should be between 0 and 1.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    // Parse the result
    const result = JSON.parse(response.choices[0].message.content || "{}");

    // Log successful completion
    await logAiActivity("Intent Classification", "completed", {
      intent: result.intent,
      confidence: result.confidence,
    });

    return {
      intent: result.intent || "unknown",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      success: true,
    };
  } catch (error: any) {
    // Log error
    await logAiActivity("Intent Classification", "failed", {
      error: error.message,
    });

    console.error("Intent classification error:", error);
    return {
      intent: "unknown",
      confidence: 0,
      success: false,
      error: error.message,
    };
  }
}

// Export the OpenAI client for direct access if needed
export { openai };