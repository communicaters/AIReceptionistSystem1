import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { insertPackageSchema, insertPackageFeatureSchema } from '@shared/schema';

// Validate package update input
const updatePackageSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

// Validate package feature update input
const updatePackageFeatureSchema = z.object({
  featureKey: z.string().min(3).optional(),
  usageLimit: z.number().nullable().optional(),
  isEnabled: z.boolean().optional(),
});

export const packagesController = {
  // Get all packages
  async getAllPackages(req: Request, res: Response) {
    try {
      // Admin gets all packages, others only get active ones
      const packages = req.user?.role === 'admin' 
        ? await storage.getAllPackages()
        : await storage.getActivePackages();
      
      // Enhance packages with feature information
      const enhancedPackages = await Promise.all(packages.map(async (pkg) => {
        const features = await storage.getPackageFeaturesByPackageId(pkg.id);
        return {
          ...pkg,
          features: features.map(feature => ({
            id: feature.id,
            featureKey: feature.featureKey,
            usageLimit: feature.usageLimit,
            isEnabled: feature.isEnabled,
          })),
        };
      }));
      
      return res.status(200).json({ packages: enhancedPackages });
    } catch (error) {
      console.error('Get all packages error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Get package by ID
  async getPackageById(req: Request, res: Response) {
    try {
      const packageId = parseInt(req.params.id);
      
      const packageInfo = await storage.getPackage(packageId);
      if (!packageInfo) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      // Non-admins can only view active packages
      if (req.user?.role !== 'admin' && !packageInfo.isActive) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Get package features
      const features = await storage.getPackageFeaturesByPackageId(packageId);
      
      // Get users with this package
      let userCount = 0;
      if (req.user?.role === 'admin') {
        // Only admins can see assigned users
        const userPackages = await storage.getUserPackagesByPackageId(packageId);
        userCount = userPackages.length;
      }
      
      return res.status(200).json({ 
        package: {
          ...packageInfo,
          features: features.map(feature => ({
            id: feature.id,
            featureKey: feature.featureKey,
            usageLimit: feature.usageLimit,
            isEnabled: feature.isEnabled,
          })),
          userCount,
        }
      });
    } catch (error) {
      console.error('Get package by ID error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Create package (admin only)
  async createPackage(req: Request, res: Response) {
    try {
      // Only admin can create packages
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Validate request
      const validatedData = insertPackageSchema.parse(req.body);
      const { name, description, price, isActive } = validatedData;
      
      // Check if package name already exists
      const existingPackage = await storage.getPackageByName(name);
      if (existingPackage) {
        return res.status(400).json({ message: 'Package name already exists' });
      }
      
      // Create package
      const newPackage = await storage.createPackage({
        name,
        description,
        price,
        isActive: isActive !== undefined ? isActive : true,
      });
      
      // Create features if provided
      const features = req.body.features || [];
      const createdFeatures = [];
      
      for (const feature of features) {
        try {
          const validatedFeature = insertPackageFeatureSchema.parse({
            packageId: newPackage.id,
            ...feature
          });
          
          const newFeature = await storage.createPackageFeature(validatedFeature);
          createdFeatures.push(newFeature);
        } catch (featureError) {
          console.error('Feature creation error:', featureError);
          // Continue with other features even if one fails
        }
      }
      
      // Create system activity log
      await storage.createSystemActivity({
        module: 'Package Management',
        event: 'Package Created',
        status: 'Completed',
        details: { 
          adminId: req.user.id,
          packageId: newPackage.id,
          packageName: newPackage.name,
        },
        timestamp: new Date(),
      });
      
      return res.status(201).json({ 
        message: 'Package created successfully',
        package: {
          ...newPackage,
          features: createdFeatures,
        }
      });
    } catch (error) {
      console.error('Create package error:', error);
      return res.status(400).json({ message: 'Invalid input', error });
    }
  },
  
  // Update package (admin only)
  async updatePackage(req: Request, res: Response) {
    try {
      // Only admin can update packages
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const packageId = parseInt(req.params.id);
      
      // Check if package exists
      const packageInfo = await storage.getPackage(packageId);
      if (!packageInfo) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      // Validate request
      const validatedData = updatePackageSchema.parse(req.body);
      
      // Check if package name already exists if it's being changed
      if (validatedData.name && validatedData.name !== packageInfo.name) {
        const existingPackage = await storage.getPackageByName(validatedData.name);
        if (existingPackage) {
          return res.status(400).json({ message: 'Package name already exists' });
        }
      }
      
      // Update package
      const updatedPackage = await storage.updatePackage(packageId, validatedData);
      
      // Create system activity log
      await storage.createSystemActivity({
        module: 'Package Management',
        event: 'Package Updated',
        status: 'Completed',
        details: { 
          adminId: req.user.id,
          packageId: updatedPackage.id,
          packageName: updatedPackage.name,
          changes: Object.keys(validatedData).join(', '),
        },
        timestamp: new Date(),
      });
      
      return res.status(200).json({ 
        message: 'Package updated successfully',
        package: updatedPackage
      });
    } catch (error) {
      console.error('Update package error:', error);
      return res.status(400).json({ message: 'Invalid input', error });
    }
  },
  
  // Delete package (admin only)
  async deletePackage(req: Request, res: Response) {
    try {
      // Only admin can delete packages
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const packageId = parseInt(req.params.id);
      
      // Check if package exists
      const packageInfo = await storage.getPackage(packageId);
      if (!packageInfo) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      // Check if package is in use
      const userPackages = await storage.getUserPackagesByPackageId(packageId);
      if (userPackages.length > 0) {
        // If package is in use, don't delete it, just deactivate
        await storage.updatePackage(packageId, { isActive: false });
        
        return res.status(200).json({ 
          message: 'Package is in use by users. It has been deactivated instead of deleted.',
          deactivated: true
        });
      }
      
      // Delete package features first
      const features = await storage.getPackageFeaturesByPackageId(packageId);
      for (const feature of features) {
        await storage.deletePackageFeature(feature.id);
      }
      
      // Delete package
      await storage.deletePackage(packageId);
      
      // Create system activity log
      await storage.createSystemActivity({
        module: 'Package Management',
        event: 'Package Deleted',
        status: 'Completed',
        details: { 
          adminId: req.user.id,
          packageId,
          packageName: packageInfo.name,
        },
        timestamp: new Date(),
      });
      
      return res.status(200).json({ message: 'Package deleted successfully' });
    } catch (error) {
      console.error('Delete package error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Add feature to package (admin only)
  async addFeatureToPackage(req: Request, res: Response) {
    try {
      // Only admin can add features
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const packageId = parseInt(req.params.id);
      
      // Check if package exists
      const packageInfo = await storage.getPackage(packageId);
      if (!packageInfo) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      // Validate request
      const validatedData = insertPackageFeatureSchema.parse({
        packageId,
        ...req.body
      });
      
      // Check if feature already exists for this package
      const existingFeature = await storage.getPackageFeatureByKey(packageId, validatedData.featureKey);
      if (existingFeature) {
        return res.status(400).json({ message: 'Feature already exists for this package' });
      }
      
      // Create feature
      const newFeature = await storage.createPackageFeature(validatedData);
      
      // Create system activity log
      await storage.createSystemActivity({
        module: 'Package Management',
        event: 'Package Feature Added',
        status: 'Completed',
        details: { 
          adminId: req.user.id,
          packageId,
          packageName: packageInfo.name,
          featureKey: newFeature.featureKey,
        },
        timestamp: new Date(),
      });
      
      return res.status(201).json({ 
        message: 'Feature added successfully',
        feature: newFeature
      });
    } catch (error) {
      console.error('Add feature error:', error);
      return res.status(400).json({ message: 'Invalid input', error });
    }
  },
  
  // Update package feature (admin only)
  async updatePackageFeature(req: Request, res: Response) {
    try {
      // Only admin can update features
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const packageId = parseInt(req.params.id);
      const featureId = parseInt(req.params.featureId);
      
      // Check if package exists
      const packageInfo = await storage.getPackage(packageId);
      if (!packageInfo) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      // Check if feature exists
      const feature = await storage.getPackageFeature(featureId);
      if (!feature || feature.packageId !== packageId) {
        return res.status(404).json({ message: 'Feature not found' });
      }
      
      // Validate request
      const validatedData = updatePackageFeatureSchema.parse(req.body);
      
      // Update feature
      const updatedFeature = await storage.updatePackageFeature(featureId, validatedData);
      
      // Create system activity log
      await storage.createSystemActivity({
        module: 'Package Management',
        event: 'Package Feature Updated',
        status: 'Completed',
        details: { 
          adminId: req.user.id,
          packageId,
          packageName: packageInfo.name,
          featureId,
          featureKey: feature.featureKey,
          changes: Object.keys(validatedData).join(', '),
        },
        timestamp: new Date(),
      });
      
      return res.status(200).json({ 
        message: 'Feature updated successfully',
        feature: updatedFeature
      });
    } catch (error) {
      console.error('Update feature error:', error);
      return res.status(400).json({ message: 'Invalid input', error });
    }
  },
  
  // Delete package feature (admin only)
  async deletePackageFeature(req: Request, res: Response) {
    try {
      // Only admin can delete features
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const packageId = parseInt(req.params.id);
      const featureId = parseInt(req.params.featureId);
      
      // Check if package exists
      const packageInfo = await storage.getPackage(packageId);
      if (!packageInfo) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      // Check if feature exists
      const feature = await storage.getPackageFeature(featureId);
      if (!feature || feature.packageId !== packageId) {
        return res.status(404).json({ message: 'Feature not found' });
      }
      
      // Delete feature
      await storage.deletePackageFeature(featureId);
      
      // Create system activity log
      await storage.createSystemActivity({
        module: 'Package Management',
        event: 'Package Feature Deleted',
        status: 'Completed',
        details: { 
          adminId: req.user.id,
          packageId,
          packageName: packageInfo.name,
          featureId,
          featureKey: feature.featureKey,
        },
        timestamp: new Date(),
      });
      
      return res.status(200).json({ message: 'Feature deleted successfully' });
    } catch (error) {
      console.error('Delete feature error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
};