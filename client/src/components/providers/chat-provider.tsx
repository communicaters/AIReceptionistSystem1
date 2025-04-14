import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/lib/websocket";

interface ChatConfig {
  id?: number;
  userId?: number;
  widgetTitle: string;
  widgetColor: string;
  greetingMessage: string;
  aiResponseTime: number;
  activeHours: string;
  enableAutoResponse: boolean;
  enableHumanHandoff: boolean;
  humanHandoffDelay: number;
}

interface ChatSession {
  sessionId: string;
  lastActivity: Date;
  isActive: boolean;
}

interface ChatContextType {
  chatConfig: ChatConfig;
  isLoading: boolean;
  error: Error | null;
  setChatConfig: (config: Partial<ChatConfig>) => void;
  saveConfig: () => Promise<void>;
  isSaving: boolean;
  showWidget: boolean;
  toggleWidget: () => void;
  chatSessions: ChatSession[];
  activeChatSessions: number;
  getCurrentSessionId: () => string | null;
}

const defaultConfig: ChatConfig = {
  widgetTitle: "Company Assistant",
  widgetColor: "#2563eb",
  greetingMessage: "Hello! How can I assist you today?",
  aiResponseTime: 2000,
  activeHours: "9:00-17:00",
  enableAutoResponse: true,
  enableHumanHandoff: true,
  humanHandoffDelay: 300000 // 5 minutes in milliseconds
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatConfig, setChatConfig] = useState<ChatConfig>(defaultConfig);
  const [showWidget, setShowWidget] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const websocket = useWebSocket();

  // Fetch chat configuration
  const { 
    data, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/chat/config"],
    queryFn: async () => {
      const response = await fetch("/api/chat/config");
      if (!response.ok) {
        throw new Error("Failed to fetch chat configuration");
      }
      return response.json();
    }
  });
  
  // Fetch chat logs to get sessions
  const { 
    data: chatLogsData,
    isLoading: isLoadingLogs,
  } = useQuery({
    queryKey: ["/api/chat/logs"],
    queryFn: async () => {
      const response = await fetch("/api/chat/logs");
      if (!response.ok) {
        throw new Error("Failed to fetch chat logs");
      }
      return response.json();
    },
    refetchInterval: 10000 // Refresh every 10 seconds to keep session list updated
  });
  
  // Update chat sessions when logs data changes
  useEffect(() => {
    if (chatLogsData && Array.isArray(chatLogsData)) {
      // Get unique session IDs and create session objects
      const sessionsMap = new Map<string, ChatSession>();
      
      chatLogsData.forEach(log => {
        if (!sessionsMap.has(log.sessionId)) {
          sessionsMap.set(log.sessionId, {
            sessionId: log.sessionId,
            lastActivity: new Date(log.timestamp),
            isActive: true
          });
        } else {
          // Update last activity if this log is newer
          const session = sessionsMap.get(log.sessionId)!;
          const logTime = new Date(log.timestamp);
          if (logTime > session.lastActivity) {
            session.lastActivity = logTime;
            sessionsMap.set(log.sessionId, session);
          }
        }
      });
      
      // Convert map to array and sort by most recent activity
      const sessionsArray = Array.from(sessionsMap.values()).sort(
        (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
      );
      
      setChatSessions(sessionsArray);
      
      // Log for debugging
      console.log(`Updated chat sessions: found ${sessionsArray.length} unique sessions`);
    }
  }, [chatLogsData]);
  
  // Update chat config when data changes
  useEffect(() => {
    if (data && !data.error) {
      setChatConfig({
        ...defaultConfig,
        ...data
      });
    }
  }, [data]);

  // Save configuration mutation
  const { mutate, isPending: isSaving } = useMutation({
    mutationFn: async (config: ChatConfig) => {
      const response = await apiRequest("POST", "/api/chat/config", config);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Chat widget configuration has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/config"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Save",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  });

  const saveConfig = async () => {
    mutate(chatConfig);
  };

  const toggleWidget = () => {
    setShowWidget(prev => !prev);
  };
  
  // Get the current WebSocket session ID
  const getCurrentSessionId = useCallback(() => {
    return websocket.getSessionId();
  }, [websocket]);

  return (
    <ChatContext.Provider
      value={{
        chatConfig,
        isLoading: isLoading || isLoadingLogs,
        error: error instanceof Error ? error : null,
        setChatConfig: (config) => setChatConfig(prev => ({ ...prev, ...config })),
        saveConfig,
        isSaving,
        showWidget,
        toggleWidget,
        chatSessions,
        activeChatSessions: chatSessions.length,
        getCurrentSessionId
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}