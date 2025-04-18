#!/bin/bash

# Send a test WhatsApp message
curl -X POST "http://localhost:5000/api/whatsapp/webhook/zender" -H "Content-Type: application/x-www-form-urlencoded" -d "secret=5504ae432734b5374dee41807a880284714889bd&type=whatsapp&data[id]=3930&data[wid]=+447887147178&data[phone]=+923000047478&data[message]=what is the name of your company?&data[attachment]=0&data[timestamp]=1745002580"

# Wait for processing
sleep 2

# Check for specific log entries about loading training data
echo "Checking logs for training data retrieval..."
grep "Retrieved training data" /proc/$(pgrep -f "node.*tsx.*server")/fd/1 || echo "No training data retrieval logs found"

echo "Recent WhatsApp responses:"
echo "SELECT ml.id, ml.phone_number, ml.message, ml.direction FROM whatsapp_logs ml ORDER BY ml.id DESC LIMIT 2;" | psql $DATABASE_URL
