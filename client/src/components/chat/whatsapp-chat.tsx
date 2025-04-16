import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, RefreshCw, ArrowLeft, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { WhatsappLog, WhatsappLogResponse, sendWhatsappMessage, getWhatsappLogs } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface WhatsAppChatProps {
  phoneNumber: string;
  messages: WhatsappLog[];
  isLoading: boolean;
  onBack?: () => void;
  onRefresh: () => void;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  onLoadMore?: () => void;
}

export function WhatsAppChat({
  phoneNumber,
  messages,
  isLoading,
  onBack,
  onRefresh,
  pagination,
  onLoadMore
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
  
  // Store deduplicated and sorted messages in state to prevent infinite renders
  const [sortedMessages, setSortedMessages] = useState<WhatsappLog[]>([]);
  
  // Process messages when localMessages changes
  useEffect(() => {
    // Deduplicate messages by combining multiple records of the same message
    // with different statuses (pending/sent/delivered/read)
    const deduplicatedMessages = localMessages.reduce((acc, current) => {
      // For outbound messages, we want to keep only the latest status of the same message
      if (current.direction === 'outbound') {
        // Try to find a message with the same content and close timestamp
        const existingMessageIndex = acc.findIndex(msg => 
          msg.direction === 'outbound' && 
          msg.message === current.message &&
          // Messages sent within 5 seconds are considered the same
          Math.abs(new Date(msg.timestamp).getTime() - new Date(current.timestamp).getTime()) < 5000
        );
        
        if (existingMessageIndex >= 0) {
          // If the message exists and this version has a status, keep the one with the "better" status
          if (current.status) {
            const existingStatus = acc[existingMessageIndex].status || 'pending';
            const statusPriority: Record<string, number> = {
              'pending': 0,
              'sent': 1,
              'delivered': 2,
              'read': 3,
              'failed': 4
            };
            
            // If current message has a "better" status, replace the existing one
            if ((statusPriority[current.status] ?? 0) > (statusPriority[existingStatus] ?? 0)) {
              acc[existingMessageIndex] = current;
            }
          }
          return acc;
        }
      }
      
      // Add the message if it's not a duplicate or it's inbound
      return [...acc, current];
    }, [] as WhatsappLog[]);
    
    // Sort the deduplicated messages by timestamp
    const sorted = [...deduplicatedMessages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Update the state
    setSortedMessages(sorted);
  }, [localMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: ({ phoneNumber, message }: { phoneNumber: string; message: string }) => 
      sendWhatsappMessage(phoneNumber, message),
    onSuccess: (data) => {
      // Clear the input field immediately after sending
      setNewMessage("");
      
      // If the API returned success
      if (data.success) {
        // Update the status of our optimistic message
        setLocalMessages(prev => 
          prev.map(msg => 
            // Find our optimistic message by checking if it's the latest outbound message
            (msg.direction === 'outbound' && msg.message === newMessage) 
              ? {
                  ...msg,
                  id: data.logId || msg.id, // Update with real logId if available
                  status: 'sent'
                }
              : msg
          )
        );
        
        console.log("Message sent successfully:", data);
        
        // Trigger a refresh to get the message from the server
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/logs"] });
        setTimeout(() => onRefresh(), 500); // Small delay to ensure DB has updated
      } else {
        // Show error toast if there was an issue
        toast({
          title: "Message Send Failed",
          description: data.error || "There was an issue delivering your message.",
          variant: "destructive",
        });
        
        // Update the optimistic message to show it failed
        setLocalMessages(prev => 
          prev.map(msg => 
            (msg.direction === 'outbound' && msg.message === newMessage) 
              ? {
                  ...msg,
                  status: 'failed'
                }
              : msg
          )
        );
      }
    },
    onError: (error) => {
      console.error("Send message mutation error:", error);
      
      // Show error toast
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
      
      // Update the optimistic message to show it failed
      setLocalMessages(prev => 
        prev.map(msg => 
          (msg.direction === 'outbound' && msg.message === newMessage) 
            ? {
                ...msg,
                status: 'failed'
              }
            : msg
        )
      );
    }
  });

  // Auto-scroll to bottom when new messages arrive
  // Use a ref to prevent infinite updates
  const prevMessagesLengthRef = useRef<number>(0);
  
  useEffect(() => {
    // Only scroll down on new messages or first load
    const currentLength = sortedMessages.length;
    const prevLength = prevMessagesLengthRef.current;
    
    // If this is loading more (pagination) at the top, don't scroll
    // Only scroll if messages are added at the bottom (new messages) or initial load
    if (currentLength > prevLength || prevLength === 0) {
      scrollToBottom();
    }
    
    prevMessagesLengthRef.current = currentLength;
  }, [sortedMessages.length]);
  
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
      timestamp: new Date().toISOString(),
      status: 'pending', // Add pending status for outgoing messages
      externalId: null
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
        {/* "See More" button for loading older messages */}
        {!isLoading && pagination && pagination.hasMore && (
          <div className="flex justify-center mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onLoadMore}
              className="text-xs flex items-center gap-1"
            >
              <ChevronUp className="h-3 w-3" />
              See More
            </Button>
          </div>
        )}
        
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
              <div className="flex justify-end items-center mt-1">
                {msg.direction === 'outbound' && (
                  <span className="mr-1 text-[10px]">
                    {msg.status === 'pending' && <span className="text-gray-400">⏱️</span>}
                    {msg.status === 'sent' && <span className="text-green-500">✓</span>}
                    {msg.status === 'delivered' && <span className="text-green-500">✓✓</span>}
                    {msg.status === 'read' && <span className="text-blue-500">✓✓</span>}
                    {msg.status === 'failed' && <span className="text-red-500">⚠️</span>}
                    {!msg.status && <span className="text-gray-400">⏱️</span>}
                  </span>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(msg.timestamp), 'h:mm a')}
                </p>
              </div>
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