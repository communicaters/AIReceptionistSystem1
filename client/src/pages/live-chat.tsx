import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChatLogs } from "@/lib/api";
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

const LiveChat = () => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const { 
    data: chatLogs, 
    isLoading: isLoadingLogs,
    error: logsError
  } = useQuery({
    queryKey: ["/api/chat/logs", selectedSessionId],
    queryFn: () => selectedSessionId 
      ? getChatLogs(selectedSessionId) 
      : getChatLogs(undefined, 10)
  });

  // Get unique session IDs for the dropdown
  const uniqueSessions = chatLogs 
    ? [...new Set(chatLogs.map(log => log.sessionId))]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Chat</h1>
          <p className="text-muted-foreground">
            Manage chat widget, view conversations, and configure auto-responses
          </p>
        </div>
        <Button>
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
                  <Input id="widget-title" defaultValue="Company Assistant" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="widget-color">Widget Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="widget-color" 
                      type="color" 
                      defaultValue="#2563eb" 
                      className="w-12 h-8 p-1" 
                    />
                    <Input defaultValue="#2563eb" className="flex-1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="greeting-message">Greeting Message</Label>
                  <Input 
                    id="greeting-message" 
                    defaultValue="Hello! How can I assist you today?" 
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="auto-response" defaultChecked />
                  <Label htmlFor="auto-response">Enable AI Auto-Response</Label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Reset</Button>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Chat Sessions</CardTitle>
              <CardDescription>
                Currently active chat conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uniqueSessions.length > 0 ? (
                  uniqueSessions.map((sessionId) => (
                    <div 
                      key={sessionId}
                      onClick={() => setSelectedSessionId(sessionId)}
                      className={`p-3 border rounded-md cursor-pointer hover:bg-neutral-50 transition-colors ${
                        selectedSessionId === sessionId ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-neutral-500" />
                          <h4 className="font-medium">Session #{sessionId.substring(8, 16)}</h4>
                        </div>
                        <div className="text-xs text-neutral-500">
                          Active
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-neutral-500 py-4">
                    No active chat sessions
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Sessions
              </Button>
            </CardFooter>
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
                <Button variant="outline" size="sm">
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
                      <div className="text-sm">{message.message}</div>
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
                />
                <Button 
                  size="icon" 
                  disabled={!selectedSessionId}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
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
                  <div className="text-2xl font-bold">946</div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <div className="text-sm text-neutral-500">Avg. Response Time</div>
                  <div className="text-2xl font-bold">8.2s</div>
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
      </div>
    </div>
  );
};

export default LiveChat;
