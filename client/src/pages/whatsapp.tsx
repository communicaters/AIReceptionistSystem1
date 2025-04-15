import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  getWhatsappLogs, 
  getWhatsappConfig, 
  saveWhatsappConfig, 
  testWhatsappConnection,
  sendWhatsappMessage,
  WhatsappConfig,
  WhatsappLog
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
  Loader2
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

  // Query for WhatsApp logs
  const { 
    data: whatsappLogs, 
    isLoading: isLoadingLogs,
    error: logsError,
    refetch: refetchLogs
  } = useQuery({
    queryKey: ["/api/whatsapp/logs"],
    queryFn: () => getWhatsappLogs(undefined, 10)
  });

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
                      onCheckedChange={(checked) => 
                        setConfigForm(prev => ({ ...prev, isActive: checked }))
                      }
                    />
                    <Label htmlFor="active-status">Enable WhatsApp Integration</Label>
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
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>
                Manage pre-approved message templates for WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Welcome Message</h3>
                      <p className="text-sm text-neutral-500 mt-1">
                        Hello [Name], welcome to our service! How can we help you today?
                      </p>
                    </div>
                    <StatusBadge status="operational" />
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="outline" size="sm">Test</Button>
                  </div>
                </div>

                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Appointment Confirmation</h3>
                      <p className="text-sm text-neutral-500 mt-1">
                        Your appointment is confirmed for [Date] at [Time]. Reply CONFIRM to confirm or RESCHEDULE to change.
                      </p>
                    </div>
                    <StatusBadge status="operational" />
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="outline" size="sm">Test</Button>
                  </div>
                </div>

                <Button className="mt-2">
                  Add New Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>Message Logs</CardTitle>
                <CardDescription>
                  View message history and conversation logs
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetchLogs()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <Skeleton className="h-64 w-full" />
              ) : logsError ? (
                <div className="bg-red-50 p-4 rounded-md text-red-600">
                  Failed to load WhatsApp message logs
                </div>
              ) : !whatsappLogs?.length ? (
                <div className="text-center py-8 text-neutral-500">
                  No WhatsApp messages found
                </div>
              ) : (
                <div className="space-y-4">
                  {whatsappLogs.map((log) => (
                    <div key={log.id} className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            log.direction === 'inbound' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {log.direction === 'inbound' ? 'Received' : 'Sent'}
                          </span>
                          <span className="ml-2 text-sm font-medium">{log.phoneNumber}</span>
                        </div>
                        <span className="text-xs text-neutral-500">
                          {formatDistanceToNow(new Date(log.timestamp))} ago
                        </span>
                      </div>
                      <p className="mt-2 text-sm">{log.message}</p>
                      {log.mediaUrl && (
                        <div className="mt-2">
                          <Button variant="outline" size="sm">View Media</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
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

export default WhatsApp;
