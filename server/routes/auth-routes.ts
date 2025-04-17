import express from 'express';
import { authController } from '../controllers/auth-controller';

const router = express.Router();

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/verify/:token', authController.verifyEmail);
router.post('/reset-request', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authController.getCurrentUser);

export default router;