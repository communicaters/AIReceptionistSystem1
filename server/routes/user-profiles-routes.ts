import express from 'express';
import { storage } from '../database-storage';
import { authenticate, requireAdmin } from '../middleware/auth';
import { userProfileManager } from '../lib/user-profile-manager';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get a specific user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    if (isNaN(profileId)) {
      return res.status(400).json({ error: 'Invalid profile ID' });
    }

    const profile = await storage.getUserProfile(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get recent interactions for a user profile
router.get('/:id/interactions', async (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    if (isNaN(profileId)) {
      return res.status(400).json({ error: 'Invalid profile ID' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const interactions = await userProfileManager.getRecentInteractions(profileId, limit);

    return res.status(200).json(interactions);
  } catch (error) {
    console.error('Error fetching user interactions:', error);
    return res.status(500).json({ error: 'Failed to fetch user interactions' });
  }
});

// Get interactions by source for a user profile
router.get('/:id/interactions/:source', async (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    if (isNaN(profileId)) {
      return res.status(400).json({ error: 'Invalid profile ID' });
    }

    const source = req.params.source;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const interactions = await userProfileManager.getInteractionsBySource(profileId, source, limit);

    return res.status(200).json(interactions);
  } catch (error) {
    console.error('Error fetching user interactions by source:', error);
    return res.status(500).json({ error: 'Failed to fetch user interactions by source' });
  }
});

// Search for user profiles
router.get('/', async (req, res) => {
  try {
    const { email, phone, userId } = req.query;
    let profiles: any[] = [];

    if (email) {
      const profile = await storage.getUserProfileByEmail(email as string);
      if (profile) profiles.push(profile);
    } else if (phone) {
      const profile = await storage.getUserProfileByPhone(phone as string);
      if (profile) profiles.push(profile);
    } else if (userId) {
      const id = parseInt(userId as string);
      if (!isNaN(id)) {
        profiles = await storage.getUserProfilesByUserId(id);
      }
    } else {
      // Admin only: get all profiles (limited)
      if (req.user.role === 'admin') {
        // Get all profiles is not implemented yet, requiring admin role
        return res.status(400).json({ error: 'Search parameter required (email, phone, or userId)' });
      } else {
        return res.status(400).json({ error: 'Search parameter required (email, phone, or userId)' });
      }
    }

    return res.status(200).json(profiles);
  } catch (error) {
    console.error('Error searching user profiles:', error);
    return res.status(500).json({ error: 'Failed to search user profiles' });
  }
});

// Create a new user profile
router.post('/', requireAdmin, async (req, res) => {
  try {
    const profile = await userProfileManager.findOrCreateProfile(req.body, true);
    return res.status(201).json(profile);
  } catch (error) {
    console.error('Error creating user profile:', error);
    return res.status(500).json({ error: 'Failed to create user profile' });
  }
});

// Update a user profile
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    if (isNaN(profileId)) {
      return res.status(400).json({ error: 'Invalid profile ID' });
    }

    const profile = await userProfileManager.updateProfile(profileId, req.body);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Record a new interaction for a user profile
router.post('/:id/interactions', requireAdmin, async (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    if (isNaN(profileId)) {
      return res.status(400).json({ error: 'Invalid profile ID' });
    }

    const { source, type, content, metadata } = req.body;
    if (!source || !type) {
      return res.status(400).json({ error: 'Source and type are required' });
    }

    const interaction = await userProfileManager.recordInteraction(
      profileId,
      source,
      type,
      content || '',
      metadata || {}
    );

    return res.status(201).json(interaction);
  } catch (error) {
    console.error('Error recording user interaction:', error);
    return res.status(500).json({ error: 'Failed to record user interaction' });
  }
});

export default router;