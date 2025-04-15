import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  getVoiceConfigs, 
  getCallLogs, 
  saveTwilioConfig, 
  saveSipConfig, 
  saveOpenPhoneConfig, 
  makeTestCall 
} from "@/lib/api";
import { useCall } from "@/components/providers/call-provider";
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
  AlertTriangle,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Interface for service configuration states
interface ConfigValues {
  // Common fields
  phoneNumber?: string;
  isActive?: boolean;
  callbackUrl?: string;
  
  // Twilio specific
  accountSid?: string;
  authToken?: string;
  
  // SIP specific
  username?: string;
  password?: string;
  serverDomain?: string;
  outboundProxy?: string;
  port?: number;
  transportProtocol?: 'UDP' | 'TCP' | 'TLS';
  registrationExpiryTime?: number;
  callerId?: string;
  stunServer?: string;
  dtmfMode?: 'RFC2833' | 'SIP INFO' | 'IN-BAND';
  audioCodecs?: string[];
  voicemailUri?: string;
  sipUri?: string;
  keepAliveInterval?: number;
  tlsCertPath?: string;
  
  // OpenPhone specific
  apiKey?: string;
  teamId?: string;
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
  const [selectedService, setSelectedService] = useState<'twilio' | 'sip' | 'openphone' | null>(null);
  
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
    serverDomain: "",
    outboundProxy: "",
    port: 5060,
    transportProtocol: "UDP",
    registrationExpiryTime: 3600,
    callerId: "",
    stunServer: "",
    dtmfMode: "RFC2833",
    audioCodecs: ["G.711", "G.722", "Opus"],
    voicemailUri: "",
    sipUri: "",
    keepAliveInterval: 30,
    tlsCertPath: "",
    callbackUrl: "",
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
    queryFn: getVoiceConfigs
  });
  
  // Initialize form states with current values when data is loaded
  useEffect(() => {
    if (!voiceConfigs) return;
    
    if (voiceConfigs.twilio) {
      setTwilioConfig({
        accountSid: voiceConfigs.twilio.accountSid,
        authToken: voiceConfigs.twilio.authToken,
        phoneNumber: voiceConfigs.twilio.phoneNumber,
        isActive: voiceConfigs.twilio.isActive
      });
    }
    
    if (voiceConfigs.sip) {
      setSipConfig({
        username: voiceConfigs.sip.username,
        password: voiceConfigs.sip.password,
        serverDomain: voiceConfigs.sip.serverDomain,
        outboundProxy: voiceConfigs.sip.outboundProxy || "",
        port: voiceConfigs.sip.port || 5060,
        transportProtocol: voiceConfigs.sip.transportProtocol || "UDP",
        registrationExpiryTime: voiceConfigs.sip.registrationExpiryTime || 3600,
        callerId: voiceConfigs.sip.callerId || "",
        stunServer: voiceConfigs.sip.stunServer || "",
        dtmfMode: voiceConfigs.sip.dtmfMode || "RFC2833",
        audioCodecs: voiceConfigs.sip.audioCodecs || ["G.711", "G.722", "Opus"],
        voicemailUri: voiceConfigs.sip.voicemailUri || "",
        sipUri: voiceConfigs.sip.sipUri || "",
        keepAliveInterval: voiceConfigs.sip.keepAliveInterval || 30,
        tlsCertPath: voiceConfigs.sip.tlsCertPath || "",
        callbackUrl: voiceConfigs.sip.callbackUrl || "",
        isActive: voiceConfigs.sip.isActive
      });
    }
    
    if (voiceConfigs.openPhone) {
      setOpenPhoneConfig({
        phoneNumber: voiceConfigs.openPhone.phoneNumber,
        apiKey: voiceConfigs.openPhone.apiKey,
        isActive: voiceConfigs.openPhone.isActive
      });
    }
  }, [voiceConfigs]);

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
  
  // Access the global call state using useCall hook
  const { initiateCall } = useCall();
  
  // Mutation for making test calls
  const testCallMutation = useMutation({
    mutationFn: async (data: TestCallState) => {
      // Use the CallProvider to handle the call UI and state
      await initiateCall(data.phoneNumber, data.message, selectedService || undefined);
      
      // For backward compatibility, also make the API call
      return makeTestCall(data.phoneNumber, data.message, selectedService || undefined);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Test call initiated",
          description: `Call to ${testCall.phoneNumber} has been initiated successfully.${data.service ? ` using ${data.service}` : ''}`,
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
    if (!sipConfig.username || !sipConfig.password || !sipConfig.serverDomain) {
      toast({
        title: "Missing required fields",
        description: "Username, Password, and Server Domain are required.",
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
    
    if (!selectedService) {
      toast({
        title: "No phone service selected",
        description: "Please select a phone service to use for the test call.",
        variant: "destructive",
      });
      return;
    }
    
    // Verify the selected service is actually active
    if (selectedService === 'twilio' && !hasActiveTwilio) {
      toast({
        title: "Twilio service is not active",
        description: "Please activate Twilio service in the configuration tab before making a call.",
        variant: "destructive",
      });
      return;
    } else if (selectedService === 'sip' && !hasActiveSip) {
      toast({
        title: "SIP service is not active",
        description: "Please activate SIP service in the configuration tab before making a call.",
        variant: "destructive",
      });
      return;
    } else if (selectedService === 'openphone' && !hasActiveOpenPhone) {
      toast({
        title: "OpenPhone service is not active",
        description: "Please activate OpenPhone service in the configuration tab before making a call.",
        variant: "destructive",
      });
      return;
    }
    
    testCallMutation.mutate(testCall);
  };
  
  // Check which services are active
  const hasActiveTwilio = voiceConfigs?.twilio?.isActive || false;
  const hasActiveSip = voiceConfigs?.sip?.isActive || false;
  const hasActiveOpenPhone = voiceConfigs?.openPhone?.isActive || false;
  const hasAnyActiveService = hasActiveTwilio || hasActiveSip || hasActiveOpenPhone;
  
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
            {!hasAnyActiveService ? (
              <div className="py-6">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">No Active Phone Service</h3>
                      <div className="mt-2 text-sm text-amber-700">
                        <p>You need to configure and activate at least one phone service before making test calls.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceSelect">Select Phone Service</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {hasActiveTwilio && (
                      <Button 
                        type="button"
                        variant={selectedService === 'twilio' ? 'default' : 'outline'}
                        className={`flex flex-col items-center justify-center h-20 ${selectedService === 'twilio' ? 'border-primary' : ''}`}
                        onClick={() => setSelectedService('twilio')}
                      >
                        <div className="flex items-center mb-1">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                          <span>Active</span>
                        </div>
                        <span className="font-semibold">Twilio</span>
                      </Button>
                    )}
                    
                    {hasActiveSip && (
                      <Button 
                        type="button"
                        variant={selectedService === 'sip' ? 'default' : 'outline'}
                        className={`flex flex-col items-center justify-center h-20 ${selectedService === 'sip' ? 'border-primary' : ''}`}
                        onClick={() => setSelectedService('sip')}
                      >
                        <div className="flex items-center mb-1">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                          <span>Active</span>
                        </div>
                        <span className="font-semibold">SIP</span>
                      </Button>
                    )}
                    
                    {hasActiveOpenPhone && (
                      <Button 
                        type="button"
                        variant={selectedService === 'openphone' ? 'default' : 'outline'}
                        className={`flex flex-col items-center justify-center h-20 ${selectedService === 'openphone' ? 'border-primary' : ''}`}
                        onClick={() => setSelectedService('openphone')}
                      >
                        <div className="flex items-center mb-1">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                          <span>Active</span>
                        </div>
                        <span className="font-semibold">OpenPhone</span>
                      </Button>
                    )}
                  </div>
                  {!selectedService && (
                    <p className="text-sm text-amber-500 mt-2">Please select a phone service to use</p>
                  )}
                </div>
                
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
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setTestCallOpen(false)}>Cancel</Button>
              <Button 
                onClick={initiateTestCall}
                disabled={testCallMutation.isPending || !hasAnyActiveService || !selectedService}
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
                <div className="space-y-6">
                  {/* Basic Connection Settings */}
                  <div>
                    <h3 className="text-lg font-medium">Basic Connection Settings</h3>
                    <div className="grid grid-cols-1 gap-4 mt-2 md:grid-cols-2">
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
                        <Label htmlFor="serverDomain">Server Domain</Label>
                        <Input 
                          id="serverDomain" 
                          value={sipConfig.serverDomain} 
                          onChange={(e) => setSipConfig({...sipConfig, serverDomain: e.target.value})} 
                          placeholder="sip.example.com" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input 
                          id="port" 
                          type="number"
                          value={sipConfig.port} 
                          onChange={(e) => setSipConfig({...sipConfig, port: parseInt(e.target.value) || 5060})} 
                          placeholder="5060" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="callerId">Caller ID</Label>
                        <Input 
                          id="callerId" 
                          value={sipConfig.callerId} 
                          onChange={(e) => setSipConfig({...sipConfig, callerId: e.target.value})} 
                          placeholder="+12345678900" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transportProtocol">Transport Protocol</Label>
                        <Select 
                          value={sipConfig.transportProtocol} 
                          onValueChange={(value) => setSipConfig({
                            ...sipConfig, 
                            transportProtocol: value as 'UDP' | 'TCP' | 'TLS'
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select protocol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UDP">UDP</SelectItem>
                            <SelectItem value="TCP">TCP</SelectItem>
                            <SelectItem value="TLS">TLS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Advanced Settings */}
                  <div>
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="flex items-center justify-between w-full p-0">
                          <h3 className="text-lg font-medium">Advanced Settings</h3>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="outboundProxy">Outbound Proxy</Label>
                            <Input 
                              id="outboundProxy" 
                              value={sipConfig.outboundProxy} 
                              onChange={(e) => setSipConfig({...sipConfig, outboundProxy: e.target.value})} 
                              placeholder="proxy.example.com" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="registrationExpiryTime">Registration Expiry (seconds)</Label>
                            <Input 
                              id="registrationExpiryTime" 
                              type="number"
                              value={sipConfig.registrationExpiryTime} 
                              onChange={(e) => setSipConfig({...sipConfig, registrationExpiryTime: parseInt(e.target.value) || 3600})} 
                              placeholder="3600" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="stunServer">STUN Server</Label>
                            <Input 
                              id="stunServer" 
                              value={sipConfig.stunServer} 
                              onChange={(e) => setSipConfig({...sipConfig, stunServer: e.target.value})} 
                              placeholder="stun.example.com" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dtmfMode">DTMF Mode</Label>
                            <Select 
                              value={sipConfig.dtmfMode} 
                              onValueChange={(value) => setSipConfig({
                                ...sipConfig, 
                                dtmfMode: value as 'RFC2833' | 'SIP INFO' | 'IN-BAND'
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select DTMF mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="RFC2833">RFC2833</SelectItem>
                                <SelectItem value="SIP INFO">SIP INFO</SelectItem>
                                <SelectItem value="IN-BAND">IN-BAND</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="keepAliveInterval">Keep-Alive Interval (seconds)</Label>
                            <Input 
                              id="keepAliveInterval" 
                              type="number"
                              value={sipConfig.keepAliveInterval} 
                              onChange={(e) => setSipConfig({...sipConfig, keepAliveInterval: parseInt(e.target.value) || 30})} 
                              placeholder="30" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="callbackUrl">Callback URL (Optional)</Label>
                            <Input 
                              id="callbackUrl" 
                              value={sipConfig.callbackUrl} 
                              onChange={(e) => setSipConfig({...sipConfig, callbackUrl: e.target.value})} 
                              placeholder="https://example.com/callback" 
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                  
                  {/* Status */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="sipIsActive" 
                      checked={sipConfig.isActive} 
                      onCheckedChange={(checked) => setSipConfig({...sipConfig, isActive: checked})} 
                    />
                    <Label htmlFor="sipIsActive">Active</Label>
                  </div>
                </div>
              ) : voiceConfigs?.sip ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Username</h3>
                    <p className="mt-1">{voiceConfigs.sip.username}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Server Domain</h3>
                    <p className="mt-1">{voiceConfigs.sip.serverDomain}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Caller ID</h3>
                    <p className="mt-1">{voiceConfigs.sip.callerId || "N/A"}</p>
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
