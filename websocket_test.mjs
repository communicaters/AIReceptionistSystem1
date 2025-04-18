import WebSocket from 'ws';

console.log('WebSocket Test - Testing AI Receptionist Chat with Pagination');

// Use direct localhost connection for testing
const wsUrl = 'ws://localhost:5000/ws';

console.log(`Connecting to WebSocket at ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('Connection established');
  
  // Wait for welcome message
  setTimeout(() => {
    console.log('Requesting active sessions with pagination...');
    ws.send(JSON.stringify({
      type: 'get_active_sessions',
      page: 1,
      pageSize: 10
    }));
  }, 1000);
});

ws.on('message', function incoming(data) {
  try {
    const message = JSON.parse(data);
    console.log('Received:', message.type);
    
    if (message.type === 'active_sessions') {
      console.log('Sessions:', message.sessions);
      console.log('Pagination:', message.pagination);
      
      // After receiving sessions, test the user info form
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
    } else if (message.type === 'welcome') {
      console.log('Welcome message received, session ID:', message.sessionId);
    } else if (message.type === 'user_info_ack') {
      console.log('User info acknowledged, updated:', message.updated);
      
      // Send a chat message
      setTimeout(() => {
        console.log('Sending chat message...');
        ws.send(JSON.stringify({
          type: 'chat',
          message: 'Hello, I would like to know about your company.'
        }));
      }, 500);
    } else if (message.type === 'chat') {
      console.log('Chat response:', message.message);
      
      // Test is complete, close connection
      setTimeout(() => {
        console.log('Test complete, closing connection');
        ws.close();
      }, 1000);
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