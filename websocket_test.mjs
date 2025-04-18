import WebSocket from 'ws';

console.log('WebSocket Test - Testing AI Receptionist Chat');

// Get the hostname from the replit environment
const hostname = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'localhost:5000';
const wsProtocol = hostname.includes('repl.co') ? 'wss' : 'ws';
const wsUrl = `${wsProtocol}://${hostname}/ws`;

console.log(`Connecting to WebSocket at ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('Connection established');
  
  // Wait for welcome message
  setTimeout(() => {
    console.log('Sending chat message...');
    ws.send(JSON.stringify({
      type: 'chat',
      message: 'Hello, I would like to know about your company.'
    }));
  }, 1000);
});

ws.on('message', function incoming(data) {
  try {
    const message = JSON.parse(data);
    console.log('Received:', message.type);
    
    if (message.type === 'chat') {
      console.log('Response:', message.message);
      
      // Close connection after receiving a chat response
      setTimeout(() => {
        console.log('Test complete, closing connection');
        ws.close();
      }, 1000);
    } else if (message.type === 'welcome') {
      console.log('Welcome message received, session ID:', message.sessionId);
      
      // Send user info after welcome
      setTimeout(() => {
        console.log('Sending user info...');
        ws.send(JSON.stringify({
          type: 'user_info',
          data: {
            fullName: 'Test User',
            emailAddress: 'test@example.com',
            mobileNumber: '123-456-7890'
          }
        }));
      }, 500);
    } else if (message.type === 'user_info_ack') {
      console.log('User info acknowledged, updated:', message.updated);
    }
  } catch (e) {
    console.error('Error parsing message:', e);
    console.log('Raw message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('WebSocket Error:', err);
});

ws.on('close', function close() {
  console.log('Connection closed');
  process.exit(0);
});

// Force exit after 30 seconds in case something hangs
setTimeout(() => {
  console.log('Test timed out after 30 seconds');
  process.exit(1);
}, 30000);