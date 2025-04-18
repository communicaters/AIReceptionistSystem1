/**
 * Type definitions for the AI Receptionist system
 */

// Supported communication channels
export type Channel = 'whatsapp' | 'email' | 'chat' | 'call';

// AI response enhancement options
export interface AIResponseEnhancement {
  // Profile information to include in the response
  profileName?: string;
  profileEmail?: string;
  profilePhone?: string;
  
  // Business hours for scheduling
  businessHours?: {
    open: string;
    close: string;
    timezone: string;
    days: string[];
  };
  
  // Context from previous interactions
  contextHistory?: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  
  // Flag if any information is missing from the profile
  hasMissingProfileInfo?: boolean;
  missingFields?: string[];
  
  // Previous information requests to avoid repetition
  previouslyAskedFor?: string[];
  
  // Whether scheduling features should be enabled
  enableScheduling?: boolean;
  
  // Flag to indicate message contains scheduling keywords
  hasScheduleKeywords?: boolean;
  
  // Custom prompt additions
  customPrompt?: string;
  
  // Default location and timezone for scheduling
  defaultTimezone?: string;
  defaultLocation?: string;
}

// Scheduling request data structure
export interface SchedulingRequest {
  is_scheduling_request: boolean;
  date_time?: string;
  email?: string;
  subject?: string;
  duration_minutes?: number;
  message?: string;
  attendee_name?: string;
}

// Meeting parameters for scheduling functions
export interface MeetingParams {
  attendeeEmail: string;
  subject: string;
  dateTimeString: string;
  duration: number;
  description: string;
  attendeeName?: string;
  timezone?: string;
  location?: string;
}

// Result of meeting scheduling attempts
export interface SchedulingResult {
  isSchedulingRequest: boolean;
  scheduled: boolean;
  meetingLink?: string;
  dateTime?: string;
  subject?: string;
  duration?: number;
  error?: string;
}

// User profile information structure
export interface UserProfileInfo {
  id?: number;
  userId?: number;
  name?: string;
  email?: string;
  phone?: string;
  lastInteractionSource?: Channel;
  lastSeen?: Date;
  metadata?: Record<string, any>;
}

// Agent processing options
export interface AgentProcessingOptions {
  userId: number;
  contactIdentifier: string; // Phone number, email, or session ID
  message: string;
  channel: Channel;
  existingProfileId?: number;
  enhancements?: AIResponseEnhancement;
}

// Agent processing result
export interface AgentProcessingResult {
  success: boolean;
  response: string;
  profileId?: number;
  schedulingResult?: SchedulingResult;
  error?: string;
}

// Intent classification result
export interface IntentClassificationResult {
  intent: string;
  confidence: number;
  allIntents?: Record<string, number>;
}

// User interaction data structure
export interface InteractionData {
  source: Channel;
  type: 'inbound' | 'outbound';
  content: string;
  timestamp: Date | string;
  metadata?: Record<string, any>;
}