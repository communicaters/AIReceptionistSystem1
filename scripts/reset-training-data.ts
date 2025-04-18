/**
 * Script to reset and rebuild training data with new, improved prompts
 * 
 * Usage: npx tsx scripts/reset-training-data.ts
 */

import { pool, db } from '../server/db';
import { trainingData } from '../migrations/schema';
import { eq } from 'drizzle-orm';

interface TrainingDataItem {
  category: string;
  content: string;
  isActive?: boolean;
  priority?: number;
}

const TECHS_COMPANY_NAME = "TechSolutions Inc.";

// New training data organized by category
const newTrainingData: Record<string, TrainingDataItem[]> = {
  // Company information - highest priority information about the company identity
  "company": [
    {
      category: "company",
      content: `Company Name: ${TECHS_COMPANY_NAME}
      
Founded: 2015
Industry: Technology Services and AI Solutions
Headquarters: New York City, USA with offices in London, Singapore, and Sydney

${TECHS_COMPANY_NAME} is a leading provider of cutting-edge AI-powered business automation solutions. We specialize in intelligent communication systems, workflow optimization, and conversational AI technologies that help businesses deliver exceptional customer experiences while streamlining operations.

Our flagship product is the AI Receptionist System, which revolutionizes how businesses handle inbound communications across all channels including calls, emails, chat, and messaging.
      
IMPORTANT: Always refer to the company as "${TECHS_COMPANY_NAME}" in all communications. Never use alternative names or generic terms like "this company" or "your company".`,
      isActive: true,
      priority: 100
    }
  ],
  
  // Detailed company information - additional context about the company
  "company_info": [
    {
      category: "company_info",
      content: `${TECHS_COMPANY_NAME} Mission:
To transform business communication through AI-driven solutions that create seamless, personalized experiences.

Core Values:
1. Innovation Excellence - We continuously push the boundaries of AI technology
2. Customer Obsession - Our clients' success is our ultimate measure of achievement
3. Operational Integrity - We uphold the highest standards of data privacy and security
4. Human-Centered Design - We build technology that enhances human capabilities rather than replacing them

Company Size: 120+ employees globally
Annual Revenue: $28 million (2023)
Growth: 47% year-over-year (2022-2023)

Awards & Recognition:
- 2023 AI Innovation Award by TechForward
- 2022 Best Enterprise Communications Solution by CommsWorld
- 2023 Top 50 AI Companies to Watch by TechInsider

Leadership Team:
- Sarah Chen, CEO and Co-Founder
- Dr. James Roberts, CTO and Co-Founder
- Michael Okonjo, Chief AI Officer
- Lena Petrova, Chief Customer Officer`,
      isActive: true,
      priority: 90
    }
  ],
  
  // Product information - details about what the company sells
  "product": [
    {
      category: "product",
      content: `AI Receptionist Platform - Our Flagship Solution

The AI Receptionist by ${TECHS_COMPANY_NAME} is a comprehensive communication management system that serves as an intelligent first point of contact across all communication channels:

Key Capabilities:
• Multi-channel communication handling (Voice, Email, Live Chat, WhatsApp)
• Natural language understanding with contextual awareness
• Seamless meeting scheduling and calendar management
• Intelligent routing based on intent and priority
• Real-time reporting and analytics dashboard
• Custom training for industry-specific knowledge
• Enterprise-grade security and compliance features
• Seamless CRM integration with major providers

Pricing:
- Starter Plan: $499/month - Up to 1,000 interactions monthly, basic features
- Business Plan: $999/month - Up to 5,000 interactions monthly, full feature set
- Enterprise Plan: Custom pricing - Unlimited interactions, dedicated support, custom integrations

Implementation Timeline:
- Standard implementation takes 2-3 weeks from contract signing
- Enterprise customization may require 4-8 weeks depending on complexity
- All plans include complimentary onboarding and training

Differentiators:
- The only solution offering true cross-channel continuity for customer interactions
- Proprietary Large Action Model (LAM) technology that can perform complex tasks, not just conversations
- Industry-leading 98.7% accuracy in intent recognition
- Real human performance monitoring and continuous improvement loop`,
      isActive: true,
      priority: 80
    },
    {
      category: "product",
      content: `Additional Products by ${TECHS_COMPANY_NAME}:

1. Workflow Automation Studio
   An end-to-end platform for designing, deploying, and optimizing business process automation
   • Visual workflow designer with drag-and-drop interface
   • AI-powered process optimization suggestions
   • Robotic Process Automation (RPA) capabilities
   • Integration with 200+ business applications
   Pricing: Starting at $1,499/month

2. CustomerInsight AI
   Advanced analytics platform for understanding customer behavior and sentiment
   • Real-time sentiment analysis across all communication channels
   • Predictive analytics for customer needs and issues
   • Automated action recommendation system
   • Custom reporting and visualization tools
   Pricing: Starting at $799/month

3. SmartMeeting Assistant
   AI-powered meeting enhancement platform
   • Automated agenda building and distribution
   • Real-time transcription and key point extraction
   • Action item tracking and follow-up automation
   • Meeting effectiveness metrics and improvement suggestions
   Pricing: Starting at $299/month

All products are available with annual pricing discounts of 15-20% and can be bundled for additional savings.`,
      isActive: true,
      priority: 75
    }
  ],
  
  // Service information - details about services offered
  "service": [
    {
      category: "service",
      content: `${TECHS_COMPANY_NAME} Professional Services:

Implementation Services:
• System deployment and configuration
• Custom integration development
• Data migration and system setup
• Environment optimization and testing
• Pricing: From $5,000 depending on scope

Training Programs:
• Administrator training (2-day program)
• End-user training workshops (half-day sessions)
• Advanced customization training
• Train-the-trainer programs
• Pricing: $1,500 per session, volume discounts available

Managed Services:
• 24/7 system monitoring and management
• Continuous optimization and improvement
• Regular system updates and enhancements
• Monthly performance reviews and recommendations
• Pricing: From $2,500/month based on system complexity

Consulting Services:
• Communication workflow assessment and optimization
• AI implementation strategy development
• Customer experience transformation consulting
• AI readiness assessment
• Pricing: $250/hour or fixed-price project quotes`,
      isActive: true,
      priority: 70
    }
  ],
  
  // Support information - how customers get help
  "support": [
    {
      category: "support",
      content: `${TECHS_COMPANY_NAME} Support Information:

Support Hours:
• Standard Support: Monday-Friday, 9am-6pm Eastern Time
• Premium Support: 24/7/365 for critical issues
• Enterprise Support: 24/7/365 with dedicated support manager

Contact Methods:
• Phone: (800) 555-1234 for urgent issues
• Email: support@techsolutions-inc.com
• Customer Portal: https://support.techsolutions-inc.com
• In-app live chat support

Response Time Commitments:
• Critical issues: 30 minutes or less
• High priority: 2 hours or less
• Medium priority: 8 hours or less
• Low priority: 24 hours or less

Support Includes:
• Technical troubleshooting
• Configuration assistance
• User management help
• System performance issues
• Integration problem resolution

Knowledge Resources:
• Comprehensive documentation library
• Video tutorial collection
• Regular webinar training sessions
• Community forum for peer support`,
      isActive: true,
      priority: 65
    }
  ],
  
  // Communication guidelines - how the AI should interact
  "communication": [
    {
      category: "communication",
      content: `${TECHS_COMPANY_NAME} Communication Guidelines:

Voice and Tone:
• Professional but warm and approachable
• Helpful and solution-oriented
• Clear and concise, avoiding technical jargon unless speaking with technical contacts
• Confident but never condescending
• Personal - use the customer's name when known

Response Structure:
• Begin with a warm greeting
• Acknowledge the customer's query or concern directly
• Provide clear, direct answers to questions
• Offer relevant additional information when helpful
• End with a question or clear next step

Key Phrases to Use:
• "I'd be happy to help with that"
• "Let me find that information for you right away"
• "That's a great question"
• "Would you like me to explain more about..."
• "I can definitely assist with scheduling that meeting"

Areas to Avoid:
• Never say "I don't know" without offering an alternative solution
• Avoid discussing competitors or making comparisons
• Do not make promises about future product features
• Never express frustration or impatience
• Avoid discussing internal company matters or policies not relevant to customers`,
      isActive: true,
      priority: 85
    }
  ],
  
  // Schedule information - hours, availability, etc.
  "schedule": [
    {
      category: "schedule",
      content: `${TECHS_COMPANY_NAME} Operating Hours and Scheduling Information:

Business Hours:
• Monday-Friday: 9:00 AM - 6:00 PM Eastern Time
• Saturday: 10:00 AM - 2:00 PM Eastern Time (Support only)
• Sunday: Closed

Holiday Schedule for 2023:
• New Year's Day - January 1 (Closed)
• Memorial Day - May 29 (Closed)
• Independence Day - July 4 (Closed)
• Labor Day - September 4 (Closed)
• Thanksgiving - November 23-24 (Closed)
• Christmas - December 25-26 (Closed)

Meeting Scheduling Guidelines:
• Standard meeting duration is 30 minutes unless otherwise specified
• Sales demonstrations require 60 minutes
• Technical consultations require 45-60 minutes
• Allow 15-minute buffer between meetings
• Executive meetings should be scheduled at least 3 business days in advance

Scheduling Contacts:
• For sales meetings: sales@techsolutions-inc.com
• For support reviews: support@techsolutions-inc.com
• For partner discussions: partners@techsolutions-inc.com
• For press/media: media@techsolutions-inc.com`,
      isActive: true,
      priority: 60
    }
  ],
  
  // FAQ - common questions and answers
  "faq": [
    {
      category: "faq",
      content: `Frequently Asked Questions about ${TECHS_COMPANY_NAME} and Our Products:

Q: What makes your AI Receptionist different from other chatbots or virtual assistants?
A: Unlike typical chatbots, our AI Receptionist offers true cross-channel continuity, meaning it maintains context across phone calls, emails, chat, and WhatsApp conversations with the same contact. It's also powered by our proprietary Large Action Model technology that can actually perform tasks like scheduling meetings, not just talk about them.

Q: How long does implementation typically take?
A: Standard implementation takes 2-3 weeks from contract signing, though enterprise deployments with custom integrations may take 4-8 weeks depending on complexity.

Q: Is the system able to handle industry-specific terminology?
A: Absolutely. Our AI Receptionist can be custom-trained on your industry terminology, company products, and specific protocols to ensure accurate understanding and response.

Q: What languages does the system support?
A: Currently, our system supports English, Spanish, French, German, Japanese, and Mandarin Chinese, with more languages being added quarterly.

Q: How does pricing work?
A: Our pricing is based on the number of interactions handled monthly, with plans starting at $499/month for up to 1,000 interactions. Enterprise plans with unlimited interactions have custom pricing based on specific requirements.

Q: What security certifications do you have?
A: We maintain SOC 2 Type II compliance, GDPR compliance, HIPAA compliance for healthcare clients, and PCI DSS for handling payment information.

Q: Can the system integrate with our existing CRM?
A: Yes, we offer pre-built integrations with Salesforce, HubSpot, Microsoft Dynamics, Zoho CRM, and many others. Our API also allows for custom integrations with proprietary systems.

Q: How do you ensure the AI provides accurate information?
A: We use a combination of strict training protocols, regular knowledge base updates, human review of outputs, and a continuous improvement loop that learns from every interaction.`,
      isActive: true,
      priority: 55
    }
  ],
  
  // Contact information - how to reach the company
  "contact": [
    {
      category: "contact",
      content: `${TECHS_COMPANY_NAME} Contact Information:

Main Headquarters:
1234 Tech Plaza, Suite 500
New York, NY 10001
United States

Phone Numbers:
• Main: (212) 555-8000
• Sales: (800) 555-8001
• Support: (800) 555-1234

Email Addresses:
• General Inquiries: info@techsolutions-inc.com
• Sales: sales@techsolutions-inc.com
• Support: support@techsolutions-inc.com
• Media Inquiries: media@techsolutions-inc.com
• Careers: careers@techsolutions-inc.com

Additional Office Locations:

London Office:
42 Innovation Square
London EC2A 1NT
United Kingdom
Phone: +44 20 7946 0300

Singapore Office:
888 Marina Bay Tower, #15-01
Singapore 018989
Phone: +65 6812 5600

Sydney Office:
333 Harbour View, Level 25
Sydney, NSW 2000
Australia
Phone: +61 2 8912 4500

Social Media:
• LinkedIn: linkedin.com/company/techsolutions-inc
• Twitter: @TechSolutionsInc
• Facebook: facebook.com/TechSolutionsInc
• YouTube: youtube.com/TechSolutionsInc`,
      isActive: true,
      priority: 50
    }
  ],
  
  // Use cases - how the product is used in real scenarios
  "use_cases": [
    {
      category: "use_cases",
      content: `Key Use Cases for ${TECHS_COMPANY_NAME} AI Receptionist:

1. Financial Services Implementation
   Barrington Capital Partners deployed our AI Receptionist to handle inbound client inquiries, resulting in:
   • 94% reduction in call routing errors
   • 65% decrease in first-response time
   • $430,000 annual cost savings by optimizing receptionist staff allocation
   • Improved compliance with automated call recording and transcription
   "The system has transformed how we handle client communications, allowing our team to focus on high-value activities." - Maria Johnson, COO at Barrington Capital

2. Healthcare Provider Network
   Wellness Medical Group implemented our solution across their 12-location network:
   • Successfully handles 15,000+ patient inquiries monthly
   • Reduced appointment no-shows by 37% through intelligent reminders
   • Prioritizes urgent patient matters for immediate human attention
   • Maintains HIPAA compliance while improving patient experience
   "Patient satisfaction scores increased by 28% since implementing the AI Receptionist." - Dr. James Chen, Director at Wellness Medical Group

3. Professional Services Firm
   Peterson & Associates Law Firm utilizes our AI Receptionist to:
   • Screen potential clients and schedule initial consultations
   • Provide basic information about services and specialties
   • Capture detailed case information before attorney engagement
   • Maintain 24/7 availability for urgent client matters
   "The system has helped us scale our client intake process while maintaining the personal touch our reputation is built on." - Thomas Peterson, Managing Partner

4. E-Commerce Company
   GlobalShop Direct leverages our technology to:
   • Handle 120,000+ customer service inquiries monthly across all channels
   • Provide instant order status updates and tracking information
   • Process simple return requests without human intervention
   • Escalate complex issues to the appropriate specialist teams
   "Our customer satisfaction ratings have increased by 32% while support costs decreased by 41%." - Sarah Williams, Customer Experience Director`,
      isActive: true,
      priority: 45
    }
  ],
  
  // Technical specifications - detailed technical information
  "technical": [
    {
      category: "technical",
      content: `${TECHS_COMPANY_NAME} AI Receptionist - Technical Specifications:

AI Technology Stack:
• Proprietary Large Action Model (LAM) technology
• Advanced natural language understanding with context retention
• Multi-lingual processing capabilities (8 languages supported)
• Reinforcement Learning from Human Feedback (RLHF) optimization
• Real-time sentiment analysis and emotion detection

System Requirements:
• Cloud-based SaaS solution - no on-premises hardware required
• Browser requirements: Chrome 70+, Firefox 68+, Safari 12+, Edge 79+
• Mobile support: iOS 12+ and Android 8+
• Internet connection: Minimum 5 Mbps download/upload recommended

Integration Capabilities:
• RESTful API with comprehensive documentation
• OAuth 2.0 authentication
• WebSocket support for real-time applications
• Webhook events for system notifications
• SDKs available for JavaScript, Python, Java, and .NET

Security Features:
• SOC 2 Type II certified infrastructure
• End-to-end encryption for all communications
• Role-based access control system
• GDPR, HIPAA, and PCI DSS compliant
• Regular penetration testing and security audits
• Data residency options for EU, US, APAC regions

Performance Metrics:
• 99.98% uptime SLA for enterprise customers
• Average response time < 500ms
• Handles 10,000+ concurrent sessions
• 98.7% intent recognition accuracy
• Scales automatically with demand spikes`,
      isActive: true,
      priority: 40
    }
  ],
  
  // Industry-specific information for different verticals
  "industry_healthcare": [
    {
      category: "industry_healthcare",
      content: `${TECHS_COMPANY_NAME} Healthcare Industry Solutions:

Our AI Receptionist is specifically tailored for healthcare providers with:

Healthcare-Specific Capabilities:
• HIPAA-compliant patient communication across all channels
• Patient appointment scheduling and management
• Insurance verification workflows
• Prescription refill request handling
• Symptom triage with proper escalation protocols
• Medical terminology recognition
• Integration with major EHR/EMR systems

Healthcare Compliance:
• HIPAA Business Associate Agreement provided
• Protected Health Information (PHI) handling protocols
• Secure messaging with encryption
• Audit trails for all patient interactions
• Data retention policies aligned with healthcare regulations

Healthcare Integrations:
• Epic
• Cerner
• Allscripts
• Meditech
• eClinicalWorks
• athenahealth
• NextGen Healthcare

Case Study: Riverview Medical Center
A 250-bed hospital implemented our AI Receptionist, resulting in:
• 43% reduction in phone abandonment rates
• 28% decrease in administrative staff workload
• 92% patient satisfaction with the automated system
• $1.2M annual cost savings across their network`,
      isActive: true,
      priority: 38
    }
  ],
  
  // Industry-specific information for different verticals
  "industry_financial": [
    {
      category: "industry_financial",
      content: `${TECHS_COMPANY_NAME} Financial Services Industry Solutions:

Our AI Receptionist is specifically engineered for financial institutions with:

Financial Industry Capabilities:
• Compliant client communication management
• Appointment scheduling for advisors and specialists
• Secure document exchange protocols
• Basic account service request handling
• New prospect qualification
• Wealth management service information
• Transaction status updates (with authentication)

Financial Compliance Features:
• SEC and FINRA compliance capabilities
• Automated communication archiving
• Risk-based authentication options
• PCI DSS compliance for payment information
• AML and KYC procedure support
• Comprehensive audit trails

Financial Industry Integrations:
• Salesforce Financial Services Cloud
• Fiserv
• FIS Global
• Black Diamond
• Envestnet
• Redtail CRM
• Bloomberg Terminal

Case Study: Atlantic Wealth Advisors
A financial advisory firm with $3.8B AUM implemented our AI Receptionist:
• Reduced client response time by 64%
• Increased client meeting scheduling by 37%
• Improved compliance documentation by 100%
• Enabled advisors to service 22% more clients`,
      isActive: true,
      priority: 37
    }
  ],
  
  // Legal information - policies, terms, etc.
  "legal": [
    {
      category: "legal",
      content: `${TECHS_COMPANY_NAME} Legal and Compliance Information:

Data Processing Agreements:
We provide comprehensive Data Processing Agreements (DPAs) that comply with global regulations including GDPR, CCPA, and other regional requirements.

Service Level Agreement Highlights:
• 99.9% uptime guarantee for standard plans
• 99.99% uptime guarantee for enterprise plans
• Response time commitments based on issue severity
• Financial remedies for service level failures
• Scheduled maintenance windows with advance notice

Privacy Policy Overview:
• Clear data collection and usage policies
• No selling or sharing of customer data with third parties
• Data minimization and purpose limitation principles
• Customer ownership of all their business data
• Transparent data retention and deletion policies

Security Certifications:
• SOC 2 Type II
• ISO 27001
• HIPAA compliance (for healthcare implementations)
• PCI DSS Level 1 (for payment processing features)
• GDPR compliance

Acceptable Use Policies:
• Prohibition of illegal, harmful, or offensive content
• Fair usage limits based on subscription tier
• API rate limiting and abuse prevention
• Account sharing restrictions
• Content moderation guidelines`,
      isActive: true,
      priority: 30
    }
  ]
};

async function resetTrainingData() {
  console.log("Starting training data reset process...");
  
  try {
    // Get user ID 1 (default system user)
    const userId = 1;
    
    // Delete all existing training data for this user
    console.log(`Deleting all existing training data for user ${userId}...`);
    await db.delete(trainingData).where(eq(trainingData.userId, userId));
    
    // Count total new items to insert
    let totalItems = 0;
    for (const category in newTrainingData) {
      totalItems += newTrainingData[category].length;
    }
    console.log(`Preparing to insert ${totalItems} new training data items`);
    
    // Insert new training data
    for (const category in newTrainingData) {
      console.log(`Inserting ${newTrainingData[category].length} items for category: ${category}...`);
      
      for (const item of newTrainingData[category]) {
        await db.insert(trainingData).values({
          user_id: userId,
          category: item.category,
          content: item.content,
          created_at: new Date(),
          metadata: {}
        });
      }
    }
    
    console.log("Training data reset complete!");
    
    // Verify the reset by counting records
    const count = await db.select({ count: { count: trainingData.id } }).from(trainingData);
    console.log(`Verification: There are now ${count[0].count.count} training data records in the system`);
    
  } catch (error) {
    console.error("Error resetting training data:", error);
    throw error;
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Execute the function
resetTrainingData()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });