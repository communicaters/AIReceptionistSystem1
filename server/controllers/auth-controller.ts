import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { storage } from '../storage';
import { insertUserSchema } from '@shared/schema';
import { encrypt, compare } from '../lib/encryption';
import { generateToken } from '../lib/jwt';

// Validate login input
const loginSchema = z.object({
  usernameOrEmail: z.string().min(3),
  password: z.string().min(6),
});

// Validate registration input
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Validate password reset request
const resetRequestSchema = z.object({
  email: z.string().email(),
});

// Validate password reset
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const authController = {
  // User login
  async login(req: Request, res: Response) {
    try {
      // Validate request
      const validatedData = loginSchema.parse(req.body);
      const { usernameOrEmail, password } = validatedData;
      
      // Find user by username or email
      let user = await storage.getUserByUsername(usernameOrEmail);
      if (!user) {
        user = await storage.getUserByEmail(usernameOrEmail);
      }
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid username/email or password' });
      }
      
      // Verify account status
      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
      }
      
      if (user.status === 'inactive') {
        return res.status(403).json({ message: 'Your account is inactive. Please verify your email to activate it.' });
      }
      
      // Check password
      const isPasswordValid = await compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid username/email or password' });
      }
      
      // Generate token
      const token = generateToken({ userId: user.id, role: user.role });
      
      // Log login activity
      await storage.createLoginActivity({
        userId: user.id,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        loginTime: new Date(),
        status: 'successful'
      });
      
      // Update user's last login
      await storage.updateUserLastLogin(user.id);
      
      // Set session
      if (req.session) {
        req.session.userId = user.id;
        req.session.role = user.role;
      }
      
      return res.status(200).json({ 
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(400).json({ message: 'Invalid input', error });
    }
  },
  
  // User registration
  async register(req: Request, res: Response) {
    try {
      // Validate request
      const validatedData = registerSchema.parse(req.body);
      const { username, email, password, fullName, confirmPassword, ...rest } = validatedData;
      
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
      
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      // Create user
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        fullName,
        role: 'user', // Default role
        verificationToken,
        status: 'inactive', // Require email verification
      });
      
      // TODO: Send verification email
      
      return res.status(201).json({ 
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(400).json({ message: 'Invalid input', error });
    }
  },
  
  // Email verification
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({ message: 'Invalid verification token' });
      }
      
      // Find user with this token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: 'Invalid verification token' });
      }
      
      // Update user verification status
      await storage.verifyUserEmail(user.id);
      
      return res.status(200).json({ message: 'Email verification successful. You can now log in.' });
    } catch (error) {
      console.error('Email verification error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Request password reset
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = resetRequestSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // We don't want to reveal if an email exists or not
        return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link.' });
      }
      
      // Generate reset token and expiry
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      // Update user with reset token
      await storage.setUserResetToken(user.id, resetToken, resetTokenExpiry);
      
      // TODO: Send password reset email
      
      return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link.' });
    } catch (error) {
      console.error('Password reset request error:', error);
      return res.status(400).json({ message: 'Invalid input', error });
    }
  },
  
  // Reset password
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      // Find user with this token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }
      
      // Hash new password
      const hashedPassword = await encrypt(password);
      
      // Update user password and clear reset token
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearUserResetToken(user.id);
      
      return res.status(200).json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({ message: 'Invalid input', error });
    }
  },
  
  // Logout
  logout(req: Request, res: Response) {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ message: 'Error logging out' });
        }
        
        res.clearCookie('connect.sid');
        return res.status(200).json({ message: 'Logged out successfully' });
      });
    } else {
      return res.status(200).json({ message: 'Logged out successfully' });
    }
  },
  
  // Get current user
  getCurrentUser(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    return res.status(200).json({ 
      user: {
        id: req.user.id,
        username: req.user.username,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status,
        emailVerified: req.user.emailVerified
      }
    });
  }
};