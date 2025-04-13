import { pool } from "../server/db";

/**
 * Script to verify that all foreign key constraints have been properly added to the database
 */
async function main() {
  try {
    console.log("Connecting to database...");
    
    const connectionString = process.env.DATABASE_URL || "";
    // Just show a masked version of the connection string for security
    const maskedConnectionString = connectionString.replace(/:[^@]*@/, ":****@");
    console.log(`Connected to database: ${maskedConnectionString}`);
    
    // Query to list all tables in the database
    const tablesResult = await pool.query(
      `SELECT tablename FROM pg_catalog.pg_tables 
       WHERE schemaname = 'public'
       ORDER BY tablename;`
    );
    
    console.log("\n=== Tables in database ===");
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.tablename}`);
    });
    
    // Query to list all foreign key constraints in the database
    const constraintsResult = await pool.query(
      `SELECT
        tc.table_name, 
        tc.constraint_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
       FROM information_schema.table_constraints AS tc 
       JOIN information_schema.key_column_usage AS kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage AS ccu
         ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
       JOIN information_schema.referential_constraints AS rc
         ON rc.constraint_name = tc.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY'
       ORDER BY tc.table_name;`
    );
    
    console.log("\n=== Foreign Key Constraints ===");
    if (constraintsResult.rows.length === 0) {
      console.log("No foreign key constraints found!");
    } else {
      constraintsResult.rows.forEach(row => {
        console.log(`Table: ${row.table_name}, Column: ${row.column_name} -> References ${row.foreign_table_name}(${row.foreign_column_name}) [ON DELETE ${row.delete_rule}]`);
      });
      console.log(`\nTotal foreign key constraints: ${constraintsResult.rows.length}`);
    }
    
    // Query to list the schema of all tables with foreign keys
    console.log("\n=== Table Schemas with Foreign Keys ===");
    const uniqueTables = new Set(constraintsResult.rows.map(row => row.table_name));
    
    for (const tableName of uniqueTables) {
      const tableSchema = await pool.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position;`,
        [tableName]
      );
      
      console.log(`\nTable: ${tableName}`);
      tableSchema.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    }

    console.log("\nConstraint verification completed successfully!");
  } catch (error) {
    console.error("Error verifying constraints:", error);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});