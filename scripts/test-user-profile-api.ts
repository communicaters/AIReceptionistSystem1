/**
 * Script to test the user profile API endpoints
 * 
 * Usage: npx tsx scripts/test-user-profile-api.ts
 */

import { db } from '../server/db';
import { storage } from '../server/database-storage';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';

// Helper to hash passwords
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

async function main() {
  console.log('Testing User Profile API endpoints...');

  // Step 1: Check for existing admin user or create one
  const adminUser = await db.select().from(users).where(eq(users.username, 'adminuser')).limit(1);
  let adminId: number;
  let token: string;

  if (adminUser.length === 0) {
    // Create admin user
    console.log('Creating admin user for testing...');
    const [newAdmin] = await db.insert(users).values({
      username: 'adminuser',
      email: 'admin@example.com',
      password: await hashPassword('admin123'),
      fullName: 'System Admin',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    adminId = newAdmin.id;
    console.log(`Admin user created with ID: ${adminId}`);
  } else {
    adminId = adminUser[0].id;
    console.log(`Using existing admin user with ID: ${adminId}`);
  }

  // Step 2: Login and get JWT token
  console.log('\nLogging in to get authentication token...');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernameOrEmail: 'adminuser',
      password: 'admin123'
    })
  });

  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    process.exit(1);
  }

  const loginData = await loginRes.json() as any;
  token = loginData.token;
  console.log(`Login successful, received token: ${token.substring(0, 20)}...`);

  // Step 3: Create test user profiles if needed
  console.log('\nChecking for test user profiles...');
  
  // First check if we already have test profiles
  const existingProfiles = await storage.getUserProfilesByUserId(adminId);
  if (existingProfiles.length > 0) {
    console.log(`Found ${existingProfiles.length} existing user profiles.`);
  } else {
    console.log('Creating test user profiles...');
    
    // Create some test profiles
    await storage.createUserProfile({
      userId: adminId,
      name: 'John Test',
      email: 'john.test@example.com',
      phone: '+1234567890',
      metadata: { company: 'Test Company', role: 'Customer' },
      lastSeen: new Date()
    });

    await storage.createUserProfile({
      userId: adminId,
      name: 'Jane Sample',
      email: 'jane.sample@example.com',
      phone: '+9876543210',
      metadata: { company: 'Sample Corp', role: 'Lead' },
      lastSeen: new Date()
    });

    console.log('Created 2 test user profiles.');
  }

  // Step 4: Test user profile API endpoints
  console.log('\nTesting user profiles API endpoints...');
  
  // Get all profiles for the current user
  console.log('\n1. Getting profiles with userId parameter:');
  const profilesRes = await fetch(`http://localhost:5000/api/user-profiles?userId=${adminId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!profilesRes.ok) {
    console.error('Failed to get profiles:', await profilesRes.text());
  } else {
    const profiles = await profilesRes.json();
    console.log(`Found ${profiles.length} profiles:`);
    
    for (const profile of profiles) {
      console.log(`- ID: ${profile.id}, Name: ${profile.name}, Email: ${profile.email}`);
      
      // Get single profile by ID
      console.log(`\n2. Getting profile by ID ${profile.id}:`);
      const profileRes = await fetch(`http://localhost:5000/api/user-profiles/${profile.id}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!profileRes.ok) {
        console.error(`Failed to get profile ${profile.id}:`, await profileRes.text());
      } else {
        const profileData = await profileRes.json();
        console.log(`Retrieved profile: ${profileData.name} (${profileData.email})`);
        
        // Get interactions for this profile
        console.log(`\n3. Getting interactions for profile ID ${profile.id}:`);
        const interactionsRes = await fetch(`http://localhost:5000/api/user-profiles/${profile.id}/interactions`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!interactionsRes.ok) {
          console.error(`Failed to get interactions for profile ${profile.id}:`, await interactionsRes.text());
        } else {
          const interactions = await interactionsRes.json();
          console.log(`Found ${interactions.length} interactions`);
          
          // Create a test interaction if none exist
          if (interactions.length === 0) {
            console.log(`\n4. Creating test interaction for profile ID ${profile.id}:`);
            const createInteractionRes = await fetch(`http://localhost:5000/api/user-profiles/${profile.id}/interactions`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                source: 'test',
                type: 'api',
                content: 'Test interaction for API verification',
                metadata: { test: true, timestamp: new Date().toISOString() }
              })
            });

            if (!createInteractionRes.ok) {
              console.error(`Failed to create test interaction:`, await createInteractionRes.text());
            } else {
              const newInteraction = await createInteractionRes.json();
              console.log(`Created interaction with ID: ${newInteraction.id}`);
            }
          }
        }
      }
      
      // Only test the first profile
      break;
    }
  }

  console.log('\nUser Profile API testing complete!');
}

main()
  .catch(err => {
    console.error('Error testing user profile API:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.end();
    process.exit(0);
  });