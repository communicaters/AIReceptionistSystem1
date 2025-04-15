import IMAP from 'imap';
import { simpleParser } from 'mailparser';
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
    
    // Determine IMAP settings from SMTP settings
    // Most email providers use the same host with different ports
    // Common IMAP ports: 993 (SSL/TLS), 143 (STARTTLS)
    const host = smtpConfig.host.replace('smtp.', 'imap.'); // Common convention
    
    // Create IMAP client
    const imapClient = new IMAP({
      user: smtpConfig.username,
      password: smtpConfig.password,
      host: host,
      port: 993, // Default IMAP SSL port
      tls: true,
      tlsOptions: { rejectUnauthorized: false } // For development only
    });
    
    // Log initialization
    await storage.createSystemActivity({
      module: "Email",
      event: "IMAP Client Initialized",
      status: "Completed",
      timestamp: new Date(),
      details: { userId, host }
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
export async function fetchEmails(userId: number, folder: string = 'INBOX', limit: number = 20): Promise<EmailMessage[]> {
  try {
    const imapClient = await initImapClient(userId);
    
    if (!imapClient) {
      throw new Error('IMAP client not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const emails: EmailMessage[] = [];
      
      imapClient.once('ready', () => {
        imapClient.openBox(folder, false, (err, box) => {
          if (err) {
            imapClient.end();
            return reject(err);
          }
          
          // Search for all emails, limit results
          // Use 'UNSEEN' instead of 'ALL' to only get unread messages
          imapClient.search(['ALL'], (err, results) => {
            if (err) {
              imapClient.end();
              return reject(err);
            }
            
            if (!results.length) {
              imapClient.end();
              return resolve([]);
            }
            
            // Limit the number of emails to fetch
            const emailsToFetch = results.slice(-limit);
            
            const fetch = imapClient.fetch(emailsToFetch, {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT', ''],
              struct: true
            });
            
            fetch.on('message', (msg) => {
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
                      email.from = parsed.from?.text || '';
                      email.to = parsed.to?.text || '';
                      email.subject = parsed.subject || '';
                      email.body = parsed.text || '';
                      email.html = parsed.html || undefined;
                      email.timestamp = parsed.date || new Date();
                      email.messageId = parsed.messageId || '';
                    }).catch(err => {
                      console.error('Error parsing email:', err);
                    });
                  });
                }
              });
              
              msg.once('end', () => {
                if (email.from && email.subject) {
                  emails.push(email as EmailMessage);
                }
              });
            });
            
            fetch.once('error', (err) => {
              reject(err);
            });
            
            fetch.once('end', () => {
              imapClient.end();
              resolve(emails);
            });
          });
        });
      });
      
      imapClient.once('error', (err) => {
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
      details: { userId, error: (error as Error).message }
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
    
    for (const email of emails) {
      // Check if this email already exists in the database
      // This assumes you have a method to look up emails by messageId
      // If you don't have this, you can use a combination of from, subject, and timestamp
      
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
    }
    
    if (storedCount > 0) {
      await storage.createSystemActivity({
        module: "Email",
        event: "IMAP Emails Stored",
        status: "Completed",
        timestamp: new Date(),
        details: { userId, count: storedCount }
      });
    }
    
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
export async function syncEmails(userId: number): Promise<number> {
  try {
    // Fetch emails
    const emails = await fetchEmails(userId);
    
    // Store fetched emails
    const storedCount = await storeEmails(userId, emails);
    
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
      
      imapClient.once('error', () => {
        resolve(false);
      });
      
      imapClient.connect();
    });
  } catch (error) {
    console.error(`Error verifying IMAP connection for user ${userId}:`, error);
    return false;
  }
}