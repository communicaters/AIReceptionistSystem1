#!/bin/bash

# Shell script wrapper for the rebuild AI knowledge process (using fixed version)
# Usage: ./rebuild-ai-knowledge-fixed.sh

echo "Starting AI knowledge rebuild process with fixed scripts..."
npx tsx scripts/rebuild-ai-knowledge-fixed.ts

if [ $? -eq 0 ]; then
  echo "✅ AI knowledge rebuild completed successfully!"
else
  echo "❌ AI knowledge rebuild failed. Check the logs for details."
  exit 1
fi