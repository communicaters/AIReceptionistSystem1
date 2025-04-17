/**
 * Script to create an admin user
 * Usage: npm run create-admin
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { genSalt, hash } from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const salt = await genSalt(10);
  return hash(password, salt);
}

async function main() {
  console.log('Creating admin user...');

  // Check if admin already exists
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.username, 'admin'),
  });

  if (existingAdmin) {
    console.log('Admin user already exists');
    process.exit(0);
  }

  // Admin credentials
  const adminUser = {
    username: 'admin',
    email: 'admin@example.com',
    password: await hashPassword('admin123'),
    fullName: 'System Admin',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    createdAt: new Date(),
  };

  // Insert admin user
  const [createdAdmin] = await db.insert(users).values(adminUser).returning();

  console.log('Admin user created successfully:');
  console.log({
    id: createdAdmin.id,
    username: createdAdmin.username,
    email: createdAdmin.email,
    role: createdAdmin.role,
  });
}

main()
  .catch((error) => {
    console.error('Error creating admin user:', error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });