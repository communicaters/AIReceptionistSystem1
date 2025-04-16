import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  getWhatsappLogs, 
  getWhatsappConfig, 
  saveWhatsappConfig, 
  testWhatsappConnection,
  sendWhatsappMessage,
  getWhatsappTemplates,
  createWhatsappTemplate,
  updateWhatsappTemplate,
  deleteWhatsappTemplate,
  WhatsappConfig,
  WhatsappLog,
  WhatsappTemplate
} from "@/lib/api";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Copy,
  Loader2,
  Pencil,
  Trash2,
  PlusCircle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import StatusBadge from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppChat } from "@/components/chat/whatsapp-chat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const WhatsApp = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [sendMessageForm, setSendMessageForm] = useState({
    phoneNumber: "",
    message: ""
  });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Form state for configuration
  const [configForm, setConfigForm] = useState<Partial<WhatsappConfig>>({
    phoneNumberId: "",
    accessToken: "",
    businessAccountId: "",
    webhookVerifyToken: "",
    apiSecret: "",
    accountId: "",
    zenderUrl: "https://pakgame.store/WA/Install/api",
    provider: "facebook",  // Default to facebook, can be 'facebook' or 'zender'
    isActive: false
  });
  
  // Active configuration provider
  const [activeProvider, setActiveProvider] = useState<"facebook" | "zender">("facebook");

  // Query for WhatsApp configuration
  const { 
    data: whatsappConfig, 
    isLoading: isLoadingConfig,
    error: configError 
  } = useQuery({
    queryKey: ["/api/whatsapp/config"],
    queryFn: getWhatsappConfig
  });

  // State for pagination (per-conversation pagination)
  const [conversationPagination, setConversationPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    hasMore: false
  });
  
  // State for "View All" pagination
  const [allMessagesPagination, setAllMessagesPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    hasMore: false
  });
  
  // Get the active pagination based on whether we're looking at a specific conversation
  const activePagination = selectedNumber ? conversationPagination : allMessagesPagination;
  const setActivePagination = selectedNumber ? setConversationPagination : setAllMessagesPagination;
  
  // State to keep track of conversation messages when using pagination
  const [conversationMessages, setConversationMessages] = useState<WhatsappLog[]>([]);
  
  // State to keep track of all messages when using pagination in "View All" mode
  const [allMessages, setAllMessages] = useState<WhatsappLog[]>([]);
  
  // Query for WhatsApp logs
  const { 
    data: whatsappLogsResponse, 
    isLoading: isLoadingLogs,
    error: logsError,
    refetch: refetchLogs
  } = useQuery({
    queryKey: ["/api/whatsapp/logs", activePagination.offset, selectedNumber],
    queryFn: () => getWhatsappLogs(selectedNumber, activePagination.limit, activePagination.offset)
  });
  
  // Derive whatsappLogs from the response and update pagination state
  const whatsappLogs = whatsappLogsResponse?.logs || [];
  
  // Update pagination when response changes
  useEffect(() => {
    if (whatsappLogsResponse?.pagination) {
      setActivePagination(prev => ({
        ...prev,
        total: whatsappLogsResponse.pagination.total,
        hasMore: whatsappLogsResponse.pagination.hasMore
      }));
    }
  }, [whatsappLogsResponse, setActivePagination]);
  
  // Update messages state when logs or selected number changes
  useEffect(() => {
    if (selectedNumber) {
      // Individual conversation mode
      const filtered = filterMessagesByPhoneNumber(whatsappLogs, selectedNumber);
      
      setConversationMessages(prev => {
        // If we're loading more (offset > 0), append new messages to existing ones
        if (conversationPagination.offset > 0) {
          // Create a combined list, avoiding duplicates by ID
          const existingIds = new Set(prev.map(msg => msg.id));
          const newMessages = filtered.filter(msg => !existingIds.has(msg.id));
          return [...prev, ...newMessages];
        }
        // Otherwise, replace with new messages (for initial load or refresh)
        return filtered;
      });
    } else {
      // "View All" mode
      // Only update the list when we're specifically in "View All" mode
      setAllMessages(prev => {
        // If we're loading more (offset > 0), append new messages to existing ones
        if (allMessagesPagination.offset > 0) {
          // Create a combined list, avoiding duplicates by ID
          const existingIds = new Set(prev.map(msg => msg.id));
          const newMessages = whatsappLogs.filter(msg => !existingIds.has(msg.id));
          return [...prev, ...newMessages];
        }
        // Otherwise, replace with new messages (for initial load or refresh)
        return whatsappLogs;
      });
    }
  }, [whatsappLogs, selectedNumber, conversationPagination.offset, allMessagesPagination.offset]);
  
  // When we switch views, reset the conversation messages and pagination
  useEffect(() => {
    if (selectedNumber) {
      // Reset conversation pagination when selecting a new conversation
      setConversationPagination({
        limit: 20,
        offset: 0,
        total: 0,
        hasMore: false
      });
      setConversationMessages([]);
    } else {
      // When going back to "View All" mode, no need to reset allMessages as they're preserved
    }
  }, [selectedNumber]);
  
  // Function to load more messages
  const handleLoadMoreMessages = () => {
    setActivePagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  // Mutation for saving WhatsApp configuration
  const saveConfigMutation = useMutation({
    mutationFn: saveWhatsappConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/whatsapp/config"], data);
      toast({
        title: "Configuration saved",
        description: "Your WhatsApp business configuration has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save configuration",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for testing WhatsApp connection
  const testConnectionMutation = useMutation({
    mutationFn: testWhatsappConnection,
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Connection successful",
          description: data.message,
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Connection test failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for sending WhatsApp message
  const sendMessageMutation = useMutation({
    mutationFn: (params: { phoneNumber: string, message: string }) => 
      sendWhatsappMessage(params.phoneNumber, params.message),
    onSuccess: (data) => {
      toast({
        title: "Message sent",
        description: "WhatsApp message has been queued for delivery",
      });
      setShowSendDialog(false);
      setSendMessageForm({
        phoneNumber: "",
        message: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/logs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update form state when config is loaded
  useEffect(() => {
    if (whatsappConfig) {
      setConfigForm({
        phoneNumberId: whatsappConfig.phoneNumberId,
        accessToken: whatsappConfig.accessToken,
        businessAccountId: whatsappConfig.businessAccountId,
        webhookVerifyToken: whatsappConfig.webhookVerifyToken,
        apiSecret: whatsappConfig.apiSecret || "",
        accountId: whatsappConfig.accountId || "",
        zenderUrl: whatsappConfig.zenderUrl || "https://pakgame.store/WA/Install/api",
        provider: whatsappConfig.provider || "facebook",
        isActive: whatsappConfig.isActive
      });
      
      // Set the active provider based on config
      setActiveProvider((whatsappConfig.provider as "facebook" | "zender") || "facebook");
    }
  }, [whatsappConfig]);

  // Set webhook URL based on current window location
  useEffect(() => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    setWebhookUrl(`${protocol}//${host}/api/whatsapp/webhook`);
  }, []);
  
  // WebSocket connection for real-time updates
  useEffect(() => {
    // Establish WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket server for WhatsApp notifications:', wsUrl);
    const socket = new WebSocket(wsUrl);
    
    // Handle incoming WebSocket messages
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Check if it's a WhatsApp message event
        if (data.type === 'whatsapp_message') {
          console.log('Received WhatsApp message notification:', data);
          
          // Automatically refresh the message log
          refetchLogs();
          
          // Show toast notification for the new message
          if (data.data.direction === 'inbound') {
            const phoneNumber = data.data.phoneNumber;
            const message = data.data.message.substring(0, 30) + (data.data.message.length > 30 ? '...' : '');
            
            toast({
              title: `New message from ${phoneNumber}`,
              description: message,
            });
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    // Log connection events
    socket.onopen = () => console.log('WebSocket connection established for WhatsApp notifications');
    socket.onerror = (error) => console.error('WebSocket error:', error);
    socket.onclose = (event) => console.log('WebSocket connection closed:', event.code, event.reason);
    
    // Clean up the WebSocket connection when the component unmounts
    return () => {
      socket.close();
    };
  }, [refetchLogs, toast]);

  // Handle form changes
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    
    // Map form field IDs to config property names
    const fieldMap: Record<string, keyof WhatsappConfig> = {
      // Facebook/Meta WhatsApp fields
      'phone-number-id': 'phoneNumberId',
      'business-account-id': 'businessAccountId',
      'access-token': 'accessToken',
      'webhook-token': 'webhookVerifyToken',
      // Zender specific fields
      'api-secret': 'apiSecret',
      'account-id': 'accountId',
      'zender-url': 'zenderUrl',
      // Common fields
      'active-status': 'isActive'
    };
    
    const configKey = fieldMap[id];
    if (!configKey) return;
    
    setConfigForm(prev => ({
      ...prev,
      [configKey]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle provider change
  const handleProviderChange = (provider: "facebook" | "zender") => {
    setActiveProvider(provider);
    setConfigForm(prev => ({
      ...prev,
      provider: provider
    }));
  };

  // Handle saving configuration
  const handleSaveConfig = () => {
    // Different validation based on provider
    if (activeProvider === "facebook") {
      if (!configForm.phoneNumberId || !configForm.accessToken || 
          !configForm.businessAccountId || !configForm.webhookVerifyToken) {
        toast({
          title: "Validation error",
          description: "Please fill in all required Facebook/Meta API fields",
          variant: "destructive",
        });
        return;
      }
    } else if (activeProvider === "zender") {
      if (!configForm.accountId || !configForm.apiSecret || 
          !configForm.zenderUrl || !configForm.webhookVerifyToken) {
        toast({
          title: "Validation error",
          description: "Please fill in all required Zender API fields",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Set empty strings for unused provider fields to avoid validation issues
    const updatedConfig = { ...configForm };
    
    if (activeProvider === "facebook") {
      // These fields are not used with Facebook/Meta provider
      updatedConfig.apiSecret = "";
      updatedConfig.accountId = "";
    } else if (activeProvider === "zender") {
      // These fields are not used with Zender provider
      updatedConfig.phoneNumberId = "placeholder";
      updatedConfig.accessToken = "placeholder";
      updatedConfig.businessAccountId = "placeholder";
    }
    
    saveConfigMutation.mutate(updatedConfig);
  };

  // Handle testing connection
  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  // Handle send message form changes
  const handleSendMessageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setSendMessageForm(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle sending message
  const handleSendMessage = () => {
    if (!sendMessageForm.phoneNumber || !sendMessageForm.message) {
      toast({
        title: "Validation error",
        description: "Please provide both phone number and message",
        variant: "destructive",
      });
      return;
    }
    
    sendMessageMutation.mutate({
      phoneNumber: sendMessageForm.phoneNumber,
      message: sendMessageForm.message
    });
  };

  // Copy webhook URL to clipboard
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Helper functions for conversation view
  const getUniqueConversations = (logs: WhatsappLog[] = []) => {
    // Group messages by phone number and get the most recent message for each
    const phoneNumbers: { [key: string]: WhatsappLog } = {};
    
    logs.forEach(log => {
      // If this phone number doesn't exist in our map yet, or if this message is newer
      if (!phoneNumbers[log.phoneNumber] || 
          new Date(log.timestamp) > new Date(phoneNumbers[log.phoneNumber].timestamp)) {
        phoneNumbers[log.phoneNumber] = log;
      }
    });
    
    // Convert the map to an array of conversations
    return Object.values(phoneNumbers).map(log => ({
      phoneNumber: log.phoneNumber,
      lastMessage: log.message,
      timestamp: log.timestamp,
      direction: log.direction
    }));
  };
  
  const filterMessagesByPhoneNumber = (logs: WhatsappLog[], phoneNumber: string) => {
    return logs.filter(log => log.phoneNumber === phoneNumber);
  };
  
  const handleViewConversation = (phoneNumber: string) => {
    setSelectedNumber(phoneNumber);
    // When viewing a specific conversation, scroll to bottom after render
    setTimeout(() => {
      const endElement = document.getElementById('conversation-end');
      endElement?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  // Determine connection status
  const connectionStatus = () => {
    if (isLoadingConfig) {
      return {
        status: "loading",
        message: "Checking connection status..."
      };
    }
    
    if (configError) {
      return {
        status: "error",
        message: "Unable to determine connection status."
      };
    }
    
    if (!whatsappConfig) {
      return {
        status: "not-configured",
        message: "WhatsApp messaging service is not configured yet."
      };
    }
    
    if (!whatsappConfig.isActive) {
      return {
        status: "inactive",
        message: `WhatsApp ${whatsappConfig.provider === "zender" ? "Zender" : "Facebook/Meta"} connection is currently inactive.`
      };
    }
    
    const provider = whatsappConfig.provider === "zender" ? "Zender" : "Facebook/Meta";
    
    return {
      status: "connected",
      message: `WhatsApp ${provider} service is connected and active.`
    };
  };

  const status = connectionStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Business</h1>
          <p className="text-muted-foreground">
            Manage WhatsApp Business integration and message templates
          </p>
        </div>
        <Button 
          onClick={() => setShowSendDialog(true)}
          disabled={status.status !== "connected"}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Send Test Message
        </Button>
      </div>

      {status.status === "error" && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">WhatsApp API Connection Error</h3>
                <p className="text-red-600 mt-1">
                  There was an error retrieving your WhatsApp API connection status.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status.status === "inactive" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <AlertCircle className="h-6 w-6 text-amber-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">WhatsApp Integration Inactive</h3>
                <p className="text-amber-700 mt-1">
                  {status.message} Enable it in the configuration tab.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {status.status === "not-configured" && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">WhatsApp Not Configured</h3>
                <p className="text-red-600 mt-1">
                  {status.message} Complete the configuration in the settings tab below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status.status === "connected" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <Check className="h-6 w-6 text-green-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-800">WhatsApp Connected</h3>
                <p className="text-green-700 mt-1">
                  {status.message} You can send and receive messages.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="configuration">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
          <TabsTrigger value="logs">Message Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Configuration</CardTitle>
              <CardDescription>
                Configure your WhatsApp messaging service provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingConfig ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Provider Selection */}
                  <div className="space-y-3">
                    <Label>WhatsApp Service Provider</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        className={`border rounded-md p-4 cursor-pointer transition-colors hover:bg-slate-50 ${activeProvider === "facebook" ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => handleProviderChange("facebook")}
                      >
                        <h3 className="font-medium">Facebook/Meta API</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Standard WhatsApp Business API with Meta developer account
                        </p>
                      </div>
                      <div 
                        className={`border rounded-md p-4 cursor-pointer transition-colors hover:bg-slate-50 ${activeProvider === "zender" ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => handleProviderChange("zender")}
                      >
                        <h3 className="font-medium">Zender Service</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Alternative WhatsApp gateway with simpler API
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Conditional Fields Based on Provider */}
                  {activeProvider === "facebook" ? (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Facebook/Meta API Configuration</h3>
                      <div className="space-y-2">
                        <Label htmlFor="phone-number-id">Phone Number ID</Label>
                        <Input 
                          id="phone-number-id" 
                          placeholder="Enter your WhatsApp phone number ID" 
                          value={configForm.phoneNumberId || ""}
                          onChange={handleConfigChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="business-account-id">Business Account ID</Label>
                        <Input 
                          id="business-account-id" 
                          placeholder="Enter your business account ID" 
                          value={configForm.businessAccountId || ""}
                          onChange={handleConfigChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="access-token">Access Token</Label>
                        <Input 
                          id="access-token" 
                          type="password" 
                          placeholder="Enter your access token" 
                          value={configForm.accessToken || ""}
                          onChange={handleConfigChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="webhook-token">Webhook Verification Token</Label>
                        <Input 
                          id="webhook-token" 
                          placeholder="Enter a verification token for webhooks" 
                          value={configForm.webhookVerifyToken || ""}
                          onChange={handleConfigChange}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Zender API Configuration</h3>
                      <div className="space-y-2">
                        <Label htmlFor="account-id">Account ID</Label>
                        <Input 
                          id="account-id" 
                          placeholder="Enter your Zender account ID" 
                          value={configForm.accountId || ""}
                          onChange={handleConfigChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="api-secret">API Secret</Label>
                        <Input 
                          id="api-secret" 
                          type="password"
                          placeholder="Enter your Zender API secret" 
                          value={configForm.apiSecret || ""}
                          onChange={handleConfigChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="zender-url">Zender API URL</Label>
                        <Input 
                          id="zender-url" 
                          placeholder="Enter the Zender API URL" 
                          value={configForm.zenderUrl || "https://pakgame.store/WA/Install/api"}
                          onChange={handleConfigChange}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Default: https://pakgame.store/WA/Install/api
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="webhook-token">Webhook Verification Token</Label>
                        <Input 
                          id="webhook-token" 
                          placeholder="Enter a verification token for webhooks" 
                          value={configForm.webhookVerifyToken || ""}
                          onChange={handleConfigChange}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch 
                      id="active-status" 
                      checked={configForm.isActive || false}
                      onCheckedChange={(checked) => {
                        // Only update isActive for the currently selected provider
                        setConfigForm(prev => ({ 
                          ...prev, 
                          isActive: checked,
                          // Make sure we're setting the correct provider
                          provider: activeProvider
                        }));
                      }}
                    />
                    <Label htmlFor="active-status">Enable {activeProvider === "facebook" ? "Facebook/Meta" : "Zender"} WhatsApp Integration</Label>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={isLoadingConfig || !whatsappConfig || testConnectionMutation.isPending}
              >
                {testConnectionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Test Connection
              </Button>
              <Button 
                onClick={handleSaveConfig}
                disabled={isLoadingConfig || saveConfigMutation.isPending}
              >
                {saveConfigMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Configuration
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Setup</CardTitle>
              <CardDescription>
                Configure webhooks to receive messages from WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="webhook-url" 
                      value={webhookUrl} 
                      readOnly 
                    />
                    <Button 
                      variant="outline"
                      onClick={copyWebhookUrl}
                    >
                      {copySuccess ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">
                    Use this URL in your WhatsApp Business API settings to receive messages
                  </p>
                </div>
                <div className="rounded-md bg-neutral-50 p-3 text-sm">
                  <p className="font-medium mb-2">Webhook Setup Instructions:</p>
                  {activeProvider === "facebook" ? (
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Go to the Meta for Developers Dashboard</li>
                      <li>Navigate to your WhatsApp Business app</li>
                      <li>In the WhatsApp API settings, find Webhooks</li>
                      <li>Add the webhook URL above for the <span className="font-mono text-xs">messages</span> field</li>
                      <li>Use the Webhook Verification Token from your configuration</li>
                    </ol>
                  ) : (
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Log in to your Zender account dashboard</li>
                      <li>Go to Settings {'->'} Webhooks</li>
                      <li>Add the webhook URL above to receive incoming messages</li>
                      <li>Set the verification token to match your configuration</li>
                      <li>Make sure to enable webhooks for your desired events</li>
                    </ol>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Message Templates</CardTitle>
                <CardDescription>
                  Manage pre-approved message templates for WhatsApp
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Create New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Create WhatsApp Template</DialogTitle>
                  </DialogHeader>
                  <TemplateForm 
                    mode="create" 
                    onSuccess={() => {
                      // Close the dialog after successful template creation
                      const closeButton = document.querySelector('[data-radix-collection-item]');
                      if (closeButton && closeButton instanceof HTMLElement) {
                        closeButton.click();
                      }
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <TemplatesManager />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="logs">
          <Card className="flex flex-col h-[600px] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>Message Logs</CardTitle>
                <CardDescription>
                  View message history and conversation logs
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedNumber(null)}
                  disabled={!selectedNumber}
                >
                  View All Conversations
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetchLogs()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            
            {!selectedNumber ? (
              // Show conversation list
              <CardContent className="flex-1 overflow-y-auto">
                {isLoadingLogs ? (
                  <Skeleton className="h-64 w-full" />
                ) : logsError ? (
                  <div className="bg-red-50 p-4 rounded-md text-red-600">
                    Failed to load WhatsApp message logs
                  </div>
                ) : !whatsappLogs?.length ? (
                  <div className="text-center py-8 text-neutral-500">
                    No WhatsApp conversations found
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Group messages by phone number and show the latest for each */}
                    {getUniqueConversations(whatsappLogs).map((conversation) => (
                      <div 
                        key={conversation.phoneNumber} 
                        className="flex items-center justify-between p-3 rounded-md hover:bg-accent/50 cursor-pointer"
                        onClick={() => handleViewConversation(conversation.phoneNumber)}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10">
                              {conversation.phoneNumber.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{conversation.phoneNumber}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[240px]">
                              {conversation.lastMessage}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.timestamp))} ago
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            ) : (
              // Show individual conversation
              <div className="flex-1 overflow-hidden">
                <WhatsAppChat 
                  phoneNumber={selectedNumber}
                  messages={conversationMessages}
                  isLoading={isLoadingLogs}
                  onBack={() => setSelectedNumber(null)}
                  onRefresh={refetchLogs}
                  pagination={{
                    total: pagination.total,
                    limit: pagination.limit,
                    offset: pagination.offset,
                    hasMore: pagination.hasMore
                  }}
                  onLoadMore={handleLoadMoreMessages}
                />
              </div>
            )}
            
            {!selectedNumber && (
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => refetchLogs()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load More
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Message Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send WhatsApp Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                placeholder="Enter phone number with country code (e.g. +1234567890)"
                value={sendMessageForm.phoneNumber}
                onChange={handleSendMessageChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message"
                rows={4}
                value={sendMessageForm.message}
                onChange={handleSendMessageChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSendDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// WhatsApp Template Form Component
interface TemplateFormProps {
  mode: 'create' | 'edit';
  template?: WhatsappTemplate;
  onSuccess?: () => void;
}

const TemplateForm = ({ mode, template, onSuccess }: TemplateFormProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get active provider from WhatsApp config
  const { data: whatsappConfig } = useQuery({
    queryKey: ["/api/whatsapp/config"],
    queryFn: getWhatsappConfig
  });
  
  const activeProvider = (whatsappConfig?.provider as string) || 'facebook';
  
  // Create initial form state
  const [formState, setFormState] = useState<Partial<WhatsappTemplate>>({
    name: template?.name || '',
    content: template?.content || '',
    category: template?.category || 'general',
    provider: template?.provider || 'facebook', // Default to facebook until config loads
    isActive: template?.isActive !== undefined ? template.isActive : true,
    description: template?.description || '',
    componentsJson: template?.componentsJson || null,
    templateId: template?.templateId || null
  });
  
  // Update provider when WhatsApp config loads
  useEffect(() => {
    if (whatsappConfig && !template?.provider) {
      setFormState(prev => ({
        ...prev,
        provider: whatsappConfig.provider || 'facebook'
      }));
    }
  }, [whatsappConfig, template]);

  // Mutation for creating a template
  const createTemplateMutation = useMutation({
    mutationFn: createWhatsappTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/templates'] });
      toast({
        title: 'Template created',
        description: 'The WhatsApp template has been created successfully'
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create template',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Mutation for updating a template
  const updateTemplateMutation = useMutation({
    mutationFn: (data: { id: number; template: Partial<WhatsappTemplate> }) => 
      updateWhatsappTemplate(data.id, data.template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/templates'] });
      toast({
        title: 'Template updated',
        description: 'The WhatsApp template has been updated successfully'
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update template',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : value
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Form validation
    if (!formState.name || !formState.content || !formState.category || !formState.provider) {
      toast({
        title: 'Validation error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (mode === 'create') {
      createTemplateMutation.mutate(formState as Omit<WhatsappTemplate, 'id' | 'createdAt' | 'updatedAt' | 'lastUsed'>);
    } else if (mode === 'edit' && template?.id) {
      updateTemplateMutation.mutate({ 
        id: template.id, 
        template: formState 
      });
    }
  };

  const isPending = createTemplateMutation.isPending || updateTemplateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Welcome Message"
            value={formState.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            placeholder="general"
            value={formState.category}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Message Content</Label>
        <Textarea
          id="content"
          name="content"
          placeholder="Hello [name], welcome to our service! How can we help you today?"
          value={formState.content}
          onChange={handleChange}
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground">
          Use placeholders like [name] or [date] that will be replaced with actual values when sending.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="This template is used for welcoming new users."
          value={formState.description || ''}
          onChange={handleChange}
          rows={2}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          name="isActive"
          checked={formState.isActive}
          onCheckedChange={(checked) => 
            setFormState(prev => ({ ...prev, isActive: checked }))
          }
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Template' : 'Update Template'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// WhatsApp Templates Manager Component
const TemplatesManager = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<WhatsappTemplate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Get active provider from WhatsApp config
  const { data: whatsappConfig } = useQuery({
    queryKey: ["/api/whatsapp/config"],
    queryFn: getWhatsappConfig
  });
  
  const activeProvider = (whatsappConfig?.provider as "facebook" | "zender") || "facebook";

  // Query for WhatsApp templates
  const { 
    data: templates, 
    isLoading: isLoadingTemplates,
    error: templatesError 
  } = useQuery({
    queryKey: ['/api/whatsapp/templates'],
    queryFn: () => getWhatsappTemplates()
  });

  // Mutation for deleting a template
  const deleteTemplateMutation = useMutation({
    mutationFn: deleteWhatsappTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/templates'] });
      toast({
        title: 'Template deleted',
        description: 'The WhatsApp template has been deleted successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete template',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Handle edit template
  const handleEdit = (template: WhatsappTemplate) => {
    setEditingTemplate(template);
    setShowEditDialog(true);
  };

  // Handle delete template
  const handleDelete = (id: number) => {
    // Confirm deletion
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  // Filter templates by provider if needed
  const filteredTemplates = templates?.filter(t => 
    t.provider === activeProvider || !t.provider
  ) || [];

  return (
    <div className="space-y-4">
      {isLoadingTemplates ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : templatesError ? (
        <div className="p-4 rounded-md bg-red-50 text-red-600">
          Failed to load WhatsApp templates
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-2" />
          <p>No templates found. Create your first template to get started.</p>
        </div>
      ) : (
        filteredTemplates.map(template => (
          <div key={template.id} className="border rounded-md p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center mb-1">
                  <h3 className="font-medium">{template.name}</h3>
                  <span className="ml-2 text-xs bg-slate-100 px-2 py-1 rounded-md">
                    {template.category}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {template.content}
                </p>
                {template.description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {template.description}
                  </p>
                )}
              </div>
              <StatusBadge status={template.isActive ? "operational" : "inactive"} />
            </div>
            <div className="flex space-x-2 mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleEdit(template)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 hover:text-red-700"
                onClick={() => handleDelete(template.id)}
                disabled={deleteTemplateMutation.isPending}
              >
                {deleteTemplateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Delete
              </Button>
            </div>
          </div>
        ))
      )}

      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit WhatsApp Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm 
              mode="edit" 
              template={editingTemplate} 
              onSuccess={() => setShowEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsApp;
