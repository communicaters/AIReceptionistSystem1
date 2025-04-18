import express from 'express';
import { authController } from '../controllers/auth-controller';
import { storage } from '../storage';
import { generateToken } from '../lib/jwt';

const router = express.Router();

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/verify/:token', authController.verifyEmail);
router.post('/reset-request', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authController.logout);

// Development-only route for auto-login (REMOVE IN PRODUCTION)
if (process.env.NODE_ENV === 'development') {
  router.get('/dev-login', async (req, res) => {
    try {
      // Get admin user
      const adminUser = await storage.getUserByUsername('admin');
      
      if (!adminUser) {
        return res.status(404).json({ message: 'Admin user not found' });
      }
      
      // Generate token
      const token = generateToken({ userId: adminUser.id, role: adminUser.role });
      
      // Return user info and token
      return res.status(200).json({
        message: 'Development auto-login successful',
        token,
        user: {
          id: adminUser.id,
          username: adminUser.username,
          fullName: adminUser.fullName,
          email: adminUser.email,
          role: adminUser.role,
          status: adminUser.status,
          emailVerified: adminUser.emailVerified
        }
      });
    } catch (error) {
      console.error('Dev login error:', error);
      return res.status(500).json({ message: 'Error during development auto-login' });
    }
  });
}

// Protected routes
router.get('/me', authController.getCurrentUser);

export default router;