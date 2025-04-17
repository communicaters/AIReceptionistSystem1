import express from 'express';
import { usersController } from '../controllers/users-controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes accessible by any authenticated user
router.get('/me/profile', usersController.getUserById); // Special case, gets own profile
router.patch('/me/profile', usersController.updateProfile);

// Routes requiring admin role
router.get('/', requireAdmin, usersController.getAllUsers);
router.post('/', requireAdmin, usersController.createUser);
router.get('/:id', requireAdmin, usersController.getUserById);
router.patch('/:id', requireAdmin, usersController.updateUser);
router.delete('/:id', requireAdmin, usersController.deleteUser);
router.patch('/:id/status', requireAdmin, usersController.changeUserStatus);
router.post('/:id/packages', requireAdmin, usersController.assignPackageToUser);

export default router;