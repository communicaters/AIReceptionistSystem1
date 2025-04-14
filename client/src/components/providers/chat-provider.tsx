import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface ChatContextType {
  chatConfig: ChatConfig;
  isLoading: boolean;
  error: Error | null;
  setChatConfig: (config: Partial<ChatConfig>) => void;
  saveConfig: () => Promise<void>;
  isSaving: boolean;
  showWidget: boolean;
  toggleWidget: () => void;
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  return (
    <ChatContext.Provider
      value={{
        chatConfig,
        isLoading,
        error: error instanceof Error ? error : null,
        setChatConfig: (config) => setChatConfig(prev => ({ ...prev, ...config })),
        saveConfig,
        isSaving,
        showWidget,
        toggleWidget
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