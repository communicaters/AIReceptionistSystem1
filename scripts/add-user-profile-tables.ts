/**
 * Migration script to add centralized user profile data and interaction tables
 * 
 * Usage: npm run add-user-profile-tables
 */

import { sql } from 'drizzle-orm';
import { db } from '../server/db';
import { users, userProfileData, userInteractions } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Starting migration to add user profile data and interaction tables...');

  try {
    // Check if tables already exist
    const existingTables = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('user_profile_data', 'user_interactions')
    `);

    let userProfileDataExists = false;
    let userInteractionsExists = false;

    for (const row of existingTables.rows) {
      if (row.table_name === 'user_profile_data') userProfileDataExists = true;
      if (row.table_name === 'user_interactions') userInteractionsExists = true;
    }

    // Create user_profile_data table if it doesn't exist
    if (!userProfileDataExists) {
      console.log('Creating user_profile_data table...');
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS user_profile_data (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          email VARCHAR(255) UNIQUE,
          name VARCHAR(255),
          phone VARCHAR(50),
          metadata JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_seen TIMESTAMP
        )
      `);
      
      console.log('user_profile_data table created successfully.');
      
      // Create indexes for faster lookups
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_profile_data_user_id ON user_profile_data(user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_profile_data_email ON user_profile_data(email)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_profile_data_phone ON user_profile_data(phone)`);
      
      console.log('Created indexes for user_profile_data table.');
    } else {
      console.log('user_profile_data table already exists, skipping creation.');
    }

    // Create user_interactions table if it doesn't exist
    if (!userInteractionsExists) {
      console.log('Creating user_interactions table...');
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS user_interactions (
          id SERIAL PRIMARY KEY,
          user_profile_id INTEGER REFERENCES user_profile_data(id),
          interaction_source VARCHAR(50) NOT NULL,
          interaction_type VARCHAR(50) NOT NULL,
          content TEXT,
          metadata JSONB,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      console.log('user_interactions table created successfully.');
      
      // Create indexes for faster lookups
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_interactions_profile ON user_interactions(user_profile_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_interactions_source ON user_interactions(interaction_source)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions(timestamp)`);
      
      console.log('Created indexes for user_interactions table.');
    } else {
      console.log('user_interactions table already exists, skipping creation.');
    }

    // Initialize profile data from existing users
    if (userProfileDataExists) {
      console.log('Creating initial profile data from existing users...');
      
      // Get all users
      const allUsers = await db.select().from(users);
      
      // For each user, check if they already have a profile
      for (const user of allUsers) {
        const existingProfile = await db.select().from(userProfileData)
          .where(eq(userProfileData.userId, user.id));
        
        if (existingProfile.length === 0) {
          // Create a profile for this user
          await db.insert(userProfileData).values({
            userId: user.id,
            email: user.email,
            name: user.fullName,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          console.log(`Created profile for user: ${user.username} (${user.email})`);
        } else {
          console.log(`Profile already exists for user: ${user.username} (${user.email})`);
        }
      }
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });