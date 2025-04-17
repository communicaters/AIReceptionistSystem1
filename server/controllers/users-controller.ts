import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { encrypt } from '../lib/encryption';
import { insertUserSchema } from '@shared/schema';

// Update user schema (admin)
const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin', 'manager']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

// Update user profile schema (self)
const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // If changing password, require current password
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  // If changing password, require confirmation
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Invalid password combination",
  path: ["confirmPassword"],
});

export const usersController = {
  // Get all users (admin only)
  async getAllUsers(req: Request, res: Response) {
    try {
      // Only admin can access this
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const users = await storage.getAllUsers();
      
      // Remove sensitive data
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      }));
      
      return res.status(200).json({ users: safeUsers });
    } catch (error) {
      console.error('Get all users error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Get user by ID (admin only or self)
  async getUserById(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      
      // Check permissions (admin can access any user, others can only access themselves)
      if (req.user?.role !== 'admin' && req.user?.id !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get user packages
      const userPackages = await storage.getUserPackagesByUserId(userId);
      
      // Get user's active subscription details if any
      const activeUserPackage = await storage.getActiveUserPackage(userId);
      let packageDetails = null;
      let features = [];
      
      if (activeUserPackage) {
        const packageInfo = await storage.getPackage(activeUserPackage.packageId);
        if (packageInfo) {
          packageDetails = {
            id: packageInfo.id,
            name: packageInfo.name,
            description: packageInfo.description,
            price: packageInfo.price,
            isActive: packageInfo.isActive,
            assignedAt: activeUserPackage.assignedAt,
            expiresAt: activeUserPackage.expiresAt,
          };
          
          // Get package features
          const packageFeatures = await storage.getPackageFeaturesByPackageId(packageInfo.id);
          features = packageFeatures.map(feature => ({
            id: feature.id,
            featureKey: feature.featureKey,
            usageLimit: feature.usageLimit,
            isEnabled: feature.isEnabled,
          }));
        }
      }
      
      // Get login activity
      const loginActivity = await storage.getLoginActivitiesByUserId(userId, 10);
      
      // Get feature usage summary
      const usageSummary = await storage.getFeatureUsageSummary(userId, 'month');
      
      // Remove sensitive data
      const safeUser = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        subscription: packageDetails,
        features,
        loginActivity,
        usageSummary,
      };
      
      return res.status(200).json({ user: safeUser });
    } catch (error) {
      console.error('Get user by ID error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Create user (admin only)
  async createUser(req: Request, res: Response) {
    try {
      // Only admin can create users
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Validate request
      const validatedData = insertUserSchema.parse(req.body);
      const { username, email, password, fullName, role } = validatedData;
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Hash password
      const hashedPassword = await encrypt(password);
      
      // Create user
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        fullName,
        role: role || 'user',
        status: 'active', // Admin-created users are active by default
        emailVerified: true, // Admin-created users are verified by default
      });
      
      // Create system activity log
      await storage.createSystemActivity({
        module: 'User Management',
        event: 'User Created',
        status: 'Completed',
        details: { 
          adminId: req.user.id,
          userId: user.id,
          username: user.username,
        },
        timestamp: new Date(),
      });
      
      return res.status(201).json({ 
        message: 'User created successfully',
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      return res.status(400).json({ message: 'Invalid input', error });
    }
  },
  
  // Update user (admin only)
  async updateUser(req: Request, res: Response) {
    try {
      // Only admin can update other users
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Validate request
      const validatedData = updateUserSchema.parse(req.body);
      
      // Check if username or email already exists if they are being changed
      if (validatedData.username && validatedData.username !== user.username) {
        const existingUsername = await storage.getUserByUsername(validatedData.username);
        if (existingUsername) {
          return res.status(400).json({ message: 'Username already taken' });
        }
      }
      
      if (validatedData.email && validatedData.email !== user.email) {
        const existingEmail = await storage.getUserByEmail(validatedData.email);
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already registered' });
        }
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      // Create system activity log
      await storage.createSystemActivity({
        module: 'User Management',
        event: 'User Updated',
        status: 'Completed',
        details: { 
          adminId: req.user.id,
          userId: updatedUser.id,
          username: updatedUser.username,
          changes: Object.keys(validatedData).join(', '),
        },
        timestamp: new Date(),
      });
      
      return res.status(200).json({ 
        message: 'User updated successfully',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
          emailVerified: updatedUser.emailVerified,
          createdAt: updatedUser.createdAt,
          lastLogin: updatedUser.lastLogin,
        }
      });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(400).json({ message: 'Invalid input', error });
    }
  },
  
  // Update own profile (any authenticated user)
  async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Validate request
      const validatedData = updateProfileSchema.parse(req.body);
      const { fullName, email, currentPassword, newPassword, confirmPassword } = validatedData;
      
      // Get current user
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if email already exists if it's being changed
      if (email && email !== user.email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already registered' });
        }
      }
      
      // Update data to apply
      const updateData: any = {};
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      
      // If changing password, verify current password
      if (newPassword && currentPassword) {
        const isPasswordValid = await storage.verifyPassword(user.id, currentPassword);
        if (!isPasswordValid) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        // Hash new password
        const hashedPassword = await encrypt(newPassword);
        updateData.password = hashedPassword;
      }
      
      // Update user
      const updatedUser = await storage.updateUser(req.user.id, updateData);
      
      return res.status(200).json({ 
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
          emailVerified: updatedUser.emailVerified,
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(400).json({ message: 'Invalid input', error });
    }
  },
  
  // Change user status (admin only)
  async changeUserStatus(req: Request, res: Response) {
    try {
      // Only admin can change user status
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const userId = parseInt(req.params.id);
      const { status } = req.body;
      
      // Validate status
      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Can't change status of admin users (except own account)
      if (user.role === 'admin' && user.id !== req.user.id) {
        return res.status(403).json({ message: 'Cannot change status of admin users' });
      }
      
      // Update user status
      const updatedUser = await storage.updateUserStatus(userId, status);
      
      // Create system activity log
      await storage.createSystemActivity({
        module: 'User Management',
        event: 'User Status Changed',
        status: 'Completed',
        details: { 
          adminId: req.user.id,
          userId,
          previousStatus: user.status,
          newStatus: status,
        },
        timestamp: new Date(),
      });
      
      return res.status(200).json({ 
        message: 'User status updated successfully',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          status: updatedUser.status,
        }
      });
    } catch (error) {
      console.error('Change user status error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Delete user (admin only)
  async deleteUser(req: Request, res: Response) {
    try {
      // Only admin can delete users
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const userId = parseInt(req.params.id);
      
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Can't delete admin users (except own account)
      if (user.role === 'admin' && user.id !== req.user.id) {
        return res.status(403).json({ message: 'Cannot delete admin users' });
      }
      
      // Can't delete own account
      if (user.id === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }
      
      // Delete user
      await storage.deleteUser(userId);
      
      // Create system activity log
      await storage.createSystemActivity({
        module: 'User Management',
        event: 'User Deleted',
        status: 'Completed',
        details: { 
          adminId: req.user.id,
          deletedUserId: userId,
          username: user.username,
        },
        timestamp: new Date(),
      });
      
      return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Assign package to user (admin only)
  async assignPackageToUser(req: Request, res: Response) {
    try {
      // Only admin can assign packages
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const userId = parseInt(req.params.id);
      const { packageId, expiresAt } = req.body;
      
      // Validate input
      if (!packageId) {
        return res.status(400).json({ message: 'Package ID is required' });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if package exists
      const packageInfo = await storage.getPackage(packageId);
      if (!packageInfo) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      // Check if package is active
      if (!packageInfo.isActive) {
        return res.status(400).json({ message: 'Cannot assign inactive package' });
      }
      
      // Deactivate current active package if any
      const currentActivePackage = await storage.getActiveUserPackage(userId);
      if (currentActivePackage) {
        await storage.deactivateUserPackage(currentActivePackage.id);
      }
      
      // Assign new package
      const expiryDate = expiresAt ? new Date(expiresAt) : null;
      const userPackage = await storage.createUserPackage({
        userId,
        packageId,
        isActive: true,
        assignedAt: new Date(),
        expiresAt: expiryDate,
      });
      
      // Create system activity log
      await storage.createSystemActivity({
        module: 'User Management',
        event: 'Package Assigned',
        status: 'Completed',
        details: { 
          adminId: req.user.id,
          userId,
          packageId,
          packageName: packageInfo.name,
          expiresAt: expiryDate,
        },
        timestamp: new Date(),
      });
      
      return res.status(200).json({ 
        message: 'Package assigned successfully',
        userPackage: {
          id: userPackage.id,
          userId: userPackage.userId,
          packageId: userPackage.packageId,
          packageName: packageInfo.name,
          isActive: userPackage.isActive,
          assignedAt: userPackage.assignedAt,
          expiresAt: userPackage.expiresAt,
        }
      });
    } catch (error) {
      console.error('Assign package error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
};