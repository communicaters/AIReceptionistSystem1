import { useState, useRef } from "react";
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
  ArrowRightLeft,
  Code,
  Copy,
  Check,
  X
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { useWebSocketContext } from "@/components/providers/websocket-provider";

const LiveChatContent = () => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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
  
  // Query to fetch all chat logs (no session filter)
  const { 
    data: allChatLogs, 
    isLoading: isLoadingAllLogs,
    error: allLogsError,
    refetch: refetchAllLogs
  } = useQuery({
    queryKey: ["/api/chat/logs"],
    queryFn: () => getChatLogs(undefined, 100), // Get up to 100 logs to ensure we get all sessions
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Query to fetch session-specific chat logs
  const { 
    data: sessionChatLogs, 
    isLoading: isLoadingSessionLogs,
    error: sessionLogsError,
    refetch: refetchSessionLogs
  } = useQuery({
    queryKey: ["/api/chat/logs", selectedSessionId],
    queryFn: () => selectedSessionId ? getChatLogs(selectedSessionId) : Promise.resolve([]),
    refetchInterval: selectedSessionId ? 5000 : false, // Auto-refresh every 5 seconds if viewing a conversation
    enabled: !!selectedSessionId, // Only run this query if a session is selected
  });

  // Combine the loading and error states
  const isLoadingLogs = isLoadingAllLogs || (isLoadingSessionLogs && !!selectedSessionId);
  const logsError = allLogsError || sessionLogsError;
  
  // Determine which logs to show based on selection
  const chatLogs = selectedSessionId ? sessionChatLogs : [];
  
  // Function to refresh both queries
  const refetchLogs = () => {
    refetchAllLogs();
    if (selectedSessionId) {
      refetchSessionLogs();
    }
  };

  // Use the chatSessions from our ChatContext instead of deriving from logs
  const { chatSessions } = useChatContext();
  const uniqueSessions = chatSessions.map(session => session.sessionId);
  
  // Add pagination for Active Sessions
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 10; // Show 10 sessions per page
  const totalPages = Math.ceil(uniqueSessions.length / sessionsPerPage);
  
  // Get current sessions for the current page
  const indexOfLastSession = currentPage * sessionsPerPage;
  const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
  const currentSessions = uniqueSessions.slice(indexOfFirstSession, indexOfLastSession);

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
  
  // Get current URL for embed code 
  const getHostUrl = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      return `${url.protocol}//${url.host}`;
    }
    return '';
  };
  
  // Generate embed code based on current chat configuration
  const getEmbedCode = () => {
    const hostUrl = getHostUrl();
    return `<!-- AI Receptionist Chat Widget -->
<script>
  // Configuration
  window.AR_SERVER_URL = "${hostUrl}"; // Your server URL
  window.AR_WIDGET_TITLE = "${chatConfig.widgetTitle}"; // Chat widget title
  window.AR_PRIMARY_COLOR = "${chatConfig.widgetColor}"; // Primary color (hex code)
  window.AR_GREETING_MESSAGE = "${chatConfig.greetingMessage}"; // Initial greeting
</script>
<script src="${hostUrl}/embed-chat.js"></script>`;
  };
  
  // Handle copying embed code to clipboard
  const handleCopyCode = () => {
    const code = getEmbedCode();
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopied(true);
        toast({
          title: "Copied!",
          description: "Embed code copied to clipboard",
        });
        
        // Reset copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast({
          title: "Copy failed",
          description: "Could not copy code to clipboard",
          variant: "destructive",
        });
      });
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
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setEmbedDialogOpen(true)}
          >
            <Code className="mr-2 h-4 w-4" />
            Embed Code
          </Button>
          <Button onClick={toggleWidget}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Open Chat Widget
          </Button>
        </div>
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
                View and manage current chat sessions ({uniqueSessions.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {uniqueSessions.length === 0 ? (
                  <div className="text-neutral-500 py-4 text-center">
                    No active chat sessions
                  </div>
                ) : (
                  <>
                    {currentSessions.map((sessionId) => (
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
                    ))}
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center mt-4 space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="text-sm">
                          Page {currentPage} of {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
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
      
      {/* Embed Code Dialog */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chat Widget Embed Code</DialogTitle>
            <DialogDescription>
              Add this code to your website to embed the AI Receptionist chat widget.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-neutral-50 rounded-md p-4 relative">
            <pre className="text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap">
              {getEmbedCode()}
            </pre>
            <div className="absolute top-2 right-2">
              <Button 
                size="sm" 
                variant="ghost" 
                className="w-8 h-8 p-0" 
                onClick={handleCopyCode}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Instructions:</strong></p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Copy the code above</li>
              <li>Paste it before the closing <code className="text-primary">&lt;/body&gt;</code> tag on any page where you want the chat widget to appear</li>
              <li>You can customize the appearance by modifying the configuration variables</li>
            </ol>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmbedDialogOpen(false)}>Close</Button>
            <Button onClick={handleCopyCode}>
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
