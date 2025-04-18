/**
 * Migration script to update user profile tables with missing columns
 * 
 * Usage: npx tsx scripts/update-profile-tables.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../server/db';

async function main() {
  console.log('Starting migration to update user profile tables...');

  try {
    // Check if column exists
    const columnExists = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'user_profile_data' AND column_name = 'last_interaction_source'
    `);

    if (columnExists.rows.length === 0) {
      console.log('Adding last_interaction_source column to user_profile_data table...');
      
      await db.execute(sql`
        ALTER TABLE user_profile_data 
        ADD COLUMN last_interaction_source VARCHAR(50)
      `);
      
      console.log('Added last_interaction_source column successfully');
    } else {
      console.log('last_interaction_source column already exists');
    }

    // Check if the interaction_type column exists in user_interactions
    const interactionTypeExists = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'user_interactions' AND column_name = 'interaction_type'
    `);

    if (interactionTypeExists.rows.length === 0) {
      console.log('Adding interaction_type column to user_interactions table...');
      
      await db.execute(sql`
        ALTER TABLE user_interactions 
        ADD COLUMN interaction_type VARCHAR(50) NOT NULL DEFAULT 'general'
      `);
      
      console.log('Added interaction_type column successfully');
    } else {
      console.log('interaction_type column already exists');
    }

    // Check if message_summary column exists in user_interactions
    const messageSummaryExists = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'user_interactions' AND column_name = 'message_summary'
    `);

    if (messageSummaryExists.rows.length === 0) {
      console.log('Adding message_summary column to user_interactions table...');
      
      await db.execute(sql`
        ALTER TABLE user_interactions 
        ADD COLUMN message_summary TEXT
      `);
      
      console.log('Added message_summary column successfully');
    } else {
      console.log('message_summary column already exists');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);