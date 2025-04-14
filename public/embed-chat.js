/**
 * AI Receptionist Chat Widget Embed Script
 * Version: 1.0.0
 * 
 * This script creates an embeddable chat widget that can be added to any website.
 * It securely connects to the AI Receptionist server and maintains chat sessions.
 */

(function() {
  // Configuration - Replace with your actual server URL in production
  const SERVER_URL = window.AR_SERVER_URL || window.location.origin;
  const WIDGET_TITLE = window.AR_WIDGET_TITLE || "AI Receptionist";
  const PRIMARY_COLOR = window.AR_PRIMARY_COLOR || "#2563eb";
  const GREETING_MESSAGE = window.AR_GREETING_MESSAGE || "Hello! How can I assist you today?";

  // Session Management
  let sessionId = getSessionId();
  let socket = null;
  let connected = false;
  let chatHistory = [];
  let reconnectAttempts = 0;
  let reconnectTimeout = null;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  // Element references
  let widgetContainer = null;
  let chatContainer = null;
  let messagesContainer = null;
  let messageInput = null;
  
  // Create and inject the CSS
  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    styleEl.innerHTML = `
      .ar-chat-widget-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.5;
        box-sizing: border-box;
      }
      
      .ar-chat-bubble {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${PRIMARY_COLOR};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.2s ease;
      }
      
      .ar-chat-bubble:hover {
        transform: scale(1.05);
      }
      
      .ar-chat-window {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 350px;
        height: 500px;
        background-color: white;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
      }
      
      .ar-chat-window.active {
        opacity: 1;
        transform: translateY(0);
        pointer-events: all;
      }
      
      .ar-chat-header {
        background-color: ${PRIMARY_COLOR};
        color: white;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .ar-chat-title {
        font-weight: 600;
        font-size: 16px;
        margin: 0;
      }
      
      .ar-chat-controls {
        display: flex;
        gap: 8px;
      }
      
      .ar-chat-control {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.2);
        color: white;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
      }
      
      .ar-chat-control:hover {
        background-color: rgba(255, 255, 255, 0.3);
      }
      
      .ar-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .ar-chat-message {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 18px;
        font-size: 14px;
        position: relative;
        word-break: break-word;
      }
      
      .ar-chat-message.ai {
        background-color: #f0f1f4;
        color: #333;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
      }
      
      .ar-chat-message.user {
        background-color: ${PRIMARY_COLOR};
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }
      
      .ar-chat-timestamp {
        font-size: 10px;
        margin-top: 4px;
        opacity: 0.7;
      }
      
      .ar-chat-footer {
        padding: 12px;
        border-top: 1px solid #e5e7eb;
      }
      
      .ar-chat-input-container {
        display: flex;
        gap: 8px;
      }
      
      .ar-chat-input {
        flex: 1;
        padding: 10px 14px;
        border-radius: 24px;
        border: 1px solid #e5e7eb;
        outline: none;
        font-size: 14px;
      }
      
      .ar-chat-input:focus {
        border-color: ${PRIMARY_COLOR};
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
      }
      
      .ar-chat-send {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: ${PRIMARY_COLOR};
        color: white;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .ar-chat-send:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
      
      .ar-connection-status {
        font-size: 12px;
        text-align: center;
        padding: 6px;
        background-color: #fee2e2;
        color: #b91c1c;
        border-radius: 4px;
        margin-bottom: 8px;
      }
      
      @media (max-width: 480px) {
        .ar-chat-window {
          width: calc(100vw - 40px);
          height: 60vh;
          bottom: 70px;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }
  
  // Initialize the chat widget
  function initWidget() {
    // Only create the widget if it doesn't exist yet
    if (document.querySelector('.ar-chat-widget-container')) {
      return;
    }
    
    // Inject styles
    injectStyles();
    
    // Create widget container
    widgetContainer = document.createElement('div');
    widgetContainer.className = 'ar-chat-widget-container';
    
    // Create chat bubble
    const chatBubble = document.createElement('div');
    chatBubble.className = 'ar-chat-bubble';
    chatBubble.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    chatBubble.addEventListener('click', toggleChat);
    
    // Create chat window
    chatContainer = document.createElement('div');
    chatContainer.className = 'ar-chat-window';
    
    // Create chat header
    const chatHeader = document.createElement('div');
    chatHeader.className = 'ar-chat-header';
    
    const chatTitle = document.createElement('h3');
    chatTitle.className = 'ar-chat-title';
    chatTitle.textContent = WIDGET_TITLE;
    
    const chatControls = document.createElement('div');
    chatControls.className = 'ar-chat-controls';
    
    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'ar-chat-control';
    minimizeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    minimizeBtn.addEventListener('click', toggleChat);
    
    chatControls.appendChild(minimizeBtn);
    chatHeader.appendChild(chatTitle);
    chatHeader.appendChild(chatControls);
    
    // Create messages container
    messagesContainer = document.createElement('div');
    messagesContainer.className = 'ar-chat-messages';
    
    // Create chat footer with input
    const chatFooter = document.createElement('div');
    chatFooter.className = 'ar-chat-footer';
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'ar-chat-input-container';
    
    messageInput = document.createElement('input');
    messageInput.className = 'ar-chat-input';
    messageInput.type = 'text';
    messageInput.placeholder = 'Type your message...';
    messageInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    const sendButton = document.createElement('button');
    sendButton.className = 'ar-chat-send';
    sendButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
    sendButton.addEventListener('click', sendMessage);
    
    inputContainer.appendChild(messageInput);
    inputContainer.appendChild(sendButton);
    chatFooter.appendChild(inputContainer);
    
    // Assemble the chat window
    chatContainer.appendChild(chatHeader);
    chatContainer.appendChild(messagesContainer);
    chatContainer.appendChild(chatFooter);
    
    // Add everything to the widget container
    widgetContainer.appendChild(chatContainer);
    widgetContainer.appendChild(chatBubble);
    
    // Add widget to the page
    document.body.appendChild(widgetContainer);
    
    // Initialize WebSocket connection
    initWebSocket();
    
    // Add greeting message
    addMessage({
      type: 'welcome',
      message: GREETING_MESSAGE,
      sender: 'ai',
      timestamp: new Date().toISOString()
    });
  }
  
  // Toggle chat window visibility
  function toggleChat() {
    chatContainer.classList.toggle('active');
    if (chatContainer.classList.contains('active')) {
      messageInput.focus();
      scrollToBottom();
    }
  }
  
  // Initialize WebSocket connection
  function initWebSocket() {
    // Close any existing connection
    if (socket) {
      socket.close();
    }
    
    // Get session ID from storage or create a new one
    if (!sessionId) {
      sessionId = generateSessionId();
      saveSessionId(sessionId);
    }
    
    // Determine WebSocket protocol based on page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = new URL('/ws', SERVER_URL);
    wsUrl.protocol = protocol;
    wsUrl.searchParams.append('sessionId', sessionId);
    
    try {
      socket = new WebSocket(wsUrl.toString());
      
      socket.onopen = function() {
        console.log('WebSocket connection established');
        connected = true;
        reconnectAttempts = 0;
        
        // Remove any connection status message
        const statusMsg = document.querySelector('.ar-connection-status');
        if (statusMsg) {
          statusMsg.remove();
        }
      };
      
      socket.onmessage = function(event) {
        const data = safeParseJson(event.data);
        if (!data) return;
        
        if (data.type === 'welcome' && data.sessionId) {
          // Update sessionId if the server provides a new one
          sessionId = data.sessionId;
          saveSessionId(sessionId);
        } else if (data.type === 'chat') {
          // Add message to chat
          addMessage(data);
        }
      };
      
      socket.onclose = function(event) {
        console.log('WebSocket connection closed:', event.code, event.reason);
        connected = false;
        
        // Add connection status message if the chat is open
        if (chatContainer.classList.contains('active')) {
          addConnectionStatus();
        }
        
        // Try to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
          reconnectTimeout = setTimeout(() => {
            initWebSocket();
          }, RECONNECT_DELAY * reconnectAttempts);
        }
      };
      
      socket.onerror = function(error) {
        console.error('WebSocket error:', error);
        connected = false;
        
        // Add connection status message if the chat is open
        if (chatContainer.classList.contains('active')) {
          addConnectionStatus();
        }
      };
      
      // Set up ping interval to keep connection alive
      setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);
      
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      connected = false;
      
      // Add connection status message if the chat is open
      if (chatContainer.classList.contains('active')) {
        addConnectionStatus();
      }
    }
  }
  
  // Send a message through the WebSocket
  function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !connected) return;
    
    // Create message object
    const messageObj = {
      type: 'chat',
      message: message,
      sender: 'user',
      timestamp: new Date().toISOString(),
      sessionId: sessionId
    };
    
    // Add message to chat immediately
    addMessage(messageObj);
    
    // Send to server
    try {
      socket.send(JSON.stringify(messageObj));
      messageInput.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error indicator to message
      const lastMessage = messagesContainer.lastChild;
      if (lastMessage) {
        lastMessage.style.opacity = '0.5';
        const errorMark = document.createElement('div');
        errorMark.textContent = '⚠️';
        errorMark.style.position = 'absolute';
        errorMark.style.right = '5px';
        errorMark.style.bottom = '5px';
        lastMessage.appendChild(errorMark);
      }
    }
  }
  
  // Add a message to the chat
  function addMessage(messageData) {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `ar-chat-message ${messageData.sender === 'user' ? 'user' : 'ai'}`;
    
    // Message text
    const messageText = document.createElement('div');
    messageText.textContent = messageData.message;
    
    // Message timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'ar-chat-timestamp';
    timestamp.textContent = formatTime(new Date(messageData.timestamp));
    
    // Assemble message
    messageEl.appendChild(messageText);
    messageEl.appendChild(timestamp);
    
    // Add to container
    messagesContainer.appendChild(messageEl);
    
    // Store in chat history
    chatHistory.push(messageData);
    
    // Scroll to bottom
    scrollToBottom();
  }
  
  // Add connection status message
  function addConnectionStatus() {
    // Remove any existing status message
    const existingStatus = document.querySelector('.ar-connection-status');
    if (existingStatus) {
      existingStatus.remove();
    }
    
    // Create new status message
    const statusEl = document.createElement('div');
    statusEl.className = 'ar-connection-status';
    statusEl.textContent = 'Connecting to server...';
    
    // Insert at the beginning of the messages container
    if (messagesContainer.firstChild) {
      messagesContainer.insertBefore(statusEl, messagesContainer.firstChild);
    } else {
      messagesContainer.appendChild(statusEl);
    }
  }
  
  // Helper function to scroll to bottom of messages
  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
  
  // Helper function to format time
  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Helper function to safely parse JSON
  function safeParseJson(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return null;
    }
  }
  
  // Session management helpers
  function getSessionId() {
    return localStorage.getItem('ar_chat_session_id') || null;
  }
  
  function saveSessionId(id) {
    localStorage.setItem('ar_chat_session_id', id);
  }
  
  function generateSessionId() {
    return `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }
  
  // Initialize the widget when the page is fully loaded
  if (document.readyState === 'complete') {
    initWidget();
  } else {
    window.addEventListener('load', initWidget);
  }
})();