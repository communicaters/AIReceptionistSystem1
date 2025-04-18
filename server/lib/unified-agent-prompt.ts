/**
 * Unified Agent Prompt Manager
 * 
 * This module provides a centralized prompt manager to ensure all AI agents
 * (WhatsApp, Email, Live Chat, Call) have consistent behavior, prompting, and training.
 * It provides the same system prompts, training data, and behavior instructions
 * regardless of communication channel.
 */

import { storage } from "../storage";
import { userProfileManager } from "./user-profile-manager";
import { UserProfileData } from "@shared/schema";

/**
 * Generate a unified system prompt that will be used across all communication channels
 * to ensure consistent agent behavior
 */
export async function generateUnifiedSystemPrompt(
  userId: number,
  channel: 'whatsapp' | 'email' | 'chat' | 'call',
  profile: UserProfileData | null,
  options: {
    conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>,
    missingFields?: string[],
    previouslyAskedFor?: string[],
    newInfoExtracted?: boolean,
    scheduleKeywords?: boolean
  } = {}
): Promise<string> {
  // Start with the base system prompt - same for all channels
  let systemPrompt = `You are a Receptionist for a business, communicating with customers via ${channel}.
Your responses should be warm, natural, and conversational - just like a friendly human receptionist would speak.
Keep your tone helpful and professional while maintaining a natural conversation flow.`;
  
  // Add user profile context if available
  if (profile) {
    systemPrompt += `\n\nCUSTOMER PROFILE:`;
    
    if (profile.name) {
      systemPrompt += `\nName: ${profile.name}`;
    } else {
      systemPrompt += `\nName: Unknown`;
    }
    
    if (profile.email) {
      systemPrompt += `\nEmail: ${profile.email}`;
    } else {
      systemPrompt += `\nEmail: Unknown`;
    }
    
    if (profile.phone) {
      systemPrompt += `\nPhone: ${profile.phone}`;
    } else {
      systemPrompt += `\nPhone: Unknown`;
    }
    
    // Add additional profile fields if available in metadata
    if (profile.metadata) {
      try {
        const metadata = profile.metadata as Record<string, any>;
        if (metadata.company) {
          systemPrompt += `\nCompany: ${metadata.company}`;
        }
        if (metadata.position) {
          systemPrompt += `\nPosition: ${metadata.position}`;
        }
        if (metadata.preferences) {
          systemPrompt += `\nPreferences: ${metadata.preferences}`;
        }
      } catch (e) {
        // Ignore metadata parsing errors
      }
    }
  }
  
  // Add instructions about gathering missing information if needed
  const missingFields = options.missingFields || [];
  if (missingFields.length > 0) {
    systemPrompt += `\n\nMISSING INFORMATION:`;
    if (missingFields.includes('name')) {
      systemPrompt += `\n- Customer's full name is unknown`;
    }
    if (missingFields.includes('email')) {
      systemPrompt += `\n- Customer's email address is unknown`;
    }
    if (missingFields.includes('phone')) {
      systemPrompt += `\n- Customer's phone number is unknown`;
    }
    
    // If we just extracted some new info, acknowledge it 
    if (options.newInfoExtracted) {
      systemPrompt += `\n\nNOTE: Some new information was just extracted from the user's message. Thank the user for providing this information.`;
    }
    
    // Determine if we need to ask for information
    const previouslyAskedFor = options.previouslyAskedFor || [];
    const shouldAskFor = missingFields.filter(field => !previouslyAskedFor.includes(field));
    
    if (shouldAskFor.length > 0) {
      // Don't ask for more than one piece of information at a time
      const fieldToAskFor = shouldAskFor[0];
      
      systemPrompt += `\n\nACTION REQUIRED:`;
      systemPrompt += `\nPolitely ask for the customer's ${fieldToAskFor} if it makes sense in the conversation flow.`;
      systemPrompt += `\nDon't ask this as a separate question - integrate it naturally into your response.`;
      systemPrompt += `\nIf the current interaction doesn't allow for this naturally, address their message first.`;
    }
  }
  
  // Personalization instructions
  if (profile?.name) {
    systemPrompt += `\n\nPERSONALIZATION:`;
    systemPrompt += `\nAddress the customer by name (${profile.name}) to personalize your interactions.`;
    systemPrompt += `\nYou can use phrases like "Thank you, ${profile.name}" or "Hello ${profile.name}".`;
  }
  
  // Get unified training data for the business
  const trainingData = await storage.getTrainingDataByUserId(userId);
  if (trainingData.length > 0) {
    const trainingContent = trainingData.map(item => 
      `${item.category}: ${item.content}`
    ).join('\n\n');
    
    systemPrompt += `\n\nBUSINESS INFORMATION AND COMMON RESPONSES:
${trainingContent}`;
  }
  
  // Get product data for the business
  const products = await storage.getProductsByUserId(userId);
  if (products.length > 0) {
    const productContent = products.map(p => 
      `Product: ${p.name}\nDescription: ${p.description || 'N/A'}\nPrice: $${(p.priceInCents / 100).toFixed(2)}\nSKU: ${p.sku}`
    ).join('\n\n');
    
    systemPrompt += `\n\nAVAILABLE PRODUCTS:
${productContent}`;
  }
  
  // Add scheduling detection instructions if scheduling keywords detected
  if (options.scheduleKeywords) {
    systemPrompt += `\n\nThis appears to be a meeting scheduling request. If the user wants to schedule a meeting:
1. Extract the requested date and time (interpret timezone abbreviations like PST, EST, etc.)
2. Identify the attendee email address 
3. Determine the meeting subject/purpose
4. Respond in a clear, structured way by stating:
   - The date and time you've scheduled (in YYYY-MM-DD HH:MM format)
   - The meeting subject
   - The duration of the meeting (default to 30 minutes if not specified)
   - Any additional notes or requirements
5. If this is NOT a scheduling request, respond normally.`;
  }
  
  // General behavior guidelines - consistent across all channels
  systemPrompt += `\n\nBEHAVIOR GUIDELINES:`;
  systemPrompt += `\n- Be professional, helpful, and friendly.`;
  systemPrompt += `\n- Keep responses concise and to the point.`;
  systemPrompt += `\n- Use appropriate context from previous messages.`;
  systemPrompt += `\n- Avoid asking for information the customer has already provided.`;
  systemPrompt += `\n- Be casual but professional in tone.`;
  systemPrompt += `\n- Do not mention that you are collecting user information.`;
  systemPrompt += `\n- Always maintain continuity with previous interactions.`;
  
  // Add channel-specific instructions
  switch (channel) {
    case 'email':
      systemPrompt += `\n\nEMAIL-SPECIFIC INSTRUCTIONS:`;
      systemPrompt += `\n- Use proper email formatting with greeting and signature.`;
      systemPrompt += `\n- Be more formal in email responses than in chat.`;
      systemPrompt += `\n- Format your final response following this structure (just expressed as text, not actual JSON):
  * Start with email greeting
  * Include your email body with proper paragraphs
  * End with a professional signature
  * If meeting scheduling is requested, clearly state the proposed date/time`;
      break;
      
    case 'whatsapp':
      systemPrompt += `\n\nWHATSAPP-SPECIFIC INSTRUCTIONS:`;
      systemPrompt += `\n- Keep responses short and mobile-friendly.`;
      systemPrompt += `\n- Use brief paragraphs (1-2 sentences).`;
      systemPrompt += `\n- Avoid complex formatting that doesn't work on mobile.`;
      break;
      
    case 'chat':
      systemPrompt += `\n\nLIVE CHAT-SPECIFIC INSTRUCTIONS:`;
      systemPrompt += `\n- Keep responses conversational.`;
      systemPrompt += `\n- Respond promptly and efficiently.`;
      systemPrompt += `\n- Break longer responses into multiple short paragraphs.`;
      break;
      
    case 'call':
      systemPrompt += `\n\nCALL-SPECIFIC INSTRUCTIONS:`;
      systemPrompt += `\n- Use natural spoken language patterns.`;
      systemPrompt += `\n- Keep responses brief and easy to understand verbally.`;
      systemPrompt += `\n- Avoid complex instructions that are hard to follow in speech.`;
      break;
  }
  
  return systemPrompt;
}