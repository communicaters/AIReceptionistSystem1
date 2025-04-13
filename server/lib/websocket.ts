import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';
import { generateResponse, identifyIntent } from './openai';

// Store connected clients
const connectedClients: Map<string, {
  ws: WebSocket;
  userId: number;
  sessionId: string;
}> = new Map();

// Setup WebSocket server handlers
export function setupWebsocketHandlers(wss: WebSocketServer) {
  wss.on('connection', (ws) => {
    // Generate a session ID for this connection
    const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const userId = 1; // For demo purposes
    
    // Store the client connection
    const clientId = Date.now().toString();
    connectedClients.set(clientId, { ws, userId, sessionId });
    
    console.log(`WebSocket client connected: ${clientId}, Session: ${sessionId}`);
    
    // Send welcome message
    sendToClient(ws, {
      type: 'welcome',
      message: 'Connected to AI Receptionist',
      sessionId
    });
    
    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        if (data.type === 'chat') {
          await handleChatMessage(clientId, data.message);
        } else if (data.type === 'status') {
          await handleStatusUpdate(clientId, data.moduleId, data.status);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        sendToClient(ws, {
          type: 'error',
          message: 'Invalid message format'
        });
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      connectedClients.delete(clientId);
    });
  });

  console.log('WebSocket server initialized');
}

// Send message to specific client
function sendToClient(ws: WebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// Broadcast message to all connected clients
export function broadcastMessage(data: any) {
  connectedClients.forEach(({ ws }) => {
    sendToClient(ws, data);
  });
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
  
  // Identify the intent of the message
  const intentResult = await identifyIntent(message);
  
  // Get chat history for context
  const chatHistory = await storage.getChatLogsBySessionId(sessionId);
  const context = chatHistory
    .slice(-5) // Get the last 5 messages for context
    .map(log => log.message);
  
  // Generate AI response
  const aiResponse = await generateResponse(message, context);
  
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
