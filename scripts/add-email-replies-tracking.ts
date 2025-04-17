/**
 * Migration script to add email reply tracking to the email_logs table
 * and create a new email_replies table
 * 
 * Usage: npm run migrate-email-replies
 */

import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("🔄 Starting email replies tracking migration...");

    // Add is_replied column to email_logs table
    console.log("Adding is_replied column to email_logs table...");
    await db.execute(sql`
      ALTER TABLE email_logs 
      ADD COLUMN IF NOT EXISTS is_replied BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS in_reply_to TEXT
    `);
    
    // Create email_replies table
    console.log("Creating email_replies table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_replies (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_email_id INTEGER NOT NULL REFERENCES email_logs(id) ON DELETE CASCADE,
        reply_email_id INTEGER REFERENCES email_logs(id) ON DELETE SET NULL,
        auto_generated BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        reply_content TEXT NOT NULL,
        reply_status TEXT NOT NULL DEFAULT 'pending',
        message_id TEXT,
        in_reply_to TEXT,
        reference_ids TEXT,
        error_message TEXT,
        sent_at TIMESTAMP
      )
    `);
    
    // Add indices for better query performance
    console.log("Adding indices for better query performance...");
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_email_logs_is_replied ON email_logs(is_replied)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_email_replies_original_email_id ON email_replies(original_email_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_email_replies_reply_status ON email_replies(reply_status)`);
    
    console.log("✅ Email replies tracking migration completed successfully");
    
  } catch (error) {
    console.error("❌ Error during email replies migration:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error("Failed to run migration:", err);
  process.exit(1);
});