#!/bin/bash

# Send a test WhatsApp message asking about company name
curl -X POST "http://localhost:5000/api/whatsapp/webhook/zender" -H "Content-Type: application/x-www-form-urlencoded" -d "secret=5504ae432734b5374dee41807a880284714889bd&type=whatsapp&data[id]=3931&data[wid]=+447887147178&data[phone]=+923000047478&data[message]=What is the name of the company you work for?&data[attachment]=0&data[timestamp]=1745002700"

# Wait for processing
sleep 3

# Check the response
echo "Recent WhatsApp responses:"
echo "SELECT ml.id, ml.phone_number, ml.message, ml.direction FROM whatsapp_logs ml ORDER BY ml.id DESC LIMIT 2;" | psql $DATABASE_URL
