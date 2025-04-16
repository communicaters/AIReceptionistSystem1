import { db } from '../server/db';
import { pgTable, serial, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';

/**
 * Migration script to create a new facebook_whatsapp_config table
 * and migrate the existing WhatsApp configs for Facebook provider
 */
 
// Define the schema for the new Facebook WhatsApp config table
const facebookWhatsappConfig = pgTable('facebook_whatsapp_config', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull(),
  phoneNumberId: varchar('phone_number_id').notNull(),
  accessToken: varchar('access_token').notNull(),
  businessAccountId: varchar('business_account_id').notNull(),
  webhookVerifyToken: varchar('webhook_verify_token'),
  webhookSecret: varchar('webhook_secret'),
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Function to create the new table
async function createFacebookWhatsappConfigTable() {
  try {
    // Check if the table already exists
    const { rows } = await db.execute(`
      SELECT * FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'facebook_whatsapp_config'
    `);
    
    if (rows.length > 0) {
      console.log('Table facebook_whatsapp_config already exists');
      return;
    }
    
    // Create the new table
    await db.execute(`
      CREATE TABLE facebook_whatsapp_config (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        phone_number_id VARCHAR(255) NOT NULL,
        access_token VARCHAR(1024) NOT NULL,
        business_account_id VARCHAR(255) NOT NULL,
        webhook_verify_token VARCHAR(255),
        webhook_secret VARCHAR(255),
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Successfully created facebook_whatsapp_config table');
  } catch (error) {
    console.error('Error creating facebook_whatsapp_config table:', error);
    throw error;
  }
}

// Function to migrate existing Facebook configs
async function migrateExistingFacebookConfigs() {
  try {
    // Get existing WhatsApp configs with provider = 'facebook'
    const { rows: existingConfigs } = await db.execute(`
      SELECT * FROM whatsapp_config 
      WHERE provider = 'facebook' OR provider IS NULL
    `);
    
    console.log(`Found ${existingConfigs.length} existing Facebook WhatsApp configs to migrate`);
    
    // Migrate each config to the new table
    for (const config of existingConfigs) {
      // Skip if missing required fields
      if (!config.phone_number_id || !config.access_token || !config.business_account_id) {
        console.log(`Skipping config ${config.id} - missing required fields`);
        continue;
      }
      
      // Check if a config already exists for this user
      const { rows: existingFacebookConfigs } = await db.execute(`
        SELECT * FROM facebook_whatsapp_config 
        WHERE user_id = $1
      `, config.user_id);
      
      if (existingFacebookConfigs.length > 0) {
        console.log(`User ${config.user_id} already has a Facebook WhatsApp config, updating it`);
        
        await db.execute(`
          UPDATE facebook_whatsapp_config
          SET 
            phone_number_id = $1,
            access_token = $2,
            business_account_id = $3,
            webhook_verify_token = $4,
            webhook_secret = $5,
            is_active = $6,
            updated_at = NOW()
          WHERE user_id = $7
        `, config.phone_number_id, 
           config.access_token,
           config.business_account_id,
           config.webhook_verify_token,
           config.webhook_secret,
           config.is_active,
           config.user_id);
      } else {
        console.log(`Creating new Facebook WhatsApp config for user ${config.user_id}`);
        
        await db.execute(`
          INSERT INTO facebook_whatsapp_config (
            user_id, 
            phone_number_id, 
            access_token, 
            business_account_id, 
            webhook_verify_token, 
            webhook_secret, 
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          config.user_id,
          config.phone_number_id,
          config.access_token,
          config.business_account_id,
          config.webhook_verify_token,
          config.webhook_secret,
          config.is_active
        ]);
      }
    }
    
    console.log('Successfully migrated existing Facebook WhatsApp configs');
  } catch (error) {
    console.error('Error migrating Facebook WhatsApp configs:', error);
    throw error;
  }
}

// Update whatsapp_config table to make it exclusively for Zender
async function updateWhatsappConfigTableForZender() {
  try {
    // Check which configs are currently being used by Zender
    const { rows: zenderConfigs } = await db.execute(`
      SELECT * FROM whatsapp_config 
      WHERE provider = 'zender'
    `);
    
    console.log(`Found ${zenderConfigs.length} existing Zender WhatsApp configs`);
    
    // Update existing FB configs to be Zender-specific
    if (zenderConfigs.length === 0) {
      console.log('No existing Zender configs found, skipping update');
      return;
    }
    
    // Update the whatsapp_config table
    await db.execute(`
      UPDATE whatsapp_config
      SET provider = 'zender'
      WHERE id > 0
    `);
    
    console.log('Successfully updated whatsapp_config table for Zender');
  } catch (error) {
    console.error('Error updating whatsapp_config table:', error);
    throw error;
  }
}

// Main function to run all migration steps
async function main() {
  try {
    console.log('Starting Facebook WhatsApp configuration migration...');
    
    // Create the new table for Facebook configs
    await createFacebookWhatsappConfigTable();
    
    // Migrate existing Facebook configs
    await migrateExistingFacebookConfigs();
    
    // Update whatsapp_config table for Zender
    await updateWhatsappConfigTableForZender();
    
    console.log('Facebook WhatsApp configuration migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);