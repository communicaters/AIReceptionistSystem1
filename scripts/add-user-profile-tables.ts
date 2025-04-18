/**
 * Migration script to add centralized user profile data and interaction tables
 * 
 * Usage: npm run add-user-profile-tables
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating user_profile_data and user_interactions tables...');
  
  try {
    // Create user_profile_data table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_profile_data (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_seen TIMESTAMP,
        last_interaction_source TEXT,
        user_id INTEGER REFERENCES users(id),
        metadata JSONB
      );
    `);

    console.log('Created user_profile_data table');

    // Create user_interactions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_interactions (
        id SERIAL PRIMARY KEY,
        user_profile_id INTEGER NOT NULL REFERENCES user_profile_data(id) ON DELETE CASCADE,
        interaction_source TEXT NOT NULL,
        message_summary TEXT,
        content TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB
      );
    `);

    console.log('Created user_interactions table');

    // Create indexes to improve query performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_profile_email ON user_profile_data (email);
      CREATE INDEX IF NOT EXISTS idx_user_profile_phone ON user_profile_data (phone);
      CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile_data (user_id);
      CREATE INDEX IF NOT EXISTS idx_user_interactions_profile_id ON user_interactions (user_profile_id);
      CREATE INDEX IF NOT EXISTS idx_user_interactions_source ON user_interactions (interaction_source);
      CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions (timestamp);
    `);

    console.log('Created indexes for user profile and interaction tables');

    console.log('Successfully completed migration!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error running migration:', error);
    process.exit(1);
  });