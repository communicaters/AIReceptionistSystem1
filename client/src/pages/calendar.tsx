import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMeetingLogs } from "@/lib/api";
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
import { Calendar as CalendarIcon, Clock, Plus, RefreshCw, UserPlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow } from "date-fns";
import StatusBadge from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const Calendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const { 
    data: meetings, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/calendar/meetings"],
    queryFn: () => getMeetingLogs(10)
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar & Scheduling</h1>
          <p className="text-muted-foreground">
            Manage calendar settings, view meetings, and configure scheduling
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Meeting
        </Button>
      </div>

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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-id">Google Client ID</Label>
                  <Input id="client-id" placeholder="Enter your Google Client ID" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-secret">Google Client Secret</Label>
                  <Input 
                    id="client-secret" 
                    type="password"
                    placeholder="Enter your Google Client Secret" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calendar-id">Calendar ID</Label>
                  <Input 
                    id="calendar-id" 
                    placeholder="Enter your calendar ID (e.g., primary)"
                    defaultValue="primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="availability-start">Business Hours (Start)</Label>
                    <Select defaultValue="09:00">
                      <SelectTrigger id="availability-start">
                        <SelectValue placeholder="Select start time" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(12)].map((_, i) => (
                          <SelectItem key={`morning-${i}`} value={`0${i + 7}:00`}>
                            {`${i + 7}:00 AM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="availability-end">Business Hours (End)</Label>
                    <Select defaultValue="17:00">
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
                  <Select defaultValue="30">
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
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Disconnect</Button>
              <Button>Save Settings</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>
                View and manage scheduled meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : error ? (
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
              <Button variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
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
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Time Slots</CardTitle>
              <CardDescription>
                {date ? format(date, 'MMMM d, yyyy') : 'Select a date to view slots'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {date ? (
                <div className="space-y-2">
                  {[
                    { time: '9:00 AM', available: true },
                    { time: '9:30 AM', available: true },
                    { time: '10:00 AM', available: false },
                    { time: '10:30 AM', available: true },
                    { time: '11:00 AM', available: true },
                    { time: '11:30 AM', available: false },
                  ].map((slot, i) => (
                    <div 
                      key={i}
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
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  Please select a date to view available slots
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button disabled={!date} className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
