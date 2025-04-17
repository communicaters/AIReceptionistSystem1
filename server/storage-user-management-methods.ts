import { MemStorage } from "./storage";
import {
  Package, InsertPackage,
  PackageFeature, InsertPackageFeature,
  UserPackage, InsertUserPackage,
  FeatureUsageLog, InsertFeatureUsageLog,
  LoginActivity, InsertLoginActivity,
  AdminReportsCache, InsertAdminReportsCache
} from "@shared/schema";

// Package methods for MemStorage class
export const packageMethods = {
  async getPackage(this: MemStorage, id: number): Promise<Package | undefined> {
    return this.packages.get(id);
  },

  async getPackageByName(this: MemStorage, name: string): Promise<Package | undefined> {
    return Array.from(this.packages.values()).find(
      (pkg) => pkg.name === name,
    );
  },

  async getAllPackages(this: MemStorage): Promise<Package[]> {
    return Array.from(this.packages.values());
  },

  async getActivePackages(this: MemStorage): Promise<Package[]> {
    return Array.from(this.packages.values()).filter(
      (pkg) => pkg.isActive === true,
    );
  },

  async createPackage(this: MemStorage, pkg: InsertPackage): Promise<Package> {
    const id = this.currentIds.packages++;
    const now = new Date();
    const newPackage: Package = { 
      ...pkg, 
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.packages.set(id, newPackage);
    return newPackage;
  },

  async updatePackage(this: MemStorage, id: number, pkg: Partial<InsertPackage>): Promise<Package | undefined> {
    const existingPackage = this.packages.get(id);
    if (!existingPackage) return undefined;

    const updatedPackage: Package = { 
      ...existingPackage, 
      ...pkg,
      updatedAt: new Date(),
    };
    this.packages.set(id, updatedPackage);
    return updatedPackage;
  },

  async deletePackage(this: MemStorage, id: number): Promise<boolean> {
    return this.packages.delete(id);
  },
};

// Package Feature methods for MemStorage class
export const packageFeatureMethods = {
  async getPackageFeature(this: MemStorage, id: number): Promise<PackageFeature | undefined> {
    return this.packageFeatures.get(id);
  },

  async getPackageFeaturesByPackageId(this: MemStorage, packageId: number): Promise<PackageFeature[]> {
    return Array.from(this.packageFeatures.values()).filter(
      (feature) => feature.packageId === packageId,
    );
  },

  async getPackageFeatureByKey(this: MemStorage, packageId: number, featureKey: string): Promise<PackageFeature | undefined> {
    return Array.from(this.packageFeatures.values()).find(
      (feature) => feature.packageId === packageId && feature.featureKey === featureKey,
    );
  },

  async createPackageFeature(this: MemStorage, feature: InsertPackageFeature): Promise<PackageFeature> {
    const id = this.currentIds.packageFeatures++;
    const newFeature: PackageFeature = { ...feature, id };
    this.packageFeatures.set(id, newFeature);
    return newFeature;
  },

  async updatePackageFeature(this: MemStorage, id: number, feature: Partial<InsertPackageFeature>): Promise<PackageFeature | undefined> {
    const existingFeature = this.packageFeatures.get(id);
    if (!existingFeature) return undefined;

    const updatedFeature: PackageFeature = { ...existingFeature, ...feature };
    this.packageFeatures.set(id, updatedFeature);
    return updatedFeature;
  },

  async deletePackageFeature(this: MemStorage, id: number): Promise<boolean> {
    return this.packageFeatures.delete(id);
  },
};

// User Package methods for MemStorage class
export const userPackageMethods = {
  async getUserPackage(this: MemStorage, id: number): Promise<UserPackage | undefined> {
    return this.userPackages.get(id);
  },

  async getUserPackagesByUserId(this: MemStorage, userId: number): Promise<UserPackage[]> {
    return Array.from(this.userPackages.values()).filter(
      (userPackage) => userPackage.userId === userId,
    );
  },

  async getActiveUserPackage(this: MemStorage, userId: number): Promise<UserPackage | undefined> {
    const now = new Date();
    return Array.from(this.userPackages.values()).find(
      (userPackage) => 
        userPackage.userId === userId && 
        userPackage.isActive === true &&
        (!userPackage.expiresAt || userPackage.expiresAt > now)
    );
  },

  async createUserPackage(this: MemStorage, userPackage: InsertUserPackage): Promise<UserPackage> {
    const id = this.currentIds.userPackages++;
    const now = new Date();
    const newUserPackage: UserPackage = { 
      ...userPackage, 
      id,
      assignedAt: now,
    };
    this.userPackages.set(id, newUserPackage);
    return newUserPackage;
  },

  async updateUserPackage(this: MemStorage, id: number, userPackage: Partial<InsertUserPackage>): Promise<UserPackage | undefined> {
    const existingUserPackage = this.userPackages.get(id);
    if (!existingUserPackage) return undefined;

    const updatedUserPackage: UserPackage = { ...existingUserPackage, ...userPackage };
    this.userPackages.set(id, updatedUserPackage);
    return updatedUserPackage;
  },

  async deactivateUserPackage(this: MemStorage, id: number): Promise<UserPackage | undefined> {
    const existingUserPackage = this.userPackages.get(id);
    if (!existingUserPackage) return undefined;

    const updatedUserPackage: UserPackage = { ...existingUserPackage, isActive: false };
    this.userPackages.set(id, updatedUserPackage);
    return updatedUserPackage;
  },

  async deleteUserPackage(this: MemStorage, id: number): Promise<boolean> {
    return this.userPackages.delete(id);
  },
};

// Feature Usage Log methods for MemStorage class
export const featureUsageLogMethods = {
  async getFeatureUsageLog(this: MemStorage, id: number): Promise<FeatureUsageLog | undefined> {
    return this.featureUsageLogs.get(id);
  },

  async getFeatureUsageLogsByUserId(this: MemStorage, userId: number): Promise<FeatureUsageLog[]> {
    return Array.from(this.featureUsageLogs.values()).filter(
      (log) => log.userId === userId,
    );
  },

  async getFeatureUsageLogsByFeatureKey(this: MemStorage, userId: number, featureKey: string): Promise<FeatureUsageLog[]> {
    return Array.from(this.featureUsageLogs.values()).filter(
      (log) => log.userId === userId && log.featureKey === featureKey,
    );
  },

  async getFeatureUsageSummary(this: MemStorage, userId: number, timeframe?: string): Promise<any> {
    const logs = Array.from(this.featureUsageLogs.values()).filter(
      (log) => log.userId === userId
    );

    // Apply timeframe filter if provided
    let filteredLogs = logs;
    if (timeframe) {
      const now = new Date();
      let startDate = new Date();

      switch (timeframe) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          // No filter
          break;
      }

      filteredLogs = logs.filter(log => log.usedAt >= startDate);
    }

    // Group by feature key and sum usage
    const summaryMap = new Map<string, number>();
    
    for (const log of filteredLogs) {
      const currentTotal = summaryMap.get(log.featureKey) || 0;
      summaryMap.set(log.featureKey, currentTotal + log.usageCount);
    }

    // Convert to array of objects
    return Array.from(summaryMap.entries()).map(([featureKey, totalUsage]) => ({
      featureKey,
      totalUsage,
    }));
  },

  async createFeatureUsageLog(this: MemStorage, log: InsertFeatureUsageLog): Promise<FeatureUsageLog> {
    const id = this.currentIds.featureUsageLogs++;
    const now = new Date();
    const newLog: FeatureUsageLog = { 
      ...log, 
      id,
      usedAt: now,
    };
    this.featureUsageLogs.set(id, newLog);
    return newLog;
  },
};

// Login Activity methods for MemStorage class
export const loginActivityMethods = {
  async getLoginActivity(this: MemStorage, id: number): Promise<LoginActivity | undefined> {
    return this.loginActivities.get(id);
  },

  async getLoginActivitiesByUserId(this: MemStorage, userId: number, limit?: number): Promise<LoginActivity[]> {
    const activities = Array.from(this.loginActivities.values())
      .filter(activity => activity.userId === userId)
      .sort((a, b) => b.loginTime.getTime() - a.loginTime.getTime());

    return limit ? activities.slice(0, limit) : activities;
  },

  async createLoginActivity(this: MemStorage, activity: InsertLoginActivity): Promise<LoginActivity> {
    const id = this.currentIds.loginActivities++;
    const now = new Date();
    const newActivity: LoginActivity = { 
      ...activity, 
      id,
      loginTime: now,
    };
    this.loginActivities.set(id, newActivity);
    return newActivity;
  },
};

// Report Cache methods for MemStorage class
export const reportCacheMethods = {
  async getReportCache(this: MemStorage, id: number): Promise<AdminReportsCache | undefined> {
    return this.reportCaches.get(id);
  },

  async getReportCacheByType(this: MemStorage, reportType: string): Promise<AdminReportsCache | undefined> {
    const now = new Date();
    return Array.from(this.reportCaches.values()).find(
      (cache) => cache.reportType === reportType && cache.expiresAt > now
    );
  },

  async createReportCache(this: MemStorage, report: InsertAdminReportsCache): Promise<AdminReportsCache> {
    const id = this.currentIds.reportCaches++;
    const now = new Date();
    const newReport: AdminReportsCache = { 
      ...report, 
      id,
      generatedAt: now,
    };
    this.reportCaches.set(id, newReport);
    return newReport;
  },

  async deleteReportCache(this: MemStorage, id: number): Promise<boolean> {
    return this.reportCaches.delete(id);
  },
};