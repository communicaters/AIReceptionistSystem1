const WebSocket = require('ws');

// Create a WebSocket server to simulate a connection
const server = new WebSocket.Server({ port: 8081 });

// When a connection is established with our server
server.on('connection', function(ws) {
  console.log('Client connected to test server');
  
  // Just echo back messages for testing
  ws.on('message', function(message) {
    console.log('Received message:', message.toString());
    ws.send(message);
  });
});

// Connect to the AI receptionist server
const client = new WebSocket('ws://localhost:5000/ws');

// A unique session ID
const sessionId = 'test_session_' + Date.now();

client.on('open', function() {
  console.log('Connected to AI receptionist WebSocket');
  
  // Send a user message
  const message = JSON.stringify({
    type: 'user_message',
    content: 'Tell me about your company services',
    sessionId: sessionId
  });
  
  setTimeout(() => {
    console.log('Sending message:', message);
    client.send(message);
  }, 1000);
});

client.on('message', function(data) {
  const message = JSON.parse(data);
  console.log('Received from AI receptionist:', message);
  
  // If we get a response, close after a delay
  if (message.type === 'message' && message.role === 'assistant') {
    console.log('\nAI RESPONSE:');
    console.log('=============');
    console.log(message.content);
    console.log('=============\n');
    
    setTimeout(() => {
      console.log('Test complete, closing connections');
      client.close();
      server.close();
    }, 2000);
  }
});

client.on('error', function(error) {
  console.error('WebSocket error:', error);
});

// Keep the program running for up to 10 seconds
setTimeout(() => {
  console.log('Timeout reached, closing connections');
  try {
    client.close();
    server.close();
  } catch (err) {}
  process.exit(0);
}, 10000);
