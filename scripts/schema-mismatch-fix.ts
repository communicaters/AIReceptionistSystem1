/**
 * Script to diagnose and fix schema mismatches between our code and the actual database
 */

import { pool, db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Starting schema mismatch diagnosis...");

  try {
    // Check training_data table structure
    console.log("Checking training_data table structure...");
    const trainingDataColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'training_data'
      ORDER BY ordinal_position;
    `);
    
    console.log("Current training_data table structure:");
    console.table(trainingDataColumns.rows);

    // Check intent_map table structure
    console.log("\nChecking intent_map table structure...");
    const intentMapColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'intent_map'
      ORDER BY ordinal_position;
    `);
    
    console.log("Current intent_map table structure:");
    console.table(intentMapColumns.rows);

    // Compare with migrations/schema.ts definition
    console.log("\nThere appears to be a mismatch between the migrations/schema.ts file and the actual database schema.");
    console.log("migrations/schema.ts defines training_data with columns: id, userId, category, question, answer");
    console.log("But the database has: id, user_id, category, content, embedding, metadata, created_at");
    
    console.log("\nSimilarly, migrations/schema.ts defines intent_map with columns: id, userId, intent, examples");
    console.log("But the database may have different columns");
    
    console.log("\nPossible solutions:");
    console.log("1. Update migrations/schema.ts to match the actual database schema");
    console.log("2. Update our script to use the actual column names from the database");
    console.log("3. If needed, create a DB migration to align the schema");

  } catch (error) {
    console.error("Error diagnosing schema mismatches:", error);
  } finally {
    await pool.end();
  }
}

main()
  .then(() => {
    console.log("\nSchema mismatch diagnosis complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });