import { WebSocketMessage } from "../../client/src/lib/websocket";

/**
 * Validates incoming WebSocket message data
 * @param data The data to validate
 * @returns Object with isValid flag and sanitized data or error message
 */
export function validateWebSocketMessage(data: any): {
  isValid: boolean;
  data?: WebSocketMessage;
  error?: string;
} {
  try {
    // Basic structure validation
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        error: 'Invalid message format: data must be an object'
      };
    }

    // Type validation
    if (!data.type || typeof data.type !== 'string') {
      return {
        isValid: false,
        error: 'Invalid message format: type is required and must be a string'
      };
    }

    // Validate based on message type
    const validTypes = ['chat', 'status', 'ping', 'pong', 'welcome', 'error', 'moduleStatus'];
    if (!validTypes.includes(data.type)) {
      return {
        isValid: false,
        error: `Invalid message type: ${data.type}`
      };
    }

    // Specific validation for each message type
    switch (data.type) {
      case 'chat':
        if (!data.message || typeof data.message !== 'string') {
          return {
            isValid: false,
            error: 'Chat messages require a message property of type string'
          };
        }
        break;
      case 'status':
        if (!data.moduleId || typeof data.moduleId !== 'string') {
          return {
            isValid: false,
            error: 'Status updates require a moduleId property of type string'
          };
        }
        if (!data.status || typeof data.status !== 'string') {
          return {
            isValid: false,
            error: 'Status updates require a status property of type string'
          };
        }
        break;
    }

    // Sanitize the data by only including known properties
    const sanitizedData: WebSocketMessage = {
      type: data.type as any,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    // Add type-specific properties
    if (data.message) sanitizedData.message = String(data.message);
    if (data.sessionId) sanitizedData.sessionId = String(data.sessionId);
    if (data.moduleId) sanitizedData.moduleId = String(data.moduleId);
    if (data.status) sanitizedData.status = String(data.status);
    
    // Return validated and sanitized data
    return {
      isValid: true,
      data: sanitizedData
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Safely stringifies data for WebSocket transmission
 * @param data The data to stringify
 * @returns Safe JSON string
 */
export function safeStringify(data: any): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    // If JSON stringify fails, return a simple error message
    return JSON.stringify({
      type: 'error',
      message: 'Failed to serialize data',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Safely parses incoming WebSocket string data
 * @param data The string data to parse
 * @returns Parsed object or null on error
 */
export function safeParse(data: string): any {
  try {
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}