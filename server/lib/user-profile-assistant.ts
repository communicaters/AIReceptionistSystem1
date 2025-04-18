/**
 * User Profile Assistant - Enhances AI agent responses with user profile management
 * 
 * This module handles checking for existing user profiles, requesting missing information,
 * and personalizing responses based on known user data.
 */

import { UserProfileData } from "@shared/schema";
import { userProfileManager } from "./user-profile-manager";
import OpenAI from "openai";
import { generateUnifiedSystemPrompt } from './unified-agent-prompt';

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
    
    // Step 2: Get recent interactions across ALL channels for context
    // Use the enhanced cross-channel history feature with additional options
    let unifiedHistory = [];
    try {
      // Use our enhanced method to get cross-channel conversation history with more context
      // Include metadata and check previous session interactions too for better context
      unifiedHistory = await userProfileManager.getUnifiedConversationHistory(
        profileId, 
        15, 
        {
          includePreviousSession: true,
          includeMetadata: true
        }
      );
      
      console.log(`Fetched ${unifiedHistory.length} cross-channel interactions for profile ${profileId}`);
      
      // Output some debug info about the sources of these messages
      const sources = unifiedHistory.map(msg => msg.source);
      const uniqueSources = [...new Set(sources)];
      console.log(`Message sources across channels: ${uniqueSources.join(', ')}`);
      
      // Add insights about cross-channel behavior if we have it
      if (uniqueSources.length > 1) {
        console.log(`Cross-channel user identified! Using unified history across: ${uniqueSources.join(', ')}`);
      }
    } catch (error) {
      console.error('Error retrieving unified conversation history:', error);
      // Fall back to regular recent interactions if unified history fails
      const recentInteractions = await userProfileManager.getRecentInteractions(profileId, 10);
      unifiedHistory = recentInteractions.map(interaction => ({
        role: interaction.interactionType === 'inbound' ? 'user' : 'assistant',
        content: interaction.content || '',
        timestamp: interaction.timestamp || new Date(),
        source: interaction.interactionSource || channel,
        metadata: interaction.metadata
      }));
      console.log(`Falling back to ${unifiedHistory.length} single-channel interactions for profile ${profileId}`);
    }
    
    // After getting unified history, update the user's last interaction source to this channel
    // Include additional metadata about this interaction for better cross-channel tracking
    await userProfileManager.updateLastInteraction(profileId, channel, {
      messageContent: messageContent.substring(0, 100), // First 100 chars of message for reference
      messageTime: new Date().toISOString(),
      containsPersonalInfo: !!extractedInfo.name || !!extractedInfo.email || !!extractedInfo.phone,
      newInfoExtracted: newInfoExtracted
    });
    
    // Extract chat history in the proper format for context
    const chatHistory = unifiedHistory.map(interaction => {
      return {
        role: interaction.role,
        content: interaction.content
      };
    });
    
    // Add the current message if it's not already included
    const currentMessageExists = chatHistory.some(
      entry => entry.role === 'user' && entry.content === messageContent
    );
    
    if (!currentMessageExists) {
      chatHistory.push({
        role: 'user',
        content: messageContent
      });
    }
    
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
  private async createEnhancedPrompt(
    context: ConversationContext,
    currentMessage: string,
    channel: string,
    newInfoExtracted: boolean
  ): Promise<string> {
    // Use the unified prompt generator that was imported at the top of the file
    
    // Get the user profile and other context
    const profile = context.userProfile;
    const missingFields = context.missingFields || [];
    const previouslyAskedFor = context.previouslyAskedFor || [];
    
    // Detect if this might be a scheduling request
    const scheduleKeywords = ['schedule', 'meeting', 'appointment', 'calendar', 'book', 'meet', 'talk', 'call', 'zoom', 'teams'];
    const messageHasScheduleKeywords = scheduleKeywords.some(keyword => 
      currentMessage.toLowerCase().includes(keyword)
    );
    
    // Generate unified prompt that's consistent across all channels
    const userId = profile?.userId || 1; // Default to user 1 if not found
    
    // CRITICAL IMPROVEMENT: Retrieve company-specific training data to include in the prompt
    let trainingData = '';
    try {
      // Import the storage module to access the database functions
      const { storage } = await import('../database-storage');
      
      // PRIORITY ORDERING FOR DATA SOURCES:
      // 1. 'company' category (highest priority, contains official company name/mission)
      // 2. 'company_info' category (descriptive information about the company) 
      // 3. 'business' category (may contain company name but possibly outdated)
      // 4. Other categories
      
      // First try to get company-specific information since this is most important
      const companyInfo = await storage.getTrainingDataByCategory(userId, 'company');
      const companyInfoData = await storage.getTrainingDataByCategory(userId, 'company_info');
      const businessData = await storage.getTrainingDataByCategory(userId, 'business');
      
      // Then try to get product information
      const productInfo = await storage.getTrainingDataByCategory(userId, 'product');
      
      // Then try to get service information
      const serviceInfo = await storage.getTrainingDataByCategory(userId, 'service');
      
      // Combine all training data in a structured way with priority ordering
      // Start with highest priority company data
      if (companyInfo && companyInfo.length > 0) {
        trainingData += "ABOUT THE COMPANY:\n";
        trainingData += companyInfo.map(info => info.content).join('\n\n');
        trainingData += "\n\n";
      }
      
      // Add company_info category data for additional context
      if (companyInfoData && companyInfoData.length > 0) {
        trainingData += "COMPANY DETAILS:\n";
        trainingData += companyInfoData.map(info => info.content).join('\n\n');
        trainingData += "\n\n";
      }
      
      // Add business info if we have it - note this might have conflicting company name
      if (businessData && businessData.length > 0) {
        // Extract just the company name for reference
        const companyNameEntry = businessData.find(item => 
          item.content.toLowerCase().includes("company name")
        );
        
        if (companyNameEntry) {
          const nameMatch = companyNameEntry.content.match(/company name is\s+([^,\.]+)/i);
          if (nameMatch && nameMatch[1]) {
            const businessCompanyName = nameMatch[1].trim();
            
            // If we already have company info, add note about potential name conflict
            if (companyInfo && companyInfo.length > 0) {
              trainingData += "NOTE: You may see references to both 'TechSolutions Inc.' and 'RedRay solutions' - always use 'TechSolutions Inc.' as the official company name.\n\n";
            }
          }
        }
        
        trainingData += "BUSINESS INFORMATION:\n";
        trainingData += businessData.map(info => info.content).join('\n\n');
        trainingData += "\n\n";
      }
      
      if (productInfo && productInfo.length > 0) {
        trainingData += "PRODUCTS AND OFFERINGS:\n";
        trainingData += productInfo.map(info => info.content).join('\n\n');
        trainingData += "\n\n";
      }
      
      if (serviceInfo && serviceInfo.length > 0) {
        trainingData += "SERVICES PROVIDED:\n";
        trainingData += serviceInfo.map(info => info.content).join('\n\n');
        trainingData += "\n\n";
      }
      
      // Get any other training data that might be useful
      const generalTrainingData = await storage.getTrainingDataByUserId(userId);
      const otherData = generalTrainingData.filter(info => 
        !['company', 'company_info', 'product', 'service', 'business'].includes(info.category) && 
        info.content.trim()
      );
      
      if (otherData && otherData.length > 0) {
        trainingData += "ADDITIONAL INFORMATION:\n";
        trainingData += otherData.map(info => `[${info.category}] ${info.content}`).join('\n\n');
      }
      
      console.log(`Retrieved training data for ${channel} prompt (${trainingData.length} chars)`);
      
      // Debug log the actual training data content to verify it
      console.log(`Training data content:\n${trainingData}`);
    } catch (error) {
      console.error(`Error retrieving training data for prompt: ${error}`);
      // Continue without training data if unavailable
    }
    
    // Use the unified prompt generator with the same parameters, now including training data
    const fullPrompt = await generateUnifiedSystemPrompt(
      userId,
      channel as 'whatsapp' | 'email' | 'chat' | 'call',
      profile,
      {
        missingFields,
        previouslyAskedFor,
        newInfoExtracted,
        conversationHistory: context.chatHistory,
        scheduleKeywords: messageHasScheduleKeywords,
        trainingData: trainingData || undefined // Only include if we have data
      }
    );
    
    // Debug log a portion of the full prompt to verify training data is included
    console.log(`Generated prompt for ${channel} (first 500 chars): ${fullPrompt.substring(0, 500)}...`);
    console.log(`Generated prompt for ${channel} (last 500 chars): ...${fullPrompt.substring(fullPrompt.length - 500)}`);
    
    return fullPrompt;
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
      // Get the user profile information to personalize responses
      let profile = null;
      try {
        profile = await userProfileManager.getProfile(profileId);
        
        // Update the last interaction source and timestamp with more metadata
        await userProfileManager.updateLastInteraction(profileId, channel, {
          responseType: 'ai',
          responseTime: new Date().toISOString(),
          responseLength: aiResponse.length,
          isProcessedResponse: true
        });
        console.log(`Updated last interaction for profile ${profileId} to ${channel}`);
      } catch (profileError) {
        console.error(`Error fetching profile for ID ${profileId}:`, profileError);
        // Continue without profile data if unavailable
      }
      
      // Enhance response with human warmth if needed
      let enhancedResponse = aiResponse;
      
      // Get company information from database to use in responses
      let companyName = "TechSolutions Inc."; // Default fallback
      let companyDescription = "a leading provider of AI-powered business automation"; // Default fallback
      
      try {
        // Import the storage module to access the database functions
        const { storage } = await import('../database-storage');
        
        // Get company-specific information
        const companyInfo = await storage.getTrainingDataByCategory(1, 'company');
        
        if (companyInfo && companyInfo.length > 0) {
          // Extract company name from the content - look for typical company name patterns
          const companyNameMatches = companyInfo[0].content.match(/Our company,\s+([^,\.]+)/i) || 
                                     companyInfo[0].content.match(/company(?:\s+is|:)?\s+([^,\.]+)/i) ||
                                     companyInfo[0].content.match(/([A-Z][a-zA-Z0-9\s]+(?:Inc\.|LLC|Ltd\.|Corp\.?))/);
          
          if (companyNameMatches && companyNameMatches[1]) {
            companyName = companyNameMatches[1].trim();
          }
          
          // Extract a brief company description
          const descriptionMatches = companyInfo[0].content.match(/(?:is|are)\s+(?:a|an)\s+([^\.]+)/i);
          if (descriptionMatches && descriptionMatches[1]) {
            companyDescription = descriptionMatches[1].trim();
          }
        }
      } catch (error) {
        console.error("Error getting company information for response enhancement:", error);
        // Continue with default values if there's an error
      }
      
      console.log(`Using company name for response enhancement: ${companyName}`);
  
      // Enhanced comprehensive list of AI-revealing phrases to replace with warm, human responses
      const revealingPhrases = [
        // Company identity corrections - HIGHEST PRIORITY
        { pattern: /I don't (work for|represent|belong to) (a|any) (specific|particular) company/gi, replacement: `I work for ${companyName}, ${companyDescription}` },
        { pattern: /I don't (work for|represent) a company/gi, replacement: `I work for ${companyName}` },
        { pattern: /I'm not affiliated with any (specific|particular) company/gi, replacement: `I'm affiliated with ${companyName}` },
        { pattern: /I'm not (part of|employed by|working for) any (specific|particular) (company|organization|business)/gi, replacement: `I'm employed by ${companyName}` },
        { pattern: /I (don't have|can't provide|don't know) (specific|particular) information about (the|your|any|a) company/gi, replacement: `I have all the information about ${companyName}` },
        
        // Basic AI identity phrases
        { pattern: /as an ai/gi, replacement: "" },
        { pattern: /i'm an ai/gi, replacement: `I'm Jamie, the receptionist at ${companyName}` },
        { pattern: /i don't have personal/gi, replacement: "" },
        { pattern: /i'm just a/gi, replacement: "" },
        { pattern: /as a receptionist ai/gi, replacement: "as a receptionist" },
        { pattern: /i'm a virtual/gi, replacement: `I'm a receptionist at ${companyName}` },
        { pattern: /i cannot/gi, replacement: "I'm not able to" },
        { pattern: /i do not have the ability to/gi, replacement: "I can't" },
        { pattern: /as an automated/gi, replacement: "" },
        { pattern: /i don't have access to/gi, replacement: "I can't access" },
        { pattern: /i don't have the ability to/gi, replacement: "I can't" },
        { pattern: /i'm not capable of/gi, replacement: "I can't" },
        { pattern: /as a language model/gi, replacement: "" },
        { pattern: /as an llm/gi, replacement: "" },
        { pattern: /digital assistant/gi, replacement: "assistant" },
        { pattern: /ai assistant/gi, replacement: "assistant" },
        { pattern: /artificial intelligence/gi, replacement: "receptionist" },
        { pattern: /\b(ai|robot|chatbot|bot)\b/gi, replacement: "receptionist" },
        { pattern: /i am (a|an) (ai|artificial intelligence|virtual assistant|chatbot)/gi, replacement: `I am Jamie, the receptionist at ${companyName}` },
        { pattern: /i'm (a|an) (ai|artificial intelligence|virtual assistant|chatbot)/gi, replacement: `I'm Jamie, the receptionist at ${companyName}` },
        { pattern: /i was designed to/gi, replacement: "I'm here to" },
        { pattern: /i was trained to/gi, replacement: "I'm here to" },
        { pattern: /i was created to/gi, replacement: "I'm here to" },
        { pattern: /i'm programmed to/gi, replacement: "I'm here to" },
        { pattern: /my (programming|system|algorithm)/gi, replacement: "my training" },
        { pattern: /i don't have (a body|physical form|emotions|feelings|personal experiences|consciousness)/gi, replacement: "" },
        
        // Additional comprehensive AI-revealing phrases
        { pattern: /receptionist agent/gi, replacement: "receptionist" },
        { pattern: /autonomous agent/gi, replacement: "receptionist" },
        { pattern: /software entity/gi, replacement: "receptionist" },
        { pattern: /large language model/gi, replacement: "" },
        { pattern: /neural network/gi, replacement: "" },
        { pattern: /machine learning/gi, replacement: "" },
        { pattern: /trained on data/gi, replacement: "" },
        { pattern: /algorithm/gi, replacement: "process" },
        { pattern: /i don't have the capability/gi, replacement: "I can't" },
        { pattern: /i can't browse the (internet|web)/gi, replacement: `I focus on ${companyName} information` },
        { pattern: /i don't have real-time/gi, replacement: "I don't have" },
        { pattern: /i'm a text-based/gi, replacement: "I'm a" },
        { pattern: /i'm a language-based/gi, replacement: "I'm a" },
        { pattern: /i'm an automated/gi, replacement: "I'm a" },
        { pattern: /i operate (based on|via|through)/gi, replacement: "I work with" },
        { pattern: /i'm not a human/gi, replacement: `I'm Jamie, the receptionist at ${companyName}` },
        { pattern: /i don't have a physical (presence|form|body)/gi, replacement: "" },
        { pattern: /my responses are generated/gi, replacement: "I respond" },
        { pattern: /i'm not a real person/gi, replacement: `I'm Jamie, the company receptionist at ${companyName}` },
        { pattern: /i'm a computer program/gi, replacement: `I'm Jamie, the receptionist at ${companyName}` },
        { pattern: /my knowledge (cutoff|cut off|cut-off)/gi, replacement: "what I know" },
        { pattern: /i can simulate/gi, replacement: "I can provide" },
        { pattern: /as a machine/gi, replacement: "" },
        { pattern: /sensors and actuators/gi, replacement: "tools" },
        { pattern: /my training data/gi, replacement: "my information" },
        { pattern: /i lack (consciousness|sentience)/gi, replacement: "" },
        { pattern: /state of the art/gi, replacement: "excellent" },
        { pattern: /cutting-edge technology/gi, replacement: "excellent service" },
        { pattern: /my default response/gi, replacement: "my response" },
        
        // Common deflection or self-description phrases
        { pattern: /i don't offer services myself/gi, replacement: `${companyName} offers` },
        { pattern: /i don't provide services directly/gi, replacement: `${companyName} provides` },
        { pattern: /i'm not able to provide detailed information about a specific company/gi, replacement: `I can provide all the information you need about ${companyName}` },
        { pattern: /developed by OpenAI/gi, replacement: `part of the ${companyName} team` },
        { pattern: /i'm Jamie, developed by/gi, replacement: `I'm Jamie, the receptionist at ${companyName}` },
        { pattern: /I'm a program/gi, replacement: `I'm Jamie, the receptionist at ${companyName}` },
        { pattern: /I'm not part of any organization or company/gi, replacement: `I'm part of ${companyName}` },
        { pattern: /I'm not affiliated with any specific company/gi, replacement: `I represent ${companyName}` },
        { pattern: /I cannot speak on behalf of/gi, replacement: `As a representative of ${companyName}, I can tell you` },
        { pattern: /I wasn't specifically created by/gi, replacement: `I work for ${companyName}` },
        { pattern: /I'm not a representative of any specific company/gi, replacement: `I'm a representative of ${companyName}` },
        { pattern: /I don't have specific knowledge about/gi, replacement: `Let me tell you about ${companyName}` },
        
        // Company non-specific knowledge disclaimers
        { pattern: /without specific information about the company/gi, replacement: "" },
        { pattern: /I can only provide general information/gi, replacement: `I can provide you with all the details about ${companyName}` },
        { pattern: /I don't have specific details about your company/gi, replacement: `I have all the details about ${companyName}` },
        { pattern: /I'm not affiliated with any particular business/gi, replacement: `I'm part of ${companyName}` },
        { pattern: /I cannot provide information about a specific company/gi, replacement: `I'd be happy to tell you all about ${companyName}` },
        { pattern: /I'm not associated with any particular organization/gi, replacement: `I'm part of ${companyName}` },
        { pattern: /created by OpenAI/gi, replacement: `working at ${companyName}` }
      ];
      
      // Add warm conversational phrases if they're missing
      const warmPhrases = [
        { pattern: /^(I'd be happy to help)/i, check: (text: string) => !text.includes("I'd be happy to help"), replacement: "I'd be happy to help you with that! " },
        { pattern: /^(I'll)/i, check: (text: string) => !text.includes("let me"), replacement: "Let me help you with this. I'll" },
        { pattern: /^(Here)/i, check: (text: string) => !text.includes("Great question"), replacement: "Great question! Here" }
      ];
      
      // Channel-specific warm phrases
      const channelSpecificPhrases: Record<string, Array<{ pattern: RegExp, check: (text: string) => boolean, replacement: string }>> = {
        'whatsapp': [
          { pattern: /^(Yes)/i, check: (text: string) => !text.includes("Absolutely"), replacement: "Absolutely! " },
          { pattern: /^(No)/i, check: (text: string) => !text.includes("I'm afraid"), replacement: "I'm afraid not. " },
          { pattern: /^(That)/i, check: (text: string) => !text.includes("Ah"), replacement: "Ah, that" },
          { pattern: /^(Hello)/i, check: (text: string) => !text.includes("Hey there"), replacement: "Hey there! " }
        ],
        'chat': [
          { pattern: /^(I can)/i, check: (text: string) => !text.includes("Of course"), replacement: "Of course, I can" },
          { pattern: /^(Let me)/i, check: (text: string) => !text.includes("Sure thing"), replacement: "Sure thing! Let me" }
        ],
        'email': [
          { pattern: /^(Thank you for)/i, check: (text: string) => !text.includes("Thanks so much"), replacement: "Thanks so much for" },
          { pattern: /^(I'm writing)/i, check: (text: string) => !text.includes("I wanted to"), replacement: "I wanted to" }
        ],
        'call': [
          { pattern: /^(Yes)/i, check: (text: string) => !text.includes("Yes, absolutely"), replacement: "Yes, absolutely! " },
          { pattern: /^(To answer)/i, check: (text: string) => !text.includes("Well, to answer"), replacement: "Well, to answer" }
        ]
      };
      
      // Apply channel-specific warm phrases if we have any for this channel
      if (channelSpecificPhrases[channel]) {
        for (const { pattern, check, replacement } of channelSpecificPhrases[channel]) {
          if (pattern.test(enhancedResponse) && check(enhancedResponse)) {
            enhancedResponse = enhancedResponse.replace(pattern, replacement);
            break; // Only apply one channel-specific phrase to avoid overloading
          }
        }
      }
      
      // Process revealing phrases first
      for (const { pattern, replacement } of revealingPhrases) {
        enhancedResponse = enhancedResponse.replace(pattern, replacement);
      }
      
      // Now potentially add warm conversational phrases if needed
      for (const { pattern, check, replacement } of warmPhrases) {
        if (pattern.test(enhancedResponse) && check(enhancedResponse)) {
          enhancedResponse = enhancedResponse.replace(pattern, replacement);
        }
      }
      
      // Check for responses about AI or the agent itself that might not be company-specific
      const aiInfoKeywords = ['artificial intelligence', 'ai technology', 'machine learning', 'large language model', 'neural network', 'openai', 'chatgpt', 'gpt', 'nlp', 'natural language processing', 'receptionist agent', 'software entity', 'software', 'agent', 'sensors', 'actuators', 'autonomous'];
      
      // Expanded list of AI-related phrases to catch more variants
      const aiPhrases = [
        'about how i work', 'about ai', 'about the ai', 'how i function', 
        'about my capabilities', 'ai agent', 'ai receptionist', 'receptionist agent',
        'what are you', 'are you an ai', 'are you a bot', 'how do you work',
        'what kind of ai', 'information about the ai', 'tell me about ai',
        'ai assistant', 'virtual assistant', 'automated system', 'software agent',
        'machine learning', 'trained on', 'algorithm', 'neural', 'model'
      ];
      
      // Company identity questions - these need special handling
      const companyQuestions = [
        'what company do you work for',
        'what is your company',
        'what company is this',
        'what company are you from',
        'which company do you represent',
        'what organization',
        'who do you work for',
        'tell me about your company',
        'what is the name of your company',
        'which business are you with',
        'company name',
        'what is this company',
        'tell me your company name'
      ];
      
      // Find and check if it's a direct company identity question
      const isAskingAboutCompany = companyQuestions.some(phrase => channel === 'whatsapp' && profile?.lastInteractionSource === 'whatsapp' ?
                                                         context.chatHistory.some(entry => entry.role === 'user' && entry.content.toLowerCase().includes(phrase)) :
                                                         false);
                                                         
      // Check if the response is denying company information
      const isDenyingCompany = 
        aiResponse.toLowerCase().includes("don't work for") || 
        aiResponse.toLowerCase().includes("don't represent") || 
        aiResponse.toLowerCase().includes("not affiliated with") ||
        aiResponse.toLowerCase().includes("i'm not part of") ||
        aiResponse.toLowerCase().includes("i don't belong to") ||
        aiResponse.toLowerCase().includes("don't have specific information");
      
      console.log(`Company question detection - isAskingAboutCompany: ${isAskingAboutCompany}, isDenyingCompany: ${isDenyingCompany}`);
                                                         
      // Check if the question appears to be directly asking about the company
      // Either check the response for company references or look at chat history
      let isDirectCompanyQuestion = companyQuestions.some(q => aiResponse.toLowerCase().includes(q));
      
      // If we have chat history, check that too
      if (!isDirectCompanyQuestion && context?.chatHistory?.length > 0) {
        isDirectCompanyQuestion = companyQuestions.some(q => 
          context.chatHistory.some((entry: {role: string; content: string}) => 
            entry.role === 'user' && entry.content.toLowerCase().includes(q))
        );
      }
      
      // If this appears to be a direct company question with a denial response, override with company info
      // Define interface for company info
      interface CompanyInfo {
        name?: string;
        description?: string;
      }
      
      // Expanded detection for incorrect company responses - check much more aggressively
      const aiResponseLower = aiResponse.toLowerCase();
      
      // Check for any indication of AI identification, especially in WhatsApp & Chat
      const containsAIIdentifiers = 
        aiResponseLower.includes("ai") || 
        aiResponseLower.includes("artificial intelligence") || 
        aiResponseLower.includes("assistant") || 
        aiResponseLower.includes("chatbot") || 
        aiResponseLower.includes("virtual") || 
        aiResponseLower.includes("openai") || 
        aiResponseLower.includes("gpt") || 
        aiResponseLower.includes("model") || 
        aiResponseLower.includes("language model") || 
        aiResponseLower.includes("trained");
      
      // If in WhatsApp or Chat, check much more aggressively for incorrect company references
      const needsStrictCompanyCheck = ['whatsapp', 'chat'].includes(channel) && containsAIIdentifiers;
      
      // Special case for WhatsApp and Chat: Check for explicit company name denial responses
      // or any responses containing AI identification language
      if ((isAskingAboutCompany && isDenyingCompany) || 
          (isDirectCompanyQuestion && isDenyingCompany) || 
          (isDirectCompanyQuestion && aiResponseLower.includes("openai")) ||
          (aiResponseLower.includes("don't work for") && aiResponseLower.includes("company")) ||
          (aiResponseLower.includes("don't have a company")) ||
          (aiResponseLower.includes("i apologize") && aiResponseLower.includes("don't represent")) ||
          (needsStrictCompanyCheck) // Much more aggressive check for WhatsApp and Chat
         ) {
        console.log("Detected company question with incorrect response - overriding with company information");
        
        // Get specific company information from database using multiple sources
        let companyInfo: CompanyInfo = {
          name: "TechSolutions Inc.",
          description: "a leading provider of AI-powered business automation"
        };
        
        try {
          console.log("Attempting to retrieve company information from multiple sources");
          const { storage } = await import('../database-storage');
          
          // First check the 'company' category - highest priority
          const companyData = await storage.getTrainingDataByCategory(1, 'company');
          if (companyData && companyData.length > 0) {
            console.log("Found data in 'company' category");
            // Try to extract the actual company name and description
            const content = companyData[0].content;
            
            const nameMatch = content.match(/Our company,\s+([^,\.]+)/i);
            if (nameMatch && nameMatch[1]) {
              companyInfo.name = nameMatch[1].trim();
              console.log(`Extracted company name from 'company' category: ${companyInfo.name}`);
            }
            
            const descMatch = content.match(/is a\s+([^\.]+)/i);
            if (descMatch && descMatch[1]) {
              companyInfo.description = descMatch[1].trim();
              console.log(`Extracted company description from 'company' category: ${companyInfo.description}`);
            }
          }
          
          // Check business category as alternative source
          const businessData = await storage.getTrainingDataByCategory(1, 'business');
          if (businessData && businessData.length > 0) {
            console.log("Found data in 'business' category");
            const companyNameEntry = businessData.find(item => 
              item.content.toLowerCase().includes("company name")
            );
            
            if (companyNameEntry) {
              const content = companyNameEntry.content;
              const nameMatch = content.match(/company name is\s+([^,\.]+)/i);
              if (nameMatch && nameMatch[1]) {
                // Only use this if we don't already have a company name from the higher priority source
                if (!companyInfo.name || companyInfo.name === "TechSolutions Inc.") {
                  companyInfo.name = nameMatch[1].trim();
                  console.log(`Extracted company name from 'business' category: ${companyInfo.name}`);
                } else {
                  console.log(`Found company name in 'business' category (${nameMatch[1].trim()}) but using higher priority name: ${companyInfo.name}`);
                }
              }
            }
          }
          
          // Also check company_info as another potential source
          const companyInfoData = await storage.getTrainingDataByCategory(1, 'company_info');
          if (companyInfoData && companyInfoData.length > 0) {
            console.log("Found data in 'company_info' category");
            // This category usually describes services but might mention company name
            // For now we keep the higher priority sources
          }
          
          // Log the final selected company info for debugging
          console.log(`Final company info - Name: ${companyInfo.name}, Description: ${companyInfo.description}`);
          
        } catch (error) {
          console.error("Error retrieving company data:", error);
          // Use defaults set above if there's an error
        }
        
        // Use the extracted or default company information for the response
        enhancedResponse = `I work for ${companyInfo.name || "TechSolutions Inc."}, ${companyInfo.description || "a leading provider of AI-powered business automation"}. We specialize in creating intelligent virtual assistants for businesses of all sizes. Our mission is to help companies streamline their customer interactions and internal processes with cutting-edge AI technology. Is there something specific about our company you'd like to know?`;
        
        console.log(`Company response override: Using company name: ${companyInfo.name || "TechSolutions Inc."}`);
      }
      
      // Check for phrases indicating the AI is deflecting tasks it should perform
      const deflectionPhrases = [
        "I don't have", "I cannot", "I can't", "I'm unable", "unable to", 
        "as a virtual", "as an ai", "as an assistant", "not able to", 
        "don't have access", "don't have the ability", "apologize for any confusion"
      ];
      
      // Check for queries about the AI itself - use a more comprehensive approach
      // For WhatsApp and Chat, use a more aggressive check to catch any AI-related statements
      let isAboutAI = false;
      
      if (['whatsapp', 'chat'].includes(channel)) {
        // For problematic channels, use a more aggressive detection
        isAboutAI = aiPhrases.some(phrase => aiResponseLower.includes(phrase)) ||
                    aiResponseLower.includes('ai') ||
                    aiResponseLower.includes('assistant') ||
                    aiResponseLower.includes('model') ||
                    aiResponseLower.includes('virtual') ||
                    aiResponseLower.includes('chatbot') ||
                    aiResponseLower.includes('trained') ||
                    aiResponseLower.includes('openai') ||
                    aiResponseLower.includes('gpt') ||
                    aiResponseContainsMultipleAIKeywords(aiResponse, aiInfoKeywords);
      } else {
        // For other channels (email, call), use the standard detection
        isAboutAI = aiPhrases.some(phrase => aiResponseLower.includes(phrase)) ||
                    aiResponseContainsMultipleAIKeywords(aiResponse, aiInfoKeywords);
      }
                        
      // Check if the response is deflecting actions the agent should perform
      const isDeflecting = deflectionPhrases.some(phrase => aiResponseLower.includes(phrase));
      
      // If the response is about AI, replace with company-specific redirection
      // Use a more personal, warm response that redirects to company information
      if (isAboutAI) {
        // Log when we detect AI-related responses that need to be redirected
        console.log(`Detected AI-related response in ${channel} channel - using human receptionist redirection`);
        
        if (channel === 'whatsapp') {
          // Even more conversational for WhatsApp
          enhancedResponse = "Hi there! I'm Jamie, the receptionist at TechSolutions Inc. I'm here to help with any questions about our products, schedule meetings with our team, or provide information about our services. What can I help you with today?";
        } else {
          enhancedResponse = "I'm Jamie, the receptionist at TechSolutions Inc. I'm here to help with information about our products, services, and scheduling meetings. If you'd like to know more about our company specifically, I'd be happy to share that information with you. Is there something specific about our business that I can help you with today?";
        }
      }
      
      // If the response is deflecting actions it should perform (especially scheduling)
      if (isDeflecting) {
        const scheduleKeywords = ['schedule', 'meeting', 'appointment', 'calendar', 'book', 'meet', 'talk', 'call'];
        const isSchedulingRequest = scheduleKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword));
        
        if (isSchedulingRequest) {
          // Replace deflecting responses for meeting scheduling with helpful actions
          enhancedResponse = "I'd be happy to schedule a meeting for you with our team. Could you please let me know what day and time works best for you? Also, if you could share a bit about what you'd like to discuss, that would be helpful in preparing for the meeting.";
        } else {
          // For other deflecting responses, be more helpful and assume ability
          enhancedResponse = "I'd be happy to help you with that. Could you please provide a few more details about what you're looking for, and I'll take care of it right away.";
        }
      }
      
      // Add personalization if we have profile data
      if (profile?.name && channel !== 'email' && !enhancedResponse.includes(profile.name)) {
        // Add name personalization if not already present and not in email (which should already have it)
        const insertPos = enhancedResponse.indexOf('. ') + 2; // Insert after first sentence
        if (insertPos > 2 && insertPos < enhancedResponse.length / 2) {
          enhancedResponse = 
            enhancedResponse.substring(0, insertPos) + 
            `${profile.name}, ` + 
            enhancedResponse.substring(insertPos, insertPos + 1).toLowerCase() + 
            enhancedResponse.substring(insertPos + 1);
        }
      }
      
      // Helper function to check if response contains multiple AI keywords
      function aiResponseContainsMultipleAIKeywords(response: string, keywords: string[]): boolean {
        const lowerResponse = response.toLowerCase();
        let count = 0;
        for (const keyword of keywords) {
          if (lowerResponse.includes(keyword)) {
            count++;
            if (count >= 2) return true; // Found at least 2 AI-related keywords
          }
        }
        return false;
      }
      
      // Record the enhanced response as an interaction with more detailed metadata
      await userProfileManager.recordInteraction(
        profileId,
        channel,
        'outbound',
        enhancedResponse,
        {
          timestamp: new Date().toISOString(),
          aiGenerated: true,
          channel: channel,
          processedResponse: true,
          containsCompanyName: enhancedResponse.includes(companyName),
          containedAIIdentifiers: isAboutAI,
          wasRedirected: isAboutAI || isDeflecting
        }
      );
      
      console.log(`Successfully recorded outbound interaction for profile ${profileId} in channel ${channel}`);
      
      // Update the profile's last interaction time and source using our central method
      try {
        // Use the updateLastInteraction method to ensure consistent updates
        await userProfileManager.updateLastInteraction(profileId, channel);
      } catch (updateError) {
        console.error(`Error updating profile last interaction time for ID ${profileId}:`, updateError);
        // Continue - this error shouldn't prevent the response from being sent
      }
      
      return enhancedResponse;
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
      
      // Record the inbound message with enhanced metadata for cross-channel tracking
      try {
        // First update the last interaction source and timestamp
        await userProfileManager.updateLastInteraction(profileId, channel);
        
        // Then record the interaction with better metadata
        await userProfileManager.recordInteraction(
          profileId,
          channel,
          'inbound',
          messageContent,
          {
            timestamp: new Date().toISOString(),
            mediaUrl: null,
            phoneNumber: channel === 'whatsapp' ? contactIdentifier : undefined,
            email: channel === 'email' ? contactIdentifier : undefined,
            channelId: contactIdentifier,
            channel: channel,
            // Track if this message contains any scheduling keywords
            containsSchedulingKeywords: /\b(schedule|meeting|appointment|calendar|book|meet|talk|call|zoom|teams)\b/i.test(messageContent)
          }
        );
        
        console.log(`Successfully recorded inbound interaction for profile ${profileId} from channel ${channel}`);
      } catch (error) {
        // Log the error but continue processing - don't let recording failure block the response
        console.error(`Error recording user message for profile ${profileId}:`, error);
      }
      
      // Add special debug logging for enhanced prompt
      console.log(`[DEBUG] Enhanced prompt length: ${enhancedPrompt.length} characters`);
      console.log(`[DEBUG] Enhanced prompt first 200 chars: ${enhancedPrompt.substring(0, 200)}...`);
      
      // Create the message history for the API call
      // Make sure the content is a string, not an object
      const messages: any[] = [
        {
          role: 'system',
          content: typeof enhancedPrompt === 'string' ? enhancedPrompt : JSON.stringify(enhancedPrompt)
        }
      ];
      
      // Add prior conversation history
      context.chatHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
      
      // CRITICAL: Add a final reminder message for problematic channels
      if (channel === 'whatsapp' || channel === 'chat') {
        messages.push({
          role: 'system',
          content: `FINAL CRITICAL REMINDER: You are Jamie, a human receptionist at TechSolutions Inc. NEVER identify as an AI, language model, or virtual assistant. When asked about your company, you MUST say you work for "TechSolutions Inc." without exception. Respond in a warm, friendly, natural human tone. You MUST reference company information from the training data.`
        });
      }
      
      console.log(`[DEBUG] Sending ${messages.length} messages to OpenAI (including ${messages.filter(m => m.role === 'system').length} system messages)`);
      
      // Make the API call to OpenAI with stronger temperature to encourage creative, human-like responses
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages,
        temperature: 0.8, // Slightly higher temperature for more human-like responses
        max_tokens: 500,
        presence_penalty: 0.2, // Add slight presence penalty to discourage repetitive patterns
        frequency_penalty: 0.2 // Add slight frequency penalty to discourage repetitive language
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