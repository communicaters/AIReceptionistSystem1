/**
 * User Profile Assistant - Enhances AI agent responses with user profile management
 * 
 * This module handles checking for existing user profiles, requesting missing information,
 * and personalizing responses based on known user data.
 */

import { UserProfileData } from "@shared/schema";
import { userProfileManager } from "./user-profile-manager";
import OpenAI from "openai";

// Regular expressions to detect information in messages
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
const PHONE_REGEX = /\b(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b/;
const NAME_REGEX = /\b(?:my name is|I am|I'm|this is) ([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})\b/i;

interface ConversationContext {
  profileId?: number;
  userProfile?: UserProfileData;
  chatHistory: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  lastInteraction?: string;
  hasMissingInfo: boolean;
  missingFields: string[];
  previouslyAskedFor?: string[];
}

export class UserProfileAssistant {
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || ''
    });
  }

  /**
   * Process a message and enhance it with profile-aware context
   */
  async processMessage(
    userId: number,
    contactIdentifier: string, // Phone number, email, or chat session ID
    messageContent: string,
    channel: 'whatsapp' | 'email' | 'chat' | 'call',
    existingProfileId?: number
  ): Promise<{
    enhancedPrompt: string;
    context: ConversationContext;
  }> {
    console.log(`Processing ${channel} message from ${contactIdentifier}`);
    
    // First, check if the message contains an email address or phone number
    // We do this first before any other lookups to see if we have additional identifiers
    const extractedInfo = this.extractUserInfoFromMessage(messageContent);
    let profile: UserProfileData | undefined;
    let profileId = existingProfileId;
    let newInfoExtracted = false;
    
    // Step 1: Try to find a profile by any extracted email or phone before going further
    if (extractedInfo.email) {
      try {
        const emailProfile = await userProfileManager.findProfileByEmail(extractedInfo.email);
        if (emailProfile) {
          console.log(`Found existing profile with email ${extractedInfo.email}, profile ID: ${emailProfile.id}`);
          profile = emailProfile;
          profileId = emailProfile.id;
        }
      } catch (error) {
        console.error("Error finding profile by extracted email:", error);
      }
    }
    
    // If we didn't find a profile by email, try phone
    if (!profile && extractedInfo.phone) {
      try {
        const phoneProfile = await userProfileManager.findProfileByPhone(extractedInfo.phone);
        if (phoneProfile) {
          console.log(`Found existing profile with phone ${extractedInfo.phone}, profile ID: ${phoneProfile.id}`);
          profile = phoneProfile;
          profileId = phoneProfile.id;
        }
      } catch (error) {
        console.error("Error finding profile by extracted phone:", error);
      }
    }
    
    // If we still don't have a profile and we don't have an existing profile ID, continue with the regular lookup
    if (!profile && !profileId) {
      // Try to find user profile based on channel and contact identifier
      if (channel === 'whatsapp' || channel === 'call') {
        // Remove any spaces, dashes, or formatting from phone numbers
        const cleanedPhone = contactIdentifier.replace(/[\s-()]/g, '');
        profile = await userProfileManager.findProfileByPhone(cleanedPhone);
      } else if (channel === 'email') {
        profile = await userProfileManager.findProfileByEmail(contactIdentifier);
      } else {
        // For chat, try to find by contact identifier (which could be email or other ID)
        profile = await userProfileManager.findProfileByAny(contactIdentifier);
      }
      
      // If profile not found, create a minimal one
      if (!profile) {
        const createData: any = {
          userId,
          lastInteractionSource: channel
        };
        
        // Set the appropriate contact method based on channel
        if (channel === 'whatsapp' || channel === 'call') {
          createData.phone = contactIdentifier;
        } else if (channel === 'email') {
          createData.email = contactIdentifier;
        }
        
        // Also add any extracted information we have
        if (extractedInfo.name) createData.name = extractedInfo.name;
        if (extractedInfo.email && !createData.email) createData.email = extractedInfo.email;
        if (extractedInfo.phone && !createData.phone) createData.phone = extractedInfo.phone;
        
        try {
          profile = await userProfileManager.createProfile(createData);
          console.log(`Created new profile with ID ${profile.id} for ${contactIdentifier}`);
          newInfoExtracted = true;
        } catch (error) {
          console.error("Error creating profile:", error);
          
          // If we get a duplicate key error, it's likely a unique constraint violation
          // Try to find the profile with the email or phone we tried to use
          if (error.toString().includes('duplicate key value')) {
            if (createData.email) {
              try {
                profile = await userProfileManager.findProfileByEmail(createData.email);
                if (profile) {
                  console.log(`Found existing profile with email ${createData.email} after duplicate key error`);
                }
              } catch (innerError) {
                console.error("Error finding profile by email after duplicate key error:", innerError);
              }
            } else if (createData.phone) {
              try {
                profile = await userProfileManager.findProfileByPhone(createData.phone);
                if (profile) {
                  console.log(`Found existing profile with phone ${createData.phone} after duplicate key error`);
                }
              } catch (innerError) {
                console.error("Error finding profile by phone after duplicate key error:", innerError);
              }
            }
            
            // If we still don't have a profile, create one without the conflicting fields
            if (!profile) {
              delete createData.email;
              delete createData.phone;
              
              try {
                profile = await userProfileManager.createProfile(createData);
                console.log(`Created new profile without contact info with ID ${profile.id}`);
              } catch (createError) {
                console.error("Error creating fallback profile:", createError);
                throw new Error("Unable to create or find a user profile");
              }
            }
          } else {
            throw error; // Re-throw if it's not a duplicate key error
          }
        }
      }
      
      profileId = profile.id;
    } else if (profileId && !profile) {
      // Load the profile using the provided ID if we have a profileId but no profile object
      profile = await userProfileManager.getProfile(profileId);
      if (!profile) {
        throw new Error(`Invalid profile ID: ${profileId}`);
      }
    }
    
    // Step 2: Get recent interactions for context
    const recentInteractions = await userProfileManager.getRecentInteractions(profileId, 10);
    
    // Extract chat history in the proper format for context
    const chatHistory = recentInteractions.map(interaction => {
      return {
        role: interaction.interactionType === 'inbound' ? 'user' : 'assistant',
        content: interaction.content || ''
      };
    }).reverse(); // Most recent last
    
    // Add the current message
    chatHistory.push({
      role: 'user',
      content: messageContent
    });
    
    // Step 3: Update profile with extracted information if needed
    // We already extracted the info earlier, so reuse that
    const updatedProfile = {...profile};
    let infoChanged = false;
    
    if (extractedInfo.name && !profile.name) {
      updatedProfile.name = extractedInfo.name;
      infoChanged = true;
      newInfoExtracted = true;
    }
    
    if (extractedInfo.email && !profile.email) {
      updatedProfile.email = extractedInfo.email;
      infoChanged = true;
      newInfoExtracted = true;
    }
    
    if (extractedInfo.phone && !profile.phone) {
      updatedProfile.phone = extractedInfo.phone;
      infoChanged = true;
      newInfoExtracted = true;
    }
    
    // Update profile if new info was found
    if (infoChanged) {
      try {
        await userProfileManager.updateProfile(profileId, updatedProfile);
        const updatedProfileData = await userProfileManager.getProfile(profileId);
        if (updatedProfileData) {
          profile = updatedProfileData;
          console.log(`Updated profile ${profileId} with new information`);
        } else {
          console.error(`Failed to retrieve updated profile for ID ${profileId}`);
        }
      } catch (error) {
        console.error(`Error updating profile ${profileId}:`, error);
      }
    }
    
    // Step 4: Determine which information is still missing
    const missingFields: string[] = [];
    if (!profile?.name) missingFields.push('name');
    if (!profile?.email) missingFields.push('email');
    if (!profile?.phone) missingFields.push('phone');
    
    // Step 5: Find what we've asked for before to avoid repetition
    const previouslyAskedFor: string[] = [];
    for (let i = chatHistory.length - 2; i >= 0; i--) {
      if (chatHistory[i].role === 'assistant') {
        const content = chatHistory[i].content.toLowerCase();
        if (content.includes('name') && content.includes('?')) {
          previouslyAskedFor.push('name');
        }
        if (content.includes('email') && content.includes('?')) {
          previouslyAskedFor.push('email');
        }
        if (content.includes('phone') && content.includes('?') || 
            content.includes('number') && content.includes('?')) {
          previouslyAskedFor.push('phone');
        }
      }
    }
    
    // Step 6: Create enhanced prompt for the AI
    const context: ConversationContext = {
      profileId,
      userProfile: profile,
      chatHistory,
      hasMissingInfo: missingFields.length > 0,
      missingFields,
      previouslyAskedFor
    };
    
    const enhancedPrompt = this.createEnhancedPrompt(context, messageContent, channel, newInfoExtracted);
    
    return {
      enhancedPrompt,
      context
    };
  }
  
  /**
   * Extract potential user information from a message
   */
  private extractUserInfoFromMessage(message: string): {
    name?: string;
    email?: string;
    phone?: string;
  } {
    const result: {name?: string; email?: string; phone?: string} = {};
    
    // Extract email
    const emailMatch = message.match(EMAIL_REGEX);
    if (emailMatch) {
      result.email = emailMatch[0];
    }
    
    // Extract phone
    const phoneMatch = message.match(PHONE_REGEX);
    if (phoneMatch) {
      result.phone = phoneMatch[0];
    }
    
    // Extract name - look for patterns like "my name is John Smith"
    const nameMatch = message.match(NAME_REGEX);
    if (nameMatch && nameMatch[1]) {
      result.name = nameMatch[1].trim();
    }
    
    return result;
  }
  
  /**
   * Create an enhanced prompt that includes profile information
   */
  private createEnhancedPrompt(
    context: ConversationContext,
    currentMessage: string,
    channel: string,
    newInfoExtracted: boolean
  ): string {
    const profile = context.userProfile;
    const missingFields = context.missingFields || [];
    const previouslyAskedFor = context.previouslyAskedFor || [];
    
    // Base system instructions
    let prompt = `You are an AI Receptionist providing customer service via ${channel}.`;
    
    // Add user profile context
    prompt += `\n\nCUSTOMER PROFILE:`;
    if (profile?.name) {
      prompt += `\nName: ${profile.name}`;
    } else {
      prompt += `\nName: Unknown`;
    }
    
    if (profile?.email) {
      prompt += `\nEmail: ${profile.email}`;
    } else {
      prompt += `\nEmail: Unknown`;
    }
    
    if (profile?.phone) {
      prompt += `\nPhone: ${profile.phone}`;
    } else {
      prompt += `\nPhone: Unknown`;
    }
    
    // Add instructions about gathering missing information
    if (missingFields.length > 0) {
      prompt += `\n\nMISSING INFORMATION:`;
      if (missingFields.includes('name')) {
        prompt += `\n- Customer's full name is unknown`;
      }
      if (missingFields.includes('email')) {
        prompt += `\n- Customer's email address is unknown`;
      }
      if (missingFields.includes('phone')) {
        prompt += `\n- Customer's phone number is unknown`;
      }
      
      // If we just extracted some new info, acknowledge it 
      if (newInfoExtracted) {
        prompt += `\n\nNOTE: Some new information was just extracted from the user's message. Thank the user for providing this information.`;
      }
      
      // Determine if we need to ask for information
      const shouldAskFor = missingFields.filter(field => !previouslyAskedFor.includes(field));
      
      if (shouldAskFor.length > 0) {
        // Don't ask for more than one piece of information at a time
        const fieldToAskFor = shouldAskFor[0];
        
        prompt += `\n\nACTION REQUIRED:`;
        prompt += `\nPolitely ask for the customer's ${fieldToAskFor} if it makes sense in the conversation flow.`;
        prompt += `\nDon't ask this as a separate question - integrate it naturally into your response.`;
        prompt += `\nIf the current interaction doesn't allow for this naturally, address their message first.`;
      }
    }
    
    // Personalization instructions
    if (profile?.name) {
      prompt += `\n\nPERSONALIZATION:`;
      prompt += `\nAddress the customer by name (${profile.name}) to personalize your interactions.`;
      prompt += `\nYou can use phrases like "Thank you, ${profile.name}" or "Hello ${profile.name}".`;
    }
    
    // General behavior instructions
    prompt += `\n\nBEHAVIOR GUIDELINES:`;
    prompt += `\n- Be professional, helpful, and friendly.`;
    prompt += `\n- Keep responses concise and to the point.`;
    prompt += `\n- Use appropriate context from previous messages.`;
    prompt += `\n- Avoid asking for information the customer has already provided.`;
    prompt += `\n- Be casual but professional in tone.`;
    prompt += `\n- Do not mention that you are collecting user information.`;
    prompt += `\n- Focus on addressing their needs first, information collection is secondary.`;
    
    return prompt;
  }
  
  /**
   * Process the AI response and record the interaction
   */
  async processAIResponse(
    profileId: number,
    aiResponse: string,
    channel: 'whatsapp' | 'email' | 'chat' | 'call'
  ): Promise<string> {
    try {
      // Record the AI's response as an interaction
      await userProfileManager.recordInteraction(
        profileId,
        channel,
        'outbound',
        aiResponse,
        {
          timestamp: new Date().toISOString(),
          aiGenerated: true
        }
      );
      
      // Update the profile's last interaction time and source
      try {
        await userProfileManager.updateProfile(profileId, {
          lastSeen: new Date(),
          lastInteractionSource: channel
        });
      } catch (updateError) {
        console.error(`Error updating profile last interaction time for ID ${profileId}:`, updateError);
        // Continue - this error shouldn't prevent the response from being sent
      }
      
      return aiResponse;
    } catch (error) {
      console.error(`Error recording AI response for profile ${profileId}:`, error);
      // Still return the AI response even if we couldn't record it
      return aiResponse;
    }
  }
  
  /**
   * Generate an AI response with profile-aware context
   */
  async generateResponse(
    userId: number,
    contactIdentifier: string,
    messageContent: string,
    channel: 'whatsapp' | 'email' | 'chat' | 'call',
    existingProfileId?: number
  ): Promise<{
    response: string;
    profileId: number;
  }> {
    try {
      console.log(`UserProfileAssistant.generateResponse called for ${channel} channel with message: "${messageContent.substring(0, 50)}..."`);
      
      // Process the message to get enhanced context
      const { enhancedPrompt, context } = await this.processMessage(
        userId,
        contactIdentifier,
        messageContent,
        channel,
        existingProfileId
      );
      
      console.log(`Message processed, enhancedPrompt created, context has profileId: ${context.profileId || 'none'}`);
      
      // Ensure we have a profile ID
      const profileId = context.profileId || 0;
      if (!profileId) {
        console.error('No profile ID found after processing message');
        throw new Error('No profile ID found after processing message');
      }
      
      // Record the inbound message
      try {
        await userProfileManager.recordInteraction(
          profileId,
          channel,
          'inbound',
          messageContent,
          {
            timestamp: new Date().toISOString(),
            mediaUrl: null,
            phoneNumber: channel === 'whatsapp' ? contactIdentifier : undefined
          }
        );
      } catch (error) {
        // Log the error but continue processing - don't let recording failure block the response
        console.error(`Error recording user message for profile ${profileId}:`, error);
      }
      
      // Create the message history for the API call
      const messages: any[] = [
        {
          role: 'system',
          content: enhancedPrompt
        }
      ];
      
      // Add prior conversation history
      context.chatHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
      
      // Make the API call to OpenAI
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages,
        temperature: 0.7,
        max_tokens: 500
      });
      
      const aiResponse = response.choices[0].message.content || 
        "I apologize, but I couldn't generate a response at this time.";
      
      // Process and record the AI response
      const processedResponse = await this.processAIResponse(profileId, aiResponse, channel);
      
      return {
        response: processedResponse,
        profileId
      };
    } catch (error) {
      console.error('Error generating profile-aware response:', error);
      return {
        response: "I apologize, but I'm having trouble processing your request right now. Please try again later.",
        profileId: existingProfileId || 0
      };
    }
  }
}

// Singleton instance
let instance: UserProfileAssistant | null = null;

/**
 * Get or create the UserProfileAssistant instance
 */
export function getUserProfileAssistant(): UserProfileAssistant {
  if (!instance) {
    instance = new UserProfileAssistant(process.env.OPENAI_API_KEY || '');
  }
  return instance;
}