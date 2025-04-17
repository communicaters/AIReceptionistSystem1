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
  
  // Clean up code blocks if present
  let cleanedText = responseText;
  
  // Remove markdown code blocks (```json ... ```)
  if (cleanedText.includes('```json')) {
    cleanedText = cleanedText.replace(/```json\s*([\s\S]*?)\s*```/g, (_, jsonContent) => {
      return jsonContent.trim();
    });
  }
  
  // Remove backticks if present
  cleanedText = cleanedText.replace(/```/g, '');
  
  try {
    // Try to parse the response as JSON
    const parsedResponse = JSON.parse(cleanedText) as EmailResponseJson;
    
    // If successful, extract just the response field
    if (parsedResponse && typeof parsedResponse.response === 'string') {
      return parsedResponse.response.trim();
    }
    
    // If no response field is found, return the original text with formatting
    return formatPlainText(responseText);
  } catch (error) {
    // If parsing fails, the response is likely already plain text
    return formatPlainText(responseText);
  }
}

/**
 * Formats plain text to remove common AI model formatting artifacts
 */
function formatPlainText(text: string): string {
  // Remove markdown code blocks and other common AI response artifacts
  let formatted = text
    .replace(/```json[\s\S]*?```/g, '') // Remove JSON code blocks
    .replace(/```[\s\S]*?```/g, '')     // Remove other code blocks
    .replace(/\*\*/g, '')               // Remove bold markers
    .replace(/\n{3,}/g, '\n\n');        // Replace multiple newlines with double newlines
  
  return formatted.trim();
}

/**
 * Formats an email body into HTML format with proper line breaks and styling
 */
export function formatEmailBodyAsHtml(body: string): string {
  if (!body) return '';
  
  // Process paragraphs first (double newlines create paragraphs)
  let html = body
    .split('\n\n')
    .map(paragraph => `<p style="margin-bottom: 16px; line-height: 1.5;">${paragraph.trim()}</p>`)
    .join('');
  
  // Replace remaining single newlines with HTML line breaks
  html = html.replace(/\n/g, '<br>');
  
  // Style any potential greeting or signature
  html = html.replace(/(^<p[^>]*>)(Hello|Hi|Dear|Greetings)([^<]+)(<\/p>)/i, 
    '$1<span style="font-weight: 500;">$2$3</span>$4');
  
  // Style any potential sign-off
  html = html.replace(/(<p[^>]*>)(Best regards|Regards|Sincerely|Thanks|Thank you)([^<]+)(<\/p>)/i, 
    '$1<span style="font-style: italic;">$2$3</span>$4');
  
  return html;
}

/**
 * Formats an email body into text format with proper line breaks
 * This is a simpler function but included for completeness
 */
export function formatEmailBodyAsText(body: string): string {
  return body || '';
}