import { useQuery } from "@tanstack/react-query";
import { getWhatsappLogs } from "@/lib/api";
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
import { MessageSquare, Send, RefreshCw, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/ui/status-badge";

const WhatsApp = () => {
  const { 
    data: whatsappLogs, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/whatsapp/logs"],
    queryFn: () => getWhatsappLogs(undefined, 10)
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Business</h1>
          <p className="text-muted-foreground">
            Manage WhatsApp Business integration and message templates
          </p>
        </div>
        <Button>
          <MessageSquare className="mr-2 h-4 w-4" />
          Send Test Message
        </Button>
      </div>

      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">WhatsApp Business Connection Issue</h3>
              <p className="text-red-600 mt-1">
                Your WhatsApp Business API connection is currently inactive. Authentication failed with error code AUTH_ERROR.
              </p>
              <Button className="mt-4" variant="destructive">
                Troubleshoot Connection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-number-id">Phone Number ID</Label>
                  <Input id="phone-number-id" placeholder="Enter your WhatsApp phone number ID" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-account-id">Business Account ID</Label>
                  <Input id="business-account-id" placeholder="Enter your business account ID" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access-token">Access Token</Label>
                  <Input id="access-token" type="password" placeholder="Enter your access token" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-token">Webhook Verification Token</Label>
                  <Input id="webhook-token" placeholder="Enter a verification token for webhooks" />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="active-status" />
                  <Label htmlFor="active-status">Enable WhatsApp Business Integration</Label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Test Connection</Button>
              <Button>Save Configuration</Button>
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
                      value="https://your-domain.com/api/whatsapp/webhook" 
                      readOnly 
                    />
                    <Button variant="outline">Copy</Button>
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">
                    Use this URL in your WhatsApp Business API settings to receive messages
                  </p>
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
            <CardHeader>
              <CardTitle>Message Logs</CardTitle>
              <CardDescription>
                View message history and conversation logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : error ? (
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
              <Button variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Load More
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsApp;
