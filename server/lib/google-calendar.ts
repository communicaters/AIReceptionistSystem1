import { google } from 'googleapis';
import { storage } from '../storage';

// Google Calendar API setup
const calendar = google.calendar('v3');

// Initialize the Google Calendar API
export function initGoogleCalendar() {
  console.log('Google Calendar API initialized');
}

// Create a new OAuth2 client with the given credentials
export function createOAuth2Client(clientId: string, clientSecret: string) {
  const redirectUri = `${process.env.HOST_URL || 'http://localhost:5000'}/api/calendar/auth/callback`;
  console.log(`Creating OAuth client with clientId: ${clientId.substring(0, 10)}... and redirectUri: ${redirectUri}`);
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Get a new access token using the refresh token
export async function getAccessToken(userId: number) {
  try {
    console.log(`Getting access token for userId: ${userId}`);
    
    // Get user's calendar config
    const config = await storage.getCalendarConfigByUserId(userId);
    
    if (!config) {
      console.error('No calendar configuration found for user', userId);
      throw new Error('Google Calendar configuration not found');
    }
    
    if (!config.googleClientId || !config.googleClientSecret || !config.googleRefreshToken) {
      console.error('Incomplete Google Calendar credentials', {
        hasClientId: !!config.googleClientId,
        hasClientSecret: !!config.googleClientSecret,
        hasRefreshToken: !!config.googleRefreshToken
      });
      throw new Error('Google Calendar not properly configured - missing credentials');
    }
    
    // Create OAuth client
    const oauth2Client = createOAuth2Client(config.googleClientId, config.googleClientSecret);
    
    // Set refresh token
    oauth2Client.setCredentials({
      refresh_token: config.googleRefreshToken,
      // Add required scopes for conference data
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ]
    });
    
    console.log('Requesting access token from Google API');
    
    // Request new access token
    const tokenResponse = await oauth2Client.getAccessToken();
    const token = tokenResponse.token;
    
    if (!token) {
      console.error('Google API returned empty token');
      throw new Error('Failed to get access token');
    }
    
    console.log('Successfully obtained Google access token');
    
    return { 
      token,
      oauth2Client
    };
  } catch (error) {
    console.error('Error getting Google access token:', error);
    // Create detailed log with more information about what went wrong
    await storage.createSystemActivity({
      module: 'Google Calendar',
      event: 'Authentication Error',
      status: 'error',
      timestamp: new Date(),
      details: { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }).catch(err => console.error('Failed to log calendar auth error:', err));
    
    throw error;
  }
}

// List calendar events
export async function listEvents(userId: number, timeMin: Date, timeMax: Date) {
  try {
    const { oauth2Client } = await getAccessToken(userId);
    
    const response = await calendar.events.list({
      auth: oauth2Client,
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return response.data.items;
  } catch (error) {
    console.error('Error listing calendar events:', error);
    throw error;
  }
}

// Create a calendar event
export async function createEvent(
  userId: number, 
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string };
    end: { dateTime: string };
    attendees?: { email: string }[];
    conferenceData?: {
      createRequest: {
        requestId: string;
      }
    }
  }
) {
  try {
    const { oauth2Client } = await getAccessToken(userId);
    
    // Get user's calendar config to determine which calendar to use
    const config = await storage.getCalendarConfigByUserId(userId);
    const calendarId = config?.googleCalendarId || 'primary';
    
    console.log("Sending Google Calendar request:", JSON.stringify(event, null, 2));
    
    // Request conferenceData to force Google Meet creation
    const response = await calendar.events.insert({
      auth: oauth2Client,
      calendarId,
      requestBody: event, // Use event as-is since conferenceData is now part of the interface
      conferenceDataVersion: 1, // Must be 1 to enable conference creation
      sendUpdates: 'all', // Send email updates to attendees
    });
    
    // Log detailed information about conference data for debugging
    console.log("Google Calendar response with ID:", response.data.id);
    
    if (response.data.conferenceData) {
      console.log("Conference data successfully created");
      console.log("Conference solution:", response.data.conferenceData.conferenceSolution?.name);
      console.log("Entry points:", JSON.stringify(response.data.conferenceData.entryPoints, null, 2));
    } else {
      console.warn("No conference data returned despite requesting it. Check Google Calendar API permissions.");
    }
    
    if (response.data.hangoutLink) {
      console.log("Google Meet link available:", response.data.hangoutLink);
    } else {
      console.warn("No Google Meet link was generated. This might be due to permission issues.");
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    
    // Log detailed error information
    await storage.createSystemActivity({
      module: 'Google Calendar',
      event: 'Event Creation Error',
      status: 'error',
      timestamp: new Date(),
      details: { 
        userId,
        eventSummary: event.summary,
        error: error instanceof Error ? error.message : 'Unknown error',
        eventData: JSON.stringify(event)
      }
    }).catch(err => console.error('Failed to log calendar event creation error:', err));
    
    throw error;
  }
}

// Get free/busy info for a specific day
export async function getFreebusy(
  userId: number,
  timeMin: Date,
  timeMax: Date
) {
  try {
    const { oauth2Client } = await getAccessToken(userId);
    
    // Get user's calendar config
    const config = await storage.getCalendarConfigByUserId(userId);
    const calendarId = config?.googleCalendarId || 'primary';
    
    const response = await calendar.freebusy.query({
      auth: oauth2Client,
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: calendarId }],
      },
    });
    
    return response.data.calendars?.[calendarId]?.busy || [];
  } catch (error) {
    console.error('Error getting freebusy data:', error);
    throw error;
  }
}

// Generate available time slots based on calendar busy periods
export async function getAvailableTimeSlots(
  userId: number,
  date: Date,
  slotDuration: number = 30
) {
  try {
    // Start with beginning of the selected day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    // End with end of the selected day
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get user's calendar config
    const config = await storage.getCalendarConfigByUserId(userId);
    
    if (!config) {
      throw new Error('Calendar configuration not found');
    }
    
    // Extract business hours
    const startHour = parseInt(config.availabilityStartTime.split(':')[0]);
    const startMinute = parseInt(config.availabilityStartTime.split(':')[1]);
    const endHour = parseInt(config.availabilityEndTime.split(':')[0]);
    const endMinute = parseInt(config.availabilityEndTime.split(':')[1]);
    
    // Set business hours start and end
    const businessStart = new Date(date);
    businessStart.setHours(startHour, startMinute, 0, 0);
    
    const businessEnd = new Date(date);
    businessEnd.setHours(endHour, endMinute, 0, 0);
    
    // Get busy slots from Google Calendar
    const busySlots = await getFreebusy(userId, businessStart, businessEnd);
    
    // Create map of busy times
    const busyTimes = new Map();
    busySlots.forEach((slot) => {
      // Skip slots with undefined start/end
      if (!slot.start || !slot.end) return;
      
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      
      // Convert to minutes since start of day for easier comparison
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();
      
      // Mark all minutes in the busy slot
      for (let minute = startMinutes; minute < endMinutes; minute++) {
        busyTimes.set(minute, true);
      }
    });
    
    // Generate available slots
    const availableSlots = [];
    const businessStartMinutes = startHour * 60 + startMinute;
    const businessEndMinutes = endHour * 60 + endMinute;
    
    for (let minute = businessStartMinutes; minute < businessEndMinutes; minute += slotDuration) {
      // Check if the entire slot is available
      let isAvailable = true;
      for (let i = 0; i < slotDuration; i++) {
        if (busyTimes.has(minute + i)) {
          isAvailable = false;
          break;
        }
      }
      
      // Format time for display
      const hours = Math.floor(minute / 60);
      const mins = minute % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = mins.toString().padStart(2, '0');
      
      availableSlots.push({
        time: `${formattedHours}:${formattedMinutes} ${period}`,
        available: isAvailable
      });
    }
    
    return availableSlots;
  } catch (error) {
    console.error('Error generating available time slots:', error);
    // Return empty array in case of error
    return [];
  }
}

// Helper function for AI to handle meeting scheduling
// Parse time string in various formats, handle timezones, and create calendar event
export async function scheduleMeeting(
  userId: number,
  options: {
    attendeeEmail: string,
    subject?: string,
    description?: string,
    dateTimeString: string,
    duration?: number // in minutes
  }
): Promise<{ success: boolean; message: string; eventId?: string; error?: string; meetingLink?: string }> {
  try {
    console.log(`Attempting to schedule meeting with options:`, options);
    
    const { attendeeEmail, subject = 'Meeting', description = '', dateTimeString, duration = 60 } = options;
    
    // Get user's calendar config
    const config = await storage.getCalendarConfigByUserId(userId);
    if (!config || !config.isActive) {
      return { 
        success: false, 
        message: 'Calendar integration is not properly configured', 
        error: 'CALENDAR_NOT_CONFIGURED'
      };
    }

    // Parse the date-time string with enhanced logging and handling
    let startDateTime: Date;
    try {
      console.log(`Parsing date-time string: "${dateTimeString}"`);
      
      // Handle various date formats, first try direct parsing
      startDateTime = new Date(dateTimeString);
      
      // Check if the date is valid
      if (isNaN(startDateTime.getTime())) {
        console.log("Direct date parsing failed, trying additional formats...");
        
        // Try parsing with additional formatting help
        // Handle format like "Today at 4:30PM PST"
        if (dateTimeString.toLowerCase().includes('today at')) {
          console.log("Detected 'Today at' format");
          const timeMatch = dateTimeString.match(/(\d+):(\d+)(?:\s*)(am|pm)/i);
          
          if (timeMatch) {
            const today = new Date();
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            
            today.setHours(isPM && hours < 12 ? hours + 12 : hours);
            today.setMinutes(minutes);
            today.setSeconds(0);
            today.setMilliseconds(0);
            
            startDateTime = today;
            console.log(`Parsed 'Today at' time to: ${startDateTime.toISOString()}`);
          }
        }
        
        // If still invalid, throw error
        if (isNaN(startDateTime.getTime())) {
          throw new Error('Invalid date format');
        }
      }
      
      console.log(`Successfully parsed date-time to: ${startDateTime.toISOString()}`);
      
      // If the date is in the past, return error
      if (startDateTime < new Date()) {
        console.log(`Meeting time is in the past: ${startDateTime.toISOString()}`);
        return {
          success: false,
          message: 'Cannot schedule meetings in the past',
          error: 'PAST_DATE'
        };
      }
    } catch (error) {
      console.error('Error parsing date string:', error);
      return {
        success: false,
        message: `Could not understand the date/time format: "${dateTimeString}"`,
        error: 'INVALID_DATE_FORMAT'
      };
    }
    
    // Calculate end time
    const endDateTime = new Date(startDateTime.getTime());
    endDateTime.setMinutes(endDateTime.getMinutes() + duration);
    
    // Check if the requested time is available
    const busySlots = await getFreebusy(
      userId,
      new Date(startDateTime.getTime() - 5 * 60000), // 5 minutes padding before
      new Date(endDateTime.getTime() + 5 * 60000) // 5 minutes padding after
    );
    
    if (busySlots.length > 0) {
      return {
        success: false,
        message: 'The requested time conflicts with an existing appointment',
        error: 'TIME_CONFLICT'
      };
    }
    
    // Create the event with Google Meet enabled
    const event = await createEvent(userId, {
      summary: subject,
      description,
      start: { dateTime: startDateTime.toISOString() },
      end: { dateTime: endDateTime.toISOString() },
      attendees: [{ email: attendeeEmail }],
      // Add conferenceData to request a Google Meet link
      conferenceData: {
        createRequest: {
          requestId: `meeting-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        }
      }
    });
    
    // Extract meeting link from event data with improved logging
    let meetingLink = '';
    console.log("Looking for meeting link in Google Calendar response");
    
    // First check hangoutLink which is the most reliable
    if (event.hangoutLink) {
      meetingLink = event.hangoutLink;
      console.log(`Google Meet link extracted from hangoutLink: ${meetingLink}`);
    } 
    // Check conferenceData as backup method
    else if (event.conferenceData) {
      console.log("Conference data found:", JSON.stringify(event.conferenceData, null, 2));
      
      if (event.conferenceData.entryPoints && event.conferenceData.entryPoints.length > 0) {
        // Try to find a video entry point first
        const videoEntry = event.conferenceData.entryPoints.find(
          entry => entry.entryPointType === 'video'
        );
        
        if (videoEntry && videoEntry.uri) {
          meetingLink = videoEntry.uri;
          console.log(`Conference link extracted from video entryPoint: ${meetingLink}`);
        } 
        // If no video entry point, try any available entry point
        else {
          const anyEntry = event.conferenceData.entryPoints[0];
          if (anyEntry && anyEntry.uri) {
            meetingLink = anyEntry.uri;
            console.log(`Conference link extracted from entryPoint[0]: ${meetingLink}`);
          }
        }
      } else {
        console.warn("Conference data exists but no entry points found");
      }
    } else {
      console.warn("No conference data or hangout link found in the event response");
      console.log("Check that Google Calendar API has conferencedata.create permission");
    }
    
    // Log the meeting in our system with meeting link
    const meetingLog = await storage.createMeetingLog({
      userId,
      subject,
      description,
      startTime: startDateTime,
      endTime: endDateTime,
      attendees: [attendeeEmail],
      googleEventId: event.id,
      status: 'scheduled',
      meetingLink: meetingLink || null
    });
    
    console.log(`Successfully scheduled meeting: ${event.id}${meetingLink ? ' with meeting link' : ''}`);
    
    return {
      success: true,
      message: `Meeting scheduled successfully for ${startDateTime.toLocaleString()}`,
      eventId: event.id || undefined,
      meetingLink: meetingLink || undefined
    };
  } catch (error: any) {
    console.error('Error scheduling meeting:', error);
    return {
      success: false,
      message: `Failed to schedule meeting: ${error?.message || 'Unknown error'}`,
      error: 'CALENDAR_API_ERROR'
    };
  }
}