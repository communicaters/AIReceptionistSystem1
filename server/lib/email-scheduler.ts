import { syncEmails } from './imap';
import { storage } from '../storage';
import * as emailController from './email-controller';
import { formatEmailBodyAsHtml, formatEmailBodyAsText } from './email-formatter';

// Email sync job status tracking
interface SyncJobStatus {
  isRunning: boolean;
  lastRun: Date | null;
  lastError: Error | null;
  consecutiveFailures: number;
}

// Track the status of the email sync job
const syncJobStatus: SyncJobStatus = {
  isRunning: false,
  lastRun: null,
  lastError: null,
  consecutiveFailures: 0
};

// Maximum number of retries for sync jobs
const MAX_RETRY_COUNT = 3;

// Backoff multiplier in ms (starts with 1 min, then 2 min, then 4 min)
const RETRY_BACKOFF_MS = 60000; 

// Maximum number of consecutive failures before logging critical error
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Initialize the email scheduler system
 * Sets up recurring jobs for email syncing and reply processing
 */
export function initEmailScheduler() {
  console.log('Email scheduler initialized');
  
  // Start the initial sync immediately (after 5 seconds to allow system init)
  setTimeout(() => {
    runEmailSyncJob();
  }, 5000);
  
  // Schedule the sync job to run every minute
  setInterval(() => {
    runEmailSyncJob();
  }, 60000);
  
  // Schedule the unreplied emails processing job every 2 minutes
  setInterval(() => {
    processUnrepliedEmails();
  }, 120000);
  
  // Log status of scheduler every 10 minutes
  setInterval(() => {
    logSchedulerStatus();
  }, 600000);
}

/**
 * Run the email sync job
 * This function syncs emails and ensures only one sync job runs at a time
 */
async function runEmailSyncJob() {
  // If sync is already running, skip this run
  if (syncJobStatus.isRunning) {
    console.log('Email sync job already running, skipping this run');
    return;
  }
  
  console.log('Starting scheduled email sync job');
  syncJobStatus.isRunning = true;
  
  try {
    // Get all active users with IMAP configuration (for now just user 1)
    const userId = 1; // TODO: Extend to all active users once multi-user is implemented
    
    // Check if IMAP is configured and active for this user
    const imapConfig = await storage.getSmtpConfigByUserId(userId);
    
    if (!imapConfig?.isActive || !imapConfig?.imapHost) {
      console.log('IMAP not configured for user, skipping email sync');
      syncJobStatus.isRunning = false;
      return;
    }
    
    // Run email sync with retry logic
    const syncOptions = {
      unreadOnly: true,
      folder: 'INBOX',
      limit: 100,  // Increased limit to catch more emails
      retryCount: 0 // Initial retry count
    };
    
    const syncResult = await syncEmails(userId, syncOptions);
    console.log(`Scheduled sync completed, processed ${syncResult} emails`);
    
    // Update job status on success
    syncJobStatus.lastRun = new Date();
    syncJobStatus.consecutiveFailures = 0;
    syncJobStatus.lastError = null;
    
    // Log successful sync
    await storage.createSystemActivity({
      module: "Email",
      event: "ScheduledEmailSync",
      status: "success",
      timestamp: new Date(),
      details: { emailsProcessed: syncResult }
    });
    
  } catch (error) {
    // Increment failure counter
    syncJobStatus.consecutiveFailures++;
    syncJobStatus.lastError = error as Error;
    
    console.error('Error in scheduled email sync job:', error);
    
    // Log the error
    await storage.createSystemActivity({
      module: "Email",
      event: "ScheduledEmailSyncError",
      status: "error",
      timestamp: new Date(),
      details: { 
        error: error instanceof Error ? error.message : String(error),
        consecutiveFailures: syncJobStatus.consecutiveFailures
      }
    });
    
    // If we've had too many consecutive failures, send alert
    if (syncJobStatus.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`CRITICAL: Email sync has failed ${syncJobStatus.consecutiveFailures} consecutive times`);
      
      // Create critical alert
      await storage.createSystemActivity({
        module: "Email",
        event: "EmailSyncCriticalFailure",
        status: "critical",
        timestamp: new Date(),
        details: { 
          error: error instanceof Error ? error.message : String(error),
          consecutiveFailures: syncJobStatus.consecutiveFailures
        }
      });
    }
    
  } finally {
    syncJobStatus.isRunning = false;
  }
}

/**
 * Process all unreplied emails and generate automated responses
 */
async function processUnrepliedEmails() {
  try {
    console.log('Processing unreplied emails');
    const userId = 1; // Default user ID
    
    // Find all received emails that haven't been replied to
    const unrepliedEmails = await storage.getUnrepliedEmails(userId);
    console.log(`Found ${unrepliedEmails.length} unreplied emails to process`);
    
    if (unrepliedEmails.length === 0) {
      return;
    }
    
    // Process each unreplied email
    for (const email of unrepliedEmails) {
      try {
        console.log(`Processing unreplied email: ${email.id}, Subject: ${email.subject}`);
        
        // Check if email is already replied to (double check with DB for safety)
        const existingReply = await storage.getEmailReplyByOriginalEmailId(email.id);
        if (existingReply) {
          console.log(`Email ${email.id} already has a reply (${existingReply.id}), marking as replied and skipping`);
          // Ensure the email is properly marked as replied in database
          await storage.updateEmailLogIsReplied(email.id, true, existingReply.messageId || undefined);
          continue;
        }
        
        // Skip if email is marked as replied
        if (email.isReplied) {
          console.log(`Email ${email.id} is already marked as replied, skipping`);
          continue;
        }
        
        // Use AI to generate a response to this email
        const { response, intents, shouldScheduleMeeting, meetingDetails } = 
          await emailController.parseEmailAndGenerateResponse({
            from: email.from,
            to: email.to,
            subject: email.subject,
            body: email.body
          }, userId);
        
        // Determine the appropriate email service to use
        const service = await determineService(userId);
        
        // Create the reply in the database first
        const emailReply = await storage.createEmailReply({
          userId,
          originalEmailId: email.id,
          replyContent: response,
          autoGenerated: true,
          replyStatus: 'pending'
        });
        
        console.log(`Created email reply record: ${emailReply.id}`);
        
        // Prepare the reply
        const replySubject = email.subject.startsWith("Re:") 
          ? email.subject 
          : `Re: ${email.subject}`;
        
        // Get sender information based on service
        const { fromEmail, fromName } = await getSenderInfo(userId, service);
        
        // Format the response as HTML and text
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${formatEmailBodyAsHtml(response)}
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #718096; font-size: 12px;">
              <p>AI Receptionist - Sent on ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        `;
        
        // Send the reply with proper formatting
        const sendResult = await emailController.sendEmail({
          to: email.from,
          from: fromEmail,
          fromName: fromName,
          subject: replySubject,
          text: formatEmailBodyAsText(response),
          html: htmlContent
        }, service, userId);
        
        if (sendResult.success) {
          console.log(`Successfully sent auto-reply to email ${email.id}`);
          
          // Update the reply status with sent status
          await storage.updateEmailReplyStatus(emailReply.id, 'sent', emailReply.messageId || undefined);
          
          // Mark the original email as replied
          await storage.updateEmailLogIsReplied(email.id, true, emailReply.messageId || undefined);
          
          // Handle meeting scheduling if needed
          if (shouldScheduleMeeting && meetingDetails) {
            console.log(`Detected meeting request in email ${email.id}, details:`, meetingDetails);
            // TODO: Implement meeting scheduling logic 
          }
          
          // Log the auto-reply activity
          await storage.createSystemActivity({
            module: "Email",
            event: "AutoReplyGenerated",
            status: "success",
            timestamp: new Date(),
            details: { 
              emailId: email.id,
              replyId: emailReply.id,
              intents,
              meetingRequested: shouldScheduleMeeting
            }
          });
        } else {
          console.error(`Failed to send auto-reply to email ${email.id}:`, sendResult.error);
          
          // Update the reply status to failed
          await storage.updateEmailReplyStatus(emailReply.id, 'failed', undefined, sendResult.error);
          
          // Log the failure
          await storage.createSystemActivity({
            module: "Email",
            event: "AutoReplyFailed",
            status: "error",
            timestamp: new Date(),
            details: { 
              emailId: email.id,
              replyId: emailReply.id,
              error: sendResult.error
            }
          });
        }
      } catch (emailError) {
        console.error(`Error processing email ${email.id}:`, emailError);
        
        // Log the error
        await storage.createSystemActivity({
          module: "Email",
          event: "EmailProcessingError",
          status: "error",
          timestamp: new Date(),
          details: { 
            emailId: email.id,
            error: emailError instanceof Error ? emailError.message : String(emailError)
          }
        });
      }
    }
  } catch (error) {
    console.error('Error processing unreplied emails:', error);
    
    // Log the error
    await storage.createSystemActivity({
      module: "Email",
      event: "UnrepliedEmailsProcessingError",
      status: "error",
      timestamp: new Date(),
      details: { 
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }
}

/**
 * Helper function to determine which email service to use
 */
async function determineService(userId: number): Promise<emailController.EmailService> {
  // Get all service configurations for the user
  const sendgridConfig = await storage.getSendgridConfigByUserId(userId);
  const smtpConfig = await storage.getSmtpConfigByUserId(userId);
  const mailgunConfig = await storage.getMailgunConfigByUserId(userId);
  
  // Check which services are active and prioritize them
  if (sendgridConfig?.isActive) {
    return 'sendgrid';
  } else if (smtpConfig?.isActive) {
    return 'smtp';
  } else if (mailgunConfig?.isActive) {
    return 'mailgun';
  }
  
  // Default to SendGrid if no service is active
  return 'sendgrid';
}

/**
 * Helper function to get sender info based on service
 */
async function getSenderInfo(userId: number, service: emailController.EmailService): Promise<{fromEmail: string, fromName: string}> {
  let fromEmail = '';
  let fromName = 'AI Receptionist';
  
  switch(service) {
    case 'sendgrid':
      const sendgridConfig = await storage.getSendgridConfigByUserId(userId);
      fromEmail = sendgridConfig?.fromEmail || '';
      fromName = sendgridConfig?.fromName || fromName;
      break;
    
    case 'smtp':
      const smtpConfig = await storage.getSmtpConfigByUserId(userId);
      fromEmail = smtpConfig?.fromEmail || '';
      break;
    
    case 'mailgun':
      const mailgunConfig = await storage.getMailgunConfigByUserId(userId);
      fromEmail = mailgunConfig?.fromEmail || '';
      fromName = mailgunConfig?.fromName || fromName;
      break;
  }
  
  return { fromEmail, fromName };
}

/**
 * Log the current status of the email scheduler
 */
function logSchedulerStatus() {
  console.log('Email scheduler status:', {
    syncJob: {
      lastRun: syncJobStatus.lastRun,
      isRunning: syncJobStatus.isRunning,
      consecutiveFailures: syncJobStatus.consecutiveFailures,
      lastError: syncJobStatus.lastError ? syncJobStatus.lastError.message : null
    }
  });
}