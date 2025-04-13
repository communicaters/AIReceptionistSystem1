import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { websocketService, WebSocketMessage } from "@/lib/websocket";

interface WebSocketContextType {
  connected: boolean;
  sessionId: string | null;
  messages: WebSocketMessage[];
  sendChatMessage: (message: string) => boolean;
  sendStatusUpdate: (moduleId: string, status: string) => boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const { toast } = useToast();

  // Handle connection status changes
  useEffect(() => {
    const unsubscribe = websocketService.addConnectionStatusListener((isConnected) => {
      setConnected(isConnected);
      
      // Conditionally show toast messages
      if (isConnected) {
        setSessionId(websocketService.getSessionId());
        
        if (sessionId !== null) { // Only toast on reconnections, not initial connection
          toast({
            title: "Connection Restored",
            description: "Successfully reconnected to the server.",
            variant: "default",
          });
        }
      }
    });

    return unsubscribe;
  }, [sessionId, toast]);

  // Handle incoming messages
  useEffect(() => {
    const unsubscribe = websocketService.addMessageListener((data) => {
      // Update session ID from welcome message
      if (data.type === 'welcome' && data.sessionId) {
        setSessionId(data.sessionId);
      }
      
      // Add message to the messages array
      setMessages(prev => [...prev, data]);
      
      // Handle error messages with toast
      if (data.type === 'error') {
        toast({
          title: "Error",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    });

    return unsubscribe;
  }, [toast]);

  // Attempt reconnection if disconnected
  useEffect(() => {
    if (!connected && sessionId) {
      // Only attempt to reconnect if we had a previous session
      const reconnectInterval = setInterval(() => {
        if (!websocketService.isConnected()) {
          websocketService.connect();
        } else {
          clearInterval(reconnectInterval);
        }
      }, 5000); // Try every 5 seconds
      
      return () => clearInterval(reconnectInterval);
    }
  }, [connected, sessionId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // No need to disconnect on unmount as we want to maintain the connection
      // across page navigations, but we'll clean up the context
    };
  }, []);

  // Context value
  const value = {
    connected,
    sessionId,
    messages,
    sendChatMessage: websocketService.sendChatMessage.bind(websocketService),
    sendStatusUpdate: websocketService.sendStatusUpdate.bind(websocketService),
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}