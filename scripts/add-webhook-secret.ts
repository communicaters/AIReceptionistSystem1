import { db, pool } from "../server/db";
import { whatsappConfig } from "../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting migration to add webhookSecret column to whatsapp_config table...");
  
  try {
    // Check if the column already exists to avoid errors
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_config' AND column_name = 'webhook_secret'
    `);
    
    if (result.rows.length === 0) {
      // Column doesn't exist, add it
      console.log("Adding webhook_secret column to whatsapp_config table...");
      
      await db.execute(sql`
        ALTER TABLE whatsapp_config 
        ADD COLUMN webhook_secret TEXT
      `);
      
      console.log("Column added successfully!");
    } else {
      console.log("Column webhook_secret already exists, skipping...");
    }
    
    // Set example webhook secret for testing - comment this out in production
    const testConfig = await db.query.whatsappConfig.findFirst({
      where: (whatsapp, { eq }) => eq(whatsapp.userId, 1)
    });
    
    if (testConfig && !testConfig.webhookSecret) {
      console.log("Setting example webhook secret for testing...");
      
      await db.update(whatsappConfig)
        .set({
          webhookSecret: "44f0170e1b16eb8f39828c48bed2ed1dd3fc35e8" // Example value from your webhook test
        })
        .where(sql`id = ${testConfig.id}`);
        
      console.log("Example webhook secret set successfully!");
    }
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);