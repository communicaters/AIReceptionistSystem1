import { db, pool } from '../server/db';
import * as schema from '../shared/schema';

console.log('Starting database migration...');

async function main() {
  try {
    // Push the schema to the database
    console.log('Pushing schema to database...');
    
    // This will create all tables if they don't exist
    await db.insert(schema.users).values({
      username: 'admin',
      password: 'admin123', // In a real app, this would be hashed
      fullName: 'Admin User',
      role: 'admin',
      email: 'admin@example.com',
    }).onConflictDoNothing();
    
    // Create default module statuses
    const modules = [
      {
        name: "Voice Call Handling",
        status: "operational",
        responseTime: 128,
        successRate: 98,
      },
      {
        name: "Email Management",
        status: "operational",
        responseTime: 95,
        successRate: 99,
      },
      {
        name: "Live Chat",
        status: "degraded",
        responseTime: 342,
        successRate: 91,
      },
      {
        name: "WhatsApp Business",
        status: "outage",
        responseTime: null,
        successRate: 0,
      },
      {
        name: "Calendar & Scheduling",
        status: "operational",
        responseTime: 112,
        successRate: 97,
      },
      {
        name: "Product & Pricing",
        status: "operational",
        responseTime: 154,
        successRate: 99,
      },
      {
        name: "AI Core & Training",
        status: "operational",
        responseTime: 88,
        successRate: 95,
      },
      {
        name: "Speech Engines",
        status: "operational",
        responseTime: 105,
        successRate: 96,
      },
    ];

    for (const module of modules) {
      await db.insert(schema.moduleStatus).values({
        name: module.name,
        status: module.status,
        responseTime: module.responseTime,
        successRate: module.successRate,
        lastChecked: new Date(),
        details: null,
      }).onConflictDoNothing();
    }

    // Create default system activities
    const activities = [
      {
        module: "Voice Call",
        event: "Inbound Call Handled",
        status: "Completed",
        details: { phoneNumber: "+1234567890", duration: 124 }
      },
      {
        module: "Calendar",
        event: "Meeting Scheduled",
        status: "Confirmed",
        details: { attendee: "john.doe@example.com", subject: "Product Demo" }
      },
      {
        module: "Email",
        event: "Email Response Sent",
        status: "Delivered",
        details: { recipient: "client@example.com", subject: "Re: Product Inquiry" }
      },
      {
        module: "WhatsApp",
        event: "WhatsApp Connection Failed",
        status: "Error",
        details: { error: "Authentication failed", code: "AUTH_ERROR" }
      },
      {
        module: "AI Core",
        event: "AI Training Completed",
        status: "Completed",
        details: { trainingTime: "45 minutes", accuracy: "92%" }
      },
    ];

    let timestamp = new Date();
    for (const activity of activities) {
      timestamp = new Date(timestamp.getTime() - 15 * 60000); // 15 minutes earlier for each
      await db.insert(schema.systemActivity).values({
        module: activity.module,
        event: activity.event,
        status: activity.status,
        timestamp,
        details: activity.details,
      }).onConflictDoNothing();
    }

    // Initialize demo configs
    await db.insert(schema.twilioConfig).values({
      userId: 1,
      accountSid: "AC1234567890abcdef1234567890abcdef",
      authToken: "abcdef1234567890abcdef1234567890",
      phoneNumber: "+15551234567",
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(schema.sendgridConfig).values({
      userId: 1,
      apiKey: "SG.1234567890abcdef1234567890abcdef",
      fromEmail: "receptionist@example.com",
      fromName: "AI Receptionist",
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(schema.chatConfig).values({
      userId: 1,
      widgetTitle: "Company Assistant",
      widgetColor: "#2563eb",
      greetingMessage: "Hello! How can I assist you today?",
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(schema.calendarConfig).values({
      userId: 1,
      googleClientId: "1234567890-abcdef1234567890abcdef1234567890.apps.googleusercontent.com",
      googleClientSecret: "abcdef1234567890abcdef",
      availabilityStartTime: "09:00",
      availabilityEndTime: "17:00",
      slotDuration: 30,
      isActive: true,
    }).onConflictDoNothing();

    // Create sample products
    const products = [
      {
        name: "Basic Widget",
        description: "An entry-level widget for everyday use",
        category: "Widgets",
        priceInCents: 1999,
        sku: "W-BASIC-001",
      },
      {
        name: "Premium Widget",
        description: "A high-quality widget with additional features",
        category: "Widgets",
        priceInCents: 4999,
        sku: "W-PREM-001",
      },
      {
        name: "Deluxe Service Package",
        description: "Comprehensive service plan for all widgets",
        category: "Services",
        priceInCents: 9999,
        sku: "S-DELUXE-001",
      },
    ];

    for (const product of products) {
      await db.insert(schema.productData).values({
        userId: 1,
        ...product,
      }).onConflictDoNothing();
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

main();