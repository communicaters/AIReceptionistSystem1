import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  getVoiceConfigs, 
  getCallLogs, 
  saveTwilioConfig, 
  saveSipConfig, 
  saveOpenPhoneConfig, 
  makeTestCall 
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
import { 
  Check, 
  ChevronDown, 
  Copy, 
  Edit3, 
  Eye, 
  EyeOff, 
  Loader2, 
  Phone, 
  PhoneCall, 
  PhoneForwarded, 
  PhoneIncoming, 
  PhoneOff, 
  Save 
} from "lucide-react";
import StatusBadge from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Interface for service configuration states
interface ConfigValues {
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  isActive?: boolean;
  username?: string;
  password?: string;
  serverUrl?: string;
  extension?: string;
  apiKey?: string;
}

interface TestCallState {
  phoneNumber: string;
  message: string;
}

const VoiceCall = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Test call state
  const [testCallOpen, setTestCallOpen] = useState(false);
  const [testCall, setTestCall] = useState<TestCallState>({
    phoneNumber: "",
    message: "This is a test call from the AI receptionist system. The system is working properly."
  });
  
  // Configuration edit states
  const [editingTwilio, setEditingTwilio] = useState(false);
  const [editingSip, setEditingSip] = useState(false);
  const [editingOpenPhone, setEditingOpenPhone] = useState(false);
  
  const [twilioConfig, setTwilioConfig] = useState<ConfigValues>({
    accountSid: "",
    authToken: "",
    phoneNumber: "",
    isActive: true
  });
  
  const [sipConfig, setSipConfig] = useState<ConfigValues>({
    username: "",
    password: "",
    serverUrl: "",
    extension: "",
    isActive: true
  });
  
  const [openPhoneConfig, setOpenPhoneConfig] = useState<ConfigValues>({
    phoneNumber: "",
    apiKey: "",
    isActive: true
  });
  
  // Password visibility
  const [showPasswords, setShowPasswords] = useState(false);
  
  // Fetch voice configurations
  const { 
    data: voiceConfigs, 
    isLoading: isLoadingConfigs,
    error: configError
  } = useQuery({
    queryKey: ["/api/voice/configs"],
    queryFn: getVoiceConfigs,
    onSuccess: (data) => {
      // Initialize form states with current values
      if (data.twilio) {
        setTwilioConfig({
          accountSid: data.twilio.accountSid,
          authToken: data.twilio.authToken,
          phoneNumber: data.twilio.phoneNumber,
          isActive: data.twilio.isActive
        });
      }
      
      if (data.sip) {
        setSipConfig({
          username: data.sip.username,
          password: data.sip.password,
          serverUrl: data.sip.serverUrl,
          extension: data.sip.extension || "",
          isActive: data.sip.isActive
        });
      }
      
      if (data.openPhone) {
        setOpenPhoneConfig({
          phoneNumber: data.openPhone.phoneNumber,
          apiKey: data.openPhone.apiKey,
          isActive: data.openPhone.isActive
        });
      }
    }
  });

  // Fetch call logs
  const { 
    data: callLogs, 
    isLoading: isLoadingLogs,
    error: logsError
  } = useQuery({
    queryKey: ["/api/voice/logs"],
    queryFn: () => getCallLogs(10)
  });
  
  // Mutations for saving configurations
  const twilioMutation = useMutation({
    mutationFn: saveTwilioConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice/configs"] });
      toast({
        title: "Twilio configuration saved",
        description: "Your Twilio settings have been updated successfully.",
      });
      setEditingTwilio(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save Twilio configuration",
        description: error.message || "There was an error saving your Twilio settings.",
        variant: "destructive",
      });
    }
  });
  
  const sipMutation = useMutation({
    mutationFn: saveSipConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice/configs"] });
      toast({
        title: "SIP configuration saved",
        description: "Your SIP settings have been updated successfully.",
      });
      setEditingSip(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save SIP configuration",
        description: error.message || "There was an error saving your SIP settings.",
        variant: "destructive",
      });
    }
  });
  
  const openPhoneMutation = useMutation({
    mutationFn: saveOpenPhoneConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice/configs"] });
      toast({
        title: "OpenPhone configuration saved",
        description: "Your OpenPhone settings have been updated successfully.",
      });
      setEditingOpenPhone(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save OpenPhone configuration",
        description: error.message || "There was an error saving your OpenPhone settings.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for making test calls
  const testCallMutation = useMutation({
    mutationFn: (data: TestCallState) => makeTestCall(data.phoneNumber, data.message),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Test call initiated",
          description: `Call to ${testCall.phoneNumber} has been initiated successfully.`,
        });
        setTestCallOpen(false);
        
        // Refresh call logs after a successful call
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/voice/logs"] });
        }, 2000);
      } else {
        toast({
          title: "Test call failed",
          description: data.error || "There was an error making the test call.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to make test call",
        description: error.message || "There was an error initiating the test call.",
        variant: "destructive",
      });
    }
  });
  
  // Handlers for saving configurations
  const saveTwilioSettings = () => {
    if (!twilioConfig.accountSid || !twilioConfig.authToken || !twilioConfig.phoneNumber) {
      toast({
        title: "Missing required fields",
        description: "Account SID, Auth Token, and Phone Number are required.",
        variant: "destructive",
      });
      return;
    }
    
    twilioMutation.mutate(twilioConfig);
  };
  
  const saveSipSettings = () => {
    if (!sipConfig.username || !sipConfig.password || !sipConfig.serverUrl) {
      toast({
        title: "Missing required fields",
        description: "Username, Password, and Server URL are required.",
        variant: "destructive",
      });
      return;
    }
    
    sipMutation.mutate(sipConfig);
  };
  
  const saveOpenPhoneSettings = () => {
    if (!openPhoneConfig.phoneNumber || !openPhoneConfig.apiKey) {
      toast({
        title: "Missing required fields",
        description: "Phone Number and API Key are required.",
        variant: "destructive",
      });
      return;
    }
    
    openPhoneMutation.mutate(openPhoneConfig);
  };
  
  // Handler for making test calls
  const initiateTestCall = () => {
    if (!testCall.phoneNumber) {
      toast({
        title: "Missing phone number",
        description: "Please enter a phone number to make a test call.",
        variant: "destructive",
      });
      return;
    }
    
    testCallMutation.mutate(testCall);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice Call Handling</h1>
          <p className="text-muted-foreground">
            Manage voice calls, view call logs, and configure phone services
          </p>
        </div>
        <Dialog open={testCallOpen} onOpenChange={setTestCallOpen}>
          <DialogTrigger asChild>
            <Button>
              <Phone className="mr-2 h-4 w-4" />
              Make Test Call
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Make a Test Call</DialogTitle>
              <DialogDescription>
                Enter a phone number to make a test call. The system will call the number and play a test message.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  placeholder="+12025551234" 
                  value={testCall.phoneNumber} 
                  onChange={(e) => setTestCall({...testCall, phoneNumber: e.target.value})} 
                />
                <p className="text-sm text-muted-foreground">Enter in E.164 format (e.g., +12025551234)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Test Message</Label>
                <Input 
                  id="message" 
                  placeholder="Test message" 
                  value={testCall.message} 
                  onChange={(e) => setTestCall({...testCall, message: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTestCallOpen(false)}>Cancel</Button>
              <Button 
                onClick={initiateTestCall}
                disabled={testCallMutation.isPending}
              >
                {testCallMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Make Call
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="twilio">
        <TabsList>
          <TabsTrigger value="twilio">Twilio</TabsTrigger>
          <TabsTrigger value="sip">SIP</TabsTrigger>
          <TabsTrigger value="openphone">OpenPhone</TabsTrigger>
        </TabsList>
        {/* Twilio Tab */}
        <TabsContent value="twilio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Twilio Configuration</CardTitle>
              <CardDescription>
                Manage your Twilio account settings for voice calls
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
                <div className="text-red-500">Failed to load Twilio configuration</div>
              ) : editingTwilio ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="accountSid">Account SID</Label>
                      <Input 
                        id="accountSid" 
                        value={twilioConfig.accountSid} 
                        onChange={(e) => setTwilioConfig({...twilioConfig, accountSid: e.target.value})} 
                        placeholder="Enter your Twilio Account SID" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="authToken">Auth Token</Label>
                      <div className="flex">
                        <Input 
                          id="authToken" 
                          value={twilioConfig.authToken} 
                          onChange={(e) => setTwilioConfig({...twilioConfig, authToken: e.target.value})} 
                          placeholder="Enter your Twilio Auth Token" 
                          type={showPasswords ? "text" : "password"} 
                          className="flex-1 rounded-r-none"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="rounded-l-none"
                          onClick={() => setShowPasswords(!showPasswords)}
                        >
                          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input 
                        id="phoneNumber" 
                        value={twilioConfig.phoneNumber} 
                        onChange={(e) => setTwilioConfig({...twilioConfig, phoneNumber: e.target.value})} 
                        placeholder="+12025551234" 
                      />
                      <p className="text-xs text-muted-foreground">E.164 format (e.g., +12025551234)</p>
                    </div>
                    <div className="space-y-2 flex items-end">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="isActive" 
                          checked={twilioConfig.isActive} 
                          onCheckedChange={(checked) => setTwilioConfig({...twilioConfig, isActive: checked})} 
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Account SID</h3>
                    <p className="mt-1">{voiceConfigs?.twilio?.accountSid || "Not configured"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Phone Number</h3>
                    <p className="mt-1">{voiceConfigs?.twilio?.phoneNumber || "Not configured"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Status</h3>
                    <p className="mt-1">
                      <StatusBadge 
                        status={voiceConfigs?.twilio?.isActive ? "operational" : "inactive"} 
                      />
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              {editingTwilio ? (
                <>
                  <Button 
                    variant="outline" 
                    className="mr-2" 
                    onClick={() => setEditingTwilio(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveTwilioSettings}
                    disabled={twilioMutation.isPending}
                  >
                    {twilioMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    className="mr-2" 
                    onClick={() => setEditingTwilio(true)}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Configuration
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* SIP Tab */}
        <TabsContent value="sip">
          <Card>
            <CardHeader>
              <CardTitle>SIP Configuration</CardTitle>
              <CardDescription>
                Configure SIP server details for voice calls
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
                <div className="text-red-500">Failed to load SIP configuration</div>
              ) : editingSip ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input 
                        id="username" 
                        value={sipConfig.username} 
                        onChange={(e) => setSipConfig({...sipConfig, username: e.target.value})} 
                        placeholder="Enter SIP username" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="flex">
                        <Input 
                          id="password" 
                          value={sipConfig.password} 
                          onChange={(e) => setSipConfig({...sipConfig, password: e.target.value})} 
                          placeholder="Enter SIP password" 
                          type={showPasswords ? "text" : "password"} 
                          className="flex-1 rounded-r-none"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="rounded-l-none"
                          onClick={() => setShowPasswords(!showPasswords)}
                        >
                          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serverUrl">Server URL</Label>
                      <Input 
                        id="serverUrl" 
                        value={sipConfig.serverUrl} 
                        onChange={(e) => setSipConfig({...sipConfig, serverUrl: e.target.value})} 
                        placeholder="sip.example.com" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="extension">Extension (Optional)</Label>
                      <Input 
                        id="extension" 
                        value={sipConfig.extension} 
                        onChange={(e) => setSipConfig({...sipConfig, extension: e.target.value})} 
                        placeholder="1234" 
                      />
                    </div>
                    <div className="space-y-2 flex items-end">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="sipIsActive" 
                          checked={sipConfig.isActive} 
                          onCheckedChange={(checked) => setSipConfig({...sipConfig, isActive: checked})} 
                        />
                        <Label htmlFor="sipIsActive">Active</Label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : voiceConfigs?.sip ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Username</h3>
                    <p className="mt-1">{voiceConfigs.sip.username}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Server URL</h3>
                    <p className="mt-1">{voiceConfigs.sip.serverUrl}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Extension</h3>
                    <p className="mt-1">{voiceConfigs.sip.extension || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Status</h3>
                    <p className="mt-1">
                      <StatusBadge 
                        status={voiceConfigs.sip.isActive ? "operational" : "inactive"} 
                      />
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-500">SIP is not configured yet</p>
              )}
            </CardContent>
            <CardFooter>
              {editingSip ? (
                <>
                  <Button 
                    variant="outline" 
                    className="mr-2" 
                    onClick={() => setEditingSip(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveSipSettings}
                    disabled={sipMutation.isPending}
                  >
                    {sipMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => setEditingSip(true)}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    {voiceConfigs?.sip ? "Edit Configuration" : "Configure SIP"}
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* OpenPhone Tab */}
        <TabsContent value="openphone">
          <Card>
            <CardHeader>
              <CardTitle>OpenPhone Configuration</CardTitle>
              <CardDescription>
                Set up OpenPhone integration for voice calls
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
                <div className="text-red-500">Failed to load OpenPhone configuration</div>
              ) : editingOpenPhone ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="openphone-phone">Phone Number</Label>
                      <Input 
                        id="openphone-phone" 
                        value={openPhoneConfig.phoneNumber} 
                        onChange={(e) => setOpenPhoneConfig({...openPhoneConfig, phoneNumber: e.target.value})} 
                        placeholder="+12025551234" 
                      />
                      <p className="text-xs text-muted-foreground">E.164 format (e.g., +12025551234)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <div className="flex">
                        <Input 
                          id="apiKey" 
                          value={openPhoneConfig.apiKey} 
                          onChange={(e) => setOpenPhoneConfig({...openPhoneConfig, apiKey: e.target.value})} 
                          placeholder="Enter your OpenPhone API Key" 
                          type={showPasswords ? "text" : "password"} 
                          className="flex-1 rounded-r-none"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="rounded-l-none"
                          onClick={() => setShowPasswords(!showPasswords)}
                        >
                          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 flex items-end">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="openPhoneIsActive" 
                          checked={openPhoneConfig.isActive} 
                          onCheckedChange={(checked) => setOpenPhoneConfig({...openPhoneConfig, isActive: checked})} 
                        />
                        <Label htmlFor="openPhoneIsActive">Active</Label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : voiceConfigs?.openPhone ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Phone Number</h3>
                    <p className="mt-1">{voiceConfigs.openPhone.phoneNumber}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Status</h3>
                    <p className="mt-1">
                      <StatusBadge 
                        status={voiceConfigs.openPhone.isActive ? "operational" : "inactive"} 
                      />
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-500">OpenPhone is not configured yet</p>
              )}
            </CardContent>
            <CardFooter>
              {editingOpenPhone ? (
                <>
                  <Button 
                    variant="outline" 
                    className="mr-2" 
                    onClick={() => setEditingOpenPhone(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveOpenPhoneSettings}
                    disabled={openPhoneMutation.isPending}
                  >
                    {openPhoneMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => setEditingOpenPhone(true)}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    {voiceConfigs?.openPhone ? "Edit Configuration" : "Configure OpenPhone"}
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Recent Call Logs</CardTitle>
          <CardDescription>
            View and manage recent voice calls handled by the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <Skeleton className="h-64 w-full" />
          ) : logsError ? (
            <div className="text-red-500">Failed to load call logs</div>
          ) : (
            <Table>
              <TableCaption>A list of recent call logs</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Recording</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callLogs?.length ? (
                  callLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.phoneNumber}</TableCell>
                      <TableCell>
                        <StatusBadge status={
                          log.status === 'received' || log.status === 'completed' 
                            ? 'operational' 
                            : log.status === 'failed' 
                            ? 'outage' 
                            : 'degraded'
                        } />
                      </TableCell>
                      <TableCell>{log.duration ? `${log.duration}s` : "N/A"}</TableCell>
                      <TableCell>{formatDistanceToNow(new Date(log.timestamp))} ago</TableCell>
                      <TableCell>
                        {log.recording ? (
                          <Button variant="outline" size="sm">
                            <PhoneCall className="h-4 w-4 mr-1" />
                            Play
                          </Button>
                        ) : "N/A"}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Call Details</AlertDialogTitle>
                              <AlertDialogDescription>
                                <div className="space-y-2 mt-2">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="text-sm font-medium">Phone Number:</div>
                                    <div className="text-sm col-span-2">{log.phoneNumber}</div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="text-sm font-medium">Status:</div>
                                    <div className="text-sm col-span-2">
                                      <StatusBadge status={
                                        log.status === 'received' || log.status === 'completed' 
                                          ? 'operational' 
                                          : log.status === 'failed' 
                                          ? 'outage' 
                                          : 'degraded'
                                      } />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="text-sm font-medium">Timestamp:</div>
                                    <div className="text-sm col-span-2">{new Date(log.timestamp).toLocaleString()}</div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="text-sm font-medium">Duration:</div>
                                    <div className="text-sm col-span-2">{log.duration ? `${log.duration} seconds` : "N/A"}</div>
                                  </div>
                                  {log.transcript && (
                                    <div className="mt-4">
                                      <div className="text-sm font-medium mb-1">Transcript:</div>
                                      <div className="text-sm p-3 bg-muted rounded-md">{log.transcript}</div>
                                    </div>
                                  )}
                                  {log.sentiment && (
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="text-sm font-medium">Sentiment:</div>
                                      <div className="text-sm col-span-2">{log.sentiment}</div>
                                    </div>
                                  )}
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogAction>Close</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No call logs found</TableCell>
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
    </div>
  );
};

export default VoiceCall;
