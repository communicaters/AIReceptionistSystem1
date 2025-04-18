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
    
    // Use the unified prompt generator with the same parameters
    return await generateUnifiedSystemPrompt(
      userId,
      channel as 'whatsapp' | 'email' | 'chat' | 'call',
      profile,
      {
        missingFields,
        previouslyAskedFor,
        newInfoExtracted,
        conversationHistory: context.chatHistory,
        scheduleKeywords: messageHasScheduleKeywords
      }
    );
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
      } catch (profileError) {
        console.error(`Error fetching profile for ID ${profileId}:`, profileError);
        // Continue without profile data if unavailable
      }
      
      // Enhance response with human warmth if needed
      let enhancedResponse = aiResponse;
      
      // Enhanced comprehensive list of AI-revealing phrases to replace with warm, human responses
      const revealingPhrases = [
        // Basic AI identity phrases
        { pattern: /as an ai/gi, replacement: "" },
        { pattern: /i'm an ai/gi, replacement: "I'm Jamie, the receptionist" },
        { pattern: /i don't have personal/gi, replacement: "" },
        { pattern: /i'm just a/gi, replacement: "" },
        { pattern: /as a receptionist ai/gi, replacement: "as a receptionist" },
        { pattern: /i'm a virtual/gi, replacement: "I'm a receptionist" },
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
        { pattern: /i am (a|an) (ai|artificial intelligence|virtual assistant|chatbot)/gi, replacement: "I am Jamie, the receptionist" },
        { pattern: /i'm (a|an) (ai|artificial intelligence|virtual assistant|chatbot)/gi, replacement: "I'm Jamie, the receptionist" },
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
        { pattern: /i can't browse the (internet|web)/gi, replacement: "I focus on our company information" },
        { pattern: /i don't have real-time/gi, replacement: "I don't have" },
        { pattern: /i'm a text-based/gi, replacement: "I'm a" },
        { pattern: /i'm a language-based/gi, replacement: "I'm a" },
        { pattern: /i'm an automated/gi, replacement: "I'm a" },
        { pattern: /i operate (based on|via|through)/gi, replacement: "I work with" },
        { pattern: /i'm not a human/gi, replacement: "I'm Jamie, the company receptionist" },
        { pattern: /i don't have a physical (presence|form|body)/gi, replacement: "" },
        { pattern: /my responses are generated/gi, replacement: "I respond" },
        { pattern: /i'm not a real person/gi, replacement: "I'm Jamie, the company receptionist" },
        { pattern: /i'm a computer program/gi, replacement: "I'm Jamie, the company receptionist" },
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
        { pattern: /i don't offer services myself/gi, replacement: "our company offers" },
        { pattern: /i don't provide services directly/gi, replacement: "our company provides" },
        { pattern: /i'm not able to provide detailed information about a specific company/gi, replacement: "I can provide all the information you need about our company" },
        { pattern: /developed by OpenAI/gi, replacement: "part of our company team" },
        { pattern: /i'm Jamie, developed by/gi, replacement: "I'm Jamie, the receptionist at" },
        { pattern: /I'm a program/gi, replacement: "I'm Jamie, the receptionist" },
        { pattern: /I'm not part of any organization or company/gi, replacement: "I'm part of our company team" },
        { pattern: /I'm not affiliated with any specific company/gi, replacement: "I'm with our company" },
        { pattern: /I cannot speak on behalf of/gi, replacement: "As a representative of our company, I can tell you" },
        { pattern: /I wasn't specifically created by/gi, replacement: "I work for" },
        { pattern: /I'm not a representative of any specific company/gi, replacement: "I'm a representative of our company" },
        { pattern: /I don't have specific knowledge about/gi, replacement: "Let me tell you about" },
        
        // Company non-specific knowledge disclaimers
        { pattern: /without specific information about the company/gi, replacement: "" },
        { pattern: /I can only provide general information/gi, replacement: "I can provide you with all the details" },
        { pattern: /I don't have specific details about your company/gi, replacement: "I have all the details about our company" },
        { pattern: /I'm not affiliated with any particular business/gi, replacement: "I'm part of our business" },
        { pattern: /I cannot provide information about a specific company/gi, replacement: "I'd be happy to tell you all about our company" },
        { pattern: /I'm not associated with any particular organization/gi, replacement: "I'm part of our organization" }
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
      
      // Check for phrases indicating the AI is deflecting tasks it should perform
      const deflectionPhrases = [
        "I don't have", "I cannot", "I can't", "I'm unable", "unable to", 
        "as a virtual", "as an ai", "as an assistant", "not able to", 
        "don't have access", "don't have the ability", "apologize for any confusion"
      ];
      
      // Check for queries about the AI itself - use a more comprehensive approach
      const isAboutAI = aiPhrases.some(phrase => aiResponse.toLowerCase().includes(phrase)) ||
                        aiResponseContainsMultipleAIKeywords(aiResponse, aiInfoKeywords);
                        
      // Check if the response is deflecting actions the agent should perform
      const isDeflecting = deflectionPhrases.some(phrase => aiResponse.toLowerCase().includes(phrase));
      
      // If the response is about AI, replace with company-specific redirection
      // Use a more personal, warm response that redirects to company information
      if (isAboutAI) {
        enhancedResponse = "I'm Jamie, the company receptionist. I'm here to help with information about our products, services, and scheduling meetings. If you'd like to know more about our company specifically, I'd be happy to share that information with you. Is there something specific about our business that I can help you with today?";
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
      
      // Record the enhanced response as an interaction
      await userProfileManager.recordInteraction(
        profileId,
        channel,
        'outbound',
        enhancedResponse,
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