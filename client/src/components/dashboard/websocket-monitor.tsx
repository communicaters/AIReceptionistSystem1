import { useEffect, useState } from "react";
import { useWebSocketContext } from "@/components/providers/websocket-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivitySquare, CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function WebSocketMonitor() {
  const { connected, sessionId, messages } = useWebSocketContext();
  const [stats, setStats] = useState({
    messagesReceived: 0,
    lastMessage: "",
    uptime: 0,
    reconnects: 0,
    lastReconnect: null as Date | null,
  });
  
  const [startTime] = useState(new Date());
  
  // Update uptime every second
  useEffect(() => {
    const interval = setInterval(() => {
      const uptime = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      setStats(prev => ({ ...prev, uptime }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);
  
  // Track messages and connection changes
  useEffect(() => {
    if (messages.length > 0) {
      setStats(prev => ({
        ...prev,
        messagesReceived: messages.length,
        lastMessage: new Date().toLocaleTimeString(),
      }));
    }
  }, [messages]);
  
  // Track reconnections
  useEffect(() => {
    if (connected) {
      setStats(prev => ({
        ...prev,
        reconnects: prev.reconnects + (prev.lastReconnect ? 1 : 0),
        lastReconnect: new Date(),
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
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">WebSocket Connection Status</CardTitle>
          {connected ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Disconnected
            </Badge>
          )}
        </div>
        <CardDescription>
          {sessionId ? `Session ID: ${sessionId}` : "No active session"}
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
              <span>Messages Received</span>
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
          
          {stats.lastMessage && (
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-muted-foreground">
                <span>Last Activity</span>
              </div>
              <span className="text-sm font-medium">{stats.lastMessage}</span>
            </div>
          )}
          
          <div className="pt-2">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm text-muted-foreground">Connection Health</span>
              <span className="text-xs font-medium">
                {connected ? '100%' : '0%'}
              </span>
            </div>
            <Progress value={connected ? 100 : 0} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}