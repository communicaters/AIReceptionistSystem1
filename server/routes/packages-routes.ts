import express from 'express';
import { packagesController } from '../controllers/packages-controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes accessible by any authenticated user
router.get('/', packagesController.getAllPackages);
router.get('/:id', packagesController.getPackageById);

// Routes requiring admin role
router.post('/', requireAdmin, packagesController.createPackage);
router.patch('/:id', requireAdmin, packagesController.updatePackage);
router.delete('/:id', requireAdmin, packagesController.deletePackage);
router.post('/:id/features', requireAdmin, packagesController.addFeatureToPackage);
router.patch('/:id/features/:featureId', requireAdmin, packagesController.updatePackageFeature);
router.delete('/:id/features/:featureId', requireAdmin, packagesController.deletePackageFeature);

export default router;