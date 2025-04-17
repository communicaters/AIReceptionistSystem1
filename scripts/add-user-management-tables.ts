import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";
import * as dotenv from "dotenv";
import path from "path";
import { eq } from "drizzle-orm";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  console.log("Adding user management tables...");
  
  // Create a Postgres client
  const connectionString = process.env.DATABASE_URL || "";
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });
  
  try {
    console.log("Adding user management tables...");
    
    // Check if the first user exists and update them to be an admin if needed
    const adminUser = await db.query.users.findFirst();
    if (adminUser && adminUser.role !== 'admin') {
      console.log("Upgrading first user to admin role...");
      await db.update(schema.users)
        .set({ role: 'admin' })
        .where(eq(schema.users.id, adminUser.id));
    }
    
    // Create a default package
    console.log("Creating default package...");
    const defaultPackage = await db.query.packages.findFirst({
      where: eq(schema.packages.name, "Enterprise Plan")
    });
    
    if (!defaultPackage) {
      const result = await db.insert(schema.packages).values({
        name: "Enterprise Plan",
        description: "Full access to all features",
        price: 9999,
        isActive: true,
      }).returning();
      
      console.log("Added default package:", result[0]);
      
      // Create package features for all modules
      const packageId = result[0].id;
      const features = [
        { packageId, featureKey: "voice_call", usageLimit: null, isEnabled: true },
        { packageId, featureKey: "email_management", usageLimit: null, isEnabled: true },
        { packageId, featureKey: "live_chat", usageLimit: null, isEnabled: true },
        { packageId, featureKey: "whatsapp", usageLimit: null, isEnabled: true },
        { packageId, featureKey: "calendar", usageLimit: null, isEnabled: true },
        { packageId, featureKey: "products", usageLimit: null, isEnabled: true },
        { packageId, featureKey: "ai_training", usageLimit: null, isEnabled: true },
        { packageId, featureKey: "speech_engines", usageLimit: null, isEnabled: true },
      ];
      
      for (const feature of features) {
        await db.insert(schema.packageFeatures).values(feature);
      }
      
      // Assign default package to first user if they exist
      if (adminUser) {
        await db.insert(schema.userPackages).values({
          userId: adminUser.id,
          packageId,
          isActive: true,
        });
      }
    }
    
    console.log("User management tables migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    // Close database connection
    await client.end();
    console.log("Database connection closed");
  }
}

main().catch(console.error);