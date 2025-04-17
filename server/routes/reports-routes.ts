import express from 'express';
import { reportsController } from '../controllers/reports-controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Admin dashboard summary
router.get('/dashboard', requireAdmin, reportsController.getDashboardSummary);

// User activity report (admin only)
router.get('/user-activity', requireAdmin, reportsController.getUserActivityReport);

// Subscription report (admin only)
router.get('/subscriptions', requireAdmin, reportsController.getSubscriptionReport);

// User usage report (admin or self)
router.get('/users/:id/usage', reportsController.getUserUsageReport);

export default router;