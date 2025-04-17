import { pgTable, serial, text, integer, boolean, timestamp, json, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Define user status enum
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);

// Define user role enum
export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'manager']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('inactive'),
  emailVerified: boolean('email_verified').notNull().default(false),
  verificationToken: text('verification_token'),
  resetToken: text('reset_token'),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastLogin: timestamp('last_login'),
});

// Subscription packages
export const packages = pgTable('packages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  price: integer('price').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Package features
export const packageFeatures = pgTable('package_features', {
  id: serial('id').primaryKey(),
  packageId: integer('package_id').notNull().references(() => packages.id),
  featureKey: text('feature_key').notNull(), // e.g., 'calls', 'meetings', 'whatsapp'
  usageLimit: integer('usage_limit'), // null means unlimited
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// User packages (subscription assignments)
export const userPackages = pgTable('user_packages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  packageId: integer('package_id').notNull().references(() => packages.id),
  isActive: boolean('is_active').notNull().default(true),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // null means no expiry
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Feature usage logs
export const featureUsageLogs = pgTable('feature_usage_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  featureKey: text('feature_key').notNull(),
  usageCount: integer('usage_count').notNull().default(1),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  metadata: json('metadata'), // Additional information about the usage
});

// Login activity
export const loginActivity = pgTable('login_activity', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  loginTime: timestamp('login_time').notNull().defaultNow(),
  status: text('status').notNull(), // 'successful', 'failed'
  failureReason: text('failure_reason'),
});

// Report caching for performance
export const reportCache = pgTable('report_cache', {
  id: serial('id').primaryKey(),
  reportType: text('report_type').notNull(),
  reportData: text('report_data').notNull(),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Create Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  lastLogin: true,
  verificationToken: true,
  resetToken: true,
  resetTokenExpiry: true,
});

export const insertPackageSchema = createInsertSchema(packages).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
});

export const insertPackageFeatureSchema = createInsertSchema(packageFeatures).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
});

export const insertUserPackageSchema = createInsertSchema(userPackages).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
});

export const insertFeatureUsageLogSchema = createInsertSchema(featureUsageLogs).omit({ 
  id: true, 
  timestamp: true,
});

export const insertLoginActivitySchema = createInsertSchema(loginActivity).omit({ 
  id: true,
});

export const insertReportCacheSchema = createInsertSchema(reportCache).omit({ 
  id: true, 
  generatedAt: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;

export type PackageFeature = typeof packageFeatures.$inferSelect;
export type InsertPackageFeature = z.infer<typeof insertPackageFeatureSchema>;

export type UserPackage = typeof userPackages.$inferSelect;
export type InsertUserPackage = z.infer<typeof insertUserPackageSchema>;

export type FeatureUsageLog = typeof featureUsageLogs.$inferSelect;
export type InsertFeatureUsageLog = z.infer<typeof insertFeatureUsageLogSchema>;

export type LoginActivity = typeof loginActivity.$inferSelect;
export type InsertLoginActivity = z.infer<typeof insertLoginActivitySchema>;

export type ReportCache = typeof reportCache.$inferSelect;
export type InsertReportCache = z.infer<typeof insertReportCacheSchema>;