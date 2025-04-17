import { db } from './db';
import { 
  users, User, InsertUser,
  packages, Package, InsertPackage,
  packageFeatures, PackageFeature, InsertPackageFeature,
  userPackages, UserPackage, InsertUserPackage,
  featureUsageLogs, FeatureUsageLog, InsertFeatureUsageLog,
  loginActivity, LoginActivity, InsertLoginActivity,
  adminReportsCache, AdminReportsCache, InsertAdminReportsCache
} from "@shared/schema";
import { eq, desc, and, asc, gte, lt, isNull, not, lte, or, ilike, sql } from 'drizzle-orm';

export class UserManagement {
  constructor() {
    console.log('User management methods initialized');
  }

  // Extended User Management Methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email));
      return result[0];
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      return undefined;
    }
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const result = await db.update(users)
        .set({
          ...user,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in updateUser:", error);
      return undefined;
    }
  }

  async updateUserStatus(id: number, status: string): Promise<User | undefined> {
    try {
      const result = await db.update(users)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in updateUserStatus:", error);
      return undefined;
    }
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    try {
      const result = await db.update(users)
        .set({
          role,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in updateUserRole:", error);
      return undefined;
    }
  }

  async updateUserPassword(id: number, password: string): Promise<User | undefined> {
    try {
      const result = await db.update(users)
        .set({
          password,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in updateUserPassword:", error);
      return undefined;
    }
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    try {
      const result = await db.update(users)
        .set({
          lastLogin: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in updateUserLastLogin:", error);
      return undefined;
    }
  }

  async verifyUserEmail(id: number): Promise<User | undefined> {
    try {
      const result = await db.update(users)
        .set({
          emailVerified: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in verifyUserEmail:", error);
      return undefined;
    }
  }

  async setUserResetToken(id: number, token: string, expiry: Date): Promise<User | undefined> {
    try {
      const result = await db.update(users)
        .set({
          resetToken: token,
          resetTokenExpiry: expiry,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in setUserResetToken:", error);
      return undefined;
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const now = new Date();
      const result = await db.select().from(users).where(
        and(
          eq(users.resetToken, token),
          gte(users.resetTokenExpiry, now)
        )
      );
      
      return result[0];
    } catch (error) {
      console.error("Error in getUserByResetToken:", error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Error in deleteUser:", error);
      return false;
    }
  }

  // Packages
  async getPackage(id: number): Promise<Package | undefined> {
    try {
      const result = await db.select().from(packages).where(eq(packages.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getPackage:", error);
      return undefined;
    }
  }

  async getPackageByName(name: string): Promise<Package | undefined> {
    try {
      const result = await db.select().from(packages).where(eq(packages.name, name));
      return result[0];
    } catch (error) {
      console.error("Error in getPackageByName:", error);
      return undefined;
    }
  }

  async getAllPackages(): Promise<Package[]> {
    try {
      return await db.select().from(packages).orderBy(asc(packages.name));
    } catch (error) {
      console.error("Error in getAllPackages:", error);
      return [];
    }
  }

  async getActivePackages(): Promise<Package[]> {
    try {
      return await db.select().from(packages)
        .where(eq(packages.isActive, true))
        .orderBy(asc(packages.name));
    } catch (error) {
      console.error("Error in getActivePackages:", error);
      return [];
    }
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    try {
      const now = new Date();
      const result = await db.insert(packages).values({
        ...pkg,
        createdAt: now,
        updatedAt: now
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in createPackage:", error);
      throw new Error("Failed to create package");
    }
  }

  async updatePackage(id: number, pkg: Partial<InsertPackage>): Promise<Package | undefined> {
    try {
      const result = await db.update(packages)
        .set({
          ...pkg,
          updatedAt: new Date()
        })
        .where(eq(packages.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in updatePackage:", error);
      return undefined;
    }
  }

  async deletePackage(id: number): Promise<boolean> {
    try {
      await db.delete(packages).where(eq(packages.id, id));
      return true;
    } catch (error) {
      console.error("Error in deletePackage:", error);
      return false;
    }
  }

  // Package Features
  async getPackageFeature(id: number): Promise<PackageFeature | undefined> {
    try {
      const result = await db.select().from(packageFeatures).where(eq(packageFeatures.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getPackageFeature:", error);
      return undefined;
    }
  }

  async getPackageFeaturesByPackageId(packageId: number): Promise<PackageFeature[]> {
    try {
      return await db.select().from(packageFeatures)
        .where(eq(packageFeatures.packageId, packageId))
        .orderBy(asc(packageFeatures.featureKey));
    } catch (error) {
      console.error("Error in getPackageFeaturesByPackageId:", error);
      return [];
    }
  }

  async getPackageFeatureByKey(packageId: number, featureKey: string): Promise<PackageFeature | undefined> {
    try {
      const result = await db.select().from(packageFeatures)
        .where(and(
          eq(packageFeatures.packageId, packageId),
          eq(packageFeatures.featureKey, featureKey)
        ));
      
      return result[0];
    } catch (error) {
      console.error("Error in getPackageFeatureByKey:", error);
      return undefined;
    }
  }

  async createPackageFeature(feature: InsertPackageFeature): Promise<PackageFeature> {
    try {
      const result = await db.insert(packageFeatures).values(feature).returning();
      return result[0];
    } catch (error) {
      console.error("Error in createPackageFeature:", error);
      throw new Error("Failed to create package feature");
    }
  }

  async updatePackageFeature(id: number, feature: Partial<InsertPackageFeature>): Promise<PackageFeature | undefined> {
    try {
      const result = await db.update(packageFeatures)
        .set(feature)
        .where(eq(packageFeatures.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in updatePackageFeature:", error);
      return undefined;
    }
  }

  async deletePackageFeature(id: number): Promise<boolean> {
    try {
      await db.delete(packageFeatures).where(eq(packageFeatures.id, id));
      return true;
    } catch (error) {
      console.error("Error in deletePackageFeature:", error);
      return false;
    }
  }

  // User Packages
  async getUserPackage(id: number): Promise<UserPackage | undefined> {
    try {
      const result = await db.select().from(userPackages).where(eq(userPackages.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getUserPackage:", error);
      return undefined;
    }
  }

  async getUserPackagesByUserId(userId: number): Promise<UserPackage[]> {
    try {
      return await db.select().from(userPackages)
        .where(eq(userPackages.userId, userId))
        .orderBy(desc(userPackages.assignedAt));
    } catch (error) {
      console.error("Error in getUserPackagesByUserId:", error);
      return [];
    }
  }

  async getActiveUserPackage(userId: number): Promise<UserPackage | undefined> {
    try {
      const now = new Date();
      const result = await db.select().from(userPackages)
        .where(and(
          eq(userPackages.userId, userId),
          eq(userPackages.isActive, true),
          or(
            isNull(userPackages.expiresAt),
            gte(userPackages.expiresAt, now)
          )
        ))
        .orderBy(desc(userPackages.assignedAt))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error in getActiveUserPackage:", error);
      return undefined;
    }
  }

  async createUserPackage(userPackage: InsertUserPackage): Promise<UserPackage> {
    try {
      // Default assignedAt to current date if not provided
      const now = new Date();
      const assignedAt = userPackage.assignedAt || now;
      
      const result = await db.insert(userPackages).values({
        ...userPackage,
        assignedAt
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in createUserPackage:", error);
      throw new Error("Failed to create user package");
    }
  }

  async updateUserPackage(id: number, userPackage: Partial<InsertUserPackage>): Promise<UserPackage | undefined> {
    try {
      const result = await db.update(userPackages)
        .set(userPackage)
        .where(eq(userPackages.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in updateUserPackage:", error);
      return undefined;
    }
  }

  async deactivateUserPackage(id: number): Promise<UserPackage | undefined> {
    try {
      const result = await db.update(userPackages)
        .set({ isActive: false })
        .where(eq(userPackages.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in deactivateUserPackage:", error);
      return undefined;
    }
  }

  async deleteUserPackage(id: number): Promise<boolean> {
    try {
      await db.delete(userPackages).where(eq(userPackages.id, id));
      return true;
    } catch (error) {
      console.error("Error in deleteUserPackage:", error);
      return false;
    }
  }

  // Feature Usage Logs
  async getFeatureUsageLog(id: number): Promise<FeatureUsageLog | undefined> {
    try {
      const result = await db.select().from(featureUsageLogs).where(eq(featureUsageLogs.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getFeatureUsageLog:", error);
      return undefined;
    }
  }

  async getFeatureUsageLogsByUserId(userId: number): Promise<FeatureUsageLog[]> {
    try {
      return await db.select().from(featureUsageLogs)
        .where(eq(featureUsageLogs.userId, userId))
        .orderBy(desc(featureUsageLogs.usedAt));
    } catch (error) {
      console.error("Error in getFeatureUsageLogsByUserId:", error);
      return [];
    }
  }

  async getFeatureUsageLogsByFeatureKey(userId: number, featureKey: string): Promise<FeatureUsageLog[]> {
    try {
      return await db.select().from(featureUsageLogs)
        .where(and(
          eq(featureUsageLogs.userId, userId),
          eq(featureUsageLogs.featureKey, featureKey)
        ))
        .orderBy(desc(featureUsageLogs.usedAt));
    } catch (error) {
      console.error("Error in getFeatureUsageLogsByFeatureKey:", error);
      return [];
    }
  }

  async getFeatureUsageSummary(userId: number, timeframe?: string): Promise<any> {
    try {
      let startDate: Date | undefined;
      const now = new Date();
      
      // Set timeframe filter if provided
      if (timeframe) {
        startDate = new Date();
        if (timeframe === 'day') {
          startDate.setDate(startDate.getDate() - 1);
        } else if (timeframe === 'week') {
          startDate.setDate(startDate.getDate() - 7);
        } else if (timeframe === 'month') {
          startDate.setMonth(startDate.getMonth() - 1);
        } else if (timeframe === 'year') {
          startDate.setFullYear(startDate.getFullYear() - 1);
        }
      }
      
      // Build query
      let query = db.select({
        featureKey: featureUsageLogs.featureKey,
        totalUsage: sql`SUM(${featureUsageLogs.usageCount})`,
      })
        .from(featureUsageLogs)
        .where(eq(featureUsageLogs.userId, userId));
      
      // Add timeframe filter if set
      if (startDate) {
        query = query.where(gte(featureUsageLogs.usedAt, startDate));
      }
      
      // Group and order results
      query = query
        .groupBy(featureUsageLogs.featureKey)
        .orderBy(desc(sql`SUM(${featureUsageLogs.usageCount})`));
      
      const results = await query;
      
      return results.map(result => ({
        featureKey: result.featureKey,
        totalUsage: Number(result.totalUsage),
      }));
    } catch (error) {
      console.error("Error in getFeatureUsageSummary:", error);
      return [];
    }
  }

  async createFeatureUsageLog(log: InsertFeatureUsageLog): Promise<FeatureUsageLog> {
    try {
      const result = await db.insert(featureUsageLogs).values({
        ...log,
        usedAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in createFeatureUsageLog:", error);
      throw new Error("Failed to create feature usage log");
    }
  }

  // Login Activity
  async getLoginActivity(id: number): Promise<LoginActivity | undefined> {
    try {
      const result = await db.select().from(loginActivity).where(eq(loginActivity.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getLoginActivity:", error);
      return undefined;
    }
  }

  async getLoginActivitiesByUserId(userId: number, limit?: number): Promise<LoginActivity[]> {
    try {
      let query = db.select().from(loginActivity)
        .where(eq(loginActivity.userId, userId))
        .orderBy(desc(loginActivity.loginTime));
      
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      console.error("Error in getLoginActivitiesByUserId:", error);
      return [];
    }
  }

  async createLoginActivity(activity: InsertLoginActivity): Promise<LoginActivity> {
    try {
      const result = await db.insert(loginActivity).values({
        ...activity,
        loginTime: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in createLoginActivity:", error);
      throw new Error("Failed to create login activity");
    }
  }

  // Admin Reports Cache
  async getReportCache(id: number): Promise<AdminReportsCache | undefined> {
    try {
      const result = await db.select().from(adminReportsCache).where(eq(adminReportsCache.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getReportCache:", error);
      return undefined;
    }
  }

  async getReportCacheByType(reportType: string): Promise<AdminReportsCache | undefined> {
    try {
      // Get the most recent valid cache for the report type
      const now = new Date();
      const result = await db.select().from(adminReportsCache)
        .where(and(
          eq(adminReportsCache.reportType, reportType),
          gte(adminReportsCache.expiresAt, now)
        ))
        .orderBy(desc(adminReportsCache.generatedAt))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("Error in getReportCacheByType:", error);
      return undefined;
    }
  }

  async createReportCache(report: InsertAdminReportsCache): Promise<AdminReportsCache> {
    try {
      const result = await db.insert(adminReportsCache).values({
        ...report,
        generatedAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error in createReportCache:", error);
      throw new Error("Failed to create report cache");
    }
  }

  async deleteReportCache(id: number): Promise<boolean> {
    try {
      await db.delete(adminReportsCache).where(eq(adminReportsCache.id, id));
      return true;
    } catch (error) {
      console.error("Error in deleteReportCache:", error);
      return false;
    }
  }
}

// Create a singleton instance
export const userManagement = new UserManagement();