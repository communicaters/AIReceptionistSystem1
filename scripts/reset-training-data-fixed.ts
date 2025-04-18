/**
 * Script to reset and rebuild training data with new, improved prompts
 * 
 * Usage: npx tsx scripts/reset-training-data-fixed.ts
 */

import { pool, db } from '../server/db';
import { trainingData } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

interface TrainingDataItem {
  category: string;
  content: string;
  isActive?: boolean;
  priority?: number;
}

// Map of training data by category
const COMPANY_NAME = "TechSolutions Inc.";
const COMPANY_TAGLINE = "Innovative Solutions for Business Growth";
const COMPANY_DOMAIN = "techsolutions.com";

// Training data organized by categories
const newTrainingData: Record<string, TrainingDataItem[]> = {
  // Company information to provide consistent identity across all channels
  company: [
    {
      category: "company",
      content: `The company is ${COMPANY_NAME}, a leading provider of innovative software solutions for businesses of all sizes.

${COMPANY_NAME} specializes in AI-powered automation tools, customer relationship management platforms, and business intelligence solutions that help companies streamline their operations and scale efficiently.

Founded in 2015, ${COMPANY_NAME} has grown rapidly to serve over 500 businesses across North America, Europe, and Asia. The company is headquartered in San Francisco with satellite offices in London and Singapore.

Our mission is to empower businesses with intelligent software solutions that drive growth and efficiency.`
    }
  ],
  
  // Company values and mission statement
  company_values: [
    {
      category: "company_values",
      content: `At ${COMPANY_NAME}, our core values drive everything we do:

1. Innovation Excellence: We constantly push the boundaries of what's possible with technology.
2. Customer Success: We measure our success by the success of our customers.
3. Integrity and Transparency: We build trust through honest communications and ethical business practices.
4. Collaborative Growth: We believe the best solutions come from diverse teams working together.
5. Continuous Improvement: We are committed to learning and evolving our products and services.

Our mission is to empower businesses with intelligent software solutions that drive growth and efficiency while reducing operational complexity.`
    }
  ],
  
  // Products offered, with detailed information
  products: [
    {
      category: "products",
      content: `${COMPANY_NAME} offers a comprehensive suite of products:

1. AI Business Assistant: Our flagship AI-powered platform that automates customer interactions across email, chat, phone, and social media with human-like responses.

2. SmartCRM Pro: A complete customer relationship management solution with AI-driven insights, pipeline management, and automated follow-ups.

3. DataSense Analytics: Business intelligence platform that transforms your company data into actionable insights with predictive analytics.

4. ProcessAutomator: Workflow automation tool that streamlines repetitive business processes and integrates with your existing tech stack.

5. SecureConnect: Enterprise-grade security solution for protecting sensitive business data and communications.

All our products come with flexible pricing models, comprehensive training, and dedicated support.`
    }
  ],
  
  // Services offered, with detailed information
  services: [
    {
      category: "services",
      content: `${COMPANY_NAME} provides a range of professional services to complement our software solutions:

1. Implementation Services: Our expert team will handle the entire setup process, from planning and configuration to data migration and integration with your existing systems.

2. Custom Development: Tailored solutions designed to address your specific business requirements when standard products need customization.

3. Training and Onboarding: Comprehensive training programs for your team to ensure maximum adoption and productivity.

4. Strategic Consulting: Expert guidance on digital transformation strategies, process optimization, and technology roadmapping.

5. Managed Services: Ongoing support, maintenance, and optimization of your technology solutions, allowing your team to focus on core business activities.

6. 24/7 Premium Support: Round-the-clock technical assistance with guaranteed response times for critical issues.`
    }
  ],
  
  // Pricing information with tier details
  pricing: [
    {
      category: "pricing",
      content: `${COMPANY_NAME} offers flexible pricing models to accommodate businesses of all sizes:

For our AI Business Assistant:
- Starter: $99/month (up to 1,000 interactions)
- Professional: $299/month (up to 5,000 interactions)
- Enterprise: $799/month (unlimited interactions)

For SmartCRM Pro:
- Basic: $49/user/month
- Advanced: $79/user/month
- Premium: $129/user/month

For DataSense Analytics:
- Essential: $199/month (5 users)
- Business: $499/month (15 users)
- Corporate: $999/month (unlimited users)

All plans include standard support. Premium support is available for an additional 20% of your subscription cost. Annual billing provides a 15% discount on all plans.

We also offer flexible, customized pricing for large enterprises with specific requirements. Contact our sales team for a tailored quote.`
    }
  ],
  
  // Contact information for different departments
  contact: [
    {
      category: "contact",
      content: `You can contact ${COMPANY_NAME} through multiple channels:

Main Office:
123 Innovation Drive
San Francisco, CA 94105
United States

General Inquiries:
Phone: (415) 555-7890
Email: info@${COMPANY_DOMAIN}

Sales Department:
Phone: (415) 555-7891
Email: sales@${COMPANY_DOMAIN}

Support:
Phone: (415) 555-7892
Email: support@${COMPANY_DOMAIN}

Hours of Operation:
Monday to Friday: 8:00 AM - 8:00 PM (Pacific Time)
Weekend support available for Enterprise customers.

Our response time is typically within 1 business day for general inquiries, and within 4 hours for support requests.`
    }
  ],
  
  // Information about the implementation process
  implementation: [
    {
      category: "implementation",
      content: `The implementation process at ${COMPANY_NAME} follows a structured approach designed for smooth adoption and maximum value:

1. Discovery Phase (1-2 weeks):
   - Requirements gathering
   - System assessment
   - Goals and success metrics definition

2. Planning Phase (1 week):
   - Solution design
   - Implementation timeline
   - Resource allocation

3. Configuration Phase (2-3 weeks):
   - System setup
   - Initial configuration
   - Data migration

4. Integration Phase (1-2 weeks):
   - Connection with existing systems
   - API configurations
   - Authentication setup

5. Testing Phase (1 week):
   - Functional testing
   - User acceptance testing
   - Performance validation

6. Training Phase (1 week):
   - Admin training
   - End-user training
   - Documentation delivery

7. Go-Live Phase:
   - Production deployment
   - Real-time monitoring
   - Immediate support

8. Optimization Phase (ongoing):
   - Performance reviews
   - Functionality enhancements
   - Continuous improvement

The typical implementation timeframe is 6-10 weeks depending on complexity and customization requirements. Our implementation team works closely with your staff to ensure knowledge transfer throughout the process.`
    }
  ],
  
  // Security and compliance information
  security: [
    {
      category: "security",
      content: `At ${COMPANY_NAME}, we prioritize the security and privacy of your data through comprehensive measures:

Data Protection:
- End-to-end encryption (AES-256) for all data in transit and at rest
- Regular security audits and penetration testing
- Multi-factor authentication for all access points
- Role-based access controls with detailed audit logs

Compliance:
- SOC 2 Type II certified
- GDPR compliant
- HIPAA compliant (for healthcare clients)
- PCI DSS compliance for payment processing
- Annual third-party compliance assessments

Infrastructure Security:
- Cloud infrastructure hosted on AWS with multiple redundancies
- 99.99% uptime SLA with automatic failover
- Distributed denial-of-service (DDoS) protection
- Regular backup procedures with point-in-time recovery

Our dedicated security team conducts ongoing monitoring and threat assessment to stay ahead of emerging vulnerabilities. All employees undergo security awareness training quarterly.

We provide comprehensive security documentation and can accommodate customer-specific security requirements for enterprise clients.`
    }
  ],
  
  // Customer support details
  support: [
    {
      category: "support",
      content: `${COMPANY_NAME} provides multi-tiered support options to ensure your success:

Standard Support (included with all plans):
- Email and ticket-based support
- Response time: Within 24 hours (business days)
- Knowledge base access
- Community forum access
- Regular product updates

Premium Support (additional subscription):
- Priority email and ticket response
- Response time: Within 4 hours (business days)
- Dedicated support representative
- Monthly check-in calls
- Priority bug fixes

Enterprise Support (for Enterprise plans):
- 24/7 phone and email support
- Response time: Within 1 hour for critical issues
- Dedicated technical account manager
- Custom training sessions
- Early access to new features
- Quarterly business reviews

Our support team is based in San Francisco, London, and Singapore to provide coverage across time zones. All support staff undergo extensive product training and certification.

For technical emergencies, Enterprise customers have access to our on-call engineering team via a dedicated hotline.`
    }
  ],
  
  // Integration capabilities
  integrations: [
    {
      category: "integrations",
      content: `${COMPANY_NAME}'s solutions offer extensive integration capabilities:

Pre-built Integrations:
- CRM Systems: Salesforce, HubSpot, Microsoft Dynamics, Zoho
- Marketing Platforms: Marketo, Mailchimp, Campaign Monitor, HubSpot Marketing
- Communication Tools: Slack, Microsoft Teams, Zoom, Google Workspace
- ERP Systems: SAP, Oracle NetSuite, Microsoft Dynamics 365
- Accounting Software: QuickBooks, Xero, FreshBooks
- E-commerce Platforms: Shopify, WooCommerce, Magento, BigCommerce
- Project Management: Asana, Monday.com, Jira, Trello
- Customer Support: Zendesk, Freshdesk, Intercom

Technical Integration Methods:
- RESTful APIs with comprehensive documentation
- Webhook support for event-driven integrations
- SOAP API support for legacy systems
- OAuth 2.0 authentication
- Bulk data import/export capabilities
- Custom integration development (available through our Professional Services)

Our Integration Marketplace features 100+ pre-configured connectors that can be set up without coding. For custom or complex integrations, our Professional Services team can develop tailored solutions.`
    }
  ],
  
  // Case studies and success stories
  case_studies: [
    {
      category: "case_studies",
      content: `Success Stories from ${COMPANY_NAME} Clients:

MediCorp Health Services:
A leading healthcare provider implemented our AI Business Assistant to manage patient inquiries. Results: 78% reduction in response time, 45% decrease in administrative costs, and 92% patient satisfaction rate. The automated system now handles over 5,000 patient interactions daily across multiple channels.

GlobalTrade Logistics:
This international shipping company deployed our DataSense Analytics platform to optimize their supply chain. Results: 23% improvement in delivery times, 17% reduction in operational costs, and 34% enhanced inventory accuracy. The predictive analytics feature helped them anticipate seasonal demand fluctuations with 89% accuracy.

TechStart Financial:
A mid-sized financial services firm implemented our SmartCRM Pro solution. Results: 65% increase in lead conversion rates, 42% improvement in customer retention, and 28% growth in cross-selling opportunities. Their sales cycle shortened from 45 to 27 days on average.

RetailGiant Stores:
This retail chain with 250+ locations integrated our ProcessAutomator to streamline their inventory management. Results: 52% reduction in stockouts, 38% decrease in overstock situations, and $2.4M annual savings in inventory carrying costs.

Each case study demonstrates our commitment to delivering measurable business outcomes through our technology solutions. Detailed case studies with customer testimonials are available upon request.`
    }
  ],
  
  // FAQ section with common questions
  faq: [
    {
      category: "faq",
      content: `Frequently Asked Questions about ${COMPANY_NAME}:

Q: What makes your AI technology different from competitors?
A: Our proprietary NLU (Natural Language Understanding) engine achieves 96% accuracy in intent recognition, significantly outperforming industry averages. We combine multiple AI models for context-aware responses that continuously improve through machine learning.

Q: How long does implementation typically take?
A: For standard implementations, customers can expect 6-10 weeks from kickoff to go-live, depending on complexity and customization requirements. Enterprise-scale deployments may take 12-16 weeks.

Q: Do you offer a trial period?
A: Yes, we offer a 30-day free trial for all our products with full functionality and support. Enterprise solutions include a proof of concept phase tailored to your specific requirements.

Q: How do you handle data migration from existing systems?
A: Our implementation team provides comprehensive data migration services with data cleaning, validation, and transformation. We support imports from all major platforms and custom data sources.

Q: What kind of ROI can we expect?
A: While results vary by industry and implementation, our customers typically see ROI within 6-9 months. Average cost savings range from 30-45% for automated processes, with productivity improvements of 25-40%.

Q: How does your pricing model work for growing companies?
A: Our flexible pricing scales with your usage and user count. We offer growth packages that allow for incremental scaling without major price jumps, with quarterly adjustment options.

Q: What support is included in the standard package?
A: Standard support includes email and ticket-based assistance with 24-hour response time, access to our knowledge base, community forums, and regular product updates.`
    }
  ],
  
  // Training and onboarding process
  training: [
    {
      category: "training",
      content: `${COMPANY_NAME} provides comprehensive training and onboarding to ensure your team's success:

Training Formats:
- Live instructor-led sessions (virtual or on-site)
- Self-paced online courses through our Learning Management System
- Role-based training paths for administrators, end-users, and managers
- Hands-on workshops with practical exercises
- Monthly webinars on advanced features and best practices

Onboarding Process:
1. Training Needs Assessment: Customized training plan based on your team's roles and experience levels
2. Core Skills Development: Fundamental product knowledge and navigation skills
3. Role-Specific Training: Specialized training for different user types
4. Administrator Training: In-depth system configuration and management
5. Advanced Features Workshop: Maximizing value through advanced capabilities
6. Certification Program: Optional certification path for power users and admins

Training Materials:
- Comprehensive user guides and reference documentation
- Video tutorials for visual learners
- Interactive simulations for practicing procedures
- Quick reference guides for common tasks
- Custom training materials for your specific implementation

Our Education Services team can develop tailored training programs for large organizations or complex implementations. Refresher training and new feature training are available to keep your team updated as our products evolve.`
    }
  ],
  
  // Technology behind products
  technology: [
    {
      category: "technology",
      content: `${COMPANY_NAME}'s technology stack incorporates cutting-edge components to deliver high-performance, secure, and scalable solutions:

Core Technologies:
- Natural Language Processing (NLP): Proprietary algorithms with 96% intent recognition accuracy
- Machine Learning: Advanced neural networks that continuously improve from interactions
- Predictive Analytics: Statistical models that identify patterns and forecast outcomes
- Computer Vision: Image recognition capabilities for document processing and verification
- Distributed Processing: Scalable architecture handling millions of transactions daily

Infrastructure:
- Cloud-native architecture deployed on AWS infrastructure
- Microservices design for targeted scaling and fault isolation
- Kubernetes orchestration for automated deployment and management
- Redis and Elasticsearch for high-speed caching and search
- PostgreSQL and MongoDB for primary and document data storage

Security Technologies:
- End-to-end encryption using AES-256
- Zero-knowledge authentication frameworks
- Anomaly detection systems for threat identification
- Automated vulnerability scanning and patching
- Granular role-based access control

Development Practices:
- Continuous Integration/Continuous Deployment (CI/CD) pipelines
- Test-Driven Development with 90%+ code coverage
- Regular security code reviews and penetration testing
- Weekly release cycles for rapid feature delivery and improvements

Our technology roadmap includes emerging innovations in quantum-resistant encryption, advanced AI model training, and edge computing integrations to stay ahead of industry trends.`
    }
  ],
  
  // Information on getting started
  getting_started: [
    {
      category: "getting_started",
      content: `Getting Started with ${COMPANY_NAME} is a straightforward process designed for quick time-to-value:

1. Initial Consultation (1-2 days):
   - Discuss your business needs and objectives
   - Identify the right solutions and package
   - Receive a customized proposal and timeline

2. Agreement & Setup (1-3 days):
   - Complete the service agreement
   - Receive welcome package and access credentials
   - Introduction to your dedicated Customer Success Manager

3. Kickoff Meeting (Day 1 of implementation):
   - Meet your implementation team
   - Confirm goals and success metrics
   - Establish communication plan and schedule

4. Configuration Phase (1-3 weeks):
   - System setup and customization
   - Data import and connection to existing systems
   - Initial user access setup

5. Training (1-2 weeks):
   - Administrator training
   - End-user training sessions
   - Access to self-service learning resources

6. Validation & Go-Live (1 week):
   - User acceptance testing
   - Final adjustments based on feedback
   - Production deployment

7. Post-Launch Support (ongoing):
   - 30-day intensive support period
   - Regular check-ins with Customer Success Manager
   - Performance reviews and optimization recommendations

To get started today, contact our sales team at sales@${COMPANY_DOMAIN} or call (415) 555-7891. We'll schedule your initial consultation within 24 hours.`
    }
  ],
  
  // Schedule a meeting prompt
  schedule_meeting: [
    {
      category: "schedule_meeting",
      content: `I'd be happy to help you schedule a meeting with a representative from ${COMPANY_NAME}. Our team is available for product demonstrations, consultations, or detailed discussions about how our solutions can address your specific needs.

To schedule a meeting, I'll need some information:

1. What topic would you like to discuss? (Product demo, pricing consultation, technical questions, etc.)
2. Who from your team will be attending?
3. What dates and times work best for you in the next week?
4. Do you prefer a phone call, video conference, or in-person meeting (if available in your location)?
5. Any specific questions or areas you'd like the meeting to focus on?

Once I have this information, I'll coordinate with our team to find the best match for your needs and confirm the meeting details with you.

Our typical meeting slots are 30 minutes for initial consultations and 60 minutes for comprehensive product demonstrations. If you have specific time constraints, please let me know and we'll accommodate accordingly.`
    }
  ]
};

// Function to reset and rebuild all training data
async function resetTrainingData() {
  console.log("Database connection established");
  console.log("Starting training data reset process...");
  
  try {
    // Get user ID 1 (default system user)
    const userId = 1;
    
    // Delete all existing training data for this user
    console.log(`Deleting all existing training data for user ${userId}...`);
    await db.delete(trainingData).where(eq(trainingData.userId, userId));
    
    // Insert new training data
    console.log(`Preparing to insert ${Object.keys(newTrainingData).length} new training data categories with a total of ${Object.values(newTrainingData).flat().length} items`);
    
    for (const category in newTrainingData) {
      console.log(`Inserting ${newTrainingData[category].length} items for category: ${category}...`);
      
      for (const item of newTrainingData[category]) {
        // Use the correct column names from the actual database schema
        await db.execute(sql`
          INSERT INTO training_data (user_id, category, content, metadata, created_at)
          VALUES (${userId}, ${item.category}, ${item.content}, ${JSON.stringify({})}, ${new Date()})
        `);
      }
    }
    
    console.log("Training data reset complete!");
    
    // Verify the reset by counting records
    const countResult = await db.execute(sql`SELECT COUNT(*) FROM training_data WHERE user_id = ${userId}`);
    console.log(`Verification: There are now ${countResult.rows[0].count} training data records in the system`);
    
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