import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  getWhatsappLogs, 
  getWhatsappConfig, 
  saveWhatsappConfig, 
  testWhatsappConnection,
  sendWhatsappMessage,
  WhatsappConfig
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

const WhatsApp = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showSendDialog, setShowSendDialog] = useState(false);
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
    isActive: false
  });

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
        isActive: whatsappConfig.isActive
      });
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
      'phone-number-id': 'phoneNumberId',
      'business-account-id': 'businessAccountId',
      'access-token': 'accessToken',
      'webhook-token': 'webhookVerifyToken',
      'active-status': 'isActive'
    };
    
    const configKey = fieldMap[id];
    if (!configKey) return;
    
    setConfigForm(prev => ({
      ...prev,
      [configKey]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle saving configuration
  const handleSaveConfig = () => {
    if (!configForm.phoneNumberId || !configForm.accessToken || 
        !configForm.businessAccountId || !configForm.webhookVerifyToken) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    saveConfigMutation.mutate(configForm);
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
        message: "WhatsApp Business API is not configured yet."
      };
    }
    
    if (!whatsappConfig.isActive) {
      return {
        status: "inactive",
        message: "WhatsApp Business API connection is currently inactive."
      };
    }
    
    return {
      status: "connected",
      message: "WhatsApp Business API is connected and active."
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
                <h3 className="font-semibold text-amber-800">WhatsApp Business Integration Inactive</h3>
                <p className="text-amber-700 mt-1">
                  Your WhatsApp Business API connection is configured but currently inactive. Enable it in the configuration tab.
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
                <h3 className="font-semibold text-red-800">WhatsApp Business API Not Configured</h3>
                <p className="text-red-600 mt-1">
                  Your WhatsApp Business API is not configured yet. Complete the configuration in the settings tab below.
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
                <h3 className="font-semibold text-green-800">WhatsApp Business API Connected</h3>
                <p className="text-green-700 mt-1">
                  Your WhatsApp Business API is connected and active. You can send and receive messages.
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
              <CardTitle>WhatsApp Business API Configuration</CardTitle>
              <CardDescription>
                Configure your WhatsApp Business account settings
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
                <div className="space-y-4">
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

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="active-status" 
                      checked={configForm.isActive || false}
                      onCheckedChange={(checked) => 
                        setConfigForm(prev => ({ ...prev, isActive: checked }))
                      }
                    />
                    <Label htmlFor="active-status">Enable WhatsApp Business Integration</Label>
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
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Go to the Meta for Developers Dashboard</li>
                    <li>Navigate to your WhatsApp Business app</li>
                    <li>In the WhatsApp API settings, find Webhooks</li>
                    <li>Add the webhook URL above for the <span className="font-mono text-xs">messages</span> field</li>
                    <li>Use the Webhook Verification Token from your configuration</li>
                  </ol>
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
