import IMAP from 'imap';
import { simpleParser, type ParsedMail } from 'mailparser';
import { storage } from '../database-storage';
import { type InsertEmailLog } from '@shared/schema';

interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  timestamp: Date;
  messageId: string;
}

/**
 * Initialize IMAP client for a specific user
 */
export async function initImapClient(userId: number): Promise<IMAP | null> {
  try {
    // Get SMTP configuration (IMAP uses similar settings)
    const smtpConfig = await storage.getSmtpConfigByUserId(userId);
    
    if (!smtpConfig || !smtpConfig.isActive) {
      console.log(`IMAP client not initialized for user ${userId}: No active SMTP configuration`);
      return null;
    }
    
    // Determine IMAP host with better fallback strategy
    let host = smtpConfig.imapHost;
    if (!host) {
      // Try to derive IMAP host from SMTP host with different patterns
      const smtpHost = smtpConfig.host;
      if (smtpHost.startsWith('smtp.')) {
        host = smtpHost.replace('smtp.', 'imap.');
      } else if (smtpHost.includes('mail.')) {
        // For generic mail servers, host might be the same
        host = smtpHost;
      } else {
        // Try adding "imap." prefix as a last resort
        host = `imap.${smtpHost.split('.').slice(1).join('.')}`;
      }
      
      console.log(`IMAP host not explicitly set, derived ${host} from SMTP host ${smtpHost}`);
    }
    
    // Common IMAP port defaults for different security protocols
    const port = smtpConfig.imapPort || 993; // Default to 993 for secure
    const tls = smtpConfig.imapSecure ?? true; // Default to true if not specified
    
    console.log(`Initializing IMAP client with host=${host}, port=${port}, user=${smtpConfig.username}, tls=${tls ? 'enabled' : 'disabled'}`);
    
    // For mail.18plus.io, use specific connection settings that are known to work
    if (smtpConfig.host === 'mail.18plus.io') {
      console.log('Detected mail.18plus.io server, using optimized IMAP settings');
      host = 'mail.18plus.io';
      // Note: Some mail servers may need a specific port like 143 with STARTTLS instead of 993 with TLS
    }
    
    // Create IMAP client with enhanced debug information
    const imapClient = new IMAP({
      user: smtpConfig.username,
      password: smtpConfig.password,
      host: host,
      port: port,
      tls: tls,
      debug: console.log, // Enable debug logging for connection issues
      autotls: 'always', // Try STARTTLS if available
      tlsOptions: { 
        rejectUnauthorized: false, // For development only
        enableTrace: true // Enable TLS trace for debugging
      }
    });
    
    // Log initialization
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Client Initialized",
      status: "Completed",
      timestamp: new Date(),
      details: { userId, host, port, tls, username: smtpConfig.username }
    });
    
    return imapClient;
  } catch (error) {
    console.error(`Error initializing IMAP client for user ${userId}:`, error);
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Client Initialization",
      status: "Failed",
      timestamp: new Date(),
      details: { userId, error: (error as Error).message }
    });
    return null;
  }
}

/**
 * Fetch emails from the server
 */
export async function fetchEmails(userId: number, folder: string = 'INBOX', limit: number = 20, fetchUnreadOnly: boolean = false): Promise<EmailMessage[]> {
  try {
    const imapClient = await initImapClient(userId);
    
    if (!imapClient) {
      throw new Error('IMAP client not initialized');
    }
    
    console.log(`Fetching emails for user ${userId} from folder ${folder}, limit ${limit}, unread only: ${fetchUnreadOnly}`);
    
    return new Promise((resolve, reject) => {
      const emails: EmailMessage[] = [];
      let fetchCompleted: boolean = false;
      let emailsProcessed: number = 0;
      
      imapClient.once('ready', () => {
        console.log(`IMAP connection ready for user ${userId}`);
        
        imapClient.openBox(folder, false, (err, box) => {
          if (err) {
            console.error(`Error opening mailbox ${folder}:`, err);
            imapClient.end();
            return reject(err);
          }
          
          console.log(`Mailbox opened: ${folder}, total messages: ${box?.messages?.total || 'unknown'}`);
          
          // Search criteria - use UNSEEN for unread only, ALL for all emails
          const searchCriteria = fetchUnreadOnly ? ['UNSEEN'] : ['ALL'];
          
          console.log(`Searching emails with criteria: ${searchCriteria.join(', ')}`);
          
          imapClient.search(searchCriteria, (err, results) => {
            if (err) {
              console.error(`Error searching emails:`, err);
              imapClient.end();
              return reject(err);
            }
            
            console.log(`Found ${results.length} emails matching criteria`);
            
            if (!results.length) {
              imapClient.end();
              return resolve([]);
            }
            
            // Sort results by sequence number (newest first) and limit
            results.sort((a, b) => b - a);
            const emailsToFetch = results.slice(0, limit);
            
            console.log(`Fetching ${emailsToFetch.length} emails (out of ${results.length} found)`);
            
            const fetch = imapClient.fetch(emailsToFetch, {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT', ''],
              struct: true,
              markSeen: false // Don't mark as read when fetching
            });
            
            // Time out after 30 seconds to prevent hanging
            const timeoutId = setTimeout(() => {
              if (!fetchCompleted) {
                console.error(`IMAP fetch timed out after 30 seconds`);
                imapClient.end();
                resolve(emails); // Return what we have so far
              }
            }, 30000);
            
            fetch.on('message', (msg, seqno) => {
              console.log(`Processing message #${seqno}`);
              
              const email: Partial<EmailMessage> = {
                messageId: '',
                from: '',
                to: '',
                subject: '',
                body: '',
                timestamp: new Date()
              };
              
              msg.on('body', (stream, info) => {
                if (info.which === '') {
                  // Parse entire email
                  let buffer = '';
                  stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                  });
                  
                  stream.once('end', () => {
                    // Parse the email content
                    simpleParser(buffer).then((parsed) => {
                      // Handle different address formats
                      if (parsed.from) {
                        // Type guard for array vs. single object
                        if (Array.isArray(parsed.from)) {
                          // It's an array of address objects
                          email.from = parsed.from.map((addr: any) => addr.address).join(', ');
                        } else if (typeof parsed.from === 'object') {
                          // It's a single address object or wrapper
                          if (typeof parsed.from.text === 'string') {
                            email.from = parsed.from.text;
                          } else if (Array.isArray(parsed.from.value)) {
                            email.from = parsed.from.value.map((addr: any) => addr.address).join(', ');
                          } else if (parsed.from.value && typeof parsed.from.value === 'object') {
                            email.from = parsed.from.value.address || '';
                          } else {
                            email.from = '';
                          }
                        } else {
                          email.from = '';
                        }
                      }
                      
                      if (parsed.to) {
                        // Type guard for array vs. single object
                        if (Array.isArray(parsed.to)) {
                          // It's an array of address objects
                          email.to = parsed.to.map((addr: any) => addr.address).join(', ');
                        } else if (typeof parsed.to === 'object') {
                          // It's a single address object or wrapper
                          if (typeof parsed.to.text === 'string') {
                            email.to = parsed.to.text;
                          } else if (Array.isArray(parsed.to.value)) {
                            email.to = parsed.to.value.map((addr: any) => addr.address).join(', ');
                          } else if (parsed.to.value && typeof parsed.to.value === 'object') {
                            email.to = parsed.to.value.address || '';
                          } else {
                            email.to = '';
                          }
                        } else {
                          email.to = '';
                        }
                      }
                      
                      email.subject = parsed.subject || '';
                      email.body = parsed.text || '';
                      email.html = parsed.html || undefined;
                      email.timestamp = parsed.date || new Date();
                      email.messageId = parsed.messageId || '';
                      
                      // Only push emails that have proper data
                      if (email.from && email.subject) {
                        emails.push(email as EmailMessage);
                        console.log(`Email parsed - From: ${email.from}, Subject: ${email.subject}`);
                      }
                      
                      emailsProcessed++;
                    }).catch(err => {
                      console.error('Error parsing email:', err);
                      emailsProcessed++;
                    });
                  });
                }
              });
              
              msg.once('attributes', (attrs) => {
                // Store flags to check if message is read/unread
                const flags = attrs.flags || [];
                console.log(`Message #${seqno} flags: ${flags.join(', ')}`);
              });
              
              msg.once('end', () => {
                console.log(`Finished processing message #${seqno}`);
              });
            });
            
            fetch.once('error', (err) => {
              console.error(`Error during fetch:`, err);
              clearTimeout(timeoutId);
              fetchCompleted = true;
              imapClient.end();
              reject(err);
            });
            
            fetch.once('end', () => {
              console.log(`All messages processed, found ${emails.length} valid emails`);
              clearTimeout(timeoutId);
              fetchCompleted = true;
              
              // If we want to mark messages as seen after reading them
              if (fetchUnreadOnly) {
                console.log(`Marking ${emailsToFetch.length} messages as seen`);
                try {
                  // This is optional - only if you want to mark messages as read
                  // imapClient.addFlags(emailsToFetch, ['\\Seen'], (err) => {
                  //   if (err) console.error(`Error marking messages as seen:`, err);
                  //   imapClient.end();
                  //   resolve(emails);
                  // });
                  imapClient.end();
                  resolve(emails);
                } catch (e) {
                  console.error(`Error in addFlags:`, e);
                  imapClient.end();
                  resolve(emails);
                }
              } else {
                imapClient.end();
                resolve(emails);
              }
            });
          });
        });
      });
      
      imapClient.once('error', (err: Error) => {
        console.error(`IMAP client error:`, err);
        reject(err);
      });
      
      imapClient.connect();
    });
  } catch (error) {
    console.error(`Error fetching emails for user ${userId}:`, error);
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Fetch Emails",
      status: "Failed",
      timestamp: new Date(),
      details: { userId, folder, fetchUnreadOnly, error: (error as Error).message }
    });
    return [];
  }
}

/**
 * Store fetched emails in the database
 */
export async function storeEmails(userId: number, emails: EmailMessage[]): Promise<number> {
  try {
    let storedCount = 0;
    let duplicateCount = 0;
    
    // Process emails in reverse order (oldest first) to maintain chronological order
    const sortedEmails = [...emails].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    console.log(`Storing ${sortedEmails.length} emails for user ${userId} in chronological order`);
    
    for (const email of sortedEmails) {
      // Skip emails without necessary data
      if (!email.from || !email.subject) {
        console.log(`Skipping email with missing data - From: ${email.from}, Subject: ${email.subject}`);
        continue;
      }
      
      try {
        // Check if this email already exists in the database by messageId
        let isDuplicate = false;
        
        if (email.messageId) {
          const existingEmail = await storage.getEmailLogByMessageId(email.messageId);
          if (existingEmail) {
            console.log(`Skipping duplicate email with messageId: ${email.messageId}`);
            duplicateCount++;
            isDuplicate = true;
          }
        }
        
        // If no messageId or not found by messageId, try checking by other fields
        if (!isDuplicate && !email.messageId) {
          // Look for similar emails with same from, subject, and close timestamp
          const similarEmails = await storage.getEmailLogsByFromAndSubject(
            userId, 
            email.from, 
            email.subject
          );
          
          // Check if any similar email is a potential duplicate (within 5 minutes)
          const fiveMinutesMs = 5 * 60 * 1000;
          isDuplicate = similarEmails.some(existingEmail => {
            const timeDiff = Math.abs(existingEmail.timestamp.getTime() - email.timestamp.getTime());
            return timeDiff < fiveMinutesMs;
          });
          
          if (isDuplicate) {
            console.log(`Skipping probable duplicate email with from=${email.from}, subject=${email.subject}`);
            duplicateCount++;
          }
        }
        
        if (!isDuplicate) {
          // Create email log entry
          const emailLog: InsertEmailLog = {
            userId,
            from: email.from,
            to: email.to,
            subject: email.subject,
            body: email.body,
            timestamp: email.timestamp,
            status: "received",
            service: "imap",
            messageId: email.messageId
          };
          
          await storage.createEmailLog(emailLog);
          storedCount++;
          console.log(`Stored email: ${email.subject} from ${email.from}`);
        }
      } catch (emailError) {
        console.error(`Error processing individual email:`, emailError);
        // Continue with next email even if one fails
      }
    }
    
    if (storedCount > 0 || duplicateCount > 0) {
      await storage.createSystemActivity({
        module: "Email",
        event: "IMAP Emails Stored",
        status: "Completed",
        timestamp: new Date(),
        details: { 
          userId, 
          stored: storedCount, 
          duplicates: duplicateCount,
          total: emails.length
        }
      });
    }
    
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
 * Fetch and store emails in one operation
 */
export async function syncEmails(userId: number, options: { 
  unreadOnly?: boolean, 
  folder?: string, 
  limit?: number 
} = {}): Promise<number> {
  try {
    const { unreadOnly = false, folder = 'INBOX', limit = 20 } = options;
    
    console.log(`Starting email sync for user ${userId}, unreadOnly=${unreadOnly}, folder=${folder}, limit=${limit}`);
    
    // Log the sync attempt
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Sync Emails Started",
      status: "In Progress",
      timestamp: new Date(),
      details: { userId, unreadOnly, folder, limit }
    });
    
    // Fetch emails (either all or unread only)
    const emails = await fetchEmails(userId, folder, limit, unreadOnly);
    
    if (emails.length === 0) {
      console.log(`No emails found for user ${userId} with criteria: unreadOnly=${unreadOnly}, folder=${folder}`);
      
      await storage.createSystemActivity({
        module: "Email",
        event: "IMAP Sync Emails",
        status: "Completed",
        timestamp: new Date(),
        details: { userId, unreadOnly, folder, count: 0, message: "No emails found matching criteria" }
      });
      
      return 0;
    }
    
    console.log(`Found ${emails.length} emails for user ${userId}, storing in database`);
    
    // Store fetched emails
    const storedCount = await storeEmails(userId, emails);
    
    // Log successful sync
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Sync Emails",
      status: "Completed",
      timestamp: new Date(),
      details: { 
        userId, 
        unreadOnly, 
        folder, 
        found: emails.length, 
        stored: storedCount
      }
    });
    
    return storedCount;
  } catch (error) {
    console.error(`Error syncing emails for user ${userId}:`, error);
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Sync Emails",
      status: "Failed",
      timestamp: new Date(),
      details: { userId, error: (error as Error).message }
    });
    return 0;
  }
}

/**
 * Verify IMAP connection
 */
export async function verifyImapConnection(userId: number): Promise<boolean> {
  try {
    const imapClient = await initImapClient(userId);
    
    if (!imapClient) {
      return false;
    }
    
    return new Promise((resolve) => {
      imapClient.once('ready', () => {
        imapClient.end();
        resolve(true);
      });
      
      imapClient.once('error', (err: Error) => {
        resolve(false);
      });
      
      imapClient.connect();
    });
  } catch (error) {
    console.error(`Error verifying IMAP connection for user ${userId}:`, error);
    return false;
  }
}