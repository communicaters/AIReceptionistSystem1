/**
 * User Profile Manager
 * Centralized utility for managing user profiles and interactions across all agents
 */

import { storage } from '../database-storage';
import { 
  UserProfileData, InsertUserProfileData,
  UserInteraction, InsertUserInteraction
} from '@shared/schema';

export interface ProfileSearchParams {
  email?: string;
  phone?: string;
  userId?: number;
}

export class UserProfileManager {
  /**
   * Get a user profile by ID
   * @param profileId The profile ID
   */
  async getProfile(profileId: number): Promise<UserProfileData | null> {
    const profile = await storage.getUserProfile(profileId);
    return profile || null;
  }
  
  /**
   * Create a new user profile
   * @param profileData Data for the new profile
   */
  async createProfile(profileData: Partial<InsertUserProfileData>): Promise<UserProfileData> {
    // Ensure we have the current timestamp for better consistency
    const now = new Date();
    
    const newProfile: InsertUserProfileData = {
      userId: profileData.userId || null,
      name: profileData.name || null,
      email: profileData.email || null,
      phone: profileData.phone || null,
      lastInteractionSource: profileData.lastInteractionSource || null,
      metadata: profileData.metadata || null
      // Default values for timestamps are set at the database level
    };
    
    return await storage.createUserProfile(newProfile);
  }
  
  /**
   * Update a user's last interaction source and seen timestamp
   * This is a critical method for maintaining cross-channel continuity
   * @param profileId The profile ID
   * @param source The communication channel (whatsapp, email, chat, call)
   */
  async updateLastInteraction(profileId: number, source: string): Promise<boolean> {
    try {
      const updates = {
        lastInteractionSource: source,
        lastSeen: new Date()
      };
      
      const updatedProfile = await this.updateProfile(profileId, updates);
      return !!updatedProfile;
    } catch (err) {
      console.error(`Failed to update last interaction for profile ${profileId}:`, err);
      return false;
    }
  }
  
  /**
   * Find a user profile by phone number
   * @param phone The phone number to search for
   */
  async findProfileByPhone(phone: string): Promise<UserProfileData | null> {
    const profile = await storage.getUserProfileByPhone(phone);
    return profile || null;
  }
  
  /**
   * Find a user profile by email address
   * @param email The email address to search for
   */
  async findProfileByEmail(email: string): Promise<UserProfileData | null> {
    const profile = await storage.getUserProfileByEmail(email);
    return profile || null;
  }
  
  /**
   * Find a user profile by any identifier
   * @param identifier The email, phone, or other identifier to search for
   */
  async findProfileByAny(identifier: string): Promise<UserProfileData | null> {
    // Try email
    let profile = await this.findProfileByEmail(identifier);
    if (profile) return profile;
    
    // Try phone
    profile = await this.findProfileByPhone(identifier);
    if (profile) return profile;
    
    // Try user ID if numeric
    if (/^\d+$/.test(identifier)) {
      const userId = parseInt(identifier, 10);
      const profiles = await storage.getUserProfilesByUserId(userId);
      if (profiles.length > 0) {
        return profiles[0];
      }
    }
    
    return null;
  }
  
  /**
   * Find or create a user profile based on contact information
   * @param params Search parameters (email, phone, etc.)
   * @param createIfNotExists Whether to create a new profile if none is found
   * @returns The user profile or null if not found and not creating
   */
  async findOrCreateProfile(
    params: ProfileSearchParams,
    createIfNotExists: boolean = true
  ): Promise<UserProfileData | null> {
    let profile: UserProfileData | undefined;

    // Search by different identifiers
    if (params.email) {
      profile = await storage.getUserProfileByEmail(params.email);
      if (profile) return profile;
    }

    if (params.phone) {
      profile = await storage.getUserProfileByPhone(params.phone);
      if (profile) return profile;
    }

    if (params.userId) {
      const profiles = await storage.getUserProfilesByUserId(params.userId);
      if (profiles.length > 0) {
        // Return the most recently seen profile for this user
        return profiles[0];
      }
    }

    // Create new profile if requested
    if (createIfNotExists) {
      const newProfile: InsertUserProfileData = {
        userId: params.userId || null,
        email: params.email || null,
        phone: params.phone || null,
        // Default values for timestamps are set at the database level
      };

      return await storage.createUserProfile(newProfile);
    }

    return null;
  }

  /**
   * Update an existing user profile with new information
   * @param profileId The ID of the profile to update
   * @param updates The fields to update
   */
  async updateProfile(
    profileId: number, 
    updates: Partial<InsertUserProfileData & { lastSeen?: Date }>
  ): Promise<UserProfileData | null> {
    const profile = await storage.getUserProfile(profileId);
    if (!profile) return null;

    // Create update object with only fields that are part of UserProfileData
    const updatesWithTimestamps = {
      ...updates,
      updatedAt: new Date()
    };
    
    // Only add lastSeen if explicitly provided or if not updating it specifically
    if (!('lastSeen' in updates)) {
      updatesWithTimestamps.lastSeen = new Date();
    }

    const updatedProfile = await storage.updateUserProfile(profileId, updatesWithTimestamps);

    return updatedProfile || null;
  }

  /**
   * Record a new interaction with a user
   * @param profileId The user profile ID
   * @param source The source of the interaction (email, chat, call, whatsapp)
   * @param type The type of interaction (inbound, outbound, etc.)
   * @param content The content of the interaction
   * @param metadata Additional metadata about the interaction
   */
  async recordInteraction(
    profileId: number,
    source: string,
    type: string,
    content: string,
    metadata: any = {}
  ): Promise<UserInteraction | null> {
    try {
      const interaction: InsertUserInteraction = {
        userProfileId: profileId,
        interactionSource: source,
        interactionType: type,
        content,
        metadata
        // timestamp is set automatically by the database
      };

      return await storage.createUserInteraction(interaction);
    } catch (err) {
      console.error('Failed to record user interaction:', err);
      return null;
    }
  }

  /**
   * Get recent interactions for a user profile
   * @param profileId The user profile ID
   * @param limit Maximum number of interactions to retrieve
   */
  async getRecentInteractions(
    profileId: number,
    limit: number = 10
  ): Promise<UserInteraction[]> {
    return await storage.getUserInteractionsByProfileId(profileId, limit);
  }

  /**
   * Get interactions of a specific source for a user profile
   * @param profileId The user profile ID
   * @param source The source of interactions to retrieve
   * @param limit Maximum number of interactions to retrieve
   */
  async getInteractionsBySource(
    profileId: number,
    source: string,
    limit: number = 10
  ): Promise<UserInteraction[]> {
    return await storage.getUserInteractionsBySource(profileId, source, limit);
  }
  
  /**
   * Get all interactions across all channels for a user profile
   * This is crucial for creating unified conversation history
   * @param profileId The user profile ID
   * @param limit Maximum number of interactions to retrieve per channel
   */
  async getAllChannelInteractions(
    profileId: number,
    limit: number = 10
  ): Promise<{ [key: string]: UserInteraction[] }> {
    try {
      // Get all recent interactions first
      const allInteractions = await storage.getUserInteractionsByProfileId(profileId, limit * 4);
      
      // Group by channel/source
      const channelInteractions: { [key: string]: UserInteraction[] } = {
        whatsapp: [],
        email: [],
        chat: [],
        call: []
      };
      
      // Sort interactions into channels
      allInteractions.forEach(interaction => {
        const source = interaction.interactionSource?.toLowerCase();
        if (source && channelInteractions[source]) {
          // Only add up to the limit per channel
          if (channelInteractions[source].length < limit) {
            channelInteractions[source].push(interaction);
          }
        }
      });
      
      return channelInteractions;
    } catch (err) {
      console.error(`Error retrieving all channel interactions for profile ${profileId}:`, err);
      return { whatsapp: [], email: [], chat: [], call: [] };
    }
  }
  
  /**
   * Get unified conversation history in a format suitable for AI context
   * @param profileId The user profile ID 
   * @param limit Maximum number of messages to include
   */
  async getUnifiedConversationHistory(
    profileId: number,
    limit: number = 10
  ): Promise<Array<{ role: string; content: string; timestamp: Date; source: string }>> {
    try {
      // Get recent interactions across all channels
      const interactions = await storage.getUserInteractionsByProfileId(profileId, limit);
      
      // Format into a conversation history array
      const history = interactions.map(interaction => ({
        role: interaction.interactionType === 'inbound' ? 'user' : 'assistant',
        content: interaction.content || '',
        timestamp: interaction.timestamp || new Date(),
        source: interaction.interactionSource || 'unknown'
      }));
      
      // Sort by timestamp, newest last
      return history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (err) {
      console.error(`Error creating unified conversation history for profile ${profileId}:`, err);
      return [];
    }
  }

  /**
   * Merge two user profiles into one
   * @param sourceProfileId Profile to merge from
   * @param targetProfileId Profile to merge into
   */
  async mergeProfiles(
    sourceProfileId: number,
    targetProfileId: number
  ): Promise<UserProfileData | null> {
    try {
      const mergedProfile = await storage.mergeUserProfiles(sourceProfileId, targetProfileId);
      return mergedProfile;
    } catch (err) {
      console.error('Failed to merge user profiles:', err);
      return null;
    }
  }
}

// Export a singleton instance
export const userProfileManager = new UserProfileManager();