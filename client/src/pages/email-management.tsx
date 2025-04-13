import { useQuery } from "@tanstack/react-query";
import { getEmailConfigs, getEmailLogs } from "@/lib/api";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Mail, Send, RefreshCw } from "lucide-react";
import StatusBadge from "@/components/ui/status-badge";

const EmailManagement = () => {
  const { 
    data: emailConfigs, 
    isLoading: isLoadingConfigs,
    error: configError
  } = useQuery({
    queryKey: ["/api/email/configs"],
    queryFn: getEmailConfigs
  });

  const { 
    data: emailLogs, 
    isLoading: isLoadingLogs,
    error: logsError
  } = useQuery({
    queryKey: ["/api/email/logs"],
    queryFn: () => getEmailLogs(10)
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Management</h1>
          <p className="text-muted-foreground">
            Manage email services, view email logs, and configure auto-responses
          </p>
        </div>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          Send Test Email
        </Button>
      </div>

      <Tabs defaultValue="sendgrid">
        <TabsList>
          <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="mailgun">Mailgun</TabsTrigger>
        </TabsList>
        <TabsContent value="sendgrid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SendGrid Configuration</CardTitle>
              <CardDescription>
                Manage your SendGrid settings for email communication
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingConfigs ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : configError ? (
                <div className="text-red-500">Failed to load SendGrid configuration</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">API Key</h3>
                    <p className="mt-1">{emailConfigs?.sendgrid?.apiKey 
                      ? "••••••••" + emailConfigs.sendgrid.apiKey.slice(-4) 
                      : "Not configured"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">From Email</h3>
                    <p className="mt-1">{emailConfigs?.sendgrid?.fromEmail || "Not configured"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">From Name</h3>
                    <p className="mt-1">{emailConfigs?.sendgrid?.fromName || "Not configured"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Status</h3>
                    <p className="mt-1">
                      <StatusBadge 
                        status={emailConfigs?.sendgrid?.isActive ? "operational" : "inactive"} 
                      />
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="mr-2">Edit Configuration</Button>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>
                Configure SMTP server details for email communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailConfigs?.smtp ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">SMTP Host</h3>
                    <p className="mt-1">{emailConfigs.smtp.host}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">SMTP Port</h3>
                    <p className="mt-1">{emailConfigs.smtp.port}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">From Email</h3>
                    <p className="mt-1">{emailConfigs.smtp.fromEmail}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Status</h3>
                    <p className="mt-1">
                      <StatusBadge 
                        status={emailConfigs.smtp.isActive ? "operational" : "inactive"} 
                      />
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-500">SMTP is not configured yet</p>
              )}
            </CardContent>
            <CardFooter>
              <Button>Configure SMTP</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="mailgun">
          <Card>
            <CardHeader>
              <CardTitle>Mailgun Configuration</CardTitle>
              <CardDescription>
                Set up Mailgun integration for email services
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailConfigs?.mailgun ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">API Key</h3>
                    <p className="mt-1">
                      {"••••••••" + emailConfigs.mailgun.apiKey.slice(-4)}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Domain</h3>
                    <p className="mt-1">{emailConfigs.mailgun.domain}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">From Email</h3>
                    <p className="mt-1">{emailConfigs.mailgun.fromEmail}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Status</h3>
                    <p className="mt-1">
                      <StatusBadge 
                        status={emailConfigs.mailgun.isActive ? "operational" : "inactive"} 
                      />
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-500">Mailgun is not configured yet</p>
              )}
            </CardContent>
            <CardFooter>
              <Button>Configure Mailgun</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Email Logs</CardTitle>
          <CardDescription>
            View and manage recent emails processed by the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <Skeleton className="h-64 w-full" />
          ) : logsError ? (
            <div className="text-red-500">Failed to load email logs</div>
          ) : (
            <Table>
              <TableCaption>A list of recent email logs</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs?.length ? (
                  emailLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.from}</TableCell>
                      <TableCell>{log.to}</TableCell>
                      <TableCell>{log.subject}</TableCell>
                      <TableCell>
                        <StatusBadge status={
                          log.status === 'sent' || log.status === 'delivered' 
                            ? 'operational' 
                            : log.status === 'failed' 
                            ? 'outage' 
                            : 'degraded'
                        } />
                      </TableCell>
                      <TableCell>{formatDistanceToNow(new Date(log.timestamp))} ago</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No email logs found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline">View All Logs</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Auto-Response Settings</CardTitle>
          <CardDescription>
            Configure how the AI automatically responds to incoming emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Auto-Response Templates</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="p-3 border rounded-md">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">General Inquiry Response</h4>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
                <div className="p-3 border rounded-md">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Support Request Response</h4>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
              </div>
            </div>
            <Button className="mr-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Auto-Response
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailManagement;
