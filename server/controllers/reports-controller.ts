import { Request, Response } from 'express';
import { storage } from '../storage';

export const reportsController = {
  // Get dashboard summary (admin only)
  async getDashboardSummary(req: Request, res: Response) {
    try {
      // Only admin can access reports
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Check if there's a cached report that's still valid
      const cachedReport = await storage.getReportCacheByType('dashboard_summary');
      if (cachedReport && cachedReport.expiresAt > new Date()) {
        return res.status(200).json(JSON.parse(cachedReport.reportData));
      }
      
      // User statistics
      const users = await storage.getAllUsers();
      const totalUsers = users.length;
      const activeUsers = users.filter(user => user.status === 'active').length;
      const adminUsers = users.filter(user => user.role === 'admin').length;
      
      // Recent user registrations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentRegistrations = users.filter(user => 
        user.createdAt >= thirtyDaysAgo
      ).length;
      
      // Package statistics
      const packages = await storage.getAllPackages();
      const totalPackages = packages.length;
      const activePackages = packages.filter(pkg => pkg.isActive).length;
      
      // System module status
      const moduleStatuses = await storage.getAllModuleStatuses();
      
      // Recent system activity
      const recentActivity = await storage.getRecentSystemActivity(10);
      
      // Collect all data
      const summary = {
        userStats: {
          total: totalUsers,
          active: activeUsers,
          admin: adminUsers,
          recentRegistrations,
        },
        packageStats: {
          total: totalPackages,
          active: activePackages,
        },
        moduleStatus: moduleStatuses,
        recentActivity,
        generatedAt: new Date(),
      };
      
      // Cache the report for 15 minutes
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 15);
      
      await storage.createReportCache({
        reportType: 'dashboard_summary',
        reportData: JSON.stringify(summary),
        expiresAt: expiryDate,
      });
      
      return res.status(200).json(summary);
    } catch (error) {
      console.error('Dashboard summary error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Get user activity report (admin only)
  async getUserActivityReport(req: Request, res: Response) {
    try {
      // Only admin can access reports
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Parse query parameters
      const timeframe = req.query.timeframe as string || '30days';
      const limit = parseInt(req.query.limit as string || '100');
      
      // Check if there's a cached report that's still valid
      const cacheKey = `user_activity_${timeframe}_${limit}`;
      const cachedReport = await storage.getReportCacheByType(cacheKey);
      if (cachedReport && cachedReport.expiresAt > new Date()) {
        return res.status(200).json(JSON.parse(cachedReport.reportData));
      }
      
      // Calculate start date based on timeframe
      const startDate = new Date();
      switch (timeframe) {
        case '7days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '12months':
          startDate.setMonth(startDate.getMonth() - 12);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30); // Default to 30 days
      }
      
      // Get login activity
      const loginActivity = await storage.getLoginActivitySince(startDate, limit);
      
      // Get system activity
      const systemActivity = await storage.getSystemActivitySince(startDate, limit);
      
      // Get feature usage summary by user
      const featureUsage = await storage.getFeatureUsageSummaryByTimeframe(timeframe);
      
      // Gather usage statistics by feature type
      const featureUsageByType = {};
      
      for (const usage of featureUsage) {
        if (!featureUsageByType[usage.featureKey]) {
          featureUsageByType[usage.featureKey] = 0;
        }
        featureUsageByType[usage.featureKey] += usage.totalUsage;
      }
      
      // Format report data
      const report = {
        timeframe,
        loginActivity,
        systemActivity,
        featureUsage,
        featureUsageByType,
        generatedAt: new Date(),
      };
      
      // Cache the report for 15 minutes
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 15);
      
      await storage.createReportCache({
        reportType: cacheKey,
        reportData: JSON.stringify(report),
        expiresAt: expiryDate,
      });
      
      return res.status(200).json(report);
    } catch (error) {
      console.error('User activity report error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Get subscription report (admin only)
  async getSubscriptionReport(req: Request, res: Response) {
    try {
      // Only admin can access reports
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Check if there's a cached report that's still valid
      const cachedReport = await storage.getReportCacheByType('subscription_report');
      if (cachedReport && cachedReport.expiresAt > new Date()) {
        return res.status(200).json(JSON.parse(cachedReport.reportData));
      }
      
      // Get all packages
      const packages = await storage.getAllPackages();
      
      // For each package, get the number of users
      const packageStats = await Promise.all(packages.map(async (pkg) => {
        const userPackages = await storage.getUserPackagesByPackageId(pkg.id);
        const activeUserPackages = userPackages.filter(up => {
          return up.isActive && (!up.expiresAt || up.expiresAt > new Date());
        });
        
        return {
          id: pkg.id,
          name: pkg.name,
          isActive: pkg.isActive,
          price: pkg.price,
          totalUsers: userPackages.length,
          activeUsers: activeUserPackages.length,
        };
      }));
      
      // Calculate total revenue
      const totalRevenue = packageStats.reduce((sum, pkg) => {
        return sum + (pkg.activeUsers * pkg.price);
      }, 0);
      
      // Count users without any package
      const users = await storage.getAllUsers();
      let usersWithoutPackage = 0;
      
      for (const user of users) {
        const activePackage = await storage.getActiveUserPackage(user.id);
        if (!activePackage) {
          usersWithoutPackage++;
        }
      }
      
      // Format report data
      const report = {
        packageStats,
        totalRevenue,
        usersWithoutPackage,
        totalUsers: users.length,
        generatedAt: new Date(),
      };
      
      // Cache the report for 15 minutes
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 15);
      
      await storage.createReportCache({
        reportType: 'subscription_report',
        reportData: JSON.stringify(report),
        expiresAt: expiryDate,
      });
      
      return res.status(200).json(report);
    } catch (error) {
      console.error('Subscription report error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Get user usage report (admin only or self)
  async getUserUsageReport(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      
      // Check permissions (admin can access any user, others can only access themselves)
      if (req.user?.role !== 'admin' && req.user?.id !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Parse query parameters
      const timeframe = req.query.timeframe as string || '30days';
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get feature usage for the user
      const featureUsage = await storage.getFeatureUsageLogsByUserIdAndTimeframe(userId, timeframe);
      
      // Group usage by feature
      const usageByFeature = {};
      
      for (const usage of featureUsage) {
        if (!usageByFeature[usage.featureKey]) {
          usageByFeature[usage.featureKey] = 0;
        }
        usageByFeature[usage.featureKey] += usage.usageCount;
      }
      
      // Get user's active subscription
      const activePackage = await storage.getActiveUserPackage(userId);
      let packageInfo = null;
      let packageFeatures = [];
      
      if (activePackage) {
        const pkg = await storage.getPackage(activePackage.packageId);
        if (pkg) {
          packageInfo = {
            id: pkg.id,
            name: pkg.name,
            assignedAt: activePackage.assignedAt,
            expiresAt: activePackage.expiresAt,
          };
          
          // Get package features and usage limits
          packageFeatures = await storage.getPackageFeaturesByPackageId(pkg.id);
        }
      }
      
      // Calculate usage against limits
      const usageLimits = [];
      
      for (const feature of packageFeatures) {
        const usage = usageByFeature[feature.featureKey] || 0;
        const hasLimit = feature.usageLimit !== null;
        const percentUsed = hasLimit ? (usage / feature.usageLimit) * 100 : 0;
        
        usageLimits.push({
          featureKey: feature.featureKey,
          usage,
          limit: feature.usageLimit,
          percentUsed: hasLimit ? percentUsed : null,
          isUnlimited: !hasLimit,
          isEnabled: feature.isEnabled,
        });
      }
      
      // Format report data
      const report = {
        userId,
        username: user.username,
        timeframe,
        package: packageInfo,
        usageSummary: usageLimits,
        usageByFeature,
        usageHistory: featureUsage,
        generatedAt: new Date(),
      };
      
      return res.status(200).json(report);
    } catch (error) {
      console.error('User usage report error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  },
};