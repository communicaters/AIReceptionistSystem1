const WebSocket = require('ws');
const sessionId = 'test_session_' + Date.now();
const url = 'ws://localhost:5000/ws';

const ws = new WebSocket(url);

ws.on('open', function() {
    console.log('Connected to server');
    
    // Step 1: Send client info
    ws.send(JSON.stringify({
        type: 'client_info',
        sessionId: sessionId,
        clientInfo: {
            browser: 'test_client',
            os: 'test_os',
            device: 'test_device',
            ip: '127.0.0.1',
            userAgent: 'test_agent'
        }
    }));
    
    // Step 2: After a small delay, send pre-chat form
    setTimeout(() => {
        console.log('Sending pre-chat form');
        ws.send(JSON.stringify({
            type: 'pre_chat_form',
            sessionId: sessionId,
            formData: {
                name: 'Test User',
                email: 'test@example.com',
                phone: '1234567890'
            }
        }));
        
        // Step 3: After another delay, send a message
        setTimeout(() => {
            console.log('Sending test message');
            ws.send(JSON.stringify({
                type: 'chat_message',
                sessionId: sessionId,
                message: 'tell me about your company'
            }));
        }, 1000);
    }, 1000);
});

ws.on('message', function(data) {
    const message = JSON.parse(data);
    console.log('Received:', message);
    
    // If we get a response to our company question, close the connection
    if (message.type === 'chat_message' && message.role === 'assistant') {
        console.log('AI Response:', message.content);
        
        // Wait a bit then close
        setTimeout(() => {
            console.log('Test complete, closing connection');
            ws.close();
        }, 1000);
    }
});

ws.on('error', function(error) {
    console.error('WebSocket error:', error);
});

// Keep the process running for 10 seconds to allow all messages to be processed
setTimeout(() => {
    process.exit(0);
}, 10000);
