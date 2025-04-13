import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Basic authentication middleware
 * 
 * This is a simple implementation that can be replaced with a more robust solution
 * in a production environment.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // For demonstration purposes, use a fixed user ID
    // In a real application, this would come from session, JWT, etc.
    const userId = 1;
    
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        // Attach user to request
        req.user = user;
        
        // Add an isAuthenticated method
        req.isAuthenticated = () => true;
        
        return next();
      }
    }
    
    // Default to not authenticated
    req.isAuthenticated = () => false;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    req.isAuthenticated = () => false;
    next();
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: "Authentication required" });
}