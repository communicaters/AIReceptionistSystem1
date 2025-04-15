import { db, pool } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Migration script to add Zender-specific columns to whatsapp_config table
 */
async function alterWhatsappConfigTable() {
  try {
    console.log('Adding Zender-specific columns to whatsapp_config table...');

    // Add new columns if they don't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE whatsapp_config 
            ADD COLUMN IF NOT EXISTS api_secret TEXT,
            ADD COLUMN IF NOT EXISTS account_id TEXT,
            ADD COLUMN IF NOT EXISTS zender_url TEXT DEFAULT 'https://pakgame.store/WA/Install/api',
            ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'zender';
        EXCEPTION 
          WHEN duplicate_column THEN 
            NULL;
        END;
        
        BEGIN
          ALTER TABLE whatsapp_config
            ALTER COLUMN phone_number_id DROP NOT NULL,
            ALTER COLUMN access_token DROP NOT NULL,
            ALTER COLUMN business_account_id DROP NOT NULL,
            ALTER COLUMN webhook_verify_token DROP NOT NULL;
        EXCEPTION 
          WHEN others THEN 
            NULL;
        END;
      END $$;
    `);

    console.log('Migration successful!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

async function main() {
  try {
    await alterWhatsappConfigTable();
    await pool.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();