import WebSocket from 'ws';

console.log('Testing Embedded Chat Widget API');

// Create WebSocket connection using the embed chat protocol
const ws = new WebSocket('ws://localhost:5000/ws');

// Track the current session ID
let sessionId = null;

// Connection opened
ws.on('open', function() {
  console.log('Connected to WebSocket server');
  
  // First message to initialize the session
  const initialMsg = {
    type: 'init',
    data: {
      hostname: 'test-site.com',
      startMessage: 'What company do you work for?'
    }
  };
  
  console.log('Sending initialization message');
  ws.send(JSON.stringify(initialMsg));
});

// Listen for messages
ws.on('message', function(data) {
  try {
    const response = JSON.parse(data);
    console.log('Received:', response.type);
    
    if (response.type === 'welcome') {
      console.log('Session established:', response.sessionId);
      sessionId = response.sessionId;
      
      // After we get the welcome message, send our test question
      setTimeout(() => {
        const messageData = {
          type: 'message',
          sessionId: sessionId,
          message: 'What company do you work for?'
        };
        console.log('Sending company question');
        ws.send(JSON.stringify(messageData));
      }, 1000);
    }
    
    if (response.type === 'message' && response.role === 'assistant') {
      console.log('\nCompany Name Test Results:');
      console.log('-------------------------');
      console.log('Response:', response.content);
      
      // Check if response mentions the company name
      const companyNameMatches = [
        response.content.includes('TechSolutions'),
        response.content.includes('RedRay')
      ];
      
      if (companyNameMatches[0]) {
        console.log('✓ Company name detected: TechSolutions Inc.');
      } else if (companyNameMatches[1]) {
        console.log('✓ Company name detected: RedRay solutions');
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
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

// Handle connection issues
ws.on('error', function(error) {
  console.error('WebSocket Error:', error);
});

// Set timeout to avoid hanging forever
setTimeout(() => {
  console.error('Test timed out after 20 seconds');
  process.exit(1);
}, 20000);
