import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getEmailConfigs, 
  getEmailLogs, 
  saveSendgridConfig, 
  saveSmtpConfig, 
  saveMailgunConfig,
  verifySmtpConnection,
  sendTestEmail,
  processIncomingEmail,
  type SendgridConfig,
  type SmtpConfig,
  type MailgunConfig
} from "@/lib/api";
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
import { Mail, Send, RefreshCw, Check, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

// SendGrid Config Form
const SendGridConfigForm = ({ 
  currentConfig, 
  onSave, 
  isPending 
}: { 
  currentConfig: SendgridConfig | null; 
  onSave: (config: Partial<SendgridConfig>) => void; 
  isPending: boolean;
}) => {
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [fromEmail, setFromEmail] = useState(currentConfig?.fromEmail || '');
  const [fromName, setFromName] = useState(currentConfig?.fromName || '');
  const [isActive, setIsActive] = useState(currentConfig?.isActive ?? true);

  return (
    <div className="space-y-4">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="apiKey">API Key</Label>
        <Input 
          type="text" 
          id="apiKey" 
          placeholder="SendGrid API Key" 
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="fromEmail">From Email</Label>
        <Input 
          type="email" 
          id="fromEmail" 
          placeholder="noreply@yourdomain.com" 
          value={fromEmail}
          onChange={e => setFromEmail(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="fromName">From Name</Label>
        <Input 
          type="text" 
          id="fromName" 
          placeholder="Company Name" 
          value={fromName}
          onChange={e => setFromName(e.target.value)}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch 
          id="isActive" 
          checked={isActive} 
          onCheckedChange={setIsActive} 
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
      
      <Button 
        onClick={() => onSave({ apiKey, fromEmail, fromName, isActive })}
        disabled={isPending || !apiKey || !fromEmail || !fromName}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Save Configuration
          </>
        )}
      </Button>
    </div>
  );
};

// SMTP Config Form
const SmtpConfigForm = ({ 
  currentConfig, 
  onSave, 
  onVerify,
  isPending,
  isVerifying 
}: { 
  currentConfig: SmtpConfig | null; 
  onSave: (config: Partial<SmtpConfig>) => void;
  onVerify: (config: { host: string; port: string | number; username: string; password: string }) => void;
  isPending: boolean;
  isVerifying: boolean;
}) => {
  const [host, setHost] = useState(currentConfig?.host || '');
  const [port, setPort] = useState(currentConfig?.port?.toString() || '587');
  const [username, setUsername] = useState(currentConfig?.username || '');
  const [password, setPassword] = useState(currentConfig?.password || '');
  const [fromEmail, setFromEmail] = useState(currentConfig?.fromEmail || '');
  const [isActive, setIsActive] = useState(currentConfig?.isActive ?? true);

  return (
    <div className="space-y-4">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="host">SMTP Host</Label>
        <Input 
          type="text" 
          id="host" 
          placeholder="smtp.yourdomain.com" 
          value={host}
          onChange={e => setHost(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="port">SMTP Port</Label>
        <Input 
          type="number" 
          id="port" 
          placeholder="587" 
          value={port}
          onChange={e => setPort(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="username">Username</Label>
        <Input 
          type="text" 
          id="username" 
          placeholder="SMTP username or email" 
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input 
          type="password" 
          id="password" 
          placeholder="SMTP password" 
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="fromEmail">From Email</Label>
        <Input 
          type="email" 
          id="fromEmail" 
          placeholder="noreply@yourdomain.com" 
          value={fromEmail}
          onChange={e => setFromEmail(e.target.value)}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch 
          id="isActive" 
          checked={isActive} 
          onCheckedChange={setIsActive} 
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
      
      <div className="flex space-x-2">
        <Button 
          variant="outline"
          onClick={() => onVerify({ host, port, username, password })}
          disabled={isVerifying || !host || !port || !username || !password}
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify Connection
            </>
          )}
        </Button>
        
        <Button 
          onClick={() => onSave({ host, port: parseInt(port), username, password, fromEmail, isActive })}
          disabled={isPending || !host || !port || !username || !password || !fromEmail}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// Mailgun Config Form
const MailgunConfigForm = ({ 
  currentConfig, 
  onSave, 
  isPending 
}: { 
  currentConfig: MailgunConfig | null; 
  onSave: (config: Partial<MailgunConfig>) => void; 
  isPending: boolean;
}) => {
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [domain, setDomain] = useState(currentConfig?.domain || '');
  const [fromEmail, setFromEmail] = useState(currentConfig?.fromEmail || '');
  const [fromName, setFromName] = useState(currentConfig?.fromName || '');
  const [authorizedRecipients, setAuthorizedRecipients] = useState(currentConfig?.authorizedRecipients || '');
  const [isActive, setIsActive] = useState(currentConfig?.isActive ?? true);
  
  // Check if domain is a sandbox domain
  const isSandboxDomain = domain.includes('sandbox');
  
  return (
    <div className="space-y-4">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="apiKey">API Key</Label>
        <Input 
          type="text" 
          id="apiKey" 
          placeholder="Mailgun API Key" 
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="domain">Domain</Label>
        <Input 
          type="text" 
          id="domain" 
          placeholder="mail.yourdomain.com" 
          value={domain}
          onChange={e => setDomain(e.target.value)}
        />
        {isSandboxDomain && (
          <p className="text-amber-500 text-sm mt-1">
            Sandbox domain detected. You'll need to add authorized recipients below.
          </p>
        )}
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="fromEmail">From Email</Label>
        <Input 
          type="email" 
          id="fromEmail" 
          placeholder="noreply@yourdomain.com" 
          value={fromEmail}
          onChange={e => setFromEmail(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="fromName">From Name (Optional)</Label>
        <Input 
          type="text" 
          id="fromName" 
          placeholder="AI Receptionist" 
          value={fromName}
          onChange={e => setFromName(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="authorizedRecipients">
          Authorized Recipients {isSandboxDomain && <span className="text-red-500">*</span>}
        </Label>
        <Input 
          type="text" 
          id="authorizedRecipients" 
          placeholder="email1@example.com, email2@example.com" 
          value={authorizedRecipients}
          onChange={e => setAuthorizedRecipients(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          {isSandboxDomain 
            ? "For sandbox domains, list all email addresses that can receive emails (comma-separated)." 
            : "Comma-separated list of email addresses for testing purposes (optional for custom domains)."}
        </p>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch 
          id="isActive" 
          checked={isActive} 
          onCheckedChange={setIsActive} 
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
      
      <Button 
        onClick={() => onSave({ 
          apiKey, 
          domain, 
          fromEmail, 
          fromName,
          authorizedRecipients,
          isActive 
        })}
        disabled={isPending || !apiKey || !domain || !fromEmail || (isSandboxDomain && !authorizedRecipients)}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Save Configuration
          </>
        )}
      </Button>
    </div>
  );
};

// Test Email Dialog
const TestEmailDialog = ({
  onSend,
  isPending
}: {
  onSend: (to: string, service?: 'sendgrid' | 'smtp' | 'mailgun') => void;
  isPending: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [service, setService] = useState<'sendgrid' | 'smtp' | 'mailgun' | undefined>(undefined);

  const handleSend = () => {
    onSend(to, service);
    if (!isPending) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          Send Test Email
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Test Email</DialogTitle>
          <DialogDescription>
            Send a test email to verify your configuration
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="to">Recipient Email</Label>
            <Input 
              type="email" 
              id="to" 
              placeholder="recipient@example.com" 
              value={to}
              onChange={e => setTo(e.target.value)}
              required
            />
          </div>
          
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="service">Email Service</Label>
            <select 
              id="service" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={service || ''}
              onChange={e => setService(e.target.value as any || undefined)}
            >
              <option value="">Default Service</option>
              <option value="sendgrid">SendGrid</option>
              <option value="smtp">SMTP</option>
              <option value="mailgun">Mailgun</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSend} disabled={isPending || !to}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EmailManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [configureSmtp, setConfigureSmtp] = useState(false);
  const [configureSendgrid, setConfigureSendgrid] = useState(false);
  const [configureMailgun, setConfigureMailgun] = useState(false);
  
  // Query for fetching email configurations
  const { 
    data: emailConfigs, 
    isLoading: isLoadingConfigs,
    error: configError
  } = useQuery({
    queryKey: ["/api/email/configs"],
    queryFn: getEmailConfigs
  });

  // Query for fetching email logs
  const { 
    data: emailLogs, 
    isLoading: isLoadingLogs,
    error: logsError
  } = useQuery({
    queryKey: ["/api/email/logs"],
    queryFn: () => getEmailLogs(10)
  });
  
  // Mutation for saving SendGrid config
  const sendgridMutation = useMutation({
    mutationFn: saveSendgridConfig,
    onSuccess: () => {
      toast({
        title: "SendGrid Configuration Saved",
        description: "Your SendGrid configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/configs"] });
      setConfigureSendgrid(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save SendGrid configuration. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for saving SMTP config
  const smtpMutation = useMutation({
    mutationFn: saveSmtpConfig,
    onSuccess: () => {
      toast({
        title: "SMTP Configuration Saved",
        description: "Your SMTP configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/configs"] });
      setConfigureSmtp(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save SMTP configuration. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for saving Mailgun config
  const mailgunMutation = useMutation({
    mutationFn: saveMailgunConfig,
    onSuccess: () => {
      toast({
        title: "Mailgun Configuration Saved",
        description: "Your Mailgun configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/configs"] });
      setConfigureMailgun(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save Mailgun configuration. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for verifying SMTP connection
  const verifySmtpMutation = useMutation({
    mutationFn: verifySmtpConnection,
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "SMTP Verification Successful",
          description: "Your SMTP connection is working correctly.",
        });
      } else {
        toast({
          title: "SMTP Verification Failed",
          description: data.message || "Could not connect to SMTP server. Please check your settings.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to verify SMTP connection. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for sending test email
  const testEmailMutation = useMutation({
    mutationFn: ({ to, service }: { to: string; service?: 'sendgrid' | 'smtp' | 'mailgun' }) => 
      sendTestEmail(to, service),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Test Email Sent",
          description: "The test email was sent successfully.",
        });
      } else {
        toast({
          title: "Failed to Send Test Email",
          description: data.message || "There was an error sending the test email.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send test email. Please try again.",
        variant: "destructive",
      });
    }
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
        <TestEmailDialog 
          onSend={(to, service) => testEmailMutation.mutate({ to, service })}
          isPending={testEmailMutation.isPending}
        />
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
              ) : configureSendgrid ? (
                <SendGridConfigForm 
                  currentConfig={emailConfigs?.sendgrid || null}
                  onSave={sendgridMutation.mutate}
                  isPending={sendgridMutation.isPending}
                />
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
              {!configureSendgrid ? (
                <Button onClick={() => setConfigureSendgrid(true)}>
                  {emailConfigs?.sendgrid ? "Edit Configuration" : "Configure SendGrid"}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setConfigureSendgrid(false)}>
                  Cancel
                </Button>
              )}
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
              {isLoadingConfigs ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : configError ? (
                <div className="text-red-500">Failed to load SMTP configuration</div>
              ) : configureSmtp ? (
                <SmtpConfigForm 
                  currentConfig={emailConfigs?.smtp || null}
                  onSave={smtpMutation.mutate}
                  onVerify={verifySmtpMutation.mutate}
                  isPending={smtpMutation.isPending}
                  isVerifying={verifySmtpMutation.isPending}
                />
              ) : emailConfigs?.smtp ? (
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
                    <h3 className="font-medium text-sm text-neutral-500">Username</h3>
                    <p className="mt-1">{emailConfigs.smtp.username}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Password</h3>
                    <p className="mt-1">••••••••</p>
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
              {!configureSmtp ? (
                <Button onClick={() => setConfigureSmtp(true)}>
                  {emailConfigs?.smtp ? "Edit Configuration" : "Configure SMTP"}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setConfigureSmtp(false)}>
                  Cancel
                </Button>
              )}
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
              {isLoadingConfigs ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : configError ? (
                <div className="text-red-500">Failed to load Mailgun configuration</div>
              ) : configureMailgun ? (
                <MailgunConfigForm 
                  currentConfig={emailConfigs?.mailgun || null}
                  onSave={mailgunMutation.mutate}
                  isPending={mailgunMutation.isPending}
                />
              ) : emailConfigs?.mailgun ? (
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
                    {emailConfigs.mailgun.domain.includes('sandbox') && !emailConfigs.mailgun.authorizedRecipients && (
                      <p className="text-amber-500 text-xs mt-1">
                        Warning: Sandbox domain without authorized recipients
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">From Email</h3>
                    <p className="mt-1">{emailConfigs.mailgun.fromEmail}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">From Name</h3>
                    <p className="mt-1">{emailConfigs.mailgun.fromName || "Not set"}</p>
                  </div>
                  {emailConfigs.mailgun.authorizedRecipients && (
                    <div className="col-span-2">
                      <h3 className="font-medium text-sm text-neutral-500">Authorized Recipients</h3>
                      <p className="mt-1 text-sm break-words">
                        {emailConfigs.mailgun.authorizedRecipients}
                      </p>
                    </div>
                  )}
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
              {!configureMailgun ? (
                <Button onClick={() => setConfigureMailgun(true)}>
                  {emailConfigs?.mailgun ? "Edit Configuration" : "Configure Mailgun"}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setConfigureMailgun(false)}>
                  Cancel
                </Button>
              )}
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
