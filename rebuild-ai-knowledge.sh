#!/bin/bash

# Shell script wrapper for the rebuild AI knowledge process
# Usage: ./rebuild-ai-knowledge.sh

echo "Starting AI knowledge rebuild process..."
npx tsx scripts/rebuild-ai-knowledge.ts

if [ $? -eq 0 ]; then
  echo "✅ AI knowledge rebuild completed successfully!"
else
  echo "❌ AI knowledge rebuild failed. Check the logs for details."
  exit 1
fi