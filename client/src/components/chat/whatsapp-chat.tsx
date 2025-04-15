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
  const [localMessages, setLocalMessages] = useState<WhatsappLog[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Update local messages when server messages change
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);
  
  // Sort messages by timestamp in ascending order (oldest first)
  const sortedMessages = [...localMessages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const sendMessageMutation = useMutation({
    mutationFn: ({ phoneNumber, message }: { phoneNumber: string; message: string }) => 
      sendWhatsappMessage(phoneNumber, message),
    onSuccess: (data) => {
      // Clear the input field immediately after sending
      setNewMessage("");
      
      // If the API returned success but there was an error in UI updating
      if (data.success) {
        // Add the new message to the local messages array immediately
        // This ensures the user sees their message right away without waiting for a refresh
        const newMsg = {
          id: data.messageId || Date.now(), // Use returned ID or timestamp as fallback
          userId: 1,
          phoneNumber: phoneNumber,
          message: newMessage,
          mediaUrl: null,
          direction: 'outbound',
          timestamp: new Date().toISOString()
        };
        
        // Trigger a refresh to get the message from the server
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/logs"] });
        setTimeout(() => onRefresh(), 500); // Small delay to ensure DB has updated
      } else {
        toast({
          title: "Warning",
          description: "Message was sent but there might have been an issue with delivery.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [localMessages, messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Add message to local state immediately for instant feedback
    const optimisticMessage: WhatsappLog = {
      id: Date.now(), // Temporary ID that will be overwritten on refresh
      userId: 1,
      phoneNumber: phoneNumber,
      message: newMessage,
      mediaUrl: null,
      direction: 'outbound',
      timestamp: new Date().toISOString()
    };
    
    // Add the optimistic message to local state
    setLocalMessages(prev => [...prev, optimisticMessage]);
    
    // Clear the input field right away
    const messageToSend = newMessage;
    setNewMessage("");
    
    // Then send the actual message to the server
    sendMessageMutation.mutate({ 
      phoneNumber, 
      message: messageToSend 
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