import { WebSocket } from 'ws';

const sessionId = `test_session_${Date.now()}`;
const url = 'ws://localhost:5000/ws';
const ws = new WebSocket(url);

ws.on('open', function() {
  console.log(`Connected to WebSocket server with sessionId: ${sessionId}`);
  
  // Send initialization message
  ws.send(JSON.stringify({
    type: 'init',
    sessionId: sessionId,
    data: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890'
    }
  }));
  
  // Wait a bit and then send test message
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'message',
      sessionId: sessionId,
      content: 'tell me about your company'
    }));
    console.log('Sent test message: "tell me about your company"');
  }, 2000);
});

ws.on('message', function(data) {
  try {
    const message = JSON.parse(data.toString());
    console.log('Received message:', message);
    
    // Print AI response
    if (message.type === 'message' && message.role === 'assistant') {
      console.log('\nAI RESPONSE:');
      console.log('=============');
      console.log(message.content);
      console.log('=============\n');
      
      // Close after we get a response
      setTimeout(() => {
        console.log('Test complete, closing connection');
        ws.close();
      }, 1000);
    }
  } catch (err) {
    console.error('Error parsing message:', err);
  }
});

ws.on('error', function(error) {
  console.error('WebSocket error:', error);
});

// Exit after 15 seconds if no response
setTimeout(() => {
  console.log('Timeout reached, exiting');
  process.exit(0);
}, 15000);
