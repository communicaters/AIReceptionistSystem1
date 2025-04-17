import { eq, and, gte, lt, desc, sql, asc, count, ne, isNull, not, inArray, or } from 'drizzle-orm';
import { DatabaseStorage } from './database-storage';
import { 
  User, InsertUser, Package, InsertPackage, 
  PackageFeature, InsertPackageFeature, 
  UserPackage, InsertUserPackage, 
  FeatureUsageLog, InsertFeatureUsageLog,
  LoginActivity, InsertLoginActivity,
  ReportCache, InsertReportCache,
  users, packages, packageFeatures, userPackages, featureUsageLogs, loginActivity, reportCache, systemActivity, moduleStatus
} from '@shared/schema';
import { compare } from './lib/encryption';
import { db } from './db';

// Import storage after we've defined the extension function
import { storage } from './storage';

// Implement user management methods for DatabaseStorage
export function extendDatabaseStorageWithUserManagement(storage: DatabaseStorage) {
  /**
   * User Methods
   */
  
  storage.getUserByUsername = async function(username: string): Promise<User | undefined> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.username, username)
      });
      return result || undefined;
    } catch (error) {
      console.error("Error in getUserByUsername:", error);
      return undefined;
    }
  };
  
  storage.getUserByEmail = async function(email: string): Promise<User | undefined> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.email, email)
      });
      return result || undefined;
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      return undefined;
    }
  };
  
  storage.getUserByVerificationToken = async function(token: string): Promise<User | undefined> {
    const result = await this.db.query.users.findFirst({
      where: eq(this.schema.users.verificationToken, token)
    });
    return result;
  };
  
  storage.getUserByResetToken = async function(token: string): Promise<User | undefined> {
    const now = new Date();
    const result = await this.db.query.users.findFirst({
      where: and(
        eq(this.schema.users.resetToken, token),
        gte(this.schema.users.resetTokenExpiry as any, now)
      )
    });
    return result;
  };
  
  storage.getAllUsers = async function(): Promise<User[]> {
    const result = await this.db.query.users.findMany({
      orderBy: [asc(this.schema.users.id)]
    });
    return result;
  };
  
  storage.createUser = async function(user: InsertUser): Promise<User> {
    try {
      const [result] = await db.insert(users).values(user).returning();
      return result;
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  };
  
  storage.updateUser = async function(id: number, updates: Partial<User>): Promise<User> {
    const [result] = await this.db
      .update(this.schema.users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(this.schema.users.id, id))
      .returning();
    return result;
  };
  
  storage.updateUserStatus = async function(id: number, status: string): Promise<User> {
    const [result] = await this.db
      .update(this.schema.users)
      .set({ status, updatedAt: new Date() })
      .where(eq(this.schema.users.id, id))
      .returning();
    return result;
  };
  
  storage.updateUserLastLogin = async function(id: number): Promise<User> {
    const [result] = await this.db
      .update(this.schema.users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(this.schema.users.id, id))
      .returning();
    return result;
  };
  
  storage.verifyUserEmail = async function(id: number): Promise<User> {
    const [result] = await this.db
      .update(this.schema.users)
      .set({ 
        emailVerified: true, 
        status: 'active', 
        verificationToken: null, 
        updatedAt: new Date() 
      })
      .where(eq(this.schema.users.id, id))
      .returning();
    return result;
  };
  
  storage.verifyPassword = async function(id: number, password: string): Promise<boolean> {
    const user = await this.db.query.users.findFirst({
      where: eq(this.schema.users.id, id)
    });
    
    if (!user) return false;
    
    return await compare(password, user.password);
  };
  
  storage.setUserResetToken = async function(id: number, token: string, expiry: Date): Promise<User> {
    const [result] = await this.db
      .update(this.schema.users)
      .set({ 
        resetToken: token, 
        resetTokenExpiry: expiry, 
        updatedAt: new Date() 
      })
      .where(eq(this.schema.users.id, id))
      .returning();
    return result;
  };
  
  storage.clearUserResetToken = async function(id: number): Promise<User> {
    const [result] = await this.db
      .update(this.schema.users)
      .set({ 
        resetToken: null, 
        resetTokenExpiry: null, 
        updatedAt: new Date() 
      })
      .where(eq(this.schema.users.id, id))
      .returning();
    return result;
  };
  
  storage.updateUserPassword = async function(id: number, password: string): Promise<User> {
    const [result] = await this.db
      .update(this.schema.users)
      .set({ 
        password, 
        updatedAt: new Date() 
      })
      .where(eq(this.schema.users.id, id))
      .returning();
    return result;
  };
  
  storage.deleteUser = async function(id: number): Promise<boolean> {
    // First delete all user-related data
    await this.db.delete(this.schema.featureUsageLogs).where(eq(this.schema.featureUsageLogs.userId, id));
    await this.db.delete(this.schema.loginActivity).where(eq(this.schema.loginActivity.userId, id));
    await this.db.delete(this.schema.userPackages).where(eq(this.schema.userPackages.userId, id));
    
    // Then delete the user
    const result = await this.db.delete(this.schema.users).where(eq(this.schema.users.id, id));
    return result.rowCount > 0;
  };
  
  /**
   * Package Methods
   */
  
  storage.getAllPackages = async function(): Promise<Package[]> {
    const result = await this.db.query.packages.findMany({
      orderBy: [asc(this.schema.packages.id)]
    });
    return result;
  };
  
  storage.getActivePackages = async function(): Promise<Package[]> {
    const result = await this.db.query.packages.findMany({
      where: eq(this.schema.packages.isActive, true),
      orderBy: [asc(this.schema.packages.id)]
    });
    return result;
  };
  
  storage.getPackage = async function(id: number): Promise<Package | undefined> {
    const result = await this.db.query.packages.findFirst({
      where: eq(this.schema.packages.id, id)
    });
    return result;
  };
  
  storage.getPackageByName = async function(name: string): Promise<Package | undefined> {
    const result = await this.db.query.packages.findFirst({
      where: eq(this.schema.packages.name, name)
    });
    return result;
  };
  
  storage.createPackage = async function(pkg: InsertPackage): Promise<Package> {
    const [result] = await this.db.insert(this.schema.packages).values(pkg).returning();
    return result;
  };
  
  storage.updatePackage = async function(id: number, updates: Partial<Package>): Promise<Package> {
    const [result] = await this.db
      .update(this.schema.packages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(this.schema.packages.id, id))
      .returning();
    return result;
  };
  
  storage.deletePackage = async function(id: number): Promise<boolean> {
    // First delete all package features
    await this.db.delete(this.schema.packageFeatures).where(eq(this.schema.packageFeatures.packageId, id));
    
    // Then delete the package
    const result = await this.db.delete(this.schema.packages).where(eq(this.schema.packages.id, id));
    return result.rowCount > 0;
  };
  
  /**
   * Package Feature Methods
   */
  
  storage.getPackageFeature = async function(id: number): Promise<PackageFeature | undefined> {
    const result = await this.db.query.packageFeatures.findFirst({
      where: eq(this.schema.packageFeatures.id, id)
    });
    return result;
  };
  
  storage.getPackageFeatureByKey = async function(packageId: number, featureKey: string): Promise<PackageFeature | undefined> {
    const result = await this.db.query.packageFeatures.findFirst({
      where: and(
        eq(this.schema.packageFeatures.packageId, packageId),
        eq(this.schema.packageFeatures.featureKey, featureKey)
      )
    });
    return result;
  };
  
  storage.getPackageFeaturesByPackageId = async function(packageId: number): Promise<PackageFeature[]> {
    const result = await this.db.query.packageFeatures.findMany({
      where: eq(this.schema.packageFeatures.packageId, packageId),
      orderBy: [asc(this.schema.packageFeatures.id)]
    });
    return result;
  };
  
  storage.createPackageFeature = async function(feature: InsertPackageFeature): Promise<PackageFeature> {
    const [result] = await this.db.insert(this.schema.packageFeatures).values(feature).returning();
    return result;
  };
  
  storage.updatePackageFeature = async function(id: number, updates: Partial<PackageFeature>): Promise<PackageFeature> {
    const [result] = await this.db
      .update(this.schema.packageFeatures)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(this.schema.packageFeatures.id, id))
      .returning();
    return result;
  };
  
  storage.deletePackageFeature = async function(id: number): Promise<boolean> {
    const result = await this.db.delete(this.schema.packageFeatures).where(eq(this.schema.packageFeatures.id, id));
    return result.rowCount > 0;
  };
  
  /**
   * User Package Methods
   */
  
  storage.getUserPackagesByUserId = async function(userId: number): Promise<UserPackage[]> {
    const result = await this.db.query.userPackages.findMany({
      where: eq(this.schema.userPackages.userId, userId),
      orderBy: [desc(this.schema.userPackages.assignedAt)]
    });
    return result;
  };
  
  storage.getUserPackagesByPackageId = async function(packageId: number): Promise<UserPackage[]> {
    const result = await this.db.query.userPackages.findMany({
      where: eq(this.schema.userPackages.packageId, packageId),
      orderBy: [asc(this.schema.userPackages.userId)]
    });
    return result;
  };
  
  storage.getActiveUserPackage = async function(userId: number): Promise<UserPackage | undefined> {
    const now = new Date();
    const result = await this.db.query.userPackages.findFirst({
      where: and(
        eq(this.schema.userPackages.userId, userId),
        eq(this.schema.userPackages.isActive, true),
        or(
          isNull(this.schema.userPackages.expiresAt),
          gte(this.schema.userPackages.expiresAt as any, now)
        )
      )
    });
    return result;
  };
  
  storage.createUserPackage = async function(userPackage: InsertUserPackage): Promise<UserPackage> {
    const [result] = await this.db.insert(this.schema.userPackages).values(userPackage).returning();
    return result;
  };
  
  storage.deactivateUserPackage = async function(id: number): Promise<UserPackage> {
    const [result] = await this.db
      .update(this.schema.userPackages)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(this.schema.userPackages.id, id))
      .returning();
    return result;
  };
  
  /**
   * Feature Usage Methods
   */
  
  storage.logFeatureUsage = async function(data: InsertFeatureUsageLog): Promise<FeatureUsageLog> {
    const [result] = await this.db.insert(this.schema.featureUsageLogs).values(data).returning();
    return result;
  };
  
  storage.getFeatureUsageLogsByUserId = async function(userId: number, limit: number = 100): Promise<FeatureUsageLog[]> {
    const result = await this.db.query.featureUsageLogs.findMany({
      where: eq(this.schema.featureUsageLogs.userId, userId),
      orderBy: [desc(this.schema.featureUsageLogs.usedAt as any)],
      limit
    });
    return result;
  };
  
  storage.getFeatureUsageLogsByUserIdAndTimeframe = async function(userId: number, timeframe: string): Promise<FeatureUsageLog[]> {
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30); // Default to 30 days
    }
    
    const result = await this.db.query.featureUsageLogs.findMany({
      where: and(
        eq(this.schema.featureUsageLogs.userId, userId),
        gte(this.schema.featureUsageLogs.usedAt as any, startDate)
      ),
      orderBy: [desc(this.schema.featureUsageLogs.usedAt as any)]
    });
    
    return result;
  };
  
  storage.getFeatureUsageSummary = async function(userId: number, timeframe: string = 'month'): Promise<any> {
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30); // Default to 30 days
    }
    
    // Query to get sum of usage count grouped by feature
    const result = await this.db.select({
      featureKey: this.schema.featureUsageLogs.featureKey,
      totalUsage: sql<number>`sum(${this.schema.featureUsageLogs.usageCount})`,
    })
    .from(this.schema.featureUsageLogs)
    .where(and(
      eq(this.schema.featureUsageLogs.userId, userId),
      gte(this.schema.featureUsageLogs.usedAt as any, startDate)
    ))
    .groupBy(this.schema.featureUsageLogs.featureKey);
    
    return result;
  };
  
  storage.getFeatureUsageSummaryByTimeframe = async function(timeframe: string): Promise<any> {
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
    
    // Query to get sum of usage count grouped by user and feature
    const result = await this.db.select({
      userId: this.schema.featureUsageLogs.userId,
      featureKey: this.schema.featureUsageLogs.featureKey,
      totalUsage: sql<number>`sum(${this.schema.featureUsageLogs.usageCount})`,
    })
    .from(this.schema.featureUsageLogs)
    .where(gte(this.schema.featureUsageLogs.usedAt as any, startDate))
    .groupBy(this.schema.featureUsageLogs.userId, this.schema.featureUsageLogs.featureKey);
    
    return result;
  };
  
  /**
   * Login Activity Methods
   */
  
  storage.createLoginActivity = async function(activity: InsertLoginActivity): Promise<LoginActivity> {
    const [result] = await this.db.insert(this.schema.loginActivity).values(activity).returning();
    return result;
  };
  
  storage.getLoginActivitiesByUserId = async function(userId: number, limit: number = 10): Promise<LoginActivity[]> {
    const result = await this.db.query.loginActivity.findMany({
      where: eq(this.schema.loginActivity.userId, userId),
      orderBy: [desc(this.schema.loginActivity.loginTime as any)],
      limit
    });
    return result;
  };
  
  storage.getLoginActivitySince = async function(date: Date, limit: number = 100): Promise<LoginActivity[]> {
    const result = await this.db.query.loginActivity.findMany({
      where: gte(this.schema.loginActivity.loginTime as any, date),
      orderBy: [desc(this.schema.loginActivity.loginTime as any)],
      limit
    });
    return result;
  };
  
  /**
   * System Activity Methods
   */
  
  storage.createSystemActivity = async function(activity: any): Promise<any> {
    const [result] = await this.db.insert(this.schema.systemActivity).values(activity).returning();
    return result;
  };
  
  storage.getRecentSystemActivity = async function(limit: number = 10): Promise<any[]> {
    const result = await this.db.query.systemActivity.findMany({
      orderBy: [desc(this.schema.systemActivity.timestamp as any)],
      limit
    });
    return result;
  };
  
  storage.getSystemActivitySince = async function(date: Date, limit: number = 100): Promise<any[]> {
    const result = await this.db.query.systemActivity.findMany({
      where: gte(this.schema.systemActivity.timestamp as any, date),
      orderBy: [desc(this.schema.systemActivity.timestamp as any)],
      limit
    });
    return result;
  };
  
  /**
   * Report Cache Methods
   */
  
  storage.createReportCache = async function(data: InsertReportCache): Promise<ReportCache> {
    // Delete any existing cache for this report type
    await this.db.delete(this.schema.reportCache)
      .where(eq(this.schema.reportCache.reportType, data.reportType));
    
    // Create new cache entry
    const [result] = await this.db.insert(this.schema.reportCache).values(data).returning();
    return result;
  };
  
  storage.getReportCacheByType = async function(reportType: string): Promise<ReportCache | undefined> {
    const result = await this.db.query.reportCache.findFirst({
      where: eq(this.schema.reportCache.reportType, reportType)
    });
    return result;
  };
  
  /**
   * Module Status Methods
   */
  
  storage.getAllModuleStatuses = async function(): Promise<any[]> {
    const result = await this.db.query.moduleStatus.findMany({
      orderBy: [asc(this.schema.moduleStatus.name)]
    });
    return result;
  };
  
  return storage;
}

// Extend the storage with user management methods
extendDatabaseStorageWithUserManagement(storage as DatabaseStorage);

// Initialize the user management module
console.log('User management methods initialized');