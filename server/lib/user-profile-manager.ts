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
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSeen: new Date()
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
        metadata,
        timestamp: new Date()
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