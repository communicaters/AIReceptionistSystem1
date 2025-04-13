import { toast } from "@/hooks/use-toast";

export type MessageType = 'chat' | 'status' | 'welcome' | 'error' | 'moduleStatus';

export interface WebSocketMessage {
  type: MessageType;
  message?: string;
  sessionId?: string;
  moduleId?: string;
  status?: string;
  timestamp?: string;
  [key: string]: any;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number = 1000; // Start with 1 second
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageListeners: Array<(data: WebSocketMessage) => void> = [];
  private connectionStatusListeners: Array<(connected: boolean) => void> = [];
  private sessionId: string | null = null;
  private isConnecting: boolean = false;

  constructor() {
    // Initialize on class instantiation
    if (typeof window !== 'undefined') {
      this.connect();
      // Handle page visibility changes to reconnect when user returns to the tab
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Reconnect if socket is closed when page becomes visible
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.connect();
      }
    }
  };

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket connection already exists');
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    this.isConnecting = true;
    console.log('Connecting to WebSocket server...');

    try {
      const wsUrl = this.getWebSocketUrl();
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = this.handleOpen;
      this.socket.onmessage = this.handleMessage;
      this.socket.onclose = this.handleClose;
      this.socket.onerror = this.handleError;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleOpen = (): void => {
    console.log('WebSocket connection established');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = 1000;
    
    // Notify all listeners that connection is established
    this.connectionStatusListeners.forEach(listener => listener(true));
  };

  private handleMessage = (event: MessageEvent): void => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      
      // Store session ID if it's a welcome message
      if (data.type === 'welcome' && data.sessionId) {
        this.sessionId = data.sessionId;
        console.log(`WebSocket session established: ${this.sessionId}`);
      }
      
      // Notify all message listeners
      this.messageListeners.forEach(listener => listener(data));
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  private handleClose = (event: CloseEvent): void => {
    console.log(`WebSocket connection closed: Code ${event.code}, Reason: ${event.reason}`);
    this.isConnecting = false;
    
    // Notify all listeners that connection is closed
    this.connectionStatusListeners.forEach(listener => listener(false));
    
    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  };

  private handleError = (event: Event): void => {
    console.error('WebSocket error:', event);
    this.isConnecting = false;
    
    // Toast notification for connection error
    toast({
      title: "Connection Error",
      description: "Failed to connect to the server. Retrying...",
      variant: "destructive",
    });
  };

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${this.reconnectTimeout}ms`);
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        // Exponential backoff for reconnect timeout (max 30 seconds)
        this.reconnectTimeout = Math.min(30000, this.reconnectTimeout * 2);
        this.connect();
      }, this.reconnectTimeout);
    } else {
      console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);
      
      // Toast notification for failed reconnection
      toast({
        title: "Connection Failed",
        description: "Unable to establish connection to the server. Please reload the page.",
        variant: "destructive",
      });
    }
  }

  public addMessageListener(listener: (data: WebSocketMessage) => void): () => void {
    this.messageListeners.push(listener);
    
    // Return a function to remove this listener
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  public addConnectionStatusListener(listener: (connected: boolean) => void): () => void {
    this.connectionStatusListeners.push(listener);
    
    // Initialize with current state if socket exists
    if (this.socket) {
      listener(this.socket.readyState === WebSocket.OPEN);
    } else {
      listener(false);
    }
    
    // Return a function to remove this listener
    return () => {
      this.connectionStatusListeners = this.connectionStatusListeners.filter(l => l !== listener);
    };
  }

  public sendMessage(type: MessageType, data: any = {}): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket is not open');
      
      // Attempt to reconnect if socket is closed
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.connect();
      }
      
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        ...data,
      };
      
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  public sendChatMessage(message: string): boolean {
    return this.sendMessage('chat', { message });
  }

  public sendStatusUpdate(moduleId: string, status: string): boolean {
    return this.sendMessage('status', { moduleId, status });
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  public isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      // Remove all event listeners
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      
      // Close the connection if it's open
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close(1000, "Client disconnected");
      }
      
      this.socket = null;
    }

    // Clean up page visibility event listener
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();

// Create a React hook for using WebSocket
export function useWebSocket() {
  return websocketService;
}