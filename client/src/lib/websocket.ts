import { toast } from "@/hooks/use-toast";
import { RetryStrategy } from "./retry-strategy";

export type MessageType = 'chat' | 'status' | 'welcome' | 'error' | 'moduleStatus' | 'ping' | 'pong' | 'user_info';

export interface WebSocketMessage {
  type: MessageType;
  message?: string;
  sessionId?: string;
  moduleId?: string;
  status?: string;
  timestamp?: string;
  details?: any;
  [key: string]: any;
}

// Constants
const PING_INTERVAL = 30000; // 30 seconds
const MAX_MISSED_PINGS = 2;

class WebSocketService {
  private socket: WebSocket | null = null;
  private retryStrategy: RetryStrategy;
  private messageListeners: Array<(data: WebSocketMessage) => void> = [];
  private connectionStatusListeners: Array<(connected: boolean) => void> = [];
  private sessionId: string | null = null;
  private isConnecting: boolean = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPongTime: number = 0;
  private missedPings: number = 0;
  private connectRequests: number = 0;

  constructor() {
    // Create retry strategy with exponential backoff
    this.retryStrategy = new RetryStrategy(10, 1000, 30000, true);
    
    // Initialize on class instantiation
    if (typeof window !== 'undefined') {
      this.connect();
      
      // Handle page visibility changes
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Handle offline/online status changes
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      
      // Handle before unload to cleanly close connection
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Reconnect if socket is closed when page becomes visible
      if (!this.isConnected()) {
        this.connect();
      } else {
        // Send a ping to make sure the connection is still alive
        this.sendPing();
      }
    }
  };
  
  private handleOnline = () => {
    console.log('Network is online. Attempting to reconnect WebSocket.');
    this.connect();
  };
  
  private handleOffline = () => {
    console.log('Network is offline. WebSocket will reconnect when online.');
    this.cleanupConnection(false);
    
    toast({
      title: "Network Offline",
      description: "Your internet connection appears to be offline. Reconnecting when available.",
      variant: "destructive",
    });
  };
  
  private handleBeforeUnload = () => {
    // Clean disconnect when page is unloaded
    this.disconnect();
  };

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // If we're in localhost or .replit domain, use relative path
    // If we have a sessionId, append it to the URL so the server can maintain the session
    let wsUrl = `${protocol}//${host}/ws`;
    
    // Add session ID if available
    if (this.sessionId) {
      wsUrl += `?sessionId=${encodeURIComponent(this.sessionId)}`;
    }
    
    console.log(`Building WebSocket URL: ${wsUrl}`);
    return wsUrl;
  }

  public async connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket connection already exists');
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    this.isConnecting = true;
    const requestId = ++this.connectRequests;
    console.log(`Connection attempt #${requestId}: Connecting to WebSocket server...`);

    try {
      await this.retryStrategy.execute(
        () => this.createWebSocketConnection(),
        (attempt, delay, error) => {
          console.log(`Connection attempt #${requestId}: Retry ${attempt} in ${Math.round(delay/1000)}s. Error: ${error.message}`);
          
          // Show toast only on the first few retries
          if (attempt <= 2) {
            toast({
              title: "Connection Retrying",
              description: `Reconnecting to server (attempt ${attempt})...`,
              variant: "default",
            });
          }
        }
      );
    } catch (error) {
      console.error(`Connection attempt #${requestId} failed after all retries:`, error);
      this.isConnecting = false;
      
      toast({
        title: "Connection Failed",
        description: "Unable to establish connection to the server. Please reload the page.",
        variant: "destructive",
      });
    }
  }
  
  private createWebSocketConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.getWebSocketUrl();
        this.socket = new WebSocket(wsUrl);
        
        // Set up WebSocket event handlers
        this.socket.onopen = () => {
          this.handleOpen();
          resolve();
        };
        
        this.socket.onmessage = this.handleMessage;
        
        this.socket.onclose = (event) => {
          this.handleClose(event);
          // Reject promise if this wasn't a normal closure
          if (event.code !== 1000) {
            reject(new Error(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`));
          }
        };
        
        this.socket.onerror = (event) => {
          this.handleError(event);
          reject(new Error('WebSocket connection error'));
        };
        
        // Set timeout for connection attempt
        setTimeout(() => {
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  private handleOpen = (): void => {
    console.log('WebSocket connection established');
    this.isConnecting = false;
    this.missedPings = 0;
    this.lastPongTime = Date.now();
    
    // Start the ping interval
    this.startPingInterval();
    
    // Notify all listeners that connection is established
    this.connectionStatusListeners.forEach(listener => listener(true));
  };

  private handleMessage = (event: MessageEvent): void => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      
      // Update last pong time for any message (all messages count as pongs)
      this.lastPongTime = Date.now();
      this.missedPings = 0;
      
      // Store session ID if it's a welcome message
      if (data.type === 'welcome' && data.sessionId) {
        this.sessionId = data.sessionId;
        console.log(`WebSocket session established: ${this.sessionId}`);
      }
      
      // Handle specific pong messages
      if (data.type === 'pong') {
        console.log('Received pong from server');
        return; // Don't pass pongs to listeners
      }
      
      // Notify all message listeners
      this.messageListeners.forEach(listener => listener(data));
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  private handleClose = (event: CloseEvent): void => {
    console.log(`WebSocket connection closed: Code ${event.code}, Reason: ${event.reason}`);
    this.cleanupConnection(event.code === 1000);
    
    // Notify all listeners that connection is closed
    this.connectionStatusListeners.forEach(listener => listener(false));
    
    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000 && event.code !== 1001) { // 1001 is going away (page navigation)
      this.connect();
    }
  };

  private handleError = (event: Event): void => {
    console.error('WebSocket error:', event);
    this.cleanupConnection(false);
    
    this.connectionStatusListeners.forEach(listener => listener(false));
  };
  
  private cleanupConnection(wasCleanClosure: boolean): void {
    this.isConnecting = false;
    
    // Stop ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Reset socket
    if (this.socket) {
      // Remove event handlers to prevent memory leaks
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      
      // Only attempt to close if it's not already closed
      if (this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.close(1000, 'Client disconnected deliberately');
        } catch (e) {
          console.error('Error closing WebSocket:', e);
        }
      }
      
      this.socket = null;
    }
    
    // Don't clear sessionId on clean closure, as we may want to reconnect to same session
    if (!wasCleanClosure) {
      this.sessionId = null;
    }
  }
  
  private startPingInterval(): void {
    // Clear any existing ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Set up new ping interval
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        // Check for missed pongs
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > PING_INTERVAL * MAX_MISSED_PINGS) {
          console.warn(`No pong received for ${timeSinceLastPong}ms. Reconnecting WebSocket.`);
          this.reconnect();
          return;
        }
        
        // Send ping
        this.sendPing();
        this.missedPings++;
      } else {
        // Connection is closed, attempt to reconnect
        this.connect();
      }
    }, PING_INTERVAL);
  }
  
  private sendPing(): void {
    if (this.isConnected()) {
      try {
        this.sendMessage('ping', { timestamp: Date.now() });
      } catch (error) {
        console.error('Error sending ping:', error);
      }
    }
  }
  
  private reconnect(): void {
    if (this.socket) {
      // Force close the socket if it's open
      try {
        this.socket.close();
      } catch (e) {
        console.error('Error closing socket before reconnect:', e);
      }
    }
    
    this.cleanupConnection(false);
    this.connect();
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
    
    // Initialize with current state
    listener(this.isConnected());
    
    // Return a function to remove this listener
    return () => {
      this.connectionStatusListeners = this.connectionStatusListeners.filter(l => l !== listener);
    };
  }

  public sendMessage(type: MessageType, data: any = {}): boolean {
    if (!this.isConnected()) {
      console.warn(`Cannot send message of type '${type}': WebSocket is not open`);
      
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
      
      if (this.socket) {
        this.socket.send(JSON.stringify(message));
        return true;
      }
      return false;
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

  public getConnectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.socket) return 'closed';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'closed';
    }
  }

  public disconnect(): void {
    // Clear all timers
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Abort any retry attempts
    this.retryStrategy.abort();

    // Clean up socket
    this.cleanupConnection(true);
    
    // Reset state
    this.sessionId = null;
    this.missedPings = 0;
    
    // Clean up event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();

// Create a React hook for using WebSocket
export function useWebSocket() {
  return websocketService;
}