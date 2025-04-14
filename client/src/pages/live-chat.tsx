import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChatLogs } from "@/lib/api";
import { ChatWidget } from "@/components/chat/chat-widget";
import { ChatProvider, useChatContext } from "@/components/providers/chat-provider";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { 
  MessageCircle, 
  Send, 
  Settings2, 
  RefreshCw, 
  Users,
  ArrowRightLeft
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useWebSocketContext } from "@/components/providers/websocket-provider";

const LiveChatContent = () => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const { connected, sendChatMessage } = useWebSocketContext();
  const { 
    chatConfig, 
    setChatConfig, 
    saveConfig, 
    isSaving, 
    showWidget, 
    toggleWidget 
  } = useChatContext();
  
  const { 
    data: chatLogs, 
    isLoading: isLoadingLogs,
    error: logsError,
    refetch: refetchLogs
  } = useQuery({
    queryKey: ["/api/chat/logs", selectedSessionId],
    queryFn: () => selectedSessionId 
      ? getChatLogs(selectedSessionId) 
      : getChatLogs(undefined, 10),
    refetchInterval: selectedSessionId ? 5000 : false // Auto-refresh every 5 seconds if viewing a conversation
  });

  // Get unique session IDs for the dropdown
  const uniqueSessions = chatLogs 
    ? [...new Set(chatLogs.map(log => log.sessionId))]
    : [];

  // Handle sending a message
  const handleSendMessage = () => {
    if (!message.trim() || !selectedSessionId) return;
    
    if (!connected) {
      toast({
        title: "Connection Error",
        description: "Not connected to the server. Please try again later.",
        variant: "destructive",
      });
      return;
    }
    
    const success = sendChatMessage(message);
    if (success) {
      setMessage("");
      // Refetch the logs after a small delay to include the new message
      setTimeout(() => refetchLogs(), 500);
    } else {
      toast({
        title: "Message Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Chat</h1>
          <p className="text-muted-foreground">
            Manage chat widget, view conversations, and configure auto-responses
          </p>
        </div>
        <Button onClick={toggleWidget}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Open Chat Widget
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chat Configuration</CardTitle>
              <CardDescription>
                Configure the chat widget appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="widget-title">Widget Title</Label>
                  <Input 
                    id="widget-title" 
                    value={chatConfig.widgetTitle} 
                    onChange={(e) => setChatConfig({ widgetTitle: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="widget-color">Widget Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="widget-color" 
                      type="color" 
                      value={chatConfig.widgetColor}
                      onChange={(e) => setChatConfig({ widgetColor: e.target.value })}
                      className="w-12 h-8 p-1" 
                    />
                    <Input 
                      value={chatConfig.widgetColor}
                      onChange={(e) => setChatConfig({ widgetColor: e.target.value })}
                      className="flex-1" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="greeting-message">Greeting Message</Label>
                  <Input 
                    id="greeting-message" 
                    value={chatConfig.greetingMessage}
                    onChange={(e) => setChatConfig({ greetingMessage: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="active-hours">Active Hours</Label>
                  <Input 
                    id="active-hours" 
                    value={chatConfig.activeHours}
                    onChange={(e) => setChatConfig({ activeHours: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-response">AI Auto-Response</Label>
                  <Switch 
                    id="auto-response" 
                    checked={chatConfig.enableAutoResponse}
                    onCheckedChange={(checked) => setChatConfig({ enableAutoResponse: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="human-handoff">Enable Human Handoff</Label>
                  <Switch 
                    id="human-handoff" 
                    checked={chatConfig.enableHumanHandoff}
                    onCheckedChange={(checked) => setChatConfig({ enableHumanHandoff: checked })}
                  />
                </div>

                <Button className="w-full" onClick={saveConfig} disabled={isSaving}>
                  {isSaving ? (
                    <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chat Analytics</CardTitle>
              <CardDescription>
                Summary of chat performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <div className="text-sm text-neutral-500">Total Chats</div>
                  <div className="text-2xl font-bold">{uniqueSessions.length || 0}</div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <div className="text-sm text-neutral-500">Avg. Response Time</div>
                  <div className="text-2xl font-bold">{chatConfig.aiResponseTime / 1000}s</div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <div className="text-sm text-neutral-500">Satisfaction Rate</div>
                  <div className="text-2xl font-bold">92%</div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <div className="text-sm text-neutral-500">AI Resolution</div>
                  <div className="text-2xl font-bold">78%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="h-[500px] flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {selectedSessionId 
                      ? `Chat Session #${selectedSessionId.substring(8, 16)}` 
                      : 'Chat Preview'}
                  </CardTitle>
                  <CardDescription>
                    {selectedSessionId 
                      ? 'Viewing conversation history' 
                      : 'Select a session to view details'}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!selectedSessionId || !chatConfig.enableHumanHandoff}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-1" />
                  Transfer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pb-0">
              {isLoadingLogs ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-2/3" />
                  <Skeleton className="h-16 w-2/3 ml-auto" />
                  <Skeleton className="h-16 w-1/2" />
                </div>
              ) : logsError ? (
                <div className="text-red-500">Failed to load chat logs</div>
              ) : !selectedSessionId ? (
                <div className="h-full flex items-center justify-center text-neutral-500">
                  Select a chat session to view the conversation
                </div>
              ) : chatLogs?.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-500">
                  No messages in this conversation
                </div>
              ) : (
                <div className="space-y-4">
                  {chatLogs?.map((message) => (
                    <div 
                      key={message.id}
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.sender === 'user' 
                          ? 'bg-neutral-100 text-neutral-800' 
                          : 'bg-primary text-white ml-auto'
                      }`}
                    >
                      <div className="text-sm break-words">{message.message}</div>
                      <div className={`text-xs mt-1 ${
                        message.sender === 'user' ? 'text-neutral-500' : 'text-primary-foreground/70'
                      }`}>
                        {format(new Date(message.timestamp), 'HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t mt-auto">
              <div className="flex w-full space-x-2 pt-4">
                <Input 
                  placeholder="Type your message..." 
                  disabled={!selectedSessionId}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  size="icon"
                  disabled={!selectedSessionId || !message.trim() || !connected}
                  onClick={handleSendMessage}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                View and manage current chat sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {uniqueSessions.length === 0 ? (
                  <div className="text-neutral-500 py-4 text-center">
                    No active chat sessions
                  </div>
                ) : (
                  uniqueSessions.map((sessionId) => (
                    <Button
                      key={sessionId}
                      variant={selectedSessionId === sessionId ? "default" : "outline"}
                      className="justify-start h-auto py-3"
                      onClick={() => setSelectedSessionId(sessionId)}
                    >
                      <div className="flex items-center">
                        <div className="bg-primary/10 text-primary p-2 rounded-full mr-3">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">
                            Session #{sessionId.substring(8, 16)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Started {formatDistanceToNow(
                              new Date(parseInt(sessionId.split('_')[1])),
                              { addSuffix: true }
                            )}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Chat Widget */}
      {showWidget && (
        <ChatWidget
          title={chatConfig.widgetTitle}
          primaryColor={chatConfig.widgetColor}
          greetingMessage={chatConfig.greetingMessage}
          onClose={toggleWidget}
        />
      )}
    </div>
  );
};

// Wrap the component with the ChatProvider
const LiveChat = () => (
  <ChatProvider>
    <LiveChatContent />
  </ChatProvider>
);

export default LiveChat;
