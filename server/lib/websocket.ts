/**
 * WebSocket Server Implementation
 * 
 * Handles WebSocket connections for real-time communications including:
 * - Chat sessions
 * - Module status updates
 * - User information collection
 * - Meeting scheduling requests
 */

import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../database-storage';
import { createChatCompletion, classifyIntent } from './openai';
import { UserProfileManager } from './user-profile-manager';
import { getUserProfileAssistant } from './user-profile-assistant';
import { createEvent } from './google-calendar';
import { pool } from '../db';

// Global state to track all connected clients
const connectedClients: Map<string, {
  ws: WebSocket;
  userId: number;
  sessionId: string;
  lastPing: number;
  profileId?: number;
}> = new Map();

// Create a user profile manager instance
const userProfileManager = new UserProfileManager();

/**
 * Setup WebSocket server and initialize event handlers
 */
export function setupWebsocketHandlers(wss: WebSocketServer) {
  console.log('Setting up WebSocket handlers...');
  
  // Handle new connection
  wss.on('connection', (ws, request) => {
    // Extract URL parameters
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const userId = parseInt(url.searchParams.get('userId') || '1', 10);
    const sessionId = url.searchParams.get('sessionId') || generateSessionId();
    const clientId = `${userId}-${sessionId}`;
    
    console.log(`WebSocket client connected - Session: ${sessionId}, IP: ${request.socket.remoteAddress}, User: ${userId}`);
    
    // Store client connection information
    connectedClients.set(clientId, {
      ws,
      userId,
      sessionId,
      lastPing: Date.now()
    });
    
    // Create initial system activity record
    storage.createSystemActivity({
      module: 'WebSocket',
      event: 'Client Connected',
      status: 'Active',
      timestamp: new Date(),
      details: { sessionId, userId, clientId }
    }).catch(error => console.error('Error recording client connection:', error));
    
    // Send welcome message
    sendToClient(ws, {
      type: 'welcome',
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      config: {
        requireUserInfo: true,
        showCompanyDetails: true
      }
    });
    
    // Broadcast active users count
    broadcastActiveSessions();
    
    // Handle WebSocket events
    
    // Client messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`Received message from client ${clientId}:`, message.type);
        
        // Update last ping time to track active connections
        const client = connectedClients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
          connectedClients.set(clientId, client);
        }
        
        // Handle different message types
        switch (message.type) {
          case 'ping':
            sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
            break;
            
          case 'chat':
            if (message.message && typeof message.message === 'string') {
              handleChatMessage(clientId, message.message);
            }
            break;
            
          case 'user_info':
            if (message.data && typeof message.data === 'object') {
              handleUserInfo(clientId, message.data);
            }
            break;
            
          case 'status_update':
            if (message.moduleId && message.status) {
              handleStatusUpdate(clientId, message.moduleId, message.status);
            }
            break;
            
          case 'get_active_sessions':
            sendActiveSessions(ws);
            break;
            
          default:
            console.log(`Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error(`Error handling WebSocket message: ${error}`);
        
        // Send error response
        sendToClient(ws, {
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log(`WebSocket client disconnected - Session: ${sessionId}`);
      
      // Remove client from active connections
      connectedClients.delete(clientId);
      
      // Record disconnection in system activity
      storage.createSystemActivity({
        module: 'WebSocket',
        event: 'Client Disconnected',
        status: 'Inactive',
        timestamp: new Date(),
        details: { sessionId, userId, clientId }
      }).catch(error => console.error('Error recording client disconnection:', error));
      
      // Broadcast updated active users count
      broadcastActiveSessions();
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      
      // Record error in system activity
      storage.createSystemActivity({
        module: 'WebSocket',
        event: 'Connection Error',
        status: 'Error',
        timestamp: new Date(),
        details: { 
          sessionId, 
          userId, 
          clientId,
          error: error.message
        }
      }).catch(error => console.error('Error recording WebSocket error:', error));
    });
  });
  
  // Set up a periodic cleanup of stale connections
  setInterval(cleanupStaleConnections, 60000);
  
  console.log('WebSocket handlers setup complete');
}

/**
 * Send a message to a client if their connection is open
 */
function sendToClient(ws: WebSocket, data: any): boolean {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

/**
 * Broadcast a message to all connected clients
 * Returns the number of clients that received the message
 */
export function broadcastMessage(data: any): number {
  let count = 0;
  connectedClients.forEach((client, id) => {
    if (sendToClient(client.ws, data)) {
      count++;
    }
  });
  return count;
}

/**
 * Generate a random session ID for new connections
 */
function generateSessionId(): string {
  return 'ws-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
}

/**
 * Cleanup stale connections that haven't sent a ping in over 5 minutes
 */
function cleanupStaleConnections() {
  const now = Date.now();
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  
  connectedClients.forEach((client, id) => {
    if (now - client.lastPing > staleThreshold) {
      console.log(`Closing stale connection for client ${id}`);
      
      // Close the connection
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.terminate();
      }
      
      // Remove from tracked connections
      connectedClients.delete(id);
    }
  });
}

/**
 * Broadcast active sessions count to all clients
 */
function broadcastActiveSessions() {
  // Count the current websocket connections as active sessions
  const count = connectedClients.size;
  console.log(`Updated chat sessions: found ${count} active WebSocket connections`);
  
  broadcastMessage({
    type: 'active_sessions_count',
    count,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send active sessions to a specific client
 */
function sendActiveSessions(ws: WebSocket) {
  try {
    // Convert the connected clients map to an array of session data
    const sessions = Array.from(connectedClients.entries()).map(([clientId, client]) => {
      return {
        id: clientId,
        userId: client.userId,
        sessionId: client.sessionId,
        lastActive: new Date(client.lastPing).toISOString(),
        profileId: client.profileId || null
      };
    });
    
    // Send the active sessions to the client
    sendToClient(ws, {
      type: 'active_sessions',
      sessions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending active sessions:', error);
    
    sendToClient(ws, {
      type: 'error',
      message: 'Failed to retrieve active sessions',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle module status updates from clients
 */
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

/**
 * Handle user info submissions from pre-chat form
 */
async function handleUserInfo(clientId: string, userInfo: any) {
  const client = connectedClients.get(clientId);
  if (!client) return;
  
  const { ws, userId, sessionId } = client;
  
  console.log(`Received user info from ${clientId} for session ${sessionId}`);
  
  try {
    // Validate the userInfo object
    if (!userInfo.fullName || !userInfo.mobileNumber || !userInfo.emailAddress) {
      console.error(`Invalid user info received: missing required fields`);
      return sendToClient(ws, {
        type: 'error',
        message: 'User info is missing required fields',
        timestamp: new Date().toISOString()
      });
    }
    
    // Find or create user profile
    const profile = await userProfileManager.findOrCreateProfile({
      userId
    });
    
    if (profile) {
      // Update profile with new information
      const updates: any = {};
      let hasUpdates = false;
      
      if (userInfo.fullName && (!profile.name || profile.name !== userInfo.fullName)) {
        updates.name = userInfo.fullName;
        hasUpdates = true;
      }
      
      if (userInfo.emailAddress && (!profile.email || profile.email !== userInfo.emailAddress)) {
        updates.email = userInfo.emailAddress;
        hasUpdates = true;
      }
      
      if (userInfo.mobileNumber && (!profile.phone || profile.phone !== userInfo.mobileNumber)) {
        updates.phone = userInfo.mobileNumber;
        hasUpdates = true;
      }
      
      // Always update these fields
      updates.lastSeen = new Date();
      updates.lastInteractionSource = 'livechat';
      hasUpdates = true;
      
      if (hasUpdates) {
        await userProfileManager.updateProfile(profile.id, updates);
        console.log(`Updated profile ${profile.id} with user info from client ${clientId}`);
        
        // Store the profile ID in the client information
        client.profileId = profile.id;
        connectedClients.set(clientId, client);
        
        // Record this as an interaction
        await userProfileManager.recordInteraction(
          profile.id,
          'livechat',
          'inbound',
          `Pre-chat form submitted: ${userInfo.fullName}, ${userInfo.emailAddress}, ${userInfo.mobileNumber}`,
          {
            sessionId,
            timestamp: new Date(),
            formData: true
          }
        );
        
        // Acknowledge receipt of user info
        sendToClient(client.ws, {
          type: 'user_info_ack',
          updated: true,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`No updates needed for profile ${profile.id}`);
        
        // Acknowledge receipt even if no updates
        sendToClient(client.ws, {
          type: 'user_info_ack',
          updated: false,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.error(`Failed to find or create profile for session ${sessionId}`);
      
      // Send error response
      sendToClient(ws, {
        type: 'error',
        message: 'Failed to process user information',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`Error processing user info for session ${sessionId}:`, error);
    
    // Send error response
    sendToClient(ws, {
      type: 'error',
      message: 'Failed to process user information',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle chat messages with user profile integration
 */
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
  
  // We'll use the UserProfileAssistant later in the process
  console.log('Preparing for chat handling with user profile integration');
  
  try {
    // Extract any potential user information from the message using regex
    // Later we'll use this to associate the chat session with a user profile
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(\+\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/g; // Basic phone pattern
    const nameRegex = /(?:my name is|i am|this is) ([a-zA-Z]+(?: [a-zA-Z]+){1,2})/i;
    
    const emailMatches = message.match(emailRegex);
    const phoneMatches = message.match(phoneRegex);
    const nameMatches = message.match(nameRegex);
    
    const email = emailMatches ? emailMatches[0] : null;
    const phone = phoneMatches ? phoneMatches[0] : null;
    const name = nameMatches ? nameMatches[1] : null;
    
    // Check if the user has provided an email that already exists in the system
    let existingProfile = null;
    if (email) {
      try {
        existingProfile = await storage.getUserProfileByEmail(email);
        if (existingProfile) {
          console.log(`Found existing profile with email ${email}, profile ID: ${existingProfile.id}`);
        }
      } catch (error) {
        console.error("Error checking for existing profile by email:", error);
      }
    }
    
    // If we've found a profile with the provided email, use that profile
    let sessionProfile;
    if (existingProfile) {
      sessionProfile = existingProfile;
      
      // Update the session profile with any new information
      const updates: any = {};
      let profileUpdated = false;
      
      // Update lastSeen and lastInteractionSource
      updates.lastSeen = new Date();
      updates.lastInteractionSource = 'livechat';
      profileUpdated = true;
      
      // Update with any new information from this message
      if (phone && !sessionProfile.phone) {
        updates.phone = phone;
        profileUpdated = true;
      }
      
      if (name && !sessionProfile.name) {
        updates.name = name;
        profileUpdated = true;
      }
      
      if (profileUpdated) {
        await userProfileManager.updateProfile(sessionProfile.id, updates);
        console.log(`Updated existing profile ${sessionProfile.id} with new information from chat`);
      }
    } else {
      // Find or create a user profile based on session ID
      // We use this for tracking purposes since we might not have real contact info yet
      sessionProfile = await userProfileManager.findOrCreateProfile({
        userId
      });
      
      // If we found user information in this message, update the profile
      let profileUpdated = false;
      if (sessionProfile) {
        const updates: any = {};
        
        if (email && !sessionProfile.email) {
          updates.email = email;
          profileUpdated = true;
        }
        
        if (phone && !sessionProfile.phone) {
          updates.phone = phone;
          profileUpdated = true;
        }
        
        if (name && !sessionProfile.name) {
          updates.name = name;
          profileUpdated = true;
        }
        
        if (profileUpdated) {
          try {
            await userProfileManager.updateProfile(sessionProfile.id, updates);
            console.log(`Updated profile for session ${sessionId} with extracted information`);
          } catch (error) {
            console.error("Error updating profile with extracted information:", error);
            // If we get a duplicate key error, it's likely the email already exists
            // Let's try to find the profile with that email and use it instead
            if (email && error.toString().includes('duplicate key value')) {
              try {
                const emailProfile = await storage.getUserProfileByEmail(email);
                if (emailProfile) {
                  sessionProfile = emailProfile;
                  console.log(`Switched to existing profile with email ${email}, profile ID: ${emailProfile.id}`);
                }
              } catch (innerError) {
                console.error("Error finding profile by email after duplicate key error:", innerError);
              }
            }
          }
        }
      }
    }
    
    // Record this incoming message as an interaction
    if (sessionProfile) {
      await userProfileManager.recordInteraction(
        sessionProfile.id,
        'livechat',
        'inbound',
        message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        {
          sessionId,
          timestamp: new Date()
        }
      );
    }

    // Use the profile-aware assistant to generate a response that considers user profile info
    // Get a reference to the unified profile assistant
    const userProfileAssistant = getUserProfileAssistant();
    
    console.log('Getting unified agent response for live chat message');
    
    try {
      // Use the unified agent system to generate a response
      const { response: profileAwareResponse, profileId } = await userProfileAssistant.generateResponse(
        userId,
        sessionId, // We use sessionId as the identifier since we may not have phone/email yet
        message,
        'chat'
      );
      
      // Identify the intent of the message using our AI
      // Include schedule_meeting to detect calendar-related requests
      const possibleIntents = ["inquiry", "complaint", "support", "order", "general", "schedule_meeting"];
      const intentResult = await classifyIntent(message, possibleIntents);
      
      let aiResponse = profileAwareResponse;
      
      // Check if this is a meeting scheduling intent
      if (intentResult.intent === "schedule_meeting" && intentResult.confidence > 0.7) {
        try {
          // First, make sure we have required user information for scheduling a meeting
          const profile = await userProfileManager.getProfile(profileId);
          
          // If we're missing information, ask for it before attempting scheduling
          if (!profile || !profile.email || !profile.name) {
            // Build a response that asks for the missing information
            let missingInfoResponse = "I'd be happy to schedule a meeting for you, but I need a few details first.\n\n";
            
            if (!profile || !profile.name) {
              missingInfoResponse += "What is your full name?\n";
            }
            
            if (!profile || !profile.email) {
              missingInfoResponse += "What email address should I use for the meeting invitation?\n";
            }
            
            if (!profile?.phone) {
              missingInfoResponse += "Could you provide a phone number in case there are any issues with the meeting?\n";
            }
            
            aiResponse = missingInfoResponse;
          } else {
            // We have the necessary information, proceed with scheduling
            // Enhance the meeting request with the user's information
            const schedulingResult = await handleMeetingScheduling(message, userId, sessionId, profile);
            
            if (schedulingResult.success) {
              aiResponse = schedulingResult.response;
              
              // Inform the client that a meeting was scheduled
              sendToClient(ws, {
                type: 'meeting_scheduled',
                message: schedulingResult.meetingDetails,
                timestamp: new Date().toISOString()
              });
            } else {
              // If scheduling failed, use the response from the scheduling handler
              aiResponse = schedulingResult.response;
            }
          }
        } catch (error) {
          console.error("Error handling meeting scheduling:", error);
          // Fall back to regular chat if scheduling fails
          aiResponse = "I'm having trouble with the calendar system right now. Can you please provide more details about when you'd like to schedule a meeting?";
        }
      }
      
      // Record the outgoing message as an interaction
      if (profileId) {
        await userProfileManager.recordInteraction(
          profileId,
          'livechat',
          'outbound',
          aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
          {
            sessionId,
            timestamp: new Date(),
            aiGenerated: true
          }
        );
        
        // Update last interaction source in profile
        await userProfileManager.updateProfile(profileId, {
          lastInteractionSource: 'livechat'
        });
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
        details: { 
          sessionId, 
          intent: intentResult.intent,
          profileId: profileId || null
        }
      });
    } catch (error) {
      console.error("Error processing chat message with user profile:", error);
      
      // Fallback to simple response if profile handling fails
      const fallbackResponse = "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.";
      
      // Log the fallback response
      await storage.createChatLog({
        userId,
        sessionId,
        message: fallbackResponse,
        sender: 'ai',
        timestamp: new Date()
      });
      
      // Send fallback response to client
      sendToClient(ws, {
        type: 'chat',
        message: fallbackResponse,
        timestamp: new Date().toISOString()
      });
      
      // Log the error
      await storage.createSystemActivity({
        module: 'Live Chat',
        event: 'Profile Processing Error',
        status: 'Error',
        timestamp: new Date(),
        details: { 
          sessionId, 
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  } catch (error) {
    console.error("Error in chat message handler:", error);
    
    // Send a generic error response to the client
    sendToClient(ws, {
      type: 'error',
      message: "I'm sorry, I couldn't process your message. Please try again.",
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle meeting scheduling requests through chat
 */
async function handleMeetingScheduling(
  message: string, 
  userId: number, 
  sessionId: string, 
  userProfile?: any
): Promise<{
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
    // Include user profile information if available
    const userInfo = userProfile ? 
      `The message is from a user named "${userProfile.name}" with email "${userProfile.email}" and phone "${userProfile.phone || 'not provided'}".` : 
      '';
      
    const extractionPrompt = `
      Extract meeting details from the following message. If any information is missing or unclear, indicate that it's unknown.
      Return a JSON object with: 
      - subject (string, the purpose or title of the meeting)
      - date (YYYY-MM-DD format, or "unknown" if not specified)
      - time (HH:MM format in 24-hour time, or "unknown" if not specified)
      - duration (in minutes, default to 30 if not specified)
      - attendees (array of email addresses, or empty array if none specified)
      - description (string, additional notes or empty string if none)
      - timezone (string, extract any mentioned timezone using IANA timezone format like "America/New_York", "Europe/London", "Asia/Tokyo", etc. When only abbreviations like EST, PST, UTC are mentioned, convert them to proper IANA format. Use "unknown" if not specified.)
      
      ${userInfo}
      Message: ${message}
    `;
    
    const extractionResponse = await createChatCompletion([
      { role: "system", content: "You are an AI assistant that extracts structured meeting data from text." },
      { role: "user", content: extractionPrompt }
    ]);
    
    if (!extractionResponse.success) {
      return {
        success: false,
        response: "I couldn't understand the meeting details. Could you please provide more specific information about when you'd like to schedule a meeting?"
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
    
    // Get timezone information
    const timezone = meetingData.timezone && meetingData.timezone !== "unknown" 
      ? meetingData.timezone 
      : "America/New_York"; // Default to Eastern Time if not specified
      
    console.log(`Creating meeting with timezone: ${timezone}`);
      
    // Create the meeting
    // Use user profile information for attendees if available
    let attendees = meetingData.attendees || [];
    
    // If we have user profile with email but it's not already in attendees list, add it
    if (userProfile && userProfile.email && !attendees.includes(userProfile.email)) {
      attendees.push(userProfile.email);
    }
    
    // Create meeting object with assembled data
    const meeting = {
      userId,
      subject: meetingData.subject,
      description: meetingData.description || 
        `Meeting scheduled via chat with ${userProfile?.name || 'user'} (Session ${sessionId})`,
      startTime: startTime,
      endTime: endTime,
      attendees: attendees,
      status: "scheduled",
      googleEventId: null,
      timezone: timezone // Add timezone information
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
            dateTime: startTime.toISOString(),
            timeZone: timezone
          },
          end: { 
            dateTime: endTime.toISOString(),
            timeZone: timezone 
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
        chatSessionId: sessionId,
        profileId: userProfile?.id || null
      }
    });
    
    // If we have a user profile, record this as an interaction
    if (userProfile && userProfile.id) {
      await userProfileManager.recordInteraction(
        userProfile.id,
        'calendar',
        'created',
        `Meeting scheduled: ${meeting.subject}`,
        {
          meetingId: savedMeeting.id,
          timestamp: new Date(),
          startTime: startTime.toISOString(),
          source: 'livechat'
        }
      );
      
      // Update the user profile metadata with meeting information
      try {
        const currentMetadata = userProfile.metadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          lastMeetingScheduled: {
            id: savedMeeting.id,
            subject: meeting.subject,
            time: startTime.toISOString(),
            scheduledVia: 'livechat'
          }
        };
        
        await userProfileManager.updateProfile(userProfile.id, {
          metadata: updatedMetadata
        });
      } catch (metadataError) {
        console.error("Error updating user profile metadata with meeting info:", metadataError);
        // Non-critical error, continue with meeting scheduling process
      }
    }
    
    // Format meeting details for display with timezone awareness
    const timeString = new Intl.DateTimeFormat('en', { 
      hour: 'numeric', 
      minute: 'numeric',
      hour12: true,
      timeZone: timezone
    }).format(startTime);
    
    const dateString = new Intl.DateTimeFormat('en', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      timeZone: timezone
    }).format(startTime);
    
    console.log(`Formatted meeting time for ${timezone}: ${dateString} at ${timeString}`);
    
    // Success response with details about the meeting
    return {
      success: true,
      response: `Great! I've scheduled a meeting for "${meeting.subject}" on ${dateString} at ${timeString} (${timezone.replace('_', ' ')}). ${googleEventCreated ? 'It has been added to your Google Calendar.' : ''}`,
      meetingDetails: {
        id: savedMeeting.id,
        subject: meeting.subject,
        date: dateString,
        time: timeString,
        duration: duration,
        attendees: meeting.attendees,
        timezone: timezone,
        timezoneDisplay: timezone.replace('_', ' ')
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