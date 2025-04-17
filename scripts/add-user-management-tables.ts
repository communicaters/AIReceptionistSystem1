/**
 * Migration script to add user management tables and fields
 * Usage: npm run migrate-user-management
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config();

// Get database connection string from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function main() {
  // Connect to the database
  console.log('Connecting to the database...');
  
  // Create a connection
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);
  
  console.log('Adding user management tables...');

  try {
    // Add status enum type to users table if it doesn't exist
    await db.execute(sql`
      DO $$
      BEGIN
        -- Check if the user_status type exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
          CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
        END IF;
      END
      $$;
    `);

    // Add role enum type to users table if it doesn't exist
    await db.execute(sql`
      DO $$
      BEGIN
        -- Check if the user_role type exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('user', 'admin', 'manager');
        END IF;
      END
      $$;
    `);

    // Update users table - add missing fields
    await db.execute(sql`
      DO $$
      BEGIN
        -- Add status column with proper type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
          ALTER TABLE users ADD COLUMN status user_status NOT NULL DEFAULT 'active';
        ELSE 
          -- If it exists but is not the correct type, handle conversion
          IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') = 'text' THEN
            -- First, remove default value if exists
            ALTER TABLE users ALTER COLUMN status DROP DEFAULT;
            -- Then convert the type
            ALTER TABLE users ALTER COLUMN status TYPE user_status USING 
              CASE 
                WHEN status = 'inactive' THEN 'inactive'::user_status 
                WHEN status = 'suspended' THEN 'suspended'::user_status
                ELSE 'active'::user_status 
              END;
            -- Set the default back
            ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active'::user_status;
          END IF;
        END IF;

        -- Add role column with proper type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
          ALTER TABLE users ADD COLUMN role user_role NOT NULL DEFAULT 'user';
        ELSE 
          -- If it exists but is not the correct type, handle conversion
          IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') = 'text' THEN
            -- First, remove default value if exists
            ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
            -- Then convert the type
            ALTER TABLE users ALTER COLUMN role TYPE user_role USING 
              CASE 
                WHEN role = 'admin' THEN 'admin'::user_role 
                WHEN role = 'manager' THEN 'manager'::user_role
                ELSE 'user'::user_role 
              END;
            -- Set the default back
            ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'::user_role;
          END IF;
        END IF;

        -- Add email_verified column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
          ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
        END IF;

        -- Add verification_token column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'verification_token') THEN
          ALTER TABLE users ADD COLUMN verification_token TEXT;
        END IF;

        -- Add reset_token column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'reset_token') THEN
          ALTER TABLE users ADD COLUMN reset_token TEXT;
        END IF;

        -- Add reset_token_expiry column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'reset_token_expiry') THEN
          ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMP;
        END IF;

        -- Add last_login column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login') THEN
          ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
        END IF;
      END
      $$;
    `);

    // Create packages table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS packages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        price INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create package_features table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS package_features (
        id SERIAL PRIMARY KEY,
        package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
        feature_key TEXT NOT NULL,
        usage_limit INTEGER,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(package_id, feature_key)
      );
    `);

    // Create user_packages table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_packages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create feature_usage_logs table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS feature_usage_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        feature_key TEXT NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 1,
        used_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB
      );
    `);

    // Create login_activity table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS login_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_address TEXT,
        user_agent TEXT,
        login_time TIMESTAMP NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL,
        failure_reason TEXT,
        metadata JSONB
      );
    `);

    // Create report_cache table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS report_cache (
        id SERIAL PRIMARY KEY,
        report_type TEXT NOT NULL,
        report_data TEXT NOT NULL,
        generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      );
    `);

    console.log('User management tables and fields added successfully');
  } catch (error) {
    console.error('Error adding user management tables and fields:', error);
    throw error;
  } finally {
    await client.end();
  }
}

main()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });