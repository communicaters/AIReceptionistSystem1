const WebSocket = require('ws');

const client = new WebSocket('ws://localhost:5000/ws');
const sessionId = 'test_session_' + Date.now();

client.on('open', function() {
  console.log('Connected to AI receptionist WebSocket server');
  
  // Send a chat message asking about company services
  setTimeout(() => {
    console.log('Sending chat message...');
    client.send(JSON.stringify({
      type: 'user_message',
      sessionId: sessionId,
      content: 'What services does your company offer?'
    }));
  }, 1000);
});

client.on('message', function(data) {
  try {
    const message = JSON.parse(data);
    console.log('Received message type:', message.type);
    
    if (message.type === 'error') {
      console.log('Error message:', message.message);
    } else if (message.type === 'welcome') {
      console.log('Welcome message received, session ID:', message.sessionId);
    } else if (message.type === 'message' && message.role === 'assistant') {
      console.log('\nAI Response:');
      console.log('============');
      console.log(message.content);
      console.log('============\n');
    } else {
      console.log('Full message:', message);
    }
  } catch (err) {
    console.error('Error parsing message:', err);
    console.log('Raw data:', data);
  }
});

client.on('error', function(error) {
  console.error('WebSocket error:', error);
});

// Keep the connection open for 10 seconds
setTimeout(() => {
  console.log('Test complete, closing connection');
  client.close();
  process.exit(0);
}, 10000);
