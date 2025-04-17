import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || "";

if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function main() {
  console.log("Connecting to the database...");
  
  const queryClient = postgres(connectionString);
  const db = drizzle(queryClient);
  
  try {
    console.log("Adding timezone column to meeting_logs table...");
    
    // Check if the column already exists first
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'meeting_logs' AND column_name = 'timezone'
    `);
    
    if (checkResult.length === 0) {
      // Add the timezone column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE meeting_logs 
        ADD COLUMN timezone TEXT
      `);
      console.log("Successfully added timezone column to meeting_logs table");
    } else {
      console.log("Column timezone already exists in meeting_logs table");
    }
  } catch (error) {
    console.error("Error adding timezone column:", error);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
  
  console.log("Migration completed successfully");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });