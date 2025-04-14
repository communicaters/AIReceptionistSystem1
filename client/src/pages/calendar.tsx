import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getMeetingLogs, 
  getCalendarConfig, 
  saveCalendarConfig, 
  getAvailableTimeSlots,
  createMeeting
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
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  RefreshCw, 
  UserPlus, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { format, formatISO, addMinutes, parse } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import StatusBadge from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

type CalendarConfigForm = {
  googleClientId: string;
  googleClientSecret: string;
  googleCalendarId: string | null;
  availabilityStartTime: string;
  availabilityEndTime: string;
  slotDuration: number;
  isActive: boolean;
};

type NewMeetingForm = {
  subject: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: string;
  selectedSlot: string | null;
};

const Calendar = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showNewMeetingDialog, setShowNewMeetingDialog] = useState(false);

  // Calendar config form state
  const [configForm, setConfigForm] = useState<CalendarConfigForm>({
    googleClientId: "",
    googleClientSecret: "",
    googleCalendarId: "primary",
    availabilityStartTime: "09:00",
    availabilityEndTime: "17:00",
    slotDuration: 30,
    isActive: true
  });

  // New meeting form state
  const [newMeetingForm, setNewMeetingForm] = useState<NewMeetingForm>({
    subject: "",
    description: "",
    startTime: new Date(),
    endTime: new Date(Date.now() + 30 * 60000), // Default to 30 mins from now
    attendees: "",
    selectedSlot: null
  });

  // Get calendar configuration
  const { 
    data: calendarConfig, 
    isLoading: isLoadingConfig,
    error: configError 
  } = useQuery({
    queryKey: ["/api/calendar/config"],
    queryFn: getCalendarConfig
  });

  // Get meetings
  const { 
    data: meetings, 
    isLoading: isLoadingMeetings, 
    error: meetingsError,
    refetch: refetchMeetings
  } = useQuery({
    queryKey: ["/api/calendar/meetings"],
    queryFn: () => getMeetingLogs(10)
  });

  // Get time slots for selected date
  const { 
    data: timeSlots,
    isLoading: isLoadingSlots,
    error: slotsError,
    refetch: refetchTimeSlots
  } = useQuery({
    queryKey: ["/api/calendar/slots", selectedDate ? formatISO(selectedDate, { representation: 'date' }) : null],
    queryFn: () => selectedDate ? getAvailableTimeSlots(formatISO(selectedDate, { representation: 'date' })) : [],
    enabled: !!selectedDate && !!calendarConfig && !('error' in calendarConfig)
  });

  // Mutation for saving calendar configuration
  const saveConfigMutation = useMutation({
    mutationFn: saveCalendarConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/calendar/config"], data);
      toast({
        title: "Configuration saved",
        description: "Your calendar configuration has been updated",
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

  // Mutation for creating a new meeting
  const createMeetingMutation = useMutation({
    mutationFn: (meetingData: {
      subject: string;
      description?: string;
      startTime: string;
      endTime: string;
      attendees: string[];
    }) => createMeeting(meetingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/slots"] });
      
      toast({
        title: "Meeting scheduled",
        description: "Your meeting has been successfully scheduled",
      });
      
      // Reset form and close dialog
      setNewMeetingForm({
        subject: "",
        description: "",
        startTime: new Date(),
        endTime: new Date(Date.now() + 30 * 60000),
        attendees: "",
        selectedSlot: null
      });
      setShowNewMeetingDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to schedule meeting",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update form when config is loaded
  useEffect(() => {
    if (calendarConfig && !('error' in calendarConfig)) {
      setConfigForm({
        googleClientId: calendarConfig.googleClientId,
        googleClientSecret: calendarConfig.googleClientSecret,
        googleCalendarId: calendarConfig.googleCalendarId,
        availabilityStartTime: calendarConfig.availabilityStartTime,
        availabilityEndTime: calendarConfig.availabilityEndTime,
        slotDuration: calendarConfig.slotDuration,
        isActive: calendarConfig.isActive
      });
    }
  }, [calendarConfig]);

  // Handle calendar config form changes
  const handleConfigChange = (field: keyof CalendarConfigForm, value: string | boolean | number) => {
    setConfigForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save calendar configuration
  const handleSaveConfig = () => {
    if (!configForm.googleClientId || !configForm.googleClientSecret) {
      toast({
        title: "Missing required fields",
        description: "Google Client ID and Secret are required",
        variant: "destructive",
      });
      return;
    }

    saveConfigMutation.mutate(configForm);
  };

  // Handle new meeting form changes
  const handleNewMeetingChange = (field: keyof NewMeetingForm, value: string | Date) => {
    setNewMeetingForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Select a time slot for a new meeting
  const handleSelectTimeSlot = (slot: { time: string; available: boolean }) => {
    if (!slot.available || !selectedDate) return;
    
    // Parse the time from the slot
    const [hours, minutes, period] = slot.time.match(/(\d+):(\d+)\s(AM|PM)/)?.slice(1) || [];
    if (!hours || !minutes || !period) return;
    
    // Calculate hour in 24-hour format
    let hour = parseInt(hours);
    if (period === "PM" && hour < 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    
    // Create start and end times
    const startTime = new Date(selectedDate);
    startTime.setHours(hour, parseInt(minutes), 0, 0);
    
    // Calculate end time based on slot duration from config
    const slotDuration = configForm.slotDuration || 30;
    const endTime = addMinutes(startTime, slotDuration);
    
    setNewMeetingForm(prev => ({
      ...prev,
      startTime,
      endTime,
      selectedSlot: slot.time
    }));
    
    setShowNewMeetingDialog(true);
  };

  // Create a new meeting
  const handleCreateMeeting = () => {
    const { subject, description, startTime, endTime, attendees } = newMeetingForm;
    
    if (!subject || !startTime || !endTime) {
      toast({
        title: "Missing required fields",
        description: "Subject, start time, and end time are required",
        variant: "destructive",
      });
      return;
    }
    
    // Parse attendees string into array
    const attendeesList = attendees
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    createMeetingMutation.mutate({
      subject,
      description: description || undefined,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendees: attendeesList
    });
  };

  const isConfigured = calendarConfig && !('error' in calendarConfig);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar & Scheduling</h1>
          <p className="text-muted-foreground">
            Manage calendar settings, view meetings, and configure scheduling
          </p>
        </div>
        <Button 
          onClick={() => setShowNewMeetingDialog(true)}
          disabled={!isConfigured}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Meeting
        </Button>
      </div>

      {!isConfigured && !isLoadingConfig && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <AlertCircle className="h-6 w-6 text-amber-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">Calendar Not Configured</h3>
                <p className="text-amber-700 mt-1">
                  Please configure your Google Calendar integration to enable scheduling features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Calendar Integration</CardTitle>
              <CardDescription>
                Configure your Google Calendar connection for scheduling
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
                    <Label htmlFor="client-id">Google Client ID</Label>
                    <Input 
                      id="client-id" 
                      placeholder="Enter your Google Client ID" 
                      value={configForm.googleClientId}
                      onChange={(e) => handleConfigChange('googleClientId', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client-secret">Google Client Secret</Label>
                    <Input 
                      id="client-secret" 
                      type="password"
                      placeholder="Enter your Google Client Secret" 
                      value={configForm.googleClientSecret}
                      onChange={(e) => handleConfigChange('googleClientSecret', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="calendar-id">Calendar ID</Label>
                    <Input 
                      id="calendar-id" 
                      placeholder="Enter your calendar ID (e.g., primary)"
                      value={configForm.googleCalendarId || "primary"}
                      onChange={(e) => handleConfigChange('googleCalendarId', e.target.value || "primary")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="availability-start">Business Hours (Start)</Label>
                      <Select 
                        value={configForm.availabilityStartTime}
                        onValueChange={(value) => handleConfigChange('availabilityStartTime', value)}
                      >
                        <SelectTrigger id="availability-start">
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(12)].map((_, i) => (
                            <SelectItem key={`morning-${i}`} value={`0${i + 7}:00`.slice(-5)}>
                              {`${i + 7}:00 AM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="availability-end">Business Hours (End)</Label>
                      <Select 
                        value={configForm.availabilityEndTime}
                        onValueChange={(value) => handleConfigChange('availabilityEndTime', value)}
                      >
                        <SelectTrigger id="availability-end">
                          <SelectValue placeholder="Select end time" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(12)].map((_, i) => (
                            <SelectItem key={`afternoon-${i}`} value={`${i + 12}:00`}>
                              {`${i === 0 ? 12 : i + 12}:00 ${i < 12 ? 'PM' : 'AM'}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slot-duration">Meeting Slot Duration</Label>
                    <Select 
                      value={configForm.slotDuration.toString()}
                      onValueChange={(value) => handleConfigChange('slotDuration', parseInt(value))}
                    >
                      <SelectTrigger id="slot-duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="active-status" 
                      checked={configForm.isActive}
                      onCheckedChange={(checked) => handleConfigChange('isActive', checked)}
                    />
                    <Label htmlFor="active-status">Enable Calendar Integration</Label>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                disabled={!isConfigured || saveConfigMutation.isPending}
                onClick={() => {
                  if (isConfigured) {
                    setConfigForm({
                      googleClientId: "",
                      googleClientSecret: "",
                      googleCalendarId: "primary",
                      availabilityStartTime: "09:00",
                      availabilityEndTime: "17:00",
                      slotDuration: 30,
                      isActive: false
                    });
                    saveConfigMutation.mutate({
                      googleClientId: "",
                      googleClientSecret: "",
                      googleCalendarId: "primary",
                      availabilityStartTime: "09:00",
                      availabilityEndTime: "17:00",
                      slotDuration: 30,
                      isActive: false
                    });
                  }
                }}
              >
                Disconnect
              </Button>
              <Button 
                onClick={handleSaveConfig}
                disabled={saveConfigMutation.isPending}
              >
                {saveConfigMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Settings
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>Upcoming Meetings</CardTitle>
                <CardDescription>
                  View and manage scheduled meetings
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchMeetings()} 
                disabled={isLoadingMeetings}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMeetings ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingMeetings ? (
                <Skeleton className="h-64 w-full" />
              ) : meetingsError ? (
                <div className="bg-red-50 p-4 rounded-md text-red-600">
                  Failed to load meeting data
                </div>
              ) : !meetings?.length ? (
                <div className="text-center py-8 text-neutral-500">
                  No upcoming meetings found
                </div>
              ) : (
                <Table>
                  <TableCaption>A list of your upcoming meetings</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Attendees</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetings.map((meeting) => (
                      <TableRow key={meeting.id}>
                        <TableCell className="font-medium">{meeting.subject}</TableCell>
                        <TableCell>
                          {meeting.attendees?.length
                            ? `${meeting.attendees[0]}${meeting.attendees.length > 1 ? ` +${meeting.attendees.length - 1} more` : ''}`
                            : 'No attendees'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(meeting.startTime), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>
                          <StatusBadge 
                            status={
                              meeting.status === 'scheduled' 
                                ? 'operational' 
                                : meeting.status === 'cancelled' 
                                ? 'outage' 
                                : 'degraded'
                            } 
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => refetchMeetings()} 
                variant="outline" 
                className="w-full"
                disabled={isLoadingMeetings}
              >
                {isLoadingMeetings ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Load More
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>
                View and select dates for scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>Available Time Slots</CardTitle>
                <CardDescription>
                  {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date to view slots'}
                </CardDescription>
              </div>
              {selectedDate && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchTimeSlots()} 
                  disabled={isLoadingSlots}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingSlots ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingSlots ? (
                <Skeleton className="h-64 w-full" />
              ) : !selectedDate ? (
                <div className="text-center py-8 text-neutral-500">
                  Please select a date to view available slots
                </div>
              ) : !isConfigured ? (
                <div className="text-center py-8 text-neutral-500">
                  Configure your calendar to view available time slots
                </div>
              ) : slotsError ? (
                <div className="bg-red-50 p-4 rounded-md text-red-600">
                  Failed to load time slots
                </div>
              ) : timeSlots && timeSlots.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  No time slots available for this date
                </div>
              ) : (
                <div className="space-y-2">
                  {timeSlots && timeSlots.map((slot, i) => (
                    <div 
                      key={i}
                      onClick={() => handleSelectTimeSlot(slot)}
                      className={`flex items-center space-x-2 p-2 rounded-md border ${
                        slot.available 
                          ? 'hover:bg-neutral-50 cursor-pointer' 
                          : 'bg-neutral-100 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Clock className="h-4 w-4 text-neutral-500" />
                      <span>{slot.time}</span>
                      {!slot.available && (
                        <span className="ml-auto text-xs text-neutral-500">Unavailable</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => setShowNewMeetingDialog(true)}
                disabled={!isConfigured || !selectedDate}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* New Meeting Dialog */}
      <Dialog open={showNewMeetingDialog} onOpenChange={setShowNewMeetingDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>
              {newMeetingForm.selectedSlot 
                ? `Schedule a meeting for ${format(selectedDate!, 'MMMM d, yyyy')} at ${newMeetingForm.selectedSlot}` 
                : 'Create a new meeting and add it to your calendar'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Meeting subject"
                value={newMeetingForm.subject}
                onChange={(e) => handleNewMeetingChange('subject', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Meeting description"
                value={newMeetingForm.description}
                onChange={(e) => handleNewMeetingChange('description', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="attendees">Attendees (comma-separated emails)</Label>
              <Input
                id="attendees"
                placeholder="john@example.com, jane@example.com"
                value={newMeetingForm.attendees}
                onChange={(e) => handleNewMeetingChange('attendees', e.target.value)}
              />
            </div>
            {!newMeetingForm.selectedSlot && (
              <div className="grid gap-2">
                <Label>Please select a time slot from the calendar</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewMeetingDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateMeeting}
              disabled={createMeetingMutation.isPending || !newMeetingForm.subject}
            >
              {createMeetingMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
