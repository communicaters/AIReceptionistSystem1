import { useState, useRef, useEffect } from "react";
import { useWebSocketContext } from "@/components/providers/websocket-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, Send, X, Minimize2, Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sessionId, connected, messages, sendChatMessage } = useWebSocketContext();
  const { toast } = useToast();
  
  // Filter messages to only show chat messages
  const chatMessages = messages.filter(msg => msg.type === 'chat' || (msg.type === 'welcome' && msg.message));
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
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
    
    // Store the message to use in the local message object
    const userMessage = message.trim();
    
    const success = sendChatMessage(userMessage);
    if (success) {
      // Add the user message to the local messages state
      const localUserMessage = {
        type: 'chat',
        message: userMessage,
        sender: 'user',
        timestamp: new Date().toISOString(),
        sessionId
      };
      
      // Update the WebSocketContext with this message
      // This hack ensures the user's message displays immediately
      // even if the WebSocket message handling is delayed
      window.dispatchEvent(new CustomEvent('local-message', { 
        detail: localUserMessage 
      }));
      
      setMessage("");
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
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome/Greeting Message */}
        {chatMessages.length === 0 && (
          <div className="bg-primary/10 p-3 rounded-lg max-w-[80%]">
            <p className="text-sm">{greetingMessage}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), 'HH:mm')}
            </p>
          </div>
        )}
        
        {/* Chat Messages */}
        {chatMessages.map((msg, index) => (
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
    </Card>
  );
}