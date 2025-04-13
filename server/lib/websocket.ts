import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';
import { createChatCompletion, classifyIntent } from './openai';
import { validateWebSocketMessage, safeParse, safeStringify } from './ws-validator';
import { messageDeduplicator } from './message-filter';

// Store connected clients
const connectedClients: Map<string, {
  ws: WebSocket;
  userId: number;
  sessionId: string;
  lastPing: number; // Track last ping time
}> = new Map();

// Heart beat interval (15 seconds)
const HEARTBEAT_INTERVAL = 15000;
// Timeout for client connection (45 seconds - 3x the heartbeat)
const CLIENT_TIMEOUT = HEARTBEAT_INTERVAL * 3;

// Setup WebSocket server handlers
export function setupWebsocketHandlers(wss: WebSocketServer) {
  // Heartbeat check interval
  setInterval(() => {
    const now = Date.now();
    
    // Check each client's last ping time
    connectedClients.forEach((client, clientId) => {
      // If client hasn't sent a ping in the timeout period, terminate connection
      if (now - client.lastPing > CLIENT_TIMEOUT) {
        console.log(`Client ${clientId} timed out (no ping for ${CLIENT_TIMEOUT}ms). Terminating connection.`);
        
        try {
          client.ws.terminate();
          connectedClients.delete(clientId);
        } catch (err) {
          console.error(`Error terminating client connection:`, err);
        }
      }
    });
  }, HEARTBEAT_INTERVAL);

  // Handle connection errors at the server level
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  wss.on('connection', (ws, req) => {
    // Track client IP for better logging
    const ip = req.socket.remoteAddress || 'unknown';
    
    // Generate a session ID for this connection
    const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const userId = 1; // For demo purposes
    
    // Store the client connection
    const clientId = Date.now().toString();
    connectedClients.set(clientId, { 
      ws, 
      userId, 
      sessionId, 
      lastPing: Date.now() // Initialize last ping time
    });
    
    console.log(`WebSocket client connected: ${clientId}, Session: ${sessionId}, IP: ${ip}`);
    
    // Send welcome message
    sendToClient(ws, {
      type: 'welcome',
      message: 'Connected to AI Receptionist',
      sessionId
    });
    
    // Handle pings to keep connection alive
    ws.on('ping', () => {
      const client = connectedClients.get(clientId);
      if (client) {
        client.lastPing = Date.now();
        connectedClients.set(clientId, client);
      }
      
      // Respond with pong
      ws.pong();
    });
    
    // Handle pongs (responses to our pings)
    ws.on('pong', () => {
      const client = connectedClients.get(clientId);
      if (client) {
        client.lastPing = Date.now();
        connectedClients.set(clientId, client);
      }
    });
    
    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        // Update the client's last ping time
        const client = connectedClients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
          connectedClients.set(clientId, client);
        }
        
        // Parse and validate the message
        const parsedData = safeParse(message.toString());
        if (!parsedData) {
          return sendToClient(ws, {
            type: 'error',
            message: 'Invalid JSON message format',
            timestamp: new Date().toISOString()
          });
        }
        
        // Validate the message structure and content
        const validationResult = validateWebSocketMessage(parsedData);
        if (!validationResult.isValid || !validationResult.data) {
          return sendToClient(ws, {
            type: 'error',
            message: validationResult.error || 'Invalid message format',
            timestamp: new Date().toISOString()
          });
        }
        
        const data = validationResult.data;
        
        // Check for duplicate messages to prevent processing the same message multiple times
        // Skip deduplication for ping/pong messages as they are expected to be duplicate
        if (data.type !== 'ping' && data.type !== 'pong' && messageDeduplicator.isDuplicate(data)) {
          console.log(`Duplicate message filtered: ${data.type} from ${clientId}`);
          return; // Silently ignore duplicate messages
        }
        
        // Handle different message types
        if (data.type === 'chat' && data.message) {
          await handleChatMessage(clientId, data.message);
        } else if (data.type === 'status' && data.moduleId && data.status) {
          await handleStatusUpdate(clientId, data.moduleId, data.status);
        } else if (data.type === 'ping') {
          // Handle explicit ping messages from client
          sendToClient(ws, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Error handling WebSocket message from ${clientId}:`, error);
        sendToClient(ws, {
          type: 'error',
          message: 'Failed to process message',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Log system activity for errors
        try {
          storage.createSystemActivity({
            module: 'WebSocket',
            event: 'Message Processing Error',
            status: 'Error',
            timestamp: new Date(),
            details: { 
              clientId, 
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }).catch(err => console.error('Failed to log WebSocket error activity:', err));
        } catch (err) {
          console.error('Failed to create system activity for WebSocket error:', err);
        }
      }
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
      console.error(`WebSocket client ${clientId} error:`, error);
      
      // Create system activity for error
      try {
        storage.createSystemActivity({
          module: 'WebSocket',
          event: 'Connection Error',
          status: 'Error',
          timestamp: new Date(),
          details: { clientId, sessionId, error: error.message || 'Unknown error' }
        }).catch(err => console.error('Failed to log WebSocket error activity:', err));
      } catch (err) {
        console.error('Failed to create system activity for WebSocket error:', err);
      }
    });
    
    // Handle client disconnect
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected: ${clientId}, Code: ${code}, Reason: ${reason}`);
      connectedClients.delete(clientId);
      
      // Create system activity for disconnect
      try {
        storage.createSystemActivity({
          module: 'WebSocket',
          event: 'Client Disconnected',
          status: 'Info',
          timestamp: new Date(),
          details: { clientId, sessionId, code, reason: reason.toString() }
        }).catch(err => console.error('Failed to log WebSocket disconnect activity:', err));
      } catch (err) {
        console.error('Failed to create system activity for WebSocket disconnect:', err);
      }
    });
    
    // Set up ping interval for this specific client
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (error) {
          console.error(`Error sending ping to client ${clientId}:`, error);
          clearInterval(pingInterval);
        }
      } else {
        clearInterval(pingInterval);
      }
    }, HEARTBEAT_INTERVAL);
    
    // Clear ping interval when client disconnects
    ws.on('close', () => clearInterval(pingInterval));
  });

  console.log('WebSocket server initialized with heartbeat monitoring');
}

// Send message to specific client
function sendToClient(ws: WebSocket, data: any): boolean {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      // Use safeStringify to ensure we never throw JSON stringify errors
      ws.send(safeStringify(data));
      return true;
    } else {
      console.warn(`Cannot send message: WebSocket is not in OPEN state. Current state: ${ws.readyState}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending message to client:', error);
    return false;
  }
}

// Broadcast message to all connected clients
export function broadcastMessage(data: any): number {
  let successCount = 0;
  
  connectedClients.forEach(({ ws }, clientId) => {
    try {
      if (sendToClient(ws, data)) {
        successCount++;
      }
    } catch (error) {
      console.error(`Error broadcasting to client ${clientId}:`, error);
    }
  });
  
  // Return the number of successful sends
  return successCount;
}

// Handle chat messages
async function handleChatMessage(clientId: string, message: string) {
  const client = connectedClients.get(clientId);
  if (!client) return;
  
  const { ws, userId, sessionId } = client;
  
  // Log the incoming message
  await storage.createChatLog({
    userId,
    sessionId,
    message,
    sender: 'user',
    timestamp: new Date()
  });
  
  // Identify the intent of the message using our AI
  const possibleIntents = ["inquiry", "complaint", "support", "order", "general"];
  const intentResult = await classifyIntent(message, possibleIntents);
  
  // Get chat history for context
  const chatHistory = await storage.getChatLogsBySessionId(sessionId);
  const context = chatHistory
    .slice(-5) // Get the last 5 messages for context
    .map(log => log.message);
  
  // Create a messages array with system instruction, context, and user message
  const messages = [
    { 
      role: "system", 
      content: "You are an AI Receptionist responding to a chat message. Use context from previous messages when available. Be helpful, concise, and professional."
    }
  ];
  
  // Add context messages
  if (context.length > 0) {
    messages.push({ 
      role: "system", 
      content: `Previous conversation context: ${context.join(' | ')}`
    });
  }
  
  // Add the current user message
  messages.push({
    role: "user",
    content: message
  });
  
  // Generate AI response using chat completion
  const response = await createChatCompletion(messages);
  const aiResponse = response.success ? response.content : "I'm sorry, I'm having trouble processing your request at the moment.";
  
  // Log the AI response
  await storage.createChatLog({
    userId,
    sessionId,
    message: aiResponse,
    sender: 'ai',
    timestamp: new Date()
  });
  
  // Send response back to client
  sendToClient(ws, {
    type: 'chat',
    message: aiResponse,
    timestamp: new Date().toISOString()
  });
  
  // Create system activity record
  await storage.createSystemActivity({
    module: 'Live Chat',
    event: 'Chat Message Processed',
    status: 'Completed',
    timestamp: new Date(),
    details: { sessionId, intent: intentResult.intent }
  });
}

// Handle module status updates
async function handleStatusUpdate(clientId: string, moduleId: string, status: string) {
  const client = connectedClients.get(clientId);
  if (!client) return;
  
  // Update module status in storage
  const moduleStatus = await storage.getModuleStatusByName(moduleId);
  if (moduleStatus) {
    await storage.updateModuleStatus(moduleStatus.id, {
      status,
      lastChecked: new Date()
    });
    
    // Broadcast the status change to all clients
    broadcastMessage({
      type: 'moduleStatus',
      moduleId,
      status,
      timestamp: new Date().toISOString()
    });
    
    // Create system activity record
    await storage.createSystemActivity({
      module: 'System',
      event: `Module "${moduleId}" Status Changed`,
      status: 'Completed',
      timestamp: new Date(),
      details: { moduleId, newStatus: status }
    });
  }
}
