import * as ImapSimple from 'imap-simple';
import { simpleParser, type ParsedMail } from 'mailparser';
import { storage } from '../database-storage';
import { type InsertEmailLog } from '@shared/schema';
import * as IMAP from 'imap';

interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  timestamp: Date;
  messageId: string;
  uid?: number;
}

/**
 * Get IMAP configuration for a specific user
 * This function handles auto-detection and fallbacks for IMAP settings
 */
export async function getImapConfig(userId: number): Promise<ImapSimple.ImapSimpleOptions | null> {
  try {
    console.log(`Getting IMAP configuration for user ${userId}`);
    
    // Get SMTP configuration (IMAP settings may be derived from this)
    const smtpConfig = await storage.getSmtpConfigByUserId(userId);
    
    if (!smtpConfig) {
      console.log(`No SMTP configuration found for user ${userId}`);
      return null;
    }
    
    if (!smtpConfig.isActive) {
      console.log(`SMTP configuration for user ${userId} is inactive`);
      return null;
    }
    
    // Prepare IMAP configuration with smart detection
    let imapHost = smtpConfig.imapHost;
    let imapPort = smtpConfig.imapPort;
    let imapTls = smtpConfig.imapSecure;
    
    // Auto-detection for IMAP settings if not specified
    if (!imapHost) {
      const smtpHost = smtpConfig.host;
      
      // Try various common IMAP server patterns
      const hostPatterns = [
        { test: /^smtp\.(.+)$/, replace: 'imap.$1' },     // smtp.example.com -> imap.example.com
        { test: /^mail\.(.+)$/, replace: 'mail.$1' },     // mail.example.com -> mail.example.com (unchanged)
        { test: /^(.+)$/, replace: 'imap.$1' }            // example.com -> imap.example.com
      ];
      
      // Find first matching pattern or use fallback
      const matchedPattern = hostPatterns.find(pattern => pattern.test.test(smtpHost));
      if (matchedPattern) {
        imapHost = smtpHost.replace(matchedPattern.test, matchedPattern.replace);
      } else {
        // Default fallback
        imapHost = `imap.${smtpHost}`;
      }
      
      console.log(`IMAP host auto-detected: ${imapHost} (derived from ${smtpHost})`);
    }
    
    // Common port defaults if not specified
    if (!imapPort) {
      imapPort = 993; // Default secure IMAP port
      console.log(`Using default secure IMAP port: ${imapPort}`);
    }
    
    // TLS is recommended for security but can be explicitly disabled
    if (imapTls === undefined) {
      imapTls = true; // Default to secure connection
      console.log(`Using default secure TLS setting: ${imapTls}`);
    }
    
    // Special case handling for known providers
    if (smtpConfig.host.includes('gmail.com')) {
      console.log('Gmail detected, using known good Gmail IMAP settings');
      imapHost = 'imap.gmail.com';
      imapPort = 993;
      imapTls = true;
    } else if (smtpConfig.host.includes('outlook.com') || smtpConfig.host.includes('hotmail.com')) {
      console.log('Outlook/Hotmail detected, using known good Outlook IMAP settings');
      imapHost = 'outlook.office365.com';
      imapPort = 993;
      imapTls = true;
    } else if (smtpConfig.host.includes('yahoo.com')) {
      console.log('Yahoo detected, using known good Yahoo IMAP settings');
      imapHost = 'imap.mail.yahoo.com';
      imapPort = 993;
      imapTls = true;
    } else if (smtpConfig.host.includes('aol.com')) {
      console.log('AOL detected, using known good AOL IMAP settings');
      imapHost = 'imap.aol.com';
      imapPort = 993;
      imapTls = true;
    } else if (smtpConfig.host.includes('mail.18plus.io')) {
      console.log('18plus.io mail detected, using known good settings');
      imapHost = 'mail.18plus.io';
      imapPort = 993;
      imapTls = true;
    }
    
    // Create configuration for imap-simple
    const config: ImapSimple.ImapSimpleOptions = {
      imap: {
        user: smtpConfig.username,
        password: smtpConfig.password,
        host: imapHost,
        port: imapPort,
        tls: imapTls,
        authTimeout: 10000, // 10 seconds timeout for auth
        tlsOptions: { 
          rejectUnauthorized: false, // For development - allows self-signed certs
        }
      },
      onmail: function() {
        console.log('New mail event received');
      },
      onupdate: function(seqno, info) {
        console.log(`Message update: seqno=${seqno}, flags=${info.flags.join(',')}`);
      }
    };
    
    // Log the configuration we'll use
    console.log(`IMAP configuration prepared: ${imapHost}:${imapPort} (TLS: ${imapTls})`);
    
    // Track the configuration attempt
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Configuration Prepared",
      status: "Completed",
      timestamp: new Date(),
      details: { 
        userId, 
        host: imapHost, 
        port: imapPort, 
        tls: imapTls,
        username: smtpConfig.username
      }
    });
    
    return config;
  } catch (error) {
    console.error(`Error preparing IMAP configuration for user ${userId}:`, error);
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Configuration Preparation",
      status: "Failed",
      timestamp: new Date(),
      details: { userId, error: (error as Error).message }
    });
    return null;
  }
}

/**
 * Connect to IMAP server with retry logic
 */
export async function connectToImap(userId: number): Promise<ImapSimple.ImapSimple | null> {
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let lastError: Error | null = null;
  
  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Connecting to IMAP server for user ${userId}, attempt ${retryCount + 1}/${MAX_RETRIES}`);
      
      const config = await getImapConfig(userId);
      if (!config) {
        console.log(`No valid IMAP configuration available for user ${userId}`);
        return null;
      }
      
      // Try connecting with exponential backoff
      const connection = await ImapSimple.connect(config);
      console.log(`Successfully connected to IMAP server for user ${userId}`);
      
      await storage.createSystemActivity({
        module: "Email",
        event: "IMAP Connection",
        status: "Successful",
        timestamp: new Date(),
        details: { userId, attempt: retryCount + 1 }
      });
      
      return connection;
    } catch (error) {
      lastError = error as Error;
      const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      
      console.error(`IMAP connection attempt ${retryCount + 1} failed for user ${userId}:`, error);
      console.log(`Waiting ${waitTime}ms before retry...`);
      
      // Log the failure
      await storage.createSystemActivity({
        module: "Email",
        event: "IMAP Connection Attempt",
        status: "Failed",
        timestamp: new Date(),
        details: { 
          userId, 
          attempt: retryCount + 1, 
          error: (error as Error).message, 
          willRetry: retryCount < MAX_RETRIES - 1 
        }
      });
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, waitTime));
      retryCount++;
    }
  }
  
  // If all retries failed, log the final failure
  console.error(`All ${MAX_RETRIES} connection attempts failed for user ${userId}`);
  await storage.createSystemActivity({
    module: "Email",
    event: "IMAP Connection",
    status: "Failed",
    timestamp: new Date(),
    details: { 
      userId, 
      attempts: MAX_RETRIES, 
      error: lastError?.message || "Unknown error" 
    }
  });
  
  return null;
}

/**
 * Fetch emails from IMAP server using imap-simple
 * This new implementation provides better error handling and more reliable results
 */
export async function fetchEmails(userId: number, folder: string = 'INBOX', limit: number = 20, fetchUnreadOnly: boolean = false): Promise<EmailMessage[]> {
  console.log(`Fetching ${fetchUnreadOnly ? 'unread' : 'all'} emails for user ${userId} from ${folder}, limit ${limit}`);
  
  try {
    // Connect to IMAP server with retry logic
    const connection = await connectToImap(userId);
    if (!connection) {
      throw new Error(`Failed to establish IMAP connection for user ${userId}`);
    }
    
    // Log the successful connection
    console.log(`Connected to IMAP server for user ${userId}, opening mailbox: ${folder}`);
    
    // Open the mailbox
    try {
      await connection.openBox(folder);
      console.log(`Successfully opened mailbox: ${folder}`);
    } catch (error) {
      // Try to handle non-standard folder names or structures
      console.error(`Error opening mailbox "${folder}":`, error);
      
      // List available mailboxes and try to find a match
      console.log(`Listing available mailboxes to find a match for "${folder}"...`);
      const boxes = await connection.getBoxes();
      console.log('Available mailboxes:', Object.keys(boxes));
      
      // Try similar names or default to INBOX
      const folderAlternatives = [
        folder.toUpperCase(),
        folder.toLowerCase(),
        'INBOX'
      ];
      
      let folderFound = false;
      for (const altFolder of folderAlternatives) {
        if (altFolder === folder) continue; // Skip the original folder that failed
        
        try {
          console.log(`Trying alternative folder: ${altFolder}`);
          await connection.openBox(altFolder);
          console.log(`Successfully opened alternative mailbox: ${altFolder}`);
          folderFound = true;
          break;
        } catch (altError) {
          console.log(`Alternative folder ${altFolder} also failed:`, altError);
        }
      }
      
      if (!folderFound) {
        throw new Error(`Could not open any mailbox including ${folder} and alternatives`);
      }
    }
    
    // Search criteria for emails
    let searchCriteria: string[] = [];
    
    if (fetchUnreadOnly) {
      // Different servers might handle the UNSEEN criteria differently
      searchCriteria = ['UNSEEN'];
      console.log('Using UNSEEN search criteria for unread emails');
    } else {
      // ALL is more reliable than using date ranges
      searchCriteria = ['ALL'];
      console.log('Using ALL search criteria');
    }
    
    // Search options
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],  // Fetch headers, text and full message
      markSeen: false,                  // Don't mark as seen
      struct: true                      // Get the structure
    };
    
    // Search and fetch emails with timeout protection
    console.log(`Searching for emails with criteria: ${searchCriteria.join(', ')}`);
    
    // Use a promise with timeout to prevent hanging
    const searchPromise = new Promise<EmailMessage[]>(async (resolve, reject) => {
      try {
        // Search for messages
        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`Search returned ${messages.length} messages`);
        
        // Sort messages by date - newest first
        messages.sort((a, b) => {
          const headerA = a.parts.find(part => part.which === 'HEADER');
          const headerB = b.parts.find(part => part.which === 'HEADER');
          
          if (!headerA || !headerB) return 0;
          
          const dateA = headerA.body.date ? new Date(headerA.body.date[0]).getTime() : 0;
          const dateB = headerB.body.date ? new Date(headerB.body.date[0]).getTime() : 0;
          
          return dateB - dateA; // Sort newest first
        });
        
        // Limit the number of messages to process
        const limitedMessages = messages.slice(0, limit);
        console.log(`Processing ${limitedMessages.length} messages (limited from ${messages.length})`);
        
        // Process each message
        const emails: EmailMessage[] = [];
        for (const message of limitedMessages) {
          try {
            // Get message parts
            const fullBody = message.parts.find(part => part.which === '');
            const header = message.parts.find(part => part.which === 'HEADER');
            
            if (!fullBody || !header) {
              console.warn('Message missing required parts, skipping');
              continue;
            }
            
            // Parse the message using mailparser
            const parsed = await simpleParser(fullBody.body);
            
            // Extract email data with better error handling
            const email: EmailMessage = {
              from: '',
              to: '',
              subject: '',
              body: '',
              timestamp: new Date(),
              messageId: '',
              uid: message.attributes.uid
            };
            
            // Process from field
            if (parsed.from) {
              if (typeof parsed.from.text === 'string') {
                email.from = parsed.from.text;
              } else if (parsed.from.value) {
                // Handle array or single address
                if (Array.isArray(parsed.from.value)) {
                  email.from = parsed.from.value.map(addr => addr.address || '').filter(Boolean).join(', ');
                } else if (parsed.from.value.address) {
                  email.from = parsed.from.value.address;
                }
              }
            }
            
            // Process to field
            if (parsed.to) {
              if (typeof parsed.to.text === 'string') {
                email.to = parsed.to.text;
              } else if (parsed.to.value) {
                // Handle array or single address
                if (Array.isArray(parsed.to.value)) {
                  email.to = parsed.to.value.map(addr => addr.address || '').filter(Boolean).join(', ');
                } else if (parsed.to.value.address) {
                  email.to = parsed.to.value.address;
                }
              }
            }
            
            // Other fields
            email.subject = parsed.subject || '';
            email.body = parsed.text || '';
            email.html = parsed.html || undefined;
            email.timestamp = parsed.date || new Date();
            email.messageId = parsed.messageId || `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Add to the list if it has minimum required data
            if (email.from && (email.subject || email.body)) {
              emails.push(email);
              console.log(`Parsed email - From: ${email.from}, Subject: ${email.subject || '(no subject)'}`);
            } else {
              console.warn(`Skipping email with missing data - From: ${email.from}, Subject: ${email.subject || '(no subject)'}`);
            }
          } catch (msgError) {
            console.error('Error processing individual message:', msgError);
            // Continue with next message
          }
        }
        
        // Safely close the connection
        try {
          await connection.end();
          console.log('IMAP connection closed properly');
        } catch (closeError) {
          console.warn('Error closing IMAP connection:', closeError);
        }
        
        console.log(`Returning ${emails.length} processed emails`);
        resolve(emails);
      } catch (error) {
        console.error('Error in search and fetch:', error);
        // Ensure connection is closed even on error
        try {
          await connection.end();
        } catch (closeError) {
          console.warn('Error closing IMAP connection after error:', closeError);
        }
        reject(error);
      }
    });
    
    // Add a timeout to the search promise
    const timeoutPromise = new Promise<EmailMessage[]>((_, reject) => {
      setTimeout(() => {
        reject(new Error('IMAP search and fetch operation timed out after 60 seconds'));
      }, 60000); // 60 second timeout
    });
    
    // Use Promise.race to implement the timeout
    return await Promise.race([searchPromise, timeoutPromise]);
  } catch (error) {
    console.error(`Error in fetchEmails for user ${userId}:`, error);
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Fetch Emails",
      status: "Failed",
      timestamp: new Date(),
      details: { 
        userId, 
        folder, 
        fetchUnreadOnly, 
        error: (error as Error).message 
      }
    });
    return [];
  }
}

/**
 * Store fetched emails in the database with improved deduplication
 */
export async function storeEmails(userId: number, emails: EmailMessage[]): Promise<number> {
  try {
    let storedCount = 0;
    let duplicateCount = 0;
    
    // Process emails in chronological order (oldest first)
    const sortedEmails = [...emails].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    console.log(`Storing ${sortedEmails.length} emails for user ${userId} in chronological order`);
    
    for (const email of sortedEmails) {
      // Skip emails without necessary data
      if (!email.from || (!email.subject && !email.body)) {
        console.log(`Skipping email with missing data - From: ${email.from}, Subject: ${email.subject || '(no subject)'}`);
        continue;
      }
      
      try {
        // Multi-level deduplication strategy
        let isDuplicate = false;
        
        // 1. Check by messageId (most reliable)
        if (email.messageId) {
          const existingEmail = await storage.getEmailLogByMessageId(email.messageId);
          if (existingEmail) {
            console.log(`Duplicate found by messageId: ${email.messageId}`);
            duplicateCount++;
            isDuplicate = true;
          }
        }
        
        // 2. Check by sender, subject, and timestamp proximity
        if (!isDuplicate) {
          // Get similar emails
          const similarEmails = await storage.getEmailLogsByFromAndSubject(
            userId, 
            email.from, 
            email.subject || '(no subject)'
          );
          
          // Time window for considering duplicates (10 minutes)
          const timeWindowMs = 10 * 60 * 1000;
          
          for (const existingEmail of similarEmails) {
            const timeDiff = Math.abs(existingEmail.timestamp.getTime() - email.timestamp.getTime());
            
            // Consider it a duplicate if within time window
            if (timeDiff < timeWindowMs) {
              console.log(`Probable duplicate found by metadata matching: ${email.subject || '(no subject)'} from ${email.from}`);
              duplicateCount++;
              isDuplicate = true;
              break;
            }
          }
        }
        
        // Store if not a duplicate
        if (!isDuplicate) {
          // Create email log entry
          const emailLog: InsertEmailLog = {
            userId,
            from: email.from,
            to: email.to,
            subject: email.subject || '(no subject)',
            body: email.body,
            timestamp: email.timestamp,
            status: "received",
            service: "imap",
            messageId: email.messageId
          };
          
          await storage.createEmailLog(emailLog);
          storedCount++;
          console.log(`Stored email: "${email.subject || '(no subject)'}" from ${email.from}`);
        }
      } catch (emailError) {
        console.error(`Error processing individual email:`, emailError);
        // Continue with next email even if one fails
      }
    }
    
    // Log the results
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Emails Stored",
      status: "Completed",
      timestamp: new Date(),
      details: { 
        userId, 
        processed: emails.length,
        stored: storedCount, 
        duplicates: duplicateCount
      }
    });
    
    console.log(`Email storage complete. Stored: ${storedCount}, Duplicates: ${duplicateCount}, Total processed: ${emails.length}`);
    return storedCount;
  } catch (error) {
    console.error(`Error storing emails for user ${userId}:`, error);
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Store Emails",
      status: "Failed",
      timestamp: new Date(),
      details: { userId, error: (error as Error).message }
    });
    return 0;
  }
}

/**
 * Improved syncEmails function that fetches and stores emails
 * with better error handling and retry logic
 */
export async function syncEmails(userId: number, options: { 
  unreadOnly?: boolean, 
  folder?: string, 
  limit?: number,
  retryCount?: number
} = {}): Promise<number> {
  try {
    const { 
      unreadOnly = true,  // Default to unread emails only
      folder = 'INBOX', 
      limit = 50,         // Increased limit
      retryCount = 0      // For tracking retries
    } = options;
    
    console.log(`Starting email sync for user ${userId}, unreadOnly=${unreadOnly}, folder=${folder}, limit=${limit}, retry=${retryCount}`);
    
    // Log sync attempt
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Sync Started",
      status: "In Progress",
      timestamp: new Date(),
      details: { userId, unreadOnly, folder, limit, retryCount }
    });
    
    // Fetch emails using the improved implementation
    const emails = await fetchEmails(userId, folder, limit, unreadOnly);
    
    // Check if we got any emails
    if (emails.length === 0) {
      console.log(`No ${unreadOnly ? 'unread' : ''} emails found for user ${userId} in folder ${folder}`);
      
      // Even with empty result, log as successful completion
      await storage.createSystemActivity({
        module: "Email",
        event: "IMAP Sync Completed",
        status: "Success",
        timestamp: new Date(),
        details: { 
          userId, 
          folder, 
          unreadOnly,
          result: "No emails found"
        }
      });
      
      return 0;
    }
    
    console.log(`Found ${emails.length} emails for user ${userId}, storing in database`);
    
    // Store the emails
    const storedCount = await storeEmails(userId, emails);
    
    // Log successful completion
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Sync Completed",
      status: "Success",
      timestamp: new Date(),
      details: { 
        userId, 
        folder,
        unreadOnly,
        found: emails.length,
        stored: storedCount
      }
    });
    
    return storedCount;
  } catch (error) {
    console.error(`Error syncing emails for user ${userId}:`, error);
    
    // Implement retry logic for transient errors
    const MAX_RETRIES = 2;
    if (options.retryCount !== undefined && options.retryCount < MAX_RETRIES) {
      const waitTime = Math.pow(2, options.retryCount || 0) * 1000; // 1s, 2s
      console.log(`Will retry in ${waitTime}ms (retry ${(options.retryCount || 0) + 1}/${MAX_RETRIES})`);
      
      // Log retry attempt
      await storage.createSystemActivity({
        module: "Email",
        event: "IMAP Sync Retry Scheduled",
        status: "Pending",
        timestamp: new Date(),
        details: { 
          userId, 
          error: (error as Error).message,
          retryCount: (options.retryCount || 0) + 1,
          maxRetries: MAX_RETRIES,
          waitTime
        }
      });
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Recursive retry with incremented counter
      return syncEmails(userId, {
        ...options,
        retryCount: (options.retryCount || 0) + 1
      });
    }
    
    // Log failure after all retries
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Sync Failed",
      status: "Failed",
      timestamp: new Date(),
      details: { 
        userId, 
        error: (error as Error).message,
        retryAttempts: options.retryCount || 0
      }
    });
    
    return 0;
  }
}

/**
 * Verify IMAP connection with better error reporting
 */
export async function verifyImapConnection(userId: number): Promise<{ 
  connected: boolean; 
  message?: string;
  folderList?: string[];
}> {
  try {
    console.log(`Verifying IMAP connection for user ${userId}`);
    
    // Get IMAP configuration
    const connection = await connectToImap(userId);
    
    if (!connection) {
      return { 
        connected: false, 
        message: "Could not establish IMAP connection. Please check your email server settings." 
      };
    }
    
    // Try listing mailboxes to verify full access
    try {
      const boxes = await connection.getBoxes();
      const folderList = Object.keys(boxes);
      
      // Close the connection
      await connection.end();
      
      console.log(`IMAP connection verified for user ${userId}, found ${folderList.length} mailboxes`);
      
      // Log the successful verification
      await storage.createSystemActivity({
        module: "Email",
        event: "IMAP Connection Verified",
        status: "Success",
        timestamp: new Date(),
        details: { 
          userId, 
          mailboxes: folderList.length
        }
      });
      
      return {
        connected: true,
        message: `Successfully connected to email server. Found ${folderList.length} mailboxes.`,
        folderList
      };
    } catch (boxError) {
      console.error(`Error listing mailboxes:`, boxError);
      
      // Still return success because we connected, but with warning
      await connection.end();
      
      await storage.createSystemActivity({
        module: "Email",
        event: "IMAP Connection Verified",
        status: "Warning",
        timestamp: new Date(),
        details: { 
          userId, 
          warning: "Connected but could not list mailboxes",
          error: (boxError as Error).message
        }
      });
      
      return {
        connected: true,
        message: "Connected to email server, but could not list mailboxes."
      };
    }
  } catch (error) {
    console.error(`Error verifying IMAP connection for user ${userId}:`, error);
    
    // Log the verification failure
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Connection Verification",
      status: "Failed",
      timestamp: new Date(),
      details: { 
        userId, 
        error: (error as Error).message
      }
    });
    
    return {
      connected: false,
      message: `Could not connect to email server: ${(error as Error).message}`
    };
  }
}