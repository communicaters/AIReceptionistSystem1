/**
 * Email Formatter Module
 * Responsible for formatting email responses by extracting clean text from AI-generated JSON responses
 */

interface EmailResponseJson {
  response: string;
  intents?: string[];
  shouldScheduleMeeting?: boolean;
  meetingDetails?: {
    date?: string;
    time?: string;
    duration?: number;
  };
  [key: string]: any;  // Allow for other properties
}

/**
 * Extracts the clean response text from an AI-generated response
 * If the text is in JSON format, extracts only the 'response' field
 * If not, returns the original text
 */
export function extractCleanResponseText(responseText: string): string {
  if (!responseText) return '';
  
  try {
    // Try to parse the response as JSON
    const parsedResponse = JSON.parse(responseText) as EmailResponseJson;
    
    // If successful, extract just the response field
    if (parsedResponse && typeof parsedResponse.response === 'string') {
      return parsedResponse.response.trim();
    }
    
    // If no response field is found, return the original text
    return responseText;
  } catch (error) {
    // If parsing fails, the response is likely already plain text, so return it as is
    return responseText;
  }
}

/**
 * Formats an email body into HTML format with proper line breaks
 */
export function formatEmailBodyAsHtml(body: string): string {
  if (!body) return '';
  
  // Replace newlines with HTML line breaks
  return body.replace(/\n/g, '<br>');
}

/**
 * Formats an email body into text format with proper line breaks
 * This is a simpler function but included for completeness
 */
export function formatEmailBodyAsText(body: string): string {
  return body || '';
}