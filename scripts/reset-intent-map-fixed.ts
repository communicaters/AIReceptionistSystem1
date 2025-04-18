/**
 * Script to reset and rebuild the intent map with new, improved intents
 * that match our updated training data
 * 
 * Usage: npx tsx scripts/reset-intent-map-fixed.ts
 */

import { pool, db } from '../server/db';
import { intentMap } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

interface IntentItem {
  intent: string;
  pattern: string;
  description?: string;
  priority?: number;
  isRegex?: boolean;
  actions?: any;
}

const COMPANY_NAME = "TechSolutions Inc.";

// New intent map organized by categories
const newIntentMap: IntentItem[] = [
  // Company information requests
  {
    intent: "company_info",
    pattern: "what (company|business) (is this|are you|do you (work|represent))",
    description: "User asking about the company's identity",
    priority: 100,
    isRegex: true,
    actions: {
      response_type: "company_info",
      provide_details: true
    }
  },
  {
    intent: "company_info",
    pattern: "tell me (about|more about) (the company|your company|this business)",
    description: "User asking for company information",
    priority: 95,
    isRegex: true,
    actions: {
      response_type: "company_info",
      provide_details: true
    }
  },
  {
    intent: "company_name",
    pattern: "(what is|tell me) (the name of|) (this|your|the) company",
    description: "User specifically asking for the company name",
    priority: 98,
    isRegex: true,
    actions: {
      response_type: "company_name",
      company_name: COMPANY_NAME,
      emphasize_name: true
    }
  },
  {
    intent: "company_mission",
    pattern: "(what is|what's) (your|the company('s|s)|this company('s|s)) mission",
    description: "User asking about company mission",
    priority: 90,
    isRegex: true,
    actions: {
      response_type: "company_mission"
    }
  },
  
  // Product information requests
  {
    intent: "product_info",
    pattern: "(what (products|solutions) (do you offer|do you have|does the company (offer|have|sell))|tell me about your (products|solutions))",
    description: "User asking about products offered",
    priority: 85,
    isRegex: true,
    actions: {
      response_type: "product_info",
      provide_details: true
    }
  },
  {
    intent: "product_pricing",
    pattern: "(how much (does it cost|is it)|what('s| is) the (price|cost|pricing)|pricing information)",
    description: "User asking about pricing",
    priority: 83,
    isRegex: true,
    actions: {
      response_type: "pricing_info",
      provide_tiers: true
    }
  },
  {
    intent: "product_comparison",
    pattern: "(how (does it|do you) compare to|what makes you (better|different) than|why should I choose you (over|instead of))",
    description: "User asking for product comparison or differentiators",
    priority: 80,
    isRegex: true,
    actions: {
      response_type: "product_comparison",
      focus_on_strengths: true,
      avoid_competitor_names: true
    }
  },
  {
    intent: "product_demo",
    pattern: "(can I|I('d like to|'m interested in|want to)) (see|get|have|schedule) a (product |)demo",
    description: "User requesting a product demonstration",
    priority: 87,
    isRegex: true,
    actions: {
      response_type: "demo_request",
      offer_scheduling: true
    }
  },
  
  // Service information requests
  {
    intent: "service_info",
    pattern: "(what services (do you|does your company) (offer|provide)|tell me about your services)",
    description: "User asking about services offered",
    priority: 82,
    isRegex: true,
    actions: {
      response_type: "service_info",
      provide_details: true
    }
  },
  {
    intent: "implementation_process",
    pattern: "(how does the (implementation|setup|onboarding) (work|process work)|what('s| is) the (implementation|setup|onboarding) process)",
    description: "User asking about implementation process",
    priority: 78,
    isRegex: true,
    actions: {
      response_type: "implementation_info"
    }
  },
  
  // Contact and scheduling intents
  {
    intent: "schedule_meeting",
    pattern: "(I('d like to|want to|would like to|'m interested to) (schedule|book|arrange|set up) a (meeting|call|appointment|conversation)|can (we|I) (schedule|have|set up) a (meeting|call|conversation))",
    description: "User wants to schedule a meeting",
    priority: 92,
    isRegex: true,
    actions: {
      response_type: "schedule_meeting",
      ask_for_details: true,
      check_calendar: true
    }
  },
  {
    intent: "contact_sales",
    pattern: "(I('d like to|want to) (talk to|speak with|connect with) (sales|a sales rep|someone from sales)|can I (talk to|speak with|be connected to) (sales|a sales rep))",
    description: "User wants to contact sales team",
    priority: 88,
    isRegex: true,
    actions: {
      response_type: "contact_sales",
      offer_scheduling: true,
      provide_contact_info: true
    }
  },
  {
    intent: "contact_support",
    pattern: "(how (do I|can I) (contact|reach|get in touch with) support|I need (help|support|technical assistance))",
    description: "User needs technical support",
    priority: 86,
    isRegex: true,
    actions: {
      response_type: "contact_support",
      provide_contact_info: true
    }
  },
  {
    intent: "get_phone_number",
    pattern: "(what is|what's) (your|the company|the) phone number",
    description: "User asking for phone number",
    priority: 70,
    isRegex: true,
    actions: {
      response_type: "phone_number"
    }
  },
  {
    intent: "get_email",
    pattern: "(what is|what's) (your|the company|the) email( address|)",
    description: "User asking for email address",
    priority: 70,
    isRegex: true,
    actions: {
      response_type: "email_address"
    }
  },
  
  // Technical questions
  {
    intent: "integration_question",
    pattern: "(does it (integrate|work) with|can it integrate with|integration with) ([a-zA-Z0-9\\s]+)",
    description: "User asking about integration capabilities",
    priority: 75,
    isRegex: true,
    actions: {
      response_type: "integration_info",
      extract_system_name: true
    }
  },
  {
    intent: "security_question",
    pattern: "(how (secure|safe) is (it|your system|the platform)|what security (measures|features) (do you have|are in place)|tell me about (your|the) security)",
    description: "User asking about security features",
    priority: 77,
    isRegex: true,
    actions: {
      response_type: "security_info",
      emphasize_compliance: true
    }
  },
  {
    intent: "data_privacy",
    pattern: "(how do you (handle|manage|treat) (my|our|customer) data|what is your (data privacy|privacy) policy)",
    description: "User asking about data privacy",
    priority: 76,
    isRegex: true,
    actions: {
      response_type: "data_privacy_info",
      emphasize_compliance: true
    }
  },
  
  // Specific use cases
  {
    intent: "use_case_healthcare",
    pattern: "(do you (work with|have experience with|have customers in) (healthcare|medical|hospital|clinic)|how does it work for (healthcare|medical|hospital|clinic))",
    description: "User asking about healthcare use cases",
    priority: 73,
    isRegex: true,
    actions: {
      response_type: "healthcare_use_case",
      industry_specific: true
    }
  },
  {
    intent: "use_case_financial",
    pattern: "(do you (work with|have experience with|have customers in) (finance|financial|banking|wealth management)|how does it work for (finance|financial services|banking|wealth management))",
    description: "User asking about financial services use cases",
    priority: 72,
    isRegex: true,
    actions: {
      response_type: "financial_use_case",
      industry_specific: true
    }
  },
  
  // Greeting and conversation flow
  {
    intent: "greeting",
    pattern: "(hello|hi|hey|good (morning|afternoon|evening)|greetings)",
    description: "User greeting",
    priority: 99,
    isRegex: true,
    actions: {
      response_type: "greeting",
      time_aware: true
    }
  },
  {
    intent: "goodbye",
    pattern: "(goodbye|bye|see you|talk (to you|with you) later|have a (good|nice) day)",
    description: "User saying goodbye",
    priority: 60,
    isRegex: true,
    actions: {
      response_type: "goodbye",
      offer_additional_help: true
    }
  },
  {
    intent: "thank_you",
    pattern: "(thank you|thanks|appreciate it|thank you for your help)",
    description: "User expressing thanks",
    priority: 65,
    isRegex: true,
    actions: {
      response_type: "acknowledgment",
      offer_additional_help: true
    }
  },
  
  // Call to action intents
  {
    intent: "get_started",
    pattern: "(how (do I|can I|do we|can we) get started|what (are|is) the next steps|how do we begin)",
    description: "User wants to begin the process",
    priority: 85,
    isRegex: true,
    actions: {
      response_type: "get_started_info",
      offer_scheduling: true
    }
  },
  {
    intent: "request_callback",
    pattern: "(can someone call me|I'd like someone to call me|request a callback|have someone call me)",
    description: "User requesting a callback",
    priority: 84,
    isRegex: true,
    actions: {
      response_type: "callback_request",
      collect_contact_info: true
    }
  },
  
  // Support questions
  {
    intent: "technical_issue",
    pattern: "(I'm having (a problem|an issue|trouble) with|something's not working|there's a problem with)",
    description: "User reporting a technical issue",
    priority: 89,
    isRegex: true,
    actions: {
      response_type: "technical_support",
      collect_problem_details: true,
      offer_escalation: true
    }
  },
  {
    intent: "not_working",
    pattern: "(it's not working|doesn't work|isn't working properly|having issues with)",
    description: "User indicating something isn't working",
    priority: 88,
    isRegex: true,
    actions: {
      response_type: "troubleshooting",
      collect_problem_details: true
    }
  },
  
  // Fallback handling
  {
    intent: "unknown_intent",
    pattern: ".*",
    description: "Default fallback for unrecognized intents",
    priority: 10,
    isRegex: true,
    actions: {
      response_type: "clarification",
      offer_options: true
    }
  }
];

async function resetIntentMap() {
  console.log("Starting intent map reset process...");
  
  try {
    // Get user ID 1 (default system user)
    const userId = 1;
    
    // Delete all existing intents for this user
    console.log(`Deleting all existing intents for user ${userId}...`);
    await db.delete(intentMap).where(eq(intentMap.userId, userId));
    
    // Insert new intents
    console.log(`Preparing to insert ${newIntentMap.length} new intents...`);
    
    for (const item of newIntentMap) {
      // Convert each pattern to an array of examples as required by the schema
      const examples = [item.pattern];
      
      // Use raw SQL to match actual DB schema
      await db.execute(sql`
        INSERT INTO intent_map (user_id, intent, examples)
        VALUES (${userId}, ${item.intent}, ${examples})
      `);
      
      console.log(`Added intent: ${item.intent}`);
    }
    
    console.log("Intent map reset complete!");
    
    // Verify the reset by counting records
    const countResult = await db.execute(sql`SELECT COUNT(*) FROM intent_map WHERE user_id = ${userId}`);
    console.log(`Verification: There are now ${countResult.rows[0].count} intent records in the system`);
    
  } catch (error) {
    console.error("Error resetting intent map:", error);
    throw error;
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Execute the function
resetIntentMap()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });