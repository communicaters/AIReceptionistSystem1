/**
 * WebSocket message validation
 * Ensures messages follow the correct schema and sanitizes input
 */

// Define allowed message types
const ALLOWED_MESSAGE_TYPES = [
  'chat',      // Chat messages
  'status',    // Module status updates
  'ping',      // Explicit ping message
  'pong',      // Explicit pong response
  'welcome',   // Welcome message when a new client connects
  'error',     // Error messages
  'moduleStatus', // Status broadcast message
  'notification', // User notification
  'reconnect'     // Reconnection request
];

// Define allowed module IDs
const ALLOWED_MODULE_IDS = [
  'Voice Call Handling',
  'Email Management',
  'Live Chat',
  'WhatsApp Integration',
  'Calendar',
  'Speech Engine',
  'AI Training',
  'System'
];

// Define allowed status values
const ALLOWED_STATUS_VALUES = [
  'online',
  'offline',
  'error',
  'pending',
  'processing',
  'completed',
  'limited' // When some functionality is limited (missing API keys)
];

// Result of message validation
interface ValidationResult {
  isValid: boolean;
  error?: string;
  data?: any;
}

/**
 * Parse JSON safely without throwing
 * @param jsonString String to parse as JSON
 * @returns Parsed object or null if invalid
 */
export function safeParse(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return null;
  }
}

/**
 * Stringify JSON safely without throwing
 * @param data Object to stringify
 * @returns JSON string or empty object string if error
 */
export function safeStringify(data: any): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    return '{}';
  }
}

/**
 * Validate the WebSocket message format and content
 * @param message Message object to validate
 * @returns Validation result with sanitized data if valid
 */
export function validateWebSocketMessage(message: any): ValidationResult {
  // Check if message is an object
  if (!message || typeof message !== 'object') {
    return {
      isValid: false,
      error: 'Message must be an object'
    };
  }

  // Check if message has a type
  if (!message.type || typeof message.type !== 'string') {
    return {
      isValid: false,
      error: 'Message must have a type property'
    };
  }

  // Check if message type is allowed
  if (!ALLOWED_MESSAGE_TYPES.includes(message.type)) {
    return {
      isValid: false,
      error: `Message type '${message.type}' is not allowed`
    };
  }

  // Create sanitized message object
  const sanitizedMessage: any = {
    type: message.type
  };

  // Add timestamp if not present
  if (!message.timestamp) {
    sanitizedMessage.timestamp = new Date().toISOString();
  } else {
    sanitizedMessage.timestamp = message.timestamp;
  }

  // Validate message based on type
  switch (message.type) {
    case 'chat':
      // Validate chat message
      if (!message.message || typeof message.message !== 'string') {
        return {
          isValid: false,
          error: 'Chat message must have a message property'
        };
      }
      
      // Sanitize and limit message length
      sanitizedMessage.message = message.message.slice(0, 2000); // Limit message length
      
      // Add session ID if present
      if (message.sessionId) {
        sanitizedMessage.sessionId = message.sessionId;
      }
      break;
    
    case 'status':
      // Validate status update
      if (!message.moduleId || typeof message.moduleId !== 'string') {
        return {
          isValid: false,
          error: 'Status update must have a moduleId property'
        };
      }
      
      if (!message.status || typeof message.status !== 'string') {
        return {
          isValid: false,
          error: 'Status update must have a status property'
        };
      }
      
      // Validate allowed module IDs and status values
      if (!ALLOWED_MODULE_IDS.includes(message.moduleId)) {
        return {
          isValid: false,
          error: `Module ID '${message.moduleId}' is not allowed`
        };
      }
      
      if (!ALLOWED_STATUS_VALUES.includes(message.status)) {
        return {
          isValid: false,
          error: `Status value '${message.status}' is not allowed`
        };
      }
      
      sanitizedMessage.moduleId = message.moduleId;
      sanitizedMessage.status = message.status;
      break;
    
    case 'ping':
    case 'pong':
      // No additional validation needed for ping/pong messages
      break;
    
    case 'error':
      // Allow error messages to include details
      if (message.message) {
        sanitizedMessage.message = message.message.slice(0, 1000); // Limit error message length
      }
      
      if (message.details) {
        // Stringify and re-parse to prevent injection
        sanitizedMessage.details = safeParse(safeStringify(message.details));
      }
      break;
    
    case 'moduleStatus':
      // Validate module status broadcast
      if (!message.moduleId || typeof message.moduleId !== 'string') {
        return {
          isValid: false,
          error: 'Module status broadcast must have a moduleId property'
        };
      }
      
      if (!message.status || typeof message.status !== 'string') {
        return {
          isValid: false,
          error: 'Module status broadcast must have a status property'
        };
      }
      
      sanitizedMessage.moduleId = message.moduleId;
      sanitizedMessage.status = message.status;
      break;
    
    case 'notification':
      // Validate notification message
      if (!message.message || typeof message.message !== 'string') {
        return {
          isValid: false,
          error: 'Notification must have a message property'
        };
      }
      
      sanitizedMessage.message = message.message.slice(0, 500); // Limit notification length
      
      if (message.level && typeof message.level === 'string') {
        sanitizedMessage.level = ['info', 'warning', 'error', 'success'].includes(message.level) 
          ? message.level 
          : 'info'; // Default to info if invalid level
      } else {
        sanitizedMessage.level = 'info'; // Default level
      }
      break;
      
    case 'welcome':
      // Validate welcome message
      if (message.message) {
        sanitizedMessage.message = message.message.slice(0, 500);
      }
      
      if (message.sessionId) {
        sanitizedMessage.sessionId = message.sessionId;
      }
      break;
      
    case 'reconnect':
      // No additional validation needed for reconnect messages
      break;
      
    default:
      // Should never reach here due to allowed types check above
      return {
        isValid: false,
        error: 'Unknown message type'
      };
  }

  // Add any other common fields that are valid
  if (message.sessionId) {
    sanitizedMessage.sessionId = message.sessionId;
  }

  return {
    isValid: true,
    data: sanitizedMessage
  };
}