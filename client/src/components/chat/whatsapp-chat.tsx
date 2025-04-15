import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, RefreshCw, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { WhatsappLog, sendWhatsappMessage } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface WhatsAppChatProps {
  phoneNumber: string;
  messages: WhatsappLog[];
  isLoading: boolean;
  onBack?: () => void;
  onRefresh: () => void;
}

export function WhatsAppChat({
  phoneNumber,
  messages,
  isLoading,
  onBack,
  onRefresh
}: WhatsAppChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Sort messages by timestamp in ascending order (oldest first)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const sendMessageMutation = useMutation({
    mutationFn: ({ phoneNumber, message }: { phoneNumber: string; message: string }) => 
      sendWhatsappMessage(phoneNumber, message),
    onSuccess: () => {
      setNewMessage(""); // Clear the input field
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/logs"] });
      onRefresh(); // Force refresh the messages
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Message was delivered but there was an error updating the UI. Please refresh.",
        variant: "destructive",
      });
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    sendMessageMutation.mutate({ 
      phoneNumber, 
      message: newMessage 
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-primary flex items-center space-x-3 text-primary-foreground">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary-foreground/10"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
            {phoneNumber.substring(0, 2)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium">{phoneNumber}</h3>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary-foreground/10"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner size="lg" />
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="mb-2">No messages yet</p>
            <p className="text-sm">Start the conversation by sending a message</p>
          </div>
        ) : (
          sortedMessages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.direction === "inbound"
                  ? "bg-gray-200 text-foreground"
                  : "bg-[#dcf8c6] text-foreground ml-auto"
              }`}
            >
              <p className="text-sm break-words">{msg.message}</p>
              <p className="text-[10px] mt-1 text-muted-foreground text-right">
                {format(new Date(msg.timestamp), 'h:mm a')}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="p-3 bg-background border-t flex space-x-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message"
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <Button 
          size="icon"
          disabled={sendMessageMutation.isPending || !newMessage.trim()}
          onClick={handleSendMessage}
        >
          {sendMessageMutation.isPending ? (
            <Spinner size="sm" className="text-white" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}