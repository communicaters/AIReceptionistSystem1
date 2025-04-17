import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { verifyToken } from '../lib/jwt';

// Extending Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Authentication middleware
 * Validates JWT token from Authorization header or session
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip authentication for webhook endpoints
    if (
      req.path.startsWith('/api/whatsapp/webhook') ||
      req.path === '/api/whatsapp/unified-webhook' ||
      req.path === '/api/zender/incoming' ||
      req.path.includes('webhook')
    ) {
      console.log('Webhook route detected, skipping authentication:', req.path);
      return next();
    }
    
    // Check session first
    if (req.session && req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        req.user = user;
        return next();
      }
    }
    
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Get user from storage
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }
    
    // Set user on request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

/**
 * Admin role middleware
 * Requires the authenticated user to have admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin privileges required' });
  }
  
  next();
};

/**
 * Role-based middleware factory
 * Creates middleware that requires the authenticated user to have one of the specified roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};