/**
 * Message filtering utilities for WebSocket communication
 * Used to prevent duplicate or malformed messages
 */

// Define WebSocketMessage type to mirror the one in client
export interface WebSocketMessage {
  type: string;
  message?: string;
  sessionId?: string;
  moduleId?: string;
  status?: string;
  timestamp?: string;
  details?: any;
  [key: string]: any;
}

/**
 * Class for tracking and filtering duplicate messages
 */
export class MessageDeduplicator {
  private messageHistory: Map<string, number> = new Map();
  private maxHistorySize: number;
  private messageTimeout: number;
  
  /**
   * Creates a new MessageDeduplicator
   * @param maxHistorySize Maximum number of message hashes to store
   * @param messageTimeout Time in ms after which a message is considered a new message even if the content is the same
   */
  constructor(maxHistorySize: number = 1000, messageTimeout: number = 5000) {
    this.maxHistorySize = maxHistorySize;
    this.messageTimeout = messageTimeout;
    
    // Periodically clean up old messages
    setInterval(() => this.cleanupOldMessages(), 30000);
  }
  
  /**
   * Check if a message is a duplicate
   * @param message The message to check
   * @returns True if the message is a duplicate, false otherwise
   */
  public isDuplicate(message: WebSocketMessage): boolean {
    const hash = this.hashMessage(message);
    const now = Date.now();
    
    // Check if this message hash exists and is recent
    const lastSeen = this.messageHistory.get(hash);
    if (lastSeen && now - lastSeen < this.messageTimeout) {
      // Update the timestamp for this message
      this.messageHistory.set(hash, now);
      return true;
    }
    
    // If the map is too large, remove the oldest entry
    if (this.messageHistory.size >= this.maxHistorySize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.messageHistory.delete(oldestKey);
      }
    }
    
    // Add this message to the history
    this.messageHistory.set(hash, now);
    return false;
  }
  
  /**
   * Generate a simple hash for a message
   * @param message The message to hash
   * @returns A string hash of the message
   */
  private hashMessage(message: WebSocketMessage): string {
    // Create a simplified object for hashing
    const hashObj = {
      type: message.type,
      sessionId: message.sessionId || null,
      moduleId: message.moduleId || null,
      message: message.message?.substring(0, 100) || null, // Limit long messages
      status: message.status || null
    };
    
    // Simple JSON-based hashing - sufficient for deduplication
    return JSON.stringify(hashObj);
  }
  
  /**
   * Find the oldest key in the message history
   * @returns The oldest key or null if the map is empty
   */
  private findOldestKey(): string | null {
    if (this.messageHistory.size === 0) return null;
    
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    // Convert to an array of keys first
    const keys = Object.keys(Object.fromEntries(this.messageHistory));
    
    // Iterate through keys
    for (const key of keys) {
      const time = this.messageHistory.get(key) || 0;
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  /**
   * Clean up old messages from the history
   */
  private cleanupOldMessages(): void {
    const now = Date.now();
    
    // Convert to an array of keys first
    const keys = Object.keys(Object.fromEntries(this.messageHistory));
    
    // Iterate through keys
    for (const key of keys) {
      const time = this.messageHistory.get(key) || 0;
      if (now - time > this.messageTimeout * 2) {
        this.messageHistory.delete(key);
      }
    }
  }
  
  /**
   * Clear the message history
   */
  public clear(): void {
    this.messageHistory.clear();
  }
}

// Create a singleton instance
export const messageDeduplicator = new MessageDeduplicator();