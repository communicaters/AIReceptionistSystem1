import { storage } from '../storage';
import { EmailTemplate, IntentMap } from '@shared/schema';
import { createChatCompletion } from './openai';

// Template selection scoring constants
const SCORE_CATEGORY_MATCH = 10;
const SCORE_NAME_MATCH = 5;
const SCORE_ACTIVE_TEMPLATE = 3;
const SCORE_RECENTLY_USED = 2;
const SCORE_DESCRIPTION_MATCH = 4;
const SCORE_VARIABLE_COUNT_PENALTY = -0.5; // Penalty per variable that needs substitution

// Interface for variable extraction result
interface ExtractedVariables {
  [key: string]: string;
}

/**
 * Selects the best template based on identified intents and context
 */
export async function selectBestTemplate(
  intents: string[],
  emailContent: {
    from: string;
    subject: string;
    body: string;
    to?: string;
  },
  userId: number
): Promise<EmailTemplate | null> {
  try {
    // Get all templates for this user
    const allTemplates = await storage.getEmailTemplatesByUserId(userId);
    if (!allTemplates || allTemplates.length === 0) {
      console.log("No templates found for user:", userId);
      return null;
    }
    
    // Get recent intents for context
    const recentIntents = await storage.getIntentsByUserId(userId);
    
    // Prepare a scoring system for templates
    type TemplateScore = { 
      template: EmailTemplate; 
      score: number;
      matchReasons: string[];
    };
    
    const scoredTemplates: TemplateScore[] = [];
    
    // Score each template based on various factors
    for (const template of allTemplates) {
      let score = 0;
      const matchReasons: string[] = [];
      
      // Check if template category matches any intent
      for (const intent of intents) {
        if (template.category.toLowerCase() === intent.toLowerCase()) {
          score += SCORE_CATEGORY_MATCH;
          matchReasons.push(`Category "${template.category}" matches intent "${intent}"`);
          break;
        }
      }
      
      // Check if template name contains any intent
      for (const intent of intents) {
        if (template.name.toLowerCase().includes(intent.toLowerCase())) {
          score += SCORE_NAME_MATCH;
          matchReasons.push(`Template name "${template.name}" contains intent "${intent}"`);
        }
      }
      
      // Check if template description contains any intent (if description exists)
      if (template.description) {
        for (const intent of intents) {
          if (template.description.toLowerCase().includes(intent.toLowerCase())) {
            score += SCORE_DESCRIPTION_MATCH;
            matchReasons.push(`Template description contains intent "${intent}"`);
          }
        }
      }
      
      // Subject line matching
      if (emailContent.subject && template.subject) {
        // Check for subject keywords in template subject
        const subjectKeywords = emailContent.subject.toLowerCase().split(/\s+/);
        const templateSubject = template.subject.toLowerCase();
        
        for (const keyword of subjectKeywords) {
          if (keyword.length > 3 && templateSubject.includes(keyword)) {
            score += 2;
            matchReasons.push(`Subject keyword "${keyword}" match`);
          }
        }
      }
      
      // Boost score for active templates
      if (template.isActive) {
        score += SCORE_ACTIVE_TEMPLATE;
        matchReasons.push("Template is active");
      }
      
      // Check recently used intents for this template category
      const relatedIntents = recentIntents.filter(
        intent => intent.category === template.category
      );
      
      if (relatedIntents.length > 0) {
        score += SCORE_RECENTLY_USED;
        matchReasons.push("Category recently used");
      }
      
      // Slight penalty for each variable that needs replacement (complexity penalty)
      if (template.variables) {
        const variableCount = (template.variables.match(/\{\{[^}]+\}\}/g) || []).length;
        if (variableCount > 0) {
          score += variableCount * SCORE_VARIABLE_COUNT_PENALTY;
          matchReasons.push(`Template has ${variableCount} variables to fill`);
        }
      }
      
      // Add template with its score
      scoredTemplates.push({ template, score, matchReasons });
    }
    
    // Sort templates by score (highest first)
    scoredTemplates.sort((a, b) => b.score - a.score);
    
    // Log the top scoring templates for debugging
    console.log("Top 3 template scores:");
    scoredTemplates.slice(0, 3).forEach((item, i) => {
      console.log(`${i+1}. "${item.template.name}" (score: ${item.score})`);
      console.log(`   Reasons: ${item.matchReasons.join(', ')}`);
    });
    
    // Return the highest scoring template, or null if none scored above 0
    return scoredTemplates.length > 0 && scoredTemplates[0].score > 0 
      ? scoredTemplates[0].template 
      : null;
  } catch (error) {
    console.error("Error selecting best template:", error);
    return null;
  }
}

/**
 * Processes a template by extracting and filling variables
 */
export async function processTemplate(
  template: EmailTemplate,
  emailContent: {
    from: string;
    subject: string;
    body: string;
    to?: string;
  },
  userId: number
): Promise<string> {
  try {
    // Start with the template body
    let processedBody = template.body;
    
    // If no variables to replace, return the template as is
    if (!template.variables || !template.variables.includes("{{")) {
      return processedBody;
    }
    
    // Extract all variables from the template
    const variableMatches = [...processedBody.matchAll(/\{\{([^}]+)\}\}/g)];
    const variableNames = variableMatches.map(match => match[1].trim());
    
    if (variableNames.length === 0) {
      return processedBody;
    }
    
    // Extract values for variables from the email content
    const extractedVariables = await extractVariablesFromContent(
      variableNames,
      emailContent,
      userId
    );
    
    // Replace each variable in the template
    for (const [variableName, value] of Object.entries(extractedVariables)) {
      const variablePattern = new RegExp(`\\{\\{\\s*${variableName}\\s*\\}\\}`, 'g');
      processedBody = processedBody.replace(variablePattern, value);
    }
    
    // Look for any remaining unreplaced variables and handle them
    const remainingVariables = [...processedBody.matchAll(/\{\{([^}]+)\}\}/g)];
    if (remainingVariables.length > 0) {
      console.log(`Template still has ${remainingVariables.length} unfilled variables`);
      
      // Replace remaining variables with appropriate default values or blank spaces
      for (const match of remainingVariables) {
        const variableName = match[1].trim();
        let defaultValue = '';
        
        // Set sensible defaults for common variable types
        if (variableName.includes('name')) {
          defaultValue = 'valued customer';
        } else if (variableName.includes('date')) {
          defaultValue = new Date().toLocaleDateString();
        } else if (variableName.includes('time')) {
          defaultValue = new Date().toLocaleTimeString();
        }
        
        const variablePattern = new RegExp(`\\{\\{\\s*${variableName}\\s*\\}\\}`, 'g');
        processedBody = processedBody.replace(variablePattern, defaultValue);
      }
    }
    
    return processedBody;
  } catch (error) {
    console.error("Error processing template:", error);
    return template.body; // Return original template body if processing fails
  }
}

/**
 * Extracts variable values from email content using AI
 */
async function extractVariablesFromContent(
  variableNames: string[],
  emailContent: {
    from: string;
    subject: string;
    body: string;
    to?: string;
  },
  userId: number
): Promise<ExtractedVariables> {
  // Build a prompt for OpenAI to extract variables
  const prompt = `
    Extract the following variables from this email:
    ${variableNames.map(name => `- ${name}`).join('\n')}
    
    Email:
    From: ${emailContent.from}
    Subject: ${emailContent.subject}
    Body: ${emailContent.body}
    
    Return ONLY a JSON object with the variable names as keys and extracted values as values.
    For example: {"customer_name": "John Smith", "order_number": "12345"}
    If you cannot extract a variable, use null as its value.
  `;
  
  try {
    const aiResponse = await createChatCompletion([
      { 
        role: "system", 
        content: "You are a data extraction assistant. Extract specific variables from emails accurately and return them as JSON." 
      },
      { role: "user", content: prompt }
    ], true); // Set to true to get JSON response
    
    if (!aiResponse.success) {
      console.error("Failed to extract variables with AI");
      return {};
    }
    
    try {
      // Parse the JSON response
      const extractedData = JSON.parse(aiResponse.content);
      
      // Validate the response has the expected structure
      const result: ExtractedVariables = {};
      for (const variableName of variableNames) {
        if (extractedData[variableName] !== undefined && extractedData[variableName] !== null) {
          result[variableName] = extractedData[variableName];
        }
      }
      
      return result;
    } catch (parseError) {
      console.error("Error parsing AI response for variable extraction:", parseError);
      return {};
    }
  } catch (error) {
    console.error("Error extracting variables:", error);
    return {};
  }
}

/**
 * Processes conditional sections in template
 * Supports basic {{#if variable}}content{{else}}alternative{{/if}} syntax
 */
export function processConditionalSections(
  templateBody: string,
  variables: Record<string, any>
): string {
  // Pattern to match conditional blocks {{#if variable}}content{{else}}alternative{{/if}}
  const conditionalPattern = /\{\{#if\s+([^}]+)\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{\/if\}\}/gs;
  
  // Replace each conditional block
  return templateBody.replace(conditionalPattern, (match, condition, trueContent, falseContent = '') => {
    // Evaluate the condition
    const conditionMet = evaluateCondition(condition, variables);
    
    // Return appropriate content
    return conditionMet ? trueContent : falseContent;
  });
}

/**
 * Evaluates a condition expression against variables
 */
function evaluateCondition(condition: string, variables: Record<string, any>): boolean {
  // Simple condition evaluation for now
  // Just checks if the variable exists and is truthy
  const conditionParts = condition.trim().split(/\s+/);
  const variableName = conditionParts[0];
  
  if (conditionParts.length === 1) {
    // Simple variable existence/truthiness check
    return !!variables[variableName];
  }
  
  // Basic comparison operations
  if (conditionParts.length === 3) {
    const [left, operator, right] = conditionParts;
    const leftValue = variables[left] || left;
    // Try to parse right value from variables, fallback to literal
    const rightValue = variables[right] || right;
    
    switch (operator) {
      case '==':
        return leftValue == rightValue;
      case '!=':
        return leftValue != rightValue;
      case '>':
        return leftValue > rightValue;
      case '<':
        return leftValue < rightValue;
      case '>=':
        return leftValue >= rightValue;
      case '<=':
        return leftValue <= rightValue;
    }
  }
  
  // Default to false for unsupported conditions
  return false;
}

/**
 * Creates a final response by personalizing template and adding AI enhancements
 */
export async function createEnhancedResponse(
  template: EmailTemplate | null,
  emailContent: {
    from: string;
    subject: string;
    body: string;
    to?: string;
  },
  userId: number
): Promise<string> {
  // If no template was found, generate a response from scratch
  if (!template) {
    // Generate a complete response using only AI
    const aiResponse = await createChatCompletion([
      { 
        role: "system", 
        content: `You are an AI Receptionist responding to an email. Respond professionally and helpfully.` 
      },
      { 
        role: "user", 
        content: `From: ${emailContent.from}\nTo: ${emailContent.to || 'info@example.com'}\nSubject: ${emailContent.subject}\n\nBody: ${emailContent.body}` 
      }
    ]);
    
    return aiResponse.success ? aiResponse.content : "Thank you for your email. We will review it and get back to you shortly.";
  }
  
  // First, process template with variable substitution
  let processedResponse = await processTemplate(template, emailContent, userId);
  
  // Enhance the template with AI to make it more contextual and personalized
  const enhancementPrompt = `
    I have a draft email response below that needs enhancement:
    
    DRAFT RESPONSE:
    ${processedResponse}
    
    ORIGINAL EMAIL:
    From: ${emailContent.from}
    Subject: ${emailContent.subject}
    Body: ${emailContent.body}
    
    Please enhance the draft response to make it more personalized and contextual
    while keeping the core message and structure the same.
    Make minor adjustments only to improve flow and personalization.
    Do not add new paragraphs or change the meaning.
  `;
  
  const enhancedResponse = await createChatCompletion([
    { 
      role: "system", 
      content: "You are an email assistant that makes minor enhancements to draft emails." 
    },
    { role: "user", content: enhancementPrompt }
  ]);
  
  // Return the enhanced response, or the processed template if enhancement fails
  return enhancedResponse.success ? enhancedResponse.content : processedResponse;
}

/**
 * Main function to generate an email response using templates and AI
 */
export async function generateEmailResponse(
  emailContent: {
    from: string;
    subject: string;
    body: string;
    to?: string;
  },
  intents: string[],
  userId: number
): Promise<string> {
  try {
    // Step 1: Select the best matching template
    const bestTemplate = await selectBestTemplate(intents, emailContent, userId);
    
    // Log the selected template
    if (bestTemplate) {
      console.log(`Selected template: "${bestTemplate.name}" (id: ${bestTemplate.id})`);
    } else {
      console.log("No suitable template found, will generate response from scratch");
    }
    
    // Step 2: Create enhanced response based on template
    const finalResponse = await createEnhancedResponse(bestTemplate, emailContent, userId);
    
    return finalResponse;
  } catch (error) {
    console.error("Error generating email response:", error);
    return "Thank you for your email. We will review it and get back to you shortly.";
  }
}