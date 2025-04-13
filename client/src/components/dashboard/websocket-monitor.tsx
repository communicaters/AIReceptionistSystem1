import { useEffect, useState, useCallback } from "react";
import { useWebSocketContext } from "@/components/providers/websocket-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ActivitySquare, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  XCircle, 
  Cpu, 
  PlugZap, 
  Wifi, 
  AlertTriangle, 
  RotateCw 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useWebSocket } from "@/lib/websocket";
import ErrorBoundary from "@/components/error-boundary";

export function WebSocketMonitor() {
  const { connected, sessionId, messages } = useWebSocketContext();
  const websocketService = useWebSocket();
  
  const [stats, setStats] = useState({
    messagesReceived: 0,
    lastMessage: "",
    uptime: 0,
    reconnects: 0,
    lastReconnect: null as Date | null,
    connectionState: 'unknown' as 'unknown' | 'connecting' | 'open' | 'closing' | 'closed',
    ping: null as number | null,
    errorCount: 0,
    connectionHealth: 100,
  });
  
  const [startTime] = useState(new Date());
  const [pingTimestamp, setPingTimestamp] = useState<number | null>(null);
  
  // Handle manual reconnection
  const handleReconnect = useCallback(() => {
    websocketService.disconnect();
    setTimeout(() => {
      websocketService.connect();
    }, 500);
  }, [websocketService]);
  
  // Send ping to measure latency
  const sendPing = useCallback(() => {
    if (connected) {
      setPingTimestamp(Date.now());
      websocketService.sendMessage('ping', { timestamp: Date.now() });
    }
  }, [connected, websocketService]);
  
  // Update uptime every second
  useEffect(() => {
    const interval = setInterval(() => {
      const uptime = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      
      // Get current connection state
      const connectionState = websocketService.getConnectionState();
      
      // Gradually decrease connection health if disconnected
      let connectionHealth = stats.connectionHealth;
      if (!connected) {
        connectionHealth = Math.max(0, connectionHealth - 5);
      } else if (connectionHealth < 100) {
        connectionHealth = Math.min(100, connectionHealth + 5);
      }
      
      setStats(prev => ({ 
        ...prev, 
        uptime,
        connectionState,
        connectionHealth
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime, connected, stats.connectionHealth, websocketService]);
  
  // Measure ping every 5 seconds
  useEffect(() => {
    if (connected) {
      const pingInterval = setInterval(() => {
        sendPing();
      }, 5000);
      
      return () => clearInterval(pingInterval);
    }
  }, [connected, sendPing]);
  
  // Track messages and connection changes
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // If this is a pong message and we have a ping timestamp, calculate latency
      if (lastMessage.type === 'pong' && pingTimestamp) {
        const latency = Date.now() - pingTimestamp;
        setPingTimestamp(null);
        setStats(prev => ({
          ...prev,
          ping: latency,
        }));
      }
      
      // Count errors
      if (lastMessage.type === 'error') {
        setStats(prev => ({
          ...prev,
          errorCount: prev.errorCount + 1,
        }));
      }
      
      setStats(prev => ({
        ...prev,
        messagesReceived: messages.length,
        lastMessage: new Date().toLocaleTimeString(),
      }));
    }
  }, [messages, pingTimestamp]);
  
  // Track reconnections
  useEffect(() => {
    if (connected) {
      setStats(prev => {
        // Only increment if we were previously disconnected
        const shouldIncrement = prev.lastReconnect !== null;
        return {
          ...prev,
          reconnects: shouldIncrement ? prev.reconnects + 1 : prev.reconnects,
          lastReconnect: new Date(),
        };
      });
    } else {
      // Mark that we've been disconnected
      setStats(prev => ({
        ...prev,
        lastReconnect: prev.lastReconnect === null ? new Date() : prev.lastReconnect,
      }));
    }
  }, [connected]);
  
  // Format uptime in a human-readable format
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Get status badge based on connection state
  const getStatusBadge = () => {
    if (connected) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Connected
        </Badge>
      );
    }
    
    if (stats.connectionState === 'connecting') {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
          <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
          Connecting
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
        <XCircle className="h-3.5 w-3.5 mr-1" />
        Disconnected
      </Badge>
    );
  };
  
  // Get connection health color
  const getHealthColor = () => {
    // Only apply the color to the progress bar
    if (stats.connectionHealth > 80) return "[&>div]:bg-green-500";
    if (stats.connectionHealth > 40) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
  };
  
  // Wrap the whole component in an error boundary to catch any rendering errors
  return (
    <ErrorBoundary>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">WebSocket Connection Status</CardTitle>
            {getStatusBadge()}
          </div>
          <CardDescription>
            {sessionId ? (
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                <span className="truncate">Session: {sessionId}</span>
              </div>
            ) : (
              "No active session"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                <span>Uptime</span>
              </div>
              <span className="text-sm font-medium">{formatUptime(stats.uptime)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-muted-foreground">
                <ActivitySquare className="h-4 w-4 mr-1" />
                <span>Messages</span>
              </div>
              <span className="text-sm font-medium">{stats.messagesReceived}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 mr-1" />
                <span>Reconnections</span>
              </div>
              <span className="text-sm font-medium">{stats.reconnects}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-muted-foreground">
                <PlugZap className="h-4 w-4 mr-1" />
                <span>Ping</span>
              </div>
              <span className="text-sm font-medium">
                {stats.ping !== null ? `${stats.ping}ms` : 'N/A'}
              </span>
            </div>
            
            {stats.errorCount > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" />
                  <span>Errors</span>
                </div>
                <span className="text-sm font-medium text-yellow-600">{stats.errorCount}</span>
              </div>
            )}
            
            {stats.lastMessage && (
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Wifi className="h-4 w-4 mr-1" />
                  <span>Last Activity</span>
                </div>
                <span className="text-sm font-medium">{stats.lastMessage}</span>
              </div>
            )}
            
            <div className="pt-2">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-muted-foreground">Connection Health</span>
                <span className="text-xs font-medium">
                  {stats.connectionHealth}%
                </span>
              </div>
              <Progress 
                value={stats.connectionHealth} 
                className={`h-2 ${getHealthColor()}`}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-1.5" 
            onClick={handleReconnect}
            disabled={stats.connectionState === 'connecting'}
          >
            <RotateCw className="h-3.5 w-3.5" />
            {stats.connectionState === 'connecting' ? 'Connecting...' : 'Force Reconnect'}
          </Button>
        </CardFooter>
      </Card>
    </ErrorBoundary>
  );
}