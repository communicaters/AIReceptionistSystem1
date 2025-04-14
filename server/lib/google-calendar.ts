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
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Get a new access token using the refresh token
export async function getAccessToken(userId: number) {
  try {
    // Get user's calendar config
    const config = await storage.getCalendarConfigByUserId(userId);
    
    if (!config || !config.googleClientId || !config.googleClientSecret || !config.googleRefreshToken) {
      throw new Error('Google Calendar not properly configured');
    }
    
    // Create OAuth client
    const oauth2Client = createOAuth2Client(config.googleClientId, config.googleClientSecret);
    
    // Set refresh token
    oauth2Client.setCredentials({
      refresh_token: config.googleRefreshToken
    });
    
    // Request new access token
    const { token } = await oauth2Client.getAccessToken();
    
    if (!token) {
      throw new Error('Failed to get access token');
    }
    
    return { 
      token,
      oauth2Client
    };
  } catch (error) {
    console.error('Error getting Google access token:', error);
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
  }
) {
  try {
    const { oauth2Client } = await getAccessToken(userId);
    
    // Get user's calendar config to determine which calendar to use
    const config = await storage.getCalendarConfigByUserId(userId);
    const calendarId = config?.googleCalendarId || 'primary';
    
    const response = await calendar.events.insert({
      auth: oauth2Client,
      calendarId,
      requestBody: event,
      sendUpdates: 'all', // Send email updates to attendees
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
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
    busySlots.forEach(slot => {
      const start = new Date(slot.start as string);
      const end = new Date(slot.end as string);
      
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