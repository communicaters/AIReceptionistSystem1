import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';
import { pool } from '../db';
import { createChatCompletion, classifyIntent } from './openai';
import { validateWebSocketMessage, safeParse, safeStringify } from './ws-validator';
import { messageDeduplicator } from './message-filter';
import { createEvent } from './google-calendar';

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
    
    // Extract sessionId from URL query if it exists, otherwise generate a new one
    let sessionId: string;
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      sessionId = url.searchParams.get('sessionId') || `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    } catch (error) {
      // If there's an error parsing the URL, generate a new session ID
      sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }
    
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
  let messageData: any;
  
  // If data is a string, try to parse it
  if (typeof data === 'string') {
    try {
      messageData = JSON.parse(data);
    } catch (e) {
      // If it's not valid JSON, use it as is
      messageData = { type: 'notification', message: data };
    }
  } else {
    messageData = data;
  }
  
  // Add timestamp if not already present
  if (!messageData.timestamp) {
    messageData.timestamp = new Date().toISOString();
  }
  
  console.log(`Broadcasting message to ${connectedClients.size} clients:`, JSON.stringify(messageData).substring(0, 200));
  
  connectedClients.forEach(({ ws }, clientId) => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        // Use safeStringify to ensure we never throw JSON stringify errors
        ws.send(typeof messageData === 'string' ? messageData : safeStringify(messageData));
        successCount++;
        
        // Log success at debug level
        if (messageData.type) {
          console.log(`Sent ${messageData.type} message to client ${clientId.substring(0, 8)}...`);
        }
      } else {
        console.warn(`Cannot send to client ${clientId}: WebSocket not OPEN (state: ${ws.readyState})`);
      }
    } catch (error) {
      console.error(`Error broadcasting to client ${clientId}:`, error);
    }
  });
  
  // Return the number of successful sends
  console.log(`Successfully broadcast message to ${successCount}/${connectedClients.size} clients`);
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
  // Include schedule_meeting to detect calendar-related requests
  const possibleIntents = ["inquiry", "complaint", "support", "order", "general", "schedule_meeting"];
  const intentResult = await classifyIntent(message, possibleIntents);
  
  // Get chat history for context
  const chatHistory = await storage.getChatLogsBySessionId(sessionId);
  const context = chatHistory
    .slice(-5) // Get the last 5 messages for context
    .map(log => log.message);
  
  let aiResponse = "";
  
  // Check if this is a meeting scheduling intent
  if (intentResult.intent === "schedule_meeting" && intentResult.confidence > 0.7) {
    try {
      // Try to handle scheduling request
      const schedulingResult = await handleMeetingScheduling(message, userId, sessionId);
      
      if (schedulingResult.success) {
        aiResponse = schedulingResult.response;
        
        // Inform the client that a meeting was scheduled
        sendToClient(ws, {
          type: 'meeting_scheduled',
          message: schedulingResult.meetingDetails,
          timestamp: new Date().toISOString()
        });
      } else {
        // If scheduling failed, fall back to regular chat
        aiResponse = schedulingResult.response;
      }
    } catch (error) {
      console.error("Error handling meeting scheduling:", error);
      // Fall back to regular chat if scheduling fails
      aiResponse = "I'm having trouble with the calendar system right now. Can you please provide more details about when you'd like to schedule a meeting?";
    }
  } else {
    // Process regular chat message
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
    aiResponse = response.success ? response.content : "I'm sorry, I'm having trouble processing your request at the moment.";
  }
  
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

/**
 * Handle meeting scheduling requests through chat
 */
async function handleMeetingScheduling(message: string, userId: number, sessionId: string): Promise<{
  success: boolean,
  response: string,
  meetingDetails?: any
}> {
  try {
    // Check if calendar is configured first
    const calendarConfig = await storage.getCalendarConfigByUserId(userId);
    if (!calendarConfig) {
      return {
        success: false,
        response: "I'm sorry, the calendar system isn't configured yet. Please contact support to set up your calendar."
      };
    }
    
    // Use AI to extract meeting details from user message
    const extractionPrompt = `
      Extract meeting details from the following message. If any information is missing or unclear, indicate that it's unknown.
      Return a JSON object with: 
      - subject (string, the purpose or title of the meeting)
      - date (YYYY-MM-DD format, or "unknown" if not specified)
      - time (HH:MM format in 24-hour time, or "unknown" if not specified)
      - duration (in minutes, default to 30 if not specified)
      - attendees (array of email addresses, or empty array if none specified)
      - description (string, additional notes or empty string if none)
      
      Message: ${message}
    `;
    
    const extractionResponse = await createChatCompletion([
      { role: "system", content: "You are an AI assistant that extracts structured meeting data from text." },
      { role: "user", content: extractionPrompt }
    ]);
    
    if (!extractionResponse.success) {
      return {
        success: false,
        response: "I couldn't understand the meeting details. Could you please provide more specific information about when you'd like to schedule the meeting?"
      };
    }
    
    let meetingData;
    try {
      // Parse the extracted JSON
      meetingData = JSON.parse(extractionResponse.content);
    } catch (error) {
      console.error("Error parsing meeting data:", error);
      return {
        success: false,
        response: "I couldn't process the meeting details correctly. Please specify the date, time, and subject for your meeting."
      };
    }
    
    // Validate the extracted data
    if (!meetingData.subject || meetingData.subject === "unknown") {
      return {
        success: false,
        response: "What would you like the subject of the meeting to be?"
      };
    }
    
    if (meetingData.date === "unknown" || meetingData.time === "unknown") {
      return {
        success: false,
        response: "I need to know when you want to schedule this meeting. Could you please provide a specific date and time?"
      };
    }
    
    // Calculate start and end times
    const startTime = new Date(`${meetingData.date}T${meetingData.time}:00`);
    if (isNaN(startTime.getTime())) {
      return {
        success: false,
        response: "I couldn't understand the date and time format. Please provide the date as YYYY-MM-DD and time as HH:MM."
      };
    }
    
    const duration = meetingData.duration || 30;
    const endTime = new Date(startTime.getTime() + duration * 60000);
    
    // Check if the time slot is available
    const formattedDate = meetingData.date; // Already in YYYY-MM-DD format
    
    // Enhanced query to check for overlapping meetings
    // This handles all possible overlap scenarios and accounts for time zone differences
    const checkQuery = `
      SELECT COUNT(*) as count FROM meeting_logs 
      WHERE user_id = $1 
      AND (
        -- Check if the meeting overlaps with any existing meeting
        -- This is a more robust check that handles all edge cases:
        -- 1. New meeting starts during an existing meeting
        -- 2. New meeting ends during an existing meeting
        -- 3. New meeting contains an existing meeting
        -- 4. New meeting is exactly the same time as an existing meeting
        -- Using OVERLAPS operator for PostgreSQL which handles all these cases
        ($3::timestamp, $4::timestamp) OVERLAPS (start_time, end_time)
      )
    `;
    
    const { rows } = await pool.query(checkQuery, [
      userId, 
      startTime.toISOString(),
      endTime.toISOString()
    ]);
    
    console.log(`Checking for meetings that overlap with ${startTime.toISOString()} to ${endTime.toISOString()}`);
    const isSlotTaken = parseInt(rows[0].count) > 0;
    console.log(`Time slot availability check: ${isSlotTaken ? 'Slot is taken' : 'Slot is available'}`);
    
    if (isSlotTaken) {
      return {
        success: false,
        response: `I'm sorry, the time slot at ${meetingData.time} on ${meetingData.date} is already booked. Would you like to choose a different time?`
      };
    }
    
    // Create the meeting
    const meeting = {
      userId,
      subject: meetingData.subject,
      description: meetingData.description || `Meeting scheduled via chat (Session ${sessionId})`,
      startTime: startTime,
      endTime: endTime,
      attendees: meetingData.attendees || [],
      status: "scheduled",
      googleEventId: null
    };
    
    // Save meeting to database
    const savedMeeting = await storage.createMeetingLog(meeting);
    
    // Try to create in Google Calendar if connected
    let googleEventCreated = false;
    if (calendarConfig.googleRefreshToken) {
      try {
        // Format event for Google Calendar API
        const event = {
          summary: meeting.subject,
          description: meeting.description || '',
          start: { 
            dateTime: startTime.toISOString() 
          },
          end: { 
            dateTime: endTime.toISOString() 
          },
          attendees: meeting.attendees.map((email: string) => ({ email }))
        };
        
        // Create event in Google Calendar
        const googleEvent = await createEvent(userId, event);
        
        // Update meeting with Google Calendar event ID
        await storage.updateMeetingLog(savedMeeting.id, {
          googleEventId: googleEvent.id
        });
        
        googleEventCreated = true;
      } catch (error) {
        console.error("Error creating Google Calendar event:", error);
        // Continue with local meeting since we already created it in the database
      }
    }
    
    // Log system activity
    await storage.createSystemActivity({
      module: "Calendar",
      event: "MeetingCreatedViaChat",
      status: "success",
      timestamp: new Date(),
      details: { 
        meetingId: savedMeeting.id, 
        subject: meeting.subject,
        chatSessionId: sessionId
      }
    });
    
    // Format meeting details for display
    const timeString = new Intl.DateTimeFormat('en', { 
      hour: 'numeric', 
      minute: 'numeric',
      hour12: true
    }).format(startTime);
    
    const dateString = new Intl.DateTimeFormat('en', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    }).format(startTime);
    
    // Success response with details about the meeting
    return {
      success: true,
      response: `Great! I've scheduled a meeting for "${meeting.subject}" on ${dateString} at ${timeString}. ${googleEventCreated ? 'It has been added to your Google Calendar.' : ''}`,
      meetingDetails: {
        id: savedMeeting.id,
        subject: meeting.subject,
        date: dateString,
        time: timeString,
        duration: duration,
        attendees: meeting.attendees
      }
    };
  } catch (error) {
    console.error("Error in meeting scheduling handler:", error);
    return {
      success: false,
      response: "I encountered an error while trying to schedule your meeting. Please try again with specific date and time information."
    };
  }
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
