import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  getEmailConfigs, 
  getEmailLogs, 
  saveSendgridConfig, 
  saveSmtpConfig, 
  saveMailgunConfig,
  verifySmtpConnection,
  sendTestEmail,
  processIncomingEmail,
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  getScheduledEmails,
  getScheduledEmail,
  createScheduledEmail,
  updateScheduledEmail,
  deleteScheduledEmail,
  cancelScheduledEmail,
  type SendgridConfig,
  type SmtpConfig,
  type MailgunConfig,
  type EmailTemplate,
  type ScheduledEmail
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
import { Eye, Mail, Send, Pencil, Plus, RefreshCw, Trash, XCircle, CalendarClock, Check, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

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

// Email Template Form
const EmailTemplateForm = ({
  template,
  onSave,
  isPending
}: {
  template?: Partial<EmailTemplate>;
  onSave: (template: Partial<EmailTemplate>) => void;
  isPending: boolean;
}) => {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [category, setCategory] = useState(template?.category || 'general');
  const [description, setDescription] = useState(template?.description || '');
  const [variables, setVariables] = useState(template?.variables || '');
  const [isActive, setIsActive] = useState(template?.isActive ?? true);

  return (
    <div className="space-y-4">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="name">Template Name</Label>
        <Input 
          type="text" 
          id="name" 
          placeholder="Welcome Email" 
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="category">Category</Label>
        <select 
          id="category" 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="general">General</option>
          <option value="support">Support</option>
          <option value="sales">Sales</option>
          <option value="marketing">Marketing</option>
          <option value="notification">Notification</option>
        </select>
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input 
          type="text" 
          id="subject" 
          placeholder="Welcome to our service" 
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="body">Email Body</Label>
        <textarea 
          id="body" 
          className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Hello {{name}}, welcome to our service..." 
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Use variables like {'{{name}}'}, {'{{company}}'}, etc. which will be replaced with actual data when the email is sent.
        </p>
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="variables">Available Variables (comma separated)</Label>
        <Input 
          type="text" 
          id="variables" 
          placeholder="name,company,date" 
          value={variables}
          onChange={e => setVariables(e.target.value)}
        />
      </div>

      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="description">Description (Optional)</Label>
        <Input 
          type="text" 
          id="description" 
          placeholder="A brief description of this template" 
          value={description}
          onChange={e => setDescription(e.target.value)}
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
        onClick={() => onSave({ 
          name, 
          subject, 
          body, 
          category, 
          description: description || null, 
          variables: variables || null, 
          isActive 
        })}
        disabled={isPending || !name || !subject || !body || !category}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Save Template
          </>
        )}
      </Button>
    </div>
  );
};

// Scheduled Email Form
const ScheduledEmailForm = ({
  scheduledEmail,
  templates,
  onSave,
  isPending
}: {
  scheduledEmail?: Partial<ScheduledEmail>;
  templates: EmailTemplate[];
  onSave: (email: Partial<ScheduledEmail>) => void;
  isPending: boolean;
}) => {
  const [to, setTo] = useState(scheduledEmail?.to || '');
  const [subject, setSubject] = useState(scheduledEmail?.subject || '');
  const [body, setBody] = useState(scheduledEmail?.body || '');
  const [templateId, setTemplateId] = useState<number | null>(scheduledEmail?.templateId || null);
  const [scheduledTime, setScheduledTime] = useState(
    scheduledEmail?.scheduledTime 
      ? new Date(scheduledEmail.scheduledTime).toISOString().slice(0, 16) 
      : new Date(Date.now() + 3600000).toISOString().slice(0, 16)
  );
  const [service, setService] = useState<string>(scheduledEmail?.service || 'smtp');
  const [isRecurring, setIsRecurring] = useState(scheduledEmail?.isRecurring || false);
  const [recurringRule, setRecurringRule] = useState(scheduledEmail?.recurringRule || 'FREQ=DAILY');

  // When a template is selected, update subject and body
  const handleTemplateChange = (id: string) => {
    const templateIdNum = parseInt(id);
    setTemplateId(templateIdNum || null);
    
    if (templateIdNum) {
      const selectedTemplate = templates.find(t => t.id === templateIdNum);
      if (selectedTemplate) {
        setSubject(selectedTemplate.subject);
        setBody(selectedTemplate.body);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="to">Recipient Email</Label>
        <Input 
          type="email" 
          id="to" 
          placeholder="recipient@example.com" 
          value={to}
          onChange={e => setTo(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="templateId">Template (Optional)</Label>
        <select 
          id="templateId" 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={templateId || ''}
          onChange={e => handleTemplateChange(e.target.value)}
        >
          <option value="">No Template</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.category})
            </option>
          ))}
        </select>
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input 
          type="text" 
          id="subject" 
          placeholder="Email Subject" 
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="body">Email Body</Label>
        <textarea 
          id="body" 
          className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Email content..." 
          value={body}
          onChange={e => setBody(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="scheduledTime">Schedule Time</Label>
        <Input 
          type="datetime-local" 
          id="scheduledTime" 
          value={scheduledTime}
          onChange={e => setScheduledTime(e.target.value)}
        />
      </div>
      
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="service">Email Service</Label>
        <select 
          id="service" 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={service}
          onChange={e => setService(e.target.value)}
        >
          <option value="smtp">SMTP</option>
          <option value="sendgrid">SendGrid</option>
          <option value="mailgun">Mailgun</option>
        </select>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch 
          id="isRecurring" 
          checked={isRecurring} 
          onCheckedChange={setIsRecurring} 
        />
        <Label htmlFor="isRecurring">Recurring Email</Label>
      </div>
      
      {isRecurring && (
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="recurringRule">Recurrence Pattern</Label>
          <select 
            id="recurringRule" 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={recurringRule}
            onChange={e => setRecurringRule(e.target.value)}
          >
            <option value="FREQ=DAILY">Daily</option>
            <option value="FREQ=WEEKLY;BYDAY=MO">Weekly on Monday</option>
            <option value="FREQ=WEEKLY;BYDAY=WE">Weekly on Wednesday</option>
            <option value="FREQ=WEEKLY;BYDAY=FR">Weekly on Friday</option>
            <option value="FREQ=MONTHLY;BYMONTHDAY=1">Monthly (1st day)</option>
            <option value="FREQ=MONTHLY;BYMONTHDAY=15">Monthly (15th day)</option>
          </select>
        </div>
      )}
      
      <Button 
        onClick={() => onSave({ 
          to, 
          subject, 
          body, 
          templateId: templateId || null, 
          scheduledTime: new Date(scheduledTime).toISOString(),
          service,
          isRecurring,
          recurringRule: isRecurring ? recurringRule : null
        })}
        disabled={isPending || !to || !subject || !body || !scheduledTime}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Scheduling...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Schedule Email
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
  const [createTemplateMode, setCreateTemplateMode] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
  const [createScheduledEmailMode, setCreateScheduledEmailMode] = useState(false);
  const [editScheduledEmailId, setEditScheduledEmailId] = useState<number | null>(null);
  
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
  
  // Query for fetching email templates
  const {
    data: emailTemplates,
    isLoading: isLoadingTemplates,
    error: templatesError
  } = useQuery({
    queryKey: ["/api/email/templates"],
    queryFn: () => getEmailTemplates()
  });
  
  // Query for fetching a specific template when editing
  const {
    data: editingTemplate,
    isLoading: isLoadingTemplate,
    error: templateError
  } = useQuery({
    queryKey: ["/api/email/templates", editTemplateId],
    queryFn: () => editTemplateId ? getEmailTemplate(editTemplateId) : null,
    enabled: !!editTemplateId
  });
  
  // Query for fetching scheduled emails
  const {
    data: scheduledEmails,
    isLoading: isLoadingScheduled,
    error: scheduledError
  } = useQuery({
    queryKey: ["/api/email/scheduled"],
    queryFn: getScheduledEmails
  });
  
  // Query for fetching a specific scheduled email when editing
  const {
    data: editingScheduledEmail,
    isLoading: isLoadingScheduledEmail,
    error: scheduledEmailError
  } = useQuery({
    queryKey: ["/api/email/scheduled", editScheduledEmailId],
    queryFn: () => editScheduledEmailId ? getScheduledEmail(editScheduledEmailId) : null,
    enabled: !!editScheduledEmailId
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
  
  // Mutation for creating a new email template
  const createTemplateMutation = useMutation({
    mutationFn: createEmailTemplate,
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Your email template has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/templates"] });
      setCreateTemplateMode(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create email template. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for updating an email template
  const updateTemplateMutation = useMutation({
    mutationFn: updateEmailTemplate,
    onSuccess: () => {
      toast({
        title: "Template Updated",
        description: "Your email template has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/templates"] });
      setEditTemplateId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update email template. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for deleting an email template
  const deleteTemplateMutation = useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Your email template has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/templates"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete email template. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for creating a scheduled email
  const createScheduledEmailMutation = useMutation({
    mutationFn: createScheduledEmail,
    onSuccess: () => {
      toast({
        title: "Email Scheduled",
        description: "Your email has been scheduled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/scheduled"] });
      setCreateScheduledEmailMode(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to schedule email. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for updating a scheduled email
  const updateScheduledEmailMutation = useMutation({
    mutationFn: updateScheduledEmail,
    onSuccess: () => {
      toast({
        title: "Scheduled Email Updated",
        description: "Your scheduled email has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/scheduled"] });
      setEditScheduledEmailId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update scheduled email. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for deleting a scheduled email
  const deleteScheduledEmailMutation = useMutation({
    mutationFn: deleteScheduledEmail,
    onSuccess: () => {
      toast({
        title: "Scheduled Email Deleted",
        description: "Your scheduled email has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/scheduled"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete scheduled email. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for canceling a scheduled email
  const cancelScheduledEmailMutation = useMutation({
    mutationFn: cancelScheduledEmail,
    onSuccess: () => {
      toast({
        title: "Scheduled Email Canceled",
        description: "Your scheduled email has been canceled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/scheduled"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to cancel scheduled email. Please try again.",
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

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="mailgun">Mailgun</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Inbox</CardTitle>
              <CardDescription>
                View and manage incoming emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : logsError ? (
                <div className="text-red-500">Failed to load email logs</div>
              ) : emailLogs?.length ? (
                <div className="space-y-4">
                  {emailLogs.filter(log => log.status === 'received').map((email) => (
                    <div key={email.id} className="border rounded-md p-4 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-sm font-medium">{email.from}</h3>
                          <p className="text-base font-semibold">{email.subject}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(email.timestamp))} ago
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{email.body}</p>
                      <div className="flex justify-end mt-2 space-x-2">
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4 mr-1" />
                          Reply
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Your inbox is empty</h3>
                  <p className="text-sm text-muted-foreground mt-1">No incoming emails found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose Email</CardTitle>
              <CardDescription>
                Create and send a new email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailService">Email Service</Label>
                  <Select defaultValue={emailConfigs?.sendgrid?.isActive ? "sendgrid" : emailConfigs?.smtp?.isActive ? "smtp" : emailConfigs?.mailgun?.isActive ? "mailgun" : "sendgrid"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select email service" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailConfigs?.sendgrid?.isActive && (
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                      )}
                      {emailConfigs?.smtp?.isActive && (
                        <SelectItem value="smtp">SMTP</SelectItem>
                      )}
                      {emailConfigs?.mailgun?.isActive && (
                        <SelectItem value="mailgun">Mailgun</SelectItem>
                      )}
                      {!(emailConfigs?.sendgrid?.isActive || emailConfigs?.smtp?.isActive || emailConfigs?.mailgun?.isActive) && (
                        <SelectItem value="none">No active service</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="from">From</Label>
                  <Input 
                    type="text" 
                    id="from" 
                    readOnly 
                    value={emailConfigs?.sendgrid?.fromEmail || emailConfigs?.smtp?.fromEmail || emailConfigs?.mailgun?.fromEmail || "noreply@example.com"}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <Input 
                    type="email" 
                    id="to" 
                    placeholder="recipient@example.com" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input 
                    type="text" 
                    id="subject" 
                    placeholder="Email subject" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="template">Use Template (Optional)</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {emailTemplates?.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="body">Email Body</Label>
                  <Textarea 
                    id="body" 
                    placeholder="Type your message here..." 
                    className="min-h-[200px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="schedule" />
                    <Label htmlFor="schedule">Schedule for later</Label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Save as Draft</Button>
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>
                  Create and manage reusable email templates
                </CardDescription>
              </div>
              {!createTemplateMode && !editTemplateId && (
                <Button size="sm" onClick={() => setCreateTemplateMode(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingTemplates ? (
                <Skeleton className="h-64 w-full" />
              ) : templatesError ? (
                <div className="text-red-500">Failed to load email templates</div>
              ) : createTemplateMode ? (
                <EmailTemplateForm 
                  onSave={createTemplateMutation.mutate}
                  isPending={createTemplateMutation.isPending}
                />
              ) : editTemplateId ? (
                isLoadingTemplate ? (
                  <Skeleton className="h-64 w-full" />
                ) : templateError ? (
                  <div className="text-red-500">Failed to load template details</div>
                ) : (
                  <EmailTemplateForm 
                    template={editingTemplate}
                    onSave={updateTemplateMutation.mutate}
                    isPending={updateTemplateMutation.isPending}
                  />
                )
              ) : emailTemplates?.length ? (
                <div className="space-y-3">
                  {emailTemplates.map((template) => (
                    <div key={template.id} className="p-3 border rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {template.category} • {template.subject}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setEditTemplateId(template.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this template?')) {
                                deleteTemplateMutation.mutate(template.id);
                              }
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex justify-center mb-4">
                    <Mail className="h-12 w-12 text-neutral-300" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No templates yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first email template to start automating your communication
                  </p>
                  <Button onClick={() => setCreateTemplateMode(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </div>
              )}
            </CardContent>
            {(createTemplateMode || editTemplateId) && (
              <CardFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCreateTemplateMode(false);
                    setEditTemplateId(undefined);
                  }}
                >
                  Cancel
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Scheduled Emails</CardTitle>
                <CardDescription>
                  Manage upcoming scheduled emails
                </CardDescription>
              </div>
              {!createScheduledEmailMode && !editScheduledEmailId && (
                <Button size="sm" onClick={() => setCreateScheduledEmailMode(true)}>
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Schedule New Email
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingScheduled ? (
                <Skeleton className="h-64 w-full" />
              ) : scheduledError ? (
                <div className="text-red-500">Failed to load scheduled emails</div>
              ) : createScheduledEmailMode ? (
                <ScheduledEmailForm 
                  templates={emailTemplates || []}
                  onSave={createScheduledEmailMutation.mutate}
                  isPending={createScheduledEmailMutation.isPending}
                />
              ) : editScheduledEmailId ? (
                isLoadingScheduledEmail ? (
                  <Skeleton className="h-64 w-full" />
                ) : scheduledEmailError ? (
                  <div className="text-red-500">Failed to load scheduled email details</div>
                ) : (
                  <ScheduledEmailForm 
                    scheduledEmail={editingScheduledEmail}
                    templates={emailTemplates || []}
                    onSave={updateScheduledEmailMutation.mutate}
                    isPending={updateScheduledEmailMutation.isPending}
                  />
                )
              ) : scheduledEmails?.length ? (
                <div className="space-y-3">
                  {scheduledEmails.map((email) => (
                    <div key={email.id} className="p-3 border rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium">{email.subject}</h4>
                            <StatusBadge 
                              status={email.status === 'pending' ? 'info' : 
                                     email.status === 'sent' ? 'operational' : 
                                     email.status === 'failed' ? 'outage' : 
                                     email.status === 'cancelled' ? 'inactive' : 'info'} 
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            To: {email.to} • {new Date(email.scheduledTime).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {email.status === 'pending' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditScheduledEmailId(email.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  if (confirm('Are you sure you want to cancel this scheduled email?')) {
                                    cancelScheduledEmailMutation.mutate(email.id);
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              // View email details
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex justify-center mb-4">
                    <CalendarClock className="h-12 w-12 text-neutral-300" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No scheduled emails</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Schedule emails to be sent automatically at specific dates and times
                  </p>
                  <Button onClick={() => setCreateScheduledMode(true)}>
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Schedule Email
                  </Button>
                </div>
              )}
            </CardContent>
            {(createScheduledMode || editScheduledId) && (
              <CardFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCreateScheduledMode(false);
                    setEditScheduledId(undefined);
                  }}
                >
                  Cancel
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>
              Create and manage reusable email templates
            </CardDescription>
          </div>
          {!createTemplateMode && !editTemplateId && (
            <Button size="sm" onClick={() => setCreateTemplateMode(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingTemplates ? (
            <Skeleton className="h-64 w-full" />
          ) : templatesError ? (
            <div className="text-red-500">Failed to load email templates</div>
          ) : createTemplateMode ? (
            <EmailTemplateForm 
              onSave={createTemplateMutation.mutate}
              isPending={createTemplateMutation.isPending}
            />
          ) : editTemplateId ? (
            isLoadingTemplate ? (
              <Skeleton className="h-64 w-full" />
            ) : templateError ? (
              <div className="text-red-500">Failed to load template details</div>
            ) : (
              <EmailTemplateForm 
                template={editingTemplate}
                onSave={updateTemplateMutation.mutate}
                isPending={updateTemplateMutation.isPending}
              />
            )
          ) : emailTemplates?.length ? (
            <div className="space-y-3">
              {emailTemplates.map((template) => (
                <div key={template.id} className="p-3 border rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {template.category} • {template.subject}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setEditTemplateId(template.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this template?')) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <Mail className="h-12 w-12 text-neutral-300" />
              </div>
              <h3 className="text-lg font-medium mb-2">No templates yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create email templates to streamline your communication
              </p>
              <Button onClick={() => setCreateTemplateMode(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </div>
          )}
        </CardContent>
        {(createTemplateMode || editTemplateId) && (
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateTemplateMode(false);
                setEditTemplateId(null);
              }}
            >
              Cancel
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Scheduled Emails</CardTitle>
            <CardDescription>
              Schedule emails to be sent automatically at specific times
            </CardDescription>
          </div>
          {!createScheduledEmailMode && !editScheduledEmailId && (
            <Button size="sm" onClick={() => setCreateScheduledEmailMode(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Email
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingScheduled ? (
            <Skeleton className="h-64 w-full" />
          ) : scheduledError ? (
            <div className="text-red-500">Failed to load scheduled emails</div>
          ) : createScheduledEmailMode ? (
            <ScheduledEmailForm 
              templates={emailTemplates || []}
              onSave={createScheduledEmailMutation.mutate}
              isPending={createScheduledEmailMutation.isPending}
            />
          ) : editScheduledEmailId ? (
            isLoadingScheduledEmail ? (
              <Skeleton className="h-64 w-full" />
            ) : scheduledEmailError ? (
              <div className="text-red-500">Failed to load scheduled email details</div>
            ) : (
              <ScheduledEmailForm 
                scheduledEmail={editingScheduledEmail}
                templates={emailTemplates || []}
                onSave={updateScheduledEmailMutation.mutate}
                isPending={updateScheduledEmailMutation.isPending}
              />
            )
          ) : scheduledEmails?.length ? (
            <div className="space-y-3">
              {scheduledEmails.map((email) => (
                <div key={email.id} className="p-3 border rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{email.subject}</h4>
                      <p className="text-sm text-muted-foreground">
                        To: {email.to} • {new Date(email.scheduledTime).toLocaleString()}
                        {email.isRecurring && " • Recurring"}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <StatusBadge 
                        status={email.status === 'scheduled' 
                          ? 'operational' 
                          : email.status === 'pending' 
                          ? 'maintenance' 
                          : email.status === 'sent'
                          ? 'info'
                          : 'error'} 
                        text={email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                      />
                      {email.status === 'scheduled' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setEditScheduledEmailId(email.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              if (confirm('Are you sure you want to cancel this scheduled email?')) {
                                cancelScheduledEmailMutation.mutate(email.id);
                              }
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this scheduled email?')) {
                                deleteScheduledEmailMutation.mutate(email.id);
                              }
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <CalendarClock className="h-12 w-12 text-neutral-300" />
              </div>
              <h3 className="text-lg font-medium mb-2">No scheduled emails</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Schedule emails to be sent automatically at your preferred time
              </p>
              <Button onClick={() => setCreateScheduledEmailMode(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Email
              </Button>
            </div>
          )}
        </CardContent>
        {(createScheduledEmailMode || editScheduledEmailId) && (
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateScheduledEmailMode(false);
                setEditScheduledEmailId(null);
              }}
            >
              Cancel
            </Button>
          </CardFooter>
        )}
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
