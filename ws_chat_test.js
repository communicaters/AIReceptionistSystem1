const WebSocket = require('ws');

// Create WebSocket connection to the server
const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', function open() {
  console.log('Connected to server');
  
  // Send a message
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      hostname: 'test.com'
    }
  }));
});

ws.on('message', function incoming(data) {
  console.log('Received:', data.toString());
  const message = JSON.parse(data);
  
  // If we received welcome message with session ID, send our test question
  if (message.type === 'welcome') {
    console.log('Session established, sending test message');
    const sessionId = message.sessionId;
    
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'message',
        sessionId: sessionId,
        message: 'What company do you work for?'
      }));
    }, 1000);
  }
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

// Close after 20 seconds
setTimeout(() => {
  console.log('Closing connection after timeout');
  ws.close();
  process.exit(0);
}, 20000);
