/**
 * Email service initialization module
 * This module initializes the email scheduler for automatic email sync and reply
 */

import { initEmailScheduler } from './lib/email-scheduler';

// Initialize the email service
export function initializeEmailService() {
  console.log('Initializing email service...');
  
  // Start the email scheduler
  initEmailScheduler();
}