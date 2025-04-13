import { useQuery } from "@tanstack/react-query";
import { getVoiceConfigs, getCallLogs } from "@/lib/api";
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
import { Phone, PhoneCall, PhoneForwarded, PhoneIncoming, PhoneOff } from "lucide-react";
import StatusBadge from "@/components/ui/status-badge";

const VoiceCall = () => {
  const { 
    data: voiceConfigs, 
    isLoading: isLoadingConfigs,
    error: configError
  } = useQuery({
    queryKey: ["/api/voice/configs"],
    queryFn: getVoiceConfigs
  });

  const { 
    data: callLogs, 
    isLoading: isLoadingLogs,
    error: logsError
  } = useQuery({
    queryKey: ["/api/voice/logs"],
    queryFn: () => getCallLogs(10)
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice Call Handling</h1>
          <p className="text-muted-foreground">
            Manage voice calls, view call logs, and configure phone services
          </p>
        </div>
        <Button>
          <Phone className="mr-2 h-4 w-4" />
          Make Test Call
        </Button>
      </div>

      <Tabs defaultValue="twilio">
        <TabsList>
          <TabsTrigger value="twilio">Twilio</TabsTrigger>
          <TabsTrigger value="sip">SIP</TabsTrigger>
          <TabsTrigger value="openphone">OpenPhone</TabsTrigger>
        </TabsList>
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
              <Button variant="outline" className="mr-2">Edit Configuration</Button>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="sip">
          <Card>
            <CardHeader>
              <CardTitle>SIP Configuration</CardTitle>
              <CardDescription>
                Configure SIP server details for voice calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {voiceConfigs?.sip ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Server URL</h3>
                    <p className="mt-1">{voiceConfigs.sip.serverUrl}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-neutral-500">Extension</h3>
                    <p className="mt-1">{voiceConfigs.sip.extension || "N/A"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-500">SIP is not configured yet</p>
              )}
            </CardContent>
            <CardFooter>
              <Button>Configure SIP</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="openphone">
          <Card>
            <CardHeader>
              <CardTitle>OpenPhone Configuration</CardTitle>
              <CardDescription>
                Set up OpenPhone integration for voice calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {voiceConfigs?.openPhone ? (
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
              <Button>Configure OpenPhone</Button>
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
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
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
