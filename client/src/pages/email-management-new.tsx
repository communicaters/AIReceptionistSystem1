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
  type ScheduledEmail,
  type EmailLog
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

// Test Email Dialog Component
const TestEmailDialog = ({
  onSend,
  isPending
}: {
  onSend: (to: string, service?: 'sendgrid' | 'smtp' | 'mailgun') => void;
  isPending: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [service, setService] = useState<'sendgrid' | 'smtp' | 'mailgun' | undefined>();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
          Test Email
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Test Email</DialogTitle>
          <DialogDescription>
            Send a test email to verify that your email configuration is working properly.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="service">Email Service</Label>
              <select 
                id="service"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={service}
                onChange={e => setService(e.target.value as 'sendgrid' | 'smtp' | 'mailgun' | undefined)}
              >
                <option value="">Auto-select best service</option>
                <option value="sendgrid">SendGrid</option>
                <option value="smtp">SMTP</option>
                <option value="mailgun">Mailgun</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Recipient Email</Label>
              <Input 
                id="to" 
                type="email" 
                placeholder="email@example.com" 
                value={to}
                onChange={e => setTo(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !to}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Email Template Form definition
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
        <Textarea 
          id="body" 
          className="min-h-[200px]"
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

// Scheduled Email Form definition
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
  const [scheduledTime, setScheduledTime] = useState(
    scheduledEmail?.scheduledTime 
      ? new Date(scheduledEmail.scheduledTime).toISOString().slice(0, 16) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [service, setService] = useState<'sendgrid' | 'smtp' | 'mailgun'>(
    (scheduledEmail?.service as 'sendgrid' | 'smtp' | 'mailgun') || 'sendgrid'
  );
  const [templateId, setTemplateId] = useState<number | undefined>(
    scheduledEmail?.templateId || undefined
  );
  const [isRecurring, setIsRecurring] = useState(scheduledEmail?.isRecurring || false);
  const [recurringRule, setRecurringRule] = useState(scheduledEmail?.recurringRule || '');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="service">Email Service</Label>
        <Select 
          value={service} 
          onValueChange={(value) => setService(value as 'sendgrid' | 'smtp' | 'mailgun')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select email service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sendgrid">SendGrid</SelectItem>
            <SelectItem value="smtp">SMTP</SelectItem>
            <SelectItem value="mailgun">Mailgun</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="template">Use Template (Optional)</Label>
        <Select 
          value={templateId?.toString() || ''} 
          onValueChange={(value) => setTemplateId(value ? parseInt(value) : undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No template</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id.toString()}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="to">To</Label>
        <Input 
          type="email" 
          id="to" 
          placeholder="recipient@example.com" 
          value={to}
          onChange={e => setTo(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input 
          type="text" 
          id="subject" 
          placeholder="Email subject" 
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />
      </div>
      
      {!templateId && (
        <div className="space-y-2">
          <Label htmlFor="body">Email Body</Label>
          <Textarea 
            id="body" 
            placeholder="Type your message here..." 
            className="min-h-[200px]"
            value={body || ''}
            onChange={e => setBody(e.target.value)}
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="scheduledTime">Scheduled Time</Label>
        <Input 
          type="datetime-local" 
          id="scheduledTime" 
          value={scheduledTime}
          onChange={e => setScheduledTime(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Switch 
            id="isRecurring" 
            checked={isRecurring} 
            onCheckedChange={setIsRecurring} 
          />
          <Label htmlFor="isRecurring">Recurring Email</Label>
        </div>
      </div>
      
      {isRecurring && (
        <div className="space-y-2">
          <Label htmlFor="recurringRule">Recurring Pattern</Label>
          <Select 
            value={recurringRule || 'FREQ=DAILY'} 
            onValueChange={setRecurringRule}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select recurring pattern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FREQ=DAILY">Daily</SelectItem>
              <SelectItem value="FREQ=WEEKLY">Weekly</SelectItem>
              <SelectItem value="FREQ=WEEKLY;BYDAY=MO,WE,FR">Monday, Wednesday, Friday</SelectItem>
              <SelectItem value="FREQ=MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      <Button 
        onClick={() => onSave({ 
          to, 
          subject, 
          body: !templateId ? body : undefined, 
          scheduledTime: new Date(scheduledTime).toISOString(), 
          service,
          templateId: templateId || null,
          isRecurring,
          recurringRule: isRecurring ? recurringRule : null
        })}
        disabled={isPending || !to || !subject || (!templateId && !body) || !scheduledTime}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            {scheduledEmail?.id ? 'Update Scheduled Email' : 'Schedule Email'}
          </>
        )}
      </Button>
    </div>
  );
};

// Main Email Management Component
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
  const [viewEmailLog, setViewEmailLog] = useState<EmailLog | null>(null);
  
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
  
  // Mutation for updating SendGrid config
  const sendgridMutation = useMutation({
    mutationFn: saveSendgridConfig,
    onSuccess: () => {
      toast({
        title: "SendGrid Configuration Saved",
        description: "Your SendGrid settings have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/configs"] });
      setConfigureSendgrid(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Save",
        description: "Error saving SendGrid configuration: " + error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for updating SMTP config
  const smtpMutation = useMutation({
    mutationFn: saveSmtpConfig,
    onSuccess: () => {
      toast({
        title: "SMTP Configuration Saved",
        description: "Your SMTP settings have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/configs"] });
      setConfigureSmtp(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Save",
        description: "Error saving SMTP configuration: " + error.message,
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
          title: "SMTP Connection Verified",
          description: data.message || "Your SMTP settings are working correctly",
        });
      } else {
        toast({
          title: "SMTP Verification Failed",
          description: data.message || "Your SMTP settings could not be verified",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "SMTP Verification Failed",
        description: "Error verifying SMTP connection: " + error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for updating Mailgun config
  const mailgunMutation = useMutation({
    mutationFn: saveMailgunConfig,
    onSuccess: () => {
      toast({
        title: "Mailgun Configuration Saved",
        description: "Your Mailgun settings have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/configs"] });
      setConfigureMailgun(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Save",
        description: "Error saving Mailgun configuration: " + error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for sending test emails
  const testEmailMutation = useMutation({
    mutationFn: ({ to, service }: { to: string; service?: 'sendgrid' | 'smtp' | 'mailgun' }) => 
      sendTestEmail(to, service),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Test Email Sent",
          description: data.message || "Your test email has been sent successfully",
        });
      } else {
        toast({
          title: "Failed to Send Test Email",
          description: data.message || "Your test email could not be sent",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Test Email",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for processing incoming emails
  const processEmailMutation = useMutation({
    mutationFn: processIncomingEmail,
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Email Processed",
          description: "The email has been processed successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/email/logs"] });
      } else {
        toast({
          title: "Failed to Process Email",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to Process Email",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for creating email templates
  const createTemplateMutation = useMutation({
    mutationFn: createEmailTemplate,
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Your email template has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/templates"] });
      setCreateTemplateMode(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Template",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for updating email templates
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, ...template }: { id: number } & Partial<EmailTemplate>) => 
      updateEmailTemplate(id, template),
    onSuccess: () => {
      toast({
        title: "Template Updated",
        description: "Your email template has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/templates"] });
      setEditTemplateId(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Template",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for deleting email templates
  const deleteTemplateMutation = useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Your email template has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/templates"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Delete Template",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for creating scheduled emails
  const createScheduledEmailMutation = useMutation({
    mutationFn: createScheduledEmail,
    onSuccess: () => {
      toast({
        title: "Email Scheduled",
        description: "Your email has been scheduled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/scheduled"] });
      setCreateScheduledEmailMode(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Schedule Email",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for updating scheduled emails
  const updateScheduledEmailMutation = useMutation({
    mutationFn: ({ id, ...email }: { id: number } & Partial<ScheduledEmail>) => 
      updateScheduledEmail(id, email),
    onSuccess: () => {
      toast({
        title: "Scheduled Email Updated",
        description: "Your scheduled email has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/scheduled"] });
      setEditScheduledEmailId(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Scheduled Email",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for deleting scheduled emails
  const deleteScheduledEmailMutation = useMutation({
    mutationFn: deleteScheduledEmail,
    onSuccess: () => {
      toast({
        title: "Scheduled Email Deleted",
        description: "Your scheduled email has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/scheduled"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Delete Scheduled Email",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for cancelling scheduled emails
  const cancelScheduledEmailMutation = useMutation({
    mutationFn: cancelScheduledEmail,
    onSuccess: () => {
      toast({
        title: "Scheduled Email Cancelled",
        description: "Your scheduled email has been cancelled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/scheduled"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Cancel Scheduled Email",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSendgridSubmit = (config: Partial<SendgridConfig>) => {
    sendgridMutation.mutate(config);
  };
  
  const handleSmtpSubmit = (config: Partial<SmtpConfig>) => {
    smtpMutation.mutate(config);
  };
  
  const handleMailgunSubmit = (config: Partial<MailgunConfig>) => {
    mailgunMutation.mutate(config);
  };
  
  const handleVerifySmtp = (config: { host: string; port: string | number; username: string; password: string }) => {
    verifySmtpMutation.mutate(config);
  };
  
  const handleCreateTemplate = (template: Partial<EmailTemplate>) => {
    createTemplateMutation.mutate(template as Omit<EmailTemplate, "id" | "createdAt" | "lastUpdated">);
  };
  
  const handleUpdateTemplate = (template: Partial<EmailTemplate>) => {
    if (editTemplateId) {
      updateTemplateMutation.mutate({ id: editTemplateId, ...template });
    }
  };
  
  const handleCreateScheduledEmail = (email: Partial<ScheduledEmail>) => {
    createScheduledEmailMutation.mutate(email as any);
  };
  
  const handleUpdateScheduledEmail = (email: Partial<ScheduledEmail>) => {
    if (editScheduledEmailId) {
      updateScheduledEmailMutation.mutate({ id: editScheduledEmailId, ...email });
    }
  };

  return (
    <>
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
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setViewEmailLog(email)}
                          >
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
                    onSave={handleCreateTemplate}
                    isPending={createTemplateMutation.isPending}
                  />
                ) : editTemplateId ? (
                  isLoadingTemplate ? (
                    <Skeleton className="h-64 w-full" />
                  ) : templateError ? (
                    <div className="text-red-500">Failed to load template details</div>
                  ) : (
                    <EmailTemplateForm 
                      template={editingTemplate || undefined}
                      onSave={handleUpdateTemplate}
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
                      setEditTemplateId(null);
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
                    onSave={handleCreateScheduledEmail}
                    isPending={createScheduledEmailMutation.isPending}
                  />
                ) : editScheduledEmailId ? (
                  isLoadingScheduledEmail ? (
                    <Skeleton className="h-64 w-full" />
                  ) : scheduledEmailError ? (
                    <div className="text-red-500">Failed to load scheduled email details</div>
                  ) : (
                    <ScheduledEmailForm 
                      scheduledEmail={editingScheduledEmail || undefined}
                      templates={emailTemplates || []}
                      onSave={handleUpdateScheduledEmail}
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
                              <StatusBadge status={
                                email.status === 'pending' ? 'info' : 
                                email.status === 'sent' ? 'operational' : 
                                email.status === 'failed' ? 'outage' : 
                                email.status === 'cancelled' ? 'inactive' : 'info'
                              } />
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
                      Schedule your first email to automate your communication
                    </p>
                    <Button onClick={() => setCreateScheduledEmailMode(true)}>
                      <CalendarClock className="mr-2 h-4 w-4" />
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
          </TabsContent>
          
          <TabsContent value="sendgrid" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SendGrid Configuration</CardTitle>
                <CardDescription>
                  Configure SendGrid to send emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingConfigs ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : configError ? (
                  <div className="text-red-500">Failed to load SendGrid configuration</div>
                ) : configureSendgrid ? (
                  <div className="space-y-6">
                    <a 
                      href="https://app.sendgrid.com/settings/api_keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
                    >
                      Get your SendGrid API Key
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4 ml-1" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                        />
                      </svg>
                    </a>
                    <SendGridConfigForm 
                      currentConfig={emailConfigs?.sendgrid || null}
                      onSave={handleSendgridSubmit}
                      isPending={sendgridMutation.isPending}
                    />
                  </div>
                ) : emailConfigs?.sendgrid ? (
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-1">From Email</h3>
                      <p className="text-sm text-neutral-600">{emailConfigs.sendgrid.fromEmail}</p>
                    </div>
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-1">From Name</h3>
                      <p className="text-sm text-neutral-600">{emailConfigs.sendgrid.fromName}</p>
                    </div>
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-1">Status</h3>
                      <div className="flex items-center space-x-2">
                        {emailConfigs.sendgrid.isActive ? (
                          <StatusBadge status="operational" />
                        ) : (
                          <StatusBadge status="inactive" />
                        )}
                        <span className="text-sm">
                          {emailConfigs.sendgrid.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => setConfigureSendgrid(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Configuration
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex justify-center mb-4">
                      <svg 
                        className="h-12 w-12 text-neutral-300" 
                        viewBox="0 0 32 32" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          d="M32 13.958c0-7.186-7.186-13.026-16-13.026s-16 5.84-16 13.026c0 6.531 5.916 11.926 13.867 12.934v-9.068h-4.133v-3.866h4.133v-2.932c0-4.027 2.4-6.267 6.133-6.267 1.6 0 3.2.267 3.2.267v3.6h-1.867c-1.733 0-2.266 1.067-2.266 2.133v2.666h4l-.667 3.866h-3.333v9.069c7.947-1.008 13.867-6.431 13.867-12.934z" 
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">SendGrid Not Configured</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure SendGrid to send emails through their API
                    </p>
                    <Button onClick={() => setConfigureSendgrid(true)}>
                      Configure SendGrid
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="smtp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SMTP Configuration</CardTitle>
                <CardDescription>
                  Configure SMTP server to send emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingConfigs ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : configError ? (
                  <div className="text-red-500">Failed to load SMTP configuration</div>
                ) : configureSmtp ? (
                  <SmtpConfigForm 
                    currentConfig={emailConfigs?.smtp || null}
                    onSave={handleSmtpSubmit}
                    onVerify={handleVerifySmtp}
                    isPending={smtpMutation.isPending}
                    isVerifying={verifySmtpMutation.isPending}
                  />
                ) : emailConfigs?.smtp ? (
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-1">SMTP Server</h3>
                      <p className="text-sm text-neutral-600">{emailConfigs.smtp.host}:{emailConfigs.smtp.port}</p>
                    </div>
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-1">Username</h3>
                      <p className="text-sm text-neutral-600">{emailConfigs.smtp.username}</p>
                    </div>
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-1">From Email</h3>
                      <p className="text-sm text-neutral-600">{emailConfigs.smtp.fromEmail}</p>
                    </div>
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-1">Status</h3>
                      <div className="flex items-center space-x-2">
                        {emailConfigs.smtp.isActive ? (
                          <StatusBadge status="operational" />
                        ) : (
                          <StatusBadge status="inactive" />
                        )}
                        <span className="text-sm">
                          {emailConfigs.smtp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={() => setConfigureSmtp(true)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Configuration
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => verifySmtpMutation.mutate()}
                        disabled={verifySmtpMutation.isPending}
                      >
                        {verifySmtpMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Verify Connection
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex justify-center mb-4">
                      <Mail className="h-12 w-12 text-neutral-300" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">SMTP Not Configured</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure an SMTP server to send emails directly
                    </p>
                    <Button onClick={() => setConfigureSmtp(true)}>
                      Configure SMTP
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="mailgun" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mailgun Configuration</CardTitle>
                <CardDescription>
                  Configure Mailgun to send emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingConfigs ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : configError ? (
                  <div className="text-red-500">Failed to load Mailgun configuration</div>
                ) : configureMailgun ? (
                  <div className="space-y-6">
                    <a 
                      href="https://app.mailgun.com/app/account/security/api_keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
                    >
                      Get your Mailgun API Key
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4 ml-1" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                        />
                      </svg>
                    </a>
                    <MailgunConfigForm 
                      currentConfig={emailConfigs?.mailgun || null}
                      onSave={handleMailgunSubmit}
                      isPending={mailgunMutation.isPending}
                    />
                  </div>
                ) : emailConfigs?.mailgun ? (
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-1">Domain</h3>
                      <p className="text-sm text-neutral-600">{emailConfigs.mailgun.domain}</p>
                    </div>
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-1">From Email</h3>
                      <p className="text-sm text-neutral-600">{emailConfigs.mailgun.fromEmail}</p>
                    </div>
                    {emailConfigs.mailgun.fromName && (
                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-1">From Name</h3>
                        <p className="text-sm text-neutral-600">{emailConfigs.mailgun.fromName}</p>
                      </div>
                    )}
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-1">Status</h3>
                      <div className="flex items-center space-x-2">
                        {emailConfigs.mailgun.isActive ? (
                          <StatusBadge status="operational" />
                        ) : (
                          <StatusBadge status="inactive" />
                        )}
                        <span className="text-sm">
                          {emailConfigs.mailgun.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => setConfigureMailgun(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Configuration
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex justify-center mb-4">
                      <svg 
                        className="h-12 w-12 text-neutral-300" 
                        viewBox="0 0 32 32" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          d="M32 13.958c0-7.186-7.186-13.026-16-13.026s-16 5.84-16 13.026c0 6.531 5.916 11.926 13.867 12.934v-9.068h-4.133v-3.866h4.133v-2.932c0-4.027 2.4-6.267 6.133-6.267 1.6 0 3.2.267 3.2.267v3.6h-1.867c-1.733 0-2.266 1.067-2.266 2.133v2.666h4l-.667 3.866h-3.333v9.069c7.947-1.008 13.867-6.431 13.867-12.934z" 
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">Mailgun Not Configured</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure Mailgun to send emails through their API
                    </p>
                    <Button onClick={() => setConfigureMailgun(true)}>
                      Configure Mailgun
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <Card>
          <CardHeader>
            <CardTitle>Email Logs</CardTitle>
            <CardDescription>
              View recent email logs
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLogs.map((log) => (
                    <TableRow key={log.id}>
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setViewEmailLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No email logs found</p>
              </div>
            )}
          </CardContent>
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
      
      {/* Email View Dialog */}
      <Dialog open={!!viewEmailLog} onOpenChange={(open) => !open && setViewEmailLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>
              View the details of this email
            </DialogDescription>
          </DialogHeader>
          
          {viewEmailLog && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-neutral-500">From</h3>
                  <p className="mt-1">{viewEmailLog.from}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-neutral-500">To</h3>
                  <p className="mt-1">{viewEmailLog.to}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-neutral-500">Date</h3>
                  <p className="mt-1">{new Date(viewEmailLog.timestamp).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-neutral-500">Subject</h3>
                <p className="mt-1 font-medium">{viewEmailLog.subject}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-neutral-500">Status</h3>
                <div className="mt-1">
                  <StatusBadge status={
                    viewEmailLog.status === 'sent' || viewEmailLog.status === 'delivered' 
                      ? 'operational' 
                      : viewEmailLog.status === 'failed' 
                      ? 'outage' 
                      : 'degraded'
                  } />
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-neutral-500">Message</h3>
                <div className="mt-2 p-4 border rounded-md whitespace-pre-wrap bg-slate-50">
                  {viewEmailLog.body}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewEmailLog(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmailManagement;