import { useState, useRef, useEffect } from "react";
import { useWebSocketContext } from "@/components/providers/websocket-provider";
import { useChatContext } from "@/components/providers/chat-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, X, Minimize2, Maximize2, User, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define chat message types directly to avoid any potential issues with imports
interface ChatMessage {
  id?: number;
  type: string;
  message: string;
  sender?: string;
  timestamp: string;
  sessionId?: string;
}

// Define pre-chat form schema for validation
const preChatFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name is required" }),
  mobileNumber: z.string().min(5, { message: "Mobile number is required" }),
  emailAddress: z.string().email({ message: "Valid email address is required" })
});

// Type for our form values
type PreChatFormValues = z.infer<typeof preChatFormSchema>;

interface ChatWidgetProps {
  title?: string;
  primaryColor?: string;
  greetingMessage?: string;
  onClose: () => void;
}

export function ChatWidget({
  title = "Company Assistant",
  primaryColor = "#2563eb",
  greetingMessage = "Hello! How can I assist you today?",
  onClose
}: ChatWidgetProps) {
  const [message, setMessage] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showPreChatForm, setShowPreChatForm] = useState(true); // Start with the pre-chat form shown
  const [userProfile, setUserProfile] = useState<PreChatFormValues | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sessionId, connected, messages, sendChatMessage } = useWebSocketContext();
  const { chatConfig, getCurrentSessionId } = useChatContext();
  const { toast } = useToast();
  
  // Define form
  const form = useForm<PreChatFormValues>({
    resolver: zodResolver(preChatFormSchema),
    defaultValues: {
      fullName: "",
      mobileNumber: "",
      emailAddress: ""
    }
  });
  
  // Handle form submission
  const onSubmitPreChatForm = (data: PreChatFormValues) => {
    setUserProfile(data);
    setShowPreChatForm(false);
    
    // Send user info to the server in a special message format
    const userInfoMessage = JSON.stringify({
      userInfo: {
        fullName: data.fullName,
        mobileNumber: data.mobileNumber,
        emailAddress: data.emailAddress
      }
    });
    
    sendChatMessage(userInfoMessage, 'user_info');
    
    // Add personalized welcome message
    setChatHistory([{
      type: 'welcome',
      message: `Hello ${data.fullName}! ${greetingMessage}`,
      timestamp: new Date().toISOString(),
      sender: 'ai'
    }]);
  };
  
  // Initialize with greeting message if no messages exist, but only after form is submitted
  useEffect(() => {
    if (!showPreChatForm && chatHistory.length === 0 && userProfile) {
      setChatHistory([{
        type: 'welcome',
        message: `Hello ${userProfile.fullName}! ${greetingMessage}`,
        timestamp: new Date().toISOString(),
        sender: 'ai'
      }]);
    }
  }, [greetingMessage, showPreChatForm, userProfile]);
  
  // Listen for incoming messages from WebSocket
  useEffect(() => {
    if (messages && messages.length > 0) {
      // Find messages that are not already in our chat history
      const newMessages = messages.filter(wsMsg => 
        wsMsg.type === 'chat' && 
        wsMsg.message && // Ensure message is defined
        !chatHistory.some(chatMsg => 
          chatMsg.message === wsMsg.message && 
          chatMsg.sender === wsMsg.sender &&
          chatMsg.timestamp === wsMsg.timestamp
        )
      );
      
      if (newMessages.length > 0) {
        // Convert WebSocketMessages to ChatMessages
        const typedNewMessages: ChatMessage[] = newMessages.map(msg => ({
          type: msg.type,
          message: msg.message || '',
          sender: msg.sender,
          timestamp: msg.timestamp || new Date().toISOString(),
          sessionId: msg.sessionId
        }));
        
        setChatHistory(prev => [...prev, ...typedNewMessages]);
      }
    }
  }, [messages, chatHistory]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    if (!connected) {
      toast({
        title: "Connection Error",
        description: "Not connected to the server. Please try again later.",
        variant: "destructive",
      });
      return;
    }
    
    // Create user message
    const currentSessionId = getCurrentSessionId() || sessionId;
    const userMessageObj: ChatMessage = {
      type: 'chat',
      message: message.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
      sessionId: currentSessionId
    };
    
    // Add to chat history immediately (before server response)
    setChatHistory(prev => [...prev, userMessageObj]);
    
    // Send to server
    const success = sendChatMessage(message.trim());
    if (success) {
      // Clear the input field after successful send
      setMessage("");
    } else {
      toast({
        title: "Message Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      // Remove the message from chat history if sending failed
      setChatHistory(prev => prev.filter(msg => msg !== userMessageObj));
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 shadow-lg">
        <Button 
          onClick={() => setMinimized(false)} 
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: primaryColor }}
        >
          <Maximize2 className="h-6 w-6" />
        </Button>
      </div>
    );
  }
  
  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 md:w-96 h-[500px] flex flex-col shadow-lg overflow-hidden">
      <CardHeader 
        className="flex flex-row items-center justify-between py-3 px-4 space-y-0" 
        style={{ backgroundColor: primaryColor }}
      >
        <CardTitle className="text-white text-base font-medium">{title}</CardTitle>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full bg-white/20 text-white hover:bg-white/30"
            onClick={() => setMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full bg-white/20 text-white hover:bg-white/30"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      {showPreChatForm ? (
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Please provide your details to start chatting</h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitPreChatForm)} className="space-y-4 flex-1">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter your full name" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter your mobile number" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="emailAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter your email address" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full mt-6"
                  style={{ backgroundColor: primaryColor }}
                  disabled={!connected}
                >
                  Start Chat
                </Button>
              </form>
            </Form>
            
            {!connected && (
              <div className="bg-destructive/10 text-destructive mt-4 p-2 rounded text-xs text-center">
                Connecting to server...
              </div>
            )}
          </div>
        </CardContent>
      ) : (
        <>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Chat Messages */}
            {chatHistory.map((msg: ChatMessage, index: number) => (
              <div
                key={index}
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.type === 'welcome' || (msg.sender && msg.sender === 'ai')
                    ? 'bg-primary/10 text-foreground'
                    : 'bg-primary text-primary-foreground ml-auto'
                }`}
              >
                <p className="text-sm break-words">{msg.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.type === 'welcome' || (msg.sender && msg.sender === 'ai')
                      ? 'text-muted-foreground'
                      : 'text-primary-foreground/70'
                  }`}
                >
                  {format(new Date(msg.timestamp || new Date()), 'HH:mm')}
                </p>
              </div>
            ))}
            
            {/* Connection Status Indicator - only show when disconnected */}
            {!connected && (
              <div className="bg-destructive/10 text-destructive p-2 rounded text-xs text-center">
                Connecting to server...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </CardContent>
          
          <CardFooter className="p-2 border-t">
            <div className="flex w-full space-x-2">
              <Input
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
                disabled={!connected}
              />
              <Button 
                onClick={handleSendMessage} 
                size="icon"
                disabled={!connected || !message.trim()}
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
}