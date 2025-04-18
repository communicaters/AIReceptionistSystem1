import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WebSocketMessage, websocketService, MessageType } from '@/lib/websocket';

interface WebSocketContextType {
  connected: boolean;
  sessionId: string | null;
  messages: WebSocketMessage[];
  sendChatMessage: (message: string, type?: MessageType) => boolean;
  sendUserInfo: (userInfo: any) => boolean;  
  sendStatusUpdate: (moduleId: string, status: string) => boolean;
  clearMessages: () => void;
  getSessionId: () => string | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const { toast } = useToast();

  // Handle incoming messages
  const handleMessage = useCallback((data: WebSocketMessage) => {
    // Update session ID if it's a welcome message
    if (data.type === 'welcome' && data.sessionId) {
      setSessionId(data.sessionId);
    }
    
    // Handle error messages with toasts
    if (data.type === 'error') {
      toast({
        title: 'WebSocket Error',
        description: data.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    }
    
    // Add the message to our state
    setMessages((prevMessages) => [...prevMessages, data]);
  }, [toast]);
  
  // Handle connection status changes
  const handleConnectionStatus = useCallback((isConnected: boolean) => {
    setConnected(isConnected);
    
    if (isConnected) {
      // When connected, get the session ID
      const currentSessionId = websocketService.getSessionId();
      if (currentSessionId) {
        setSessionId(currentSessionId);
      }
    }
  }, []);
  
  // Set up WebSocket listeners
  useEffect(() => {
    // Register listeners
    const removeMessageListener = websocketService.addMessageListener(handleMessage);
    const removeStatusListener = websocketService.addConnectionStatusListener(handleConnectionStatus);
    
    // Listen for local messages (for immediate user message display)
    const handleLocalMessage = (event: CustomEvent) => {
      setMessages((prevMessages) => [...prevMessages, event.detail]);
    };
    
    // Add event listener for local messages
    window.addEventListener('local-message', handleLocalMessage as EventListener);
    
    // Get initial values
    setConnected(websocketService.isConnected());
    setSessionId(websocketService.getSessionId());
    
    // Clean up listeners on unmount
    return () => {
      removeMessageListener();
      removeStatusListener();
      window.removeEventListener('local-message', handleLocalMessage as EventListener);
    };
  }, [handleMessage, handleConnectionStatus]);

  // Convenience method to send a chat message
  const sendChatMessage = useCallback((message: string, type: MessageType = 'chat'): boolean => {
    if (type === 'chat') {
      return websocketService.sendChatMessage(message);
    } else {
      return websocketService.sendMessage(type, { message });
    }
  }, []);
  
  // Convenience method to send a status update
  const sendStatusUpdate = useCallback((moduleId: string, status: string): boolean => {
    return websocketService.sendStatusUpdate(moduleId, status);
  }, []);
  
  // Clear messages method
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);
  
  // Convenience method to send user info data
  const sendUserInfo = useCallback((userInfo: any): boolean => {
    return websocketService.sendUserInfo(userInfo);
  }, []);
  
  // Get current session ID method
  const getSessionId = useCallback(() => {
    return websocketService.getSessionId();
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        connected,
        sessionId,
        messages,
        sendChatMessage,
        sendUserInfo,
        sendStatusUpdate,
        clearMessages,
        getSessionId
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}