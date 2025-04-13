import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

// Function to initialize OpenAI with API key from environment
export function initOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  
  if (!apiKey) {
    console.warn("OpenAI API key not found. AI functionality will be limited.");
    return null;
  }
  
  return new OpenAI({ apiKey });
}

// Get OpenAI client (lazy initialization)
export function getOpenAIClient() {
  const openai = initOpenAI();
  
  if (!openai) {
    throw new Error("OpenAI client not initialized. Check your API key.");
  }
  
  return openai;
}

// Function to generate AI responses
export async function generateResponse(prompt: string, context: string[] = []): Promise<string> {
  try {
    const openai = getOpenAIClient();
    
    const messages = [
      { role: "system", content: "You are an AI receptionist. You're professional, helpful, and concise." },
      ...context.map(text => ({ role: "user" as const, content: text })),
      { role: "user", content: prompt }
    ];
    
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });
    
    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
  }
}

// Function to identify user intent from message
export async function identifyIntent(message: string): Promise<{ intent: string; confidence: number }> {
  try {
    const openai = getOpenAIClient();
    
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: 
            "You are an intent classifier for a reception system. Analyze the message and determine the primary intent. " +
            "Reply with JSON in this format: { 'intent': string, 'confidence': number }. " +
            "Intents should be one of: greeting, inquiry, booking, complaint, product_query, pricing, support, other. " +
            "Confidence should be between 0 and 1."
        },
        {
          role: "user",
          content: message
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      intent: result.intent,
      confidence: Math.max(0, Math.min(1, result.confidence)),
    };
  } catch (error) {
    console.error("Error identifying intent:", error);
    return { intent: "other", confidence: 0 };
  }
}

// Function to analyze sentiment
export async function analyzeSentiment(text: string): Promise<{ sentiment: string; score: number }> {
  try {
    const openai = getOpenAIClient();
    
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a sentiment analysis expert. Analyze the sentiment of the text and provide a sentiment classification and score. " +
            "Respond with JSON in this format: { 'sentiment': string, 'score': number }. " +
            "Sentiment should be one of: positive, neutral, negative. " +
            "Score should be between -1 and 1, where -1 is extremely negative and 1 is extremely positive."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      sentiment: result.sentiment,
      score: Math.max(-1, Math.min(1, result.score)),
    };
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return { sentiment: "neutral", score: 0 };
  }
}

// Function to extract entities from text
export async function extractEntities(text: string): Promise<Record<string, any>> {
  try {
    const openai = getOpenAIClient();
    
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an entity recognition expert. Extract relevant entities from the text. " +
            "Focus on dates, times, names, locations, products, services, and contact information. " +
            "Respond with a JSON object where keys are entity types and values are the extracted entities."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error extracting entities:", error);
    return {};
  }
}

// Function to generate automatic email responses
export async function generateEmailResponse(subject: string, body: string, context: string[] = []): Promise<string> {
  try {
    const openai = getOpenAIClient();
    
    const messages = [
      { 
        role: "system", 
        content: "You are a professional AI receptionist responding to an email. Keep your response concise, helpful, and professional." 
      },
      ...context.map(text => ({ role: "user" as const, content: text })),
      { 
        role: "user", 
        content: `Please respond to this email:\nSubject: ${subject}\n\nBody: ${body}` 
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    return response.choices[0].message.content || "I apologize, but I couldn't generate a response.";
  } catch (error) {
    console.error("Error generating email response:", error);
    return "Thank you for your email. We've received your message and will respond as soon as possible.";
  }
}
