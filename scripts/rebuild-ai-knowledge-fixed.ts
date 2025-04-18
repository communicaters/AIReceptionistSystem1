/**
 * Script to rebuild all AI knowledge by combining the training data reset
 * and intent map reset in a single operation.
 * 
 * Usage: npx tsx scripts/rebuild-ai-knowledge-fixed.ts
 */

import { spawn } from 'child_process';

console.log("Starting complete AI knowledge rebuild process...");
console.log("=============================================");

// Function to execute a TypeScript file using tsx
async function executeTsxScript(scriptPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${scriptPath}`);
    
    const process = spawn('npx', ['tsx', scriptPath], {
      stdio: 'inherit'
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully executed: ${scriptPath}`);
        resolve();
      } else {
        reject(new Error(`Script ${scriptPath} failed with code ${code}`));
      }
    });
    
    process.on('error', (err) => {
      reject(new Error(`Failed to start script ${scriptPath}: ${err.message}`));
    });
  });
}

// Main function to run scripts sequentially
async function rebuildAIKnowledge() {
  try {
    console.log("Step 1: Resetting training data...");
    await executeTsxScript('./scripts/reset-training-data-fixed.ts');
    
    console.log("Step 2: Resetting intent map...");
    await executeTsxScript('./scripts/reset-intent-map-fixed.ts');
    
    console.log("=============================================");
    console.log("AI knowledge rebuild completed successfully!");
    
    // Exit with success
    process.exit(0);
  } catch (error) {
    console.error("AI knowledge rebuild failed:", error);
    
    // Exit with error
    process.exit(1);
  }
}

// Execute the rebuild process
rebuildAIKnowledge();