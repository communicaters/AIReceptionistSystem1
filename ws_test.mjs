import WebSocket from 'ws';

console.log('WebSocket Test - Testing Company Name Response');

// Create connection
const ws = new WebSocket('ws://localhost:5000/ws');

// Connection opened
ws.on('open', function() {
  console.log('Connected to WebSocket server');
  
  // Establish session and send the company name question
  const initialMsg = {
    type: 'chat_message', 
    data: { 
      message: 'What company do you work for?',
      sessionId: 'test_company_direct'
    }
  };
  
  console.log('Sending message:', JSON.stringify(initialMsg));
  ws.send(JSON.stringify(initialMsg));
});

// Listen for messages
ws.on('message', function(data) {
  const response = JSON.parse(data);
  console.log('Received response:', JSON.stringify(response, null, 2));
  
  if (response.type === 'chat_response') {
    console.log('\nCompany Name Test Results:');
    console.log('-------------------------');
    console.log('Response:', response.data.message);
    
    // Check if response mentions the company name
    const companyNameMatches = [
      response.data.message.includes('TechSolutions'),
      response.data.message.includes('RedRay')
    ];
    
    if (companyNameMatches[0]) {
      console.log('✓ Company name detected: TechSolutions');
    } else if (companyNameMatches[1]) {
      console.log('✓ Company name detected: RedRay');
    } else {
      console.log('✗ No recognized company name in response');
    }
    
    // Close the connection after we get our response
    setTimeout(() => {
      ws.close();
      console.log('Test complete. Connection closed.');
      process.exit(0);
    }, 1000);
  }
});

// Handle connection issues
ws.on('error', function(error) {
  console.error('WebSocket Error:', error);
  process.exit(1);
});

// Set timeout to avoid hanging forever
setTimeout(() => {
  console.error('Test timed out after 10 seconds');
  process.exit(1);
}, 10000);
