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
  
  // First, try to extract JSON from markdown code blocks
  const jsonBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    try {
      // Clean the JSON string
      let jsonStr = jsonBlockMatch[1].trim();
      
      // Handle common formatting issues
      if (jsonStr.startsWith('{') && !jsonStr.startsWith('{"')) {
        // Make sure property names are properly quoted
        jsonStr = jsonStr.replace(/(\{|\,)\s*(\w+)\s*\:/g, '$1"$2":');
      }
      
      console.log("Trying to parse JSON from code block:", jsonStr);
      
      // Try to parse the JSON from the code block
      const parsedContent = JSON.parse(jsonStr);
      if (parsedContent && parsedContent.response) {
        return formatPlainText(parsedContent.response);
      }
    } catch (e) {
      // Failed to parse JSON from code block, will fall back to other methods
      console.log("Failed to parse JSON from code block:", e);
    }
  }
  
  // Next, try parsing the entire text as JSON after cleaning it
  try {
    // Clean the text first
    let cleanedText = responseText.replace(/```(?:json)?|```/g, '').trim();
    
    // Handle common formatting issues
    if (cleanedText.startsWith('{') && !cleanedText.startsWith('{"')) {
      // Make sure property names are properly quoted
      cleanedText = cleanedText.replace(/(\{|\,)\s*(\w+)\s*\:/g, '$1"$2":');
    }
    
    console.log("Trying to parse entire text as JSON:", cleanedText);
    
    // Try to parse as JSON
    const jsonResponse = JSON.parse(cleanedText) as EmailResponseJson;
    
    // If successful, extract just the response field
    if (jsonResponse && typeof jsonResponse.response === 'string') {
      return jsonResponse.response.trim();
    }
  } catch (error) {
    console.log("Failed to parse as JSON, treating as plain text:", error);
  }
  
  // If all JSON parsing attempts fail, return the formatted plain text
  // First remove any markdown artifacts
  let cleanText = responseText
    .replace(/```(?:json)?|```/g, '') // Remove code block markers
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markers
    .replace(/\*(.*?)\*/g, '$1')      // Remove italic markers
    .replace(/__(.*?)__/g, '$1')      // Remove underline markers
    .trim();
    
  return formatPlainText(cleanText);
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